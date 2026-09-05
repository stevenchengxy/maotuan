import { fork } from "node:child_process"; import fs from "node:fs"; import path from "node:path";
const wav = "/tmp/maotuan-stt.wav"; const buf = fs.readFileSync(wav); let off = 12, data = null;
while (off < buf.length) { const id = buf.toString("ascii", off, off + 4); const sz = buf.readUInt32LE(off + 4); if (id === "data") { data = buf.subarray(off + 8, off + 8 + sz); break; } off += 8 + sz; }
const pcm = new Float32Array(data.length / 2); for (let i = 0; i < pcm.length; i++) pcm[i] = data.readInt16LE(i * 2) / 32768;
const execPath = process.argv[2]; const env = { ...process.env, MAOTUAN_STT: JSON.stringify({ model: "Xenova/whisper-small", mirror: "https://hf-mirror.com", cacheDir: path.join(process.env.HOME, "Library/Application Support/毛团/models") }) };
if (execPath.includes("Electron")) env.ELECTRON_RUN_AS_NODE = "1";
const t0 = Date.now();
const c = fork(path.resolve("main/stt-worker.js"), [], { execPath, env, stdio: ["ignore", "pipe", "pipe", "ipc"] });
c.stderr.on("data", d => process.stdout.write("[stderr] " + String(d).slice(0, 200)));
c.on("message", m => { if (m.type === "ready") { console.log("ready", ((Date.now() - t0) / 1000).toFixed(1), "s"); c.send({ type: "transcribe", id: 1, pcmB64: Buffer.from(pcm.buffer).toString("base64") }); } else if (m.type === "result") { console.log("RESULT:", m.text, ((Date.now() - t0) / 1000).toFixed(1), "s"); c.kill(); process.exit(0); } else if (m.type === "error") { console.log("ERROR:", m.error); c.kill(); process.exit(1); } });
c.on("exit", (code, sig) => { console.log("child exit", code, sig); });
setTimeout(() => { console.log("TIMEOUT"); c.kill(); process.exit(2); }, 240000);
