from sqlalchemy import Enum, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CaseStatus
from app.models.mixins import UUIDTimestampMixin


class Case(UUIDTimestampMixin, Base):
    __tablename__ = "cases"
    __table_args__ = (
        Index("ix_cases_patient_status", "patient_id", "status"),
        Index("ix_cases_doctor_status", "doctor_id", "status"),
    )

    patient_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus, name="case_status"), default=CaseStatus.OPEN, nullable=False)

    patient = relationship("Patient", back_populates="cases")
    doctor = relationship("Doctor", back_populates="cases")
    reports = relationship("Report", back_populates="case")
    messages = relationship("Message", back_populates="case", cascade="all, delete-orphan")
    clinical_notes = relationship("ClinicalNote", back_populates="case", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="case", cascade="all, delete-orphan")
