from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from case_intelligence import analyze_document, match_cases, prepare_reply
from assistant_service import answer_guest_question
from storage import NavigatorStore


LETTER = """Jobcenter Bodenseekreis
Aktenzeichen: JC/2026/4711
Aufforderung zur Mitwirkung
Bitte reichen Sie Kontoauszüge und Mietvertrag bis zum 17.10.2026 ein.
"""


class CaseEngineFlowTest(unittest.TestCase):
    def test_letter_date_negation_and_required_certificate(self):
        letter = ("Jobcenter Berlin\nDatum: 01.10.2026\nAktenzeichen: JC/2026/99\n"
                  "Antwortfrist: 28.10.2026\n"
                  "Kontoauszüge und Mietvertrag sind nicht erforderlich. "
                  "Bitte reichen Sie die Immatrikulationsbescheinigung bis zum 28.10.2026 ein.")
        analysis = analyze_document(letter)
        self.assertEqual(analysis["letter_date"], "2026-10-01")
        self.assertEqual(analysis["deadline"]["extracted_due_at"], "2026-10-28")
        self.assertEqual(analysis["required_documents"], ["Immatrikulationsbescheinigung"])
        self.assertIn("28.10.2026", analysis["deadline"]["source_text"])
        self.assertEqual(
            analyze_document("Jobcenter\nDatum: 01.10.2026\nAntwortfrist: 28.10.2026")
            ["deadline"]["extracted_due_at"], "2026-10-28"
        )

    def test_home_letter_is_not_finanzamt_and_followup_keeps_history(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as folder:
            store = NavigatorStore(Path(folder) / "navigator.db")
            analysis = analyze_document(LETTER)
            self.assertFalse(any(match["case_id"] == "case-finanzamt-2025"
                                 for match in match_cases(analysis, store.list_cases())))
            case = store.create_case({"title": "Jobcenter", "authority_type": "jobcenter",
                                      "authority_name": "Jobcenter Bodenseekreis",
                                      "reference_number": analysis["reference_number"]})
            first = store.attach_analyzed_document(case["id"], "first.txt", None,
                                                   "text/plain", LETTER, analysis)
            pending = first["deadlines"][0]
            store.update_deadline(pending["id"], {"due_at": "2026-10-17", "confirmed_by_user": True})
            german, local = prepare_reply(first, {"available_documents": ["Kontoauszüge"]}, "ru")
            self.assertIn("Anlagen: Kontoauszüge.", german)
            self.assertNotIn("Mietvertrag", german)
            draft_case = store.create_draft(case["id"], german, local, "ru", {})
            sent = store.mark_draft_sent(case["id"], draft_case["drafts"][0]["id"],
                                         "2026-10-16", "portal", "Quittung 42")
            self.assertEqual(sent["status"], "waiting")
            self.assertEqual(sent["drafts"][0]["sent_proof"], "Quittung 42")
            self.assertEqual(sent["deadlines"][0]["status"], "completed")
            followup = store.attach_analyzed_document(case["id"], "followup.txt", None,
                                                      "text/plain", LETTER, analysis)
            self.assertEqual(followup["status"], "action_required")
            self.assertEqual(len(followup["documents"]), 2)
            self.assertGreaterEqual(len(followup["events"]), 4)
            self.assertEqual(followup["drafts"][0]["sent_proof"], "Quittung 42")
            rows = [row for row in store.list_cases() if row["id"] == case["id"]]
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["document_count"], 2)
            self.assertIn("followup.txt", rows[0]["document_names"])

    def test_prearrival_child_without_housing_asks_relevant_questions(self):
        answer = answer_guest_question("Переезжаю из Украины с ребёнком, жилья нет. Что делать?", [], "ru")
        self.assertEqual(answer["topic"], "housing")
        self.assertIn("персональный маршрут", answer["steps"][0])
        self.assertIn("Сколько лет ребёнку", answer["clarifying_questions"][2])

    def test_document_to_case_to_waiting_to_followup(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as folder:
            path = Path(folder) / "navigator.db"
            store = NavigatorStore(path)
            analysis = analyze_document(LETTER)
            self.assertEqual(analysis["authority_type"], "jobcenter")
            self.assertEqual(analysis["deadline"]["extracted_due_at"], "2026-10-17")
            self.assertIn("Kontoauszüge", analysis["required_documents"])
            case = store.create_case({"title": "Bürgergeld", "authority_type": "jobcenter",
                                      "authority_name": "Jobcenter Bodenseekreis",
                                      "reference_number": analysis["reference_number"]})
            attached = store.attach_analyzed_document(case["id"], "letter.txt", None,
                                                      "text/plain", LETTER, analysis)
            self.assertEqual(attached["status"], "action_required")
            self.assertEqual(len(attached["documents"]), 1)
            self.assertEqual(len(attached["checklist"]), 2)
            pending = attached["deadlines"][0]
            self.assertEqual(pending["status"], "needs_confirmation")
            self.assertFalse(pending["reminder_settings"])
            confirmed = store.update_deadline(pending["id"], {
                "due_at": "2026-10-17", "confirmed_by_user": True,
            })
            self.assertEqual(confirmed["confirmed_due_at"], "2026-10-17")
            self.assertEqual(confirmed["reminder_settings"]["days_before"], [7, 3, 1, 0])
            german, local = prepare_reply(attached, {
                "available_documents": ["Kontoauszüge"]
            }, "ru")
            self.assertIn("Kontoauszüge", german)
            self.assertNotIn("Mietvertrag", german)
            draft_case = store.create_draft(case["id"], german, local, "ru", {})
            draft = draft_case["drafts"][0]
            sent = store.mark_draft_sent(case["id"], draft["id"], "2026-10-16", "portal")
            self.assertEqual(sent["status"], "waiting")
            matches = match_cases(analyze_document(LETTER), store.list_cases())
            self.assertEqual(matches[0]["case_id"], case["id"])
            self.assertGreater(matches[0]["score"], 0.9)
            self.assertEqual(len(NavigatorStore(path).get_case(case["id"])["events"]),
                             len(sent["events"]))


if __name__ == "__main__":
    unittest.main()
