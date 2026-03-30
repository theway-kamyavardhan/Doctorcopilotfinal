from sqlalchemy import Enum, ForeignKey, Index, JSON, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ProcessingStatus, ProcessingStep
from app.models.mixins import UUIDTimestampMixin


class ProcessingLog(UUIDTimestampMixin, Base):
    __tablename__ = "processing_logs"
    __table_args__ = (
        Index("ix_processing_logs_report_step", "report_id", "step"),
        Index("ix_processing_logs_status_created_at", "status", "created_at"),
    )

    report_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    step: Mapped[ProcessingStep] = mapped_column(Enum(ProcessingStep, name="processing_step"), nullable=False)
    status: Mapped[ProcessingStatus] = mapped_column(Enum(ProcessingStatus, name="processing_status"), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=False, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    report = relationship("Report", back_populates="processing_logs")
