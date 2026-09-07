import fs from "node:fs";
import path from "node:path";
import { generateImage } from "./story.js";
import { HEROES } from "../renderer/skins/heroCatalog.js";

// 英雄的"真实版"形象：用主人自己的 MiniMax image-01 在本机生成（写实渲染风），
// 三张：待机 / 得意 / 沮丧。绿幕背景，渲染层再把绿抠掉。仓库和安装包里不含任何漫威素材。
const BASE = "hyper-realistic cinematic movie still, physically based rendering, detailed metallic and fabric textures, dramatic studio rim lighting, 8k, sharp focus, full body visible from head to toe with feet on the ground, centered, single character, plain solid bright {SCREEN} background with no floor, no reflections, no shadows on the background, no text, no watermark";
const SCREEN = { hero_hulk: "magenta (#FF00FF)", hero_loki: "magenta (#FF00FF)" };
const POSES = {
  idle: "standing in a confident heroic idle pose facing the camera, arms relaxed",
  win: "triumphant victory pose facing the camera, one fist raised high, energy glowing",
  lose: "disappointed pose facing the camera, head bowed, shoulders slumped"
};
const LOOK = {
  hero_iron: "a futuristic armored superhero in glossy red and gold metallic power armor with a glowing white-blue circular arc reactor on the chest and a sleek helmet with glowing eye slits, thruster ports on the palms and boots",
  hero_spider: "an athletic young superhero with a lean gymnast physique wearing the iconic bright red and royal blue spandex suit: the red areas covered with a fine black web-line pattern, a large black spider emblem on the chest, and a red full-head mask with black web lines and two large white teardrop-shaped eye lenses outlined in black (no visible skin, no helmet)",
  hero_hulk: "a massive muscular green-skinned giant man with dark hair, torn purple pants and an intense expression",
  hero_loki: "a strikingly handsome, elegant male trickster god in his late twenties with pale flawless skin, high sharp cheekbones, piercing green eyes, slicked-back jet-black shoulder-length hair and a knowing sly smile, wearing ornate dark green and gold Asgardian leather armor, a tall golden horned helmet and a flowing dark green cape, holding a golden scepter with a glowing blue gem",
  hero_thor: "a young, movie-star handsome thunder god, about 30 years old, with a clean strong jawline, bright blue eyes, long golden-blond hair, a short neatly trimmed beard and a confident calm expression, athletic muscular build, wearing sleek silver scale armor with a flowing red cape, holding a large square-headed war hammer crackling with lightning",
  hero_jarvis: "a floating holographic artificial intelligence core: a luminous translucent blue sphere wrapped in slowly rotating rings of light and tiny data glyphs, hovering in mid-air"
};
export class HeroArt {
  constructor({ store, dir, log = console.log, onProgress }) { this.store = store; this.dir = dir; this.log = log; this.onProgress = onProgress; this.jobs = new Map(); }
  file(id, pose) { return path.join(this.dir, id, pose + ".jpg"); }
  has(id, pose = "idle") { const f = this.file(id, pose); return fs.existsSync(f) && fs.statSync(f).size > 1000; }
  status() { return Object.fromEntries(Object.keys(HEROES).map(id => [id, this.has(id)])); }
  ensure(id, poses = ["idle", "win", "lose"]) {
    const key = id + ":" + poses.join(",");
    if (this.jobs.has(key)) return this.jobs.get(key);
    const job = this._ensure(id, poses).finally(() => this.jobs.delete(key));
    this.jobs.set(key, job); return job;
  }
  async _ensure(id, poses) {
    if (!HEROES[id]) throw new Error("没有这个英雄：" + id);
    if (!this.store.hasSecret("minimaxKey")) throw new Error("需要 MiniMax key 才能生成真实版形象（设置 → 声音 里填）");
    fs.mkdirSync(path.join(this.dir, id), { recursive: true });
    const report = (pct, note) => this.onProgress && this.onProgress({ id, pct, note });
    let i = 0; const done = [];
    for (const pose of poses) {
      if (!this.has(id, pose)) {
        report(Math.round(i / poses.length * 100), pose);
        const prompt = `${LOOK[id]}, ${POSES[pose] || POSES.idle}, ${BASE.replace("{SCREEN}", SCREEN[id] || "green (#00FF00)")}`;
        // 待机图先出；得意 / 沮丧参照待机图（subject_reference），脸和衣服才是同一个人
        let reference = null;
        if (pose !== "idle" && this.has(id, "idle")) reference = "data:image/jpeg;base64," + fs.readFileSync(this.file(id, "idle")).toString("base64");
        try { await generateImage(this.store, { prompt: reference ? "the same character as the reference image, " + prompt : prompt, aspect: "9:16", file: this.file(id, pose), reference }); this.log("[heroart] generated", id, pose, reference ? "(ref)" : ""); }
        catch (e) {
          this.log("[heroart] failed", id, pose, e.message);
          if (reference) { try { await generateImage(this.store, { prompt, aspect: "9:16", file: this.file(id, pose) }); this.log("[heroart] generated", id, pose, "(no ref)"); } catch (e2) { this.log("[heroart] failed again", id, pose, e2.message); } }
          if (pose === "idle" && !this.has(id, "idle")) throw e;
        }
      }
      i++; if (this.has(id, pose)) done.push(pose);
    }
    report(100, "ok");
    return { id, poses: done };
  }
}
