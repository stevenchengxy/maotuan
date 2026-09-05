import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// 唱歌：脑子写一小段歌词，MiniMax 音乐模型（music-3.0-free 免费）合成带人声的小歌
export class Singer {
  constructor({ store, dataDir, brain, log = console.log }) {
    this.store = store; this.dir = path.join(dataDir, "songs"); fs.mkdirSync(this.dir, { recursive: true }); this.brain = brain; this.log = log;
  }
  async writeLyrics(theme) {
    const name = this.store.get("name") || "毛毛";
    const j = await this.brain.oneShot([
      `你是「${name}」，一只住在桌面上的小宠物。主人想听你唱一首关于「${theme}」的小歌。`,
      "写一首很短的儿歌风格的小歌：两段主歌各 2 到 4 行、一段副歌 2 到 4 行，每行 6 到 12 个字，口语、押韵、有画面、别说教。可以在副歌里唱到自己的名字。",
      '只输出 JSON，不要代码块：{"title":"歌名，6字以内","style":"用一句话描述曲风和情绪，比如 轻快的儿歌，温暖，木吉他，可爱的女声","lyrics":"[Verse]\\n第一行\\n第二行\\n[Chorus]\\n第一行\\n第二行\\n[Verse]\\n..."}'
    ].join("\n"));
    if (!j || !j.lyrics) throw new Error("脑子没写出歌词");
    return { title: j.title || theme, style: j.style || "轻快的儿歌，温暖，可爱", lyrics: String(j.lyrics).replace(/\\n/g, "\n") };
  }
  async generate({ title, style, lyrics }) {
    const key = this.store.getSecret("minimaxKey"); if (!key) throw new Error("没有 MiniMax key");
    const s = this.store.settings;
    const id = crypto.createHash("sha1").update(style + lyrics).digest("hex").slice(0, 12);
    const file = path.join(this.dir, id + ".mp3");
    if (fs.existsSync(file)) return { file, title, lyrics };
    const hosts = [(s.minimaxHost || "https://api.minimaxi.com").replace(/\/+$/, ""), "https://api.minimax.cn", "https://api.minimaxi.com", "https://api.minimax.io"];
    const models = [s.musicModel || "music-3.0-free", "music-3.0", "music-2.6-free"];
    let lastErr = "";
    for (const host of [...new Set(hosts)]) for (const model of models) {
      try {
        const res = await fetch(host + "/v1/music_generation" + (s.minimaxGroupId ? "?GroupId=" + encodeURIComponent(s.minimaxGroupId) : ""), {
          method: "POST", headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: style, lyrics, stream: false, output_format: "hex", audio_setting: { sample_rate: 44100, bitrate: 128000, format: "mp3" } }),
          signal: AbortSignal.timeout(180000)
        });
        const j = await res.json().catch(() => ({}));
        const code = j && j.base_resp ? j.base_resp.status_code : res.status;
        if (code !== 0) { lastErr = `${model}@${host.replace("https://", "")}: ${j.base_resp ? j.base_resp.status_code + " " + j.base_resp.status_msg : "HTTP " + res.status}`; this.log("sing", lastErr); if (code === 1004 || res.status === 404) break; continue; }
        const hex = j.data && j.data.audio; if (!hex) { lastErr = "没拿到音频"; continue; }
        fs.writeFileSync(file, Buffer.from(hex, "hex"));
        fs.writeFileSync(file.replace(/\.mp3$/, ".json"), JSON.stringify({ id, title, style, lyrics, model, host, at: Date.now() }, null, 2));
        return { file, title, lyrics, model };
      } catch (e) { lastErr = e.message; }
    }
    throw new Error("唱不出来：" + lastErr);
  }
}
