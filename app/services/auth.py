from sqlalchemy import select
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
        user = User(
            email=payload.email,
            hashed_password=hash_password(payload.password),
            full_name=payload.full_name,
            role=UserRole.PATIENT,
        )
        patient = Patient(
            user=user,
            gender=payload.gender,
            birth_date=payload.birth_date,
            phone_number=payload.phone_number,
            emergency_contact=payload.emergency_contact,
            medical_history=payload.medical_history,
        )
        self.db.add(patient)
        await self.db.commit()
        await self.db.refresh(patient, attribute_names=["user"])
        return patient

    async def register_doctor(self, payload: DoctorCreate) -> Doctor:
        await self._ensure_unique_email(payload.email)
        user = User(
            email=payload.email,
            hashed_password=hash_password(payload.password),
            full_name=payload.full_name,
            role=UserRole.DOCTOR,
        )
        doctor = Doctor(
            user=user,
            license_number=payload.license_number,
            specialization=payload.specialization,
            bio=payload.bio,
        )
        self.db.add(doctor)
        await self.db.commit()
        await self.db.refresh(doctor, attribute_names=["user"])
        return doctor

    async def login(self, payload: LoginRequest) -> TokenResponse:
        statement = select(User).where(User.email == payload.email)
        user = (await self.db.execute(statement)).scalar_one_or_none()
        if not user or not verify_password(payload.password, user.hashed_password):
            raise AuthenticationError("Invalid credentials.")
        token = create_access_token(str(user.id), extra_claims={"role": user.role})
        return TokenResponse(access_token=token)

    async def _ensure_unique_email(self, email: str) -> None:
        existing = (await self.db.execute(select(User.id).where(User.email == email))).scalar_one_or_none()
        if existing:
            raise ValidationAppError("An account with this email already exists.")
