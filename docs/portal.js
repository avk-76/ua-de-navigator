const portalRoutes = new Set(["welcome", "home", "cases", "case", "deadlines", "profile", "document"]);
const portalViews = [...document.querySelectorAll(".app-view[data-view]")];
const portalRouteButtons = [...document.querySelectorAll("[data-route]")];
const portalState = {
  selectedCaseId: null,
  documentOriginCaseId: null,
  documentOriginRoute: "home",
  caseFilter: "all",
  documentFilter: "all",
  dashboard: null,
  cases: [],
  deadlines: [],
  profile: null,
  activeCase: null,
};

const statusCopy = {
  new: { label: "Новое", className: "waiting" },
  action_required: { label: "Требует действия", className: "action" },
  preparing_documents: { label: "Готовятся документы", className: "action" },
  drafting_reply: { label: "Готовится ответ", className: "action" },
  sent: { label: "Отправлено", className: "waiting" },
  waiting: { label: "Ожидается ответ", className: "waiting" },
  specialist_review: { label: "Нужна проверка", className: "review" },
  closed: { label: "Закрыто", className: "waiting" },
  needs_review: { label: "Нужно проверить", className: "review" },
  ready_to_send: { label: "Готово к отправке", className: "action" },
  additional_documents_requested: { label: "Запрошены документы", className: "action" },
  decision_received: { label: "Решение получено", className: "review" },
  appeal_possible: { label: "Можно обжаловать", className: "review" },
  resolved: { label: "Завершено", className: "waiting" },
  archived: { label: "В архиве", className: "waiting" },
};

const riskCopy = {
  green: {
    label: "Можно действовать самостоятельно",
    hint: "Похоже на стандартный случай без явных сложных факторов.",
    className: "green",
  },
  yellow: {
    label: "Нужна проверка",
    hint: "Черновик можно подготовить, но спорные места лучше проверить.",
    className: "yellow",
  },
  red: {
    label: "Высокий риск",
    hint: "Проверьте срок и последствия в оригинале. При сомнении обратитесь к специалисту.",
    className: "red",
  },
  expert: { label: "Нужен специалист", hint: "Передайте историю дела специалисту после проверки данных и отдельного согласия.", className: "red" },
};

function portalLanguage() {
  return window.uaDeI18n?.language || document.querySelector("#languageSelect")?.value || "ru";
}

function portalText(source) {
  return window.uaDeI18n?.t(String(source ?? "")) || String(source ?? "");
}

function portalCopy(key, values = {}) {
  const copy = {
    due: {
      ru: `до ${values.date}`,
      uk: `до ${values.date}`,
      de: `bis ${values.date}`,
      en: `by ${values.date}`,
    },
    created: {
      ru: `создано ${values.date}`,
      uk: `створено ${values.date}`,
      de: `erstellt am ${values.date}`,
      en: `created ${values.date}`,
    },
    checklistReady: {
      ru: `${values.completed} из ${values.total} документов отмечены как готовые.`,
      uk: `${values.completed} із ${values.total} документів позначено як готові.`,
      de: `${values.completed} von ${values.total} Dokumenten sind als fertig markiert.`,
      en: `${values.completed} of ${values.total} documents are marked as ready.`,
    },
    resultsCount: {
      ru: `${values.visible} из ${values.total}`,
      uk: `${values.visible} із ${values.total}`,
      de: `${values.visible} von ${values.total}`,
      en: `${values.visible} of ${values.total}`,
    },
    documentContext: {
      ru: `Новое письмо будет добавлено в дело «${values.title}»`,
      uk: `Новий лист буде додано до справи «${values.title}»`,
      de: `Das neue Schreiben wird dem Fall „${values.title}“ hinzugefügt`,
      en: `The new letter will be added to the case “${values.title}”`,
    },
  };
  return copy[key]?.[portalLanguage()] || copy[key]?.ru || "";
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

function navigatePortal(route, options = {}) {
  const targetRoute = portalRoutes.has(route) ? route : "welcome";
  if (window.uaDeAccount?.shouldGuard(targetRoute)) {
    window.uaDeAccount.openLogin();
    return;
  }
  const previousRoute = document.body.dataset.portalView || "welcome";
  if (targetRoute === "document" && previousRoute !== "document") {
    portalState.documentOriginCaseId = previousRoute === "case" ? portalState.selectedCaseId : null;
    portalState.documentOriginRoute = previousRoute === "welcome" ? "welcome" : "home";
  }
  if (targetRoute === "document") {
    const back = document.querySelector("#documentBackButton");
    if (back) {
      back.dataset.route = portalState.documentOriginCaseId ? "case" : portalState.documentOriginRoute;
      back.textContent = portalText(portalState.documentOriginCaseId ? "← Назад к делу" :
        portalState.documentOriginRoute === "welcome" ? "← К маршруту" : "← Кабинет");
    }
  }

  portalViews.forEach((view) => {
    const isTarget = view.dataset.view === targetRoute;
    view.hidden = !isTarget;
    view.classList.toggle("is-active", isTarget);
  });

  portalRouteButtons.forEach((button) => {
    const isActive = button.dataset.route === targetRoute ||
      (targetRoute === "case" && button.dataset.route === "cases") ||
      (targetRoute === "document" && button.dataset.route === "cases");
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  if (!options.fromHash) {
    history.replaceState(null, "", `#${targetRoute}`);
  }

  document.body.dataset.portalView = targetRoute;
  window.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });

  if (targetRoute === "case" && portalState.selectedCaseId &&
      portalState.activeCase?.id !== portalState.selectedCaseId) {
    loadCase(portalState.selectedCaseId);
  }
  if (targetRoute === "deadlines" && !portalState.deadlines.length) {
    loadDeadlines();
  }
  if (targetRoute === "profile" && !portalState.profile) {
    loadProfile();
  }
}

document.addEventListener("click", (event) => {
  const accountMenu = document.querySelector(".account-menu");
  if (accountMenu && !event.target.closest(".account-menu")) accountMenu.removeAttribute("open");
  const caseTarget = event.target.closest("[data-case-id]");
  if (caseTarget) {
    portalState.selectedCaseId = caseTarget.dataset.caseId;
    loadCase(portalState.selectedCaseId);
    navigatePortal("case");
    return;
  }

  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget) {
    accountMenu?.removeAttribute("open");
    navigatePortal(routeTarget.dataset.route);
  }
});

