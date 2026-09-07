import { makeSkin, SKINS } from "./skins/index.js";

const stage = document.getElementById("stage");
const bubble = document.getElementById("bubble");
const btext = document.getElementById("btext");
const fxc = document.getElementById("fx"), fx = fxc.getContext("2d");
const hud = document.getElementById("hud");
// 舞台（它站的那块）固定是"本体尺寸"，窗口可以比它大（打游戏时当作场地）
let base = { w: window.innerWidth, h: window.innerHeight };
function layout() {
  stage.style.width = base.w + "px"; stage.style.height = base.h + "px";
  bubble.style.top = "auto";
  bubble.style.bottom = (base.h + 2) + "px";   // 严格待在舞台上方，绝不压到它
  btext.style.maxHeight = bubbleRoom() + "px";
  fluff && fluff.resize && fluff.resize();
}
// 把窗口坐标换成舞台坐标
const toStage = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const ICON = new URLSearchParams(location.search).has("icon");
const ICON_SKIN = new URLSearchParams(location.search).get("skin");
if (ICON) bubble.style.display = "none";
// 在普通浏览器里打开 pet.html 也能看（没有 Electron 桥就用个空壳），方便调皮肤
const mt = window.mt || { send() {}, invoke: async () => ({}), on() {}, pathFor: () => "" };
const pick = a => a[Math.floor(Math.random() * a.length)];

let state = { name: "毛毛", pets: 0, settings: { skin: "fluff" } };
let skinId = ICON_SKIN || "fluff";
let fluff = makeSkin(skinId, stage, { icon: ICON });
function useSkin(id) {
  if (!SKINS[id] || id === skinId) return;
  const mood = fluff.S.mood, talking = fluff.S.talking;
  fluff.destroy(); skinId = id;
  fluff = makeSkin(id, stage, { icon: ICON });
  fluff.setMood(mood); fluff.S.talking = talking;
  fluff.spawn("heart", 3);
}

/* ---------- 气泡 ---------- */
let hideT = null, typeT = null;
// 气泡最多占它头顶那一小块：超出的字截掉，露出「点开看全文」，点开在聊天窗里看
const BUBBLE_MAX = 48;
// 窗口顶上那条是气泡的地盘（主进程按 BUBBLE_H0 预留），气泡贴着舞台顶边往上长，永远压不到它
function bubbleRoom() { return Math.max(30, Math.round(window.innerHeight - base.h - 26)); }
function setBubbleText(t) {
  btext.textContent = t;
  markClipped();
}
// 放不下就把字砍到刚好放得下，末尾接「点开看全文」——按真实高度二分，任何尺寸都不会切字或压住脸
function markClipped() {
  const m0 = btext.querySelector(".more"); if (m0) m0.remove();
  if (btext.scrollHeight <= btext.clientHeight + 1) return;
  const full = btext.textContent;
  const more = document.createElement("span"); more.className = "more"; more.textContent = "…点开看全文";
  const fits = n => { btext.textContent = full.slice(0, n); btext.append(more); return btext.scrollHeight <= btext.clientHeight + 1; };
  let lo = 0, hi = full.length;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (fits(mid)) lo = mid; else hi = mid - 1; }
  fits(lo);
}
function showBubble(text, { hold = false, type = true, tail = false } = {}) {
  clearTimeout(hideT); clearTimeout(typeT);
  text = String(text || "").trim();
  if (!text) { hideBubble(); return; }
  bubble.classList.remove("hide"); bubble.classList.add("show");
  btext.style.maxHeight = bubbleRoom() + "px";
  const long = text.length > BUBBLE_MAX;
  // 太长的话：说完了露开头，正在说的时候露结尾（像字幕）
  const shown = long ? (tail ? "……" + text.slice(-BUBBLE_MAX) : text.slice(0, BUBBLE_MAX)) : text;
  if (type && !long) { let i = 0; btext.textContent = ""; (function step() { btext.textContent = shown.slice(0, ++i); if (i < shown.length) typeT = setTimeout(step, 28); else { markClipped(); if (!hold) scheduleHide(shown); } })(); }
  else { setBubbleText(shown); if (!hold) scheduleHide(shown); }
}
bubble.addEventListener("click", () => { if (fluff.S.talking || humming) mt.send("voice:stopNow"); else mt.send("pet:click"); });
function scheduleHide(text) { clearTimeout(hideT); hideT = setTimeout(hideBubble, 3500 + Math.min(9000, text.length * 90)); }
function hideBubble() { bubble.classList.remove("show"); bubble.classList.add("hide"); }

