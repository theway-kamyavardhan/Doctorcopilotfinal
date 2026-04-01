from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, Uuid
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
    request_origin: Mapped[str] = mapped_column(String(32), nullable=False, default="patient")
    referral_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    referred_by_doctor_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    report_access_status: Mapped[str] = mapped_column(String(32), nullable=False, default="not_requested")
    report_access_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    report_access_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    report_access_requested_by_doctor_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus, name="case_status"), default=CaseStatus.OPEN, nullable=False)
    closing_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    closed_by_doctor_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient = relationship("Patient", back_populates="cases")
    doctor = relationship("Doctor", back_populates="cases", foreign_keys=[doctor_id])
    referred_by_doctor = relationship("Doctor", foreign_keys=[referred_by_doctor_id])
    report_access_requested_by_doctor = relationship("Doctor", foreign_keys=[report_access_requested_by_doctor_id])
    closed_by_doctor = relationship("Doctor", foreign_keys=[closed_by_doctor_id])
    reports = relationship("Report", back_populates="case")
    messages = relationship("Message", back_populates="case", cascade="all, delete-orphan")
    clinical_notes = relationship("ClinicalNote", back_populates="case", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="case", cascade="all, delete-orphan")
