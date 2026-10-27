(() => {
  const copy = {
    ru: {
      caution: "Это первый ориентир по описанию, без проверки действующих правил и без юридического заключения. Сверьте детали на сайте ведомства.",
      ask: "В какой федеральной земле вы находитесь и есть ли уже письмо или решение ведомства?",
      housing: ["Сначала уточните, есть ли безопасное жильё на ближайшие дни. Если его нет, проверьте официальную точку прибытия или размещения в вашей земле.", "Укажите город и дату прибытия.", "Проверьте доступность размещения непосредственно перед поездкой.", "Паспорта и документы членов семьи"],
      letter: ["Главное в письме — точное требование и срок ответа. Сначала найдите их в оригинале, затем подготовьте только запрошенные документы.", "Откройте бесплатный разбор письма и проверьте распознанный текст.", "Отделите дату письма от срока ответа; если срок указан, подтвердите его по оригиналу.", "Само письмо и названные в нём приложения"],
      study: ["Для учёбы нужно отдельно проверить поступление, финансирование и влияние на текущий статус пребывания.", "Уточните вуз, программу и требования к поступлению.", "Проверьте последствия для выплат и страхования до изменения статуса.", "Документ о пребывании, диплом и сведения о программе"],
      work: ["Перед началом работы проверьте формулировку разрешения в документе о пребывании и влияние дохода на выплаты.", "Подготовьте сведения о вакансии или деятельности.", "Для самостоятельной работы отдельно проверьте регистрацию, налоги и страхование.", "Документ о пребывании, договор или описание деятельности"],
      other: ["Чтобы выбрать следующий шаг, сначала уточните статус пребывания, место проживания, состав семьи и наличие письма ведомства.", "Пройдите персональный маршрут — он покажет первую точку обращения.", "Если есть письмо со сроком, разберите его отдельно и сверьте дату в оригинале.", "Документ о пребывании и уже полученные письма"],
    },
    uk: {
      caution: "Це перший орієнтир за описом, без перевірки чинних правил і без юридичного висновку. Звірте деталі на сайті установи.",
      ask: "У якій федеральній землі ви перебуваєте і чи маєте вже лист або рішення установи?",
      housing: ["Спочатку з'ясуйте, чи є безпечне житло на найближчі дні. Якщо ні, перевірте офіційний пункт прибуття або розміщення у вашій землі.", "Укажіть місто й дату прибуття.", "Перевірте можливість розміщення безпосередньо перед поїздкою.", "Паспорти й документи членів сім'ї"],
      letter: ["Головне в листі — точна вимога й строк відповіді. Знайдіть їх в оригіналі та підготуйте лише запитані документи.", "Відкрийте безкоштовний розбір листа й перевірте розпізнаний текст.", "Відокремте дату листа від строку відповіді та підтвердьте його за оригіналом.", "Сам лист і названі в ньому додатки"],
      study: ["Для навчання окремо перевірте вступ, фінансування й вплив на поточний статус перебування.", "Уточніть заклад, програму й умови вступу.", "Перевірте наслідки для виплат і страхування до зміни статусу.", "Документ про перебування, диплом і відомості про програму"],
      work: ["Перед початком роботи перевірте дозвіл у документі про перебування й вплив доходу на виплати.", "Підготуйте дані про вакансію або діяльність.", "Для самостійної діяльності окремо перевірте реєстрацію, податки й страхування.", "Документ про перебування, договір або опис діяльності"],
      other: ["Щоб визначити наступний крок, уточніть статус перебування, житло, склад сім'ї та наявність листа установи.", "Пройдіть персональний маршрут, щоб побачити першу установу.", "Якщо в листі є строк, розберіть його окремо й звірте дату з оригіналом.", "Документ про перебування й отримані листи"],
    },
    de: {
      caution: "Dies ist eine erste Orientierung ohne Prüfung der aktuellen Regeln und keine Rechtsberatung. Gleichen Sie die Angaben mit der Behörde ab.",
      ask: "In welchem Bundesland sind Sie, und haben Sie bereits einen Behördenbrief oder Bescheid?",
      housing: ["Klären Sie zuerst, ob Sie für die nächsten Tage eine sichere Unterkunft haben. Falls nicht, prüfen Sie die offizielle Anlaufstelle Ihres Bundeslands.", "Nennen Sie Stadt und Ankunftsdatum.", "Prüfen Sie Unterbringungsmöglichkeiten kurz vor der Reise erneut.", "Ausweise und Familienunterlagen"],
      letter: ["Im Brief sind die genaue Aufforderung und die Antwortfrist entscheidend. Lesen Sie beides im Original nach.", "Nutzen Sie die kostenlose Briefanalyse und prüfen Sie den erkannten Text.", "Unterscheiden Sie Briefdatum und Antwortfrist.", "Der Brief und ausdrücklich verlangte Anlagen"],
      study: ["Für ein Studium müssen Zulassung, Finanzierung und Auswirkungen auf den Aufenthaltsstatus getrennt geprüft werden.", "Klären Sie Hochschule, Studiengang und Zulassungsvoraussetzungen.", "Prüfen Sie vor einer Statusänderung Folgen für Leistungen und Versicherung.", "Aufenthaltsdokument, Zeugnisse und Studiengangangaben"],
      work: ["Prüfen Sie vor Arbeitsbeginn die Erwerbstätigkeitserlaubnis im Aufenthaltsdokument und mögliche Folgen für Leistungen.", "Sammeln Sie Angaben zur Stelle oder Tätigkeit.", "Bei Selbstständigkeit prüfen Sie Anmeldung, Steuern und Versicherung gesondert.", "Aufenthaltsdokument und Vertrag oder Tätigkeitsbeschreibung"],
      other: ["Für den nächsten Schritt brauchen wir Aufenthaltsstatus, Wohnort, Familie und gegebenenfalls einen Behördenbrief.", "Nutzen Sie die persönliche Route für die erste Anlaufstelle.", "Prüfen Sie eine Frist im Originalbrief gesondert.", "Aufenthaltsdokument und vorhandene Behördenbriefe"],
    },
    en: {
      caution: "This is initial guidance without a check of current rules or legal advice. Verify details with the authority.",
      ask: "Which German state are you in, and do you already have an authority letter or decision?",
      housing: ["First establish whether you have safe accommodation for the next few days. If not, check the official arrival or accommodation point in your state.", "Specify your city and arrival date.", "Check accommodation availability again shortly before travel.", "Identity and family documents"],
      letter: ["The exact request and response deadline matter most. Find both in the original letter before preparing documents.", "Use the free letter analysis and check the extracted text.", "Separate the letter date from the response deadline.", "The letter and its explicitly requested attachments"],
      study: ["Admission, funding and effects on your residence status each need a separate check.", "Identify the institution, course and admission requirements.", "Check effects on benefits and insurance before changing status.", "Residence document, qualifications and course details"],
      work: ["Before starting work, check the employment wording on your residence document and the effect of income on benefits.", "Prepare details of the job or activity.", "For self-employment, check registration, tax and insurance separately.", "Residence document and contract or activity description"],
      other: ["To identify the next step, clarify residence status, location, family and whether you have an authority letter.", "Use the personal route to identify your first contact point.", "If a letter has a deadline, inspect the original separately.", "Residence document and any authority letters"],
    },
  };
  window.uaDeGuestPreview = (question, language) => {
    const text = question.toLowerCase();
    const topic = /жиль|житл|unterkunft|wohn|housing|accommodation|размещ|розміщ/.test(text) ? "housing"
      : /письм|лист|brief|bescheid|document|документ|jobcenter|finanzamt|frist|срок|строк/.test(text) ? "letter"
      : /учеб|учёб|навчан|stud|универс|універс|вуз|універ/.test(text) ? "study"
      : /работ|робот|arbeit|work|job|фоп|fop|самозан|selbst/.test(text) ? "work" : "other";
    const selected = copy[language] || copy.ru;
    const [summary, first, second, document] = selected[topic];
    return { provider: "guided_preview", summary, steps: [first, second], documents: [document],
      clarifying_questions: [selected.ask], caution: selected.caution, legal_uncertainty: "", sources: [] };
  };
})();
