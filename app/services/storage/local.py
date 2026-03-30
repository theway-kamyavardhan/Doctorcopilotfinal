import hashlib
from pathlib import Path
from uuid import uuid4

import aiofiles
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import ValidationAppError


class LocalFileStorage:
    def __init__(self) -> None:
        self.base_dir = Path(settings.upload_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, file: UploadFile) -> tuple[str, str]:
        content = await file.read()
        max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
        if not content:
            raise ValidationAppError("Uploaded file is empty.")
        if len(content) > max_size_bytes:
            raise ValidationAppError(f"Upload exceeds {settings.max_upload_size_mb} MB limit.")

        suffix = Path(file.filename or "upload.bin").suffix
        destination = self.base_dir / f"{uuid4().hex}{suffix}"
        async with aiofiles.open(destination, "wb") as output:
            await output.write(content)
        checksum = hashlib.sha256(content).hexdigest()
        await file.seek(0)
        return str(destination), checksum
