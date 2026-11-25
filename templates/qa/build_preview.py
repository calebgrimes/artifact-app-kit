"""Build qa/preview.html: the app page plus the fake desktop layer, for screenshots only.

Run: python3 qa/build_preview.py   then open qa/preview.html (add #dark, #light, #tour, or #qa to the address).
"""
import json
from pathlib import Path

QA = Path(__file__).resolve().parent
APP = QA.parent


def build():
    ledger = (APP / "changes.md").read_text() if (APP / "changes.md").exists() else ""
    head = ('<!doctype html><html><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>')
    # Invented sample data only: the fake layer serves each file in qa/sample/ by its name.
    sample = {f.name: f.read_text() for f in sorted((QA / "sample").glob("*")) if f.is_file()} if (QA / "sample").is_dir() else {}
    data = "window.__ledger = " + json.dumps(ledger) + ";\nwindow.__files = " + json.dumps(sample) + ";\n"
    fake = "<script>" + data.replace("</", "<\\/") + (QA / "fake.js").read_text() + "</script>"
    return head + fake + (APP / "index.html").read_text() + "</body></html>"


if __name__ == "__main__":
    out = QA / "preview.html"
    out.write_text(build())
    print(out)
