import { makeVectorSkin } from "./vectorBase.js";
import { makeFx } from "./fx2d.js";
import { HEROES } from "./heroCatalog.js";

// 英雄皮肤：Q 版、两头身、粗描边的原创设计（致敬漫威，不是漫威素材）。
// 身体用 vectorBase 的骨架（眨眼 / 看鼠标 / 蹦 / 小动作），特效走 fx2d，反应表在 heroCatalog.js。
const TAU = Math.PI * 2;
const INK = "#1E1A24";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function outline(ctx, R, k = 0.05) { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.4, R * k); ctx.lineJoin = "round"; ctx.lineCap = "round"; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function fs(ctx, color) { ctx.fillStyle = color; ctx.fill(); ctx.stroke(); }
function limb(ctx, x1, y1, x2, y2, w, color) { ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = w + Math.max(2.5, w * 0.28); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function glowCircle(ctx, x, y, r, color, a = 1) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore(); }
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// 姿势：手的位置、头的歪斜、整体旋转……各英雄再加自己的
function poseOf(HS, g, S) {
  const { R } = g; const k = HS.pose ? clamp(HS.poseT / Math.max(0.001, HS.poseDur), 0, 1) : 0; const p = HS.pose || "";
  const arc = Math.sin(Math.min(1, k) * Math.PI);           // 0→1→0
  const o = { handL: { x: -0.85 * R, y: 0.55 * R }, handR: { x: 0.85 * R, y: 0.55 * R }, headTilt: 0, headDy: 0, rot: 0, squat: 0, alpha: 1, k, arc, name: p };
  if (p === "repulsor" || p === "cast" || p === "shoot" || p === "raise" || p === "point") o.handR = { x: 1.05 * R, y: p === "raise" ? -1.9 * R : p === "point" ? -0.2 * R : -1.05 * R };
  if (p === "raise") o.handL = { x: -0.95 * R, y: 0.2 * R };
  if (p === "flex") { o.handL = { x: -1.05 * R, y: -0.85 * R }; o.handR = { x: 1.05 * R, y: -0.85 * R }; }
  if (p === "smash") { const up = k < 0.45; const kk = up ? ease(k / 0.45) : 1 - ease((k - 0.45) / 0.55); o.handL = { x: -0.7 * R, y: 0.9 * R - 2.0 * R * kk }; o.handR = { x: 0.7 * R, y: 0.9 * R - 2.0 * R * kk }; o.headDy = up ? -0.1 * R * kk : 0.12 * R * (1 - kk); o.squat = up ? 0 : 0.18 * (1 - kk); }
  if (p === "sag" || p === "sulk" || p === "storm") { o.headTilt = 0.18; o.headDy = 0.14 * R; o.handL = { x: -0.8 * R, y: 0.75 * R }; o.handR = { x: 0.8 * R, y: 0.75 * R }; }
  if (p === "shrug") { o.handL = { x: -1.05 * R, y: 0.05 * R }; o.handR = { x: 1.05 * R, y: 0.05 * R }; o.headTilt = 0.12; }
  if (p === "crouch") o.squat = 0.35 * (k < 0.3 ? ease(k / 0.3) : 1);
  if (p === "hang") { const inn = clamp(k * 6, 0, 1), out = clamp((1 - k) * 6, 0, 1); o.rot = Math.PI * Math.min(inn, out); o.hang = Math.min(inn, out); }
  if (p === "flip") o.rot = -TAU * ease(k);
  if (p === "vanish") o.alpha = 1 - arc;
  if (p === "bow") { o.headDy = 0.16 * R * arc; o.headTilt = 0.1 * arc; o.handR = { x: 0.6 * R, y: 0.1 * R }; }
  if (p === "swing") o.swing = k * TAU * 2;
  if (p === "guard") { o.handR = { x: 0.7 * R, y: -0.3 * R }; o.handL = { x: -0.95 * R, y: 0.1 * R }; }
  if (p === "fly") { o.handL = { x: -0.9 * R, y: -0.2 * R }; o.handR = { x: 0.9 * R, y: -0.2 * R }; }
  if (p === "clones") o.clones = arc;
  return o;
}

