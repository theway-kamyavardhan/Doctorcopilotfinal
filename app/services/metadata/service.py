from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time


REPORT_TYPE_PATTERNS: list[tuple[str, str]] = [
    ("Complete Blood Count", r"\b(?:complete\s+blood\s+count|cbc)\b"),
    ("Liver Function Test", r"\b(?:liver\s+function\s+test|lft)\b"),
    ("Thyroid Profile", r"\b(?:thyroid\s+profile|thyroid\s+function\s+test|tft)\b"),
    ("Full Body Checkup", r"\bfull\s+body\s+check(?:up)?\b"),
    ("Kidney Function Test", r"\b(?:kidney\s+function\s+test|renal\s+function\s+test|kft|rft)\b"),
    ("Lipid Profile", r"\b(?:lipid\s+profile|lipid\s+panel)\b"),
]

SAMPLE_TYPE_PATTERNS: dict[str, str] = {
    "blood": r"\bwhole\s+blood\b|\bblood\b",
    "serum": r"\bserum\b",
    "plasma": r"\bplasma\b",
    "urine": r"\burine\b",
    "stool": r"\bstool\b",
    "saliva": r"\bsaliva\b",
}

FLAG_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\b([A-Za-z][A-Za-z\s]{1,40}?)\s+(\d+(?:\.\d+)?)\s*(H|L|High|Low|Critical)\b", re.IGNORECASE),
    re.compile(r"\b(?:critical alert|panic value|abnormal)\b[:\-]?\s*(.+)", re.IGNORECASE),
]

NOTE_LABELS = [
    r"note",
    r"notes",
    r"remark",
    r"remarks",
    r"comment",
    r"comments",
    r"disclaimer",
    r"interpretation",
    r"clinical\s+note",
]

OCR_SUBSTITUTIONS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bInzerval\b", re.IGNORECASE), "Interval"),
    (re.compile(r"\bcE\s*:"), "Age:"),
]


@dataclass
class ExtractedReportMetadata:
    payload: dict
    report_date: date | None
    sample_collection_date: date | None
    report_generation_date: date | None
    report_time: time | None
    date_confidence: str
    patient_name: str | None
    lab_name: str | None
    doctor_name: str | None
    sample_type: str | None
    machine_used: str | None


