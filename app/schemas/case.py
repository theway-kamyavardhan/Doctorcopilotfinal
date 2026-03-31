from uuid import UUID

from pydantic import BaseModel

from app.models.enums import CaseStatus
from app.schemas.common import TimestampedResponse


class CaseCreate(BaseModel):
    patient_id: UUID | None = None
    title: str | None = None
    description: str | None = None
    type: str = "consultation_request"


class CaseStatusUpdate(BaseModel):
    status: CaseStatus


class CaseTransferRequest(BaseModel):
    doctor_id: UUID


class CaseRead(TimestampedResponse):
    patient_id: UUID
    doctor_id: UUID | None
    title: str
    description: str | None
    status: CaseStatus
