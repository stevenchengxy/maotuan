import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";

// names.js / tapTables.js 里都还没有 orb，所以整份资料先放在皮肤自己身上：
// 名字、口气、点它的反应、台词、音色。等哪天 tapTables.js 补上 orb，withTaps 会盖掉这里。
const SELF = {
  name: "小澈",
  style: "冷静、精准、有礼貌，短句，先给结论，偶尔报一句自己的状态。",
  taps: [
    {
      note: "应答：核心亮一下，脚下一圈波纹扩开，然后礼貌地转过来看你",
      actions: [
        { squash: 0.55, fx: [["glow", { at: "chest", color: "#7FD9FF", r: 50, dur: 0.6 }], ["ring", { at: "feet", color: "#9FE0FF", width: 2, r0: 8, r1: 70, dur: 0.55 }]] },
        { delay: 220, look: [-0.5, 0.1], fx: [["burst", "spark", 3, { at: "head", colors: ["#EAFBFF", "#7FD9FF"], speed: 55, lift: 28, gravity: 60, size: 0.8 }]] },
        { delay: 320, look: [0, 0], mood: "happy" }
      ]
    },
    {
      note: "扫描你：外面展开一圈 HUD，环转快、球心暗下去，扫完报一句「已记录」",
      actions: [
        { mood: "thinking", fx: [["hud", { at: "chest", color: "#7FD9FF", r: 62, dur: 1.1 }]] },
        { delay: 300, look: [0.55, -0.35], fx: [["burst", "dot", 3, { at: "headR", colors: ["#7FD9FF", "#BDEBFF"], speed: 35, lift: 26, gravity: -10, size: 0.7 }]] },
        { delay: 420, look: [0, 0], mood: "happy", fx: [["text", "已记录", { at: "headR", color: "#7FD9FF", size: 18, dur: 0.9, rise: 24 }]] }
      ]
    },
    {
      note: "轨道张开：三圈环一起转开一圈，光点顺着环飘上去，最后亮着定住",
      actions: [
        { spin: 1, squash: 0.45, fx: [["ring", { at: "chest", color: "#BDEBFF", width: 3, r0: 12, r1: 86, dur: 0.6 }], ["rise", "sparkle", 4, { colors: ["#EAFBFF", "#7FD9FF"], speed: 0.9, spread: 20, stagger: 0.06, size: 0.8 }]] },
        { delay: 340, mood: "happy", fx: [["burst", "star", 2, { at: "above", colors: ["#BDEBFF", "#FFFFFF"], speed: 40, lift: 34, size: 0.8 }]] }
      ]
    },
    {
      note: "低功耗：光环一圈圈收进球心，整颗暗下去打了个盹，再自己重新点亮",
      actions: [
        { mood: "sleepy", fx: [["ring", { at: "chest", color: "#5C9DFF", width: 2, r0: 64, r1: 10, dur: 0.5 }]] },
        { delay: 400, fx: [["burst", "zzz", 2, { at: "headR", colors: ["#9FC4E8"], speed: 26, lift: 34, gravity: -14, size: 0.9 }]] },
        { delay: 420, mood: "idle", fx: [["glow", { at: "chest", color: "#7FD9FF", r: 46, dur: 0.6 }], ["flash", { color: "#DFF4FF", alpha: 0.12, dur: 0.16 }]] }
      ]
    }
  ],
  tapLines: ["在的，请讲", "指令已收到", "核心运转正常", "我一直亮着呢", "轻一点，我在悬停", "这一次已经记下了"],
  manyTap: {
    note: "输入过载：火花炸开、白光一闪、整颗抖一下，环乱转着自检，校准完才重新稳住",
    actions: [
      { squash: 0.6, fx: [["shake", { amp: 4, dur: 0.45 }], ["burst", "spark", 8, { at: "chest", colors: ["#BDEBFF", "#7FD9FF", "#FFFFFF"], speed: 120, lift: 50, gravity: 80, spread: 18 }], ["flash", { color: "#DFF4FF", alpha: 0.16, dur: 0.2 }]] },
      { delay: 220, spin: 1, mood: "thinking", fx: [["ring", { at: "chest", color: "#5C9DFF", width: 3, r0: 14, r1: 110, dur: 0.8 }], ["hud", { at: "chest", color: "#7FD9FF", r: 70, dur: 1.2 }]] },
      { delay: 460, fx: [["burst", "dot", 4, { at: "above", colors: ["#7FD9FF"], speed: 40, lift: 22, size: 0.7 }]] },
      { delay: 520, mood: "happy", look: [0, 0], fx: [["glow", { at: "chest", color: "#BDEBFF", r: 64, dur: 0.9 }]] }
    ]
  },
  manyLine: "过载了，我重新校准一下",
  voice: { id: "Chinese (Mandarin)_Gentleman", speed: 0.96, pitch: -1 }
};
const DEF = { ...SELF, ...withTaps(SKIN_DEFAULTS.orb, "orb") };

