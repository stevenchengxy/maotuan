import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";
const DEF = withTaps(SKIN_DEFAULTS.moon, "moon");

// 小月：一盏月牙小夜灯。奶油色的月牙（大圆减小圆），脸在内凹的那一侧，
// 平时闭着眼睡着，身下一小片会慢慢变形的云托着它，周身一圈会呼吸的暖光。
export const makeMoon = makeVectorSkin({
  ...DEF, character: DEF,
  rK: 0.20, baseYK: 0.54, headK: 0.55, float: true, noHop: true, hit: [1.15, 1.25, 0.12],

  // 自己的状态：睁眼程度、单眼偷看、想事情的淡入、开心时的小星星
  tick(S, dt, g) {
    const e = S.extra;
    if (e.open === undefined) { e.open = 0; e.wink = 0; e.side = -1; e.think = 0; e.stars = []; }
    const glad = S.mood === "happy";
    // 默认是闭着的（它本来就在睡），只有被碰、开心、想事情、说话时才睁开
    let want = 0;
    if (S.mood === "sleepy") want = 0;
    else if (glad) want = 1;
    else if (S.mood === "thinking" || S.mood === "reading") want = 0.92;
    else if (S.pet.amt > 0.02) want = Math.min(1, S.pet.amt * 1.8);
    else if (S.talking || S.mouthLevel > 0.05) want = 0.6;
    e.open += (want - e.open) * Math.min(1, dt * 5);
    // 被点到时只睁一只：睁靠近你手的那只
    const peek = (S.pet.amt > 0.02 && !glad && S.mood === "idle") ? 1 : 0;
    if (peek && S.pet.amt > 0.5) e.side = S.pet.x < g.cx - g.R * 0.41 ? -1 : 1;   // 脸心大约在这儿
    e.wink += (peek - e.wink) * Math.min(1, dt * 6);
    e.think += ((S.mood === "thinking" ? 1 : 0) - e.think) * Math.min(1, dt * 3);
    // 开心时周身慢慢冒小星星
    if ((glad || S.pet.amt > 0.15) && e.stars.length < 12 && Math.random() < dt * 7) {
      const a = Math.random() * Math.PI * 2, rr = g.R * (0.85 + Math.random() * 0.5);
      e.stars.push({ x: g.cx + g.R * 0.22 + Math.cos(a) * rr, y: g.cy + Math.sin(a) * rr * 0.95, vx: (Math.random() - 0.5) * 14, vy: -10 - Math.random() * 16, life: 1, sz: g.R * (0.05 + Math.random() * 0.05), rot: Math.random() * 3 });
    }
    if (e.stars.length) { for (const p of e.stars) { p.life -= dt * 0.75; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 8 * dt; p.rot += dt * 1.2; } e.stars = e.stars.filter(p => p.life > 0); }
  },

  draw(ctx, g, S, face, X) {
    const { R, cx, cy, baseY } = g; const { TAU, happy, closed, yawn, stretch } = X;
    const e = S.extra;
    if (e.open === undefined) { e.open = 0; e.wink = 0; e.side = -1; e.think = 0; e.stars = []; }
    const ink = "#6E4A1E";
    // 比骨架的浮动更慢的一层：整个人非常缓地上下飘。月牙偏左，整体右移一点才压在云中间
    const my = cy + Math.sin(S.t * 0.33) * R * 0.07, mx = cx + R * 0.22;
    // 光晕的呼吸：慢慢亮慢慢暗；被摸 / 开心时亮一下，说话时一闪一闪，睡着时最暗
    const halo = Math.max(0.12, Math.min(1.15,
      0.42 + 0.16 * Math.sin(S.t * 0.7) + S.pet.amt * 0.35 + (happy ? 0.18 : 0)
      + (S.talking || S.mouthLevel > 0.05 ? (0.10 + S.mouthLevel * 0.30) * (0.6 + 0.4 * Math.sin(S.t * 14)) : 0)
      - (S.mood === "sleepy" ? 0.14 : 0)));

    // ── 云：托在身下，几个圆的半径各自周期变化，飘得比月牙慢
    const cyc = baseY + R * 1.02 + Math.sin(S.t * 0.25) * R * 0.035, cxc = cx + Math.sin(S.t * 0.18) * R * 0.05;
    ctx.save();
    ctx.shadowColor = "rgba(70,80,130,0.30)"; ctx.shadowBlur = R * 0.3; ctx.shadowOffsetY = R * 0.06;
    ctx.beginPath();
    const lobes = [[-0.84, 0.06, 0.32], [-0.42, -0.13, 0.44], [0.04, -0.20, 0.48], [0.48, -0.09, 0.41], [0.86, 0.07, 0.30]];
    for (let i = 0; i < lobes.length; i++) {
      const [dx, dy, r] = lobes[i], rr = r * R * (1 + 0.15 * Math.sin(S.t * 0.6 + i * 1.7));   // 每个圆的半径各自慢慢涨落
      ctx.moveTo(cxc + dx * R + rr, cyc + dy * R);
      ctx.arc(cxc + dx * R, cyc + dy * R, rr, 0, TAU);
    }
    ctx.moveTo(cxc + R * 0.98, cyc + R * 0.06); ctx.ellipse(cxc, cyc + R * 0.06, R * 0.98, R * 0.2, 0, 0, TAU);
    const cg = ctx.createLinearGradient(0, cyc - R * 0.6, 0, cyc + R * 0.28);
    cg.addColorStop(0, "#FFF6E4"); cg.addColorStop(0.55, "#ECEDF8"); cg.addColorStop(1, "#CFD5EC");
    ctx.fillStyle = cg; ctx.fill();
    ctx.restore();

    // ── 暖光晕（用径向渐变，不用 filter）
    const gr = ctx.createRadialGradient(mx, my, R * 0.25, mx, my, R * 2.05);
    gr.addColorStop(0, `rgba(255,216,140,${0.50 * halo})`);
    gr.addColorStop(0.42, `rgba(255,198,118,${0.20 * halo})`);
    gr.addColorStop(1, "rgba(255,190,110,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(mx, my, R * 2.05, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(S.tilt + S.look.x * 0.05 + Math.sin(S.t * 0.4) * 0.02 + (happy ? Math.sin(S.t * 7) * 0.045 : 0) + (S.carried ? Math.sin(S.t * 6) * 0.05 : 0));
    ctx.scale(S.squash * (1 + stretch * 0.04), (1 / S.squash) * (1 - stretch * 0.03));
    ctx.translate(-mx, -my);

    // ── 月牙：大圆 A 减去偏右上的小圆 B，只取两条真正的边（外弧 + 内凹弧）
    const phi = -0.18, r2 = 0.90 * R, d = 0.58 * R;
    const ux = Math.cos(phi), uy = Math.sin(phi);
    const bx = mx + ux * d, by = my + uy * d;                       // 被减掉那个圆的圆心
    const a = (d * d + R * R - r2 * r2) / (2 * d), h = Math.sqrt(Math.max(0, R * R - a * a));
    const beta = Math.atan2(h, a), gamma = Math.atan2(h, a - d);
    const crescent = () => {
      ctx.beginPath();
      ctx.arc(mx, my, R, phi + beta, phi - beta + TAU, false);       // 外圈：绕远的那半
      ctx.arc(bx, by, r2, phi - gamma, phi + gamma, true);           // 内凹：靠近的那段
      ctx.closePath();
    };
    ctx.save();
    ctx.shadowColor = "rgba(255,203,116,0.95)"; ctx.shadowBlur = R * (0.26 + halo * 0.34);
    crescent();
    const bg = ctx.createLinearGradient(mx - R, my - R, mx + R * 0.4, my + R);
    bg.addColorStop(0, "#FFFCEE"); bg.addColorStop(0.45, "#FFE9B4"); bg.addColorStop(1, "#F2C674");
    ctx.fillStyle = bg; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(146,98,28,0.38)"; ctx.lineWidth = Math.max(1, R * 0.022); crescent(); ctx.stroke();

    // ── 脸：在内凹侧那块最厚的地方
    const lx = S.look.x * R * 0.10, ly = S.look.y * R * 0.07;
    const fx0 = mx - R * 0.63 + lx, fy = my + R * 0.06 + ly;
    // 月面上的两个浅坑 + 腮红，都裁在月牙里，不会漏到外面
    ctx.save(); crescent(); ctx.clip();
    ctx.fillStyle = "rgba(214,164,86,0.22)";
    ctx.beginPath(); ctx.ellipse(mx - R * 0.30, my - R * 0.68, R * 0.11, R * 0.085, 0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(mx - R * 0.56, my + R * 0.62, R * 0.08, R * 0.06, -0.2, 0, TAU); ctx.fill();
    const bk = 0.16 + (happy ? 0.30 : 0) + S.pet.amt * 0.2;
    face.blush(fx0 - R * 0.26, fy + R * 0.16, R, bk, "#EE9E76");
    face.blush(fx0 + R * 0.26, fy + R * 0.16, R, bk, "#EE9E76");
    ctx.restore();

    // 眼睛：默认是两道弯弯的睡眼（眨眼会让它压得更平），睁开时换成会看人的眼珠
    const op = e.open * (1 - yawn) * (S.mood === "sleepy" ? 0 : 1);
    const opL = op * (e.side < 0 ? 1 : 1 - e.wink * 0.95), opR = op * (e.side > 0 ? 1 : 1 - e.wink * 0.95);
    const drawEye = (x, y, o) => {
      if (o < 0.16) {
        const w = R * 0.12, dd = R * 0.075 * (1 - closed * 0.5) * Math.max(0.2, 1 - o * 3);
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.6, R * 0.045); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x - w, y - dd * 0.4); ctx.quadraticCurveTo(x, y + dd * 1.6, x + w, y - dd * 0.4); ctx.stroke();
      } else face.eye(x, y, R * 0.09, R * 0.125, { closed: 1 - o * (1 - closed), happy: happy && e.wink < 0.4, color: ink, lid: "#FFE9B4", sleepyArc: true });
    };
    drawEye(fx0 - R * 0.185, fy, opL);
    drawEye(fx0 + R * 0.185, fy, opR);
    // 嘴：说话时张合、开心是大弯、想事情是一撇、睡着是一个小圈
    face.mouth(fx0, fy + R * 0.30, R, { happy, yawn, color: ink, w: 0.07 });
    ctx.restore();

    // ── 想事情：几颗星绕着月牙转
    if (e.think > 0.02) {
      for (let i = 0; i < 3; i++) {
        const ang = S.t * 0.9 + i * TAU / 3;
        const sx = mx - R * 0.1 + Math.cos(ang) * R * 0.78, sy = my - R * 1.14 + Math.sin(ang) * R * 0.24;
        star(ctx, sx, sy, R * 0.09 * (0.78 + 0.22 * Math.sin(ang)), ang, e.think * (0.6 + 0.35 * Math.sin(ang)), "#FFF3CC", TAU, "rgba(186,130,44,0.6)");
      }
    }
    // ── 开心时冒出来的小星星
    for (const p of e.stars) star(ctx, p.x, p.y, p.sz, p.rot, Math.min(1, p.life * 1.7) * 0.95, "#FFF6DC", TAU, "rgba(198,142,52,0.5)");

    if (S.mood === "reading") face.book(mx - R * 0.2, baseY + R * 0.72, R, "#FFF8E8", "#C9A465");
    face.parts({ heart: "#F0A8B4", z: "#C9A465", dot: "#D9B36A", note: "#D9B36A" });
  }
});

// 一颗四角小星（八个点的路径，画一次只花一条路径）；edge 是给浅色底上加的一圈描边
function star(ctx, x, y, r, rot, alpha, color, TAU, edge) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.34 : r, a = i / 8 * TAU; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(0.8, r * 0.16); ctx.lineJoin = "round"; ctx.stroke(); }
  ctx.restore();
}
