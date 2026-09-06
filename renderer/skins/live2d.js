import { L2D_MODELS } from "./live2dCatalog.js";

// 二次元角色：底下垫一张 WebGL 画布交给 Live2D（pixi.js + pixi-live2d-display），
// 上面原来的 2D 画布只画粒子和"正在下载"的提示。眨眼、呼吸、头发物理、待机动作都是模型自带的；
// 看鼠标、张嘴说话、脸红、闭眼睡觉、被拎起来晃、蹦、转圈是我们每帧往参数里写的。
const VENDOR = new URL("../../node_modules/", import.meta.url).href;
const scripts = {};
function loadScript(src) {
  return scripts[src] || (scripts[src] = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.onload = () => res(); s.onerror = () => { delete scripts[src]; rej(new Error("加载失败 " + src)); };
    document.head.append(s);
  }));
}
const TAU = Math.PI * 2;
const GLYPH = { heart: ["♥", "#F08A9B"], note: ["♪", "#8E7CC3"], zzz: ["z", "#9A94A6"], star: ["✦", "#F2C46B"], sweat: ["💧", "#7FB3E6"] };

export function makeLive2D(id) {
  const def = L2D_MODELS[id];
  return function make(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    const mt = window.mt;
    const S = { mood: "idle", talking: false, carried: false, lookTarget: { x: 0, y: 0 }, hop: 0, pet: { amt: 0 }, mouth: 0 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 1, H = 1, app = null, model = null, fit = 1, dead = false, raf = 0;
    let status = { pct: 0, note: "" }, error = "";
    const parts = [];
    // 小物理：蹦、落地压扁、转圈、拎起来晃
    let hopY = 0, hopV = 0, sq = 0, sqV = 0, spin = 0, spinV = 0, blush = 0, sway = 0, lastTap = 0, t0 = performance.now();

    const gl = document.createElement("canvas");
    gl.style.cssText = "position:absolute;left:50%;bottom:0;transform:translateX(-50%);pointer-events:none;";
    canvas.parentNode.insertBefore(gl, canvas);

    function resize() {
      const r = canvas.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gl.style.width = W + "px"; gl.style.height = H + "px";
      if (app) app.renderer.resize(W, H);
      place();
    }
    function place() {
      if (!model) return;
      const im = model.internalModel;
      fit = Math.min(W * 0.96 / im.originalWidth, H * 0.98 / im.originalHeight) * (def.scale || 1);
      model.anchor.set(0.5, 1);
      model.position.set(W / 2, H + (def.dy || 0) * H);
      model.scale.set(fit);
    }
    const geometry = () => { const h = model ? model.height : H * 0.9; const R = h / 4; return { cx: W / 2, cy: H - 2 * R, R }; };
    const hit = (x, y) => {
      if (!model) return Math.abs(x - W / 2) < W * 0.22 && y > H * 0.25;
      let names = []; try { names = model.hitTest(x, y); } catch {}
      return names.length > 0 || (Math.abs(x - W / 2) < model.width * 0.2 && y > H - model.height * 0.97);
    };
    function param(name, v, add) {
      try { const cm = model.internalModel.coreModel; if (cm.getParameterIndex(name) < 0) return; add ? cm.addParameterValueById(name, v) : cm.setParameterValueById(name, v); } catch {}
    }
    function motion(group) {
      if (!model) return false;
      const defs = model.internalModel.motionManager.definitions || {};
      const g = group && defs[group] ? group : Object.keys(defs).find(k => k !== "Idle" && defs[k] && defs[k].length);
      if (!g) return false;
      try { model.motion(g, undefined, 2); } catch {}    // 2 = NORMAL
      return true;
    }

    async function boot() {
      try {
        if (!mt || !mt.invoke) throw new Error("要在毛团里才能请到她");
        status = { pct: 0, note: "准备" };
        const r = await mt.invoke("live2d:ensure", { id });
        if (dead) return;
        if (!r || !r.ok) throw new Error((r && r.error) || "下载失败");
        status = { pct: 100, note: "引擎" };
        await loadScript(VENDOR + "pixi.js/dist/pixi.min.js");
        await loadScript(r.core);
        await loadScript(VENDOR + "pixi-live2d-display/dist/cubism4.min.js");
        if (dead) return;
        const PIXI = window.PIXI;
        app = new PIXI.Application({ view: gl, width: W, height: H, backgroundAlpha: 0, antialias: true, resolution: dpr, autoDensity: true });
        const m = await PIXI.live2d.Live2DModel.from(r.url, { autoInteract: false, motionPreload: "IDLE" });
        if (dead) { try { m.destroy(); } catch {} return; }
        model = m; app.stage.addChild(model); place();
        model.internalModel.on("beforeModelUpdate", overrideParams);
        try { PIXI.live2d.SoundManager.volume = 0; } catch {}
        mt.send && mt.send("live2d:ready", { id });
      } catch (e) { error = e.message || String(e); console.error("[live2d]", e); }
    }
    // 每帧盖在动作之上的参数：嘴、眼、脸红、看向、歪头
    function overrideParams() {
      const t = (performance.now() - t0) / 1000;
      if (S.talking || S.mouth > 0.02) param("ParamMouthOpenY", Math.min(1, S.mouth * 1.4));
      if (S.mood === "sleepy") { param("ParamEyeLOpen", 0); param("ParamEyeROpen", 0); param("ParamAngleZ", 8 + Math.sin(t * 0.8) * 3, true); param("ParamAngleY", -12, true); }
      if (S.mood === "reading") { param("ParamEyeBallY", -0.6); param("ParamAngleY", -10, true); }
      if (S.mood === "thinking") { param("ParamEyeBallX", 0.5); param("ParamEyeBallY", 0.6); param("ParamAngleZ", -7, true); }
      if (blush > 0.03) param("ParamCheek", blush);
      if (S.carried) { param("ParamAngleZ", sway * 18, true); param("ParamBodyAngleZ", sway * 8, true); param("ParamEyeBallY", 0.4); }
      if (S.mood === "happy" && !S.carried) param("ParamAngleZ", Math.sin(t * 2.2) * 4, true);
    }

    function tick() {
      if (dead) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now(); const dt = Math.min(0.05, (now - (tick.last || now)) / 1000); tick.last = now;
      // 物理
      if (S.hop > 1) { S.hop = 0; hopV = -520; }
      hopV += 1800 * dt; hopY += hopV * dt; if (hopY > 0) { if (hopV > 200) { sqV += hopV / 900; } hopY = 0; hopV = 0; }
      sqV += -sq * 60 * dt; sqV *= Math.pow(0.02, dt); sq += sqV * dt;
      if (spinV > 0) { spin += spinV * dt; if (spin >= TAU) { spin = 0; spinV = 0; } }
      const swayT = S.carried ? Math.sin(now / 260) : 0; sway += (swayT - sway) * Math.min(1, dt * 8);
      const blushT = (S.mood === "happy" ? 0.7 : 0) + S.pet.amt * 0.8; blush += (blushT - blush) * Math.min(1, dt * 3);
      S.pet.amt *= Math.pow(0.15, dt);
      if (model) {
        model.position.set(W / 2, H + (def.dy || 0) * H + hopY);
        model.scale.set(fit * (1 + sq * 0.5), fit * (1 - sq * 0.5));
        model.rotation = spin + sway * 0.12;
        const lx = S.lookTarget.x, ly = S.lookTarget.y;
        model.focus(W / 2 + lx * W * 0.7, H * 0.35 + ly * H * 0.6);
        if (S.mood === "sleepy" && Math.random() < dt * 0.6) spawn("zzz", 1);
      }
      // 2D 层
      ctx.clearRect(0, 0, W, H);
      if (!model) drawLoading();
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 20 * dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        const [g, col] = GLYPH[p.kind] || GLYPH.heart;
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillStyle = col; ctx.font = `${p.size}px -apple-system, "PingFang SC", sans-serif`; ctx.textAlign = "center";
        ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.life * 5 + p.seed) * 0.25); ctx.fillText(g, 0, 0); ctx.restore();
      }
    }
    function drawLoading() {
      const cx = W / 2, cy = H * 0.55;
      ctx.save();
      ctx.fillStyle = "rgba(120, 110, 130, 0.10)"; ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.16, H * 0.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(120, 110, 130, 0.14)"; ctx.beginPath(); ctx.arc(cx, cy - H * 0.2, W * 0.12, 0, TAU); ctx.fill();
      if (!error) {
        ctx.strokeStyle = "rgba(240, 138, 155, 0.35)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy - H * 0.2, W * 0.15, 0, TAU); ctx.stroke();
        ctx.strokeStyle = "#F08A9B"; ctx.beginPath(); ctx.arc(cx, cy - H * 0.2, W * 0.15, -Math.PI / 2, -Math.PI / 2 + TAU * status.pct / 100); ctx.stroke();
      }
      ctx.fillStyle = error ? "#AF5164" : "#6E6776"; ctx.font = `12px -apple-system, "PingFang SC", sans-serif`; ctx.textAlign = "center";
      const text = error ? `请不到${def.name}：${error}` : (status.pct >= 100 ? `${def.name}来了，站好…` : `正在把${def.name}请过来 ${status.pct}%`);
      wrap(text, cx, H * 0.86, W * 0.9, 16);
      ctx.restore();
    }
    function wrap(text, x, y, maxW, lh) { let line = ""; for (const ch of text) { if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x, y); y += lh; line = ch; } else line += ch; } ctx.fillText(line, x, y); }

    function spawn(kind, n = 1) {
      const g = geometry();
      for (let i = 0; i < n; i++) parts.push({ kind, x: g.cx + (Math.random() - 0.5) * g.R * 2.2, y: g.cy - g.R * (1.2 + Math.random() * 0.8), vx: (Math.random() - 0.5) * 30, vy: -25 - Math.random() * 30, life: 1.2 + Math.random() * 0.8, size: 13 + Math.random() * 8, seed: Math.random() * 7 });
    }
    const setMouth = v => { S.mouth = Math.max(0, Math.min(1, v || 0)); };
    const setMood = m => { S.mood = m || "idle"; if (m === "happy") { blush = Math.max(blush, 0.4); } };
    const poke = () => { S.pet.amt = 1; S.hop = 1.0001; if (!motion("TapBody")) motion(); };
    const petAt = () => { S.pet.amt = Math.min(1, S.pet.amt + 0.25); const now = performance.now(); if (now - lastTap > 2500) { lastTap = now; motion("TapBody") || motion("TapHead"); } };
    const land = k => { sqV += 2.2 * (k || 1); if ((k || 1) > 0.7) motion("TapBody"); };
    const spinFn = () => { if (!spinV) spinV = TAU / 0.7; };
    function destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      try { model && model.destroy(); } catch {}
      try { app && app.destroy(false, { children: true }); } catch {}
      model = null; app = null; gl.remove();
      ctx.clearRect(0, 0, W, H);
    }
    if (mt && mt.on) mt.on("live2d:progress", p => { if (p && p.id === id) status = { pct: p.pct, note: p.note }; });
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    resize(); tick(); boot();
    return { S, hit, petAt, geometry, spawn, setMouth, setMood, poke, land, spin: spinFn, destroy, resize };
  };
}
