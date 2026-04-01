import argparse
import asyncio
import json
import sqlite3
import uuid
from datetime import date, datetime, time, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select

from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.schema import ensure_runtime_schema
from app.db.session import AsyncSessionLocal, get_engine, initialize_database
from app.models.appointment import Appointment
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.message import Message
from app.models.note import ClinicalNote
from app.models.patient import Patient
from app.models.processing import ProcessingLog
from app.models.report import ExtractedData, Report, ReportInsight
from app.models.user import User
from app.services.storage.service import ReportFileStorage


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_DB = PROJECT_ROOT / "doctorcopilot.db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="One-time migration from local SQLite + local uploads into Supabase Postgres + Storage."
    )
    parser.add_argument("--source-db", type=Path, default=DEFAULT_SOURCE_DB)
    parser.add_argument(
        "--reset-target",
        action="store_true",
        help="Delete existing target data before importing the local snapshot.",
    )
    return parser.parse_args()


def parse_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    if len(text) == 32:
        return uuid.UUID(hex=text)
    return uuid.UUID(text)


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    return date.fromisoformat(text)


def parse_time(value: str | None) -> time | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    return time.fromisoformat(text)


def parse_json(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    text = str(value).strip()
    if not text:
        return default
    return json.loads(text)


def resolve_local_file_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return (PROJECT_ROOT / path).resolve()


def read_rows(source_db: Path, table: str) -> list[sqlite3.Row]:
    with sqlite3.connect(source_db) as conn:
        conn.row_factory = sqlite3.Row
        return conn.execute(f"SELECT * FROM {table}").fetchall()


async def clear_target_data() -> None:
    async with AsyncSessionLocal() as session:
        for model in [
            ProcessingLog,
            ReportInsight,
            ExtractedData,
            Report,
            Message,
            ClinicalNote,
            Appointment,
            Case,
            Patient,
            Doctor,
            User,
        ]:
            await session.execute(delete(model))
        await session.commit()


async def migrate_users(source_db: Path) -> int:
    rows = read_rows(source_db, "users")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                User(
                    id=parse_uuid(row["id"]),
                    email=row["email"],
                    admin_code=row["admin_code"],
                    hashed_password=row["hashed_password"],
                    full_name=row["full_name"],
                    role=row["role"],
                    is_active=bool(row["is_active"]),
                    google_sub=row["google_sub"],
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def migrate_patients(source_db: Path) -> int:
    rows = read_rows(source_db, "patients")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                Patient(
                    id=parse_uuid(row["id"]),
                    user_id=parse_uuid(row["user_id"]),
                    patient_id=row["patient_id"],
                    gender=row["gender"],
                    birth_date=parse_date(row["birth_date"]),
                    age=row["age"],
                    blood_group=row["blood_group"],
                    phone_number=row["phone_number"],
                    emergency_contact=row["emergency_contact"],
                    medical_history=row["medical_history"],
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def migrate_doctors(source_db: Path) -> int:
    rows = read_rows(source_db, "doctors")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                Doctor(
                    id=parse_uuid(row["id"]),
                    user_id=parse_uuid(row["user_id"]),
                    license_number=row["license_number"],
                    specialization=row["specialization"],
                    hospital=row["hospital"],
                    location=row["location"],
                    phone_number=row["phone_number"],
                    bio=row["bio"],
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def migrate_cases(source_db: Path) -> int:
    rows = read_rows(source_db, "cases")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                Case(
                    id=parse_uuid(row["id"]),
                    patient_id=parse_uuid(row["patient_id"]),
                    doctor_id=parse_uuid(row["doctor_id"]),
                    title=row["title"],
                    description=row["description"],
                    request_origin=row["request_origin"] or "patient",
                    referral_note=row["referral_note"],
                    referred_by_doctor_id=parse_uuid(row["referred_by_doctor_id"]),
                    report_access_status=row["report_access_status"] or "not_requested",
                    report_access_requested_at=parse_datetime(row["report_access_requested_at"]),
                    report_access_updated_at=parse_datetime(row["report_access_updated_at"]),
                    report_access_requested_by_doctor_id=parse_uuid(row["report_access_requested_by_doctor_id"]),
                    status=row["status"],
                    closing_note=row["closing_note"],
                    closed_by_doctor_id=parse_uuid(row["closed_by_doctor_id"]),
                    closed_at=parse_datetime(row["closed_at"]),
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def migrate_messages(source_db: Path) -> int:
    rows = read_rows(source_db, "messages")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                Message(
                    id=parse_uuid(row["id"]),
                    case_id=parse_uuid(row["case_id"]),
                    sender_user_id=parse_uuid(row["sender_user_id"]),
                    sender_type=row["sender_type"],
                    content=row["content"],
                    message_type=row["message_type"] or "text",
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def migrate_appointments(source_db: Path) -> int:
    rows = read_rows(source_db, "appointments")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                Appointment(
                    id=parse_uuid(row["id"]),
                    patient_id=parse_uuid(row["patient_id"]),
                    doctor_id=parse_uuid(row["doctor_id"]),
                    case_id=parse_uuid(row["case_id"]),
                    title=row["title"],
                    description=row["description"],
                    location=row["location"],
                    date_time=parse_datetime(row["date_time"]),
                    status=row["status"],
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def migrate_clinical_notes(source_db: Path) -> int:
    rows = read_rows(source_db, "clinical_notes")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                ClinicalNote(
                    id=parse_uuid(row["id"]),
                    case_id=parse_uuid(row["case_id"]),
                    doctor_id=parse_uuid(row["doctor_id"]),
                    note=row["note"],
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def migrate_reports(source_db: Path) -> tuple[int, int]:
    rows = read_rows(source_db, "reports")
    storage = ReportFileStorage()
    missing_files = 0

    async with AsyncSessionLocal() as session:
        for row in rows:
            local_file = resolve_local_file_path(row["file_path"])
            storage_path = Path(row["file_path"]).name
            checksum = row["checksum"]
            if local_file.exists():
                content = local_file.read_bytes()
                stored = await storage.save_bytes(
                    content=content,
                    filename=row["file_name"] or local_file.name,
                    content_type=row["mime_type"] or "application/octet-stream",
                    object_name=storage_path,
                )
                storage_path = stored.storage_path
                checksum = checksum or stored.checksum
                await storage.cleanup_temp(stored.temp_path, uses_temp_copy=stored.uses_temp_copy)
            else:
                missing_files += 1

            session.add(
                Report(
                    id=parse_uuid(row["id"]),
                    patient_id=parse_uuid(row["patient_id"]),
                    case_id=parse_uuid(row["case_id"]),
                    file_name=row["file_name"],
                    file_path=storage_path,
                    mime_type=row["mime_type"],
                    checksum=checksum,
                    report_type=row["report_type"],
                    report_category=row["report_category"],
                    report_keywords=parse_json(row["report_keywords"], []),
                    report_metadata=parse_json(row["report_metadata"], {}),
                    parameters=parse_json(row["parameters"], []),
                    patient_name=row["patient_name"],
                    lab_name=row["lab_name"],
                    doctor_name=row["doctor_name"],
                    sample_type=row["sample_type"],
                    machine_used=row["machine_used"],
                    report_date=parse_date(row["report_date"]),
                    sample_collection_date=parse_date(row["sample_collection_date"]),
                    report_generation_date=parse_date(row["report_generation_date"]),
                    report_time=parse_time(row["report_time"]),
                    date_confidence=row["date_confidence"],
                    raw_text=row["raw_text"],
                    summary=row["summary"],
                    status=row["status"],
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()

    return len(rows), missing_files


async def migrate_extracted_data(source_db: Path) -> int:
    rows = read_rows(source_db, "extracted_data")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                ExtractedData(
                    id=parse_uuid(row["id"]),
                    report_id=parse_uuid(row["report_id"]),
                    schema_version=row["schema_version"],
                    report_type=row["report_type"],
                    summary=row["summary"],
                    key_values=parse_json(row["key_values"], {}),
                    normalized_terms=parse_json(row["normalized_terms"], []),
                    confidence=row["confidence"],
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def migrate_report_insights(source_db: Path) -> int:
    rows = read_rows(source_db, "report_insights")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                ReportInsight(
                    id=parse_uuid(row["id"]),
                    report_id=parse_uuid(row["report_id"]),
                    category=row["category"],
                    title=row["title"],
                    description=row["description"],
                    severity=row["severity"],
                    insight_metadata=parse_json(row["metadata"], {}),
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def migrate_processing_logs(source_db: Path) -> int:
    rows = read_rows(source_db, "processing_logs")
    async with AsyncSessionLocal() as session:
        for row in rows:
            session.add(
                ProcessingLog(
                    id=parse_uuid(row["id"]),
                    report_id=parse_uuid(row["report_id"]),
                    step=row["step"],
                    status=row["status"],
                    detail=row["detail"],
                    payload=parse_json(row["payload"], {}),
                    error_message=row["error_message"],
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
            )
        await session.commit()
    return len(rows)


async def target_counts() -> dict[str, int]:
    async with AsyncSessionLocal() as session:
        return {
            "users": len((await session.scalars(select(User))).all()),
            "patients": len((await session.scalars(select(Patient))).all()),
            "doctors": len((await session.scalars(select(Doctor))).all()),
            "cases": len((await session.scalars(select(Case))).all()),
            "messages": len((await session.scalars(select(Message))).all()),
            "reports": len((await session.scalars(select(Report))).all()),
            "extracted_data": len((await session.scalars(select(ExtractedData))).all()),
            "report_insights": len((await session.scalars(select(ReportInsight))).all()),
            "appointments": len((await session.scalars(select(Appointment))).all()),
            "clinical_notes": len((await session.scalars(select(ClinicalNote))).all()),
            "processing_logs": len((await session.scalars(select(ProcessingLog))).all()),
        }


async def main() -> None:
    args = parse_args()
    if not args.source_db.exists():
        raise FileNotFoundError(f"Source SQLite database not found: {args.source_db}")

    await initialize_database()
    async with get_engine().begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(ensure_runtime_schema)

    if args.reset_target:
        await clear_target_data()

    migrated: dict[str, int] = {}
    migrated["users"] = await migrate_users(args.source_db)
    migrated["patients"] = await migrate_patients(args.source_db)
    migrated["doctors"] = await migrate_doctors(args.source_db)
    migrated["cases"] = await migrate_cases(args.source_db)
    migrated["messages"] = await migrate_messages(args.source_db)
    migrated["appointments"] = await migrate_appointments(args.source_db)
    migrated["clinical_notes"] = await migrate_clinical_notes(args.source_db)
    report_count, missing_files = await migrate_reports(args.source_db)
    migrated["reports"] = report_count
    migrated["extracted_data"] = await migrate_extracted_data(args.source_db)
    migrated["report_insights"] = await migrate_report_insights(args.source_db)
    migrated["processing_logs"] = await migrate_processing_logs(args.source_db)

    print("MIGRATION_COMPLETE")
    for key, value in migrated.items():
        print(f"{key}={value}")
    print(f"report_files_missing={missing_files}")

    counts = await target_counts()
    print("TARGET_COUNTS")
    for key, value in counts.items():
        print(f"{key}={value}")


if __name__ == "__main__":
    asyncio.run(main())
