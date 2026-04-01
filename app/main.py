from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.endpoints.cases import case_chat
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.debug_logger import append_debug_event
from app.core.exceptions import AppException, AuthenticationError, AuthorizationError, NotFoundError, ProcessingError, ValidationAppError
from app.db import models as db_models  # noqa: F401
from app.db import session as db_session
from app.db.base import Base
from app.db.schema import ensure_runtime_schema
from app.db.session import AsyncSessionLocal
from app.services.bootstrap import ensure_admin_seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        db_url = await db_session.initialize_database()
        async with db_session.get_engine().begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await connection.run_sync(ensure_runtime_schema)
        async with AsyncSessionLocal() as session:
            await ensure_admin_seed(session)
        app.state.database_url = db_url
        yield
    except Exception as exc:
        append_debug_event("startup", f"Backend startup failed: {exc}")
        raise


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


app.websocket("/ws/{case_id}")(case_chat)
app.websocket("/ws/cases/{case_id}")(case_chat)


@app.exception_handler(AppException)
async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    append_debug_event("app_exception", f"{exc.__class__.__name__}: {exc}")
    status_code = status.HTTP_400_BAD_REQUEST
    if isinstance(exc, AuthenticationError):
        status_code = status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, AuthorizationError):
        status_code = status.HTTP_403_FORBIDDEN
    elif isinstance(exc, NotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, ValidationAppError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    elif isinstance(exc, ProcessingError):
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    return JSONResponse(status_code=status_code, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    append_debug_event("unhandled_exception", repr(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."}
    )
