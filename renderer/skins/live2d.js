import { L2D_MODELS } from "./live2dCatalog.js";
import { makeFx } from "./fx2d.js";
import { expandTaps, withTaps } from "./taps.js";

// 二次元角色：底下垫一张 WebGL 画布交给 Live2D（pixi.js + pixi-live2d-display），
// 上面原来的 2D 画布画特效和"正在下载"的提示。眨眼、呼吸、头发物理、待机动作都是模型自带的；
// 看鼠标、张嘴说话、脸红、闭眼睡觉、被拎起来晃、蹦、转圈，以及每个角色自己的"反应表"（live2dCatalog.js）是我们每帧往参数里写的。
const VENDOR = new URL("../../node_modules/", import.meta.url).href;
const scripts = {};
function loadScript(src) {
  return scripts[src] || (scripts[src] = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.onload = () => res(); s.onerror = () => { delete scripts[src]; rej(new Error("加载失败 " + src)); };
    document.head.append(s);
  }));
}
const TAU = Math.PI * 2;
const DEFAULT_IDS = { cheek: "ParamCheek", eyeL: "ParamEyeLOpen", eyeR: "ParamEyeROpen", mouthOpen: "ParamMouthOpenY", mouthForm: "ParamMouthForm", angleZ: "ParamAngleZ", angleY: "ParamAngleY", bodyZ: "ParamBodyAngleZ", ballX: "ParamEyeBallX", ballY: "ParamEyeBallY" };
// 没写反应表的角色用这份
const DEFAULT_REACT = {
  pet: [{ fx: [["burst", "heart", 2, { at: "headR", speed: 40 }]] }],
  poke: [{ motion: ["TapBody", 0], hop: 1, fx: [["burst", "heart", 4]] }],
  "rps:win": [{ hop: 1, fx: [["burst", "heart", 8], ["ring", {}]] }], "rps:lose": [{ fx: [["cloud", {}]] }], "rps:tie": [{ fx: [["burst", "note", 4]] }],
  "dice:win": [{ hop: 1, fx: [["burst", "star", 10]] }], "dice:lose": [{ fx: [["cloud", {}]] }], "dice:tie": [{ fx: [["burst", "sparkle", 6]] }],
  "catch:five": [{ hop: 1, fx: [["burst", "heart", 3]] }], "catch:great": [{ hop: 1, fx: [["burst", "heart", 8]] }], "catch:bad": [{ fx: [["cloud", {}]] }],
  land: [{ fx: [["ring", { r1: 60, dur: 0.5 }]] }], spin: [{ fx: [["burst", "heart", 3]] }]
};

