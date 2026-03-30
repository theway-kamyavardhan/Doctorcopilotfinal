from sqlalchemy import ForeignKey, Index, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDTimestampMixin


class ClinicalNote(UUIDTimestampMixin, Base):
    __tablename__ = "clinical_notes"
    __table_args__ = (Index("ix_clinical_notes_case_created_at", "case_id", "created_at"),)

    case_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)

    case = relationship("Case", back_populates="clinical_notes")
    doctor = relationship("Doctor", back_populates="clinical_notes")
