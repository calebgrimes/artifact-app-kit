"""Checks for {{APP_NAME}}. Run: python3 verify.py   Add --selftest to prove each page check can fail.

Done means 0 FAIL. Each page check has a "break" that damages a copy of the page;
--selftest runs every check on its broken copy and expects that check to fail.
Add one check (with its break) for each new feature the app gets.
"""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP_DIR = "{{APP_DIR}}"
results = []


def mark(ok, name, why=""):
    results.append(ok)
    print(("✔ PASS " if ok else "✖ FAIL ") + name + (f"  ({why})" if why and not ok else ""))


def node(code):
    r = subprocess.run(["node", "-e", code], capture_output=True, text=True)
    return (r.stdout + r.stderr).strip()


def script(html):
    m = re.search(r'<script type="module">(.*?)</script>', html, re.S)
    return m.group(1) if m else ""


def block(js, start, end):
    """The text of one function or block, from its first line up to (not including) the end marker."""
    i = js.find(start)
    j = js.find(end, i + 1) if i >= 0 else -1
    return js[i:j] if i >= 0 and j > i else ""


# ---- page checks: (name, check(html) -> (ok, why), break(html) -> broken html) ----

def c_parses(html):
    js = script(html)
    if not js:
        return False, "no module script"
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False) as f:
        f.write(js)
    r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
    return r.returncode == 0, r.stderr.strip()[:200]


def c_manifest(html):
    m = re.search(r'id="claude-artifacts-manifest">(.*?)</script>', html, re.S)
    try:
        perms = json.loads(m.group(1))["permissions"]
        return "full-access" in perms, str(perms)
    except Exception as e:
        return False, str(e)


def c_placeholders(html):
    left = sorted(set(re.findall(r"\{\{[A-Z_]+\}\}", html)))
    return not left, ", ".join(left)


def c_title(html):
    m = re.search(r"<title>(.*?)</title>", html)
    return bool(m and m.group(1).strip()), "empty or missing <title> (it is the app's name)"


def c_no_markup(html):
    bad = re.findall(r"innerHTML|outerHTML|insertAdjacentHTML|document\.write", script(html))
    return not bad, ", ".join(bad)


def c_gate(html):
    js = script(html)
    ok = "install.state(" in js and "install.request(" in js and "permissions.request(" in js and "D?.fs" in js
    return ok, "the desktop gate, install button, or permission ask is missing"


def c_whats_new(html):
    m = re.search(r"const WHATS_NEW = (\[.*?\n\]);", script(html), re.S)
    out = node("const W = " + (m.group(1) if m else "[]") +
               "; const n = W[0]; console.log(n && n.v > 0 && n.items.length > 0 && n.items.every((i) => i.sel && i.title && i.text) ? 'OK' : 'BAD')")
    return out == "OK", out[:200]


def c_feedback(html):
    js = script(html)
    need = ['"--bg", "-n", CHANGE_NAME', "onSendToClaude", '"contextmenu"', "D.Menu.popup", 'const CHANGE_NAME = APP_NAME + " change"', "setupFeedback()"]
    miss = [n for n in need if n not in js]
    return not miss, "missing: " + ", ".join(miss)


def c_brief(html):
    fn = block(script(html), "function changeBrief(", "\nfunction followUp(")
    out = node('const APP_NAME = "X", APP_DIR = "~/x";' + fn + 'console.log(changeBrief("Make it blue", "<h2>"))')
    rules = ["changes.md", "One worker edits the page at a time", "WHATS_NEW", "verify.py --selftest", "0 FAIL",
             "Merge main into your branch and read the live artifact", "omit capabilities", "Batch changes into one publish", "Make it blue", "<h2>"]
    miss = [r for r in rules if r not in out]
    return not miss, "brief lacks: " + ", ".join(miss)


def c_queue(html):
    js = script(html)
    fn = block(js, "function queueBrief(", "\nfunction addToQueue(")
    out = node(fn + 'console.log(queueBrief([{text: "a", where: "w"}, {text: "b"}]))')
    return out.startswith("Batch of 2 change requests") and "Pointed at: w" in out and 'save("queue"' in js, out[:200]


def c_paste(html):
    fn = block(script(html), "async function attachSend(", "\nasync function startChange(")
    ok = r'"\x1b[200~" + text.replace(/\x1b/g, "") + "\x1b[201~"' in fn and r'p.write("\r")' in fn and "p.kill()" in fn
    return ok, "the send into a running worker must strip Esc, use bracketed paste, press Enter, and close the terminal"


def c_ledger(html):
    fn = block(script(html), "function parseLedger(", "\nfunction ledgerState(")
    md = "# L\n\n## Rules\n| not | a row | here |\n\n## Rows\n| # | Request | Status | Where |\n|---|---|---|---|\n| 1 | Bigger title | DONE | v2 |\n| 2 | Search box | QUEUED | |\n\n## Notes\n| 9 | x | y |\n"
    out = node(fn + "console.log(JSON.stringify(parseLedger(" + json.dumps(md) + ").map((r) => r.n + ':' + r.status)))")
    return out == '["1:DONE","2:QUEUED"]', out[:200]


def c_states(html):
    m = re.search(r"const STATES = (\{.*?\n\});", script(html), re.S)
    out = node("const S = " + (m.group(1) if m else "{}") + "; const v = Object.values(S);"
               "console.log(v.length >= 3 && v.every((s) => s.shape && s.word && /^[A-Z ]+$/.test(s.word) && ['good','bad','calm'].includes(s.tone)) ? 'OK' : 'BAD')")
    return out == "OK", "every state needs a shape, an UPPER-CASE word, and a tone: " + out[:120]


