import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "node:path";
import fs from "node:fs";
import { buildPersona, digestPrompt, askPrompt, parseJson } from "../persona.js";

const BUILTIN_OFF = ["Bash", "Edit", "Write", "MultiEdit", "NotebookEdit", "Read", "Glob", "Grep", "Task", "Agent", "TodoWrite", "KillShell", "BashOutput", "LS", "WebFetch"];

// 脑子 A：Claude Agent SDK，用你 Claude Code 的登录
export class ClaudeBrain {
  constructor({ store, dataDir, mcp, log = console.log }) {
    this.name = "claude";
    this.store = store; this.log = log; this.mcp = mcp;
    this.dir = path.join(dataDir, "brain"); fs.mkdirSync(this.dir, { recursive: true });
    this.memoryFile = path.join(this.dir, "memory.md");
    this.sessionId = store.get("brainSession") || undefined;
    this.busy = null; this.mcpStatus = [];
  }
  get petName() { return this.store.get("name") || "毛毛"; }
  envOpt() { const token = this.store.getSecret("claudeToken"); return token ? { env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token } } : {}; }
  baseOptions() {
    const m = this.mcp();
    const model = (this.store.settings.model || "").trim();
    return {
      cwd: this.dir, settingSources: [], ...(model ? { model } : {}), ...this.envOpt(),
      mcpServers: m.claude.servers, allowedTools: ["WebSearch", ...m.claude.allowed], disallowedTools: BUILTIN_OFF,
      permissionMode: "default", includePartialMessages: true, maxTurns: 12
    };
  }
  async *chat(text) {
    const q = query({ prompt: text, options: { ...this.baseOptions(), systemPrompt: buildPersona(this.store, this.memoryFile, "claude"), ...(this.sessionId ? { resume: this.sessionId } : {}) } });
    this.busy = q; let final = "";
    try {
      for await (const m of q) {
        if (m.type === "system" && m.subtype === "init") {
          if (m.session_id && m.session_id !== this.sessionId) { this.sessionId = m.session_id; this.store.set("brainSession", m.session_id); }
          this.mcpStatus = (m.mcp_servers || []).map(s => ({ name: s.name, status: s.status }));
        } else if (m.type === "stream_event") {
          const e = m.event;
          if (e && e.type === "content_block_delta" && e.delta && e.delta.type === "text_delta") { final += e.delta.text; yield { type: "delta", text: e.delta.text }; }
        } else if (m.type === "assistant") {
          for (const b of (m.message && m.message.content) || []) if (b.type === "tool_use") yield { type: "tool", name: b.name, input: b.input };
        } else if (m.type === "result") {
          if (m.subtype === "success") yield { type: "done", text: m.result || final };
          else yield { type: "error", code: m.subtype, text: (m.result && String(m.result)) || m.subtype };
        }
      }
    } catch (err) { yield { type: "error", code: "thrown", text: String((err && err.message) || err) }; }
    finally { this.busy = null; }
  }
  async interrupt() { try { if (this.busy && this.busy.interrupt) await this.busy.interrupt(); } catch {} }
  reset() { this.sessionId = undefined; this.store.set("brainSession", ""); }
  async oneShot(prompt) {
    let out = "";
    const q = query({ prompt, options: { cwd: this.dir, settingSources: [], mcpServers: {}, disallowedTools: [...BUILTIN_OFF, "WebSearch"], maxTurns: 1, ...this.envOpt(), systemPrompt: "按要求只输出 JSON。" } });
    for await (const m of q) { if (m.type === "result") { if (m.subtype === "success") out = m.result || ""; else throw new Error((m.result && String(m.result)) || m.subtype); } }
    return parseJson(out);
  }
  digest(text, filename) { return this.oneShot(digestPrompt(this.petName, text, filename)); }
  ask(question, docText) { return this.oneShot(askPrompt(this.petName, question, docText)); }
}
