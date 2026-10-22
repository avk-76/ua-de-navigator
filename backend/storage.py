from __future__ import annotations

import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator

from guidance import source_seed_rows


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "backend" / "data"
DB_PATH = Path(os.environ.get("UADE_DB_PATH", DATA_DIR / "navigator.db"))
DEMO_USER_ID = "user-demo"


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


class NavigatorStore:
    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = db_path or Path(os.environ.get("UADE_DB_PATH", DB_PATH))
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(
                """
                PRAGMA journal_mode = WAL;

                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    preferred_language TEXT NOT NULL DEFAULT 'ru',
                    notification_settings TEXT NOT NULL DEFAULT '{}',
                    consent_flags TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS bureaucracy_profiles (
                    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    city TEXT,
                    federal_state TEXT,
                    arrival_date TEXT,
                    residence_status TEXT,
                    employment_status TEXT,
                    benefits TEXT NOT NULL DEFAULT '[]',
                    health_insurance TEXT,
                    tax_context TEXT NOT NULL DEFAULT '{}',
                    foreign_income_flags TEXT NOT NULL DEFAULT '{}',
                    section_consents TEXT NOT NULL DEFAULT '{}',
                    completion_percent INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS cases (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    authority_type TEXT NOT NULL,
                    authority_name TEXT NOT NULL,
                    reference_number TEXT,
                    status TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    next_action TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    closed_at TEXT
                );

                CREATE TABLE IF NOT EXISTS case_events (
                    id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
                    event_type TEXT NOT NULL,
                    occurred_at TEXT NOT NULL,
                    actor_type TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    details TEXT,
                    document_id TEXT,
                    deadline_id TEXT,
                    metadata TEXT NOT NULL DEFAULT '{}'
                );

                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
                    file_name TEXT NOT NULL,
                    stored_as TEXT,
                    mime_type TEXT,
                    document_type TEXT,
                    processing_status TEXT NOT NULL,
                    received_at TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS deadlines (
                    id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
                    document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
                    due_at TEXT,
                    action TEXT NOT NULL,
                    confidence REAL,
                    source_snippet TEXT,
                    confirmed_by_user INTEGER NOT NULL DEFAULT 0,
                    reminder_settings TEXT NOT NULL DEFAULT '{}',
                    status TEXT NOT NULL DEFAULT 'active',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS checklist_items (
                    id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    original_label TEXT,
                    completed INTEGER NOT NULL DEFAULT 0,
                    position INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS onboarding_profiles (
                    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    answers TEXT NOT NULL DEFAULT '{}',
                    route_result TEXT NOT NULL DEFAULT '{}',
                    source_snapshot TEXT NOT NULL DEFAULT '[]',
                    completed_at TEXT,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS official_sources (
                    id TEXT PRIMARY KEY,
                    topic TEXT NOT NULL,
                    title TEXT NOT NULL,
                    authority TEXT NOT NULL,
                    url TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    status TEXT NOT NULL,
                    last_checked_at TEXT,
                    last_http_status INTEGER,
                    content_hash TEXT,
                    validation_notes TEXT
                );

                CREATE TABLE IF NOT EXISTS lead_profiles (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    display_name TEXT,
                    preferred_language TEXT NOT NULL DEFAULT 'ru',
                    onboarding_answers TEXT NOT NULL DEFAULT '{}',
                    route_snapshot TEXT NOT NULL DEFAULT '{}',
                    translation_credits INTEGER NOT NULL DEFAULT 3,
                    ai_question_credits INTEGER NOT NULL DEFAULT 5,
                    requested_support TEXT,
                    consent_flags TEXT NOT NULL DEFAULT '{}',
                    status TEXT NOT NULL DEFAULT 'registered',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS guest_interactions (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    interaction_type TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    result TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_cases_user_status
                    ON cases(user_id, status, updated_at);
                CREATE INDEX IF NOT EXISTS idx_events_case_date
                    ON case_events(case_id, occurred_at DESC);
                CREATE INDEX IF NOT EXISTS idx_deadlines_case_date
                    ON deadlines(case_id, due_at);
                CREATE INDEX IF NOT EXISTS idx_official_sources_topic
                    ON official_sources(topic, status);
                CREATE INDEX IF NOT EXISTS idx_lead_profiles_status
                    ON lead_profiles(status, updated_at DESC);
                CREATE INDEX IF NOT EXISTS idx_guest_interactions_session
                    ON guest_interactions(session_id, interaction_type, created_at DESC);
                """
            )
            self._migrate_case_engine(connection)
            self._seed_demo_data(connection)
            self._seed_official_sources(connection)

    @staticmethod
    def _migrate_case_engine(connection: sqlite3.Connection) -> None:
        """Additive migration: existing demo cases and uploads are retained."""
        additions = {
            "cases": {
                "category": "TEXT",
                "subcategory": "TEXT",
                "family_member_id": "TEXT",
                "ai_summary": "TEXT",
                "human_escalation_status": "TEXT NOT NULL DEFAULT 'none'",
            },
            "documents": {
                "extracted_text": "TEXT",
                "analysis_json": "TEXT",
                "risk_level": "TEXT",
                "reference_number": "TEXT",
            },
            "deadlines": {
                "extracted_due_at": "TEXT",
                "confirmed_due_at": "TEXT",
            },
        }
        for table, columns in additions.items():
            existing = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
            for name, definition in columns.items():
                if name not in existing:
                    connection.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS case_drafts (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
                document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
                german_text TEXT NOT NULL,
                local_text TEXT NOT NULL,
                language TEXT NOT NULL,
                answers_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                sent_at TEXT,
                sent_via TEXT,
                sent_proof TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_case_drafts_case ON case_drafts(case_id, created_at DESC);
        """)
        draft_columns = {row["name"] for row in connection.execute("PRAGMA table_info(case_drafts)")}
        if "sent_proof" not in draft_columns:
            connection.execute("ALTER TABLE case_drafts ADD COLUMN sent_proof TEXT")

    def _seed_official_sources(self, connection: sqlite3.Connection) -> None:
        for source in source_seed_rows():
            connection.execute(
                """
                INSERT INTO official_sources (
                    id, topic, title, authority, url, summary, status,
                    last_checked_at, last_http_status, content_hash, validation_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    topic = excluded.topic,
                    title = excluded.title,
                    authority = excluded.authority,
                    url = excluded.url,
                    summary = excluded.summary
                """,
                (
                    source["id"],
                    source["topic"],
                    source["title"],
                    source["authority"],
                    source["url"],
                    source["summary"],
                    source["status"],
                    source["last_checked_at"],
                    source["last_http_status"],
                    source["content_hash"],
                    source["validation_notes"],
                ),
            )

    def _seed_demo_data(self, connection: sqlite3.Connection) -> None:
        existing = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        if existing:
            return

        now = utc_now()
        connection.execute(
            """
            INSERT INTO users (
                id, email, preferred_language, notification_settings,
                consent_flags, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                DEMO_USER_ID,
                "demo@ua-de.local",
                "ru",
                json.dumps({"email": True, "browser": False}, ensure_ascii=False),
                json.dumps({"profile": True, "documents": True}, ensure_ascii=False),
                now,
                now,
            ),
        )
        connection.execute(
            """
            INSERT INTO bureaucracy_profiles (
                user_id, city, federal_state, residence_status,
                employment_status, benefits, health_insurance, tax_context,
                foreign_income_flags, section_consents, completion_percent, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                DEMO_USER_ID,
                "Berlin",
                "Berlin",
                "§24 AufenthG",
                "employed",
                json.dumps([], ensure_ascii=False),
                None,
                json.dumps({"elster_status": "unknown"}, ensure_ascii=False),
                json.dumps({"has_foreign_income": None, "has_ukrainian_fop": None}, ensure_ascii=False),
                json.dumps({"basic": True}, ensure_ascii=False),
                40,
                now,
            ),
        )

        cases = [
            (
                "case-finanzamt-2025",
                DEMO_USER_ID,
                "Декларация за 2025 год",
                "finanzamt",
                "Finanzamt Berlin",
                "12/345/67890",
                "action_required",
                "yellow",
                "Подготовить и отправить недостающие документы",
                "2026-07-14T09:10:00+00:00",
                now,
                None,
            ),
            (
                "case-jobcenter-income",
                DEMO_USER_ID,
                "Подтверждение доходов",
                "jobcenter",
                "Jobcenter Musterstadt",
                "12345BG67890",
                "waiting",
                "yellow",
                "Проверить новые входящие письма",
                "2026-07-11T08:20:00+00:00",
                "2026-07-22T13:30:00+00:00",
                None,
            ),
            (
                "case-krankenkasse-contributions",
                DEMO_USER_ID,
                "Проверка страховых взносов",
                "krankenkasse",
                "Krankenkasse",
                None,
                "specialist_review",
                "yellow",
                "Подтвердить найденную сумму 428,60 €",
                "2026-07-19T10:00:00+00:00",
                "2026-07-24T12:00:00+00:00",
                None,
            ),
        ]
        connection.executemany(
            """
            INSERT INTO cases (
                id, user_id, title, authority_type, authority_name,
                reference_number, status, risk_level, next_action,
                created_at, updated_at, closed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            cases,
        )

        documents = [
            (
                "doc-finanzamt-letter",
                "case-finanzamt-2025",
                "Письмо Finanzamt.pdf",
                None,
                "application/pdf",
                "request_missing_documents",
                "analyzed",
                "2026-07-14",
                "2026-07-14T09:10:00+00:00",
            ),
            (
                "doc-lohnsteuer",
                "case-finanzamt-2025",
                "Lohnsteuerbescheinigung 2025.pdf",
                None,
                "application/pdf",
                "attachment",
                "ready",
                None,
                "2026-07-20T09:00:00+00:00",
            ),
            (
                "doc-werbungskosten",
                "case-finanzamt-2025",
                "Подтверждения расходов.zip",
                None,
                "application/zip",
                "attachment",
                "ready",
                None,
                "2026-07-21T09:00:00+00:00",
            ),
        ]
        connection.executemany(
            """
            INSERT INTO documents (
                id, case_id, file_name, stored_as, mime_type, document_type,
                processing_status, received_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            documents,
        )

        deadlines = [
            (
                "deadline-finanzamt-2025",
                "case-finanzamt-2025",
                "doc-finanzamt-letter",
                "2026-08-14",
                "Отправить недостающие документы в Finanzamt",
                0.98,
                "bitte reichen Sie bis zum 14.08.2026 ...",
                1,
                json.dumps({"days_before": [14, 7, 2]}, ensure_ascii=False),
                "active",
                "2026-07-14T09:15:00+00:00",
                "2026-07-15T08:30:00+00:00",
            ),
            (
                "deadline-krankenkasse-review",
                "case-krankenkasse-contributions",
                None,
                None,
                "Проверить срок ответа Krankenkasse",
                0.42,
                "innerhalb ...",
                0,
                json.dumps({}, ensure_ascii=False),
                "needs_confirmation",
                "2026-07-24T12:00:00+00:00",
                "2026-07-24T12:00:00+00:00",
            ),
        ]
        connection.executemany(
            """
            INSERT INTO deadlines (
                id, case_id, document_id, due_at, action, confidence,
                source_snippet, confirmed_by_user, reminder_settings,
                status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            deadlines,
        )

        checklist = [
            ("check-lohnsteuer", "case-finanzamt-2025", "Lohnsteuerbescheinigung", "Lohnsteuerbescheinigung 2025", 1, 1, now),
            ("check-werbung", "case-finanzamt-2025", "Подтверждения профессиональных расходов", "Nachweise zu Werbungskosten", 1, 2, now),
            ("check-sonder", "case-finanzamt-2025", "Подтверждения специальных расходов", "Nachweise zu Sonderausgaben", 0, 3, now),
        ]
        connection.executemany(
            """
            INSERT INTO checklist_items (
                id, case_id, title, original_label, completed, position, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            checklist,
        )

        events = [
            (
                "event-draft-created",
                "case-finanzamt-2025",
                "draft_created",
                "2026-07-26T08:42:00+00:00",
                "system",
                "Подготовлен немецкий черновик",
                "Черновик сохранён и ожидает проверки перед отправкой.",
                "doc-finanzamt-letter",
                None,
                "{}",
            ),
            (
                "event-deadline-confirmed",
                "case-finanzamt-2025",
                "deadline_confirmed",
                "2026-07-15T08:30:00+00:00",
                "user",
                "Срок подтверждён",
                "Пользователь подтвердил дату 14.08.2026 по оригиналу письма.",
                "doc-finanzamt-letter",
                "deadline-finanzamt-2025",
                "{}",
            ),
            (
                "event-analysis-completed",
                "case-finanzamt-2025",
                "analysis_completed",
                "2026-07-14T09:20:00+00:00",
                "system",
                "Письмо распознано и разобрано",
                "Найдены ведомство, срок, номер дела и три требуемых приложения.",
                "doc-finanzamt-letter",
                None,
                "{}",
            ),
            (
                "event-case-created",
                "case-finanzamt-2025",
                "case_created",
                "2026-07-14T09:10:00+00:00",
                "user",
                "Дело создано",
                "Добавлено первое письмо от Finanzamt Berlin.",
                "doc-finanzamt-letter",
                None,
                "{}",
            ),
        ]
        connection.executemany(
            """
            INSERT INTO case_events (
                id, case_id, event_type, occurred_at, actor_type, summary,
                details, document_id, deadline_id, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            events,
        )

    @staticmethod
    def _decode_json_fields(row: dict[str, Any], fields: tuple[str, ...]) -> dict[str, Any]:
        for field in fields:
            value = row.get(field)
            if isinstance(value, str):
                try:
                    row[field] = json.loads(value)
                except json.JSONDecodeError:
                    pass
        return row

    @staticmethod
    def _row(row: sqlite3.Row | None) -> dict[str, Any] | None:
        return dict(row) if row is not None else None

    def get_dashboard(self, user_id: str = DEMO_USER_ID) -> dict[str, Any]:
        with self.connect() as connection:
            profile = self._row(
                connection.execute(
                    "SELECT * FROM bureaucracy_profiles WHERE user_id = ?",
                    (user_id,),
                ).fetchone()
            )
            counts = self._row(
                connection.execute(
                    """
                    SELECT
                        SUM(CASE WHEN status NOT IN ('closed', 'resolved', 'archived') THEN 1 ELSE 0 END) AS active_cases,
                        SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) AS waiting_cases
                    FROM cases
                    WHERE user_id = ?
                    """,
                    (user_id,),
                ).fetchone()
            )
            active_cases = [
                dict(row)
                for row in connection.execute(
                    """
                    SELECT c.*, d.due_at AS deadline, d.confirmed_by_user,
                           (SELECT COUNT(*) FROM documents f WHERE f.case_id = c.id) AS document_count,
                           (SELECT GROUP_CONCAT(f.file_name, ' ') FROM documents f WHERE f.case_id = c.id) AS document_names
                    FROM cases c
                    LEFT JOIN deadlines d ON d.id = (
                        SELECT candidate.id FROM deadlines candidate
                        WHERE candidate.case_id = c.id
                          AND candidate.status IN ('active', 'needs_confirmation')
                        ORDER BY CASE WHEN candidate.status = 'active' THEN 0 ELSE 1 END,
                                 candidate.due_at, candidate.created_at DESC
                        LIMIT 1
                    )
                    WHERE c.user_id = ? AND c.status NOT IN ('closed', 'resolved', 'archived')
                    ORDER BY
                        CASE WHEN d.due_at IS NULL THEN 1 ELSE 0 END,
                        d.due_at,
                        c.updated_at DESC
                    """,
                    (user_id,),
                ).fetchall()
            ]
            nearest_deadline = self._row(
                connection.execute(
                    """
                    SELECT d.*, c.title AS case_title, c.authority_name
                    FROM deadlines d
                    JOIN cases c ON c.id = d.case_id
                    WHERE c.user_id = ?
                      AND d.status = 'active'
                      AND d.confirmed_by_user = 1
                      AND d.due_at IS NOT NULL
                      AND c.status NOT IN ('closed', 'resolved', 'archived', 'waiting', 'sent')
                    ORDER BY d.due_at
                    LIMIT 1
                    """,
                    (user_id,),
                ).fetchone()
            )
            due_count = connection.execute(
                """
                SELECT COUNT(*) AS count
                FROM deadlines d
                JOIN cases c ON c.id = d.case_id
                WHERE c.user_id = ?
                  AND d.status = 'active'
                  AND d.confirmed_by_user = 1
                  AND d.due_at IS NOT NULL
                """,
                (user_id,),
            ).fetchone()["count"]

        actions = [item for item in active_cases if item["status"] not in {"waiting", "sent"}]
        rank = {"expert": 0, "red": 1, "yellow": 2, "green": 3}
        actions.sort(key=lambda item: (
            rank.get(item.get("risk_level"), 4),
            item.get("deadline") if item.get("confirmed_by_user") else "9999-12-31",
        ))
        waiting = [item for item in active_cases if item["status"] in {"waiting", "sent"}]
        return {
            "user_id": user_id,
            "summary": {
                "active_cases": int(counts["active_cases"] or 0),
                "waiting_cases": int(counts["waiting_cases"] or 0),
                "confirmed_deadlines": due_count,
                "profile_completion": int((profile or {}).get("completion_percent", 0)),
            },
            "nearest_deadline": nearest_deadline,
            "active_cases": active_cases[:4],
            "actions": actions[:4],
            "waiting": waiting[:4],
        }

    def list_cases(self, user_id: str = DEMO_USER_ID) -> list[dict[str, Any]]:
        with self.connect() as connection:
            return [
                dict(row)
                for row in connection.execute(
                    """
                    SELECT c.*, d.due_at AS deadline, d.confirmed_by_user,
                           (SELECT COUNT(*) FROM documents f WHERE f.case_id = c.id) AS document_count,
                           (SELECT GROUP_CONCAT(f.file_name, ' ') FROM documents f WHERE f.case_id = c.id) AS document_names
                    FROM cases c
                    LEFT JOIN deadlines d ON d.id = (
                        SELECT candidate.id FROM deadlines candidate
                        WHERE candidate.case_id = c.id
                          AND candidate.status IN ('active', 'needs_confirmation')
                        ORDER BY CASE WHEN candidate.status = 'active' THEN 0 ELSE 1 END,
                                 candidate.due_at, candidate.created_at DESC
                        LIMIT 1
                    )
                    WHERE c.user_id = ?
                    ORDER BY c.updated_at DESC
                    """,
                    (user_id,),
                ).fetchall()
            ]

    def get_case(self, case_id: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            case = self._row(connection.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone())
            if case is None:
                return None
            events = [dict(row) for row in connection.execute(
                "SELECT * FROM case_events WHERE case_id = ? ORDER BY occurred_at DESC, rowid DESC",
                (case_id,),
            ).fetchall()]
            documents = [dict(row) for row in connection.execute(
                "SELECT * FROM documents WHERE case_id = ? ORDER BY created_at DESC, rowid DESC",
                (case_id,),
            ).fetchall()]
            deadlines = [dict(row) for row in connection.execute(
                "SELECT * FROM deadlines WHERE case_id = ? ORDER BY due_at",
                (case_id,),
            ).fetchall()]
            checklist = [dict(row) for row in connection.execute(
                "SELECT * FROM checklist_items WHERE case_id = ? ORDER BY position",
                (case_id,),
            ).fetchall()]
        for deadline in deadlines:
            self._decode_json_fields(deadline, ("reminder_settings",))
        for document in documents:
            self._decode_json_fields(document, ("analysis_json",))
        with self.connect() as connection:
            drafts = [dict(row) for row in connection.execute(
                "SELECT * FROM case_drafts WHERE case_id = ? ORDER BY created_at DESC, rowid DESC", (case_id,)
            ).fetchall()]
        for draft in drafts:
            self._decode_json_fields(draft, ("answers_json",))
        return {
            **case,
            "events": events,
            "documents": documents,
            "deadlines": deadlines,
            "checklist": checklist,
            "drafts": drafts,
        }

    def create_case(self, payload: dict[str, Any], user_id: str = DEMO_USER_ID) -> dict[str, Any]:
        now = utc_now()
        case_id = payload.get("id") or f"case-{uuid.uuid4().hex[:12]}"
        title = str(payload.get("title") or "Новое бюрократическое дело").strip()
        authority_type = str(payload.get("authority_type") or "other").strip()
        authority_name = str(payload.get("authority_name") or "Ведомство").strip()
        status = str(payload.get("status") or "new")
        risk_level = str(payload.get("risk_level") or "green")
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO cases (
                    id, user_id, title, authority_type, authority_name,
                    reference_number, status, risk_level, next_action,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    case_id,
                    user_id,
                    title,
                    authority_type,
                    authority_name,
                    payload.get("reference_number"),
                    status,
                    risk_level,
                    payload.get("next_action"),
                    now,
                    now,
                ),
            )
            connection.execute(
                """
                INSERT INTO case_events (
                    id, case_id, event_type, occurred_at, actor_type,
                    summary, details, metadata
                ) VALUES (?, ?, 'case_created', ?, 'user', ?, ?, '{}')
                """,
                (
                    f"event-{uuid.uuid4().hex}",
                    case_id,
                    now,
                    "Дело создано",
                    f"Создано дело «{title}».",
                ),
            )
        return self.get_case(case_id) or {}

    def update_case(self, case_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        allowed = {
            "title",
            "authority_type",
            "authority_name",
            "reference_number",
            "status",
            "risk_level",
            "next_action",
            "closed_at",
        }
        updates = {key: value for key, value in payload.items() if key in allowed}
        if not updates:
            return self.get_case(case_id)
        updates["updated_at"] = utc_now()
        assignments = ", ".join(f"{key} = ?" for key in updates)
        values = [*updates.values(), case_id]
        with self.connect() as connection:
            cursor = connection.execute(f"UPDATE cases SET {assignments} WHERE id = ?", values)
            if cursor.rowcount == 0:
                return None
        return self.get_case(case_id)

    def add_event(self, case_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        if self.get_case(case_id) is None:
            return None
        event = {
            "id": f"event-{uuid.uuid4().hex}",
            "case_id": case_id,
            "event_type": payload.get("event_type") or "user_note",
            "occurred_at": payload.get("occurred_at") or utc_now(),
            "actor_type": payload.get("actor_type") or "user",
            "summary": payload.get("summary") or "Добавлена заметка",
            "details": payload.get("details"),
            "document_id": payload.get("document_id"),
            "deadline_id": payload.get("deadline_id"),
            "metadata": json.dumps(payload.get("metadata") or {}, ensure_ascii=False),
        }
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO case_events (
                    id, case_id, event_type, occurred_at, actor_type, summary,
                    details, document_id, deadline_id, metadata
                ) VALUES (
                    :id, :case_id, :event_type, :occurred_at, :actor_type, :summary,
                    :details, :document_id, :deadline_id, :metadata
                )
                """,
                event,
            )
            connection.execute(
                "UPDATE cases SET updated_at = ? WHERE id = ?",
                (utc_now(), case_id),
            )
        event["metadata"] = payload.get("metadata") or {}
        return event

    def add_document(
        self,
        case_id: str,
        file_name: str,
        stored_as: str,
        mime_type: str,
        processing_status: str,
    ) -> dict[str, Any] | None:
        if self.get_case(case_id) is None:
            return None
        now = utc_now()
        document = {
            "id": f"doc-{uuid.uuid4().hex}",
            "case_id": case_id,
            "file_name": file_name,
            "stored_as": stored_as,
            "mime_type": mime_type,
            "document_type": "uploaded_letter",
            "processing_status": processing_status,
            "received_at": None,
            "created_at": now,
        }
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO documents (
                    id, case_id, file_name, stored_as, mime_type, document_type,
                    processing_status, received_at, created_at
                ) VALUES (
                    :id, :case_id, :file_name, :stored_as, :mime_type, :document_type,
                    :processing_status, :received_at, :created_at
                )
                """,
                document,
            )
        self.add_event(
            case_id,
            {
                "event_type": "document_uploaded",
                "actor_type": "user",
                "summary": "Добавлен новый документ",
                "details": file_name,
                "document_id": document["id"],
            },
        )
        return document

    def attach_analyzed_document(
        self, case_id: str, file_name: str, stored_as: str | None,
        mime_type: str, extracted_text: str, analysis: dict[str, Any],
    ) -> dict[str, Any] | None:
        if self.get_case(case_id) is None:
            return None
        now = utc_now()
        document_id = f"doc-{uuid.uuid4().hex}"
        deadline = analysis.get("deadline") or {}
        required = analysis.get("required_documents") or []
        with self.connect() as connection:
            connection.execute("""
                INSERT INTO documents (id, case_id, file_name, stored_as, mime_type,
                    document_type, processing_status, received_at, created_at,
                    extracted_text, analysis_json, risk_level, reference_number)
                VALUES (?, ?, ?, ?, ?, ?, 'analyzed', ?, ?, ?, ?, ?, ?)
            """, (document_id, case_id, file_name, stored_as, mime_type,
                  analysis.get("document_type"), now, now, extracted_text,
                  json.dumps(analysis, ensure_ascii=False), analysis.get("risk_level"),
                  analysis.get("reference_number")))
            connection.execute("""
                UPDATE cases SET status = 'action_required', risk_level = ?,
                    next_action = ?, reference_number = COALESCE(reference_number, ?),
                    category = COALESCE(category, ?), ai_summary = ?, updated_at = ?
                WHERE id = ?
            """, (analysis.get("risk_level", "yellow"), analysis.get("next_action"),
                  analysis.get("reference_number"), analysis.get("category"),
                  analysis.get("summary"), now, case_id))
            connection.execute("""
                INSERT INTO case_events (id, case_id, event_type, occurred_at,
                    actor_type, summary, details, document_id, metadata)
                VALUES (?, ?, 'document_analyzed', ?, 'system', ?, ?, ?, '{}')
            """, (f"event-{uuid.uuid4().hex}", case_id, now,
                  "Документ разобран", file_name, document_id))
            existing = {row[0].casefold() for row in connection.execute(
                "SELECT title FROM checklist_items WHERE case_id = ?", (case_id,)
            )}
            for position, title in enumerate(required):
                if title.casefold() not in existing:
                    connection.execute("""
                        INSERT INTO checklist_items (id, case_id, title, original_label,
                            completed, position, updated_at)
                        VALUES (?, ?, ?, ?, 0, ?, ?)
                    """, (f"check-{uuid.uuid4().hex}", case_id, title, title,
                          len(existing) + position, now))
            if deadline.get("extracted_due_at"):
                connection.execute("""
                    INSERT INTO deadlines (id, case_id, document_id, due_at, action,
                        confidence, source_snippet, confirmed_by_user, reminder_settings,
                        status, created_at, updated_at, extracted_due_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, '{}', 'needs_confirmation', ?, ?, ?)
                """, (f"deadline-{uuid.uuid4().hex}", case_id, document_id,
                      deadline["extracted_due_at"], analysis.get("next_action") or "Ответить ведомству",
                      deadline.get("confidence"), deadline.get("source_text"), now, now,
                      deadline["extracted_due_at"]))
        return self.get_case(case_id)

    def create_draft(self, case_id: str, german_text: str, local_text: str,
                     language: str, answers: dict[str, Any]) -> dict[str, Any] | None:
        if self.get_case(case_id) is None:
            return None
        draft_id, now = f"draft-{uuid.uuid4().hex}", utc_now()
        with self.connect() as connection:
            connection.execute("""
                INSERT INTO case_drafts (id, case_id, german_text, local_text,
                    language, answers_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (draft_id, case_id, german_text, local_text, language,
                  json.dumps(answers, ensure_ascii=False), now))
            connection.execute("UPDATE cases SET status = 'drafting_reply', updated_at = ? WHERE id = ?", (now, case_id))
            connection.execute("""
                INSERT INTO case_events (id, case_id, event_type, occurred_at,
                    actor_type, summary, details, metadata)
                VALUES (?, ?, 'draft_created', ?, 'user', 'Черновик ответа создан', ?, '{}')
            """, (f"event-{uuid.uuid4().hex}", case_id, now, draft_id))
        return self.get_case(case_id)

    def mark_draft_sent(self, case_id: str, draft_id: str, sent_at: str,
                        sent_via: str, sent_proof: str = "",
                        german_text: str | None = None) -> dict[str, Any] | None:
        now = utc_now()
        with self.connect() as connection:
            cursor = connection.execute("""
                UPDATE case_drafts SET sent_at = ?, sent_via = ?, sent_proof = ?,
                    german_text = COALESCE(?, german_text)
                WHERE id = ? AND case_id = ? AND sent_at IS NULL
            """, (sent_at, sent_via, sent_proof[:500], german_text, draft_id, case_id))
            if cursor.rowcount != 1:
                return None
            connection.execute("""
                UPDATE cases SET status = 'waiting', next_action = 'Ожидать ответ ведомства', updated_at = ?
                WHERE id = ?
            """, (now, case_id))
            connection.execute("""
                UPDATE deadlines SET status = 'completed', updated_at = ?
                WHERE case_id = ? AND status = 'active' AND confirmed_by_user = 1
            """, (now, case_id))
            connection.execute("""
                INSERT INTO case_events (id, case_id, event_type, occurred_at,
                    actor_type, summary, details, metadata)
                VALUES (?, ?, 'reply_sent', ?, 'user', 'Ответ отправлен', ?, ?)
            """, (f"event-{uuid.uuid4().hex}", case_id, sent_at,
                  f"Способ отправки: {sent_via}" + (f"; подтверждение: {sent_proof[:500]}" if sent_proof else ""),
                  json.dumps({"draft_id": draft_id, "sent_proof": sent_proof[:500]}, ensure_ascii=False)))
        return self.get_case(case_id)

    def list_deadlines(self, user_id: str = DEMO_USER_ID) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = [
                dict(row)
                for row in connection.execute(
                    """
                    SELECT d.*, c.title AS case_title, c.authority_name
                    FROM deadlines d
                    JOIN cases c ON c.id = d.case_id
                    WHERE c.user_id = ?
                    ORDER BY
                        CASE WHEN d.due_at IS NULL THEN 1 ELSE 0 END,
                        d.due_at
                    """,
                    (user_id,),
                ).fetchall()
            ]
        for row in rows:
            self._decode_json_fields(row, ("reminder_settings",))
        return rows

    def update_deadline(self, deadline_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        allowed = {
            "due_at",
            "action",
            "confidence",
            "source_snippet",
            "confirmed_by_user",
            "reminder_settings",
            "status",
        }
        updates = {key: value for key, value in payload.items() if key in allowed}
        if "confirmed_by_user" in updates:
            if not updates["confirmed_by_user"]:
                updates["reminder_settings"] = {}
                updates["status"] = "needs_confirmation"
                updates["confirmed_due_at"] = None
            else:
                due_at = str(updates.get("due_at") or "")
                if not due_at:
                    with self.connect() as connection:
                        row = connection.execute("SELECT due_at FROM deadlines WHERE id = ?", (deadline_id,)).fetchone()
                    due_at = row["due_at"] if row else ""
                try:
                    datetime.strptime(due_at, "%Y-%m-%d")
                except (ValueError, TypeError):
                    return None
                updates["confirmed_due_at"] = due_at
                updates["status"] = "active"
                updates["reminder_settings"] = {"days_before": [7, 3, 1, 0], "channel": "in_app"}
        elif "reminder_settings" in updates:
            with self.connect() as connection:
                row = connection.execute("SELECT confirmed_by_user FROM deadlines WHERE id = ?", (deadline_id,)).fetchone()
            if not row or not row["confirmed_by_user"]:
                return None
        if "reminder_settings" in updates:
            updates["reminder_settings"] = json.dumps(updates["reminder_settings"], ensure_ascii=False)
        if not updates:
            return None
        updates["updated_at"] = utc_now()
        assignments = ", ".join(f"{key} = ?" for key in updates)
        values = [*updates.values(), deadline_id]
        with self.connect() as connection:
            cursor = connection.execute(f"UPDATE deadlines SET {assignments} WHERE id = ?", values)
            if cursor.rowcount == 0:
                return None
            row = self._row(connection.execute(
                "SELECT * FROM deadlines WHERE id = ?",
                (deadline_id,),
            ).fetchone())
        return self._decode_json_fields(row or {}, ("reminder_settings",))

    def update_checklist_item(self, item_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        if "completed" not in payload:
            return None
        completed = 1 if bool(payload["completed"]) else 0
        with self.connect() as connection:
            cursor = connection.execute(
                """
                UPDATE checklist_items
                SET completed = ?, updated_at = ?
                WHERE id = ?
                """,
                (completed, utc_now(), item_id),
            )
            if cursor.rowcount == 0:
                return None
            item = self._row(connection.execute(
                "SELECT * FROM checklist_items WHERE id = ?",
                (item_id,),
            ).fetchone())
        return item

    def get_profile(self, user_id: str = DEMO_USER_ID) -> dict[str, Any] | None:
        with self.connect() as connection:
            profile = self._row(connection.execute(
                """
                SELECT p.*, u.email, u.preferred_language,
                       u.notification_settings, u.consent_flags
                FROM bureaucracy_profiles p
                JOIN users u ON u.id = p.user_id
                WHERE p.user_id = ?
                """,
                (user_id,),
            ).fetchone())
        if profile is None:
            return None
        return self._decode_json_fields(
            profile,
            (
                "benefits",
                "tax_context",
                "foreign_income_flags",
                "section_consents",
                "notification_settings",
                "consent_flags",
            ),
        )

    def update_profile(self, payload: dict[str, Any], user_id: str = DEMO_USER_ID) -> dict[str, Any] | None:
        user_fields = {"preferred_language", "notification_settings", "consent_flags"}
        profile_fields = {
            "city",
            "federal_state",
            "arrival_date",
            "residence_status",
            "employment_status",
            "benefits",
            "health_insurance",
            "tax_context",
            "foreign_income_flags",
            "section_consents",
            "completion_percent",
        }
        user_updates = {key: value for key, value in payload.items() if key in user_fields}
        profile_updates = {key: value for key, value in payload.items() if key in profile_fields}
        for updates, json_fields in (
            (user_updates, {"notification_settings", "consent_flags"}),
            (
                profile_updates,
                {"benefits", "tax_context", "foreign_income_flags", "section_consents"},
            ),
        ):
            for field in json_fields:
                if field in updates:
                    updates[field] = json.dumps(updates[field], ensure_ascii=False)
        now = utc_now()
        with self.connect() as connection:
            if user_updates:
                user_updates["updated_at"] = now
                assignments = ", ".join(f"{key} = ?" for key in user_updates)
                connection.execute(
                    f"UPDATE users SET {assignments} WHERE id = ?",
                    [*user_updates.values(), user_id],
                )
            if profile_updates:
                profile_updates["updated_at"] = now
                assignments = ", ".join(f"{key} = ?" for key in profile_updates)
                connection.execute(
                    f"UPDATE bureaucracy_profiles SET {assignments} WHERE user_id = ?",
                    [*profile_updates.values(), user_id],
                )
        return self.get_profile(user_id)

    def get_onboarding(self, user_id: str = DEMO_USER_ID) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = self._row(connection.execute(
                "SELECT * FROM onboarding_profiles WHERE user_id = ?",
                (user_id,),
            ).fetchone())
        if row is None:
            return None
        return self._decode_json_fields(row, ("answers", "route_result", "source_snapshot"))

    def save_onboarding(
        self,
        answers: dict[str, Any],
        route_result: dict[str, Any],
        sources: list[dict[str, Any]],
        user_id: str = DEMO_USER_ID,
    ) -> dict[str, Any] | None:
        now = utc_now()
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO onboarding_profiles (
                    user_id, answers, route_result, source_snapshot, completed_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    answers = excluded.answers,
                    route_result = excluded.route_result,
                    source_snapshot = excluded.source_snapshot,
                    completed_at = excluded.completed_at,
                    updated_at = excluded.updated_at
                """,
                (
                    user_id,
                    json.dumps(answers, ensure_ascii=False),
                    json.dumps(route_result, ensure_ascii=False),
                    json.dumps(sources, ensure_ascii=False),
                    now,
                    now,
                ),
            )
        return self.get_onboarding(user_id)

    def create_or_update_lead(
        self,
        payload: dict[str, Any],
        onboarding: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        now = utc_now()
        email = str(payload.get("email", "")).strip().lower()
        display_name = str(payload.get("display_name", "")).strip() or None
        preferred_language = str(payload.get("preferred_language", "ru")).strip() or "ru"
        requested_support = str(payload.get("requested_support", "")).strip() or None
        consent_flags = payload.get("consent_flags")
        if not isinstance(consent_flags, dict):
            consent_flags = {}

        onboarding_answers = (onboarding or {}).get("answers") or {}
        route_snapshot = (onboarding or {}).get("route_result") or {}
        lead_id = f"lead-{uuid.uuid4().hex}"
        translation_credits = max(0, 3 - int(payload.get("used_guest_documents", 0) or 0))
        ai_question_credits = max(0, 5 - int(payload.get("used_guest_questions", 0) or 0))

        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO lead_profiles (
                    id, email, display_name, preferred_language,
                    onboarding_answers, route_snapshot,
                    translation_credits, ai_question_credits,
                    requested_support, consent_flags, status,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'registered', ?, ?)
                ON CONFLICT(email) DO UPDATE SET
                    display_name = COALESCE(excluded.display_name, lead_profiles.display_name),
                    preferred_language = excluded.preferred_language,
                    onboarding_answers = excluded.onboarding_answers,
                    route_snapshot = excluded.route_snapshot,
                    requested_support = COALESCE(
                        excluded.requested_support,
                        lead_profiles.requested_support
                    ),
                    consent_flags = excluded.consent_flags,
                    updated_at = excluded.updated_at
                """,
                (
                    lead_id,
                    email,
                    display_name,
                    preferred_language,
                    json.dumps(onboarding_answers, ensure_ascii=False),
                    json.dumps(route_snapshot, ensure_ascii=False),
                    translation_credits,
                    ai_question_credits,
                    requested_support,
                    json.dumps(consent_flags, ensure_ascii=False),
                    now,
                    now,
                ),
            )
        return self.get_lead_by_email(email)

    def count_guest_interactions(self, session_id: str, interaction_type: str) -> int:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT COUNT(*) AS count
                FROM guest_interactions
                WHERE session_id = ? AND interaction_type = ?
                """,
                (session_id, interaction_type),
            ).fetchone()
        return int(row["count"] if row else 0)

    def save_guest_interaction(
        self,
        session_id: str,
        interaction_type: str,
        prompt: str,
        result: dict[str, Any],
    ) -> dict[str, Any]:
        interaction_id = f"guest-{uuid.uuid4().hex}"
        created_at = utc_now()
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO guest_interactions (
                    id, session_id, interaction_type, prompt, result, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    interaction_id,
                    session_id,
                    interaction_type,
                    prompt,
                    json.dumps(result, ensure_ascii=False),
                    created_at,
                ),
            )
        return {
            "id": interaction_id,
            "session_id": session_id,
            "interaction_type": interaction_type,
            "created_at": created_at,
        }

    def get_lead_by_email(self, email: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = self._row(connection.execute(
                """
                SELECT id, email, display_name, preferred_language,
                       onboarding_answers, route_snapshot,
                       translation_credits, ai_question_credits,
                       requested_support, consent_flags, status,
                       created_at, updated_at
                FROM lead_profiles
                WHERE email = ?
                """,
                (email.strip().lower(),),
            ).fetchone())
        if row is None:
            return None
        return self._decode_json_fields(
            row,
            ("onboarding_answers", "route_snapshot", "consent_flags"),
        )

    def list_official_sources(self) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT id, topic, title, authority, url, summary, status,
                       last_checked_at, last_http_status, content_hash, validation_notes
                FROM official_sources
                ORDER BY topic, title
                """
            ).fetchall()
        return [self._row(row) or {} for row in rows]

    def update_official_source_checks(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        with self.connect() as connection:
            for result in results:
                if result["status"] in {"verified_online", "needs_review"}:
                    connection.execute(
                        """
                        UPDATE official_sources
                        SET status = ?, last_checked_at = ?, last_http_status = ?,
                            content_hash = ?, validation_notes = ?
                        WHERE id = ?
                        """,
                        (
                            result["status"],
                            result["last_checked_at"],
                            result.get("last_http_status"),
                            result.get("content_hash"),
                            result.get("validation_notes"),
                            result["id"],
                        ),
                    )
                else:
                    connection.execute(
                        """
                        UPDATE official_sources
                        SET status = ?, last_http_status = ?,
                            validation_notes = ?
                        WHERE id = ?
                        """,
                        (
                            result["status"],
                            result.get("last_http_status"),
                            (
                                f"{result.get('validation_notes', '')} "
                                f"Последняя попытка: {result['last_checked_at']}."
                            ).strip(),
                            result["id"],
                        ),
                    )
        return self.list_official_sources()
