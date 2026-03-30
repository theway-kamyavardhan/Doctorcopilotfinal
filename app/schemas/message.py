from uuid import UUID

from pydantic import BaseModel

from app.models.enums import SenderType
from app.schemas.common import TimestampedResponse


class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"


class MessageRead(TimestampedResponse):
    case_id: UUID
    sender_user_id: UUID
    sender_type: SenderType
    content: str
    message_type: str
