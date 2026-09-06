import { makeFx } from "./fx2d.js";
import { HEROES } from "./heroCatalog.js";

// "真实版"英雄：主进程用 MiniMax image-01 生成写实渲染风的三张图（待机 / 得意 / 沮丧，绿幕），
// 这里把绿抠掉，画在舞台上，配上呼吸、悬浮、看向、蹦、落地压扁、转身、被拎着晃，
// 反应表（heroCatalog.js）里的 pose 映射成换图 + 特效。图还没生成好时先用手绘版顶着。
const TAU = Math.PI * 2;
const POSE_IMG = { repulsor: "win", raise: "win", flex: "win", smash: "win", clones: "win", cast: "win", flip: "win", fly: "win", expand: "win", compute: "idle", bright: "idle", glow: "idle", happy: "win", smile: "win", sag: "lose", sulk: "lose", storm: "lose", hang: "lose", vanish: "lose", alert: "lose", calm: "idle", shrug: "idle", crouch: "idle", point: "idle", guard: "idle", swing: "win", bow: "idle", smirk: "idle", shoot: "idle", scan: "idle", whirl: "win" };

// 绿幕抠图：按"绿的优势"算 alpha，再把边缘的绿溢出压掉
function keyGreen(img) {
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  // 用四角估计幕布颜色，判断是不是绿幕；不是就按颜色距离抠
  const corner = (i) => [p[i], p[i + 1], p[i + 2]];
  const cs = [corner(0), corner((c.width - 1) * 4), corner((c.height - 1) * c.width * 4), corner(((c.height - 1) * c.width + c.width - 1) * 4)];
  const key = cs.reduce((a, b) => [a[0] + b[0] / 4, a[1] + b[1] / 4, a[2] + b[2] / 4], [0, 0, 0]);
  // 幕布是绿还是洋红，看"颜色优势"（不看亮度，四角常常有暗角）；阈值按四角实际测到的优势自适应
  const greenness = key[1] - Math.max(key[0], key[2]), magentaness = Math.min(key[0], key[2]) - key[1];
  const greenScreen = greenness > 22, magentaScreen = !greenScreen && magentaness > 22;
  const cornerDom = greenScreen ? greenness : magentaness;
  const hi = Math.max(45, cornerDom * 0.75), lo = Math.max(14, cornerDom * 0.3);
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    let a;
    if (greenScreen) { const dom = g - Math.max(r, b); a = dom >= hi ? 0 : dom > lo ? 1 - (dom - lo) / (hi - lo) : 1; if (dom > 0 && a < 1) { p[i + 1] = Math.max(r, b); } }
    else if (magentaScreen) { const dom = Math.min(r, b) - g; a = dom >= hi ? 0 : dom > lo ? 1 - (dom - lo) / (hi - lo) : 1; if (dom > 0 && a < 1) { const m = Math.min(r, b); p[i] = Math.min(r, g + (r - m)); p[i + 2] = Math.min(b, g + (b - m)); } }
    else { const dist = Math.hypot(r - key[0], g - key[1], b - key[2]); a = dist < 25 ? 0 : dist < 80 ? (dist - 25) / 55 : 1; }
    p[i + 3] = Math.round(a * 255);
  }
  x.putImageData(d, 0, 0);
  return c;
}
async function loadKeyed(url) { return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { try { res(keyGreen(im)); } catch (e) { rej(e); } }; im.onerror = () => rej(new Error("图片加载失败")); im.src = url; }); }

