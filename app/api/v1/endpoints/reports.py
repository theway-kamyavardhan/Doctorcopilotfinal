from uuid import UUID

from io import BytesIO

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.report import DebugProcessReportResponse, ReportProcessingResponse, ReportRead
from app.services.reports import ReportService
from app.utils.dependencies import get_current_active_role_user

router = APIRouter()


@router.post("/upload", response_model=ReportProcessingResponse, status_code=status.HTTP_201_CREATED)
async def upload_report(
    file: UploadFile = File(...),
    case_id: UUID | None = Form(default=None),
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> ReportProcessingResponse:
    return await ReportService(db).upload_and_process_report(current_user, file, case_id)


@router.post("/debug/process-report", response_model=DebugProcessReportResponse)
async def debug_process_report(
    file: UploadFile = File(...),
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> DebugProcessReportResponse:
    return await ReportService(db).debug_process_report(current_user, file)


@router.get("/{report_id}", response_model=ReportRead)
async def get_report(
    report_id: UUID,
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> ReportRead:
    return await ReportService(db).get_report(report_id, current_user)


@router.get("/{report_id}/file")
async def get_report_file(
    report_id: UUID,
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    report, file_path = await ReportService(db).get_report_file(report_id, current_user)
    return FileResponse(
        path=str(file_path),
        media_type=report.mime_type or "application/octet-stream",
        filename=report.file_name,
        headers={"Content-Disposition": f'inline; filename="{report.file_name}"'},
    )


@router.get("/{report_id}/export")
async def export_report_pdf(
    report_id: UUID,
    mode: str = "ai",
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    pdf_bytes, filename = await ReportService(db).export_report_pdf(report_id, current_user, mode)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_report(
    report_id: UUID,
    current_user=Depends(get_current_active_role_user("patient")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await ReportService(db).delete_report(report_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
