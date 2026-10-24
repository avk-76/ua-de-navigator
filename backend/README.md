# Backend Skeleton

Minimal local backend for MVP 0.2.

## What works now

- Serves the prototype at `http://127.0.0.1:8787/prototype/`.
- The browser reads TXT, PDF, and image files locally and asks the visitor to review redacted text before analysis.
- `POST /api/extract` is disabled to avoid uploading raw personal documents.

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

