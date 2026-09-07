import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";
const DEF = withTaps(SKIN_DEFAULTS.term, "term");

// 小终端：一台圆角的深色 CRT 小窗，浅灰塑料外壳、顶上三个窗口按钮、底下两只小脚。
// 屏幕里是绿色的字符：两个方块光点当眼睛、一个会闪的方块光标、几行用短横拼出来的"假代码"，
// 再盖上缓慢下移的扫描线和一层玻璃反光。
const GREEN = "#4CFF9B", DIMG = "#2E9D63", GLOW = "#3DFF88", LIT = "#B7FFD6";

// 同一行号永远长一个样：正弦哈希当伪随机，滚动时上下行不会乱跳
const hash = (n, k) => { const v = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
// 一行"假代码"：缩进 + 两三段短横／方块，返回这一行结束的 x（给光标用）
function codeRow(ctx, n, x0, y, w, h, alpha) {
  let x = x0 + Math.floor(hash(n, 0) * 3) * w * 0.07;
  const segs = 2 + Math.floor(hash(n, 1) * 2);
  for (let i = 0; i < segs; i++) {
    const r = hash(n, i + 2), sw = w * (0.09 + r * 0.24);
    if (x + sw > x0 + w) break;
    ctx.globalAlpha = alpha * (r > 0.66 ? 1 : 0.5);
    ctx.fillStyle = r > 0.66 ? GREEN : DIMG;
    ctx.beginPath(); ctx.roundRect(x, y - h / 2, sw, h, h * 0.4); ctx.fill();
    x += sw + w * 0.05;
  }
  ctx.globalAlpha = 1;
  return x;
}

export const makeTerm = makeVectorSkin({
  ...DEF, character: DEF,
  rK: 0.21, baseYK: 0.62, hit: [1.2, 1.05, 0.06],

  // 自定义状态：屏幕滚动的行数、开心时的闪屏和蹦出来的字符
  tick(S, dt, g, H) {
    const E = S.extra;
    if (E.scroll === undefined) { E.scroll = 0; E.pop = 0; E.flash = 0; E.prev = S.mood; }
    // 说话时一行行往上滚，读东西时慢慢滚，其余时候不动
    E.scroll += (S.talking ? 3.4 + S.mouthLevel * 3.2 : S.mood === "reading" ? 0.6 : 0) * dt;
    if (S.mood !== E.prev) { if (S.mood === "happy") { E.pop = 1; E.flash = 1; } E.prev = S.mood; }
    if (S.pet.amt > 0.7 && E.flash < 0.4) E.flash = 0.7;
    E.pop = Math.max(0, E.pop - dt * 1.5);
    E.flash = Math.max(0, E.flash - dt * 2.2);
    if (S.mood === "happy" && Math.random() < dt * 1.1) H.spawn("dot", 1, g.cx + (Math.random() - 0.5) * g.R * 1.2, g.cy - g.R * 0.6);
  },

  draw(ctx, g, S, face, X) {
    const { R, cx, cy } = g; const { TAU, happy, closed, yawn, stretch } = X;
    const E = S.extra || {}, t = S.t;
    const scroll = E.scroll || 0, pop = E.pop || 0, flash = E.flash || 0;
    const base = cy + R * 0.95;
    // 屏幕整体亮度：困了很暗，打哈欠时也暗一点
    const dim = S.mood === "sleepy" ? 0.34 : 1 - yawn * 0.35;

    // 影子
    ctx.fillStyle = "rgba(25,35,30,0.22)"; ctx.beginPath(); ctx.ellipse(cx, base + R * 0.09, R * 0.92, R * 0.12, 0, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(cx, base);
    ctx.rotate(S.tilt + S.look.x * 0.025 + S.jiggle * 0.012 + (S.carried ? Math.sin(t * 7) * 0.04 : 0));
    ctx.scale(S.squash * (1 + stretch * 0.05), (1 / S.squash) * (1 - stretch * 0.04));
    ctx.translate(-cx, -base);

    // 两只小脚（在机身后面）
    ctx.fillStyle = "#8B929B";
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.roundRect(cx + sgn * R * 0.58 - R * 0.17, base - R * 0.17 + (S.carried ? Math.sin(t * 9) * sgn * R * 0.05 : 0), R * 0.34, R * 0.17, R * 0.06); ctx.fill(); }

    // 浅灰塑料机身
    const bw = R * 1.95, bh = R * 1.58, bx = cx - bw / 2, by = base - R * 0.1 - bh;
    const shell = ctx.createLinearGradient(bx, by, bx + bw * 0.35, by + bh);
    shell.addColorStop(0, "#EEF0F3"); shell.addColorStop(0.55, "#D2D7DD"); shell.addColorStop(1, "#ADB4BD");
    ctx.fillStyle = shell; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, R * 0.26); ctx.fill();
    ctx.strokeStyle = "rgba(58,66,76,0.5)"; ctx.lineWidth = Math.max(1, R * 0.025); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = Math.max(1, R * 0.018);
    ctx.beginPath(); ctx.roundRect(bx + R * 0.05, by + R * 0.05, bw - R * 0.1, bh - R * 0.1, R * 0.22); ctx.stroke();

    // 标题栏上的三个小圆点
    for (let i = 0; i < 3; i++) { ctx.fillStyle = ["#E4695E", "#E7B44A", "#5FC466"][i]; ctx.beginPath(); ctx.arc(bx + R * 0.23 + i * R * 0.19, by + R * 0.17, R * 0.055, 0, TAU); ctx.fill(); }

    // 屏幕
    const sx = bx + R * 0.14, sy = by + R * 0.32, sw = bw - R * 0.28, sh = bh - R * 0.58;
    const scr = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    scr.addColorStop(0, "#0F1B16"); scr.addColorStop(1, "#050C09");
    ctx.fillStyle = scr; ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, R * 0.12); ctx.fill();

    ctx.save(); ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, R * 0.12); ctx.clip();

    // 屏幕自己的绿辉（被摸／开心时更亮）
    const ga = (0.10 + flash * 0.24 + S.pet.amt * 0.08) * dim;
    const gl = ctx.createRadialGradient(cx, sy + sh * 0.55, 0, cx, sy + sh * 0.55, sw * 0.7);
    gl.addColorStop(0, "rgba(76,255,155," + ga.toFixed(3) + ")"); gl.addColorStop(1, "rgba(76,255,155,0)");
    ctx.fillStyle = gl; ctx.fillRect(sx, sy, sw, sh);

    // 顶上那行暗暗的"路径"
    ctx.globalAlpha = 0.45 * dim; ctx.fillStyle = DIMG;
    for (const [ox, ow] of [[0.08, 0.16], [0.27, 0.10], [0.40, 0.22]]) { ctx.beginPath(); ctx.roundRect(sx + sw * ox, sy + sh * 0.13, sw * ow, R * 0.045, R * 0.022); ctx.fill(); }
    ctx.globalAlpha = 1;

    // 眼睛：两个方块光点，眨眼时压扁成一条，开心时变成两个尖角
    const lx = S.look.x * R * 0.09, ly = S.look.y * R * 0.05;
    const ey = sy + sh * 0.35 + ly, ew = R * 0.17, eh = R * 0.22;
    const cl = Math.max(closed, yawn > 0.3 ? 1 : 0);
    ctx.save(); ctx.globalAlpha = Math.max(0.6, dim);
    ctx.shadowColor = GLOW; ctx.shadowBlur = (8 + S.pet.amt * 8 + flash * 10) * dim;
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * R * 0.32 + lx;
      if (happy && cl < 0.5) {
        ctx.strokeStyle = LIT; ctx.lineWidth = R * 0.055; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(ex - ew * 0.7, ey + eh * 0.3); ctx.lineTo(ex, ey - eh * 0.32); ctx.lineTo(ex + ew * 0.7, ey + eh * 0.3); ctx.stroke();
      } else {
        const h = Math.max(R * 0.035, eh * (1 - cl));
        ctx.fillStyle = S.mood === "sleepy" ? "#48C989" : "#9DFFC4";
        ctx.beginPath(); ctx.roundRect(ex - ew / 2, ey - h / 2, ew, h, Math.min(R * 0.04, h / 2)); ctx.fill();
      }
    }
    ctx.restore();

    // 嘴：说话时是一排跟着声音跳的方块；想事情是进度条；困了只剩一小横；平时是提示符
    const my = sy + sh * 0.58;
    ctx.save(); ctx.globalAlpha = dim;
    if (S.talking || S.mouthLevel > 0.05) {
      const o = Math.max(0.12, S.mouthLevel); ctx.fillStyle = GREEN;
      for (let i = 0; i < 5; i++) {
        const bhh = R * (0.03 + o * 0.16 * (0.5 + 0.5 * Math.sin(t * 22 + i * 1.7)));
        ctx.beginPath(); ctx.roundRect(cx - R * 0.30 + i * R * 0.15 + lx, my - bhh, R * 0.09, bhh + R * 0.02, R * 0.02); ctx.fill();
      }
    } else if (S.mood === "thinking") {
      const w = R * 0.92, k = (t * 0.42) % 1;
      ctx.strokeStyle = DIMG; ctx.lineWidth = Math.max(1, R * 0.022);
      ctx.beginPath(); ctx.roundRect(cx - w / 2, my - R * 0.055, w, R * 0.11, R * 0.05); ctx.stroke();
      ctx.fillStyle = GREEN; ctx.beginPath(); ctx.roundRect(cx - w / 2 + R * 0.02, my - R * 0.035, (w - R * 0.04) * k, R * 0.07, R * 0.035); ctx.fill();
    } else if (S.mood === "sleepy") {
      ctx.fillStyle = DIMG; ctx.beginPath(); ctx.roundRect(cx - R * 0.12, my - R * 0.02, R * 0.24, R * 0.04, R * 0.02); ctx.fill();
    } else {
      ctx.strokeStyle = happy ? GREEN : DIMG; ctx.lineWidth = Math.max(1.5, R * 0.04); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(cx - R * 0.27 + lx, my - R * 0.07); ctx.lineTo(cx - R * 0.18 + lx, my); ctx.lineTo(cx - R * 0.27 + lx, my + R * 0.07); ctx.stroke();
      ctx.fillStyle = happy ? GREEN : DIMG;
      ctx.beginPath(); ctx.roundRect(cx - R * 0.10 + lx, my - R * 0.025 + (happy ? Math.sin(t * 6) * R * 0.02 : 0), R * (happy ? 0.34 : 0.24), R * 0.05, R * 0.025); ctx.fill();
    }
    ctx.restore();

    // 两三行假代码 + 会闪的方块光标（整块裁掉，滚动时从下面顶上来）
    const caY = sy + sh * 0.65, caH = sh * 0.33, x0 = sx + sw * 0.08, cw = sw * 0.84, rowH = caH / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(sx, caY, sw, caH); ctx.clip();
    const frac = scroll - Math.floor(scroll), top = Math.floor(scroll);
    const rowA = dim * (S.mood === "sleepy" ? 0.22 : 1);
    let curX = x0, curY = caY + caH - rowH * 0.5;
    for (let i = -1; i <= 1; i++) {
      const y = caY + caH - rowH * (i + 0.5 + frac);
      const endX = codeRow(ctx, top - i, x0, y, cw, rowH * 0.38, rowA);
      if (i === 0) { curX = endX; curY = y; }
    }
    // 光标：说话时常亮，想事情闪得快，困了慢慢闪
    const rate = S.talking ? 0 : S.mood === "thinking" ? 12 : S.mood === "sleepy" ? 2.2 : 5;
    if (rate === 0 || Math.sin(t * rate) > -0.1) {
      ctx.save(); ctx.globalAlpha = Math.max(0.55, dim); ctx.shadowColor = GLOW; ctx.shadowBlur = 8 * dim;
      ctx.fillStyle = GREEN;
      ctx.beginPath(); ctx.roundRect(Math.min(curX, x0 + cw - R * 0.1), curY - rowH * 0.3, R * 0.1, rowH * 0.6, R * 0.015); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 开心：几个字符从屏幕里蹦上来
    if (pop > 0) {
      const k = 1 - pop;
      ctx.globalAlpha = pop * dim; ctx.fillStyle = LIT;
      for (let i = 0; i < 4; i++) {
        const px = cx + (i - 1.5) * R * 0.26, py = caY + caH * 0.4 - k * sh * 0.5 - Math.sin(k * Math.PI) * R * 0.08;
        ctx.beginPath(); ctx.roundRect(px - R * 0.05, py - R * 0.05, R * 0.1, R * 0.1, R * 0.02); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 扫描线：几条半透明横线，慢慢往下走
    ctx.globalAlpha = 0.07 * dim; ctx.fillStyle = "#CFFFE4";
    const band = sh / 5, off = (t * 11) % band, lw = Math.max(1, R * 0.022);
    for (let i = -1; i < 5; i++) ctx.fillRect(sx, sy + off + i * band, sw, lw);
    ctx.globalAlpha = 1;

    // 开心时整屏闪一下绿光
    if (flash > 0) { ctx.globalAlpha = 0.18 * flash; ctx.fillStyle = GREEN; ctx.fillRect(sx, sy, sw, sh); ctx.globalAlpha = 1; }

    // 玻璃反光
    const rf = ctx.createLinearGradient(sx, sy, sx + sw * 0.5, sy + sh);
    rf.addColorStop(0, "rgba(255,255,255,0.11)"); rf.addColorStop(0.45, "rgba(255,255,255,0.02)"); rf.addColorStop(0.46, "rgba(255,255,255,0)");
    ctx.fillStyle = rf; ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 0.05; ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.moveTo(sx + sw * 0.56, sy); ctx.lineTo(sx + sw * 0.78, sy); ctx.lineTo(sx + sw * 0.36, sy + sh); ctx.lineTo(sx + sw * 0.18, sy + sh); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // 屏幕的凹边
    ctx.strokeStyle = "rgba(20,28,24,0.55)"; ctx.lineWidth = Math.max(1, R * 0.022);
    ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, R * 0.12); ctx.stroke();

    // 下边框：电源灯 + 两条散热缝
    const py2 = sy + sh + R * 0.13;
    ctx.save(); ctx.shadowColor = GLOW; ctx.shadowBlur = 6;
    ctx.fillStyle = S.mood === "sleepy" ? (Math.sin(t * 1.6) > 0 ? DIMG : "#2A4238") : GREEN;
    ctx.beginPath(); ctx.arc(bx + bw - R * 0.2, py2, R * 0.035, 0, TAU); ctx.fill(); ctx.restore();
    ctx.globalAlpha = 0.35; ctx.fillStyle = "#7C848E";
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.roundRect(bx + R * 0.2 + i * R * 0.13, py2 - R * 0.02, R * 0.08, R * 0.04, R * 0.02); ctx.fill(); }
    ctx.globalAlpha = 1;

    ctx.restore();

    // 被摸：手指落点上荡开一圈绿光
    if (S.pet.amt > 0.05) {
      ctx.save(); ctx.globalAlpha = Math.min(0.35, S.pet.amt * 0.35);
      ctx.strokeStyle = LIT; ctx.lineWidth = Math.max(1, R * 0.02);
      ctx.beginPath(); ctx.arc(S.pet.x, S.pet.y, R * (0.16 + (1.2 - S.pet.amt) * 0.26), 0, TAU); ctx.stroke();
      ctx.restore();
    }

    if (S.mood === "reading") face.book(cx, base - R * 0.02, R, "#EAF6EE", "#7C8C84");
    face.parts({ heart: "#FF8FB1", z: "#6E7B86", dot: GREEN, note: GREEN });
  }
});
