const documentInput = document.querySelector("#documentInput");
const fileInput = document.querySelector("#fileInput");
const analyzeButton = document.querySelector("#analyzeButton");
const languageSelect = document.querySelector("#languageSelect");
const resultGrid = document.querySelector("#resultGrid");
const riskCard = document.querySelector("#riskCard");
const riskTitle = document.querySelector("#riskTitle");
const riskSummary = document.querySelector("#riskSummary");
const fieldGrid = document.querySelector("#fieldGrid");
const sendChecklist = document.querySelector("#sendChecklist");
const plainExplanation = document.querySelector("#plainExplanation");
const fullTranslation = document.querySelector("#fullTranslation");
const nativeReply = document.querySelector("#nativeReply");
const germanDraft = document.querySelector("#germanDraft");
const handoffPackage = document.querySelector("#handoffPackage");
const downloadButton = document.querySelector("#downloadButton");
const statusPill = document.querySelector("#statusPill");
const summaryAction = document.querySelector("#summaryAction");
const summaryDeadline = document.querySelector("#summaryDeadline");
const summaryAuthority = document.querySelector("#summaryAuthority");
const summaryReference = document.querySelector("#summaryReference");

let latestHandoff = "";
let documentPreview = null;
let uploadedFileContext = null;

const samples = {
  finanzamt: `Finanzamt Berlin
Aktenzeichen: 12/345/67890
Steuernummer: 12/345/67890

Sehr geehrte Damen und Herren,

bitte reichen Sie bis zum 14.08.2026 die fehlenden Unterlagen zu Ihrer Einkommensteuererklärung 2025 ein.

Benötigt werden:
- Lohnsteuerbescheinigung 2025
- Nachweise zu Werbungskosten
- Nachweise zu Sonderausgaben

Falls die Unterlagen nicht fristgerecht eingehen, kann die Bearbeitung nicht abgeschlossen werden.

Mit freundlichen Grüßen
Ihr Finanzamt`,
  jobcenter: `Jobcenter Musterstadt
BG-Nummer: 12345BG67890

Mitwirkungspflicht

Sehr geehrte Frau Beispiel,

bitte reichen Sie bis zum 05.08.2026 Kontoauszüge der letzten drei Monate sowie Nachweise zu Ihrem Einkommen ein.

Bitte beachten Sie, dass fehlende Mitwirkung Auswirkungen auf Ihre Leistungen nach dem SGB II haben kann.

Mit freundlichen Grüßen
Ihr Jobcenter`,
  fop: `Finanzamt Hamburg
Steuernummer: 22/333/44444

Sehr geehrter Herr Beispiel,

im Rahmen der Bearbeitung Ihrer Einkommensteuererklärung bitten wir um Angaben zu ausländischen Einkünften.

Bitte teilen Sie mit, ob im Jahr 2025 Einkünfte aus einer selbständigen Tätigkeit in der Ukraine, insbesondere aus einem ukrainischen FOP, erzielt wurden.

Bitte reichen Sie die Unterlagen bis zum 20.08.2026 ein.

Mit freundlichen Grüßen
Ihr Finanzamt`,
};

