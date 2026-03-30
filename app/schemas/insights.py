from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ParameterPoint(BaseModel):
    date: str
    value: float
    unit: str | None = None
    source_report_id: UUID | None = None


class ParameterTrend(BaseModel):
    values: list[ParameterPoint] = Field(default_factory=list)
    trend: str
    status: str
    latest_unit: str | None = None


class PatientInsightsResponse(BaseModel):
    patient_id: UUID
    trends: dict[str, ParameterTrend]
    key_findings: list[str]
    risk_level: str
    summary: list[str]
