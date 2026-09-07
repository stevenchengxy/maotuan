import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";

// names.js / tapTables.js 里还没写 wisp 时也能跑：这里先垫一份自己的名字、口气和点击反应；
// 等两张表里补上 wisp，表里的写法会自动盖掉这份兜底。
// 注意：语音（voice）只有写进 names.js 的 SKIN_DEFAULTS.wisp 才会被 main/voice.js 读到。
const FALLBACK = {
  name: "数萤",
  style: "安静、有点神秘，像在自言自语；句子短，常带省略号，偶尔提到光和数。",
  taps: [
    // 被指尖搅散：光点四下弹开，荡出一圈波纹，愣了半拍才慢慢聚回来亮一下
    { actions: [
      { squash: 0.9, fx: [
        ["burst", "spark", 6, { at: "chest", colors: ["#EAFBFF", "#7FE3FF", "#5CCEF6"], speed: 110, lift: 20, gravity: -15, spread: 18, size: 0.85 }],
        ["ring", { at: "chest", color: "#7FE3FF", width: 2, r0: 10, r1: 72, dur: 0.5 }]
      ] },
      { delay: 300, mood: "thinking", fx: [
        ["burst", "dot", 3, { at: "above", colors: ["#BFE6FF"], speed: 30, lift: 22, gravity: -10, size: 0.7 }]
      ] },
      { delay: 360, mood: "happy", squash: 0.5, fx: [
        ["glow", { at: "chest", color: "#7FE3FF", r: 54, dur: 0.7 }]
      ] }
    ] },
    // 信号不稳：整团忽地一闪，几颗光点掉了下去，晃两下才重新亮起来
    { actions: [
      { fx: [
        ["flash", { color: "#DFF4FF", alpha: 0.14, dur: 0.16 }],
        ["shake", { amp: 3, dur: 0.3 }]
      ] },
      { delay: 220, mood: "thinking", fx: [
        ["burst", "spark", 4, { at: "chest", colors: ["#7FE3FF", "#5CCEF6"], speed: 50, lift: -10, gravity: 150, size: 0.75 }]
      ] },
      { delay: 420, mood: "idle", look: [0, 0], squash: 0.6, fx: [
        ["glow", { at: "chest", color: "#BFE6FF", r: 50, dur: 0.6 }],
        ["burst", "sparkle", 2, { at: "above", colors: ["#FFFFFF", "#DFF4FF"], speed: 32, lift: 24, size: 0.7 }]
      ] }
    ] },
    // 被戳到就走神了：光点收拢成一条竖线慢慢绕圈，头顶浮起几个数据点，想通了才散开亮一下
    { actions: [
      { mood: "thinking", fx: [
        ["rise", "dot", 4, { at: "chest", colors: ["#7FE3FF", "#BFE6FF"], speed: 0.8, spread: 14, stagger: 0.06, size: 0.7, life: 1.1 }]
      ] },
      { delay: 340, fx: [
        ["text", "…", { at: "headR", color: "#7FE3FF", size: 20, dur: 0.9, rise: 24 }]
      ] },
      { delay: 360, mood: "happy", squash: 0.5, fx: [
        ["burst", "sparkle", 3, { at: "above", colors: ["#FFFFFF", "#DFF4FF"], speed: 40, lift: 30, size: 0.8 }],
        ["ring", { at: "chest", color: "#BFE6FF", width: 2, r0: 8, r1: 64, dur: 0.5 }]
      ] }
    ] },
    // 数一数自己有几颗：晃着转了一圈，光点像被点名一样一颗接一颗亮起来，数完暖暖地扩散一下
    { actions: [
      { spin: 1, fx: [
        ["burst", "sparkle", 5, { at: "chest", colors: ["#EAFBFF", "#7FE3FF"], speed: 70, lift: 25, gravity: -20, spread: 20, size: 0.8, stagger: 0.06 }]
      ] },
      { delay: 380, look: [0.4, -0.3], fx: [
        ["burst", "dot", 2, { at: "headR", colors: ["#BFE6FF"], speed: 30, lift: 26, gravity: -10, size: 0.7 }]
      ] },
      { delay: 380, mood: "happy", look: [0, 0], squash: 0.5, fx: [
        ["glow", { at: "chest", color: "#FFC98A", r: 52, dur: 0.7 }]
      ] }
    ] }
  ],
  tapLines: ["唔……又被点到了", "我在数你点了几下", "手会穿过去的……", "散开了，等我聚回来", "在想一件很小的事", "夜里我会亮一点"],
  // 被搅乱了：整团炸成一片乱光，白光一闪，晃着聚不拢，最后勉强收回来，弱弱地亮一下
  manyTap: { actions: [
    { fx: [
      ["burst", "spark", 10, { at: "chest", colors: ["#EAFBFF", "#7FE3FF", "#5CCEF6"], speed: 140, lift: 40, gravity: -20, spread: 22 }],
      ["flash", { color: "#FFFFFF", alpha: 0.16, dur: 0.2 }],
      ["shake", { amp: 4, dur: 0.45 }]
    ] },
    { delay: 260, mood: "thinking", fx: [
      ["burst", "smoke", 4, { at: "chest", colors: ["#BFE6FF", "#8FA8D6"], speed: 35, lift: 30, gravity: -30, size: 0.9 }],
      ["ring", { at: "chest", color: "#7FE3FF", width: 2, r0: 12, r1: 106, dur: 0.9 }]
    ] },
    { delay: 400, spin: 1, fx: [
      ["lines", { at: "chest", color: "#5CCEF6", n: 10, len: 34, dur: 0.5 }]
    ] },
    { delay: 420, mood: "happy", squash: 0.5, look: [0, 0.2], fx: [
      ["glow", { at: "chest", color: "#BFE6FF", r: 66, dur: 1 }],
      ["burst", "heart", 3, { at: "above", colors: ["#FF9EC0"], speed: 45, lift: 45, size: 0.9 }]
    ] }
  ] },
  manyLine: "别搅……我要散开了",
  voice: { id: "danya_xuejie", speed: 0.92, pitch: 0 }
};
const DEF = { ...FALLBACK, ...withTaps(SKIN_DEFAULTS.wisp, "wisp") };

