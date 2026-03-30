import asyncio
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.enums import CaseStatus, ReportStatus
from app.models.patient import Patient
from app.models.report import ExtractedData, Report
from app.models.user import User
from app.services.insights.service import AIInsightPayload


def auth_token(client: TestClient, email: str, password: str, payload: dict, path: str) -> str:
    client.post(path, json=payload)
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]


async def seed_reports(patient_user_email: str, doctor_user_email: str) -> str:
    async with AsyncSessionLocal() as session:
        patient_user = (await session.execute(select(User).where(User.email == patient_user_email))).scalar_one()
        doctor_user = (await session.execute(select(User).where(User.email == doctor_user_email))).scalar_one()
        patient = (await session.execute(select(Patient).where(Patient.user_id == patient_user.id))).scalar_one()
        doctor = (await session.execute(select(Doctor).where(Doctor.user_id == doctor_user.id))).scalar_one()

        case = Case(
            patient_id=patient.id,
            doctor_id=doctor.id,
            title="Historical platelet review",
            description="Trend review",
            status=CaseStatus.OPEN,
        )
        session.add(case)
        await session.flush()

        report_2018 = Report(
            patient_id=patient.id,
            case_id=case.id,
            file_name="report-2018.pdf",
            file_path="storage/uploads/report-2018.pdf",
            mime_type="application/pdf",
            report_type="CBC",
            summary="Low platelets in historical report.",
            status=ReportStatus.PROCESSED,
            created_at=datetime(2018, 5, 1, tzinfo=UTC),
            updated_at=datetime(2018, 5, 1, tzinfo=UTC),
        )
        report_2022 = Report(
            patient_id=patient.id,
            case_id=case.id,
            file_name="report-2022.pdf",
            file_path="storage/uploads/report-2022.pdf",
            mime_type="application/pdf",
            report_type="CBC",
            summary="Platelets returned to normal range.",
            status=ReportStatus.PROCESSED,
            created_at=datetime(2022, 5, 1, tzinfo=UTC),
            updated_at=datetime(2022, 5, 1, tzinfo=UTC),
        )
        session.add_all([report_2018, report_2022])
        await session.flush()

        session.add_all(
            [
                ExtractedData(
                    report_id=report_2018.id,
                    report_type="CBC",
                    summary="Historical CBC",
                    key_values={
                        "platelets": {"name": "Platelet Count", "value": 125000, "unit": "per uL"},
                        "hemoglobin": {"name": "Hb", "value": 11.2, "unit": "g/dL"},
                    },
                    normalized_terms=[],
                    confidence=0.91,
                    created_at=datetime(2018, 5, 1, tzinfo=UTC),
                    updated_at=datetime(2018, 5, 1, tzinfo=UTC),
                ),
                ExtractedData(
                    report_id=report_2022.id,
                    report_type="CBC",
                    summary="Recovery CBC",
                    key_values={
                        "platelets": {"name": "Platelet Count", "value": 220000, "unit": "per uL"},
                        "hemoglobin": {"name": "Hb", "value": 13.6, "unit": "g/dL"},
                    },
                    normalized_terms=[],
                    confidence=0.94,
                    created_at=datetime(2022, 5, 1, tzinfo=UTC),
                    updated_at=datetime(2022, 5, 1, tzinfo=UTC),
                ),
            ]
        )
        await session.commit()
        return str(patient.id)


def test_patient_insights_detect_improvement(monkeypatch):
    async def fake_summary(self, patient_id, trends, findings, risk_level):
        return AIInsightPayload(
            key_findings=findings,
            risk_level=risk_level,
            summary=["Platelet values improved over time and entered a more reassuring range."],
        )

    monkeypatch.setattr("app.services.insights.service.InsightsService.generate_summary", fake_summary)

    with TestClient(app) as client:
        auth_token(
            client,
            "insights-patient@example.com",
            "StrongPass123",
            {
                "email": "insights-patient@example.com",
                "password": "StrongPass123",
                "full_name": "Insights Patient",
                "gender": "female",
            },
            "/api/v1/auth/register/patient",
        )
        doctor_token = auth_token(
            client,
            "insights-doctor@example.com",
            "StrongPass123",
            {
                "email": "insights-doctor@example.com",
                "password": "StrongPass123",
                "full_name": "Insights Doctor",
                "license_number": "LIC-INS-1",
                "specialization": "Hematology",
            },
            "/api/v1/auth/register/doctor",
        )

        patient_id = asyncio.run(seed_reports("insights-patient@example.com", "insights-doctor@example.com"))
        response = client.get(f"/api/v1/patients/{patient_id}/insights", headers={"Authorization": f"Bearer {doctor_token}"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["trends"]["platelets"]["trend"] == "increasing"
        assert payload["trends"]["platelets"]["status"] == "improving"
        assert any("improved" in finding.lower() for finding in payload["key_findings"])
