from sqlalchemy import Enum, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import SenderType
from app.models.mixins import UUIDTimestampMixin


class Message(UUIDTimestampMixin, Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_case_created_at", "case_id", "created_at"),)

    case_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    sender_user_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sender_type: Mapped[SenderType] = mapped_column(Enum(SenderType, name="sender_type"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(String(32), nullable=False, default="text")

    case = relationship("Case", back_populates="messages")
