from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User


async def ensure_admin_seed(session: AsyncSession) -> User:
    statement = select(User).where(
        or_(
            User.admin_code == settings.admin_seed_code,
            User.email == settings.admin_seed_email,
        )
    )
    admin = (await session.execute(statement)).scalar_one_or_none()
    if admin is None:
        admin = User(
            admin_code=settings.admin_seed_code,
            email=settings.admin_seed_email,
            full_name=settings.admin_seed_full_name,
            hashed_password=hash_password(settings.admin_seed_password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin)
    else:
        if not admin.admin_code:
            admin.admin_code = settings.admin_seed_code
        if not admin.role:
            admin.role = UserRole.ADMIN
        if not admin.hashed_password:
            admin.hashed_password = hash_password(settings.admin_seed_password)
        admin.is_active = True

    await session.commit()
    await session.refresh(admin)
    return admin
