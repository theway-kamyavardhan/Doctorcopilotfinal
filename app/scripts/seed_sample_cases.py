import asyncio
from datetime import date
from pathlib import Path

from sqlalchemy import select

from app.core.security import hash_password
from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.schema import ensure_runtime_schema
from app.db.session import AsyncSessionLocal, get_engine, initialize_database
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.enums import CaseStatus, ReportStatus, SenderType, UserRole
from app.models.message import Message
from app.models.patient import Patient
from app.models.report import Report
from app.models.user import User
from app.scripts.seed_doctors import seed_doctors


PATIENTS = [
    {
        "full_name": "Lakhan Bang",
        "email": "lakhan.demo@doctorcopilot.in",
        "patient_id": "P-20001",
        "password": "demo123",
        "gender": "male",
        "age": 22,
        "blood_group": "O+",
        "phone_number": "9876500001",
        "medical_history": "Vitamin B12 deficiency and intermittent platelet monitoring.",
    },
    {
        "full_name": "Anika Rao",
        "email": "anika.rao.demo@doctorcopilot.in",
        "patient_id": "P-20002",
        "password": "demo123",
        "gender": "female",
        "age": 31,
        "blood_group": "A+",
        "phone_number": "9876500002",
        "medical_history": "Thyroid follow-up and routine lipid monitoring.",
    },
]


CASE_BLUEPRINTS = [
    {
        "title": "Persistent thrombocytopenia review",
        "description": "DoctorCopilot seeded case for platelet decline and vitamin deficiency follow-up.",
        "patient_id": "P-20001",
        "doctor_license": "D-10001",
        "status": CaseStatus.IN_REVIEW,
        "messages": [
            (SenderType.DOCTOR, "I have reviewed your latest platelet and B12 reports. We should discuss symptom progression."),
            (SenderType.PATIENT, "Fatigue is ongoing and I have noticed occasional bruising."),
        ],
        "reports": [
            {
                "file_name": "lakhan_cbc_2024.pdf",
                "report_type": "Complete Blood Count",
                "report_category": "blood",
                "lab_name": "SRL Diagnostics",
                "patient_name": "Lakhan Bang",
                "doctor_name": "Dr. Aarav Sharma",
                "report_date": "2024-08-14",
                "summary": "Platelets remained low with mild B12 deficiency.",
                "parameters": [
                    {"name": "platelets", "value": 134000, "unit": "/µL", "status": "low"},
                    {"name": "vitamin_b12", "value": 189, "unit": "pg/mL", "status": "low"},
                ],
            },
            {
                "file_name": "lakhan_cbc_2026.pdf",
                "report_type": "CBC + Vitamin Profile",
                "report_category": "blood",
                "lab_name": "Metropolis Labs",
                "patient_name": "Lakhan Bang",
                "doctor_name": "Dr. Aarav Sharma",
                "report_date": "2026-03-29",
                "summary": "Persistent low platelets and B12 deficiency still present.",
                "parameters": [
                    {"name": "platelets", "value": 118000, "unit": "/µL", "status": "low"},
                    {"name": "vitamin_b12", "value": 176, "unit": "pg/mL", "status": "low"},
                ],
            },
        ],
    },
    {
        "title": "Thyroid and lipid consultation",
        "description": "Seeded case for thyroid stability review and long-term monitoring.",
        "patient_id": "P-20002",
        "doctor_license": "D-10006",
        "status": CaseStatus.OPEN,
        "messages": [
            (SenderType.DOCTOR, "Your thyroid markers are more stable now. I want to review the medication schedule with you."),
        ],
        "reports": [
            {
                "file_name": "anika_thyroid_2026.pdf",
                "report_type": "Thyroid Profile",
                "report_category": "thyroid",
                "lab_name": "Apex Diagnostics",
                "patient_name": "Anika Rao",
                "doctor_name": "Dr. Ananya Sen",
                "report_date": "2026-02-18",
                "summary": "TSH improving, lipid profile remains borderline.",
                "parameters": [
                    {"name": "tsh", "value": 4.6, "unit": "µIU/mL", "status": "high"},
                    {"name": "ldl", "value": 136, "unit": "mg/dL", "status": "high"},
                ],
            }
        ],
    },
]


def seed_upload_path(file_name: str) -> str:
    uploads_dir = Path(__file__).resolve().parents[2] / "uploads" / "seed"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    file_path = uploads_dir / file_name
    if not file_path.exists():
        file_path.write_text("Seeded clinical report placeholder.", encoding="utf-8")
    return str(file_path)


