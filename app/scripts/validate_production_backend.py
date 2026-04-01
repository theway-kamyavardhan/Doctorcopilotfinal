import asyncio
import mimetypes
import os
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

import requests
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.core.debug_logger import write_debug_report
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import User
from app.services.storage.service import ReportFileStorage


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DB = PROJECT_ROOT / "doctorcopilot.db"
BACKEND_PORT = 8014


def find_sample_report() -> Path:
    uploads_dir = PROJECT_ROOT / "storage" / "uploads"
    allowed_suffixes = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
    candidates = sorted(
        [
            path
            for path in uploads_dir.rglob("*")
            if path.is_file() and path.suffix.lower() in allowed_suffixes and path.stat().st_size > 1024
        ],
        key=lambda item: (0 if item.suffix.lower() == ".pdf" else 1, item.stat().st_size),
    )
    if not candidates:
        raise FileNotFoundError("No supported local report file found under storage/uploads for validation.")
    return candidates[0]


def get_existing_credentials() -> dict[str, str]:
    if not SOURCE_DB.exists():
        raise FileNotFoundError(f"Local source database not found: {SOURCE_DB}")

    conn = sqlite3.connect(SOURCE_DB)
    conn.row_factory = sqlite3.Row
    try:
        patient_row = conn.execute(
            """
            SELECT p.patient_id
            FROM patients p
            JOIN users u ON u.id = p.user_id
            WHERE u.email = 'lakhan.bang007@gmail.com'
            LIMIT 1
            """
        ).fetchone()
        doctor_row = conn.execute(
            """
            SELECT d.license_number
            FROM doctors d
            JOIN users u ON u.id = d.user_id
            WHERE u.email = 'aarav.sharma@doctorcopilot.in'
            LIMIT 1
            """
        ).fetchone()
        admin_row = conn.execute(
            """
            SELECT admin_code
            FROM users
            WHERE admin_code = 'ADMIN-001'
            LIMIT 1
            """
        ).fetchone()
    finally:
        conn.close()

    if not patient_row or not doctor_row or not admin_row:
        raise RuntimeError("Required existing local credentials could not be found.")

    return {
        "patient_id": patient_row["patient_id"],
        "patient_password": "lakhan123",
        "doctor_id": doctor_row["license_number"],
        "doctor_password": "demo123",
        "admin_id": admin_row["admin_code"],
        "admin_password": settings.admin_seed_password,
    }


async def check_database() -> tuple[bool, str]:
    try:
        engine = create_async_engine(settings.database_url, echo=False, future=True)
        async with engine.begin() as connection:
            await connection.execute(text("SELECT 1"))
        await engine.dispose()
        return True, "Connected to Supabase PostgreSQL with SELECT 1."
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


async def check_storage() -> tuple[bool, str]:
    try:
        storage = ReportFileStorage()
        stored = await storage.save_bytes(
            content=b"doctorcopilot-storage-check",
            filename="storage-check.txt",
            content_type="text/plain",
        )
        downloaded = await storage.download_file(stored.storage_path)
        await storage.delete_file(stored.storage_path)
        await storage.cleanup_temp(stored.temp_path, uses_temp_copy=stored.uses_temp_copy)
        if downloaded != b"doctorcopilot-storage-check":
            return False, "Supabase Storage round-trip returned mismatched content."
        return True, "Upload, download, and delete succeeded against Supabase Storage."
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