// 光球：悬在半空的全息 AI 核心。
// 半透明的蓝球 + 三圈倾斜的轨道环 + 呼吸似的球心；脸只有两道竖光柱（眼睛）和一条声波（嘴）。
// 没有身体也没有腿，地上留一小圈投影表示它是浮着的。

const NSEG = 40;                       // 每圈环的折线段数
// 三圈轨道环：a 半径倍数，inc 倾角（越大越扁），roll 画面里的倾斜，spd 自转快慢，bk/bph 环上小光点跑得多快、从哪儿起步
const RINGS = [
  { a: 1.30, inc: 1.16, roll: -0.34, spd: 1.00, bk: 2.6, bph: 0.0, w: 0.048, c: "#7FD9FF", bead: "#EAFBFF" },
  { a: 1.56, inc: 1.36, roll: 0.56, spd: -0.66, bk: -2.0, bph: 2.1, w: 0.034, c: "#5C9DFF", bead: "#BDEBFF" },
  { a: 1.08, inc: 0.94, roll: 0.28, spd: 1.45, bk: 3.4, bph: 4.2, w: 0.026, c: "#BDEBFF", bead: "#FFFFFF" }
];
// 顶点 / 基向量缓存：每帧每圈只算一次，画正面那趟直接复用。
// 挂在实例自己的 S.extra 上（不是模块级的）——设置页的小图标和桌面上的本体会同时活着，
// 共用一份缓存的话，谁后算谁说了算，另一个的正面半圈就画到别人的位置上去了。
function newCache() {
  return {
    P: RINGS.map(() => { const a = []; for (let k = 0; k <= NSEG; k++) a.push({ x: 0, y: 0, z: 0 }); return a; }),
    B: RINGS.map(() => ({ cx: 0, cy: 0, a: 0, ux: 0, uy: 0, uz: 0, vx: 0, vy: 0, vz: 0 })),
    spin: 0, roll: 0, scale: 1
  };
}

