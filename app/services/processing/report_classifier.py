from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ReportClassificationResult:
    report_type: str
    report_category: str
    keywords: list[str]


class ReportClassifier:
    CATEGORY_RULES = {
        "blood": {"cbc", "hemoglobin", "platelets", "wbc", "rbc", "complete blood count"},
        "liver": {"alt", "ast", "bilirubin", "alkaline phosphatase", "sgpt", "sgot", "albumin", "total protein"},
        "kidney": {"creatinine", "urea", "bun", "egfr", "uric acid"},
        "thyroid": {"tsh", "t3", "t4", "thyroid"},
        "lipid": {"cholesterol", "hdl", "ldl", "triglycerides", "lipid"},
        "vitamin": {"vitamin b12", "vitamin d", "folate", "ferritin"},
        "radiology": {"x-ray", "xray", "ct", "mri", "ultrasound", "radiology", "impression", "findings"},
    }

    TYPE_HINTS = {
        "blood": "Complete Blood Count",
        "liver": "Liver Function Test",
        "kidney": "Kidney Function Test",
        "thyroid": "Thyroid Profile",
        "lipid": "Lipid Profile",
        "vitamin": "Vitamin Panel",
        "radiology": "Radiology Report",
    }

    def classify(
        self,
        *,
        raw_text: str,
        structured_report_type: str | None,
        parameters: list[dict],
        insights: list[dict],
    ) -> ReportClassificationResult:
        parameter_names = {
            str(parameter.get("name") or "").replace("_", " ").lower()
            for parameter in parameters
            if parameter.get("name")
        }
        text = f"{structured_report_type or ''} {raw_text}".lower()

        category_scores = {category: 0 for category in self.CATEGORY_RULES}
        for category, hints in self.CATEGORY_RULES.items():
            for hint in hints:
                if hint in text:
                    category_scores[category] += 2
                if hint in parameter_names:
                    category_scores[category] += 3

        report_category = max(category_scores, key=category_scores.get)
        if category_scores[report_category] == 0:
            report_category = "other"

        report_type = structured_report_type or self.TYPE_HINTS.get(report_category, "Medical Report")
        keywords = self._build_keywords(parameters, insights)

        return ReportClassificationResult(
            report_type=report_type,
            report_category=report_category,
            keywords=keywords,
        )

    def _build_keywords(self, parameters: list[dict], insights: list[dict]) -> list[str]:
        keywords: list[str] = []

        for parameter in parameters:
            name = str(parameter.get("name") or "").lower()
            status = str(parameter.get("status") or parameter.get("interpretation") or "").lower()
            label = name.replace("_", " ")

            if status in {"low", "deficient", "insufficient"}:
                keywords.append(f"{label} low")
            elif status == "high":
                keywords.append(f"{label} high")

            if name == "hemoglobin" and status == "low":
                keywords.append("anemia")
            if name == "platelets" and status == "low":
                keywords.append("thrombocytopenia")
            if name == "vitamin_b12" and status in {"low", "deficient", "insufficient"}:
                keywords.append("vitamin deficiency")
                keywords.append("b12 deficiency")
            if name == "vitamin_d" and status in {"low", "deficient", "insufficient"}:
                keywords.append("vitamin deficiency")
                keywords.append("vitamin d deficiency")
            if name == "iron" and status == "high":
                keywords.append("iron overload")
            if name == "creatinine" and status == "high":
                keywords.append("kidney risk")
            if name in {"alt", "ast", "bilirubin"} and status == "high":
                keywords.append("liver dysfunction")

        for insight in insights:
            title = str(insight.get("title") or "").strip().lower()
            description = str(insight.get("description") or "").strip().lower()
            for phrase in (title, description):
                if not phrase:
                    continue
                if "deficien" in phrase:
                    keywords.append("vitamin deficiency")
                if "platelet" in phrase and ("low" in phrase or "thrombocytopenia" in phrase):
                    keywords.append("low platelet")
                if "anemia" in phrase:
                    keywords.append("anemia")
                if "iron" in phrase and "high" in phrase:
                    keywords.append("iron overload")

        return list(dict.fromkeys(keyword for keyword in keywords if keyword))[:8]
