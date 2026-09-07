import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";
const DEF = withTaps(SKIN_DEFAULTS.capsule, "capsule");
// 胶囊：立着的白胶囊小助理。腰上一圈深色的带子，上半身嵌一块黑面罩，
// 面罩里两只发青光的眼睛；头顶一片会转的雷达；两只不连手臂的悬浮小圆手跟着身体晃。
export const makeCapsule = makeVectorSkin({
  ...DEF, character: DEF,
  rK: 0.2, iconK: 0.3, baseYK: 0.6, headK: 0.65, hit: [1.1, 1.22, 0.02],

  // 心情做成平滑值，切换时不会跳；雷达角度、面罩涟漪也在这儿推进
  tick(S, dt, g, { spawn }) {
    const E = S.extra;
    if (!E.ready) { E.ready = 1; E.sleepK = 0; E.happyK = 0; E.thinkK = 0; E.radar = 0; E.turn = 0; E.petPrev = 0; E.ripples = []; }
    const to = (a, b, k) => a + (b - a) * Math.min(1, dt * k);
    E.sleepK = to(E.sleepK, S.mood === "sleepy" ? 1 : 0, 4);
    E.happyK = to(E.happyK, (S.mood === "happy" || S.pet.amt > 0.15) ? 1 : 0, 6);
    E.thinkK = to(E.thinkK, S.mood === "thinking" ? 1 : 0, 4);
    // 想事情转得快，困了几乎不转
    E.radar += dt * (1.1 + E.thinkK * 6.5 + E.happyK * 1.8 + (S.carried ? 3 : 0) - E.sleepK * 0.85);
    const turn = Math.floor(E.radar / 6.2832);
    if (turn !== E.turn) { E.turn = turn; if (S.mood === "thinking") spawn("dot", 1, g.cx + g.R * 0.3, g.cy - g.R * 1.2); }
    // 被摸一下，就在面罩上开一圈涟漪
    if (S.pet.amt > E.petPrev + 0.05 && E.ripples.length < 4) E.ripples.push({ x: S.pet.x, y: S.pet.y, t: 0 });
    E.petPrev = S.pet.amt;
    if (E.ripples.length) { for (const r of E.ripples) r.t += dt; E.ripples = E.ripples.filter(r => r.t < 0.85); }
  },

  draw(ctx, g, S, face, X) {
    const { R, cx, cy } = g; const { TAU, closed, yawn, stretch } = X;
    const E = S.extra, sleepK = E.sleepK || 0, thinkK = E.thinkK || 0, happyK = E.happyK || 0;
    const bounce = happyK * Math.abs(Math.sin(S.t * 7)) * R * 0.09;          // 开心时上下弹
    const base = cy + R;                                                      // 脚底那条线
    const bw = R * 1.32, bh = R * 2 * (1 - sleepK * 0.15) * (1 + stretch * 0.06);
    const bx = cx - bw / 2, by = base - bh;

    // 地上的影子：在空中就缩小变淡
    const air = Math.max(0, g.baseY - cy + bounce), sk = 1 - Math.min(0.45, air / R * 0.5);
    ctx.save(); ctx.globalAlpha = 0.22 * sk; ctx.fillStyle = "#1B2236";
    ctx.beginPath(); ctx.ellipse(cx, g.baseY + R * 1.02, R * 0.6 * sk, R * 0.11 * sk, 0, 0, TAU); ctx.fill(); ctx.restore();

    // 整体：待机轻轻左右摇，落地压扁，困了往下缩一截
    ctx.save();
    ctx.translate(cx, base);
    ctx.rotate(S.tilt + S.jiggle * 0.03 + S.look.x * 0.02 + Math.sin(S.t * 1.4) * 0.045 * (1 - sleepK));
    ctx.scale(S.squash * (1 + sleepK * 0.09 - stretch * 0.03), 1 / S.squash);
    ctx.translate(-cx, -base - bounce);

    // ---- 头顶的小雷达（先画，根部会被身体盖住）----
    const mastTop = by - R * 0.22, ra = E.radar || 0, rc = Math.cos(ra);
    ctx.strokeStyle = "#7F8A9E"; ctx.lineWidth = Math.max(1.6, R * 0.055); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, by + R * 0.08); ctx.lineTo(cx, mastTop); ctx.stroke();
    ctx.save(); ctx.translate(cx, mastTop - R * 0.01); ctx.rotate(Math.sin(ra) * 0.3);
    const blade = R * 0.2 * Math.abs(rc) + R * 0.05;                          // 转到正面时最宽，转到侧面收成一条
    const bg = ctx.createLinearGradient(-blade, 0, blade, 0);
    bg.addColorStop(0, rc > 0 ? "#79849A" : "#DDE4EF"); bg.addColorStop(1, rc > 0 ? "#DDE4EF" : "#79849A");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, blade, R * 0.09, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(48,58,80,0.5)"; ctx.lineWidth = Math.max(1, R * 0.02); ctx.stroke();
    ctx.shadowColor = "#5BEAF5"; ctx.shadowBlur = 7 + thinkK * 9;             // 片尖上的信号灯
    ctx.fillStyle = "#7FF0FF"; ctx.beginPath(); ctx.arc(rc * blade * 0.92, Math.sin(ra) * R * 0.03, R * 0.035, 0, TAU); ctx.fill();
    ctx.restore();

    // ---- 胶囊身体：上下半圆 + 中间直筒 ----
    const capsule = () => { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bw / 2); };
    ctx.save();
    ctx.shadowColor = "rgba(18,24,42,0.35)"; ctx.shadowBlur = R * 0.22; ctx.shadowOffsetY = R * 0.05;
    const body = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    body.addColorStop(0, "#FFFFFF"); body.addColorStop(0.55, "#F1F4F9"); body.addColorStop(1, "#C7CFDE");
    ctx.fillStyle = body; capsule(); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "rgba(58,70,94,0.45)"; ctx.lineWidth = Math.max(1, R * 0.028); capsule(); ctx.stroke();

    // 壳上的细节都夹在胶囊里画
    ctx.save(); capsule(); ctx.clip();
    const sheen = ctx.createLinearGradient(bx, 0, bx + bw * 0.45, 0);
    sheen.addColorStop(0, "rgba(255,255,255,0)"); sheen.addColorStop(0.5, "rgba(255,255,255,0.95)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen; ctx.fillRect(bx + bw * 0.08, by + bh * 0.05, bw * 0.34, bh * 0.9);
    const foot = ctx.createLinearGradient(0, base - bh * 0.18, 0, base);
    foot.addColorStop(0, "rgba(88,100,126,0)"); foot.addColorStop(1, "rgba(88,100,126,0.38)");
    ctx.fillStyle = foot; ctx.fillRect(bx, base - bh * 0.18, bw, bh * 0.18);
    // 腰带：上下沿顺着筒身往下弯，看着像一圈套在身上
    const bt = by + bh * 0.56, bbh = bh * 0.16, sag = bh * 0.04;
    const belt = ctx.createLinearGradient(0, bt, 0, bt + bbh);
    belt.addColorStop(0, "#4A5266"); belt.addColorStop(0.45, "#262C3B"); belt.addColorStop(1, "#3E4557");
    ctx.fillStyle = belt; ctx.beginPath();
    ctx.moveTo(bx - 1, bt); ctx.quadraticCurveTo(cx, bt + sag, bx + bw + 1, bt);
    ctx.lineTo(bx + bw + 1, bt + bbh); ctx.quadraticCurveTo(cx, bt + bbh + sag, bx - 1, bt + bbh);
    ctx.closePath(); ctx.fill(); ctx.restore();
    // 腰带上的小灯：说话时跟着声音闪，平时慢慢呼吸
    const talk = S.talking || S.mouthLevel > 0.05;
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, Math.min(1, (talk ? 0.5 + S.mouthLevel * 0.5 : 0.4 + 0.3 * Math.sin(S.t * 1.8) + happyK * 0.3) * (1 - sleepK * 0.6)));
    ctx.shadowColor = "#5BEAF5"; ctx.shadowBlur = 8; ctx.fillStyle = "#7FF0FF";
    ctx.beginPath(); ctx.arc(cx, bt + bbh * 0.5 + sag * 0.8, R * 0.045, 0, TAU); ctx.fill(); ctx.restore();

    // ---- 面罩：上半身一块黑色弧形玻璃 ----
    const vw = bw * 0.84, vh = bh * 0.36, vx = cx - vw / 2, vy = by + bh * 0.11;
    const visor = () => {
      ctx.beginPath();
      ctx.moveTo(vx, vy + vh * 0.42);
      ctx.quadraticCurveTo(vx, vy, cx, vy);
      ctx.quadraticCurveTo(vx + vw, vy, vx + vw, vy + vh * 0.42);
      ctx.quadraticCurveTo(vx + vw, vy + vh, cx, vy + vh);
      ctx.quadraticCurveTo(vx, vy + vh, vx, vy + vh * 0.42);
      ctx.closePath();
    };
    const vg = ctx.createLinearGradient(0, vy, 0, vy + vh);
    vg.addColorStop(0, "#232B3D"); vg.addColorStop(0.5, "#121724"); vg.addColorStop(1, "#0A0E18");
    ctx.fillStyle = vg; visor(); ctx.fill();
    ctx.strokeStyle = "rgba(122,136,164,0.4)"; ctx.lineWidth = Math.max(1, R * 0.02); ctx.stroke();

    ctx.save(); visor(); ctx.clip();
    ctx.globalAlpha = 0.1; ctx.fillStyle = "#FFFFFF";                          // 玻璃反光
    ctx.beginPath(); ctx.ellipse(cx - vw * 0.22, vy + vh * 0.18, vw * 0.34, vh * 0.2, -0.25, 0, TAU); ctx.fill();
    if (thinkK > 0.02) {                                                       // 想事情：一条扫描线上下走
      const sy = vy + ((S.t * 0.55) % 1) * vh;
      ctx.globalAlpha = 0.2 * thinkK; ctx.strokeStyle = "#7FF0FF"; ctx.lineWidth = Math.max(1, R * 0.02);
      ctx.beginPath(); ctx.moveTo(vx, sy); ctx.lineTo(vx + vw, sy); ctx.stroke();
    }
    for (const rp of E.ripples || []) {                                        // 被摸：面罩上一圈圈涟漪
      const k = rp.t / 0.85, rr = R * 0.06 + k * R * 0.9;
      ctx.globalAlpha = (1 - k) * 0.75; ctx.strokeStyle = "#7FF0FF"; ctx.lineWidth = Math.max(1, R * 0.045 * (1 - k));
      const px = Math.max(vx + vw * 0.15, Math.min(vx + vw * 0.85, rp.x)), py = Math.max(vy, Math.min(vy + vh, rp.y));
      ctx.beginPath(); ctx.ellipse(px, py, rr, rr * 0.8, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();

    // ---- 眼睛：两块青光圆角矩形；眨眼变一条线，困了变两条短线，开心变上弯的月牙 ----
    const cl = Math.max(closed, yawn > 0.3 ? Math.min(1, (yawn - 0.3) * 2.5) : 0);
    const lx = S.look.x * R * 0.09, ly = S.look.y * R * 0.05;
    const ew = R * 0.3 * (1 - sleepK * 0.42), eh = R * 0.155, ey = vy + vh * 0.44 + ly;
    ctx.save(); ctx.shadowColor = "#37E4F0"; ctx.shadowBlur = 9 + S.pet.amt * 10 + happyK * 6;
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * R * 0.29 + lx;
      if (happyK > 0.5 && cl < 0.6) {
        ctx.strokeStyle = "#6EEFF7"; ctx.lineWidth = Math.max(1.6, R * 0.055); ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(ex, ey + R * 0.06, ew * 0.55, Math.PI * 1.14, Math.PI * 1.86); ctx.stroke();
      } else {
        const hh = Math.max(R * 0.024, eh * (1 - cl) * (1 - sleepK * 0.8));
        ctx.fillStyle = "#5BEAF5"; ctx.beginPath(); ctx.roundRect(ex - ew / 2, ey - hh / 2, ew, hh, Math.min(hh / 2, R * 0.07)); ctx.fill();
        if (hh > R * 0.06) { ctx.fillStyle = "rgba(228,255,255,0.85)"; ctx.beginPath(); ctx.roundRect(ex - ew * 0.34, ey - hh * 0.3, ew * 0.3, hh * 0.26, hh * 0.12); ctx.fill(); }
      }
    }
    // ---- 嘴：面罩下沿的一小条光。说话是波形，想事情是三个点，困了一条暗线 ----
    const my = vy + vh * 0.8, mx = cx + lx;
    ctx.shadowBlur = 6; ctx.strokeStyle = "#5BEAF5"; ctx.fillStyle = "#5BEAF5";
    ctx.lineWidth = Math.max(1.4, R * 0.032); ctx.lineCap = "round";
    if (talk) {
      const n = 8; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const x = mx - R * 0.2 + (i / n) * R * 0.4, y = my + Math.sin(S.t * 28 + i * 1.7) * R * (0.02 + S.mouthLevel * 0.09); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    } else if (yawn > 0.25) { ctx.beginPath(); ctx.ellipse(mx, my, R * 0.05 + yawn * R * 0.03, R * 0.03 + yawn * R * 0.06, 0, 0, TAU); ctx.fill(); }
    else if (thinkK > 0.5) { for (let i = -1; i <= 1; i++) { ctx.globalAlpha = Math.sin(S.t * 5 - i) > 0.3 ? 1 : 0.35; ctx.beginPath(); ctx.arc(mx + i * R * 0.09, my, R * 0.028, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    else if (sleepK > 0.5) { ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(mx - R * 0.05, my); ctx.lineTo(mx + R * 0.05, my); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (happyK > 0.4) { ctx.beginPath(); ctx.moveTo(mx - R * 0.11, my - R * 0.02); ctx.quadraticCurveTo(mx, my + R * 0.06, mx + R * 0.11, my - R * 0.02); ctx.stroke(); }
    else { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(mx - R * 0.08, my); ctx.lineTo(mx + R * 0.08, my); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();

    // ---- 两只悬浮小圆手：不连手臂，比身体慢半拍地晃 ----
    const hr = R * 0.17, restY = base - bh * 0.42;
    for (const sgn of [-1, 1]) {
      const ph = S.t * 1.5 + (sgn > 0 ? 0.9 : 0);
      let hx = cx + sgn * (bw * 0.5 + R * 0.26 + Math.sin(ph) * R * 0.03);
      let hy = restY + Math.sin(ph * 1.1) * R * 0.06 + sleepK * R * 0.22 - stretch * R * 0.25;
      hx += sgn * happyK * R * 0.16;                                            // 开心：两只手举起来挥
      hy -= happyK * (R * 0.72 + Math.sin(S.t * 9 + sgn) * R * 0.08);
      if (thinkK > 0.01 && sgn < 0) {                                           // 想事情：一只手托着"下巴"
        hx += (cx - R * 0.32 - hx) * thinkK; hy += (vy + vh + R * 0.12 - hy) * thinkK;
      }
      if (S.carried) hy += Math.sin(S.t * 9 + sgn * 1.6) * R * 0.1;
      ctx.save(); ctx.shadowColor = "rgba(18,24,42,0.3)"; ctx.shadowBlur = R * 0.14; ctx.shadowOffsetY = R * 0.03;
      const hg = ctx.createRadialGradient(hx - hr * 0.35, hy - hr * 0.4, hr * 0.15, hx, hy, hr * 1.15);
      hg.addColorStop(0, "#FFFFFF"); hg.addColorStop(0.55, "#E4E9F2"); hg.addColorStop(1, "#A3AFC4");
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = "rgba(52,64,88,0.55)"; ctx.lineWidth = Math.max(1, R * 0.028);
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.stroke();
    }
    ctx.restore();

    if (S.mood === "reading") face.book(cx, cy + R * 0.35, R, "#F4F7FF", "#8A94A8");
    face.parts({ heart: "#FF7BAC", z: "#8A94A8", dot: "#5BEAF5", note: "#5BEAF5" });
  }
});