// 共用的两头身身体：腿 → 躯干 → 手臂 → 头（头由各英雄自己画）
function humanoid(ctx, g, S, X, HS, C, hooks) {
  const { cx, cy, R } = g; const P = poseOf(HS, g, S);
  ctx.save();
  if (P.alpha < 1) ctx.globalAlpha *= Math.max(0, P.alpha);
  // 整体旋转（倒挂 / 翻跟头）绕身体中心
  if (P.rot) { ctx.translate(cx, cy - 0.3 * R); ctx.rotate(P.rot); ctx.translate(-cx, -(cy - 0.3 * R)); }
  if (P.hang) { ctx.strokeStyle = "#F4F4F4"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy + 1.3 * R); ctx.lineTo(cx, cy + 1.3 * R + 400); ctx.stroke(); }
  const squat = P.squat + (S.squash > 1 ? (S.squash - 1) * 0.6 : 0);
  const feetY = cy + 1.3 * R, hipY = cy + 0.55 * R - squat * 0.3 * R;
  const bodyTilt = S.tilt || 0;
  ctx.translate(cx, cy); ctx.rotate(bodyTilt); ctx.translate(-cx, -cy);
  hooks.back && hooks.back(ctx, g, P);
  // 腿
  outline(ctx, R);
  const legW = C.legW || 0.34 * R, sep = 0.3 * R * (1 + squat * 0.8);
  for (const sgn of [-1, 1]) {
    limb(ctx, cx + sgn * sep * 0.8, hipY, cx + sgn * sep, feetY - 0.16 * R, legW, C.leg);
    rr(ctx, cx + sgn * sep - legW * 0.62, feetY - 0.3 * R, legW * 1.24, 0.3 * R, 0.09 * R); fs(ctx, C.boot || C.leg);
  }
  // 躯干
  const tw = C.torsoW || 0.62 * R, tTop = cy - 0.35 * R + squat * 0.25 * R, tBot = hipY + 0.12 * R;
  rr(ctx, cx - tw, tTop, tw * 2, tBot - tTop, 0.25 * R); fs(ctx, C.torso);
  hooks.torso && hooks.torso(ctx, g, P, { tTop, tBot, tw });
  // 手臂
  const sh = { y: tTop + 0.18 * R };
  for (const [sgn, hand] of [[-1, P.handL], [1, P.handR]]) {
    const sx = cx + sgn * tw * 0.9, sy = sh.y; const hx = cx + hand.x, hy = cy + hand.y;
    limb(ctx, sx, sy, hx, hy, C.armW || 0.28 * R, C.arm || C.torso);
    outline(ctx, R); ctx.beginPath(); ctx.arc(hx, hy, (C.armW || 0.28 * R) * 0.62, 0, TAU); fs(ctx, C.hand || C.arm || C.torso);
    hooks.hand && hooks.hand(ctx, g, P, sgn, hx, hy);
  }
  // 头
  const hx = cx + S.look.x * R * 0.05, hy = cy - 1.0 * R + P.headDy + (X.stretch ? -X.stretch * 0.1 * R : 0);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(P.headTilt + (S.tilt || 0) * 0.5);
  hooks.head(ctx, g, P, 0, 0);
  ctx.restore();
  hooks.front && hooks.front(ctx, g, P);
  ctx.restore();
  return P;
}
// 眼睛的通用变形：眨眼 / 开心 / 睡觉
function lidState(S, X) { return { closed: X.closed, happy: X.happy, sleepy: S.mood === "sleepy" }; }

