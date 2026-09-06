import { makeVectorSkin } from "./vectorBase.js";

// 二次元 Q 版小人引擎：两头身，正面。发型 / 发色 / 瞳色 / 衣服 / 配饰都是参数。
// 坐标以头半径 R 为单位：头心在 (cx, cy)，身体在下面，脚底在 cy + 2.3R 附近。
export function makeChibi(def) {
  const C = Object.assign({
    skin: "#FFE3D0", skinDark: "#F2C7B0", hair: "#F5A3C7", hairDark: "#D67FA5", hairLight: "#FFD6E8",
    eye: "#E75480", eyeDark: "#8E2F52", lash: "#3A2B2E", ink: "#3A2B2E", blush: "#FF9BB0", mouth: "#C9556E",
    top: "#FFFFFF", topDark: "#E6E6EE", collar: "#5C7CC9", bottom: "#5C7CC9", shoes: "#4B3F47", accent: "#FF6F91", bell: "#F2C14E",
    hairStyle: "twin", bangs: "straight", gender: "f", extras: []
  }, def);
  const has = k => C.extras.includes(k);
  const TAU = Math.PI * 2;

  function drawHairBack(ctx, cx, hy, R, sway, pet) {
    ctx.fillStyle = C.hairDark;
    if (C.hairStyle === "twin") {
      for (const sgn of [-1, 1]) {
        const x0 = cx + sgn * R * 0.92, y0 = hy - R * 0.15;
        const s = sway * sgn + Math.sin(performance.now() / 700 + sgn) * R * 0.02;
        ctx.beginPath(); ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0 + sgn * R * 0.55 + s, y0 + R * 0.6, x0 + sgn * R * 0.35 + s * 1.5, y0 + R * 1.7, x0 + sgn * R * 0.05 + s * 2, y0 + R * 2.1);
        ctx.bezierCurveTo(x0 - sgn * R * 0.15 + s * 1.2, y0 + R * 1.5, x0 - sgn * R * 0.05, y0 + R * 0.7, x0 - sgn * R * 0.2, y0 + R * 0.05);
        ctx.closePath(); ctx.fill();
        // 发绳
        ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(x0 + sgn * R * 0.04, y0 + R * 0.08, R * 0.11, 0, TAU); ctx.fill(); ctx.fillStyle = C.hairDark;
      }
    } else if (C.hairStyle === "long") {
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.98, hy - R * 0.2);
      ctx.bezierCurveTo(cx - R * 1.25 + sway, hy + R * 0.9, cx - R * 1.05 + sway * 1.6, hy + R * 1.9, cx - R * 0.8 + sway * 2, hy + R * 2.15);
      ctx.lineTo(cx + R * 0.8 + sway * 2, hy + R * 2.15);
      ctx.bezierCurveTo(cx + R * 1.05 + sway * 1.6, hy + R * 1.9, cx + R * 1.25 + sway, hy + R * 0.9, cx + R * 0.98, hy - R * 0.2);
      ctx.closePath(); ctx.fill();
    } else if (C.hairStyle === "bob") {
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.0, hy - R * 0.3);
      ctx.bezierCurveTo(cx - R * 1.12, hy + R * 0.5, cx - R * 0.95, hy + R * 1.0, cx - R * 0.55, hy + R * 1.05);
      ctx.lineTo(cx + R * 0.55, hy + R * 1.05);
      ctx.bezierCurveTo(cx + R * 0.95, hy + R * 1.0, cx + R * 1.12, hy + R * 0.5, cx + R * 1.0, hy - R * 0.3);
      ctx.closePath(); ctx.fill();
    }
    // 头顶的发盖（所有发型都有）
    ctx.fillStyle = C.hair;
    ctx.beginPath(); ctx.ellipse(cx, hy - R * 0.12, R * 1.04, R * 0.98, 0, Math.PI, 0); ctx.lineTo(cx + R * 1.04, hy + R * 0.25); ctx.lineTo(cx - R * 1.04, hy + R * 0.25); ctx.closePath(); ctx.fill();
    if (C.hairStyle === "spiky" || C.hairStyle === "messy") {
      const n = C.hairStyle === "spiky" ? 9 : 7;
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (i + 0.5) / n * Math.PI; const len = R * (C.hairStyle === "spiky" ? 0.42 : 0.28) * (0.7 + 0.3 * Math.sin(i * 1.7));
        const bx = cx + Math.cos(a) * R * 0.95, by = hy - R * 0.12 + Math.sin(a) * R * 0.9;
        const tx = cx + Math.cos(a - 0.15) * (R * 0.95 + len) + sway, ty = hy - R * 0.12 + Math.sin(a - 0.15) * (R * 0.9 + len);
        ctx.beginPath(); ctx.moveTo(bx - Math.sin(a) * R * 0.18, by + Math.cos(a) * R * 0.18); ctx.lineTo(tx, ty); ctx.lineTo(bx + Math.sin(a) * R * 0.18, by - Math.cos(a) * R * 0.18); ctx.closePath(); ctx.fill();
      }
    }
  }

  function drawBangs(ctx, cx, hy, R, sway, ruffle) {
    ctx.fillStyle = C.hair;
    const top = hy - R * 1.0;
    if (C.bangs === "side") {
      // 斜刘海：从右上扫到左下
      ctx.beginPath(); ctx.moveTo(cx - R * 1.0, hy - R * 0.2);
      ctx.bezierCurveTo(cx - R * 1.0, top + R * 0.1, cx - R * 0.2, top - R * 0.05, cx + R * 1.0, top + R * 0.15);
      ctx.lineTo(cx + R * 1.02, hy - R * 0.05);
      ctx.bezierCurveTo(cx + R * 0.6, hy - R * 0.55 + ruffle, cx + R * 0.1, hy - R * 0.15 + ruffle, cx - R * 0.15 + sway, hy + R * 0.05);
      ctx.bezierCurveTo(cx - R * 0.45 + sway, hy - R * 0.2, cx - R * 0.7, hy - R * 0.4, cx - R * 1.0, hy - R * 0.2);
      ctx.closePath(); ctx.fill();
    } else {
      // 齐/碎刘海：一排尖尖的发丝
      const n = C.bangs === "messy" ? 6 : 5;
      ctx.beginPath(); ctx.moveTo(cx - R * 1.02, hy - R * 0.1);
      ctx.bezierCurveTo(cx - R * 1.0, top - R * 0.02, cx + R * 1.0, top - R * 0.02, cx + R * 1.02, hy - R * 0.1);
      for (let i = n; i >= 0; i--) {
        const x = cx - R * 1.0 + (i / n) * R * 2.0; const dip = (i % 2 ? R * 0.12 : R * 0.32) + (C.bangs === "messy" ? Math.sin(i * 2.3) * R * 0.1 : 0) + ruffle * (i % 2 ? 0.5 : 1);
        ctx.lineTo(x + sway * 0.6, hy - R * 0.1 + dip);
      }
      ctx.closePath(); ctx.fill();
    }
    // 头顶高光
    ctx.strokeStyle = C.hairLight; ctx.lineWidth = Math.max(1.2, R * 0.05); ctx.lineCap = "round"; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(cx - R * 0.1, hy - R * 0.15, R * 0.72, Math.PI * 1.22, Math.PI * 1.52); ctx.stroke(); ctx.globalAlpha = 1;
    // 鬓角发丝
    ctx.fillStyle = C.hair;
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * R * 1.02, hy - R * 0.3); ctx.quadraticCurveTo(cx + sgn * R * 1.12 + sway * sgn * 0.3, hy + R * 0.5, cx + sgn * R * 0.8 + sway * sgn, hy + R * 0.95); ctx.quadraticCurveTo(cx + sgn * R * 0.88, hy + R * 0.3, cx + sgn * R * 0.86, hy - R * 0.1); ctx.closePath(); ctx.fill(); }
  }

  function animeEye(ctx, x, y, w, h, look, closed, happy, sleepy) {
    if (closed > 0.85) {
      ctx.strokeStyle = C.lash; ctx.lineWidth = Math.max(1.6, w * 0.13); ctx.lineCap = "round"; ctx.beginPath();
      if (sleepy || !happy) ctx.arc(x, y - h * 0.1, w * 0.95, Math.PI * 0.15, Math.PI * 0.85); else ctx.arc(x, y + h * 0.55, w * 0.95, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke(); return;
    }
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, w, h * (happy ? 0.8 : 1), 0, 0, TAU); ctx.clip();
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x - w, y - h, w * 2, h * 2);
    const ix = x + look.x * w * 0.28, iy = y + look.y * h * 0.16 + h * 0.08, ir = h * 0.62;
    const g = ctx.createLinearGradient(0, iy - ir, 0, iy + ir); g.addColorStop(0, C.eye); g.addColorStop(1, C.eyeDark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ix, iy, ir * 0.78, ir, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.eyeDark; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(ix, iy + ir * 0.05, ir * 0.36, ir * 0.55, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.ellipse(ix - ir * 0.32, iy - ir * 0.45, ir * 0.28, ir * 0.2, -0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ix + ir * 0.3, iy + ir * 0.45, ir * 0.13, ir * 0.1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(ix, iy + ir * 0.6, ir * 0.5, ir * 0.2, 0, 0, TAU); ctx.fill();
    if (closed > 0) { ctx.fillStyle = C.skin; ctx.fillRect(x - w, y - h, w * 2, h * 2 * closed); }
    ctx.restore();
    // 上睫毛
    ctx.strokeStyle = C.lash; ctx.lineWidth = Math.max(1.6, w * (C.gender === "f" ? 0.2 : 0.14)); ctx.lineCap = "round";
    ctx.beginPath(); ctx.ellipse(x, y, w * 1.02, h * (happy ? 0.8 : 1), 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    if (C.gender === "f") { ctx.lineWidth = Math.max(1.2, w * 0.12); ctx.beginPath(); ctx.moveTo(x + w * 0.95, y - h * 0.35); ctx.lineTo(x + w * 1.25, y - h * 0.62); ctx.stroke(); }
  }

  function draw(ctx, g, S, face, X) {
    const { R, cx, cy } = g; const { happy, closed, yawn, stretch } = X;
    const hy = cy;
    const sway = Math.sin(S.t * 1.3) * R * 0.035 + S.look.x * R * 0.03 + S.jiggle * R * 0.02;
    const ruffle = S.pet.amt * R * 0.12 * Math.sin(S.t * 14);
    const bodyTop = hy + R * 0.86, bodyH = R * 0.9, bodyW = R * 0.78, feetY = bodyTop + bodyH + R * 0.36;
    const wave = happy || S.carried ? Math.sin(S.t * 9) : 0;
    const sleepy = S.mood === "sleepy";
    const cl = Math.max(closed, yawn > 0.3 ? Math.min(1, (yawn - 0.3) * 2.5) : 0);

    // 影子
    ctx.fillStyle = "rgba(40,30,40,0.18)"; ctx.beginPath(); ctx.ellipse(cx, feetY + R * 0.06, R * 0.95, R * 0.14, 0, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(cx, feetY); ctx.rotate(S.tilt + S.look.x * 0.02); ctx.scale(S.squash * (1 + stretch * 0.05), (1 / S.squash) * (1 - stretch * 0.05)); ctx.translate(-cx, -feetY);

    // 后发
    drawHairBack(ctx, cx, hy, R, sway, S.pet.amt);

    // 腿 + 鞋
    const legSw = S.carried ? Math.sin(S.t * 9) * R * 0.12 : 0;
    ctx.fillStyle = C.skin;
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.roundRect(cx + sgn * R * 0.26 - R * 0.16, bodyTop + bodyH - R * 0.05 + (sgn > 0 ? legSw : -legSw), R * 0.32, R * 0.42, R * 0.1); ctx.fill(); }
    ctx.fillStyle = C.shoes;
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * R * 0.27, feetY - R * 0.02 + (sgn > 0 ? legSw : -legSw), R * 0.24, R * 0.13, 0, 0, TAU); ctx.fill(); }

    // 身体：裙子 / 短裤 + 上衣
    if (C.gender === "f" && !has("hoodie")) {
      ctx.fillStyle = C.bottom; ctx.beginPath(); ctx.moveTo(cx - bodyW * 0.7, bodyTop + bodyH * 0.45); ctx.lineTo(cx - bodyW * 1.15, bodyTop + bodyH + R * 0.05); ctx.lineTo(cx + bodyW * 1.15, bodyTop + bodyH + R * 0.05); ctx.lineTo(cx + bodyW * 0.7, bodyTop + bodyH * 0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.top; ctx.beginPath(); ctx.roundRect(cx - bodyW * 0.72, bodyTop, bodyW * 1.44, bodyH * 0.6, R * 0.12); ctx.fill();
    } else {
      ctx.fillStyle = C.bottom; ctx.beginPath(); ctx.roundRect(cx - bodyW * 0.72, bodyTop + bodyH * 0.55, bodyW * 1.44, bodyH * 0.5, R * 0.08); ctx.fill();
      ctx.fillStyle = C.top; ctx.beginPath(); ctx.roundRect(cx - bodyW * (has("hoodie") ? 0.95 : 0.78), bodyTop - R * 0.02, bodyW * (has("hoodie") ? 1.9 : 1.56), bodyH * 0.72, R * 0.18); ctx.fill();
    }
    // 领子 / 条纹 / 背心
    if (has("sailor")) { ctx.fillStyle = C.collar; ctx.beginPath(); ctx.moveTo(cx - bodyW * 0.7, bodyTop); ctx.lineTo(cx, bodyTop + bodyH * 0.38); ctx.lineTo(cx + bodyW * 0.7, bodyTop); ctx.closePath(); ctx.fill(); ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(cx, bodyTop + bodyH * 0.2); ctx.lineTo(cx - R * 0.16, bodyTop + bodyH * 0.05); ctx.lineTo(cx, bodyTop + bodyH * 0.12); ctx.lineTo(cx + R * 0.16, bodyTop + bodyH * 0.05); ctx.closePath(); ctx.fill(); }
    if (has("stripe")) { ctx.fillStyle = C.collar; ctx.fillRect(cx - bodyW * 0.78, bodyTop + bodyH * 0.3, bodyW * 1.56, R * 0.12); }
    if (has("vest")) { ctx.fillStyle = C.collar; ctx.beginPath(); ctx.moveTo(cx - bodyW * 0.55, bodyTop); ctx.lineTo(cx - bodyW * 0.55, bodyTop + bodyH * 0.72); ctx.lineTo(cx + bodyW * 0.55, bodyTop + bodyH * 0.72); ctx.lineTo(cx + bodyW * 0.55, bodyTop); ctx.lineTo(cx, bodyTop + bodyH * 0.3); ctx.closePath(); ctx.fill(); }
    if (has("hoodie")) { ctx.strokeStyle = C.topDark; ctx.lineWidth = Math.max(1, R * 0.04); ctx.beginPath(); ctx.moveTo(cx - R * 0.12, bodyTop + R * 0.1); ctx.lineTo(cx - R * 0.14, bodyTop + R * 0.5); ctx.moveTo(cx + R * 0.12, bodyTop + R * 0.1); ctx.lineTo(cx + R * 0.14, bodyTop + R * 0.5); ctx.stroke(); }

    // 手臂：开心 / 被抱起时挥手
    ctx.lineCap = "round";
    for (const sgn of [-1, 1]) {
      const sx = cx + sgn * bodyW * 0.75, sy = bodyTop + R * 0.12;
      let ex = sx + sgn * R * 0.3, ey = sy + R * 0.62;
      if (S.carried) { ex = sx + sgn * R * 0.55; ey = sy - R * 0.55 + wave * R * 0.06; }
      else if (happy && sgn === 1) { ex = sx + R * 0.62; ey = sy - R * 0.5 + wave * R * 0.1; }
      else if (S.mood === "reading") { ex = cx + sgn * R * 0.32; ey = bodyTop + R * 0.55; }
      for (const [col, w] of [[C.topDark, R * 0.28], [C.top, R * 0.2]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, w); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sgn * R * 0.25, (sy + ey) / 2, ex, ey); ctx.stroke(); }
      ctx.fillStyle = C.skin; ctx.strokeStyle = C.skinDark; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ex, ey, R * 0.13, 0, TAU); ctx.fill(); ctx.stroke();
    }

    // 脖子
    ctx.fillStyle = C.skinDark; ctx.fillRect(cx - R * 0.14, hy + R * 0.7, R * 0.28, R * 0.25);
    if (has("collar")) { ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.ellipse(cx, bodyTop + R * 0.02, R * 0.34, R * 0.16, 0, 0, TAU); ctx.fill(); }

    // 头：圆脸带一点下巴
    ctx.fillStyle = C.skin; ctx.beginPath();
    ctx.moveTo(cx - R * 0.98, hy - R * 0.1);
    ctx.bezierCurveTo(cx - R * 1.0, hy + R * 0.55, cx - R * 0.45, hy + R * 0.98, cx, hy + R * 0.96);
    ctx.bezierCurveTo(cx + R * 0.45, hy + R * 0.98, cx + R * 1.0, hy + R * 0.55, cx + R * 0.98, hy - R * 0.1);
    ctx.bezierCurveTo(cx + R * 0.95, hy - R * 0.9, cx - R * 0.95, hy - R * 0.9, cx - R * 0.98, hy - R * 0.1);
    ctx.closePath(); ctx.fill();
    // 耳朵
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * R * 0.98, hy + R * 0.1, R * 0.12, R * 0.16, 0, 0, TAU); ctx.fill(); }
    if (has("catears")) { for (const sgn of [-1, 1]) { const bx = cx + sgn * R * 0.55, by = hy - R * 0.78; ctx.fillStyle = C.hair; ctx.beginPath(); ctx.moveTo(bx - sgn * R * 0.32, by + R * 0.1); ctx.lineTo(bx + sgn * R * 0.12, by - R * 0.62 + ruffle * 0.3); ctx.lineTo(bx + sgn * R * 0.38, by + R * 0.2); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#FFB6C1"; ctx.beginPath(); ctx.moveTo(bx - sgn * R * 0.16, by + R * 0.08); ctx.lineTo(bx + sgn * R * 0.1, by - R * 0.36); ctx.lineTo(bx + sgn * R * 0.26, by + R * 0.14); ctx.closePath(); ctx.fill(); } }

    // 刘海
    drawBangs(ctx, cx, hy, R, sway, ruffle);

    // 脸
    const lx = S.look.x, ly = S.look.y;
    const ey = hy + R * 0.12 + ly * R * 0.03, ew = R * (C.gender === "f" ? 0.2 : 0.18), eh = R * (C.gender === "f" ? 0.27 : 0.22);
    for (const sgn of [-1, 1]) animeEye(ctx, cx + sgn * R * 0.4 + lx * R * 0.05, ey, ew, eh, S.look, cl, happy, sleepy || yawn > 0.3);
    // 眉毛
    ctx.strokeStyle = C.hairDark; ctx.lineWidth = Math.max(1.2, R * 0.045); ctx.lineCap = "round";
    for (const sgn of [-1, 1]) { const bx = cx + sgn * R * 0.4 + lx * R * 0.05, by = ey - eh - R * 0.1 + (S.mood === "thinking" && sgn === 1 ? -R * 0.06 : 0) + (happy ? -R * 0.03 : 0); ctx.beginPath(); ctx.moveTo(bx - sgn * R * 0.16, by + R * 0.02); ctx.quadraticCurveTo(bx, by - R * 0.05, bx + sgn * R * 0.16, by + R * 0.03); ctx.stroke(); }
    // 腮红
    face.blush(cx - R * 0.6 + lx * R * 0.03, hy + R * 0.42, R * 0.9, 0.22 + (happy ? 0.3 : 0), C.blush);
    face.blush(cx + R * 0.6 + lx * R * 0.03, hy + R * 0.42, R * 0.9, 0.22 + (happy ? 0.3 : 0), C.blush);
    if (has("bandage")) { ctx.fillStyle = "#E8C9A0"; ctx.save(); ctx.translate(cx - R * 0.62, hy + R * 0.42); ctx.rotate(-0.4); ctx.fillRect(-R * 0.16, -R * 0.06, R * 0.32, R * 0.12); ctx.restore(); }
    // 嘴
    const my = hy + R * 0.6;
    ctx.strokeStyle = C.mouth; ctx.fillStyle = C.mouth; ctx.lineWidth = Math.max(1.4, R * 0.045); ctx.lineCap = "round"; ctx.beginPath();
    if (yawn > 0.2) { ctx.ellipse(cx, my + R * 0.03, R * 0.1 * yawn + R * 0.03, R * 0.14 * yawn + R * 0.02, 0, 0, TAU); ctx.fill(); }
    else if (S.talking || S.mouthLevel > 0.05) { const o = Math.max(0.08, S.mouthLevel); ctx.ellipse(cx, my + R * 0.02, R * (0.08 + o * 0.06), R * (0.03 + o * 0.1), 0, 0, TAU); ctx.fill(); }
    else if (sleepy) { ctx.arc(cx, my, R * 0.035, 0, TAU); ctx.stroke(); }
    else if (S.mood === "thinking") { ctx.moveTo(cx - R * 0.07, my + R * 0.02); ctx.lineTo(cx + R * 0.09, my - R * 0.02); ctx.stroke(); }
    else if (happy) { ctx.moveTo(cx - R * 0.16, my - R * 0.03); ctx.quadraticCurveTo(cx, my + R * 0.16, cx + R * 0.16, my - R * 0.03); ctx.closePath(); ctx.fill(); }
    else { const w = R * (has("grin") ? 0.16 : 0.1); ctx.moveTo(cx - w, my - R * 0.02); ctx.quadraticCurveTo(cx, my + R * (has("grin") ? 0.1 : 0.06), cx + w, my - R * 0.02); ctx.stroke(); }

    // 配饰
    if (has("choker")) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(cx - R * 0.26, hy + R * 0.9, R * 0.52, R * 0.1, R * 0.05); ctx.fill(); ctx.fillStyle = C.bell; ctx.beginPath(); ctx.arc(cx, hy + R * 1.02, R * 0.075, 0, TAU); ctx.fill(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, hy + R * 1.035, R * 0.02, 0, TAU); ctx.fill(); }
    if (has("bow")) { const bx = cx + R * 0.62, by = hy - R * 0.82; ctx.fillStyle = C.accent; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(bx + sgn * R * 0.2, by, R * 0.2, R * 0.13, sgn * 0.5, 0, TAU); ctx.fill(); } ctx.beginPath(); ctx.arc(bx, by, R * 0.08, 0, TAU); ctx.fill(); }
    if (has("clip")) { ctx.fillStyle = C.accent; ctx.save(); ctx.translate(cx - R * 0.55, hy - R * 0.45); ctx.rotate(-0.5); ctx.beginPath(); ctx.roundRect(-R * 0.18, -R * 0.045, R * 0.36, R * 0.09, R * 0.04); ctx.fill(); ctx.restore(); }
    if (has("glasses")) { ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1.2, R * 0.04); for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.roundRect(cx + sgn * R * 0.4 - R * 0.27, ey - R * 0.26, R * 0.54, R * 0.5, R * 0.12); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(cx - R * 0.13, ey - R * 0.02); ctx.lineTo(cx + R * 0.13, ey - R * 0.02); ctx.stroke(); }
    if (has("headphones")) { ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, R * 0.07); ctx.beginPath(); ctx.arc(cx, hy + R * 0.82, R * 0.5, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke(); ctx.fillStyle = C.accent; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.roundRect(cx + sgn * R * 0.46 - R * 0.09, hy + R * 0.9, R * 0.18, R * 0.24, R * 0.05); ctx.fill(); } }

    ctx.restore();
    if (S.mood === "reading") face.book(cx, bodyTop + R * 0.55, R * 0.9, "#FFFDF8", "#8C8494");
    face.parts({ heart: C.accent, z: "#8C8494", dot: "#8C8494", note: "#8C8494" });
  }

  return makeVectorSkin({ rK: 0.19, baseYK: 0.48, hit: [1.15, 1.85, 0.7], draw });
}

