import fs from "node:fs";
import path from "node:path";
import { generateImage } from "./story.js";
import { CHARS, CHAR_FRAMES, framePrompt, sheetPrompt, SHEET } from "../renderer/skins/charCatalog.js";

// 抠图只认纯色幕布。模型偶尔会自作主张画个背景（水彩、纸纹、白墙），那张就没法用——
// 画完先量一圈边框够不够纯，不够就重画，最多三次。
async function screenIsClean(file, magenta) {
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");   // 用得着才加载，加载不上就不拦
    const im = await loadImage(file);
    const c = createCanvas(im.width, im.height), x = c.getContext("2d");
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, im.width, im.height).data;
    const at = (px, py) => { const i = (py * im.width + px) * 4;
      return magenta ? Math.min(d[i], d[i + 2]) - d[i + 1] : d[i + 1] - Math.max(d[i], d[i + 2]); };
    const pts = [], m = 2;
    for (let k = 0; k < 40; k++) {
      const fx = Math.round((im.width - 1) * k / 39), fy = Math.round((im.height - 1) * k / 39);
      pts.push(at(fx, m), at(fx, im.height - 1 - m), at(m, fy), at(im.width - 1 - m, fy));
    }
    const clean = pts.filter(v => v > 40).length / pts.length;
    return { ok: clean > 0.85, green: clean };
  } catch (e) { return { ok: true, green: -1 };  }   // 量不了就别拦着
}

// 把一张四格表情表切成四张。每格再往里收一点，免得带上邻格的边。
async function sliceSheet(file, outFiles) {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const im = await loadImage(file);
  const cw = im.width / SHEET.cols, ch = im.height / SHEET.rows;
  const c = createCanvas(Math.round(cw), Math.round(ch)), x = c.getContext("2d");
  for (let i = 0; i < SHEET.order.length; i++) {
    const col = i % SHEET.cols, row = Math.floor(i / SHEET.cols);
    x.clearRect(0, 0, c.width, c.height);
    x.drawImage(im, col * cw, row * ch, cw, ch, 0, 0, c.width, c.height);
    fs.writeFileSync(outFiles[SHEET.order[i]], c.toBuffer("image/jpeg", 92));
  }
}

// 「画出来的角色」：用主人自己的 MiniMax image-01 在本机画四张脸（平时 / 闭眼 / 开心 / 难过），
// 第一张画完之后，后面三张都参照它（subject_reference），保证是同一个角色、同一个姿势。
// 幕布用纯色，渲染层再抠掉。仓库和安装包里不含任何图片。
export class CharArt {
  constructor({ store, dir, log = console.log, onProgress }) {
    this.store = store; this.dir = dir; this.log = log; this.onProgress = onProgress; this.jobs = new Map();
  }
  file(id, frame) { return path.join(this.dir, id, frame + ".jpg"); }
  has(id, frame = "idle") { const f = this.file(id, frame); return fs.existsSync(f) && fs.statSync(f).size > 1000; }
  status() { return Object.fromEntries(Object.keys(CHARS).map(id => [id, CHAR_FRAMES.filter(f => this.has(id, f)).length])); }

  ensure(id, frames = CHAR_FRAMES) {
    const key = id + ":" + frames.join(",");
    if (this.jobs.has(key)) return this.jobs.get(key);
    const job = this._ensure(id, frames).finally(() => this.jobs.delete(key));
    this.jobs.set(key, job); return job;
  }
  async _ensure(id, frames) {
    if (!CHARS[id]) throw new Error("没有这个角色：" + id);
    if (!this.store.hasSecret("minimaxKey")) throw new Error("要先在设置里填 MiniMax key，它才画得出来");
    fs.mkdirSync(path.join(this.dir, id), { recursive: true });
    const report = (pct, note) => this.onProgress && this.onProgress({ id, pct, note });
    // 一张四格表情表，切成四张脸——同一张图里的四格必然是同一个角色、同一种画风
    if (frames.length === CHAR_FRAMES.length && !CHAR_FRAMES.some(f => this.has(id, f))) {
      const sheet = path.join(this.dir, id, "sheet.jpg");
      const out = Object.fromEntries(CHAR_FRAMES.map(f => [f, this.file(id, f)]));
      const magenta = /magenta/i.test(CHARS[id].screen || "");
      for (let tryN = 1; tryN <= 3; tryN++) {
        report(Math.round(tryN * 20), "表情表");
        try {
          const hint = tryN === 1 ? "" : " Last try drew a background: use flat solid green everywhere except the character.";
          await generateImage(this.store, { prompt: sheetPrompt(id) + hint, aspect: "1:1", file: sheet });
          const g = await screenIsClean(sheet, magenta);
          if (!g.ok) { this.log("[charart] 表情表幕布不干净，重画", id, Math.round(g.green * 100) + "%", "第" + tryN + "次"); continue; }
          await sliceSheet(sheet, out);
          fs.rmSync(sheet, { force: true });
          this.log("[charart] 画好", id, "（一张四格表情表切开）");
          report(100, "好了");
          return { id, frames: CHAR_FRAMES.filter(f => this.has(id, f)) };
        } catch (e) { this.log("[charart] 表情表没画成", id, e.message); }
      }
      fs.rmSync(sheet, { force: true });
      this.log("[charart] 表情表不行，改成一张一张画", id);
    }
    // 兜底：一张一张画，后三张参照第一张
    const order = ["idle", ...frames.filter(f => f !== "idle")];
    const done = []; let i = 0;
    for (const frame of order) {
      if (!this.has(id, frame)) {
        report(Math.round(i / order.length * 100), frame);
        let reference = null;
        if (frame !== "idle" && this.has(id, "idle")) reference = "data:image/jpeg;base64," + fs.readFileSync(this.file(id, "idle")).toString("base64");
        const prompt = (reference ? "the exact same character as the reference image, same outfit, same pose, same art style, " : "") + framePrompt(id, frame);
        let err = null;
        for (let tryN = 1; tryN <= 3; tryN++) {
          const screen = CHARS[id].screen || "green (#00FF00)";
          const hint = tryN === 1 ? "" : ` IMPORTANT: the previous attempt drew a background. Replace it completely with flat solid ${screen} covering every pixel that is not the character.`;
          try {
            await generateImage(this.store, { prompt: prompt + hint, aspect: "3:4", file: this.file(id, frame), reference });
            const g = await screenIsClean(this.file(id, frame), /magenta/i.test(CHARS[id].screen || ""));
            if (g.ok) { this.log("[charart] 画好", id, frame, reference ? "(参照)" : ""); err = null; break; }
            this.log("[charart] 幕布不干净，重画", id, frame, "绿边", Math.round(g.green * 100) + "%", "第" + tryN + "次");
            fs.rmSync(this.file(id, frame), { force: true });
            err = new Error("幕布抠不干净");
          } catch (e) { err = e; this.log("[charart] 没画成", id, frame, e.message); }
        }
        if (err && frame === "idle") throw err;   // 第一张都画不出来就别继续了
      }
      i++; if (this.has(id, frame)) done.push(frame);
      report(Math.round(i / order.length * 100), frame);
    }
    return { id, frames: done };
  }
}
