from datetime import date

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import TimestampedResponse
from app.schemas.user import UserRead


class PatientCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    gender: str | None = None
    birth_date: date | None = None
    phone_number: str | None = None
    emergency_contact: str | None = None
    medical_history: str | None = None


class PatientUpdate(BaseModel):
    full_name: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    phone_number: str | None = None
    emergency_contact: str | None = None
    medical_history: str | None = None


class PatientRead(TimestampedResponse):
    gender: str | None
    birth_date: date | None
    phone_number: str | None
    emergency_contact: str | None
    medical_history: str | None
    user: UserRead