export function makeLive2D(id) {
  const def = withTaps(L2D_MODELS[id], id);
  const REACT = expandTaps(def);
  const IDS = { ...DEFAULT_IDS, ...(def.ids || {}) };
  return function make(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    const mt = window.mt;
    const S = { mood: "idle", talking: false, carried: false, lookTarget: { x: 0, y: 0 }, hop: 0, pet: { amt: 0 }, mouth: 0 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 1, H = 1, app = null, model = null, fit = 1, dead = false, raf = 0;
    let status = { pct: 0, note: "" }, error = "";
    let lipIds = [IDS.mouthOpen], blinkIds = [IDS.eyeL, IDS.eyeR];
    // 小物理：蹦、落地压扁、转圈、拎起来晃
    let hopY = 0, hopV = 0, sq = 0, sqV = 0, spin = 0, spinV = 0, blush = 0, sway = 0, lastTap = 0, t0 = performance.now();
    // 反应表里"盖上去"的参数：[{params, until}]，表情定时恢复
    let held = [], moodHold = null, expTimer = null, timers = [];

    const gl = document.createElement("canvas");
    gl.style.cssText = "position:absolute;left:50%;bottom:0;transform:translateX(-50%);pointer-events:none;";
    canvas.parentNode.insertBefore(gl, canvas);

    const geometry = () => ({ cx: W / 2, cy: H * 0.5, R: H / 4 });
    // 锚点按舞台比例：headY 是脸在窗口里的高度比例（每个模型不一样）
    const fxGeom = () => { const g = geometry(); const hy = H * (def.headY ?? 0.16); return { ...g, head: { x: g.cx, y: hy }, chest: { x: g.cx, y: hy + H * 0.22 }, feet: { x: g.cx, y: H - 6 } }; };
    const fx = makeFx(fxGeom);

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
    const hit = (x, y) => {
      if (!model) return Math.abs(x - W / 2) < W * 0.22 && y > H * 0.25;
      let names = []; try { names = model.hitTest(x, y); } catch {}
      return names.length > 0 || (Math.abs(x - W / 2) < model.width * 0.2 && y > H - model.height * 0.97);
    };
    function param(name, v, add) {
      try { const cm = model.internalModel.coreModel; if (cm.getParameterIndex(name) < 0) return; add ? cm.addParameterValueById(name, v) : cm.setParameterValueById(name, v); } catch {}
    }
    function motion(group, index, force) {
      if (!model) return false;
      const defs = model.internalModel.motionManager.definitions || {};
      const g = group && defs[group] ? group : Object.keys(defs).find(k => k !== "Idle" && defs[k] && defs[k].length);
      if (!g) return false;
      try { model.motion(g, index === undefined || !defs[g][index] ? undefined : index, force ? 3 : 2); } catch {}    // 2 NORMAL / 3 FORCE
      return true;
    }
    function expression(name) {
      if (!model) return; const em = model.internalModel.motionManager.expressionManager; if (!em) return;
      try { if (name) model.expression(name); else em.resetExpression(); } catch {}
    }
    // 心情 → 常驻的表情 / 参数
    function applyMood(m) {
      moodHold = null; if (!model) return;
      const mm = (def.moods || {})[m];
      clearTimeout(expTimer); expTimer = null;
      expression(mm && mm.exp ? mm.exp : null);
      if (mm && mm.params) moodHold = { params: mm.params };
      if (mm && mm.motion) motion(mm.motion[0], mm.motion[1]);
    }
    // 跑一串动作
    function run(steps, ctxArg) {
      let t = 0;
      for (const st of steps || []) {
        t += st.delay || 0;
        const go = () => {
          if (dead) return;
          if (st.motion) motion(st.motion[0], st.motion[1], true);
          if (st.exp) { expression(st.exp); clearTimeout(expTimer); expTimer = setTimeout(() => { if (!dead) expression(((def.moods || {})[S.mood] || {}).exp || null); }, st.hold || 1800); }
          if (st.params) held.push({ params: st.params, until: performance.now() + (st.dur || 1500) });
          if (st.fx) fx.run(st.fx, ctxArg);
          if (st.hop) S.hop = 1.0001;
          if (st.spin) spinFn(false);
          if (st.squash) sqV += st.squash;
        };
        if (t) timers.push(setTimeout(go, t)); else go();
      }
    }
    function react(event, ctxArg) { const steps = REACT[event] || DEFAULT_REACT[event]; if (steps) run(steps, ctxArg); return !!steps; }

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
        const m = await PIXI.live2d.Live2DModel.from(r.url, { autoInteract: false, motionPreload: "ALL" });
        if (dead) { try { m.destroy(); } catch {} return; }
        model = m; app.stage.addChild(model); place();
        try {
          const groups = (model.internalModel.settings && model.internalModel.settings.groups) || [];
          const lip = groups.find(g => g.Name === "LipSync"), bl = groups.find(g => g.Name === "EyeBlink");
          if (lip && lip.Ids && lip.Ids.length) lipIds = lip.Ids;
          if (bl && bl.Ids && bl.Ids.length) blinkIds = bl.Ids;
        } catch {}
        model.internalModel.on("beforeModelUpdate", overrideParams);
        try { PIXI.live2d.SoundManager.volume = 0; } catch {}
        applyMood(S.mood);
        mt.send && mt.send("live2d:ready", { id });
      } catch (e) { error = e.message || String(e); console.error("[live2d]", e); }
    }
    // 每帧盖在动作之上的参数：嘴、眼、脸红、歪头、心情、反应表
    function overrideParams() {
      const t = (performance.now() - t0) / 1000, now = performance.now();
      if (moodHold) for (const [k, v] of Object.entries(moodHold.params)) param(k, v);
      held = held.filter(h => h.until > now);
      for (const h of held) for (const [k, v] of Object.entries(h.params)) param(k, v);
      if (S.talking || S.mouth > 0.02) for (const idp of lipIds) param(idp, Math.min(1, S.mouth * 1.4));
      if (S.mood === "sleepy") { for (const idp of blinkIds) param(idp, 0); param(IDS.angleZ, 8 + Math.sin(t * 0.8) * 3, true); param(IDS.angleY, -12, true); }
      if (S.mood === "reading") { param(IDS.ballY, -0.6); param(IDS.angleY, -10, true); }
      if (blush > 0.03) param(IDS.cheek, blush);
      if (S.carried) { param(IDS.angleZ, sway * 18, true); param(IDS.bodyZ, sway * 8, true); param(IDS.ballY, 0.4); }
      if (S.mood === "happy" && !S.carried) param(IDS.angleZ, Math.sin(t * 2.2) * 4, true);
    }

    function tick() {
      if (dead) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now(); const dt = Math.min(0.05, (now - (tick.last || now)) / 1000); tick.last = now;
      // 物理
      if (S.hop > 1) { S.hop = 0; hopV = -520; }
      hopV += 1800 * dt; hopY += hopV * dt; if (hopY > 0) { if (hopV > 200) { sqV += hopV / 900; } hopY = 0; hopV = 0; }
      sqV += -sq * 60 * dt; sqV *= Math.pow(0.02, dt); sq += sqV * dt;
      if (spinV > 0) { spin += spinV * dt; if (spin >= TAU) { spin = 0; spinV = 0; } }   // spin 是转身的相位：scale.x = cos
      const swayT = S.carried ? Math.sin(now / 260) : 0; sway += (swayT - sway) * Math.min(1, dt * 8);
      const blushT = (S.mood === "happy" ? 0.7 : 0) + S.pet.amt * 0.8; blush += (blushT - blush) * Math.min(1, dt * 3);
      S.pet.amt *= Math.pow(0.15, dt);
      fx.tick(dt);
      const sh = fx.shakeOffset();
      if (model) {
        model.position.set(W / 2 + sh.x, H + (def.dy || 0) * H + hopY + sh.y);
        model.scale.set(fit * (1 + sq * 0.5) * (spinV > 0 ? Math.cos(spin) : 1), fit * (1 - sq * 0.5));
        model.rotation = sway * 0.12;
        const lx = S.lookTarget.x, ly = S.lookTarget.y;
        model.focus(W / 2 + lx * W * 0.7, H * 0.35 + ly * H * 0.6);
        if (S.mood === "sleepy" && Math.random() < dt * 0.6) fx.burst("zzz", 1, { at: "headR", speed: 20, lift: 30, gravity: -10 });
        if (S.mood === "thinking" && Math.random() < dt * 0.3) fx.burst("dot", 1, { at: "headR", speed: 10, lift: 25, gravity: -5 });
      }
      // 2D 层：底层特效 → 提示 → 粒子 → 顶层特效
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(sh.x, sh.y);
      fx.drawLayers(ctx, true);
      if (!model) drawLoading();
      fx.drawParts(ctx);
      fx.drawLayers(ctx, false);
      ctx.restore();
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

    // pet.js 还在用的老接口：spawn("heart", n) 之类
    const spawn = (kind, n = 1) => fx.burst(kind === "z" ? "zzz" : kind, n, { at: "head", speed: 50 });
    const setMouth = v => { S.mouth = Math.max(0, Math.min(1, v || 0)); };
    const setMood = m => { const was = S.mood; S.mood = m || "idle"; if (S.mood !== was) applyMood(S.mood); if (m === "happy") blush = Math.max(blush, 0.4); };
    const poke = () => { S.pet.amt = 1; if (!react("poke")) { S.hop = 1.0001; motion("TapBody"); } };
    const petAt = () => { S.pet.amt = Math.min(1, S.pet.amt + 0.25); const now = performance.now(); if (now - lastTap > 2600) { lastTap = now; react("pet"); } };
    const land = k => { sqV += 2.2 * (k || 1); react("land", { k }); };
    function spinFn(withReact = true) { if (!spinV) spinV = TAU / 0.7; if (withReact) react("spin"); }
    function destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); clearTimeout(expTimer); for (const t of timers) clearTimeout(t);
      try { model && model.destroy(); } catch {}
      try { app && app.destroy(false, { children: true }); } catch {}
      model = null; app = null; gl.remove();
      ctx.clearRect(0, 0, W, H);
    }
    if (mt && mt.on) {
      mt.on("live2d:progress", p => { if (p && p.id === id) status = { pct: p.pct, note: p.note }; });
      // 开发用：报动作 / 表情清单，按名字播放，触发反应
      mt.on("live2d:query", () => {
        if (!model || dead) return;
        const defs = model.internalModel.motionManager.definitions || {}; const em = model.internalModel.motionManager.expressionManager;
        const cm = model.internalModel.coreModel; const diag = {};
        try { diag.parts = (cm._partIds || (cm.getPartIds && cm.getPartIds()) || []).slice(0, 60); } catch {}
        try { diag.eyeL = cm.getParameterValueById(IDS.eyeL); diag.eyeR = cm.getParameterValueById(IDS.eyeR); } catch {}
        try { diag.eyeBlink = !!model.internalModel.eyeBlink; diag.breath = !!model.internalModel.breath; } catch {}
        mt.send("live2d:info", { id, motions: Object.fromEntries(Object.entries(defs).map(([g, v]) => [g, (v || []).length])), expressions: em ? em.definitions.map(d => d.Name || d.name) : [], diag });
      });
      mt.on("live2d:play", ({ motion: mo, expression: ex, react: ev, params: ps, mood } = {}) => { if (!model || dead) return; try { if (mo) motion(mo[0] || mo.group, mo[1] ?? mo.index, true); if (ex !== undefined) expression(ex); if (ps) held.push({ params: ps, until: performance.now() + 2500 }); if (mood) setMood(mood); if (ev) react(ev, {}); } catch (e) { console.warn("[live2d] play", e); } });
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    resize(); tick(); boot();
    return { S, hit, petAt, geometry, spawn, setMouth, setMood, poke, land, spin: () => spinFn(true), destroy, resize, react, lines: def.lines || null, character: def };
  };
}
