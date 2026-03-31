import secrets
import string
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.core.security import hash_password
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.enums import CaseStatus, ProcessingStatus, ReportStatus
from app.models.patient import Patient
from app.models.processing import ProcessingLog
from app.models.report import ExtractedData, Report
from app.schemas.admin import (
    AdminCaseListItem,
    AdminCaseUpdate,
    AdminDashboardResponse,
    AdminDoctorListItem,
    AdminDoctorPasswordResetResponse,
    AdminDoctorStatusUpdate,
    AdminEvaluationResult,
    AdminPatientListItem,
    AdminPipelineLogItem,
    AdminPipelineResponse,
    AdminReportListItem,
    AdminSystemStatusResponse,
)


class AdminService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_dashboard(self) -> AdminDashboardResponse:
        total_patients = int((await self.db.scalar(select(func.count(Patient.id)))) or 0)
        total_doctors = int((await self.db.scalar(select(func.count(Doctor.id)))) or 0)
        active_cases = int(
            (
                await self.db.scalar(
                    select(func.count(Case.id)).where(Case.status.in_([CaseStatus.PENDING, CaseStatus.OPEN, CaseStatus.IN_REVIEW]))
                )
            )
            or 0
        )
        reports_processed = int(
            (await self.db.scalar(select(func.count(Report.id)).where(Report.status == ReportStatus.PROCESSED))) or 0
        )
        failure_logs = int(
            (await self.db.scalar(select(func.count(ProcessingLog.id)).where(ProcessingLog.status == ProcessingStatus.FAILED))) or 0
        )
        success_logs = int(
            (await self.db.scalar(select(func.count(ProcessingLog.id)).where(ProcessingLog.status == ProcessingStatus.SUCCESS))) or 0
        )
        processing_reports = int(
            (await self.db.scalar(select(func.count(Report.id)).where(Report.status == ReportStatus.PROCESSING))) or 0
        )
        abnormal_reports = int(
            (await self.db.scalar(select(func.count(Report.id)).where(Report.status.in_([ReportStatus.FAILED, ReportStatus.PROCESSING]))))
            or 0
        )

        total_logs = success_logs + failure_logs
        success_rate = round((success_logs / total_logs) * 100, 1) if total_logs else 100.0

        if failure_logs >= max(3, success_logs):
            system_health = "critical"
        elif processing_reports > 0 or failure_logs > 0:
            system_health = "degraded"
        else:
            system_health = "healthy"

        return AdminDashboardResponse(
            total_patients=total_patients,
            total_doctors=total_doctors,
            active_cases=active_cases,
            reports_processed=reports_processed,
            system_health=system_health,
            backend_status="online",
            frontend_status="connected",
            ai_processing_state="processing" if processing_reports else "idle",
            pipeline_success_rate=success_rate,
            abnormal_reports=abnormal_reports,
        )

    async def list_doctors(self) -> list[AdminDoctorListItem]:
        statement = select(Doctor).options(selectinload(Doctor.user)).order_by(Doctor.created_at.desc())
        doctors = list((await self.db.scalars(statement)).all())
        return [
            AdminDoctorListItem(
                id=doctor.id,
                created_at=doctor.created_at,
                updated_at=doctor.updated_at,
                license_number=doctor.license_number,
                specialization=doctor.specialization,
                hospital=doctor.hospital,
                location=doctor.location,
                phone_number=doctor.phone_number,
                full_name=doctor.user.full_name,
                email=doctor.user.email,
                is_active=doctor.user.is_active,
            )
            for doctor in doctors
        ]

    async def set_doctor_active(self, doctor_id: UUID, payload: AdminDoctorStatusUpdate) -> AdminDoctorListItem:
        doctor = await self._get_doctor(doctor_id)
        doctor.user.is_active = payload.is_active
        await self.db.commit()
        await self.db.refresh(doctor, attribute_names=["user"])
        return AdminDoctorListItem(
            id=doctor.id,
            created_at=doctor.created_at,
            updated_at=doctor.updated_at,
            license_number=doctor.license_number,
            specialization=doctor.specialization,
            hospital=doctor.hospital,
            location=doctor.location,
            phone_number=doctor.phone_number,
            full_name=doctor.user.full_name,
            email=doctor.user.email,
            is_active=doctor.user.is_active,
        )

    async def reset_doctor_password(self, doctor_id: UUID) -> AdminDoctorPasswordResetResponse:
        doctor = await self._get_doctor(doctor_id)
        temporary_password = self._generate_temp_password()
        doctor.user.hashed_password = hash_password(temporary_password)
        await self.db.commit()
        return AdminDoctorPasswordResetResponse(doctor_id=doctor.id, temporary_password=temporary_password)

    async def list_patients(self) -> list[AdminPatientListItem]:
        report_counts = {
            patient_id: count
            for patient_id, count in (
                await self.db.execute(select(Report.patient_id, func.count(Report.id)).group_by(Report.patient_id))
            ).all()
        }
        active_case_counts = {
            patient_id: count
            for patient_id, count in (
                await self.db.execute(
                    select(Case.patient_id, func.count(Case.id))
                    .where(Case.status.in_([CaseStatus.PENDING, CaseStatus.OPEN, CaseStatus.IN_REVIEW]))
                    .group_by(Case.patient_id)
                )
            ).all()
        }
        statement = select(Patient).options(selectinload(Patient.user)).order_by(Patient.created_at.desc())
        patients = list((await self.db.scalars(statement)).all())
        return [
            AdminPatientListItem(
                id=patient.id,
                created_at=patient.created_at,
                updated_at=patient.updated_at,
                patient_id=patient.patient_id,
                full_name=patient.user.full_name,
                email=patient.user.email,
                gender=patient.gender,
                age=patient.age,
                blood_group=patient.blood_group,
                phone_number=patient.phone_number,
                report_count=int(report_counts.get(patient.id, 0)),
                active_case_count=int(active_case_counts.get(patient.id, 0)),
            )
            for patient in patients
        ]

    async def delete_patient(self, patient_id: UUID) -> None:
        patient = await self._get_patient(patient_id)
        user = patient.user
        await self.db.delete(patient)
        if user is not None:
            await self.db.delete(user)
        await self.db.commit()

    async def list_cases(self) -> list[AdminCaseListItem]:
        statement = (
            select(Case)
            .options(
                selectinload(Case.patient).selectinload(Patient.user),
                selectinload(Case.doctor).selectinload(Doctor.user),
            )
            .order_by(Case.created_at.desc())
        )
        cases = list((await self.db.scalars(statement)).all())
        return [
            AdminCaseListItem(
                id=case.id,
                created_at=case.created_at,
                updated_at=case.updated_at,
                patient_id=case.patient_id,
                doctor_id=case.doctor_id,
                title=case.title,
                description=case.description,
                status=case.status,
                patient_name=case.patient.user.full_name if case.patient and case.patient.user else "Unknown patient",
                doctor_name=case.doctor.user.full_name if case.doctor and case.doctor.user else None,
            )
            for case in cases
        ]

    async def update_case(self, case_id: UUID, payload: AdminCaseUpdate) -> AdminCaseListItem:
        case = await self._get_case(case_id)
        if payload.doctor_id is not None:
            doctor = await self.db.get(Doctor, payload.doctor_id)
            if not doctor:
                raise NotFoundError("Doctor not found.")
            case.doctor_id = doctor.id
        if payload.status is not None:
            case.status = payload.status
        await self.db.commit()
        refreshed = await self._get_case(case_id)
        return AdminCaseListItem(
            id=refreshed.id,
            created_at=refreshed.created_at,
            updated_at=refreshed.updated_at,
            patient_id=refreshed.patient_id,
            doctor_id=refreshed.doctor_id,
            title=refreshed.title,
            description=refreshed.description,
            status=refreshed.status,
            patient_name=refreshed.patient.user.full_name if refreshed.patient and refreshed.patient.user else "Unknown patient",
            doctor_name=refreshed.doctor.user.full_name if refreshed.doctor and refreshed.doctor.user else None,
        )

    async def list_reports(self) -> list[AdminReportListItem]:
        statement = (
            select(Report)
            .options(selectinload(Report.extracted_data), selectinload(Report.processing_logs))
            .order_by(Report.created_at.desc())
        )
        reports = list((await self.db.scalars(statement)).all())
        items: list[AdminReportListItem] = []
        for report in reports:
            latest_failure = next(
                (
                    log.error_message
                    for log in sorted(report.processing_logs, key=lambda item: item.created_at, reverse=True)
                    if log.error_message
                ),
                None,
            )
            items.append(
                AdminReportListItem(
                    id=report.id,
                    created_at=report.created_at,
                    updated_at=report.updated_at,
                    patient_id=report.patient_id,
                    case_id=report.case_id,
                    file_name=report.file_name,
                    report_type=report.report_type,
                    report_category=report.report_category,
                    patient_name=report.patient_name,
                    lab_name=report.lab_name,
                    summary=report.summary,
                    report_date=report.report_date,
                    status=report.status,
                    confidence=report.extracted_data.confidence if report.extracted_data else None,
                    latest_error=latest_failure,
                )
            )
        return items

    async def get_system_status(self) -> AdminSystemStatusResponse:
        try:
            await self.db.execute(text("SELECT 1"))
            database_status = "connected"
        except Exception:
            database_status = "disconnected"

        last_errors = list(
            (
                await self.db.scalars(
                    select(ProcessingLog.error_message)
                    .where(ProcessingLog.error_message.is_not(None))
                    .order_by(ProcessingLog.created_at.desc())
                    .limit(5)
                )
            ).all()
        )
        processing_count = int(
            (await self.db.scalar(select(func.count(Report.id)).where(Report.status == ReportStatus.PROCESSING))) or 0
        )
        failure_count = int(
            (await self.db.scalar(select(func.count(ProcessingLog.id)).where(ProcessingLog.status == ProcessingStatus.FAILED))) or 0
        )

        if failure_count > 0:
            ai_state = "degraded"
        elif processing_count > 0:
            ai_state = "busy"
        else:
            ai_state = "ready"

        return AdminSystemStatusResponse(
            backend_status="online",
            database_status=database_status,
            ai_engine_state=ai_state,
            last_errors=last_errors,
        )

    async def get_pipeline(self) -> AdminPipelineResponse:
        reports_in_processing = int(
            (await self.db.scalar(select(func.count(Report.id)).where(Report.status == ReportStatus.PROCESSING))) or 0
        )
        success_logs = int(
            (await self.db.scalar(select(func.count(ProcessingLog.id)).where(ProcessingLog.status == ProcessingStatus.SUCCESS))) or 0
        )
        failure_logs = int(
            (await self.db.scalar(select(func.count(ProcessingLog.id)).where(ProcessingLog.status == ProcessingStatus.FAILED))) or 0
        )

        log_statement = (
            select(ProcessingLog)
            .options(selectinload(ProcessingLog.report))
            .order_by(ProcessingLog.created_at.desc())
            .limit(12)
        )
        logs = list((await self.db.scalars(log_statement)).all())

        evaluation_statement = (
            select(ExtractedData, Report.file_name)
            .join(Report, Report.id == ExtractedData.report_id)
            .order_by(ExtractedData.created_at.desc())
            .limit(8)
        )
        evaluations = (await self.db.execute(evaluation_statement)).all()

        return AdminPipelineResponse(
            reports_in_processing=reports_in_processing,
            success_logs=success_logs,
            failure_logs=failure_logs,
            evaluation_results=[
                AdminEvaluationResult(
                    report_id=extracted.report_id,
                    file_name=file_name,
                    confidence=extracted.confidence,
                    processed_at=extracted.created_at,
                )
                for extracted, file_name in evaluations
            ],
            recent_logs=[
                AdminPipelineLogItem(
                    id=log.id,
                    created_at=log.created_at,
                    updated_at=log.updated_at,
                    report_id=log.report_id,
                    report_file_name=log.report.file_name if log.report else None,
                    step=log.step,
                    status=log.status,
                    detail=log.detail,
                    error_message=log.error_message,
                )
                for log in logs
            ],
        )

    async def _get_doctor(self, doctor_id: UUID) -> Doctor:
        statement = select(Doctor).where(Doctor.id == doctor_id).options(selectinload(Doctor.user))
        doctor = (await self.db.execute(statement)).scalar_one_or_none()
        if not doctor:
            raise NotFoundError("Doctor not found.")
        return doctor

    async def _get_patient(self, patient_id: UUID) -> Patient:
        statement = select(Patient).where(Patient.id == patient_id).options(selectinload(Patient.user))
        patient = (await self.db.execute(statement)).scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient not found.")
        return patient

    async def _get_case(self, case_id: UUID) -> Case:
        statement = (
            select(Case)
            .where(Case.id == case_id)
            .options(selectinload(Case.patient).selectinload(Patient.user), selectinload(Case.doctor).selectinload(Doctor.user))
        )
        case = (await self.db.execute(statement)).scalar_one_or_none()
        if not case:
            raise NotFoundError("Case not found.")
        return case

    def _generate_temp_password(self) -> str:
        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(12))
