(() => {
  const tool = document.querySelector("#guestQuestionTool");
  const form = document.querySelector("#guestQuestionForm");
  const input = document.querySelector("#guestQuestion");
  const counter = document.querySelector("#questionCounter");
  const status = document.querySelector("#guestQuestionStatus");
  const answerSection = document.querySelector("#guestAnswer");
  const guestLeadCapture = document.querySelector("#guestLeadCapture");
  const guestLeadForm = document.querySelector("#guestLeadForm");
  if (!tool || !form || !input || !answerSection) return;

  const sessionKey = "ua-de-guest-session";
  let currentAnswer = null;
  let sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = `guest-${crypto.randomUUID()}`;
    localStorage.setItem(sessionKey, sessionId);
  }
  window.uaDeGuestSessionId = sessionId;

  function guestLanguage() {
    return document.querySelector("#languageSelect")?.value || "ru";
  }

  function guestCopy(key, values = {}) {
    const copy = {
      saved: {
        ru: `В кабинете доступны ${values.questions} дополнительных вопроса и ${values.documents} бесплатных разбора документов.`,
        uk: `У кабінеті доступні ще ${values.questions} запитання та ${values.documents} безкоштовні розбори документів.`,
        de: `Im Konto sind ${values.questions} weitere Fragen und ${values.documents} kostenlose Dokumentanalysen verfügbar.`,
        en: `${values.questions} additional questions and ${values.documents} free document analyses are available in your account.`,
      },
      answerSaved: { ru: "Ответ сохранён", uk: "Відповідь збережено", de: "Antwort gespeichert", en: "Answer saved" },
      openAccount: { ru: "Открыть кабинет", uk: "Відкрити кабінет", de: "Konto öffnen", en: "Open account" },
      noCheckDate: {
        ru: "дата проверки не указана",
        uk: "дату перевірки не вказано",
        de: "Prüfdatum nicht angegeben",
        en: "check date not specified",
      },
      checked: { ru: "проверено", uk: "перевірено", de: "geprüft", en: "checked" },
      describeMore: {
        ru: "Опишите ситуацию немного подробнее.",
        uk: "Опишіть ситуацію трохи докладніше.",
        de: "Bitte beschreiben Sie Ihre Situation etwas genauer.",
        en: "Please describe your situation in a little more detail.",
      },
      analyzing: {
        ru: "Разбираем ситуацию…",
        uk: "Аналізуємо ситуацію…",
        de: "Situation wird analysiert…",
        en: "Analyzing your situation…",
      },
      matchingSources: {
        ru: "Сопоставляем вопрос с доступными официальными источниками.",
        uk: "Зіставляємо запитання з доступними офіційними джерелами.",
        de: "Die Frage wird mit verfügbaren offiziellen Quellen abgeglichen.",
        en: "Matching your question with available official sources.",
      },
      firstAnswer: {
        ru: "Получить первый ответ",
        uk: "Отримати першу відповідь",
        de: "Erste Antwort erhalten",
        en: "Get first answer",
      },
      createAccount: {
        ru: "Создать бесплатный кабинет",
        uk: "Створити безкоштовний кабінет",
        de: "Kostenloses Konto erstellen",
        en: "Create free account",
      },
      creatingAccount: {
        ru: "Создаём кабинет…",
        uk: "Створюємо кабінет…",
        de: "Konto wird erstellt…",
        en: "Creating account…",
      },
      savingCredits: {
        ru: "Отправляем письмо для подтверждения почты.",
        uk: "Надсилаємо лист для підтвердження пошти.",
        de: "E-Mail zur Bestätigung wird gesendet.",
        en: "Sending your email confirmation link.",
      },
      answerFailed: {
        ru: "Не удалось получить ответ",
        uk: "Не вдалося отримати відповідь",
        de: "Antwort konnte nicht geladen werden",
        en: "Could not get an answer",
      },
      accountFailed: {
        ru: "Не удалось создать кабинет",
        uk: "Не вдалося створити кабінет",
        de: "Konto konnte nicht erstellt werden",
        en: "Could not create the account",
      },
      noSources: {
        ru: "Актуальность официальных источников для этого первого ориентира не проверялась.",
        uk: "Актуальність офіційних джерел для цього першого орієнтира не перевірялася.",
        de: "Aktuelle amtliche Quellen wurden für diese erste Orientierung nicht geprüft.",
        en: "Current official sources were not checked for this initial guidance.",
      },
    };
    return copy[key]?.[guestLanguage()] || copy[key]?.ru || "";
  }

  function setList(selector, items) {
    const list = document.querySelector(selector);
    if (!list) return;
    list.replaceChildren();
    (items || []).forEach((item) => {
      const node = document.createElement("li");
      node.textContent = window.uaDeI18n?.t(item) || item;
      list.append(node);
    });
  }

  function formatDate(value) {
    if (!value) return guestCopy("noCheckDate");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const locales = { ru: "ru-RU", uk: "uk-UA", de: "de-DE", en: "en-GB" };
    return new Intl.DateTimeFormat(locales[guestLanguage()] || "ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function renderAnswer(answer, { reveal = true, scroll = true } = {}) {
    currentAnswer = answer;
    const summary = document.querySelector("#guestAnswerSummary");
    const caution = document.querySelector("#guestAnswerCaution");
    if (summary) summary.textContent = window.uaDeI18n?.t(answer.summary || "") || answer.summary || "";
    if (caution) caution.textContent = [answer.caution, answer.legal_uncertainty].filter(Boolean).join("\n\n");
    setList("#guestAnswerSteps", answer.steps);
    setList("#guestAnswerDocuments", answer.documents);
    setList("#guestClarifyingQuestions", answer.clarifying_questions);

    const sources = document.querySelector("#guestAnswerSources");
    if (sources) {
      sources.replaceChildren();
      if (!(answer.sources || []).length) {
        const note = document.createElement("p");
        note.textContent = guestCopy("noSources");
        sources.append(note);
      }
      (answer.sources || []).forEach((source) => {
        const link = document.createElement("a");
        link.className = "guest-source-link";
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        const title = document.createElement("strong");
        title.textContent = window.uaDeI18n?.t(source.title) || source.title;
        const meta = document.createElement("span");
        const authority = window.uaDeI18n?.t(source.authority) || source.authority;
        meta.textContent = source.last_checked_at
          ? `${authority} · ${guestCopy("checked")} ${formatDate(source.last_checked_at)}`
          : `${authority} · ${guestCopy("noCheckDate")}`;
        link.append(title, meta);
        sources.append(link);
      });
    }

    tool.hidden = true;
    answerSection.hidden = false;
    if (reveal) {
      answerSection.classList.remove("is-revealing");
      void answerSection.offsetWidth;
      answerSection.classList.add("is-revealing");
    }
    if (scroll) answerSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.addEventListener("ua-de:languagechange", () => {
    if (currentAnswer) renderAnswer(currentAnswer, { reveal: false, scroll: false });
  });

  document.querySelectorAll("[data-open-question]").forEach((button) => {
    button.addEventListener("click", () => {
      if (document.body.dataset.portalView !== "welcome") navigatePortal("welcome", { instant: true });
      tool.hidden = false;
      answerSection.hidden = true;
      guestLeadCapture.hidden = true;
      tool.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus({ preventScroll: true });
    });
  });

  document.querySelectorAll("[data-question-example]").forEach((button) => {
    button.addEventListener("click", () => {
      const example = button.dataset.questionExample || "";
      input.value = window.uaDeI18n?.t(example) || example;
      counter.textContent = `${input.value.length} / 4000`;
      input.focus();
    });
  });

  input.addEventListener("input", () => {
    counter.textContent = `${input.value.length} / 4000`;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (question.length < 15) {
      status.textContent = guestCopy("describeMore");
      return;
    }
    const guest = !!window.uaDeCloud?.configured && !window.uaDeCloud.user;
    if (guest && localStorage.getItem("ua-de-guest-question-used") === "1") {
      status.textContent = "Первый бесплатный ответ уже использован. Создайте кабинет, чтобы продолжить.";
      guestLeadCapture.hidden = false;
      guestLeadCapture.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const transferQuestion = window.uaDeCloud?.configured && !guest
      ? await window.uaDeLocalDocument?.reviewForTransfer(question) : question;
    if (!transferQuestion) return;

    const button = document.querySelector("#askGuestQuestion");
    const label = button.querySelector("span:first-child");
    button.disabled = true;
    label.textContent = guestCopy("analyzing");
    status.textContent = guest ? "Готовим первый ориентир на вашем устройстве…" : guestCopy("matchingSources");

    try {
      let payload;
      if (guest) {
        payload = { answer: window.uaDeGuestPreview(question, guestLanguage()) };
        localStorage.setItem("ua-de-guest-question-used", "1");
      } else if (window.uaDeCloud?.configured) {
        await window.uaDeSourceRefresh;
        payload = await window.uaDeCloud.invoke("question", {
          question: transferQuestion,
          language: document.querySelector("#languageSelect")?.value || "ru",
        });
      } else {
        const response = await fetch("/api/guest/question", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, question, language: guestLanguage() }),
        });
        payload = await response.json();
        if (!response.ok) throw new Error(payload.error || guestCopy("answerFailed"));
      }
      status.textContent = "";
      const freshness = document.querySelector("#guestSourceFreshness");
      if (freshness) freshness.textContent = guest
        ? "Первичный ориентир · источники требуют проверки"
        : "С официальными источниками";
      renderAnswer(payload.answer);
    } catch (error) {
      status.textContent = error.message;
      if (String(error.message).includes("уже использован")) {
        guestLeadCapture.hidden = false;
        guestLeadCapture.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } finally {
      button.disabled = false;
      label.textContent = guestCopy("firstAnswer");
    }
  });

  document.querySelectorAll("[data-question-register]").forEach((button) => {
    button.addEventListener("click", () => {
      guestLeadCapture.hidden = false;
      guestLeadCapture.dataset.source = "question";
      guestLeadCapture.scrollIntoView({ behavior: "smooth", block: "center" });
      guestLeadForm?.querySelector('input[name="email"]')?.focus({ preventScroll: true });
    });
  });

  guestLeadForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!guestLeadForm.reportValidity()) return;

    const formData = new FormData(guestLeadForm);
    const submit = guestLeadForm.querySelector('button[type="submit"]');
    const label = submit.querySelector("span:first-child");
    const leadStatus = document.querySelector("#guestLeadStatus");
    submit.disabled = true;
    label.textContent = guestCopy("creatingAccount");
    leadStatus.textContent = guestCopy("savingCredits");

    try {
      if (!window.uaDeCloud?.configured) throw new Error("Регистрация пока не подключена к Supabase.");
      if (formData.get("password") !== formData.get("confirm_password")) throw new Error("Пароли не совпадают.");
      await window.uaDeCloud.signUp(String(formData.get("email")).trim().toLowerCase(), String(formData.get("password")), {
        display_name: String(formData.get("display_name")).trim(),
        preferred_language: guestLanguage(),
        federal_state: String(formData.get("federal_state") || "").trim(),
        lead_goal: String(formData.get("lead_goal")),
        lead_source: guestLeadCapture.dataset.source || "welcome",
        account_consent: formData.get("account_consent") === "on",
        updates_consent: formData.get("updates_consent") === "on",
      });
      leadStatus.textContent = "Если адрес доступен для регистрации, письмо отправлено. Подтвердите почту по ссылке, затем войдите с паролем.";
    } catch (error) {
      leadStatus.textContent = error.message;
      submit.disabled = false;
      label.textContent = guestCopy("createAccount");
    }
  });
})();
