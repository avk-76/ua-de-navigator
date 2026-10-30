from __future__ import annotations

import hashlib
import html
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


OFFICIAL_SOURCES: tuple[dict[str, Any], ...] = (
    {
        "id": "g4u-entry-residence",
        "topic": "arrival",
        "title": "Регистрация, вид на жительство и §24",
        "authority": "Germany4Ukraine — федеральный портал",
        "url": "https://www.germany4ukraine.de/DE/einreise-aufenthalt-und-rueckkehr/ukraine-aufenthaltserlaubnis/seite_node.html",
        "summary": "Въезд, регистрация, §24, Fiktionsbescheinigung и срок действия временной защиты.",
        "required_term_groups": (("§ 24", "§24"), ("4. März 2027", "4. M\u00e4rz 2027")),
    },
    {
        "id": "g4u-housing",
        "topic": "housing",
        "title": "Размещение и жильё",
        "authority": "Germany4Ukraine — федеральный портал",
        "url": "https://www.germany4ukraine.de/DE/unterkunft-fuer-ukrainer/unterbringung-und-wohnraum-fuer-gefluechtete/seite_node.html",
        "summary": "Государственное размещение, частное жильё и помощь с расходами на проживание.",
        "required_term_groups": (("Erstaufnahmeeinrichtung", "Ankunftszentrum"),),
    },
    {
        "id": "ba-work-capacity",
        "topic": "benefits",
        "title": "Трудоспособность и основное обеспечение",
        "authority": "Bundesagentur für Arbeit",
        "url": "https://www.arbeitsagentur.de/grundsicherung/finanziell-absichern/voraussetzungen-einkommen-vermoegen",
        "summary": "Критерий трудоспособности, нуждаемость и обращение в Jobcenter.",
        "required_term_groups": (("3 Stunden pro Tag", "drei Stunden pro Tag"),),
    },
    {
        "id": "bamf-family",
        "topic": "family",
        "title": "Воссоединение семьи",
        "authority": "Bundesamt für Migration und Flüchtlinge",
        "url": "https://www.bamf.de/DE/Themen/MigrationAufenthalt/ZuwandererDrittstaaten/Familie/NachzugZuDrittstaatlern/nachzug-zu-drittstaatlern-node.html",
        "summary": "Общие условия для супругов, несовершеннолетних детей, родителей и других родственников.",
        "required_term_groups": (("Eheleute", "Ehegatten"), ("minderjährige Kinder", "minderj\u00e4hrige Kinder")),
    },
    {
        "id": "g4u-study",
        "topic": "study",
        "title": "Учёба украинцев в Германии",
        "authority": "Germany4Ukraine — федеральный портал",
        "url": "https://www.germany4ukraine.de/DE/bildung-und-forschung/ukraine-studium-deutschland/seite_node.html",
        "summary": "Доступ к университету, консультациям, признанию образования и программам поддержки.",
        "required_term_groups": (("Studium", "Hochschule"), ("§ 24", "§24")),
    },
    {
        "id": "g4u-work",
        "topic": "work",
        "title": "Работа и Ausbildung по §24",
        "authority": "Germany4Ukraine — федеральный портал",
        "url": "https://www.germany4ukraine.de/DE/arbeit-und-soziales/ukrainer-arbeiten-in-deutschland/seite_node.html",
        "summary": "Доступ к работе и профессиональному обучению при временной защите.",
        "required_term_groups": (("Erwerbstätigkeit erlaubt", "Erwerbst\u00e4tigkeit erlaubt"),),
    },
)


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def source_seed_rows() -> list[dict[str, Any]]:
    return [
        {
            "id": source["id"],
            "topic": source["topic"],
            "title": source["title"],
            "authority": source["authority"],
            "url": source["url"],
            "summary": source["summary"],
            "status": "needs_review",
            "last_checked_at": None,
            "last_http_status": None,
            "content_hash": None,
            "validation_notes": "Источник внесён в каталог; содержание и применимость правила не проверены.",
        }
        for source in OFFICIAL_SOURCES
    ]


def _visible_text(payload: bytes, charset: str | None) -> str:
    decoded = payload.decode(charset or "utf-8", errors="replace")
    decoded = re.sub(r"<script\b[^>]*>.*?</script>", " ", decoded, flags=re.IGNORECASE | re.DOTALL)
    decoded = re.sub(r"<style\b[^>]*>.*?</style>", " ", decoded, flags=re.IGNORECASE | re.DOTALL)
    decoded = re.sub(r"<[^>]+>", " ", decoded)
    return re.sub(r"\s+", " ", html.unescape(decoded)).strip()


def _validate_terms(text: str, groups: tuple[tuple[str, ...], ...]) -> tuple[bool, list[str]]:
    folded = text.casefold()
    missing: list[str] = []
    for group in groups:
        if not any(term.casefold() in folded for term in group):
            missing.append(" / ".join(group))
    return not missing, missing


