import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";
const DEF = withTaps(SKIN_DEFAULTS.robot, "robot");
// 小机器人：圆角的小铁盒，脸是一块屏幕，眼睛是两道青光。
export const makeRobot = makeVectorSkin({
  ...DEF, character: DEF,
  rK: 0.21, baseYK: 0.62, hit: [1.25, 1.25, 0.05],
  draw(ctx, g, S, face, X) {
    const { R, cx, cy } = g; const { TAU, happy, closed, yawn, stretch } = X;
    const base = cy + R * 0.95;
    ctx.fillStyle = "rgba(30,30,50,0.22)"; ctx.beginPath(); ctx.ellipse(cx, base + R * 0.1, R * 0.95, R * 0.13, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(cx, base); ctx.rotate(S.tilt + S.look.x * 0.03); ctx.scale(S.squash * (1 + stretch * 0.05), (1 / S.squash) * (1 - stretch * 0.04)); ctx.translate(-cx, -base);
    // 天线
    const antY = cy - R * 1.05, blink = Math.sin(S.t * 3) > 0.6 || S.mood === "thinking";
    ctx.strokeStyle = "#7C8699"; ctx.lineWidth = Math.max(2, R * 0.05); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, cy - R * 0.85); ctx.lineTo(cx + Math.sin(S.t * 1.5) * R * 0.05, antY); ctx.stroke();
    ctx.save(); ctx.shadowColor = "#22E7FF"; ctx.shadowBlur = blink ? 14 : 4; ctx.fillStyle = blink ? "#7FF3FF" : "#2FB9CF"; ctx.beginPath(); ctx.arc(cx + Math.sin(S.t * 1.5) * R * 0.05, antY - R * 0.05, R * 0.08, 0, TAU); ctx.fill(); ctx.restore();
    // 身体
    const bw = R * 1.7, bh = R * 1.7, bx = cx - bw / 2, by = base - bh;
    const body = ctx.createLinearGradient(bx, by, bx + bw, by + bh); body.addColorStop(0, "#D5DBE8"); body.addColorStop(1, "#9AA3B8");
    ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, R * 0.32); ctx.fill();
    ctx.strokeStyle = "rgba(70,80,100,0.45)"; ctx.lineWidth = Math.max(1, R * 0.025); ctx.stroke();
    // 履带脚
    ctx.fillStyle = "#4D5568"; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.roundRect(cx + sgn * R * 0.55 - R * 0.22, base - R * 0.06 + (S.carried ? Math.sin(S.t * 9) * sgn * R * 0.06 : 0), R * 0.44, R * 0.2, R * 0.08); ctx.fill(); }
    // 屏幕
    const sw = R * 1.3, sh = R * 0.95, sx0 = cx - sw / 2, sy0 = by + R * 0.22;
    ctx.fillStyle = "#151A2B"; ctx.beginPath(); ctx.roundRect(sx0, sy0, sw, sh, R * 0.16); ctx.fill();
    const sg = ctx.createLinearGradient(sx0, sy0, sx0, sy0 + sh); sg.addColorStop(0, "rgba(255,255,255,0.10)"); sg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect(sx0, sy0, sw, sh, R * 0.16); ctx.fill();
    // 眼睛：两道青光
    const lx = S.look.x * R * 0.08, ly = S.look.y * R * 0.05, ey = sy0 + sh * 0.42 + ly;
    const cl = Math.max(closed, yawn > 0.3 ? 1 : 0);
    ctx.save(); ctx.shadowColor = "#22E7FF"; ctx.shadowBlur = 10 + S.pet.amt * 8; ctx.fillStyle = "#4FEFFF";
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * R * 0.32 + lx;
      if (cl > 0.85) { ctx.beginPath(); ctx.roundRect(ex - R * 0.14, ey - R * 0.02, R * 0.28, R * 0.04, R * 0.02); ctx.fill(); }
      else if (happy) { ctx.strokeStyle = "#4FEFFF"; ctx.lineWidth = R * 0.05; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ex - R * 0.13, ey + R * 0.06); ctx.lineTo(ex, ey - R * 0.06); ctx.lineTo(ex + R * 0.13, ey + R * 0.06); ctx.stroke(); }
      else { ctx.beginPath(); ctx.roundRect(ex - R * 0.14, ey - R * 0.09 * (1 - cl), R * 0.28, R * 0.18 * (1 - cl), R * 0.05); ctx.fill(); }
    }
    // 嘴：说话是波形，想事情是三个点，平时一条小线
    const my = sy0 + sh * 0.78;
    ctx.strokeStyle = "#4FEFFF"; ctx.lineWidth = Math.max(1.5, R * 0.035); ctx.lineCap = "round"; ctx.beginPath();
    if (S.talking || S.mouthLevel > 0.05) { const n = 9; for (let i = 0; i <= n; i++) { const x = cx - R * 0.35 + (i / n) * R * 0.7; const y = my + Math.sin(S.t * 30 + i * 1.7) * R * (0.03 + S.mouthLevel * 0.12); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    else if (S.mood === "thinking") { for (let i = -1; i <= 1; i++) { ctx.globalAlpha = 0.4 + 0.6 * (Math.sin(S.t * 5 - i) > 0.3 ? 1 : 0); ctx.beginPath(); ctx.arc(cx + i * R * 0.16 + lx, my, R * 0.035, 0, TAU); ctx.fillStyle = "#4FEFFF"; ctx.fill(); } ctx.globalAlpha = 1; }
    else if (S.mood === "sleepy") { ctx.moveTo(cx - R * 0.08 + lx, my); ctx.lineTo(cx + R * 0.08 + lx, my); ctx.stroke(); }
    else { const w = happy ? R * 0.2 : R * 0.12; ctx.moveTo(cx - w + lx, my - R * 0.02); ctx.quadraticCurveTo(cx + lx, my + R * (happy ? 0.09 : 0.04), cx + w + lx, my - R * 0.02); ctx.stroke(); }
    ctx.restore(); ctx.restore();
    if (S.mood === "reading") face.book(cx, base - R * 0.02, R, "#EEF2FF", "#7C8699");
    face.parts({ heart: "#FF7BAC", z: "#7C8699", dot: "#22E7FF", note: "#22E7FF" });
  }
});
