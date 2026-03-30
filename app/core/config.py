from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    app_name: str = Field(default="DoctorCopilot Backend", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")
    database_url: str = Field(default="sqlite+aiosqlite:///./doctorcopilot.db", alias="DATABASE_URL")
    secret_key: str = Field(alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=120, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-2024-08-06", alias="OPENAI_MODEL")
    upload_dir: str = Field(default="storage/uploads", alias="UPLOAD_DIR")
    max_upload_size_mb: int = Field(default=25, alias="MAX_UPLOAD_SIZE_MB")
    cors_origins: list[str] = Field(default_factory=list, alias="CORS_ORIGINS")
    openai_timeout_seconds: float = Field(default=45.0, alias="OPENAI_TIMEOUT_SECONDS")
    openai_max_retries: int = Field(default=2, alias="OPENAI_MAX_RETRIES")
    sqlite_fallback_path: str = Field(default="sqlite+aiosqlite:///./doctorcopilot.db", alias="SQLITE_FALLBACK_PATH")
    ocr_timeout_seconds: float = Field(default=90.0, alias="OCR_TIMEOUT_SECONDS")
    min_direct_text_length: int = Field(default=40, alias="MIN_DIRECT_TEXT_LENGTH")
    max_ai_input_chars: int = Field(default=16000, alias="MAX_AI_INPUT_CHARS")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    def validate_required(self) -> None:
        missing = []
        if not self.secret_key:
            missing.append("SECRET_KEY")
        if not self.openai_api_key:
            missing.append("OPENAI_API_KEY")
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
