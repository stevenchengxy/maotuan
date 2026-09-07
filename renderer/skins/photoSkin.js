import { makeFx } from "./fx2d.js";
import { HEROES } from "./heroCatalog.js";

// "真实版"英雄：主进程用 MiniMax image-01 生成写实渲染风的三张图（待机 / 得意 / 沮丧，绿幕或洋红幕），
// 这里把幕布抠掉，从抠出来的轮廓里找锚点（头顶、举起的手、胸口最亮的反应堆、蓝色的宝石……），
// 画在舞台上，配上呼吸、悬浮、看向、蹦、落地压扁、转身、被拎着晃、分身、消失、翻跟头、倒挂、光环、推进器，
// 反应表（heroCatalog.js）里的 pose 映射成换图 + 这些动作 + 特效。图还没生成好时先用手绘版顶着。
const TAU = Math.PI * 2;
const POSE_IMG = { repulsor: "win", raise: "win", flex: "win", smash: "win", clones: "win", cast: "win", flip: "win", fly: "win", expand: "win", compute: "idle", bright: "idle", glow: "idle", happy: "win", smile: "win", sag: "lose", sulk: "lose", storm: "lose", hang: "lose", vanish: "lose", alert: "lose", calm: "idle", shrug: "idle", crouch: "idle", point: "idle", guard: "idle", swing: "win", bow: "idle", smirk: "idle", shoot: "idle", scan: "idle", whirl: "win" };

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
  c.anchors = { box: [minx, miny, maxx, maxy], top: [topX, topY], right, left, bright, blue, chestGlow: cg > 200 ? chestGlow : null };
  return c;
}
async function loadKeyed(url) { return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { try { res(keyScreen(im)); } catch (e) { rej(e); } }; im.onerror = () => rej(new Error("图片加载失败")); im.src = url; }); }