// 数萤：一团会流动的数据光。没有实体，十几颗光点绕着中心慢慢漂，
// 轮廓像一只模糊的小水母；中间两颗更亮的是眼睛。情绪全靠光点的疏密和冷暖来演。
const TAU = Math.PI * 2;
const MIX = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const RGBA = (c, a) => "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a < 0 ? 0 : a > 1 ? 1 : a) + ")";
const to = (cur, want, dt, k) => cur + (want - cur) * Math.min(1, dt * k);
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
// 冷（平时）／暖（开心、被摸）／灰蓝（困了）三套色。edge 是外圈那道深色，
// 它让这团光在白底桌面上也有边界，不至于糊掉。
// 暖色的 mid 一定要够亮：偏橙的 [255,186,108] 和冷蓝一混就是一团土黄，整只看着像脏了；
// 抬到淡金才是"光变暖了"，外圈仍留一道暖褐，白底上也还有边。
const COOL_CORE = [232, 250, 255], COOL_MID = [78, 194, 240], COOL_EDGE = [22, 94, 160];
const WARM_CORE = [255, 250, 232], WARM_MID = [255, 220, 164], WARM_EDGE = [163, 106, 62];
const SLEEP_MID = [128, 146, 196], SLEEP_EDGE = [52, 66, 112];
// 从 S.beh 里读出打哈欠 / 伸懒腰的进度（和 vectorBase 传给 draw 的 X 是同一套算法）
const behK = (S, type) => (S.beh && S.beh.type === type ? Math.sin(S.beh.t / S.beh.dur * Math.PI) : 0);

