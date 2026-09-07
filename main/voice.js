import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { splitSentences, stripEmotion } from "./text.js";
import { L2D_MODELS } from "../renderer/skins/live2dCatalog.js";

// 声音：MiniMax 合成，本地 say 兜底；一句一句排队念，边合成下一句边放这一句
export class Voice {
  constructor({ store, dataDir, player, log = console.log }) {
    this.store = store;
    this.cacheDir = path.join(dataDir, "voice-cache");
    fs.mkdirSync(this.cacheDir, { recursive: true });
    this.player = player;      // { play(buffer, format) => Promise, stop(), pause(), resume() }
    this.log = log;
    this.queue = [];
    this.running = false;
    this.gen = 0;
    this.paused = false;
    this.onState = () => {};   // ({talking, item})
  }

  // 二次元角色 / 英雄各有自己的音色（设置里可以关掉，都用主人挑的那个）
  charVoice() {
    const s = this.store.settings;
    if (s.charVoice === false) return null;
    const c = L2D_MODELS[s.skin];
    return c && c.voice && c.voice.id ? c.voice : null;
  }
  provider(kind = "chat") {
    const s = this.store.settings;
    const want = kind === "read" ? s.readWith : s.voice;
    if (want === "minimax" && this.store.hasSecret("minimaxKey")) return "minimax";
    return "say";
  }

  // ---------- 合成 ----------
  async synth(text, { emotion = "", provider, kind = "chat", voiceId, model } = {}) {
    provider = provider || this.provider(kind);
    const s = this.store.settings;
    model = model || (kind === "read" ? (s.readModel || s.minimaxModel) : s.minimaxModel);
    const c = provider === "minimax" && !voiceId ? this.charVoice() : null;
    if (c && !this._loggedChar) { this._loggedChar = true; this.log("[voice] character voice", c.id, "speed", c.speed || 1, "pitch", c.pitch || 0); }
    voiceId = voiceId || (c && c.id) || s.voiceId;
    const speed = (Number(s.speed) || 1) * ((c && c.speed) || 1), pitch = Math.round((Number(s.pitch) || 0) + ((c && c.pitch) || 0));
    if (!emotion && c && c.emotion) emotion = c.emotion;
    const key = crypto.createHash("sha1").update([provider, model, voiceId, speed, pitch, s.sayVoice, emotion, text].join("|")).digest("hex");
    const ext = provider === "minimax" ? "mp3" : "wav";
    const file = path.join(this.cacheDir, key + "." + ext);
    if (fs.existsSync(file)) return { buffer: fs.readFileSync(file), format: ext };
    let buffer;
    if (provider === "minimax") {
      try { buffer = await this.minimax(text, emotion, { model, voiceId, speed, pitch }); }
      catch (e) { this.log("minimax failed, falling back to say:", e.message); this.lastError = e.message; return this.synth(text, { provider: "say" }); }
    } else {
      buffer = await this.say(text);
    }
    try { fs.writeFileSync(file, buffer); } catch {}
    return { buffer, format: ext };
  }

