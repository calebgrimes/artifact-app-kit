# {{APP_NAME}}: change ledger

One list of every change the person asked for. Each request gets one row, one status, and one owner at a time. The app's Requests button shows the Rows table below.

## Rules for every worker
1. Read this file and intent.md first. Do only the rows your brief names.
2. One worker edits the page at a time. Do not start a second change worker while one runs.
3. Merge main into your branch and read the live artifact before publishing. Someone may have published since you started.
4. Add a WHATS_NEW entry in index.html for every visible change. The person learns about changes in the app, not in chat.
5. Batch changes into one publish, because each publish re-asks the desktop permission. Never publish twice for one batch.
6. Run `python3 verify.py --selftest` before you publish. It must show 0 FAIL.
7. Name the part the person means in plain words. Quote their words in the Request column.
8. When you finish a row, set its status to DONE and add the version and the commit in Where.
9. Never click a permission dialog for the person. They click Allow themselves.

Status words: QUEUED, WORKING, NEEDS YOU, DONE, DROPPED. The app shows each with a shape: ○ QUEUED, ◐ WORKING, ◆ NEEDS YOU, ✔ DONE, ✖ DROPPED.

## Rows
| # | Request (the person's words, short) | Status | Where |
|---|---|---|---|
| 1 | Build the first version | DONE | v1, scaffold from artifact-app-kit |
