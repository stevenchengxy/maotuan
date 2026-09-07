import { makeFx } from "./fx2d.js";
import { CHARS, CHAR_FRAMES } from "./charCatalog.js";
import { expandTaps, withTaps } from "./taps.js";
import { SKIN_DEFAULTS } from "./names.js";

// 「画出来的角色」：主进程用 MiniMax image-01 画四张脸（平时 / 闭眼 / 开心 / 难过），
// 这里抠掉幕布，再让这张静态插画活过来：呼吸、上下轻浮、看鼠标时整个人往那边偏一点、
// 按节奏眨眼（换成闭眼那张）、说话时上下轻点头、心情换脸、被摸被点时换表情加特效。
const TAU = Math.PI * 2;

// 抠图：按"颜色优势"（不看亮度，四角常有暗角），阈值按四角实测自适应；边缘去溢色
function keyScreen(img) {
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, W = c.width, H = c.height;
  const corner = i => [p[i], p[i + 1], p[i + 2]];
  const cs = [corner(0), corner((W - 1) * 4), corner((H - 1) * W * 4), corner(((H - 1) * W + W - 1) * 4)];
  const key = cs.reduce((a, b) => [a[0] + b[0] / 4, a[1] + b[1] / 4, a[2] + b[2] / 4], [0, 0, 0]);
  const greenness = key[1] - Math.max(key[0], key[2]), magentaness = Math.min(key[0], key[2]) - key[1];
  const greenScreen = greenness > 22, magentaScreen = !greenScreen && magentaness > 22;
  const cornerDom = greenScreen ? greenness : magentaness;
  const hi = Math.max(45, cornerDom * 0.75), lo = Math.max(14, cornerDom * 0.3);
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2]; let a;
    if (greenScreen) { const dom = g - Math.max(r, b); a = dom >= hi ? 0 : dom > lo ? 1 - (dom - lo) / (hi - lo) : 1; if (dom > 0 && a < 1) p[i + 1] = Math.max(r, b); }
    else if (magentaScreen) { const dom = Math.min(r, b) - g; a = dom >= hi ? 0 : dom > lo ? 1 - (dom - lo) / (hi - lo) : 1; if (dom > 0 && a < 1) { const m = Math.min(r, b); p[i] = Math.min(r, g + (r - m)); p[i + 2] = Math.min(b, g + (b - m)); } }
    else { const dist = Math.hypot(r - key[0], g - key[1], b - key[2]); a = dist < 25 ? 0 : dist < 80 ? (dist - 25) / 55 : 1; }
    p[i + 3] = a < 0.4 ? 0 : Math.round(a * 255);
  }
  // 去渣：幕布颜色和角色身上撞色的地方（比如绿幕前那根绿竹子）会留下零星的点，
  // 孤零零的一小撮就抹掉，免得把轮廓框撑大、把角色挤小
  for (let pass = 0; pass < 2; pass++) {
    const keep = new Uint8Array(W * H);
    for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) {
      const i = (yy * W + xx) * 4; if (!p[i + 3]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { if (p[((yy + dy) * W + xx + dx) * 4 + 3] > 40) n++; }
      keep[yy * W + xx] = n >= 4 ? 1 : 0;
    }
    for (let k = 0; k < W * H; k++) if (!keep[k]) p[k * 4 + 3] = 0;
  }
  // 只留最大的一坨（和跟它差不多大的）：模型偶尔会在角落里签个名、写行字、撒几颗
  // 装饰星星，那些都是跟身体不相连的独立小块，留着会把轮廓框撑歪
  {
    const lab = new Int32Array(W * H).fill(-1), size = [], stack = new Int32Array(W * H);
    let n = 0;
    for (let k = 0; k < W * H; k++) {
      if (lab[k] >= 0 || p[k * 4 + 3] < 60) continue;
      let sp = 0; stack[sp++] = k; lab[k] = n; let cnt = 0;
      while (sp) {
        const q = stack[--sp]; cnt++;
        const qx = q % W, qy = (q / W) | 0;
        if (qx > 0) { const r = q - 1; if (lab[r] < 0 && p[r * 4 + 3] >= 60) { lab[r] = n; stack[sp++] = r; } }
        if (qx < W - 1) { const r = q + 1; if (lab[r] < 0 && p[r * 4 + 3] >= 60) { lab[r] = n; stack[sp++] = r; } }
        if (qy > 0) { const r = q - W; if (lab[r] < 0 && p[r * 4 + 3] >= 60) { lab[r] = n; stack[sp++] = r; } }
        if (qy < H - 1) { const r = q + W; if (lab[r] < 0 && p[r * 4 + 3] >= 60) { lab[r] = n; stack[sp++] = r; } }
      }
      size.push(cnt); n++;
    }
    if (n > 1) {
      const big = Math.max(...size), keepAt = big * 0.15;
      for (let k = 0; k < W * H; k++) { const l = lab[k]; if (l >= 0 && size[l] < keepAt) p[k * 4 + 3] = 0; }
    }
  }
  x.putImageData(d, 0, 0);
  // 锚点：轮廓框、头顶、左右伸出去的手、最亮的点、最蓝的亮点、脚
  let minx = W, maxx = 0, miny = H, maxy = 0, topX = 0, topY = -1, bright = null, blue = null, bl = 0, bb = 0;
  const step = 2;
  for (let yy = 0; yy < H; yy += step) for (let xx = 0; xx < W; xx += step) {
    const i = (yy * W + xx) * 4; if (p[i + 3] < 60) continue;
    if (xx < minx) minx = xx; if (xx > maxx) maxx = xx; if (yy < miny) miny = yy; if (yy > maxy) maxy = yy;
    if (topY < 0) { topY = yy; topX = xx; }
    const r = p[i], g = p[i + 1], b = p[i + 2], lum = r * 0.3 + g * 0.55 + b * 0.15;
    if (p[i + 3] > 200 && lum > bl) { bl = lum; bright = [xx, yy]; }
    if (p[i + 3] > 200 && b > r + 40 && b > g + 20 && lum > bb) { bb = lum; blue = [xx, yy]; }
  }
  // 头顶那一行的中点
  if (topY >= 0) { let sx = 0, n = 0; for (let xx = 0; xx < W; xx += 1) { const i = (topY * W + xx) * 4; if (p[i + 3] >= 60) { sx += xx; n++; } } if (n) topX = sx / n; }
  // 上半身里最左 / 最右的点（举起来的手）
  let right = null, left = null; const upper = miny + (maxy - miny) * 0.6;
  for (let yy = miny; yy < upper; yy += step) for (let xx = minx; xx <= maxx; xx += step) { const i = (yy * W + xx) * 4; if (p[i + 3] < 60) continue; if (!right || xx > right[0]) right = [xx, yy]; if (!left || xx < left[0]) left = [xx, yy]; }
  // 胸口区域里最亮的点（反应堆 / 核心）
  let chestGlow = null, cg = 0; const cx0 = minx + (maxx - minx) * 0.3, cx1 = minx + (maxx - minx) * 0.7, cy0 = miny + (maxy - miny) * 0.18, cy1 = miny + (maxy - miny) * 0.5;
  for (let yy = cy0; yy < cy1; yy += step) for (let xx = cx0; xx < cx1; xx += step) { const i = (yy * W + xx) * 4; if (p[i + 3] < 200) continue; const lum = p[i] * 0.3 + p[i + 1] * 0.55 + p[i + 2] * 0.15; if (lum > cg) { cg = lum; chestGlow = [xx, yy]; } }
  // 轮廓框按「像素多少」来定，不看最边上那一两个点：残留的渣会让角色被缩得很小
  {
    const colN = new Int32Array(W), rowN = new Int32Array(H); let total = 0;
    for (let yy = 0; yy < H; yy += step) for (let xx = 0; xx < W; xx += step) { if (p[(yy * W + xx) * 4 + 3] < 60) continue; colN[xx]++; rowN[yy]++; total++; }
    if (total > 40) {
      const edge = (arr, n, from) => { let acc = 0; const cut = total * 0.004;
        if (from > 0) { for (let i = 0; i < n; i++) { acc += arr[i]; if (acc > cut) return i; } return 0; }
        for (let i = n - 1; i >= 0; i--) { acc += arr[i]; if (acc > cut) return i; } return n - 1; };
      minx = edge(colN, W, 1); maxx = edge(colN, W, -1); miny = edge(rowN, H, 1); maxy = edge(rowN, H, -1);
    }
  }
  c.anchors = { box: [minx, miny, maxx, maxy], top: [topX, topY], right, left, bright, blue, chestGlow: cg > 200 ? chestGlow : null };
  return c;
}
async function loadKeyed(url) { return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { try { res(keyScreen(im)); } catch (e) { rej(e); } }; im.onerror = () => rej(new Error("图片加载失败")); im.src = url; }); }

