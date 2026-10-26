import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

// Manual live test. Uses synthetic data and a Gmail inbox that receives plus aliases.
// Passwords and confirmation links exist only in this process's memory.
const config = readFileSync(new URL("../prototype/cloud-config.js", import.meta.url), "utf8");
const url = config.match(/url:\s*"([^"]+)"/)?.[1];
const key = config.match(/publishableKey:\s*"([^"]+)"/)?.[1];
if (!url || !key) throw new Error("Missing public Supabase configuration");
const inbox = process.env.NAVIGATOR_TEST_INBOX;
if (!inbox?.includes("@gmail.com")) throw new Error("Set NAVIGATOR_TEST_INBOX to a Gmail inbox");
const [local, domain] = inbox.split("@");
const suffix = Date.now().toString(36);
const emailA = `${local}+uadenav${suffix}a@${domain}`;
const emailB = `${local}+uadenav${suffix}b@${domain}`;
const passwordA = randomBytes(24).toString("base64url");
const passwordB = randomBytes(24).toString("base64url");
const newPassword = randomBytes(24).toString("base64url");
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const a = client();
const b = client();
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const reader = createInterface({ input: process.stdin, terminal: false });
const lines = reader[Symbol.asyncIterator]();
async function next(label) {
  console.log(`WAIT ${label}`);
  const result = await lines.next();
  if (result.done) throw new Error(`Missing ${label}`);
  return result.value.trim();
}
function check(value, label) {
  if (!value) throw new Error(`FAIL ${label}`);
  console.log(`PASS ${label}`);
}
async function confirm(link, label) {
  check(link.startsWith(`${url}/auth/v1/verify?`), `${label} confirmation URL`);
  const response = await fetch(link, { redirect: "manual" });
  check([302, 303].includes(response.status), `${label} email link accepted (HTTP ${response.status})`);
}
async function ai(token, action, payload) {
  const response = await fetch(`${url}/functions/v1/navigator-assist`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${token}`, Origin: "https://avk-76.github.io", "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  return { status: response.status, body: await response.json() };
}

try {
  for (const [user, email, password] of [[a, emailA, passwordA], [b, emailB, passwordB]]) {
    const { data, error } = await user.auth.signUp({ email, password, options: {
      emailRedirectTo: "https://avk-76.github.io/ua-de-navigator/auth.html",
      data: { app: "ua-de-navigator", display_name: "Synthetic Test", account_consent: true },
    } });
    if (error) throw error;
    check(!!data.user && !data.session, `signup ${email} awaits confirmation`);
  }
  const premature = await a.auth.signInWithPassword({ email: emailA, password: passwordA });
  check(!!premature.error, "unconfirmed email cannot sign in");
  console.log(`TEST_EMAIL_A ${emailA}`);
  console.log(`TEST_EMAIL_B ${emailB}`);
  const links = JSON.parse(await next("confirmation_links_json"));
  await confirm(links.a, "A");
  await confirm(links.b, "B");
  const signedA = await a.auth.signInWithPassword({ email: emailA, password: passwordA });
  const signedB = await b.auth.signInWithPassword({ email: emailB, password: passwordB });
  if (signedA.error) throw signedA.error;
  if (signedB.error) throw signedB.error;
  check(!!signedA.data.user?.email_confirmed_at && !!signedB.data.user?.email_confirmed_at, "two confirmed logins");
  const idA = signedA.data.user.id;
  const idB = signedB.data.user.id;
  const ownState = await a.from("navigator_state").select("user_id").eq("user_id", idA).single();
  check(!ownState.error && ownState.data?.user_id === idA, "own state available");
  const foreignState = await b.from("navigator_state").select("user_id").eq("user_id", idA);
  check(!foreignState.error && foreignState.data.length === 0, "foreign state hidden");
  const deniedState = await b.from("navigator_state").upsert({ user_id: idA, state: { injected: true } });
  check(!!deniedState.error, "foreign state write denied");
  const redactedText = "Jobcenter Musterstadt. Schreiben vom 01.10.2026. Bitte reichen Sie bis zum 15.11.2026 Ihre Mietbescheinigung ein. Ein Kontoauszug ist nicht erforderlich.";
  const ownDoc = await a.from("navigator_documents").insert({ user_id: idA, case_id: "synthetic-case", source_type: "text", redacted_text: redactedText, analysis: {} }).select("id").single();
  if (ownDoc.error) throw ownDoc.error;
  check(!!ownDoc.data?.id, "own redacted document saved");
  const foreignDoc = await b.from("navigator_documents").select("id").eq("id", ownDoc.data.id);
  check(!foreignDoc.error && foreignDoc.data.length === 0, "foreign document hidden");
  const deniedDoc = await b.from("navigator_documents").insert({ user_id: idA, source_type: "text", redacted_text: redactedText, analysis: {} });
  check(!!deniedDoc.error, "foreign document write denied");
  const unauth = await ai(key, "document", { text: redactedText });
  check(unauth.status === 401, "anonymous AI call denied");
  const documentResult = await ai(signedA.data.session.access_token, "document", { text: redactedText });
  console.log(`AI_DOCUMENT_STATUS ${documentResult.status}`);
  if (documentResult.status !== 200) console.log(`AI_DOCUMENT_ERROR ${JSON.stringify(documentResult.body).slice(0, 500)}`);
  check(documentResult.status === 200 && documentResult.body.ok, "real OpenAI document analysis");
  console.log(`AI_DEADLINE ${JSON.stringify(documentResult.body.analysis.deadline)}`);
  console.log(`AI_REQUIRED_DOCUMENTS ${JSON.stringify(documentResult.body.analysis.required_documents)}`);
  check(documentResult.body.analysis.deadline.extracted_due_at === "2026-11-15", "letter deadline extracted");
  check(!documentResult.body.analysis.required_documents.some((item) => /Kontoauszug/i.test(item)), "explicitly unnecessary document excluded");
  const reply = await ai(signedA.data.session.access_token, "reply", { text: redactedText, available_documents: ["Mietbescheinigung"] });
  check(reply.status === 200 && reply.body.reply?.german_text, "real OpenAI German reply");
  const question = await ai(signedA.data.session.access_token, "question", { question: "Welche Stelle kann mir bei der Wohnungssuche helfen?", language: "ru" });
  check(question.status === 200 && question.body.answer?.summary, "real OpenAI question answer");
  const reset = await a.auth.resetPasswordForEmail(emailA, { redirectTo: "https://avk-76.github.io/ua-de-navigator/auth.html" });
  if (reset.error) throw reset.error;
  console.log(`TEST_RESET_EMAIL ${emailA}`);
  const resetLink = await next("recovery_link");
  check(resetLink.startsWith(`${url}/auth/v1/verify?`), "password recovery URL");
  // Recovery link establishes a browser session. Exchange its access token here to test updateUser.
  const redirect = await fetch(resetLink, { redirect: "manual" });
  check([302, 303].includes(redirect.status), "recovery email link accepted");
  const fragment = new URL(redirect.headers.get("location") || "", "https://avk-76.github.io").hash.slice(1);
  const params = new URLSearchParams(fragment);
  check(!!params.get("access_token") && !!params.get("refresh_token"), "recovery session returned");
  const recovery = client();
  const session = await recovery.auth.setSession({ access_token: params.get("access_token"), refresh_token: params.get("refresh_token") });
  if (session.error) throw session.error;
  const updated = await recovery.auth.updateUser({ password: newPassword });
  if (updated.error) throw updated.error;
  const oldPassword = await client().auth.signInWithPassword({ email: emailA, password: passwordA });
  check(!!oldPassword.error, "old password rejected after reset");
  const newLogin = await client().auth.signInWithPassword({ email: emailA, password: newPassword });
  check(!newLogin.error && !!newLogin.data.session, "new password works");
  const logout = await recovery.auth.signOut();
  check(!logout.error, "logout works");
  console.log("LIVE_E2E_COMPLETE");
} finally {
  reader.close();
}
