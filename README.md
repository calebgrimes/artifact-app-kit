# artifact-app-kit

A Claude Code plugin that helps you build your own desktop app from a Claude artifact, with feedback controls built in. You point at any part of the app, write what should change, and a Claude Code worker on your computer changes the app for you.

## How it works (60 seconds)
1. **Artifact.** You tell Claude what the app is for. Claude writes one page (an artifact) and publishes it with the `desktop` capability.
2. **Install as app.** In the Claude desktop app, you pick "Install as app". The page gets its own window and Dock icon. You click Allow once, so it can read its folder and run Claude Code.
3. **Point at anything.** Click "Point and comment", click a part of the app, and write a note. Notes wait in a queue. "Send queue" sends them all at once. Right-click > "Change this app…" sends one at once.
4. **Claude changes it.** The app starts (or reuses) one Claude Code background worker. The worker edits the page in a git worktree, runs the checks, looks at screenshots, publishes once, and records the change. The next time you open the app, a short "What's new" tour shows what changed.

## Install
In Claude Code:

```
/plugin marketplace add calebgrimes/artifact-app-kit
/plugin install artifact-app-kit@artifact-app-kit
```

Then start a new app with `/artifact-app-kit:new`, or just say "make me a desktop app that …".

## What is inside
| Part | What it does |
|---|---|
| Skill `new-artifact-app` | Interviews you, scaffolds the app folder, checks it, publishes it, and tells you how to install it |
| Skill `feedback-controls` | Adds or repairs the feedback loop in an app that already exists |
| Skill `app-change-worker` | The steps the change worker follows for each request |
| Skill `verify-artifact-app` | Page checks, preview screenshots in light and dark, click tests, and a look at the real installed app |
| Command `/artifact-app-kit:new` | Starts `new-artifact-app` |
| Command `/artifact-app-kit:feedback` | Starts `feedback-controls` |
| `templates/` | The starter app: `index.html`, `verify.py`, `qa/` (fake desktop layer, preview, click tests), `changes.md`, `intent.md`, `README.md` |
| `scripts/scaffold.py` | Copies the templates into a new folder and fills in the app's name and folder |
| `scripts/privacy-check.sh` | Fails if the kit holds personal data (for people who change the kit) |

Each app you make has:
- `intent.md`: why the app exists, what it is, what is out of scope, decisions, and how it is checked.
- `changes.md`: the change ledger. Every request is a row. The app's Requests button shows it.
- `verify.py --selftest`: page checks, each proven to fail on a broken page. Done means 0 FAIL.
- `qa/`: a fake desktop layer, so the app runs in headless Chrome for screenshots and click tests.

## Requirements
- The Claude desktop app, with "Install as app" for artifacts.
- Claude Code (the `claude` command) on the same computer. The app runs it to start its change worker.
- macOS first. The starter app runs its commands through `/bin/zsh`, so it does not work on Windows as is. On Windows the desktop API also has no application menu bar and no Dock tile, and commands run in cmd.exe.
- `python3` and `node` 22 or newer for the checks. Google Chrome for screenshots.
- Each person publishes their own copy of their app. The "full access" permission works only on an artifact from the person's own organization.
- Before the first change, run `claude` once in the app's folder and accept the trust question. Otherwise Claude Code refuses to start the worker there ("Workspace not trusted").

## What the kit runs, reads, and sends
- **The plugin itself** runs only local commands: `python3 scripts/scaffold.py` (copies the templates into a folder you name), `git` in your app's folder, and the checks below. It fetches nothing from the network and sends nothing anywhere.
- **The publish** is the one send: Claude publishes your app's `index.html` as an artifact on your own Claude account, with the `desktop` and `comments` capabilities. It happens only when you ask for it.
- **Your installed app** runs, through `/bin/zsh -lc`, the `claude` command: `claude agents --json` (to find its change worker), `claude --bg -n "<App name> change" "<brief>"` (to start the worker in the app's folder), and `claude attach <id>` (to type a new request into that worker). It reads `changes.md` and your app's own data files in the app's folder, and `~/.claude/sessions/<pid>.json` (to see if the worker waits on a question). The starter page loads no external script or font.
- **The checks** run `node`, `python3`, and headless Google Chrome on a local debugging port, with a fake desktop layer. They start no real worker and read no real data. `verify.py` also runs `claude agents --json` once, read only.
- **The change worker** (Claude Code) edits your app's folder in a git worktree, runs the checks, and publishes the page to the same artifact link.

## Safety
- **The app gets full access to your computer.** With it, the app can read and change files and run commands. Nothing asks you again before each command. Read what the app runs (the feedback code is short and marked) before you click Allow.
- **The change worker edits your app.** It works in a git worktree and commits each change, so you can see and undo every change with git.
- **Never let an AI click a permission dialog.** You click Allow yourself. The skills tell Claude never to click Allow, Install, or Don't Allow for you.
- **Keep private data out of the page.** The published page is the app's code. The app reads your data from your computer when it runs. Sample data for previews must be invented.
- **One worker at a time.** The app reuses one worker by name, so two workers do not edit the page at once.

## FAQ
**Does my data go to the artifact?** No. The page holds only code. It reads files on your computer at run time.

**Why does the app ask for permission again after a change?** Each new published version asks once more. That is why a worker batches changes into one publish.

**Where do my comments go?** To one Claude Code background session named "<App name> change". See it with `claude agents`. Talk to it with `claude attach <id>`.

**The Send queue button says "Workspace not trusted".** Run `claude` once in the app's folder and accept the question. Then send again.

**The worker waits on a question and my note did not go.** The app does not type into a worker that waits on a question, because Enter would pick an answer. Your note stays in the queue. Answer the question with `claude attach <id>`, then send again.

**Can other people use my app?** They can open your artifact, but full access works only inside your own organization. People outside it should install this plugin and make their own app.

**Can I test without installing?** Yes. `python3 qa/build_preview.py` builds `qa/preview.html` with a fake desktop layer. `node qa/desk.mjs shot=/tmp/app.png` takes a screenshot.

## For people who change the kit
- Check the plugin: `claude plugin validate .`
- Check for personal data: `bash scripts/privacy-check.sh`. Put private names in `.privacy-patterns.local` (one per line; git ignores that file).
- Test the templates with a dry run: `python3 scripts/scaffold.py --name "Test App" --dir /tmp/test-app`, then `python3 /tmp/test-app/verify.py --selftest` and `node /tmp/test-app/qa/clicks.mjs`.