def refresh_source(source: dict[str, Any], timeout: float = 4.0) -> dict[str, Any]:
    request = Request(
        source["url"],
        headers={
            "User-Agent": "UA-DE-Navigator/0.3 (+local prototype; official-source freshness check)",
            "Accept-Language": "de-DE,de;q=0.9",
        },
    )
    checked_at = utc_now()
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = response.read(1_500_000)
            charset = response.headers.get_content_charset()
            text = _visible_text(payload, charset)
            valid, missing = _validate_terms(text, source["required_term_groups"])
            return {
                "id": source["id"],
                "status": "available_online" if valid else "needs_review",
                "last_checked_at": checked_at,
                "last_http_status": response.status,
                "content_hash": hashlib.sha256(payload).hexdigest(),
                "validation_notes": (
                    "Официальная страница доступна, контрольные слова найдены; содержание и применимость не проверены."
                    if valid
                    else f"Страница доступна, но контрольные формулировки изменились: {', '.join(missing)}."
                ),
            }
    except HTTPError as error:
        return {
            "id": source["id"],
            "status": "temporarily_unavailable",
            "last_checked_at": checked_at,
            "last_http_status": error.code,
            "content_hash": None,
            "validation_notes": f"Официальный источник ответил HTTP {error.code}.",
        }
    except (URLError, TimeoutError, OSError) as error:
        return {
            "id": source["id"],
            "status": "temporarily_unavailable",
            "last_checked_at": checked_at,
            "last_http_status": None,
            "content_hash": None,
            "validation_notes": f"Не удалось выполнить онлайн-проверку: {type(error).__name__}.",
        }


def refresh_all_sources(timeout: float = 4.0) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=min(6, len(OFFICIAL_SOURCES))) as executor:
        future_map = {
            executor.submit(refresh_source, source, timeout): source["id"]
            for source in OFFICIAL_SOURCES
        }
        for future in as_completed(future_map):
            results.append(future.result())
    return sorted(results, key=lambda item: item["id"])


def build_route(answers: dict[str, Any], sources: list[dict[str, Any]]) -> dict[str, Any]:
    stage = str(answers.get("stage") or "planning")
    housing = str(answers.get("housing") or "unknown")
    funding = str(answers.get("funding") or "unknown")
    work_capacity = str(answers.get("work_capacity") or "unknown")
    goals = [str(value) for value in answers.get("goals", []) if value]
    family = str(answers.get("family") or "alone")
    has_fop = bool(answers.get("has_ukrainian_fop"))

    if housing == "none" or funding == "none":
        arrival_track = {
            "id": "public_reception",
            "label": "Официальный центр прибытия и размещения",
            "title": "Сначала обеспечьте безопасное размещение",
            "description": (
                "Система должна подобрать проверенную точку прибытия и объяснить порядок регистрации "
                "и возможного распределения. Наличие мест подтверждается непосредственно перед поездкой."
            ),
        }
    else:
        arrival_track = {
            "id": "private_arrival",
            "label": "Самостоятельное размещение",
            "title": "Можно начинать с выбранного места проживания",
            "description": (
                "После жилья следующий базовый шаг — регистрация адреса и обращение в Ausländerbehörde. "
                "Если позже понадобится помощь с арендой, условия нужно проверить до финансовых обязательств."
            ),
        }

    if funding == "full" and (has_fop or "business" in goals):
        authority_track = {
            "id": "self_funded_fop",
            "label": "Самостоятельный маршрут и налоговый модуль",
            "title": "Основная линия: регистрация, страхование и налоги",
            "description": (
                "Jobcenter или Sozialamt не являются стартовой точкой, пока человек обеспечивает себя. "
                "Иностранные доходы и украинский ФОП собираются в отдельную ведомость для проверки."
            ),
            "risk": "yellow",
        }
    elif funding == "full":
        authority_track = {
            "id": "self_funded",
            "label": "Самостоятельный маршрут",
            "title": "Основная линия: регистрация и выбранная форма интеграции",
            "description": "Система ведёт к учёбе, работе, Ausbildung, семье или бизнесу без маршрута пособий.",
            "risk": "green",
        }
    elif work_capacity in {"retirement", "limited"}:
        authority_track = {
            "id": "socialamt",
            "label": "Sozialamt",
            "title": "Основное ведомство после регистрации: Sozialamt",
            "description": (
                "Предварительный маршрут для пенсионного возраста или ограниченной трудоспособности. "
                "Семейный состав и фактическую способность работать ведомство оценивает отдельно."
            ),
            "risk": "yellow",
        }
    elif work_capacity == "able":
        authority_track = {
            "id": "jobcenter",
            "label": "Jobcenter",
            "title": "Основное ведомство после регистрации: Jobcenter",
            "description": (
                "Предварительный маршрут для трудоспособного нуждающегося человека. "
                "Дата въезда, статус пребывания, доход и состав семьи могут изменить результат."
            ),
            "risk": "yellow",
        }
    else:
        authority_track = {
            "id": "needs_assessment",
            "label": "Нужно уточнение",
            "title": "Сначала уточните трудоспособность и источник содержания",
            "description": "Без этих данных нельзя безопасно выбрать между Jobcenter, Sozialamt и самостоятельным путём.",
            "risk": "yellow",
        }

    overlays: list[dict[str, str]] = []
    overlay_copy = {
        "work": (
            "Работа",
            "Проверить право на работу, признание квалификации, язык и путь к долгосрочному рабочему статусу.",
        ),
        "study": (
            "Университет",
            "§24 и обучение могут существовать одновременно. Переход на студенческий статус оценивается отдельно.",
        ),
        "ausbildung": (
            "Ausbildung",
            "Подобрать профессию, проверить язык, договор обучения и возможный долгосрочный маршрут.",
        ),
        "family": (
            "Семья",
            "Разделить супругов, несовершеннолетних детей, родителей и других родственников — правила различаются.",
        ),
        "business": (
            "Предпринимательство",
            "Разделить украинский ФОП, немецкую деятельность, иностранные доходы и медицинское страхование.",
        ),
        "safety": (
            "Временная защита",
            "Проверить право на §24, регистрацию, документы семьи и актуальный срок действия защиты.",
        ),
        "unknown": (
            "Выбор направления",
            "Система покажет доступные варианты и вопросы, которые стоит задать консультационному центру.",
        ),
    }
    for goal in goals:
        if goal in overlay_copy:
            label, description = overlay_copy[goal]
            overlays.append({"id": goal, "label": label, "description": description})

    if family != "alone" and not any(item["id"] == "family" for item in overlays):
        overlays.append(
            {
                "id": "family",
                "label": "Семья",
                "description": "Состав семьи влияет на размещение, выплаты, документы и возможность воссоединения.",
            }
        )

    steps = _next_steps(stage, arrival_track["id"], authority_track["id"], goals, family)
    source_topics = {"arrival", "housing", "benefits"}
    source_topics.update(goal for goal in goals if goal in {"study", "work", "family"})
    used_sources = [
        {
            "id": item["id"],
            "title": item["title"],
            "authority": item["authority"],
            "url": item["url"],
            "status": item["status"],
            "last_checked_at": item["last_checked_at"],
        }
        for item in sources
        if item["topic"] in source_topics
    ]
    freshness = "review_required"

    return {
        "version": "route-engine-0.1",
        "generated_at": utc_now(),
        "arrival_track": arrival_track,
        "authority_track": authority_track,
        "integration_tracks": overlays,
        "next_steps": steps,
        "source_freshness": freshness,
        "sources": used_sources,
        "notice": (
            "Это предварительный маршрут, а не решение ведомства. "
            "HTTP-проверка показывает только доступность страницы. Действующие правила, место и исходные документы нужно сверить отдельно."
        ),
    }


