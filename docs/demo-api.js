/* Static demo adapter; when configured, authenticated state is stored per user in Supabase. */
(() => {
  const cloud = window.uaDeCloud;
  window.uaDeStaticDemo = !cloud?.configured;
  document.body.classList.toggle("cloud-enabled", !!cloud?.configured);
  const nativeFetch = window.fetch.bind(window);
  const fixturePromise = nativeFetch("./demo-fixtures.json").then((response) => {
    if (!response.ok) throw new Error("Demo fixtures unavailable");
    return response.json();
  });
  let onboarding = null;
  let lastDocumentAnalysis = null;
  let currentSources = [];
  window.uaDeSourceRefresh?.then((result) => { currentSources = result.sources || []; }).catch(() => {});
  async function loadState() {
    const fixture = structuredClone(await fixturePromise);
    if (!cloud?.configured) return fixture;
    await cloud.ready;
    if (!cloud.user) return fixture;
    const saved = await cloud.getState();
    if (saved && Object.keys(saved).length) {
      onboarding = saved.onboarding || null;
      return { ...fixture, ...saved, region_details: fixture.region_details, regions: fixture.regions };
    }
    fixture.cases = [];
    fixture.case_details = {};
    fixture.deadlines = [];
    fixture.dashboard.active_cases = [];
    fixture.dashboard.actions = [];
    fixture.dashboard.waiting = [];
    fixture.dashboard.nearest_deadline = null;
    fixture.profile = { preferred_language: cloud.user.user_metadata?.preferred_language || "ru",
      federal_state: cloud.user.user_metadata?.federal_state || "", city: "",
      arrival_date: null, completion_percent: 0 };
    return fixture;
  }
  let statePromise = loadState();
  window.addEventListener("ua-de:authchange", () => { statePromise = loadState(); });

  const banner = document.createElement("div");
  banner.className = "demo-banner";
  banner.setAttribute("role", "note");
  document.querySelector(".app-shell")?.prepend(banner);
  const notice = {
    ru: cloud?.configured
      ? "<strong>Тестовая версия.</strong> Проверяйте сроки и требования по оригиналу письма и сайту ведомства. Вход защищён подтверждением почты."
      : "<strong>Публичная демоверсия.</strong> Дела и профиль вымышлены. OCR работает в браузере. Регистрация, живой ИИ и онлайн-проверка источников пока не подключены. Не вводите личные данные.",
    uk: cloud?.configured
      ? "<strong>Тестова версія.</strong> Перевіряйте строки й вимоги за оригіналом листа та сайтом відомства. Вхід підтверджується поштою."
      : "<strong>Публічна демоверсія.</strong> Справи й профіль вигадані. OCR працює в браузері. Реєстрація, ШІ та онлайн-перевірка джерел ще не підключені. Не вводьте особисті дані.",
    de: cloud?.configured
      ? "<strong>Testversion.</strong> Prüfen Sie Fristen und Anforderungen am Originalschreiben und bei der Behörde. Der Zugang wird per E-Mail bestätigt."
      : "<strong>Öffentliche Demo.</strong> Fälle und Profil sind erfunden. OCR läuft im Browser. Registrierung, KI und Online-Quellenprüfung sind noch nicht angeschlossen. Keine persönlichen Daten eingeben.",
    en: cloud?.configured
      ? "<strong>Test version.</strong> Check deadlines and requirements against the original letter and authority website. Access is confirmed by email."
      : "<strong>Public demo.</strong> Cases and profile are fictional. OCR runs in the browser. Registration, live AI and online source checks are not connected yet. Do not enter personal data.",
  };
  const updateBanner = () => {
    banner.innerHTML = notice[document.querySelector("#languageSelect")?.value] || notice.ru;
  };
  updateBanner();
  window.addEventListener("ua-de:languagechange", updateBanner);
  document.querySelector("#languageSelect")?.addEventListener("change", updateBanner);

  const reply = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  const routeFor = (answers) => {
    const needsHousing = answers.housing === "none" || answers.funding === "none";
    const independent = answers.funding === "full";
    const fop = Boolean(answers.has_ukrainian_fop) || (answers.goals || []).includes("business");
    const arrival_track = needsHousing ? {
      title: "Сначала обеспечьте безопасное размещение",
      label: "Официальный центр прибытия и размещения",
      description: "Уточните проверенную точку прибытия и наличие мест непосредственно перед поездкой.",
    } : {
      title: "Можно начинать с выбранного места проживания",
      label: "Самостоятельное размещение",
      description: "После жилья проверьте регистрацию адреса и порядок обращения в Ausländerbehörde.",
    };
    let authority_track;
    if (independent) {
      authority_track = fop ? {
        title: "Основная линия: регистрация, страхование и налоги",
        label: "Самостоятельный маршрут и налоговый модуль",
        description: "Иностранные доходы и украинский ФОП требуют отдельной проверки специалистом.",
      } : {
        title: "Основная линия: регистрация и выбранная форма интеграции",
        label: "Самостоятельный маршрут",
        description: "Уточните условия для работы, учёбы или другого выбранного направления.",
      };
    } else if (["retirement", "limited"].includes(answers.work_capacity)) {
      authority_track = {
        title: "Предварительная точка обращения: Sozialamt",
        label: "Sozialamt",
        description: "Ведомство отдельно оценивает состав семьи, доход и трудоспособность.",
      };
    } else if (answers.work_capacity === "able") {
      authority_track = {
        title: "Предварительная точка обращения: Jobcenter",
        label: "Jobcenter",
        description: "Дата въезда, статус пребывания, доход и состав семьи могут изменить маршрут.",
      };
    } else {
      authority_track = {
        title: "Сначала уточните источник содержания и трудоспособность",
        label: "Нужно уточнение",
        description: "Без этих данных нельзя выбрать ведомство.",
      };
    }
    const goals = new Set(answers.goals || []);
    const goalCopy = {
      work: ["Работа", "Проверьте право на работу, язык и признание квалификации."],
      study: ["Университет", "Уточните условия поступления, финансирования и статуса пребывания."],
      ausbildung: ["Ausbildung", "Уточните требования к языку, договору и профессии."],
      family: ["Семья", "Условия зависят от состава семьи и статуса её членов."],
      business: ["Предпринимательство", "Отдельно проверьте доходы, регистрацию и страхование."],
      safety: ["Временная защита", "Проверьте действующие правила и документы."],
      unknown: ["Выбор направления", "Уточните цели у консультационного центра."],
    };
    if (answers.family && answers.family !== "alone") goals.add("family");
    return {
      version: "static-demo-1",
      arrival_track,
      authority_track,
      integration_tracks: [...goals].filter((goal) => goalCopy[goal]).map((goal) => ({
        id: goal, label: goalCopy[goal][0], description: goalCopy[goal][1],
      })),
      next_steps: [
        { title: "Проверьте официальную информацию", description: "Эта демоверсия не проверяет действующие правила и наличие мест." },
        { title: "Соберите исходные документы", description: "Подтвердите статус, адрес, семейный состав и финансовую ситуацию." },
        { title: "Уточните порядок в выбранном ведомстве", description: "Проверьте актуальные условия перед подачей заявления." },
      ],
      source_freshness: cloud?.configured && currentSources.length && currentSources.every((source) => source.status === "verified_online")
        ? "fresh" : "review_required",
      sources: cloud?.configured ? currentSources : [],
      notice: cloud?.configured
        ? "Маршрут предварительный. Официальные страницы проверены на доступность; условия и сроки нужно сверить перед обращением в ведомство."
        : "Это демонстрационный маршрут, не решение ведомства. Источники и сроки в облачной демоверсии не проверяются.",
    };
  };

  const dashboard = (state) => {
    state.dashboard.summary.active_cases = state.cases.filter((item) => !["closed", "resolved", "archived"].includes(item.status)).length;
    state.dashboard.summary.waiting_cases = state.cases.filter((item) => item.status === "waiting").length;
    state.dashboard.summary.profile_completion = state.profile.completion_percent;
    state.dashboard.active_cases = state.cases.filter((item) => !["closed", "resolved", "archived"].includes(item.status)).slice(0, 4);
    state.dashboard.actions = state.cases.filter((item) => !["closed", "resolved", "archived", "waiting", "sent"].includes(item.status)).slice(0, 4);
    state.dashboard.waiting = state.cases.filter((item) => ["waiting", "sent"].includes(item.status)).slice(0, 4);
    const confirmed = state.deadlines.filter((item) => item.status === "active" && item.confirmed_by_user);
    confirmed.sort((a, b) => a.due_at.localeCompare(b.due_at));
    state.dashboard.nearest_deadline = confirmed[0] || null;
    state.dashboard.summary.confirmed_deadlines = confirmed.length;
    return state.dashboard;
  };
  const syncCase = (state, detail) => {
    const row = state.cases.find((item) => item.id === detail.id);
    if (row) Object.assign(row, { status: detail.status, risk_level: detail.risk_level,
      next_action: detail.next_action, deadline: detail.deadline,
      confirmed_by_user: detail.confirmed_by_user, document_count: detail.documents.length,
      document_names: detail.documents.map((item) => item.file_name).join(" "), updated_at: new Date().toISOString() });
  };

  const analyze = (text, language = document.querySelector("#languageSelect")?.value || "ru") => {
    const lower = text.toLowerCase();
    const activationLetter = /freischaltcode|aktivierungscode/i.test(text) && /tk-app|meine tk/i.test(text);
    const local = {
      ru: { code: "Введите код активации в приложении или на сайте TK. Это не срок ответа на письмо.", check: "Проверьте письмо", summary: "Это информационное письмо от медицинской кассы. Ответ не требуется.", dated: "Возможный срок ответа требует подтверждения.", undated: "Явный срок ответа не найден." },
      uk: { code: "Введіть код активації в застосунку або на сайті TK. Це не строк відповіді на лист.", check: "Перевірте лист", summary: "Це інформаційний лист від медичної каси. Відповідь не потрібна.", dated: "Можливий строк відповіді треба підтвердити.", undated: "Чіткого строку відповіді не знайдено." },
      de: { code: "Geben Sie den Aktivierungscode in der TK-App oder auf der TK-Website ein. Dies ist keine Antwortfrist.", check: "Schreiben prüfen", summary: "Dies ist ein Informationsschreiben der Krankenkasse. Eine Antwort ist nicht erforderlich.", dated: "Eine mögliche Antwortfrist muss geprüft werden.", undated: "Keine ausdrückliche Antwortfrist gefunden." },
      en: { code: "Enter the activation code in the TK app or website. This is not a deadline to reply.", check: "Review the letter", summary: "This is an information letter from the health insurer. No reply is required.", dated: "A possible reply deadline needs confirmation.", undated: "No explicit reply deadline was found." },
    }[language] || null;
    const authority_type = lower.includes("jobcenter") ? "jobcenter" : lower.includes("finanzamt") ? "finanzamt" : lower.includes("krankenkasse") ? "krankenkasse" : "other";
    const authority_name = { jobcenter: "Jobcenter", finanzamt: "Finanzamt", krankenkasse: "Krankenkasse", other: "Ведомство не определено" }[authority_type];
    const ref = text.match(/(?:Aktenzeichen|BG-Nummer|Kundennummer)\s*:\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const lines = text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const cue = /\b(?:bis zum|spätestens|frist|antwortfrist)\b/i;
    const datePattern = /(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/g;
    const line = lines.find((item) => cue.test(item) && [...item.matchAll(datePattern)].some((match) => match.index >= cue.exec(item).index));
    const dateMatch = line && [...line.matchAll(datePattern)].find((match) => match.index >= cue.exec(line).index);
    const due = !activationLetter && dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}` : null;
    const docs = [["Kontoauszüge", /kontoausz[üu]ge|kontoauszug/i], ["Mietvertrag", /mietvertrag/i],
      ["Meldebescheinigung", /meldebescheinigung/i], ["Einkommensnachweise", /einkommensnachweis/i],
      ["Immatrikulationsbescheinigung", /immatrikulationsbescheinigung/i]];
    const required_documents = [];
    const requirement_sources = {};
    for (const clause of lines.flatMap((item) => item.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/))) {
      if (!/\b(?:bitte|reichen sie|legen sie|senden sie|erforderlich|einzureichen|vorzulegen)\b/i.test(clause) ||
          /\b(?:nicht erforderlich|nicht benötigt|nicht einzureichen|nicht vorzulegen)\b/i.test(clause)) continue;
      for (const [name, pattern] of docs) {
        if (pattern.test(clause) && !required_documents.includes(name)) { required_documents.push(name); requirement_sources[name] = clause.slice(0, 350); }
      }
    }
    const letterDateMatch = lines.find((item) => /\b(?:datum|schreiben vom)\b/i.test(item))?.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
    const letter_date = letterDateMatch ? `${letterDateMatch[3]}-${letterDateMatch[2].padStart(2, "0")}-${letterDateMatch[1].padStart(2, "0")}` : null;
    return {
      provider: "static_demo_rules", authority_type, authority_name, reference_number: ref,
      sender: lines[0] || authority_name, letter_date, requirement_sources,
      document_type: /mitwirkung/i.test(text) ? "Aufforderung zur Mitwirkung" : "Schreiben / Bescheid",
      category: authority_type, risk_level: due ? "red" : required_documents.length ? "yellow" : "green",
      required_documents: activationLetter ? [] : required_documents,
      requires_reply: !activationLetter && required_documents.length > 0,
      native_reply_draft: "", full_translation: "", needs_specialist: false, specialist_question: "",
      next_action: activationLetter ? local.code : local.check,
      deadline: { extracted_due_at: due, source_text: line || null, confidence: due ? 0.7 : 0 },
      summary: activationLetter ? local.summary : `${authority_name}. ${due ? local.dated : local.undated}`,
      limitations: "Это локальный демонстрационный разбор, не юридическое заключение.",
    };
  };
  const matchesFor = (state, analysis) => state.cases.filter((item) => item.authority_type === analysis.authority_type && item.status !== "closed")
    .filter((item) => !analysis.reference_number || !item.reference_number || item.reference_number === analysis.reference_number)
    .map((item) => ({ case_id: item.id, title: item.title, authority_name: item.authority_name,
      score: item.reference_number && item.reference_number === analysis.reference_number ? 0.97 : 0.55,
      reason: item.reference_number && item.reference_number === analysis.reference_number ? "Номер дела совпадает" : "Совпадает ведомство — проверьте вручную" }));

  async function handleApi(path, options = {}) {
    const state = await statePromise;
    const method = (options.method || "GET").toUpperCase();
    let body = {};
    if (options.body && typeof options.body === "string") {
      try { body = JSON.parse(options.body); } catch { body = {}; }
    }
    if (cloud?.configured && !cloud.user &&
        /^\/api\/(dashboard|cases|deadlines|profile|checklist|documents\/attach)/.test(path)) {
      return reply({ ok: false, error: "Войдите в личный кабинет." }, 401);
    }
    async function run() {
    if (path === "/api/dashboard" && method === "GET") return reply({ ok: true, dashboard: dashboard(state) });
    if (path === "/api/cases" && method === "GET") return reply({ ok: true, cases: state.cases });
    if (path === "/api/documents/analyze" && method === "POST") {
      const analysis = cloud?.configured && cloud.user
        ? (await cloud.invoke("document", { text: body.text || "", language: document.querySelector("#languageSelect")?.value || "ru" })).analysis
        : analyze(body.text || "");
      if (cloud?.configured && cloud.user) lastDocumentAnalysis = { text: body.text, analysis };
      return reply({ ok: true, analysis, matches: matchesFor(state, analysis) });
    }
    if (path === "/api/reply/translate" && method === "POST") {
      if (body.approved !== true || !String(body.text || "").trim()) return reply({ ok: false, error: "Подтвердите текст ответа перед переводом." }, 400);
      if (!cloud?.configured || !cloud.user) return reply({ ok: false, error: "Перевод доступен после входа в кабинет." }, 401);
      const result = await cloud.invoke("translate_reply", { text: body.text, language: body.language || "ru", approved: true });
      return reply({ ok: true, reply: result.reply });
    }
    if (path === "/api/documents/attach" && method === "POST") {
      const analysis = cloud?.configured
        ? lastDocumentAnalysis?.text === body.text ? lastDocumentAnalysis.analysis
          : (await cloud.invoke("document", { text: body.text || "", language: document.querySelector("#languageSelect")?.value || "ru" })).analysis
        : analyze(body.text || "");
      let detail = body.case_id ? state.case_details[body.case_id] : null;
      if (body.case_id && !detail) return reply({ ok: false, error: "Case not found" }, 404);
      if (detail && detail.authority_type !== analysis.authority_type)
        return reply({ ok: false, error: "Letter authority does not match case" }, 409);
      if (detail?.reference_number && analysis.reference_number && detail.reference_number !== analysis.reference_number)
        return reply({ ok: false, error: "Letter reference does not match case" }, 409);
      if (!detail) {
        const id = `demo-case-${Date.now()}`;
        detail = { id, user_id: cloud?.configured ? cloud.user.id : "user-demo", title: `${analysis.authority_name} · ${analysis.document_type}`,
          authority_type: analysis.authority_type, authority_name: analysis.authority_name,
          reference_number: analysis.reference_number, status: "new", risk_level: analysis.risk_level,
          next_action: analysis.next_action, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          events: [], documents: [], deadlines: [], checklist: [], drafts: [] };
        state.cases.unshift(detail);
        state.case_details[id] = detail;
      }
      detail.status = "action_required";
      detail.risk_level = analysis.risk_level;
      detail.next_action = analysis.next_action;
      detail.ai_summary = analysis.summary;
      const sourceType = body.mime_type === "application/pdf" ? "pdf" :
        String(body.mime_type || "").startsWith("image/") ? "image" : "text";
      const savedDocument = cloud?.configured ? await cloud.saveDocument({
        caseId: detail.id, sourceType, redactedText: body.text, analysis,
      }) : null;
      const documentId = savedDocument?.id || `demo-doc-${Date.now()}`;
      detail.documents.unshift({ id: documentId, case_id: detail.id, file_name: body.file_name || "Вставленный текст",
        document_type: analysis.document_type, processing_status: "analyzed", analysis_json: analysis,
        extracted_text: cloud?.configured ? null : body.text, created_at: savedDocument?.created_at || new Date().toISOString() });
      detail.events.unshift({ id: `demo-event-${Date.now()}`, case_id: detail.id, event_type: "document_analyzed",
        summary: "Документ разобран", details: body.file_name || "Вставленный текст", document_id: documentId,
        occurred_at: new Date().toISOString() });
      for (const title of analysis.required_documents) {
        if (!detail.checklist.some((item) => item.title === title)) detail.checklist.push({ id: `demo-check-${Date.now()}-${title}`, case_id: detail.id, title, completed: 0 });
      }
      if (analysis.deadline.extracted_due_at) {
        const deadline = { id: `demo-deadline-${Date.now()}`, case_id: detail.id, document_id: documentId,
          due_at: analysis.deadline.extracted_due_at, extracted_due_at: analysis.deadline.extracted_due_at,
          source_snippet: analysis.deadline.source_text, confidence: analysis.deadline.confidence,
          action: analysis.next_action, confirmed_by_user: 0, reminder_settings: {}, status: "needs_confirmation",
          case_title: detail.title };
        detail.deadlines.push(deadline);
        state.deadlines.push(deadline);
        detail.deadline = deadline.due_at;
        detail.confirmed_by_user = 0;
      }
      syncCase(state, detail);
      return reply({ ok: true, case: detail, analysis }, 201);
    }
    if (path === "/api/deadlines" && method === "GET") return reply({ ok: true, deadlines: state.deadlines });
    if (path === "/api/profile" && method === "GET") return reply({ ok: true, profile: state.profile });
    if (path === "/api/profile" && method === "PATCH") {
      Object.assign(state.profile, body);
      return reply({ ok: true, profile: state.profile });
    }
    if (path === "/api/regions" && method === "GET") return reply({ ok: true, regions: state.regions });
    if (path.startsWith("/api/regions/") && method === "GET") {
      const region = state.region_details[decodeURIComponent(path.slice(13))];
      return region ? reply({ ok: true, region }) : reply({ ok: false, error: "Region not found" }, 404);
    }
    if (path === "/api/onboarding" && method === "GET") return reply({ ok: true, onboarding });
    if (path === "/api/onboarding/route" && method === "POST") {
      const route = routeFor(body.answers || {});
      onboarding = { answers: body.answers || {}, route_result: route };
      return reply({ ok: true, route, onboarding });
    }
    if (path === "/api/official-sources" && method === "GET") return reply(cloud?.configured
      ? await window.uaDeSourceRefresh : { ok: true, sources: [] });
    if (path === "/api/official-sources/refresh" && method === "POST") {
      const result = cloud?.configured ? await cloud.invoke("sources") : { sources: [] };
      currentSources = result.sources || [];
      window.uaDeSourceRefresh = Promise.resolve(result);
      return reply({ ok: true, sources: result.sources, route: onboarding ? routeFor(onboarding.answers) : null });
    }
    if (path === "/api/guest/question" && method === "POST") {
      return reply({ ok: true, answer: {
        summary: "Демонстрационный ответ: живой ИИ-помощник на этой странице не подключён.",
        caution: "Не используйте этот пример для решения реального административного вопроса.",
        steps: ["Опишите ситуацию без личных данных.", "Проверьте актуальные сведения на сайте ведомства.", "При сложном случае обратитесь к профильному специалисту."],
        documents: [], clarifying_questions: [], sources: [],
      }, remaining_guest_questions: 0, questions_after_registration: 0 });
    }
    if (path === "/api/leads/register" && method === "POST") {
      return reply({ ok: false, error: "Регистрация недоступна в публичной демоверсии." }, 503);
    }
    if (path === "/api/extract" && method === "POST") {
      return reply({ ok: false, error: "Файл обрабатывается только на устройстве клиента." }, 410);
    }
    const deadlineMatch = path.match(/^\/api\/deadlines\/([^/]+)$/);
    if (deadlineMatch && method === "PATCH") {
      const deadline = state.deadlines.find((item) => item.id === deadlineMatch[1]);
      if (!deadline) return reply({ ok: false, error: "Deadline not found" }, 404);
      Object.assign(deadline, body);
      if (body.confirmed_by_user) {
        deadline.confirmed_due_at = body.due_at;
        deadline.status = "active";
        deadline.reminder_settings = { days_before: [7, 3, 1, 0], channel: "in_app" };
        const detail = state.case_details[deadline.case_id];
        detail.confirmed_by_user = 1;
        detail.deadline = deadline.due_at;
        syncCase(state, detail);
      }
      return reply({ ok: true, deadline });
    }
    const draftSent = path.match(/^\/api\/cases\/([^/]+)\/drafts\/([^/]+)\/sent$/);
    if (draftSent && method === "POST") {
      const detail = state.case_details[draftSent[1]];
      const draft = detail?.drafts?.find((item) => item.id === draftSent[2]);
      if (!draft) return reply({ ok: false, error: "Draft not found" }, 404);
      if (!draft.approved_local_at || !draft.german_text?.trim())
        return reply({ ok: false, error: "Сначала подтвердите ответ на своём языке и переведите его." }, 400);
      draft.sent_at = body.sent_at;
      draft.sent_via = body.sent_via;
      draft.sent_proof = (body.sent_proof || "").slice(0, 500);
      if (body.german_text) draft.german_text = body.german_text;
      detail.status = "waiting";
      detail.next_action = "Ожидать ответ ведомства";
      detail.deadlines.filter((item) => item.status === "active" && item.confirmed_by_user).forEach((item) => { item.status = "completed"; });
      syncCase(state, detail);
      detail.events.unshift({ id: `demo-event-${Date.now()}`, occurred_at: body.sent_at,
        summary: "Ответ отправлен", details: body.sent_via, event_type: "reply_sent" });
      return reply({ ok: true, case: detail });
    }
    const draftMatch = path.match(/^\/api\/cases\/([^/]+)\/drafts$/);
    if (draftMatch && method === "POST") {
      const detail = state.case_details[draftMatch[1]];
      if (!detail) return reply({ ok: false, error: "Case not found" }, 404);
      const attachments = body.answers?.available_documents || [];
      if (!Array.isArray(attachments) || attachments.some((name) => !detail.checklist.some((item) => item.title === name)))
        return reply({ ok: false, error: "Attachments must be selected from case checklist" }, 400);
      const statement = attachments.length
        ? `in Antwort auf Ihr Schreiben übersende ich ausschließlich die folgenden vorhandenen Unterlagen:\n\nAnlagen: ${attachments.join(", ")}.`
        : "in Antwort auf Ihr Schreiben teile ich mit, dass ich derzeit keine Unterlagen beifügen kann.";
      let german_text = "";
      let local_text = "Демонстрационный черновик. Проверьте приложения и данные перед переводом.";
      if (cloud?.configured && detail.documents?.[0]) {
        const saved = await cloud.getDocument(detail.documents[0].id);
        if (saved.case_id !== detail.id) return reply({ ok: false, error: "Документ не принадлежит этому делу." }, 403);
        const result = await cloud.invoke("reply", {
          text: saved.redacted_text, available_documents: attachments, language: body.language || "ru",
        });
        local_text = result.reply.local_text;
      }
      if (!local_text.trim()) return reply({ ok: false, error: "В этом письме ответ не требуется." }, 400);
      const draft = { id: `demo-draft-${Date.now()}`, german_text,
        local_text,
        language: body.language || "ru", created_at: new Date().toISOString() };
      detail.drafts ||= [];
      detail.drafts.unshift(draft);
      detail.status = "drafting_reply";
      syncCase(state, detail);
      detail.events.unshift({ id: `demo-event-${Date.now()}`, occurred_at: draft.created_at,
        summary: "Черновик ответа создан", event_type: "draft_created" });
      return reply({ ok: true, case: detail }, 201);
    }
    const translateDraft = path.match(/^\/api\/cases\/([^/]+)\/drafts\/([^/]+)\/translate$/);
    if (translateDraft && method === "POST") {
      const detail = state.case_details[decodeURIComponent(translateDraft[1])];
      const draft = detail?.drafts?.find((item) => item.id === decodeURIComponent(translateDraft[2]));
      if (!draft) return reply({ ok: false, error: "Черновик не найден." }, 404);
      if (draft.sent_at || body.approved !== true || !String(body.local_text || "").trim())
        return reply({ ok: false, error: "Проверьте и подтвердите текст на своём языке." }, 400);
      const result = cloud?.configured && cloud.user
        ? await cloud.invoke("translate_reply", { text: body.local_text, language: draft.language, approved: true })
        : { reply: { german_text: "[Демонстрация] Перевод недоступен." } };
      draft.local_text = body.local_text;
      draft.german_text = result.reply.german_text;
      draft.approved_local_at = new Date().toISOString();
      syncCase(state, detail);
      return reply({ ok: true, case: detail, draft });
    }
    const caseEvent = path.match(/^\/api\/cases\/([^/]+)\/events$/);
    if (caseEvent && method === "POST") {
      const detail = state.case_details[decodeURIComponent(caseEvent[1])];
      if (!detail) return reply({ ok: false, error: "Case not found" }, 404);
      const event = { id: `demo-event-${Date.now()}`, case_id: detail.id, occurred_at: new Date().toISOString(), document_id: null, ...body };
      detail.events.unshift(event);
      return reply({ ok: true, event }, 201);
    }
    const caseMatch = path.match(/^\/api\/cases\/([^/]+)$/);
    if (caseMatch && method === "GET") {
      const detail = state.case_details[decodeURIComponent(caseMatch[1])];
      return detail ? reply({ ok: true, case: detail }) : reply({ ok: false, error: "Case not found" }, 404);
    }
    const checklistMatch = path.match(/^\/api\/checklist\/([^/]+)$/);
    if (checklistMatch && method === "PATCH") {
      const item = Object.values(state.case_details).flatMap((item) => item.checklist).find((item) => item.id === decodeURIComponent(checklistMatch[1]));
      if (!item) return reply({ ok: false, error: "Item not found" }, 404);
      item.completed = body.completed ? 1 : 0;
      return reply({ ok: true, item });
    }
    return reply({ ok: false, error: "Функция недоступна в публичной демоверсии." }, 503);
    }
    const response = await run();
    if (cloud?.configured && cloud.user && response.ok && method !== "GET" &&
        !["/api/documents/analyze", "/api/official-sources/refresh"].includes(path)) {
      state.onboarding = onboarding;
      await cloud.saveState(state);
    }
    return response;
  }

  window.fetch = (input, options) => {
    const path = new URL(typeof input === "string" ? input : input.url, location.href).pathname;
    return path.startsWith("/api/") ? handleApi(path, options) : nativeFetch(input, options);
  };
})();