/* ---------- 长消息：一句一句往外冒，不堆成一大坨 ---------- */
let sayQ = [], sayTimer = null, queueBusy = false, queueEnded = false;
function queueSay(t) {
  t = String(t || "").trim(); if (!t) return;
  if (!queueBusy) queueEnded = false;
  sayQ.push(t);
  if (!queueBusy) pumpSay();
}
function pumpSay() {
  clearTimeout(sayTimer);
  const s = sayQ.shift();
  if (!s) { queueBusy = false; return; }
  queueBusy = true;
  showBubble(s, { type: true, hold: true });
  // 一句停多久：够读完，但别拖太久
  const dur = Math.max(1500, Math.min(6500, 700 + s.length * 150));
  sayTimer = setTimeout(() => {
    if (sayQ.length) return pumpSay();
    queueBusy = false;
    if (queueEnded || true) scheduleHide(s);
  }, dur);
}
function clearSayQueue() { sayQ.length = 0; queueBusy = false; queueEnded = false; clearTimeout(sayTimer); }

/* ---------- 声音回放：嘴跟着声音动 ---------- */
const actx = new (window.AudioContext || window.webkitAudioContext)();
let current = null;
const analyserBuf = new Uint8Array(256);
async function playAudio({ id, data, format }) {
  try {
    const bin = atob(data); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const audio = await actx.decodeAudioData(bytes.buffer);
    if (actx.state === "suspended") await actx.resume();
    const src = actx.createBufferSource(); src.buffer = audio;
    const an = actx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.5;
    src.connect(an); an.connect(actx.destination);
    current = { id, src, an };
    src.onended = () => { if (current && current.id === id) { current = null; fluff.setMouth(0); } mt.send("voice:ended", { id }); };
    src.start();
  } catch (e) { console.error("play failed", e); mt.send("voice:ended", { id }); }
}
(function mouthTick() {
  if (current) { current.an.getByteTimeDomainData(analyserBuf); let sum = 0; for (let i = 0; i < analyserBuf.length; i++) { const v = (analyserBuf[i] - 128) / 128; sum += v * v; } fluff.setMouth(Math.min(1, Math.sqrt(sum / analyserBuf.length) * 6)); }
  requestAnimationFrame(mouthTick);
})();

