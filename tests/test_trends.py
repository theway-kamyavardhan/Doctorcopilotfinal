from io import BytesIO

from fastapi.testclient import TestClient

from app.main import app
from app.services.ai.schemas import MedicalKeyValue, StructuredMedicalReport
from tests.test_smoke import auth_headers, build_pdf_bytes


MICRO_L = "/\u00b5L"
WBC_UNIT = "\u00d710\u00b3/\u00b5L"


def test_patient_trends_endpoint_aggregates_multiple_reports(monkeypatch):
    extracted_texts = [
        """
        SRL Limited
        Patient Name: Trend Patient
        Report Date: 18/05/2018
        Platelets 125000
        Hemoglobin 11.2
        Vitamin B12 180
        """.strip(),
        """
        SRL Limited
        Patient Name: Trend Patient
        Report Date: 18/05/2022
        Platelets 220000
        Hemoglobin 13.6
        Vitamin B12 240
        """.strip(),
    ]

    async def fake_extract(self, report_text: str):
        if "2018" in report_text:
            return StructuredMedicalReport(
                report_type="Complete Blood Count",
                summary="Older report",
                key_values=[
                    MedicalKeyValue(name="Platelet Count", value=125000, unit="per uL", reference_range="150000-450000"),
                    MedicalKeyValue(name="Hb", value=11.2, unit="g/dL", reference_range="12-17"),
                    MedicalKeyValue(name="Vitamin B12", value=180, unit="pg/mL", reference_range="200-900"),
                ],
                normalized_terms=[],
                insights=[],
                confidence=0.95,
            )
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="Newer report",
            key_values=[
                MedicalKeyValue(name="Platelet Count", value=220000, unit="per uL", reference_range="150000-450000"),
                MedicalKeyValue(name="Hb", value=13.6, unit="g/dL", reference_range="12-17"),
                MedicalKeyValue(name="Vitamin B12", value=240, unit="pg/mL", reference_range="200-900"),
            ],
            normalized_terms=[],
            insights=[],
            confidence=0.95,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)
    monkeypatch.setattr(
        "app.services.processing.ocr.TextExtractionEngine._extract_pdf_text",
        lambda self, path: extracted_texts.pop(0),
    )

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("trend-1.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        first_upload = client.post("/api/v1/reports/upload", headers=headers, files=files)
        assert first_upload.status_code == 201

        files = {"file": ("trend-2.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        second_upload = client.post("/api/v1/reports/upload", headers=headers, files=files)
        assert second_upload.status_code == 201

        patient_id = first_upload.json()["report"]["patient_id"]
        trends = client.get(f"/api/v1/patients/{patient_id}/trends", headers=headers)
        assert trends.status_code == 200
        payload = trends.json()
        assert len(payload["table"]) == 2
        assert payload["table"][0]["date"] == "2018-05-18"
        assert payload["table"][1]["date"] == "2022-05-18"
        assert payload["table"][0]["platelets"] == 125000.0
        assert payload["table"][1]["platelets"] == 220000.0
        assert len(payload["series"]["platelets"]) == 2
        assert payload["series"]["platelets"][0]["date"] == "2018-05-18"
        assert payload["series"]["platelets"][1]["date"] == "2022-05-18"
        assert payload["series"]["platelets"][0]["status"] == "low"
        assert payload["series"]["platelets"][1]["status"] == "normal"
        assert payload["metrics"]["platelets"]["trend"] == "increasing"
        assert payload["metrics"]["platelets"]["direction"] == "increasing"
        assert payload["metrics"]["platelets"]["delta"] == 95000.0
        assert payload["metrics"]["platelets"]["change"] == "+76.0%"
        assert payload["metrics"]["platelets"]["stability"] in {"stable", "watchful", "volatile"}
        assert any("Platelets improved from low to normal" == insight for insight in payload["summary"])
        assert any("Vitamin b12 improved from low to normal" == insight for insight in payload["summary"])
        assert len(payload["debug"]["raw_reports"]) == 2
        assert payload["debug"]["raw_reports"][0]["raw_text_preview"].startswith("SRL Limited")
        assert len(payload["debug"]["raw_reports"][0]["raw_text_preview"]) <= 300
        assert payload["debug"]["normalized_parameters"]["hemoglobin"]["original_name"] == "Hb"
        assert payload["debug"]["normalized_parameters"]["hemoglobin"]["normalized_name"] == "hemoglobin"
        assert payload["debug"]["trend_calculations"]["deltas"]["platelets"]["delta"] == 95000.0
        assert payload["debug"]["trend_calculations"]["deltas"]["platelets"]["direction"] == "increasing"
        assert payload["debug"]["trend_calculations"]["status_transitions"]["platelets"]["statuses"] == ["low", "normal"]
        assert payload["debug"]["trend_calculations"]["status_transitions"]["platelets"]["final_interpretation"] == "Platelets improved from low to normal"
        assert payload["debug"]["deduplication_log"] == []
        assert payload["debug"]["unit_corrections"] == []
        assert payload["debug"]["conflict_resolutions"] == []


def test_patient_trends_endpoint_deduplicates_and_normalizes_units(monkeypatch):
    extracted_texts = [
        """
        SRL Limited
        Patient Name: Trend Patient
        Report Date: 18/05/2018
        Platelets 125
        WBC 7.2
        """.strip(),
        """
        SRL Limited
        Patient Name: Trend Patient
        Report Date: 18/05/2018
        Platelets 125
        WBC 7.2
        """.strip(),
        """
        SRL Limited
        Patient Name: Trend Patient
        Report Date: 18/05/2022
        Platelets 172
        WBC 8.1
        """.strip(),
    ]

    async def fake_extract(self, report_text: str):
        if "2022" in report_text:
            return StructuredMedicalReport(
                report_type="Complete Blood Count",
                summary="Newer report",
                key_values=[
                    MedicalKeyValue(name="Platelet Count", value=172, unit="/uL", reference_range="150000-450000"),
                    MedicalKeyValue(name="WBC", value=8.1, unit="x10^3/uL", reference_range="4-11"),
                ],
                normalized_terms=[],
                insights=[],
                confidence=0.95,
            )
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="Older report",
            key_values=[
                MedicalKeyValue(name="Platelet Count", value=125, unit="/uL", reference_range="150000-450000"),
                MedicalKeyValue(name="WBC", value=7.2, unit="x10^3/uL", reference_range="4-11"),
            ],
            normalized_terms=[],
            insights=[],
            confidence=0.95,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)
    monkeypatch.setattr(
        "app.services.processing.ocr.TextExtractionEngine._extract_pdf_text",
        lambda self, path: extracted_texts.pop(0),
    )

    with TestClient(app) as client:
        headers = auth_headers(client)
        for filename in ("trend-a.pdf", "trend-b.pdf", "trend-c.pdf"):
            files = {"file": (filename, BytesIO(build_pdf_bytes()), "application/pdf")}
            response = client.post("/api/v1/reports/upload", headers=headers, files=files)
            assert response.status_code == 201

        patient_id = response.json()["report"]["patient_id"]
        trends = client.get(f"/api/v1/patients/{patient_id}/trends", headers=headers)
        assert trends.status_code == 200
        payload = trends.json()

        assert len(payload["table"]) == 2
        assert payload["table"][0]["platelets"] == 125000.0
        assert payload["table"][1]["platelets"] == 172000.0
        assert payload["series"]["platelets"][0]["unit"] == MICRO_L
        assert payload["series"]["white_blood_cells"][0]["unit"] == WBC_UNIT
        assert len(payload["series"]["platelets"]) == 2
        assert any(
            entry["reason"] == "duplicate_report_same_date_same_values"
            for entry in payload["debug"]["deduplication_log"]
        )
        assert payload["debug"]["unit_corrections"] == [] or any(
            entry["parameter"] == "platelets" and entry["to_value"] == 125000.0 and entry["to_unit"] == MICRO_L
            for entry in payload["debug"]["unit_corrections"]
        )
