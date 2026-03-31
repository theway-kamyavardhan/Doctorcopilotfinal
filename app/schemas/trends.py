from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class TrendValuePoint(BaseModel):
    date: str
    value: float
    unit: str | None = None
    status: str | None = None
    report_id: UUID | None = None
    report_type: str | None = None


class TrendMetric(BaseModel):
    delta: float
    percentage_change: float | None = None
    change: str | None = None
    direction: str
    stability_score: float | None = None
    stability: str | None = None
    trend: str
    unit: str | None = None


class PatientTrendsResponse(BaseModel):
    patient_id: UUID
    table: list[dict[str, Any]] = Field(default_factory=list)
    series: dict[str, list[TrendValuePoint]] = Field(default_factory=dict)
    metrics: dict[str, TrendMetric] = Field(default_factory=dict)
    summary: list[str] = Field(default_factory=list)
    anomalies: list[dict[str, Any]] = Field(default_factory=list)
    reports: list[dict[str, Any]] = Field(default_factory=list)
    debug: dict[str, Any] = Field(default_factory=dict)
