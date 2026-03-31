from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AuthenticationError, NotFoundError
from app.core.security import hash_password, verify_password
from app.models.patient import Patient
from app.models.report import Report, ReportInsight
from app.schemas.patient import PatientPasswordUpdate, PatientUpdate
from app.schemas.insights import PatientInsightsResponse
from app.schemas.trends import PatientTrendsResponse
from app.services.export.pdf_generator import PatientPdfExportService
from app.services.insights.service import InsightsService
from app.services.insights.trends import TrendService


class PatientService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_profile(self, user_id) -> Patient:
        return await self._get_patient_by_user_id(user_id)

    async def update_profile(self, user_id, payload: PatientUpdate) -> Patient:
        patient = await self._get_patient_by_user_id(user_id)
        if payload.full_name is not None:
            patient.user.full_name = payload.full_name
        for field in ["gender", "age", "birth_date", "blood_group", "phone_number", "emergency_contact", "medical_history"]:
            value = getattr(payload, field)
            if value is not None:
                setattr(patient, field, value)
        await self.db.commit()
        await self.db.refresh(patient, attribute_names=["user"])
        return patient

    async def change_password(self, user_id, payload: PatientPasswordUpdate) -> Patient:
        patient = await self._get_patient_by_user_id(user_id)
        if not verify_password(payload.old_password, patient.user.hashed_password):
            raise AuthenticationError("Current password is incorrect.")
        patient.user.hashed_password = hash_password(payload.new_password)
        await self.db.commit()
        await self.db.refresh(patient, attribute_names=["user"])
        return patient

    async def list_reports(self, user_id) -> list[Report]:
        patient = await self._get_patient_by_user_id(user_id)
        statement = (
            select(Report)
            .where(Report.patient_id == patient.id)
            .options(selectinload(Report.extracted_data), selectinload(Report.insights))
            .order_by(Report.report_date.desc(), Report.created_at.desc())
        )
        return list((await self.db.scalars(statement)).all())

    async def get_health_insights(self, user_id, current_user) -> PatientInsightsResponse:
        patient = await self._get_patient_by_user_id(user_id)
        return await InsightsService(self.db).get_patient_insights(patient.id, current_user)

    async def get_patient_insights_by_id(self, patient_id, current_user) -> PatientInsightsResponse:
        return await InsightsService(self.db).get_patient_insights(patient_id, current_user)

    async def get_trends(self, user_id) -> PatientTrendsResponse:
        patient = await self._get_patient_by_user_id(user_id)
        return await TrendService(self.db).build_trends(patient.id)

    async def get_trends_by_patient_id(self, patient_id) -> PatientTrendsResponse:
        return await TrendService(self.db).build_trends(patient_id)

    async def export_health_report(self, user_id) -> tuple[bytes, str]:
        patient = await self._get_patient_by_user_id(user_id)
        return await PatientPdfExportService(self.db).generate_patient_report_pdf(patient.id)

    async def _get_patient_by_user_id(self, user_id) -> Patient:
        statement = select(Patient).where(Patient.user_id == user_id).options(selectinload(Patient.user))
        patient = (await self.db.execute(statement)).scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient profile not found.")
        return patient
