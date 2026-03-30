from typing import Any

from pydantic import BaseModel, Field


class NormalizedTerm(BaseModel):
    source_term: str = Field(description="Original medical term from the report.")
    normalized_term: str = Field(description="Normalized medical concept.")
    coding_system: str | None = Field(default=None, description="Optional coding source such as LOINC or SNOMED.")


class MedicalKeyValue(BaseModel):
    name: str
    value: float
    unit: str | None = None
    reference_range: str | None = None
    interpretation: str | None = None


class InsightMetadataItem(BaseModel):
    key: str
    value: str


class ReportInsightPayload(BaseModel):
    category: str
    title: str
    description: str
    severity: str = "info"
    metadata: list[InsightMetadataItem] = Field(default_factory=list)


class StructuredMedicalReport(BaseModel):
    report_type: str
    summary: str
    key_values: list[MedicalKeyValue] = Field(default_factory=list)
    normalized_terms: list[NormalizedTerm] = Field(default_factory=list)
    insights: list[ReportInsightPayload] = Field(default_factory=list)
    confidence: float | None = None
