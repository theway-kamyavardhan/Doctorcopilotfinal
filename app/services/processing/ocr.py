import asyncio
from dataclasses import dataclass
from pathlib import Path

import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from pypdf import PdfReader

from app.core.config import settings
from app.core.exceptions import ProcessingError


@dataclass
class ExtractionResult:
    text: str
    method: str
    fallback_used: bool
    page_count: int


class TextExtractionEngine:
    async def extract(self, file_path: str, mime_type: str) -> ExtractionResult:
        path = Path(file_path)
        if mime_type == "application/pdf" or path.suffix.lower() == ".pdf":
            return await asyncio.wait_for(asyncio.to_thread(self._extract_pdf, path), timeout=settings.ocr_timeout_seconds)
        if mime_type.startswith("image/"):
            return await asyncio.wait_for(asyncio.to_thread(self._extract_image, path), timeout=settings.ocr_timeout_seconds)
        raise ProcessingError(f"Unsupported report type for OCR: {mime_type}")

    def _extract_pdf(self, path: Path) -> ExtractionResult:
        direct_text = self._extract_pdf_text(path)
        if len(direct_text.strip()) >= settings.min_direct_text_length:
            return ExtractionResult(
                text=direct_text,
                method="direct_pdf_text",
                fallback_used=False,
                page_count=max(1, direct_text.count("\n\n") + 1),
            )

        ocr_text, page_count = self._ocr_pdf(path)
        if not ocr_text:
            raise ProcessingError("PDF text extraction and OCR both failed to produce usable text.")
        return ExtractionResult(text=ocr_text, method="ocr_pdf", fallback_used=True, page_count=page_count)

    def _extract_image(self, path: Path) -> ExtractionResult:
        text = self._ocr_image_file(path)
        if not text:
            raise ProcessingError("No text could be extracted from the image.")
        return ExtractionResult(text=text, method="ocr_image", fallback_used=False, page_count=1)

    def _extract_pdf_text(self, path: Path) -> str:
        reader = PdfReader(str(path))
        pypdf_text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        if len(pypdf_text) >= settings.min_direct_text_length:
            return pypdf_text

        with pdfplumber.open(str(path)) as pdf:
            plumber_text = "\n".join((page.extract_text() or "") for page in pdf.pages).strip()
        return plumber_text or pypdf_text

    def _ocr_pdf(self, path: Path) -> tuple[str, int]:
        try:
            images = convert_from_path(str(path))
        except Exception:
            try:
                import pypdfium2 as pdfium

                pdf = pdfium.PdfDocument(str(path))
                images = []
                for index in range(len(pdf)):
                    page = pdf[index]
                    bitmap = page.render(scale=2).to_pil()
                    images.append(bitmap)
            except Exception as exc:  # noqa: BLE001
                raise ProcessingError(f"PDF OCR conversion failed: {exc}") from exc

        page_text = [self._ocr_pil_image(image) for image in images]
        combined_text = "\n".join(text for text in page_text if text).strip()
        return combined_text, len(images)

    def _ocr_image_file(self, path: Path) -> str:
        try:
            image = Image.open(path)
        except Exception as exc:  # noqa: BLE001
            raise ProcessingError(f"Image OCR failed while opening the file: {exc}") from exc
        return self._ocr_pil_image(image)

    def _ocr_pil_image(self, image: Image.Image) -> str:
        try:
            grayscale = image.convert("L")
            text = pytesseract.image_to_string(grayscale).strip()
        except Exception as exc:  # noqa: BLE001
            raise ProcessingError(f"OCR failed. Ensure Tesseract is installed and reachable: {exc}") from exc
        return text
