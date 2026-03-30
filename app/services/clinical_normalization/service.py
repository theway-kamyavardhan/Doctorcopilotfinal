from dataclasses import dataclass
import re
from typing import Any

from app.services.insights.normalization import normalize_parameter_name


UNIT_MAP = {
    "mil/pl": "x10^6/uL",
    "mil/μl": "x10^6/uL",
    "mil/µl": "x10^6/uL",
    "thou/pl": "x10^3/uL",
    "thou/ul": "x10^3/uL",
    "thou/μl": "x10^3/uL",
    "thou/µl": "x10^3/uL",
    "ug/dl": "ug/dL",
    "mcg/dl": "ug/dL",
    "g/dl": "g/dL",
    "pg/ml": "pg/mL",
    "ng/ml": "ng/mL",
    "per ul": "/uL",
    "per μl": "/uL",
    "per µl": "/uL",
    "/ul": "/uL",
    "/μl": "/uL",
    "/µl": "/uL",
    "10^3/ul": "x10^3/uL",
    "10^3/μl": "x10^3/uL",
    "10^3/µl": "x10^3/uL",
    "x10^3/ul": "x10^3/uL",
    "x10^3/μl": "x10^3/uL",
    "10^6/ul": "x10^6/uL",
    "10^6/μl": "x10^6/uL",
    "10^6/µl": "x10^6/uL",
    "x10^6/ul": "x10^6/uL",
    "x10^6/μl": "x10^6/uL",
    "%": "%",
    "fl": "fL",
    "pg": "pg",
}

CANONICAL_PARAMETER_CONFIG: dict[str, dict[str, Any]] = {
    "hemoglobin": {"unit": "g/dL", "default_range": (12.0, 17.5)},
    "white_blood_cells": {"unit": "x10^3/uL", "default_range": (4.0, 11.0)},
    "platelets": {"unit": "/uL", "default_range": (150000.0, 450000.0)},
    "red_blood_cells": {"unit": "x10^6/uL", "default_range": (4.0, 6.0)},
    "vitamin_b12": {"unit": "pg/mL", "default_range": (200.0, 900.0)},
    "vitamin_d": {"unit": "ng/mL", "default_range": (20.0, 100.0)},
    "iron": {"unit": "ug/dL", "default_range": (60.0, 170.0)},
    "lymphocytes": {"unit": "%", "default_range": (20.0, 40.0)},
    "hematocrit": {"unit": "%", "default_range": (36.0, 52.0)},
    "mcv": {"unit": "fL", "default_range": (80.0, 100.0)},
    "mch": {"unit": "pg", "default_range": (27.0, 33.0)},
    "mchc": {"unit": "g/dL", "default_range": (32.0, 36.0)},
}

STRICT_PARAMETER_NAME_MAP = {
    "rbc": "red_blood_cells",
    "red blood cells": "red_blood_cells",
    "red blood cell count": "red_blood_cells",
    "total_protein_serum": "total_protein",
}


@dataclass
class ClinicalNormalizationResult:
    parameters: list[dict[str, Any]]
    key_values: dict[str, dict[str, Any]]
    cleaned: bool
    confidence: float


