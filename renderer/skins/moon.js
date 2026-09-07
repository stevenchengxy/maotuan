import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";

// names.js / tapTables.js 里还没写 moon 时也能跑：这里先垫一份自己的名字、口气和点击反应；
// 等两张表里补上 moon，表里的写法会自动盖掉这份兜底。
// 注意：语音（voice）只有写进 names.js 的 SKIN_DEFAULTS.moon 才会被 main/voice.js 读到。
const FALLBACK = {
  name: "小月",
  style: "轻声细语，话很少，句子短；像在哄人睡觉，常说到夜里、星星和留着的那盏灯。",
  taps: [
    // 被碰醒一点点：睁开靠你那只眼睛看你，光晕亮一下，飘起两点小光，然后又眯回去
    { actions: [
      { look: [-0.5, 0.15], fx: [["glow", { at: "chest", color: "#FFDE94", r: 62, dur: 0.7 }], ["burst", "sparkle", 2, { at: "headR", colors: ["#FFF3CF", "#FFD98A"], speed: 38, lift: 34, gravity: 30, size: 0.7 }]] },
      { delay: 420, mood: "happy", squash: 0.4 },
      { delay: 480, mood: "idle", look: [0, 0] }
    ] },
    // 打了个小哈欠：整个人往下沉一下，头边飘出三个 z，回过神来又亮一下
    { actions: [
      { mood: "sleepy", squash: 0.5, fx: [["rise", "zzz", 3, { at: "headR", colors: ["#D9B36A", "#F2D79B"], speed: 0.7, spread: 10, stagger: 0.12, size: 0.9 }]] },
      { delay: 520, look: [0.3, 0.2] },
      { delay: 520, mood: "idle", look: [0, 0], fx: [["glow", { at: "chest", color: "#FFE7B0", r: 48, dur: 0.6 }]] }
    ] },
    // 脚下的云被蹭散了一点：云圈荡开，飘出几缕小云，它低头看了看又拢回来
    { actions: [
      { squash: 0.45, fx: [["ring", { at: "feet", color: "#DCE2F5", width: 3, r0: 8, r1: 62, dur: 0.55 }], ["burst", "smoke", 3, { at: "feet", colors: ["#EDEFFA", "#D5DBEE"], speed: 42, lift: 18, gravity: -25, size: 0.9 }]] },
      { delay: 340, look: [0, 0.5] },
      { delay: 520, look: [0, 0], fx: [["burst", "sparkle", 2, { at: "feet", colors: ["#FFF3CF"], speed: 30, lift: 22, size: 0.6 }]] }
    ] },
    // 轻轻晃一下，把一小把星星撒出来，脚下的云里也浮起几点光
    { actions: [
      { spin: 1, fx: [["burst", "star", 4, { at: "chest", colors: ["#FFE7A8", "#FFF6DC", "#FFD07A"], speed: 70, lift: 40, gravity: 80, size: 0.8 }]] },
      { delay: 360, mood: "happy", fx: [["rise", "sparkle", 3, { at: "feet", colors: ["#FFF3CF", "#FFFFFF"], speed: 0.8, spread: 18, stagger: 0.06, size: 0.7 }]] },
      { delay: 520, mood: "idle" }
    ] }
  ],
  tapLines: ["嘘……我在这儿呢", "困了就靠过来吧", "别熬夜啦，好不好", "灯我留着，你先睡", "轻一点，星星会醒", "晚安，做个好梦"],
  // 被戳到彻底醒了：光晕闪一下，星星撒开一圈，身子轻轻晃，愣了愣，又慢慢眯回去睡
  manyTap: { actions: [
    { fx: [["flash", { color: "#FFF1CC", alpha: 0.16, dur: 0.22 }], ["burst", "star", 8, { at: "chest", colors: ["#FFE7A8", "#FFF6DC", "#FFD07A"], speed: 110, lift: 50, gravity: 70, spread: 18 }], ["shake", { amp: 3, dur: 0.4 }]] },
    { delay: 240, mood: "happy", squash: 0.5, fx: [["glow", { at: "chest", color: "#FFD98A", r: 72, dur: 0.9 }]] },
    { delay: 420, mood: "thinking", fx: [["burst", "sparkle", 3, { at: "above", colors: ["#FFF3CF"], speed: 40, lift: 25, size: 0.7 }]] },
    { delay: 520, mood: "sleepy", look: [0, 0], fx: [["rise", "zzz", 3, { at: "headR", colors: ["#D9B36A"], speed: 0.7, stagger: 0.14, size: 0.9 }]] }
  ] },
  manyLine: "好啦好啦，我醒着呢",
  voice: { id: "Chinese (Mandarin)_Warm_Girl", speed: 0.9, pitch: -1 }
};
const DEF = { ...FALLBACK, ...withTaps(SKIN_DEFAULTS.moon, "moon") };