def c_themes(html):
    ok = "@media (prefers-color-scheme: dark)" in html and ':root[data-theme="dark"]' in html and ':root:not([data-theme="light"])' in html
    return ok, "dark tokens must exist for the system setting and for the theme control"


def c_no_fill(html):
    tags = re.findall(r"<(?:input|textarea|select)\b[^>]*>", html)
    bad = [t for t in tags if 'autocomplete="off"' not in t]
    return not bad, "; ".join(bad)[:200]


def c_app_dir(html):
    m = re.search(r'const APP_DIR = "(.*?)";', script(html))
    d = Path(os.path.expanduser(m.group(1))).resolve() if m else None
    ok = d is not None and (HERE == d or (d / ".claude" / "worktrees") in HERE.parents)
    return ok, f"APP_DIR in the page is {m.group(1) if m else 'missing'}, but this page is in {HERE}"


CHECKS = [
    ("page script parses", c_parses, lambda h: h.replace("const sleep =", "const sleep = =", 1)),
    ("manifest asks for full access", c_manifest, lambda h: h.replace('["full-access"]', '[]', 1)),
    ("no {{PLACEHOLDER}} is left in the page", c_placeholders, lambda h: h.replace("</title>", "{{" + "APP_NAME}}</title>", 1)),  # split, so the scaffold does not fill it in
    ("the page has a <title> (the app's name)", c_title, lambda h: re.sub(r"<title>.*?</title>", "<title></title>", h, count=1)),
    ("the page never writes text as markup", c_no_markup, lambda h: h.replace("e.textContent = text;", "e.innerHTML = text;", 1)),
    ("desktop gate: install button outside the app, full access asked from a click", c_gate, lambda h: h.replace("D.install.request()", "D.install.ask()")),
    ("WHATS_NEW exists and its newest entry has items", c_whats_new, lambda h: h.replace("const WHATS_NEW = [", "const WHATS_OLD = [", 1)),
    ("feedback loop: --bg worker by name, comment hook, right-click menu", c_feedback, lambda h: h.replace('"onSendToClaude" in C', '"onSend" in C', 1).replace("C.onSendToClaude(", "C.onSend(", 1)),
    ("change brief carries the ledger rules", c_brief, lambda h: h.replace("Merge main into your branch and read the live artifact before publishing. ", "", 1)),
    ("comments wait in a saved queue and go as one batch", c_queue, lambda h: h.replace("`Batch of ${q.length}", "`${q.length}", 1)),
    ("a request typed into a running worker is a safe bracketed paste", c_paste, lambda h: h.replace('text.replace(/\\x1b/g, "")', "text", 1)),
    ("Requests reads only the Rows table of changes.md", c_ledger, lambda h: h.replace("if (on && /^##\\s/.test(line)) break;", "", 1)),
    ("every state mark has a shape and a word, not color alone", c_states, lambda h: h.replace('word: "FAILED"', 'word: ""', 1)),
    ("light and dark color tokens", c_themes, lambda h: h.replace(':root[data-theme="dark"] {', ":root.dark {", 1)),
    ("text boxes opt out of AutoFill", c_no_fill, lambda h: h.replace('<textarea id="c-text" autocomplete="off"', '<textarea id="c-text"', 1)),
    ("APP_DIR in the page is this folder (or a worktree of it)", c_app_dir, lambda h: re.sub(r'const APP_DIR = ".*?";', 'const APP_DIR = "~/not-this-folder";', h, count=1)),
]


def find_claude():
    for p in ("~/.local/bin/claude", "/opt/homebrew/bin/claude", "/usr/local/bin/claude"):
        if os.access(os.path.expanduser(p), os.X_OK):
            return os.path.expanduser(p)
    r = subprocess.run(["/bin/zsh", "-lic", "command -v claude"], capture_output=True, text=True)
    p = r.stdout.strip().split("\n")[-1] if r.stdout.strip() else ""
    return p if p.startswith("/") else None


def main():
    html = (HERE / "index.html").read_text()
    for name, fn, _ in CHECKS:
        ok, why = fn(html)
        mark(ok, name, why)

    # The computer: the feedback loop needs the claude command and its background sessions.
    claude = find_claude()
    mark(bool(claude), "the claude command is on this computer", "install Claude Code, then run verify.py again")
    if claude:
        r = subprocess.run([claude, "agents", "--json"], capture_output=True, text=True, timeout=60)
        i = r.stdout.find("[")
        try:
            ok = r.returncode == 0 and i >= 0 and isinstance(json.loads(r.stdout[i:]), list)
        except ValueError:
            ok = False
        mark(ok, "`claude agents --json` gives a list (the app finds its change worker there)", (r.stderr or r.stdout).strip()[:200])

    if "--selftest" in sys.argv:
        for name, fn, brk in CHECKS:
            broken = brk(html)
            ok, _ = fn(broken)
            mark(broken != html and not ok, f"selftest: '{name}' fails on a broken page", "the break did not change the page" if broken == html else "the check still passed")

    n_fail = results.count(False)
    print(f"{'✔' if not n_fail else '✖'} {len(results) - n_fail} PASS, {n_fail} FAIL")
    sys.exit(1 if n_fail else 0)


if __name__ == "__main__":
    main()
