"""Conservative, local document signals for the case workflow.

This is a deterministic prototype, not an LLM or a legal deadline calculator.
Dates are only candidates until a person confirms them against the letter.
"""
from __future__ import annotations

import re
from datetime import date
from typing import Any


AUTHORITIES = (
    ("jobcenter", "Jobcenter", r"\bjobcenter\b|b[üu]rgergeld|bedarfsgemeinschaft"),
    ("familienkasse", "Familienkasse", r"\bfamilienkasse\b|kindergeld"),
    ("krankenkasse", "Krankenkasse", r"\bkrankenkasse\b|krankenversicherung"),
    ("auslaenderbehoerde", "Ausländerbehörde", r"ausl[äa]nderbeh[öo]rde|fiktionsbescheinigung|aufenthaltstitel"),
    ("finanzamt", "Finanzamt", r"\bfinanzamt\b|einkommensteuerbescheid"),
    ("zoll", "Zoll", r"\bhauptzollamt\b|\bzoll\b"),
)
DOCS = (
    ("Kontoauszüge", r"kontoausz[üu]ge|kontoauszug"),
    ("Mietvertrag", r"mietvertrag"),
    ("Meldebescheinigung", r"meldebescheinigung"),
    ("Einkommensnachweise", r"einkommensnachweis|gehaltsabrechnung|lohnabrechnung"),
    ("Arbeitsvertrag", r"arbeitsvertrag"),
    ("Aufenthaltstitel", r"aufenthaltstitel"),
    ("Immatrikulationsbescheinigung", r"immatrikulationsbescheinigung"),
)
DATE = re.compile(r"\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b")
DEADLINE_WORD = re.compile(r"\b(?:bis\s+zum|sp[äa]testens|(?:antwort|widerspruchs)?frist(?:\s+bis)?|einzureichen\s+bis|vorzulegen\s+bis)\b", re.I)
REQUEST_WORD = re.compile(r"\b(?:bitte|reichen\s+sie|legen\s+sie|senden\s+sie|ben[öo]tigen|erforderlich|vorzulegen|einzureichen|nachzureichen|beif[üu]gen)\b", re.I)
NEGATED_REQUIREMENT = re.compile(r"\b(?:nicht\s+erforderlich|nicht\s+ben[öo]tigt|nicht\s+einzureichen|nicht\s+vorzulegen|brauchen\s+sie\s+nicht|keine\s+unterlagen)\b", re.I)
REFERENCE = re.compile(r"\b(?:aktenzeichen|az\.?|kundennummer|bg.?(?:nr|nummer))\s*[:#]?\s*([A-Z0-9][A-Z0-9/ .-]{3,35})", re.I)


def analyze_document(text: str) -> dict[str, Any]:
    text = text[:100_000]
    authority_type, authority_name = "other", "Ведомство не определено"
    for kind, name, pattern in AUTHORITIES:
        if re.search(pattern, text, re.I):
            authority_type, authority_name = kind, name
            break
    reference_match = REFERENCE.search(text)
    reference = reference_match.group(1).strip(" .-/") if reference_match else None
    if reference:
        reference = re.split(r"\s{2,}|\n", reference)[0].strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    requested = []
    requirement_sources = {}
    for line in lines:
        for clause in re.split(r"(?<=[.!?])\s+(?=[A-ZÄÖÜ])", line):
            # A mention is not an obligation.
            if not REQUEST_WORD.search(clause) or NEGATED_REQUIREMENT.search(clause):
                continue
            for name, pattern in DOCS:
                if re.search(pattern, clause, re.I) and name not in requested:
                    requested.append(name)
                    requirement_sources[name] = clause[:350]
    deadline = None
    snippet = None
    for line in lines:
        cue = DEADLINE_WORD.search(line)
        if not cue:
            continue
        match = next((candidate for candidate in DATE.finditer(line) if candidate.start() >= cue.start()), None)
        if not match:
            continue
        try:
            deadline = date(int(match[3]), int(match[2]), int(match[1])).isoformat()
        except ValueError:
            continue
        snippet = line[:350]
        break
    danger = bool(re.search(r"leistung(?:en)?\s+(?:entzieh|einstell)|versagung|bu[ßs]geld|vollstreckung|gericht|widerspruchsfrist", text, re.I))
    expert = bool(re.search(r"ausl[äa]ndische\s+eink[üu]nfte|steuerstraf|abschiebung", text, re.I))
    risk = "expert" if expert else "red" if danger or deadline else "yellow" if requested else "green"
    document_type = "Aufforderung zur Mitwirkung" if re.search(r"mitwirkung|reichen\s+sie|legen\s+sie.*vor", text, re.I) else "Schreiben / Bescheid"
    action = "Требуемые документы проверить и подготовить" if requested else "Проверить письмо и определить следующий шаг"
    if risk == "green":
        action = "Проверить, требуется ли ответ"
    letter_date = None
    for line in lines:
        if re.search(r"\b(?:datum|schreiben\s+vom|vom)\b", line, re.I):
            candidate = DATE.search(line)
            if candidate:
                try:
                    letter_date = date(int(candidate[3]), int(candidate[2]), int(candidate[1])).isoformat()
                    break
                except ValueError:
                    pass
    return {
        "provider": "local_rules",
        "authority_type": authority_type,
        "authority_name": authority_name,
        "sender": lines[0][:120] if lines else authority_name,
        "letter_date": letter_date,
        "reference_number": reference,
        "document_type": document_type,
        "category": authority_type,
        "risk_level": risk,
        "required_documents": requested,
        "requirement_sources": requirement_sources,
        "next_action": action,
        "deadline": {"extracted_due_at": deadline, "source_text": snippet, "confidence": 0.82 if deadline else 0.0},
        "summary": f"Письмо от {authority_name}. " + ("Найдена дата, её нужно подтвердить по оригиналу. " if deadline else "Явный срок не найден. ") + (f"Упомянуты: {', '.join(requested)}." if requested else "Проверьте требования в оригинале."),
        "limitations": "Локальные правила могут пропустить формулировки, приложения и юридические сроки. Сверьте всё с оригиналом.",
    }


