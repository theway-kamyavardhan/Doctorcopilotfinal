from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentUpdate
from app.services.appointments import AppointmentService
from app.utils.dependencies import get_current_active_role_user

router = APIRouter()


@router.post("", response_model=AppointmentRead)
async def create_appointment(
    payload: AppointmentCreate,
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> AppointmentRead:
    return await AppointmentService(db).create_appointment(current_user.id, payload)


@router.patch("/{appointment_id}", response_model=AppointmentRead)
async def update_appointment(
    appointment_id: UUID,
    payload: AppointmentUpdate,
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> AppointmentRead:
    return await AppointmentService(db).update_appointment(appointment_id, current_user.id, payload)
