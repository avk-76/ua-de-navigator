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

  window.uaDeAccount = {
    shouldGuard(route) { return accountRoutes.has(route) && !!cloud?.configured && !cloud.user; },
    openLogin,
  };

  document.querySelector("#accountLoginCancel")?.addEventListener("click", () => dialog.close());
  document.querySelector("#accountCreateButton")?.addEventListener("click", () => {
    dialog.close();
    window.navigatePortal?.("welcome");
    const section = document.querySelector("#guestLeadCapture");
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get("test_login") !== "avk" || data.get("test_password") !== "avk") {
      status.textContent = "Для тестового входа используйте avk/avk.";
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = "Отправляем ссылку…";
    try {
      await cloud.requestEmail(String(data.get("email")).trim().toLowerCase());
      status.textContent = "Ссылка отправлена. Откройте письмо на этом устройстве для входа.";
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
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
