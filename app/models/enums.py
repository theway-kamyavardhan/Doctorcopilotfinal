from enum import StrEnum


class UserRole(StrEnum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class CaseStatus(StrEnum):
    PENDING = "pending"
    OPEN = "open"
    IN_REVIEW = "in_review"
    CLOSED = "closed"
    TRANSFERRED = "transferred"


class AppointmentStatus(StrEnum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ReportStatus(StrEnum):
    UPLOADED = "uploaded"
    OCR_COMPLETE = "ocr_complete"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class SenderType(StrEnum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    SYSTEM = "system"


class ProcessingStep(StrEnum):
    UPLOAD = "upload"
    OCR = "ocr"
    METADATA_EXTRACTION = "metadata_extraction"
    AI_PROCESSING = "ai_processing"
    PARSING = "parsing"
    NORMALIZATION = "normalization"
    STORAGE = "storage"


class ProcessingStatus(StrEnum):
    STARTED = "started"
    SUCCESS = "success"
    FAILED = "failed"
