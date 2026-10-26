# UA-DE Navigator

Existing UA-DE Navigator prototype with three entry points: a personal route, a German letter, and a question. The interface supports Russian, Ukrainian, German, and English.

## View online

- [GitHub Pages test version](https://avk-76.github.io/ua-de-navigator/)

The test version uses Supabase email confirmation and per-user storage. OCR for German image letters and scanned PDFs runs in the browser; visitors review redacted text before sending it to the server-side AI function. Automatic redaction can miss identifiers, so review the preview carefully before using real letters.

## Run locally

From this repository:

```powershell
python backend/server.py
```

Open `http://127.0.0.1:8787/prototype/`. The local server stores SQLite case data on the local machine. Files are read in the browser; the raw upload endpoint is disabled. Keep local data out of public repositories.

To rebuild browser OCR and the Supabase client before preparing a static release:

```powershell
npm ci
npm run build:ocr
npm run build:cloud
python sites/prepare-demo.py
```

The separate cloud project's setup is documented in [supabase/DEPLOYMENT.md](supabase/DEPLOYMENT.md).

## Verify

```powershell
python -m unittest backend/test_case_engine.py -v
python backend/test_http_case_flow.py
node sites/verify-demo.mjs
```

The GitHub Pages source is in `docs/`. It is generated from `prototype/` by `sites/prepare-demo.py` using invented fixtures for unsigned visitors. Signed-in client data is stored separately in Supabase. `backend/` contains the local server, rules, storage, and tests.

## Current limits

Automatic redaction can miss personal identifiers, so the visitor must review the text before transfer. The rule-based local document reading proposes dates and required attachments for human confirmation. An online source check confirms availability and detects page changes; it cannot itself validate legal meaning. This navigator does not provide legal advice or send replies to authorities.
