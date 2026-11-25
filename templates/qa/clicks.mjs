// clicks.mjs: click tests for the feedback controls, with the fake desktop layer. No real worker starts.
// Run: node qa/clicks.mjs   Done means 0 FAIL.
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const check = (name, js) => `eval=(() => { try { return (${js}) ? "✔ PASS ${name}" : "✖ FAIL ${name}"; } catch (e) { return "✖ FAIL ${name} (" + e.message + ")"; } })()`;
const steps = [
  check("the app starts inside the fake desktop app", `!document.getElementById("app").hidden && !document.getElementById("pointBtn").hidden`),
  "clicktext=Point and comment",
  "click=#starter h2",
  "type=#pop-text::Make the title bigger",
  "click=#pop-go",
  check("a pointed comment joins the queue and leaves a pin", `document.getElementById("qSend").textContent === "Send queue (1)" && document.querySelectorAll(".pin").length === 1`),
  "key=Escape",
  "clicktext=Send queue",
  "wait=600",
  check("Send queue starts ONE new change worker by name", `__runs.filter((r) => r.startsWith("claude --bg -n " + document.title + " change")).length === 1`),
  check("the brief carries the ledger rules", `["One worker edits the page at a time", "Merge main into your branch and read the live artifact", "WHATS_NEW", "Batch changes into one publish", "verify.py --selftest"].every((t) => __bg[0].includes(t))`),
  check("the brief holds the comment and what it pointed at", `__bg[0].includes("Make the title bigger") && __bg[0].includes("Pointed at: <h2")`),
  check("the queue clears after the send", `document.getElementById("qSend").hidden && !document.querySelector(".pin")`),
  // A worker by that name now runs: the next request goes into it, not into a new one.
  `eval=window.__agents = [{ id: "f0f0f0f0", pid: 4242, name: document.title + " change", state: "working" }], "ok"`,
  "rightclick=#starter p",
  check("right-click offers Change this app…", `(__menu || []).some((i) => i.label === "Change this app…")`),
  `eval=__menu.find((i) => i.label === "Change this app…").click(), "ok"`,
  "type=#c-text::Add a search box",
  "click=#c-go",
  "wait=3500",
  check("a second request reuses the running worker (no second --bg)", `__runs.filter((r) => r.includes("--bg")).length === 1 && __ptySpawns === 1`),
  check("it types the request as one bracketed paste, then Enter", `__pty[0].startsWith("\\x1b[200~") && __pty[0].includes("Add a search box") && __pty[0].endsWith("\\x1b[201~") && __pty[1] === "\\r"`),
  // A worker that waits on a question gets nothing typed into it.
  `eval=window.__waiting = true, "ok"`,
  `eval=document.getElementById("pop-text").value = "", "ok"`,
  "clicktext=Point and comment", "click=#starter h2", "type=#pop-text::Another change", "click=#pop-go", "key=Escape",
  "clicktext=Send queue", "wait=600",
  check("a worker that waits on a question gets no typing; the queue stays", `__ptySpawns === 1 && document.getElementById("qSend").textContent === "Send queue (1)" && document.getElementById("qErr").textContent.includes("waits on a question")`),
  "clicktext=Requests", "wait=300",
  check("Requests lists the rows of changes.md", `document.querySelectorAll("#reqList li").length >= 1 && !document.getElementById("reqErr").textContent`),
  "key=Escape",
  "click=#gearBtn", "click=#tsUp",
  check("the text size control changes and saves the size", `document.documentElement.style.getPropertyValue("--scale") === "1.05"`),
  `eval=(document.getElementById("themeSel").value = "dark", document.getElementById("themeSel").dispatchEvent(new Event("change")), "ok")`,
  check("the theme control sets dark", `document.documentElement.dataset.theme === "dark"`),
];
let out = "";
try { out = execFileSync("node", [join(here, "desk.mjs"), "--hash", "qa", ...steps], { encoding: "utf8" }); }
catch (e) { out = String(e.stdout || "") + String(e.message || e); }
const lines = out.split("\n").filter((l) => /PASS|FAIL|✖/.test(l));
console.log(lines.join("\n"));
const fails = lines.filter((l) => l.includes("✖")).length, passes = lines.filter((l) => l.includes("✔ PASS")).length;
console.log(`${fails ? "✖" : "✔"} ${passes} PASS, ${fails} FAIL`);
process.exit(fails ? 1 : 0);