async def upsert_patient(db, payload: dict) -> Patient:
    user = (await db.execute(select(User).where(User.email == payload["email"]))).scalar_one_or_none()
    if user:
        user.full_name = payload["full_name"]
        user.role = UserRole.PATIENT
        user.hashed_password = hash_password(payload["password"])
    else:
        user = User(
            email=payload["email"],
            hashed_password=hash_password(payload["password"]),
            full_name=payload["full_name"],
            role=UserRole.PATIENT,
        )
        db.add(user)
        await db.flush()

    patient = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
    if patient:
        patient.patient_id = payload["patient_id"]
        patient.gender = payload["gender"]
        patient.age = payload["age"]
        patient.blood_group = payload["blood_group"]
        patient.phone_number = payload["phone_number"]
        patient.medical_history = payload["medical_history"]
    else:
        patient = Patient(
            user_id=user.id,
            patient_id=payload["patient_id"],
            gender=payload["gender"],
            age=payload["age"],
            blood_group=payload["blood_group"],
            phone_number=payload["phone_number"],
            medical_history=payload["medical_history"],
        )
        db.add(patient)
        await db.flush()

    return patient


async def seed_case_bundle(db, bundle: dict, doctors_by_license: dict[str, Doctor], patients_by_code: dict[str, Patient]) -> None:
    patient = patients_by_code[bundle["patient_id"]]
    doctor = doctors_by_license[bundle["doctor_license"]]

    existing_case = (
        await db.execute(
            select(Case).where(
                Case.patient_id == patient.id,
                Case.doctor_id == doctor.id,
                Case.title == bundle["title"],
            )
        )
    ).scalar_one_or_none()

    if existing_case:
        existing_case.description = bundle["description"]
        existing_case.status = bundle["status"]
        case = existing_case
    else:
        case = Case(
            patient_id=patient.id,
            doctor_id=doctor.id,
            title=bundle["title"],
            description=bundle["description"],
            status=bundle["status"],
        )
        db.add(case)
        await db.flush()

    existing_messages = list((await db.scalars(select(Message).where(Message.case_id == case.id))).all())
    if not existing_messages:
        for sender_type, content in bundle["messages"]:
            sender_user_id = doctor.user_id if sender_type == SenderType.DOCTOR else patient.user_id
            db.add(
                Message(
                    case_id=case.id,
                    sender_user_id=sender_user_id,
                    sender_type=sender_type,
                    content=content,
                    message_type="text",
                )
            )

    existing_reports = list((await db.scalars(select(Report).where(Report.case_id == case.id))).all())
    existing_report_names = {report.file_name for report in existing_reports}
    for report_payload in bundle["reports"]:
        if report_payload["file_name"] in existing_report_names:
            continue
        db.add(
            Report(
                patient_id=patient.id,
                case_id=case.id,
                file_name=report_payload["file_name"],
                file_path=seed_upload_path(report_payload["file_name"]),
                mime_type="application/pdf",
                checksum=None,
                report_type=report_payload["report_type"],
                report_category=report_payload["report_category"],
                report_keywords=[],
                report_metadata={
                    "patient": {"full_name": report_payload["patient_name"]},
                    "lab": {"lab_name": report_payload["lab_name"]},
                    "doctor": {"doctor_name": report_payload["doctor_name"]},
                },
                parameters=report_payload["parameters"],
                patient_name=report_payload["patient_name"],
                lab_name=report_payload["lab_name"],
                doctor_name=report_payload["doctor_name"],
                report_date=date.fromisoformat(report_payload["report_date"]),
                raw_text=f"Seeded report for {report_payload['patient_name']}",
                summary=report_payload["summary"],
                status=ReportStatus.PROCESSED,
            )
        )


async def seed_sample_cases() -> None:
    await initialize_database()
    async with get_engine().begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(ensure_runtime_schema)

    await seed_doctors()

    patient_credentials_lines = []

    async with AsyncSessionLocal() as db:
        seeded_patients = []
        for payload in PATIENTS:
            patient = await upsert_patient(db, payload)
            seeded_patients.append(patient)
            patient_credentials_lines.append(
                f'{payload["full_name"]} | ID: {payload["patient_id"]} | Email: {payload["email"]} | Password: {payload["password"]}'
            )

        await db.flush()

        doctors = list((await db.scalars(select(Doctor))).all())
        doctors_by_license = {doctor.license_number: doctor for doctor in doctors}
        patients_by_code = {patient.patient_id: patient for patient in seeded_patients}

        for bundle in CASE_BLUEPRINTS:
            await seed_case_bundle(db, bundle, doctors_by_license, patients_by_code)

        await db.commit()

    guide_dir = Path(__file__).resolve().parents[2] / "guide"
    guide_dir.mkdir(parents=True, exist_ok=True)
    credentials_path = guide_dir / "sample_patient_credentials.txt"
    credentials_path.write_text("\n".join(patient_credentials_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(seed_sample_cases())