const ui = {
  ru: {
    interfaceLanguage: "Язык интерфейса",
    navCases: "Мои дела",
    navDeadlines: "Сроки",
    navHelp: "Помощь",
    heroEyebrow: "БЮРОКРАТИЯ БЕЗ ЛИШНЕГО ШУМА",
    heroTitle: "Спокойно. Разберём, что делать дальше.",
    heroCopy: "Добавьте письмо — мы соберём главное в один понятный следующий шаг.",
    newCaseLabel: "НОВОЕ ДЕЛО",
    uploadTitle: "Добавьте письмо из ведомства",
    uploadButton: "Выбрать PDF, фото или текст",
    uploadHint: "Или вставьте текст письма ниже",
    localPrototype: "Локальный прототип",
    analyzeButton: "Показать следующий шаг",
    privacyNote: "Документ остаётся в этой локальной версии.",
    howTitle: "КАК ЭТО РАБОТАЕТ",
    flowOneTitle: "Добавьте письмо",
    flowOneText: "Файл или текст — как вам удобнее.",
    flowTwoTitle: "Проверьте главное",
    flowTwoText: "Ведомство, срок и требуемые документы.",
    flowThreeTitle: "Сделайте один шаг",
    flowThreeText: "Получите короткий план и черновик ответа.",
    flowQuote: "«Сначала главное. Детали — только когда они нужны».",
    resultLabel: "РЕЗУЛЬТАТ",
    resultTitle: "Ваш документ",
    translationHint: "Полный текст на выбранном языке",
    collapseLabel: "Свернуть",
    expandLabel: "Открыть полностью",
    analysisTitle: "Разбор документа",
    analysisHint: "Главное действие, срок и необходимые документы",
    expandDetailsLabel: "Показать детали",
    replyHint: "Готовый черновик — проверьте перед отправкой",
    expandReplyLabel: "Показать ответ",
    extrasLabel: "ДОПОЛНИТЕЛЬНО",
    extrasHint: "Эти разделы свернуты. Откройте нужный, чтобы увидеть детали.",
    fieldsHint: "Объяснение, даты, суммы и номера дела",
    nativeReplyHint: "Версия ответа для проверки смысла",
    actionLabel: "СЛЕДУЮЩЕЕ ДЕЙСТВИЕ",
    deadlineLabel: "СРОК",
    deadlineHint: "Проверьте дату в оригинале перед отправкой.",
    authorityLabel: "КТО НАПИСАЛ",
    documentsLabel: "ПОДГОТОВИТЬ",
    checklistBadge: "Чек-лист",
    replyLabel: "ЧЕРНОВИК",
    draftBadge: "Проверьте перед отправкой",
    detailsTitle: "Дополнительные детали",
    detailsCopy: "Перевод, найденные поля и пакет для специалиста",
    footerCopy: "Понятный следующий шаг в немецкой бюрократии.",
    prototypeDoesTitle: "Что делает прототип",
    does1: "Находит ведомство, даты, суммы и номера дел.",
    does2: "Ставит светофор риска.",
    does3: "Переводит письмо на выбранный язык.",
    does4: "Показывает, что именно отправить.",
    does5: "Готовит ответ и немецкий перевод.",
    samplesTitle: "Попробовать пример:",
    riskDecision: "Риск",
    fullTranslationTitle: "Полный перевод письма",
    fieldsTitle: "Найденные поля",
    requestTitle: "Что понадобится",
    explanationTitleBlock: "Понятное объяснение",
    nativeReplyTitle: "Ответ на вашем языке",
    germanReplyTitle: "Ответ на немецком",
    handoffTitle: "Пакет для специалиста",
    handoffExplain: "Сводка дела, сроков, документов и вопросов.",
    handoffPackageTitle: "Пакет для специалиста",
    handoffValueTitle: "Что это дает пользователю",
    handoffValueText: "Этот пакет помогает Steuerberater, Rechtsanwalt или Beratungsstelle быстрее понять кейс: ведомство, срок, требуемые документы, риск, перевод письма и подготовленный ответ собраны в одном месте.",
    handoffSummaryTitle: "Краткая сводка",
    handoffAuthority: "Ведомство",
    handoffDeadline: "Срок",
    handoffRisk: "Риск",
    handoffWhatToSend: "Что отправить",
    handoffFullTranslation: "Полный перевод письма",
    handoffPlainExplanation: "Понятное объяснение",
    handoffUserReply: "Ответ на языке пользователя",
    handoffGermanReply: "Немецкий ответ для отправки",
    downloadButton: "Скачать .md",
    placeholder: "Вставьте сюда текст письма или загрузите .txt. PDF/фото будет принимать следующий OCR-слой.",
    loaded: (name) => `Загружено: ${name}`,
    selectedNeedsOcr: (name) => `Выбран файл: ${name}. Для PDF/фото нужен OCR-слой; пока вставьте текст письма ниже.`,
    sampleLoaded: (name) => `Тест-кейс: ${name}`,
    emptyText: "Сначала вставьте текст письма или загрузите .txt",
  },
  uk: {
    interfaceLanguage: "Мова інтерфейсу",
    navCases: "Мої справи",
    navDeadlines: "Строки",
    navHelp: "Допомога",
    heroEyebrow: "БЮРОКРАТІЯ БЕЗ ЗАЙВОГО ШУМУ",
    heroTitle: "Спокійно. Розберімося, що робити далі.",
    heroCopy: "Додайте лист — ми зберемо головне в один зрозумілий наступний крок.",
    newCaseLabel: "НОВА СПРАВА",
    uploadTitle: "Додайте лист від установи",
    uploadButton: "Вибрати PDF, фото або текст",
    uploadHint: "Або вставте текст листа нижче",
    localPrototype: "Локальний прототип",
    analyzeButton: "Показати наступний крок",
    privacyNote: "Документ залишається в цій локальній версії.",
    howTitle: "ЯК ЦЕ ПРАЦЮЄ",
    flowOneTitle: "Додайте лист",
    flowOneText: "Файл або текст — як вам зручніше.",
    flowTwoTitle: "Перевірте головне",
    flowTwoText: "Установа, строк і потрібні документи.",
    flowThreeTitle: "Зробіть один крок",
    flowThreeText: "Отримайте короткий план і чернетку відповіді.",
    flowQuote: "«Спочатку головне. Деталі — лише коли вони потрібні».",
    resultLabel: "РЕЗУЛЬТАТ",
    resultTitle: "Ваш документ",
    translationHint: "Повний текст вибраною мовою",
    collapseLabel: "Згорнути",
    expandLabel: "Відкрити повністю",
    analysisTitle: "Розбір документа",
    analysisHint: "Головна дія, строк і потрібні документи",
    expandDetailsLabel: "Показати деталі",
    replyHint: "Готова чернетка — перевірте перед відправленням",
    expandReplyLabel: "Показати відповідь",
    extrasLabel: "ДОДАТКОВО",
    extrasHint: "Ці розділи згорнуті. Відкрийте потрібний, щоб побачити деталі.",
    fieldsHint: "Пояснення, дати, суми та номери справи",
    nativeReplyHint: "Версія відповіді для перевірки змісту",
    actionLabel: "НАСТУПНА ДІЯ",
    deadlineLabel: "СТРОК",
    deadlineHint: "Перевірте дату в оригіналі перед відправленням.",
    authorityLabel: "ХТО НАПИСАВ",
    documentsLabel: "ПІДГОТУВАТИ",
    checklistBadge: "Чек-лист",
    replyLabel: "ЧЕРНЕТКА",
    draftBadge: "Перевірте перед відправленням",
    detailsTitle: "Додаткові деталі",
    detailsCopy: "Переклад, знайдені поля та пакет для спеціаліста",
    footerCopy: "Зрозумілий наступний крок у німецькій бюрократії.",
    prototypeDoesTitle: "Що робить прототип",
    does1: "Знаходить відомство, дати, суми і номери справ.",
    does2: "Ставить світлофор ризику.",
    does3: "Перекладає лист вибраною мовою.",
    does4: "Показує, що саме відправити.",
    does5: "Готує відповідь і німецький переклад.",
    samplesTitle: "Спробувати приклад:",
    riskDecision: "Ризик",
    fullTranslationTitle: "Повний переклад листа",
    fieldsTitle: "Знайдені поля",
    requestTitle: "Що знадобиться",
    explanationTitleBlock: "Зрозуміле пояснення",
    nativeReplyTitle: "Відповідь вашою мовою",
    germanReplyTitle: "Відповідь німецькою",
    handoffTitle: "Пакет для спеціаліста",
    handoffExplain: "Зведення справи, строків, документів і питань.",
    handoffPackageTitle: "Пакет для спеціаліста",
    handoffValueTitle: "Що це дає користувачу",
    handoffValueText: "Цей пакет допомагає Steuerberater, Rechtsanwalt або Beratungsstelle швидше зрозуміти кейс: відомство, строк, потрібні документи, ризик, переклад листа і підготовлена відповідь зібрані в одному місці.",
    handoffSummaryTitle: "Коротка зведена інформація",
    handoffAuthority: "Відомство",
    handoffDeadline: "Строк",
    handoffRisk: "Ризик",
    handoffWhatToSend: "Що відправити",
    handoffFullTranslation: "Повний переклад листа",
    handoffPlainExplanation: "Зрозуміле пояснення",
    handoffUserReply: "Відповідь мовою користувача",
    handoffGermanReply: "Німецька відповідь для відправки",
    downloadButton: "Завантажити .md",
    placeholder: "Вставте сюди текст листа або завантажте .txt. PDF/фото прийматиме наступний OCR-шар.",
    loaded: (name) => `Завантажено: ${name}`,
    selectedNeedsOcr: (name) => `Вибрано файл: ${name}. Для PDF/фото потрібен OCR-шар; поки вставте текст листа нижче.`,
    sampleLoaded: (name) => `Тест-кейс: ${name}`,
    emptyText: "Спочатку вставте текст листа або завантажте .txt",
  },
  de: {
    interfaceLanguage: "Sprache",
    navCases: "Meine Fälle",
    navDeadlines: "Fristen",
    navHelp: "Hilfe",
    heroEyebrow: "BÜROKRATIE OHNE UNNÖTIGEN LÄRM",
    heroTitle: "Ganz ruhig. Wir klären den nächsten Schritt.",
    heroCopy: "Schreiben hinzufügen — wir fassen das Wesentliche in einem klaren nächsten Schritt zusammen.",
    newCaseLabel: "NEUER FALL",
    uploadTitle: "Schreiben einer Behörde hinzufügen",
    uploadButton: "PDF, Foto oder Text auswählen",
    uploadHint: "Oder den Text unten einfügen",
    localPrototype: "Lokaler Prototyp",
    analyzeButton: "Nächsten Schritt zeigen",
    privacyNote: "Das Dokument bleibt in dieser lokalen Version.",
    howTitle: "SO FUNKTIONIERT ES",
    flowOneTitle: "Schreiben hinzufügen",
    flowOneText: "Als Datei oder Text.",
    flowTwoTitle: "Das Wichtigste prüfen",
    flowTwoText: "Behörde, Frist und benötigte Unterlagen.",
    flowThreeTitle: "Einen Schritt machen",
    flowThreeText: "Kurzen Plan und Antwortentwurf erhalten.",
    flowQuote: "„Zuerst das Wesentliche. Details nur, wenn sie gebraucht werden.“",
    resultLabel: "ERGEBNIS",
    resultTitle: "Ihr Dokument",
    translationHint: "Vollständiger Text in der gewählten Sprache",
    collapseLabel: "Schließen",
    expandLabel: "Vollständig öffnen",
    analysisTitle: "Dokumentanalyse",
    analysisHint: "Nächster Schritt, Frist und benötigte Unterlagen",
    expandDetailsLabel: "Details anzeigen",
    replyHint: "Fertiger Entwurf — vor dem Versand prüfen",
    expandReplyLabel: "Antwort anzeigen",
    extrasLabel: "ZUSÄTZLICH",
    extrasHint: "Diese Bereiche sind geschlossen. Öffnen Sie den gewünschten Bereich für Details.",
    fieldsHint: "Erklärung, Daten, Beträge und Aktenzeichen",
    nativeReplyHint: "Antwortversion zur inhaltlichen Prüfung",
    actionLabel: "NÄCHSTER SCHRITT",
    deadlineLabel: "FRIST",
    deadlineHint: "Datum vor dem Versand im Original prüfen.",
    authorityLabel: "ABSENDER",
    documentsLabel: "VORBEREITEN",
    checklistBadge: "Checkliste",
    replyLabel: "ENTWURF",
    draftBadge: "Vor dem Versand prüfen",
    detailsTitle: "Weitere Details",
    detailsCopy: "Übersetzung, erkannte Felder und Fachpersonen-Paket",
    footerCopy: "Der klare nächste Schritt durch deutsche Bürokratie.",
    prototypeDoesTitle: "Was der Prototyp macht",
    does1: "Erkennt Behörde, Daten, Beträge und Aktenzeichen.",
    does2: "Bewertet das Risiko per Ampel.",
    does3: "Übersetzt das Schreiben in die gewählte Sprache.",
    does4: "Zeigt, was genau einzureichen ist.",
    does5: "Erstellt Antwort und deutsche Fassung.",
    samplesTitle: "Beispiel testen:",
    riskDecision: "Risiko",
    fullTranslationTitle: "Vollständige Übersetzung",
    fieldsTitle: "Erkannte Felder",
    requestTitle: "Was benötigt wird",
    explanationTitleBlock: "Einfache Erklärung",
    nativeReplyTitle: "Antwort in Ihrer Sprache",
    germanReplyTitle: "Antwort auf Deutsch",
    handoffTitle: "Paket für eine Fachperson",
    handoffExplain: "Übersicht zu Fall, Fristen, Unterlagen und Fragen.",
    handoffPackageTitle: "Paket für Fachperson",
    handoffValueTitle: "Nutzen für den Nutzer",
    handoffValueText: "Dieses Paket hilft Steuerberater, Rechtsanwalt oder Beratungsstelle, den Fall schneller zu verstehen: Behörde, Frist, benötigte Unterlagen, Risiko, Übersetzung und vorbereitete Antwort sind an einem Ort.",
    handoffSummaryTitle: "Kurzüberblick",
    handoffAuthority: "Behörde",
    handoffDeadline: "Frist",
    handoffRisk: "Risiko",
    handoffWhatToSend: "Was einzureichen ist",
    handoffFullTranslation: "Vollständige Übersetzung des Schreibens",
    handoffPlainExplanation: "Einfache Erklärung",
    handoffUserReply: "Antwort in Nutzersprache",
    handoffGermanReply: "Deutsche Antwort zum Versand",
    downloadButton: "Als .md laden",
    placeholder: "Text des Schreibens einfügen oder .txt hochladen. PDF/Fotos folgen mit OCR.",
    loaded: (name) => `Geladen: ${name}`,
    selectedNeedsOcr: (name) => `Datei gewählt: ${name}. Für PDF/Fotos wird OCR benötigt; bitte aktuell Text einfügen.`,
    sampleLoaded: (name) => `Testfall: ${name}`,
    emptyText: "Bitte zuerst Text einfügen oder .txt hochladen",
  },
  en: {
    interfaceLanguage: "Interface language",
    navCases: "My cases",
    navDeadlines: "Deadlines",
    navHelp: "Help",
    heroEyebrow: "BUREAUCRACY WITHOUT THE NOISE",
    heroTitle: "Take a breath. Let’s find the next step.",
    heroCopy: "Add a letter and we’ll turn it into one clear next step.",
    newCaseLabel: "NEW CASE",
    uploadTitle: "Add a letter from an authority",
    uploadButton: "Choose PDF, photo or text",
    uploadHint: "Or paste the letter text below",
    localPrototype: "Local prototype",
    analyzeButton: "Show the next step",
    privacyNote: "The document stays in this local version.",
    howTitle: "HOW IT WORKS",
    flowOneTitle: "Add the letter",
    flowOneText: "Use a file or paste the text.",
    flowTwoTitle: "Check the essentials",
    flowTwoText: "Authority, deadline and required documents.",
    flowThreeTitle: "Take one step",
    flowThreeText: "Get a short plan and a reply draft.",
    flowQuote: "“The essentials first. Details only when needed.”",
    resultLabel: "RESULT",
    resultTitle: "Your document",
    translationHint: "The full text in your selected language",
    collapseLabel: "Collapse",
    expandLabel: "Open fully",
    analysisTitle: "Document breakdown",
    analysisHint: "Next action, deadline and required documents",
    expandDetailsLabel: "Show details",
    replyHint: "Ready-to-review draft in German",
    expandReplyLabel: "Show reply",
    extrasLabel: "ADDITIONAL",
    extrasHint: "These sections are collapsed. Open one to see its details.",
    fieldsHint: "Explanation, dates, amounts and case numbers",
    nativeReplyHint: "Reply version for checking the meaning",
    actionLabel: "NEXT ACTION",
    deadlineLabel: "DEADLINE",
    deadlineHint: "Check the date against the original before sending.",
    authorityLabel: "WHO WROTE",
    documentsLabel: "PREPARE",
    checklistBadge: "Checklist",
    replyLabel: "DRAFT",
    draftBadge: "Review before sending",
    detailsTitle: "Additional details",
    detailsCopy: "Translation, extracted fields and specialist package",
    footerCopy: "A clear next step through German bureaucracy.",
    prototypeDoesTitle: "What the prototype does",
    does1: "Finds authority, dates, amounts and case numbers.",
    does2: "Shows a risk traffic light.",
    does3: "Translates the letter into the selected language.",
    does4: "Shows exactly what to send.",
    does5: "Creates a reply and German translation.",
    samplesTitle: "Try an example:",
    riskDecision: "Risk",
    fullTranslationTitle: "Full letter translation",
    fieldsTitle: "Extracted fields",
    requestTitle: "What you’ll need",
    explanationTitleBlock: "Plain explanation",
    nativeReplyTitle: "Reply in your language",
    germanReplyTitle: "Reply in German",
    handoffTitle: "Specialist package",
    handoffExplain: "A summary of the case, deadlines, documents and questions.",
    handoffPackageTitle: "Package for specialist",
    handoffValueTitle: "What this gives the user",
    handoffValueText: "This package helps a tax advisor, lawyer or advisory center understand the case faster: authority, deadline, requested documents, risk, translation and prepared reply are collected in one place.",
    handoffSummaryTitle: "Summary",
    handoffAuthority: "Authority",
    handoffDeadline: "Deadline",
    handoffRisk: "Risk",
    handoffWhatToSend: "What to send",
    handoffFullTranslation: "Full letter translation",
    handoffPlainExplanation: "Plain explanation",
    handoffUserReply: "Reply in user's language",
    handoffGermanReply: "German reply for sending",
    downloadButton: "Download .md",
    placeholder: "Paste the letter text here or upload .txt. PDF/photos will be handled by the next OCR layer.",
    loaded: (name) => `Loaded: ${name}`,
    selectedNeedsOcr: (name) => `Selected file: ${name}. PDF/photos need OCR; for now paste the letter text below.`,
    sampleLoaded: (name) => `Test case: ${name}`,
    emptyText: "First paste letter text or upload .txt",
  },
};