window.addEventListener("hashchange", () => {
  navigatePortal(location.hash.slice(1), { fromHash: true, instant: true });
});

document.querySelectorAll("[data-case-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    portalState.caseFilter = button.dataset.caseFilter;
    renderCases(portalState.cases);
  });
});
document.querySelector("#casesSearch")?.addEventListener("input", () => renderCases(portalState.cases));
document.querySelectorAll("[data-document-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    portalState.documentFilter = button.dataset.documentFilter;
    renderCaseDocuments(portalState.activeCase?.documents || []);
  });
});
document.querySelector("#caseDocumentsSearch")?.addEventListener("input", () =>
  renderCaseDocuments(portalState.activeCase?.documents || []));

document.querySelectorAll(".profile-nav button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".profile-nav button").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
  });
});

async function bootstrapPortal() {
  try {
    if (window.uaDeCloud?.configured) {
      await window.uaDeCloud.ready;
      if (!window.uaDeCloud.user) return;
    }
    const [dashboardPayload, casesPayload] = await Promise.all([
      apiRequest("/api/dashboard"),
      apiRequest("/api/cases"),
    ]);
    portalState.dashboard = dashboardPayload.dashboard;
    portalState.cases = casesPayload.cases;
    if (!portalState.selectedCaseId) portalState.selectedCaseId = portalState.cases[0]?.id || null;
    renderDashboard(portalState.dashboard);
    renderCases(portalState.cases);

    const initialRoute = portalRoutes.has(location.hash.slice(1))
      ? location.hash.slice(1)
      : "welcome";
    if ((initialRoute === "case" || initialRoute === "document") && portalState.selectedCaseId) {
      await loadCase(portalState.selectedCaseId);
    }
  } catch (error) {
    showPortalError(`Не удалось загрузить данные кабинета: ${error.message}`);
  }
}

function renderDashboard(dashboard) {
  const summary = dashboard.summary || {};
  setText("#metricActiveCases", summary.active_cases ?? 0);
  setText("#metricDeadlines", summary.confirmed_deadlines ?? 0);
  setText("#metricWaitingCases", summary.waiting_cases ?? 0);
  setText("#metricProfile", `${summary.profile_completion ?? 0}%`);
  setText("#profileOrbitValue", `${summary.profile_completion ?? 0}%`);

  const deadline = dashboard.nearest_deadline;
  const attention = document.querySelector(".attention-card");
  if (attention) attention.hidden = !deadline;
  if (deadline) {
    setText("#dashboardDeadlineAction", portalText(deadline.action));
    setText(
      "#dashboardDeadlineContext",
      `${portalText(deadline.case_title)} · ${new Date(`${deadline.due_at}T23:59:59`) < new Date() ? portalText("срок прошёл — проверьте дело") : portalText("срок подтверждён")}`,
    );
    const parsed = parseDate(deadline.due_at);
    setText(".attention-date span", parsed.day);
    setText(".attention-date small", parsed.monthShort);
    const openButton = document.querySelector("#dashboardOpenDeadlineCase");
    if (openButton) openButton.dataset.caseId = deadline.case_id;
    const activeCase = portalState.cases.find((item) => item.id === deadline.case_id);
    const progress = document.querySelector(".attention-progress");
    if (progress) progress.hidden = !activeCase;
    if (progress && activeCase) progress.querySelector("span").textContent = portalText(activeCase.next_action || "");
  }

  const container = document.querySelector("#dashboardCases");
  if (!container) return;
  container.innerHTML = dashboard.active_cases.length
    ? dashboard.active_cases.map(renderDashboardCase).join("")
    : renderEmptyState("Активных дел пока нет", "Добавьте первое письмо, чтобы создать дело.");
  const actions = document.querySelector("#dashboardActions");
  if (actions) actions.innerHTML = (dashboard.actions || []).length
    ? dashboard.actions.map(renderDashboardCase).join("")
    : renderEmptyState("Срочных действий нет", "Новые задачи появятся после разбора письма.");
  const waiting = document.querySelector("#dashboardWaiting");
  if (waiting) waiting.innerHTML = (dashboard.waiting || []).length
    ? dashboard.waiting.map(renderDashboardCase).join("")
    : renderEmptyState("Пока ничего не ожидаем", "После отправки ответа дело появится здесь.");
}

