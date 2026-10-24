(() => {
  const form = document.querySelector("#onboardingForm");
  if (!form) return;

  const steps = [...form.querySelectorAll("[data-onboarding-step]")];
  const backButton = document.querySelector("#onboardingBack");
  const nextButton = document.querySelector("#onboardingNext");
  const validation = document.querySelector("#onboardingValidation");
  const progressText = document.querySelector("#routeProgressText");
  const progressBar = document.querySelector("#routeProgressBar");
  const resultSection = document.querySelector("#routeResult");
  const routeBuilder = document.querySelector("#routeBuilder");
  const editButton = document.querySelector("#editRouteButton");
  const refreshSourcesButton = document.querySelector("#refreshRouteSources");
  const leadCapture = document.querySelector("#leadCapture");
  const leadForm = document.querySelector("#leadForm");
  const leadFormStatus = document.querySelector("#leadFormStatus");
  const requestedSupport = document.querySelector("#requestedSupport");
  const leadCaptureTitle = document.querySelector("#leadCaptureTitle");
  let currentStep = 1;
  let isBuilding = false;
  let currentRoute = null;

  function onboardingLanguage() {
    return document.querySelector("#languageSelect")?.value || "ru";
  }

  function onboardingText(value) {
    const source = String(value ?? "");
    return window.uaDeI18n?.t(source) || source;
  }

  function onboardingCopy(key) {
    const copy = {
      step: {
        ru: (step, total) => `Шаг ${step} из ${total}`,
        uk: (step, total) => `Крок ${step} із ${total}`,
        de: (step, total) => `Schritt ${step} von ${total}`,
        en: (step, total) => `Step ${step} of ${total}`,
      },
      continue: { ru: "Продолжить", uk: "Продовжити", de: "Weiter", en: "Continue" },
      build: { ru: "Построить маршрут", uk: "Побудувати маршрут", de: "Route erstellen", en: "Build route" },
      sourcesChecked: { ru: "Официальные источники проверены", uk: "Офіційні джерела перевірено", de: "Offizielle Quellen geprüft", en: "Official sources checked" },
      sourcesReview: { ru: "Часть источников требует повторной проверки", uk: "Частина джерел потребує повторної перевірки", de: "Einige Quellen müssen erneut geprüft werden", en: "Some sources need another check" },
    };
    return copy[key]?.[onboardingLanguage()] || copy[key]?.ru;
  }

  function showStep(stepNumber) {
    currentStep = Math.min(Math.max(stepNumber, 1), steps.length);
    steps.forEach((step) => {
      const isCurrent = Number(step.dataset.onboardingStep) === currentStep;
      step.hidden = !isCurrent;
      step.classList.toggle("is-current", isCurrent);
    });
    progressText.textContent = onboardingCopy("step")(currentStep, steps.length);
    progressBar.style.width = `${(currentStep / steps.length) * 100}%`;
    backButton.disabled = currentStep === 1 || isBuilding;
    nextButton.querySelector("span:first-child").textContent =
      currentStep === steps.length ? onboardingCopy("build") : onboardingCopy("continue");
    validation.textContent = "";
  }

  function selectedRadio(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function validateStep() {
    const requiredByStep = {
      1: ["stage"],
      2: ["housing", "funding"],
      3: ["work_capacity"],
    };
    const missing = (requiredByStep[currentStep] || []).some((name) => !selectedRadio(name));
    if (missing) {
      validation.textContent = "Выберите один из вариантов.";
      return false;
    }
    if (currentStep === 4 && !form.querySelector('input[name="goals"]:checked')) {
      validation.textContent = "Выберите хотя бы одну цель.";
      return false;
    }
    return true;
  }

  function collectAnswers() {
    return {
      stage: selectedRadio("stage"),
      housing: selectedRadio("housing"),
      funding: selectedRadio("funding"),
      work_capacity: selectedRadio("work_capacity"),
      family: form.elements.family.value,
      has_ukrainian_fop: form.elements.has_ukrainian_fop.checked,
      goals: [...form.querySelectorAll('input[name="goals"]:checked')].map((input) => input.value),
    };
  }

  function applyAnswers(answers) {
    ["stage", "housing", "funding", "work_capacity"].forEach((name) => {
      const value = answers[name];
      const input = value
        ? form.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`)
        : null;
      if (input) input.checked = true;
    });
    if (answers.family && form.elements.family) {
      form.elements.family.value = answers.family;
    }
    form.elements.has_ukrainian_fop.checked = Boolean(answers.has_ukrainian_fop);
    const selectedGoals = new Set(answers.goals || []);
    form.querySelectorAll('input[name="goals"]').forEach((input) => {
      input.checked = selectedGoals.has(input.value);
    });
  }

  async function buildRoute() {
    if (isBuilding || !validateStep()) return;
    isBuilding = true;
    backButton.disabled = true;
    nextButton.disabled = true;
    const originalLabel = nextButton.querySelector("span:first-child").textContent;
    nextButton.querySelector("span:first-child").textContent = "Проверяем источники…";
    validation.textContent = "Собираем маршрут и проверяем актуальность.";
    try {
      if (window.uaDeCloud?.configured) await window.uaDeSourceRefresh;
      const payload = await apiRequest("/api/onboarding/route", {
        method: "POST",
        body: JSON.stringify({ answers: collectAnswers() }),
      });
      renderRoute(payload.route);
      validation.textContent = "";
      routeBuilder.hidden = true;
      resultSection.hidden = false;
      resultSection.classList.remove("is-revealing");
      void resultSection.offsetWidth;
      resultSection.classList.add("is-revealing");
      resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      validation.textContent = `Не удалось построить маршрут: ${error.message}`;
    } finally {
      isBuilding = false;
      nextButton.disabled = false;
      backButton.disabled = currentStep === 1;
      nextButton.querySelector("span:first-child").textContent = originalLabel;
    }
  }

  function renderRoute(route) {
    currentRoute = route;
    setOnboardingText("#arrivalRouteTitle", route.arrival_track.title);
    setOnboardingText("#arrivalRouteLabel", route.arrival_track.label);
    setOnboardingText("#arrivalRouteDescription", route.arrival_track.description);
    setOnboardingText("#authorityRouteTitle", route.authority_track.title);
    setOnboardingText("#authorityRouteLabel", route.authority_track.label);
    setOnboardingText("#authorityRouteDescription", route.authority_track.description);
    setOnboardingText("#routeNotice", route.notice);

    const freshness = document.querySelector("#routeFreshness");
    if (freshness) {
      const isFresh = route.source_freshness === "fresh";
      freshness.className = `source-freshness ${isFresh ? "is-fresh" : "needs-review"}`;
      freshness.textContent = isFresh ? onboardingCopy("sourcesChecked") : onboardingCopy("sourcesReview");
    }

    const stepsContainer = document.querySelector("#generatedRouteSteps");
    stepsContainer.innerHTML = route.next_steps.map((step) => `
      <li>
        <strong>${escapeOnboardingHtml(onboardingText(step.title))}</strong>
        <span>${escapeOnboardingHtml(onboardingText(step.description))}</span>
      </li>
    `).join("");

    const integrations = document.querySelector("#generatedIntegrationTracks");
    integrations.innerHTML = route.integration_tracks.length
      ? route.integration_tracks.map((track) => `
          <article class="integration-track">
            <strong>${escapeOnboardingHtml(onboardingText(track.label))}</strong>
            <span>${escapeOnboardingHtml(onboardingText(track.description))}</span>
          </article>
        `).join("")
      : `
        <article class="integration-track">
          <strong>Цель ещё не выбрана</strong>
          <span>Её можно добавить позже без изменения базового маршрута.</span>
        </article>
      `;

    const sourceList = document.querySelector("#routeSourceList");
    sourceList.innerHTML = route.sources.map((source) => `
      <a class="route-source" href="${escapeOnboardingHtml(source.url)}" target="_blank" rel="noreferrer">
        <strong>${escapeOnboardingHtml(onboardingText(source.title))}</strong>
        <span>${escapeOnboardingHtml(onboardingText(source.authority))} · ${sourceStatusLabel(source.status)}</span>
        <time datetime="${escapeOnboardingHtml(source.last_checked_at || "")}">
          ${escapeOnboardingHtml(formatSourceDate(source.last_checked_at))}
        </time>
      </a>
    `).join("");
  }

  function sourceStatusLabel(status) {
    const language = onboardingLanguage();
    const labels = {
      verified_online: { ru: "проверено онлайн", uk: "перевірено онлайн", de: "online geprüft", en: "checked online" },
      verified_manual: { ru: "проверено по официальной странице", uk: "перевірено за офіційною сторінкою", de: "anhand der offiziellen Seite geprüft", en: "checked against the official page" },
      needs_review: { ru: "страница изменилась — нужна проверка", uk: "сторінка змінилася — потрібна перевірка", de: "Seite geändert — Prüfung nötig", en: "page changed — review needed" },
      temporarily_unavailable: { ru: "источник временно недоступен", uk: "джерело тимчасово недоступне", de: "Quelle vorübergehend nicht erreichbar", en: "source temporarily unavailable" },
    };
    return labels[status]?.[language] || labels[status]?.ru || {
      ru: "статус неизвестен", uk: "статус невідомий", de: "Status unbekannt", en: "status unknown",
    }[language];
  }

  function formatSourceDate(value) {
    if (!value) return "не проверено";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const locales = { ru: "ru-RU", uk: "uk-UA", de: "de-DE", en: "en-GB" };
    return new Intl.DateTimeFormat(locales[onboardingLanguage()] || "ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function setOnboardingText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = onboardingText(value);
  }

  function escapeOnboardingHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function restoreOnboarding() {
    try {
      const payload = await apiRequest("/api/onboarding");
      if (!payload.onboarding) return;
      applyAnswers(payload.onboarding.answers || {});
    } catch (error) {
      validation.textContent = `Сохранённый маршрут пока недоступен: ${error.message}`;
    }
  }

  nextButton.addEventListener("click", () => {
    if (!validateStep()) return;
    if (currentStep < steps.length) {
      showStep(currentStep + 1);
      return;
    }
    buildRoute();
  });

  backButton.addEventListener("click", () => showStep(currentStep - 1));

  editButton?.addEventListener("click", () => {
    resultSection.hidden = true;
    routeBuilder.hidden = false;
    showStep(1);
    routeBuilder.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  refreshSourcesButton?.addEventListener("click", async () => {
    const originalLabel = refreshSourcesButton.textContent;
    refreshSourcesButton.disabled = true;
    refreshSourcesButton.textContent = "Проверяем официальные страницы…";
    try {
      if (window.uaDeCloud?.configured) {
        window.uaDeSourceRefresh = window.uaDeCloud.invoke("sources");
        await window.uaDeSourceRefresh;
      } else await apiRequest("/api/official-sources/refresh", { method: "POST", body: "{}" });
      await buildRoute();
    } catch (error) {
      validation.textContent = `Онлайн-проверка не завершена: ${error.message}`;
    } finally {
      refreshSourcesButton.disabled = false;
      refreshSourcesButton.textContent = originalLabel;
    }
  });

  document.querySelectorAll("[data-start-route]").forEach((button) => {
    button.addEventListener("click", () => {
      if (document.body.dataset.portalView !== "welcome") navigatePortal("welcome", { instant: true });
      routeBuilder.hidden = false;
      routeBuilder.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-open-lead]").forEach((button) => {
    button.addEventListener("click", () => {
      leadCapture?.scrollIntoView({ behavior: "smooth", block: "center" });
      leadForm?.querySelector('input[name="email"]')?.focus({ preventScroll: true });
    });
  });

  document.querySelectorAll("[data-support-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const supportType = button.dataset.supportChoice || "";
      if (requestedSupport) requestedSupport.value = supportType;
      if (leadCaptureTitle) {
        leadCaptureTitle.textContent = supportType === "lawyer"
          ? "Сохраните маршрут и запросите условия консультации юриста"
          : "Сохраните маршрут и запросите консультацию советника Лубенца";
      }
      if (leadFormStatus) {
        leadFormStatus.textContent =
          "Сначала создадим кабинет. Передача контакта специалисту потребует отдельного подтверждения.";
      }
      leadCapture?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  leadForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!leadForm.reportValidity()) return;

    const submitButton = document.querySelector("#registerLeadButton");
    const originalLabel = submitButton?.querySelector("span:first-child")?.textContent;
    if (submitButton) submitButton.disabled = true;
    if (submitButton?.querySelector("span:first-child")) {
      submitButton.querySelector("span:first-child").textContent = "Создаём кабинет…";
    }
    if (leadFormStatus) leadFormStatus.textContent = "Отправляем письмо для подтверждения почты.";

    const data = new FormData(leadForm);
    try {
      if (!window.uaDeCloud?.configured) throw new Error("Регистрация пока не подключена к Supabase.");
      await window.uaDeCloud.requestEmail(String(data.get("email")).trim().toLowerCase(), {
        display_name: String(data.get("display_name")).trim(),
        preferred_language: document.querySelector("#languageSelect")?.value || "ru",
        federal_state: String(data.get("federal_state") || "").trim(),
        lead_goal: String(data.get("lead_goal")),
        lead_source: "route",
        updates_consent: data.get("updates_consent") === "on",
        account_consent: data.get("account_consent") === "on",
      });
      if (leadFormStatus) leadFormStatus.textContent = "Письмо отправлено. Перейдите по ссылке из письма, чтобы подтвердить почту и открыть кабинет.";
    } catch (error) {
      if (leadFormStatus) leadFormStatus.textContent = error.message;
      if (submitButton) submitButton.disabled = false;
      if (submitButton?.querySelector("span:first-child")) {
        submitButton.querySelector("span:first-child").textContent =
          originalLabel || "Создать бесплатный кабинет";
      }
    }
  });

  showStep(1);
  window.addEventListener("ua-de:languagechange", () => {
    showStep(currentStep);
    if (currentRoute) renderRoute(currentRoute);
  });
  const welcomeCredits = document.querySelector("#welcomeCredits");
  if (welcomeCredits) {
    const showCredits = () => { welcomeCredits.hidden = !window.uaDeCloud?.user; };
    window.uaDeCloud?.ready.then(showCredits).catch(() => {});
    window.addEventListener("ua-de:authchange", showCredits);
  }
  restoreOnboarding();
})();
