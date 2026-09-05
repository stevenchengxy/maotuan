// 断句：给 TTS 用，一句一句合成、一句一句念
export function splitSentences(text, max = 80) {
  const enders = "。！？；!?;…";
  const out = [];
  let buf = "";
  const src = String(text).replace(/\r/g, "").replace(/[ \t]+/g, " ");
  for (const ch of src) {
    if (ch === "\n") { if (buf.trim()) out.push(buf.trim()); buf = ""; continue; }
    buf += ch;
    if (enders.indexOf(ch) >= 0) { out.push(buf.trim()); buf = ""; continue; }
    if (buf.length >= max) {
      let cut = -1;
      for (let k = buf.length - 1; k > max * 0.5; k--) { if ("，,、：:—".indexOf(buf[k]) >= 0) { cut = k + 1; break; } }
      if (cut > 0) { out.push(buf.slice(0, cut).trim()); buf = buf.slice(cut); }
      else { out.push(buf.trim()); buf = ""; }
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(s => s.replace(/\s/g, "").length > 0);
}

// 长文取样：头 + 中 + 尾
export function excerpt(text, budget) {
  const t = String(text);
  if (t.length <= budget) return t;
  const head = Math.round(budget * 0.62), mid = Math.round(budget * 0.22), tail = budget - head - mid;
  const m0 = Math.floor(t.length / 2 - mid / 2);
  return t.slice(0, head) + "\n\n……（中间略去一大段）……\n\n" + t.slice(m0, m0 + mid) + "\n\n……（又略去一段）……\n\n" + t.slice(t.length - tail);
}

// 增量文本 → 整句：脑子边说边出字，攒够一句就交给声音
export class SentenceBuffer {
  constructor(onSentence) { this.buf = ""; this.onSentence = onSentence; }
  push(delta) {
    this.buf += delta;
    let idx;
    while ((idx = findEnder(this.buf)) >= 0) {
      const s = this.buf.slice(0, idx + 1).trim();
      this.buf = this.buf.slice(idx + 1);
      if (s) this.onSentence(s);
    }
    if (this.buf.length > 120) {          // 太长没标点也先出去
      const s = this.buf.trim(); this.buf = "";
      if (s) this.onSentence(s);
    }
  }
  flush() { const s = this.buf.trim(); this.buf = ""; if (s) this.onSentence(s); }
}
function findEnder(s) {
  for (let i = 0; i < s.length; i++) if ("。！？；!?…\n".indexOf(s[i]) >= 0) {
    // "……" 连着的省略号一起吃掉
    let j = i; while (j + 1 < s.length && s[j + 1] === s[i]) j++;
    return j;
  }
  return -1;
}

// 把脑子话里的语气标记摘出来：【开心】你好呀 → {emotion:"happy", text:"你好呀"}
const EMO = { "开心": "happy", "高兴": "happy", "难过": "sad", "伤心": "sad", "生气": "angry", "害怕": "fearful", "惊讶": "surprised", "平静": "calm", "温柔": "calm" };
export function stripEmotion(s) {
  const m = s.match(/^[【\[]([^】\]]{1,3})[】\]]\s*/);
  if (m && EMO[m[1]]) return { emotion: EMO[m[1]], text: s.slice(m[0].length) };
  return { emotion: "", text: s };
}
