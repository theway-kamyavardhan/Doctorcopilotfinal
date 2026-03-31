from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.enums import CaseStatus
from app.models.report import Report
from app.schemas.doctor import DoctorDashboard, DoctorUpdate


class DoctorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_profile(self, user_id) -> Doctor:
        return await self._get_doctor_by_user_id(user_id)

    async def update_profile(self, user_id, payload: DoctorUpdate) -> Doctor:
        doctor = await self._get_doctor_by_user_id(user_id)
        if payload.full_name is not None:
            doctor.user.full_name = payload.full_name
        if payload.specialization is not None:
            doctor.specialization = payload.specialization
        if payload.hospital is not None:
            doctor.hospital = payload.hospital
        if payload.location is not None:
            doctor.location = payload.location
        if payload.phone_number is not None:
            doctor.phone_number = payload.phone_number
        if payload.bio is not None:
            doctor.bio = payload.bio
        await self.db.commit()
        await self.db.refresh(doctor, attribute_names=["user"])
        return doctor

    async def list_cases(self, user_id) -> list[Case]:
        doctor = await self._get_doctor_by_user_id(user_id)
        statement = select(Case).where(Case.doctor_id == doctor.id).order_by(Case.created_at.desc())
        return list((await self.db.scalars(statement)).all())

    async def get_dashboard(self, user_id) -> DoctorDashboard:
        doctor = await self._get_doctor_by_user_id(user_id)
        counts = {}
        for status in CaseStatus:
            stmt = select(func.count(Case.id)).where(Case.doctor_id == doctor.id, Case.status == status)
            counts[status] = (await self.db.scalar(stmt)) or 0
        report_stmt = select(func.count(Report.id)).join(Case, Case.id == Report.case_id).where(Case.doctor_id == doctor.id)
        return DoctorDashboard(
            total_cases=sum(counts.values()),
            pending_cases=counts.get(CaseStatus.PENDING, 0),
            open_cases=counts[CaseStatus.OPEN],
            in_review_cases=counts[CaseStatus.IN_REVIEW],
            closed_cases=counts[CaseStatus.CLOSED],
            recent_report_count=(await self.db.scalar(report_stmt)) or 0,
        )

    async def _get_doctor_by_user_id(self, user_id) -> Doctor:
        statement = select(Doctor).where(Doctor.user_id == user_id).options(selectinload(Doctor.user))
        doctor = (await self.db.execute(statement)).scalar_one_or_none()
        if not doctor:
            raise NotFoundError("Doctor profile not found.")
        return doctor
