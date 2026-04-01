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
        
        # Auto-generate password if not provided
        password = payload.password or self._generate_temp_password()
        
        # Generate Patient ID (e.g., P-10045)
        patient_id = await self._generate_patient_id()

        user = User(
            email=payload.email,
            hashed_password=hash_password(password),
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
        await self.db.commit()
        await self.db.refresh(patient, attribute_names=["user"])
        
        # Attach raw password temporarily so it can be returned to the user on creation
        setattr(patient, "_raw_password", password)
        return patient

    def _generate_temp_password(self) -> str:
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for i in range(12))

    async def _generate_patient_id(self) -> str:
        statement = select(Patient.patient_id)
        existing_ids = list((await self.db.scalars(statement)).all())
        highest_numeric = 10000
        for patient_id in existing_ids:
            if not patient_id:
                continue
            try:
                numeric = int(str(patient_id).split("-")[-1])
            except ValueError:
                continue
            highest_numeric = max(highest_numeric, numeric)
        return f"P-{highest_numeric + 1}"

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
            hospital=payload.hospital,
            location=payload.location,
            phone_number=payload.phone_number,
            bio=payload.bio,
        )
        self.db.add(doctor)
        await self.db.commit()
        await self.db.refresh(doctor, attribute_names=["user"])
        return doctor

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
        token = create_access_token(str(user.id), extra_claims={"role": user.role})
        return TokenResponse(access_token=token)

    async def _ensure_unique_email(self, email: str) -> None:
        existing = (await self.db.execute(select(User.id).where(User.email == email))).scalar_one_or_none()
        if existing:
            raise ValidationAppError("An account with this email already exists.")