/* ---------- 钢铁侠：红金战甲 ---------- */
function drawIron(ctx, g, S, X, HS, fx) {
  const { R } = g; const red = "#C8102E", dark = "#A50D26", gold = "#F2B134", gold2 = "#D9952A", glow = "#9FE9FF";
  const pulse = 0.55 + 0.45 * Math.sin(HS.t * 3) + (HS.pose === "glow" ? 0.6 : 0) + S.mouthLevel * 0.5 + S.pet.amt * 0.4;
  const C = { torso: red, leg: red, boot: gold, arm: red, hand: gold, armW: 0.3 * R };
  humanoid(ctx, g, S, X, HS, C, {
    torso(ctx, g, P, T) {
      const { cx } = g; outline(ctx, R, 0.04);
      ctx.beginPath(); ctx.moveTo(cx - T.tw * 0.7, T.tTop + 0.02 * R); ctx.lineTo(cx + T.tw * 0.7, T.tTop + 0.02 * R); ctx.lineTo(cx + T.tw * 0.35, T.tTop + 0.75 * R); ctx.lineTo(cx - T.tw * 0.35, T.tTop + 0.75 * R); ctx.closePath(); fs(ctx, gold);
      ctx.strokeStyle = gold2; ctx.lineWidth = Math.max(1, R * 0.03); for (let i = 0; i < 2; i++) { const y = T.tTop + 0.85 * R + i * 0.14 * R; ctx.beginPath(); ctx.moveTo(cx - T.tw * 0.5, y); ctx.lineTo(cx + T.tw * 0.5, y); ctx.stroke(); }
      const ry = T.tTop + 0.36 * R;
      glowCircle(ctx, cx, ry, R * 0.5 * (0.8 + pulse * 0.3), glow, 0.45 * Math.min(1, pulse));
      outline(ctx, R, 0.04); ctx.beginPath(); ctx.arc(cx, ry, R * 0.2, 0, TAU); fs(ctx, "#E9FBFF");
      ctx.fillStyle = glow; ctx.globalAlpha = 0.5 + 0.5 * Math.min(1, pulse); ctx.beginPath(); ctx.arc(cx, ry, R * 0.12, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    },
    hand(ctx, g, P, sgn, hx, hy) {
      if (sgn === 1 && (P.name === "repulsor" || P.name === "fly")) { glowCircle(ctx, hx, hy, R * 0.55 * (0.7 + 0.3 * Math.sin(HS.t * 30)), glow, 0.9); ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(hx, hy, R * 0.1, 0, TAU); ctx.fill(); }
      if (P.name === "fly" && sgn === -1) glowCircle(ctx, hx, hy, R * 0.4, glow, 0.7);
    },
    head(ctx, g, P) {
      const { closed, happy, sleepy } = lidState(S, X); const hr = 0.78 * R;
      outline(ctx, R); rr(ctx, -hr, -hr * 1.02, hr * 2, hr * 2.02, hr * 0.62); fs(ctx, red);
      rr(ctx, -hr * 0.66, -hr * 0.72, hr * 1.32, hr * 1.6, hr * 0.42); fs(ctx, gold);
      ctx.strokeStyle = gold2; ctx.lineWidth = Math.max(1, R * 0.03); ctx.beginPath(); ctx.moveTo(-hr * 0.5, hr * 0.55); ctx.lineTo(hr * 0.5, hr * 0.55); ctx.stroke();
      const ex = S.look.x * hr * 0.08, ey = S.look.y * hr * 0.06, eh = hr * 0.22 * (1 - closed * 0.9) * (sleepy ? 0.25 : 1);
      for (const sgn of [-1, 1]) {
        const x = sgn * hr * 0.33 + ex, y = -hr * 0.12 + ey;
        ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = sleepy ? 2 : 14; ctx.fillStyle = sleepy ? "#BFEFFF" : "#F4FDFF";
        ctx.beginPath(); if (happy) { ctx.ellipse(x, y + eh * 0.2, hr * 0.24, Math.max(1.2, eh * 0.7), sgn * -0.25, 0, TAU); } else ctx.roundRect(x - hr * 0.24, y - eh / 2, hr * 0.48, Math.max(1.5, eh), eh / 2); ctx.fill(); ctx.restore();
      }
      const mo = S.talking || S.mouthLevel > 0.05 ? Math.max(0.03, S.mouthLevel) : 0; ctx.fillStyle = INK;
      rr(ctx, -hr * 0.22, hr * 0.28, hr * 0.44, Math.max(2, hr * (0.05 + mo * 0.2)), hr * 0.03); ctx.fill();
    }
  });
  if (S.hop > 0 && S.hop < 1 && Math.random() < 0.6) fx.rise("ember", 1, { at: "feet", speed: 1.3, spread: R * 0.4 });
}

/* ---------- 蜘蛛侠：红蓝紧身衣 ---------- */
function drawSpider(ctx, g, S, X, HS, fx) {
  const { R } = g; const red = "#D32F2F", blue = "#1E4DB7", web = "rgba(30,26,36,0.55)";
  const C = { torso: red, leg: blue, boot: red, arm: red, hand: red, armW: 0.27 * R, legW: 0.32 * R };
  const webLines = (ctx, x, y, r, n = 6, arcs = 2) => { ctx.save(); ctx.strokeStyle = web; ctx.lineWidth = Math.max(0.8, R * 0.022); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); } for (let j = 1; j <= arcs; j++) { const rr2 = r * j / (arcs + 0.3); ctx.beginPath(); ctx.arc(x, y, rr2, -Math.PI * 1.1, Math.PI * 0.1); ctx.stroke(); } ctx.restore(); };
  humanoid(ctx, g, S, X, HS, C, {
    torso(ctx, g, P, T) {
      const { cx } = g; ctx.save(); ctx.beginPath(); ctx.roundRect(cx - T.tw, T.tTop, T.tw * 2, T.tBot - T.tTop, 0.25 * R); ctx.clip();
      ctx.fillStyle = blue; ctx.fillRect(cx - T.tw, T.tTop + 0.55 * R, T.tw * 0.35, R); ctx.fillRect(cx + T.tw * 0.65, T.tTop + 0.55 * R, T.tw * 0.35, R);
      webLines(ctx, cx, T.tTop - 0.05 * R, R * 1.1, 7, 3);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(cx, T.tTop + 0.4 * R, R * 0.08, R * 0.14, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, R * 0.03); for (const sgn of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx, T.tTop + 0.34 * R + i * 0.06 * R); ctx.lineTo(cx + sgn * R * 0.22, T.tTop + 0.24 * R + i * 0.1 * R); ctx.stroke(); }
      ctx.restore();
    },
    head(ctx, g, P) {
      const { closed, happy, sleepy } = lidState(S, X); const hr = 0.78 * R;
      outline(ctx, R); ctx.beginPath(); ctx.ellipse(0, 0, hr, hr * 1.02, 0, 0, TAU); fs(ctx, red);
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, hr, hr * 1.02, 0, 0, TAU); ctx.clip(); webLines(ctx, 0, -hr * 0.55, hr * 1.9, 9, 3); ctx.restore();
      const squint = S.mood === "thinking" ? 0.5 : 1, wide = HS.pose === "shrug" || HS.pose === "crouch" ? 1.15 : 1;
      const lh = hr * 0.5 * squint * wide * (1 - closed * 0.85) * (sleepy ? 0.2 : 1), lw = hr * 0.36;
      const ex = S.look.x * hr * 0.07, ey = S.look.y * hr * 0.05;
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(sgn * hr * 0.38 + ex, -hr * 0.05 + ey); ctx.rotate(sgn * 0.35);
        outline(ctx, R, 0.05); ctx.beginPath(); ctx.moveTo(0, -lh); ctx.quadraticCurveTo(lw * 1.1, -lh * 0.4, lw * 0.5, lh * 0.9); ctx.quadraticCurveTo(0, lh * 1.1, -lw * 0.6, lh * 0.5); ctx.quadraticCurveTo(-lw * 0.9, -lh * 0.5, 0, -lh); ctx.closePath(); fs(ctx, "#FFFFFF");
        if (happy) { ctx.fillStyle = red; ctx.beginPath(); ctx.ellipse(0, lh * 0.95, lw * 1.2, lh * 0.5, 0, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      if (S.talking || S.mouthLevel > 0.05) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, hr * 0.5, hr * 0.14, hr * (0.02 + S.mouthLevel * 0.12), 0, 0, TAU); ctx.fill(); }
    }
  });
}