export function makePhotoHero(id, fallbackMake) {
  const def = HEROES[id];
  return function make(canvas, opts = {}) {
    const mt = window.mt;
    let fb = fallbackMake(canvas, opts);           // 手绘版先顶着
    const S = fb.S;
    const imgs = {}; let ready = false, dead = false, raf = 0, ctx = null, W = 1, H = 1, dpr = Math.min(2, window.devicePixelRatio || 1);
    let status = { pct: 0, note: "" }, error = "";
    let cur = "idle", prev = "idle", fade = 1, poseUntil = 0, poseName = "", poseStart = 0, poseDur = 0;
    let hopY = 0, hopV = 0, sq = 0, sqV = 0, spin = 0, spinV = 0, sway = 0, breath = 0, lastPet = 0, t0 = performance.now(), timers = [];
    let rot = 0, rotV = 0, hangK = 0, alpha = 1, clones = 0, aura = null, fly = 0;
    const geometry = () => ({ cx: W / 2, cy: H * 0.5, R: H / 4 });
    // 画图的变换：按轮廓框缩放，脚贴地，居中
    const place = (im) => { if (!im) return null; const [x0, y0, x1, y1] = im.anchors.box; const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0); const s = Math.min(W * 0.9 / bw, H * 0.94 / bh); return { s, x: W / 2 - (x0 + bw / 2) * s, y: H - 4 - y1 * s, bw: bw * s, bh: bh * s, top: H - 4 - bh * s }; };
    const toStage = (im, pt, pl) => pt ? { x: pl.x + pt[0] * pl.s, y: pl.y + pt[1] * pl.s } : null;
    const fxGeom = () => {
      const g = geometry(); const im = imgs[cur] || imgs.idle; const pl = im ? place(im) : null;
      if (!pl) return { ...g, head: { x: g.cx, y: H * 0.12 }, chest: { x: g.cx, y: H * 0.35 }, feet: { x: g.cx, y: H - 6 } };
      const A = im.anchors; const bx = pl.x + (A.box[0] + (A.box[2] - A.box[0]) / 2) * pl.s;
      const isOrb = def.kind === "jarvis";
      const head = { x: bx, y: pl.top + pl.bh * (isOrb ? 0.4 : 0.09) }, chest = { x: bx, y: pl.top + pl.bh * 0.32 }, feet = { x: bx, y: H - 6 };
      const top = toStage(im, A.top, pl) || head, right = toStage(im, A.right, pl) || { x: bx + pl.bw * 0.45, y: chest.y }, left = toStage(im, A.left, pl) || { x: bx - pl.bw * 0.45, y: chest.y };
      const reactor = toStage(im, A.chestGlow, pl) || chest, gem = toStage(im, A.blue, pl) || top, bright = toStage(im, A.bright, pl) || top;
      return { ...g, head, chest, feet, top, handR: right, handL: left, reactor, gem, bright, feetL: { x: bx - pl.bw * 0.22, y: H - 6 }, feetR: { x: bx + pl.bw * 0.22, y: H - 6 } };
    };
    const fx = makeFx(fxGeom);

    async function boot() {
      try {
        if (!mt || !mt.invoke) throw new Error("要在毛团里才能生成");
        const r = await mt.invoke("hero:ensure", { id, poses: ["idle", "win", "lose"] });
        if (dead) return;
        if (!r || !r.ok) throw new Error((r && r.error) || "生成失败");
        for (const [pose, url] of Object.entries(r.poses)) { try { imgs[pose] = await loadKeyed(url); } catch (e) { console.warn("[photo]", pose, e); } }
        if (dead) return;
        if (!imgs.idle) throw new Error("待机图没拿到");
        fb.destroy(); fb = null; ready = true;
        ctx = canvas.getContext("2d"); resize(); tick();
        mt.send && mt.send("hero:ready", { id });
      } catch (e) { error = e.message || String(e); console.error("[photo]", e); }
    }
    function resize() { const r = canvas.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height)); canvas.width = W * dpr; canvas.height = H * dpr; if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function setPose(name, ms) {
      const img = POSE_IMG[name] || "idle"; if (imgs[img] && img !== cur) { prev = cur; cur = img; fade = 0; }
      poseName = name; poseStart = performance.now(); poseDur = ms; poseUntil = poseStart + ms;
      const col = def.aura && def.aura[name]; aura = col ? { color: col, until: poseUntil } : aura;
      if (name === "flip") rotV = -TAU / 0.7;
      if (name === "clones") clones = 1;
      if (name === "fly") fly = 1;
    }
    function run(steps, ctxArg) {
      let t = 0;
      for (const st of steps || []) {
        t += st.delay || 0;
        const go = () => { if (dead) return; if (st.pose) setPose(st.pose[0], st.pose[1] || 1000); if (st.fx) fx.run(st.fx, ctxArg); if (st.hop) S.hop = 1.0001; if (st.spin) spinFn(false); if (st.squash) sqV += st.squash; };
        if (t) timers.push(setTimeout(go, t)); else go();
      }
    }
    function react(event, ctxArg) { if (!ready) return fb && fb.react ? fb.react(event, ctxArg) : false; const steps = (def.react || {})[event]; if (steps) run(steps, ctxArg); return !!steps; }
    // 各英雄的"常驻小动作"
    function ambient(dt, t, G) {
      const k = def.kind;
      if (k === "iron") { const a = 0.18 + 0.12 * Math.sin(t * 3) + S.mouth * 0.3 + S.pet.amt * 0.3; glow(G.reactor, 22 + 6 * Math.sin(t * 3), "#9FE9FF", a); if ((fly > 0 || S.hop > 0) && Math.random() < 0.9) { fx.rise("ember", 1, { at: "feetL", speed: 1.6, spread: 6 }); fx.rise("ember", 1, { at: "feetR", speed: 1.6, spread: 6 }); } }
      if (k === "jarvis") { const a = 0.2 + 0.15 * Math.sin(t * 2) + S.mouth * 0.4; glow(G.reactor.y < G.head.y + 40 ? G.reactor : G.head, 34, "#4FC3F7", a); if (Math.random() < dt * 0.8) fx.burst("sparkle", 1, { at: "head", speed: 25, lift: 10, gravity: -6, colors: ["#4FC3F7", "#FFFFFF"], size: 0.7 }); if (Math.floor(t / 4) !== Math.floor((t - dt) / 4)) fx.grid({ color: "#4FC3F7", dur: 2.4 }); }
      if (k === "thor" && Math.random() < dt * (poseName === "raise" ? 12 : 0.5)) fx.burst("spark", 1, { at: "top", speed: 70, colors: ["#FFF7B0", "#7FD0FF"], size: 0.8 });
      if (k === "loki" && Math.random() < dt * (poseName === "cast" || poseName === "clones" ? 8 : 0.7)) fx.burst("wisp", 1, { at: "gem", speed: 30, lift: 25, gravity: -8, size: 0.8 });
      if (k === "hulk" && (poseName === "flex" || poseName === "smash") && Math.random() < dt * 6) fx.burst("dot", 1, { at: "feet", speed: 60, colors: ["#C9B99A"] });
      if (k === "spider" && hangK > 0.5 && Math.random() < dt * 0.5) fx.burst("sparkle", 1, { at: "top", speed: 10, colors: ["#F4F4F4"], size: 0.6 });
    }
    function glow(pt, r, color, a) { if (!pt) return; const gr = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r); gr.addColorStop(0, color); gr.addColorStop(1, "rgba(255,255,255,0)"); ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, TAU); ctx.fill(); ctx.restore(); }
    function tick() {
      if (dead || !ready) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now(); const dt = Math.min(0.05, (now - (tick.last || now)) / 1000); tick.last = now; const t = (now - t0) / 1000;
      if (S.hop > 1) { S.hop = 0; hopV = -520; }
      hopV += 1800 * dt; hopY += hopV * dt; if (hopY > 0) { if (hopV > 200) sqV += hopV / 900; hopY = 0; hopV = 0; }
      sqV += -sq * 60 * dt; sqV *= Math.pow(0.02, dt); sq += sqV * dt;
      if (spinV > 0) { spin += spinV * dt; if (spin >= TAU) { spin = 0; spinV = 0; } }
      if (rotV) { rot += rotV * dt; if (Math.abs(rot) >= TAU) { rot = 0; rotV = 0; } }
      const hangT = poseName === "hang" && now < poseUntil ? 1 : 0; hangK += (hangT - hangK) * Math.min(1, dt * 6);
      const flyT = poseName === "fly" && now < poseUntil ? 1 : 0; fly += (flyT - fly) * Math.min(1, dt * 4);
      const swayT = S.carried ? Math.sin(now / 260) : 0; sway += (swayT - sway) * Math.min(1, dt * 8);
      S.pet.amt *= Math.pow(0.15, dt);
      if (poseUntil && now > poseUntil) { poseUntil = 0; poseName = ""; clones = 0; if (cur !== "idle" && imgs.idle) { prev = cur; cur = "idle"; fade = 0; } }
      if (poseName === "vanish") { const k = (now - poseStart) / Math.max(1, poseDur); alpha = 1 - Math.sin(Math.min(1, k) * Math.PI); } else alpha += (1 - alpha) * Math.min(1, dt * 6);
      if (aura && now > aura.until) aura = null;
      fade = Math.min(1, fade + dt * 4);
      breath = Math.sin(t * 1.4) * (def.kind === "hulk" ? 0.014 : 0.008);
      fx.tick(dt);
      const sh = fx.shakeOffset();
      const G = fxGeom();
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(sh.x, sh.y);
      fx.drawLayers(ctx, true);
      const im = imgs[cur] || imgs.idle; const pl = place(im);
      if (pl) {
        const hover = (def.kind === "iron" || def.kind === "jarvis" ? Math.sin(t * 1.1) * 4 - (def.kind === "jarvis" ? 10 : 0) : 0) - fly * 26;
        // 影子
        ctx.save(); ctx.globalAlpha = 0.22 * alpha * (1 - hangK); ctx.fillStyle = "#1E1A24"; ctx.beginPath(); ctx.ellipse(W / 2, H - 5, pl.bw * 0.4 * (1 - (hover + hopY) / -260), 6, 0, 0, TAU); ctx.fill(); ctx.restore();
        // 说话 / 被摸时背后有一层光
        const glowA = (S.talking ? 0.2 + S.mouth * 0.35 : 0) + S.pet.amt * 0.3 + (S.mood === "happy" ? 0.12 : 0);
        if (glowA > 0.02) { const col = (def.theme && def.theme.colors && def.theme.colors[0]) || "#FFFFFF"; const gr = ctx.createRadialGradient(W / 2, pl.top + pl.bh * 0.4, 10, W / 2, pl.top + pl.bh * 0.4, pl.bw * 0.9); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(255,255,255,0)"); ctx.save(); ctx.globalAlpha = Math.min(0.6, glowA); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore(); }
        if (hangK > 0.05) { ctx.save(); ctx.globalAlpha = hangK; ctx.strokeStyle = "#F4F4F4"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2, -10); ctx.lineTo(W / 2, 14); ctx.stroke(); ctx.restore(); }
        const drawFigure = (dx, a, shadow) => {
          ctx.save();
          const cyFig = H - 4 + hopY + hover - pl.bh / 2;                      // 身体中心
          const cyHang = pl.bh / 2 + 14;                                        // 倒挂时中心挪到上面
          ctx.translate(W / 2 + dx, cyFig + (cyHang - cyFig) * hangK);
          ctx.rotate(sway * 0.1 + (S.mood === "sleepy" ? 0.06 : 0) + S.lookTarget.x * 0.03 + rot + hangK * Math.PI);
          const sx = (1 + sq * 0.4 + breath) * (spinV > 0 ? Math.cos(spin) : 1), sy = 1 - sq * 0.4 - breath;
          ctx.scale(sx, sy);
          ctx.globalAlpha = a * (S.mood === "sleepy" ? 0.85 : 1);
          if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 16; }
          const draw1 = (image, aa) => { if (!image) return; const pp = place(image); ctx.globalAlpha = a * aa; ctx.drawImage(image, pp.x - W / 2, pp.y - (H - 4) + pl.bh / 2, image.width * pp.s, image.height * pp.s); };
          if (fade < 1 && imgs[prev]) draw1(imgs[prev], 1 - fade);
          draw1(imgs[cur], fade);
          ctx.restore();
        };
        if (clones > 0) { const k = Math.min(1, (now - poseStart) / 400); for (const sgn of [-1, 1]) { drawFigure(sgn * pl.bw * 0.55 * k, 0.42 * alpha, null); glow({ x: W / 2 + sgn * pl.bw * 0.55 * k, y: pl.top + pl.bh * 0.5 }, pl.bh * 0.45, "#3DDC84", 0.18); } }
        if (aura) drawFigure(0, 0.45 * alpha, aura.color);
        drawFigure(0, alpha, null);
        ambient(dt, t, G);
        if (S.mood === "sleepy" && Math.random() < dt * 0.6) fx.burst("zzz", 1, { at: "headR", speed: 20, lift: 30, gravity: -10 });
      }
      fx.drawParts(ctx); fx.drawLayers(ctx, false);
      ctx.restore();
    }
    const hit = (x, y) => {
      if (!ready) return fb ? fb.hit(x, y) : false;
      const im = imgs[cur] || imgs.idle; const pl = place(im); if (!pl) return false;
      const ix = Math.floor((x - pl.x) / pl.s), iy = Math.floor((y - pl.y) / pl.s);
      if (ix < 0 || iy < 0 || ix >= im.width || iy >= im.height) return false;
      try { return im.getContext("2d").getImageData(ix, iy, 1, 1).data[3] > 40; } catch { return true; }
    };
    function spinFn(withReact = true) { if (!spinV) spinV = TAU / 0.7; if (withReact) react("spin"); }
    const api = {
      S, geometry, react, lines: def.lines || null, character: def, hit,
      petAt: (x, y) => { if (!ready) return fb && fb.petAt(x, y); S.pet.amt = Math.min(1, S.pet.amt + 0.25); const now = performance.now(); if (now - lastPet > 2600) { lastPet = now; react("pet"); } },
      spawn: (kind, n = 1) => ready ? fx.burst(kind === "z" ? "zzz" : kind, n, { at: "head", speed: 50 }) : fb && fb.spawn(kind, n),
      setMouth: v => { S.mouth = Math.max(0, Math.min(1, v || 0)); if (!ready && fb) fb.setMouth(v); },
      setMood: m => { S.mood = m || "idle"; if (!ready && fb) fb.setMood(m); },
      poke: () => { if (!ready) return fb && fb.poke(); S.pet.amt = 1; if (!react("poke")) S.hop = 1.0001; },
      land: k => { if (!ready) return fb && fb.land(k); sqV += 2.2 * (k || 1); react("land", { k }); },
      spin: () => { if (!ready) return fb && fb.spin(); spinFn(true); },
      resize: () => { if (ready) resize(); else if (fb && fb.resize) fb.resize(); },
      destroy: () => { dead = true; cancelAnimationFrame(raf); for (const t of timers) clearTimeout(t); if (fb) fb.destroy(); if (ctx) ctx.clearRect(0, 0, W, H); }
    };
    if (mt && mt.on) mt.on("hero:progress", p => { if (p && p.id === id) status = { pct: p.pct, note: p.note }; });
    boot();
    return api;
  };
}
