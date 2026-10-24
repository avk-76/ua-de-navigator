# UA-DE Navigator cloud activation

Project: `ua-de-navigator`, Frankfurt, `ryqccibdsludqzvfjotz`.
The existing `deutsch-klar` project must remain untouched.

1. Apply `migrations/20261023_navigator_core.sql` in this project's SQL editor. These tables use RLS; clients can read and update only their own profile and state. The source checker writes with the server-side service role.
2. The project's public legacy `anon` key is already in `prototype/cloud-config.js`. Keep `enabled: false` until the mail sender and AI key are configured and tested. Never put the service-role key or OpenAI key in a web file.
3. In Authentication, enable email sign-in and configure a custom SMTP sender. Supabase's default mail sender is limited to authorized team addresses, so it cannot serve real registrations. For Gmail SMTP, use a dedicated mailbox and an app password entered directly in the Supabase dashboard. Set the site URL to the published navigator and add both `https://avk-76.github.io/ua-de-navigator/auth.html` and `https://ua-de-navigator-demo.ak-bimmer.chatgpt.site/auth.html` to redirect URLs.
4. Store `OPENAI_API_KEY`, optionally `OPENAI_MODEL` and `NAVIGATOR_RATE_SALT`, as Edge Function secrets. The function is deployed with legacy JWT verification enabled and accepts the project's public anon JWT. It validates the allowed website origin, applies a daily IP hash limit, and never returns secret values.
5. The hourly `pg_cron` job in `schedule.sql` invokes a source check when there has been no check for 72 hours. Replace its placeholder with the project's public legacy anon key before applying. A visitor also triggers a fresh source check.
6. Build `npm run build:ocr` and `npm run build:cloud`, then `python sites/prepare-demo.py`. Copy `sites/dist` to `docs` for GitHub Pages or publish the same folder to Sites. Test the mail-link callback and an actual verified source check before accepting real clients.

The shared `avk/avk` pair is a temporary interface gate. A private email link is required to identify the client. A shared password alone would expose all customer accounts.

Source checks confirm access and changes to official pages, not legal correctness. When a page changes or is unavailable, the AI excludes it and the UI asks for review. OCR uses German language data locally; users must confirm the redacted text before transfer because automatic removal cannot guarantee every name or identifier.
