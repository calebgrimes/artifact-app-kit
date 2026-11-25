"""Scaffold a new artifact app folder from the artifact-app-kit templates.

Usage:
  python3 scaffold.py --name "Reading List" --dir ~/apps/reading-list \
      --purpose "One line on why the app exists." --users "Who uses it." --data "What data it shows."

It copies templates/ into --dir and fills the placeholders. It refuses a folder that already has an
index.html (pass --force to replace the template files there). It never publishes anything.
{{ARTIFACT_URL}} stays in README.md until the first publish gives the link.
"""
import argparse, datetime, os, re, shutil, sys
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
FILES = ["index.html", "verify.py", "changes.md", "intent.md", "README.md",
         "qa/fake.js", "qa/build_preview.py", "qa/desk.mjs", "qa/clicks.mjs", "gitignore"]
RENAME = {"gitignore": ".gitignore"}  # kept without the dot in the kit, so it does not act on the kit's own repo


def tilde(p: Path) -> str:
    home = Path.home().resolve()
    return "~/" + str(p.relative_to(home)) if p == home or home in p.parents else str(p)


def main(argv=None):
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--name", required=True, help="the app's name, also its window title")
    a.add_argument("--dir", required=True, help="the new app folder")
    a.add_argument("--purpose", default="(Say in one line why this app exists.)")
    a.add_argument("--users", default="(Say who uses it.)")
    a.add_argument("--data", default="(Say what data it shows and where that data lives.)")
    a.add_argument("--force", action="store_true")
    o = a.parse_args(argv)

    name = o.name.strip()
    if not name or len(name) > 50 or re.search(r'["\\<>{}`$]', name):
        sys.exit('✖ The name must be 1-50 characters, without " \\ < > { } ` $.')
    dest = Path(os.path.expanduser(o.dir)).resolve()
    if (dest / "index.html").exists() and not o.force:
        sys.exit(f"✖ {dest} already has an index.html. Use another folder, or pass --force.")
    clean = lambda s: s.replace("\\", "/").replace('"', "'").replace("`", "'").replace("$", "").replace("<", "(").replace(">", ")").strip()
    values = {
        "APP_NAME": name,
        "APP_DIR": tilde(dest),
        "APP_SLUG": re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "app",
        "APP_PURPOSE": clean(o.purpose), "APP_USERS": clean(o.users), "APP_DATA": clean(o.data),
        "DATE": datetime.date.today().isoformat(),
    }
    for rel in FILES:
        text = (TEMPLATES / rel).read_text()
        for k, v in values.items():
            text = text.replace("{{" + k + "}}", v)
        out = dest / RENAME.get(rel, rel)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text)
    shutil.copymode(TEMPLATES / "verify.py", dest / "verify.py")
    print(f"✔ Scaffold written to {dest}")
    for rel in FILES:
        print("  " + RENAME.get(rel, rel))
    print("Next: git init, commit, run python3 verify.py --selftest, then publish (see the new-artifact-app skill).")


if __name__ == "__main__":
    main()