function renderDashboardCase(item) {
  const status = statusCopy[item.status] || statusCopy.new;
  const deadline = item.deadline
    ? `${new Date(`${item.deadline}T23:59:59`) < new Date() ? portalText("срок прошёл") : portalText("до")} ${formatDate(item.deadline, { numeric: true })}`
    : item.confirmed_by_user === 0
      ? "срок не подтверждён"
      : "нет активного срока";
  return `
    <button class="case-row" type="button" data-case-id="${escapePortalHtml(item.id)}">
      <span class="authority-icon">${escapePortalHtml(authorityInitial(item.authority_type))}</span>
      <span class="case-row-copy">
        <strong>${escapePortalHtml(item.authority_name)} — ${escapePortalHtml(portalText(item.title))}</strong>
        <small>${escapePortalHtml(portalText(item.next_action || "Открыть дело"))}</small>
      </span>
      <span class="case-row-meta">
        <em class="status-badge ${status.className}">${escapePortalHtml(portalText(status.label))}</em>
        <small>${escapePortalHtml(deadline)}</small>
      </span>
    </button>
  `;
}

function renderCases(cases) {
  const container = document.querySelector("#casesTableBody");
  if (!container) return;
  const category = (item) => {
    if (["closed", "resolved", "archived"].includes(item.status)) return "closed";
    if (["waiting", "sent"].includes(item.status)) return "waiting";
    if (item.status === "specialist_review") return "specialist";
    return "active";
  };
  document.querySelectorAll("[data-case-filter]").forEach((button) => {
    const filter = button.dataset.caseFilter;
    button.querySelector("span").textContent = filter === "all"
      ? cases.length : cases.filter((item) => category(item) === filter).length;
    button.classList.toggle("is-active", filter === portalState.caseFilter);
    button.setAttribute("aria-pressed", String(filter === portalState.caseFilter));
  });
  const query = document.querySelector("#casesSearch")?.value.trim().toLocaleLowerCase() || "";
  const visible = cases.filter((item) =>
    (portalState.caseFilter === "all" || category(item) === portalState.caseFilter) &&
    (!query || [item.authority_name, item.title, item.reference_number,
      item.next_action, item.document_names].some((value) => String(value || "").toLocaleLowerCase().includes(query))));
  setText("#casesResultCount", portalCopy("resultsCount", { visible: visible.length, total: cases.length }));
  container.innerHTML = visible.length
    ? visible.map(renderCaseTableRow).join("")
    : renderEmptyState("Дел пока нет", "Создайте первое дело из загруженного письма.");
}

function renderCaseTableRow(item) {
  const status = statusCopy[item.status] || statusCopy.new;
  const deadlineValue = item.deadline
    ? formatDate(item.deadline, { numeric: true })
    : item.confirmed_by_user === 0
      ? "не подтверждён"
      : "—";
  const deadlineHint = item.deadline
    ? item.confirmed_by_user
      ? "подтверждён"
      : "нужно подтвердить"
    : "нет активного срока";
  return `
    <button class="cases-table-row" type="button" data-case-id="${escapePortalHtml(item.id)}">
      <span class="table-case">
        <span class="authority-icon">${escapePortalHtml(authorityInitial(item.authority_type))}</span>
        <span>
          <strong>${escapePortalHtml(item.authority_name)}</strong>
          <small>${escapePortalHtml(portalText(item.title))} · ${escapePortalHtml(fileCountLabel(item.document_count || 0))}</small>
        </span>
      </span>
      <span><em class="status-badge ${status.className}">${escapePortalHtml(portalText(status.label))}</em></span>
      <span>${escapePortalHtml(portalText(item.next_action || "Открыть дело"))}</span>
      <span>
        <strong>${escapePortalHtml(deadlineValue)}</strong>
        <small>${deadlineHint}</small>
      </span>
    </button>
  `;
}

async function loadCase(caseId) {
  try {
    const payload = await apiRequest(`/api/cases/${encodeURIComponent(caseId)}`);
    portalState.activeCase = payload.case;
    portalState.selectedCaseId = payload.case.id;
    renderCase(payload.case);
  } catch (error) {
    showPortalError(`Не удалось открыть дело: ${error.message}`);
  }
}

