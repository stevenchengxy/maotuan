import { Codex } from "@openai/codex-sdk";
import path from "node:path";
import fs from "node:fs";
import { buildPersona, digestPrompt, askPrompt, parseJson } from "../persona.js";

// 脑子 B：OpenAI Codex SDK，用你 codex login 的账号（或 CODEX_API_KEY）
export class CodexBrain {
  constructor({ store, dataDir, mcp, log = console.log }) {
    this.name = "codex";
    this.store = store; this.log = log; this.mcp = mcp;
    this.dir = path.join(dataDir, "codex"); fs.mkdirSync(this.dir, { recursive: true });
    this.memoryFile = path.join(dataDir, "brain", "memory.md");
    fs.mkdirSync(path.dirname(this.memoryFile), { recursive: true });
    this.threadId = store.get("codexThread") || null;
    this.ac = null; this.mcpStatus = [];
  }
  get petName() { return this.store.get("name") || "毛毛"; }
  client(withMcp = true) {
    const s = this.store.settings;
    const m = withMcp ? this.mcp() : { codex: { mcp_servers: {} } };
    const opts = { config: { ...(withMcp ? { mcp_servers: m.codex.mcp_servers } : {}) }, env: { ...process.env } };
    const key = this.store.getSecret("openaiKey");
    if (key && !/^sk-api-/.test(key)) opts.apiKey = key;   // sk-api- 开头的是 MiniMax 的，不是 OpenAI 的
    const override = (s.codexPath || "").trim(); if (override) opts.codexPathOverride = override;
    return new Codex(opts);
  }
  threadOptions() {
    const s = this.store.settings;
    return { workingDirectory: this.dir, skipGitRepoCheck: true, sandboxMode: "read-only", approvalPolicy: "never",
             ...(s.codexModel ? { model: s.codexModel } : {}), modelReasoningEffort: s.codexEffort || "low", webSearchMode: "cached" };
  }
  // Codex 读工作目录里的 AGENTS.md 当作它的说明书：把人设写进去
  writeAgents() { fs.writeFileSync(path.join(this.dir, "AGENTS.md"), buildPersona(this.store, this.memoryFile, "codex") + "\n"); }

  async *chat(text) {
    this.writeAgents();
    const codex = this.client(true);
    const thread = this.threadId ? codex.resumeThread(this.threadId, this.threadOptions()) : codex.startThread(this.threadOptions());
    this.ac = new AbortController();
    let final = "", lastItem = null; const seen = new Map();
    try {
      const { events } = await thread.runStreamed(text, { signal: this.ac.signal });
      for await (const ev of events) {
        if (ev.type === "thread.started") { if (ev.thread_id && ev.thread_id !== this.threadId) { this.threadId = ev.thread_id; this.store.set("codexThread", ev.thread_id); } }
        else if ((ev.type === "item.updated" || ev.type === "item.completed" || ev.type === "item.started") && ev.item && ev.item.type === "agent_message") {
          const t = ev.item.text || ""; const prev = seen.get(ev.item.id) || "";
          if (lastItem && lastItem !== ev.item.id && !prev && final && t) { final += "\n"; yield { type: "delta", text: "\n" }; }
          lastItem = ev.item.id;
          if (t !== prev) { const d = t.startsWith(prev) ? t.slice(prev.length) : t; if (t.startsWith(prev)) final += d; else final = final.slice(0, Math.max(0, final.length - prev.length)) + t; if (d) yield { type: "delta", text: d }; seen.set(ev.item.id, t); }
        }
        else if (ev.type === "item.started" && ev.item && ev.item.type === "mcp_tool_call") yield { type: "tool", name: `mcp__${ev.item.server || "mcp"}__${ev.item.tool || ""}`, input: ev.item.arguments };
        else if (ev.type === "item.started" && ev.item && ev.item.type === "web_search") yield { type: "tool", name: "WebSearch" };
        else if (ev.type === "item.completed" && ev.item && ev.item.type === "error") yield { type: "error", code: "item", text: ev.item.message || "error" };
        else if (ev.type === "turn.completed") yield { type: "done", text: final };
        else if (ev.type === "turn.failed") yield { type: "error", code: "failed", text: (ev.error && ev.error.message) || "turn failed" };
        else if (ev.type === "error") yield { type: "error", code: "stream", text: ev.message || "stream error" };
      }
    } catch (err) {
      if (this.ac && this.ac.signal.aborted) yield { type: "done", text: final };
      else yield { type: "error", code: "thrown", text: String((err && err.message) || err) };
    } finally { this.ac = null; }
  }
  async interrupt() { try { if (this.ac) this.ac.abort(); } catch {} }
  reset() { this.threadId = null; this.store.set("codexThread", ""); }
  async oneShot(prompt) {
    const codex = this.client(false);
    const thread = codex.startThread({ ...this.threadOptions(), model: this.store.settings.codexModel || undefined });
    const r = await thread.run(prompt);
    return parseJson(r.finalResponse || "");
  }
  digest(text, filename) { return this.oneShot(digestPrompt(this.petName, text, filename)); }
  ask(question, docText) { return this.oneShot(askPrompt(this.petName, question, docText)); }
}