/* ---------- 绿巨人：大块头 ---------- */
function drawHulk(ctx, g, S, X, HS, fx) {
  const { cx, cy, R } = g; const green = "#4CAF50", dark = "#2E7D32", purple = "#6A1B9A", hair = "#1B1B1F";
  const P = poseOf(HS, g, S);
  ctx.save();
  const squat = P.squat + (S.squash > 1 ? (S.squash - 1) * 0.6 : 0);
  const breath = Math.sin(HS.t * 1.6) * 0.03 * R;
  ctx.translate(cx, cy); ctx.rotate(S.tilt || 0); ctx.translate(-cx, -cy);
  const feetY = cy + 1.3 * R, hipY = cy + 0.5 * R;
  outline(ctx, R);
  // 腿（粗）、紫裤子
  for (const sgn of [-1, 1]) { limb(ctx, cx + sgn * 0.42 * R, hipY, cx + sgn * 0.55 * R, feetY - 0.12 * R, 0.5 * R, green); rr(ctx, cx + sgn * 0.55 * R - 0.34 * R, feetY - 0.22 * R, 0.68 * R, 0.22 * R, 0.1 * R); fs(ctx, dark); }
  rr(ctx, cx - 0.95 * R, hipY - 0.35 * R, 1.9 * R, 0.55 * R, 0.14 * R); fs(ctx, purple);
  ctx.fillStyle = "#4A148C"; for (const [dx, w] of [[-0.6, 0.18], [0.1, 0.22], [0.55, 0.15]]) ctx.fillRect(cx + dx * R, hipY + 0.05 * R, w * R, 0.15 * R);
  // 躯干（宽）+ 肩
  const tTop = cy - 0.45 * R + breath, tw = 1.05 * R;
  outline(ctx, R); rr(ctx, cx - tw, tTop, tw * 2, hipY - tTop + 0.05 * R, 0.4 * R); fs(ctx, green);
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, R * 0.035); ctx.beginPath(); ctx.moveTo(cx, tTop + 0.25 * R); ctx.lineTo(cx, hipY - 0.35 * R); ctx.stroke();
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sgn * 0.42 * R, tTop + 0.35 * R, 0.28 * R, sgn < 0 ? Math.PI * 0.2 : Math.PI * 0.8, sgn < 0 ? Math.PI * 0.8 : Math.PI * 1.8); ctx.stroke(); }
  // 手臂（很粗）
  for (const [sgn, hand] of [[-1, P.handL], [1, P.handR]]) {
    const hx = cx + hand.x * 1.25, hy = cy + hand.y; const sx = cx + sgn * tw * 0.85, sy = tTop + 0.25 * R;
    limb(ctx, sx, sy, hx, hy, 0.5 * R, green);
    outline(ctx, R); ctx.beginPath(); ctx.arc(hx, hy, 0.34 * R, 0, TAU); fs(ctx, green);
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, R * 0.03); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hx + i * 0.1 * R, hy - 0.28 * R); ctx.lineTo(hx + i * 0.1 * R, hy - 0.05 * R); ctx.stroke(); }
  }
  // 头（相对小，压在肩膀里）
  const hx = cx + S.look.x * R * 0.04, hy = tTop - 0.32 * R + P.headDy; const hr = 0.6 * R;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(P.headTilt + (S.tilt || 0) * 0.5);
  outline(ctx, R); ctx.beginPath(); ctx.ellipse(0, 0, hr * 0.98, hr * 1.02, 0, 0, TAU); fs(ctx, green);
  // 头发
  ctx.beginPath(); ctx.moveTo(-hr * 0.98, -hr * 0.1); ctx.quadraticCurveTo(-hr * 0.9, -hr * 1.2, -hr * 0.2, -hr * 1.05); ctx.quadraticCurveTo(hr * 0.2, -hr * 1.35, hr * 0.5, -hr * 1.0); ctx.quadraticCurveTo(hr * 1.05, -hr * 1.0, hr * 0.98, -hr * 0.15); ctx.quadraticCurveTo(hr * 0.6, -hr * 0.55, hr * 0.1, -hr * 0.45); ctx.quadraticCurveTo(-hr * 0.5, -hr * 0.5, -hr * 0.98, -hr * 0.1); ctx.closePath(); fs(ctx, hair);
  const { closed, happy, sleepy } = lidState(S, X); const calm = HS.pose === "calm" || happy;
  const ex = S.look.x * hr * 0.08, ey = S.look.y * hr * 0.06;
  for (const sgn of [-1, 1]) {
    const x = sgn * hr * 0.36 + ex, y = -hr * 0.05 + ey; const eh = hr * 0.2 * (1 - closed * 0.9) * (sleepy ? 0.15 : 1);
    ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.ellipse(x, y, hr * 0.2, Math.max(1, eh), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1B5E20"; ctx.beginPath(); ctx.arc(x + ex * 0.5, y, Math.min(hr * 0.09, Math.max(1, eh * 0.7)), 0, TAU); ctx.fill();
    // 眉毛：平时压着，摸它时放松
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, hr * 0.12); ctx.beginPath(); const by = y - hr * 0.3, ang = calm ? -0.05 : 0.55; ctx.moveTo(x - sgn * hr * 0.25, by - Math.sin(ang) * hr * 0.15 * (calm ? 0 : 1)); ctx.lineTo(x + sgn * hr * 0.28, by + (calm ? -hr * 0.08 : hr * 0.1)); ctx.stroke();
  }
  // 嘴：咧着，说话张开
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, hr * 0.08); ctx.beginPath();
  if (S.talking || S.mouthLevel > 0.05) { ctx.fillStyle = INK; ctx.roundRect(-hr * 0.3, hr * 0.35, hr * 0.6, hr * (0.08 + S.mouthLevel * 0.3), hr * 0.06); ctx.fill(); }
  else if (calm) { ctx.arc(0, hr * 0.3, hr * 0.32, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  else { ctx.moveTo(-hr * 0.32, hr * 0.5); ctx.quadraticCurveTo(0, hr * 0.3, hr * 0.32, hr * 0.5); ctx.stroke(); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * hr * 0.14, hr * 0.38); ctx.lineTo(i * hr * 0.14, hr * 0.48); ctx.stroke(); } }
  ctx.restore();
  ctx.restore();
}