function renderCase(caseData) {
  const status = statusCopy[caseData.status] || statusCopy.new;
  const risk = riskCopy[caseData.risk_level] || riskCopy.green;
  const checklist = caseData.checklist || [];
  const completed = checklist.filter((item) => item.completed).length;
  const percentage = checklist.length ? Math.round((completed / checklist.length) * 100) : 0;
  const confirmedDeadline = (caseData.deadlines || []).find(
    (item) => item.confirmed_by_user && item.status === "active",
  );

  setText("#caseHeadingIcon", authorityInitial(caseData.authority_type));
  setText("#caseAuthorityName", caseData.authority_name.toUpperCase());
  setText("#caseTitle", portalText(caseData.title));
  setText(
    "#caseMeta",
    `${caseData.reference_number ? `Aktenzeichen ${caseData.reference_number}` : portalText("Номер дела не указан")} · ${portalCopy("created", { date: formatDate(caseData.created_at) })}`,
  );
  setText("#caseNextAction", portalText(caseData.next_action || "Проверить состояние дела"));
  setText(
    "#caseChecklistSummary",
    checklist.length
      ? portalCopy("checklistReady", { completed, total: checklist.length })
      : portalText("Для этого дела пока нет чек-листа."),
  );
  const progress = document.querySelector(".case-action-card .progress-track span");
  if (progress) progress.style.width = `${percentage}%`;

  const statusBadge = document.querySelector("#caseStatusBadge");
  if (statusBadge) {
    statusBadge.className = `status-badge ${status.className}`;
    statusBadge.textContent = portalText(status.label);
  }
  setText(
    "#caseDeadlineValue",
    confirmedDeadline ? formatDate(confirmedDeadline.due_at) : "Срок не подтверждён",
  );
  setText(
    "#caseDeadlineHint",
    confirmedDeadline
      ? "срок подтверждён пользователем"
      : "проверьте дату в оригинале письма",
  );
  const riskContainer = document.querySelector("#caseRiskValue");
  if (riskContainer) {
    riskContainer.innerHTML = `<span class="risk-dot ${risk.className}"></span> ${escapePortalHtml(portalText(risk.label))}`;
  }
  setText("#caseRiskHint", portalText(risk.hint));

  renderTimeline(caseData.events || []);
  renderCaseDocuments(caseData.documents || []);
  renderOfficialLinks(caseData);
  renderCaseChecklist(checklist);
  renderReplyFlow(caseData);
  renderDeadlineConfirmation(caseData);

  document.querySelectorAll(".document-context-bar span").forEach((node) => {
    node.textContent = portalText("После разбора выберите существующее дело или создайте новое.");
  });
}

function renderDeadlineConfirmation(caseData) {
  let box = document.querySelector("#caseDeadlineConfirmation");
  const parent = document.querySelector(".case-deadline-card");
  if (!parent) return;
  if (!box) {
    box = document.createElement("div");
    box.id = "caseDeadlineConfirmation";
    parent.appendChild(box);
  }
  const pending = (caseData.deadlines || []).find((item) => !item.confirmed_by_user && item.status === "needs_confirmation");
  box.innerHTML = pending ? `
    <p>Мы нашли возможный срок. Проверьте фрагмент оригинала:</p>
    <blockquote>${escapePortalHtml(pending.source_snippet || "Фрагмент не сохранён")}</blockquote>
    <label>Дата <input type="date" id="correctedDeadlineDate" value="${escapePortalHtml(pending.due_at || "")}" /></label>
    <button class="secondary-button" type="button" data-confirm-deadline="${escapePortalHtml(pending.id)}">Подтвердить срок</button>
  ` : "";
}

function renderReplyFlow(caseData) {
  const choices = document.querySelector("#replyDocumentChoices");
  const draft = document.querySelector("#caseDraft");
  if (!choices || !draft) return;
  choices.innerHTML = (caseData.checklist || []).map((item) => `
    <label class="reply-choice"><input type="checkbox" value="${escapePortalHtml(item.title)}" ${item.completed ? "checked" : ""} /> ${escapePortalHtml(portalText(item.title))}</label>
  `).join("") || "<p>Проверьте письмо и укажите приложения вручную в черновике.</p>";
  const latest = (caseData.drafts || [])[0];
  const sentHistory = (caseData.drafts || []).filter((item) => item.sent_at);
  draft.innerHTML = latest ? `
    <h4>Черновик ответа · Deutsch</h4>
    <textarea id="editableGermanDraft" rows="11" ${latest.sent_at ? "readonly" : ""}>${escapePortalHtml(latest.german_text)}</textarea>
    <details><summary>Перевод смысла</summary><p>${escapePortalHtml(latest.local_text)}</p></details>
    <button class="secondary-button" type="button" data-copy-draft>Скопировать текст</button>
    ${latest.sent_at ? "" : `
      <div class="sent-controls"><label>Дата отправки <input type="date" id="draftSentDate" /></label>
      <label>Способ <select id="draftSentVia"><option value="email">Email</option><option value="portal">Портал ведомства</option><option value="post">Почта</option><option value="in_person">Лично</option><option value="fax">Fax</option><option value="other">Другое</option></select></label>
      <label>Номер или место подтверждения <input id="draftSentProof" type="text" maxlength="500" placeholder="Необязательно: квитанция, PDF, номер" /></label>
      <button class="primary-button" type="button" data-mark-sent="${escapePortalHtml(latest.id)}">Я отправил ответ</button></div>`}
    ${sentHistory.length ? `<div class="sent-history"><h4>Подтверждения отправки</h4>${sentHistory.map((item) => `
      <p><strong>${escapePortalHtml(formatDate(item.sent_at))}</strong> · ${escapePortalHtml(item.sent_via)}
      ${item.sent_proof ? ` · ${escapePortalHtml(item.sent_proof)}` : ` · ${escapePortalHtml(portalText("Подтверждение не указано"))}`}</p>
    `).join("")}</div>` : ""}
  ` : "";
  const dateInput = draft.querySelector("#draftSentDate");
  if (dateInput) dateInput.value = new Date().toLocaleDateString("en-CA");
}

