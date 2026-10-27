"""Build a public, synthetic-data snapshot of the local UA-DE prototype."""

from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
from pathlib import Path


SITE = Path(__file__).resolve().parent
ROOT = SITE.parent
DIST = SITE / "dist"
PROTOTYPE = ROOT / "prototype"
PUBLISHED = ROOT / "docs"
sys.path.insert(0, str(ROOT / "backend"))

from storage import NavigatorStore  # noqa: E402
from regional_registry import get_region, list_regions  # noqa: E402


def main() -> None:
    DIST.mkdir(exist_ok=True)
    for source in PROTOTYPE.iterdir():
        if source.is_file() and source.suffix in {".html", ".css", ".js"}:
            shutil.copy2(source, DIST / source.name)
    if (PROTOTYPE / "vendor").is_dir():
        shutil.copytree(PROTOTYPE / "vendor", DIST / "vendor", dirs_exist_ok=True)
    for name in ("demo-api.js", "demo.css"):
        shutil.copy2(PUBLISHED / name, DIST / name)

    with tempfile.TemporaryDirectory(prefix="uade-public-demo-", dir=SITE) as temp_dir:
        store = NavigatorStore(Path(temp_dir) / "synthetic.db")
        cases = store.list_cases()
        fixture = {
            "dashboard": store.get_dashboard(),
            "cases": cases,
            "case_details": {case["id"]: store.get_case(case["id"]) for case in cases},
            "deadlines": store.list_deadlines(),
            "profile": store.get_profile(),
            "regions": list_regions(),
        }
    fixture["region_details"] = {
        region["slug"]: get_region(region["slug"]) for region in fixture["regions"]
    }
    fixture["profile"].pop("email", None)
    # A source seed is not a fresh verification. The public demo must say so.
    fixture["sources"] = []
    for case in fixture["cases"]:
        case["reference_number"] = None
    for case in fixture["dashboard"]["active_cases"]:
        case["reference_number"] = None
    for case in fixture["case_details"].values():
        case["reference_number"] = None
    (DIST / "demo-fixtures.json").write_text(
        json.dumps(fixture, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    index_path = DIST / "index.html"
    html = index_path.read_text(encoding="utf-8")
    html = html.replace(
        '<link rel="stylesheet" href="./onboarding.css?v=20261027-guest" />',
        '<link rel="stylesheet" href="./onboarding.css?v=20261027-guest" />\n    <link rel="stylesheet" href="./demo.css?v=20261027-guest" />',
    )
    html = re.sub(
        r'(<script src="\./portal\.js(?:\?[^\"]*)?"></script>)',
        r'<script src="./demo-api.js?v=20261027-guest"></script>\n    \1',
        html,
        count=1,
    )
    index_path.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    main()
