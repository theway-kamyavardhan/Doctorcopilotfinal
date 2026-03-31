from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, NotFoundError
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.enums import CaseStatus, SenderType, UserRole
from app.models.message import Message
from app.models.note import ClinicalNote
from app.models.patient import Patient
from app.models.user import User
from app.schemas.case import CaseCreate, CaseStatusUpdate, CaseTransferRequest
from app.schemas.message import MessageCreate
from app.schemas.note import ClinicalNoteCreate


class CaseService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_case(self, current_user: User, payload: CaseCreate) -> Case:
        if current_user.role == UserRole.DOCTOR:
            doctor = await self._get_doctor_by_user_id(current_user.id)
            if not payload.patient_id:
                raise NotFoundError("Patient not found.")
            patient = await self.db.get(Patient, payload.patient_id)
            if not patient:
                raise NotFoundError("Patient not found.")
            case = Case(
                patient_id=patient.id,
                doctor_id=doctor.id,
                title=payload.title or "Consultation Case",
                description=payload.description,
                status=CaseStatus.OPEN,
            )
        elif current_user.role == UserRole.PATIENT:
            patient = await self._get_patient_by_user_id(current_user.id)
            case = Case(
                patient_id=patient.id,
                doctor_id=None,
                title=payload.title or "Consultation Request",
                description=payload.description or "Patient requested a consultation.",
                status=CaseStatus.PENDING,
            )
        else:
            raise AuthorizationError("Only doctors and patients can create cases.")
        self.db.add(case)
        await self.db.commit()
        await self.db.refresh(case)
        return case

    async def list_cases_for_user(self, user: User) -> list[Case]:
        if user.role == UserRole.DOCTOR:
            doctor = await self._get_doctor_by_user_id(user.id)
            statement = select(Case).where(Case.doctor_id == doctor.id)
        elif user.role == UserRole.PATIENT:
            patient = await self._get_patient_by_user_id(user.id)
            statement = select(Case).where(Case.patient_id == patient.id)
        else:
            statement = select(Case)
        statement = statement.order_by(Case.created_at.desc())
        return list((await self.db.scalars(statement)).all())

    async def get_case_for_user(self, case_id: UUID, user: User) -> Case:
        case = await self._get_case(case_id)
        await self.ensure_case_membership(case_id, user)
        return case

    async def update_status(self, case_id: UUID, doctor_user_id, payload: CaseStatusUpdate) -> Case:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        case = await self._get_case(case_id)
        if case.doctor_id != doctor.id:
            raise AuthorizationError("Only the assigned doctor can update case status.")
        case.status = payload.status
        await self.db.commit()
        await self.db.refresh(case)
        return case

    async def transfer_case(self, case_id: UUID, doctor_user_id, payload: CaseTransferRequest) -> Case:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        case = await self._get_case(case_id)
        if case.doctor_id != doctor.id:
            raise AuthorizationError("Only the assigned doctor can transfer a case.")
        next_doctor = await self.db.get(Doctor, payload.doctor_id)
        if not next_doctor:
            raise NotFoundError("Target doctor not found.")
        case.doctor_id = next_doctor.id
        case.status = CaseStatus.TRANSFERRED
        await self.db.commit()
        await self.db.refresh(case)
        return case

    async def add_note(self, case_id: UUID, doctor_user_id, payload: ClinicalNoteCreate) -> ClinicalNote:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        case = await self._get_case(case_id)
        if case.doctor_id != doctor.id:
            raise AuthorizationError("Only the assigned doctor can add notes.")
        note = ClinicalNote(case_id=case.id, doctor_id=doctor.id, note=payload.note)
        self.db.add(note)
        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def create_message(self, case_id: UUID, user: User, payload: MessageCreate) -> Message:
        case = await self._get_case(case_id)
        await self.ensure_case_membership(case_id, user)
        sender_type = SenderType.DOCTOR if user.role == UserRole.DOCTOR else SenderType.PATIENT
        if sender_type == SenderType.PATIENT:
            doctor_message = await self.db.scalar(
                select(Message.id).where(Message.case_id == case.id, Message.sender_type == SenderType.DOCTOR).limit(1)
            )
            if not doctor_message:
                raise AuthorizationError("Waiting for doctor to start consultation.")
        message = Message(case_id=case.id, sender_user_id=user.id, sender_type=sender_type, content=payload.content, message_type=payload.message_type)
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def list_messages_for_user(self, case_id: UUID, user: User) -> list[Message]:
        await self.ensure_case_membership(case_id, user)
        statement = select(Message).where(Message.case_id == case_id).order_by(Message.created_at.asc())
        return list((await self.db.scalars(statement)).all())

    async def ensure_case_membership(self, case_id: UUID, user: User) -> None:
        case = await self._get_case(case_id)
        if user.role == UserRole.DOCTOR:
            doctor = await self._get_doctor_by_user_id(user.id)
            allowed = case.doctor_id == doctor.id
        elif user.role == UserRole.PATIENT:
            patient = await self._get_patient_by_user_id(user.id)
            allowed = case.patient_id == patient.id
        else:
            allowed = True
        if not allowed:
            raise AuthorizationError("User is not allowed to access this case.")

    async def _get_case(self, case_id: UUID) -> Case:
        case = await self.db.get(Case, case_id)
        if not case:
            raise NotFoundError("Case not found.")
        return case

    async def _get_doctor_by_user_id(self, user_id) -> Doctor:
        doctor = (await self.db.execute(select(Doctor).where(Doctor.user_id == user_id))).scalar_one_or_none()
        if not doctor:
            raise NotFoundError("Doctor profile not found.")
        return doctor

    async def _get_patient_by_user_id(self, user_id) -> Patient:
        patient = (await self.db.execute(select(Patient).where(Patient.user_id == user_id))).scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient profile not found.")
        return patient