/* ---------- 来自主进程 ---------- */
mt.on("state", s => { state = s; if (s.petBase && (s.petBase.w !== base.w || s.petBase.h !== base.h)) { base = { w: s.petBase.w, h: s.petBase.h }; layout(); } if (s.settings && s.settings.skin) useSkin(s.settings.skin); });
mt.on("pet:arena", ({ on }) => { arena = !!on; hud.style.display = on ? "block" : "none"; if (!on) { game = null; fxItems = []; hud.textContent = ""; } setTimeout(layout, 50); });
window.addEventListener("resize", () => setTimeout(layout, 20));
mt.on("pet:say", ({ text }) => { sayQ.length = 0; queueBusy = false; clearTimeout(sayTimer); showBubble(text, { type: true }); });
mt.on("pet:sentence", ({ text }) => queueSay(text));
mt.on("pet:sentenceEnd", () => { queueEnded = true; });
mt.on("pet:stream", ({ text, hold }) => showBubble(text, { type: false, hold: !!hold, tail: true }));
mt.on("pet:mood", ({ mood }) => fluff.setMood(mood));
mt.on("pet:talking", ({ talking }) => { fluff.S.talking = talking; if (!talking) { fluff.setMouth(0); if (bubble.classList.contains("show")) scheduleHide(bubble.textContent); } });
mt.on("pet:pet", () => { fluff.poke(); happyFor(1500); showBubble(pick(PET_LINES)); mt.send("pet:petted"); });
mt.on("pet:back", ({ mins }) => { fluff.setMood("happy"); fluff.spawn("heart", 2); showBubble(backLine(mins)); setTimeout(() => { if (fluff.S.mood === "happy") fluff.setMood("idle"); }, 3000); });
mt.on("pet:land", ({ k }) => { fluff.land(k || 1); });
mt.on("pet:react", ({ ev, ctx }) => react(ev, ctx || {}));
// 场景反应：换样子、主人回来、发呆、在想、跑完了、吃文件、深夜、在听你说话
const SCENE_FALLBACK = {
  "scene:greet": "你好呀，我在这儿。", "scene:back": "你回来啦。", "scene:bored": "……有点无聊。",
  "scene:think": "让我想想。", "scene:done": "跑完啦，快来看！", "scene:feed": "嚼嚼嚼……",
  "scene:night": "很晚了哦，早点睡。", "scene:listen": "嗯，我在听。"
};
mt.on("pet:scene", ({ ev }) => {
  if (!ev) return;
  const c = fluff.character || null;
  const played = react(ev);
  const lines = c && c.sceneLines && c.sceneLines[ev];
  const line = Array.isArray(lines) ? pick(lines) : (typeof lines === "string" ? lines : null);
  if (ev === "scene:think" || ev === "scene:listen") { if (!played) fluff.setMood("thinking"); return; }   // 这两个不打扰，只做动作
  if (line || SCENE_FALLBACK[ev]) showBubble(line || SCENE_FALLBACK[ev], { type: true });
});
mt.on("pet:whoami", () => mt.send("pet:whoami", { skin: skinId }));   // 开发用 / 主进程触发角色反应
mt.on("pet:agent", ({ text }) => { fluff.S.hop = 1.0001; fluff.setMood("happy"); fluff.spawn("heart", 4); showBubble(text, { type: true }); setTimeout(() => { if (fluff.S.mood === "happy") fluff.setMood("idle"); }, 4000); });
mt.on("voice:play", playAudio);

/* ---------- 哼唱：桌面上起一段小旋律（五声音阶，随机走） ---------- */
let humming = false, humTimer = null, humNodes = [];
function startHum(tempo = 96) {
  stopHum(); humming = true;
  const beat = 60 / tempo; const scale = [0, 2, 4, 7, 9, 12, 14]; const base = 261.63;
  const master = actx.createGain(); master.gain.value = 0.06; master.connect(actx.destination); humNodes.push(master);
  let step = 0, deg = 2, t0 = actx.currentTime + 0.1;
  const tick = () => {
    if (!humming) return;
    const now = actx.currentTime;
    while (t0 < now + 0.6) {
      deg = Math.max(0, Math.min(scale.length - 1, deg + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      const f = base * Math.pow(2, scale[deg] / 12);
      const o = actx.createOscillator(); o.type = "triangle"; o.frequency.value = f;
      const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + beat * 0.9);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + beat); humNodes.push(o, g);
      if (step % 4 === 0) { const b = actx.createOscillator(); b.type = "sine"; b.frequency.value = base / 2 * Math.pow(2, scale[[0, 4, 3, 4][Math.floor(step / 4) % 4]] / 12); const bg = actx.createGain(); bg.gain.setValueAtTime(0.0001, t0); bg.gain.exponentialRampToValueAtTime(0.9, t0 + 0.02); bg.gain.exponentialRampToValueAtTime(0.0001, t0 + beat * 1.6); b.connect(bg); bg.connect(master); b.start(t0); b.stop(t0 + beat * 2); humNodes.push(b, bg); }
      if (step % 2 === 0 && Math.random() < 0.5) fluff.spawn("note", 1);
      t0 += beat; step++;
    }
    humTimer = setTimeout(tick, 250);
  };
  if (actx.state === "suspended") actx.resume();
  tick();
}
function stopHum() { humming = false; clearTimeout(humTimer); for (const n of humNodes) { try { n.stop && n.stop(); } catch {} try { n.disconnect(); } catch {} } humNodes = []; }
mt.on("pet:hum", ({ on, tempo }) => { if (on) { fluff.setMood("happy"); startHum(tempo); } else { stopHum(); } });
mt.on("voice:stop", () => { clearSayQueue(); if (current) { try { current.src.onended = null; current.src.stop(); } catch {} current = null; } fluff.setMouth(0); });
mt.on("voice:pause", () => actx.suspend());
mt.on("voice:resume", () => actx.resume());

