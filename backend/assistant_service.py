from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any


TOPIC_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("housing", re.compile(r"жиль|квартир|аренд|лагер|размещ|житл|оренд|табір|unterkunft|wohnung|miete|housing|apartment|rent|shelter|camp", re.I)),
    ("benefits", re.compile(r"jobcenter|sozialamt|bürgergeld|пособ|выплат|дц|социал|допомог|виплат|соціал|benefit|allowance|welfare", re.I)),
    ("study", re.compile(r"универс|уч[её]б|студент|навчан|універс|studium|hochschule|ausbildung|study|university|student|training", re.I)),
    ("family", re.compile(r"семь|реб[её]н|супруг|родител|воссоедин|сім|дитин|подруж|батьк|возз'єднан|familie|nachzug|family|child|spouse|parent|reunification", re.I)),
    ("work", re.compile(r"работ|труд|професс|квалификац|робот|прац|професі|кваліфікац|arbeit|job|beruf|qualifikation|work|employment|profession|qualification", re.I)),
    ("arrival", re.compile(r"§\s?24|параграф|въезд|приех|регистрац|приїзд|в'їзд|реєстрац|aufenthalt|anmeldung|arrival|entry|residence|registration", re.I)),
)


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _pick_topic(question: str) -> str:
    for topic, pattern in TOPIC_RULES:
        if pattern.search(question):
            return topic
    return "arrival"


def _relevant_sources(
    sources: list[dict[str, Any]],
    topic: str,
) -> list[dict[str, Any]]:
    preferred = {topic, "arrival"}
    result = [
        {
            "title": source["title"],
            "authority": source["authority"],
            "url": source["url"],
            "status": source["status"],
            "last_checked_at": source["last_checked_at"],
        }
        for source in sources
        if source["topic"] in preferred
    ]
    return result[:3]


