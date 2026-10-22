# Backend Skeleton

Minimal local backend for MVP 0.2.

## What works now

- Serves the prototype at `http://127.0.0.1:8787/prototype/`.
- Accepts uploads at `POST /api/extract`.
- Extracts text from `.txt`.
- Extracts text layer from PDFs.
- Returns a clear message for photos/scans because image OCR provider is not connected yet.

## Start

```powershell
& 'C:\Users\avk-7\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' backend/server.py
```

Open:

```text
http://127.0.0.1:8787/prototype/
```

## OCR provider contract

`backend/ocr_providers.py` exposes a replaceable provider:

```python
class OcrProvider(Protocol):
    name: str
    def extract(self, path: Path, content_type: str) -> ExtractionResult:
        ...
```

Next providers can implement:

- Google Document AI
- Azure Document Intelligence
- OCR.space
- Tesseract

