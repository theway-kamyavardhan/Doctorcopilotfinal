from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.admin import (
    AdminAIControlEnvelope,
    AdminCaseListItem,
    AdminCaseUpdate,
    AdminDashboardResponse,
    AdminDoctorListItem,
    AdminDoctorPasswordResetResponse,
    AdminDoctorStatusUpdate,
    AdminPatientListItem,
    AdminPatientApiAccessUpdate,
    AdminPipelineResponse,
    AdminReportListItem,
    AdminSystemStatusResponse,
)
from app.schemas.system import AdminAIControlUpdate
from app.schemas.doctor import DoctorCreate, DoctorRead
from app.services.admin import AdminService
from app.services.auth import AuthService
from app.utils.dependencies import get_current_active_role_user

router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminDashboardResponse:
    return await AdminService(db).get_dashboard()


@router.get("/doctors", response_model=list[AdminDoctorListItem])
async def list_admin_doctors(
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AdminDoctorListItem]:
    return await AdminService(db).list_doctors()


@router.post("/doctors", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
async def create_admin_doctor(
    payload: DoctorCreate,
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> DoctorRead:
    return await AuthService(db).register_doctor(payload)


@router.patch("/doctors/{doctor_id}/status", response_model=AdminDoctorListItem)
async def update_admin_doctor_status(
    doctor_id: UUID,
    payload: AdminDoctorStatusUpdate,
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminDoctorListItem:
    return await AdminService(db).set_doctor_active(doctor_id, payload)


@router.post("/doctors/{doctor_id}/reset-password", response_model=AdminDoctorPasswordResetResponse)
async def reset_admin_doctor_password(
    doctor_id: UUID,
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminDoctorPasswordResetResponse:
    return await AdminService(db).reset_doctor_password(doctor_id)


@router.get("/patients", response_model=list[AdminPatientListItem])
async def list_admin_patients(
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AdminPatientListItem]:
    return await AdminService(db).list_patients()


@router.patch("/patients/{patient_id}/ai-access", response_model=AdminPatientListItem)
async def update_admin_patient_ai_access(
    patient_id: UUID,
    payload: AdminPatientApiAccessUpdate,
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminPatientListItem:
    return await AdminService(db).update_patient_api_access(patient_id, payload)


@router.delete("/patients/{patient_id}", response_class=Response, status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_patient(
    patient_id: UUID,
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await AdminService(db).delete_patient(patient_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/cases", response_model=list[AdminCaseListItem])
async def list_admin_cases(
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AdminCaseListItem]:
    return await AdminService(db).list_cases()


@router.patch("/cases/{case_id}", response_model=AdminCaseListItem)
async def update_admin_case(
    case_id: UUID,
    payload: AdminCaseUpdate,
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminCaseListItem:
    return await AdminService(db).update_case(case_id, payload)


@router.get("/reports", response_model=list[AdminReportListItem])
async def list_admin_reports(
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AdminReportListItem]:
    return await AdminService(db).list_reports()


@router.get("/system-status", response_model=AdminSystemStatusResponse)
async def get_admin_system_status(
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminSystemStatusResponse:
    return await AdminService(db).get_system_status()


@router.get("/pipeline", response_model=AdminPipelineResponse)
async def get_admin_pipeline(
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminPipelineResponse:
    return await AdminService(db).get_pipeline()


@router.get("/ai-control", response_model=AdminAIControlEnvelope)
async def get_admin_ai_control(
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminAIControlEnvelope:
    return AdminAIControlEnvelope(control=await AdminService(db).get_ai_control())


@router.patch("/ai-control", response_model=AdminAIControlEnvelope)
async def update_admin_ai_control(
    payload: AdminAIControlUpdate,
    current_user=Depends(get_current_active_role_user("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminAIControlEnvelope:
    return AdminAIControlEnvelope(
        control=await AdminService(db).update_ai_control(
            ai_enabled=payload.ai_enabled,
            enable_password=payload.enable_password,
        )
    )
