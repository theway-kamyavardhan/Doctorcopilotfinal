from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AuthorizationError, NotFoundError
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.enums import CaseStatus, SenderType, UserRole
from app.models.message import Message
from app.models.note import ClinicalNote
from app.models.patient import Patient
from app.models.report import Report
from app.models.user import User
from app.schemas.case import (
    CaseDecisionRequest,
    CaseClinicalNoteSummary,
    CaseCreate,
    CaseReportAccessDecision,
    CaseReferralRequest,
    CaseDoctorSummary,
    CasePatientSummary,
    CaseRead,
    CaseReportSummary,
    CaseStatusUpdate,
    CaseTransferRequest,
)
from app.schemas.message import MessageCreate
from app.schemas.note import ClinicalNoteCreate


class CaseService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_case(self, current_user: User, payload: CaseCreate) -> CaseRead:
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
                request_origin="doctor_initiated",
                status=CaseStatus.OPEN,
            )
        elif current_user.role == UserRole.PATIENT:
            patient = await self._get_patient_by_user_id(current_user.id)
            selected_doctor = None
            if payload.doctor_id:
                selected_doctor = await self.db.get(Doctor, payload.doctor_id)
                if not selected_doctor:
                    raise NotFoundError("Selected doctor not found.")
            case = Case(
                patient_id=patient.id,
                doctor_id=selected_doctor.id if selected_doctor else None,
                title=payload.title or "Consultation Request",
                description=payload.description or "Patient requested a consultation.",
                request_origin="patient",
                status=CaseStatus.PENDING,
            )
        else:
            raise AuthorizationError("Only doctors and patients can create cases.")
        self.db.add(case)
        await self.db.commit()
        if current_user.role == UserRole.DOCTOR:
            await self._create_case_message(
                case_id=case.id,
                sender_user_id=current_user.id,
                sender_type=SenderType.DOCTOR,
                content=f"{doctor.user.full_name} started a consultation and invited you to connect in chat.",
                message_type="consultation_started",
            )
        return await self._get_case_read(case.id)

    async def list_cases_for_user(self, user: User) -> list[CaseRead]:
        if user.role == UserRole.DOCTOR:
            doctor = await self._get_doctor_by_user_id(user.id)
            statement = select(Case).where(Case.doctor_id == doctor.id)
        elif user.role == UserRole.PATIENT:
            patient = await self._get_patient_by_user_id(user.id)
            statement = select(Case).where(Case.patient_id == patient.id)
        else:
            statement = select(Case)
        statement = statement.options(*self._case_detail_options()).order_by(Case.created_at.desc())
        cases = list((await self.db.scalars(statement)).all())
        return [self._serialize_case(case) for case in cases]

    async def get_case_for_user(self, case_id: UUID, user: User) -> CaseRead:
        case = await self._get_case(case_id)
        await self.ensure_case_membership(case_id, user)
        return await self._get_case_read(case_id)

    async def update_status(self, case_id: UUID, doctor_user_id, payload: CaseStatusUpdate) -> CaseRead:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        case = await self._get_case(case_id)

        if case.doctor_id is None:
            if case.status != CaseStatus.PENDING or payload.status not in {CaseStatus.OPEN, CaseStatus.IN_REVIEW}:
                raise AuthorizationError("Pending consultation requests can only be accepted into an open or in-review state.")
            case.doctor_id = doctor.id
        elif case.doctor_id != doctor.id:
            raise AuthorizationError("Only the assigned doctor can update case status.")

        if case.status == CaseStatus.PENDING and payload.status in {CaseStatus.OPEN, CaseStatus.IN_REVIEW}:
            case.status = payload.status
            case.closing_note = None
            case.closed_by_doctor_id = None
            case.closed_at = None
            await self.db.commit()
            await self._create_case_message(
                case_id=case.id,
                sender_user_id=doctor.user_id,
                sender_type=SenderType.DOCTOR,
                content=f"{doctor.user.full_name} accepted your consultation request. You can now continue in chat.",
                message_type="accept_notice",
            )
            return await self._get_case_read(case.id)

        if payload.status == CaseStatus.CLOSED:
            closing_note = (payload.closing_note or "").strip()
            if not closing_note:
                raise AuthorizationError("A clinical closing summary is required before closing the case.")
            case.closing_note = closing_note
            case.closed_by_doctor_id = doctor.id
            case.closed_at = datetime.now(UTC)
            case.status = payload.status
            await self.db.commit()
            return await self._get_case_read(case.id)

        raise AuthorizationError("Accepted consultation cases can only be closed by the assigned doctor.")

    async def cancel_case(self, case_id: UUID, patient_user_id, payload: CaseDecisionRequest | None = None) -> CaseRead:
        patient = await self._get_patient_by_user_id(patient_user_id)
        case = await self._get_case(case_id)
        if case.patient_id != patient.id:
            raise AuthorizationError("Only the patient can cancel this consultation request.")
        if case.status != CaseStatus.PENDING:
            raise AuthorizationError("Only pending consultation requests can be cancelled.")
        note = (payload.note if payload else None) or "Consultation request cancelled by patient."
        case.status = CaseStatus.CLOSED
        case.closing_note = note.strip()
        case.closed_by_doctor_id = None
        case.closed_at = datetime.now(UTC)
        await self.db.commit()
        return await self._get_case_read(case.id)

    async def reject_case(self, case_id: UUID, doctor_user_id, payload: CaseDecisionRequest | None = None) -> CaseRead:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        case = await self._get_case(case_id)
        if case.doctor_id != doctor.id:
            raise AuthorizationError("Only the selected doctor can reject this consultation request.")
        if case.status != CaseStatus.PENDING:
            raise AuthorizationError("Only pending consultation requests can be rejected.")
        note = (payload.note if payload else None) or "Consultation request declined by doctor."
        case.status = CaseStatus.CLOSED
        case.closing_note = note.strip()
        case.closed_by_doctor_id = doctor.id
        case.closed_at = datetime.now(UTC)
        await self.db.commit()
        return await self._get_case_read(case.id)

    async def delete_case(self, case_id: UUID, doctor_user_id) -> None:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        case = await self._get_case(case_id)
        if case.doctor_id != doctor.id:
            raise AuthorizationError("Only the assigned doctor can delete this case.")
        if case.status not in {CaseStatus.CLOSED, CaseStatus.TRANSFERRED}:
            raise AuthorizationError("Only archived cases can be deleted.")
        await self.db.delete(case)
        await self.db.commit()

    async def transfer_case(self, case_id: UUID, doctor_user_id, payload: CaseTransferRequest) -> CaseRead:
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
        return await self._get_case_read(case.id)

    async def refer_case(self, case_id: UUID, doctor_user_id, payload: CaseReferralRequest) -> CaseRead:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        case = await self._get_case(case_id)
        if case.doctor_id != doctor.id:
            raise AuthorizationError("Only the assigned doctor can refer this case.")
        next_doctor = await self.db.get(Doctor, payload.doctor_id)
        if not next_doctor:
            raise NotFoundError("Target doctor not found.")
        if next_doctor.id == doctor.id:
            raise AuthorizationError("Please choose a different doctor for referral.")

        referral_note = (payload.note or "").strip()
        previous_status = case.status.value if hasattr(case.status, "value") else str(case.status)
        case.doctor_id = next_doctor.id
        case.status = CaseStatus.PENDING
        case.request_origin = "doctor_referral"
        case.referred_by_doctor_id = doctor.id
        case.referral_note = referral_note or f"Referred by {doctor.user.full_name} for specialist review."
        case.description = (
            f"Specialist referral from {doctor.user.full_name} ({doctor.specialization}). "
            f"Previous status: {previous_status}. "
            f"{case.referral_note}"
        ).strip()
        await self.db.commit()
        return await self._get_case_read(case.id)

    async def request_report_access(self, case_id: UUID, doctor_user_id) -> Message:
        doctor = await self._get_doctor_by_user_id(doctor_user_id)
        case = await self._get_case(case_id)
        if case.doctor_id != doctor.id:
            raise AuthorizationError("Only the assigned doctor can request report access.")
        case.report_access_status = "requested"
        case.report_access_requested_at = datetime.now(UTC)
        case.report_access_updated_at = case.report_access_requested_at
        case.report_access_requested_by_doctor_id = doctor.id
        await self.db.commit()
        return await self._create_case_message(
            case_id=case.id,
            sender_user_id=doctor.user_id,
            sender_type=SenderType.DOCTOR,
            content=f"{doctor.user.full_name} is requesting permission to access your reports for this consultation.",
            message_type="report_access_request",
        )

    async def respond_report_access(self, case_id: UUID, patient_user_id, payload: CaseReportAccessDecision) -> Message:
        patient = await self._get_patient_by_user_id(patient_user_id)
        case = await self._get_case(case_id)
        if case.patient_id != patient.id:
            raise AuthorizationError("Only the patient can respond to this access request.")
        if case.report_access_status != "requested":
            raise AuthorizationError("There is no active report access request to answer.")

        decision = (payload.decision or "").strip().lower()
        if decision not in {"granted", "denied"}:
            raise AuthorizationError("Decision must be either granted or denied.")

        case.report_access_status = decision
        case.report_access_updated_at = datetime.now(UTC)
        await self.db.commit()

        content = (
            "Patient granted report access. Doctor may now review the reports."
            if decision == "granted"
            else "Patient denied report access. The case is now waiting until the doctor sends another request."
        )
        return await self._create_case_message(
            case_id=case.id,
            sender_user_id=patient.user_id,
            sender_type=SenderType.PATIENT,
            content=content,
            message_type="report_access_response",
        )

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

    async def _create_case_message(
        self,
        case_id: UUID,
        sender_user_id,
        sender_type: SenderType,
        content: str,
        message_type: str = "text",
    ) -> Message:
        message = Message(
            case_id=case_id,
            sender_user_id=sender_user_id,
            sender_type=sender_type,
            content=content,
            message_type=message_type,
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

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

    async def _get_case_read(self, case_id: UUID) -> CaseRead:
        statement = (
            select(Case)
            .where(Case.id == case_id)
            .options(*self._case_detail_options())
        )
        case = (await self.db.execute(statement)).scalar_one_or_none()
        if not case:
            raise NotFoundError("Case not found.")
        return self._serialize_case(case)

    def _case_detail_options(self):
        return [
            selectinload(Case.patient).selectinload(Patient.user),
            selectinload(Case.doctor).selectinload(Doctor.user),
            selectinload(Case.referred_by_doctor).selectinload(Doctor.user),
            selectinload(Case.report_access_requested_by_doctor).selectinload(Doctor.user),
            selectinload(Case.reports).selectinload(Report.insights),
            selectinload(Case.messages),
            selectinload(Case.clinical_notes).selectinload(ClinicalNote.doctor).selectinload(Doctor.user),
        ]

    def _serialize_case(self, case: Case) -> CaseRead:
        patient_summary = None
        if case.patient and case.patient.user:
            patient_summary = CasePatientSummary(
                id=case.patient.id,
                patient_id=case.patient.patient_id,
                full_name=case.patient.user.full_name,
                age=case.patient.age,
                gender=case.patient.gender,
                blood_group=case.patient.blood_group,
                phone_number=case.patient.phone_number,
            )

        doctor_summary = None
        if case.doctor and case.doctor.user:
            doctor_summary = CaseDoctorSummary(
                id=case.doctor.id,
                full_name=case.doctor.user.full_name,
                license_number=case.doctor.license_number,
                specialization=case.doctor.specialization,
                hospital=case.doctor.hospital,
                location=case.doctor.location,
                phone_number=case.doctor.phone_number,
            )

        ordered_messages = sorted(case.messages or [], key=lambda item: item.created_at)
        latest_message = ordered_messages[-1] if ordered_messages else None
        ordered_reports = sorted(
            case.reports or [],
            key=lambda report: (
                report.report_date.isoformat() if report.report_date else "",
                report.created_at.isoformat(),
            ),
            reverse=True,
        )
        notes = sorted(case.clinical_notes or [], key=lambda item: item.created_at, reverse=True)

        return CaseRead(
            id=case.id,
            created_at=case.created_at,
            updated_at=case.updated_at,
            patient_id=case.patient_id,
            doctor_id=case.doctor_id,
            title=case.title,
            description=case.description,
            request_origin=case.request_origin or "patient",
            referral_note=case.referral_note,
            referred_by_doctor_id=case.referred_by_doctor_id,
            referred_by_doctor_name=case.referred_by_doctor.user.full_name if case.referred_by_doctor and case.referred_by_doctor.user else None,
            report_access_status=case.report_access_status or "not_requested",
            report_access_requested_at=case.report_access_requested_at.isoformat() if case.report_access_requested_at else None,
            report_access_updated_at=case.report_access_updated_at.isoformat() if case.report_access_updated_at else None,
            report_access_requested_by_doctor_id=case.report_access_requested_by_doctor_id,
            report_access_requested_by_doctor_name=case.report_access_requested_by_doctor.user.full_name if case.report_access_requested_by_doctor and case.report_access_requested_by_doctor.user else None,
            status=case.status,
            patient_name=patient_summary.full_name if patient_summary else None,
            doctor_name=doctor_summary.full_name if doctor_summary else None,
            latest_message_at=latest_message.created_at.isoformat() if latest_message else None,
            latest_message_preview=latest_message.content if latest_message else None,
            report_count=len(ordered_reports),
            message_count=len(ordered_messages),
            closing_note=case.closing_note,
            closed_by_doctor_id=case.closed_by_doctor_id,
            closed_at=case.closed_at.isoformat() if case.closed_at else None,
            patient=patient_summary,
            doctor=doctor_summary,
            reports=[
                CaseReportSummary(
                    id=report.id,
                    report_date=report.report_date.isoformat() if report.report_date else None,
                    report_type=report.report_type,
                    report_category=report.report_category,
                    lab_name=report.lab_name,
                    summary=report.summary,
                    parameters=report.parameters or [],
                    insights=[insight.description for insight in (report.insights or []) if insight.description],
                    raw_text=report.raw_text,
                    status=report.status,
                )
                for report in ordered_reports
            ],
            notes=[
                CaseClinicalNoteSummary(
                    id=note.id,
                    created_at=note.created_at,
                    updated_at=note.updated_at,
                    case_id=note.case_id,
                    doctor_id=note.doctor_id,
                    doctor_name=note.doctor.user.full_name if note.doctor and note.doctor.user else None,
                    note=note.note,
                )
                for note in notes
            ],
        )

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
