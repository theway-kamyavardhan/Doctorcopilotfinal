from fastapi.testclient import TestClient

from app.main import app


def test_evaluate_report_from_raw_text_and_ai_output():
    with TestClient(app) as client:
        client.post(
            "/api/v1/auth/register/patient",
            json={
                "email": "eval-patient@example.com",
                "password": "StrongPass123",
                "full_name": "Eval Patient",
                "gender": "female",
            },
        )
        login = client.post("/api/v1/auth/login", json={"email": "eval-patient@example.com", "password": "StrongPass123"})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        raw_text = "CBC Report Hb 13.5 g/dL WBC 7200 per uL Platelet Count 250000 Vitamin B12 240 pg/mL"
        ai_output = {
            "report_type": "Complete Blood Count",
            "summary": "CBC extracted.",
            "key_values": [
                {"name": "Hb", "value": "13.5", "unit": "g/dL", "interpretation": "normal"},
                {"name": "WBC", "value": "7200", "unit": "per uL", "interpretation": "normal"},
                {"name": "Platelet Count", "value": "250000", "unit": "per uL", "interpretation": "normal"},
            ],
        }
        response = client.post(
            "/api/v1/debug/evaluate-report",
            headers=headers,
            data={"raw_text": raw_text, "ai_output": __import__("json").dumps(ai_output)},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["evaluation"]["coverage_score"] > 0
        assert "vitamin_b12" in payload["missing_parameters"]
        assert payload["evaluation"]["parameter_accuracy"]["hemoglobin"] == "correct"
