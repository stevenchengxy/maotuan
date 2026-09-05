import fs from "node:fs";
import path from "node:path";
import { safeStorage } from "electron";

// 所有状态都在一个 JSON 里；密钥用系统钥匙串加密后再存
export class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, "state.json");
    fs.mkdirSync(dir, { recursive: true });
    this.data = {
      name: "毛毛",
      born: Date.now(),
      lastSeen: Date.now(),
      pets: 0,
      fed: 0,
      petPos: null,
      doc: null,
      settings: {
        brain: "claude",           // claude | codex
        model: "",
        codexModel: "",
        codexEffort: "low",
        skin: "fluff",
        petScale: 1,               // 它的大小 0.6 ~ 1.8
        hotkey: "Alt+Shift+M",
        watcherPort: 47831,
        mcp: [],
        sttModel: "Xenova/whisper-small",
        hfMirror: "https://hf-mirror.com",
        voice: "minimax",          // minimax | say
        minimaxHost: "https://api.minimax.io",
        minimaxGroupId: "",
        minimaxModel: "speech-2.8-hd",      // 聊天：短句用 HD，更自然
        readModel: "speech-2.8-turbo",      // 念长文：Turbo 便宜
        voiceId: "Chinese (Mandarin)_Cute_Spirit",
        speed: 1.0,
        pitch: 0,
        sayVoice: "Tingting",
        readWith: "minimax",      // 长文朗读用哪个：minimax | say
        muted: false,
        appleMusic: true,
        google: { enabled: false, clientId: "" },
        netease: { enabled: false, bin: "" },
        uvx: ""
      },
      secrets: {}
    };
    this.load();
  }
  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));
      this.data = deepMerge(this.data, raw);
    } catch {}
    this.migrate();
  }
  // 老版本的 google / netease 开关搬进通用的 mcp 列表
  migrate() {
    const s = this.data.settings; let changed = false;
    if (!Array.isArray(s.mcp)) { s.mcp = []; changed = true; }
    if (s.google && s.google.enabled && s.google.clientId && !s.mcp.some(m => m.preset === "google")) {
      s.mcp.push({ id: "google", preset: "google", name: "Google 日历 + Gmail", enabled: true, fields: { GOOGLE_OAUTH_CLIENT_ID: s.google.clientId, USER_GOOGLE_EMAIL: s.google.email || "" } });
      if (this.data.secrets.googleSecret) { this.data.secrets["mcp:google:GOOGLE_OAUTH_CLIENT_SECRET"] = this.data.secrets.googleSecret; }
      s.google.enabled = false; changed = true;
    }
    if (s.netease && s.netease.enabled && s.netease.bin && !s.mcp.some(m => m.preset === "netease")) {
      s.mcp.push({ id: "netease", preset: "netease", name: "网易云音乐", enabled: true, fields: { NETEASE_BIN: s.netease.bin } });
      s.netease.enabled = false; changed = true;
    }
    if (s.skin === "pixel") { s.skin = "blob"; changed = true; }
    if (changed) this.save();
  }
  save() {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    } catch (e) { console.error("store save failed", e); }
  }
  get(k) { return this.data[k]; }
  set(k, v) { this.data[k] = v; this.save(); }
  get settings() { return this.data.settings; }
  patchSettings(p) { this.data.settings = deepMerge(this.data.settings, p); this.save(); }

  setSecret(name, value) {
    this.data.hints = this.data.hints || {};
    if (!value) { delete this.data.secrets[name]; delete this.data.hints[name]; this.save(); return; }
    this.data.hints[name] = value.length > 8 ? value.slice(0, 6) + "…" + value.slice(-4) : "…" + value.slice(-2);
    if (safeStorage.isEncryptionAvailable()) {
      this.data.secrets[name] = "enc:" + safeStorage.encryptString(value).toString("base64");
    } else {
      this.data.secrets[name] = "raw:" + Buffer.from(value, "utf8").toString("base64");
    }
    this.save();
  }
  getSecret(name) {
    const v = this.data.secrets[name];
    if (!v) return "";
    try {
      if (v.startsWith("enc:")) return safeStorage.decryptString(Buffer.from(v.slice(4), "base64"));
      if (v.startsWith("raw:")) return Buffer.from(v.slice(4), "base64").toString("utf8");
    } catch {}
    return "";
  }
  hasSecret(name) { return !!this.data.secrets[name]; }
}

function deepMerge(base, patch) {
  if (Array.isArray(patch) || typeof patch !== "object" || patch === null) return patch;
  const out = { ...(base && typeof base === "object" ? base : {}) };
  for (const k of Object.keys(patch)) {
    out[k] = (typeof patch[k] === "object" && patch[k] !== null && !Array.isArray(patch[k]))
      ? deepMerge(out[k], patch[k]) : patch[k];
  }
  return out;
}
