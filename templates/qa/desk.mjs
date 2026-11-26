// desk.mjs: see and drive the app from the command line, with the fake desktop layer (qa/fake.js) in headless Chrome.
// It builds qa/preview.html first, runs your steps in ONE page session, and prints what happened.
//
//   node qa/desk.mjs [--size 1000x700] [--hash qa] STEP...
//
// STEPs (one argument each):
//   shot=out.png        screenshot of the page
//   click=CSS           click the first visible element that matches
//   clicktext=WORDS     click the first visible button whose text contains WORDS
//   type=CSS::TEXT      click the field, then type TEXT
//   key=Escape          press a key (also key=Enter, key=Tab)
//   rightclick=CSS      right-click the element (the page's context menu goes to window.__menu)
//   wait=MS             wait
//   text=CSS            print the visible text of the element
//   state               print the title, queue size, open popovers and dialogs, and the page width
//   eval=JS             run JavaScript in the page and print the result
//   reload              load the page again (localStorage stays)
//
// Pass any --hash (for example --hash qa) to keep the What's new tour shut. #dark and #light force a theme.
// Limit: this drives the fake layer, not the installed app. Check the real app with screencapture (see README.md).
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const args = process.argv.slice(2);
let size = "1000x700", hash = "";
const steps = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--size") size = args[++i];
  else if (args[i] === "--hash") hash = args[++i];
  else steps.push(args[i]);
}
if (!steps.length) { console.error(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 21).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(2); }
const [W, H] = size.split("x").map(Number);

const file = execFileSync("python3", [join(here, "build_preview.py")], { encoding: "utf8" }).trim();
const dir = mkdtempSync(join(tmpdir(), "desk-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${W},${H}`, "--remote-debugging-port=0", `--user-data-dir=${dir}`, "about:blank"], { stdio: "ignore" });
let done = false;
async function finish(code) { // also on Ctrl-C or a kill, so a stopped run leaves no profile behind
  if (done) return; done = true;
  chrome.kill();
  if (chrome.exitCode === null && chrome.signalCode === null) await new Promise((r) => { chrome.once("exit", r); setTimeout(r, 3000); });
  rmSync(dir, { recursive: true, force: true }); // each run makes a new Chrome profile; left behind, a test loop fills the disk
  process.exit(code);
}
for (const s of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(s, () => finish(130));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function port() {
  for (let i = 0; i < 100; i++) { const f = join(dir, "DevToolsActivePort"); if (existsSync(f)) return readFileSync(f, "utf8").split("\n")[0]; await sleep(100); }
  throw new Error("Chrome did not start. Set CHROME to the Chrome program path.");
}
let code = 0;
try {
  const p = await port();
  const list = await (await fetch(`http://127.0.0.1:${p}/json/list`)).json();
  const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const wait = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); } };
  const cdp = (method, params = {}) => new Promise((res, rej) => { const n = ++id; wait.set(n, (d) => (d.error ? rej(new Error(d.error.message)) : res(d.result))); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async (expr) => { const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "page error"); return r.result.value; };
  await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: "file://" + file + (hash ? "#" + hash : "") });
  await sleep(1200);
  const mouse = async (x, y, button = "left") => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await cdp("Input.dispatchMouseEvent", { type, x, y, button, clickCount: 1 }); };
  const center = (js) => ev(`(() => { const e = ${js}; if (!e) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? [r.left + r.width / 2, r.top + r.height / 2] : null; })()`);
  for (const step of steps) {
    const eq = step.indexOf("="), name = eq < 0 ? step : step.slice(0, eq), val = eq < 0 ? "" : step.slice(eq + 1);
    if (name === "shot") { const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(val, Buffer.from(r.data, "base64")); console.log("✔ shot " + val); }
    else if (name === "click" || name === "clicktext" || name === "rightclick") {
      const js = name === "clicktext" ? `[...document.querySelectorAll("button")].find((b) => b.offsetParent && b.textContent.includes(${JSON.stringify(val)}))` : `document.querySelector(${JSON.stringify(val)})`;
      const c = await center(js);
      if (!c) { console.log(`✖ ${name} ${val}: nothing visible matches`); code = 1; } else { await mouse(...c, name === "rightclick" ? "right" : "left"); await sleep(250); console.log(`✔ ${name} ${val}`); }
    }
    else if (name === "type") {
      const [sel, ...rest] = val.split("::");
      const c = await center(`document.querySelector(${JSON.stringify(sel)})`);
      if (!c) { console.log(`✖ type ${sel}: nothing visible matches`); code = 1; } else { await mouse(...c); await cdp("Input.insertText", { text: rest.join("::") }); console.log(`✔ type ${sel}`); }
    }
    else if (name === "key") {
      const named = { Enter: [13, "\r"], Escape: [27], Tab: [9] }[val] || [val.toUpperCase().charCodeAt(0), val];
      await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: val, code: val, windowsVirtualKeyCode: named[0], text: named[1] });
      await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: val, code: val, windowsVirtualKeyCode: named[0] });
      await sleep(150); console.log("✔ key " + val);
    }
    else if (name === "reload") { await cdp("Page.reload"); await sleep(1200); console.log("✔ reload"); }
    else if (name === "wait") await sleep(Number(val) || 500);
    else if (name === "text") console.log(await ev(`(document.querySelector(${JSON.stringify(val)}) || {}).innerText ?? "(no match)"`));
    else if (name === "state") console.log(await ev(`JSON.stringify({ title: document.title, theme: document.documentElement.dataset.theme || "auto", queue: document.getElementById("qSend").hidden ? 0 : document.getElementById("qSend").textContent, pointing: document.body.classList.contains("pointing"), open: [...document.querySelectorAll(".pop:not([hidden]), dialog[open]")].map((d) => d.id), pageWidth: document.documentElement.scrollWidth + "/" + innerWidth })`));
    else if (name === "eval") console.log(await ev(val));
    else { console.log("✖ unknown step " + step); code = 2; }
  }
  ws.close();
} catch (e) { console.log("✖ " + (e.message || e)); code = 1; }
await finish(code);
