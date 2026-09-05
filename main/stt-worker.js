// 语音识别子进程：加载 Whisper，收 PCM，回文字。既能当 worker_thread 也能当 child_process。
import fs from "node:fs";
let port, workerCfg;
try { const wt = await import("node:worker_threads"); if (!wt.isMainThread && wt.parentPort) { port = { post: m => wt.parentPort.postMessage(m), on: fn => wt.parentPort.on("message", fn) }; workerCfg = wt.workerData; } } catch {}
if (!port) { port = { post: m => process.send && process.send(m), on: fn => process.on("message", fn) }; workerCfg = JSON.parse(process.env.MAOTUAN_STT || "{}"); }

let transcriber = null, t2s = null;
async function toSimplified(text) {
  try { if (!t2s) { const m = await import("opencc-js"); t2s = m.Converter({ from: "tw", to: "cn" }); } return t2s(text); } catch { return text; }
}
async function load() {
  const { pipeline, env } = await import("@huggingface/transformers");
  fs.mkdirSync(workerCfg.cacheDir, { recursive: true });
  env.cacheDir = workerCfg.cacheDir; env.allowLocalModels = false;
  if (workerCfg.mirror) env.remoteHost = workerCfg.mirror;
  let lastPct = -1;
  transcriber = await pipeline("automatic-speech-recognition", workerCfg.model, {
    dtype: "q8", device: "cpu",
    progress_callback: p => {
      if (p.status === "progress" && p.file) { const pct = Math.round(p.progress || 0); if (pct !== lastPct && pct % 5 === 0) { lastPct = pct; port.post({ type: "progress", text: `下载模型 ${p.file.split("/").pop()} ${pct}%` }); } }
      else if (p.status === "done") port.post({ type: "progress", text: `模型 ${p.file ? p.file.split("/").pop() : ""} 好了` });
    }
  });
  port.post({ type: "ready" });
}
load().catch(e => port.post({ type: "error", error: e.message || String(e) }));
port.on(async m => {
  if (!m || m.type !== "transcribe") return;
  try {
    if (!transcriber) throw new Error("模型还没好");
    let audio;
    if (m.pcmB64) { const b = Buffer.from(m.pcmB64, "base64"); audio = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
    else audio = m.pcm instanceof Float32Array ? m.pcm : new Float32Array(m.pcm);
    const out = await transcriber(audio, { language: "chinese", task: "transcribe", chunk_length_s: 30, stride_length_s: 5, return_timestamps: false });
    let text = ((out && out.text) || "").trim().replace(/,/g, "，");
    text = await toSimplified(text);
    port.post({ type: "result", id: m.id, text });
  } catch (e) { port.post({ type: "error", id: m.id, error: e.message || String(e) }); }
});
