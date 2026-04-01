from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import CaseStatus
from app.schemas.common import TimestampedResponse
from app.models.enums import ReportStatus


class CaseCreate(BaseModel):
    patient_id: UUID | None = None
    doctor_id: UUID | None = None
    title: str | None = None
    description: str | None = None
    type: str = "consultation_request"


class CaseStatusUpdate(BaseModel):
    status: CaseStatus
    closing_note: str | None = None


class CaseTransferRequest(BaseModel):
    doctor_id: UUID


class CaseDecisionRequest(BaseModel):
    note: str | None = None


class CaseReferralRequest(BaseModel):
    doctor_id: UUID
    note: str | None = None


class CaseReportAccessDecision(BaseModel):
    decision: str


class CasePatientSummary(BaseModel):
    id: UUID
    patient_id: str
    full_name: str
    age: int | None = None
    gender: str | None = None
    blood_group: str | None = None
    phone_number: str | None = None


class CaseDoctorSummary(BaseModel):
    id: UUID
    full_name: str
    license_number: str
    specialization: str
    hospital: str | None = None
    location: str | None = None
    phone_number: str | None = None


class CaseReportSummary(BaseModel):
    id: UUID
    report_date: str | None = None
    report_type: str | None = None
    report_category: str | None = None
    lab_name: str | None = None
    summary: str | None = None
    parameters: list[dict[str, Any]] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)
    raw_text: str | None = None
    status: ReportStatus


class CaseClinicalNoteSummary(TimestampedResponse):
    case_id: UUID
    doctor_id: UUID
    doctor_name: str | None = None
    note: str


class CaseRead(TimestampedResponse):
    patient_id: UUID
    doctor_id: UUID | None
    title: str
    description: str | None
    request_origin: str = "patient"
    referral_note: str | None = None
    referred_by_doctor_id: UUID | None = None
    referred_by_doctor_name: str | None = None
    report_access_status: str = "not_requested"
    report_access_requested_at: str | None = None
    report_access_updated_at: str | None = None
    report_access_requested_by_doctor_id: UUID | None = None
    report_access_requested_by_doctor_name: str | None = None
    status: CaseStatus
    patient_name: str | None = None
    doctor_name: str | None = None
    latest_message_at: str | None = None
    latest_message_preview: str | None = None
    report_count: int = 0
    message_count: int = 0
    closing_note: str | None = None
    closed_by_doctor_id: UUID | None = None
    closed_at: str | None = None
    patient: CasePatientSummary | None = None
    doctor: CaseDoctorSummary | None = None
    reports: list[CaseReportSummary] = Field(default_factory=list)
    notes: list[CaseClinicalNoteSummary] = Field(default_factory=list)
