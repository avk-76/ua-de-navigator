/* §24 destination pre-check. Official decisions and live bed capacity remain with the authorities. */
(() => {
  const tx = (ru, uk, de, en) => ({ ru, uk, de, en });
  const t = (value, lang) => value?.[lang] || value?.ru || "";
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const checkedAt = "2026-10-29";
  const sources = {
    federal: { title: "Germany4Ukraine · Einreise und Verteilung", url: "https://www.germany4ukraine.de/DE/einreise-aufenthalt-und-rueckkehr/einreise-aus-der-ukraine-nach-deutschland/seite.html" },
    law: { title: "§ 12a AufenthG · Wohnsitzregelung", url: "https://www.gesetze-im-internet.de/aufenthg_2004/__12a.html" },
    directory: { title: "115 · Behördenfinder", url: "https://www.115.de/" },
    berlin: { title: "Berlin · Ukraine FAQ", url: "https://www.berlin.de/ukraine/faq/" },
    munich: { title: "München · Aufenthaltserlaubnis Ukraine", url: "https://stadt.muenchen.de/service/info/servicestelle-fur-zuwanderung-und-einburgerung/10435460/" },
    bavaria: { title: "Bayern · Ukraine-Hilfe", url: "https://www.stmi.bayern.de/migration-und-integration/ukraine-hilfe/" },
    hannover: { title: "Hannover · Ukraine FAQ", url: "https://www.hannover.de/Fl%C3%BCchtlinge-in-Stadt-und-Region-Hannover" },
    hannoverHousing: { title: "Hannover · Unterbringung", url: "https://www.hannover.de/Leben-in-der-Region-Hannover/Verwaltungen-Kommunen/Die-Verwaltung-der-Landeshauptstadt-Hannover/Dezernate-und-Fachbereiche-der-LHH/Soziales-und-Teilhabe/Fachbereich-Gesellschaftliche-Teilhabe/Die-Struktur/Wohnen-und-Leben-in-Gemeinschaftsunterk%C3%BCnften-und-Wohnungen/Beratung-und-Zuweisung/Unterbringung-gefl%C3%BCchteter-Menschen" },
    leipzig: { title: "Leipzig · Erstregistrierung Quick-Check", url: "https://formulare.leipzig.de/frontend-server/form/provide/1018/?lang=de" },
    saxony: { title: "Sachsen · Unterbringung Ukraine", url: "https://www.ukrainehilfe.sachsen.de/informationen-zur-unterbringung-7720.html" },
  };
  const cities = [
    { key: "munich", name: "München", state: "Bayern", aliases: /^(münchen|muenchen|munich|мюнхен)$/i, source: "munich" },
    { key: "hannover", name: "Hannover", state: "Niedersachsen", aliases: /^(hannover|hanover|ганновер|гановер)$/i, source: "hannover" },
    { key: "berlin", name: "Berlin", state: "Berlin", aliases: /^(berlin|берлин)$/i, source: "berlin" },
    { key: "leipzig", name: "Leipzig", state: "Sachsen", aliases: /^(leipzig|лейпциг)$/i, source: "leipzig" },
  ];
  const labels = {
    destination: tx("Куда хотите поехать?", "Куди хочете поїхати?", "In welche Stadt möchten Sie?", "Which city do you want?"),
    destinationHint: tx("Проверим выбранный город и покажем альтернативы.", "Перевіримо вибране місто й покажемо альтернативи.", "Wir prüfen die gewünschte Stadt und zeigen Alternativen.", "We will check your preferred city and show alternatives."),
    basis: tx("Основание для §24 в Германии", "Підстава для §24 у Німеччині", "Grundlage für §24 in Deutschland", "Basis for §24 in Germany"),
    basisConfirmed: tx("§24 уже выдан", "§24 уже видано", "§24 bereits erteilt", "§24 already granted"),
    basisApplying: tx("Прибыл(а) из Украины и обращаюсь за §24", "Прибув(ла) з України й звертаюся по §24", "Aus der Ukraine geflohen, §24 beantragt/geplant", "Arrived from Ukraine, applying for §24"),
    basisOther: tx("Другое основание", "Інша підстава", "Andere Grundlage", "Different basis"),
    restriction: tx("Есть распределение или Wohnsitzauflage, ограничивающая переезд?", "Є розподіл або Wohnsitzauflage, що обмежує переїзд?", "Gibt es eine Zuweisung oder Wohnsitzauflage, die den Umzug begrenzt?", "Do you have an assignment or residence restriction limiting a move?"),
    targetHousing: tx("Жильё именно в выбранном городе", "Житло саме в обраному місті", "Unterkunft in der gewünschten Stadt", "Housing in the chosen city"),
    proof: tx("Документальное подтверждение этого основания", "Документальне підтвердження цієї підстави", "Nachweis für diesen Grund", "Documentary proof of this reason"),
    housingProof: tx("Есть документ на жильё?", "Є документ на житло?", "Gibt es einen Wohnnachweis?", "Do you have housing proof?"),
    familyProof: tx("Есть документы о родстве?", "Є документи про спорідненість?", "Gibt es Verwandtschaftsnachweise?", "Do you have family relationship documents?"),
    opportunityProof: tx("Есть договор или зачисление?", "Є договір або зарахування?", "Gibt es Vertrag oder Zulassung?", "Do you have a contract or enrolment proof?"),
    medicalProof: tx("Есть заключение врача?", "Є висновок лікаря?", "Liegt ein ärztlicher Nachweis vor?", "Do you have a doctor's statement?"),
    funding12: tx("Сможете доказать оплату аренды 12 месяцев?", "Чи можете довести оплату оренди на 12 місяців?", "Können Sie die Miete für 12 Monate nachweisen?", "Can you prove 12 months of rent funding?"),
    housing2y: tx("Жильё доступно минимум на 2 года?", "Житло доступне щонайменше на 2 роки?", "Ist die Unterkunft mindestens 2 Jahre verfügbar?", "Is housing available for at least 2 years?"),
    family: tx("Близкая семья в выбранном городе", "Близька родина в обраному місті", "Enge Familie in der gewünschten Stadt", "Close family in the chosen city"),
    opportunity: tx("Работа, Ausbildung или очная учёба в городе", "Робота, Ausbildung або очне навчання в місті", "Arbeit, Ausbildung oder Präsenzstudium am Ort", "Work, training or in-person study in the city"),
    jobSufficient: tx("Зарплата покрывает потребность по SGB II?", "Зарплата покриває потребу за SGB II?", "Deckt der Lohn den SGB-II-Bedarf?", "Does the pay cover SGB II needs?"),
    medical: tx("Срочная медицинская потребность / невозможность переезда", "Термінова медична потреба / неможливість переїзду", "Dringender medizinischer Bedarf / Reiseunfähigkeit", "Urgent medical need / inability to travel"),
    unknown: tx("Неизвестно", "Невідомо", "Unbekannt", "Unknown"), yes: tx("Да", "Так", "Ja", "Yes"), no: tx("Нет", "Ні", "Nein", "No"),
    stable: tx("Договор / долгосрочное жильё", "Договір / довгострокове житло", "Mietvertrag / dauerhafte Unterkunft", "Lease / long-term housing"),
    temporary: tx("Временное проживание", "Тимчасове проживання", "Vorübergehende Unterkunft", "Temporary housing"),
    none: tx("Нет жилья", "Немає житла", "Keine Unterkunft", "No housing"),
    spouse: tx("Супруг(а)", "Чоловік/дружина", "Ehepartner/in", "Spouse"),
    parentChild: tx("Родитель или ребёнок", "Батько/мати або дитина", "Elternteil oder Kind", "Parent or child"),
    otherFamily: tx("Другие родственники", "Інші родичі", "Andere Verwandte", "Other relatives"),
    job: tx("Трудовой договор", "Трудовий договір", "Arbeitsvertrag", "Employment contract"),
    study: tx("Ausbildung / очная учёба", "Ausbildung / очне навчання", "Ausbildung / Präsenzstudium", "Training / in-person study"),
    resultTitle: tx("Можно ли в выбранный город?", "Чи можна до обраного міста?", "Ist die gewünschte Stadt möglich?", "Is the chosen city possible?"),
    alternatives: tx("Другие проверенные города", "Інші перевірені міста", "Andere geprüfte Städte", "Other checked cities"),
    checkCity: tx("Проверить этот город", "Перевірити це місто", "Diese Stadt prüfen", "Check this city"),
    altNeedsFacts: tx("Нужны условия именно для этого города", "Потрібні умови саме для цього міста", "Angaben für genau diese Stadt nötig", "Facts for this city are needed"),
    altNeedsFactsWhy: tx("Жильё, семья и работа в выбранном городе не переносятся на другой. Выберите город и ответьте для него отдельно.", "Житло, родина й робота в обраному місті не стосуються іншого. Оберіть місто й дайте відповіді окремо.", "Wohnung, Familie und Arbeit am Wunschort gelten nicht automatisch für eine andere Stadt. Diese Stadt einzeln prüfen.", "Housing, family and work in one city do not transfer to another. Select and assess this city separately."),
    capacity: tx("Наличие свободных мест и решение о распределении не опубликованы в единой актуальной базе. Перед поездкой подтвердите ситуацию в указанном ведомстве.", "Вільні місця й рішення про розподіл не опубліковані в єдиній актуальній базі. Перед поїздкою підтвердьте ситуацію в зазначеній установі.", "Freie Plätze und Zuweisungsentscheidungen stehen nicht in einer einheitlichen aktuellen Datenbank. Bitte vor der Fahrt bei der Behörde bestätigen.", "Bed availability and allocation decisions are not published in one current database. Confirm with the authority before travelling."),
    manualSources: tx("Правила сверены по указанным официальным страницам на дату проверки; автоматический поиск обновлений пока не подключён.", "Правила звірено за вказаними офіційними сторінками на дату перевірки; автоматичний пошук оновлень ще не підключено.", "Die Regeln wurden am Prüftag anhand der verlinkten amtlichen Seiten abgeglichen; eine automatische Aktualisierung ist noch nicht angeschlossen.", "Rules were checked against the linked official pages on the stated date; automatic update search is not yet connected."),
    sourceDate: tx("Официальные источники просмотрены", "Офіційні джерела переглянуто", "Amtliche Quellen geprüft", "Official sources reviewed"),
    restrictionResult: tx("Сначала нужно разрешение на переезд", "Спершу потрібен дозвіл на переїзд", "Zuerst Umzugsgenehmigung klären", "Resolve the move permission first"),
    restrictionWhy: tx("При действующей Zuweisung или Wohnsitzauflage выбранный город нельзя обещать без решения ведомства. Подайте запрос на изменение с доказательствами причины.", "За чинної Zuweisung або Wohnsitzauflage обране місто не можна обіцяти без рішення установи. Подайте запит на зміну з доказами підстави.", "Bei bestehender Zuweisung oder Wohnsitzauflage ist der Zielort ohne Behördenentscheidung nicht gesichert. Beantragen Sie die Änderung mit Nachweisen.", "With an assignment or residence restriction, the destination is not secured without an authority decision. Request a change with evidence."),
    restrictionUnknown: tx("Сначала проверьте документы о распределении и §24: без этого нельзя оценить переезд.", "Спершу перевірте документи про розподіл і §24: без цього переїзд не оцінити.", "Prüfen Sie zuerst Zuweisung und §24-Dokumente; sonst lässt sich der Umzug nicht beurteilen.", "First check assignment and §24 documents; the move cannot be assessed without them."),
    evidence: tx("Есть основание обратиться за приёмом в городе", "Є підстава звернутися щодо прийому в місті", "Es gibt einen Grund für eine Aufnahme-Anfrage", "There is a basis to request admission to the city"),
    evidenceWhy: tx("Подготовьте оригиналы доказательств и подайте запрос через официальный городской порядок. Решение принимается индивидуально.", "Підготуйте оригінали доказів і подайте запит за офіційним міським порядком. Рішення індивідуальне.", "Originalnachweise vorbereiten und den amtlichen Antrag stellen. Die Entscheidung erfolgt im Einzelfall.", "Prepare original evidence and use the official city process. The decision is individual."),
    evidenceMissing: tx("Основание указано, но документы ещё не подтверждены. Сначала соберите доказательства.", "Підставу вказано, але документи ще не підтверджено. Спершу зберіть докази.", "Der Grund ist angegeben, aber Nachweise fehlen noch. Zuerst Belege sammeln.", "A reason is stated, but evidence is not yet confirmed. Gather it first."),
    distribution: tx("Город при государственном размещении не гарантирован", "Місто за державного розміщення не гарантоване", "Der Ort ist bei staatlicher Unterbringung nicht garantiert", "The city is not guaranteed with public accommodation"),
    distributionWhy: tx("Первичный приём возможен, но после регистрации человека могут распределить в другое место. Не считайте адрес центра подтверждением проживания в городе.", "Первинний прийом можливий, але після реєстрації людину можуть розподілити в інше місце. Адреса центру не підтверджує проживання в місті.", "Erstaufnahme ist möglich; danach kann eine Zuweisung an einen anderen Ort erfolgen. Die Adresse des Ankunftszentrums sichert keinen Wohnort.", "Initial reception is possible, but allocation may be to another place. An arrival-centre address does not secure residence in the city."),
    privateRoute: tx("Частное проживание даёт путь к местной регистрации", "Приватне житло дає шлях до місцевої реєстрації", "Private Unterkunft eröffnet den Weg zur örtlichen Registrierung", "Private housing offers a route to local registration"),
    privateWhy: tx("Проверьте адрес, подтверждение жилья и условия содержания. Для точного права на §24 и местную регистрацию обратитесь в указанное ведомство.", "Перевірте адресу, підтвердження житла та умови утримання. Щодо права на §24 і місцевої реєстрації зверніться до вказаної установи.", "Adresse, Wohnnachweis und Lebensunterhalt prüfen. §24 und örtliche Registrierung bei der genannten Behörde klären.", "Check the address, housing proof and support. Confirm §24 and local registration with the listed authority."),
    leipzigNo: tx("Прямой первичной регистрации в Лейпциге по этим данным не видно", "Прямої первинної реєстрації в Лейпцигу за цими даними не видно", "Nach diesen Angaben kein direkter Weg zur Erstregistrierung in Leipzig", "These facts do not show a direct initial-registration route to Leipzig"),
    leipzigWhy: tx("Городской Quick-Check требует близкую семью с документами либо основной договор аренды и доказательство оплаты на 12 месяцев. При отсутствии — первичный приём в Дрездене или Хемнице с последующим распределением.", "Міський Quick-Check вимагає близьку родину з документами або основний договір оренди та доказ оплати на 12 місяців. Інакше — первинний прийом у Дрездені чи Хемніці з подальшим розподілом.", "Der städtische Quick-Check verlangt enge Familie mit Nachweisen oder Hauptmietvertrag und 12 Monate gesicherte Miete. Sonst Erstaufnahme in Dresden oder Chemnitz mit anschließender Zuweisung.", "The city quick check requires documented close family or a main lease with 12 months of rent funding. Otherwise use initial reception in Dresden or Chemnitz, followed by allocation."),
    unknownCity: tx("Для этого города нет проверенного местного правила", "Для цього міста немає перевіреного місцевого правила", "Für diese Stadt liegt keine geprüfte Ortsregel vor", "No verified local rule is available for this city"),
    unknownWhy: tx("Показываем федеральное правило, но не утверждаем, что город принимает. Найдите страницу местной Ausländerbehörde и проверьте её условия перед поездкой.", "Показуємо федеральне правило, але не стверджуємо, що місто приймає. Знайдіть сторінку місцевої Ausländerbehörde й перевірте умови перед поїздкою.", "Es gilt die Bundesregel; eine Aufnahmezusage für die Stadt liegt nicht vor. Bitte die örtliche Ausländerbehörde vor der Fahrt prüfen.", "The federal rule is shown, but admission to this city is unconfirmed. Check the local foreigners authority before travelling."),
    scopeUnknown: tx("Сначала подтвердите основание для §24", "Спершу підтвердьте підставу для §24", "Zuerst Grundlage für §24 klären", "First confirm the basis for §24"),
    scopeWhy: tx("Этот маршрут проверяет выбор города только для временной защиты по §24. Без подтверждения категории нельзя делать вывод о приёме или распределении.", "Цей маршрут перевіряє вибір міста лише для тимчасового захисту за §24. Без підтвердження категорії не можна робити висновок про прийом чи розподіл.", "Diese Route prüft den Zielort nur für vorübergehenden Schutz nach §24. Ohne Klärung der Personengruppe ist keine Aufnahme- oder Zuweisungsaussage möglich.", "This route checks destination choice only for temporary protection under §24. Without confirming the category, admission and allocation cannot be assessed."),
  };
  const yn = [["unknown", labels.unknown], ["yes", labels.yes], ["no", labels.no]];
  const select = (name, label, values, lang) => `<label><span>${esc(t(label, lang))}</span><select name="${name}">${values.map(([value, text]) => `<option value="${value}">${esc(t(text, lang))}</option>`).join("")}</select></label>`;
  function renderForm(container, lang) {
    const old = Object.fromEntries([...container.querySelectorAll("input[name], select[name]")].map((node) => [node.name, node.value]));
    container.innerHTML = `<div class="destination-form-head"><strong>${esc(t(labels.destination, lang))}</strong><p>${esc(t(labels.destinationHint, lang))}</p></div><div class="destination-field-grid"><label><span>${esc(t(labels.destination, lang))}</span><input name="destination_city" list="destinationCityList" maxlength="80" autocomplete="off" placeholder="Berlin / München / Hannover / Leipzig" required><datalist id="destinationCityList">${cities.map((city) => `<option value="${city.name}"></option>`).join("")}</datalist></label>${select("residence_restriction", labels.restriction, yn, lang)}${select("destination_housing", labels.targetHousing, [["unknown", labels.unknown], ["stable", labels.stable], ["temporary", labels.temporary], ["none", labels.none]], lang)}${select("destination_housing_proof", labels.proof, yn, lang)}${select("destination_rent_12m", labels.funding12, yn, lang)}${select("destination_family", labels.family, [["unknown", labels.unknown], ["none", labels.none], ["spouse", labels.spouse], ["parent_child", labels.parentChild], ["other", labels.otherFamily]], lang)}${select("destination_family_proof", labels.proof, yn, lang)}${select("destination_opportunity", labels.opportunity, [["unknown", labels.unknown], ["none", labels.none], ["job", labels.job], ["study", labels.study]], lang)}${select("destination_opportunity_proof", labels.proof, yn, lang)}${select("destination_medical", labels.medical, yn, lang)}${select("destination_medical_proof", labels.proof, yn, lang)}</div>`;
    container.querySelector('[name="destination_rent_12m"]').closest("label").insertAdjacentHTML("afterend", select("destination_housing_2y", labels.housing2y, yn, lang));
    container.querySelector('[name="destination_opportunity_proof"]').closest("label").insertAdjacentHTML("afterend", select("destination_job_sufficient", labels.jobSufficient, yn, lang));
    container.querySelector('[name="residence_restriction"]').closest("label").insertAdjacentHTML("beforebegin", select("protection_basis", labels.basis, [["unknown", labels.unknown], ["confirmed", labels.basisConfirmed], ["applying", labels.basisApplying], ["other", labels.basisOther]], lang));
    for (const [name, label] of [["destination_housing_proof", labels.housingProof], ["destination_family_proof", labels.familyProof], ["destination_opportunity_proof", labels.opportunityProof], ["destination_medical_proof", labels.medicalProof]]) {
      container.querySelector(`[name="${name}"]`).closest("label").querySelector("span").textContent = t(label, lang);
    }
    for (const [name, value] of Object.entries(old)) {
      if (container.querySelector(`[name="${name}"]`)) container.querySelector(`[name="${name}"]`).value = value;
    }
  }
  const resolveCity = (value) => cities.find((city) => city.aliases.test((value || "").trim())) || null;
  function assess(city, answers) {
    const firstArrival = answers.stage !== "registered";
    const sourceKeys = ["federal", ...(city ? [city.source] : []), ...(city?.key === "munich" ? ["bavaria"] : city?.key === "hannover" ? ["hannoverHousing"] : city?.key === "leipzig" ? ["saxony"] : [])];
    if (!["confirmed", "applying"].includes(answers.protection_basis)) return { code: "scopeUnknown", detail: "scopeWhy", sourceKeys: ["federal"] };
    if (answers.residence_restriction === "yes") return { code: "restrictionResult", detail: "restrictionWhy", sourceKeys: ["law", ...sourceKeys] };
    if (answers.stage === "registered" && answers.residence_restriction !== "no") return { code: "restrictionResult", detail: "restrictionUnknown", sourceKeys: ["law", ...sourceKeys] };
    if (!city) return { code: "unknownCity", detail: "unknownWhy", sourceKeys: [...sourceKeys, "directory"] };
    const documentedFamily = ["spouse", "parent_child"].includes(answers.destination_family) && answers.destination_family_proof === "yes";
    const documentedHousing = answers.destination_housing === "stable" && answers.destination_housing_proof === "yes";
    const documentedOpportunity = (answers.destination_opportunity === "study" || (answers.destination_opportunity === "job" && answers.destination_job_sufficient === "yes")) && answers.destination_opportunity_proof === "yes";
    const documentedMedical = answers.destination_medical === "yes" && answers.destination_medical_proof === "yes";
    const hasReason = ["spouse", "parent_child"].includes(answers.destination_family) || answers.destination_housing === "stable" || ["job", "study"].includes(answers.destination_opportunity) || answers.destination_medical === "yes";
    const publicHousing = answers.destination_housing === "none" || (answers.destination_housing === "unknown" && answers.housing === "none");
    if (city.key === "leipzig") {
      if (documentedFamily || (documentedHousing && answers.destination_rent_12m === "yes")) return { code: "evidence", detail: "evidenceWhy", sourceKeys };
      if (["spouse", "parent_child"].includes(answers.destination_family) || (answers.destination_housing === "stable" && answers.destination_rent_12m !== "no")) return { code: "evidence", detail: "evidenceMissing", sourceKeys };
      return { code: "leipzigNo", detail: "leipzigWhy", sourceKeys };
    }
    if (city.key === "berlin") {
      if (documentedFamily || documentedMedical || documentedOpportunity || (documentedHousing && answers.destination_housing_2y === "yes")) return { code: "evidence", detail: "evidenceWhy", sourceKeys };
      if (hasReason) return { code: "evidence", detail: "evidenceMissing", sourceKeys };
      return { code: "distribution", detail: "distributionWhy", sourceKeys };
    }
    if (firstArrival && (publicHousing || answers.funding !== "full")) return { code: "distribution", detail: "distributionWhy", sourceKeys };
    if (documentedHousing && answers.funding === "full") return { code: "privateRoute", detail: "privateWhy", sourceKeys };
    return { code: "distribution", detail: "distributionWhy", sourceKeys };
  }
  function evaluate(answers) {
    const requestedCity = resolveCity(answers.destination_city);
    const requested = { city: requestedCity?.name || (answers.destination_city || "").trim(), state: requestedCity?.state || "", ...assess(requestedCity, answers) };
    const alternatives = cities.filter((city) => city.key !== requestedCity?.key).map((city) => ({ city: city.name, state: city.state, code: "altNeedsFacts", detail: "altNeedsFactsWhy", sourceKeys: ["federal", city.source] }));
    return { requested, alternatives, checkedAt };
  }
  function render(plan, lang, container) {
    const row = (item, primary) => `<article class="destination-assessment ${primary ? "is-requested" : ""}"><div><strong>${esc(item.city)}</strong><small>${esc(item.state)}</small></div><div><b>${esc(t(labels[item.code], lang))}</b><p>${esc(t(labels[item.detail], lang))}</p>${primary ? "" : `<button type="button" class="secondary-button" data-check-destination="${esc(item.city)}">${esc(t(labels.checkCity, lang))}</button>`}<div class="destination-sources">${item.sourceKeys.map((key) => `<a href="${esc(sources[key].url)}" target="_blank" rel="noreferrer">${esc(sources[key].title)}</a>`).join("")}</div></div></article>`;
    container.innerHTML = `<div class="destination-result-head"><p class="section-label">§24 · ${esc(t(labels.resultTitle, lang))}</p><small>${esc(t(labels.sourceDate, lang))}: ${plan.checkedAt}</small></div>${row(plan.requested, true)}<details class="destination-alternatives"><summary>${esc(t(labels.alternatives, lang))}</summary>${plan.alternatives.map((item) => row(item, false)).join("")}</details><p class="destination-capacity">${esc(t(labels.manualSources, lang))} ${esc(t(labels.capacity, lang))}</p>`;
  }
  window.uaDeDestinationRoute = { renderForm, evaluate, render, resolveCity, sources, labels };
})();
