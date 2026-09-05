import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PRESETS } from "./mcp-presets.js";

export const presetById = id => PRESETS.find(p => p.id === id);

export function findPython() {
  for (const p of ["/opt/homebrew/opt/python@3.12/bin/python3.12", "/opt/homebrew/opt/python@3.13/bin/python3.13", "/opt/homebrew/opt/python@3.11/bin/python3.11", "/opt/homebrew/bin/python3"]) if (fs.existsSync(p)) return p;
  return "";
}
export function findUvx() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const cands = process.platform === "win32"
    ? [path.join(home, ".local", "bin", "uvx.exe"), path.join(home, "AppData", "Local", "Programs", "uv", "uvx.exe")]
    : [path.join(home, ".local/bin/uvx"), "/opt/homebrew/bin/uvx", "/usr/local/bin/uvx", path.join(home, "anaconda3/bin/uvx")];
  for (const p of cands) if (fs.existsSync(p)) return p;
  try { return execFileSync(process.platform === "win32" ? "where" : "/bin/zsh", process.platform === "win32" ? ["uvx"] : ["-lc", "command -v uvx"], { encoding: "utf8" }).trim().split("\n")[0] || ""; } catch { return ""; }
}
const safeName = s => String(s || "mcp").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);

// 把设置里的 MCP 列表 + 毛团自带的工具，翻译成两个脑子各自要的配置
export function resolveMcp(store, { toolsServer }) {
  const s = store.settings;
  const claude = { servers: {}, allowed: [] };
  const codex = { mcp_servers: {} };
  const entries = [];

  const add = (name, cfg) => {
    if (cfg.command) {
      claude.servers[name] = { command: cfg.command, args: cfg.args || [], env: { PATH: process.env.PATH, ...(cfg.env || {}) } };
      codex.mcp_servers[name] = { command: cfg.command, args: cfg.args || [], ...(cfg.env && Object.keys(cfg.env).length ? { env: cfg.env } : {}) };
    } else {
      claude.servers[name] = { type: cfg.type === "sse" ? "sse" : "http", url: cfg.url, ...(cfg.headers && Object.keys(cfg.headers).length ? { headers: cfg.headers } : {}) };
      codex.mcp_servers[name] = { url: cfg.url, ...(cfg.headers && Object.keys(cfg.headers).length ? { http_headers: cfg.headers } : {}) };
    }
    claude.allowed.push(`mcp__${name}__*`);
  };

  if (toolsServer) add("maotuan", toolsServer);

  const vars = { UVX: s.uvx || findUvx(), PYTHON: s.pythonBin || findPython() };
  const sub = (str, values) => String(str).replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] != null ? String(values[k]) : "");

  for (const e of s.mcp || []) {
    const rec = { id: e.id, name: e.name, preset: e.preset, enabled: !!e.enabled, ok: false, error: "" };
    entries.push(rec);
    if (!e.enabled) continue;
    const p = presetById(e.preset) || null;
    const values = { ...vars };
    for (const f of (p && p.fields) || []) values[f.key] = f.secret ? store.getSecret(`mcp:${e.id}:${f.key}`) : ((e.fields || {})[f.key] || "");
    const missing = ((p && p.fields) || []).filter(f => !values[f.key] && !/可选/.test(f.label)).map(f => f.label);
    if (missing.length) { rec.error = "还没填：" + missing.join("、"); continue; }
    let cfg;
    if (p && p.id !== "custom") {
      const env = { ...(p.extraEnv || {}) };
      for (const f of p.fields) if (!f.arg && values[f.key]) env[f.key] = values[f.key];
      cfg = p.type === "http"
        ? { type: "http", url: sub(p.url, values), headers: Object.fromEntries(Object.entries(p.headers || {}).map(([k, v]) => [k, sub(v, values)])) }
        : { command: sub(p.command, values), args: (p.args || []).map(a => sub(a, values)).filter(a => a !== ""), env };
    } else {
      cfg = e.type === "http" || e.type === "sse" ? { type: e.type, url: e.url || "", headers: e.headers || {} } : { command: e.command || "", args: e.args || [], env: e.env || {} };
    }
    if (cfg.command !== undefined && !cfg.command) { rec.error = "命令是空的"; continue; }
    if (cfg.command === undefined && !cfg.url) { rec.error = "网址是空的"; continue; }
    if (cfg.command && cfg.command.includes("/") && !fs.existsSync(cfg.command)) { rec.error = "找不到：" + cfg.command; continue; }
    add(safeName(e.id), cfg); rec.ok = true;
  }
  return { entries, claude, codex, presets: PRESETS };
}