const tx = {
  ru: {
    notFound: "не найдено",
    unknownAuthority: "Не определено",
    original: "Оригинал",
    periodUnknown: "период не найден автоматически; проверьте письмо вручную",
    risk: {
      greenTitle: "Зеленый: вероятно можно действовать самому",
      greenSummary: "Похоже на стандартный документ без явных high-risk признаков.",
      yellowTitle: "Желтый: можно подготовить, но лучше проверить",
      yellowSummary: "Можно подготовить ответ и документы, но спорные места лучше проверить перед отправкой.",
      redTitle: "Красный: нужен специалист",
      redSummary: "Кейс содержит признаки высокой налоговой, юридической или социальной сложности.",
    },
    fieldLabels: {
      authority: "Ведомство",
      deadline: "Срок",
      dates: "Даты",
      amounts: "Суммы",
      request: "Требование",
    },
    sendDetail: (period, deadline) => `Период: ${period}. Отправить до: ${deadline}. Если документа нет, напишите короткое объяснение, когда сможете дослать.`,
    beforeSendTitle: "Перед отправкой",
    beforeSendDetail: "Проверьте имя, адрес, номер дела, срок, список приложений и способ отправки: почта, портал ведомства, электронная почта или личный кабинет.",
    specialistTitle: "Пакет для специалиста",
    specialistDetail: "Соберите письмо, приложения, подтверждения и краткую историю. Этот кейс лучше показать специалисту.",
    doc: {
      lohn: (year) => `Справка о зарплатном налоге${year ? ` за ${year} год` : ""} (Lohnsteuerbescheinigung)`,
      werbung: (year) => `Подтверждения профессиональных расходов${year ? ` за ${year} год` : ""} (Werbungskosten)`,
      sonder: (year) => `Подтверждения специальных расходов${year ? ` за ${year} год` : ""} (Sonderausgaben)`,
      konto: "Выписки с банковского счета за запрошенный период (Kontoauszüge)",
      income: "Подтверждения доходов: зарплата, выплаты, переводы, справки",
      foreign: "Сведения и документы по иностранным доходам",
      foreignStatement: "Таблица иностранных доходов: страна, тип дохода, даты, суммы, валюта",
      foreignPayments: "Платежные подтверждения или выписки по иностранным доходам",
      foreignTaxes: "Подтверждения налогов, уплаченных за границей, если есть",
    },
    source: {
      employer: "Где взять: у работодателя, в отделе расчёта зарплаты или отделе кадров.",
      bank: "Где взять: скачать PDF-выписку в онлайн-банке.",
      receipts: "Где взять: чеки, счета, договоры, подтверждения оплаты.",
      income: "Где взять: зарплатные листы, договоры, Bescheid, банковские поступления.",
      foreign: "Где взять: украинские декларации, ФОП-выписки, invoices, банковские выписки, справки об уплаченных налогах.",
      letter: "Где взять: проверьте точное название в письме.",
    },
    plain: (x) => `Коротко простыми словами:

Отправитель: ${x.authority}.
Что хотят: ${x.requestMeaning}
Срок: ${x.deadline}.
Суммы: ${x.amounts || "не найдено"}.
Номера дела: ${x.ids || "не найдено"}.
Риск: ${x.riskTitle}.

Главное: сначала проверьте срок и список приложений. Немецкий ответ ниже - шаблон, его нужно проверить перед отправкой.`,
    replyIntro: "Ниже ответ на вашем языке. Его не отправляют в ведомство, если ведомство принимает только немецкий. Для отправки используйте немецкий перевод ниже.",
    nativeReply: (x) => `Кому: ${x.authority}
От кого: [Ваше имя и фамилия]
Адрес: [Ваш адрес]

Тема: Ответ на ваше письмо / ${x.reference}

Уважаемые дамы и господа,

в ответ на ваше письмо направляю запрошенные документы:
${x.attachmentsTranslated}

Прошу подтвердить получение документов. Если потребуются дополнительные сведения, прошу сообщить мне об этом.

С уважением
[Ваше имя]`,
    letter: {
      taxOffice: "налоговая служба",
      jobcenter: "центр занятости/социальных выплат",
      caseNo: "Номер дела",
      taxNo: "Налоговый номер",
      bgNo: "Номер Bedarfsgemeinschaft",
      greetingNeutral: "Уважаемые дамы и господа,",
      greetingFemale: (name) => `Уважаемая госпожа ${name},`,
      greetingMale: (name) => `Уважаемый господин ${name},`,
      cooperationTitle: "Обязанность содействовать предоставлению сведений",
      cooperationWarning: "Обратите внимание: если вы не предоставите запрошенные сведения или документы, это может повлиять на получение вами выплат по SGB II.",
      needed: "Нужно предоставить следующие документы:",
      late: "Если документы не поступят вовремя, обработка дела не сможет быть завершена.",
      closing: "С уважением,",
      yourTaxOffice: "Ваша налоговая служба",
      yourJobcenter: "Ваш Jobcenter",
      taxDocsRequest: (date, year) => `Пожалуйста, предоставьте до ${date} недостающие документы к налоговой декларации за ${year} год.`,
      incomeDocsRequest: (date) => `Пожалуйста, предоставьте до ${date} выписки и подтверждения доходов.`,
      genericDeadline: (date) => `Пожалуйста, предоставьте запрошенные данные/документы до ${date}.`,
      foreignIncome: "В ходе обработки вашей декларации по подоходному налогу ведомство просит предоставить сведения об иностранных доходах.",
      fop: (year) => `Сообщите, получали ли вы в ${year || "указанном"} году доход от самостоятельной деятельности в Украине, в частности через украинский ФОП.`,
    },
    meaning: {
      income: "нужно предоставить выписки и подтверждения доходов.",
      taxDocs: "нужно дослать документы для налоговой декларации.",
      foreign: "ведомство спрашивает об иностранных доходах/Украине/ФОП; это high-risk кейс для Steuerberater.",
      payment: "есть требование оплаты, доплаты или финансовая претензия.",
      docs: "нужно дослать документы или подтверждения.",
      unknown: (line) => `автоматический перевод не уверен; оригинал: ${line}`,
    },
  },
  uk: {
    notFound: "не знайдено",
    unknownAuthority: "Не визначено",
    original: "Оригінал",
    periodUnknown: "період не знайдено автоматично; перевірте лист вручну",
    risk: {
      greenTitle: "Зелений: ймовірно можна діяти самостійно",
      greenSummary: "Схоже на стандартний документ без явних high-risk ознак.",
      yellowTitle: "Жовтий: можна підготувати, але краще перевірити",
      yellowSummary: "Можна підготувати відповідь і документи, але спірні місця краще перевірити перед відправкою.",
      redTitle: "Червоний: потрібен спеціаліст",
      redSummary: "Кейс містить ознаки високої податкової, юридичної або соціальної складності.",
    },
    fieldLabels: {
      authority: "Відомство",
      deadline: "Строк",
      dates: "Дати",
      amounts: "Суми",
      request: "Вимога",
    },
    sendDetail: (period, deadline) => `Період: ${period}. Надіслати до: ${deadline}. Якщо документа немає, напишіть коротке пояснення, коли зможете дослати.`,
    beforeSendTitle: "Перед відправкою",
    beforeSendDetail: "Перевірте ім'я, адресу, номер справи, строк, список додатків і спосіб відправки: пошта, портал відомства, електронна пошта або особистий кабінет.",
    specialistTitle: "Пакет для спеціаліста",
    specialistDetail: "Зберіть лист, додатки, підтвердження і коротку історію. Цей кейс краще показати спеціалісту.",
    doc: {
      lohn: (year) => `Довідка про податок із зарплати${year ? ` за ${year} рік` : ""} (Lohnsteuerbescheinigung)`,
      werbung: (year) => `Підтвердження професійних витрат${year ? ` за ${year} рік` : ""} (Werbungskosten)`,
      sonder: (year) => `Підтвердження спеціальних витрат${year ? ` за ${year} рік` : ""} (Sonderausgaben)`,
      konto: "Виписки з банківського рахунку за запитаний період (Kontoauszüge)",
      income: "Підтвердження доходів: зарплата, виплати, перекази, довідки",
      foreign: "Дані та документи щодо іноземних доходів",
      foreignStatement: "Таблиця іноземних доходів: країна, тип доходу, дати, суми, валюта",
      foreignPayments: "Платіжні підтвердження або виписки щодо іноземних доходів",
      foreignTaxes: "Підтвердження податків, сплачених за кордоном, якщо є",
    },
    source: {
      employer: "Де взяти: у роботодавця, у відділі розрахунку зарплати або відділі кадрів.",
      bank: "Де взяти: завантажити PDF-виписку в онлайн-банку.",
      receipts: "Де взяти: чеки, рахунки, договори, підтвердження оплати.",
      income: "Де взяти: зарплатні листи, договори, Bescheid, банківські надходження.",
      foreign: "Де взяти: українські декларації, ФОП-виписки, invoices, банківські виписки, довідки про сплачені податки.",
      letter: "Де взяти: перевірте точну назву в листі.",
    },
    plain: (x) => `Коротко простими словами:

Відправник: ${x.authority}.
Що хочуть: ${x.requestMeaning}
Строк: ${x.deadline}.
Суми: ${x.amounts || "не знайдено"}.
Номери справи: ${x.ids || "не знайдено"}.
Ризик: ${x.riskTitle}.

Головне: спочатку перевірте строк і список додатків. Німецька відповідь нижче - шаблон, його треба перевірити перед відправкою.`,
    replyIntro: "Нижче відповідь вашою мовою. Її не відправляють у відомство, якщо відомство приймає тільки німецьку. Для відправки використовуйте німецький переклад нижче.",
    nativeReply: (x) => `Кому: ${x.authority}
Від кого: [Ваше ім'я та прізвище]
Адреса: [Ваша адреса]

Тема: Відповідь на ваш лист / ${x.reference}

Шановні пані та панове,

у відповідь на ваш лист надсилаю запитані документи:
${x.attachmentsTranslated}

Прошу підтвердити отримання документів. Якщо потрібні додаткові дані або документи, прошу повідомити мені про це.

З повагою
[Ваше ім'я]`,
    letter: {
      taxOffice: "податкова служба",
      jobcenter: "центр зайнятості/соціальних виплат",
      caseNo: "Номер справи",
      taxNo: "Податковий номер",
      bgNo: "Номер Bedarfsgemeinschaft",
      greetingNeutral: "Шановні пані та панове,",
      greetingFemale: (name) => `Шановна пані ${name},`,
      greetingMale: (name) => `Шановний пане ${name},`,
      cooperationTitle: "Обов’язок сприяти наданню відомостей",
      cooperationWarning: "Зверніть увагу: якщо ви не надасте запитані відомості або документи, це може вплинути на отримання вами виплат відповідно до SGB II.",
      needed: "Потрібно надати такі документи:",
      late: "Якщо документи не надійдуть вчасно, обробку справи не зможуть завершити.",
      closing: "З повагою,",
      yourTaxOffice: "Ваша податкова служба",
      yourJobcenter: "Ваш Jobcenter",
      taxDocsRequest: (date, year) => `Будь ласка, надайте до ${date} відсутні документи до податкової декларації за ${year} рік.`,
      incomeDocsRequest: (date) => `Будь ласка, надайте до ${date} виписки та підтвердження доходів.`,
      genericDeadline: (date) => `Будь ласка, надайте запитані дані/документи до ${date}.`,
      foreignIncome: "Під час опрацювання вашої декларації з прибуткового податку відомство просить надати відомості про іноземні доходи.",
      fop: (year) => `Повідомте, чи отримували ви у ${year || "зазначеному"} році дохід від самостійної діяльності в Україні, зокрема через український ФОП.`,
    },
    meaning: {
      income: "потрібно надати виписки і підтвердження доходів.",
      taxDocs: "потрібно дослати документи для податкової декларації.",
      foreign: "відомство питає про іноземні доходи/Україну/ФОП; це high-risk кейс для Steuerberater.",
      payment: "є вимога оплати, доплати або фінансова претензія.",
      docs: "потрібно дослати документи або підтвердження.",
      unknown: (line) => `автоматичний переклад не впевнений; оригінал: ${line}`,
    },
  },
  de: null,
  en: null,
};