// 光点表：前两颗是眼睛，六颗撑出伞盖的圆顶，两颗是伞裙的下缘，六颗是两条往下拖的触须
function ensure(S, g) {
  const E = S.extra;
  if (E.motes) return E;
  const M = [], put = o => M.push({ eye: 0, li: 0, ox: 0, oy: 0, vx: 0, vy: 0, x: g.cx, y: g.cy, r: 8, a: 1, ...o });
  for (const s of [-1, 1]) put({ eye: s, hx: 0, hy: 0, ax: 0.016, ay: 0.022, wx: 0.83, wy: 1.21, px: s * 1.1, py: s * 2.3, sz: 0.105, br: 1 });
  for (let i = 0; i < 6; i++) {                       // 圆顶
    const a = Math.PI * (0.14 + 0.72 * (i / 5)), rr = 0.80 + (i % 3) * 0.09;
    put({ hx: Math.cos(a) * rr, hy: -0.30 - Math.sin(a) * rr * 0.58, ax: 0.06 + (i % 3) * 0.022, ay: 0.05 + (i % 2) * 0.03, wx: 0.30 + i * 0.055, wy: 0.25 + i * 0.043, px: i * 1.37, py: i * 2.11 + 0.6, sz: 0.155 + (i % 3) * 0.03, br: 0.82 + (i % 3) * 0.06 });
  }
  for (const s of [-1, 1]) put({ hx: s * 0.72, hy: -0.02, ax: 0.075, ay: 0.055, wx: 0.37, wy: 0.44, px: s + 3.1, py: s * 1.7, sz: 0.15, br: 0.74 });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {   // 两条触须，波从上往下传
    const u = i / 2;
    put({ hx: s * (0.24 + u * 0.1), hy: 0.34 + u * 0.56, ax: 0.05 + u * 0.085, ay: 0.04, wx: 0.5, wy: 0.62, px: s * 1.6 + i * 0.85, py: i * 1.2 + s, sz: 0.128 - u * 0.04, br: 0.58 - u * 0.19 });
  }
  const body = M.filter(m => !m.eye);                 // 想事情时排成一条竖线的先后顺序
  body.forEach((m, i) => { m.li = (i / (body.length - 1) - 0.5) * 1.55; });
  E.motes = M; E.spread = 1; E.drop = 0; E.dim = 0; E.warm = 0; E.gather = 0; E.loose = 0; E.lx = 0; E.ly = 0;
  return E;
}

