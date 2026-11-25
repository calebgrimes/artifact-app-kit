---
name: verify-artifact-app
description: Prove an artifact desktop app works before and after a change - verify.py --selftest (each page check proven to fail on a broken page), the fake desktop layer preview (qa/fake.js + qa/build_preview.py), headless Chrome screenshots at desktop and phone width in light and dark, click tests (qa/desk.mjs, qa/clicks.mjs), and a look at the REAL installed app with screencapture. Use when someone says "check the app", "screenshot the app", "test the feedback controls", "does the installed app work", or before any publish of an artifact app. NOT for building the app (use new-artifact-app) and NOT for plain web pages with no desktop layer (use a normal browser check).
---

# Verify an artifact app

The installed app runs inside the Claude desktop app, where a test cannot reach. So the checks run in three layers: the page text, the page with a fake desktop layer, and a look at the real app.

Templates for every file named here: `${CLAUDE_PLUGIN_ROOT}/templates/` (`verify.py`, `qa/fake.js`, `qa/build_preview.py`, `qa/desk.mjs`, `qa/clicks.mjs`). If the app lacks one, copy it and fill `{{APP_NAME}}` and `{{APP_DIR}}`.

## Layer 1: page checks
```
python3 verify.py --selftest
```
- Done means 0 FAIL.
- Each page check has a "break": a small change that damages a copy of the page. `--selftest` runs each check on its broken copy and expects it to fail. A check that cannot fail proves nothing.
- If you add a feature, add one check and one break for it to the `CHECKS` list.
- Two checks look at the computer: the `claude` command exists, and `claude agents --json` gives a list.

## Layer 2: the page with the fake desktop layer
`qa/fake.js` stands in for `claude.use("desktop")`. It runs no real command and touches no real file. It records what the page asks for: `window.__runs` (commands), `__bg` (each new worker's brief), `__pty` (typing into a worker), `__menu` (the last right-click menu), `__agents` (the fake session list; set it to test reuse), `__waiting` (true: the worker waits on a question).

`qa/build_preview.py` writes `qa/preview.html`: the page, the fake layer, the real `changes.md`, and the invented sample files in `qa/sample/`. Never put real data in `qa/sample/`.

Screenshots (headless Chrome; set `CHROME` if Chrome is not in /Applications):
```
node qa/desk.mjs --hash light shot=/tmp/app-light.png
node qa/desk.mjs --hash dark shot=/tmp/app-dark.png
node qa/desk.mjs --size 400x820 --hash light shot=/tmp/app-phone-light.png
node qa/desk.mjs --size 400x820 --hash dark shot=/tmp/app-phone-dark.png
node qa/desk.mjs --hash tour wait=800 clicktext="Show me" shot=/tmp/app-tour.png
```
Read every screenshot yourself. Check alignment, title size, clipping, both themes, and the `pageWidth` from the `state` step (the two numbers must match: no sideways scroll). Check that each state has a shape and a word, not only a color.

Click tests:
```
node qa/clicks.mjs
```
They drive Point and comment, Add to queue, Send queue (one new worker by name, with the ledger rules in its brief), right-click Change this app…, reuse of a running worker (one bracketed paste, then Enter), a worker that waits on a question (nothing typed), Requests, text size, and theme. Done means 0 FAIL. Add a step and a `check(...)` for each new control. To prove a test can fail, break the feature in a copy of the folder and run it there.

`desk.mjs` steps: `shot=`, `click=CSS`, `clicktext=WORDS`, `rightclick=CSS`, `type=CSS::TEXT`, `key=`, `wait=`, `text=CSS`, `state`, `eval=JS`, `reload`. Run it with no steps for the list.

## Layer 3: the real installed app
The fake layer cannot prove the real one. After the person installed the app and allowed it:
1. Ask the person to open the app and bring its window to the front.
2. Take a screenshot of the screen without touching it:
   ```
   screencapture -x /tmp/real-app.png
   ```
   (Or `screencapture -x -l <window id>` for one window.) Read the image.
3. Check that the app shows its main screen, not the gate ("Connect…" or "runs as a desktop app").
4. To check the feedback loop for real, ask the person to send one small test note. Then run `claude agents` and check that one session named "<App name> change" runs.

Warning: never click a permission dialog for the person. Never use screen control, AppleScript, or a test tool to press Allow, Install, or Don't Allow. If a dialog is on screen, stop and ask the person to answer it.

## NOT for
- Building or changing the app: use new-artifact-app or app-change-worker.
- A page that has no desktop layer: check it in a normal browser.
