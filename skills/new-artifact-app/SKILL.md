---
name: new-artifact-app
description: Build a new desktop app from a Claude artifact, with feedback controls built in (Point and comment, a comment queue, right-click "Change this app…", a Requests list, and a What's new tour). Interviews the person, scaffolds the app folder (intent.md, changes.md, README.md, index.html, verify.py, qa/), checks it, and publishes the artifact with the desktop capability so they can install it as an app. Use when someone says "make me a desktop app", "build an app from an artifact", "a Mac app that…", "an app I can change by pointing at it", or runs /artifact-app-kit:new. NOT for changing an app that already exists (use app-change-worker), NOT for adding feedback controls to an existing artifact (use feedback-controls), and NOT for a plain web page with no desktop install.
---

# New artifact app

You build a small desktop app from one Claude artifact. The person installs it from the Claude desktop app ("Install as app"). The app can change itself: the person points at any part of it, writes a note, and a Claude Code worker edits, checks, and republishes it.

Templates: `${CLAUDE_PLUGIN_ROOT}/templates/`. Scaffold script: `${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.py`.

## Before you start
- Check that the Claude Code CLI is on this computer: look for `~/.local/bin/claude`, `/opt/homebrew/bin/claude`, or `/usr/local/bin/claude`. If none exists, tell the person the feedback controls need it.
- Check that `node` (version 22 or newer) and `python3` exist. The checks and the preview use them.
- The `desktop` capability's "full-access" permission works only on an artifact that the person's own account published. Each person publishes their own copy. Never send them a link to someone else's app for install.

## Step 1: Interview (one question at a time)
Ask these, in this order. Wait for each answer.
1. What is the app for? (one sentence)
2. Who uses it? (just you, a team, on which computer)
3. What data does it show, and where does that data live? (a file in the app folder, a folder, a command's output)
4. What is the app's name? (1-50 characters; it is the window title and the Dock name)
5. Which folder holds the app? Suggest `~/apps/<name-in-lowercase-with-dashes>`.

If the data is private (clients, health, money, passwords), say this: the published page holds no data; the app reads the data on this computer at run time.

## Step 2: Scaffold
Run one command:

```
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.py --name "<name>" --dir <folder> --purpose "<answer 1>" --users "<answer 2>" --data "<answer 3>"
```

It writes `index.html`, `verify.py`, `changes.md`, `intent.md`, `README.md`, and `qa/` (`fake.js`, `build_preview.py`, `desk.mjs`, `clicks.mjs`). It refuses a folder that already has an `index.html`.

Then make the folder a git repo and commit:

```
git -C <folder> init
git -C <folder> add -A
git -C <folder> commit -m "Scaffold <name> from artifact-app-kit"
```

## Step 3: Build the first screen
- Replace the block between `APP CONTENT START` and `APP CONTENT END` in `index.html` with the app's first screen.
- Put the app's logic between `APP CODE START` and `APP CODE END`. Read data at run time with `D.fs.readFile(APP_DIR + "/<file>", "utf8")` or `run(file, args)`.
- Build elements with `el(tag, class, text)`. Never use `innerHTML`.
- Show each state with `mark(state, word)`: a shape and a word, then color. Blue means good, orange means bad. Never red with green.
- Do not change the block between `---- feedback: start ----` and `---- feedback: end ----` unless the person asks.
- Put invented sample data (never real data) in `qa/sample/`. The preview serves each file there by its name.
- Keep the `WHATS_NEW` entry for version 1. It teaches the feedback controls.
- Add a row to `changes.md` for the first screen.

## Step 4: Check
Run each command from the app folder. Each must end with 0 FAIL.

```
python3 verify.py --selftest
node qa/clicks.mjs
```

Then take screenshots and look at each one yourself (see the verify-artifact-app skill):

```
node qa/desk.mjs --hash light shot=/tmp/<slug>-light.png
node qa/desk.mjs --hash dark shot=/tmp/<slug>-dark.png
node qa/desk.mjs --size 400x820 --hash light shot=/tmp/<slug>-phone.png
```

Fix what you see, then commit.

## Step 5: Publish (once)
Publish `index.html` as an artifact with these capabilities:

```
{"desktop": {}, "comments": {"composer_only": true}}
```

- Publish one time. Each new published version makes the installed app ask for its permission again.
- Write the artifact link into `README.md` in place of `{{ARTIFACT_URL}}`. Change workers find the link there. Commit.
- A later publish goes to the same link. Omit `capabilities` then, so the app keeps them.

## Step 6: Hand over to the person
Tell them, in plain words:
1. Open the artifact link in the Claude desktop app.
2. Pick "Install as app" in the artifact's menu (or click the Install as app button on the page).
3. Open the app from the Dock. Click Connect. Then click Allow in the system dialog yourself.
4. Run `claude` once in the app folder and accept the trust question. Without it, the app cannot start its change worker ("Workspace not trusted").
5. To ask for a change: click Point and comment, click a part, write a note, then Send queue. Or right-click and pick "Change this app…".

Warning: never click a permission dialog for the person, and never use screen control to press Allow. The permission is their decision.

## NOT for
- Changes to an existing app: use the app-change-worker skill (the app's own worker does this).
- Adding the feedback loop to an artifact that has none: use the feedback-controls skill.
- Apps for people outside the person's organization: full access is refused there. Tell the person before you build.