/* ---------- 鼠标：悬停=摸，按住拖=抱走，甩出去=扔，点一下=聊天，双击=转圈，右键=菜单 ---------- */
let over = false, down = null, dragged = false, lastPetSend = 0, strokeAcc = 0, lastMove = null;
const trail = [];   // 最近几次移动，用来算甩出去的速度
stage.addEventListener("pointermove", e => {
  const { x, y } = toStage(e);
  const br = bubble.classList.contains("show") ? bubble.getBoundingClientRect() : null;
  const onBubble = !!(br && e.clientX >= br.left && e.clientX <= br.right && e.clientY >= br.top && e.clientY <= br.bottom + 8);
  const h = fluff.hit(x, y) || onBubble || (arena && !!game);
  if (h !== over) { over = h; mt.send("pet:hit", { over }); }
  if (onBubble && !fluff.hit(x, y)) { lastMove = null; return; }
  const g = fluff.geometry();
  fluff.S.lookTarget.x = Math.max(-1, Math.min(1, (x - g.cx) / (g.R * 2.2)));
  fluff.S.lookTarget.y = Math.max(-1, Math.min(1, (y - g.cy) / (g.R * 2.2)));
  if (down) {
    const dx = e.screenX - down.sx, dy = e.screenY - down.sy;
    if (!dragged && Math.hypot(dx, dy) > 5) { dragged = true; fluff.S.carried = true; fluff.setMood("happy"); showBubble(pick(["哎、哎——", "抱我去哪儿？", "腿悬空了！"])); }
    if (dragged) {
      mt.send("pet:drag", { dx: e.screenX - down.lx, dy: e.screenY - down.ly });
      down.lx = e.screenX; down.ly = e.screenY;
      trail.push({ x: e.screenX, y: e.screenY, t: performance.now() }); while (trail.length > 6) trail.shift();
    }
    return;
  }
  if (h) {
    if (lastMove) strokeAcc += Math.hypot(x - lastMove.x, y - lastMove.y);
    lastMove = { x, y };
    fluff.petAt(x, y);
    if (strokeAcc > 90) {
      strokeAcc = 0;
      const now = performance.now();
      if (now - lastPetSend > 700) { lastPetSend = now; mt.send("pet:petted"); happyFor(1200); if (Math.random() < 0.5 && !fluff.S.talking) showBubble(pick(PET_LINES)); }
    }
  } else lastMove = null;
});
stage.addEventListener("pointerleave", () => { if (over) { over = false; mt.send("pet:hit", { over: false }); } fluff.S.lookTarget.x = 0; fluff.S.lookTarget.y = 0; lastMove = null; });
stage.addEventListener("pointerdown", e => {
  if (e.button === 2) return;
  if (game) return;                      // 打游戏的时候别抱它
  const sp = toStage(e); if (!fluff.hit(sp.x, sp.y)) return;
  stage.setPointerCapture(e.pointerId);
  down = { sx: e.screenX, sy: e.screenY, lx: e.screenX, ly: e.screenY, t: performance.now() };
  dragged = false; trail.length = 0;
});
function release() {
  if (!down) return;
  const wasDrag = dragged; down = null; dragged = false;
  if (wasDrag) {
    fluff.S.carried = false;
    // 甩出去的速度：看最后 100ms 的位移
    const now = performance.now(); const old = trail.find(p => now - p.t < 120) || trail[0];
    const last = trail[trail.length - 1];
    if (old && last && last !== old) {
      const dt = Math.max(0.016, (last.t - old.t) / 1000);
      const vx = (last.x - old.x) / dt, vy = (last.y - old.y) / dt;
      if (Math.hypot(vx, vy) > 900) { react("throw"); mt.send("pet:throw", { vx, vy }); showBubble(pick(["哇——！", "飞、飞起来了！", "呜哇！"])); return; }
    }
    mt.send("pet:dragend"); fluff.land(0.5);
    setTimeout(() => { if (fluff.S.mood === "happy") fluff.setMood("idle"); }, 800);
  } else {
    clickN++;
    if (fluff.S.talking || humming) { mt.send("voice:stopNow"); showBubble(pick(["好吧，不说了。", "……闭嘴。", "嗯，我安静。"]), { type: true }); }
    else tapOnce(clickN);
    clearTimeout(burstT);
    burstT = setTimeout(() => { const n = clickN; clickN = 0; endBurst(n); }, 380);
  }
}
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
window.addEventListener("blur", () => { if (down) release(); });
stage.addEventListener("contextmenu", e => { e.preventDefault(); const sp = toStage(e); if (fluff.hit(sp.x, sp.y)) mt.send("pet:menu"); });

