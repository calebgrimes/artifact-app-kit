# {{APP_NAME}}

{{APP_PURPOSE}}

- Live app (artifact): {{ARTIFACT_URL}}
- Source: `index.html`. To update the app, publish this file to the same artifact link. Omit capabilities, so the app keeps them.
- Plan and scope: `intent.md`. Every change request: `changes.md`.
- Checks: `python3 verify.py --selftest`. Done means 0 FAIL.
- Click tests: `node qa/clicks.mjs`. Done means 0 FAIL.
- Preview: `python3 qa/build_preview.py`, then open `qa/preview.html` (add `#dark`, `#light`, `#tour`, or `#qa` to the address).
- Drive it from the command line: `node qa/desk.mjs [--size 400x820] [--hash dark] STEP...` (run it with no steps for the list).

## Install
1. Open the artifact link in the Claude desktop app.
2. Pick "Install as app" in the artifact's menu, or click the Install as app button on the page.
3. Open the app from the Dock. Click Connect, then click Allow in the system dialog yourself.

## Feedback controls
- **Point and comment**: click it, click any part of the app, write a note. The note waits in the queue.
- **Send queue (N)**: sends every waiting note as one request. ✎ shows the list.
- **Right-click > Change this app…**: write a change and send it at once, or add it to the queue.
- **Artifact comments**: in the installed app, "Send to Claude" on a comment goes to the same worker.
- **Requests**: lists the rows of `changes.md` with their state.

Every path starts or reuses ONE Claude Code background session, named "{{APP_NAME}} change". See it with `claude agents`, and talk to it with `claude attach <id>`.

## First run of the change worker
`claude --bg` refuses a folder that Claude Code has not trusted yet ("Workspace not trusted"). Run `claude` once in this folder and accept the trust question. Then the app can start its worker.