// 角色表
export const CHIBIS = {
  ani_sakura: { name: "小樱", desc: "二次元 · 女生：粉色双马尾，蝴蝶结，水手服", gender: "f", hairStyle: "twin", bangs: "straight", hair: "#F7A8C9", hairDark: "#E27FA9", hairLight: "#FFDCEB", eye: "#E75480", eyeDark: "#8E2F52", top: "#FFFFFF", topDark: "#DCDCE6", collar: "#5C7CC9", bottom: "#5C7CC9", shoes: "#4B3F47", accent: "#FF6F91", extras: ["bow", "sailor"] },
  ani_yuki: { name: "小雪", desc: "二次元 · 女生：银白长发，大帽衫，安安静静", gender: "f", hairStyle: "long", bangs: "side", hair: "#EEF1F7", hairDark: "#C9D0DE", hairLight: "#FFFFFF", eye: "#6FA8DC", eyeDark: "#2F5F9E", top: "#C9D6EA", topDark: "#A9B8D0", bottom: "#8E9BB5", shoes: "#5A6480", accent: "#9FB8E0", extras: ["hoodie"] },
  ani_yuzu: { name: "小柚", desc: "二次元 · 女生：棕色短发，发夹，元气满满", gender: "f", hairStyle: "bob", bangs: "messy", hair: "#B5754F", hairDark: "#8A5334", hairLight: "#E0B08C", eye: "#E39A2B", eyeDark: "#9A5E0C", top: "#F4A261", collar: "#F4A261", bottom: "#4F5D75", shoes: "#3A3F4B", accent: "#FFD166", extras: ["clip"] },
  ani_neko: { name: "猫耳娘", desc: "二次元 · 女生：黑长发，猫耳，铃铛项圈", gender: "f", hairStyle: "long", bangs: "straight", hair: "#2F2A36", hairDark: "#1B1720", hairLight: "#6B6278", eye: "#4CC38A", eyeDark: "#1F7A52", top: "#4B4866", topDark: "#3A3852", collar: "#FFFFFF", bottom: "#3A3852", shoes: "#1B1720", accent: "#FF8FA3", extras: ["catears", "choker", "collar"] },
  ani_sumi: { name: "小澄", desc: "二次元 · 男生：深蓝乱发，脖子挂着耳机，很酷", gender: "m", hairStyle: "messy", bangs: "messy", hair: "#2F3E6E", hairDark: "#1F2A4D", hairLight: "#6C7FB5", eye: "#5B7BD5", eyeDark: "#26418F", top: "#4A4E69", topDark: "#3A3D55", bottom: "#2B2D42", shoes: "#1C1D2B", accent: "#4CC9F0", extras: ["hoodie", "headphones"] },
  ani_yang: { name: "小阳", desc: "二次元 · 男生：橘色刺猬头，脸上贴创可贴，爱笑", gender: "m", hairStyle: "spiky", bangs: "messy", hair: "#F28C28", hairDark: "#C96A12", hairLight: "#FFC27A", eye: "#6B4E2E", eyeDark: "#3E2B14", top: "#E63946", collar: "#FFFFFF", bottom: "#264653", shoes: "#1D3557", accent: "#FFB703", extras: ["stripe", "bandage", "grin"] },
  ani_haku: { name: "小白", desc: "二次元 · 男生：白发，眼镜，毛衣背心，温和", gender: "m", hairStyle: "messy", bangs: "side", hair: "#F2F2F2", hairDark: "#CFCFCF", hairLight: "#FFFFFF", eye: "#8A6FBF", eyeDark: "#5A4490", top: "#FFFFFF", topDark: "#D6D6DC", collar: "#6D8B74", bottom: "#4A4A4A", shoes: "#2E2E2E", accent: "#B8C4B0", extras: ["vest", "glasses"] }
};
