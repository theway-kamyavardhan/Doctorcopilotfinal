import json
import re
from typing import Any

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ProcessingError, ValidationAppError
from app.schemas.evaluation import EvaluationMetrics, EvaluationReportResponse, ParameterEvaluation
from app.schemas.report import DebugProcessReportResponse
from app.services.insights.normalization import coerce_numeric_value, normalize_parameter_name, normalize_unit
from app.services.reports import ReportService


REFERENCE_HINTS = {
    "hemoglobin": {"low": 12.0, "high": 17.5},
    "rbc": {"low": 4.0, "high": 6.0},
    "white_blood_cells": {"low": 4000.0, "high": 11000.0},
    "platelets": {"low": 150000.0, "high": 450000.0},
    "lymphocytes": {"low": 20.0, "high": 40.0},
    "vitamin_b12": {"low": 200.0, "high": 900.0},
    "vitamin_d": {"low": 20.0, "high": 100.0},
    "iron": {"low": 60.0, "high": 170.0},
}

GROUND_TRUTH_PATTERNS = {
    "hemoglobin": [
        re.compile(r"\b(?:hemoglobin|hb|hgb)\b[:\s-]*([0-9]+(?:\.[0-9]+)?)\s*(g/dl)?", re.IGNORECASE),
    ],
    "rbc": [
        re.compile(r"\b(?:rbc|red blood cells?)\b[:\s-]*([0-9]+(?:\.[0-9]+)?)\s*((?:10\^6/?u?l)|(?:millions?/u?l))?", re.IGNORECASE),
    ],
    "white_blood_cells": [
        re.compile(r"\b(?:wbc|white blood cells?|white blood cell count)\b[:\s-]*([0-9]+(?:\.[0-9]+)?)\s*(per ul|/ul|10\^3/ul)?", re.IGNORECASE),
    ],
    "platelets": [
        re.compile(r"\b(?:platelets?|platelet count|plt)\b[:\s-]*([0-9]+(?:\.[0-9]+)?)\s*(per ul|/ul|10\^3/ul)?", re.IGNORECASE),
    ],
    "lymphocytes": [
        re.compile(r"\b(?:lymphocytes?)\b[:\s-]*([0-9]+(?:\.[0-9]+)?)\s*(%)?", re.IGNORECASE),
    ],
    "vitamin_b12": [
        re.compile(r"\b(?:vitamin b12|vitamin b-12|b12)\b[:\s-]*([0-9]+(?:\.[0-9]+)?)\s*(pg/ml)?", re.IGNORECASE),
    ],
    "vitamin_d": [
        re.compile(r"\b(?:vitamin d|vitamin d total)\b[:\s-]*([0-9]+(?:\.[0-9]+)?)\s*(ng/ml)?", re.IGNORECASE),
    ],
    "iron": [
        re.compile(r"\b(?:iron)\b[:\s-]*([0-9]+(?:\.[0-9]+)?)\s*(ug/dl|mcg/dl)?", re.IGNORECASE),
    ],
}


class AccuracyEvaluationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def evaluate_from_file(self, current_user, file: UploadFile) -> EvaluationReportResponse:
        debug_result = await ReportService(self.db).debug_process_report(current_user, file)
        return self.evaluate(debug_result.raw_text, debug_result.ai_output, debug_result.logs)

    def evaluate(self, raw_text: str, ai_output: dict[str, Any], logs: list[dict[str, Any]] | None = None) -> EvaluationReportResponse:
        if not raw_text.strip():
            raise ValidationAppError("raw_text is required for evaluation.")
        if not ai_output:
            raise ValidationAppError("ai_output is required for evaluation.")

        ground_truth = self.parse_ground_truth(raw_text)
        extracted = self.normalize_ai_output(ai_output)
        detailed_results, missing_parameters, wrong_values, incorrect_normalization, wrong_status_detection = self.compare(
            ground_truth, extracted
        )
        evaluation = self.compute_metrics(detailed_results, ground_truth)
        suggestions = self.generate_suggestions(missing_parameters, wrong_values, incorrect_normalization, wrong_status_detection)

        return EvaluationReportResponse(
            raw_text=raw_text,
            ai_output=ai_output,
            parsed_ground_truth=ground_truth,
            evaluation=evaluation,
            detailed_results=detailed_results,
            missing_parameters=missing_parameters,
            wrong_values=wrong_values,
            incorrect_normalization=incorrect_normalization,
            wrong_status_detection=wrong_status_detection,
            suggestions=suggestions,
            logs=logs or [],
        )

    def parse_ground_truth(self, raw_text: str) -> dict[str, dict[str, Any]]:
        parsed: dict[str, dict[str, Any]] = {}
        for parameter, patterns in GROUND_TRUTH_PATTERNS.items():
            for pattern in patterns:
                match = pattern.search(raw_text)
                if not match:
                    continue
                value = coerce_numeric_value(match.group(1))
                unit = normalize_unit(match.group(2) if len(match.groups()) > 1 else None)
                parsed[parameter] = {
                    "value": value,
                    "unit": unit,
                    "status": self._status_for(parameter, value),
                }
                break
        return parsed

    def normalize_ai_output(self, ai_output: dict[str, Any]) -> dict[str, dict[str, Any]]:
        items = ai_output.get("key_values", [])
        normalized: dict[str, dict[str, Any]] = {}

        if isinstance(items, dict):
            iterable = items.values()
        else:
            iterable = items

        for item in iterable:
            if not isinstance(item, dict):
                continue
            raw_name = item.get("name")
            if not raw_name:
                continue
            parameter = normalize_parameter_name(raw_name)
            normalized[parameter] = {
                "value": coerce_numeric_value(item.get("value")),
                "unit": normalize_unit(item.get("unit")),
                "status": self._normalize_status_text(item.get("interpretation")) or self._status_for(parameter, coerce_numeric_value(item.get("value"))),
                "original_name": raw_name,
            }
        return normalized

    def compare(self, ground_truth: dict[str, dict[str, Any]], extracted: dict[str, dict[str, Any]]):
        detailed: dict[str, ParameterEvaluation] = {}
        missing_parameters: list[str] = []
        wrong_values: list[str] = []
        incorrect_normalization: list[str] = []
        wrong_status_detection: list[str] = []

        for parameter, truth in ground_truth.items():
            candidate = extracted.get(parameter)
            if not candidate:
                detailed[parameter] = ParameterEvaluation(
                    expected_value=truth["value"],
                    expected_unit=truth["unit"],
                    expected_status=truth["status"],
                    result="missing",
                )
                missing_parameters.append(parameter)
                continue

            result = "correct"
            extracted_value = candidate.get("value")
            extracted_unit = candidate.get("unit")
            extracted_status = candidate.get("status")

            if extracted_value is None or truth["value"] is None or abs(extracted_value - truth["value"]) > self._value_tolerance(truth["value"]):
                result = "wrong"
                wrong_values.append(parameter)

            if truth["unit"] and extracted_unit and extracted_unit != truth["unit"]:
                result = "wrong"
                wrong_values.append(parameter)

            if candidate.get("original_name") and normalize_parameter_name(candidate["original_name"]) != parameter:
                incorrect_normalization.append(parameter)

            if truth["status"] and extracted_status and truth["status"] != extracted_status:
                wrong_status_detection.append(parameter)
                result = "wrong"

            detailed[parameter] = ParameterEvaluation(
                expected_value=truth["value"],
                extracted_value=extracted_value,
                expected_unit=truth["unit"],
                extracted_unit=extracted_unit,
                expected_status=truth["status"],
                extracted_status=extracted_status,
                result=result,
            )

        return detailed, sorted(set(missing_parameters)), sorted(set(wrong_values)), sorted(set(incorrect_normalization)), sorted(set(wrong_status_detection))

    def compute_metrics(self, detailed_results: dict[str, ParameterEvaluation], ground_truth: dict[str, dict[str, Any]]) -> EvaluationMetrics:
        total = max(len(ground_truth), 1)
        covered = sum(1 for result in detailed_results.values() if result.result != "missing")
        value_correct = sum(
            1
            for result in detailed_results.values()
            if result.expected_value is not None and result.extracted_value is not None and abs(result.extracted_value - result.expected_value) <= self._value_tolerance(result.expected_value)
        )
        status_correct = sum(
            1
            for result in detailed_results.values()
            if result.expected_status and result.extracted_status and result.expected_status == result.extracted_status
        )
        coverage_score = round((covered / total) * 100, 2)
        value_accuracy = round((value_correct / total) * 100, 2)
        status_accuracy = round((status_correct / total) * 100, 2)
        overall = round((coverage_score + value_accuracy + status_accuracy) / 3, 2)
        return EvaluationMetrics(
            parameter_accuracy={parameter: result.result for parameter, result in detailed_results.items()},
            coverage_score=coverage_score,
            value_accuracy_score=value_accuracy,
            status_accuracy_score=status_accuracy,
            overall_score=overall,
        )

    def generate_suggestions(
        self,
        missing_parameters: list[str],
        wrong_values: list[str],
        incorrect_normalization: list[str],
        wrong_status_detection: list[str],
    ) -> list[str]:
        suggestions: list[str] = []
        suggestions.extend([f"{parameter} was present in raw text but missing from extraction." for parameter in missing_parameters])
        suggestions.extend([f"{parameter} value or unit did not match the raw text." for parameter in wrong_values])
        suggestions.extend([f"{parameter} appears to need stronger normalization mapping." for parameter in incorrect_normalization])
        suggestions.extend([f"{parameter} was extracted but status interpretation appears incorrect." for parameter in wrong_status_detection])
        if not suggestions:
            suggestions.append("Extraction aligned well with detected ground truth for the evaluated parameters.")
        return suggestions

    def _status_for(self, parameter: str, value: float | None) -> str | None:
        if value is None:
            return None
        reference = REFERENCE_HINTS.get(parameter)
        if not reference:
            return None
        low = reference.get("low")
        high = reference.get("high")
        if low is not None and value < low:
            return "low"
        if high is not None and value > high:
            return "high"
        return "normal"

    def _normalize_status_text(self, value: str | None) -> str | None:
        if not value:
            return None
        lowered = value.strip().lower()
        if "low" in lowered:
            return "low"
        if "high" in lowered or "elevated" in lowered:
            return "high"
        if "normal" in lowered:
            return "normal"
        return None

    def _value_tolerance(self, value: float) -> float:
        return max(abs(value) * 0.02, 0.1)


def parse_ai_output_json(ai_output: str) -> dict[str, Any]:
    try:
        parsed = json.loads(ai_output)
    except json.JSONDecodeError as exc:
        raise ValidationAppError(f"ai_output is not valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValidationAppError("ai_output JSON must be an object.")
    return parsed