tx.de = {
  ...tx.ru,
  notFound: "nicht gefunden",
  unknownAuthority: "Nicht erkannt",
  original: "Original",
  periodUnknown: "Zeitraum nicht automatisch gefunden; Schreiben prüfen",
  sendDetail: (period, deadline) => `Zeitraum: ${period}. Senden bis: ${deadline}. Wenn das Dokument fehlt, kurz erklären, wann es nachgereicht werden kann.`,
  beforeSendTitle: "Vor dem Versand",
  beforeSendDetail: "Name, Adresse, Aktenzeichen, Frist, Anlagenliste und Versandweg prüfen.",
  specialistTitle: "Paket für Fachperson",
  specialistDetail: "Schreiben, Anlagen, Nachweise und kurze Sachverhaltsdarstellung sammeln. Diesen Fall besser einer Fachperson zeigen.",
  risk: {
    greenTitle: "Grün: wahrscheinlich selbst machbar",
    greenSummary: "Standardfall ohne erkennbare High-Risk-Merkmale.",
    yellowTitle: "Gelb: vorbereiten, aber prüfen",
    yellowSummary: "Antwort und Unterlagen können vorbereitet werden, strittige Punkte sollten geprüft werden.",
    redTitle: "Rot: Fachperson nötig",
    redSummary: "Der Fall enthält hohe steuerliche, rechtliche oder soziale Risiken.",
  },
  fieldLabels: { authority: "Behörde", deadline: "Frist", dates: "Daten", amounts: "Beträge", request: "Anforderung" },
  doc: {
    lohn: (year) => `Lohnsteuerbescheinigung${year ? ` ${year}` : ""}`,
    werbung: (year) => `Nachweise zu Werbungskosten${year ? ` ${year}` : ""}`,
    sonder: (year) => `Nachweise zu Sonderausgaben${year ? ` ${year}` : ""}`,
    konto: "Kontoauszüge für den angeforderten Zeitraum",
    income: "Einkommensnachweise: Lohn, Leistungen, Überweisungen, Bescheide",
    foreign: "Angaben und Unterlagen zu ausländischen Einkünften",
    foreignStatement: "Foreign Income Statement: Land, Einkunftsart, Daten, Beträge, Währung",
    foreignPayments: "Zahlungsnachweise oder Kontoauszüge zu ausländischen Einkünften",
    foreignTaxes: "Nachweise über im Ausland gezahlte Steuern, falls vorhanden",
  },
  source: {
    employer: "Quelle: Arbeitgeber oder Payroll/HR-Portal.",
    bank: "Quelle: PDF-Auszug im Online-Banking herunterladen.",
    receipts: "Quelle: Rechnungen, Quittungen, Verträge, Zahlungsnachweise.",
    income: "Quelle: Lohnabrechnungen, Verträge, Bescheide, Zahlungseingänge.",
    foreign: "Quelle: ukrainische Erklärungen, FOP-Auszüge, Rechnungen, Kontoauszüge, Steuerzahlungsnachweise.",
    letter: "Quelle: genaue Bezeichnung im Schreiben prüfen.",
  },
  letter: {
    taxOffice: "Finanzamt",
    jobcenter: "Jobcenter",
    caseNo: "Aktenzeichen",
    taxNo: "Steuernummer",
    bgNo: "BG-Nummer",
    greetingNeutral: "Sehr geehrte Damen und Herren,",
    greetingFemale: (name) => `Sehr geehrte Frau ${name},`,
    greetingMale: (name) => `Sehr geehrter Herr ${name},`,
    cooperationTitle: "Mitwirkungspflicht",
    cooperationWarning: "Bitte beachten Sie, dass fehlende Mitwirkung Auswirkungen auf Ihre Leistungen nach dem SGB II haben kann.",
    needed: "Folgende Unterlagen werden benötigt:",
    late: "Wenn die Unterlagen nicht fristgerecht eingehen, kann die Bearbeitung nicht abgeschlossen werden.",
    closing: "Mit freundlichen Grüßen,",
    yourTaxOffice: "Ihr Finanzamt",
    yourJobcenter: "Ihr Jobcenter",
    taxDocsRequest: (date, year) => `Bitte reichen Sie bis zum ${date} die fehlenden Unterlagen zur Einkommensteuererklärung ${year} ein.`,
    incomeDocsRequest: (date) => `Bitte reichen Sie bis zum ${date} Kontoauszüge und Einkommensnachweise ein.`,
    genericDeadline: (date) => `Bitte reichen Sie die angeforderten Angaben/Unterlagen bis zum ${date} ein.`,
    foreignIncome: "Im Rahmen der Bearbeitung Ihrer Einkommensteuererklärung bittet die Behörde um Angaben zu ausländischen Einkünften.",
    fop: (year) => `Bitte teilen Sie mit, ob im Jahr ${year || "[Jahr]"} Einkünfte aus einer selbständigen Tätigkeit in der Ukraine, insbesondere aus einem ukrainischen FOP, erzielt wurden.`,
  },
  meaning: {
    income: "es sollen Kontoauszüge und Einkommensnachweise eingereicht werden.",
    taxDocs: "es sollen Unterlagen zur Steuererklärung nachgereicht werden.",
    foreign: "die Behörde fragt nach ausländischen Einkünften/Ukraine/FOP; dies ist ein High-Risk-Fall für Steuerberater.",
    payment: "es geht um Zahlung, Nachzahlung oder eine Forderung.",
    docs: "es sollen Unterlagen oder Nachweise nachgereicht werden.",
    unknown: (line) => `automatische Einordnung unsicher; Original: ${line}`,
  },
  plain: (x) => `Kurz in einfachen Worten:

Absender: ${x.authority}.
Anforderung: ${x.requestMeaning}
Frist: ${x.deadline}.
Beträge: ${x.amounts || "nicht gefunden"}.
Aktenzeichen: ${x.ids || "nicht gefunden"}.
Risiko: ${x.riskTitle}.`,
  replyIntro: "Unten steht die Antwort in der gewählten Sprache. Für deutsche Behörden nutzen Sie die deutsche Fassung darunter.",
  nativeReply: (x) => buildGermanReplyText(x),
};

