import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const root = new URL("./dist/", import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL("demo-fixtures.json", root), "utf8"));
const familyWindow = {};
runInNewContext(readFileSync(new URL("family-route.js", root), "utf8"), { window: familyWindow, console });
const familyRoute = familyWindow.uaDeFamilyRoute;
const familyAnswers = {
  stage: "registered", city: "Überlingen", postal_code: "88662", has_ukrainian_fop: true,
  has_car: "yes", monthly_rent: "", people: [
    { id: "p1", role: "self", age: "36", citizenship: "ua", arrival_date: "2026-03-27", document: "unknown", insurance: "unknown", revenue: "1500", expenses: "", income_period: "2026-09" },
    { id: "p2", role: "spouse", age: "34", citizenship: "ua", arrival_date: "2026-03-27", document: "unknown", insurance: "unknown" },
    { id: "p3", role: "child", age: "3", citizenship: "ua", arrival_date: "2026-03-27", document: "unknown", insurance: "unknown" },
    { id: "p4", role: "parent", age: "70", citizenship: "ua", arrival_date: "2026-03-27", document: "unknown", insurance: "unknown", care: "yes" },
  ],
};
for (const language of ["ru", "uk", "de", "en"]) {
  const plan = familyRoute.build(familyAnswers, language);
  assert.equal(plan.location.district, "Bodenseekreis");
  assert.equal(plan.people.length, 4);
  assert.equal(plan.actions.filter((item) => item.id.endsWith(":residence")).length, 4);
  assert.ok(plan.actions.find((item) => item.id === "p1:sgbii"));
  assert.ok(plan.actions.find((item) => item.id === "p4:sgbxii"));
  assert.ok(!plan.actions.find((item) => item.id === "p4:sgbii"));
  assert.ok(plan.actions.find((item) => item.id === "p3:kindergeld"));
  assert.ok(plan.actions.find((item) => item.id === "p4:pflegegrad"));
  assert.equal(plan.urgent.id, "p4:insurance");
  assert.equal(plan.taxPacket.documented_expenses_eur, null);
  assert.ok(!JSON.stringify(plan.actions).includes("Landratsamt Konstanz"));
  assert.ok(!JSON.stringify(plan).includes("Pflegegeld 2"));
  const unknown = familyRoute.build({ ...familyAnswers, city: "Unbekannt", postal_code: "", people: familyAnswers.people.map((person) => ({ ...person, city: "" })) }, language);
  assert.equal(unknown.location.known, false);
  assert.equal(unknown.actions.find((item) => item.id === "p1:residence").source, "directory");
  assert.ok(!JSON.stringify(unknown.actions).includes("Landratsamt Konstanz"));
}
const pendingPlan = familyRoute.build({ ...familyAnswers, people: familyAnswers.people.map((person) => ({ ...person, arrival_date: "2026-05-01" })) }, "ru");
assert.equal(pendingPlan.actions.find((item) => item.id === "p1:draft").ruleStatus, "draft");
assert.equal(pendingPlan.actions.find((item) => item.id === "p1:sgbii").effectiveAt, "2026-07-01");
assert.equal(fixtures.cases.length, 3);
assert.ok(!JSON.stringify(fixtures).includes("Olena"));
assert.ok(!JSON.stringify(fixtures).includes("Pototska"));
assert.ok(!fixtures.profile.email);

const banner = { innerHTML: "", className: "", setAttribute() {} };
const lang = { value: "ru", addEventListener() {} };
const document = {
  body: { classList: { toggle() {} } },
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
const privateLetter = localWindow.uaDeLocalDocument.redact("Herrn\nMaria Beispiel\nGuten Tag Herr Beispiel,\nMaria Beispiel KA123456\nFreischaltcode: C8TEST77\nTechniker Krankenkasse");
assert.ok(!/Maria|Beispiel|KA123456|C8TEST77/.test(privateLetter));
assert.ok(privateLetter.includes("Techniker Krankenkasse"));
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
const draftId = drafted.body.case.drafts[0].id;
assert.equal(drafted.body.case.drafts[0].german_text, "");
const earlySend = await api(`/api/cases/${newCase.id}/drafts/${draftId}/sent`, { method: "POST", body: JSON.stringify({ sent_at: "2026-10-16", sent_via: "portal" }) });
assert.equal(earlySend.status, 400);
const translated = await api(`/api/cases/${newCase.id}/drafts/${draftId}/translate`, { method: "POST", body: JSON.stringify({ local_text: "Прошу принять указанные документы.", approved: true }) });
assert.equal(translated.status, 200);
const sent = await api(`/api/cases/${newCase.id}/drafts/${draftId}/sent`, { method: "POST", body: JSON.stringify({ sent_at: "2026-10-16", sent_via: "portal" }) });
assert.equal(sent.body.case.status, "waiting");
const followup = await api("/api/documents/analyze", { method: "POST", body: JSON.stringify({ text: letter }) });
assert.equal(followup.body.matches[0].case_id, newCase.id);
console.log("Public demo checks passed");