export const makeWisp = makeVectorSkin({
  ...DEF, character: DEF,
  rK: 0.20, iconK: 0.26, baseYK: 0.56, headK: 0.55, float: true, noHop: true, hit: [1.35, 1.3, 0.05],

  tick(S, dt, g, { spawn }) {
    const E = ensure(S, g), { R, cx, cy } = g;
    const petting = S.pet.amt > 0.15;
    // 情绪 → 光点的疏密冷暖，全部平滑过渡，不要跳变
    E.spread = to(E.spread, S.mood === "happy" ? 1.30 : S.mood === "sleepy" ? 1.06 : 1, dt, 2.4);
    E.drop = to(E.drop, S.mood === "sleepy" ? 0.30 : 0, dt, 1.8);
    E.dim = to(E.dim, S.mood === "sleepy" ? 1 : 0, dt, 2);
    E.loose = to(E.loose, S.mood === "sleepy" ? 1 : 0, dt, 1.6);
    E.warm = to(E.warm, S.mood === "happy" || petting ? 1 : 0, dt, 2.6);
    E.gather = to(E.gather, S.mood === "thinking" ? 1 : 0, dt, 2.2);
    // 说话：整团随音量一鼓一鼓；平时是很慢的呼吸
    const puff = 1 + S.mouthLevel * 0.15 + Math.sin(S.t * 13) * S.mouthLevel * 0.05 + Math.sin(S.t * 0.7) * 0.03
      + behK(S, "yawn") * 0.12 + (S.carried ? Math.sin(S.t * 8) * 0.04 : 0);
    const stretch = behK(S, "stretch");
    const ang = S.t * 1.35, gx = Math.cos(ang) * 0.27, gy = Math.sin(ang) * 0.11;  // 竖线绕圈的位置
    E.lx = gx * E.gather; E.ly = gy * E.gather;   // 留给 draw：那团雾要跟着竖线一起收窄、一起绕
    const sx = S.squash, sy = (1 / S.squash) * (1 + S.jiggle * 0.10 + stretch * 0.16);
    const ct = Math.cos(S.tilt), st = Math.sin(S.tilt);
    // 脸不跟着整团一起胀大，不然一开心眼距就飞出去了：眼睛只吃三成的 spread
    const bodyK = E.spread * puff, eyeK = (1 + (E.spread - 1) * 0.35) * puff;
    for (const m of E.motes) {
      let hx, hy;
      if (m.eye) {
        // 眼睛：跟着鼠标偏一点，想事情时靠拢并跟着竖线一起绕
        const sep = 0.255 * (1 - E.gather * 0.45);
        hx = m.eye * sep + S.look.x * 0.13 + Math.sin(S.t * m.wx + m.px) * m.ax + gx * E.gather;
        hy = -0.13 + S.look.y * 0.085 + Math.sin(S.t * m.wy + m.py) * m.ay + gy * E.gather + E.drop * 0.85;
        hx *= eyeK; hy *= eyeK;
      } else {
        // 身体：李萨如式漂移（两个不同频率的 sin 叠在一起）
        hx = m.hx + Math.sin(S.t * m.wx + m.px) * m.ax;
        hy = m.hy + Math.sin(S.t * m.wy + m.py) * m.ay;
        if (E.gather > 0.004) {                        // 想事情：收成一条竖线
          hx += (gx + Math.sin(S.t * 2.1 + m.px) * 0.035 - hx) * E.gather;
          hy += (gy + m.li * 0.95 - hy) * E.gather;
        }
        hx *= 1 + E.loose * 0.20; hy *= 1 + E.loose * 0.26;   // 困了：彼此拉开
        hy += E.drop;
        hx *= bodyK; hy *= bodyK;
      }
      const ux = hx * sx, uy = hy * sy;
      const tx = cx + (ux * ct - uy * st) * R, ty = cy + (ux * st + uy * ct) * R;
      // 被摸：摸到的那一侧被推开，再用弹簧慢慢聚回来（轻轻一戳也要看得出来）
      if (S.pet.amt > 0.02) {
        const dx = tx - S.pet.x, dy = ty - S.pet.y, d = Math.hypot(dx, dy) || 1, reach = R * 1.35;
        if (d < reach) { const f = (1 - d / reach) * Math.min(1, 0.45 + S.pet.amt * 0.6) * R * 20 * dt; m.vx += dx / d * f; m.vy += dy / d * f; }
      }
      const kk = m.eye ? 70 : 42;                      // 眼睛回位快一些，脸不会飘走
      m.vx += (-m.ox * kk - m.vx * 7) * dt; m.vy += (-m.oy * kk - m.vy * 7) * dt;
      m.ox = Math.max(-R * 0.55, Math.min(R * 0.55, m.ox + m.vx * dt));
      m.oy = Math.max(-R * 0.55, Math.min(R * 0.55, m.oy + m.vy * dt));
      m.x = tx + m.ox; m.y = ty + m.oy;
      // 亮度和大小：各自慢慢明灭，困了整体压暗，开心时鼓一点（半径必须 > 0，渐变才建得起来）
      m.r = Math.max(0.6, R * m.sz * (1 + E.warm * 0.12 - E.dim * 0.10) * (0.92 + 0.14 * Math.sin(S.t * 1.7 + m.px)));
      m.a = clamp01(m.br * (1 - E.dim * 0.26) * (0.78 + 0.22 * Math.sin(S.t * 1.1 + m.py)) + E.warm * 0.10 + S.mouthLevel * 0.12);
    }
    if (Math.random() < dt * (0.5 + E.warm * 0.6)) spawn("bubble", 1, cx + (Math.random() - 0.5) * R * 1.4, cy + R * (Math.random() - 0.2));
  },

  draw(ctx, g, S, face, X) {
    const { R, cx, cy, baseY } = g; const { happy, closed, yawn } = X;
    const E = ensure(S, g), warm = E.warm, dim = E.dim;
    const core = MIX(COOL_CORE, WARM_CORE, warm);
    const mid = MIX(MIX(COOL_MID, WARM_MID, warm), SLEEP_MID, dim * 0.7);
    const edge = MIX(MIX(COOL_EDGE, WARM_EDGE, warm), SLEEP_EDGE, dim * 0.7);
    // 地上的一小圈淡光（浮空的影子）
    const poolY = baseY + R * 1.2, gk = (1 - dim * 0.45) * (1 - Math.abs(cy - baseY) / (R * 1.6) * 0.35);
    ctx.save(); ctx.translate(cx, poolY); ctx.scale(1 - E.gather * 0.35, 0.2);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.95);
    pool.addColorStop(0, RGBA(mid, 0.40 * gk)); pool.addColorStop(0.5, RGBA(edge, 0.22 * gk)); pool.addColorStop(1, RGBA(edge, 0));
    ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, TAU); ctx.fill(); ctx.restore();
    // 伞盖那团雾：压扁的椭圆，给它一点体积，也让它在浅色桌面上不至于糊掉。
    // 想事情时光点收成一条竖线，这团雾要跟着收窄、跟着绕，不然线是收了、外面还罩着一个圆blob
    const hazeY = cy - R * 0.24 + E.drop * R + E.ly * R, hk = (1 - dim * 0.26) * (1 - E.gather * 0.35);
    ctx.save(); ctx.translate(cx + E.lx * R, hazeY); ctx.scale(1 - E.gather * 0.62, 0.84 + E.gather * 0.62);
    const hz = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, R * 1.06);
    hz.addColorStop(0, RGBA(mid, 0.46 * hk)); hz.addColorStop(0.48, RGBA(mid, 0.26 * hk));
    hz.addColorStop(0.82, RGBA(edge, 0.22 * hk)); hz.addColorStop(1, RGBA(edge, 0));
    ctx.fillStyle = hz; ctx.beginPath(); ctx.arc(0, 0, R * 1.06, 0, TAU); ctx.fill(); ctx.restore();
    // 光点：渐变整帧只建两条（身体一条、眼睛一条），是半径 1 的"单位光点"，
    // 画的时候用 scale 撑到各自大小、亮度走 globalAlpha —— 十几颗光点不用每颗新建一次渐变。
    // （渐变的坐标按落笔那一刻的变换算，所以一条就能反复用。）
    const cl = Math.min(1, Math.max(closed, yawn > 0.3 ? (yawn - 0.3) * 2.6 : 0));
    const squint = happy && cl < 0.4;
    const grad = (a0, s1, a1, s2, a2, s3, a3) => {
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, RGBA(core, a0)); gr.addColorStop(s1, RGBA(mid, a1));
      gr.addColorStop(s2, RGBA(mid, a2)); gr.addColorStop(s3, RGBA(edge, a3)); gr.addColorStop(1, RGBA(edge, 0));
      return gr;
    };
    const bodyGrad = grad(0.95, 0.2, 0.95, 0.52, 0.72, 0.78, 0.40);
    const eyeGrad = squint ? null : grad(0.98, 0.18, 0.98, 0.5, 0.8, 0.76, 0.32);
    for (const m of E.motes) {
      if (m.eye) continue;
      ctx.save(); ctx.globalAlpha = Math.min(1, m.a * 1.25); ctx.translate(m.x, m.y); ctx.scale(m.r, m.r);
      ctx.shadowColor = RGBA(mid, 0.7); ctx.shadowBlur = 6;
      ctx.fillStyle = bodyGrad; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
    }
    // 眼睛：两颗更亮的光点，眨眼时缩成横线，开心时弯成一道上扬的光
    for (const m of E.motes) {
      if (!m.eye) continue;
      if (squint) {                                   // 开心：眯成一道上扬的弯光，先描一道深边再点亮
        const arc = () => { ctx.beginPath(); ctx.arc(m.x, m.y + m.r * 0.42, m.r * 0.78, Math.PI * 1.16, Math.PI * 1.84); };
        ctx.save(); ctx.lineCap = "round";
        ctx.strokeStyle = RGBA(edge, 0.5); ctx.lineWidth = Math.max(2.5, m.r * 0.74); arc(); ctx.stroke();
        ctx.strokeStyle = RGBA(core, 0.96); ctx.lineWidth = Math.max(1.6, m.r * 0.42);
        ctx.shadowColor = RGBA(mid, 0.95); ctx.shadowBlur = m.r * 1.2; arc(); ctx.stroke(); ctx.restore();
        continue;
      }
      ctx.save(); ctx.globalAlpha = m.a; ctx.translate(m.x, m.y); ctx.scale(1 + 0.12 * cl, Math.max(0.13, 1 - 0.87 * cl));
      ctx.save(); ctx.scale(m.r * 1.75, m.r * 1.75);
      ctx.fillStyle = eyeGrad; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = RGBA(core, 0.98); ctx.beginPath(); ctx.arc(0, 0, m.r * 0.3, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // 嘴：一小道光。说话时张成一圈，开心上扬，想事情一撇，困了一个小点
    const eL = E.motes[0], eR = E.motes[1], mx = (eL.x + eR.x) / 2, my = (eL.y + eR.y) / 2 + R * 0.29;
    const mpath = () => {
      ctx.beginPath();
      if (yawn > 0.25) ctx.ellipse(mx, my, R * 0.05 * yawn + R * 0.02, R * 0.09 * yawn + R * 0.015, 0, 0, TAU);
      else if (S.talking || S.mouthLevel > 0.05) { const o = Math.max(0.1, S.mouthLevel); ctx.ellipse(mx, my, R * (0.045 + o * 0.028), R * (0.018 + o * 0.075), 0, 0, TAU); }
      else if (S.mood === "sleepy") ctx.arc(mx, my, R * 0.03, 0, TAU);
      else if (S.mood === "thinking") { ctx.moveTo(mx - R * 0.05, my + R * 0.014); ctx.lineTo(mx + R * 0.06, my - R * 0.02); }
      else { const w = happy ? R * 0.1 : R * 0.06, d = happy ? R * 0.055 : R * 0.024; ctx.moveTo(mx - w, my - d * 0.4); ctx.quadraticCurveTo(mx, my + d, mx + w, my - d * 0.4); }
    };
    ctx.save(); ctx.lineCap = "round";
    ctx.strokeStyle = RGBA(edge, 0.5); ctx.lineWidth = Math.max(2.6, R * 0.056); mpath(); ctx.stroke();
    ctx.strokeStyle = RGBA(core, 0.95); ctx.lineWidth = Math.max(1.4, R * 0.03);
    ctx.shadowColor = RGBA(mid, 0.9); ctx.shadowBlur = R * 0.1; mpath(); ctx.stroke();
    ctx.restore();
    if (S.mood === "reading") face.book(cx, cy + R * 0.72, R, "#EAF7FF", "#5A87B0");
    face.parts({ heart: "#FF9EC0", z: "#8FA8D6", dot: "#7FE3FF", note: "#7FE3FF", bubble: "rgba(150,225,255,0.55)" });
  }
});
