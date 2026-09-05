import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// 毛团的小耳朵：本机一个很小的 HTTP 口，Claude Code / Codex 的钩子跑完了就来敲一下；
// 别的程序（WorkBuddy、脚本）也能通过它让毛团说话。
export class Watcher {
  constructor({ port = 47831, log = console.log, onEvent, getStatus }) {
    this.port = port; this.log = log; this.onEvent = onEvent; this.getStatus = getStatus; this.server = null;
  }
  start() {
    this.server = http.createServer((req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8" };
      if (req.method === "GET" && u.pathname === "/status") { res.writeHead(200, cors); res.end(JSON.stringify(this.getStatus ? this.getStatus() : {})); return; }
      if (req.method !== "POST") { res.writeHead(404, cors); res.end("{}"); return; }
      let body = "";
      req.on("data", c => { body += c; if (body.length > 200000) req.destroy(); });
      req.on("end", () => {
        let data = {};
        try { data = body ? JSON.parse(body) : {}; } catch { data = { raw: body }; }
        const source = u.searchParams.get("source") || data.source || "unknown";
        const hook = u.searchParams.get("hook") || data.hook || data.type || "";
        if (u.pathname === "/draw") {
          Promise.resolve(this.onEvent({ kind: "draw", source, prompt: String(data.prompt || "").slice(0, 600), style: String(data.style || "").slice(0, 40) }))
            .then(r => { res.writeHead(200, cors); res.end(JSON.stringify(r || { ok: false })); })
            .catch(e => { res.writeHead(200, cors); res.end(JSON.stringify({ ok: false, error: e.message })); });
          return;
        }
        if (u.pathname === "/say") { this.onEvent({ kind: "say", source, text: String(data.text || data.message || "").slice(0, 400) }); }
        else if (u.pathname === "/sing") { this.onEvent({ kind: "sing", source, theme: String(data.theme || "").slice(0, 60) }); }
        else if (u.pathname === "/event") { this.onEvent({ kind: "event", source, hook, data }); }
        else { res.writeHead(404, cors); res.end("{}"); return; }
        res.writeHead(200, cors); res.end('{"ok":true}');
      });
    });
    this.server.on("error", e => this.log("watcher port busy:", e.message));
    this.server.listen(this.port, "127.0.0.1", () => this.log("watcher listening on", this.port));
  }
  stop() { try { this.server && this.server.close(); } catch {} }

  // ---- 钩子安装（只在用户点了按钮之后才会跑）----
  claudeHookCommand() {
    return `curl -s -m 2 -X POST "http://127.0.0.1:${this.port}/event?source=claude&hook=$HOOK" -H "Content-Type: application/json" --data-binary @- >/dev/null 2>&1 || true`;
  }
  previewClaude() {
    const file = path.join(os.homedir(), ".claude", "settings.json");
    return { file, hooks: ["Stop", "Notification"], command: this.claudeHookCommand() };
  }
  installClaude() {
    const file = path.join(os.homedir(), ".claude", "settings.json");
    let cfg = {};
    try { cfg = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
    cfg.hooks = cfg.hooks || {};
    for (const ev of ["Stop", "Notification"]) {
      const cmd = this.claudeHookCommand().replace("$HOOK", ev);
      const list = Array.isArray(cfg.hooks[ev]) ? cfg.hooks[ev] : [];
      const already = list.some(g => (g.hooks || []).some(h => String(h.command || "").includes(`127.0.0.1:${this.port}`)));
      if (!already) list.push({ hooks: [{ type: "command", command: cmd, timeout: 5 }] });
      cfg.hooks[ev] = list;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
    return file;
  }
  uninstallClaude() {
    const file = path.join(os.homedir(), ".claude", "settings.json");
    let cfg = {};
    try { cfg = JSON.parse(fs.readFileSync(file, "utf8")); } catch { return file; }
    for (const ev of Object.keys(cfg.hooks || {})) {
      cfg.hooks[ev] = (cfg.hooks[ev] || []).map(g => ({ ...g, hooks: (g.hooks || []).filter(h => !String(h.command || "").includes(`127.0.0.1:${this.port}`)) })).filter(g => g.hooks.length);
      if (!cfg.hooks[ev].length) delete cfg.hooks[ev];
    }
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
    return file;
  }

  // Codex 的 notify 只能填一条命令：我们写一个转发脚本，先敲毛团，再把原来的那条也执行了
  previewCodex() {
    const file = path.join(os.homedir(), ".codex", "config.toml");
    let existing = null;
    try { const m = fs.readFileSync(file, "utf8").match(/^\s*notify\s*=\s*(\[.*\])\s*$/m); if (m) existing = JSON.parse(m[1]); } catch {}
    return { file, existing, script: path.join(os.homedir(), ".maotuan", "codex-notify.sh") };
  }
  installCodex() {
    const { file, existing, script } = this.previewCodex();
    if (existing && existing[0] === "/bin/zsh" && existing[1] === script) return file;   // 已经装过
    fs.mkdirSync(path.dirname(script), { recursive: true });
    const forward = existing && existing.length ? `\n# 原来的 notify\n${existing.map(a => JSON.stringify(a)).join(" ")} "$@" >/dev/null 2>&1 || true\n` : "";
    fs.writeFileSync(script, `#!/bin/zsh\n# 毛团：Codex 一轮跑完了就来敲一下\ncurl -s -m 2 -X POST "http://127.0.0.1:${this.port}/event?source=codex" -H "Content-Type: application/json" --data-raw "$1" >/dev/null 2>&1 || true${forward}`);
    fs.chmodSync(script, 0o755);
    let toml = ""; try { toml = fs.readFileSync(file, "utf8"); } catch {}
    const line = `notify = ["/bin/zsh", ${JSON.stringify(script)}]`;
    if (/^\s*notify\s*=.*$/m.test(toml)) toml = toml.replace(/^\s*notify\s*=.*$/m, line);
    else toml = line + "\n" + toml;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, toml);
    return file;
  }
}
