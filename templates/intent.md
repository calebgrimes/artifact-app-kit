# Intent: {{APP_NAME}}
Status: draft.
Written {{DATE}}.

## Why
{{APP_PURPOSE}}

## What it is
- One Claude artifact with the `desktop` capability. The person installs it from the Claude desktop app ("Install as app"). It gets its own window and Dock icon.
- Who uses it: {{APP_USERS}}
- What it shows: {{APP_DATA}}
- Source: `index.html` in this folder. The published artifact is the app. The link is in README.md.
- Built-in feedback: Point and comment, a comment queue, right-click "Change this app…", and artifact comments. Each one goes to ONE Claude Code change worker that edits this folder.

## Out of scope (until the person says yes)
- Any cloud service, paid API, or account other than Claude.
- Private data inside the published page. The app reads data at run time on this computer.
- (Add more lines here.)

## Decisions made
- State marks have a shape and a word first; color is the third signal. Blue means good, orange means bad. Never red with green.
- One change worker at a time, named "{{APP_NAME}} change".

## How we verify
- `python3 verify.py --selftest`: 0 FAIL. Each page check is proven to fail on a broken page.
- `node qa/clicks.mjs`: the feedback controls, with the fake desktop layer. 0 FAIL.
- `python3 qa/build_preview.py`, then screenshots at desktop and phone width, light and dark (`node qa/desk.mjs --hash dark shot=/tmp/dark.png`).
- The person installs the app and clicks Allow themselves. A worker never clicks a permission dialog.

## Open questions
- (none yet)

## Change log
- {{DATE}}: written (draft), scaffold from artifact-app-kit.
