from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import TimestampedResponse


class ClinicalNoteCreate(BaseModel):
    note: str


class ClinicalNoteRead(TimestampedResponse):
    case_id: UUID
    doctor_id: UUID
    note: str
