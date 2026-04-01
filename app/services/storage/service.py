import hashlib
from dataclasses import dataclass
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import quote
from uuid import uuid4

import aiofiles
import httpx
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import NotFoundError, ProcessingError, ValidationAppError


@dataclass
class StoredUpload:
    storage_path: str
    checksum: str
    temp_path: str
    uses_temp_copy: bool


class ReportFileStorage:
    def __init__(self) -> None:
        self.base_dir = Path(settings.upload_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir = self.base_dir / "tmp"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, file: UploadFile) -> StoredUpload:
        content = await file.read()
        stored = await self.save_bytes(
            content=content,
            filename=file.filename or "upload.bin",
            content_type=file.content_type or "application/octet-stream",
        )
        await file.seek(0)
        return stored

    async def save_bytes(
        self,
        *,
        content: bytes,
        filename: str,
        content_type: str = "application/octet-stream",
        object_name: str | None = None,
    ) -> StoredUpload:
        max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
        if not content:
            raise ValidationAppError("Uploaded file is empty.")
        if len(content) > max_size_bytes:
            raise ValidationAppError(f"Upload exceeds {settings.max_upload_size_mb} MB limit.")

        suffix = Path(filename or "upload.bin").suffix
        object_name = object_name or f"{uuid4().hex}{suffix}"
        checksum = hashlib.sha256(content).hexdigest()

        if settings.has_supabase_storage:
            await self._upload_to_supabase(object_name, content, content_type)
            temp_path = await self._write_temp_file(object_name, content)
            return StoredUpload(
                storage_path=object_name,
                checksum=checksum,
                temp_path=temp_path,
                uses_temp_copy=True,
            )

        destination = self.base_dir / object_name
        async with aiofiles.open(destination, "wb") as output:
            await output.write(content)
        return StoredUpload(
            storage_path=str(destination),
            checksum=checksum,
            temp_path=str(destination),
            uses_temp_copy=False,
        )

    async def download_file(self, storage_path: str) -> bytes:
        if settings.has_supabase_storage:
            return await self._download_from_supabase(storage_path)

        file_path = Path(storage_path)
        if not file_path.exists():
            raise NotFoundError("Original uploaded report file was not found.")
        async with aiofiles.open(file_path, "rb") as handle:
            return await handle.read()

    async def delete_file(self, storage_path: str) -> None:
        if not storage_path:
            return
        if settings.has_supabase_storage:
            await self._delete_from_supabase(storage_path)
            return

        file_path = Path(storage_path)
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError:
                pass

    async def cleanup_temp(self, temp_path: str, *, uses_temp_copy: bool) -> None:
        if not uses_temp_copy or not temp_path:
            return
        path = Path(temp_path)
        if path.exists():
            try:
                path.unlink()
            except OSError:
                pass

    async def _write_temp_file(self, object_name: str, content: bytes) -> str:
        suffix = Path(object_name).suffix
        with NamedTemporaryFile(delete=False, suffix=suffix, dir=self.temp_dir) as temp:
            temp.write(content)
            return temp.name

    async def _upload_to_supabase(self, object_name: str, content: bytes, content_type: str) -> None:
        headers = {
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_storage_bucket}/{quote(object_name)}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, content=content)
        if response.status_code >= 400:
            raise ProcessingError(f"Supabase upload failed: {response.text}")

    async def _download_from_supabase(self, storage_path: str) -> bytes:
        headers = {
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
        }
        url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_storage_bucket}/{quote(storage_path)}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
        if response.status_code == 404:
            raise NotFoundError("Original uploaded report file was not found.")
        if response.status_code >= 400:
            raise ProcessingError(f"Supabase download failed: {response.text}")
        return response.content

    async def _delete_from_supabase(self, storage_path: str) -> None:
        headers = {
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": "application/json",
        }
        url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_storage_bucket}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request("DELETE", url, headers=headers, json={"prefixes": [storage_path]})
        if response.status_code not in {200, 204, 404}:
            raise ProcessingError(f"Supabase delete failed: {response.text}")
