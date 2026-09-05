import { fork } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

// 语音识别：本地 Whisper（transformers.js）。跑在单独的子进程里（Electron 当 Node 用），
// 原生模块出问题也只会死子进程，不会带崩主进程。
export class Stt {
  constructor({ store, dataDir, log = console.log, onProgress = () => {} }) {
    this.store = store; this.dataDir = dataDir; this.log = log; this.onProgress = onProgress;
    this.child = null; this.ready = null; this.seq = 0; this.waiting = new Map(); this.status = ""; this.loadedFor = "";
  }
  cfg() { const s = this.store.settings; return { model: s.sttModel || "Xenova/whisper-small", mirror: s.hfMirror || "https://hf-mirror.com", cacheDir: path.join(this.dataDir, "models") }; }
  // 优先用 Electron 自带的 Node；实在不行找系统里的 node
  runtime() {
    const cands = [];
    const home = os.homedir();
    try { const nvm = path.join(home, ".nvm/versions/node"); for (const v of fs.readdirSync(nvm).sort().reverse()) cands.push(path.join(nvm, v, "bin", "node")); } catch {}
    cands.push("/opt/homebrew/bin/node", "/usr/local/bin/node", "C:\\Program Files\\nodejs\\node.exe");
    const sys = cands.find(p => fs.existsSync(p));
    // Whisper 的原生模块在 Electron 自带的 Node 里会崩（SIGTRAP），有系统 Node 就优先用它
    if (sys && this.store.settings.sttUseSystemNode !== false) return { execPath: sys, env: {}, kind: "system" };
    return { execPath: process.execPath, env: { ELECTRON_RUN_AS_NODE: "1" }, kind: "electron" };
  }
  ensure() {
    const cfg = this.cfg(); const key = JSON.stringify(cfg);
    if (this.child && this.loadedFor === key) return this.ready;
    if (this.child) { try { this.child.kill(); } catch {} this.child = null; }
    this.loadedFor = key;
    const rt = this.runtime(); this.log("stt runtime:", rt.kind, rt.execPath);
    const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "stt-worker.js");
    const c = fork(script, [], { execPath: rt.execPath, env: { ...process.env, ...rt.env, MAOTUAN_STT: JSON.stringify(cfg) }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    this.child = c;
    c.stdout.on("data", d => this.log("[stt]", String(d).trim()));
    c.stderr.on("data", d => { const t = String(d).trim(); if (t && !/onnxruntime|warning/i.test(t)) this.log("[stt!]", t.slice(0, 300)); });
    this.ready = new Promise((resolve, reject) => {
      c.on("message", m => {
        if (m.type === "ready") { this.status = "就绪"; resolve(); }
        else if (m.type === "progress") { this.status = m.text; this.onProgress(m.text); }
        else if (m.type === "result") { const p = this.waiting.get(m.id); if (p) { this.waiting.delete(m.id); p.resolve(m.text); } }
        else if (m.type === "error") { if (m.id != null) { const p = this.waiting.get(m.id); if (p) { this.waiting.delete(m.id); p.reject(new Error(m.error)); } } else { this.status = "失败：" + m.error; reject(new Error(m.error)); } }
      });
      c.on("exit", (code, sig) => { this.child = null; const e = new Error("识别进程退出了 " + (sig || code) + (rt.kind === "electron" ? "。电脑上装一个 Node.js（nodejs.org）就能用语音输入" : "")); this.status = "失败：" + e.message; reject(e); for (const p of this.waiting.values()) p.reject(e); this.waiting.clear(); });
      c.on("error", e => { this.status = "失败：" + e.message; reject(e); });
    });
    this.ready.catch(() => {});
    return this.ready;
  }
  async transcribe(pcm) {
    await this.ensure();
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      // 走普通 JSON 通道（base64），父子进程不是同一个运行时也没关系
      this.child.send({ type: "transcribe", id, pcmB64: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength).toString("base64") });
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error("识别超时")); } }, 120000);
    });
  }
}
