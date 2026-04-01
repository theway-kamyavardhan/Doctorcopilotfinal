from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.common import TimestampedResponse
from app.schemas.user import UserRead


class PatientCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    gender: str | None = None
    age: int | None = None
    birth_date: date | None = None
    blood_group: str | None = None
    phone_number: str | None = None
    emergency_contact: str | None = None
    medical_history: str | None = None


class PatientUpdate(BaseModel):
    full_name: str | None = None
    gender: str | None = None
    age: int | None = None
    birth_date: date | None = None
    blood_group: str | None = None
    phone_number: str | None = None
    emergency_contact: str | None = None
    medical_history: str | None = None


class PatientPasswordUpdate(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8)


class PatientRead(TimestampedResponse):
    patient_id: str
    gender: str | None
    age: int | None
    birth_date: date | None
    blood_group: str | None
    phone_number: str | None
    emergency_contact: str | None
    medical_history: str | None
    user: UserRead


class PatientRegistrationResponse(PatientRead):
    password: str | None = Field(default=None, alias="_raw_password")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
