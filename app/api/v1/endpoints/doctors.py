from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.appointment import AppointmentRead
from app.schemas.case import CaseRead
from app.schemas.doctor import DoctorDashboard, DoctorDirectoryItem, DoctorPatientSearchItem, DoctorPasswordUpdate, DoctorRead, DoctorUpdate
from app.services.appointments import AppointmentService
from app.services.cases import CaseService
from app.services.doctors import DoctorService
from app.utils.dependencies import get_current_active_role_user

router = APIRouter()


@router.get("/directory", response_model=list[DoctorDirectoryItem])
async def list_doctor_directory(
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> list[DoctorDirectoryItem]:
    return await DoctorService(db).list_directory()


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


@router.patch("/me/password", response_model=DoctorRead)
async def update_doctor_password(
    payload: DoctorPasswordUpdate,
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> DoctorRead:
    return await DoctorService(db).change_password(current_user.id, payload)


@router.get("/me/cases", response_model=list[CaseRead])
async def list_doctor_cases(
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> list[CaseRead]:
    return await CaseService(db).list_cases_for_user(current_user)


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


@router.get("/patients/search", response_model=list[DoctorPatientSearchItem])
async def search_patients_for_doctor(
    q: str | None = None,
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> list[DoctorPatientSearchItem]:
    return await DoctorService(db).search_patients(q)