export function makePhotoHero(id, fallbackMake) {
  const def = HEROES[id];
  return function make(canvas, opts = {}) {
    const mt = window.mt;
    let fb = fallbackMake(canvas, opts);           // 手绘版先顶着
    const S = fb.S;
    const imgs = {}; let ready = false, dead = false, raf = 0, ctx = null, W = 1, H = 1, dpr = Math.min(2, window.devicePixelRatio || 1);
    let status = { pct: 0, note: "" }, error = "";
    let cur = "idle", prev = "idle", fade = 1, poseUntil = 0;
    let hopY = 0, hopV = 0, sq = 0, sqV = 0, spin = 0, spinV = 0, sway = 0, breath = 0, lastPet = 0, t0 = performance.now(), timers = [];
    const geometry = () => ({ cx: W / 2, cy: H * 0.5, R: H / 4 });
    const bounds = () => { const im = imgs[cur] || imgs.idle; if (!im) return null; const s = Math.min(W * 0.92 / im.width, H * 0.95 / im.height); return { s, w: im.width * s, h: im.height * s, x: W / 2 - im.width * s / 2, y: H - im.height * s - 4 }; };
    const fxGeom = () => { const g = geometry(); const b = bounds(); const top = b ? b.y : H * 0.1; const h = b ? b.h : H * 0.85; const isOrb = def.kind === "jarvis"; return { ...g, head: { x: g.cx, y: isOrb ? top + h * 0.5 : top + h * 0.1 }, chest: { x: g.cx, y: top + h * 0.32 }, feet: { x: g.cx, y: H - 6 }, handR: { x: g.cx + (b ? b.w * 0.35 : 40), y: top + h * (cur === "win" ? 0.12 : 0.5) }, handL: { x: g.cx - (b ? b.w * 0.35 : 40), y: top + h * 0.5 } }; };
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
        // 换成真实版：把手绘版拆掉，自己接管画布
        fb.destroy(); fb = null; ready = true;
        ctx = canvas.getContext("2d"); resize(); tick();
        mt.send && mt.send("hero:ready", { id });
      } catch (e) { error = e.message || String(e); console.error("[photo]", e); }
    }
    function resize() { const r = canvas.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height)); canvas.width = W * dpr; canvas.height = H * dpr; if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function setPose(name, ms) { const img = POSE_IMG[name] || "idle"; if (imgs[img] && img !== cur) { prev = cur; cur = img; fade = 0; } poseUntil = performance.now() + ms; }
    function run(steps, ctxArg) {
      let t = 0;
      for (const st of steps || []) {
        t += st.delay || 0;
        const go = () => { if (dead) return; if (st.pose) setPose(st.pose[0], st.pose[1] || 1000); if (st.fx) fx.run(st.fx, ctxArg); if (st.hop) S.hop = 1.0001; if (st.spin) spinFn(false); if (st.squash) sqV += st.squash; };
        if (t) timers.push(setTimeout(go, t)); else go();
      }
    }
    function react(event, ctxArg) { if (!ready) return fb && fb.react ? fb.react(event, ctxArg) : false; const steps = (def.react || {})[event]; if (steps) run(steps, ctxArg); return !!steps; }
    function tick() {
      if (dead || !ready) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now(); const dt = Math.min(0.05, (now - (tick.last || now)) / 1000); tick.last = now; const t = (now - t0) / 1000;
      if (S.hop > 1) { S.hop = 0; hopV = -520; }
      hopV += 1800 * dt; hopY += hopV * dt; if (hopY > 0) { if (hopV > 200) sqV += hopV / 900; hopY = 0; hopV = 0; }
      sqV += -sq * 60 * dt; sqV *= Math.pow(0.02, dt); sq += sqV * dt;
      if (spinV > 0) { spin += spinV * dt; if (spin >= TAU) { spin = 0; spinV = 0; } }
      const swayT = S.carried ? Math.sin(now / 260) : 0; sway += (swayT - sway) * Math.min(1, dt * 8);
      S.pet.amt *= Math.pow(0.15, dt);
      if (poseUntil && now > poseUntil) { poseUntil = 0; if (cur !== "idle" && imgs.idle) { prev = cur; cur = "idle"; fade = 0; } }
      fade = Math.min(1, fade + dt * 4);
      breath = Math.sin(t * 1.4) * 0.008;
      fx.tick(dt);
      const sh = fx.shakeOffset();
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(sh.x, sh.y);
      fx.drawLayers(ctx, true);
      const b = bounds();
      if (b) {
        const hover = def.kind === "iron" || def.kind === "jarvis" ? Math.sin(t * 1.1) * 4 - (def.kind === "jarvis" ? 10 : 0) : 0;
        // 影子
        ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = "#1E1A24"; ctx.beginPath(); ctx.ellipse(W / 2, H - 5, b.w * 0.32 * (1 - hopY / -200 * 0.3), 6, 0, 0, TAU); ctx.fill(); ctx.restore();
        // 说话 / 被摸时背后有一层光
        const glowA = (S.talking ? 0.25 + S.mouth * 0.35 : 0) + S.pet.amt * 0.3 + (S.mood === "happy" ? 0.15 : 0);
        if (glowA > 0.02) { const col = (def.theme && def.theme.colors && def.theme.colors[0]) || "#FFFFFF"; const gr = ctx.createRadialGradient(W / 2, b.y + b.h * 0.4, 10, W / 2, b.y + b.h * 0.4, b.w * 0.8); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(255,255,255,0)"); ctx.save(); ctx.globalAlpha = Math.min(0.6, glowA); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore(); }
        ctx.save();
        ctx.translate(W / 2, H - 4 + hopY + hover);
        ctx.rotate(sway * 0.1 + (S.mood === "sleepy" ? 0.06 : 0) + S.lookTarget.x * 0.03);
        const sx = (1 + sq * 0.4 + breath) * (spinV > 0 ? Math.cos(spin) : 1), sy = 1 - sq * 0.4 - breath;
        ctx.scale(sx, sy);
        const drawImg = (im, a) => { if (!im) return; const s = Math.min(W * 0.92 / im.width, H * 0.95 / im.height); ctx.globalAlpha = a * (S.mood === "sleepy" ? 0.85 : 1); ctx.drawImage(im, -im.width * s / 2, -im.height * s, im.width * s, im.height * s); };
        if (fade < 1 && imgs[prev]) drawImg(imgs[prev], 1 - fade);
        drawImg(imgs[cur], fade);
        ctx.restore();
        if (S.mood === "sleepy" && Math.random() < dt * 0.6) fx.burst("zzz", 1, { at: "headR", speed: 20, lift: 30, gravity: -10 });
      }
      fx.drawParts(ctx); fx.drawLayers(ctx, false);
      ctx.restore();
    }
    // 命中：看图的 alpha
    const hit = (x, y) => {
      if (!ready) return fb ? fb.hit(x, y) : false;
      const b = bounds(); if (!b) return false; const im = imgs[cur] || imgs.idle;
      const ix = Math.floor((x - b.x) / b.s), iy = Math.floor((y - b.y) / b.s);
      if (ix < 0 || iy < 0 || ix >= im.width || iy >= im.height) return false;
      try { return im.getContext("2d").getImageData(ix, iy, 1, 1).data[3] > 40; } catch { return true; }
    };
    function spinFn(withReact = true) { if (!spinV) spinV = TAU / 0.7; if (withReact) react("spin"); }
    const api = {
      S, geometry, react, lines: def.lines || null, character: def,
      hit,
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
