from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError
from app.models.app_setting import AppSetting
from app.models.patient import Patient
from app.schemas.system import AIAccessStatusResponse, AdminAIControlResponse


AI_CONTROL_KEY = "ai_control"
DEMO_PATIENT_ID = "P-10005"


class AIControlService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_record(self) -> AppSetting:
        record = (await self.db.execute(select(AppSetting).where(AppSetting.key == AI_CONTROL_KEY))).scalar_one_or_none()
        if record is None:
            record = AppSetting(
                key=AI_CONTROL_KEY,
                value={
                    "ai_enabled": True,
                    "updated_at": datetime.utcnow().isoformat(),
                },
            )
            self.db.add(record)
            await self.db.commit()
            await self.db.refresh(record)
        return record

    async def _get_patient_session_key_support(self, patient_id: str | None) -> bool:
        if not patient_id:
            return True
        patient = (await self.db.execute(select(Patient.personal_api_key_enabled).where(Patient.patient_id == patient_id))).scalar_one_or_none()
        if patient is None:
            return True
        return bool(patient)

    async def get_status(self, session_api_key: str | None = None, patient_id: str | None = None) -> AIAccessStatusResponse:
        record = await self.get_record()
        ai_enabled = bool((record.value or {}).get("ai_enabled", True))
        has_global_key = bool(settings.openai_api_key)
        has_session_key = bool(session_api_key and session_api_key.strip())
        patient_session_key_supported = await self._get_patient_session_key_support(patient_id)
        session_key_supported = patient_session_key_supported and patient_id != DEMO_PATIENT_ID
        demo_mode = (not ai_enabled) and not has_session_key
        requires_session_key = (not ai_enabled) and not has_session_key and session_key_supported
        demo_account_restricted = patient_id == DEMO_PATIENT_ID

        if demo_account_restricted:
            message = "This is the shared demo profile. To use your own API key and personal reports securely, create your own patient profile first."
        elif not session_key_supported:
            message = "Personal API key usage is disabled for this patient account by admin. Contact admin or use the platform AI when it is enabled."
        elif ai_enabled and has_global_key:
            message = "AI processing is enabled with the platform key."
        elif ai_enabled and not has_global_key:
            message = "AI processing is enabled, but no platform key is configured. Provide a session API key to process new reports."
            requires_session_key = True
            demo_mode = True
        elif has_session_key:
            message = "Platform AI is in demo mode. Your session key will be used for AI processing in this session."
        else:
            message = "This project is currently running in demo mode. To process new reports, provide your own API key for this session."

        return AIAccessStatusResponse(
            ai_enabled=ai_enabled,
            demo_mode=demo_mode,
            using_global_key=ai_enabled and has_global_key,
            session_key_supported=session_key_supported,
            requires_session_key=requires_session_key,
            demo_account_restricted=demo_account_restricted,
            message=message,
        )

    async def get_admin_status(self) -> AdminAIControlResponse:
        record = await self.get_record()
        status = await self.get_status()
        return AdminAIControlResponse(
            **status.model_dump(),
            updated_at=(record.value or {}).get("updated_at"),
            global_session_key_supported=True,
        )

    async def set_enabled(self, ai_enabled: bool, enable_password: str | None = None) -> AdminAIControlResponse:
        record = await self.get_record()
        current_enabled = bool((record.value or {}).get("ai_enabled", True))
        if ai_enabled and not current_enabled:
            if (enable_password or "").strip() != settings.ai_toggle_password:
                raise AuthenticationError("Admin password required to re-enable platform AI.")

        record.value = {
            **(record.value or {}),
            "ai_enabled": bool(ai_enabled),
            "updated_at": datetime.utcnow().isoformat(),
        }
        await self.db.commit()
        await self.db.refresh(record)
        return await self.get_admin_status()

    async def assert_processing_allowed(self, session_api_key: str | None = None, patient_id: str | None = None) -> str | None:
        patient_session_key_supported = await self._get_patient_session_key_support(patient_id)

        if patient_id == DEMO_PATIENT_ID and session_api_key and session_api_key.strip():
            raise AuthenticationError(
                "Demo account P-10005 cannot use a personal API key. Create your own profile first, then add your key for that session."
            )
        if not patient_session_key_supported and session_api_key and session_api_key.strip():
            raise AuthenticationError(
                "Personal API key usage is disabled for this patient account by admin."
            )

        status = await self.get_status(session_api_key=session_api_key, patient_id=patient_id)
        if status.requires_session_key and not session_api_key:
            raise AuthenticationError(status.message)

        if session_api_key and session_api_key.strip():
            return session_api_key.strip()
        return settings.openai_api_key or None
