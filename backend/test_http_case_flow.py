from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BACKEND = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND))


class HttpCaseFlowTest(unittest.TestCase):
    def test_routes_preserve_confirmation_boundary(self):
        with tempfile.TemporaryDirectory(dir=BACKEND) as folder:
            os.environ["UADE_DB_PATH"] = str(Path(folder) / "test.db")
            os.environ["UADE_UPLOAD_DIR"] = str(Path(folder) / "uploads")
            from server import NavigatorHandler  # import after selecting isolated DB

            httpd = ThreadingHTTPServer(("127.0.0.1", 0), NavigatorHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            root = f"http://127.0.0.1:{httpd.server_address[1]}"

            def call(path, method="GET", body=None):
                data = json.dumps(body).encode() if body is not None else None
                request = Request(root + path, data=data, method=method,
                                  headers={"Content-Type": "application/json"} if data else {})
                with urlopen(request, timeout=5) as response:
                    return json.load(response)

            try:
                letter = ("Jobcenter Bodenseekreis\nAktenzeichen: JC/2026/4711\n"
                          "Aufforderung zur Mitwirkung\nBitte reichen Sie Kontoauszüge "
                          "bis zum 17.10.2026 ein.")
                preview = call("/api/documents/analyze", "POST", {"text": letter})
                self.assertEqual(preview["analysis"]["deadline"]["extracted_due_at"], "2026-10-17")
                attached = call("/api/documents/attach", "POST", {
                    "analysis": preview["analysis"], "text": letter, "file_name": "letter.txt"
                })
                case = attached["case"]
                self.assertEqual(case["deadlines"][0]["status"], "needs_confirmation")
                self.assertFalse(case["deadlines"][0]["reminder_settings"])
                confirmed = call(f"/api/deadlines/{case['deadlines'][0]['id']}", "PATCH", {
                    "due_at": "2026-10-17", "confirmed_by_user": True
                })
                self.assertEqual(confirmed["deadline"]["reminder_settings"]["days_before"], [7, 3, 1, 0])
                drafted = call(f"/api/cases/{case['id']}/drafts", "POST", {
                    "language": "ru", "answers": {"available_documents": ["Kontoauszüge"]}
                })
                draft_id = drafted["case"]["drafts"][0]["id"]
                sent = call(f"/api/cases/{case['id']}/drafts/{draft_id}/sent", "POST", {
                    "sent_at": "2026-10-16", "sent_via": "portal"
                })
                self.assertEqual(sent["case"]["status"], "waiting")
                followup = call("/api/documents/analyze", "POST", {"text": letter})
                self.assertEqual(followup["matches"][0]["case_id"], case["id"])
            finally:
                httpd.shutdown()
                httpd.server_close()
                thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