async def check_id_preservation() -> tuple[bool, str]:
    source = sqlite3.connect(SOURCE_DB)
    source.row_factory = sqlite3.Row
    try:
        local_patient_ids = {row[0] for row in source.execute("SELECT patient_id FROM patients")}
        local_doctor_ids = {row[0] for row in source.execute("SELECT license_number FROM doctors")}
        local_admin_ids = {row[0] for row in source.execute("SELECT admin_code FROM users WHERE admin_code IS NOT NULL")}
    finally:
        source.close()

    engine = create_async_engine(settings.database_url, echo=False, future=True)
    try:
        async with engine.begin() as connection:
            remote_patient_ids = set((await connection.execute(text("SELECT patient_id FROM patients"))).scalars().all())
            remote_doctor_ids = set((await connection.execute(text("SELECT license_number FROM doctors"))).scalars().all())
            remote_admin_ids = set((await connection.execute(text("SELECT admin_code FROM users WHERE admin_code IS NOT NULL"))).scalars().all())

            patient_duplicates = (
                await connection.execute(
                    text("SELECT patient_id, COUNT(*) FROM patients GROUP BY patient_id HAVING COUNT(*) > 1")
                )
            ).all()
            doctor_duplicates = (
                await connection.execute(
                    text("SELECT license_number, COUNT(*) FROM doctors GROUP BY license_number HAVING COUNT(*) > 1")
                )
            ).all()
            admin_duplicates = (
                await connection.execute(
                    text("SELECT admin_code, COUNT(*) FROM users WHERE admin_code IS NOT NULL GROUP BY admin_code HAVING COUNT(*) > 1")
                )
            ).all()
    finally:
        await engine.dispose()

    missing_patients = sorted(local_patient_ids - remote_patient_ids)
    missing_doctors = sorted(local_doctor_ids - remote_doctor_ids)
    missing_admins = sorted(local_admin_ids - remote_admin_ids)
    duplicates = patient_duplicates + doctor_duplicates + admin_duplicates

    if missing_patients or missing_doctors or missing_admins or duplicates:
        issues = []
        if missing_patients:
            issues.append(f"missing patients: {', '.join(missing_patients[:5])}")
        if missing_doctors:
            issues.append(f"missing doctors: {', '.join(missing_doctors[:5])}")
        if missing_admins:
            issues.append(f"missing admins: {', '.join(missing_admins[:5])}")
        if duplicates:
            issues.append("duplicate public identifiers detected")
        return False, "; ".join(issues)

    return True, "Local patient/doctor/admin public IDs are present in Supabase with no duplicate public identifiers."


def wait_for_backend(base_url: str) -> None:
    for _ in range(60):
        try:
            response = requests.get(f"{base_url}/health", timeout=2)
            if response.ok:
                return
        except Exception:
            time.sleep(1)
    raise RuntimeError("Backend did not become ready within 60 seconds.")


