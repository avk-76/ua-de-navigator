/* Individual, source-linked route. No names or document numbers are collected. */
(() => {
  const LANG = ["ru", "uk", "de", "en"];
  const tx = (ru, uk, de, en) => ({ ru, uk, de, en });
  const words = {
    person: tx("Человек", "Людина", "Person", "Person"), age: tx("Возраст", "Вік", "Alter", "Age"), role: tx("Родство", "Спорідненість", "Verwandtschaft", "Relationship"),
    citizenship: tx("Гражданство", "Громадянство", "Staatsangehörigkeit", "Citizenship"), arrival: tx("Дата въезда", "Дата в'їзду", "Einreisedatum", "Arrival date"),
    residence: tx("Город проживания", "Місто проживання", "Wohnort", "City of residence"), document: tx("Документ о пребывании", "Документ про перебування", "Aufenthaltsdokument", "Residence document"),
    capacity: tx("Трудоспособность", "Працездатність", "Erwerbsfähigkeit", "Work capacity"), insurance: tx("Медицинская страховка", "Медичне страхування", "Krankenversicherung", "Health insurance"),
    care: tx("Нужен уход", "Потрібен догляд", "Pflegebedarf", "Care need"), income: tx("Доходы и документы", "Доходи й документи", "Einkommen und Unterlagen", "Income and records"),
    revenue: tx("Выручка за период, €", "Виручка за період, €", "Umsatz im Zeitraum, €", "Revenue for period, €"), expenses: tx("Подтверждённые расходы, €", "Підтверджені витрати, €", "Belegte Ausgaben, €", "Documented expenses, €"),
    period: tx("Период дохода", "Період доходу", "Einkommenszeitraum", "Income period"), taxes: tx("Уплаченные налоги, €", "Сплачені податки, €", "Gezahlte Steuern, €", "Taxes paid, €"),
    applied: tx("Уже поданные заявления (без номеров)", "Уже подані заяви (без номерів)", "Bereits gestellte Anträge (ohne Nummern)", "Applications submitted (no reference numbers)"),
    decisions: tx("Полученные Bescheide (без номеров)", "Отримані Bescheide (без номерів)", "Erhaltene Bescheide (ohne Nummern)", "Decisions received (no reference numbers)"),
    unknown: tx("Неизвестно", "Невідомо", "Unbekannt", "Unknown"), yes: tx("Да", "Так", "Ja", "Yes"), no: tx("Нет", "Ні", "Nein", "No"),
    self: tx("Я", "Я", "Ich", "Me"), spouse: tx("Супруг(а)", "Чоловік/дружина", "Ehepartner/in", "Spouse"), child: tx("Ребёнок", "Дитина", "Kind", "Child"), parent: tx("Родитель", "Батько/мати", "Elternteil", "Parent"), other: tx("Другой родственник", "Інший родич", "Andere verwandte Person", "Other relative"),
    details: tx("Дополнительные сведения", "Додаткові відомості", "Weitere Angaben", "More details"), remove: tx("Удалить", "Видалити", "Entfernen", "Remove"),
    next: tx("Ближайшая задача", "Найближче завдання", "Nächste Aufgabe", "Next task"), each: tx("Что ещё не оформлено у каждого из нас? →", "Що ще не оформлено в кожного з нас? →", "Was fehlt uns noch? →", "What is still missing for each of us? →"),
    source: tx("Источник", "Джерело", "Quelle", "Source"), authority: tx("Куда", "Куди", "Stelle", "Where"), documents: tx("Документы", "Документи", "Unterlagen", "Documents"),
    timing: tx("Срок / начало", "Строк / початок", "Frist / Beginn", "Deadline / start"), missing: tx("Уточнить", "Уточнити", "Klären", "Clarify"),
    status: tx("Статус", "Статус", "Status", "Status"), proof: tx("Подтверждение отправки (дата или описание, без номера)", "Підтвердження відправлення (дата або опис, без номера)", "Versandnachweis (Datum/Beschreibung, ohne Nummer)", "Submission proof (date/description, no number)"),
    nextAction: tx("Следующее действие", "Наступна дія", "Nächster Schritt", "Next action"),
    unverified: tx("не проверено", "не перевірено", "nicht geprüft", "unverified"), file: tx("нужно подать", "потрібно подати", "Antrag nötig", "needs filing"), submitted: tx("подано", "подано", "eingereicht", "submitted"), waiting: tx("ждём", "чекаємо", "warten", "waiting"), approved: tx("одобрено", "схвалено", "bewilligt", "approved"), refused: tx("отказ", "відмова", "abgelehnt", "refused"),
    limited: tx("Проверена официальная страница; применимость зависит от ваших данных. Дата проверки: 27.10.2026.", "Перевірено офіційну сторінку; застосовність залежить від ваших даних. Дата перевірки: 27.10.2026.", "Amtliche Seite geprüft; die Anwendbarkeit hängt von Ihren Angaben ab. Prüfung: 27.10.2026.", "Official page reviewed; applicability depends on your facts. Checked: 27 Oct 2026."),
    pending: tx("Законопроект, не действующее правило", "Законопроєкт, не чинна норма", "Gesetzentwurf, nicht geltendes Recht", "Draft bill, not current law"),
    noAmount: tx("Сумму выплаты пока нельзя определить: нужны расходы, аренда, статус и Bescheide.", "Суму виплати поки не можна визначити: потрібні витрати, оренда, статус і Bescheide.", "Ein Leistungsbetrag lässt sich ohne Ausgaben, Miete, Status und Bescheide nicht bestimmen.", "No benefit amount can be calculated without expenses, rent, status and decisions."),
    unknownPlace: tx("Точное ведомство для этого города пока не установлено. Найдите его через официальный поиск; контакт соседнего района не используется.", "Точну установу для цього міста ще не встановлено. Знайдіть її через офіційний пошук; контакт сусіднього району не використовується.", "Die zuständige Stelle ist für diesen Ort noch nicht ermittelt. Nutzen Sie die amtliche Suche; keine Nachbarkreis-Kontakte.", "The local authority is not identified for this city. Use the official directory; no neighbouring district contacts."),
    taxPacket: tx("Пакет для налогового консультанта", "Пакет для податкового консультанта", "Unterlagenpaket für Steuerberatung", "Tax adviser packet"),
    download: tx("Скачать JSON на устройство", "Завантажити JSON на пристрій", "JSON auf Gerät herunterladen", "Download JSON to device"),
    taxMissing: tx("Пустые поля требуется заполнить по документам; это не расчёт прибыли или пособия.", "Порожні поля слід заповнити за документами; це не розрахунок прибутку чи виплати.", "Leere Felder anhand der Belege ergänzen; dies ist keine Gewinn- oder Leistungsberechnung.", "Fill empty fields from records; this does not calculate profit or benefits."),
  };
  const tr = (v, language) => typeof v === "string" ? v : (v?.[language] || v?.ru || "");
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const official = {
    residence: ["Stadt Überlingen · Ausländerwesen", "https://www.ueberlingen.de/-/behoerdenwegweiser/auslaenderwesen/oe6008056"],
    anmeldung: ["Stadt Überlingen · Bürgerservice", "https://www.ueberlingen.de/online-terminvergabe"],
    jobcenter: ["Jobcenter Bodenseekreis", "https://www.bodenseekreis.de/soziales-gesundheit/arbeitslosigkeit-jobcenter/grundsicherungsgeld-leistungen/antragstellung/"],
    health: ["Germany4Ukraine · medizinische Versorgung", "https://www.germany4ukraine.de/DE/medizinische-versorgung/medizinische-hilfe-fluechtlinge/seite_node.html"],
    social: ["Sozialamt Bodenseekreis", "https://www.bodenseekreis.de/soziales-gesundheit/geldleistungen/sozialhilfe/grundsicherung/"],
    care: ["Pflegestützpunkt Bodenseekreis · Überlingen", "https://www.bodenseekreis.de/soziales-gesundheit/behinderung/pflegestuetzpunkt/ansprechpersonen-aussenberatungsstellen/"],
    pflege: ["Bundesministerium für Gesundheit", "https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/pflegebeduerftig-was-nun"],
    helpcare: ["Sozialamt Bodenseekreis · Hilfe zur Pflege", "https://www.bodenseekreis.de/soziales-gesundheit/geldleistungen/sozialhilfe/hilfen-zur-pflege/"],
    kindergeld: ["Familienportal des Bundes", "https://familienportal.de/familienportal/familienleistungen/kindergeld/faq"],
    wohngeld: ["Stadt Überlingen · Soziales", "https://www.ueberlingen.de/sozialleistungen"],
    kiz: ["Familienportal des Bundes · Kinderzuschlag", "https://familienportal.de/familienportal/familienleistungen/kinderzuschlag"],
    kita: ["Stadt Überlingen · Kita-Anmeldung", "https://www.ueberlingen.de/kita-anmeldung"],
    but: ["Bodenseekreis · Bildung und Teilhabe", "https://www.bodenseekreis.de/bildung-kultur/kompetenzen-foerderung/bildungs-teilhabepaket/antragstellung/"],
    eks: ["Bundesagentur für Arbeit · Anlage EKS", "https://www.arbeitsagentur.de/datei/AnlageEKS_ba013054.pdf"],
    tax: ["Finanzämter Baden-Württemberg · Einkommensteuerpflicht", "https://finanzamt-bw.fv-bwl.de/site/pbs-bw-mlr-root/node/5267663/Lde/index.html"],
    exit: ["Дія · підготовка до виїзду", "https://bf.diia.gov.ua/articles/yak-pidhotuvatysia-do-vyizdu-za-kordon"],
    car: ["Bodenseekreis · Kfz-Zulassung Überlingen", "https://www.bodenseekreis.de/verkehr-wirtschaft/kfz-zulassung/"],
    draft: ["Bundesregierung · Leistungsrechtsanpassungsgesetz", "https://www.bundesregierung.de/breg-de/schwerpunkte/wirksam-regieren/kabinett-rechtskreiswechsel-2382474"],
    directory: ["115 · Behördennummer / Zuständigkeit", "https://www.115.de/"],
    directoryJobcenter: ["Bundesagentur für Arbeit · Dienststellensuche", "https://www.arbeitsagentur.de/grundsicherung"],
    law: ["Bundesagentur für Arbeit · Reform 2026", "https://www.arbeitsagentur.de/grundsicherung-loest-buergergeld-ab"],
  };
  const place = (city, postal) => (/^(überlingen|ueberlingen)$/i.test((city || "").trim()) && (!postal || postal === "88662")) || (!city && postal === "88662")
    ? { city: "Überlingen", postal: "88662", state: "Baden-Württemberg", district: "Bodenseekreis", known: true }
    : { city: city || "", postal: postal || "", state: "", district: "", known: false };
  const options = (values, current, language) => values.map(([value, label]) => `<option value="${value}" ${current === value ? "selected" : ""}>${esc(tr(label, language))}</option>`).join("");
  const yesNo = [["unknown", words.unknown], ["yes", words.yes], ["no", words.no]];
  const roles = [["self", words.self], ["spouse", words.spouse], ["child", words.child], ["parent", words.parent], ["other", words.other]];
  const documents = [["unknown", words.unknown], ["24", "§24"], ["fiktion", "Fiktionsbescheinigung"], ["other", tx("Другой", "Інший", "Anderes", "Other")], ["none", words.no]];
  const capacities = [["unknown", words.unknown], ["yes", words.yes], ["no", words.no]];
  function field(label, key, value, type = "text", extra = "") { return `<label><span>${esc(label)}</span><input data-person-field="${key}" type="${type}" value="${esc(value || "")}" ${extra}></label>`; }
  function personEditor(person, index, language) {
    const select = (label, key, values) => `<label><span>${esc(tr(label, language))}</span><select data-person-field="${key}">${options(values, person[key] || "unknown", language)}</select></label>`;
    return `<section class="family-person-editor" data-person-index="${index}"><div class="family-editor-head"><strong>${esc(tr(words.person, language))} ${index + 1}</strong>${index ? `<button type="button" data-remove-person="${index}">${esc(tr(words.remove, language))}</button>` : ""}</div>
      <div class="family-editor-grid">${select(words.role, "role", roles)}${field(tr(words.age, language), "age", person.age, "number", 'min="0" max="120"')}${select(words.citizenship, "citizenship", [["unknown", words.unknown], ["ua", "Україна"], ["other", tx("Другое", "Інше", "Andere", "Other")]])}${field(tr(words.arrival, language), "arrival_date", person.arrival_date, "date")}${select(words.document, "document", documents)}${select(words.insurance, "insurance", yesNo)}</div>
      <details><summary>${esc(tr(words.details, language))}</summary><div class="family-editor-grid">${field(tr(words.residence, language), "city", person.city)}${select(words.capacity, "capacity", capacities)}${select(words.care, "care", yesNo)}${field(tr(words.revenue, language), "revenue", person.revenue, "number", 'min="0" step="0.01"')}${field(tr(words.expenses, language), "expenses", person.expenses, "number", 'min="0" step="0.01"')}${field(tr(words.period, language), "income_period", person.income_period)}${field(tr(words.taxes, language), "taxes", person.taxes, "number", 'min="0" step="0.01"')}${field(tr(words.applied, language), "applications", person.applications)}${field(tr(words.decisions, language), "decisions", person.decisions)}</div></details></section>`;
  }
  function action(id, person, title, source, authority, docs, timing, missing, next, status = "unverified") {
    return { id: `${person.id}:${id}`, personId: person.id, title, source, authority, docs, timing, missing, next, status };
  }
  function build(answers, language) {
    const location = place(answers.city, answers.postal_code);
    const people = (answers.people || []).map((p, i) => ({ ...p, id: p.id || `p${i + 1}` }));
    const localSources = new Set(["residence", "anmeldung", "jobcenter", "social", "care", "helpcare", "wohngeld", "kita", "but", "car"]);
    const where = (source, personPlace) => !personPlace.known && localSources.has(source) ? (source === "jobcenter" ? "directoryJobcenter" : "directory") : source;
    const result = [];
    const A = (p, id, title, source, docs, timing, missing, next, initial) => {
      const personPlace = place(p.city || answers.city, p.city ? "" : answers.postal_code);
      const item = action(id, p, title, where(source, personPlace), personPlace.known || !localSources.has(source) ? official[source][0] : tr(words.unknownPlace, language), docs, timing, missing, next, initial);
      item.territory = personPlace.known ? `${personPlace.city} / ${personPlace.district}` : tr(words.unknownPlace, language);
      result.push(item);
    };
    for (const p of people) {
      const role = p.role;
      const isChild = role === "child" || (p.age !== "" && Number(p.age) < 18);
      const isSenior = role === "parent" && Number(p.age) >= 67;
      A(p, "residence", tx("§24 / Fiktionsbescheinigung", "§24 / Fiktionsbescheinigung", "§24 / Fiktionsbescheinigung", "§24 / Fiktionsbescheinigung"), "residence", "Паспорт, дата въезда, имеющийся документ о пребывании; для ребёнка — свидетельство о рождении.", "Нужно уточнить дату и действующий статус каждого.", p.document === "unknown" ? "Какой документ о пребывании есть сейчас?" : "Сверить срок действия документа.", "Проверить документ и записаться в Ausländerbehörde.");
      A(p, "anmeldung", tx("Anmeldung", "Anmeldung", "Anmeldung", "Address registration"), "anmeldung", "Паспорт, Wohnungsgeberbestätigung, форма Anmeldung; для ребёнка — свидетельство о рождении.", "После фактического вселения; точный срок уточнить на странице города.", "Есть ли Meldebescheinigung именно этого человека?", "Проверить Meldebescheinigung или записаться в Bürgerservice.");
      A(p, "insurance", tx("Медицинское покрытие", "Медичне покриття", "Krankenversicherung", "Health coverage"), "health", "Страховой полис/карта, документ о пребывании, прежние Bescheide; при отсутствии — письменно выяснить ответственную кассу/ведомство.", "Проверить без промедления; для матери — срочно.", p.insurance === "yes" ? "Проверить действующий объём покрытия." : "Есть ли действующая страховка и доступ к лечению?", "Связаться с кассой или ведомством и получить письменное подтверждение.");
      A(p, "rent", tx("Аренда и доля жилья", "Оренда і частка житла", "Miete und Wohnanteil", "Rent and housing share"), isSenior ? "social" : "jobcenter", "Mietvertrag, Nebenkosten, подтверждение платежей, число жильцов и распределение комнат/расходов.", "Уточнить перед расчётом потребности.", "Какова общая аренда и доля этого человека?", "Собрать договор и расходы; не рассчитывать выплату без этих данных.");
      if (isChild) {
        A(p, "kindergeld", tx("Kindergeld", "Kindergeld", "Kindergeld", "Child benefit"), "kindergeld", "Свидетельство о рождении, Steuer-ID ребёнка и заявителя, документы о пребывании, банковские реквизиты заявителя.", "При подтверждённом праве выплата задним числом максимум за 6 месяцев.", "Подано ли заявление и кто получатель?", "Проверить право и подать в Familienkasse без ожидания других заявлений.");
        A(p, "kita", tx("Место в Kita", "Місце в Kita", "Kita-Platz", "Childcare place"), "kita", "Данные ребёнка и родителей; при работе — Arbeitgeberbescheinigung обоих родителей по требованиям города.", "В Überlingen Vormerkung минимум за 6 месяцев до желаемого начала.", "Есть ли Vormerkung в LITTLE BIRD и желаемая дата?", "Создать/проверить Vormerkung в системе города.");
        A(p, "but", tx("Bildung und Teilhabe", "Bildung und Teilhabe", "Bildung und Teilhabe", "Education and participation"), "but", "Заявление на ребёнка, Bescheid по SGB II/SGB XII, Wohngeld или KiZ; подтверждение расходов по нужной услуге.", "В Bodenseekreis с месяца поступления заявления; особенности зависят от базовой выплаты.", "Какой базовый Bescheid есть?", "Подать отдельное заявление на ребёнка и приложить нужный Bescheid.");
      } else if (isSenior) {
        A(p, "careadvice", tx("Консультация по уходу в Überlingen", "Консультація з догляду в Überlingen", "Pflegeberatung in Überlingen", "Care advice in Überlingen"), "care", "Медицинские выписки и краткое описание нужной ежедневной помощи.", "Приём в Überlingen по понедельникам; запись уточнить у Pflegestützpunkt.", "Какая помощь нужна каждый день?", "Записаться в Pflegestützpunkt Überlingen, Christophstraße 1.");
        A(p, "sgbxii", tx("Grundsicherung im Alter (SGB XII)", "Grundsicherung im Alter (SGB XII)", "Grundsicherung im Alter (SGB XII)", "Old-age basic income (SGB XII)"), "social", "Паспорт/пребывание, доход и пенсия, имущество, выписки, Mietvertrag, страховка.", "Требуется заявление; начало и право сверить с Sozialamt.", "Доход, имущество, пенсия, статус и прежний Bescheid матери?", "Отдельно обратиться в Sozialamt; не включать мать автоматически в Bedarfsgemeinschaft сына.");
        A(p, "pflegegrad", tx("Немецкая оценка Pflegegrad", "Німецька оцінка Pflegegrad", "Deutsche Pflegegrad-Begutachtung", "German care grade assessment"), "pflege", "Медицинские выписки, описание ежедневной помощи, украинский документ об инвалидности как доказательство — не эквивалент Pflegegrad.", "Заявление в Pflegekasse; стандартный срок решения 25 рабочих дней после поступления.", "Есть ли страхование в Pflegekasse и немецкий Bescheid?", "При подтверждённой Pflegekasse запросить оценку; украинская II группа не даёт Pflegegeld автоматически.");
        A(p, "hilfepflege", tx("Hilfe zur Pflege", "Hilfe zur Pflege", "Hilfe zur Pflege", "Care assistance"), "helpcare", "Медицинские доказательства, расходы на уход, доход, имущество, выписки, Mietvertrag, Bescheid Pflegekasse если есть.", "Требуется заявление в Sozialamt; уточнить начало и условия.", "Какая помощь нужна и чем она оплачивается?", "Обсудить потребность с Pflegestützpunkt Überlingen и подать отдельное заявление в Sozialamt.");
      } else if (role === "parent") {
        A(p, "agecheck", tx("Уточнить возраст и путь помощи", "Уточнити вік і шлях допомоги", "Alter und Leistungsweg klären", "Clarify age and support route"), "social", "Возраст, документ о пребывании, пенсия, доходы, имущество, расходы на жильё.", "Уточнить до выбора SGB II или SGB XII.", "Возраст и трудоспособность родителя?", "Связаться с Sozialamt для первичной проверки без включения в Bedarfsgemeinschaft сына.");
      } else {
        A(p, "sgbii", tx("Grundsicherungsgeld (SGB II)", "Grundsicherungsgeld (SGB II)", "Grundsicherungsgeld (SGB II)", "Basic income support (SGB II)"), "jobcenter", "Паспорт/пребывание, Meldebescheinigung, Mietvertrag, выписки за 3 месяца, доходы и имущество, Bescheide; при ФОП — Anlage EKS.", "При подтверждённом праве — с начала месяца подачи заявления, не раньше.", "Нуждаемость, статус, расходы, аренда и доходы всех членов Bedarfsgemeinschaft.", "Проверить право и подать заявление в Jobcenter; сохранить подтверждение отправки.");
      }
    }
    const adult = people.find((p) => p.role === "self") || people.find((p) => p.role !== "child");
    if (adult) {
      A(adult, "alternatives", tx("Сравнить SGB II с Wohngeld + KiZ", "Порівняти SGB II з Wohngeld + KiZ", "SGB II mit Wohngeld + KiZ vergleichen", "Compare SGB II with housing and child supplements"), "wohngeld", "Mietvertrag, доходы и расходы, состав домохозяйства, Kindergeld и имеющиеся Bescheide.", "Wohngeld обычно с месяца подачи заявления; совместимость проверить до выбора.", "Без аренды и чистого дохода сравнение невозможно.", "Сравнить варианты; Wohngeld не прибавлять к SGB II с уже учтённой арендой.");
      if (answers.has_ukrainian_fop) {
        A(adult, "fop", tx("ФОП: Anlage EKS", "ФОП: Anlage EKS", "FOP: Anlage EKS", "Sole trader: Anlage EKS"), "eks", "Выписки и поступления, счета/инвойсы, подтверждённые расходы, период, уплаченные налоги, украинские декларации, договоры, Bescheide.", "Предварительная EKS на период выплат, затем окончательная по факту.", "Поступления не равны прибыли. Для оценки нужны расходы, период, налоги.", "Подготовить EKS для Jobcenter и сохранить подтверждение подачи.");
        A(adult, "tax", tx("Налоговый пакет ФОП", "Податковий пакет ФОП", "Steuerpaket für Selbständige", "Sole trader tax pack"), "tax", "Украинская регистрация ФОП, декларации, банковские выписки, договоры, инвойсы, расходы, налоги, даты работы и проживания.", "Срок декларации уточняет Finanzamt/Steuerberater по налоговому году.", "Где выполнена работа и какие налоги уплачены? Новое соглашение применять только после подтверждения вступления в силу.", "Передать структурированные доходы, расходы, период и налоги Steuerberater.");
      }
      if (answers.has_car === "yes") A(adult, "car", tx("Автомобиль: имущество и регистрация", "Авто: майно й реєстрація", "Auto: Vermögen und Zulassung", "Car: assets and registration"), "car", "Право собственности, стоимость, регистрационные документы, страховка, ввоз/таможенные документы, техосмотр.", "Точный срок регистрации и страхование уточнить в местной Zulassungsstelle.", "Чья машина, когда ввезена, какая регистрация и страховка?", "Отдельно указать автомобиль как имущество и проверить право эксплуатации.");
      if (answers.stage === "planning") A(adult, "exit", tx("Подготовка выезда из Украины", "Підготовка виїзду з України", "Ausreise aus der Ukraine vorbereiten", "Prepare departure from Ukraine"), "exit", "Загранпаспорт, документы каждого члена семьи, документы об основании для выезда при наличии, актуальные воинские документы если применимо.", "Проверить правила на дату поездки непосредственно перед выездом.", "Дата поездки и личные основания для выезда?", "Уточнить актуальные правила ДПСУ; не делать автоматический вывод о праве пересечь границу.");
    }
    const proposal = people.some((p) => p.arrival_date && p.arrival_date > "2025-04-01");
    if (proposal && adult) A(adult, "draft", tx("Возможное изменение AsylbLG", "Можлива зміна AsylbLG", "Möglicher Wechsel zum AsylbLG", "Possible AsylbLG change"), "draft", "Дата въезда каждого, документы о пребывании и действующие Bescheide.", "Законопроект; дата вступления в силу официально не подтверждена.", "Проверить публикацию закона и переходные правила.", "Пока применять действующие правила; перепроверить перед подачей.", "unverified");
    const statuses = answers.application_states || {};
    result.forEach((item) => { if (statuses[item.id]) Object.assign(item, statuses[item.id]); item.ruleStatus = item.source === "draft" ? "draft" : "current_or_service"; item.effectiveAt = item.id.endsWith(":sgbii") ? "2026-07-01" : null; item.arrivalDate = people.find((p) => p.id === item.personId)?.arrival_date || null; item.sourceCheckedAt = "2026-10-27"; });
    const urgent = nextUrgent(result, people);
    const taxPacket = adult && answers.has_ukrainian_fop ? {
      purpose: "For review by Finanzamt / Steuerberater; not a tax or benefits calculation",
      residence_city: adult.city || answers.city || null,
      arrival_date: adult.arrival_date || null,
      income_period: adult.income_period || null,
      revenue_eur: adult.revenue || null,
      documented_expenses_eur: adult.expenses || null,
      taxes_paid_eur: adult.taxes || null,
      records_to_attach: ["Ukrainian FOP registration", "invoices and contracts", "bank statements", "expense receipts", "Ukrainian tax returns", "tax payment evidence", "German decisions if any"],
      treaty_status: "Do not apply a new treaty without official confirmation of entry into force",
    } : null;
    return { location, people, actions: result, urgent, taxPacket, ruleVersion: "2026-10-27.1", checkedAt: "2026-10-27", proposal };
  }
  function nextUrgent(actions, people) {
    return actions.find((a) => a.status !== "approved" && a.id.endsWith(":insurance") && people.find((p) => p.id === a.personId && p.role === "parent" && p.insurance !== "yes"))
      || actions.find((a) => a.status === "unverified" && a.id.endsWith(":residence"))
      || actions.find((a) => a.status === "unverified");
  }
  function render(plan, language, onState) {
    const { people, actions, urgent, location } = plan;
    const uncertainIncome = people.some((p) => p.revenue && (!p.expenses || !p.income_period)) || !document.querySelector('#onboardingForm')?.elements.monthly_rent.value;
    document.querySelector("#familyNext").innerHTML = urgent ? `<p class="section-label">${esc(tr(words.next, language))}</p><h3>${esc(tr(urgent.title, language))}</h3><p>${esc(urgent.next)}</p><small>${esc(location.known ? `${location.city} · ${location.district} · ${location.state}` : tr(words.unknownPlace, language))}</small>${uncertainIncome ? `<p>${esc(tr(words.noAmount, language))}</p>` : ""}` : "";
    document.querySelector("#familySummary").innerHTML = people.map((p, i) => {
      const mine = actions.filter((a) => a.personId === p.id);
      const next = mine.find((a) => !["approved"].includes(a.status));
      return `<article><strong>${esc(tr(words.person, language))} ${i + 1} · ${esc(tr(words[p.role] || words.other, language))}${p.age ? ` · ${esc(p.age)}` : ""}</strong><span>${esc(next ? tr(next.title, language) : tr(words.approved, language))}</span></article>`;
    }).join("");
    document.querySelector("#familyDetails summary").textContent = tr(words.each, language);
    const statusOptions = [["unverified", words.unverified], ["file", words.file], ["submitted", words.submitted], ["waiting", words.waiting], ["approved", words.approved], ["refused", words.refused]];
    document.querySelector("#familyActions").innerHTML = people.map((p, i) => `<section class="family-action-person"><h3>${esc(tr(words.person, language))} ${i + 1} · ${esc(tr(words[p.role] || words.other, language))}</h3>${actions.filter((a) => a.personId === p.id).map((a) => {
      const source = official[a.source] || official.directory;
      const arrivalLabel = { ru: "Дата въезда", uk: "Дата в'їзду", de: "Einreise", en: "Arrival" }[language];
      const effectiveLabel = { ru: "Норма действует с", uk: "Норма чинна з", de: "Regel gilt ab", en: "Rule effective from" }[language];
      const checkedLabel = { ru: "Источник проверен", uk: "Джерело перевірено", de: "Quelle geprüft", en: "Source checked" }[language];
      const ruleMeta = `${esc(arrivalLabel)}: ${esc(a.arrivalDate || tr(words.unknown, language))}${a.effectiveAt ? ` · ${esc(effectiveLabel)}: ${esc(a.effectiveAt)}` : ""} · ${esc(checkedLabel)}: ${esc(a.sourceCheckedAt)}`;
      return `<details class="family-action" data-action-id="${esc(a.id)}"><summary><strong>${esc(tr(a.title, language))}</strong><span>${esc(tr(words[a.status] || words.unverified, language))}</span></summary><div class="family-action-body"><p><b>${esc(tr(words.authority, language))}:</b> ${esc(a.authority)}</p><p><b>${esc(tr(words.documents, language))}:</b> ${esc(a.docs)}</p><p><b>${esc(tr(words.timing, language))}:</b> ${esc(a.timing)}</p><p><b>${esc(tr(words.missing, language))}:</b> ${esc(a.missing)}</p><p><b>${esc(tr(words.nextAction, language))}:</b> ${esc(a.next)}</p><p><b>${esc(tr(words.source, language))}:</b> <a href="${esc(source[1])}" target="_blank" rel="noreferrer">${esc(source[0])}</a> · ${esc(a.territory)} · ${a.source === "draft" ? esc(tr(words.pending, language)) : esc(tr(words.limited, language))}</p><p class="family-rule-meta">${ruleMeta}</p><label>${esc(tr(words.status, language))}<select data-action-status="${esc(a.id)}">${options(statusOptions, a.status, language)}</select></label><label>${esc(tr(words.proof, language))}<input data-action-proof="${esc(a.id)}" value="${esc(a.proof || "")}" maxlength="180"></label></div></details>`;
    }).join("")}</section>`).join("");
    const alternatives = document.querySelector('#familyActions select[data-action-status$=":alternatives"]')?.closest(".family-action");
    if (alternatives) {
      const link = document.createElement("a");
      link.href = official.kiz[1];
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = ` + ${official.kiz[0]}`;
      alternatives.querySelector(".family-action-body p:nth-of-type(6)")?.append(link);
    }
    if (plan.taxPacket) {
      const tax = document.createElement("details");
      tax.className = "family-tax-packet";
      tax.innerHTML = `<summary>${esc(tr(words.taxPacket, language))}</summary><p>${esc(tr(words.taxMissing, language))}</p><pre>${esc(JSON.stringify(plan.taxPacket, null, 2))}</pre><button type="button" class="secondary-button">${esc(tr(words.download, language))}</button>`;
      tax.querySelector("button").addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(plan.taxPacket, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "ua-de-tax-adviser-packet.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      document.querySelector("#familyActions").append(tax);
    }
    document.querySelector("#familyActions").onchange = (event) => {
      const id = event.target.dataset.actionStatus || event.target.dataset.actionProof;
      if (!id) return;
      const key = event.target.dataset.actionStatus ? "status" : "proof";
      const item = actions.find((a) => a.id === id);
      if (item) item[key] = event.target.value;
      if (key === "status") {
        const openActions = [...document.querySelectorAll("#familyActions .family-action[open]")].map((node) => node.dataset.actionId);
        plan.urgent = nextUrgent(actions, people);
        render(plan, language, onState);
        document.querySelectorAll("#familyActions .family-action").forEach((node) => { if (openActions.includes(node.dataset.actionId)) node.open = true; });
      }
      onState(id, key, event.target.value);
    };
  }
  window.uaDeFamilyRoute = { words, tr, personEditor, build, render, place, official, esc };
})();
