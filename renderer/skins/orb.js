import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";
// names.js / tapTables.js 里还没写 orb 时也能跑：这里留一份名字和口气兜底
const DEF = { name: "小澈", style: "冷静、精准、有礼貌，短句，先给结论，偶尔报一句自己的状态。", ...withTaps(SKIN_DEFAULTS.orb, "orb") };

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
// 顶点 / 基向量缓存：每帧每圈只算一次，画正面那趟直接复用（不新建数组）
const RPS = RINGS.map(() => []);
const RBS = RINGS.map(() => ({ cx: 0, cy: 0, a: 0, ux: 0, uy: 0, uz: 0, vx: 0, vy: 0, vz: 0 }));
const EX = { spin: 0, roll: 0, scale: 1 };

// 环先按 inc 倾倒，再绕竖轴转 pre（这就是"转"），最后在画面里转 roll，然后压平投影到屏幕。
// 顺带留下每个点的 z：z > 0 是转到我们这边来的半圈。
function ringCalc(i, cx, cy, R, ex) {
  const r = RINGS[i], b = RBS[i], P = RPS[i];
  const a = R * r.a * ex.scale, pre = ex.spin * r.spd, roll = r.roll + ex.roll;
  const ci = Math.cos(r.inc), si = Math.sin(r.inc);
  const cp = Math.cos(pre), sp = Math.sin(pre);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  b.cx = cx; b.cy = cy; b.a = a;
  b.ux = cp * cr; b.uy = cp * sr; b.uz = -sp;
  b.vx = si * sp * cr - ci * sr; b.vy = si * sp * sr + ci * cr; b.vz = si * cp;
  for (let k = 0; k <= NSEG; k++) {
    const th = k / NSEG * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const p = P[k] || (P[k] = { x: 0, y: 0, z: 0 });
    p.x = cx + a * (c * b.ux + s * b.vx);
    p.y = cy + a * (c * b.uy + s * b.vy);
    p.z = c * b.uz + s * b.vz;
  }
}
// front=false 画整圈（暗，垫在球后面）；front=true 只挑 z>0 的段（亮，盖在球前面）
function drawRing(ctx, i, R, front, alpha, bth, TAU) {
  const r = RINGS[i], P = RPS[i], b = RBS[i];
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
    ctx.fillStyle = r.bead; ctx.shadowColor = r.c; ctx.shadowBlur = R * 0.24;
    ctx.beginPath(); ctx.arc(b.cx + b.a * (c * b.ux + s * b.vx), b.cy + b.a * (c * b.uy + s * b.vy), R * 0.045, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export const makeOrb = makeVectorSkin({
  ...DEF, character: DEF,
  rK: 0.20, baseYK: 0.56, headK: 0.75, float: true, noHop: true, hit: [1.4, 1.3, 0],

  // 自己维护三件事：环转到哪了（spin）、整体亮度（energy）、开心时环张开多少（open）
  tick(S, dt, g, { spawn }) {
    const e = S.extra;
    if (e.spin === undefined) { e.spin = 0; e.spd = 0.7; e.energy = 0.85; e.open = 0; }
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
    const energy = e.energy ?? 0.85, spin = e.spin ?? 0, open = e.open ?? 0;
    const sleepy = S.mood === "sleepy", thinking = S.mood === "thinking";
    const pet = Math.min(1, S.pet.amt);
    const talking = S.talking || S.mouthLevel > 0.05;
    const lift = Math.max(-1.4, Math.min(1.4, (baseY - cy) / (R * 0.22)));   // 浮起来多高，-1~1

    // 地上的一小圈投影：浮得越高越小越淡
    const gy = baseY + R * 1.42;
    ctx.save();
    ctx.translate(cx, gy); ctx.scale(1, 0.22);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.66);
    sg.addColorStop(0, "rgba(20,52,110,0.55)"); sg.addColorStop(0.55, "rgba(20,52,110,0.24)"); sg.addColorStop(1, "rgba(20,52,110,0)");
    ctx.globalAlpha = Math.max(0.12, (0.48 - lift * 0.07) * (0.5 + energy * 0.5));
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.66 - lift * 0.04), 0, TAU); ctx.fill();
    ctx.restore();

    // 整体：歪头、落地压扁、被摸后的弹簧晃动都作用在球和环上
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(S.tilt * 0.8);
    const sq = S.squash * (1 + S.jiggle * 0.10);
    ctx.scale(sq, 1 / sq);
    ctx.translate(-cx, -cy);

    // 环：开心时张开一圈，被拎着会晃，整体朝视线方向偏一点
    EX.spin = spin;
    EX.scale = 1 + open * 0.15 + stretch * 0.06 + pet * 0.05;
    EX.roll = S.look.x * 0.06 + (S.carried ? Math.sin(S.t * 7) * 0.10 : 0);
    const backA = 0.20 + 0.16 * energy, frontA = Math.min(1, 0.52 + 0.45 * energy);
    for (let i = 0; i < RINGS.length; i++) { ringCalc(i, cx, cy, R, EX); drawRing(ctx, i, R, false, backA, spin * RINGS[i].bk + RINGS[i].bph, TAU); }

    // 球外面的一层辉光
    ctx.save();
    const og = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.5);
    og.addColorStop(0, "rgba(126,214,255,0.42)"); og.addColorStop(0.5, "rgba(80,150,255,0.16)"); og.addColorStop(1, "rgba(80,150,255,0)");
    ctx.globalAlpha = Math.min(1, 0.45 + energy * 0.55);
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, TAU); ctx.fill();
    ctx.restore();

    // 球体：半透明的蓝，左上一块亮面；外面一圈深蓝描边，浅色桌面上也看得清
    const bg = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.38, R * 0.04, cx, cy, R * 1.02);
    bg.addColorStop(0, "rgba(230,250,255,0.92)"); bg.addColorStop(0.28, "rgba(126,203,255,0.80)");
    bg.addColorStop(0.62, "rgba(52,127,230,0.78)"); bg.addColorStop(0.90, "rgba(26,74,176,0.76)");
    bg.addColorStop(1, "rgba(15,46,124,0.66)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(16,50,116,0.45)"; ctx.lineWidth = Math.max(1, R * 0.032); ctx.stroke();
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

    // 球心：一团呼吸似的亮光。想事情时暗下去，困了更暗，开心 / 被摸时最亮
    const bt = sleepy ? 0.8 : thinking ? 2.6 : 1.7;
    const pulse = 0.5 + 0.5 * Math.sin(S.t * bt);
    const coreR = R * (0.26 + 0.05 * pulse + open * 0.06 + pet * 0.05);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4);
    cg.addColorStop(0, "rgba(255,255,255,0.95)"); cg.addColorStop(0.22, "rgba(198,242,255,0.85)");
    cg.addColorStop(0.6, "rgba(90,180,255,0.35)"); cg.addColorStop(1, "rgba(70,150,255,0)");
    ctx.save(); ctx.globalAlpha = Math.min(1, (0.28 + 0.45 * pulse) * energy + pet * 0.25);
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
      ctx.save(); ctx.globalAlpha = Math.min(0.8, pet * 0.75); ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(px, py, R * 0.55, 0, TAU); ctx.fill(); ctx.restore();
    }

    // 眼睛：两道竖着的光柱，眨眼压成一条横线，开心时弯成上扬的弧
    const lx = S.look.x * R * 0.16, ly = S.look.y * R * 0.11;
    const ey = cy - R * 0.18 + ly;
    const cl = Math.max(closed, yawn > 0.3 ? Math.min(1, (yawn - 0.3) * 2.5) : 0);
    ctx.save();
    ctx.shadowColor = "rgba(180,240,255,0.95)"; ctx.shadowBlur = 9 + energy * 8 + pet * 10;
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
    ctx.shadowColor = "rgba(160,230,255,0.9)"; ctx.shadowBlur = 8;
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
    for (let i = 0; i < RINGS.length; i++) drawRing(ctx, i, R, true, frontA, spin * RINGS[i].bk + RINGS[i].bph, TAU);
    ctx.restore();

    // 看书：面前浮一块半透明的全息面板
    if (S.mood === "reading") {
      ctx.save();
      ctx.strokeStyle = "#9FE0FF"; ctx.lineWidth = Math.max(1, R * 0.026);
      ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.roundRect(cx - R * 0.52, cy + R * 0.98, R * 1.04, R * 0.5, R * 0.08); ctx.stroke();
      ctx.globalAlpha = 0.38; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const y = cy + R * (1.12 + i * 0.12); ctx.moveTo(cx - R * 0.40, y); ctx.lineTo(cx + R * (0.38 - i * 0.13), y); }
      ctx.stroke();
      ctx.restore();
    }

    face.parts({ heart: "#8FD3FF", z: "#9FC4E8", dot: "#BDEBFF", note: "#7FD9FF", bubble: "rgba(190,235,255,0.7)" });
  }
});