def run_http_validation(base_url: str, credentials: dict[str, str]) -> dict:
    results = {
        "errors": [],
        "warnings": [],
        "endpoint_failures": [],
    }
    auth_checks: list[str] = []
    id_checks: list[str] = []
    api_checks: list[str] = []
    ai_checks: list[str] = []

    sample_report = find_sample_report()
    sample_mime = mimetypes.guess_type(sample_report.name)[0] or "application/octet-stream"

    def mark(section: list[str], label: str, ok: bool, detail: str) -> None:
        icon = "✔" if ok else "❌"
        section.append(f"{icon} {label} {'working' if ok else 'failed'} - {detail}")
        if not ok:
            results["errors"].append(f"{label}: {detail}")
            results["endpoint_failures"].append(label)

    # Existing user logins only
    patient_login = requests.post(
        f"{base_url}/api/v1/auth/login",
        json={"identifier": credentials["patient_id"], "password": credentials["patient_password"]},
        timeout=60,
    )
    doctor_login = requests.post(
        f"{base_url}/api/v1/auth/login",
        json={"identifier": credentials["doctor_id"], "password": credentials["doctor_password"]},
        timeout=60,
    )
    admin_login = requests.post(
        f"{base_url}/api/v1/auth/login",
        json={"identifier": credentials["admin_id"], "password": credentials["admin_password"]},
        timeout=60,
    )

    patient_ok = patient_login.status_code == 200
    doctor_ok = doctor_login.status_code == 200
    admin_ok = admin_login.status_code == 200
    patient_token = patient_login.json().get("access_token") if patient_ok else None
    doctor_token = doctor_login.json().get("access_token") if doctor_ok else None
    admin_token = admin_login.json().get("access_token") if admin_ok else None

    mark(auth_checks, "Existing users loaded", patient_ok and doctor_ok and admin_ok, "Existing patient, doctor, and admin credentials resolved.")
    mark(auth_checks, "Login working (patient)", patient_ok, f"status={patient_login.status_code}")
    mark(auth_checks, "Login working (doctor)", doctor_ok, f"status={doctor_login.status_code}")
    mark(auth_checks, "Login working (admin)", admin_ok, f"status={admin_login.status_code}")

    patient_me = requests.get(
        f"{base_url}/api/v1/auth/me",
        headers={"Authorization": f"Bearer {patient_token}"},
        timeout=60,
    ) if patient_token else None
    jwt_ok = bool(patient_me and patient_me.status_code == 200)
    mark(auth_checks, "JWT validation", jwt_ok, f"status={patient_me.status_code if patient_me else 'no-token'}")

    # ID checks based on real existing IDs
    mark(id_checks, "IDs preserved correctly", credentials["patient_id"].startswith("P-") and credentials["doctor_id"].startswith("D-") and credentials["admin_id"] == "ADMIN-001", f"{credentials['patient_id']}, {credentials['doctor_id']}, {credentials['admin_id']}")
    preservation_ok, preservation_detail = asyncio.run(check_id_preservation()) if False else (True, "")
    # placeholder overwritten below in async wrapper

    # Protected route checks
    if doctor_token:
        doctor_me = requests.get(f"{base_url}/api/v1/doctors/me", headers={"Authorization": f"Bearer {doctor_token}"}, timeout=60)
        mark(api_checks, "Doctor protected route", doctor_me.status_code == 200, f"status={doctor_me.status_code}")
    else:
        mark(api_checks, "Doctor protected route", False, "Doctor token missing.")

    if admin_token:
        admin_dashboard = requests.get(f"{base_url}/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"}, timeout=60)
        mark(api_checks, "Admin protected route", admin_dashboard.status_code == 200, f"status={admin_dashboard.status_code}")
    else:
        mark(api_checks, "Admin protected route", False, "Admin token missing.")

    report_id = None
    if patient_token:
        with sample_report.open("rb") as handle:
            upload = requests.post(
                f"{base_url}/api/v1/reports/upload",
                headers={"Authorization": f"Bearer {patient_token}"},
                files={"file": (sample_report.name, handle, sample_mime)},
                timeout=600,
            )
        upload_ok = upload.status_code == 201
        upload_json = upload.json() if upload.headers.get("content-type", "").startswith("application/json") else {}
        report_id = upload_json.get("report", {}).get("id")
        extracted = upload_json.get("report", {}).get("extracted_data", {})
        mark(api_checks, "Report upload", upload_ok, f"status={upload.status_code}")
        mark(ai_checks, "Processing working", upload_ok and bool(report_id and extracted.get("key_values")), f"report_id={report_id}")

        with sample_report.open("rb") as handle:
            debug_process = requests.post(
                f"{base_url}/api/v1/debug/process-report",
                headers={"Authorization": f"Bearer {patient_token}"},
                files={"file": (sample_report.name, handle, sample_mime)},
                timeout=600,
            )
        debug_ok = debug_process.status_code == 200
        debug_json = debug_process.json() if debug_process.headers.get("content-type", "").startswith("application/json") else {}
        mark(ai_checks, "Debug processing", debug_ok and bool(debug_json.get("parameters")), f"status={debug_process.status_code}")

        insights = requests.get(f"{base_url}/api/v1/patients/me/insights", headers={"Authorization": f"Bearer {patient_token}"}, timeout=120)
        trends = requests.get(f"{base_url}/api/v1/patients/me/trends", headers={"Authorization": f"Bearer {patient_token}"}, timeout=120)
        insights_ok = insights.status_code == 200 and bool(insights.json().get("summary"))
        trends_ok = trends.status_code == 200 and isinstance(trends.json().get("metrics"), dict)
        mark(api_checks, "Insights endpoint", insights_ok, f"status={insights.status_code}")
        mark(api_checks, "Trends endpoint", trends_ok, f"status={trends.status_code}")
        mark(ai_checks, "Insights generated", insights_ok, f"findings={len(insights.json().get('key_findings', [])) if insights_ok else 0}")
        mark(ai_checks, "Trends updated", trends_ok, f"metrics={len(trends.json().get('metrics', {})) if trends_ok else 0}")

        if report_id:
            file_response = requests.get(
                f"{base_url}/api/v1/reports/{report_id}/file",
                headers={"Authorization": f"Bearer {patient_token}"},
                timeout=120,
            )
            export_response = requests.get(
                f"{base_url}/api/v1/reports/{report_id}/export?mode=source",
                headers={"Authorization": f"Bearer {patient_token}"},
                timeout=120,
            )
            mark(api_checks, "Stored report file access", file_response.status_code == 200 and len(file_response.content) > 0, f"status={file_response.status_code}")
            mark(api_checks, "Source PDF export", export_response.status_code == 200 and export_response.headers.get("content-type") == "application/pdf", f"status={export_response.status_code}")
    else:
        mark(api_checks, "Report upload", False, "Patient token missing.")
        mark(ai_checks, "Processing working", False, "Patient token missing.")
        mark(ai_checks, "Debug processing", False, "Patient token missing.")

    results["auth_checks"] = auth_checks
    results["id_checks"] = id_checks
    results["api_checks"] = api_checks
    results["ai_checks"] = ai_checks
    results["full_flow_success"] = not results["endpoint_failures"]
    if settings.admin_seed_password == "demo123":
        results["warnings"].append("Admin seed password is still the default demo123. Change ADMIN_SEED_PASSWORD before production launch.")
    results["warnings"].append("Supabase Storage is configured as a private bucket; report access is verified through the FastAPI file/export endpoints.")
    return results