tx.en = {
  ...tx.ru,
  notFound: "not found",
  unknownAuthority: "Not detected",
  original: "Original",
  periodUnknown: "period not detected automatically; check the letter",
  sendDetail: (period, deadline) => `Period: ${period}. Send by: ${deadline}. If the document is missing, briefly explain when you can submit it.`,
  beforeSendTitle: "Before sending",
  beforeSendDetail: "Check name, address, case number, deadline, attachment list and sending method.",
  specialistTitle: "Package for specialist",
  specialistDetail: "Collect the letter, attachments, evidence and short case summary. This case should be shown to a specialist.",
  risk: {
    greenTitle: "Green: probably self-service",
    greenSummary: "Standard document with no clear high-risk signs.",
    yellowTitle: "Yellow: prepare, but check",
    yellowSummary: "Reply and documents can be prepared, but disputed points should be checked.",
    redTitle: "Red: specialist needed",
    redSummary: "The case contains high tax, legal or social risk.",
  },
  fieldLabels: { authority: "Authority", deadline: "Deadline", dates: "Dates", amounts: "Amounts", request: "Request" },
  doc: {
    lohn: (year) => `Annual wage tax statement${year ? ` for ${year}` : ""} (Lohnsteuerbescheinigung)`,
    werbung: (year) => `Proof of work-related expenses${year ? ` for ${year}` : ""} (Werbungskosten)`,
    sonder: (year) => `Proof of special expenses${year ? ` for ${year}` : ""} (Sonderausgaben)`,
    konto: "Bank statements for the requested period (Kontoauszüge)",
    income: "Income proof: salary, benefits, transfers, official notices",
    foreign: "Information and documents about foreign income",
    foreignStatement: "Foreign income table: country, income type, dates, amounts, currency",
    foreignPayments: "Payment proofs or bank statements for foreign income",
    foreignTaxes: "Proof of taxes paid abroad, if available",
  },
  source: {
    employer: "Where to get it: employer or payroll/HR portal.",
    bank: "Where to get it: download a PDF statement from online banking.",
    receipts: "Where to get it: receipts, invoices, contracts, payment confirmations.",
    income: "Where to get it: payslips, contracts, official notices, bank incoming payments.",
    foreign: "Where to get it: Ukrainian declarations, FOP records, invoices, bank statements, tax payment proof.",
    letter: "Where to get it: check the exact document name in the letter.",
  },
  letter: {
    taxOffice: "tax office",
    jobcenter: "job center/social benefits office",
    caseNo: "Case number",
    taxNo: "Tax number",
    bgNo: "BG number",
    greetingNeutral: "Dear Sir or Madam,",
    greetingFemale: (name) => `Dear Ms ${name},`,
    greetingMale: (name) => `Dear Mr ${name},`,
    cooperationTitle: "Duty to cooperate and provide information",
    cooperationWarning: "Please note that failing to provide the requested information or documents may affect your benefits under SGB II.",
    needed: "The following documents are required:",
    late: "If the documents are not received on time, processing cannot be completed.",
    closing: "Kind regards,",
    yourTaxOffice: "Your tax office",
    yourJobcenter: "Your Jobcenter",
    taxDocsRequest: (date, year) => `Please submit the missing documents for the ${year} income tax return by ${date}.`,
    incomeDocsRequest: (date) => `Please submit bank statements and income proof by ${date}.`,
    genericDeadline: (date) => `Please submit the requested information/documents by ${date}.`,
    foreignIncome: "While processing your income tax return, the authority asks you to provide information about foreign income.",
    fop: (year) => `Please state whether you received income from self-employment in Ukraine in ${year || "the stated year"}, particularly through a Ukrainian FOP.`,
  },
  meaning: {
    income: "you need to submit bank statements and income proof.",
    taxDocs: "you need to submit documents for the tax return.",
    foreign: "the authority asks about foreign income/Ukraine/FOP; this is a high-risk case for a tax advisor.",
    payment: "the letter contains a payment request, additional payment or financial claim.",
    docs: "you need to submit documents or evidence.",
    unknown: (line) => `automatic interpretation is uncertain; original: ${line}`,
  },
  plain: (x) => `In plain language:

Sender: ${x.authority}.
What they want: ${x.requestMeaning}
Deadline: ${x.deadline}.
Amounts: ${x.amounts || "not found"}.
Case numbers: ${x.ids || "not found"}.
Risk: ${x.riskTitle}.

Main point: check the deadline and attachments first. The German reply below is a template and must be checked before sending.`,
  replyIntro: "Below is the reply in your language. Do not send it if the authority requires German; use the German translation below.",
  nativeReply: (x) => `To: ${x.authority}
From: [Your full name]
Address: [Your address]

Subject: Reply to your letter / ${x.reference}

Dear Sir or Madam,

in response to your letter, I am submitting the requested documents:
${x.attachmentsTranslated}

Please confirm receipt of the documents. If further information or documents are required, please let me know.

Kind regards
[Your name]`,
};

const authorityPatterns = [
  ["Finanzamt", /finanzamt|steuerbescheid|einkommensteuer|umsatzsteuer|steuernummer/i],
  ["Jobcenter", /jobcenter|bürgergeld|buergergeld|bedarfsgemeinschaft|bg-nummer|mitwirkung/i],
  ["Krankenkasse", /krankenkasse|krankenversicherung|beitrag|versichert/i],
  ["Familienkasse", /familienkasse|kindergeld|kinderzuschlag/i],
  ["Ausländerbehörde", /ausländerbehörde|auslaenderbehoerde|aufenthalt|fiktionsbescheinigung/i],
  ["Rentenversicherung", /rentenversicherung|versicherungsverlauf|rente/i],
];

