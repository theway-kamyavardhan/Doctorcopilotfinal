from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.evaluation import EvaluationReportResponse
from app.schemas.report import DebugProcessReportResponse
from app.services.evaluation.service import AccuracyEvaluationService, parse_ai_output_json
from app.services.reports import ReportService
from app.utils.dependencies import get_current_active_role_user

router = APIRouter()


@router.post("/process-report", response_model=DebugProcessReportResponse)
async def process_report_debug(
    file: UploadFile = File(...),
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> DebugProcessReportResponse:
    return await ReportService(db).debug_process_report(current_user, file)


@router.post("/evaluate-report", response_model=EvaluationReportResponse)
async def evaluate_report_debug(
    file: UploadFile | None = File(default=None),
    raw_text: str | None = Form(default=None),
    ai_output: str | None = Form(default=None),
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> EvaluationReportResponse:
    service = AccuracyEvaluationService(db)
    if file is not None:
        return await service.evaluate_from_file(current_user, file)
    if raw_text and ai_output:
        return service.evaluate(raw_text, parse_ai_output_json(ai_output))
    raise ValueError("Provide either a file or both raw_text and ai_output.")
