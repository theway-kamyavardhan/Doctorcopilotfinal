from io import BytesIO
from uuid import uuid4

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.main import app
from app.services.ai.schemas import MedicalKeyValue, StructuredMedicalReport


def build_pdf_bytes() -> bytes:
    return b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 92 >>
stream
BT
/F1 18 Tf
72 720 Td
(Complete Blood Count Report Hb 13.5 g/dL WBC 7200 per uL Platelets 250000.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000384 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
454
%%EOF
"""


def auth_headers(client: TestClient) -> dict[str, str]:
    email = f"pytest-patient-{uuid4()}@example.com"
    password = "StrongPass123"
    client.post(
        "/api/v1/auth/register/patient",
        json={"email": email, "password": password, "full_name": "Pytest Patient", "gender": "female"},
    )
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def build_image_bytes() -> bytes:
    image = Image.new("RGB", (900, 220), color="white")
    draw = ImageDraw.Draw(image)
    draw.text((30, 80), "Hb 13.5 WBC 7200 Platelet Count 250000", fill="black")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def build_scanned_pdf_bytes() -> bytes:
    image = Image.new("RGB", (900, 220), color="white")
    draw = ImageDraw.Draw(image)
    draw.text((30, 80), "Hb 13.5 WBC 7200 Platelet Count 250000", fill="black")
    buffer = BytesIO()
    image.save(buffer, format="PDF")
    return buffer.getvalue()


def test_upload_and_debug_flow(monkeypatch):
    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="CBC summary",
            key_values=[
                MedicalKeyValue(name="Hb", value="13.5", unit="g/dL"),
                MedicalKeyValue(name="WBC", value="7200", unit="per uL"),
            ],
            normalized_terms=[],
            insights=[],
            confidence=0.99,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("cbc.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        upload = client.post("/api/v1/reports/upload", headers=headers, files=files)
        assert upload.status_code == 201
        assert "hemoglobin" in upload.json()["report"]["extracted_data"]["key_values"]
        assert "white_blood_cells" in upload.json()["report"]["extracted_data"]["key_values"]

        files = {"file": ("cbc.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        debug = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert debug.status_code == 200
        assert "raw_text" in debug.json()
        assert "metadata" in debug.json()
        assert "parameters" in debug.json()
        assert "insights" in debug.json()
        assert "confidence" in debug.json()
        assert "cleaned" in debug.json()
        assert "ai_output" in debug.json()
        assert "final_output" in debug.json()
        assert "parsed_data" in debug.json()
        assert "value_extraction_fixed" in debug.json()
        assert "invalid_values_detected" in debug.json()
        assert debug.json()["value_extraction_fixed"] is True
        assert "logs" in debug.json()


def test_empty_upload_rejected():
    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("empty.pdf", BytesIO(b""), "application/pdf")}
        response = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert response.status_code == 400
        assert response.json()["detail"] == "Uploaded file is empty."


def test_scanned_pdf_uses_ocr_fallback(monkeypatch):
    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="OCR summary",
            key_values=[MedicalKeyValue(name="Platelet Count", value="250000", unit="per uL")],
            normalized_terms=[],
            insights=[],
            confidence=0.92,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)
    monkeypatch.setattr("app.services.processing.ocr.TextExtractionEngine._extract_pdf_text", lambda self, path: "short")
    monkeypatch.setattr(
        "app.services.processing.ocr.TextExtractionEngine._ocr_pdf",
        lambda self, path: ("Hb 13.5 WBC 7200 Platelet Count 250000", 1),
    )

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("scanned.pdf", BytesIO(build_scanned_pdf_bytes()), "application/pdf")}
        debug = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert debug.status_code == 200
        payload = debug.json()
        assert payload["raw_text"]
        ocr_log = next(log for log in payload["logs"] if log["step"] == "ocr")
        assert ocr_log["payload"]["fallback_used"] is True


def test_image_upload_uses_ocr(monkeypatch):
    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="Image OCR summary",
            key_values=[MedicalKeyValue(name="Hb", value="13.5", unit="g/dL")],
            normalized_terms=[],
            insights=[],
            confidence=0.88,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)
    monkeypatch.setattr(
        "app.services.processing.ocr.TextExtractionEngine._ocr_image_file",
        lambda self, path: "Hb 13.5 WBC 7200 Platelet Count 250000",
    )

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("scan.png", BytesIO(build_image_bytes()), "image/png")}
        debug = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert debug.status_code == 200
        payload = debug.json()
        assert payload["raw_text"]
        ocr_log = next(log for log in payload["logs"] if log["step"] == "ocr")
        assert ocr_log["payload"]["method"] == "ocr_image"


def test_value_cleaning_repairs_ocr_noise(monkeypatch):
    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="Value cleanup summary",
            key_values=[MedicalKeyValue(name="HEMOGLOBIN", value="14.2", unit="g/dL")],
            normalized_terms=[],
            insights=[],
            confidence=0.97,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)
    monkeypatch.setattr("app.services.processing.ocr.TextExtractionEngine._extract_pdf_text", lambda self, path: "HEMOGLOBIN 14.2Â°")

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("cbc.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        debug = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert debug.status_code == 200
        payload = debug.json()
        assert payload["parsed_data"]["key_values"]["hemoglobin"]["value"] == 14.2


def test_clinical_normalization_enforces_units_and_status(monkeypatch):
    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Blood Test",
            summary="Clinical normalization summary",
            key_values=[
                MedicalKeyValue(name="Hb", value=14.2, unit="g/dl", reference_range="17-13"),
                MedicalKeyValue(name="WBC", value=7200, unit="per uL", reference_range="11-4"),
                MedicalKeyValue(name="Iron", value=85, unit="g/dL", reference_range="170-60"),
                MedicalKeyValue(name="Platelet Count", value=125000, unit="per uL", reference_range="450000-150000"),
                MedicalKeyValue(name="platelets", value=125000, unit="/uL", reference_range="450000-150000"),
            ],
            normalized_terms=[],
            insights=[],
            confidence=0.91,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("cbc.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        debug = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert debug.status_code == 200
        payload = debug.json()["parsed_data"]

        hemoglobin = payload["key_values"]["hemoglobin"]
        assert hemoglobin["unit"] == "g/dL"
        assert hemoglobin["reference_range"] == "13.0-17.0"
        assert hemoglobin["status"] == "normal"
        assert hemoglobin["interpretation"] == "normal"

        wbc = payload["key_values"]["white_blood_cells"]
        assert wbc["unit"] == "×10³/µL"
        assert wbc["value"] == 7.2
        assert wbc["status"] == "normal"

        iron = payload["key_values"]["iron"]
        assert iron["unit"] == "µg/dL"
        assert iron["status"] == "normal"

        platelets = payload["key_values"]["platelets"]
        assert platelets["unit"] == "/µL"
        assert platelets["status"] == "low"
        assert platelets["interpretation"] == "low"

        assert payload["cleaned"] is True
        assert 0.90 <= payload["confidence"] <= 0.99
        assert len([item for item in payload["parameters"] if item["name"] == "platelets"]) == 1


def test_vitamin_d_uses_clinical_interpretation_rule(monkeypatch):
    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Vitamin Panel",
            summary="Vitamin D summary",
            key_values=[MedicalKeyValue(name="Vitamin D", value=18, unit="ng/mL", reference_range="20-100")],
            normalized_terms=[],
            insights=[],
            confidence=0.93,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("vitamin.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        debug = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert debug.status_code == 200
        vitamin_d = debug.json()["parsed_data"]["key_values"]["vitamin_d"]
        assert vitamin_d["status"] == "deficient"
        assert vitamin_d["interpretation"] == "deficient"


def test_metadata_extraction_populates_patient_and_dates(monkeypatch):
    raw_text = """
    Apex Diagnostics
    Address: 21 Lake View Road, Kolkata
    Patient Name: Jane Doe
    Age: 34 Years
    Gender: Female
    Patient ID: P-7781
    Contact: +91 9876543210
    Report Date: 18/03/2026
    Collection Date: 17/03/2026
    Report Time: 08:45 AM
    Referred By: Dr. Rahul Sen
    Specialization: Hematology
    Test Name: Complete Blood Count
    Sample Type: Serum
    Sample ID: S-445
    Fasting: Non-Fasting
    Analyzer: Sysmex XN-1000
    Method: Automated analyzer
    Report ID: RPT-2026-55
    Barcode: BC7788
    Registration Number: REG-991
    Platelets 125 Low
    Remarks: Correlate clinically
    HEMOGLOBIN 14.2 g/dL
    """.strip()

    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="Metadata summary",
            key_values=[MedicalKeyValue(name="Hb", value=14.2, unit="g/dL")],
            normalized_terms=[],
            insights=[],
            confidence=0.95,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)
    monkeypatch.setattr("app.services.processing.ocr.TextExtractionEngine._extract_pdf_text", lambda self, path: raw_text)

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("timeline.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}

        upload = client.post("/api/v1/reports/upload", headers=headers, files=files)
        assert upload.status_code == 201
        upload_report = upload.json()["report"]
        assert upload_report["report_date"] == "2026-03-18"
        assert upload_report["sample_collection_date"] == "2026-03-17"
        assert upload_report["date_confidence"] == "high"
        assert upload_report["patient_name"] == "Jane Doe"
        assert upload_report["lab_name"] == "Apex Diagnostics"
        assert upload_report["doctor_name"] == "Dr. Rahul Sen"
        assert upload_report["sample_type"] == "serum"
        assert upload_report["machine_used"] == "Sysmex XN-1000"
        assert upload_report["report_metadata"]["patient"]["full_name"] == "Jane Doe"

        debug = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert debug.status_code == 200
        payload = debug.json()
        assert payload["metadata"]["patient"]["full_name"] == "Jane Doe"
        assert payload["metadata"]["patient"]["age"] == "34"
        assert payload["metadata"]["patient"]["gender"] == "female"
        assert payload["metadata"]["patient"]["patient_id"] == "P-7781"
        assert payload["metadata"]["patient"]["contact_info"]["phone"] == "+91 9876543210"
        assert payload["metadata"]["report"]["report_date"] == "2026-03-18"
        assert payload["metadata"]["report"]["collection_date"] == "2026-03-17"
        assert payload["metadata"]["report"]["report_time"] == "08:45:00"
        assert payload["metadata"]["report"]["date_confidence"] == "high"
        assert payload["metadata"]["report"]["report_type"] == "Complete Blood Count"
        assert payload["metadata"]["lab"]["lab_name"] == "Apex Diagnostics"
        assert payload["metadata"]["lab"]["address"] == "21 Lake View Road, Kolkata"
        assert payload["metadata"]["doctor"]["referring_doctor"] == "Dr. Rahul Sen"
        assert payload["metadata"]["doctor"]["doctor_specialization"] == "Hematology"
        assert payload["metadata"]["sample"]["sample_type"] == "serum"
        assert payload["metadata"]["sample"]["sample_id"] == "S-445"
        assert payload["metadata"]["sample"]["fasting_status"] == "non-fasting"
        assert payload["metadata"]["machine"]["analyzer_name"] == "Sysmex XN-1000"
        assert payload["metadata"]["machine"]["test_method"] == "Automated analyzer"
        assert payload["metadata"]["admin"]["report_id"] == "RPT-2026-55"
        assert payload["metadata"]["admin"]["barcode"] == "BC7788"
        assert payload["metadata"]["admin"]["registration_number"] == "REG-991"
        assert payload["final_output"]["metadata"]["patient"]["full_name"] == "Jane Doe"
        assert payload["final_output"]["clinical_data"]["report_type"] == "Complete Blood Count"
        assert payload["final_output"]["flags"]
        assert payload["final_output"]["notes"]
        metadata_log = next(log for log in payload["logs"] if log["step"] == "metadata_extraction")
        assert metadata_log["status"] == "success"


def test_metadata_cleaning_and_conflict_resolution(monkeypatch):
    raw_text = """
    SRL Limited
    Location: Jodhpur
    PATIENT NAME: Lakhan
    cE: 15 Years
    Age: 15 Years
    Gender: Male
    Accession Number: OQOO9REO38594
    Patient ID: PID-88
    Drawn Date: 18-05-2018
    Received Date: 18-05-2018
    Reported Date: 19-05-2018
    Referred By: Dr. Purshotam Dan
    Inzerval: 5 days
    HEMOGLOBIN 14.2 g/dL
    """.strip()

    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="Noisy OCR summary",
            key_values=[MedicalKeyValue(name="Hb", value=14.2, unit="g/dL")],
            normalized_terms=[],
            insights=[],
            confidence=0.96,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)
    monkeypatch.setattr("app.services.processing.ocr.TextExtractionEngine._extract_pdf_text", lambda self, path: raw_text)

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("noisy.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        debug = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert debug.status_code == 200
        payload = debug.json()
        assert "Age: 15 Years" in payload["raw_text"]
        assert "Interval: 5 days" in payload["raw_text"]
        assert payload["metadata"]["patient"]["full_name"] == "Lakhan"
        assert payload["metadata"]["patient"]["age"] == "15"
        assert payload["metadata"]["patient"]["accession_number"] == "0Q009RE038594"
        assert payload["metadata"]["report"]["drawn_date"] == "2018-05-18"
        assert payload["metadata"]["report"]["received_date"] == "2018-05-18"
        assert payload["metadata"]["report"]["reported_date"] == "2018-05-19"
        assert payload["metadata"]["doctor"]["referring_doctor"] == "Dr. Purshotam Dan"
        assert payload["metadata"]["lab"]["lab_name"] == "SRL Limited"
        assert payload["metadata"]["lab"]["address"] == "Jodhpur"


def test_metadata_name_cleanup_removes_contamination(monkeypatch):
    raw_text = """
    SRL LIMITED
    PATIENT NAME: LAKHAN PATIENT ID
    Referred By: . PURSHOTAM DAN CLIENT PATIENT ID
    Accession Number: OQ009RE038594 AGE 15 MALE
    Reported Date: 19-05-2018
    HEMOGLOBIN 14.2 g/dL
    """.strip()

    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="Cleanup summary",
            key_values=[MedicalKeyValue(name="Hb", value=14.2, unit="g/dL")],
            normalized_terms=[],
            insights=[],
            confidence=0.95,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)
    monkeypatch.setattr("app.services.processing.ocr.TextExtractionEngine._extract_pdf_text", lambda self, path: raw_text)

    with TestClient(app) as client:
        headers = auth_headers(client)
        files = {"file": ("cleanup.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        debug = client.post("/api/v1/debug/process-report", headers=headers, files=files)
        assert debug.status_code == 200
        payload = debug.json()
        assert payload["metadata"]["patient"]["full_name"] == "Lakhan"
        assert payload["metadata"]["doctor"]["referring_doctor"] == "Dr. Purshotam Dan"
        assert payload["metadata"]["lab"]["lab_name"] == "SRL Limited"
        assert payload["metadata"]["patient"]["accession_number"] == "0Q009RE038594"
