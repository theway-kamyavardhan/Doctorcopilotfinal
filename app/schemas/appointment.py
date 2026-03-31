from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import AppointmentStatus
from app.schemas.common import TimestampedResponse


class AppointmentCreate(BaseModel):
    patient_id: UUID
    case_id: UUID
    title: str
    description: str | None = None
    location: str | None = None
    date_time: datetime


class AppointmentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    date_time: datetime | None = None
    status: AppointmentStatus | None = None


class AppointmentRead(TimestampedResponse):
    patient_id: UUID
    doctor_id: UUID
    case_id: UUID
    title: str
    description: str | None
    location: str | None
    date_time: datetime
    status: AppointmentStatus
    doctor_name: str | None = None
    doctor_specialization: str | None = None
    patient_name: str | None = None
