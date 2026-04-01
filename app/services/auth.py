import re

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, ValidationAppError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.doctor import DoctorCreate
from app.schemas.patient import PatientCreate


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register_patient(self, payload: PatientCreate) -> Patient:
        await self._ensure_unique_email(payload.email)

        for _ in range(3):
            patient_id = await self._generate_patient_id()
            user = User(
                email=payload.email,
                hashed_password=hash_password(payload.password),
                full_name=payload.full_name,
                role=UserRole.PATIENT,
            )
            patient = Patient(
                user=user,
                patient_id=patient_id,
                gender=payload.gender,
                age=payload.age,
                birth_date=payload.birth_date,
                blood_group=payload.blood_group,
                phone_number=payload.phone_number,
                emergency_contact=payload.emergency_contact,
                medical_history=payload.medical_history,
            )
            self.db.add(patient)
            try:
                await self.db.commit()
                await self.db.refresh(patient, attribute_names=["user"])
                setattr(patient, "_raw_password", payload.password)
                return patient
            except IntegrityError:
                await self.db.rollback()
                continue

        raise ValidationAppError("Failed to generate a unique patient identifier.")

    async def _generate_patient_id(self) -> str:
        numeric = await self._next_numeric_identifier(Patient.patient_id, "P-")
        return f"P-{numeric:05d}"

    async def register_doctor(self, payload: DoctorCreate) -> Doctor:
        await self._ensure_unique_email(payload.email)
        for _ in range(3):
            doctor_id = await self._generate_doctor_id()
            user = User(
                email=payload.email,
                hashed_password=hash_password(payload.password),
                full_name=payload.full_name,
                role=UserRole.DOCTOR,
            )
            doctor = Doctor(
                user=user,
                license_number=doctor_id,
                specialization=payload.specialization,
                hospital=payload.hospital,
                location=payload.location,
                phone_number=payload.phone_number,
                bio=payload.bio,
            )
            self.db.add(doctor)
            try:
                await self.db.commit()
                await self.db.refresh(doctor, attribute_names=["user"])
                return doctor
            except IntegrityError:
                await self.db.rollback()
                continue

        raise ValidationAppError("Failed to generate a unique doctor identifier.")

    async def _generate_doctor_id(self) -> str:
        numeric = await self._next_numeric_identifier(Doctor.license_number, "D-")
        return f"D-{numeric:05d}"

    async def login(self, payload: LoginRequest) -> TokenResponse:
        identifier = payload.identifier.strip()

        # Check if the identifier is a Patient ID (e.g., starts with P-)
        if identifier.upper().startswith("P-"):
            statement = select(User).join(Patient).where(Patient.patient_id == identifier.upper())
        elif identifier.upper().startswith("D-"):
            statement = select(User).join(Doctor).where(Doctor.license_number == identifier.upper())
        elif identifier.upper().startswith("ADMIN-"):
            statement = select(User).where(
                User.admin_code == identifier.upper(),
                User.role == UserRole.ADMIN,
            )
        else:
            statement = select(User).where(User.email == identifier)
            
        user = (await self.db.execute(statement)).scalar_one_or_none()
        if not user or not verify_password(payload.password, user.hashed_password):
            raise AuthenticationError("Invalid credentials.")
        public_id = await self._resolve_public_user_id(user)
        token = create_access_token(str(user.id), extra_claims={"role": user.role, "user_id": public_id})
        return TokenResponse(access_token=token, user_id=public_id, role=user.role)

    async def _ensure_unique_email(self, email: str) -> None:
        existing = (await self.db.execute(select(User.id).where(User.email == email))).scalar_one_or_none()
        if existing:
            raise ValidationAppError("An account with this email already exists.")

    async def _next_numeric_identifier(self, column, prefix: str) -> int:
        existing_ids = list((await self.db.scalars(select(column).where(column.like(f"{prefix}%")))).all())
        highest_numeric = 10000
        for public_id in existing_ids:
            if not public_id:
                continue
            text = str(public_id).strip()
            if not re.fullmatch(rf"{re.escape(prefix)}\d{{5}}", text):
                continue
            numeric = int(text.split("-")[-1])
            highest_numeric = max(highest_numeric, numeric)
        return highest_numeric + 1

    async def _resolve_public_user_id(self, user: User) -> str:
        if user.role == UserRole.PATIENT:
            patient_id = (await self.db.execute(select(Patient.patient_id).where(Patient.user_id == user.id))).scalar_one_or_none()
            if patient_id:
                return patient_id
        elif user.role == UserRole.DOCTOR:
            doctor_id = (await self.db.execute(select(Doctor.license_number).where(Doctor.user_id == user.id))).scalar_one_or_none()
            if doctor_id:
                return doctor_id
        elif user.role == UserRole.ADMIN:
            return user.admin_code or "ADMIN-001"
        return user.email
