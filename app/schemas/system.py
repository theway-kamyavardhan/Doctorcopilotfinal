from pydantic import BaseModel


class AIAccessStatusResponse(BaseModel):
    ai_enabled: bool
    demo_mode: bool
    using_global_key: bool
    session_key_supported: bool = True
    requires_session_key: bool
    demo_account_restricted: bool = False
    message: str


class AdminAIControlResponse(AIAccessStatusResponse):
    updated_at: str | None = None
    global_session_key_supported: bool = True


class AdminAIControlUpdate(BaseModel):
    ai_enabled: bool
    enable_password: str | None = None
