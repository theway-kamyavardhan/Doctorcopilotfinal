from pydantic import EmailStr

from app.models.enums import UserRole
from app.schemas.common import TimestampedResponse


class UserRead(TimestampedResponse):
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
