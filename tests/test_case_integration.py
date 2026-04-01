from io import BytesIO
from uuid import uuid4

from fastapi.testclient import TestClient

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
(CBC report seeded for case integration test.) Tj
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


def register_patient_and_login(client: TestClient):
    email = f"case-patient-{uuid4()}@example.com"
    password = "StrongPass123"
    register = client.post(
        "/api/v1/auth/register/patient",
        json={
            "email": email,
            "password": password,
            "full_name": "Case Patient",
            "gender": "female",
            "age": 29,
            "blood_group": "O+",
        },
    )
    assert register.status_code == 201
    patient_id = register.json()["id"]
    login = client.post("/api/v1/auth/login", json={"username": email, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return patient_id, {"Authorization": f"Bearer {token}"}


def register_doctor_and_login(client: TestClient):
    email = f"case-doctor-{uuid4()}@example.com"
    password = "StrongPass123"
    license_number = f"D-{str(uuid4().int)[:8]}"
    register = client.post(
        "/api/v1/auth/register/doctor",
        json={
            "email": email,
            "password": password,
            "full_name": "Case Doctor",
            "license_number": license_number,
            "specialization": "General Physician",
            "hospital": "DoctorCopilot Test Hospital",
            "location": "Kolkata",
            "phone_number": "9876500000",
        },
    )
    assert register.status_code == 201
    doctor_id = register.json()["id"]
    login = client.post("/api/v1/auth/login", json={"username": license_number, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return doctor_id, {"Authorization": f"Bearer {token}"}


def test_case_report_and_chat_integration(monkeypatch):
    async def fake_extract(self, report_text: str):
        return StructuredMedicalReport(
            report_type="Complete Blood Count",
            summary="Linked case CBC summary",
            key_values=[
                MedicalKeyValue(name="Platelet Count", value="118000", unit="/uL"),
                MedicalKeyValue(name="Vitamin B12", value="176", unit="pg/mL"),
            ],
            normalized_terms=[],
            insights=[],
            confidence=0.94,
        )

    monkeypatch.setattr("app.services.ai.client.OpenAIExtractionClient.extract", fake_extract)

    with TestClient(app) as client:
        patient_id, patient_headers = register_patient_and_login(client)
        _, doctor_headers = register_doctor_and_login(client)

        create_case = client.post(
            "/api/v1/cases",
            headers=doctor_headers,
            json={
                "patient_id": patient_id,
                "title": "Integrated Case",
                "description": "Doctor initiated review for seeded patient.",
                "type": "consultation_request",
            },
        )
        assert create_case.status_code == 200
        case_payload = create_case.json()
        case_id = case_payload["id"]
        assert case_payload["patient_name"] == "Case Patient"
        assert case_payload["doctor_name"] == "Case Doctor"

        files = {"file": ("cbc.pdf", BytesIO(build_pdf_bytes()), "application/pdf")}
        upload = client.post(
            "/api/v1/reports/upload",
            headers=patient_headers,
            data={"case_id": case_id},
            files=files,
        )
        assert upload.status_code == 201

        doctor_case = client.get(f"/api/v1/cases/{case_id}", headers=doctor_headers)
        assert doctor_case.status_code == 200
        doctor_case_payload = doctor_case.json()
        assert doctor_case_payload["report_count"] == 1
        assert doctor_case_payload["reports"][0]["report_type"] == "Complete Blood Count"

        first_message = client.post(
            f"/api/v1/cases/{case_id}/messages",
            headers=doctor_headers,
            json={"content": "Please monitor bruising and fatigue symptoms.", "message_type": "text"},
        )
        assert first_message.status_code == 200

        patient_messages = client.get(f"/api/v1/cases/{case_id}/messages", headers=patient_headers)
        assert patient_messages.status_code == 200
        assert patient_messages.json()[0]["sender_type"] == "doctor"

        reply = client.post(
            f"/api/v1/cases/{case_id}/messages",
            headers=patient_headers,
            json={"content": "Bruising is intermittent and fatigue is still present.", "message_type": "text"},
        )
        assert reply.status_code == 200
        assert reply.json()["sender_type"] == "patient"

        outsider_id, outsider_headers = register_patient_and_login(client)
        assert outsider_id != patient_id
        forbidden = client.get(f"/api/v1/cases/{case_id}", headers=outsider_headers)
        assert forbidden.status_code == 400