class ClinicalNormalizer:
    def normalize(self, items: list) -> ClinicalNormalizationResult:
        merged: dict[str, dict[str, Any]] = {}
        for item in items:
            canonical_name = self._canonical_name(item.name)
            if canonical_name not in CANONICAL_PARAMETER_CONFIG:
                continue

            value = float(item.value)
            normalized_unit, normalized_value = self._normalize_unit_and_value(canonical_name, item.unit, value)
            reference_range = self._clean_reference_range(item.reference_range, canonical_name)
            interpretation = self._determine_interpretation(
                parameter=canonical_name,
                value=normalized_value,
                reference_range=reference_range,
                existing=getattr(item, "interpretation", None),
            )

            candidate = {
                "name": canonical_name,
                "original_name": item.name,
                "value": normalized_value,
                "unit": normalized_unit,
                "reference_range": reference_range["text"],
                "reference_range_raw": reference_range["raw"],
                "reference_range_parsed": {"min": reference_range["min"], "max": reference_range["max"]},
                "status": interpretation,
                "interpretation": interpretation,
            }

            existing = merged.get(canonical_name)
            if existing is None or self._score_parameter(candidate) >= self._score_parameter(existing):
                merged[canonical_name] = candidate

        parameters = [self._validate_parameter(merged[name]) for name in sorted(merged.keys())]
        key_values = {parameter["name"]: parameter for parameter in parameters}
        confidence = self._compute_confidence(parameters)
        return ClinicalNormalizationResult(parameters=parameters, key_values=key_values, cleaned=True, confidence=confidence)

    def _canonical_name(self, name: str) -> str:
        normalized = normalize_parameter_name(name)
        return STRICT_PARAMETER_NAME_MAP.get(normalized, normalized)

    def _normalize_unit_and_value(self, parameter: str, unit: str | None, value: float) -> tuple[str, float]:
        raw_unit = (unit or CANONICAL_PARAMETER_CONFIG[parameter]["unit"]).strip()
        normalized_unit = UNIT_MAP.get(raw_unit.lower(), raw_unit)

        if parameter == "white_blood_cells":
            if normalized_unit in {"/uL", "x10^3/uL"}:
                if normalized_unit == "/uL" and value >= 1000:
                    return "x10^3/uL", round(value / 1000.0, 2)
                return "x10^3/uL", round(value, 2)

        preferred_unit = CANONICAL_PARAMETER_CONFIG[parameter]["unit"]
        return preferred_unit, round(value, 2)

    def _clean_reference_range(self, reference_range: str | None, parameter: str) -> dict[str, Any]:
        raw = reference_range
        numbers: list[float] = []
        if reference_range:
            sanitized = reference_range.replace("â€“", "-").replace("–", "-").replace(" to ", "-")
            numbers = [float(match) for match in re.findall(r"\d*\.?\d+", sanitized)]

        if len(numbers) >= 2:
            low, high = sorted(numbers[:2])
        else:
            low, high = CANONICAL_PARAMETER_CONFIG[parameter]["default_range"]

        return {
            "raw": raw,
            "min": low,
            "max": high,
            "text": f"{low:.1f}-{high:.1f}",
        }

    def _determine_interpretation(self, parameter: str, value: float, reference_range: dict[str, Any], existing: str | None) -> str:
        if parameter == "vitamin_d":
            if value < 20:
                return "deficient"
            if value <= 30:
                return "insufficient"
            return "sufficient"

        if value < reference_range["min"]:
            return "low"
        if value > reference_range["max"]:
            return "high"
        if reference_range["min"] <= value <= reference_range["max"]:
            return "normal"
        return (existing or "unknown").lower()

    def _validate_parameter(self, parameter: dict[str, Any]) -> dict[str, Any]:
        parameter["value"] = float(parameter["value"])
        parameter["unit"] = UNIT_MAP.get(str(parameter["unit"]).lower(), parameter["unit"])
        parameter["status"] = parameter.get("status") or "unknown"
        parameter["interpretation"] = parameter.get("interpretation") or parameter["status"]
        return parameter

    def _score_parameter(self, parameter: dict[str, Any]) -> int:
        score = 0
        if parameter["value"] is not None:
            score += 1
        if parameter["unit"]:
            score += 1
        if parameter["reference_range"]:
            score += 1
        if parameter["status"]:
            score += 1
        return score

    def _compute_confidence(self, parameters: list[dict[str, Any]]) -> float:
        if not parameters:
            return 0.90
        extracted_ratio = 1.0
        valid_value_ratio = sum(1 for parameter in parameters if isinstance(parameter.get("value"), (float, int))) / len(parameters)
        interpretation_ratio = sum(1 for parameter in parameters if parameter.get("interpretation")) / len(parameters)
        weighted = (0.4 * extracted_ratio) + (0.3 * valid_value_ratio) + (0.3 * interpretation_ratio)
        return round(max(0.90, min(0.99, 0.90 + ((weighted - 0.8) * 0.45))), 2)