class ReportMetadataExtractor:
    def clean_ocr_text(self, raw_text: str) -> str:
        cleaned = raw_text.replace("\x00", " ").replace("\ufeff", " ")
        cleaned = cleaned.replace("Âµ", "µ").replace("Ã—", "×").replace("â€“", "–")
        cleaned = cleaned.replace("\r", "\n")
        cleaned = re.sub(r"[|]+", " ", cleaned)
        cleaned = re.sub(r"[^\S\n]+", " ", cleaned)
        cleaned = re.sub(r"\b([A-Za-z]{2,})0([A-Za-z]{2,})\b", r"\1O\2", cleaned)
        cleaned = re.sub(r"\b([A-Za-z]{2,})1([A-Za-z]{2,})\b", r"\1I\2", cleaned)
        cleaned = re.sub(r"(\d)O(?=\d)", r"\g<1>0", cleaned)
        cleaned = re.sub(r"(\d)I(?=\d)", r"\g<1>1", cleaned)
        cleaned = re.sub(r"(\d)l(?=\d)", r"\g<1>1", cleaned)
        cleaned = re.sub(r"\b([A-Z]{2,})O(?=\d)", r"\g<1>0", cleaned)
        for pattern, replacement in OCR_SUBSTITUTIONS:
            cleaned = pattern.sub(replacement, cleaned)
        cleaned = re.sub(r"([A-Za-z])\s+([:])", r"\1\2", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        cleaned = "\n".join(line.strip() for line in cleaned.splitlines())
        cleaned = re.sub(r"[ ]{2,}", " ", cleaned)
        return cleaned.strip()

    def extract(self, raw_text: str) -> ExtractedReportMetadata:
        raw_text = self.clean_ocr_text(raw_text)
        report_date, report_confidence = self._extract_labeled_date(
            raw_text,
            [r"report\s+date", r"date\s+of\s+report", r"result\s+date"],
            "high",
        )
        collection_date, collection_confidence = self._extract_labeled_date(
            raw_text,
            [r"collection\s+date", r"sample\s+collection\s+date", r"collected\s+on", r"sample\s+date", r"drawn\s+date", r"date\s+drawn"],
            "medium",
        )
        generation_date, generation_confidence = self._extract_labeled_date(
            raw_text,
            [r"generated\s+on", r"generated\s+date", r"printed\s+on", r"reported\s+on"],
            "medium",
        )
        reported_date, _ = self._extract_labeled_date(
            raw_text,
            [r"reported\s+date", r"date\s+reported"],
            "medium",
        )
        received_date, _ = self._extract_labeled_date(
            raw_text,
            [r"received\s+date", r"date\s+received"],
            "medium",
        )
        fallback_date = self._extract_first_unlabeled_date(raw_text)
        primary_date = report_date or collection_date or generation_date or fallback_date
        date_confidence = report_confidence
        if primary_date is None:
            date_confidence = "low"
        elif report_date is None:
            date_confidence = collection_confidence if collection_date else generation_confidence if generation_date else "low"

        patient_name = self._extract_patient_name(raw_text)
        lab_name = self._extract_lab_name(raw_text)
        doctor_name = self._extract_doctor_name(raw_text)
        sample_type = self._extract_sample_type(raw_text)
        machine_used = self._extract_analyzer_name(raw_text)

        payload = {
            "patient": {
                "full_name": patient_name,
                "age": self._extract_age(raw_text),
                "gender": self._extract_gender(raw_text),
                "patient_id": self._extract_patient_id(raw_text),
                "accession_number": self._extract_accession_number(raw_text),
                "contact_info": self._extract_contact_info(raw_text),
            },
            "report": {
                "report_date": self._format_date(primary_date),
                "drawn_date": self._format_date(collection_date),
                "received_date": self._format_date(received_date),
                "reported_date": self._format_date(reported_date or report_date or generation_date or primary_date),
                "collection_date": self._format_date(collection_date),
                "report_generation_date": self._format_date(generation_date),
                "report_time": self._format_time(self._extract_report_time(raw_text)),
                "report_type": self._extract_report_type(raw_text),
                "test_panel_name": self._extract_labeled_value(raw_text, [r"test\s+panel", r"panel\s+name", r"test\s+name", r"investigation"]),
                "date_confidence": date_confidence,
            },
            "lab": {
                "lab_name": lab_name,
                "hospital_name": self._extract_hospital_name(raw_text),
                "address": self._extract_lab_address(raw_text),
                "location": self._extract_lab_address(raw_text),
                "phone": self._extract_lab_phone(raw_text),
                "lab_id": self._extract_lab_id(raw_text),
                "accreditation": self._extract_labeled_value(raw_text, [r"nabl", r"cap", r"iso", r"accreditation"]),
            },
            "doctor": {
                "doctor_name": doctor_name,
                "referring_doctor": self._extract_labeled_value(raw_text, [r"referred\s+by", r"referring\s+doctor"]),
                "consulting_doctor": self._extract_labeled_value(raw_text, [r"consultant", r"consulting\s+doctor"]),
                "doctor_contact": self._extract_doctor_contact(raw_text),
                "doctor_specialization": self._extract_labeled_value(raw_text, [r"speciali[sz]ation", r"department", r"speciality"]),
            },
            "sample": {
                "sample_type": sample_type,
                "sample_id": self._extract_labeled_value(raw_text, [r"sample\s+id", r"specimen\s+id"]),
                "fasting_status": self._extract_fasting_status(raw_text),
                "sample_condition": self._extract_labeled_value(raw_text, [r"sample\s+condition", r"specimen\s+condition"]),
            },
            "machine": {
                "analyzer_name": machine_used,
                "test_method": self._extract_labeled_value(raw_text, [r"method", r"test\s+method", r"assay", r"technique"]),
            },
            "admin": {
                "report_id": self._extract_labeled_value(raw_text, [r"report\s+id", r"report\s+no", r"report\s+number"]),
                "barcode": self._extract_labeled_value(raw_text, [r"barcode"]),
                "registration_number": self._extract_labeled_value(raw_text, [r"registration\s+number", r"registration\s+no", r"regn\.?\s*no"]),
            },
            "reference": {
                "reference_ranges": self._extract_reference_ranges(raw_text),
                "lab_notes": self._extract_labeled_collection(raw_text, [r"note", r"notes", r"interpretation"]),
                "interpretation_hints": self._extract_interpretation_hints(raw_text),
            },
        }
        flags = self._extract_flags(raw_text)
        notes = self._extract_notes(raw_text)
        payload["flags"] = flags
        payload["notes"] = notes
        return ExtractedReportMetadata(
            payload=payload,
            report_date=primary_date,
            sample_collection_date=collection_date,
            report_generation_date=generation_date,
            report_time=self._extract_report_time(raw_text),
            date_confidence=date_confidence,
            patient_name=patient_name,
            lab_name=lab_name,
            doctor_name=doctor_name,
            sample_type=sample_type,
            machine_used=machine_used,
        )

    def _extract_patient_name(self, raw_text: str) -> str | None:
        value = self._extract_labeled_value(raw_text, [r"patient\s+name", r"pt\.?\s*name", r"name"])
        return self._clean_person_name(value)

    def _extract_age(self, raw_text: str) -> str | None:
        candidates = self._collect_age_candidates(raw_text)
        if not candidates:
            return None
        keyword_matches = [candidate for candidate in candidates if candidate["source"] == "keyword"]
        preferred_pool = keyword_matches or candidates
        counts: dict[int, int] = {}
        for candidate in preferred_pool:
            counts[candidate["value"]] = counts.get(candidate["value"], 0) + 1
        top_count = max(counts.values())
        most_frequent = {value for value, count in counts.items() if count == top_count}
        for candidate in preferred_pool:
            if candidate["value"] in most_frequent:
                return str(candidate["value"])
        return str(preferred_pool[0]["value"])

    def _extract_gender(self, raw_text: str) -> str | None:
        labeled = self._extract_labeled_value(raw_text, [r"gender", r"sex"])
        value = labeled or ""
        match = re.search(r"\b(male|female|other|m|f)\b", value, re.IGNORECASE)
        if not match:
            match = re.search(r"\b(gender|sex)\s*[:\-]?\s*(male|female|other|m|f)\b", raw_text, re.IGNORECASE)
            if match:
                value = match.group(2)
        if not match and not value:
            return None
        normalized = (match.group(1) if match else value).strip().lower()
        return {"m": "male", "f": "female"}.get(normalized, normalized if normalized in {"male", "female", "other"} else None)

    def _extract_patient_id(self, raw_text: str) -> str | None:
        value = self._extract_labeled_value(raw_text, [r"patient\s+id", r"uhid", r"mrn", r"patient\s+no"])
        return self._clean_identifier_value(value)

    def _extract_accession_number(self, raw_text: str) -> str | None:
        value = self._extract_labeled_value(raw_text, [r"accession\s+number", r"accession\s+no", r"accession"])
        return self._clean_identifier_value(value)

    def _extract_contact_info(self, raw_text: str) -> dict:
        phone_match = re.search(r"(?:(?:mobile|phone|contact)\s*[:\-]?\s*)?(\+?\d[\d\s-]{7,}\d)", raw_text, re.IGNORECASE)
        email_match = re.search(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", raw_text, re.IGNORECASE)
        return {
            "phone": self._clean_captured_value(phone_match.group(1)) if phone_match else None,
            "email": email_match.group(0) if email_match else None,
        }

    def _extract_phone_number(self, value: str) -> str | None:
        match = re.search(r"(\+?\d[\d\s-]{7,}\d)", value or "", re.IGNORECASE)
        return self._clean_captured_value(match.group(1)) if match else None

    def _extract_lab_name(self, raw_text: str) -> str | None:
        labeled = self._extract_labeled_value(raw_text, [r"lab(?:oratory)?\s+name", r"diagnostic\s+center", r"laboratory"])
        if labeled:
            return self._clean_lab_name(labeled)
        uppercase_candidate = self._extract_top_header_lab_name(raw_text)
        if uppercase_candidate:
            return uppercase_candidate
        top_lines = [self._clean_captured_value(line) for line in raw_text.splitlines()[:5]]
        for line in top_lines:
            if not line:
                continue
            if re.search(r"\b(?:limited|ltd|diagnostic(?:s)?|lab|laborator(?:y|ies)|pathology|hospital|clinic|centre|center)\b", line, re.IGNORECASE):
                return self._clean_lab_name(line)
        for line in raw_text.splitlines():
            if re.search(r"\b(?:lab|diagnostic(?:s)?|laborator(?:y|ies)|pathology)\b", line, re.IGNORECASE):
                return self._clean_lab_name(line)
        return None

    def _extract_hospital_name(self, raw_text: str) -> str | None:
        return self._extract_labeled_value(raw_text, [r"hospital\s+name", r"hospital", r"clinic\s+name", r"medical\s+center"])

    def _extract_lab_address(self, raw_text: str) -> str | None:
        return self._extract_labeled_value(raw_text, [r"lab\s+address", r"address", r"location"])

    def _extract_lab_id(self, raw_text: str) -> str | None:
        return self._extract_labeled_value(raw_text, [r"lab\s+id", r"laboratory\s+id"])

    def _extract_lab_phone(self, raw_text: str) -> str | None:
        labeled = self._extract_labeled_value(raw_text, [r"lab\s+phone", r"laboratory\s+phone", r"contact", r"phone"])
        return self._extract_phone_number(labeled or raw_text)

    def _extract_doctor_name(self, raw_text: str) -> str | None:
        labeled = self._extract_labeled_value(
            raw_text,
            [r"doctor\s+name", r"dr\.?", r"consultant", r"consulting\s+doctor", r"referred\s+by", r"referring\s+doctor"],
        )
        if labeled:
            match = re.search(r"(Dr\.?\s*[A-Za-z][A-Za-z.\s]+)", labeled, re.IGNORECASE)
            return self._clean_person_name(match.group(1) if match else labeled, doctor=True)
        return None

    def _extract_doctor_contact(self, raw_text: str) -> str | None:
        labeled = self._extract_labeled_value(raw_text, [r"doctor\s+contact", r"consultant\s+contact", r"doctor\s+phone"])
        return self._extract_phone_number(labeled or "")

    def _extract_report_type(self, raw_text: str) -> str | None:
        labeled = self._extract_labeled_value(raw_text, [r"report\s+type", r"test\s+name", r"investigation"])
        if labeled:
            return labeled
        for report_type, pattern in REPORT_TYPE_PATTERNS:
            if re.search(pattern, raw_text, re.IGNORECASE):
                return report_type
        return None

    def _extract_sample_type(self, raw_text: str) -> str | None:
        labeled = self._extract_labeled_value(raw_text, [r"sample\s+type", r"specimen", r"specimen\s+type"])
        if labeled:
            normalized = self._normalize_sample_type(labeled)
            if normalized:
                return normalized
        for sample_type, pattern in SAMPLE_TYPE_PATTERNS.items():
            if re.search(pattern, raw_text, re.IGNORECASE):
                return sample_type
        return None

    def _normalize_sample_type(self, value: str) -> str | None:
        for sample_type, pattern in SAMPLE_TYPE_PATTERNS.items():
            if re.search(pattern, value, re.IGNORECASE):
                return sample_type
        return self._clean_captured_value(value)

    def _extract_fasting_status(self, raw_text: str) -> str | None:
        labeled = self._extract_labeled_value(raw_text, [r"fasting\s+status", r"fasting"])
        value = labeled or ""
        if re.search(r"\bnon[-\s]?fasting\b", value or raw_text, re.IGNORECASE):
            return "non-fasting"
        if re.search(r"\bfasting\b", value or raw_text, re.IGNORECASE):
            return "fasting"
        return self._clean_captured_value(value)

    def _extract_analyzer_name(self, raw_text: str) -> str | None:
        labeled = self._extract_labeled_value(raw_text, [r"analy[sz]er", r"instrument", r"machine"])
        if labeled:
            return labeled
        for line in raw_text.splitlines():
            if re.search(r"\b(?:analy[sz]er|instrument|sysmex|beckman|cobas|architect|mindray|vitros)\b", line, re.IGNORECASE):
                return self._clean_captured_value(line)
        return None

    def _extract_reference_ranges(self, raw_text: str) -> list[dict]:
        ranges: list[dict] = []
        pattern = re.compile(
            r"\b([A-Za-z][A-Za-z\s]{1,40}?)\s+(\d+(?:\.\d+)?)\s*(?:[A-Za-z/%µ³]+)?\s+(?:ref(?:erence)?\s*range|range)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)",
            re.IGNORECASE,
        )
        for match in pattern.finditer(raw_text):
            ranges.append(
                {
                    "parameter": self._clean_captured_value(match.group(1)),
                    "reference_range": self._clean_captured_value(match.group(3)),
                }
            )
        return ranges

    def _extract_interpretation_hints(self, raw_text: str) -> list[str]:
        hints: list[str] = []
        for label in [r"interpretation", r"clinical\s+significance", r"advice"]:
            value = self._extract_labeled_value(raw_text, [label])
            if value:
                hints.append(value)
        return hints

    def _extract_flags(self, raw_text: str) -> list[dict]:
        results: list[dict] = []
        for pattern in FLAG_PATTERNS:
            for match in pattern.finditer(raw_text):
                if len(match.groups()) >= 3:
                    results.append(
                        {
                            "parameter": self._clean_captured_value(match.group(1)),
                            "value": match.group(2),
                            "flag": match.group(3).lower(),
                        }
                    )
                else:
                    results.append({"parameter": None, "value": None, "flag": self._clean_captured_value(match.group(1))})
        return results

    def _extract_notes(self, raw_text: str) -> list[str]:
        collected = self._extract_labeled_collection(raw_text, NOTE_LABELS)
        disclaimers = []
        for line in raw_text.splitlines():
            if re.search(r"\b(?:disclaimer|for clinical correlation|correlate clinically|not for medico legal use)\b", line, re.IGNORECASE):
                disclaimers.append(self._clean_captured_value(line))
        return [note for note in collected + disclaimers if note]

    def _extract_labeled_collection(self, raw_text: str, labels: list[str]) -> list[str]:
        values: list[str] = []
        for label in labels:
            value = self._extract_labeled_value(raw_text, [label])
            if value and value not in values:
                values.append(value)
        return values

    def _extract_labeled_date(self, raw_text: str, labels: list[str], confidence: str) -> tuple[date | None, str]:
        value = self._extract_labeled_value(raw_text, labels)
        if value:
            parsed = self._parse_date(value)
            if parsed:
                return parsed, confidence
        matches = self._collect_date_candidates(raw_text, labels)
        if matches:
            return matches[0], confidence
        return None, "low"

    def _extract_report_time(self, raw_text: str) -> time | None:
        value = self._extract_labeled_value(raw_text, [r"report\s+time", r"time", r"sample\s+time", r"collection\s+time"])
        if not value:
            return None
        cleaned = value.strip().upper()
        for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p"):
            try:
                return datetime.strptime(cleaned, fmt).time()
            except ValueError:
                continue
        return None

    def _extract_first_unlabeled_date(self, raw_text: str) -> date | None:
        for match in re.finditer(
            r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b",
            raw_text,
            re.IGNORECASE,
        ):
            parsed = self._parse_date(match.group(0))
            if parsed:
                return parsed
        return None

    def _extract_labeled_value(self, raw_text: str, labels: list[str]) -> str | None:
        cleaned_text = raw_text.replace("\r", "\n")
        for label in labels:
            line_pattern = re.compile(rf"(?im)^\s*{label}\b\s*[:\-]?\s*(.+?)\s*$")
            line_match = line_pattern.search(cleaned_text)
            if line_match:
                return self._clean_captured_value(line_match.group(1))
        lookahead = (
            r"(?=\s+(?:patient\s+name|pt\.?\s*name|name|age|gender|sex|patient\s+id|uhid|mrn|report\s+date|date\s+of\s+report|"
            r"collection\s+date|sample\s+collection\s+date|generated\s+on|printed\s+on|reported\s+on|report\s+time|sample\s+time|"
            r"collection\s+time|lab(?:oratory)?\s+name|diagnostic\s+center|hospital|address|location|doctor\s+name|consultant|"
            r"consulting\s+doctor|referred\s+by|referring\s+doctor|report\s+type|test\s+name|investigation|sample\s+type|specimen|"
            r"analy[sz]er|instrument|machine|report\s+id|barcode|registration\s+number|remarks?|notes?|comments?|method|assay)\b|$)"
        )
        for label in labels:
            pattern = re.compile(rf"\b{label}\b\s*[:\-]?\s*(.+?){lookahead}", re.IGNORECASE | re.DOTALL)
            match = pattern.search(cleaned_text)
            if match:
                return self._clean_captured_value(match.group(1))
        return None

    def _collect_age_candidates(self, raw_text: str) -> list[dict]:
        candidates: list[dict] = []
        for match in re.finditer(r"\bage\s*[:\-]?\s*(\d{1,3})(?:\s*(?:years?|yrs?))?\b", raw_text, re.IGNORECASE):
            value = int(match.group(1))
            if 0 <= value <= 120:
                candidates.append({"value": value, "source": "keyword", "position": match.start()})
        for match in re.finditer(r"\b(\d{1,3})\s*(?:years?|yrs?)\b", raw_text, re.IGNORECASE):
            value = int(match.group(1))
            if 0 <= value <= 120:
                candidates.append({"value": value, "source": "generic", "position": match.start()})
        candidates.sort(key=lambda item: (0 if item["source"] == "keyword" else 1, item["position"]))
        return candidates

    def _collect_date_candidates(self, raw_text: str, labels: list[str]) -> list[date]:
        candidates: list[tuple[int, date]] = []
        for label in labels:
            pattern = re.compile(
                rf"\b{label}\b\s*[:\-]?\s*(\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{2,4}}|\d{{1,2}}\s+[A-Za-z]{{3,9}}\s+\d{{2,4}}|[A-Za-z]{{3,9}}\s+\d{{1,2}},?\s+\d{{2,4}})",
                re.IGNORECASE,
            )
            for match in pattern.finditer(raw_text):
                parsed = self._parse_date(match.group(1))
                if parsed:
                    candidates.append((match.start(), parsed))
        candidates.sort(key=lambda item: item[0])
        return [candidate[1] for candidate in candidates]

    def _clean_captured_value(self, value: str | None) -> str | None:
        if not value:
            return None
        cleaned = re.sub(r"\s+", " ", value).strip(" :-,")
        cleaned = re.sub(r"\b(?:years?|yrs?)\b", "", cleaned, flags=re.IGNORECASE).strip() if re.fullmatch(r"\d+\s*(?:years?|yrs?)", cleaned, re.IGNORECASE) else cleaned
        return cleaned or None

    def _clean_identifier_value(self, value: str | None) -> str | None:
        cleaned = self._clean_captured_value(value)
        if not cleaned:
            return None
        candidate = cleaned.upper()
        candidate = re.sub(r"\b(?:PATIENT|CLIENT|AGE|GENDER|NAME|DOCTOR|SEX|MALE|FEMALE)\b.*$", "", candidate, flags=re.IGNORECASE)
        candidate = re.sub(r"[^A-Z0-9-]", "", candidate)
        candidate = re.sub(r"^O(?=[A-Z0-9])", "0", candidate)
        candidate = re.sub(r"(?<=\d)O(?=[A-Z0-9])", "0", candidate)
        candidate = re.sub(r"(?<=[A-Z]{2})O(?=\d)", "0", candidate)
        return candidate or None

    def _clean_person_name(self, value: str | None, doctor: bool = False) -> str | None:
        cleaned = self._clean_captured_value(value)
        if not cleaned:
            return None
        cleaned = re.sub(
            r"\b(?:PATIENT\s*ID|CLIENT|PATIENT|AGE|GENDER|SEX|ACCESSION\s*NUMBER|UHID|MRN|REPORT\s*DATE|LOCATION)\b.*$",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"[^A-Za-z.\s]", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" .:-,")
        if not cleaned:
            return None
        titled = " ".join(part.capitalize() if part.lower() != "dr." else "Dr." for part in cleaned.split())
        if doctor and not titled.lower().startswith("dr"):
            titled = f"Dr. {titled}"
        if doctor and titled.lower().startswith("dr "):
            titled = titled.replace("Dr ", "Dr. ", 1)
        return titled

    def _clean_lab_name(self, value: str | None) -> str | None:
        cleaned = self._clean_captured_value(value)
        if not cleaned:
            return None
        cleaned = re.sub(r"\b(?:PATIENT|CLIENT|PATIENT\s*ID|DOCTOR|AGE|GENDER|LOCATION|ADDRESS)\b.*$", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"[^A-Za-z0-9&.,\-\s]", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" .:-,")
        if not cleaned:
            return None
        return " ".join(word.upper() if word.upper() in {"SRL"} else word.capitalize() if word.lower() not in {"ltd", "limited"} else word.capitalize() for word in cleaned.split())

    def _extract_top_header_lab_name(self, raw_text: str) -> str | None:
        candidates: list[str] = []
        for line in raw_text.splitlines()[:5]:
            line = (line or "").strip()
            if not line:
                continue
            if re.search(r"\b(?:LIMITED|LTD|DIAGNOSTICS?|LAB|LABORATORY|PATHOLOGY|HOSPITAL|CLINIC|CENTRE|CENTER)\b", line, re.IGNORECASE):
                candidates.append(line)
        if not candidates:
            return None
        best = max(candidates, key=lambda item: len(item))
        return self._clean_lab_name(best)

    def _parse_date(self, raw_value: str | None) -> date | None:
        if not raw_value:
            return None
        value = raw_value.strip()
        value = re.sub(r"(?i)\b(?:at|time)\b.*$", "", value).strip(" ,:-")
        value = re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", value, flags=re.IGNORECASE)
        formats = [
            "%d/%m/%Y",
            "%d/%m/%y",
            "%m/%d/%Y",
            "%m/%d/%y",
            "%d-%m-%Y",
            "%d-%m-%y",
            "%Y-%m-%d",
            "%d %b %Y",
            "%d %B %Y",
            "%b %d %Y",
            "%B %d %Y",
            "%b %d, %Y",
            "%B %d, %Y",
        ]
        for date_format in formats:
            try:
                return datetime.strptime(value, date_format).date()
            except ValueError:
                continue
        return None

    def _format_date(self, value: date | None) -> str | None:
        return value.isoformat() if value else None

    def _format_time(self, value: time | None) -> str | None:
        return value.strftime("%H:%M:%S") if value else None
