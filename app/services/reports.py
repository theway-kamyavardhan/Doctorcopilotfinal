from pathlib import Path
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AuthorizationError, NotFoundError
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.report import Report
from app.models.user import User
from app.schemas.report import DebugProcessReportResponse, ReportProcessingResponse
from app.services.export.pdf_generator import SingleReportPdfExportService
from app.services.processing.orchestrator import ReportProcessingOrchestrator


class ReportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def upload_and_process_report(self, current_user: User, file: UploadFile, case_id: UUID | None) -> ReportProcessingResponse:
        patient = await self._get_patient_by_user_id(current_user.id)
        if case_id is not None:
            case = await self.db.get(Case, case_id)
            if not case or case.patient_id != patient.id:
                raise AuthorizationError("You can only attach reports to your own cases.")

        orchestrator = ReportProcessingOrchestrator(self.db)
        report = await orchestrator.process_upload(patient, file, case_id)
        return ReportProcessingResponse(report=report, processing_state=report.status)

    async def get_report(self, report_id: UUID, current_user: User) -> Report:
        statement = (
            select(Report)
            .where(Report.id == report_id)
            .options(selectinload(Report.extracted_data), selectinload(Report.insights))
        )
        report = (await self.db.execute(statement)).scalar_one_or_none()
        if not report:
            raise NotFoundError("Report not found.")

        if current_user.role == UserRole.PATIENT:
            patient = await self._get_patient_by_user_id(current_user.id)
            if report.patient_id != patient.id:
                raise AuthorizationError("You do not have access to this report.")
        elif current_user.role == UserRole.DOCTOR:
            doctor = (await self.db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
            if not doctor:
                raise AuthorizationError("Doctor profile not found for this account.")
            access_state = await self.db.scalar(
                select(Case.report_access_status).where(
                    Case.doctor_id == doctor.id,
                    Case.patient_id == report.patient_id,
                    Case.report_access_status == "granted",
                ).limit(1)
            )
            if access_state is None:
                raise AuthorizationError("You do not have access to this report.")
        return report

    async def debug_process_report(self, current_user: User, file: UploadFile) -> DebugProcessReportResponse:
        patient = await self._get_patient_by_user_id(current_user.id)
        orchestrator = ReportProcessingOrchestrator(self.db)
        result = await orchestrator.debug_process(patient, file)
        return DebugProcessReportResponse(**result)

    async def delete_report(self, report_id: UUID, current_user: User) -> None:
        patient = await self._get_patient_by_user_id(current_user.id)
        statement = select(Report).where(Report.id == report_id)
        report = (await self.db.execute(statement)).scalar_one_or_none()
        if not report:
            raise NotFoundError("Report not found.")
        if report.patient_id != patient.id:
            raise AuthorizationError("You can only delete your own reports.")

        file_path = Path(report.file_path) if report.file_path else None
        await self.db.delete(report)
        await self.db.commit()

        if file_path and file_path.exists():
            try:
                file_path.unlink()
            except OSError:
                # Keep the DB delete successful even if local cleanup fails.
                pass

    async def export_report_pdf(self, report_id: UUID, current_user: User, mode: str = "ai") -> tuple[bytes, str]:
        report = await self.get_report(report_id, current_user)
        exporter = SingleReportPdfExportService()
        return exporter.generate_report_pdf(report, mode)

    async def get_report_file(self, report_id: UUID, current_user: User) -> tuple[Report, Path]:
        report = await self.get_report(report_id, current_user)
        file_path = Path(report.file_path) if report.file_path else None
        if not file_path or not file_path.exists():
            raise NotFoundError("Original uploaded report file was not found.")
        return report, file_path

    async def _get_patient_by_user_id(self, user_id) -> Patient:
        patient = (await self.db.execute(select(Patient).where(Patient.user_id == user_id))).scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient profile not found.")
        return patient
