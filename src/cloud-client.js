import { createClient } from "@supabase/supabase-js";

const config = window.UA_DE_CLOUD_CONFIG || {};
const recoveryLink = /(?:^|[&#?])type=recovery(?:&|$)/.test(location.search + location.hash);
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

async function signUp(email, password, metadata) {
  if (!client) throw new Error("Регистрация ещё не подключена к проекту Supabase.");
  if (!metadata?.account_consent) throw new Error("Для регистрации необходимо согласие на создание кабинета.");
  if (password.length < 12) throw new Error("Пароль должен содержать не менее 12 символов.");
  const { data, error } = await client.auth.signUp({ email, password, options: {
    emailRedirectTo: redirectUrl(), data: { ...metadata, app: "ua-de-navigator" },
  } });
  if (error) throw error;
  if (data.session) await client.auth.signOut();
  return data;
}

async function signIn(email, password) {
  if (!client) throw new Error("Вход ещё не подключён к проекту Supabase.");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user?.email_confirmed_at) {
    await client.auth.signOut();
    throw new Error("Сначала подтвердите адрес электронной почты.");
  }
  return data;
}

async function resetPassword(email) {
  if (!client) throw new Error("Восстановление пароля пока недоступно.");
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
  if (error) throw error;
}

async function updatePassword(password) {
  if (!client || !currentSession) throw new Error("Ссылка восстановления недействительна или устарела.");
  if (password.length < 12) throw new Error("Пароль должен содержать не менее 12 символов.");
  const { error } = await client.auth.updateUser({ password });
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

async function saveDocument({ caseId, sourceType, redactedText, analysis }) {
  await ready;
  if (!currentSession?.user?.email_confirmed_at) throw new Error("Войдите с подтверждённой почтой.");
  if (!redactedText || redactedText.length > 30000) throw new Error("Текст документа имеет недопустимую длину.");
  const { data, error } = await client.from("navigator_documents").insert({
    user_id: currentSession.user.id,
    case_id: caseId,
    source_type: sourceType,
    redacted_text: redactedText,
    analysis,
  }).select("id,created_at").single();
  if (error) throw error;
  return data;
}

async function getDocument(id) {
  await ready;
  if (!currentSession) throw new Error("Войдите в личный кабинет.");
  const { data, error } = await client.from("navigator_documents")
    .select("id,case_id,redacted_text,analysis").eq("id", id).single();
  if (error) throw error;
  return data;
}

const cloud = {
  configured, ready, signUp, signIn, resetPassword, updatePassword, invoke, getState, saveState, saveDocument, getDocument,
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
    const resetForm = document.querySelector("#passwordResetForm");
    if (recoveryLink && currentSession) {
      status.textContent = "Ссылка подтверждена. Задайте новый пароль.";
      resetForm.hidden = false;
      resetForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = resetForm.elements.password.value;
        if (password !== resetForm.elements.confirm_password.value) {
          status.textContent = "Пароли не совпадают.";
          return;
        }
        try {
          await updatePassword(password);
          status.textContent = "Пароль обновлён. Открываем кабинет…";
          location.replace(new URL("index.html#home", location.href).href);
        } catch (error) { status.textContent = error.message; }
      });
    } else if (currentSession?.user?.email_confirmed_at) {
      status.textContent = "Почта подтверждена. Открываем кабинет…";
      location.replace(new URL("index.html#home", location.href).href);
    } else {
      status.textContent = "Ссылка недействительна или устарела. Запросите новую ссылку для входа.";
    }
  }).catch((error) => { document.querySelector("#authCallbackStatus").textContent = error.message; });
}
