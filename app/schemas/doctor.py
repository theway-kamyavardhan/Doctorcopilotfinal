from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import TimestampedResponse
from app.schemas.user import UserRead


class DoctorCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    license_number: str | None = None
    specialization: str
    hospital: str | None = None
    location: str | None = None
    phone_number: str | None = None
    bio: str | None = None


class DoctorUpdate(BaseModel):
    full_name: str | None = None
    specialization: str | None = None
    hospital: str | None = None
    location: str | None = None
    phone_number: str | None = None
    bio: str | None = None


class DoctorPasswordUpdate(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8)


class DoctorRead(TimestampedResponse):
    license_number: str
    specialization: str
    hospital: str | None
    location: str | None
    phone_number: str | None
    bio: str | None
    user: UserRead


class DoctorDashboard(BaseModel):
    total_cases: int
    pending_cases: int = 0
    open_cases: int
    in_review_cases: int
    closed_cases: int
    recent_report_count: int


class DoctorPatientSearchItem(BaseModel):
    id: str
    patient_id: str
    full_name: str
    age: int | None = None
    gender: str | None = None
    blood_group: str | None = None


class DoctorDirectoryItem(BaseModel):
    id: str
    full_name: str
    license_number: str
    specialization: str
    hospital: str | None = None
    location: str | None = None
