import { makeVectorSkin } from "./vectorBase.js";
// 史莱姆：果冻一样、亮亮的、会晃。
export const makeSlime = makeVectorSkin({
  rK: 0.24, baseYK: 0.64, hit: [1.25, 1.0, 0.1],
  draw(ctx, g, S, face, X) {
    const { R, cx, cy } = g; const { TAU, happy, closed, yawn, stretch } = X;
    const jig = S.jiggle * 0.08;
    const sx = S.squash * (1 + stretch * 0.1) * (1 + jig), sy = (1 / S.squash) * (1 - stretch * 0.07) * (1 - jig);
    const base = cy + R * 0.75;
    // 影子
    ctx.fillStyle = "rgba(40,60,40,0.18)"; ctx.beginPath(); ctx.ellipse(cx, base + R * 0.06, R * 1.05, R * 0.14, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(cx, base); ctx.rotate(S.tilt + S.look.x * 0.03); ctx.scale(sx, sy); ctx.translate(-cx, -base);
    // 身体：一坨圆顶，边缘带一点透明
    const wob = a => 1 + 0.04 * Math.sin(a * 3 + S.t * 2.2) + 0.03 * Math.sin(a * 5 - S.t * 1.7);
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) { const a = Math.PI + (i / 90) * Math.PI; const rr = R * 1.15 * wob(a); const x = cx + Math.cos(a) * rr, y = base + Math.sin(a) * rr * 0.92; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.quadraticCurveTo(cx + R * 1.2, base + R * 0.1, cx + R * 0.9, base + R * 0.12);
    ctx.lineTo(cx - R * 0.9, base + R * 0.12);
    ctx.quadraticCurveTo(cx - R * 1.2, base + R * 0.1, cx - R * 1.15, base);
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx - R * 0.35, base - R * 0.9, R * 0.1, cx, base - R * 0.3, R * 1.3);
    grad.addColorStop(0, "#B9F2B4"); grad.addColorStop(0.5, "#79DB86"); grad.addColorStop(1, "#3E9E52");
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = "rgba(40,110,60,0.35)"; ctx.lineWidth = Math.max(1, R * 0.02); ctx.stroke();
    // 高光
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.ellipse(cx - R * 0.45, base - R * 0.85, R * 0.22, R * 0.12, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(cx - R * 0.15, base - R * 0.98, R * 0.05, 0, TAU); ctx.fill();
    // 脸
    const lx = S.look.x * R * 0.08, ly = S.look.y * R * 0.05, fy = base - R * 0.45 + ly;
    face.blush(cx - R * 0.55 + lx, fy + R * 0.18, R, 0.18 + (happy ? 0.3 : 0), "#6BC27A");
    face.blush(cx + R * 0.55 + lx, fy + R * 0.18, R, 0.18 + (happy ? 0.3 : 0), "#6BC27A");
    const cl = Math.max(closed, yawn > 0.3 ? Math.min(1, (yawn - 0.3) * 2.5) : 0);
    for (const sgn of [-1, 1]) face.eye(cx + sgn * R * 0.32 + lx, fy, R * 0.09, R * 0.12, { closed: cl, happy, color: "#1F3A2A", lid: "#79DB86", sleepyArc: S.mood === "sleepy" || yawn > 0.3 });
    face.mouth(cx + lx, fy + R * 0.28, R, { happy, yawn, color: "#1F3A2A" });
    ctx.restore();
    if (S.mood === "reading") face.book(cx, base - R * 0.05, R, "#F3FFF3", "#5D9C6B");
    face.parts({ heart: "#FF8FA3", z: "#6B9A73", dot: "#6B9A73", note: "#5D9C6B" });
  }
});
