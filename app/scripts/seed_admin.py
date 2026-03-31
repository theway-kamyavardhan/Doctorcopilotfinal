import asyncio
from pathlib import Path

from sqlalchemy import select

from app.core.security import hash_password
from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.schema import ensure_runtime_schema
from app.db.session import AsyncSessionLocal, get_engine, initialize_database
from app.models.enums import UserRole
from app.models.user import User


ADMIN_USER = {
    "admin_code": "ADMIN-001",
    "email": "admin001@doctorcopilot.in",
    "full_name": "DoctorCopilot Admin",
    "password": "demo123",
    "role": UserRole.ADMIN,
}


async def seed_admin() -> None:
    await initialize_database()
    async with get_engine().begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(ensure_runtime_schema)

    async with AsyncSessionLocal() as db:
        existing_user = (
            await db.execute(
                select(User).where(
                    (User.admin_code == ADMIN_USER["admin_code"]) | (User.email == ADMIN_USER["email"])
                )
            )
        ).scalar_one_or_none()

        if existing_user:
            existing_user.admin_code = ADMIN_USER["admin_code"]
            existing_user.email = ADMIN_USER["email"]
            existing_user.full_name = ADMIN_USER["full_name"]
            existing_user.role = ADMIN_USER["role"]
            existing_user.is_active = True
            existing_user.hashed_password = hash_password(ADMIN_USER["password"])
        else:
            db.add(
                User(
                    admin_code=ADMIN_USER["admin_code"],
                    email=ADMIN_USER["email"],
                    full_name=ADMIN_USER["full_name"],
                    hashed_password=hash_password(ADMIN_USER["password"]),
                    role=ADMIN_USER["role"],
                    is_active=True,
                )
            )

        await db.commit()

    credentials_path = Path(__file__).resolve().parents[2] / "admin_credentials.txt"
    credentials_path.write_text(
        f'Admin User | ID: {ADMIN_USER["admin_code"]} | Password: {ADMIN_USER["password"]}\n',
        encoding="utf-8",
    )


if __name__ == "__main__":
    asyncio.run(seed_admin())
