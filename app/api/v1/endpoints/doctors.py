from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.appointment import AppointmentRead
from app.schemas.case import CaseRead
from app.schemas.doctor import DoctorDashboard, DoctorRead, DoctorUpdate
from app.services.appointments import AppointmentService
from app.services.doctors import DoctorService
from app.utils.dependencies import get_current_active_role_user

router = APIRouter()


@router.get("/me", response_model=DoctorRead)
async def get_doctor_profile(
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> DoctorRead:
    return await DoctorService(db).get_profile(current_user.id)


@router.patch("/me", response_model=DoctorRead)
async def update_doctor_profile(
    payload: DoctorUpdate,
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> DoctorRead:
    return await DoctorService(db).update_profile(current_user.id, payload)


@router.get("/me/cases", response_model=list[CaseRead])
async def list_doctor_cases(
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> list[CaseRead]:
    return await DoctorService(db).list_cases(current_user.id)


@router.get("/me/dashboard", response_model=DoctorDashboard)
async def get_doctor_dashboard(
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> DoctorDashboard:
    return await DoctorService(db).get_dashboard(current_user.id)


@router.get("/me/appointments", response_model=list[AppointmentRead])
async def list_doctor_appointments(
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> list[AppointmentRead]:
    return await AppointmentService(db).list_doctor_appointments(current_user.id)