const redTriggers = [
  [/фоп|fop|ukraine|украин|ausland|foreign income|ausländische einkünfte|auslaendische einkuenfte/i],
  [/umsatzsteuer|vorsteuer|betriebsprüfung|betriebspruefung|schätzung|schaetzung/i],
  [/verspätungszuschlag|verspaetungszuschlag|säumniszuschlag|saeumniszuschlag|bußgeld|bussgeld|gericht|mahnbescheid|vollstreckung/i],
  [/crypto|krypto|bitcoin|ethereum|binance|coinbase/i],
  [/скрыть|не показывать|не указывать|hide income|verschweigen/i],
];

const yellowTriggers = [
  [/nachzahlung|zahlen sie|zahlung|forderung|betrag|€|eur/i],
  [/einspruch|widerspruch|rechtsbehelfsbelehrung/i],
  [/bürgergeld|buergergeld|jobcenter|einkommen|kontoauszug|kontoauszüge|kontoauszuege/i],
  [/krankenkasse|beitragsschuld|beitragsnachforderung|nachforderung/i],
  [/frist|bis zum|innerhalb|spätestens|spaetestens/i],
];

languageSelect.addEventListener("change", () => {
  applyInterfaceLanguage();
  if (!resultGrid.hidden && documentInput.value.trim()) {
    analyzeCurrentDocument();
  }
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const t = ui[getLang()];

  if (isBackendMode()) {
    statusPill.textContent = t.loaded(file.name);
    await extractViaBackend(file);
    return;
  }

  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    documentInput.value = await file.text();
    statusPill.textContent = t.loaded(file.name);
    return;
  }

  statusPill.textContent = t.selectedNeedsOcr(file.name);
});

documentInput.addEventListener("input", () => {
  uploadedFileContext = null;
  documentPreview = null;
});

document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => {
    documentInput.value = samples[button.dataset.sample] || "";
    statusPill.textContent = ui[getLang()].sampleLoaded(button.textContent);
  });
});

analyzeButton.addEventListener("click", analyzeCurrentDocument);

async function analyzeCurrentDocument() {
  const text = documentInput.value.trim();
  const lang = getLang();
  if (!text) {
    statusPill.textContent = ui[lang].emptyText;
    return;
  }

  const extracted = extractFields(text, lang);
  const risk = decideRisk(text, extracted, lang);
  const sendItems = buildSendChecklist(extracted, risk, lang);
  const translation = translateLetter(text, lang);
  const context = buildReplyContext(extracted, risk, sendItems, lang);
  const explanation = tx[lang].plain(context);
  const replyLocal = "Черновик появится после выбора дела и проверки доступных документов.";
  const replyGerman = "Antwortentwurf nach Prüfung der verfügbaren Unterlagen im Fall erstellen.";
  latestHandoff = buildHandoff(extracted, risk, sendItems, translation, explanation, replyLocal, replyGerman, lang);

  renderResult(extracted, risk, sendItems, translation, explanation, replyLocal, replyGerman, latestHandoff, lang);
  try {
    const response = await fetch("/api/documents/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Анализ недоступен");
    documentPreview = { analysis: payload.analysis, matches: payload.matches || [], text };
    // The case engine is the source for deadline and obligation candidates.
    // Keep the local translator, but do not let its illustrative rules
    // override the persisted case checklist.
    extracted.deadline = payload.analysis.deadline?.extracted_due_at || tx[lang].notFound;
    extracted.explicitDocuments = payload.analysis.required_documents || [];
    extracted.request = Object.values(payload.analysis.requirement_sources || {})[0] || extracted.request;
    const verifiedItems = buildSendChecklist(extracted, risk, lang);
    const verifiedContext = buildReplyContext(extracted, risk, verifiedItems, lang);
    const verifiedExplanation = tx[lang].plain(verifiedContext);
    latestHandoff = buildHandoff(extracted, risk, verifiedItems, translation, verifiedExplanation, replyLocal, replyGerman, lang);
    renderResult(extracted, risk, verifiedItems, translation, verifiedExplanation, replyLocal, replyGerman, latestHandoff, lang);
    renderDocumentCaseFlow();
  } catch (error) {
    document.querySelector("#documentCaseFlow").hidden = true;
    statusPill.textContent = `Дело не сохранено: ${error.message}`;
  }
}

function renderDocumentCaseFlow() {
  const panel = document.querySelector("#documentCaseFlow");
  const matches = document.querySelector("#documentCaseMatches");
  if (!panel || !documentPreview) return;
  const { analysis } = documentPreview;
  const lang = getLang();
  const copy = {
    ru: { needed: "Запрошено", none: "Требования не распознаны", verify: "Проверьте требования и срок в оригинале: локальные правила могут ошибаться.", due: "Возможный срок", reminder: "Напоминания появятся после подтверждения.", noDue: "Явный срок не найден. Проверьте письмо самостоятельно.", noMatch: "Похожее дело не найдено. Создайте новое дело." },
    uk: { needed: "Запитано", none: "Вимоги не розпізнано", verify: "Перевірте вимоги й строк в оригіналі: локальні правила можуть помилятися.", due: "Можливий строк", reminder: "Нагадування з'являться після підтвердження.", noDue: "Явного строку не знайдено. Перевірте лист самостійно.", noMatch: "Схожої справи не знайдено. Створіть нову справу." },
    de: { needed: "Angefordert", none: "Keine Anforderungen erkannt", verify: "Prüfen Sie Anforderungen und Frist im Original; lokale Regeln können Fehler machen.", due: "Mögliche Frist", reminder: "Erinnerungen folgen erst nach Bestätigung.", noDue: "Keine ausdrückliche Frist erkannt. Prüfen Sie das Schreiben selbst.", noMatch: "Kein ähnlicher Fall gefunden. Legen Sie einen neuen Fall an." },
    en: { needed: "Requested", none: "No requirements recognized", verify: "Check the requests and date against the original; local rules can make mistakes.", due: "Possible deadline", reminder: "Reminders start after you confirm it.", noDue: "No explicit deadline found. Check the letter yourself.", noMatch: "No similar case found. Create a new case." },
  }[lang];
  panel.hidden = false;
  document.querySelector("#documentCaseSummary").textContent =
    `${analysis.sender || analysis.authority_name} · ${analysis.document_type}. ${(analysis.required_documents || []).length ? copy.needed + ": " + analysis.required_documents.join(", ") : copy.none}. ${copy.verify}`;
  matches.innerHTML = documentPreview.matches.length
    ? documentPreview.matches.map((match) => `<button class="case-row" type="button" data-attach-case="${escapeHtml(match.case_id)}"><strong>${escapeHtml(window.uaDeI18n?.t(match.title) || match.title)}</strong><span>${escapeHtml(window.uaDeI18n?.t(match.reason) || match.reason)}</span></button>`).join("")
    : `<p>${escapeHtml(copy.noMatch)}</p>`;
  document.querySelector("#documentCaseMessage").textContent = analysis.deadline.extracted_due_at
    ? `${copy.due} ${analysis.deadline.extracted_due_at}. ${copy.reminder}`
    : copy.noDue;
}

async function attachDocumentToCase(caseId) {
  if (!documentPreview) return;
  const message = document.querySelector("#documentCaseMessage");
  message.textContent = "Сохраняю документ в деле…";
  try {
    const response = await fetch("/api/documents/attach", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId, analysis: documentPreview.analysis, text: documentPreview.text,
        stored_as: uploadedFileContext?.stored_as || null,
        file_name: uploadedFileContext?.file_name || "Вставленный текст",
        mime_type: uploadedFileContext?.mime_type || "text/plain",
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось сохранить");
    message.textContent = "Документ добавлен. Проверьте срок в карточке дела.";
    window.portalOpenCase?.(payload.case.id);
  } catch (error) { message.textContent = error.message; }
}

document.querySelector("#documentCaseMatches")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-attach-case]");
  if (button) attachDocumentToCase(button.dataset.attachCase);
});
document.querySelector("#createDocumentCase")?.addEventListener("click", () => attachDocumentToCase(null));

downloadButton.addEventListener("click", () => {
  const blob = new Blob([latestHandoff], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ua-de-handoff-package.md";
  link.click();
  URL.revokeObjectURL(url);
});

function getLang() {
  return languageSelect.value || "ru";
}

function applyInterfaceLanguage() {
  const lang = getLang();
  const dict = ui[lang];
  document.documentElement.lang = lang;
  documentInput.placeholder = dict.placeholder;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (dict[key]) node.textContent = dict[key];
  });
  if (!statusPill.textContent || Object.values(ui).some((x) => x.localPrototype === statusPill.textContent)) {
    statusPill.textContent = dict.localPrototype;
  }
}

function isBackendMode() {
  return location.protocol === "http:" || location.protocol === "https:";
}

async function extractViaBackend(file) {
  const form = new FormData();
  form.append("file", file);
  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      body: form,
    });
    const result = await response.json();
    if (result.text) {
      documentInput.value = result.text;
      uploadedFileContext = { stored_as: result.stored_as, file_name: file.name, mime_type: file.type };
    }
    statusPill.textContent = result.message || (result.ok ? ui[getLang()].loaded(file.name) : ui[getLang()].selectedNeedsOcr(file.name));
    if (result.ok && result.text) await analyzeCurrentDocument();
  } catch (error) {
    statusPill.textContent = `Upload failed: ${error.message}`;
  }
}

