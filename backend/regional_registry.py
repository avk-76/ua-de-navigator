from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any


VERIFIED_AT = "2026-07-27T00:00:00+00:00"


REGIONS: list[dict[str, Any]] = [
    {
        "slug": "baden-wuerttemberg-ueberlingen",
        "name": "Baden-Württemberg · Bodenseekreis",
        "short_name": "BW · Überlingen",
        "pilot_priority": 0,
        "focus_city": "Überlingen",
        "intake_status": "municipal_and_district_route",
        "status_note": "Для Überlingen компетентна городская Ausländerbehörde; Jobcenter и Sozialamt — Bodenseekreis. Подачу и условия нужно сверить лично.",
        "verification": {"level": "official_pages_reviewed", "last_verified_at": "2026-10-27T00:00:00+00:00", "refresh_interval_hours": 72},
        "services": [
            {"id": "ue-abh", "category": "migration_office", "name": "Stadt Überlingen · Ausländerwesen", "address": "Überlingen", "phone": "", "email": "", "url": "https://www.ueberlingen.de/-/behoerdenwegweiser/auslaenderwesen/oe6008056", "intake_status": "check_conditions", "audience": "Жители Überlingen", "note": "Городская Ausländerbehörde; запись и документы уточнить на официальном сайте.", "verification_level": "official_pages_reviewed", "last_verified_at": "2026-10-27T00:00:00+00:00"},
            {"id": "ue-jobcenter", "category": "jobcenter", "name": "Jobcenter Bodenseekreis", "address": "Albrechtstraße 75, 88045 Friedrichshafen", "phone": "07541 204-3800", "email": "jobcenter@bodenseekreis.de", "url": "https://www.bodenseekreis.de/soziales-gesundheit/arbeitslosigkeit-jobcenter/beratungsstelle-jobcenter-infotelefon/", "intake_status": "appointment", "audience": "Жители Bodenseekreis", "note": "SGB II; условия для каждого члена семьи уточнить отдельно.", "verification_level": "official_pages_reviewed", "last_verified_at": "2026-10-27T00:00:00+00:00"},
            {"id": "ue-social", "category": "social_office", "name": "Sozialamt Bodenseekreis", "address": "Glärnischstraße 1–3, 88045 Friedrichshafen", "phone": "07541 204-5198", "email": "grundsicherung@bodenseekreis.de", "url": "https://www.bodenseekreis.de/soziales-gesundheit/geldleistungen/sozialhilfe/grundsicherung/", "intake_status": "check_conditions", "audience": "Жители Bodenseekreis", "note": "SGB XII, в частности Grundsicherung im Alter.", "verification_level": "official_pages_reviewed", "last_verified_at": "2026-10-27T00:00:00+00:00"},
            {"id": "ue-wohngeld", "category": "housing_benefit", "name": "Stadt Überlingen · Soziales / Wohngeld", "address": "Christophstraße 1, 88662 Überlingen", "phone": "", "email": "", "url": "https://www.ueberlingen.de/sozialleistungen", "intake_status": "check_conditions", "audience": "Жители Überlingen", "note": "Местная приёмная для заявлений на Wohngeld.", "verification_level": "official_pages_reviewed", "last_verified_at": "2026-10-27T00:00:00+00:00"},
            {"id": "ue-care", "category": "care_advice", "name": "Pflegestützpunkt Bodenseekreis · Überlingen", "address": "Christophstraße 1, 88662 Überlingen", "phone": "", "email": "pflegestuetzpunkt@bodenseekreis.de", "url": "https://www.bodenseekreis.de/soziales-gesundheit/behinderung/pflegestuetzpunkt/ansprechpersonen-aussenberatungsstellen/", "intake_status": "check_conditions", "audience": "Жители Bodenseekreis", "note": "Консультация по уходу в Überlingen; время сверить перед визитом.", "verification_level": "official_pages_reviewed", "last_verified_at": "2026-10-27T00:00:00+00:00"},
        ],
    },
    {
        "slug": "north-rhine-westphalia",
        "name": "Nordrhein-Westfalen",
        "short_name": "NRW",
        "pilot_priority": 1,
        "focus_city": "Bochum",
        "intake_status": "official_intake_point",
        "status_note": (
            "Официальная первая точка для прибывших без места проживания — "
            "Landeserstaufnahmeeinrichtung Bochum. Родственники, жильё, работа или учёба "
            "могут быть основанием для просьбы о конкретном месте, но решение подтверждает ведомство."
        ),
        "verification": {
            "level": "official",
            "last_verified_at": VERIFIED_AT,
            "refresh_interval_hours": 24,
        },
        "services": [
            {
                "id": "nrw-lea-bochum",
                "category": "arrival_center",
                "name": "Landeserstaufnahmeeinrichtung Bochum (LEA)",
                "address": "Gersteinring 50, 44791 Bochum",
                "phone": "",
                "email": "",
                "url": "https://www.bochum.de/Aktuelle-Pressemeldungen/Unterbringung",
                "intake_status": "open_24_7",
                "audience": "Прибывшие без подтверждённого места проживания в NRW",
                "note": "Регистрация и последующее распределение по городам и общинам NRW.",
                "verification_level": "official",
                "last_verified_at": VERIFIED_AT,
            },
            {
                "id": "nrw-bochum-ukraine-faq",
                "category": "municipal_guidance",
                "name": "Stadt Bochum — Ukraine FAQ",
                "address": "Bochum",
                "phone": "0234 910-3777",
                "email": "ABH-UKR@bochum.de",
                "url": "https://www.bochum.de/Aktuelle-Pressemeldungen/FAQ",
                "intake_status": "check_conditions",
                "audience": "Люди с родственниками, жильём, работой или учёбой в Bochum",
                "note": "Условия приёма в Bochum и контакты Ausländerbüro. Перед поездкой нужно подтвердить применимость.",
                "verification_level": "official",
                "last_verified_at": VERIFIED_AT,
            },
        ],
    },
    {
        "slug": "berlin",
        "name": "Berlin",
        "short_name": "Berlin",
        "pilot_priority": 2,
        "focus_city": "Berlin",
        "intake_status": "official_intake_point",
        "status_note": (
            "Для первичного обращения используется Ankunftszentrum Ukraine в Reinickendorf. "
            "Часы приёма и режим обращения меняются, поэтому они проверяются перед поездкой."
        ),
        "verification": {
            "level": "official",
            "last_verified_at": VERIFIED_AT,
            "refresh_interval_hours": 24,
        },
        "services": [
            {
                "id": "berlin-laf-arrival",
                "category": "arrival_center",
                "name": "LAF — Ankunftszentrum Ukraine",
                "address": "Oranienburger Straße 285, 13437 Berlin",
                "phone": "",
                "email": "",
                "url": "https://www.berlin.de/lfu/",
                "intake_status": "limited_walk_in",
                "audience": "Вновь прибывшие из Украины, которым требуется размещение и распределение",
                "note": "Информационный пункт Haus 22 работает круглосуточно; часы приёма без записи проверяйте на странице LAF.",
                "verification_level": "official",
                "last_verified_at": VERIFIED_AT,
            }
        ],
    },
    {
        "slug": "baden-wuerttemberg-konstanz",
        "name": "Baden-Württemberg",
        "short_name": "BW · Konstanz",
        "pilot_priority": 3,
        "focus_city": "Konstanz",
        "intake_status": "municipal_and_district_route",
        "status_note": (
            "В Landkreis Konstanz приём продолжается по земельной и районной квоте. "
            "Для частного жилья первый шаг — Anmeldung, затем компетентная Ausländerbehörde."
        ),
        "verification": {
            "level": "official",
            "last_verified_at": VERIFIED_AT,
            "refresh_interval_hours": 72,
        },
        "services": [
            {
                "id": "kn-migration-office",
                "category": "migration_office",
                "name": "Landratsamt Konstanz — Amt für Migration und Integration",
                "address": "Benediktinerplatz 1, 78467 Konstanz",
                "phone": "+49 7531 800-1158",
                "email": "Amt-fuer-Migration-und-Integration@LRAKN.de",
                "url": "https://www.lrakn.de/service-und-verwaltung/aemter/migration%20integration",
                "intake_status": "office_hours",
                "audience": "Прибывшие и проживающие в Landkreis Konstanz",
                "note": "Размещение, социальная служба, выплаты и интеграция на уровне района.",
                "verification_level": "official",
                "last_verified_at": VERIFIED_AT,
            },
            {
                "id": "kn-local-advisers",
                "category": "integration_advice",
                "name": "Kommunale Integrations- und Flüchtlingsbeauftragte",
                "address": "Landkreis Konstanz",
                "phone": "",
                "email": "",
                "url": "https://www.lrakn.de/integration%2CLru/kommunale%2Bberatungsstellen",
                "intake_status": "directory_search",
                "audience": "Жители городов и общин Landkreis Konstanz",
                "note": "Официальный список локальных координаторов, включая Konstanz, Singen и Radolfzell.",
                "verification_level": "official",
                "last_verified_at": VERIFIED_AT,
            },
        ],
    },
]


