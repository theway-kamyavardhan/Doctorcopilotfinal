from dataclasses import dataclass
import re
from typing import Any

from app.services.insights.normalization import normalize_parameter_name


UNIT_MAP = {
    "mil/pl": "×10⁶/µL",
    "mil/μl": "×10⁶/µL",
    "mil/µl": "×10⁶/µL",
    "thou/pl": "×10³/µL",
    "thou/ul": "×10³/µL",
    "thou/μl": "×10³/µL",
    "thou/µl": "×10³/µL",
    "ug/dl": "µg/dL",
    "mcg/dl": "µg/dL",
    "g/dl": "g/dL",
    "pg/ml": "pg/mL",
    "ng/ml": "ng/mL",
    "per ul": "/µL",
    "per μl": "/µL",
    "per µl": "/µL",
    "/ul": "/µL",
    "/μl": "/µL",
    "/µl": "/µL",
    "10^3/ul": "×10³/µL",
    "10^3/μl": "×10³/µL",
    "10^3/µl": "×10³/µL",
    "x10^3/ul": "×10³/µL",
    "x10^3/μl": "×10³/µL",
    "x10^3/µl": "×10³/µL",
    "10^6/ul": "×10⁶/µL",
    "10^6/μl": "×10⁶/µL",
    "10^6/µl": "×10⁶/µL",
    "x10^6/ul": "×10⁶/µL",
    "x10^6/μl": "×10⁶/µL",
    "x10^6/µl": "×10⁶/µL",
    "%": "%",
    "fl": "fL",
    "pg": "pg",
    "iu/l": "IU/L",
    "u/l": "U/L",
    "mg/dl": "mg/dL",
    "mmol/l": "mmol/L",
    "meq/l": "mEq/L",
}

CANONICAL_PARAMETER_CONFIG: dict[str, dict[str, Any]] = {
    "hemoglobin": {"unit": "g/dL", "default_range": (12.0, 17.5), "panel": "cbc"},
    "white_blood_cells": {"unit": "×10³/µL", "default_range": (4.0, 11.0), "panel": "cbc"},
    "platelets": {"unit": "/µL", "default_range": (150000.0, 450000.0), "panel": "cbc"},
    "red_blood_cells": {"unit": "×10⁶/µL", "default_range": (4.0, 6.0), "panel": "cbc"},
    "hematocrit": {"unit": "%", "default_range": (36.0, 52.0), "panel": "cbc"},
    "mcv": {"unit": "fL", "default_range": (80.0, 100.0), "panel": "cbc"},
    "mch": {"unit": "pg", "default_range": (27.0, 33.0), "panel": "cbc"},
    "mchc": {"unit": "g/dL", "default_range": (32.0, 36.0), "panel": "cbc"},
    "lymphocytes": {"unit": "%", "default_range": (20.0, 40.0), "panel": "cbc"},
    "neutrophils": {"unit": "%", "default_range": (40.0, 75.0), "panel": "cbc"},
    "monocytes": {"unit": "%", "default_range": (2.0, 10.0), "panel": "cbc"},
    "eosinophils": {"unit": "%", "default_range": (1.0, 6.0), "panel": "cbc"},
    "basophils": {"unit": "%", "default_range": (0.0, 2.0), "panel": "cbc"},
    "iron": {"unit": "µg/dL", "default_range": (60.0, 170.0), "panel": "iron"},
    "tibc": {"unit": "µg/dL", "default_range": (250.0, 450.0), "panel": "iron"},
    "transferrin_saturation": {"unit": "%", "default_range": (20.0, 50.0), "panel": "iron"},
    "alt": {"unit": "U/L", "default_range": (7.0, 56.0), "panel": "liver"},
    "ast": {"unit": "U/L", "default_range": (10.0, 40.0), "panel": "liver"},
    "bilirubin_total": {"unit": "mg/dL", "default_range": (0.2, 1.2), "panel": "liver"},
    "bilirubin_direct": {"unit": "mg/dL", "default_range": (0.0, 0.3), "panel": "liver"},
    "alkaline_phosphatase": {"unit": "U/L", "default_range": (44.0, 147.0), "panel": "liver"},
    "total_protein": {"unit": "g/dL", "default_range": (6.0, 8.3), "panel": "liver"},
    "albumin": {"unit": "g/dL", "default_range": (3.5, 5.0), "panel": "liver"},
    "globulin": {"unit": "g/dL", "default_range": (2.0, 3.5), "panel": "liver"},
    "creatinine": {"unit": "mg/dL", "default_range": (0.6, 1.3), "panel": "kidney"},
    "urea": {"unit": "mg/dL", "default_range": (15.0, 40.0), "panel": "kidney"},
    "blood_urea_nitrogen": {"unit": "mg/dL", "default_range": (7.0, 20.0), "panel": "kidney"},
    "uric_acid": {"unit": "mg/dL", "default_range": (3.5, 7.2), "panel": "kidney"},
    "cholesterol_total": {"unit": "mg/dL", "default_range": (0.0, 200.0), "panel": "lipid"},
    "hdl": {"unit": "mg/dL", "default_range": (40.0, 100.0), "panel": "lipid"},
    "ldl": {"unit": "mg/dL", "default_range": (0.0, 100.0), "panel": "lipid"},
    "triglycerides": {"unit": "mg/dL", "default_range": (0.0, 150.0), "panel": "lipid"},
    "vldl": {"unit": "mg/dL", "default_range": (5.0, 40.0), "panel": "lipid"},
    "tsh": {"unit": "µIU/mL", "default_range": (0.4, 4.5), "panel": "thyroid"},
    "t3": {"unit": "ng/mL", "default_range": (0.8, 2.0), "panel": "thyroid"},
    "t4": {"unit": "µg/dL", "default_range": (5.0, 12.0), "panel": "thyroid"},
    "vitamin_b12": {"unit": "pg/mL", "default_range": (200.0, 900.0), "panel": "vitamin"},
    "vitamin_d": {"unit": "ng/mL", "default_range": (20.0, 100.0), "panel": "vitamin"},
    "sodium": {"unit": "mmol/L", "default_range": (135.0, 145.0), "panel": "electrolyte"},
    "potassium": {"unit": "mmol/L", "default_range": (3.5, 5.1), "panel": "electrolyte"},
    "chloride": {"unit": "mmol/L", "default_range": (98.0, 107.0), "panel": "electrolyte"},
}

