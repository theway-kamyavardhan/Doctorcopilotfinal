from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

settings.validate_required()

engine = create_async_engine(settings.database_url, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(expire_on_commit=False, autoflush=False)
AsyncSessionLocal.configure(bind=engine)


async def initialize_database() -> str:
    global engine

    try:
        async with engine.begin() as connection:
            await connection.execute(text("SELECT 1"))
        return str(engine.url)
    except Exception:
        await engine.dispose()
        engine = create_async_engine(settings.sqlite_fallback_path, echo=False, future=True)
        AsyncSessionLocal.configure(bind=engine)
        async with engine.begin() as connection:
            await connection.execute(text("SELECT 1"))
        return str(engine.url)


def get_engine():
    return engine


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