def answer_guest_question(
    question: str,
    sources: list[dict[str, Any]],
    language: str = "ru",
) -> dict[str, Any]:
    clean = re.sub(r"\s+", " ", question).strip()
    topic = _pick_topic(clean)

    topic_answers: dict[str, dict[str, Any]] = {
        "housing": {
            "summary": (
                "Сначала нужно разделить две ситуации: у вас совсем нет безопасного места "
                "для проживания или жильё есть, но вы не можете оплачивать его дальше. "
                "От этого зависит первый адрес обращения."
            ),
            "steps": [
                "Уточните город и федеральную землю, где вы находитесь или планируете остановиться.",
                "Не подписывайте долгосрочную аренду, рассчитывая на её оплату ведомством, до предварительной проверки условий.",
                "Если безопасного жилья нет, ищите официальную точку прибытия или размещения непосредственно перед поездкой.",
            ],
            "documents": ["Паспорт", "Документы семьи", "Подтверждение текущего жилья", "Сведения о доходах"],
        },
        "benefits": {
            "summary": (
                "Правильный порядок зависит от статуса пребывания, способности работать, "
                "дохода и состава семьи. Без этих данных нельзя надёжно выбрать между Jobcenter, "
                "Sozialamt и самостоятельным маршрутом."
            ),
            "steps": [
                "Проверьте, завершены ли регистрация адреса и оформление основания пребывания.",
                "Соберите сведения о доходах, банковских счетах, жилье и составе семьи.",
                "Если уже есть письмо или решение ведомства, проверьте указанную в нём дату ответа и загрузите документ для разбора.",
            ],
            "documents": ["Документ о пребывании", "Anmeldung", "Выписки", "Подтверждения доходов", "Договор жилья"],
        },
        "study": {
            "summary": (
                "Учёба может быть отдельной целью интеграции и не должна автоматически "
                "отменять уже выбранный маршрут пребывания. Сначала нужно проверить поступление, "
                "финансирование и последствия именно для вашего статуса."
            ),
            "steps": [
                "Уточните вуз, программу, язык обучения и текущий статус поступления.",
                "Запросите у вуза список документов и требования к признанию образования.",
                "До смены основания пребывания отдельно проверьте последствия для выплат, страхования и семьи.",
            ],
            "documents": ["Аттестат или диплом", "Приложение с оценками", "Подтверждение языка", "Документ о пребывании"],
        },
        "family": {
            "summary": (
                "Для семейного маршрута важно разделить супруга, несовершеннолетних детей, "
                "родителей и других родственников: для них могут действовать разные процедуры."
            ),
            "steps": [
                "Составьте список членов семьи, их возраст, гражданство и текущее местонахождение.",
                "Соберите документы о родстве и, если применимо, опеке.",
                "Проверьте конкретную процедуру по официальному источнику до записи или подачи.",
            ],
            "documents": ["Паспорта", "Свидетельства о рождении", "Документы о браке", "Документы об опеке"],
        },
        "work": {
            "summary": (
                "Нужно одновременно проверить право на работу, язык, признание квалификации "
                "и влияние дохода на текущие выплаты или страхование."
            ),
            "steps": [
                "Проверьте формулировку о разрешении на трудовую деятельность в документе о пребывании.",
                "Подготовьте дипломы, резюме и подтверждения опыта.",
                "До начала самостоятельной деятельности отдельно проверьте регистрацию, налоги и страхование.",
            ],
            "documents": ["Документ о пребывании", "Резюме", "Дипломы", "Подтверждения опыта"],
        },
        "arrival": {
            "summary": (
                "Чтобы определить первый адрес обращения, нужно знать, где вы сейчас, "
                "есть ли жильё, можете ли вы себя обеспечивать и кто приезжает вместе с вами."
            ),
            "steps": [
                "Укажите текущую страну или город и предполагаемую дату приезда.",
                "Определите, есть ли безопасное жильё хотя бы на первые дни.",
                "Пройдите персональный маршрут — он разделит размещение, регистрацию и основное ведомство.",
            ],
            "documents": ["Паспорт", "Документы семьи", "Медицинские сведения", "Подтверждения доходов и образования"],
        },
    }

    answer = topic_answers[topic]
    family_without_housing = (
        bool(re.search(r"украин|україн|ukrain", clean, re.I))
        and bool(re.search(r"реб[её]н|дитин|kind|child", clean, re.I))
        and bool(re.search(r"без жиль|нет жиль|жиль[яе]\s+нет|немає житл|без житл|ohne wohn|keine unterkunft|no housing|without housing", clean, re.I))
    )
    if family_without_housing:
        topic = "housing"
        special = {
            "ru": {
                "summary": "Для переезда из Украины с ребёнком без жилья сначала нужен безопасный вариант размещения. Маршрут зависит от места прибытия и даты поездки.",
                "steps": ["Откройте персональный маршрут и выберите «до переезда», «нет жилья» и поездку с ребёнком.", "Проверьте официальную точку прибытия и возможность размещения непосредственно перед поездкой.", "Подготовьте документы взрослого и ребёнка и сведения о родстве или опеке."],
                "questions": ["Где вы сейчас и в какой город или землю планируете приехать?", "Когда предполагается приезд и есть ли безопасное место хотя бы на первые дни?", "Сколько лет ребёнку и кто сопровождает его в поездке?"],
            },
            "uk": {
                "summary": "Для переїзду з України з дитиною без житла спочатку потрібен безпечний варіант розміщення. Маршрут залежить від місця прибуття й дати поїздки.",
                "steps": ["Відкрийте персональний маршрут і виберіть «до переїзду», «немає житла» та поїздку з дитиною.", "Перевірте офіційний пункт прибуття й можливість розміщення безпосередньо перед поїздкою.", "Підготуйте документи дорослого й дитини та відомості про родинні зв'язки або опіку."],
                "questions": ["Де ви зараз і до якого міста чи землі плануєте приїхати?", "Коли планується приїзд і чи є безпечне місце хоча б на перші дні?", "Скільки років дитині й хто супроводжує її в поїздці?"],
            },
            "de": {
                "summary": "Für die Anreise aus der Ukraine mit Kind und ohne Unterkunft brauchen Sie zuerst eine sichere Unterbringung. Die nächsten Schritte hängen von Ankunftsort und Reisedatum ab.",
                "steps": ["Öffnen Sie die persönliche Route und wählen Sie „vor der Anreise“, „keine Unterkunft“ und die Reise mit Kind.", "Prüfen Sie kurz vor der Reise die offizielle Anlaufstelle und Unterbringungsmöglichkeiten.", "Halten Sie Ausweise für Erwachsene und Kind sowie Nachweise zu Verwandtschaft oder Sorgerecht bereit."],
                "questions": ["Wo sind Sie jetzt und in welche Stadt oder welches Bundesland reisen Sie?", "Wann kommen Sie an und gibt es für die ersten Tage einen sicheren Schlafplatz?", "Wie alt ist das Kind und wer begleitet es?"],
            },
            "en": {
                "summary": "For travel from Ukraine with a child and no housing, secure accommodation comes first. The route depends on the arrival place and travel date.",
                "steps": ["Open the personal route and choose “before arrival”, “no housing”, and travel with a child.", "Check the official arrival point and accommodation options shortly before travelling.", "Prepare identity documents for the adult and child and proof of relationship or custody."],
                "questions": ["Where are you now, and which city or state will you travel to?", "When will you arrive, and is there a safe place for the first days?", "How old is the child, and who will accompany them?"],
            },
        }.get(language, {})
        answer = {**topic_answers[topic], "summary": special.get("summary", topic_answers[topic]["summary"]),
                  "steps": special.get("steps", topic_answers[topic]["steps"])}
        answer["documents"] = {
            "ru": ["Паспорта взрослого и ребёнка", "Подтверждение родства или опеки", "Сведения о возможном размещении"],
            "uk": ["Паспорти дорослого й дитини", "Підтвердження спорідненості або опіки", "Відомості про можливе розміщення"],
            "de": ["Ausweise von Erwachsenem und Kind", "Nachweis zu Verwandtschaft oder Sorgerecht", "Angaben zu einer möglichen Unterkunft"],
            "en": ["Identity documents for adult and child", "Proof of relationship or custody", "Details of possible accommodation"],
        }.get(language, topic_answers[topic]["documents"])
        clarifying_questions = special.get("questions", [])
    else:
        clarifying_questions = [
            "Где вы сейчас находитесь и в какую землю или город направляетесь?",
            "Какой у вас текущий статус пребывания или какой путь вы рассматриваете?",
            "Есть ли семья, жильё, доход или уже полученный документ ведомства?",
        ]
    return {
        "provider": "guided_prototype",
        "generated_at": utc_now(),
        "language": language,
        "topic": topic,
        "summary": answer["summary"],
        "steps": answer["steps"],
        "documents": answer["documents"],
        "caution": {
            "ru": "Это ориентир для следующего шага, а не решение ведомства и не юридическое заключение. Для окончательного ответа нужны факты вашей ситуации и актуальная проверка правил.",
            "uk": "Це орієнтир для наступного кроку, а не рішення установи чи юридичний висновок. Для остаточної відповіді потрібні факти вашої ситуації та актуальна перевірка правил.",
            "de": "Dies ist eine Orientierung für den nächsten Schritt, keine Behördenentscheidung oder Rechtsberatung. Für eine abschließende Antwort müssen Ihre Angaben und die aktuellen Regeln geprüft werden.",
            "en": "This guides your next step; it is not an authority decision or legal opinion. A final answer requires your specific facts and a check of current rules.",
        }.get(language, "Это ориентир для следующего шага, а не решение ведомства и не юридическое заключение."),
        "clarifying_questions": clarifying_questions,
        "sources": _relevant_sources(sources, topic),
    }