/* ---------- 点它：只互动，不直接开窗。开聊天窗＝右键菜单 / 快捷键 / 连点 N 下（设置里定） ---------- */
let clickN = 0, burstT = null, tapSeq = 0, manyUntil = 0;
const TAP_LINES = ["嗯？", "你点我啦。", "在的在的。", "怎么啦？", "我在听。"];
function tapOnce(n) {
  // 连点的大反应演完之前，再点只轻轻弹一下，不然会卡在暴走里出不来
  if (performance.now() < manyUntil) { fluff.S.squash = 1.12; mt.send("pet:petted"); return; }
  const c = fluff.character || null;
  const taps = (c && c.taps) || [];
  const lines = (c && c.tapLines && c.tapLines.length ? c.tapLines : TAP_LINES);
  if (n >= 5) {
    if (!react("tap:many")) { fluff.spin(); fluff.spawn("sweat", 2); }
    manyUntil = performance.now() + 3500;
    showBubble((c && c.manyLine) || "别、别戳了！", { type: false });
  } else {
    if (!(taps.length && react("tap:" + (tapSeq++ % taps.length)))) fluff.poke();
    if (n === 1 || Math.random() < 0.45) showBubble(pick(lines), { type: false });
  }
  happyFor(1200);
  mt.send("pet:petted");
}
function endBurst(n) {
  const want = Number((state.settings && state.settings.clicksToChat) || 0);
  if (want >= 2 && n >= want) { mt.send("pet:click"); return; }
  if (n === 2 && want !== 2) { fluff.spin(); showBubble(pick(["转圈圈！", "晕了晕了。", "再来一次！"])); }
}

let happyT = null;
function happyFor(ms) {
  if (fluff.S.mood === "reading" || fluff.S.mood === "thinking") return;
  fluff.setMood("happy"); clearTimeout(happyT);
  happyT = setTimeout(() => { if (fluff.S.mood === "happy") fluff.setMood("idle"); }, ms);
}

const PET_LINES = ["唔……", "再摸一下。", "这里，这里最舒服。", "（发出了很小的声音）", "毛都被你摸乱了。", "好啦好啦，我知道你在。"];
function backLine(mins) {
  const SHORT = ["你不在的时候，我数了一遍身上的毛，数到 {n} 就忘了。", "刚才有一粒灰尘飘过去，我追了它很久。", "我练习了滚，滚了 {n} 圈，有点晕。", "我趴在这儿等你，把自己压扁了一点点。", "我盯着屏幕右上角看了很久，那里什么都没有。"];
  const MID = ["我睡着了一会儿。梦见一大团毛，比我还大。", "我等了 {m} 分钟。中间打了两个哈欠，都很小。", "刚刚我在想，你在忙什么呢。想不出来，就继续等了。"];
  const LONG = ["你去了好久好久。我把等你的时间都数完了。", "我睡了一大觉，醒来发现你还没回来，就又睡了一觉。", "{h} 个小时。我一直在这儿，一直在。"];
  const s = mins < 12 ? pick(SHORT) : mins < 120 ? pick(MID) : pick(LONG);
  return "你回来啦。" + s.replace("{n}", String(20 + Math.floor(Math.random() * 80))).replace("{m}", String(Math.max(1, mins))).replace("{h}", String(Math.max(1, Math.round(mins / 60))));
}
setInterval(() => {
  if (fluff.S.talking || fluff.S.mood !== "idle" || bubble.classList.contains("show")) return;
  if (Math.random() < 0.25) showBubble(pick(["我在。", "你忙你的，我看着你。", "有东西要给我吃吗？纸上的字也行。", "这里安安静静的，挺好。", "等你的时候我不无聊，真的。"]));
}, 60000);