  async minimax(text, emotion, { model, voiceId, speed, pitch } = {}) {
    const s = this.store.settings;
    const key = this.store.getSecret("minimaxKey");
    if (!key) throw new Error("no key");
    const host = (s.minimaxHost || "https://api.minimax.io").replace(/\/+$/, "");
    const url = host + "/v1/t2a_v2" + (s.minimaxGroupId ? "?GroupId=" + encodeURIComponent(s.minimaxGroupId) : "");
    const body = {
      model: model || s.minimaxModel || "speech-2.8-turbo",
      text,
      stream: false,
      output_format: "hex",
      language_boost: "Chinese",
      voice_setting: { voice_id: voiceId || s.voiceId, speed: speed || Number(s.speed) || 1, vol: 1, pitch: Math.round(pitch ?? (Number(s.pitch) || 0)), ...(emotion ? { emotion } : {}) },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 }
    };
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 30000);
    let res;
    try {
      res = await fetch(url, { method: "POST", headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ac.signal });
    } finally { clearTimeout(t); }
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    const code = j && j.base_resp && j.base_resp.status_code;
    if (code !== 0) throw new Error("minimax " + code + " " + (j.base_resp && j.base_resp.status_msg));
    const hex = j && j.data && j.data.audio;
    if (!hex) throw new Error("no audio");
    return Buffer.from(hex, "hex");
  }

  // 用存好的 key 去两个站点各敲一下，看哪个认
  async probeHosts() {
    const key = this.store.getSecret("minimaxKey");
    if (!key) return { error: "还没保存 key" };
    const out = {};
    for (const host of ["https://api.minimax.io", "https://api.minimaxi.com"]) {
      try {
        const gid = this.store.settings.minimaxGroupId;
        const res = await fetch(host + "/v1/get_voice" + (gid ? "?GroupId=" + encodeURIComponent(gid) : ""), { method: "POST", headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ voice_type: "system" }), signal: AbortSignal.timeout(15000) });
        const j = await res.json().catch(() => ({}));
        const code = j && j.base_resp ? j.base_resp.status_code : res.status;
        out[host] = code === 0 ? { ok: true, count: (j.system_voice || []).length } : { ok: false, error: (j.base_resp && (j.base_resp.status_code + " " + j.base_resp.status_msg)) || ("HTTP " + res.status) };
      } catch (e) { out[host] = { ok: false, error: e.message }; }
    }
    const good = Object.keys(out).find(h => out[h].ok);
    if (good && good !== this.store.settings.minimaxHost) { this.store.patchSettings({ minimaxHost: good }); this.lastError = ""; }
    return { hosts: out, picked: good || "" };
  }

  async listMinimaxVoices() {
    const s = this.store.settings;
    const key = this.store.getSecret("minimaxKey");
    if (!key) throw new Error("no key");
    const host = (s.minimaxHost || "https://api.minimax.io").replace(/\/+$/, "");
    const url = host + "/v1/get_voice" + (s.minimaxGroupId ? "?GroupId=" + encodeURIComponent(s.minimaxGroupId) : "");
    const res = await fetch(url, { method: "POST", headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ voice_type: "all" }) });
    const j = await res.json();
    if (!j || !j.base_resp || j.base_resp.status_code !== 0) throw new Error("minimax " + (j && j.base_resp && j.base_resp.status_msg));
    const out = [];
    for (const v of j.system_voice || []) out.push({ id: v.voice_id, name: v.voice_name || v.voice_id, desc: (v.description || []).join(" "), kind: "system" });
    for (const v of j.voice_cloning || []) out.push({ id: v.voice_id, name: v.voice_id, desc: (v.description || []).join(" "), kind: "clone" });
    for (const v of j.voice_generation || []) out.push({ id: v.voice_id, name: v.voice_id, desc: (v.description || []).join(" "), kind: "designed" });
    return out;
  }

  say(text) {
    if (process.platform === "win32") return this.winSay(text);
    const s = this.store.settings;
    return new Promise((resolve, reject) => {
      const tmpTxt = path.join(os.tmpdir(), "maotuan-say-" + process.pid + "-" + Date.now() + ".txt");
      const tmpWav = tmpTxt.replace(/\.txt$/, ".wav");
      fs.writeFileSync(tmpTxt, text);
      const args = ["-f", tmpTxt, "-o", tmpWav, "--file-format=WAVE", "--data-format=LEI16@22050"];
      if (s.sayVoice) args.unshift("-v", s.sayVoice);
      execFile("say", args, { timeout: 60000 }, (err) => {
        try { fs.unlinkSync(tmpTxt); } catch {}
        if (err) return reject(new Error("say: " + err.message));
        try { const b = fs.readFileSync(tmpWav); fs.unlinkSync(tmpWav); resolve(b); } catch (e) { reject(e); }
      });
    });
  }

  // Windows：用系统自带的 System.Speech，挑一个中文音色
  winSay(text) {
    return new Promise((resolve, reject) => {
      const tmpTxt = path.join(os.tmpdir(), "maotuan-say-" + process.pid + "-" + Date.now() + ".txt");
      const tmpWav = tmpTxt.replace(/\.txt$/, ".wav");
      fs.writeFileSync(tmpTxt, text, "utf8");
      const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'zh*' } | Select-Object -First 1; if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }; $s.SetOutputToWaveFile('${tmpWav.replace(/'/g, "''")}'); $s.Speak([IO.File]::ReadAllText('${tmpTxt.replace(/'/g, "''")}', [Text.Encoding]::UTF8)); $s.Dispose()`;
      execFile("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { timeout: 60000, windowsHide: true }, (err) => {
        try { fs.unlinkSync(tmpTxt); } catch {}
        if (err) return reject(new Error("powershell tts: " + err.message));
        try { const b = fs.readFileSync(tmpWav); fs.unlinkSync(tmpWav); resolve(b); } catch (e) { reject(e); }
      });
    });
  }

  listSayVoices() {
    if (process.platform !== "darwin") return Promise.resolve([]);
    return new Promise((resolve) => {
      execFile("say", ["-v", "?"], { timeout: 10000 }, (err, out) => {
        if (err) return resolve([]);
        const list = [];
        for (const line of String(out).split("\n")) {
          const m = line.match(/^(.+?)\s{2,}(\S+)\s+#/);
          if (m && /^zh/i.test(m[2])) list.push({ id: m[1].trim(), name: m[1].trim(), lang: m[2] });
        }
        resolve(list);
      });
    });
  }

  // ---------- 排队念 ----------
  enqueue(text, { emotion = "", provider, meta, voiceId, model } = {}) {
    const e = stripEmotion(text);
    const item = { text: e.text, emotion: emotion || e.emotion, provider, meta, gen: this.gen, kind: meta && meta.read ? "read" : "chat", voiceId, model };
    if (!item.text.trim()) return;
    this.queue.push(item);
    this.pump();
  }
  speak(text, opts = {}) {
    for (const s of splitSentences(text, 80)) this.enqueue(s, opts);
  }
  async pump() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const item = this.queue.shift();
        if (item.gen !== this.gen) continue;
        if (this.store.settings.muted) { this.onState({ talking: false, item, skipped: true }); continue; }
        const opt = it => ({ emotion: it.emotion, provider: it.provider, kind: it.kind, voiceId: it.voiceId, model: it.model });
        item.audio = item.audio || this.synth(item.text, opt(item));
        const next = this.queue[0];
        if (next && next.gen === this.gen && !next.audio) next.audio = this.synth(next.text, opt(next)).catch(() => null);
        let audio = null;
        try { audio = await item.audio; } catch (e) { this.log("synth failed:", e.message); }
        if (item.gen !== this.gen) continue;
        if (!audio) continue;
        this.onState({ talking: true, item });
        await this.player.play(audio.buffer, audio.format);
        this.onState({ talking: false, item });
      }
    } finally {
      this.running = false;
    }
  }
  stop() { this.gen++; this.queue = []; this.paused = false; this.player.stop(); this.onState({ talking: false }); }
  pause() { this.paused = true; this.player.pause(); }
  resume() { this.paused = false; this.player.resume(); }
  get idle() { return !this.running && this.queue.length === 0; }
}
