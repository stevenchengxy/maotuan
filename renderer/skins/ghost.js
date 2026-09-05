import { makeVectorSkin } from "./vectorBase.js";
// 小幽灵：软软的、半透明、裙边一直在飘。
export const makeGhost = makeVectorSkin({
  rK: 0.22, baseYK: 0.56, float: true, noHop: true, hit: [1.15, 1.35, 0.15],
  draw(ctx, g, S, face, X) {
    const { R, cx, cy } = g; const { TAU, happy, closed, yawn } = X;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(S.tilt + S.look.x * 0.06 + (S.carried ? Math.sin(S.t * 6) * 0.05 : 0)); ctx.scale(S.squash, 1 / S.squash); ctx.translate(-cx, -cy);
    ctx.shadowColor = "rgba(180,170,255,0.9)"; ctx.shadowBlur = 22 + S.pet.amt * 14;
    const alpha = 0.92 - (S.pet.amt > 0.5 ? 0.25 : 0);
    ctx.globalAlpha = alpha;
    // 身体：圆头 + 波浪裙边
    ctx.beginPath();
    ctx.arc(cx, cy - R * 0.1, R, Math.PI, 0);
    const hemY = cy + R * 0.95, n = 5;
    ctx.lineTo(cx + R, hemY - R * 0.15);
    for (let i = 0; i < n; i++) { const x0 = cx + R - (i / n) * 2 * R, x1 = cx + R - ((i + 1) / n) * 2 * R; const wave = Math.sin(S.t * 3 + i * 1.3) * R * 0.08; ctx.quadraticCurveTo((x0 + x1) / 2, hemY + R * 0.18 + wave, x1, hemY - R * 0.15 + (i % 2 ? wave * 0.5 : 0)); }
    ctx.closePath();
    const grad = ctx.createLinearGradient(cx, cy - R * 1.1, cx, hemY); grad.addColorStop(0, "#FFFFFF"); grad.addColorStop(1, "#DCD5F5");
    ctx.fillStyle = grad; ctx.fill();
    ctx.shadowBlur = 0;
    // 脸
    const lx = S.look.x * R * 0.1, ly = S.look.y * R * 0.06, fy = cy - R * 0.1 + ly;
    face.blush(cx - R * 0.5 + lx, fy + R * 0.22, R, 0.22 + (happy ? 0.3 : 0), "#E9A7C0");
    face.blush(cx + R * 0.5 + lx, fy + R * 0.22, R, 0.22 + (happy ? 0.3 : 0), "#E9A7C0");
    const cl = Math.max(closed, yawn > 0.3 ? Math.min(1, (yawn - 0.3) * 2.5) : 0);
    for (const sgn of [-1, 1]) face.eye(cx + sgn * R * 0.32 + lx, fy, R * 0.1, R * 0.15, { closed: cl, happy, color: "#3A3350", lid: "#EDE8FF", sleepyArc: S.mood === "sleepy" || yawn > 0.3 });
    face.mouth(cx + lx, fy + R * 0.32, R, { happy, yawn, color: "#3A3350", w: 0.07 });
    ctx.globalAlpha = 1;
    ctx.restore();
    if (S.mood === "reading") face.book(cx, cy + R * 0.55, R, "#FFFFFF", "#A9A0D0");
    face.parts({ heart: "#E9A7C0", z: "#A9A0D0", dot: "#A9A0D0", note: "#A9A0D0" });
  },
  tick(S, dt, g, H) { if (Math.random() < dt * 0.25) H.spawn("bubble", 1, g.cx + (Math.random() - 0.5) * g.R * 1.5, g.cy + g.R); }
});
