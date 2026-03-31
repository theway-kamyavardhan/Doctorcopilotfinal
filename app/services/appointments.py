from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AuthorizationError, NotFoundError, ValidationAppError
from app.models.appointment import Appointment
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentUpdate


class AppointmentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_appointment(self, doctor_user_id, payload: AppointmentCreate) -> AppointmentRead:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        patient = await self.db.get(Patient, payload.patient_id)
        if not patient:
            raise NotFoundError("Patient not found.")

        case = await self._get_case(payload.case_id)
        if case.patient_id != patient.id:
            raise ValidationAppError("Appointment case does not belong to the selected patient.")
        if case.doctor_id and case.doctor_id != doctor.id:
            raise AuthorizationError("Only the assigned doctor can schedule this appointment.")

        if case.doctor_id is None:
            case.doctor_id = doctor.id

        appointment = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            case_id=case.id,
            title=payload.title,
            description=payload.description,
            location=payload.location or doctor.hospital or doctor.location,
            date_time=payload.date_time,
        )
        self.db.add(appointment)
        await self.db.commit()
        appointment = await self._get_appointment(appointment.id)
        return self._serialize_appointment(appointment)

    async def list_patient_appointments(self, patient_user_id) -> list[AppointmentRead]:
        patient = await self._get_patient_by_user_id(patient_user_id)
        statement = (
            select(Appointment)
            .where(Appointment.patient_id == patient.id)
            .options(selectinload(Appointment.doctor).selectinload(Doctor.user), selectinload(Appointment.patient).selectinload(Patient.user))
            .order_by(Appointment.date_time.asc())
        )
        appointments = list((await self.db.scalars(statement)).all())
        return [self._serialize_appointment(item) for item in appointments]

    async def list_doctor_appointments(self, doctor_user_id) -> list[AppointmentRead]:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        statement = (
            select(Appointment)
            .where(Appointment.doctor_id == doctor.id)
            .options(selectinload(Appointment.doctor).selectinload(Doctor.user), selectinload(Appointment.patient).selectinload(Patient.user))
            .order_by(Appointment.date_time.asc())
        )
        appointments = list((await self.db.scalars(statement)).all())
        return [self._serialize_appointment(item) for item in appointments]

    async def update_appointment(self, appointment_id, doctor_user_id, payload: AppointmentUpdate) -> AppointmentRead:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        appointment = await self._get_appointment(appointment_id)
        if appointment.doctor_id != doctor.id:
            raise AuthorizationError("Only the assigned doctor can update this appointment.")

        for field in ["title", "description", "location", "date_time", "status"]:
            value = getattr(payload, field)
            if value is not None:
                setattr(appointment, field, value)

        await self.db.commit()
        appointment = await self._get_appointment(appointment.id)
        return self._serialize_appointment(appointment)

    async def _get_appointment(self, appointment_id) -> Appointment:
        statement = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.doctor).selectinload(Doctor.user), selectinload(Appointment.patient).selectinload(Patient.user))
        )
        appointment = (await self.db.execute(statement)).scalar_one_or_none()
        if not appointment:
            raise NotFoundError("Appointment not found.")
        return appointment

    async def _get_doctor_by_user_id(self, user_id) -> Doctor:
        doctor = (await self.db.execute(select(Doctor).where(Doctor.user_id == user_id).options(selectinload(Doctor.user)))).scalar_one_or_none()
        if not doctor:
            raise NotFoundError("Doctor profile not found.")
        return doctor

    async def _get_patient_by_user_id(self, user_id) -> Patient:
        patient = (await self.db.execute(select(Patient).where(Patient.user_id == user_id).options(selectinload(Patient.user)))).scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient profile not found.")
        return patient

    async def _get_case(self, case_id) -> Case:
        case = await self.db.get(Case, case_id)
        if not case:
            raise NotFoundError("Case not found.")
        return case

    def _serialize_appointment(self, appointment: Appointment) -> AppointmentRead:
        return AppointmentRead.model_validate(
            {
                "id": appointment.id,
                "created_at": appointment.created_at,
                "updated_at": appointment.updated_at,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "case_id": appointment.case_id,
                "title": appointment.title,
                "description": appointment.description,
                "location": appointment.location or appointment.doctor.hospital or appointment.doctor.location,
                "date_time": appointment.date_time,
                "status": appointment.status,
                "doctor_name": appointment.doctor.user.full_name if appointment.doctor and appointment.doctor.user else None,
                "doctor_specialization": appointment.doctor.specialization if appointment.doctor else None,
                "patient_name": appointment.patient.user.full_name if appointment.patient and appointment.patient.user else None,
            }
        )
