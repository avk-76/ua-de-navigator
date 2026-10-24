import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const root = new URL("./dist/", import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL("demo-fixtures.json", root), "utf8"));
assert.equal(fixtures.cases.length, 3);
assert.ok(!JSON.stringify(fixtures).includes("Olena"));
assert.ok(!JSON.stringify(fixtures).includes("Pototska"));
assert.ok(!fixtures.profile.email);

const banner = { innerHTML: "", className: "", setAttribute() {} };
const lang = { value: "ru", addEventListener() {} };
const document = {
  createElement: () => banner,
  querySelector: (selector) => selector === ".app-shell" ? { prepend() {} } : selector === "#languageSelect" ? lang : null,
};
const window = {
  addEventListener() {},
  fetch: async () => new Response(JSON.stringify(fixtures), { status: 200 }),
};
runInNewContext(readFileSync(new URL("demo-api.js", root), "utf8"), {
  window, document, location: { href: "https://example.test/" },
  URL, Response, structuredClone, Date, JSON, console,
});
const api = async (path, options) => {
  const response = await window.fetch(path, options);
  return { status: response.status, body: await response.json() };
};

assert.equal((await api("/api/dashboard")).body.dashboard.summary.active_cases, 3);
assert.equal((await api("/api/cases/case-finanzamt-2025")).body.case.checklist.length, 3);
assert.equal((await api("/api/regions")).body.regions.length > 0, true);
const route = await api("/api/onboarding/route", {
  method: "POST",
  body: JSON.stringify({ answers: { housing: "none", funding: "none", work_capacity: "able", goals: ["work"] } }),
});
assert.equal(route.body.route.authority_track.label, "Jobcenter");
assert.equal(route.body.route.source_freshness, "review_required");
assert.equal((await api("/api/leads/register", { method: "POST" })).status, 503);
assert.equal((await api("/api/extract", { method: "POST" })).status, 410);
const localDocument = { currentScript: { src: "https://example.test/local-document.js" }, querySelector: () => null };
const localWindow = {};
runInNewContext(readFileSync(new URL("local-document.js", root), "utf8"), {
  window: localWindow, document: localDocument, URL, console,
});
const redacted = localWindow.uaDeLocalDocument.redact("Jobcenter Berlin\nFrau Anna Muster\nMusterstraße 5\nanna@example.com\n+49 170 12345678");
assert.ok(redacted.includes("Jobcenter Berlin"));
assert.ok(!redacted.includes("Anna Muster"));
assert.ok(!redacted.includes("Musterstraße 5"));
assert.ok(!redacted.includes("anna@example.com"));
assert.ok(!redacted.includes("12345678"));
const letter = "Jobcenter Bodenseekreis\nAktenzeichen: JC/2026/4711\nAufforderung zur Mitwirkung\nBitte reichen Sie Kontoauszüge und Mietvertrag bis zum 17.10.2026 ein.";
const preview = await api("/api/documents/analyze", { method: "POST", body: JSON.stringify({ text: letter }) });
assert.equal(preview.body.analysis.deadline.extracted_due_at, "2026-10-17");
const attached = await api("/api/documents/attach", { method: "POST", body: JSON.stringify({ text: letter, file_name: "demo.txt", analysis: preview.body.analysis }) });
assert.equal(attached.status, 201);
const newCase = attached.body.case;
assert.equal(newCase.deadlines[0].status, "needs_confirmation");
assert.equal(newCase.deadlines[0].confirmed_by_user, 0);
const confirmed = await api(`/api/deadlines/${newCase.deadlines[0].id}`, { method: "PATCH", body: JSON.stringify({ due_at: "2026-10-17", confirmed_by_user: true }) });
assert.deepEqual(confirmed.body.deadline.reminder_settings.days_before, [7, 3, 1, 0]);
const drafted = await api(`/api/cases/${newCase.id}/drafts`, { method: "POST", body: JSON.stringify({ language: "ru", answers: { available_documents: ["Kontoauszüge"] } }) });
assert.equal(drafted.body.case.status, "drafting_reply");
const sent = await api(`/api/cases/${newCase.id}/drafts/${drafted.body.case.drafts[0].id}/sent`, { method: "POST", body: JSON.stringify({ sent_at: "2026-10-16", sent_via: "portal" }) });
assert.equal(sent.body.case.status, "waiting");
const followup = await api("/api/documents/analyze", { method: "POST", body: JSON.stringify({ text: letter }) });
assert.equal(followup.body.matches[0].case_id, newCase.id);
console.log("Public demo checks passed");