/* ---------- 洛基：金角、绿披风、权杖 ---------- */
function drawLoki(ctx, g, S, X, HS, fx) {
  const { cx, cy, R } = g; const green = "#1B5E20", green2 = "#2E7D32", gold = "#D4AF37", skin = "#F3E3D3", hair = "#1B1B1F", gem = "#5FC9F5";
  const C = { torso: green, leg: "#1E2A1E", boot: gold, arm: green2, hand: skin, armW: 0.26 * R };
  const draw = (ctx, alphaScale) => humanoid(ctx, g, S, X, HS, C, {
    back(ctx, g, P) { // 披风
      const wave = Math.sin(HS.t * 2.2) * 0.06 * R; outline(ctx, R, 0.04);
      ctx.beginPath(); ctx.moveTo(cx - 0.7 * R, cy - 0.3 * R); ctx.quadraticCurveTo(cx - 1.15 * R + wave, cy + 0.6 * R, cx - 0.95 * R + wave, cy + 1.25 * R); ctx.lineTo(cx + 0.95 * R - wave, cy + 1.25 * R); ctx.quadraticCurveTo(cx + 1.15 * R - wave, cy + 0.6 * R, cx + 0.7 * R, cy - 0.3 * R); ctx.closePath(); fs(ctx, green2);
    },
    torso(ctx, g, P, T) {
      ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1, R * 0.04); ctx.beginPath(); ctx.moveTo(cx - T.tw * 0.55, T.tTop + 0.05 * R); ctx.lineTo(cx, T.tTop + 0.5 * R); ctx.lineTo(cx + T.tw * 0.55, T.tTop + 0.05 * R); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, T.tTop + 0.5 * R); ctx.lineTo(cx, T.tBot - 0.05 * R); ctx.stroke();
      outline(ctx, R, 0.04); rr(ctx, cx - T.tw * 0.95, T.tBot - 0.22 * R, T.tw * 1.9, 0.14 * R, 0.05 * R); fs(ctx, gold);
    },
    hand(ctx, g, P, sgn, hx, hy) {
      if (sgn !== 1) return;   // 权杖在右手
      const up = P.name === "cast" || P.name === "clones"; const len = 1.5 * R; const ang = up ? -Math.PI / 2 : -Math.PI / 2 + 0.25;
      const tx = hx + Math.cos(ang) * len, ty = hy + Math.sin(ang) * len;
      ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, R * 0.12); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(hx - Math.cos(ang) * 0.3 * R, hy - Math.sin(ang) * 0.3 * R); ctx.lineTo(tx, ty); ctx.stroke(); ctx.strokeStyle = gold; ctx.lineWidth = Math.max(2, R * 0.07); ctx.stroke();
      const gl = 0.5 + 0.5 * Math.sin(HS.t * 4) + (up ? 0.6 : 0); glowCircle(ctx, tx, ty, R * 0.35 * (0.8 + gl * 0.4), gem, 0.7 * Math.min(1, gl));
      outline(ctx, R, 0.04); ctx.beginPath(); ctx.moveTo(tx, ty - 0.2 * R); ctx.lineTo(tx + 0.13 * R, ty); ctx.lineTo(tx, ty + 0.2 * R); ctx.lineTo(tx - 0.13 * R, ty); ctx.closePath(); fs(ctx, gem); ctx.restore();
    },
    head(ctx, g, P) {
      const { closed, happy, sleepy } = lidState(S, X); const hr = 0.74 * R;
      // 角（在头后面）
      outline(ctx, R, 0.045);
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sgn * hr * 0.45, -hr * 0.7); ctx.quadraticCurveTo(sgn * hr * 1.35, -hr * 1.05, sgn * hr * 1.05, -hr * 2.05); ctx.quadraticCurveTo(sgn * hr * 0.95, -hr * 1.35, sgn * hr * 0.2, -hr * 0.95); ctx.closePath(); fs(ctx, gold); }
      ctx.beginPath(); ctx.ellipse(0, 0, hr, hr * 1.04, 0, 0, TAU); fs(ctx, skin);
      // 头盔 + 头发
      ctx.beginPath(); ctx.moveTo(-hr * 1.02, -hr * 0.2); ctx.quadraticCurveTo(-hr * 0.8, -hr * 1.15, 0, -hr * 1.1); ctx.quadraticCurveTo(hr * 0.8, -hr * 1.15, hr * 1.02, -hr * 0.2); ctx.lineTo(hr * 0.8, -hr * 0.35); ctx.quadraticCurveTo(0, -hr * 0.75, -hr * 0.8, -hr * 0.35); ctx.closePath(); fs(ctx, gold);
      ctx.beginPath(); ctx.moveTo(-hr * 0.98, -hr * 0.1); ctx.quadraticCurveTo(-hr * 0.9, -hr * 0.55, -hr * 0.5, -hr * 0.55); ctx.lineTo(-hr * 0.55, hr * 0.4); ctx.quadraticCurveTo(-hr * 1.05, hr * 0.3, -hr * 0.98, -hr * 0.1); ctx.closePath(); fs(ctx, hair);
      ctx.beginPath(); ctx.moveTo(hr * 0.98, -hr * 0.1); ctx.quadraticCurveTo(hr * 0.9, -hr * 0.55, hr * 0.5, -hr * 0.55); ctx.lineTo(hr * 0.55, hr * 0.4); ctx.quadraticCurveTo(hr * 1.05, hr * 0.3, hr * 0.98, -hr * 0.1); ctx.closePath(); fs(ctx, hair);
      const ex = S.look.x * hr * 0.08, ey = S.look.y * hr * 0.06;
      for (const sgn of [-1, 1]) {
        const x = sgn * hr * 0.35 + ex, y = -hr * 0.02 + ey; const eh = hr * 0.19 * (1 - closed * 0.9) * (sleepy ? 0.15 : 1);
        ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.ellipse(x, y, hr * 0.19, Math.max(1, eh), 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2E7D32"; ctx.beginPath(); ctx.ellipse(x + ex * 0.4, y, hr * 0.09, Math.max(1, eh * 0.75), 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, hr * 0.07); ctx.beginPath(); ctx.moveTo(x - sgn * hr * 0.2, y - hr * 0.3); ctx.lineTo(x + sgn * hr * 0.22, y - hr * 0.22 + (happy ? -hr * 0.03 : 0)); ctx.stroke();   // 斜眉
      }
      // 坏笑：一边翘
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, hr * 0.07); ctx.beginPath();
      if (S.talking || S.mouthLevel > 0.05) { ctx.fillStyle = INK; ctx.ellipse(hr * 0.08, hr * 0.5, hr * 0.15, hr * (0.02 + S.mouthLevel * 0.12), 0, 0, TAU); ctx.fill(); }
      else { ctx.moveTo(-hr * 0.22, hr * 0.52); ctx.quadraticCurveTo(hr * 0.05, hr * 0.62, hr * 0.32, hr * (HS.pose === "smirk" || happy ? 0.38 : 0.45)); ctx.stroke(); }
    }
  });
  const P = poseOf(HS, g, S);
  if (P.clones) { for (const sgn of [-1, 1]) { ctx.save(); ctx.globalAlpha = 0.45 * P.clones; ctx.translate(sgn * 1.35 * R * P.clones, 0); draw(ctx); ctx.restore(); } }
  draw(ctx);
}

