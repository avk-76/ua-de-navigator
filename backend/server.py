from __future__ import annotations

import cgi
import json
import mimetypes
import os
import re
import uuid
from datetime import UTC, datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from assistant_service import answer_guest_question
from case_intelligence import analyze_document, match_cases, prepare_reply
from guidance import build_route, refresh_all_sources
from ocr_providers import get_default_provider
from regional_registry import get_region, list_regions
from storage import DEMO_USER_ID, NavigatorStore


ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = Path(os.environ.get("UADE_UPLOAD_DIR", ROOT / "backend" / "uploads"))
PROTOTYPE_DIR = ROOT / "prototype"
HOST = "127.0.0.1"
PORT = int(os.environ.get("UADE_PORT", "8787"))
STORE = NavigatorStore()


class NavigatorHandler(SimpleHTTPRequestHandler):
    server_version = "UADEBackend/0.7"

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/" or path.startswith("/prototype/"):
            return self._serve_prototype()
        if path == "/health":
            return self._json(200, {"ok": True, "version": "0.7", "storage": "sqlite"})
        if path == "/api/regions":
            return self._json(200, {"ok": True, "regions": list_regions()})
        region_match = re.fullmatch(r"/api/regions/([^/]+)", path)
        if region_match:
            region = get_region(unquote(region_match.group(1)))
            return self._json(200, {"ok": True, "region": region}) if region else self._json(
                404, {"ok": False, "error": "Region not found"}
            )
        if path == "/api/onboarding":
            return self._json(200, {
                "ok": True,
                "onboarding": STORE.get_onboarding(DEMO_USER_ID),
            })
        if path == "/api/official-sources":
            return self._json(200, {
                "ok": True,
                "sources": STORE.list_official_sources(),
            })
        if path == "/api/dashboard":
            return self._json(200, {"ok": True, "dashboard": STORE.get_dashboard(DEMO_USER_ID)})
        if path == "/api/cases":
            return self._json(200, {"ok": True, "cases": STORE.list_cases(DEMO_USER_ID)})
        case_match = re.fullmatch(r"/api/cases/([^/]+)", path)
        if case_match:
            case = STORE.get_case(case_match.group(1))
            return self._json(200, {"ok": True, "case": case}) if case else self._json(
                404, {"ok": False, "error": "Case not found"}
            )
        if path == "/api/deadlines":
            return self._json(200, {"ok": True, "deadlines": STORE.list_deadlines(DEMO_USER_ID)})
        if path == "/api/profile":
            profile = STORE.get_profile(DEMO_USER_ID)
            return self._json(200, {"ok": True, "profile": profile})
        return self._json(404, {"ok": False, "error": "Not found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/extract":
            return self._json(410, {"ok": False, "error": "Documents are read and redacted on the client's device."})
        if path == "/api/documents/analyze":
            payload = self._read_json_body()
            if payload is None:
                return
            source_text = str(payload.get("text") or "").strip()
            if not source_text or len(source_text) > 100_000:
                return self._json(400, {"ok": False, "error": "Text required (max 100000 characters)"})
            analysis = analyze_document(source_text)
            return self._json(200, {"ok": True, "analysis": analysis,
                                    "matches": match_cases(analysis, STORE.list_cases(DEMO_USER_ID))})
        if path == "/api/documents/attach":
            payload = self._read_json_body()
            if payload is None:
                return
            analysis = payload.get("analysis")
            extracted_text = str(payload.get("text") or "").strip()
            if not isinstance(analysis, dict) or not extracted_text or len(extracted_text) > 100_000:
                return self._json(400, {"ok": False, "error": "Analysis and text required"})
            # Recalculate on the server; browser-supplied classifications are not trusted.
            analysis = analyze_document(extracted_text)
            stored_as = payload.get("stored_as")
            if stored_as and (not re.fullmatch(r"[a-f0-9]{32}_[A-Za-z0-9._-]{1,120}", str(stored_as))
                              or not (UPLOAD_DIR / str(stored_as)).is_file()):
                return self._json(400, {"ok": False, "error": "Invalid uploaded file"})
            case_id = str(payload.get("case_id") or "").strip()
            if not case_id:
                case = STORE.create_case({
                    "title": f"{analysis['authority_name']} · {analysis['document_type']}",
                    "authority_type": analysis["authority_type"],
                    "authority_name": analysis["authority_name"],
                    "reference_number": analysis.get("reference_number"),
                    "category": analysis.get("category"),
                    "risk_level": analysis["risk_level"],
                }, DEMO_USER_ID)
                case_id = case["id"]
            else:
                selected_case = STORE.get_case(case_id)
                if selected_case is None:
                    return self._json(404, {"ok": False, "error": "Case not found"})
                if selected_case["authority_type"] != analysis["authority_type"]:
                    return self._json(409, {"ok": False, "error": "Letter authority does not match case"})
                current_ref = selected_case.get("reference_number")
                incoming_ref = analysis.get("reference_number")
                if current_ref and incoming_ref and current_ref.casefold().replace(" ", "") != incoming_ref.casefold().replace(" ", ""):
                    return self._json(409, {"ok": False, "error": "Letter reference does not match case"})
            case = STORE.attach_analyzed_document(
                case_id, str(payload.get("file_name") or "Вставленный текст")[:200],
                str(stored_as) if stored_as else None, str(payload.get("mime_type") or "text/plain"),
                extracted_text, analysis,
            )
            return self._json(201, {"ok": True, "case": case, "analysis": analysis})
        if path == "/api/cases":
            payload = self._read_json_body()
            if payload is None:
                return
            case = STORE.create_case(payload, DEMO_USER_ID)
            return self._json(201, {"ok": True, "case": case})
        if path == "/api/onboarding/route":
            payload = self._read_json_body()
            if payload is None:
                return
            answers = payload.get("answers")
            if not isinstance(answers, dict):
                return self._json(400, {"ok": False, "error": "answers object expected"})
            sources = STORE.list_official_sources()
            if self._sources_are_stale(sources):
                sources = STORE.update_official_source_checks(refresh_all_sources())
            route = build_route(answers, sources)
            onboarding = STORE.save_onboarding(answers, route, sources, DEMO_USER_ID)
            return self._json(200, {
                "ok": True,
                "route": route,
                "onboarding": onboarding,
            })
        if path == "/api/official-sources/refresh":
            sources = STORE.update_official_source_checks(refresh_all_sources())
            onboarding = STORE.get_onboarding(DEMO_USER_ID)
            route = None
            if onboarding and isinstance(onboarding.get("answers"), dict):
                route = build_route(onboarding["answers"], sources)
                STORE.save_onboarding(onboarding["answers"], route, sources, DEMO_USER_ID)
            return self._json(200, {"ok": True, "sources": sources, "route": route})
        if path == "/api/leads/register":
            payload = self._read_json_body()
            if payload is None:
                return
            email = str(payload.get("email", "")).strip().lower()
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                return self._json(400, {"ok": False, "error": "Укажите корректный email"})
            consent_flags = payload.get("consent_flags")
            if not isinstance(consent_flags, dict) or consent_flags.get("account") is not True:
                return self._json(
                    400,
                    {"ok": False, "error": "Нужно согласие на создание кабинета и обработку данных"},
                )
            payload["email"] = email
            session_id = str(payload.get("session_id", "")).strip()
            payload["used_guest_documents"] = (
                STORE.count_guest_interactions(session_id, "document") if session_id else 0
            )
            payload["used_guest_questions"] = (
                STORE.count_guest_interactions(session_id, "question") if session_id else 0
            )
            onboarding = STORE.get_onboarding(DEMO_USER_ID)
            lead = STORE.create_or_update_lead(payload, onboarding)
            return self._json(201, {
                "ok": True,
                "lead": lead,
                "welcome_pack": {
                    "translation_credits": lead["translation_credits"] if lead else 3,
                    "ai_question_credits": lead["ai_question_credits"] if lead else 5,
                },
            })
        if path == "/api/guest/question":
            payload = self._read_json_body()
            if payload is None:
                return
            session_id = str(payload.get("session_id", "")).strip()
            question = str(payload.get("question", "")).strip()
            language = str(payload.get("language", "ru")).strip() or "ru"
            if not re.fullmatch(r"[A-Za-z0-9_-]{12,80}", session_id):
                return self._json(400, {"ok": False, "error": "Некорректная сессия"})
            if len(question) < 15:
                return self._json(400, {"ok": False, "error": "Опишите ситуацию немного подробнее"})
            if len(question) > 4_000:
                return self._json(400, {"ok": False, "error": "Вопрос слишком длинный"})
            if STORE.count_guest_interactions(session_id, "question") >= 1:
                return self._json(429, {
                    "ok": False,
                    "error": "Первый бесплатный ответ уже использован. Сохраните результат в кабинете, чтобы получить ещё четыре.",
                    "registration_required": True,
                })
            answer = answer_guest_question(question, STORE.list_official_sources(), language)
            STORE.save_guest_interaction(session_id, "question", question, answer)
            return self._json(200, {
                "ok": True,
                "answer": answer,
                "remaining_guest_questions": 0,
                "questions_after_registration": 4,
            })
        event_match = re.fullmatch(r"/api/cases/([^/]+)/events", path)
        if event_match:
            payload = self._read_json_body()
            if payload is None:
                return
            event = STORE.add_event(event_match.group(1), payload)
            return self._json(201, {"ok": True, "event": event}) if event else self._json(
                404, {"ok": False, "error": "Case not found"}
            )
        draft_match = re.fullmatch(r"/api/cases/([^/]+)/drafts", path)
        if draft_match:
            payload = self._read_json_body()
            if payload is None:
                return
            case = STORE.get_case(draft_match.group(1))
            if not case:
                return self._json(404, {"ok": False, "error": "Case not found"})
            answers = payload.get("answers") or {}
            if not isinstance(answers, dict) or not isinstance(answers.get("available_documents", []), list):
                return self._json(400, {"ok": False, "error": "Invalid answers"})
            available = answers.get("available_documents", [])
            allowed = {item["title"] for item in case["checklist"]}
            if any(not isinstance(item, str) or item not in allowed for item in available):
                return self._json(400, {"ok": False, "error": "Attachments must be selected from case checklist"})
            language = str(payload.get("language") or "ru")
            german, local = prepare_reply(case, answers, language)
            case = STORE.create_draft(case["id"], german, local, language, answers)
            return self._json(201, {"ok": True, "case": case})
        sent_match = re.fullmatch(r"/api/cases/([^/]+)/drafts/([^/]+)/sent", path)
        if sent_match:
            payload = self._read_json_body()
            if payload is None:
                return
            sent_at = str(payload.get("sent_at") or "")
            sent_via = str(payload.get("sent_via") or "")
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", sent_at) or sent_via not in {
                "email", "portal", "post", "in_person", "fax", "other"
            }:
                return self._json(400, {"ok": False, "error": "Valid date and sending method required"})
            try:
                datetime.strptime(sent_at, "%Y-%m-%d")
            except ValueError:
                return self._json(400, {"ok": False, "error": "Invalid date"})
            sent_proof = str(payload.get("sent_proof") or "").strip()[:500]
            german_text = payload.get("german_text")
            if german_text is not None and (not isinstance(german_text, str) or not german_text.strip() or len(german_text) > 20_000):
                return self._json(400, {"ok": False, "error": "Invalid reply text"})
            case = STORE.mark_draft_sent(sent_match.group(1), sent_match.group(2), sent_at,
                                         sent_via, sent_proof, german_text)
            return self._json(200, {"ok": True, "case": case}) if case else self._json(
                404, {"ok": False, "error": "Draft not found or already sent"})
        return self._json(404, {"ok": False, "error": "Not found"})

    @staticmethod
    def _sources_are_stale(sources: list[dict]) -> bool:
        if not sources:
            return True
        threshold = datetime.now(UTC) - timedelta(hours=24)
        for source in sources:
            checked_at = source.get("last_checked_at")
            if not checked_at:
                return True
            try:
                checked = datetime.fromisoformat(checked_at)
            except ValueError:
                return True
            if checked.tzinfo is None:
                checked = checked.replace(tzinfo=UTC)
            if checked < threshold:
                return True
        return False

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path
        payload = self._read_json_body()
        if payload is None:
            return
        case_match = re.fullmatch(r"/api/cases/([^/]+)", path)
        if case_match:
            case = STORE.update_case(case_match.group(1), payload)
            return self._json(200, {"ok": True, "case": case}) if case else self._json(
                404, {"ok": False, "error": "Case not found"}
            )
        deadline_match = re.fullmatch(r"/api/deadlines/([^/]+)", path)
        if deadline_match:
            deadline = STORE.update_deadline(deadline_match.group(1), payload)
            return self._json(200, {"ok": True, "deadline": deadline}) if deadline else self._json(
                404, {"ok": False, "error": "Deadline not found"}
            )
        checklist_match = re.fullmatch(r"/api/checklist/([^/]+)", path)
        if checklist_match:
            item = STORE.update_checklist_item(checklist_match.group(1), payload)
            return self._json(200, {"ok": True, "item": item}) if item else self._json(
                404, {"ok": False, "error": "Checklist item not found"}
            )
        if path == "/api/profile":
            profile = STORE.update_profile(payload, DEMO_USER_ID)
            return self._json(200, {"ok": True, "profile": profile})
        return self._json(404, {"ok": False, "error": "Not found"})

    def _serve_prototype(self) -> None:
        path = urlparse(self.path).path
        relative = path.removeprefix("/prototype/").strip("/")
        if not relative:
            relative = "index.html"
        relative = unquote(relative)
        target = (PROTOTYPE_DIR / relative).resolve()
        if not str(target).startswith(str(PROTOTYPE_DIR.resolve())) or not target.exists() or target.is_dir():
            return self._json(404, {"ok": False, "error": "File not found"})

        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {
            "application/javascript",
            "application/json",
        }:
            content_type = f"{content_type}; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(target.stat().st_size))
        self.end_headers()
        self.wfile.write(target.read_bytes())

    def _handle_extract(self) -> None:
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            return self._json(400, {"ok": False, "error": "Expected multipart/form-data"})

        form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={
            "REQUEST_METHOD": "POST",
            "CONTENT_TYPE": content_type,
        })
        file_item = form["file"] if "file" in form else None
        if file_item is None or not getattr(file_item, "filename", None):
            return self._json(400, {"ok": False, "error": "Missing file field"})

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        original_name = Path(file_item.filename).name
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", original_name)[:120] or "upload"
        target = UPLOAD_DIR / f"{uuid.uuid4().hex}_{safe_name}"
        upload_bytes = file_item.file.read(10_000_001)
        if len(upload_bytes) > 10_000_000:
            return self._json(413, {"ok": False, "error": "File exceeds 10 MB"})
        with target.open("wb") as handle:
            handle.write(upload_bytes)

        provider = get_default_provider()
        result = provider.extract(target, file_item.type or "")
        analysis = analyze_document(result.text) if result.ok and result.text else None
        return self._json(200, {
            "ok": result.ok,
            "filename": original_name,
            "stored_as": target.name,
            "provider": result.provider,
            "message": result.message,
            "text": result.text,
            "analysis": analysis,
            "matches": match_cases(analysis, STORE.list_cases(DEMO_USER_ID)) if analysis else [],
        })

    def _read_json_body(self) -> dict | None:
        content_type = self.headers.get("Content-Type", "")
        if "application/json" not in content_type:
            self._json(415, {"ok": False, "error": "Expected application/json"})
            return None
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length <= 0 or content_length > 1_000_000:
            self._json(400, {"ok": False, "error": "Invalid request body"})
            return None
        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._json(400, {"ok": False, "error": "Invalid JSON"})
            return None
        if not isinstance(payload, dict):
            self._json(400, {"ok": False, "error": "JSON object expected"})
            return None
        return payload

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), NavigatorHandler)
    print(f"UA-DE Navigator backend running on http://{HOST}:{PORT}")
    print(f"Prototype: http://{HOST}:{PORT}/prototype/")
    server.serve_forever()


if __name__ == "__main__":
    main()
