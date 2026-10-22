# UA-DE Navigator

Existing UA-DE Navigator prototype with three entry points: a personal route, a German letter, and a question. The interface supports Russian, Ukrainian, German, and English.

## View online

- [Interactive synthetic demo](https://avk-76.github.io/ua-de-navigator/)
- [Site deployment](https://ua-de-navigator-demo.ak-bimmer.chatgpt.site/)

The online demo runs in the browser with invented cases. It has no account, persistent storage, server-side document processing, OCR, or live AI. Edits reset on reload. Do not enter real personal documents.

## Run locally

From this repository:

```powershell
python backend/server.py
```

Open `http://127.0.0.1:8787/prototype/`. The local server stores SQLite data and uploads on the local machine. Keep those files out of public repositories.

## Verify

```powershell
python -m unittest backend/test_case_engine.py -v
python backend/test_http_case_flow.py
node sites/verify-demo.mjs
```

The public demo source is in `docs/`. It is generated from `prototype/` by `sites/prepare-demo.py` using invented fixtures. `backend/` contains the local server, rules, storage, and tests.

## Current limits

Document extraction supports text files and text-layer PDFs; scanned PDFs and photos need OCR. The rule-based document reading proposes dates and required attachments for human confirmation. Official links are entry points and should be checked against the current authority page. This prototype does not provide legal advice or send replies to authorities.
