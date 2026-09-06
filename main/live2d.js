import fs from "node:fs";
import path from "node:path";
import { L2D_MODELS, L2D_BASES, L2D_CORE_URL } from "../renderer/skins/live2dCatalog.js";

// 把 Live2D 官方示例模型请到本机来：读 model3.json，把它引用的每个文件都下下来，放到 userData/live2d/<角色>/。
// 顺便把 motion 里自带的日语配音（Sound）去掉——声音归毛团自己管。
const BAD = /(^|[\\/])\.\.([\\/]|$)|^[\\/]|^[a-zA-Z]:/;
export class Live2D {
  constructor({ dir, log = console.log, onProgress }) {
    this.dir = dir; this.log = log; this.onProgress = onProgress; this.jobs = new Map(); this.bases = [...L2D_BASES];
  }
  corePath() { return path.join(this.dir, "core", "live2dcubismcore.min.js"); }
  isReady(id) { const m = L2D_MODELS[id]; return !!m && fs.existsSync(path.join(this.dir, m.dir, ".complete")) && fs.existsSync(this.corePath()); }
  status() { return Object.fromEntries(Object.keys(L2D_MODELS).map(id => [id, this.isReady(id)])); }

  async fetchBuf(url, onBytes) {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 90000);
    try {
      const r = await fetch(url, { signal: ac.signal, headers: { "User-Agent": "maotuan-live2d" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const total = Number(r.headers.get("content-length")) || 0; const reader = r.body.getReader(); const chunks = []; let got = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(Buffer.from(value)); got += value.length; onBytes && onBytes(got, total); }
      return Buffer.concat(chunks);
    } finally { clearTimeout(t); }
  }
  // 官方 GitHub 和 jsDelivr 镜像轮着试；哪个先成功以后就先用哪个
  async fetchAny(rel, onBytes) {
    let err;
    for (const b of this.bases) {
      try { const buf = await this.fetchBuf(b + rel, onBytes); if (this.bases[0] !== b) this.bases = [b, ...this.bases.filter(x => x !== b)]; return buf; }
      catch (e) { err = e; this.log("[live2d] fetch failed", b + rel, e.message); }
    }
    throw err || new Error("download failed");
  }
  async ensureCore(report) {
    const p = this.corePath();
    if (fs.existsSync(p) && fs.statSync(p).size > 10000) return p;
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const buf = await this.fetchBuf(L2D_CORE_URL, (got, total) => report && report(total ? got / total * 10 : 3, "引擎"));
    if (buf.length < 10000 || !buf.toString("utf8", 0, 4000).includes("Live2DCubismCore")) throw new Error("Cubism Core 下载不完整");
    fs.writeFileSync(p, buf);
    return p;
  }
  ensure(id) {
    if (this.jobs.has(id)) return this.jobs.get(id);
    const job = this._ensure(id).finally(() => this.jobs.delete(id));
    this.jobs.set(id, job);
    return job;
  }
  async _ensure(id) {
    const m = L2D_MODELS[id]; if (!m) throw new Error("没有这个角色：" + id);
    const dir = path.join(this.dir, m.dir); const file = m.file || m.dir + ".model3.json"; const done = path.join(dir, ".complete");
    const report = (pct, note) => this.onProgress && this.onProgress({ id, pct: Math.max(0, Math.min(100, Math.round(pct))), note });
    if (!this.isReady(id)) {
      fs.mkdirSync(dir, { recursive: true });
      report(0, "引擎");
      await this.ensureCore(report);
      const rel = m.dir + "/";
      const json = JSON.parse((await this.fetchAny(rel + file)).toString("utf8"));
      const fr = json.FileReferences || {}; const files = new Set();
      for (const k of ["Moc", "Physics", "Pose", "DisplayInfo", "UserData"]) if (fr[k]) files.add(fr[k]);
      for (const t of fr.Textures || []) files.add(t);
      for (const e of fr.Expressions || []) if (e.File) files.add(e.File);
      for (const g of Object.values(fr.Motions || {})) for (const mo of g) { if (mo.File) files.add(mo.File); delete mo.Sound; }
      const list = [...files]; let i = 0;
      for (const f of list) {
        if (BAD.test(f)) throw new Error("模型文件名不对劲：" + f);
        const dest = path.join(dir, f);
        if (!(fs.existsSync(dest) && fs.statSync(dest).size > 0)) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          const buf = await this.fetchAny(rel + f, (got, total) => report(10 + (i + (total ? got / total : 0)) / list.length * 90, f));
          fs.writeFileSync(dest, buf);
        }
        i++; report(10 + i / list.length * 90, f);
      }
      fs.writeFileSync(path.join(dir, file), JSON.stringify(json));
      fs.writeFileSync(done, new Date().toISOString());
      this.log("[live2d] ready:", m.dir, list.length, "files");
    }
    report(100, "ok");
    return { id, dir: m.dir, file };
  }
}
