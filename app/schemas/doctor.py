from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import TimestampedResponse
from app.schemas.user import UserRead


class DoctorCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    license_number: str
    specialization: str
    bio: str | None = None


class DoctorUpdate(BaseModel):
    full_name: str | None = None
    specialization: str | None = None
    bio: str | None = None


class DoctorRead(TimestampedResponse):
    license_number: str
    specialization: str
    bio: str | None
    user: UserRead


class DoctorDashboard(BaseModel):
    total_cases: int
    open_cases: int
    in_review_cases: int
    closed_cases: int
    recent_report_count: int
