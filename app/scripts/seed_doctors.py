import asyncio
from pathlib import Path

from sqlalchemy import select

from app.db import models  # noqa: F401
from app.db.session import AsyncSessionLocal
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.user import User
from app.core.security import hash_password


DOCTORS = [
    {
        "full_name": "Dr. Aarav Sharma",
        "specialization": "General Physician",
        "hospital": "AIIMS Delhi",
        "location": "Delhi",
        "phone_number": "9810001001",
        "email": "aarav.sharma@doctorcopilot.in",
        "license_number": "D-10001",
        "password": "demo123",
        "bio": "General physician focused on preventive and chronic care.",
    },
    {
        "full_name": "Dr. Isha Mehta",
        "specialization": "Cardiologist",
        "hospital": "Fortis Escorts Heart Institute",
        "location": "Delhi",
        "phone_number": "9810001002",
        "email": "isha.mehta@doctorcopilot.in",
        "license_number": "D-10002",
        "password": "demo123",
        "bio": "Cardiology consultant with interest in preventive heart health.",
    },
    {
        "full_name": "Dr. Rohan Kulkarni",
        "specialization": "Neurologist",
        "hospital": "Kokilaben Dhirubhai Ambani Hospital",
        "location": "Mumbai",
        "phone_number": "9810001003",
        "email": "rohan.kulkarni@doctorcopilot.in",
        "license_number": "D-10003",
        "password": "demo123",
        "bio": "Neurology specialist for headache, seizure, and stroke follow-up.",
    },
    {
        "full_name": "Dr. Naina Verma",
        "specialization": "Dermatologist",
        "hospital": "Apollo Hospitals",
        "location": "Hyderabad",
        "phone_number": "9810001004",
        "email": "naina.verma@doctorcopilot.in",
        "license_number": "D-10004",
        "password": "demo123",
        "bio": "Dermatology consultant focused on inflammatory skin disorders.",
    },
    {
        "full_name": "Dr. Vikram Rao",
        "specialization": "Orthopedic",
        "hospital": "Manipal Hospitals",
        "location": "Bengaluru",
        "phone_number": "9810001005",
        "email": "vikram.rao@doctorcopilot.in",
        "license_number": "D-10005",
        "password": "demo123",
        "bio": "Orthopedic surgeon specializing in joint and spine care.",
    },
    {
        "full_name": "Dr. Ananya Sen",
        "specialization": "Endocrinologist",
        "hospital": "Medica Superspecialty Hospital",
        "location": "Kolkata",
        "phone_number": "9810001006",
        "email": "ananya.sen@doctorcopilot.in",
        "license_number": "D-10006",
        "password": "demo123",
        "bio": "Endocrinology specialist for thyroid, diabetes, and metabolic care.",
    },
]


async def seed_doctors() -> None:
    credentials_lines: list[str] = []
    async with AsyncSessionLocal() as db:
        for doctor_data in DOCTORS:
            existing_user = (
                await db.execute(select(User).where(User.email == doctor_data["email"]))
            ).scalar_one_or_none()

            if existing_user:
                existing_doctor = (
                    await db.execute(select(Doctor).where(Doctor.user_id == existing_user.id))
                ).scalar_one_or_none()
                existing_user.full_name = doctor_data["full_name"]
                existing_user.role = UserRole.DOCTOR
                existing_user.hashed_password = hash_password(doctor_data["password"])
                if existing_doctor:
                    existing_doctor.specialization = doctor_data["specialization"]
                    existing_doctor.hospital = doctor_data["hospital"]
                    existing_doctor.location = doctor_data["location"]
                    existing_doctor.phone_number = doctor_data["phone_number"]
                    existing_doctor.bio = doctor_data["bio"]
                    existing_doctor.license_number = doctor_data["license_number"]
                else:
                    db.add(
                        Doctor(
                            user_id=existing_user.id,
                            license_number=doctor_data["license_number"],
                            specialization=doctor_data["specialization"],
                            hospital=doctor_data["hospital"],
                            location=doctor_data["location"],
                            phone_number=doctor_data["phone_number"],
                            bio=doctor_data["bio"],
                        )
                    )
            else:
                user = User(
                    email=doctor_data["email"],
                    hashed_password=hash_password(doctor_data["password"]),
                    full_name=doctor_data["full_name"],
                    role=UserRole.DOCTOR,
                )
                db.add(
                    Doctor(
                        user=user,
                        license_number=doctor_data["license_number"],
                        specialization=doctor_data["specialization"],
                        hospital=doctor_data["hospital"],
                        location=doctor_data["location"],
                        phone_number=doctor_data["phone_number"],
                        bio=doctor_data["bio"],
                    )
                )

            credentials_lines.append(
                f'{doctor_data["full_name"]} | {doctor_data["specialization"]} | ID: {doctor_data["license_number"]} | Password: {doctor_data["password"]}'
            )

        await db.commit()

    guide_dir = Path(__file__).resolve().parents[2] / "guide"
    guide_dir.mkdir(parents=True, exist_ok=True)
    credentials_path = guide_dir / "doctors_credentials.txt"
    credentials_path.write_text("\n".join(credentials_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(seed_doctors())
