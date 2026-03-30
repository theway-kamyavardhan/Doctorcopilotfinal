from typing import Any

from pydantic import BaseModel, Field


class ParameterEvaluation(BaseModel):
    expected_value: float | None = None
    extracted_value: float | None = None
    expected_unit: str | None = None
    extracted_unit: str | None = None
    expected_status: str | None = None
    extracted_status: str | None = None
    result: str


class EvaluationMetrics(BaseModel):
    parameter_accuracy: dict[str, str] = Field(default_factory=dict)
    coverage_score: float
    value_accuracy_score: float
    status_accuracy_score: float
    overall_score: float


class EvaluationReportResponse(BaseModel):
    raw_text: str
    ai_output: dict[str, Any]
    parsed_ground_truth: dict[str, dict[str, Any]]
    evaluation: EvaluationMetrics
    detailed_results: dict[str, ParameterEvaluation] = Field(default_factory=dict)
    missing_parameters: list[str] = Field(default_factory=list)
    wrong_values: list[str] = Field(default_factory=list)
    incorrect_normalization: list[str] = Field(default_factory=list)
    wrong_status_detection: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    logs: list[dict[str, Any]] = Field(default_factory=list)
