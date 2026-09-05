// 本地 Whisper 冒烟测试：用 say 合成一句中文，喂给识别 worker
import { Worker } from "node:worker_threads";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const wav = "/tmp/maotuan-stt.wav";
execFileSync("say", ["-v", "Tingting", "-o", wav, "--file-format=WAVE", "--data-format=LEI16@16000", "今天天气真好，我们下午去公园散步吧。"]);
const buf = fs.readFileSync(wav);
let off = 12, data = null;
while (off < buf.length) { const id = buf.toString("ascii", off, off + 4); const sz = buf.readUInt32LE(off + 4); if (id === "data") { data = buf.subarray(off + 8, off + 8 + sz); break; } off += 8 + sz; }
const pcm = new Float32Array(data.length / 2); for (let i = 0; i < pcm.length; i++) pcm[i] = data.readInt16LE(i * 2) / 32768;
console.log("audio seconds:", (pcm.length / 16000).toFixed(1));
const w = new Worker(path.resolve("main/stt-worker.js"), { workerData: { model: process.argv[2] || "Xenova/whisper-small", mirror: "https://hf-mirror.com", cacheDir: path.join(process.env.HOME, "Library/Application Support/毛团/models") } });
const t0 = Date.now();
w.on("message", m => { if (m.type === "progress") console.log("  ", m.text); else if (m.type === "ready") { console.log("model ready in", ((Date.now() - t0) / 1000).toFixed(0), "s"); w.postMessage({ type: "transcribe", id: 1, pcm }, [pcm.buffer]); } else if (m.type === "result") { console.log("RESULT:", JSON.stringify(m.text), "in", ((Date.now() - t0) / 1000).toFixed(0), "s"); process.exit(0); } else if (m.type === "error") { console.log("ERROR:", m.error); process.exit(1); } });
w.on("error", e => { console.log("WORKER ERROR:", e.message); process.exit(1); });
setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 1500000);