// 小月：一盏月牙小夜灯。奶油色的月牙（大圆减小圆），脸在最厚的那半边，
// 平时闭着眼睡着，身下一小片会慢慢变形的云托着它，周身一圈会呼吸的暖光。
const INK = "#6E4A1E";       // 眼睛和嘴
const LID = "#FFE9B4";       // 眼皮＝月面本身的颜色

// 月牙 = 大圆 A（半径 R）减去偏右的小圆 B。这几个数都按 R 归一，两条弧的角度也就跟大小无关，
// 所以在这里算一次就够了，每帧不用再开方 / 反三角。
const PHI = -0.18;                 // 缺口的方向（略微偏右上）
const DK = 0.62, R2K = 0.86;       // B 的圆心距、B 的半径（都乘 R）
const AK = (DK * DK + 1 - R2K * R2K) / (2 * DK);        // 交点到 A 圆心的投影
const HK = Math.sqrt(Math.max(0, 1 - AK * AK));         // 交点离中轴多高
const BETA = Math.atan2(HK, AK);                        // 交点在 A 上的角（相对 PHI）
const GAMMA = Math.atan2(HK, AK - DK);                  // 交点在 B 上的角（相对 PHI）
// 月牙偏左，整体右移一点才压在云中间；脸心在剩下那半月最厚处（y≈0 时月肉横跨 -1R…-0.25R）
const MOON_DX = 0.24, FACE_DX = MOON_DX - 0.60;
// 云：五个圆 + 一条压扁的椭圆底，半径各自周期涨落
const LOBES = [[-0.84, 0.06, 0.32], [-0.42, -0.13, 0.44], [0.04, -0.20, 0.48], [0.48, -0.09, 0.41], [0.86, 0.07, 0.30]];
const MAX_STARS = 10;

const initExtra = e => { e.open = 0; e.wink = 0; e.side = -1; e.think = 0; e.sleep = 0; e.stars = []; };

