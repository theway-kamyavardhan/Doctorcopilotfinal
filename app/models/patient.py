from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDTimestampMixin


class Patient(UUIDTimestampMixin, Base):
    __tablename__ = "patients"
    __table_args__ = (
        Index("ix_patients_user_id", "user_id", unique=True),
        Index("ix_patients_patient_id", "patient_id", unique=True),
    )

    user_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    patient_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    medical_history: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="patient_profile")
    reports = relationship("Report", back_populates="patient")
    cases = relationship("Case", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