FEDERAL_DIRECTORIES = [
    {
        "id": "federal-regional-portals",
        "category": "official_portals",
        "name": "Germany4Ukraine — региональные порталы",
        "url": "https://www.germany4ukraine.de/DE/online-services/regionale-informationsangebote/seite_node.html",
        "verification_level": "official",
        "note": "Официальные информационные страницы федеральных земель.",
    },
    {
        "id": "federal-bamf-navi",
        "category": "migration_advice",
        "name": "BAMF-NAvI",
        "url": "https://bamf-navi.bamf.de/de/Themen/Beratungsstellen/",
        "verification_level": "official",
        "note": "Ausländerbehörden, миграционные консультации и интеграционные курсы.",
    },
    {
        "id": "federal-ba-directory",
        "category": "jobcenter",
        "name": "Bundesagentur für Arbeit — Dienststellensuche",
        "url": "https://www.arbeitsagentur.de/leichte-sprache/bedienungs-anleitung/ort",
        "verification_level": "official",
        "note": "Поиск Jobcenter, Agentur für Arbeit и Familienkasse по месту проживания.",
    },
    {
        "id": "network-caritas",
        "category": "charity",
        "name": "Caritas — Migrationsberatung",
        "url": "https://www.caritas.de/hilfeundberatung/onlineberatung/migration/adressen",
        "verification_level": "organization",
        "note": "Поиск консультационных пунктов Caritas по городу или индексу.",
    },
    {
        "id": "network-tafel",
        "category": "food_support",
        "name": "Tafel-Suche",
        "url": "https://www.tafel.de/ueber-uns/die-tafeln/tafel-suche/?L=0die",
        "verification_level": "organization",
        "note": "Поиск ближайшей Tafel и её собственных условий доступа.",
    },
    {
        "id": "network-bdue",
        "category": "interpreters",
        "name": "BDÜ — поиск переводчиков",
        "url": "https://recherche.bdue.de/",
        "verification_level": "professional_association",
        "note": "Профессиональные устные и письменные переводчики по языку и индексу.",
    },
]


def list_regions() -> list[dict[str, Any]]:
    return [
        {
            key: deepcopy(value)
            for key, value in region.items()
            if key != "services"
        }
        | {"service_count": len(region["services"])}
        for region in sorted(REGIONS, key=lambda item: item["pilot_priority"])
    ]


def get_region(slug: str) -> dict[str, Any] | None:
    region = next((item for item in REGIONS if item["slug"] == slug), None)
    if region is None:
        return None
    result = deepcopy(region)
    result["directories"] = deepcopy(FEDERAL_DIRECTORIES)
    result["served_at"] = datetime.now(UTC).replace(microsecond=0).isoformat()
    result["legal_notice"] = (
        "Статус показывает проверенную точку входа, а не гарантию размещения в выбранном городе. "
        "Перед поездкой система должна повторно проверить официальный источник."
    )
    return result