document.addEventListener("click", async (event) => {
  const openDocument = event.target.closest("[data-open-case-document]");
  if (openDocument) {
    portalState.documentFilter = "all";
    const search = document.querySelector("#caseDocumentsSearch");
    if (search) search.value = "";
    renderCaseDocuments(portalState.activeCase?.documents || []);
    const target = [...document.querySelectorAll("[data-case-document-id]")]
      .find((item) => item.dataset.caseDocumentId === openDocument.dataset.openCaseDocument);
    if (target) { target.open = true; target.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return;
  }
  const deadlineButton = event.target.closest("[data-confirm-deadline]");
  if (deadlineButton) {
    const dueAt = document.querySelector("#correctedDeadlineDate")?.value;
    if (!dueAt) return showPortalError("Укажите дату по оригиналу письма.");
    try {
      await apiRequest(`/api/deadlines/${encodeURIComponent(deadlineButton.dataset.confirmDeadline)}`, {
        method: "PATCH", body: JSON.stringify({ due_at: dueAt, confirmed_by_user: true }),
      });
      await loadCase(portalState.selectedCaseId);
      await refreshDashboardAndCases();
      await loadDeadlines();
    } catch (error) { showPortalError(error.message); }
  }
  if (event.target.closest("[data-copy-draft]")) {
    await navigator.clipboard.writeText(document.querySelector("#editableGermanDraft")?.value || "");
  }
  const sentButton = event.target.closest("[data-mark-sent]");
  if (sentButton) {
    try {
      await apiRequest(`/api/cases/${encodeURIComponent(portalState.selectedCaseId)}/drafts/${encodeURIComponent(sentButton.dataset.markSent)}/sent`, {
        method: "POST", body: JSON.stringify({ sent_at: document.querySelector("#draftSentDate")?.value, sent_via: document.querySelector("#draftSentVia")?.value, sent_proof: document.querySelector("#draftSentProof")?.value || "", german_text: document.querySelector("#editableGermanDraft")?.value || "" }),
      });
      await loadCase(portalState.selectedCaseId);
      await refreshDashboardAndCases();
    } catch (error) { showPortalError(error.message); }
  }
});

document.querySelector("#prepareCaseReply")?.addEventListener("click", async () => {
  const available = [...document.querySelectorAll("#replyDocumentChoices input:checked")].map((item) => item.value);
  try {
    await apiRequest(`/api/cases/${encodeURIComponent(portalState.selectedCaseId)}/drafts`, {
      method: "POST", body: JSON.stringify({ language: portalLanguage(), answers: {
        available_documents: available,
        explanation: document.querySelector("#replyExplanation")?.value || "",
      } }),
    });
    await loadCase(portalState.selectedCaseId);
    await refreshDashboardAndCases();
  } catch (error) { showPortalError(error.message); }
});

function renderTimeline(events) {
  const container = document.querySelector("#timelineList");
  if (!container) return;
  container.innerHTML = events.length
    ? events.map((event, index) => `
        <li class="timeline-item ${index === 0 ? "current" : ""}">
          <span class="timeline-marker"></span>
          <time datetime="${escapePortalHtml(event.occurred_at)}">${escapePortalHtml(formatDate(event.occurred_at, { withTime: index === 0 }))}</time>
          <div>
            <strong>${escapePortalHtml(portalText(event.summary))}</strong>
            <p>${escapePortalHtml(portalText(event.details || ""))}</p>
            ${event.document_id ? `<button class="text-button" type="button" data-open-case-document="${escapePortalHtml(event.document_id)}">Открыть документ →</button>` : ""}
          </div>
        </li>
      `).join("")
    : renderEmptyState("История пока пуста", "События появятся после добавления документа.");
}

function renderCaseDocuments(documents) {
  setText("#caseDocumentsCount", fileCountLabel(documents.length));
  const container = document.querySelector("#caseDocumentsList");
  if (!container) return;
  const isLetter = (item) => Boolean(item.analysis_json) ||
    ["request_missing_documents", "uploaded_letter"].includes(item.document_type);
  document.querySelectorAll("[data-document-filter]").forEach((button) => {
    const filter = button.dataset.documentFilter;
    button.querySelector("span").textContent = filter === "all" ? documents.length :
      documents.filter((item) => isLetter(item) === (filter === "letters")).length;
    button.classList.toggle("is-active", filter === portalState.documentFilter);
    button.setAttribute("aria-pressed", String(filter === portalState.documentFilter));
  });
  const query = document.querySelector("#caseDocumentsSearch")?.value.trim().toLocaleLowerCase() || "";
  const visible = documents.filter((item) => {
    const analysis = item.analysis_json || {};
    const categoryMatches = portalState.documentFilter === "all" ||
      isLetter(item) === (portalState.documentFilter === "letters");
    const text = [item.file_name, analysis.sender, analysis.summary, analysis.next_action,
      ...(analysis.required_documents || [])].join(" ").toLocaleLowerCase();
    return categoryMatches && (!query || text.includes(query));
  });
  container.innerHTML = visible.length ? visible.map((item) => {
    const analysis = item.analysis_json || {};
    const onlyLetterInCase = documents.filter(isLetter).length === 1;
    const caseChecklist = onlyLetterInCase && isLetter(item)
      ? (portalState.activeCase?.checklist || []).map((entry) => entry.title) : [];
    const required = (analysis.required_documents?.length ? analysis.required_documents : caseChecklist)
      .map((title) => portalText(title)).join(", ");
    const recordedDeadline = (portalState.activeCase?.deadlines || []).find((deadline) => deadline.document_id === item.id);
    const due = recordedDeadline?.due_at || analysis.deadline?.extracted_due_at;
    const requirement = Object.values(analysis.requirement_sources || {})[0] || analysis.document_type ||
      (item.document_type === "request_missing_documents" ? "Запрошены дополнительные документы — сверьте формулировку с письмом" : "—");
    return `
      <details class="case-file" data-case-document-id="${escapePortalHtml(item.id)}">
        <summary><span class="file-type">${escapePortalHtml(fileType(item.file_name))}</span>
          <span><strong>${escapePortalHtml(item.file_name)}</strong>
            <small>${escapePortalHtml(portalText(analysis.sender || documentStatus(item.processing_status)))}</small></span>
          <span aria-hidden="true">＋</span></summary>
        <div class="case-file-body">
          <p><strong>${escapePortalHtml(portalText("Отправитель"))}:</strong> ${escapePortalHtml(analysis.sender || portalState.activeCase?.authority_name || "—")}</p>
          ${analysis.letter_date ? `<p><strong>${escapePortalHtml(portalText("Дата письма"))}:</strong> ${escapePortalHtml(formatDate(analysis.letter_date, { numeric: true }))}</p>` : ""}
          <p><strong>${escapePortalHtml(portalText("Требование"))}:</strong> ${escapePortalHtml(portalText(requirement))}</p>
          <p><strong>${escapePortalHtml(portalText("Срок"))}:</strong> ${escapePortalHtml(due ? formatDate(due, { numeric: true }) : portalText("не найден"))}${due ? " · " + escapePortalHtml(portalText(recordedDeadline?.confirmed_by_user ? "подтверждён" : "проверьте оригинал")) : ""}</p>
          <p><strong>${escapePortalHtml(portalText("Приложения"))}:</strong> ${escapePortalHtml(required || portalText("не указаны"))}</p>
          <p><strong>${escapePortalHtml(portalText("Следующий шаг"))}:</strong> ${escapePortalHtml(portalText(analysis.next_action || portalState.activeCase?.next_action || "—"))}</p>
        </div>
      </details>`;
  }).join("") : renderEmptyState("Документы не найдены", "Измените поиск или фильтр.");
}

function renderOfficialLinks(caseData) {
  const target = document.querySelector("#caseOfficialLinks");
  if (!target) return;
  const links = {
    jobcenter: [
      ["Формы и приложения Jobcenter", "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/downloads-arbeitslos-arbeit-finden"],
      ["Онлайн-сервисы Jobcenter", "https://www.arbeitsagentur.de/grundsicherung/online-services-im-ueberblick"],
    ],
    finanzamt: [["Формы Mein ELSTER", "https://www.elster.de/eportal/formulare-leistungen/alleformulare"]],
    familienkasse: [["Формы Familienkasse", "https://www.arbeitsagentur.de/familie-und-kinder/downloads-familie-und-kinder/formulare-kindergeld"]],
    auslaenderbehoerde: [["Официальная информация для прибывших из Украины", "https://www.germany4ukraine.de/DE/einreise-aufenthalt-und-rueckkehr/ukraine-aufenthaltserlaubnis/seite_node.html"]],
  }[caseData.authority_type] || [];
  target.innerHTML = links.length ? links.map(([label, url]) =>
    `<a href="${escapePortalHtml(url)}" target="_blank" rel="noopener noreferrer">${escapePortalHtml(portalText(label))} ↗</a>`
  ).join("") : `<p>${escapePortalHtml(portalText("Проверьте сайт ведомства, указанного в письме."))}</p>`;
}

function renderCaseChecklist(items) {
  const container = document.querySelector("#caseChecklistList");
  if (!container) return;
  container.innerHTML = items.length
    ? items.map((item) => `
        <label>
          <input
            type="checkbox"
            data-checklist-id="${escapePortalHtml(item.id)}"
            ${item.completed ? "checked" : ""}
          />
          ${escapePortalHtml(portalText(item.title))}
        </label>
      `).join("")
    : '<p class="portal-empty-copy">Чек-лист появится после анализа письма.</p>';
}

document.querySelector("#caseChecklistList")?.addEventListener("change", async (event) => {
  const checkbox = event.target.closest("[data-checklist-id]");
  if (!checkbox) return;
  checkbox.disabled = true;
  try {
    await apiRequest(`/api/checklist/${encodeURIComponent(checkbox.dataset.checklistId)}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: checkbox.checked }),
    });
    await loadCase(portalState.selectedCaseId);
    await refreshDashboardAndCases();
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    showPortalError(`Не удалось сохранить чек-лист: ${error.message}`);
  } finally {
    checkbox.disabled = false;
  }
});

const addNoteButton = document.querySelector("#addNoteButton");
addNoteButton?.addEventListener("click", async () => {
  addNoteButton.disabled = true;
  const originalLabel = addNoteButton.textContent;
  addNoteButton.textContent = "Сохраняю…";
  try {
    await apiRequest(`/api/cases/${encodeURIComponent(portalState.selectedCaseId)}/events`, {
      method: "POST",
      body: JSON.stringify({
        event_type: "user_note",
        actor_type: "user",
        summary: "Добавлена личная заметка",
        details: "Позвонить в ведомство и уточнить способ отправки приложений.",
      }),
    });
    await loadCase(portalState.selectedCaseId);
    addNoteButton.textContent = "Заметка добавлена";
  } catch (error) {
    addNoteButton.textContent = originalLabel;
    showPortalError(`Не удалось сохранить заметку: ${error.message}`);
  } finally {
    addNoteButton.disabled = false;
  }
});

async function loadDeadlines() {
  try {
    const payload = await apiRequest("/api/deadlines");
    portalState.deadlines = payload.deadlines;
    renderDeadlines(payload.deadlines);
  } catch (error) {
    showPortalError(`Не удалось загрузить сроки: ${error.message}`);
  }
}

function renderDeadlines(deadlines) {
  const active = deadlines.filter((item) => item.status === "active" && item.confirmed_by_user);
  const needsConfirmation = deadlines.filter(
    (item) => item.status === "needs_confirmation" || !item.confirmed_by_user,
  );
  const completed = deadlines.filter((item) => item.status === "completed");
  const overdue = active.filter((item) => item.due_at && new Date(`${item.due_at}T23:59:59`) < new Date());
  setText("#deadlineOverdueCount", overdue.length);
  setText("#deadlineActiveCount", active.length);
  setText("#deadlineConfirmCount", needsConfirmation.length);
  setText("#deadlineCompletedCount", completed.length);

  const container = document.querySelector("#deadlinesList");
  if (!container) return;
  const activeHtml = active.length
    ? `<div class="month-label">ПОДТВЕРЖДЁННЫЕ СРОКИ</div>${active.map(renderDeadlineRow).join("")}`
    : "";
  const confirmationHtml = needsConfirmation.length
    ? `<div class="month-label">НУЖНО ПОДТВЕРДИТЬ</div>${needsConfirmation.map(renderDeadlineRow).join("")}`
    : "";
  container.innerHTML = activeHtml || confirmationHtml
    ? `${activeHtml}${confirmationHtml}`
    : renderEmptyState("Активных сроков нет", "Подтверждённые даты появятся здесь.");
}

function renderDeadlineRow(item) {
  const parsed = item.due_at ? parseDate(item.due_at) : { day: "?", weekday: "ДАТА" };
  const isConfirmed = Boolean(item.confirmed_by_user);
  return `
    <button class="deadline-row ${isConfirmed ? "urgent" : "unconfirmed"}" type="button" data-case-id="${escapePortalHtml(item.case_id)}">
      <span class="deadline-day">
        <strong>${escapePortalHtml(parsed.day)}</strong>
        <small>${escapePortalHtml(parsed.weekday)}</small>
      </span>
      <span>
        <strong>${escapePortalHtml(portalText(item.action))}</strong>
        <small>${escapePortalHtml(portalText(item.case_title))} · ${escapePortalHtml(portalText(isConfirmed ? "срок подтверждён" : "проверьте дату по оригиналу"))}</small>
      </span>
      <em class="status-badge ${isConfirmed ? "action" : "review"}">${isConfirmed ? formatDate(item.due_at, { numeric: true }) : escapePortalHtml(portalText("Проверить"))}</em>
    </button>
  `;
}

async function loadProfile() {
  try {
    const payload = await apiRequest("/api/profile");
    portalState.profile = payload.profile;
    renderProfile(payload.profile);
  } catch (error) {
    showPortalError(`Не удалось загрузить профиль: ${error.message}`);
  }
}

function renderProfile(profile) {
  setText("#profileCompletionValue", `${profile.completion_percent ?? 0}%`);
  setText("#profileOrbitValue", `${profile.completion_percent ?? 0}%`);
  const language = document.querySelector("#profileLanguage");
  const federalState = document.querySelector("#profileFederalState");
  const city = document.querySelector("#profileCity");
  const arrivalDate = document.querySelector("#profileArrivalDate");
  const savedLanguage = localStorage.getItem("ua-de-language");
  const preferredLanguage = savedLanguage || profile.preferred_language || "ru";
  if (language) language.value = preferredLanguage;
  const headerLanguage = document.querySelector("#languageSelect");
  if (headerLanguage) headerLanguage.value = preferredLanguage;
  window.uaDeI18n?.applyLanguage(preferredLanguage, { persist: false });
  if (federalState) federalState.value = profile.federal_state || "Berlin";
  if (city) city.value = profile.city || "";
  if (arrivalDate) arrivalDate.value = profile.arrival_date || "";
}

document.querySelector("#saveProfileButton")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Сохраняю…";
  try {
    const payload = await apiRequest("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({
        preferred_language: document.querySelector("#profileLanguage")?.value,
        federal_state: document.querySelector("#profileFederalState")?.value,
        city: document.querySelector("#profileCity")?.value.trim(),
        arrival_date: document.querySelector("#profileArrivalDate")?.value.trim() || null,
      }),
    });
    portalState.profile = payload.profile;
    renderProfile(payload.profile);
    button.textContent = "Сохранено";
  } catch (error) {
    button.textContent = originalLabel;
    showPortalError(`Не удалось сохранить профиль: ${error.message}`);
  } finally {
    button.disabled = false;
    window.setTimeout(() => {
      button.textContent = originalLabel;
    }, 1600);
  }
});

async function refreshDashboardAndCases() {
  const [dashboardPayload, casesPayload] = await Promise.all([
    apiRequest("/api/dashboard"),
    apiRequest("/api/cases"),
  ]);
  portalState.dashboard = dashboardPayload.dashboard;
  portalState.cases = casesPayload.cases;
  renderDashboard(portalState.dashboard);
  renderCases(portalState.cases);
}

function showPortalError(message) {
  let banner = document.querySelector("#portalError");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "portalError";
    banner.className = "portal-error";
    document.body.appendChild(banner);
  }
  banner.textContent = message;
  window.setTimeout(() => banner.remove(), 5000);
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = portalText(value);
}

function authorityInitial(authorityType) {
  const initials = {
    finanzamt: "F",
    jobcenter: "J",
    krankenkasse: "K",
    familienkasse: "FK",
    auslaenderbehoerde: "A",
    rentenversicherung: "R",
  };
  return initials[authorityType] || "B";
}

function fileType(fileName) {
  const extension = String(fileName).split(".").pop();
  return extension && extension.length <= 4 ? extension.toUpperCase() : "FILE";
}

function documentStatus(status) {
  const labels = {
    analyzed: "разобрано",
    extracted: "текст извлечён",
    ready: "готово к отправке",
    needs_ocr: "требуется OCR",
  };
  return portalText(labels[status] || status);
}

function fileCountLabel(count) {
  if (portalLanguage() === "de") return `${count} ${count === 1 ? "Datei" : "Dateien"}`;
  if (portalLanguage() === "en") return `${count} ${count === 1 ? "file" : "files"}`;
  if (portalLanguage() === "uk") {
    if (count % 10 === 1 && count % 100 !== 11) return `${count} файл`;
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return `${count} файли`;
    return `${count} файлів`;
  }
  if (count % 10 === 1 && count % 100 !== 11) return `${count} файл`;
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return `${count} файла`;
  return `${count} файлов`;
}

function parseDate(value) {
  if (!value) return { day: "?", monthShort: "—", weekday: "ДАТА" };
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  return {
    day: String(date.getDate()),
    monthShort: new Intl.DateTimeFormat(portalLocale(), { month: "short" })
      .format(date)
      .replace(".", "")
      .toUpperCase(),
    weekday: new Intl.DateTimeFormat(portalLocale(), { weekday: "short" })
      .format(date)
      .replace(".", "")
      .toUpperCase(),
  };
}

function formatDate(value, options = {}) {
  if (!value) return "—";
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return String(value);
  if (options.numeric) {
    return new Intl.DateTimeFormat(portalLocale(), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat(portalLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(options.withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function portalLocale() {
  const language = window.uaDeI18n?.language || document.querySelector("#languageSelect")?.value || "ru";
  return {
    ru: "ru-RU",
    uk: "uk-UA",
    de: "de-DE",
    en: "en-GB",
  }[language] || "ru-RU";
}

function renderEmptyState(title, copy) {
  return `
    <div class="portal-empty-state">
      <strong>${escapePortalHtml(portalText(title))}</strong>
      <span>${escapePortalHtml(portalText(copy))}</span>
    </div>
  `;
}

function escapePortalHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.portalSelectedCaseId = () => portalState.selectedCaseId;
window.portalOpenCase = async (caseId) => {
  portalState.selectedCaseId = caseId;
  await loadCase(caseId);
  await refreshDashboardAndCases();
  navigatePortal("case");
};
window.portalRefreshActiveCase = async () => {
  await loadCase(portalState.selectedCaseId);
  await refreshDashboardAndCases();
};

window.addEventListener("ua-de:languagechange", () => {
  if (portalState.dashboard) renderDashboard(portalState.dashboard);
  if (portalState.cases.length) renderCases(portalState.cases);
  if (portalState.deadlines.length) renderDeadlines(portalState.deadlines);
  if (portalState.activeCase) renderCase(portalState.activeCase);
});

navigatePortal(location.hash.slice(1), { fromHash: true, instant: true });
bootstrapPortal();
window.addEventListener("ua-de:authchange", (event) => {
  if (event.detail?.signedIn) bootstrapPortal();
});
