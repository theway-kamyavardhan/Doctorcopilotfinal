from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ProcessingError
from app.models.enums import ProcessingStatus, ProcessingStep, ReportStatus
from app.models.patient import Patient
from app.models.processing import ProcessingLog
from app.models.report import ExtractedData, Report, ReportInsight
from app.services.ai.client import OpenAIExtractionClient
from app.services.ai_control import AIControlService
from app.services.clinical_normalization.service import ClinicalNormalizer
from app.services.insights.normalization import clean_numeric_value, extract_numeric_value_from_text, normalize_parameter_name
from app.services.processing.metadata_extractor import clean_ocr_text, extract_metadata_bundle
from app.services.processing.ocr import TextExtractionEngine
from app.services.processing.report_classifier import ReportClassifier
from app.services.storage.service import ReportFileStorage


class ReportProcessingOrchestrator:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.storage = ReportFileStorage()
        self.text_extractor = TextExtractionEngine()
        self.ai_client = OpenAIExtractionClient()
        self.clinical_normalizer = ClinicalNormalizer()
        self.report_classifier = ReportClassifier()

    async def process_upload(self, patient: Patient, file: UploadFile, case_id: UUID | None, session_api_key: str | None = None) -> Report:
        stored_upload = await self.storage.save_upload(file)
        report = Report(
            patient_id=patient.id,
            case_id=case_id,
            file_name=file.filename or "report",
            file_path=stored_upload.storage_path,
            mime_type=file.content_type or "application/octet-stream",
            checksum=stored_upload.checksum,
            status=ReportStatus.UPLOADED,
        )
        self.db.add(report)
        await self.db.flush()
        await self._log(
            report.id,
            ProcessingStep.UPLOAD,
            ProcessingStatus.SUCCESS,
            detail="File stored in report storage.",
            payload={"file_name": report.file_name, "mime_type": report.mime_type, "file_path": report.file_path},
        )

        try:
            extraction_result = await self.text_extractor.extract(stored_upload.temp_path, report.mime_type)
            cleaned_text = self._clean_text(extraction_result.text)
            report.raw_text = cleaned_text
            report.status = ReportStatus.OCR_COMPLETE
            await self._log(
                report.id,
                ProcessingStep.OCR,
                ProcessingStatus.SUCCESS,
                detail="Text extracted successfully.",
                payload={
                    "raw_text_preview": cleaned_text[:500],
                    "character_count": len(cleaned_text),
                    "method": extraction_result.method,
                    "fallback_used": extraction_result.fallback_used,
                    "page_count": extraction_result.page_count,
                },
            )
            metadata_result = extract_metadata_bundle(cleaned_text)
            report.report_metadata = metadata_result.metadata
            report.patient_name = metadata_result.patient_name
            report.lab_name = metadata_result.lab_name
            report.doctor_name = metadata_result.doctor_name
            report.sample_type = metadata_result.sample_type
            report.machine_used = metadata_result.machine_used
            report.report_date = metadata_result.report_date
            report.sample_collection_date = metadata_result.drawn_date
            report.report_generation_date = metadata_result.reported_date
            report.report_time = metadata_result.report_time
            report.date_confidence = metadata_result.date_confidence
            await self._log(
                report.id,
                ProcessingStep.METADATA_EXTRACTION,
                ProcessingStatus.SUCCESS,
                detail="Report metadata extracted.",
                payload=metadata_result.metadata,
            )

            report.status = ReportStatus.PROCESSING
            await self._log(report.id, ProcessingStep.AI_PROCESSING, ProcessingStatus.STARTED, detail="Structured extraction started.")
            effective_api_key = await AIControlService(self.db).assert_processing_allowed(
                session_api_key=session_api_key,
                patient_id=patient.patient_id,
            )
            structured = await self.ai_client.extract(cleaned_text, api_key=effective_api_key)
            repaired_items, value_extraction_fixed, invalid_values_detected = self._repair_numeric_values(cleaned_text, structured.key_values)
            structured.key_values = repaired_items
            await self._log(
                report.id,
                ProcessingStep.AI_PROCESSING,
                ProcessingStatus.SUCCESS,
                detail="Structured extraction completed.",
                payload={
                    **structured.model_dump(),
                    "value_extraction_fixed": value_extraction_fixed,
                    "invalid_values_detected": invalid_values_detected,
                },
            )

            report.report_type = structured.report_type
            report.summary = structured.summary
            metadata_result.metadata["report"]["report_type"] = metadata_result.metadata["report"].get("report_type") or structured.report_type
            report.report_metadata = metadata_result.metadata
            clinical_result = self.clinical_normalizer.normalize(structured.key_values)
            validated_parameters = self._validate_normalized_parameters(clinical_result.parameters)
            validated_key_values = {parameter["name"]: parameter for parameter in validated_parameters}
            classification = self.report_classifier.classify(
                raw_text=cleaned_text,
                structured_report_type=structured.report_type,
                parameters=validated_parameters,
                insights=[insight.model_dump() for insight in structured.insights],
            )
            report.report_category = classification.report_category
            report.report_keywords = classification.keywords
            metadata_result.metadata["classification"] = {
                "report_type": classification.report_type,
                "category": classification.report_category,
                "keywords": classification.keywords,
            }
            report.parameters = validated_parameters
            metadata_result.metadata = self._validate_metadata(metadata_result.metadata)
            clinical_data = {
                "report_type": structured.report_type,
                "report_category": classification.report_category,
                "report_keywords": classification.keywords,
                "summary": structured.summary,
                "parameters": validated_parameters,
                "panels": clinical_result.panels,
                "key_values": validated_key_values,
                "normalized_terms": [term.model_dump() for term in structured.normalized_terms],
                "insights": [insight.model_dump() for insight in structured.insights],
                "confidence": clinical_result.confidence,
                "cleaned": clinical_result.cleaned,
            }
            final_output = {
                "metadata": metadata_result.metadata,
                "clinical_data": clinical_data,
                "parameters": validated_parameters,
                "panels": clinical_result.panels,
                "cleaned": clinical_result.cleaned,
                "report_type": structured.report_type,
                "report_category": classification.report_category,
                "report_keywords": classification.keywords,
                "summary": structured.summary,
                "key_values": validated_key_values,
                "normalized_terms": clinical_data["normalized_terms"],
                "insights": clinical_data["insights"],
                "confidence": clinical_result.confidence,
                "flags": metadata_result.metadata.get("flags", []),
                "notes": metadata_result.metadata.get("notes", []),
                "value_extraction_fixed": value_extraction_fixed or self._all_numeric_values_valid(validated_parameters),
                "invalid_values_detected": invalid_values_detected,
            }
            parsed_payload = final_output
            extracted_data = ExtractedData(
                report=report,
                report_type=structured.report_type,
                summary=structured.summary,
                key_values=validated_key_values,
                normalized_terms=parsed_payload["normalized_terms"],
                confidence=clinical_result.confidence,
            )
            self.db.add(extracted_data)
            await self._log(
                report.id,
                ProcessingStep.PARSING,
                ProcessingStatus.SUCCESS,
                detail="Structured response parsed and validated.",
                payload=parsed_payload,
            )
            await self._log(
                report.id,
                ProcessingStep.NORMALIZATION,
                ProcessingStatus.SUCCESS,
                detail="Clinical-grade normalization completed.",
                payload={
                    "normalized_keys": list(validated_key_values.keys()),
                    "panels": {key: len(value) for key, value in clinical_result.panels.items()},
                    "report_category": classification.report_category,
                    "report_keywords": classification.keywords,
                    "cleaned": clinical_result.cleaned,
                    "confidence": clinical_result.confidence,
                    "interpretation_fixes_applied": all(parameter["status"] for parameter in validated_parameters),
                },
            )

            for insight in structured.insights:
                self.db.add(
                    ReportInsight(
                        report=report,
                        category=insight.category,
                        title=insight.title,
                        description=insight.description,
                        severity=insight.severity,
                        insight_metadata={item.key: item.value for item in insight.metadata},
                    )
                )

            report.status = ReportStatus.PROCESSED
            await self._log(report.id, ProcessingStep.STORAGE, ProcessingStatus.SUCCESS, detail="Structured data persisted.")
            await self.db.commit()
        except Exception as exc:  # noqa: BLE001
            await self.db.rollback()
            report.status = ReportStatus.FAILED
            self.db.add(report)
            await self.db.flush()
            failed_step = self._infer_failed_step(report)
            await self._log(report.id, failed_step, ProcessingStatus.FAILED, detail=f"{failed_step} failed.", error_message=str(exc))
            await self.db.commit()
            raise ProcessingError(str(exc)) from exc
        finally:
            await self.storage.cleanup_temp(stored_upload.temp_path, uses_temp_copy=stored_upload.uses_temp_copy)

        await self.db.refresh(report, attribute_names=["extracted_data", "insights"])
        return report

    async def debug_process(self, patient: Patient, file: UploadFile, session_api_key: str | None = None) -> dict:
        stored_upload = await self.storage.save_upload(file)
        report = Report(
            patient_id=patient.id,
            case_id=None,
            file_name=file.filename or "debug-report",
            file_path=stored_upload.storage_path,
            mime_type=file.content_type or "application/octet-stream",
            checksum=stored_upload.checksum,
            status=ReportStatus.UPLOADED,
        )
        self.db.add(report)
        await self.db.flush()
        await self._log(report.id, ProcessingStep.UPLOAD, ProcessingStatus.SUCCESS, detail="Debug upload stored.")

        try:
            extraction_result = await self.text_extractor.extract(stored_upload.temp_path, report.mime_type)
            cleaned_text = self._clean_text(extraction_result.text)
            metadata_result = extract_metadata_bundle(cleaned_text)
            await self._log(
                report.id,
                ProcessingStep.OCR,
                ProcessingStatus.SUCCESS,
                detail="Debug OCR completed.",
                payload={
                    "character_count": len(cleaned_text),
                    "method": extraction_result.method,
                    "fallback_used": extraction_result.fallback_used,
                    "page_count": extraction_result.page_count,
                    "ocr_cleaned": True,
                },
            )
            await self._log(
                report.id,
                ProcessingStep.METADATA_EXTRACTION,
                ProcessingStatus.SUCCESS,
                detail="Debug metadata extraction completed.",
                payload=metadata_result.metadata,
            )

            effective_api_key = await AIControlService(self.db).assert_processing_allowed(
                session_api_key=session_api_key,
                patient_id=patient.patient_id,
            )
            structured = await self.ai_client.extract(cleaned_text, api_key=effective_api_key)
            repaired_items, value_extraction_fixed, invalid_values_detected = self._repair_numeric_values(cleaned_text, structured.key_values)
            structured.key_values = repaired_items
            clinical_result = self.clinical_normalizer.normalize(structured.key_values)
            validated_parameters = self._validate_normalized_parameters(clinical_result.parameters)
            validated_key_values = {parameter["name"]: parameter for parameter in validated_parameters}
            metadata_result.metadata = self._validate_metadata(metadata_result.metadata)
            metadata_result.metadata["report"]["report_type"] = metadata_result.metadata["report"].get("report_type") or structured.report_type
            classification = self.report_classifier.classify(
                raw_text=cleaned_text,
                structured_report_type=structured.report_type,
                parameters=validated_parameters,
                insights=[insight.model_dump() for insight in structured.insights],
            )
            metadata_result.metadata["classification"] = {
                "report_type": classification.report_type,
                "category": classification.report_category,
                "keywords": classification.keywords,
            }
            clinical_data = {
                "report_type": structured.report_type,
                "report_category": classification.report_category,
                "report_keywords": classification.keywords,
                "summary": structured.summary,
                "parameters": validated_parameters,
                "panels": clinical_result.panels,
                "key_values": validated_key_values,
                "normalized_terms": [term.model_dump() for term in structured.normalized_terms],
                "insights": [insight.model_dump() for insight in structured.insights],
                "confidence": clinical_result.confidence,
                "cleaned": clinical_result.cleaned,
            }
            final_output = {
                "metadata": metadata_result.metadata,
                "clinical_data": clinical_data,
                "parameters": validated_parameters,
                "panels": clinical_result.panels,
                "cleaned": clinical_result.cleaned,
                "report_type": structured.report_type,
                "report_category": classification.report_category,
                "report_keywords": classification.keywords,
                "summary": structured.summary,
                "key_values": validated_key_values,
                "normalized_terms": clinical_data["normalized_terms"],
                "insights": clinical_data["insights"],
                "confidence": clinical_result.confidence,
                "flags": metadata_result.metadata.get("flags", []),
                "notes": metadata_result.metadata.get("notes", []),
                "value_extraction_fixed": value_extraction_fixed or self._all_numeric_values_valid(validated_parameters),
                "invalid_values_detected": invalid_values_detected,
            }
            parsed_data = final_output
            await self._log(
                report.id,
                ProcessingStep.AI_PROCESSING,
                ProcessingStatus.SUCCESS,
                detail="Debug AI extraction completed.",
                payload={
                    **structured.model_dump(),
                    "value_extraction_fixed": value_extraction_fixed,
                    "invalid_values_detected": invalid_values_detected,
                },
            )
            await self._log(report.id, ProcessingStep.PARSING, ProcessingStatus.SUCCESS, detail="Debug parsing completed.", payload=parsed_data)
            await self._log(
                report.id,
                ProcessingStep.NORMALIZATION,
                ProcessingStatus.SUCCESS,
                detail="Debug clinical normalization completed.",
                payload={
                    "normalized_keys": list(clinical_result.key_values.keys()),
                    "panels": {key: len(value) for key, value in clinical_result.panels.items()},
                    "report_category": classification.report_category,
                    "report_keywords": classification.keywords,
                    "cleaned": clinical_result.cleaned,
                    "confidence": clinical_result.confidence,
                },
            )
            await self.db.commit()
            await self.db.refresh(report, attribute_names=["processing_logs"])
            return {
                "raw_text": cleaned_text,
                "metadata": metadata_result.metadata,
                "ai_output": structured.model_dump(),
                "final_output": final_output,
                "parsed_data": parsed_data,
                "parameters": validated_parameters,
                "panels": clinical_result.panels,
                "insights": clinical_data["insights"],
                "confidence": clinical_result.confidence,
                "cleaned": clinical_result.cleaned,
                "value_extraction_fixed": value_extraction_fixed or self._all_numeric_values_valid(validated_parameters),
                "invalid_values_detected": invalid_values_detected,
                "logs": self._serialize_logs(report.processing_logs),
            }
        except Exception as exc:  # noqa: BLE001
            await self.db.rollback()
            self.db.add(report)
            await self.db.flush()
            failed_step = self._infer_failed_step(report)
            await self._log(report.id, failed_step, ProcessingStatus.FAILED, detail=f"Debug {failed_step} failed.", error_message=str(exc))
            await self.db.commit()
            await self.db.refresh(report, attribute_names=["processing_logs"])
            raise ProcessingError(str(exc)) from exc
        finally:
            await self.storage.cleanup_temp(stored_upload.temp_path, uses_temp_copy=stored_upload.uses_temp_copy)

    def _clean_text(self, raw_text: str) -> str:
        cleaned = clean_ocr_text(raw_text)
        cleaned = "\n".join(line.strip() for line in cleaned.splitlines() if line.strip())
        cleaned = " ".join(cleaned.split()) if "\n" not in cleaned else cleaned
        cleaned = cleaned.replace(" ,", ",").replace(" .", ".")
        return cleaned[: settings.max_ai_input_chars].strip()

    def _normalize_key_values(self, items) -> dict:
        return self.clinical_normalizer.normalize(items).key_values

    def _repair_numeric_values(self, raw_text: str, items):
        repaired = []
        invalid_values_detected: list[str] = []
        fixed = False
        for item in items:
            cleaned_value = clean_numeric_value(str(item.value))
            if cleaned_value is None:
                invalid_values_detected.append(item.name)
                fallback_value = extract_numeric_value_from_text(raw_text, normalize_parameter_name(item.name))
                if fallback_value is None:
                    continue
                item.value = fallback_value
                fixed = True
            elif cleaned_value != item.value:
                item.value = cleaned_value
                fixed = True
            repaired.append(item)
        return repaired, fixed, invalid_values_detected

    def _validate_normalized_parameters(self, parameters: list[dict]) -> list[dict]:
        validated: list[dict] = []
        unit_map = {
            "ug/dL": "µg/dL",
            "ug/dl": "µg/dL",
            "/uL": "/µL",
            "/ul": "/µL",
            "x10^3/uL": "×10³/µL",
            "x10^6/uL": "×10⁶/µL",
        }
        for parameter in parameters:
            if not isinstance(parameter.get("value"), (float, int)):
                continue
            parameter["status"] = parameter.get("status") or "unknown"
            parameter["interpretation"] = parameter.get("interpretation") or parameter["status"]
            parameter["unit"] = unit_map.get(parameter.get("unit"), parameter.get("unit") or "unknown")
            validated.append(parameter)
        return validated

    def _validate_metadata(self, metadata: dict) -> dict:
        patient = metadata.get("patient", {})
        doctor = metadata.get("doctor", {})
        lab = metadata.get("lab", {})
        patient["full_name"] = self._clean_metadata_text(patient.get("full_name"), title_case=True)
        doctor["doctor_name"] = self._clean_metadata_text(doctor.get("doctor_name"), title_case=True, preserve_dr=True)
        doctor["referring_doctor"] = self._clean_metadata_text(doctor.get("referring_doctor"), title_case=True, preserve_dr=True)
        lab["lab_name"] = self._clean_metadata_text(lab.get("lab_name"), title_case=True, preserve_upper_tokens={"SRL"})
        metadata["patient"] = patient
        metadata["doctor"] = doctor
        metadata["lab"] = lab
        return metadata

    def _clean_metadata_text(
        self,
        value: str | None,
        *,
        title_case: bool = False,
        preserve_dr: bool = False,
        preserve_upper_tokens: set[str] | None = None,
    ) -> str | None:
        if not value:
            return None
        cleaned = value.strip()
        cleaned = cleaned.replace("  ", " ")
        cleaned = cleaned.strip(" .:-,")
        tokens = cleaned.split()
        result_tokens: list[str] = []
        preserve_upper_tokens = preserve_upper_tokens or set()
        for token in tokens:
            upper = token.upper().strip(".,")
            if upper in {"PATIENT", "ID", "CLIENT", "AGE", "GENDER", "SEX"}:
                break
            if preserve_dr and upper in {"DR", "DR."}:
                result_tokens.append("Dr.")
                continue
            if upper in preserve_upper_tokens:
                result_tokens.append(upper)
                continue
            result_tokens.append(token.capitalize() if title_case else token)
        cleaned = " ".join(result_tokens).strip()
        if preserve_dr and cleaned.lower().startswith("dr ") and not cleaned.startswith("Dr. "):
            cleaned = cleaned.replace("Dr ", "Dr. ", 1)
        if preserve_dr and cleaned and not cleaned.lower().startswith("dr. "):
            cleaned = f"Dr. {cleaned}"
        return cleaned or None

    def _all_numeric_values_valid(self, parameters: list[dict]) -> bool:
        return bool(parameters) and all(isinstance(parameter.get("value"), (float, int)) for parameter in parameters)

    def _serialize_logs(self, logs) -> list[dict]:
        return [
            {
                "step": log.step,
                "status": log.status,
                "detail": log.detail,
                "error_message": log.error_message,
                "payload": log.payload,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in sorted(logs, key=lambda entry: entry.created_at or 0)
        ]

    def _infer_failed_step(self, report: Report) -> ProcessingStep:
        if report.status == ReportStatus.UPLOADED:
            return ProcessingStep.OCR
        if report.raw_text and not report.report_metadata:
            return ProcessingStep.METADATA_EXTRACTION
        if report.status == ReportStatus.OCR_COMPLETE or report.status == ReportStatus.PROCESSING:
            return ProcessingStep.AI_PROCESSING
        return ProcessingStep.STORAGE

    async def _log(
        self,
        report_id,
        step: ProcessingStep,
        status: ProcessingStatus,
        detail: str | None = None,
        error_message: str | None = None,
        payload: dict | None = None,
    ) -> None:
        log = ProcessingLog(report_id=report_id, step=step, status=status, detail=detail, error_message=error_message, payload=payload or {})
        self.db.add(log)
        await self.db.flush()
