from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.api.v1.endpoints.cases import case_chat
from app.core.config import settings
from app.core.exceptions import AppException
from app.db.base import Base
from app.db import models as db_models  # noqa: F401
from app.db.schema import ensure_runtime_schema
from app.db import session as db_session


@asynccontextmanager
async def lifespan(_: FastAPI):
    db_url = await db_session.initialize_database()
    async with db_session.get_engine().begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(ensure_runtime_schema)
    app.state.database_url = db_url
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev (later restrict)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "database_url": getattr(app.state, "database_url", "unknown")}


app.websocket("/ws/{case_id}")(case_chat)


@app.exception_handler(AppException)
async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})