STRICT_PARAMETER_NAME_MAP = {
    "rbc": "red_blood_cells",
    "red blood cells": "red_blood_cells",
    "red blood cell count": "red_blood_cells",
    "wbc": "white_blood_cells",
    "white blood cell count": "white_blood_cells",
    "plt": "platelets",
    "platelet count": "platelets",
    "vitamin b12": "vitamin_b12",
    "vitamin d": "vitamin_d",
    "sgpt": "alt",
    "sgot": "ast",
    "total bilirubin": "bilirubin_total",
    "direct bilirubin": "bilirubin_direct",
    "serum creatinine": "creatinine",
    "serum iron": "iron",
    "s. iron": "iron",
    "cholesterol": "cholesterol_total",
    "ldl cholesterol": "ldl",
    "hdl cholesterol": "hdl",
    "triglyceride": "triglycerides",
    "na": "sodium",
    "k": "potassium",
    "cl": "chloride",
    "total_protein_serum": "total_protein",
}

PANEL_KEYS = ["cbc", "iron", "liver", "kidney", "lipid", "thyroid", "vitamin", "electrolyte", "other"]


@dataclass
class ClinicalNormalizationResult:
    parameters: list[dict[str, Any]]
    key_values: dict[str, dict[str, Any]]
    panels: dict[str, list[dict[str, Any]]]
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
            panel = getattr(item, "panel", None) or CANONICAL_PARAMETER_CONFIG[canonical_name]["panel"]

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
                "panel": panel,
            }

            existing = merged.get(canonical_name)
            if existing is None or self._score_parameter(candidate) >= self._score_parameter(existing):
                merged[canonical_name] = candidate

        parameters = [self._validate_parameter(merged[name]) for name in sorted(merged.keys())]
        key_values = {parameter["name"]: parameter for parameter in parameters}
        panels = self._build_panels(parameters)
        confidence = self._compute_confidence(parameters)
        return ClinicalNormalizationResult(
            parameters=parameters,
            key_values=key_values,
            panels=panels,
            cleaned=True,
            confidence=confidence,
        )

    def _canonical_name(self, name: str) -> str:
        normalized = normalize_parameter_name(name)
        return STRICT_PARAMETER_NAME_MAP.get(normalized, normalized)

    def _normalize_unit_and_value(self, parameter: str, unit: str | None, value: float) -> tuple[str, float]:
        raw_unit = (unit or CANONICAL_PARAMETER_CONFIG[parameter]["unit"]).strip()
        normalized_unit = UNIT_MAP.get(raw_unit.lower(), raw_unit)

        if parameter == "white_blood_cells":
            if normalized_unit in {"/µL", "×10³/µL"}:
                if normalized_unit == "/µL" and value >= 1000:
                    return "×10³/µL", round(value / 1000.0, 2)
                return "×10³/µL", round(value, 2)

        if parameter == "platelets":
            if value < 1000:
                value = value * 1000.0
            return "/µL", round(value, 2)

        preferred_unit = CANONICAL_PARAMETER_CONFIG[parameter]["unit"]
        return preferred_unit, round(value, 2)

    def _clean_reference_range(self, reference_range: str | None, parameter: str) -> dict[str, Any]:
        raw = reference_range
        numbers: list[float] = []
        if reference_range:
            sanitized = reference_range.replace("–", "-").replace("to", "-")
            sanitized = re.sub(r"\s+", " ", sanitized)
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

    def _determine_interpretation(
        self,
        parameter: str,
        value: float,
        reference_range: dict[str, Any],
        existing: str | None,
    ) -> str:
        if parameter == "vitamin_d":
            if value < 20:
                return "deficient"
            if value <= 30:
                return "insufficient"
            return "normal"

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
        parameter["panel"] = parameter.get("panel") or "other"
        return parameter

    def _build_panels(self, parameters: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        panels = {panel: [] for panel in PANEL_KEYS}
        for parameter in parameters:
            panels.setdefault(parameter["panel"], []).append(parameter)
        return panels

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
        if parameter["panel"]:
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
