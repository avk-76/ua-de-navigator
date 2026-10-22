from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from pypdf import PdfReader


@dataclass
class ExtractionResult:
    ok: bool
    text: str
    provider: str
    message: str


class OcrProvider(Protocol):
    name: str

    def extract(self, path: Path, content_type: str) -> ExtractionResult:
        ...


class LocalTextPdfProvider:
    name = "local-text-pdf"

    def extract(self, path: Path, content_type: str) -> ExtractionResult:
        suffix = path.suffix.lower()

        if suffix == ".txt" or content_type.startswith("text/"):
            return ExtractionResult(
                ok=True,
                text=path.read_text(encoding="utf-8", errors="replace"),
                provider=self.name,
                message="Text file extracted locally.",
            )

        if suffix == ".pdf" or content_type == "application/pdf":
            return self._extract_pdf(path)

        if content_type.startswith("image/") or suffix in {".png", ".jpg", ".jpeg", ".webp"}:
            return ExtractionResult(
                ok=False,
                text="",
                provider=self.name,
                message="Image OCR is not connected yet. Plug Google Document AI, Azure Document Intelligence, or another OCR provider here.",
            )

        return ExtractionResult(
            ok=False,
            text="",
            provider=self.name,
            message=f"Unsupported file type: {content_type or suffix}",
        )

    def _extract_pdf(self, path: Path) -> ExtractionResult:
        try:
            reader = PdfReader(str(path))
            pages = []
            for index, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    pages.append(f"--- Page {index} ---\n{page_text.strip()}")
            text = "\n\n".join(pages).strip()
        except Exception as exc:
            return ExtractionResult(
                ok=False,
                text="",
                provider=self.name,
                message=f"PDF extraction failed: {exc}",
            )

        if not text:
            return ExtractionResult(
                ok=False,
                text="",
                provider=self.name,
                message="No text layer found in PDF. Scanned PDFs need an OCR provider.",
            )

        return ExtractionResult(
            ok=True,
            text=text,
            provider=self.name,
            message="PDF text layer extracted locally.",
        )


def get_default_provider() -> OcrProvider:
    return LocalTextPdfProvider()