function extractFields(text, lang) {
  const t = tx[lang];
  const authority = authorityPatterns.find(([, pattern]) => pattern.test(text))?.[0] || t.unknownAuthority;
  const dates = [...text.matchAll(/\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[0]);
  const amounts = [...text.matchAll(/(?:\d{1,3}(?:[.\s]\d{3})*|\d+)(?:,\d{2})?\s?(?:€|EUR|Euro)/gi)].map((m) => m[0]);
  const identifiers = findIdentifiers(text);
  const deadline = findDeadline(text, dates, lang);
  const request = findRequest(text, lang);
  const explicitDocuments = extractExplicitDocuments(text);
  const periods = extractPeriods(text, lang);

  return { authority, dates: unique(dates), deadline, amounts: unique(amounts), identifiers, request, explicitDocuments, periods, lang };
}

function findIdentifiers(text) {
  const patterns = {
    Aktenzeichen: /(?:aktenzeichen|az\.?)[:\s]+([A-Z0-9/ .-]{4,40})/i,
    Steuernummer: /(?:steuernummer|steuer-nr\.?)[:\s]+([0-9/ .-]{6,30})/i,
    "Steuer-ID": /(?:steuer-id|identifikationsnummer|idnr\.?)[:\s]+([0-9 ]{8,20})/i,
    Kundennummer: /(?:kundennummer|kunden-nr\.?)[:\s]+([A-Z0-9/ .-]{4,35})/i,
    "BG-Nummer": /(?:bg-nummer|bedarfsgemeinschaftsnummer)[:\s]+([A-Z0-9/ .-]{4,35})/i,
  };
  return Object.fromEntries(Object.entries(patterns).map(([name, pattern]) => [name, text.match(pattern)?.[1]?.trim() || "-"]));
}

function findDeadline(text, dates, lang) {
  const cuePattern = /\b(?:(?:antwort|widerspruchs)?frist|bis zum|spätestens|spaetestens|einzureichen bis|vorzulegen bis)\b/i;
  const datePattern = /\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{2}-\d{2})\b/g;
  for (const line of text.split(/\r?\n/)) {
    const cue = cuePattern.exec(line);
    if (!cue) continue;
    const date = [...line.matchAll(datePattern)].find((match) => match.index >= cue.index);
    if (date) return date[0];
  }
  return tx[lang].notFound;
}

function findRequest(text, lang) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const positive = lines.filter((line) => !/\b(?:nicht erforderlich|nicht benötigt|nicht einzureichen|nicht vorzulegen)\b/i.test(line));
  return (
    positive.find((line) => /bitte\s+(reichen|senden|legen)|reichen sie|senden sie|legen sie|wir bitten/i.test(line)) ||
    positive.find((line) => /zahlen sie/i.test(line)) ||
    tx[lang].notFound
  );
}

function extractExplicitDocuments(text) {
  const docs = [];
  let inList = false;
  const inline = [
    [/kontoausz(?:ü|ue)ge?|kontoauszug/i, "Kontoauszüge"],
    [/mietvertrag/i, "Mietvertrag"],
    [/immatrikulationsbescheinigung/i, "Immatrikulationsbescheinigung"],
    [/nachweise? zu ihrem einkommen|einkommensnachweise?/i, "Einkommensnachweise"],
    [/lohnsteuerbescheinigung(?:\s*\d{4})?/i, "Lohnsteuerbescheinigung"],
    [/nachweise? zu werbungskosten/i, "Nachweise zu Werbungskosten"],
    [/nachweise? zu sonderausgaben/i, "Nachweise zu Sonderausgaben"],
    [/meldebescheinigung/i, "Meldebescheinigung"],
  ];
  for (const raw of text.split(/\r?\n|(?<=[.!?])\s+(?=[A-ZÄÖÜ])/)) {
    const line = raw.trim();
    if (!line) {
      if (inList) inList = false;
      continue;
    }
    if (/\b(?:nicht erforderlich|nicht benötigt|nicht einzureichen|nicht vorzulegen)\b/i.test(line)) continue;
    if (/benötigt werden|benoetigt werden|erforderlich sind/i.test(line)) {
      inList = true;
      continue;
    }
    const bullet = line.match(/^[-*•]\s*(.+)$/);
    const requested = inList || /\b(?:bitte|reichen sie|legen sie|senden sie|erforderlich|einzureichen|vorzulegen|nachzureichen)\b/i.test(line);
    if (bullet && requested) {
      docs.push(cleanDoc(bullet[1]));
      continue;
    }
    if (requested) inline.forEach(([pattern, label]) => { if (pattern.test(line)) docs.push(label); });
  }
  return unique(docs.map((doc) => cleanDoc(doc.replace(/^[-*•]\s*/, "")))).slice(0, 12);
}

function extractPeriods(text, lang) {
  const periodCopy = {
    ru: {
      year: (value) => `${value} год`,
      lastThreeMonths: "последние 3 месяца перед датой письма",
    },
    uk: {
      year: (value) => `${value} рік`,
      lastThreeMonths: "останні 3 місяці перед датою листа",
    },
    de: {
      year: (value) => `Jahr ${value}`,
      lastThreeMonths: "die letzten 3 Monate vor dem Schreiben",
    },
    en: {
      year: (value) => `year ${value}`,
      lastThreeMonths: "the last 3 months before the letter",
    },
  };
  const copy = periodCopy[lang] || periodCopy.ru;
  const periodLines = text
    .split(/\r?\n/)
    .filter((line) => /einkommensteuererklärung|einkommensteuererklaerung|lohnsteuerbescheinigung|werbungskosten|sonderausgaben|für das jahr|fuer das jahr|im jahr|zeitraum/i.test(line));
  const periods = periodLines.flatMap((line) => {
    const withoutDates = line.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, "");
    return [...withoutDates.matchAll(/\b(20\d{2})\b/g)].map((match) => copy.year(match[1]));
  });
  if (/letzten drei monate|letzten 3 monate/i.test(text)) periods.push(copy.lastThreeMonths);
  return unique(periods);
}

function decideRisk(text, extracted, lang) {
  const t = tx[lang].risk;
  if (redTriggers.some(([pattern]) => pattern.test(text))) return { level: "red", title: t.redTitle, summary: t.redSummary };
  if (yellowTriggers.some(([pattern]) => pattern.test(text)) || extracted.deadline !== tx[lang].notFound) return { level: "yellow", title: t.yellowTitle, summary: t.yellowSummary };
  return { level: "green", title: t.greenTitle, summary: t.greenSummary };
}

function buildSendChecklist(extracted, risk, lang) {
  const docs = extracted.explicitDocuments;
  const period = extracted.periods.join(", ") || tx[lang].periodUnknown;
  const items = docs.map((doc) => ({
    original: doc,
    title: translateDocName(doc, lang),
    detail: tx[lang].sendDetail(period, extracted.deadline),
    source: sourceHint(doc, lang),
  }));
  if (risk.level === "red") items.push({ title: tx[lang].specialistTitle, original: "", detail: tx[lang].specialistDetail, source: "" });
  items.push({ title: tx[lang].beforeSendTitle, original: "", detail: tx[lang].beforeSendDetail, source: "" });
  return items;
}

function scenarioDocs(extracted, risk) {
  if (/Jobcenter/i.test(extracted.authority)) return ["Kontoauszüge der letzten drei Monate", "Nachweise zu Ihrem Einkommen"];
  if (risk.level === "red") return ["Foreign Income Statement", "Nachweise zu ukrainischem FOP oder ausländischer Tätigkeit", "Zahlungsnachweise oder Kontoauszüge zu ausländischen Einkünften"];
  return ["Lohnsteuerbescheinigung", "Nachweise zu Werbungskosten", "Nachweise zu Sonderausgaben"];
}

function buildReplyContext(extracted, risk, sendItems, lang) {
  const ids = Object.entries(extracted.identifiers).filter(([, value]) => value !== "-");
  const reference = ids[0]?.[1] || "[Aktenzeichen/Kundennummer]";
  const translatedAttachments = sendItems.filter((item) => item.original).map((item) => `- ${item.title}`).join("\n");
  const germanAttachments = sendItems.filter((item) => item.original).map((item) => `- ${item.original}`).join("\n");
  return {
    authority: extracted.authority,
    reference,
    requestMeaning: requestMeaning(extracted.request, lang),
    deadline: extracted.deadline,
    amounts: extracted.amounts.join(", "),
    ids: ids.map(([k, v]) => `${k}: ${v}`).join("; "),
    riskTitle: risk.title,
    attachmentsTranslated: translatedAttachments || "- [документы из письма]",
    attachmentsGerman: germanAttachments || "- [Anlage]",
  };
}

function buildGermanReplyText(x) {
  return `An:
${x.authority}

Von:
[Ihr Vor- und Nachname]
[Ihre Adresse]

Betreff: Antwort zu Ihrem Schreiben / ${x.reference}

Sehr geehrte Damen und Herren,

in Bezug auf Ihr Schreiben übersende ich die angeforderten Unterlagen:
${x.attachmentsGerman}

Bitte bestätigen Sie mir kurz den Eingang der Unterlagen. Falls weitere Angaben oder Unterlagen erforderlich sind, bitte ich um kurze Mitteilung.

Mit freundlichen Grüßen
[Name]`;
}

