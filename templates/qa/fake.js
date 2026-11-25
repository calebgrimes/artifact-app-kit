// Fake desktop layer, for previews and click tests only. It stands in for `claude.use("desktop")`
// so the page runs in plain headless Chrome. It runs no real command and touches no real file.
// It records what the page asks for, so tests can check it:
//   window.__runs   every command the page runs, as one string ("claude --bg -n ...")
//   window.__argv   the same, as the raw argument lists
//   window.__bg     each brief given to `claude --bg`
//   window.__pty    every write to a fake terminal; window.__ptySpawns counts them
//   window.__menu   the last right-click menu (an item's click() can be called)
//   window.__agents the fake `claude agents --json` list (set it to test worker reuse)
//   window.__ledger the text of changes.md (build_preview.py fills it from the real file)
//   window.__files  invented sample files by name, from qa/sample/ (build_preview.py fills it). Never put real data there.
(() => {
  const HOME = "/Users/example";
  window.__runs = []; window.__argv = []; window.__bg = []; window.__pty = []; window.__ptySpawns = 0;
  window.__agents = window.__agents || [];
  window.__waiting = window.__waiting || false; // true: the change worker waits on a question
  const proc = (out, code = 0) => {
    const h = {};
    const p = { stdout: { on: (e, f) => (h.out = f) }, stderr: { on: (e, f) => (h.err = f) }, stdin: { write: async () => {}, end: async () => {} },
      on: (e, f) => (h[e] = f), kill: async () => {}, pid: Promise.resolve(4242) };
    setTimeout(() => { h.out && h.out(out); h.close && h.close(code, null); }, 5);
    return p;
  };
  window.__deskFake = {
    install: { state: async () => "installed", request: async () => "installed" },
    permissions: { state: async () => ({ "full-access": "granted" }), request: async () => ({ "full-access": "granted" }), manage: async () => {} },
    window: { setOptions: async () => ({ applied: "now", reloading: false }), getOptions: async () => ({ options: {}, applied: {} }),
      getBounds: async () => ({ x: 0, y: 0, width: 1000, height: 700 }), place: async (p) => ({ width: p.width || 1000, height: p.height || 700 }) },
    app: { dock: { setIcon: async () => ({ written: false }), setBadge: async () => true } },
    os: { platform: async () => "darwin", homedir: async () => HOME },
    notification: { show: async () => {} },
    shell: { openPath: async () => {}, showItemInFolder: async () => {}, trashItem: async () => {} },
    Menu: { popup: async (items) => { window.__menu = items; }, setApplicationMenu: async () => {} },
    tray: { set: async () => true, remove: async () => {} },
    fs: {
      exists: async (p) => p === HOME + "/.local/bin/claude" || String(p).split("/").pop() in (window.__files || {}),
      readFile: async (p) => {
        if (String(p).endsWith("/changes.md")) return window.__ledger || "# Change ledger\n\n## Rows\n| # | Request | Status | Where |\n|---|---|---|---|\n";
        if (String(p).includes("/.claude/sessions/")) return JSON.stringify({ status: window.__waiting ? "waiting" : "busy" });
        const name = String(p).split("/").pop(); // invented sample data from qa/sample/, by file name
        if (window.__files && name in window.__files) return window.__files[name];
        throw new Error("ENOENT: " + p);
      },
      writeFile: async () => {}, readdir: async () => [], stat: async () => { throw new Error("ENOENT"); }, mkdir: async () => {},
    },
    childProcess: {
      exec: async (cmd) => ({ stdout: cmd.includes("command -v claude") ? HOME + "/.local/bin/claude\n" : "", stderr: "", code: 0, signal: null, truncated: false }),
      spawn: (sh, args) => {
        const a = args.slice(2).map((x) => x.replace(HOME + "/.local/bin/claude", "claude")); // drop "-lc" and the exec line
        window.__runs.push(a.join(" ")); window.__argv.push(a);
        if (a.includes("agents")) return proc(JSON.stringify(window.__agents));
        if (a.includes("--bg")) { window.__bg.push(a.at(-1)); return proc("Started in the background. claude attach f0f0f0f0\n"); }
        return proc("");
      },
    },
    pty: {
      spawn: (file, args) => {
        window.__ptySpawns++; window.__runs.push(args.slice(2).join(" "));
        const h = {};
        setTimeout(() => h.data && h.data("\x1b[2J fake attach screen"), 30);
        return { pid: Promise.resolve(4343), onData: (f) => (h.data = f), onExit: (f) => (h.exit = f), onError: () => {},
          write: async (d) => { window.__pty.push(d); }, resize: async () => {}, kill: async () => { h.exit && h.exit({ exitCode: 0 }); } };
      },
    },
  };
})();
