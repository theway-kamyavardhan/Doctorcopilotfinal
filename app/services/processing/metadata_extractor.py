from __future__ import annotations

from dataclasses import dataclass
from datetime import date, time
from typing import Any

from app.services.metadata.service import ReportMetadataExtractor


@dataclass
class MetadataExtractionResult:
    metadata: dict[str, Any]
    patient_name: str | None
    age: int | None
    gender: str | None
    accession_number: str | None
    report_date: date | None
    drawn_date: date | None
    received_date: date | None
    reported_date: date | None
    report_time: time | None
    lab_name: str | None
    location: str | None
    doctor_name: str | None
    sample_type: str | None
    machine_used: str | None
    date_confidence: str


_extractor = ReportMetadataExtractor()


def clean_ocr_text(text: str) -> str:
    return _extractor.clean_ocr_text(text)


def extract_metadata(clean_text: str) -> dict[str, Any]:
    result = _extractor.extract(clean_text)
    return {
        "patient_name": result.payload["patient"].get("full_name"),
        "age": int(result.payload["patient"]["age"]) if result.payload["patient"].get("age") else None,
        "gender": result.payload["patient"].get("gender"),
        "accession_number": result.payload["patient"].get("accession_number"),
        "report_dates": {
            "drawn": result.payload["report"].get("drawn_date"),
            "received": result.payload["report"].get("received_date"),
            "reported": result.payload["report"].get("reported_date"),
        },
        "lab_name": result.payload["lab"].get("lab_name"),
        "location": result.payload["lab"].get("address"),
        "doctor_name": result.payload["doctor"].get("doctor_name") or result.payload["doctor"].get("referring_doctor"),
    }


def extract_metadata_bundle(clean_text: str) -> MetadataExtractionResult:
    result = _extractor.extract(clean_text)
    patient = result.payload.get("patient", {})
    report = result.payload.get("report", {})
    lab = result.payload.get("lab", {})
    doctor = result.payload.get("doctor", {})
    return MetadataExtractionResult(
        metadata=result.payload,
        patient_name=patient.get("full_name"),
        age=int(patient["age"]) if patient.get("age") else None,
        gender=patient.get("gender"),
        accession_number=patient.get("accession_number"),
        report_date=result.report_date,
        drawn_date=result.sample_collection_date,
        received_date=_parse_date_or_none(report.get("received_date")),
        reported_date=_parse_date_or_none(report.get("reported_date")),
        report_time=result.report_time,
        lab_name=lab.get("lab_name"),
        location=lab.get("address"),
        doctor_name=doctor.get("doctor_name") or doctor.get("referring_doctor"),
        sample_type=result.sample_type,
        machine_used=result.machine_used,
        date_confidence=result.date_confidence,
    )


def _parse_date_or_none(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)