/* ---------- 桌面上的小游戏：猜拳、骰子、接豆子 ---------- */
let arena = false, game = null, fxItems = [];
const HANDS = ["✊", "✋", "✌️"], HN = ["石头", "布", "剪刀"];
function stageCenter() { const r = stage.getBoundingClientRect(); const g = fluff.geometry(); return { x: r.left + g.cx, y: r.top + g.cy, R: g.R, ground: r.top + g.cy + g.R * 0.95 }; }
function pop(text, x, y, { size = 44, life = 2.4, delay = 0, rise = 0 } = {}) { fxItems.push({ type: "pop", text, x, y, size, life, t: -delay, rise }); }
function hopPet() { fluff.S.hop = 1.0001; }
// 有反应表的皮肤（Live2D 角色、英雄）自己决定怎么庆祝 / 怎么沮丧；没有的走下面的通用动作
function react(ev, c) { if (typeof fluff.react !== "function") return false; try { return fluff.react(ev, c) !== false; } catch (e) { console.warn("react", ev, e); return false; } }
function lineFor(game, key, vars) { const t = fluff.lines && fluff.lines[game] && fluff.lines[game][key]; return t ? t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") : null; }
function toStageXY(x, y) { const r = stage.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; }

// 猜拳：喊三声、蹦三下、两只手弹出来、看结果
function playRps({ me, it, result }) {
  const c = stageCenter();
  const words = ["石头", "剪刀", "布"];
  words.forEach((w, i) => setTimeout(() => { hopPet(); showBubble(w + (i === 2 ? "！" : "、"), { type: false, hold: true }); }, i * 420));
  setTimeout(() => {
    pop(HANDS[me], c.x - c.R * 1.7, c.y - c.R * 0.3, { size: 52 });
    pop(HANDS[it], c.x + c.R * 1.7, c.y - c.R * 0.3, { size: 52 });
    pop("VS", c.x, c.y - c.R * 1.5, { size: 20, life: 1.6 });
    react("rps:reveal");
  }, 1300);
  setTimeout(() => {
    const mine = result === "win" ? "lose" : result === "lose" ? "win" : "tie";   // 从它自己的角度看
    const text = lineFor("rps", mine, { it: HN[it], me: HN[me] }) || (mine === "lose" ? `我出${HN[it]}……你赢了。哼，再来。` : mine === "win" ? `我出${HN[it]}，我赢啦！` : `我也出${HN[it]}，平了！`);
    if (mine === "win") fluff.setMood("happy"); else if (mine === "lose") fluff.setMood("thinking");
    if (!react("rps:" + mine)) {
      if (mine === "lose") { fluff.land(0.8); pop("😖", c.x, c.y - c.R * 1.6, { size: 34, life: 2 }); }
      else if (mine === "win") { hopPet(); fluff.spawn("heart", 6); pop("🎉", c.x, c.y - c.R * 1.6, { size: 34, life: 2 }); }
      else { fluff.spin(); pop("=", c.x, c.y - c.R * 1.6, { size: 30, life: 1.6 }); }
    }
    showBubble(text, { type: true });
    setTimeout(() => { fluff.setMood("idle"); mt.send("game:over", { game: "rps", me, it, result, text }); }, 2200);
  }, 2400);
}

// 骰子：它把骰子甩出去，骰子翻着跟头落地弹两下；你的点数在左边弹出来
function playDice({ me, it }) {
  const c = stageCenter();
  hopPet(); react("dice:start"); showBubble("看我的！", { type: false, hold: true });
  pop(String(me), c.x - c.R * 1.9, c.y - c.R * 0.2, { size: 40, life: 4.5, delay: 0.3 });
  fxItems.push({ type: "die", x: c.x + c.R * 0.6, y: c.y - c.R * 0.6, vx: 190, vy: -260, rot: 0, vrot: 14, face: 1 + Math.floor(Math.random() * 6), final: it, ground: c.ground - 4, bounces: 0, t: 0, done: false, size: Math.max(26, c.R * 0.42) });
}
function finishDice(d) {
  const win = d.me > d.it, tie = d.me === d.it;
  const mine = tie ? "tie" : win ? "lose" : "win";
  const text = lineFor("dice", mine, { it: d.it, me: d.me }) || (tie ? `都是 ${d.it} 点，平了！` : win ? `我 ${d.it} 点，你 ${d.me} 点……你赢了。` : `我 ${d.it} 点，你 ${d.me} 点，我赢啦！`);
  if (mine === "win") fluff.setMood("happy"); else if (mine === "lose") fluff.setMood("thinking");
  if (!react("dice:" + mine)) {
    if (tie) fluff.spin(); else if (win) fluff.land(0.8); else { hopPet(); fluff.spawn("heart", 5); }
  }
  showBubble(text, { type: true });
  setTimeout(() => { fluff.setMood("idle"); mt.send("game:over", { game: "dice", me: d.me, it: d.it, result: tie ? "tie" : win ? "win" : "lose", text }); }, 2200);
}

// 接豆子：豆子从上面掉下来，你用鼠标挪它手里的小篮子
function startCatch() {
  const c = stageCenter();
  game = { kind: "catch", score: 0, miss: 0, t: 0, end: 30, spawn: 0, items: [], bx: c.x, by: c.ground - 6, last: performance.now() };
  fluff.setMood("happy"); react("catch:start"); showBubble("来了来了！", { type: false });
  hud.style.display = "block";
}
function catchTick(dt, now) {
  const g = game, W = window.innerWidth, H = window.innerHeight; const c = stageCenter();
  g.t += dt; g.spawn -= dt; g.by = c.ground - 6;
  if (g.spawn <= 0) { g.spawn = Math.max(0.35, 0.95 - g.t * 0.015); g.items.push({ x: 24 + Math.random() * (W - 48), y: -12, v: 110 + Math.random() * 60 + g.t * 3, e: ["🍬", "🍪", "🍓", "🍡", "🧀", "🥕"][Math.floor(Math.random() * 6)] }); }
  for (const it of g.items) it.y += it.v * dt;
  for (const it of g.items) { if (!it.done && Math.abs(it.x - g.bx) < 30 && Math.abs(it.y - g.by) < 18) { it.done = true; g.score++; react("catch:get", toStageXY(it.x, it.y)); if (g.score % 5 === 0 && !react("catch:five")) { hopPet(); fluff.spawn("heart", 2); } pop("+1", it.x, it.y - 10, { size: 16, life: 0.8, rise: 30 }); } }
  g.items = g.items.filter(it => { if (it.done) return false; if (it.y > H + 10) { g.miss++; fluff.S.pet.amt = 0.3; react("catch:miss"); return false; } return true; });
  hud.textContent = `接到 ${g.score}　漏了 ${g.miss}/3　${Math.max(0, Math.ceil(g.end - g.t))}s`;
  // 画
  fx.font = "24px -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji'"; fx.textAlign = "center"; fx.textBaseline = "middle";
  for (const it of g.items) fx.fillText(it.e, it.x, it.y);
  fx.font = "40px -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji'"; fx.fillText("🧺", g.bx, g.by + 6);
  if (g.miss >= 3 || g.t >= g.end) {
    const sc = g.score; game = null; hud.style.display = "none";
    const tier = sc >= 25 ? "great" : sc >= 12 ? "ok" : "bad";
    if (tier === "great") fluff.setMood("happy"); else if (tier === "bad") fluff.setMood("thinking");
    if (!react("catch:" + tier)) { if (tier === "great") { hopPet(); fluff.spawn("heart", 8); } else if (tier === "bad") fluff.land(0.6); }
    const text = lineFor("catch", tier, { n: sc }) || (tier === "great" ? `${sc} 个！你手好快，我看花眼了。` : tier === "ok" ? `接到 ${sc} 个，不错不错，分我一个？` : `才 ${sc} 个……没关系，再来一局。`);
    showBubble(text, { type: true });
    setTimeout(() => { fluff.setMood("idle"); mt.send("game:over", { game: "catch", score: sc, text }); }, 2400);
  }
}
document.addEventListener("pointermove", e => { if (game && game.kind === "catch") game.bx = Math.max(24, Math.min(window.innerWidth - 24, e.clientX)); });
window.addEventListener("keydown", e => { if (game && game.kind === "catch") { if (e.key === "ArrowLeft") game.bx = Math.max(24, game.bx - 30); if (e.key === "ArrowRight") game.bx = Math.min(window.innerWidth - 24, game.bx + 30); } });

let fxLast = performance.now();
(function fxLoop(now) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (fxc.width !== Math.round(window.innerWidth * dpr) || fxc.height !== Math.round(window.innerHeight * dpr)) { fxc.width = Math.round(window.innerWidth * dpr); fxc.height = Math.round(window.innerHeight * dpr); }
  fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const dt = Math.min(0.05, (now - fxLast) / 1000); fxLast = now;
  if (game && game.kind === "catch") catchTick(dt, now);
  for (const it of fxItems) {
    it.t += dt; if (it.t < 0) continue;
    if (it.type === "pop") {
      const k = Math.min(1, it.t / 0.25), sc = k < 1 ? 1.25 - 0.25 * Math.cos(k * Math.PI) * -1 : 1; const fade = it.life - it.t < 0.4 ? Math.max(0, (it.life - it.t) / 0.4) : 1;
      fx.save(); fx.globalAlpha = fade; fx.translate(it.x, it.y - (it.rise ? it.t * it.rise : 0)); fx.scale(k < 1 ? 0.6 + 0.4 * k * (1.3 - 0.3 * k) : 1, k < 1 ? 0.6 + 0.4 * k * (1.3 - 0.3 * k) : 1);
      fx.font = `700 ${it.size}px -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'PingFang SC'`; fx.textAlign = "center"; fx.textBaseline = "middle"; fx.fillStyle = "#33303A"; fx.fillText(it.text, 0, 0); fx.restore();
    } else if (it.type === "die") {
      if (!it.done) {
        it.vy += 900 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vrot * dt;
        if (Math.floor(it.t * 12) !== Math.floor((it.t - dt) * 12)) it.face = 1 + Math.floor(Math.random() * 6);
        if (it.y >= it.ground) { it.y = it.ground; it.bounces++; it.vy = -it.vy * 0.45; it.vx *= 0.7; it.vrot *= 0.5; if (Math.abs(it.vy) < 60 || it.bounces >= 3) { it.done = true; it.vy = 0; it.vx = 0; it.rot = 0; it.face = it.final; it.t = 0; hopPet(); pop(String(it.final), it.x, it.y - it.size * 1.2, { size: 30, life: 3 }); setTimeout(() => finishDice({ me: Number(fxItems.find(p => p.type === "pop" && p.size === 40)?.text || 0), it: it.final }), 900); } }
        if (it.x > window.innerWidth - it.size) { it.x = window.innerWidth - it.size; it.vx = -it.vx * 0.5; }
      } else { it.life = it.life ?? 5; if (it.t > 4.6) it.dead = true; }
      // 画骰子
      fx.save(); fx.translate(it.x, it.y - it.size / 2); fx.rotate(it.rot); const sz = it.size;
      fx.fillStyle = "#FFFDF8"; fx.strokeStyle = "#8C8494"; fx.lineWidth = 2; fx.beginPath(); fx.roundRect(-sz / 2, -sz / 2, sz, sz, sz * 0.2); fx.fill(); fx.stroke();
      fx.fillStyle = "#AF5164"; const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[it.face];
      for (const [px, py] of pips) { fx.beginPath(); fx.arc(px * sz * 0.26, py * sz * 0.26, sz * 0.085, 0, Math.PI * 2); fx.fill(); }
      fx.restore();
    }
  }
  fxItems = fxItems.filter(it => !it.dead && (it.type !== "pop" || it.t < it.life));
  requestAnimationFrame(fxLoop);
})(fxLast);

mt.on("pet:game", d => {
  if (d.game === "rps") playRps(d);
  else if (d.game === "dice") playDice(d);
  else if (d.game === "catch") startCatch();
  else if (d.game === "stop") { game = null; fxItems = []; hud.style.display = "none"; fluff.setMood("idle"); }
});

layout();
if (!ICON) mt.send("pet:ready");
window.__pet = { useSkin, get skin() { return fluff; }, say: showBubble };