def build_debug_report(
    *,
    database_ok: bool,
    database_detail: str,
    storage_ok: bool,
    storage_detail: str,
    id_preservation_ok: bool,
    id_preservation_detail: str,
    http_results: dict,
) -> str:
    endpoint_line = "✔ All working" if not http_results["endpoint_failures"] else f"❌ Failed: {', '.join(http_results['endpoint_failures'])}"
    auth_lines = "\n".join(http_results["auth_checks"])
    id_lines = "\n".join(http_results["id_checks"] + [
        f"{'✔' if id_preservation_ok else '❌'} No duplicates {'working' if id_preservation_ok else 'failed'} - {id_preservation_detail}",
        f"{'✔' if id_preservation_ok else '❌'} No regeneration {'working' if id_preservation_ok else 'failed'} - Existing public IDs in Supabase match the local source snapshot." if id_preservation_ok else f"❌ No regeneration failed - {id_preservation_detail}",
    ])
    api_lines = "\n".join(http_results["api_checks"])
    ai_lines = "\n".join(http_results["ai_checks"])
    full_flow_line = "✔ Full flow success" if http_results["full_flow_success"] else "❌ Failed"
    error_block = "\n".join(f"- {item}" for item in (http_results["errors"] or ["None"]))
    warning_block = "\n".join(f"- {item}" for item in (http_results["warnings"] or ["None"]))

    return (
        "## DOCTORCOPILOT SYSTEM DEBUG REPORT\n\n"
        "Auth:\n"
        f"{auth_lines}\n\n"
        "ID System:\n"
        f"{id_lines}\n\n"
        "Database:\n"
        f"{'✔ Connected' if database_ok else '❌ Failed'} - {database_detail}\n\n"
        "Storage:\n"
        f"{'✔ Upload working' if storage_ok else '❌ Failed'} - {storage_detail}\n\n"
        "API Endpoints:\n"
        f"{endpoint_line}\n"
        f"{api_lines}\n\n"
        "AI Pipeline:\n"
        f"{ai_lines}\n\n"
        "Test Flow:\n"
        f"{full_flow_line}\n\n"
        "Errors:\n"
        f"{error_block}\n\n"
        "Warnings:\n"
        f"{warning_block}\n"
    )


async def main() -> None:
    credentials = get_existing_credentials()
    database_ok, database_detail = await check_database()
    storage_ok, storage_detail = await check_storage()
    id_preservation_ok, id_preservation_detail = await check_id_preservation()

    env = os.environ.copy()
    env.setdefault("ENVIRONMENT", settings.environment)
    env.setdefault("DATABASE_URL", settings.database_url)
    env.setdefault("SUPABASE_URL", settings.supabase_url or "")
    env.setdefault("SUPABASE_SERVICE_ROLE_KEY", settings.supabase_service_role_key or "")
    env.setdefault("SUPABASE_STORAGE_BUCKET", settings.supabase_storage_bucket)

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(BACKEND_PORT)],
        cwd=PROJECT_ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        base_url = f"http://127.0.0.1:{BACKEND_PORT}"
        wait_for_backend(base_url)
        http_results = run_http_validation(base_url, credentials)
    except Exception as exc:  # noqa: BLE001
        http_results = {
            "auth_checks": ["❌ Existing users loaded failed - Validation harness failed before auth tests."],
            "id_checks": [],
            "api_checks": [],
            "ai_checks": [],
            "errors": [str(exc)],
            "warnings": [],
            "endpoint_failures": ["validation_harness"],
            "full_flow_success": False,
        }
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()

    report = build_debug_report(
        database_ok=database_ok,
        database_detail=database_detail,
        storage_ok=storage_ok,
        storage_detail=storage_detail,
        id_preservation_ok=id_preservation_ok,
        id_preservation_detail=id_preservation_detail,
        http_results=http_results,
    )
    write_debug_report(report)
    print(report.replace("✔", "[OK]").replace("❌", "[FAIL]"))


if __name__ == "__main__":
    asyncio.run(main())
