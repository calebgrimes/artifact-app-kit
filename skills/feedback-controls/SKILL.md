---
name: feedback-controls
description: Add or repair the built-in feedback loop in an existing artifact desktop app - "Point and comment" (click any element, type a note), a saved comment queue (Add to queue / Send queue), right-click "Change this app…", the artifact comments hook (onSendToClaude), ONE reusable Claude Code change worker, a "Requests" popup that reads changes.md, and What's new tour bubbles after each update. Use when someone says "add feedback controls", "let me point at the app to change it", "the Send queue button does nothing", "comments don't reach Claude Code", or runs /artifact-app-kit:feedback. NOT for a new app from nothing (use new-artifact-app), NOT for doing a change request itself (use app-change-worker), and NOT for pages that are not installed as desktop apps.
---

# Feedback controls

The feedback loop lets the person change their app from inside it. Every path ends at ONE Claude Code background session, named "<App name> change", that edits the app folder by the ledger rules.

The reference code is in `${CLAUDE_PLUGIN_ROOT}/templates/index.html`, between the markers `---- feedback: start ----` and `---- feedback: end ----`, plus the HTML for `#pointBtn`, `#reqBtn`, `#qSend`, `#qBtn`, `#qPop`, `#reqPop`, `#pop`, `#hl`, `#chgDlg`, and the `WHATS_NEW` tour.

## What each part does
| Part | What the person does | What the page does |
|---|---|---|
| Point and comment | Clicks the button, clicks a part, writes a note | Adds `{text, where}` to the saved queue and drops a numbered pin |
| Send queue (N) | Clicks it | Sends every queued note as ONE "Batch of N change requests" |
| ✎ | Clicks it | Lists the queue, with ✕ remove and Clear queue |
| Right-click > Change this app… | Writes a change | Send now, or Add to queue |
| Artifact comment > Send to Claude | Writes a comment in the artifact's composer | `onSendToClaude` sends it to the change worker and answers `{handled: true}`; on failure it answers `{handled: false}`, so the comment goes to Claude the normal way |
| Requests | Clicks it | Reads `changes.md` from the app folder and lists the Rows table, each with a shape and a word |
| What's new | Opens the app after an update | Shows the newest `WHATS_NEW` entry once, one bubble per change |

## How the worker is started or reused
1. Find the CLI: `~/.local/bin/claude`, `/opt/homebrew/bin/claude`, `/usr/local/bin/claude`, then `zsh -lic 'command -v claude'`. The app's PATH often lacks it.
2. Run `claude agents --json` and look for a live session with the exact name `<App name> change` (not stopped, not failed).
3. If one runs: read `~/.claude/sessions/<pid>.json`. If its status is `waiting`, do not type into it (Enter would pick a menu choice). Keep the queue and tell the person to answer it with `claude attach <id>`.
4. If one runs and does not wait: open a short `claude attach <id>` terminal (`D.pty.spawn`), wait until its screen draws, write the request as a bracketed paste with Esc removed (`"\x1b[200~" + text + "\x1b[201~"`), wait 300 ms, write `"\r"`, then close the terminal.
5. If none runs: `claude --bg -n "<App name> change" "<brief>"` with the app folder as the working folder. Read the id from `claude attach <id>` in the output. Show the full error text if it fails. The usual one is "Workspace not trusted": the person must run `claude` once in the app folder.
6. Clear the queue only after a send worked, and only the items that went.

## Steps to add or repair
1. Read the app's `index.html`, `intent.md`, and `changes.md`. If `changes.md` does not exist, copy `${CLAUDE_PLUGIN_ROOT}/templates/changes.md` and fill the app's name.
2. Copy the feedback block and its HTML from the template. Keep the app's own code. Set `APP_NAME` and `APP_DIR` at the top of the script.
3. Check that the manifest tag lists `"full-access"` and that the page reaches the desktop API with `claude.use("desktop")`.
4. Call `setupFeedback()` after full access is granted, not on load.
5. Make sure the brief in `changeBrief()` holds the ledger rules: one worker edits the page at a time; merge main and read the live artifact before publishing; a WHATS_NEW entry for every visible change; batch changes into one publish because each publish re-asks the desktop permission; `verify.py --selftest` 0 FAIL.
6. Add a `WHATS_NEW` entry that explains the controls.
7. If the app has no `verify.py` or `qa/`, copy them from the templates (see the verify-artifact-app skill). Then run `python3 verify.py --selftest` and `node qa/clicks.mjs`. Both must show 0 FAIL.
8. Publish once to the same link, with `{"desktop": {}, "comments": {"composer_only": true}}` if the artifact lacks `comments`; otherwise omit capabilities.

## Rules
- Build every element with text only (`textContent`). Never `innerHTML`.
- Ask for permissions only from a click. Never click a permission dialog for the person.
- A rejected comment write is not proof that nothing was written. Do not retry in a loop.
- Do not start a second change worker while one runs.

## NOT for
- A new app: use new-artifact-app.
- Doing the change a note asks for: that is the change worker's job (app-change-worker).
- A page that is not installed as an app: there is no desktop API there, so the worker cannot start.
