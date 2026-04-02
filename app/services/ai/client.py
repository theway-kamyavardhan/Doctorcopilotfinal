import asyncio

import httpx
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.exceptions import ProcessingError
from app.services.ai.prompts import SYSTEM_PROMPT, build_user_prompt
from app.services.ai.schemas import StructuredMedicalReport


class OpenAIExtractionClient:
    async def extract(self, report_text: str, api_key: str | None = None) -> StructuredMedicalReport:
        effective_key = (api_key or settings.openai_api_key or "").strip()
        if not effective_key:
            raise ProcessingError("AI processing is unavailable. No API key is configured for this request.")

        client = AsyncOpenAI(api_key=effective_key, timeout=httpx.Timeout(settings.openai_timeout_seconds))
        last_error: Exception | None = None
        for attempt in range(settings.openai_max_retries + 1):
            try:
                response = await client.responses.parse(
                    model=settings.openai_model,
                    input=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": build_user_prompt(report_text, strict_numeric_retry=attempt > 0)},
                    ],
                    text_format=StructuredMedicalReport,
                )
                parsed = response.output_parsed
                if parsed is None:
                    raise ProcessingError("OpenAI returned no parsed structured output.")
                return parsed
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt >= settings.openai_max_retries:
                    break
                await asyncio.sleep(1.5 * (attempt + 1))
        raise ProcessingError(f"OpenAI structured extraction failed: {last_error}") from last_error