function translateLetter(text, lang) {
  return text.split(/\r?\n/).map((line) => translateLine(line, lang)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function translateLine(raw, lang) {
  const line = raw.trim();
  const l = tx[lang].letter;
  if (!line) return "";
  const notRequired = line.match(/^(.+?)\s+sind\s+nicht\s+erforderlich\.?$/i);
  if (notRequired) {
    const names = notRequired[1].split(/\s+und\s+|,\s*/i).map((name) => translateDocName(name, lang)).join(", ");
    const ending = { ru: "не требуются", uk: "не потрібні", de: "sind nicht erforderlich", en: "are not required" }[lang];
    return names + " " + ending + ".";
  }
  if (/\b(?:nicht erforderlich|nicht benötigt|nicht einzureichen|nicht vorzulegen)\b/i.test(line)) return line;
  if (/^finanzamt\b/i.test(line)) return `${line} (${l.taxOffice})`;
  if (/^jobcenter\b/i.test(line)) return `${line} (${l.jobcenter})`;
  if (/^aktenzeichen/i.test(line)) return `${l.caseNo}: ${afterColon(line)}`;
  if (/^steuernummer/i.test(line)) return `${l.taxNo}: ${afterColon(line)}`;
  if (/^bg-nummer/i.test(line)) return `${l.bgNo}: ${afterColon(line)}`;
  if (/^mitwirkungspflicht[.!]?$/i.test(line)) return l.cooperationTitle;
  if (/sehr geehrte damen und herren/i.test(line)) return l.greetingNeutral;
  if (/sehr geehrte frau/i.test(line)) {
    const name = line.match(/sehr geehrte frau\s+(.+?)[,.]?$/i)?.[1]?.replace(/[,.]$/, "") || "";
    return l.greetingFemale(name);
  }
  if (/sehr geehrter herr/i.test(line)) {
    const name = line.match(/sehr geehrter herr\s+(.+?)[,.]?$/i)?.[1]?.replace(/[,.]$/, "") || "";
    return l.greetingMale(name);
  }
  if (/bitte reichen sie(?: die unterlagen)? bis zum/i.test(line)) return translateRequestLine(line, lang);
  if (/benötigt werden|benoetigt werden/i.test(line)) return l.needed;
  if (/lohnsteuerbescheinigung|werbungskosten|sonderausgaben|kontoausz|nachweise zu ihrem einkommen/i.test(line)) return translateDocName(line.replace(/^[-*•]\s*/, ""), lang);
  if (/falls die unterlagen nicht fristgerecht eingehen/i.test(line)) return l.late;
  if (/fehlende mitwirkung.*auswirkungen.*leistungen.*sgb\s*ii/i.test(line)) return l.cooperationWarning;
  if (/mit freundlichen grüßen|mit freundlichen gruessen/i.test(line)) return l.closing;
  if (/ihr finanzamt/i.test(line)) return l.yourTaxOffice;
  if (/ihr jobcenter/i.test(line)) return l.yourJobcenter;
  if (/ausländischen einkünften|auslaendischen einkuenften/i.test(line)) return l.foreignIncome;
  if (/ukrainischen fop|ukraine/i.test(line)) {
    const year = line.match(/\b(20\d{2})\b/)?.[1];
    return l.fop(year);
  }
  return line;
}

function translateRequestLine(line, lang) {
  const date = line.match(/\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/)?.[0] || tx[lang].notFound;
  const year = line.match(/einkommensteuererkl[aä]rung[^0-9]*(20\d{2})/i)?.[1]
    || line.match(/\b(20\d{2})\b/g)?.at(-1)
    || "";
  if (/einkommensteuererklärung|einkommensteuererklaerung/i.test(line)) return tx[lang].letter.taxDocsRequest(date, year);
  if (/kontoausz|einkommen/i.test(line)) return tx[lang].letter.incomeDocsRequest(date);
  return tx[lang].letter.genericDeadline(date);
}

function requestMeaning(line, lang) {
  const m = tx[lang].meaning;
  if (/lohnsteuerbescheinigung|werbungskosten|sonderausgaben|einkommensteuer/i.test(line)) return m.taxDocs;
  if (/kontoausz|einkommensnachweis|nachweise zu ihrem einkommen/i.test(line)) return m.income;
  if (/ausländischen|auslaendischen|ukraine|fop/i.test(line)) return m.foreign;
  if (/zahlung|nachzahlung|forderung/i.test(line)) return m.payment;
  if (/unterlagen|nachweis|nachweise|reichen sie/i.test(line)) return m.docs;
  return m.unknown(line);
}

function translateDocName(name, lang) {
  const year = name.match(/\b(20\d{2})\b/)?.[1];
  const d = tx[lang].doc;
  if (/immatrikulationsbescheinigung/i.test(name)) return {
    ru: "справка о зачислении в вуз", uk: "довідка про зарахування до вишу",
    de: "Immatrikulationsbescheinigung", en: "university enrollment certificate",
  }[lang];
  if (/mietvertrag/i.test(name)) return { ru: "договор аренды", uk: "договір оренди", de: "Mietvertrag", en: "rental agreement" }[lang];
  if (/lohnsteuerbescheinigung/i.test(name)) return d.lohn(year);
  if (/werbungskosten/i.test(name)) return d.werbung(year);
  if (/sonderausgaben/i.test(name)) return d.sonder(year);
  if (/kontoausz/i.test(name)) return d.konto;
  if (/nachweise zu ihrem einkommen|einkommensnachweise/i.test(name)) return d.income;
  if (/ausländischen|auslaendischen/i.test(name)) return d.foreign;
  if (/foreign income statement/i.test(name)) return d.foreignStatement;
  if (/zahlungsnachweise|kontoauszüge zu ausländischen/i.test(name)) return d.foreignPayments;
  if (/steuern/i.test(name) && /ausland/i.test(name)) return d.foreignTaxes;
  return name;
}

function sourceHint(name, lang) {
  const s = tx[lang].source;
  if (/lohnsteuerbescheinigung/i.test(name)) return s.employer;
  if (/kontoausz/i.test(name)) return s.bank;
  if (/werbungskosten|sonderausgaben/i.test(name)) return s.receipts;
  if (/einkommen/i.test(name)) return s.income;
  if (/ausländischen|foreign income|fop|ukraine/i.test(name)) return s.foreign;
  return s.letter;
}

function buildHandoff(extracted, risk, sendItems, translation, explanation, replyLocal, replyGerman, lang) {
  const u = ui[lang];
  return `# Handoff Package

## ${u.handoffValueTitle}

${u.handoffValueText}

## ${u.handoffSummaryTitle}

- ${u.handoffAuthority}: ${extracted.authority}
- ${u.handoffDeadline}: ${extracted.deadline}
- ${u.handoffRisk}: ${risk.title}

## ${u.handoffWhatToSend}

${sendItems.map((item) => `- ${item.title}${item.original ? ` (${item.original})` : ""}: ${item.detail}`).join("\n")}

## ${u.handoffFullTranslation}

${translation}

## ${u.handoffPlainExplanation}

${explanation}

## ${u.handoffUserReply}

${replyLocal}

## ${u.handoffGermanReply}

${replyGerman}
`;
}

function renderResult(extracted, risk, sendItems, translation, explanation, replyLocal, replyGerman, handoff, lang) {
  const t = tx[lang];
  const foundIds = Object.entries(extracted.identifiers).filter(([, value]) => value !== "-");
  resultGrid.hidden = false;
  riskCard.className = `risk-card ${risk.level}`;
  riskTitle.textContent = risk.title;
  riskSummary.textContent = risk.summary;
  summaryAction.textContent = requestMeaning(extracted.request, lang);
  summaryDeadline.textContent = extracted.deadline;
  summaryAuthority.textContent = extracted.authority;
  summaryReference.textContent = foundIds.length
    ? foundIds.map(([label, value]) => `${label}: ${value}`).join(" · ")
    : t.notFound;
  fullTranslation.textContent = translation;
  plainExplanation.textContent = explanation;
  nativeReply.textContent = replyLocal;
  germanDraft.textContent = replyGerman;
  handoffPackage.textContent = handoff;

  const fields = [
    [t.fieldLabels.authority, extracted.authority],
    [t.fieldLabels.deadline, extracted.deadline],
    [t.fieldLabels.dates, extracted.dates.join(", ") || t.notFound],
    [t.fieldLabels.amounts, extracted.amounts.join(", ") || t.notFound],
    [t.fieldLabels.request, extracted.request],
    ...Object.entries(extracted.identifiers),
  ];
  fieldGrid.innerHTML = fields.map(([label, value]) => `<div class="field"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`).join("");
  sendChecklist.innerHTML = sendItems
    .map((item) => `<div class="send-item"><strong>${escapeHtml(item.title)}</strong>${item.original ? `<em>${escapeHtml(`${t.original}: ${item.original}`)}</em>` : ""}<span>${escapeHtml(`${item.detail} ${item.source || ""}`)}</span></div>`)
    .join("");
  statusPill.textContent = ui[lang].analyzeButton;
  resultGrid.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cleanDoc(value) {
  return value.replace(/[.;:]$/, "").trim();
}

function afterColon(value) {
  return value.split(":").slice(1).join(":").trim() || value;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

applyInterfaceLanguage();
