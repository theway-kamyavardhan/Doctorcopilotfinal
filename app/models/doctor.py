from sqlalchemy import ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDTimestampMixin


class Doctor(UUIDTimestampMixin, Base):
    __tablename__ = "doctors"
    __table_args__ = (Index("ix_doctors_user_id", "user_id", unique=True), Index("ix_doctors_specialization", "specialization"))

    user_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    license_number: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    specialization: Mapped[str] = mapped_column(String(128), nullable=False)
    hospital: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="doctor_profile")
    cases = relationship("Case", back_populates="doctor")
    clinical_notes = relationship("ClinicalNote", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
