# UA-DE Navigator

Existing UA-DE Navigator prototype with three entry points: a personal route, a German letter, and a question. The interface supports Russian, Ukrainian, German, and English.

## Working and release flow

GitHub is the source of truth. Edit the source in `prototype/`, commit and push the change, and test the published browser journey with invented data. The public GitHub Pages test version uses the generated `docs/` folder; a source-only push does not update that site. Supabase functions and database migrations need separate deployment and verification. Create a separate backup when requested. A short handoff for future chats is in [ROUTE_HANDOFF.md](ROUTE_HANDOFF.md).

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

## Local review before publication

Prepare a browser-only preview with invented data and cloud calls disabled:

```powershell
& 'C:\Users\avk-7\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' sites/prepare-demo.py --offline
node tools/dev-server.mjs
```

Open `http://127.0.0.1:8765/sites/dist/index.html`. This preview includes the personal route, family action cards, local image/PDF OCR, and synthetic case flows. It does not have live AI, confirmed email accounts, or durable per-user storage. The route is deterministic guidance and does not calculate benefit amounts. Use only invented data in this preview. The configured cloud AI and account flows require the deployed, allowed origin and remain a separate integration check before publication.

## Current limits

Automatic redaction can miss personal identifiers, so the visitor must review the text before transfer. The rule-based local document reading proposes dates and required attachments for human confirmation. An online source check confirms availability and detects page changes; it cannot itself validate legal meaning. This navigator does not provide legal advice or send replies to authorities.
