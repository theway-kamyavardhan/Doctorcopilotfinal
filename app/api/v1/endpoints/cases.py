from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi import WebSocketException
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal, get_db
from app.models.user import User
from app.schemas.case import CaseCreate, CaseRead, CaseStatusUpdate, CaseTransferRequest
from app.schemas.message import MessageCreate, MessageRead
from app.schemas.note import ClinicalNoteCreate, ClinicalNoteRead
from app.services.cases import CaseService
from app.utils.dependencies import get_current_active_role_user
from app.websockets.manager import connection_manager
from app.core.security import decode_token

router = APIRouter()


@router.post("", response_model=CaseRead)
async def create_case(
    payload: CaseCreate,
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> CaseRead:
    return await CaseService(db).create_case(current_user, payload)


@router.get("", response_model=list[CaseRead])
async def list_cases(current_user=Depends(get_current_active_role_user()), db: AsyncSession = Depends(get_db)) -> list[CaseRead]:
    return await CaseService(db).list_cases_for_user(current_user)


@router.get("/{case_id}", response_model=CaseRead)
async def get_case(
    case_id: UUID,
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> CaseRead:
    return await CaseService(db).get_case_for_user(case_id, current_user)


@router.patch("/{case_id}/status", response_model=CaseRead)
async def update_case_status(
    case_id: UUID,
    payload: CaseStatusUpdate,
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> CaseRead:
    return await CaseService(db).update_status(case_id, current_user.id, payload)


@router.patch("/{case_id}/transfer", response_model=CaseRead)
async def transfer_case(
    case_id: UUID,
    payload: CaseTransferRequest,
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> CaseRead:
    return await CaseService(db).transfer_case(case_id, current_user.id, payload)


@router.post("/{case_id}/notes", response_model=ClinicalNoteRead)
async def add_case_note(
    case_id: UUID,
    payload: ClinicalNoteCreate,
    current_user=Depends(get_current_active_role_user("doctor")),
    db: AsyncSession = Depends(get_db),
) -> ClinicalNoteRead:
    return await CaseService(db).add_note(case_id, current_user.id, payload)


@router.post("/{case_id}/messages", response_model=MessageRead)
async def create_case_message(
    case_id: UUID,
    payload: MessageCreate,
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> MessageRead:
    message = await CaseService(db).create_message(case_id, current_user, payload)
    await connection_manager.broadcast_case_message(case_id, message)
    return message


@router.get("/{case_id}/messages", response_model=list[MessageRead])
async def list_case_messages(
    case_id: UUID,
    current_user=Depends(get_current_active_role_user()),
    db: AsyncSession = Depends(get_db),
) -> list[MessageRead]:
    return await CaseService(db).list_messages_for_user(case_id, current_user)


@router.websocket("/ws/{case_id}")
async def case_chat(case_id: UUID, websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    user = None
    async with AsyncSessionLocal() as db:
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            user = (await db.execute(select(User).where(User.id == UUID(user_id)))).scalar_one_or_none()
            if not user:
                raise WebSocketException(code=4401, reason="Invalid user.")
            case_service = CaseService(db)
            await case_service.ensure_case_membership(case_id, user)
            await connection_manager.connect(case_id, websocket, user.id)

            while True:
                incoming_text = await websocket.receive_text()
                payload = MessageCreate(content=incoming_text)
                message = await case_service.create_message(case_id, user, payload)
                await connection_manager.broadcast_case_message(case_id, message)
        except (JWTError, ValueError, WebSocketDisconnect, WebSocketException):
            connection_manager.disconnect(case_id, user.id if user else "unknown")
            try:
                await websocket.close()
            except RuntimeError:
                pass
