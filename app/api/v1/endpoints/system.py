from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.enums import UserRole
from app.models.patient import Patient
from app.schemas.system import AIAccessStatusResponse
from app.services.ai_control import AIControlService
from app.utils.dependencies import get_current_active_role_user

router = APIRouter()


@router.get("/ai-access", response_model=AIAccessStatusResponse)
async def get_ai_access_status(
    session_openai_key: str | None = Header(default=None, alias="X-Session-OpenAI-Key"),
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> AIAccessStatusResponse:
    patient_id = None
    if current_user.role == UserRole.PATIENT:
        patient = (await db.execute(select(Patient).where(Patient.user_id == current_user.id))).scalar_one_or_none()
        patient_id = patient.patient_id if patient else None
    return await AIControlService(db).get_status(session_api_key=session_openai_key, patient_id=patient_id)