// 环先按 inc 倾倒，再绕竖轴转 pre（这就是"转"），最后在画面里转 roll，然后压平投影到屏幕。
// 顺带留下每个点的 z：z > 0 是转到我们这边来的半圈。
function ringCalc(K, i, cx, cy, R) {
  const r = RINGS[i], b = K.B[i], P = K.P[i];
  const a = R * r.a * K.scale, pre = K.spin * r.spd, roll = r.roll + K.roll;
  const ci = Math.cos(r.inc), si = Math.sin(r.inc);
  const cp = Math.cos(pre), sp = Math.sin(pre);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  b.cx = cx; b.cy = cy; b.a = a;
  b.ux = cp * cr; b.uy = cp * sr; b.uz = -sp;
  b.vx = si * sp * cr - ci * sr; b.vy = si * sp * sr + ci * cr; b.vz = si * cp;
  for (let k = 0; k <= NSEG; k++) {
    const th = k / NSEG * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const p = P[k];
    p.x = cx + a * (c * b.ux + s * b.vx);
    p.y = cy + a * (c * b.uy + s * b.vy);
    p.z = c * b.uz + s * b.vz;
  }
}
// front=false 画整圈（暗，垫在球后面）；front=true 只挑 z>0 的段（亮，盖在球前面）
function drawRing(ctx, K, i, R, front, alpha, bth, TAU) {
  const r = RINGS[i], P = K.P[i], b = K.B[i];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = r.c; ctx.lineWidth = Math.max(1, R * r.w); ctx.lineCap = "round";
  ctx.beginPath();
  if (front) { let on = false; for (let k = 0; k <= NSEG; k++) { const p = P[k]; if (p.z > 0) { if (on) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); on = true; } else on = false; } }
  else for (let k = 0; k <= NSEG; k++) { const p = P[k]; if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
  ctx.stroke();
  // 环上跑着的一颗小光点，转到球后面就跟着看不见了
  const c = Math.cos(bth), s = Math.sin(bth), bz = c * b.uz + s * b.vz;
  if ((bz > 0) === front) {
    ctx.fillStyle = r.bead; ctx.shadowColor = r.c; ctx.shadowBlur = Math.min(20, R * 0.24);
    ctx.beginPath(); ctx.arc(b.cx + b.a * (c * b.ux + s * b.vx), b.cy + b.a * (c * b.uy + s * b.vy), R * 0.045, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export const makeOrb = makeVectorSkin({
  ...DEF, character: DEF,
  // iconK 比默认的 0.34 小：环最远到 1.56R，再乘开心时的 1.2，按 0.34 算会顶出小图标的框
  rK: 0.20, iconK: 0.19, baseYK: 0.56, headK: 0.75, float: true, noHop: true, hit: [1.4, 1.3, 0],

  // 自己维护三件事：环转到哪了（spin）、整体亮度（energy）、开心时环张开多少（open）
  tick(S, dt, g, { spawn }) {
    const e = S.extra;
    if (e.spin === undefined) { e.spin = 0; e.spd = 0.7; e.energy = 0.85; e.open = 0; e.K = newCache(); }
    const happy = S.mood === "happy" || S.pet.amt > 0.15;
    // 想事情转得快，困了几乎停下
    const tSpd = S.mood === "thinking" ? 3.0 : S.mood === "sleepy" ? 0.06 : happy ? 1.8 : 0.7;
    e.spd += (tSpd - e.spd) * Math.min(1, dt * 2.5);
    e.spin += e.spd * dt;
    // 困了整体变暗，想事情球心也暗一点，开心最亮
    const tE = S.mood === "sleepy" ? 0.30 : S.mood === "thinking" ? 0.58 : happy ? 1.15 : 0.85;
    e.energy += (tE - e.energy) * Math.min(1, dt * 3);
    e.open += ((happy ? 1 : 0) - e.open) * Math.min(1, dt * 4);
    // 开心时从球心冒小光点
    if (happy && Math.random() < dt * 5) spawn("dot", 1, g.cx + (Math.random() - 0.5) * g.R * 1.1, g.cy + (Math.random() - 0.5) * g.R * 0.7);
  },

  draw(ctx, g, S, face, X) {
    const { R, cx, cy, baseY } = g;
    const { TAU, happy, closed, yawn, stretch } = X;
    const e = S.extra;
    if (!e.K) e.K = newCache();            // draw 有可能比 tick 先跑到（icon 模式换皮肤那一帧）
    const K = e.K;
    const energy = e.energy ?? 0.85, spin = e.spin ?? 0, open = e.open ?? 0;
    const sleepy = S.mood === "sleepy", thinking = S.mood === "thinking";
    const pet = Math.min(1, S.pet.amt);
    const talking = S.talking || S.mouthLevel > 0.05;
    // 浮起来多高，-1~1：分母对着 float 的振幅（R*0.10）取，投影才看得出一呼一吸
    const lift = Math.max(-1, Math.min(1, (baseY - cy) / (R * 0.12)));

    // 地上的一小圈投影：浮得越高越小越淡
    const gy = baseY + R * 1.42;
    ctx.save();
    ctx.translate(cx, gy); ctx.scale(1, 0.22);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.66);
    sg.addColorStop(0, "rgba(20,52,110,0.55)"); sg.addColorStop(0.55, "rgba(20,52,110,0.24)"); sg.addColorStop(1, "rgba(20,52,110,0)");
    ctx.globalAlpha = Math.max(0.10, Math.min(1, (0.46 - lift * 0.16) * (0.5 + energy * 0.5)));
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.66 - lift * 0.10), 0, TAU); ctx.fill();
    ctx.restore();

    // 整体：歪头、落地压扁、被摸后的弹簧晃动都作用在球和环上。
    // jiggle 一定要先夹住：petAt 是跟着 pointermove 走的，手指在身上蹭一会儿，
    // 骨架那根弹簧会一路攒到 4 以上，直接乘进 scale 会把球压成一张饼。
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(S.tilt * 0.8);
    const jig = Math.max(-1.2, Math.min(1.2, S.jiggle));
    const sq = S.squash * (1 + jig * 0.06);
    ctx.scale(sq, 1 / sq);
    ctx.translate(-cx, -cy);

    // 环：开心时张开一圈，被拎着会晃，整体朝视线方向偏一点
    K.spin = spin;
    K.scale = 1 + open * 0.15 + stretch * 0.06 + pet * 0.05;
    K.roll = S.look.x * 0.06 + (S.carried ? Math.sin(S.t * 7) * 0.10 : 0);
    const backA = 0.20 + 0.16 * energy, frontA = Math.min(1, 0.52 + 0.45 * energy);
    for (let i = 0; i < RINGS.length; i++) { ringCalc(K, i, cx, cy, R); drawRing(ctx, K, i, R, false, backA, spin * RINGS[i].bk + RINGS[i].bph, TAU); }

    // 球外面的一层辉光
    ctx.save();
    const og = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.5);
    og.addColorStop(0, "rgba(126,214,255,0.42)"); og.addColorStop(0.5, "rgba(80,150,255,0.16)"); og.addColorStop(1, "rgba(80,150,255,0)");
    ctx.globalAlpha = Math.min(1, 0.45 + energy * 0.55);
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, TAU); ctx.fill();
    ctx.restore();

    // 球体：半透明的蓝，左上一块亮面；外面一圈深蓝描边，浅色桌面上也看得清
    ctx.save();
    const bg = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.38, R * 0.04, cx, cy, R * 1.02);
    bg.addColorStop(0, "rgba(230,250,255,0.92)"); bg.addColorStop(0.28, "rgba(126,203,255,0.80)");
    bg.addColorStop(0.62, "rgba(52,127,230,0.78)"); bg.addColorStop(0.90, "rgba(26,74,176,0.76)");
    bg.addColorStop(1, "rgba(15,46,124,0.66)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(16,50,116,0.45)"; ctx.lineWidth = Math.max(1, R * 0.032); ctx.stroke();
    ctx.restore();
    // 右下的一道边缘光，深色桌面上球才有形状
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.45 + energy * 0.4);
    ctx.strokeStyle = "rgba(196,242,255,0.9)"; ctx.lineWidth = Math.max(1, R * 0.045);
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.962, TAU * 0.04, TAU * 0.44); ctx.stroke();
    ctx.restore();
    // 高光
    ctx.save(); ctx.globalAlpha = 0.30; ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.ellipse(cx - R * 0.52, cy - R * 0.56, R * 0.15, R * 0.06, -0.62, 0, TAU); ctx.fill(); ctx.restore();

    // 困了（想事情时轻一点）整颗压暗
    if (energy < 0.72) { ctx.save(); ctx.globalAlpha = (0.72 - energy) * 0.55; ctx.fillStyle = "#0C2350"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.99, 0, TAU); ctx.fill(); ctx.restore(); }

    // 球心：一团呼吸似的亮光。想事情时暗下去，困了更暗，开心 / 被摸 / 说话时最亮
    const bt = sleepy ? 0.8 : thinking ? 2.6 : 1.7;
    const pulse = 0.5 + 0.5 * Math.sin(S.t * bt);
    const voice = talking ? S.mouthLevel : 0;                      // 说话时球心跟着音量鼓一下
    const coreR = R * (0.26 + 0.05 * pulse + open * 0.06 + pet * 0.05 + voice * 0.07);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4);
    cg.addColorStop(0, "rgba(255,255,255,0.95)"); cg.addColorStop(0.22, "rgba(198,242,255,0.85)");
    cg.addColorStop(0.6, "rgba(90,180,255,0.35)"); cg.addColorStop(1, "rgba(70,150,255,0)");
    ctx.save(); ctx.globalAlpha = Math.min(1, (0.28 + 0.45 * pulse) * energy + pet * 0.25 + voice * 0.25);
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, coreR * 2.4, 0, TAU); ctx.fill(); ctx.restore();

    // 想事情：一条扫描线在球里上下走
    if (thinking) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.97, 0, TAU); ctx.clip();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#CFF2FF"; ctx.lineWidth = Math.max(1, R * 0.022);
      const sy = cy + Math.sin(S.t * 1.7) * R * 0.86;
      ctx.beginPath(); ctx.moveTo(cx - R, sy); ctx.lineTo(cx + R, sy); ctx.stroke();
      ctx.restore();
    }

    // 被摸：手指落点那儿泛起一团白光
    if (pet > 0.02) {
      const dx = S.pet.x - cx, dy = S.pet.y - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, R * 0.75 / d);
      const px = cx + dx * k, py = cy + dy * k;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, R * 0.55);
      pg.addColorStop(0, "rgba(255,255,255,0.95)"); pg.addColorStop(0.5, "rgba(170,232,255,0.35)"); pg.addColorStop(1, "rgba(170,232,255,0)");
      // 上限压到 0.55：手指停在身上时 pet.amt 一直是满的，太亮会把脸盖没
      ctx.save(); ctx.globalAlpha = Math.min(0.55, pet * 0.6); ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(px, py, R * 0.55, 0, TAU); ctx.fill(); ctx.restore();
    }

    // 眼睛：两道竖着的光柱，眨眼压成一条横线，开心时弯成上扬的弧
    const lx = S.look.x * R * 0.16, ly = S.look.y * R * 0.11;
    const ey = cy - R * 0.18 + ly;
    const cl = Math.max(closed, yawn > 0.3 ? Math.min(1, (yawn - 0.3) * 2.5) : 0);
    ctx.save();
    ctx.shadowColor = "rgba(180,240,255,0.95)";
    ctx.shadowBlur = Math.min(20, R * (0.13 + energy * 0.09 + pet * 0.11));   // 跟着 R 走，小图标里才不会糊成一团
    ctx.fillStyle = "#EAFBFF"; ctx.strokeStyle = "#EAFBFF"; ctx.lineCap = "round";
    ctx.globalAlpha = Math.min(1, 0.55 + energy * 0.45);
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * R * 0.29 + lx;
      if (happy && cl < 0.5) { ctx.lineWidth = R * 0.095; ctx.beginPath(); ctx.arc(ex, ey + R * 0.12, R * 0.17, Math.PI * 1.14, Math.PI * 1.86); ctx.stroke(); }
      else {
        const flick = thinking ? (Math.sin(S.t * 7 + sgn * 1.3) > 0.2 ? 1 : 0.66) : 1;   // 想事情时光柱会闪
        const w = R * (0.075 + 0.16 * cl * cl), h = R * (0.40 * (1 - cl) * flick + 0.055);   // 先压扁，快闭上了才铺开成一条横线
        ctx.beginPath(); ctx.roundRect(ex - w / 2, ey - h / 2, w, h, Math.min(w, h) / 2); ctx.fill();
      }
    }
    ctx.restore();

    // 嘴：球体下半部的一条声波。说话时跟着 mouthLevel 起伏，想事情是三个点，开心时整条弯成上扬的弧
    const my = cy + R * 0.44;
    ctx.save();
    ctx.shadowColor = "rgba(160,230,255,0.9)"; ctx.shadowBlur = Math.min(14, R * 0.11);
    ctx.strokeStyle = "#D6F4FF"; ctx.fillStyle = "#D6F4FF";
    ctx.lineWidth = Math.max(1.2, R * 0.036); ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (thinking && !talking) {
      for (let i = -1; i <= 1; i++) { ctx.globalAlpha = Math.sin(S.t * 5 - i * 1.1) > 0.2 ? 0.95 : 0.3; ctx.beginPath(); ctx.arc(cx + i * R * 0.17 + lx, my, R * 0.042, 0, TAU); ctx.fill(); }
    } else {
      ctx.globalAlpha = Math.min(1, 0.5 + energy * 0.45);
      const amp = talking ? R * (0.045 + S.mouthLevel * 0.20) : sleepy ? R * 0.012 : R * 0.034;
      const spd = talking ? 26 : sleepy ? 1.4 : 4.5, freq = talking ? 3.1 : 2.0;
      const bow = happy && !talking ? -R * 0.075 : 0;                 // 开心：波形整条上扬
      const gap = yawn > 0.2 ? R * 0.10 * yawn : 0;                   // 打哈欠：中间鼓出去
      const n = 22, wide = R * 0.6;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const u = i / n, env = Math.sin(u * Math.PI);
        const x = cx - wide + u * wide * 2 + lx;
        const y = my + (bow + gap) * env + Math.sin(u * Math.PI * 2 * freq + S.t * spd) * amp * env;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 环的正面半圈：盖在球上，这样球看起来是被环穿过去的
    for (let i = 0; i < RINGS.length; i++) drawRing(ctx, K, i, R, true, frontA, spin * RINGS[i].bk + RINGS[i].bph, TAU);
    ctx.restore();

    // 看书：面前浮一块半透明的全息面板。
    // 先垫一层深蓝底再描边——只描浅青色的边，在浅色桌面上几乎看不见
    if (S.mood === "reading") {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(cx - R * 0.52, cy + R * 0.98, R * 1.04, R * 0.5, R * 0.08);
      ctx.globalAlpha = 0.30; ctx.fillStyle = "#123068"; ctx.fill();
      ctx.globalAlpha = 0.85; ctx.strokeStyle = "#5FC8FF"; ctx.lineWidth = Math.max(1, R * 0.026); ctx.stroke();
      ctx.globalAlpha = 0.75; ctx.strokeStyle = "#CFF2FF"; ctx.lineWidth = Math.max(1, R * 0.022); ctx.beginPath();
      for (let i = 0; i < 3; i++) { const y = cy + R * (1.12 + i * 0.12); ctx.moveTo(cx - R * 0.40, y); ctx.lineTo(cx + R * (0.38 - i * 0.13), y); }
      ctx.stroke();
      ctx.restore();
    }

    face.parts({ heart: "#8FD3FF", z: "#9FC4E8", dot: "#BDEBFF", note: "#7FD9FF", bubble: "rgba(190,235,255,0.7)" });
  }
});
