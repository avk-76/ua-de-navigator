(() => {
  const dialog = document.querySelector("#accountLoginDialog");
  const form = document.querySelector("#accountLoginForm");
  const status = document.querySelector("#accountLoginStatus");
  const cloud = window.uaDeCloud;
  const accountRoutes = new Set(["home", "cases", "case", "deadlines", "profile"]);
  window.uaDeSourceRefresh = cloud?.configured ? cloud.invoke("sources") : Promise.resolve({ sources: [] });
  window.uaDeSourceRefresh.catch(() => {});

  function openLogin() {
    if (!cloud?.configured) {
      status.textContent = "Кабинет ещё не подключён к Supabase. Сейчас открыт только демонстрационный режим.";
    } else status.textContent = "";
    dialog.showModal();
  }

  function openRegistration(source = "") {
    if (dialog.open) dialog.close();
    window.navigatePortal?.("welcome", { instant: true });
    const section = document.querySelector("#guestLeadCapture");
    section.hidden = false;
    section.dataset.source = source || "welcome";
    const goal = section.querySelector('select[name="lead_goal"]');
    if (goal && ["route", "document", "question"].includes(source)) goal.value = source;
    section.scrollIntoView({ behavior: "smooth", block: "center" });
    section.querySelector('input[name="email"]')?.focus({ preventScroll: true });
  }

  window.uaDeAccount = {
    shouldGuard(route) { return accountRoutes.has(route) && !!cloud?.configured && !cloud.user; },
    openLogin, openRegistration,
  };

  document.querySelector("#accountLoginCancel")?.addEventListener("click", () => dialog.close());
  document.querySelector("#accountCreateButton")?.addEventListener("click", () => {
    openRegistration();
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = "Проверяем вход…";
    try {
      await cloud.signIn(String(data.get("email")).trim().toLowerCase(), String(data.get("password")));
      dialog.close();
      window.navigatePortal?.("home", { instant: true });
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
  document.querySelector("#accountResetButton")?.addEventListener("click", async () => {
    const email = String(form.elements.email.value || "").trim().toLowerCase();
    if (!email || !form.elements.email.checkValidity()) {
      status.textContent = "Сначала введите адрес электронной почты.";
      form.elements.email.focus();
      return;
    }
    status.textContent = "Отправляем ссылку восстановления…";
    try {
      await cloud.resetPassword(email);
      status.textContent = "Если такой кабинет существует, письмо для восстановления отправлено.";
    } catch (error) { status.textContent = error.message; }
  });
  const signOut = document.querySelector("#accountSignOut");
  const updateSignOut = () => { if (signOut) signOut.hidden = !cloud?.user; };
  cloud?.ready.then(() => {
    updateSignOut();
    if (cloud.user && accountRoutes.has(location.hash.slice(1))) {
      if (dialog.open) dialog.close();
      window.navigatePortal?.(location.hash.slice(1), { instant: true });
    }
  }).catch(() => {});
  window.addEventListener("ua-de:authchange", updateSignOut);
  signOut?.addEventListener("click", async () => {
    await cloud.signOut();
    location.replace(new URL("index.html#welcome", location.href).href);
  });
})();