export const makeMoon = makeVectorSkin({
  ...DEF, character: DEF,
  rK: 0.20, iconK: 0.30, baseYK: 0.54, headK: 0.55, float: true, noHop: true, hit: [1.1, 1.25, 0.12],

  // 自己的状态：睁眼程度、单眼偷看、想事情的淡入、睡意、开心时的小星星
  tick(S, dt, g) {
    const e = S.extra;
    if (e.open === undefined) initExtra(e);
    const glad = S.mood === "happy";
    // 默认是闭着的（它本来就在睡），只有被碰、开心、想事情、说话时才睁开
    let want = 0;
    if (S.mood === "sleepy") want = 0;
    else if (glad) want = 1;
    else if (S.mood === "thinking" || S.mood === "reading") want = 0.92;
    else if (S.pet.amt > 0.02) want = Math.min(1, S.pet.amt * 1.8);
    else if (S.talking || S.mouthLevel > 0.05) want = 0.6;
    e.open += (want - e.open) * Math.min(1, dt * 5);
    // 手一直贴着的时候两只都睁；手离开、pet.amt 慢慢退下去的那一下只留一只眼看着你，然后眯回去。
    // （点一下之后 pet.js 会把心情切成 happy，所以这里不能只在 idle 时候认，不然永远轮不到偷看）
    const peek = (S.pet.amt > 0.05 && S.pet.amt < 0.75 && S.mood !== "thinking" && S.mood !== "reading" && !S.talking) ? 1 : 0;
    if (S.pet.amt > 0.5) e.side = S.pet.x < g.cx + g.R * FACE_DX ? -1 : 1;   // 睁靠近你手的那只
    e.wink += (peek - e.wink) * Math.min(1, dt * 6);
    e.think += ((S.mood === "thinking" ? 1 : 0) - e.think) * Math.min(1, dt * 3);
    e.sleep += ((S.mood === "sleepy" ? 1 : 0) - e.sleep) * Math.min(1, dt * 2);
    // 开心 / 被摸时周身慢慢冒小星星
    if ((glad || S.pet.amt > 0.15) && e.stars.length < MAX_STARS && Math.random() < dt * 7) {
      const a = Math.random() * Math.PI * 2, rr = g.R * (0.85 + Math.random() * 0.5);
      e.stars.push({ x: g.cx + g.R * MOON_DX + Math.cos(a) * rr, y: g.cy + Math.sin(a) * rr * 0.95, vx: (Math.random() - 0.5) * 14, vy: -10 - Math.random() * 16, life: 1, sz: g.R * (0.05 + Math.random() * 0.05), rot: Math.random() * 3 });
    }
    if (e.stars.length) {
      for (const p of e.stars) { p.life -= dt * 0.75; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 8 * dt; p.rot += dt * 1.2; }
      e.stars = e.stars.filter(p => p.life > 0);
    }
  },

  draw(ctx, g, S, face, X) {
    const { R, cx, cy, baseY } = g;
    const { TAU, happy, closed, yawn, stretch } = X;
    const e = S.extra;
    if (e.open === undefined) initExtra(e);
    // 比骨架的浮动更慢的一层：整个人非常缓地上下飘；睡着的时候再往下沉一点点
    const my = cy + Math.sin(S.t * 0.33) * R * 0.07 + e.sleep * R * 0.05, mx = cx + R * MOON_DX;
    // 光晕的呼吸：慢慢亮慢慢暗；被摸 / 开心时亮一下，说话时一闪一闪，睡着时最暗
    const speak = S.talking || S.mouthLevel > 0.05 ? (0.10 + S.mouthLevel * 0.30) * (0.6 + 0.4 * Math.sin(S.t * 14)) : 0;
    const halo = Math.max(0.12, Math.min(1.15,
      0.42 + 0.16 * Math.sin(S.t * 0.7) + Math.min(1, S.pet.amt) * 0.32 + (happy ? 0.18 : 0) + speak - e.sleep * 0.20));

    // ── 云：托在身下，几个圆的半径各自周期变化，飘得比月牙慢
    const cyc = baseY + R * 1.04 + Math.sin(S.t * 0.25) * R * 0.035, cxc = cx + Math.sin(S.t * 0.18) * R * 0.05;
    ctx.save();
    ctx.shadowColor = "rgba(70,80,130,0.30)"; ctx.shadowBlur = R * 0.3; ctx.shadowOffsetY = R * 0.06;
    ctx.beginPath();
    for (let i = 0; i < LOBES.length; i++) {
      const [dx, dy, r] = LOBES[i], rr = r * R * (1 + 0.15 * Math.sin(S.t * 0.6 + i * 1.7));   // 每个圆的半径各自慢慢涨落
      ctx.moveTo(cxc + dx * R + rr, cyc + dy * R);
      ctx.arc(cxc + dx * R, cyc + dy * R, rr, 0, TAU);
    }
    ctx.moveTo(cxc + R * 0.98, cyc + R * 0.06); ctx.ellipse(cxc, cyc + R * 0.06, R * 0.98, R * 0.2, 0, 0, TAU);
    const cg = ctx.createLinearGradient(0, cyc - R * 0.6, 0, cyc + R * 0.28);
    cg.addColorStop(0, "#FFF6E4"); cg.addColorStop(0.55, "#ECEDF8"); cg.addColorStop(1, "#CFD5EC");
    ctx.fillStyle = cg; ctx.fill();
    ctx.restore();

    // ── 暖光晕（径向渐变，不用 filter）：画在云上面，云也就被烘暖了一层
    const gr = ctx.createRadialGradient(mx, my, R * 0.25, mx, my, R * 2.05);
    gr.addColorStop(0, `rgba(255,216,140,${(0.50 * halo).toFixed(3)})`);
    gr.addColorStop(0.42, `rgba(255,198,118,${(0.20 * halo).toFixed(3)})`);
    gr.addColorStop(1, "rgba(255,190,110,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(mx, my, R * 2.05, 0, TAU); ctx.fill();

    ctx.save();                                              // ①：整个月牙的姿态
    ctx.translate(mx, my);
    ctx.rotate(S.tilt + S.look.x * 0.05 + Math.sin(S.t * 0.4) * 0.02 + e.sleep * 0.05
      + (happy ? Math.sin(S.t * 7) * 0.045 : 0) + (S.carried ? Math.sin(S.t * 6) * 0.05 : 0));
    ctx.scale(S.squash * (1 + stretch * 0.04), (1 / S.squash) * (1 - stretch * 0.03));
    ctx.translate(-mx, -my);

    // ── 月牙：大圆 A 减去偏右的小圆 B，只取两条真正的边（外弧 + 内凹弧）
    const r2 = R2K * R, bx = mx + Math.cos(PHI) * DK * R, by = my + Math.sin(PHI) * DK * R;
    const crescent = () => {
      ctx.beginPath();
      ctx.arc(mx, my, R, PHI + BETA, PHI - BETA + TAU, false);   // 外圈：绕远的那半
      ctx.arc(bx, by, r2, PHI - GAMMA, PHI + GAMMA, true);       // 内凹：贴着 A 的那段
      ctx.closePath();
    };
    ctx.save();                                              // ②：只给月牙本体带一层暖投影
    ctx.shadowColor = "rgba(255,203,116,0.95)"; ctx.shadowBlur = R * (0.24 + halo * 0.26);
    crescent();
    const bg = ctx.createLinearGradient(mx - R, my - R, mx + R * 0.4, my + R);
    bg.addColorStop(0, "#FFFCEE"); bg.addColorStop(0.45, LID); bg.addColorStop(1, "#F2C674");
    ctx.fillStyle = bg; ctx.fill();
    ctx.restore();                                           // ②
    ctx.strokeStyle = "rgba(146,98,28,0.38)"; ctx.lineWidth = Math.max(1, R * 0.022); crescent(); ctx.stroke();

    // ── 脸：在月肉最厚的地方。看鼠标的位移压得很小，眼睛才不会挪出月牙外面去
    const lx = S.look.x * R * 0.035, ly = S.look.y * R * 0.045;
    const fx0 = cx + R * FACE_DX + lx, fy = my + R * 0.05 + ly;
    // 月面上的两个浅坑 + 腮红，都裁在月牙里，不会漏到外面
    ctx.save();                                              // ③：裁进月牙
    crescent(); ctx.clip();
    ctx.fillStyle = "rgba(214,164,86,0.22)";
    ctx.beginPath(); ctx.ellipse(mx - R * 0.28, my - R * 0.62, R * 0.11, R * 0.085, 0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(mx - R * 0.52, my + R * 0.60, R * 0.08, R * 0.06, -0.2, 0, TAU); ctx.fill();
    const bk = 0.16 + (happy ? 0.30 : 0) + Math.min(1, S.pet.amt) * 0.2;
    face.blush(fx0 - R * 0.23, fy + R * 0.15, R, bk, "#EE9E76");
    face.blush(fx0 + R * 0.23, fy + R * 0.15, R, bk, "#EE9E76");
    ctx.restore();                                           // ③

    // 眼睛：默认是两道弯弯的睡眼（眨眼会让它压得更平），睁开时换成会看人的眼珠
    const op = e.open * (1 - yawn) * (1 - e.sleep);
    const opL = op * (e.side < 0 ? 1 : 1 - e.wink * 0.95), opR = op * (e.side > 0 ? 1 : 1 - e.wink * 0.95);
    const drawEye = (x, y, o) => {
      if (o < 0.16) {
        const w = R * 0.105, dd = R * 0.07 * (1 - closed * 0.5) * Math.max(0.2, 1 - o * 3);
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.4, R * 0.038); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x - w, y - dd * 0.4); ctx.quadraticCurveTo(x, y + dd * 1.6, x + w, y - dd * 0.4); ctx.stroke();
      } else face.eye(x, y, R * 0.085, R * 0.115, { closed: 1 - o * (1 - closed), happy: happy && e.wink < 0.4, color: INK, lid: LID, sleepyArc: true });
    };
    drawEye(fx0 - R * 0.15, fy, opL);
    drawEye(fx0 + R * 0.15, fy, opR);
    // 嘴：说话时张合、开心是大弯、想事情是一撇、睡着是一个小圈（都在 face.mouth 里按心情分的）
    face.mouth(fx0, fy + R * 0.28, R, { happy, yawn, color: INK, w: 0.07 });
    ctx.restore();                                           // ①

    // ── 想事情：三颗星绕着月牙上方转
    if (e.think > 0.02) {
      for (let i = 0; i < 3; i++) {
        const ang = S.t * 0.9 + i * TAU / 3;
        const sx = mx - R * 0.1 + Math.cos(ang) * R * 0.78, sy = my - R * 1.14 + Math.sin(ang) * R * 0.24;
        star(ctx, sx, sy, R * 0.09 * (0.78 + 0.22 * Math.sin(ang)), ang, e.think * (0.6 + 0.35 * Math.sin(ang)), "#FFF3CC", TAU, "rgba(186,130,44,0.6)");
      }
    }
    // ── 开心 / 被摸时冒出来的小星星（最多十颗）
    for (const p of e.stars) star(ctx, p.x, p.y, p.sz, p.rot, Math.min(1, p.life * 1.7) * 0.95, "#FFF6DC", TAU, "rgba(198,142,52,0.5)");

    if (S.mood === "reading") face.book(mx - R * 0.42, baseY + R * 0.66, R, "#FFF8E8", "#C9A465");
    face.parts({ heart: "#F0A8B4", z: "#C9A465", dot: "#D9B36A", note: "#D9B36A" });
  }
});

// 一颗四角小星（八个点，一条路径画完）；edge 是给浅色底上加的一圈描边
function star(ctx, x, y, r, rot, alpha, color, TAU, edge) {
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.34 : r, a = i / 8 * TAU; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(0.8, r * 0.16); ctx.lineJoin = "round"; ctx.stroke(); }
  ctx.restore();
}