/* ---------- 雷神：披风、翼盔、大锤 ---------- */
function drawThor(ctx, g, S, X, HS, fx) {
  const { cx, cy, R } = g; const cape = "#B71C1C", armor = "#B0BEC5", armor2 = "#78909C", skin = "#F6DCC4", hairC = "#F3D27A", blue = "#1E63C9";
  const C = { torso: armor, leg: "#37474F", boot: armor2, arm: armor2, hand: skin, armW: 0.28 * R };
  humanoid(ctx, g, S, X, HS, C, {
    back(ctx, g, P) { const wave = Math.sin(HS.t * 2) * 0.07 * R + (S.hop > 0 ? 0.1 * R : 0); outline(ctx, R, 0.04); ctx.beginPath(); ctx.moveTo(cx - 0.72 * R, cy - 0.32 * R); ctx.quadraticCurveTo(cx - 1.25 * R + wave, cy + 0.5 * R, cx - 1.0 * R + wave, cy + 1.3 * R); ctx.lineTo(cx + 1.0 * R - wave, cy + 1.3 * R); ctx.quadraticCurveTo(cx + 1.25 * R - wave, cy + 0.5 * R, cx + 0.72 * R, cy - 0.32 * R); ctx.closePath(); fs(ctx, cape); },
    torso(ctx, g, P, T) { outline(ctx, R, 0.04); for (const sgn of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx + sgn * T.tw * 0.45, T.tTop + 0.25 * R + i * 0.3 * R, 0.11 * R, 0, TAU); fs(ctx, armor2); } rr(ctx, cx - T.tw * 0.95, T.tBot - 0.2 * R, T.tw * 1.9, 0.14 * R, 0.05 * R); fs(ctx, "#8D6E63"); },
    hand(ctx, g, P, sgn, hx, hy) {
      if (sgn !== 1) return;   // 锤子在右手
      const up = P.name === "raise"; const ang = P.swing !== undefined ? P.swing : up ? -Math.PI / 2 : -Math.PI / 2 + 0.35;
      const len = 0.9 * R; const tx = hx + Math.cos(ang) * len, ty = hy + Math.sin(ang) * len;
      ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, R * 0.13); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(hx - Math.cos(ang) * 0.25 * R, hy - Math.sin(ang) * 0.25 * R); ctx.lineTo(tx, ty); ctx.stroke(); ctx.strokeStyle = "#8D6E63"; ctx.lineWidth = Math.max(2, R * 0.08); ctx.stroke();
      ctx.translate(tx, ty); ctx.rotate(ang + Math.PI / 2); outline(ctx, R, 0.045); rr(ctx, -0.42 * R, -0.24 * R, 0.84 * R, 0.48 * R, 0.07 * R); fs(ctx, armor); ctx.strokeStyle = armor2; ctx.lineWidth = Math.max(1, R * 0.03); ctx.strokeRect(-0.3 * R, -0.14 * R, 0.6 * R, 0.28 * R);
      if (up) { glowCircle(ctx, 0, 0, R * 0.6, "#FFF7B0", 0.7 + 0.3 * Math.sin(HS.t * 25)); }
      ctx.restore();
    },
    head(ctx, g, P) {
      const { closed, happy, sleepy } = lidState(S, X); const hr = 0.76 * R;
      outline(ctx, R, 0.045);
      // 长发（后）
      ctx.beginPath(); ctx.moveTo(-hr * 0.95, -hr * 0.3); ctx.quadraticCurveTo(-hr * 1.25, hr * 0.6, -hr * 0.85, hr * 1.2); ctx.lineTo(hr * 0.85, hr * 1.2); ctx.quadraticCurveTo(hr * 1.25, hr * 0.6, hr * 0.95, -hr * 0.3); ctx.closePath(); fs(ctx, hairC);
      ctx.beginPath(); ctx.ellipse(0, 0, hr, hr * 1.04, 0, 0, TAU); fs(ctx, skin);
      // 胡子
      ctx.beginPath(); ctx.moveTo(-hr * 0.62, hr * 0.28); ctx.quadraticCurveTo(-hr * 0.5, hr * 1.0, 0, hr * 0.98); ctx.quadraticCurveTo(hr * 0.5, hr * 1.0, hr * 0.62, hr * 0.28); ctx.quadraticCurveTo(hr * 0.3, hr * 0.42, 0, hr * 0.4); ctx.quadraticCurveTo(-hr * 0.3, hr * 0.42, -hr * 0.62, hr * 0.28); ctx.closePath(); fs(ctx, hairC);
      // 翼盔
      ctx.beginPath(); ctx.moveTo(-hr * 1.02, -hr * 0.15); ctx.quadraticCurveTo(-hr * 0.9, -hr * 1.15, 0, -hr * 1.12); ctx.quadraticCurveTo(hr * 0.9, -hr * 1.15, hr * 1.02, -hr * 0.15); ctx.lineTo(hr * 0.85, -hr * 0.3); ctx.quadraticCurveTo(0, -hr * 0.55, -hr * 0.85, -hr * 0.3); ctx.closePath(); fs(ctx, armor);
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sgn * hr * 0.75, -hr * 0.55); ctx.quadraticCurveTo(sgn * hr * 1.35, -hr * 0.9, sgn * hr * 1.25, -hr * 1.6); ctx.quadraticCurveTo(sgn * hr * 1.0, -hr * 1.15, sgn * hr * 0.45, -hr * 0.95); ctx.closePath(); fs(ctx, "#ECEFF1"); }
      const ex = S.look.x * hr * 0.08, ey = S.look.y * hr * 0.06;
      for (const sgn of [-1, 1]) {
        const x = sgn * hr * 0.36 + ex, y = -hr * 0.02 + ey; const eh = hr * 0.2 * (1 - closed * 0.9) * (sleepy ? 0.15 : 1);
        ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.ellipse(x, y, hr * 0.2, Math.max(1, eh), 0, 0, TAU); ctx.fill();
        ctx.fillStyle = blue; ctx.beginPath(); ctx.ellipse(x + ex * 0.4, y, hr * 0.1, Math.max(1, eh * 0.75), 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#C9A85A"; ctx.lineWidth = Math.max(1.5, hr * 0.08); ctx.beginPath(); ctx.moveTo(x - hr * 0.22, y - hr * 0.3); ctx.lineTo(x + hr * 0.22, y - hr * 0.3 - (HS.pose === "storm" ? sgn * hr * 0.06 : 0)); ctx.stroke();
      }
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, hr * 0.07); ctx.beginPath();
      if (S.talking || S.mouthLevel > 0.05) { ctx.fillStyle = INK; ctx.ellipse(0, hr * 0.52, hr * 0.16, hr * (0.02 + S.mouthLevel * 0.12), 0, 0, TAU); ctx.fill(); }
      else if (happy || HS.pose === "smile") { ctx.arc(0, hr * 0.42, hr * 0.26, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
      else { ctx.moveTo(-hr * 0.2, hr * 0.55); ctx.lineTo(hr * 0.2, hr * 0.55); ctx.stroke(); }
    }
  });
}