def match_cases(analysis: dict[str, Any], cases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    reference = (analysis.get("reference_number") or "").casefold().replace(" ", "")
    matches = []
    for case in cases:
        if case.get("status") in {"closed", "resolved", "archived"}:
            continue
        if case.get("authority_type") != analysis.get("authority_type"):
            continue
        candidate_ref = (case.get("reference_number") or "").casefold().replace(" ", "")
        score = 0.97 if reference and candidate_ref and reference == candidate_ref else 0.55
        if reference and candidate_ref and reference != candidate_ref:
            continue
        matches.append({"case_id": case["id"], "title": case["title"], "authority_name": case["authority_name"], "score": score, "reason": "Номер дела совпадает" if score > 0.9 else "Совпадает ведомство — проверьте вручную"})
    return sorted(matches, key=lambda item: item["score"], reverse=True)[:3]


def prepare_reply(case: dict[str, Any], answers: dict[str, Any], language: str) -> tuple[str, str]:
    """A clearly labelled editable template; only confirmed attachments are named."""
    available = [str(item).strip() for item in answers.get("available_documents", []) if str(item).strip()]
    explanation = str(answers.get("explanation") or "").strip()[:1000]
    reference = case.get("reference_number") or "[Aktenzeichen eintragen]"
    subject = f"Ihr Schreiben / Aktenzeichen {reference}"
    german = [f"Betreff: {subject}", "", "Sehr geehrte Damen und Herren,", ""]
    if available:
        german.extend([
            "in Antwort auf Ihr Schreiben übersende ich ausschließlich die folgenden vorhandenen Unterlagen:",
            "", "Anlagen: " + ", ".join(available) + ".",
        ])
    else:
        german.append("in Antwort auf Ihr Schreiben teile ich mit, dass ich derzeit keine Unterlagen beifügen kann.")
    if explanation:
        german.extend(["", "Ergänzende Erläuterung (bitte auf Deutsch prüfen und bearbeiten):", explanation])
    german.extend(["", "Bitte bestätigen Sie den Eingang.", "", "Mit freundlichen Grüßen", "[Name eintragen]"])
    local_intro = {
        "ru": "Черновик для проверки: в ответ на письмо направляю имеющиеся запрошенные документы.",
        "uk": "Чернетка для перевірки: у відповідь на лист надсилаю наявні запитані документи.",
        "de": "Entwurf zur Prüfung: Ich sende die vorhandenen angeforderten Unterlagen.",
        "en": "Draft to review: I am sending the requested documents that I have.",
    }.get(language, "Черновик для проверки: в ответ на письмо направляю имеющиеся запрошенные документы.")
    local = local_intro + ("\n" + ", ".join(available) if available else "")
    return "\n".join(german), local
