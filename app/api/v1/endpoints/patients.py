from fastapi import APIRouter, Depends
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.appointment import AppointmentRead
from app.schemas.insights import PatientInsightsResponse
from app.schemas.patient import PatientPasswordUpdate, PatientRead, PatientUpdate
from app.schemas.report import ReportRead
from app.schemas.trends import PatientTrendsResponse
from app.services.patients import PatientService
from app.services.appointments import AppointmentService
from app.utils.dependencies import get_current_active_role_user

router = APIRouter()


@router.get("/me", response_model=PatientRead)
async def get_patient_profile(
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    return await PatientService(db).get_profile(current_user.id)


@router.patch("/me", response_model=PatientRead)
async def update_patient_profile(
    payload: PatientUpdate,
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    return await PatientService(db).update_profile(current_user.id, payload)


@router.patch("/me/password", response_model=PatientRead)
async def update_patient_password(
    payload: PatientPasswordUpdate,
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    return await PatientService(db).change_password(current_user.id, payload)


@router.get("/me/reports", response_model=list[ReportRead])
async def list_patient_reports(
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> list[ReportRead]:
    return await PatientService(db).list_reports(current_user.id)


@router.get("/me/insights", response_model=PatientInsightsResponse)
async def get_patient_insights(
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> PatientInsightsResponse:
    return await PatientService(db).get_health_insights(current_user.id, current_user)


@router.get("/me/trends", response_model=PatientTrendsResponse)
async def get_my_trends(
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> PatientTrendsResponse:
    return await PatientService(db).get_trends(current_user.id)


@router.get("/me/appointments", response_model=list[AppointmentRead])
async def get_my_appointments(
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> list[AppointmentRead]:
    return await AppointmentService(db).list_patient_appointments(current_user.id)


@router.get("/{patient_id}/insights", response_model=PatientInsightsResponse)
async def get_patient_insights_by_id(
    patient_id: UUID,
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> PatientInsightsResponse:
    return await PatientService(db).get_patient_insights_by_id(patient_id, current_user)


@router.get("/{patient_id}/trends", response_model=PatientTrendsResponse)
async def get_patient_trends_by_id(
    patient_id: UUID,
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> PatientTrendsResponse:
    return await PatientService(db).get_trends_by_patient_id(patient_id)