/* ---------- 贾维斯：全息核心 + 光环 ---------- */
function drawJarvis(ctx, g, S, X, HS, fx) {
  const { cx, cy, R } = g; const cyan = "#4FC3F7", deep = "#0B2B3A", white = "#FFFFFF";
  const P = poseOf(HS, g, S);
  const alert = HS.pose === "alert", fast = HS.pose === "compute" || HS.pose === "whirl" || S.mood === "thinking", dim = S.mood === "sleepy";
  const col = alert ? "#FF6B6B" : cyan;
  const spd = fast ? 6 : 1.2, r0 = R * 0.62;
  const y0 = cy - 0.45 * R + (S.tilt || 0) * 10;
  const bright = (HS.pose === "bright" ? 0.5 : 0) + S.pet.amt * 0.4 + S.mouthLevel * 0.4;
  const jit = alert ? (Math.random() - 0.5) * 3 : 0;
  ctx.save(); ctx.translate(jit, 0);
  ctx.globalAlpha = dim ? 0.55 : 1;
  // 底座光
  glowCircle(ctx, cx, cy + 1.25 * R, R * 0.9, col, 0.25);
  ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.ellipse(cx, cy + 1.25 * R, R * 0.8, R * 0.22, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = dim ? 0.55 : 1;
  // 核心光晕
  glowCircle(ctx, cx, y0, r0 * 1.9, col, 0.35 + bright * 0.4);
  // 外圈（虚线、反向转）
  const expand = HS.pose === "expand" ? 1 + P.arc * 0.5 : 1;
  ctx.lineWidth = 1.6; ctx.strokeStyle = col;
  for (const [rr2, dir, dash] of [[r0 * 1.55 * expand, 1, [12, 9]], [r0 * 1.3 * expand, -1.6, [3, 7]]]) { ctx.save(); ctx.translate(cx, y0); ctx.rotate(HS.t * spd * dir * 0.5); ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(0, 0, rr2, 0, TAU); ctx.stroke(); ctx.restore(); }
  // 轨道点
  const dots = fast ? 6 : 3; for (let i = 0; i < dots; i++) { const a = HS.t * spd * 0.9 + i / dots * TAU; ctx.fillStyle = white; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r0 * 1.55 * expand, y0 + Math.sin(a) * r0 * 1.55 * expand * 0.35, 2.2, 0, TAU); ctx.fill(); }
  // 倾斜的环（后半）
  const tilt = 0.9; const ringR = r0 * 1.15 * expand;
  const ringArc = (from, to) => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = from + (to - from) * i / 40 + HS.t * spd * 0.7; const x = cx + Math.cos(a) * ringR, y = y0 + Math.sin(a) * ringR * Math.sin(tilt) * 0.55; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); };
  ctx.lineWidth = 2.2; ctx.strokeStyle = col; ctx.globalAlpha *= 0.7; ringArc(Math.PI, TAU); ctx.globalAlpha = dim ? 0.55 : 1;
  // 核心球
  const grd = ctx.createRadialGradient(cx - r0 * 0.3, y0 - r0 * 0.3, r0 * 0.1, cx, y0, r0); grd.addColorStop(0, "#1E5A73"); grd.addColorStop(1, deep);
  ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, y0, r0, 0, TAU); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  // 扫描线
  ctx.save(); ctx.beginPath(); ctx.arc(cx, y0, r0, 0, TAU); ctx.clip(); const sy = y0 - r0 + ((HS.t * (HS.pose === "scan" ? 120 : 30)) % (r0 * 2)); ctx.fillStyle = col; ctx.globalAlpha *= 0.25; ctx.fillRect(cx - r0, sy, r0 * 2, 3); ctx.globalAlpha = dim ? 0.55 : 1;
  // 眼睛：两道弧光
  const { closed, happy } = lidState(S, X); const eh = r0 * 0.16 * (1 - closed * 0.9) * (dim ? 0.3 : 1);
  ctx.strokeStyle = white; ctx.lineWidth = Math.max(2, r0 * 0.09); ctx.lineCap = "round"; ctx.shadowColor = col; ctx.shadowBlur = 8;
  for (const sgn of [-1, 1]) { const x = cx + sgn * r0 * 0.34 + S.look.x * r0 * 0.12, y = y0 - r0 * 0.12 + S.look.y * r0 * 0.1; ctx.beginPath(); if (happy) { ctx.arc(x, y + r0 * 0.1, r0 * 0.17, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } else { ctx.fillStyle = white; ctx.roundRect(x - r0 * 0.1, y - Math.max(1.5, eh * 1.6), r0 * 0.2, Math.max(3, eh * 3.2), r0 * 0.1); ctx.fill(); } }
  // 声波：说话时
  const amp = (S.talking || S.mouthLevel > 0.03) ? 0.15 + S.mouthLevel * 0.5 : 0.04;
  ctx.beginPath(); for (let i = 0; i <= 30; i++) { const x = cx - r0 * 0.55 + i / 30 * r0 * 1.1; const y = y0 + r0 * 0.4 + Math.sin(i * 0.9 + HS.t * 18) * r0 * amp * Math.sin(i / 30 * Math.PI); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  ctx.restore();
  // 环（前半）
  ctx.lineWidth = 2.2; ctx.strokeStyle = col; ringArc(0, Math.PI);
  ctx.restore();
}

const DRAW = { iron: drawIron, spider: drawSpider, hulk: drawHulk, loki: drawLoki, thor: drawThor, jarvis: drawJarvis };

export function makeHero(id) {
  const def = HEROES[id];
  return function (canvas, opts = {}) {
    const HS = { pose: null, poseT: 0, poseDur: 0, t: 0 };
    let geomRef = null, timers = [], lastPet = 0;
    const getGeom = () => { const g = geomRef ? geomRef() : { cx: 150, cy: 170, R: 57 }; const P = poseOf(HS, g, { look: { x: 0, y: 0 } }); const headY = def.kind === "jarvis" ? g.cy - 0.45 * g.R : def.kind === "hulk" ? g.cy - 1.1 * g.R : g.cy - 1.0 * g.R; return { ...g, head: { x: g.cx, y: headY }, chest: { x: g.cx, y: g.cy + 0.15 * g.R }, feet: { x: g.cx, y: g.cy + 1.3 * g.R }, handR: { x: g.cx + P.handR.x * (def.kind === "hulk" ? 1.25 : 1), y: g.cy + P.handR.y }, handL: { x: g.cx + P.handL.x, y: g.cy + P.handL.y } }; };
    const fx = makeFx(getGeom);
    const base = makeVectorSkin({
      rK: def.rK || 0.19, baseYK: def.baseYK || 0.5, hit: def.hit || [1.15, 1.7, -0.25], float: def.kind === "jarvis",
      tick(S, dt) { HS.t += dt; if (HS.pose) { HS.poseT += dt; if (HS.poseT >= HS.poseDur) HS.pose = null; } fx.tick(dt); },
      draw(ctx, g, S, face, X) {
        const sh = fx.shakeOffset(); ctx.save(); ctx.translate(sh.x, sh.y);
        fx.drawLayers(ctx, true);
        DRAW[def.kind](ctx, g, S, X, HS, fx);
        fx.drawParts(ctx); fx.drawLayers(ctx, false);
        ctx.restore();
      }
    })(canvas, opts);
    geomRef = base.geometry;
    function setPose(name, ms) { HS.pose = name; HS.poseT = 0; HS.poseDur = ms / 1000; }
    function run(steps, ctxArg) {
      let t = 0;
      for (const st of steps || []) {
        t += st.delay || 0;
        const go = () => { if (st.pose) setPose(st.pose[0], st.pose[1] || 1000); if (st.fx) fx.run(st.fx, ctxArg); if (st.hop) base.S.hop = 1.0001; if (st.spin) base.spin(); if (st.squash) base.S.squash = 1 + st.squash * 0.2; };
        if (t) timers.push(setTimeout(go, t)); else go();
      }
    }
    function react(event, ctxArg) { const steps = (def.react || {})[event]; if (steps) run(steps, ctxArg); return !!steps; }
    return {
      ...base,
      react, lines: def.lines || null, character: def,
      spawn: (kind, n = 1) => fx.burst(kind === "z" ? "zzz" : kind, n, { at: "head", speed: 50 }),
      poke: () => { base.S.pet.amt = 1; if (!react("poke")) base.poke(); },
      petAt: (x, y) => { base.petAt(x, y); const now = performance.now(); if (now - lastPet > 2600) { lastPet = now; react("pet"); } },
      land: k => { base.land(k); react("land", { k }); },
      spin: () => { base.spin(); react("spin"); },
      destroy: () => { for (const t of timers) clearTimeout(t); base.destroy(); }
    };
  };
}
