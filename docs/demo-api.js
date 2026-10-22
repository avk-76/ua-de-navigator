/* Static showcase adapter. No visitor data is sent to an API or stored on a server. */
(() => {
  window.uaDeStaticDemo = true;
  const nativeFetch = window.fetch.bind(window);
  const fixturePromise = nativeFetch("./demo-fixtures.json").then((response) => {
    if (!response.ok) throw new Error("Demo fixtures unavailable");
    return response.json();
  });
  let statePromise = fixturePromise.then((data) => structuredClone(data));
  let onboarding = null;

  const banner = document.createElement("div");
  banner.className = "demo-banner";
  banner.setAttribute("role", "note");
  document.querySelector(".app-shell")?.prepend(banner);
  const notice = {
    ru: "<strong>Публичная демоверсия.</strong> Дела и профиль вымышлены. Изменения видны только в этой вкладке. Регистрация, ИИ, OCR и проверка официальных источников не подключены. Не вводите личные данные.",
    uk: "<strong>Публічна демоверсія.</strong> Справи й профіль вигадані. Зміни видно лише в цій вкладці. Реєстрація, ШІ, OCR та перевірка офіційних джерел не підключені. Не вводьте особисті дані.",
    de: "<strong>Öffentliche Demo.</strong> Fälle und Profil sind erfunden. Änderungen gelten nur in diesem Tab. Registrierung, KI, OCR und Prüfung amtlicher Quellen sind nicht angeschlossen. Keine persönlichen Daten eingeben.",
    en: "<strong>Public demo.</strong> Cases and profile are fictional. Changes last only in this tab. Registration, AI, OCR and official source checks are not connected. Do not enter personal data.",
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
      source_freshness: "review_required",
      sources: [],
      notice: "Это демонстрационный маршрут, не решение ведомства. Источники и сроки в облачной демоверсии не проверяются.",
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

  const analyze = (text) => {
    const lower = text.toLowerCase();
    const authority_type = lower.includes("jobcenter") ? "jobcenter" : lower.includes("finanzamt") ? "finanzamt" : lower.includes("krankenkasse") ? "krankenkasse" : "other";
    const authority_name = { jobcenter: "Jobcenter", finanzamt: "Finanzamt", krankenkasse: "Krankenkasse", other: "Ведомство не определено" }[authority_type];
    const ref = text.match(/(?:Aktenzeichen|BG-Nummer|Kundennummer)\s*:\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const lines = text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const cue = /\b(?:bis zum|spätestens|frist|antwortfrist)\b/i;
    const datePattern = /(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/g;
    const line = lines.find((item) => cue.test(item) && [...item.matchAll(datePattern)].some((match) => match.index >= cue.exec(item).index));
    const dateMatch = line && [...line.matchAll(datePattern)].find((match) => match.index >= cue.exec(line).index);
    const due = dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}` : null;
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
      required_documents, next_action: required_documents.length ? "Требуемые документы проверить и подготовить" : "Проверить письмо",
      deadline: { extracted_due_at: due, source_text: line || null, confidence: due ? 0.7 : 0 },
      summary: `Письмо от ${authority_name}. ${due ? "Возможный срок требует подтверждения." : "Явный срок не найден."}`,
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
    if (path === "/api/dashboard" && method === "GET") return reply({ ok: true, dashboard: dashboard(state) });
    if (path === "/api/cases" && method === "GET") return reply({ ok: true, cases: state.cases });
    if (path === "/api/documents/analyze" && method === "POST") {
      const analysis = analyze(body.text || "");
      return reply({ ok: true, analysis, matches: matchesFor(state, analysis) });
    }
    if (path === "/api/documents/attach" && method === "POST") {
      const analysis = analyze(body.text || "");
      let detail = body.case_id ? state.case_details[body.case_id] : null;
      if (body.case_id && !detail) return reply({ ok: false, error: "Case not found" }, 404);
      if (detail && detail.authority_type !== analysis.authority_type)
        return reply({ ok: false, error: "Letter authority does not match case" }, 409);
      if (detail?.reference_number && analysis.reference_number && detail.reference_number !== analysis.reference_number)
        return reply({ ok: false, error: "Letter reference does not match case" }, 409);
      if (!detail) {
        const id = `demo-case-${Date.now()}`;
        detail = { id, user_id: "user-demo", title: `${analysis.authority_name} · ${analysis.document_type}`,
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
      const documentId = `demo-doc-${Date.now()}`;
      detail.documents.unshift({ id: documentId, case_id: detail.id, file_name: body.file_name || "Вставленный текст",
        document_type: analysis.document_type, processing_status: "analyzed", analysis_json: analysis,
        extracted_text: body.text, created_at: new Date().toISOString() });
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
    if (path === "/api/official-sources" && method === "GET") return reply({ ok: true, sources: [] });
    if (path === "/api/official-sources/refresh" && method === "POST") {
      return reply({ ok: true, sources: [], route: onboarding ? routeFor(onboarding.answers) : null });
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
      const file = options.body?.get?.("file");
      if (!file) return reply({ ok: false, message: "Файл не выбран." }, 400);
      if (!/\.txt$/i.test(file.name)) {
        return reply({ ok: false, message: "В облачной демоверсии можно открыть только TXT. PDF и OCR доступны в локальном прототипе." });
      }
      return reply({ ok: true, text: await file.text(), message: `Текст ${file.name} открыт только в этом браузере.` });
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
      const german_text = `Betreff: Ihr Schreiben / Aktenzeichen ${detail.reference_number || "[eintragen]"}\n\nSehr geehrte Damen und Herren,\n\n${statement}\n\nBitte bestätigen Sie den Eingang.\n\nMit freundlichen Grüßen\n[Name eintragen]`;
      const draft = { id: `demo-draft-${Date.now()}`, german_text,
        local_text: "Демонстрационный черновик. Проверьте приложения и данные перед отправкой.",
        language: body.language || "ru", created_at: new Date().toISOString() };
      detail.drafts ||= [];
      detail.drafts.unshift(draft);
      detail.status = "drafting_reply";
      syncCase(state, detail);
      detail.events.unshift({ id: `demo-event-${Date.now()}`, occurred_at: draft.created_at,
        summary: "Черновик ответа создан", event_type: "draft_created" });
      return reply({ ok: true, case: detail }, 201);
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

  window.fetch = (input, options) => {
    const path = new URL(typeof input === "string" ? input : input.url, location.href).pathname;
    return path.startsWith("/api/") ? handleApi(path, options) : nativeFetch(input, options);
  };
})();
