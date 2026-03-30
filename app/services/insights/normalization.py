import re


PARAMETER_NORMALIZATION_MAP = {
    "hb": "hemoglobin",
    "hemoglobin": "hemoglobin",
    "hgb": "hemoglobin",
    "wbc": "white_blood_cells",
    "white blood cells": "white_blood_cells",
    "white blood cell count": "white_blood_cells",
    "platelet count": "platelets",
    "platelets": "platelets",
    "plt": "platelets",
    "vitamin b12": "vitamin_b12",
    "vitamin b-12": "vitamin_b12",
    "b12": "vitamin_b12",
    "vitamin d": "vitamin_d",
    "vitamin d total": "vitamin_d",
}

UNIT_NORMALIZATION_MAP = {
    "g/dl": "g/dL",
    "per ul": "per uL",
    "/ul": "per uL",
    "10^3/ul": "10^3/uL",
    "pg/ml": "pg/mL",
    "ng/ml": "ng/mL",
}


def normalize_parameter_name(name: str) -> str:
    key = name.strip().lower()
    return PARAMETER_NORMALIZATION_MAP.get(key, key.replace(" ", "_"))


def normalize_unit(unit: str | None) -> str | None:
    if not unit:
        return None
    return UNIT_NORMALIZATION_MAP.get(unit.strip().lower(), unit.strip())


def clean_numeric_value(value: str | None) -> float | None:
    if not value:
        return None
    text = value.strip().replace(",", "")
    text = text.replace("Â°", "")
    text = text.replace("°", "")
    text = re.sub(r"(?i)\b(low|high|normal|borderline)\b", " ", text)
    match = re.search(r"[-+]?\d*\.?\d+", text)
    if not match:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def coerce_numeric_value(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().replace(",", "")
        try:
            return float(cleaned)
        except ValueError:
            return clean_numeric_value(cleaned)
    return None


def extract_numeric_value_from_text(raw_text: str, parameter_name: str) -> float | None:
    alias_patterns = {
        "hemoglobin": [r"hemoglobin", r"\bhb\b", r"\bhgb\b"],
        "white_blood_cells": [r"\bwbc\b", r"white blood cell count", r"white blood cells?"],
        "platelets": [r"platelet count", r"platelets?", r"\bplt\b"],
        "lymphocytes": [r"lymphocytes?"],
        "vitamin_b12": [r"vitamin b12", r"vitamin b-12", r"\bb12\b"],
        "vitamin_d": [r"vitamin d total", r"vitamin d"],
        "iron": [r"\biron\b"],
        "rbc": [r"\brbc\b", r"red blood cells?"],
    }
    patterns = alias_patterns.get(parameter_name, [re.escape(parameter_name.replace("_", " "))])
    for alias in patterns:
        match = re.search(rf"{alias}[\s:=-]*([^\n\r]+)", raw_text, re.IGNORECASE)
        if not match:
            continue
        cleaned = clean_numeric_value(match.group(1))
        if cleaned is not None:
            return cleaned
    return None
