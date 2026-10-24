import { createClient } from "@supabase/supabase-js";

const config = window.UA_DE_CLOUD_CONFIG || {};
const configured = config.enabled === true && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url || "") &&
  /^(sb_publishable_|eyJ)/.test(config.publishableKey || "");
const client = configured ? createClient(config.url, config.publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;
let currentSession = null;
const ready = client ? client.auth.getSession().then(({ data, error }) => {
  if (error) throw error;
  currentSession = data.session;
  return currentSession;
}) : Promise.resolve(null);
client?.auth.onAuthStateChange((_event, session) => {
  currentSession = session;
  window.dispatchEvent(new CustomEvent("ua-de:authchange", { detail: { signedIn: !!session } }));
});

function redirectUrl() {
  return new URL("auth.html", location.href).href;
}

async function requestEmail(email, metadata = null) {
  if (!client) throw new Error("Регистрация ещё не подключена к проекту Supabase.");
  const options = { emailRedirectTo: redirectUrl(), shouldCreateUser: !!metadata };
  if (metadata) options.data = { ...metadata, app: "ua-de-navigator" };
  const { error } = await client.auth.signInWithOtp({ email, options });
  if (error) throw error;
}

async function invoke(action, data = {}) {
  if (!client) throw new Error("Онлайн-проверка ещё не подключена.");
  const { data: result, error } = await client.functions.invoke("navigator-assist", {
    body: { action, ...data },
  });
  if (error || result?.error) {
    let details = result?.error || error?.message || "Сервис недоступен";
    try {
      const payload = await error?.context?.json?.();
      if (payload?.error) details = payload.error;
    } catch { /* Keep the original error. */ }
    throw new Error(details);
  }
  return result;
}

async function getState() {
  await ready;
  if (!currentSession) return null;
  const { data, error } = await client.from("navigator_state").select("state").eq("user_id", currentSession.user.id).single();
  if (error) throw error;
  return data.state;
}

async function saveState(state) {
  await ready;
  if (!currentSession) throw new Error("Войдите в личный кабинет.");
  const { error } = await client.from("navigator_state").upsert({
    user_id: currentSession.user.id, state, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

const cloud = {
  configured, ready, requestEmail, invoke, getState, saveState,
  get user() { return currentSession?.user || null; },
  async signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
    currentSession = null;
  },
};
window.uaDeCloud = cloud;

if (document.body.dataset.authCallback === "true") {
  ready.then(() => {
    const status = document.querySelector("#authCallbackStatus");
    if (currentSession) {
      status.textContent = "Почта подтверждена. Открываем кабинет…";
      location.replace(new URL("index.html#home", location.href).href);
    } else {
      status.textContent = "Ссылка недействительна или устарела. Запросите новую ссылку для входа.";
    }
  }).catch((error) => { document.querySelector("#authCallbackStatus").textContent = error.message; });
}