export function makeChar(id) {
  const base = CHARS[id];
  return function make(canvas, opts = {}) {
    const def = withTaps({ ...base, ...(SKIN_DEFAULTS[id] || {}) }, id);
    const REACT = expandTaps(def);
    const mt = window.mt;
    const ctx = canvas.getContext("2d");
    const S = { mood: "idle", talking: false, carried: false, lookTarget: { x: 0, y: 0 }, hop: 0, pet: { amt: 0 }, mouth: 0, squash: 1 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const imgs = {};
    let W = 1, H = 1, dead = false, raf = 0, ready = false, error = "", status = { pct: 0, note: "" };
    let cur = "idle", prev = "idle", fade = 1, frameUntil = 0;
    let hopY = 0, hopV = 0, sq = 0, sqV = 0, spin = 0, spinV = 0, sway = 0, lastPet = 0, t0 = performance.now(), timers = [];
    let blink = 0, blinkT = 2 + Math.random() * 3, look = { x: 0, y: 0 };

    const geometry = () => ({ cx: W / 2, cy: H * 0.5, R: H / 4 });
    const place = im => { if (!im) return null; const [x0, y0, x1, y1] = im.anchors.box; const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0); const s = Math.min(W * 0.94 / bw, H * 0.96 / bh); return { s, x: W / 2 - (x0 + bw / 2) * s, y: H - 4 - y1 * s, bw: bw * s, bh: bh * s, top: H - 4 - bh * s }; };
    const fxGeom = () => {
      const g = geometry(); const im = imgs[cur] || imgs.idle; const pl = im ? place(im) : null;
      if (!pl) return { ...g, head: { x: g.cx, y: H * 0.2 }, chest: { x: g.cx, y: H * 0.45 }, feet: { x: g.cx, y: H - 6 } };
      const bx = W / 2;
      return { ...g, head: { x: bx, y: pl.top + pl.bh * 0.16 }, chest: { x: bx, y: pl.top + pl.bh * 0.45 }, feet: { x: bx, y: H - 6 },
               headR: { x: bx + pl.bw * 0.42, y: pl.top + pl.bh * 0.1 }, headL: { x: bx - pl.bw * 0.42, y: pl.top + pl.bh * 0.1 } };
    };
    const fx = makeFx(fxGeom);

    function resize() { const r = canvas.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height)); canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    async function boot() {
      try {
        if (!mt || !mt.invoke) throw new Error("要在毛团里才能画");
        const r = await mt.invoke("char:ensure", { id, frames: CHAR_FRAMES });
        if (dead) return;
        if (!r || !r.ok) throw new Error((r && r.error) || "画不出来");
        for (const [f, url] of Object.entries(r.frames)) { try { imgs[f] = await loadKeyed(url); } catch (e) { console.warn("[char]", f, e); } }
        if (dead) return;
        if (!imgs.idle) throw new Error("第一张没画出来");
        ready = true;
      } catch (e) { error = e.message || String(e); console.error("[char]", e); }
    }
    function setFrame(f, ms) { if (!imgs[f] || f === cur) { if (ms) frameUntil = performance.now() + ms; return; } prev = cur; cur = f; fade = 0; frameUntil = ms ? performance.now() + ms : 0; }
    function run(steps, ctxArg) {
      let t = 0;
      for (const st of steps || []) {
        t += st.delay || 0;
        const go = () => {
          if (dead) return;
          if (st.face) setFrame(st.face, st.hold || 1200);
          if (st.mood) { S.mood = st.mood; }
          if (st.fx) fx.run(st.fx, ctxArg);
          if (st.hop) S.hop = 1.0001;
          if (st.spin) { if (!spinV) spinV = TAU / 0.7; }
          if (st.squash) sqV += st.squash;
          if (st.look) { look.tx = st.look[0]; look.ty = st.look[1]; }
        };
        if (t) timers.push(setTimeout(go, t)); else go();
      }
    }
    function react(ev, ctxArg) { const steps = REACT[ev]; if (steps) run(steps, ctxArg); return !!steps; }
    // 心情决定平时那张脸
    const moodFrame = () => S.mood === "happy" ? "happy" : S.mood === "thinking" ? "idle" : S.mood === "sleepy" ? "blink" : "idle";

    function tick() {
      if (dead) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now(); const dt = Math.min(0.05, (now - (tick.last || now)) / 1000); tick.last = now; const t = (now - t0) / 1000;
      if (S.hop > 1) { S.hop = 0; hopV = -480; }
      hopV += 1700 * dt; hopY += hopV * dt; if (hopY > 0) { if (hopV > 200) sqV += hopV / 900; hopY = 0; hopV = 0; }
      sqV += -sq * 60 * dt; sqV *= Math.pow(0.02, dt); sq += sqV * dt;
      if (spinV > 0) { spin += spinV * dt; if (spin >= TAU) { spin = 0; spinV = 0; } }
      const swayT = S.carried ? Math.sin(now / 260) : 0; sway += (swayT - sway) * Math.min(1, dt * 8);
      S.pet.amt *= Math.pow(0.15, dt);
      look.x += ((look.tx ?? S.lookTarget.x) - look.x) * Math.min(1, dt * 5);
      look.y += ((look.ty ?? S.lookTarget.y) - look.y) * Math.min(1, dt * 5);
      if (look.tx !== undefined && Math.abs(look.x - look.tx) < 0.03) { look.tx = undefined; look.ty = undefined; }
      // 眨眼：平时那张换成闭眼那张，很短
      // 四张脸是"心情"，不是逐帧动画——换脸走 0.4 秒的交叉淡入，看着像它自己变了个表情
      blinkT -= dt;
      if (blinkT <= 0) { blinkT = 6 + Math.random() * 6; blink = 0.5; }
      if (blink > 0) blink = Math.max(0, blink - dt);
      if (!frameUntil || now > frameUntil) {
        const want = S.mood === "sleepy" ? "blink" : (blink > 0 && imgs.blink ? "blink" : moodFrame());
        if (want !== cur) { prev = cur; cur = want; fade = 0; }
        frameUntil = 0;
      }
      fade = Math.min(1, fade + dt * 2.6);
      fx.tick(dt);
      const sh = fx.shakeOffset();
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(sh.x, sh.y);
      fx.drawLayers(ctx, true);
      const im = imgs[cur] || imgs.idle; const pl = im ? place(im) : null;
      if (pl) {
        // 呼吸 + 轻轻上下浮 + 说话时点头
        const breath = Math.sin(t * 1.5) * 0.010, bob = Math.sin(t * 0.9) * 3, nod = S.talking ? Math.sin(t * 9) * 1.6 * (0.4 + S.mouth) : 0;
        ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = "#1E1A24"; ctx.beginPath(); ctx.ellipse(W / 2, H - 5, pl.bw * 0.34, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
        const glowA = (S.talking ? 0.12 + S.mouth * 0.2 : 0) + S.pet.amt * 0.28 + (S.mood === "happy" ? 0.12 : 0);
        if (glowA > 0.02) { const col = (def.theme && def.theme.colors && def.theme.colors[0]) || "#FFFFFF"; const gr = ctx.createRadialGradient(W / 2, pl.top + pl.bh * 0.45, 10, W / 2, pl.top + pl.bh * 0.45, pl.bw * 0.85); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(255,255,255,0)"); ctx.save(); ctx.globalAlpha = Math.min(0.55, glowA); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore(); }
        ctx.save();
        ctx.translate(W / 2 + look.x * pl.bw * 0.05, H - 4 + hopY + bob + nod);
        ctx.rotate(sway * 0.1 + look.x * 0.035 + (S.mood === "sleepy" ? 0.05 : 0));
        const sx = (1 + sq * 0.35 + breath) * (spinV > 0 ? Math.cos(spin) : 1), sy = 1 - sq * 0.35 - breath;
        ctx.scale(sx, sy);
        const draw1 = (image, a) => { if (!image) return; const pp = place(image); ctx.globalAlpha = a; ctx.drawImage(image, pp.x - W / 2, pp.y - (H - 4), image.width * pp.s, image.height * pp.s); };
        if (fade < 1 && imgs[prev]) draw1(imgs[prev], 1 - fade);
        draw1(imgs[cur], fade);
        ctx.restore();
        if (S.mood === "sleepy" && Math.random() < dt * 0.6) fx.burst("zzz", 1, { at: "headR", speed: 20, lift: 30, gravity: -10 });
      } else drawLoading();
      fx.drawParts(ctx); fx.drawLayers(ctx, false);
      ctx.restore();
    }
    function drawLoading() {
      const cx = W / 2, cy = H * 0.55;
      ctx.save();
      ctx.fillStyle = "rgba(120,110,130,0.10)"; ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.16, H * 0.28, 0, 0, TAU); ctx.fill();
      if (!error) { ctx.strokeStyle = "rgba(240,138,155,0.35)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy - H * 0.2, W * 0.15, 0, TAU); ctx.stroke(); ctx.strokeStyle = "#F08A9B"; ctx.beginPath(); ctx.arc(cx, cy - H * 0.2, W * 0.15, -Math.PI / 2, -Math.PI / 2 + TAU * status.pct / 100); ctx.stroke(); }
      ctx.fillStyle = error ? "#AF5164" : "#6E6776"; ctx.font = `12px -apple-system, "PingFang SC", sans-serif`; ctx.textAlign = "center";
      const text = error ? `画不出${def.name}：${error}` : `正在画${def.name} ${status.pct}%`;
      let line = "", y = H * 0.86;
      for (const ch of text) { if (ctx.measureText(line + ch).width > W * 0.9) { ctx.fillText(line, cx, y); y += 16; line = ch; } else line += ch; }
      ctx.fillText(line, cx, y);
      ctx.restore();
    }
    const hit = (x, y) => {
      const im = imgs[cur] || imgs.idle; if (!im) return Math.abs(x - W / 2) < W * 0.22 && y > H * 0.3;
      const pl = place(im); const ix = Math.floor((x - pl.x) / pl.s), iy = Math.floor((y - pl.y) / pl.s);
      if (ix < 0 || iy < 0 || ix >= im.width || iy >= im.height) return false;
      try { return im.getContext("2d").getImageData(ix, iy, 1, 1).data[3] > 40; } catch { return true; }
    };
    if (mt && mt.on) mt.on("char:progress", p => { if (p && p.id === id) status = { pct: p.pct, note: p.note }; });
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    resize(); tick(); boot();
    return {
      S, geometry, hit, react, character: def, lines: def.lines || null,
      petAt: () => { S.pet.amt = Math.min(1, S.pet.amt + 0.25); const now = performance.now(); if (now - lastPet > 2600) { lastPet = now; if (!react("pet")) setFrame("happy", 1400); } },
      spawn: (kind, n = 1) => fx.burst(kind === "z" ? "zzz" : kind, n, { at: "head", speed: 50 }),
      setMouth: v => { S.mouth = Math.max(0, Math.min(1, v || 0)); },
      setMood: m => { S.mood = m || "idle"; },
      poke: () => { S.pet.amt = 1; if (!react("poke")) { S.hop = 1.0001; setFrame("happy", 1200); } },
      land: k => { sqV += 2.2 * (k || 1); react("land", { k }); },
      spin: () => { if (!spinV) spinV = TAU / 0.7; react("spin"); },
      resize,
      destroy: () => { dead = true; cancelAnimationFrame(raf); for (const t of timers) clearTimeout(t); ro.disconnect(); ctx.clearRect(0, 0, W, H); }
    };
  };
}
