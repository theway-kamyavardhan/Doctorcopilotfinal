from datetime import date, time

from sqlalchemy import Date, Enum, ForeignKey, Index, JSON, String, Text, Time, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ReportStatus
from app.models.mixins import UUIDTimestampMixin


class Report(UUIDTimestampMixin, Base):
    __tablename__ = "reports"
    __table_args__ = (
        Index("ix_reports_patient_status", "patient_id", "status"),
        Index("ix_reports_case_id", "case_id"),
        Index("ix_reports_type", "report_type"),
        Index("ix_reports_report_date", "report_date"),
    )

    patient_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    case_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    checksum: Mapped[str | None] = mapped_column(String(128), nullable=True)
    report_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    report_metadata: Mapped[dict | None] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=True, default=dict)
    parameters: Mapped[list | None] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=True, default=list)
    patient_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lab_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sample_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    machine_used: Mapped[str | None] = mapped_column(String(255), nullable=True)
    report_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sample_collection_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    report_generation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    report_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    date_confidence: Mapped[str | None] = mapped_column(String(16), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus, name="report_status"), default=ReportStatus.UPLOADED)

    patient = relationship("Patient", back_populates="reports")
    case = relationship("Case", back_populates="reports")
    extracted_data = relationship("ExtractedData", back_populates="report", uselist=False, cascade="all, delete-orphan")
    insights = relationship("ReportInsight", back_populates="report", cascade="all, delete-orphan")
    processing_logs = relationship("ProcessingLog", back_populates="report", cascade="all, delete-orphan")


class ExtractedData(UUIDTimestampMixin, Base):
    __tablename__ = "extracted_data"
    __table_args__ = (Index("ix_extracted_data_report_id", "report_id", unique=True),)

    report_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    schema_version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0")
    report_type: Mapped[str] = mapped_column(String(128), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    key_values: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=False, default=dict)
    normalized_terms: Mapped[list] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=False, default=list)
    confidence: Mapped[float | None] = mapped_column(nullable=True)

    report = relationship("Report", back_populates="extracted_data")


class ReportInsight(UUIDTimestampMixin, Base):
    __tablename__ = "report_insights"
    __table_args__ = (Index("ix_report_insights_report_id", "report_id"), Index("ix_report_insights_category", "category"))

    report_id: Mapped[str] = mapped_column(Uuid(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="info")
    insight_metadata: Mapped[dict] = mapped_column("metadata", JSONB().with_variant(JSON(), "sqlite"), nullable=False, default=dict)

    report = relationship("Report", back_populates="insights")
