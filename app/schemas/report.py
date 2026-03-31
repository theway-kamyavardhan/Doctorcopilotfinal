from datetime import date, time
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ReportStatus
from app.schemas.common import TimestampedResponse


class ExtractedDataRead(TimestampedResponse):
    report_id: UUID
    schema_version: str
    report_type: str
    summary: str
    key_values: dict[str, Any]
    normalized_terms: list[dict[str, Any]]
    confidence: float | None


class ReportInsightRead(TimestampedResponse):
    report_id: UUID
    category: str
    title: str
    description: str
    severity: str
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    metadata: dict[str, Any] = Field(alias="insight_metadata")


class ReportRead(TimestampedResponse):
    patient_id: UUID
    case_id: UUID | None
    file_name: str
    mime_type: str
    report_type: str | None
    report_category: str | None = None
    report_keywords: list[str] = Field(default_factory=list)
    report_metadata: dict[str, Any] | None = None
    parameters: list[dict[str, Any]] = Field(default_factory=list)
    patient_name: str | None = None
    lab_name: str | None = None
    doctor_name: str | None = None
    sample_type: str | None = None
    machine_used: str | None = None
    report_date: date | None = None
    sample_collection_date: date | None = None
    report_generation_date: date | None = None
    report_time: time | None = None
    date_confidence: str | None = None
    raw_text: str | None = None
    summary: str | None
    status: ReportStatus
    extracted_data: ExtractedDataRead | None = None
    insights: list[ReportInsightRead] = Field(default_factory=list)

    @field_validator("parameters", mode="before")
    @classmethod
    def default_parameters(cls, value):
        return value or []

    @field_validator("report_keywords", mode="before")
    @classmethod
    def default_keywords(cls, value):
        return value or []


class ReportProcessingResponse(BaseModel):
    report: ReportRead
    processing_state: str


class DebugProcessingLog(BaseModel):
    step: str
    status: str
    detail: str | None = None
    error_message: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None


class DebugProcessReportResponse(BaseModel):
    raw_text: str
    metadata: dict[str, Any]
    parameters: list[dict[str, Any]] = Field(default_factory=list)
    panels: dict[str, list[dict[str, Any]]] = Field(default_factory=dict)
    insights: list[dict[str, Any]] = Field(default_factory=list)
    confidence: float | None = None
    cleaned: bool = False
    ai_output: dict[str, Any]
    final_output: dict[str, Any]
    parsed_data: dict[str, Any]
    value_extraction_fixed: bool = False
    invalid_values_detected: list[str] = Field(default_factory=list)
    logs: list[DebugProcessingLog]


class HealthInsightsResponse(BaseModel):
    patient_id: UUID
    report_count: int
    insights: list[ReportInsightRead]
