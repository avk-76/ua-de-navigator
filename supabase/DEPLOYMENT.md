# UA-DE Navigator cloud activation

Project: `ua-de-navigator`, Frankfurt, `ryqccibdsludqzvfjotz`.
The existing `deutsch-klar` project must remain untouched.

1. Apply `migrations/20261023_navigator_core.sql` and `migrations/20261026_private_documents.sql` in this project's SQL editor. RLS limits profile, state, and anonymized documents to their owner. The source checker writes with the server-side service role.
2. The project's public legacy `anon` key is in `prototype/cloud-config.js`, with `enabled: true`. Never put the service-role key or OpenAI key in a web file.
3. Enable email/password registration, required email confirmation, and Custom SMTP in Authentication. Add `https://avk-76.github.io/ua-de-navigator/auth.html` to redirect URLs. Registration, confirmation, sign-in, recovery, and logout were tested with synthetic accounts on 26 October 2026.
4. Store `OPENAI_API_KEY`, optionally `OPENAI_MODEL` and `NAVIGATOR_RATE_SALT`, as Edge Function secrets. The function is deployed with JWT verification enabled. AI actions require a confirmed user, use the server-side key, and are limited per user per day.
5. The active hourly `pg_cron` job in `schedule.sql` invokes a source check when there has been no check for 72 hours. A visitor also triggers a fresh source check. Its deployed command has no placeholder key.
6. Build `npm run build:ocr` and `npm run build:cloud`, then run `sites/prepare-demo.py` and copy its `sites/dist` output to `docs` for GitHub Pages. The folder name is historical; Sites is no longer a publication target.

Source checks confirm access and changes to official pages, not legal correctness. When a page changes or is unavailable, the AI excludes it and the UI asks for review. OCR uses German language data locally; users must confirm the redacted text before transfer because automatic removal cannot guarantee every name or identifier.