def _next_steps(
    stage: str,
    arrival_track: str,
    authority_track: str,
    goals: list[str],
    family: str,
) -> list[dict[str, str]]:
    steps: list[dict[str, str]] = []
    if stage == "planning":
        steps.append(
            {
                "title": "Подготовить документы к поездке",
                "description": "Паспорт, семейные документы, медицинские сведения, подтверждения доходов и образования.",
            }
        )
    if arrival_track == "public_reception":
        steps.append(
            {
                "title": "Проверить официальную точку прибытия",
                "description": "Адрес, режим работы и фактический приём проверяются непосредственно перед поездкой.",
            }
        )
    else:
        steps.append(
            {
                "title": "Зафиксировать адрес проживания",
                "description": "Сохранить подтверждение жилья и выяснить порядок Anmeldung в выбранном муниципалитете.",
            }
        )
    steps.append(
        {
            "title": "Регистрация и Ausländerbehörde",
            "description": "Определить компетентное ведомство и подать документы на подходящее основание пребывания.",
        }
    )
    if family != "alone":
        steps.append(
            {
                "title": "Собрать карту семьи",
                "description": "Кто едет вместе, кто остаётся, возраст детей, опека и действующие документы каждого.",
            }
        )
    authority_steps = {
        "jobcenter": (
            "Подготовить первичное обращение в Jobcenter",
            "Доходы, имущество, банковские выписки, жильё, страхование и состав семьи.",
        ),
        "socialamt": (
            "Подготовить обращение в Sozialamt",
            "Возраст, трудоспособность, пенсия, медицинские документы, доход и периоды предыдущих выплат.",
        ),
        "self_funded_fop": (
            "Собрать финансовый и налоговый контекст",
            "ФОП, договоры, банковские счета, аренда, зарубежные клиенты и периоды проживания.",
        ),
        "self_funded": (
            "Подтвердить самостоятельное обеспечение",
            "Жильё, медицинское страхование, средства и выбранная цель интеграции.",
        ),
        "needs_assessment": (
            "Уточнить ключевые обстоятельства",
            "Способность работать, собственные средства, семья и фактическая потребность в помощи.",
        ),
    }
    title, description = authority_steps[authority_track]
    steps.append({"title": title, "description": description})
    if "study" in goals:
        steps.append(
            {
                "title": "Сравнить §24 и студенческий маршрут",
                "description": "Поступление не означает автоматическую смену статуса; сравниваются финансирование и последствия.",
            }
        )
    return steps[:6]
