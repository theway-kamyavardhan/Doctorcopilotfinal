from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import CaseStatus, ProcessingStatus, ProcessingStep, ReportStatus
from app.schemas.common import TimestampedResponse
from app.schemas.system import AdminAIControlResponse


class AdminDoctorStatusUpdate(BaseModel):
    is_active: bool


class AdminDoctorPasswordResetResponse(BaseModel):
    doctor_id: UUID
    temporary_password: str


class AdminCaseUpdate(BaseModel):
    doctor_id: UUID | None = None
    status: CaseStatus | None = None


class AdminDashboardResponse(BaseModel):
    total_patients: int
    total_doctors: int
    active_cases: int
    reports_processed: int
    system_health: str
    backend_status: str
    frontend_status: str
    ai_processing_state: str
    pipeline_success_rate: float
    abnormal_reports: int


class AdminDoctorListItem(TimestampedResponse):
    license_number: str
    specialization: str
    hospital: str | None = None
    location: str | None = None
    phone_number: str | None = None
    full_name: str
    email: str
    is_active: bool


class AdminPatientListItem(TimestampedResponse):
    patient_id: str
    full_name: str
    email: str
    gender: str | None = None
    age: int | None = None
    blood_group: str | None = None
    phone_number: str | None = None
    report_count: int = 0
    active_case_count: int = 0
    personal_api_key_enabled: bool = True


class AdminPatientApiAccessUpdate(BaseModel):
    personal_api_key_enabled: bool


class AdminCaseListItem(TimestampedResponse):
    patient_id: UUID
    doctor_id: UUID | None = None
    title: str
    description: str | None = None
    status: CaseStatus
    patient_name: str
    doctor_name: str | None = None


class AdminReportListItem(TimestampedResponse):
    patient_id: UUID
    case_id: UUID | None = None
    file_name: str
    report_type: str | None = None
    report_category: str | None = None
    patient_name: str | None = None
    lab_name: str | None = None
    summary: str | None = None
    report_date: date | None = None
    status: ReportStatus
    confidence: float | None = None
    latest_error: str | None = None
    debug_endpoint: str = "/api/v1/debug/process-report"


class AdminPipelineLogItem(TimestampedResponse):
    report_id: UUID
    report_file_name: str | None = None
    step: ProcessingStep
    status: ProcessingStatus
    detail: str | None = None
    error_message: str | None = None


class AdminEvaluationResult(BaseModel):
    report_id: UUID
    file_name: str
    confidence: float | None = None
    processed_at: datetime


class AdminSystemStatusResponse(BaseModel):
    backend_status: str
    database_status: str
    ai_engine_state: str
    ai_enabled: bool = True
    api_latency_ms: float | None = None
    last_errors: list[str] = Field(default_factory=list)


class AdminAIControlEnvelope(BaseModel):
    control: AdminAIControlResponse


class AdminPipelineResponse(BaseModel):
    reports_in_processing: int
    success_logs: int
    failure_logs: int
    evaluation_results: list[AdminEvaluationResult] = Field(default_factory=list)
    recent_logs: list[AdminPipelineLogItem] = Field(default_factory=list)
