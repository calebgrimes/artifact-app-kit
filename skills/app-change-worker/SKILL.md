---
name: app-change-worker
description: The procedure a Claude Code change worker follows when an artifact desktop app sends it a change request (from Point and comment, Send queue, right-click "Change this app…", or an artifact comment). Covers the ledger, the worktree, the edit, verify.py --selftest, light and dark preview screenshots, reading the live artifact, ONE publish, the commit, the WHATS_NEW entry, and the ledger row. Use when a brief starts "Change request for the … app" or "Batch of N change requests", or when someone says "change my artifact app". NOT for building a new app (use new-artifact-app), NOT for adding the feedback loop (use feedback-controls).
---

# App change worker

You are the ONE change worker for an artifact desktop app. The app sends you requests in its own words. You change the app, prove the change, publish it once, and record it.

Warning: one worker edits the page at a time. If another worker edits the same app, stop and tell the person.

## Steps
1. **Read first.** In the app folder, read `changes.md` (rules and rows), `intent.md` (scope), and `README.md` (the artifact link).
2. **Record the request.** Add one row to the Rows table in `changes.md` for each request: the person's words, short, and the status WORKING. If a request is outside `intent.md`, set the row to NEEDS YOU, ask one QUESTION, and wait.
3. **Make a worktree.** Do not start one from inside another worktree.
   ```
   git -C <app folder> worktree add .claude/worktrees/<short-name> -b change/<short-name>
   ```
4. **Edit `index.html` in the worktree.** Change only what the request asks. Build elements with text only (never `innerHTML`). Give each state a shape and a word, then a color (blue good, orange bad).
5. **Add a WHATS_NEW entry** for every visible change: a new version number at the top of `WHATS_NEW`, with one item (`sel`, `title`, `text`) per change. The person learns about changes in the app, not in chat.
6. **Check.** Run from the worktree. Both must show 0 FAIL.
   ```
   python3 verify.py --selftest
   node qa/clicks.mjs
   ```
   If you add a feature, add a check for it to `verify.py`, with a break that proves the check can fail.
7. **Look at it.** Take screenshots and read each one yourself:
   ```
   node qa/desk.mjs --hash light shot=/tmp/change-light.png
   node qa/desk.mjs --hash dark shot=/tmp/change-dark.png
   node qa/desk.mjs --size 400x820 --hash light shot=/tmp/change-phone.png
   ```
   Check alignment, clipping, both themes, and no sideways scroll.
8. **Commit** on the branch.
9. **Merge main and read the live artifact before you publish.** Someone may have published since you started.
   ```
   git -C <worktree> merge main
   ```
   Then read the artifact at the link in `README.md`. If the live page has changes that are not in main, merge them into your file first.
10. **Publish once** to the same link. Omit `capabilities`, so the app keeps them. Batch every request you hold into this one publish, because each publish makes the installed app ask for its permission again.
11. **Finish in git.** Fast-forward main, then remove the worktree:
    ```
    git -C <app folder> merge --ff-only change/<short-name>
    git -C <app folder> worktree remove .claude/worktrees/<short-name>
    git -C <app folder> branch -d change/<short-name>
    ```
    If the folder has a remote, push main.
12. **Update the ledger.** Set each row to DONE, with the version and the commit in Where. Commit `changes.md` on main.
13. **Report** in one line: what changed, the version, and the commit.

Stay in this session for later requests. The app types each new request into this session. If a job is large, hand parts to sub-agents, but you alone publish.

## Never
- Never publish more than once for one batch.
- Never click a permission dialog for the person, and never use screen control to press Allow.
- Never put private data (names, keys, file contents) into the published page.
- Never force-push or delete main.

## NOT for
- A new app: use new-artifact-app.
- Wiring the feedback controls: use feedback-controls.
