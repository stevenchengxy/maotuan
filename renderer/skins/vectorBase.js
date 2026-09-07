// 手绘（矢量）皮肤的共用骨架：状态机、眨眼、小动作、粒子、命中、特效层；每个皮肤只负责画身体和脸。
import { makeFx } from "./fx2d.js";
import { expandTaps } from "./taps.js";

export function makeVectorSkin(def) {
  return function (canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    const TAU = Math.PI * 2;
    let W = 0, H = 0, DPR = 1;
    const S = { mood: "idle", talking: false, mouthLevel: 0, mouthTarget: 0, t: 0, hop: 0, hopT: 6, blink: 0, blinkT: 2.5, look: { x: 0, y: 0 }, lookTarget: { x: 0, y: 0 }, lookHold: 0, pet: { x: 0, y: 0, amt: 0 }, parts: [], beh: null, behT: 5, squash: 1, tilt: 0, carried: false, jiggle: 0, jv: 0, vy: 0, scale: 1, extra: {} };
    function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    resize(); window.addEventListener("resize", resize);
    // 特效层（和 Live2D / 英雄共用同一套）：锚点按当前几何算
    const fx = makeFx(() => { const g = geometry(); const hy = g.cy - g.R * (def.headK ?? 0.5); return { cx: g.cx, cy: g.cy, R: g.R, head: { x: g.cx, y: hy }, chest: { x: g.cx, y: g.cy }, feet: { x: g.cx, y: g.cy + g.R * 0.95 } }; });
    const REACT = expandTaps(def);
    let timers = [];
    function runSteps(steps, ctxArg) {
      let t = 0;
      for (const st of steps || []) {
        t += st.delay || 0;
        const go = () => {
          if (!alive) return;
          if (st.fx) fx.run(st.fx, ctxArg);
          if (st.hop) S.hop = 1.0001;
          if (st.spin) { S.beh = { type: "wiggle", t: 0, dur: 0.9 }; S.jv += 5; }
          if (st.squash) S.squash = 1 + st.squash * 0.22;
          if (st.mood) { S.mood = st.mood; if (st.mood !== "idle") S.beh = null; }
          if (st.look) { S.lookTarget.x = st.look[0]; S.lookTarget.y = st.look[1]; S.lookHold = (st.dur || 900) / 1000; }
        };
        if (t) timers.push(setTimeout(go, t)); else go();
      }
    }
    function react(ev, ctxArg) { const steps = REACT[ev]; if (steps) runSteps(steps, ctxArg); return !!steps; }

    function geometry() {
      const R = Math.min(W * (opts.icon ? def.iconK || 0.34 : def.rK || 0.22), H * (opts.icon ? def.iconK || 0.34 : (def.rK || 0.22) * 0.9)) * S.scale;
      const hopY = def.noHop ? 0 : -Math.sin(Math.min(1, S.hop) * Math.PI) * R * 0.45;
      const floatY = def.float ? Math.sin(S.t * 0.9) * R * 0.10 : 0;
      const baseY = H * (opts.icon ? 0.5 : def.baseYK || 0.62);
      return { R, cx: W / 2, cy: baseY + hopY + floatY + S.vy, baseY, hopY };
    }
    function spawn(type, n, x, y) { for (let i = 0; i < n; i++) S.parts.push({ type, x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 16, vy: -20 - Math.random() * 20, life: 1, rot: (Math.random() - 0.5) * 0.7, sz: 8 + Math.random() * 6 }); }
    function schedule() {
      S.behT = 4 + Math.random() * 7; if (S.mood !== "idle") return;
      const r = Math.random();
      if (r < 0.35) S.beh = { type: "look", t: 0, dur: 2.4 + Math.random() * 2 };
      else if (r < 0.55) S.beh = { type: "yawn", t: 0, dur: 1.9 };
      else if (r < 0.75) S.beh = { type: "stretch", t: 0, dur: 1.3 };
      else S.beh = { type: "wiggle", t: 0, dur: 1.1 };
    }
    function frame(dt) {
      S.t += dt;
      if (S.pet.amt > 0) S.pet.amt = Math.max(0, S.pet.amt - dt * 0.9);
      S.hopT -= dt;
      if (S.hopT <= 0 && S.mood !== "sleepy" && S.mood !== "reading" && !S.carried && !def.noHop) { S.hopT = 7 + Math.random() * 10; S.hop = 1.0001; }
      if (S.hop > 0) { S.hop = Math.max(0, S.hop - dt * 2.4); if (S.hop === 0) S.squash = 1.14; }
      S.squash += (1 - S.squash) * Math.min(1, dt * 9);
      // 弹簧：被摸 / 落地时晃一下
      S.jv += (-S.jiggle * 60 - S.jv * 6) * dt; S.jiggle += S.jv * dt;
      S.vy += (0 - S.vy) * Math.min(1, dt * 4);
      S.blinkT -= dt; if (S.blinkT <= 0) { S.blinkT = 1.6 + Math.random() * 3.6; S.blink = 1; if (Math.random() < 0.25) S.blinkT = 0.35; }
      if (S.blink > 0) S.blink = Math.max(0, S.blink - dt * 8);
      S.behT -= dt; if (!S.beh && S.behT <= 0) schedule();
      if (S.beh) {
        const b = S.beh; b.t += dt;
        if (b.type === "look" && S.lookHold <= 0) { S.lookTarget.x = (Math.random() - 0.5) * 1.6; S.lookTarget.y = (Math.random() - 0.5) * 0.8; S.lookHold = 0.7 + Math.random() * 0.8; }
        if (b.type === "wiggle") S.tilt = Math.sin(b.t / b.dur * Math.PI * 3) * 0.05 * Math.sin(b.t / b.dur * Math.PI);
        if (b.t >= b.dur) { S.beh = null; S.tilt = 0; S.lookTarget.x = 0; S.lookTarget.y = 0; }
      }
      if (S.lookHold > 0) S.lookHold -= dt;
      if (!S.beh && S.mood === "reading") { S.lookTarget.x = Math.sin(S.t * 1.2) * 0.5; S.lookTarget.y = 0.5; }
      if (!S.beh && S.mood === "thinking") { S.lookTarget.x = 0.6; S.lookTarget.y = -0.7; }
      S.look.x += (S.lookTarget.x - S.look.x) * Math.min(1, dt * 6); S.look.y += (S.lookTarget.y - S.look.y) * Math.min(1, dt * 6);
      S.mouthLevel += (S.mouthTarget - S.mouthLevel) * Math.min(1, dt * 18);
      for (const p of S.parts) { p.life -= dt * 0.7; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.type === "bubble" ? -6 : 22) * dt; p.rot += dt * 0.6; }
      S.parts = S.parts.filter(p => p.life > 0);
      const g = geometry();
      if (S.mood === "sleepy" && Math.random() < dt * 0.6) spawn("z", 1, g.cx + g.R * 0.7, g.cy - g.R * 0.9);
      if (S.mood === "reading" && S.talking && Math.random() < dt * 0.5) spawn("note", 1, g.cx + g.R * 0.8, g.cy - g.R * 0.8);
      if (S.mood === "thinking" && Math.random() < dt * 0.35) spawn("dot", 1, g.cx + g.R * 0.75, g.cy - g.R * 0.95);
      if (def.tick) def.tick(S, dt, g, { spawn });
      fx.tick(dt);
      render(g);
    }

    // 共用的脸部件
    const face = {
      eye(x, y, rx, ry, { closed = 0, happy = false, color = "#2B2530", lid = "#DDD", sleepyArc = false } = {}) {
        if (closed > 0.85) { ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, rx * 0.4); ctx.lineCap = "round"; ctx.beginPath(); if (sleepyArc || !happy) ctx.arc(x, y - ry * 0.2, rx * 1.2, Math.PI * 0.12, Math.PI * 0.88); else ctx.arc(x, y + ry * 0.5, rx * 1.2, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); return; }
        ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry * (happy ? 0.72 : 1), 0, 0, TAU); ctx.clip();
        ctx.fillStyle = color; ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
        ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.ellipse(x - rx * 0.35, y - ry * 0.38, rx * 0.36, ry * 0.26, -0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + rx * 0.35, y + ry * 0.42, rx * 0.17, ry * 0.12, 0, 0, TAU); ctx.fill();
        if (closed > 0) { ctx.fillStyle = lid; ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2 * closed); }
        ctx.restore();
      },
      mouth(cx, my, R, { happy = false, yawn = 0, color = "#2B2530", w = 0.08 } = {}) {
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1.5, R * 0.03); ctx.lineCap = "round"; ctx.beginPath();
        if (yawn > 0.2) { ctx.ellipse(cx, my + R * 0.03, R * 0.06 * yawn + R * 0.02, R * 0.1 * yawn + R * 0.01, 0, 0, TAU); ctx.fill(); return; }
        if (S.talking || S.mouthLevel > 0.05) { const o = Math.max(0.08, S.mouthLevel); ctx.ellipse(cx, my + R * 0.02, R * (0.06 + o * 0.05), R * (0.02 + o * 0.09), 0, 0, TAU); ctx.fill(); return; }
        if (S.mood === "sleepy") { ctx.arc(cx, my, R * 0.03, 0, TAU); ctx.stroke(); return; }
        if (S.mood === "thinking") { ctx.moveTo(cx - R * 0.05, my + R * 0.01); ctx.lineTo(cx + R * 0.07, my - R * 0.02); ctx.stroke(); return; }
        const ww = R * (happy ? w * 1.4 : w), d = R * (happy ? 0.07 : 0.045);
        ctx.moveTo(cx - ww, my - d * 0.5); ctx.quadraticCurveTo(cx - ww * 0.5, my + d, cx, my); ctx.quadraticCurveTo(cx + ww * 0.5, my + d, cx + ww, my - d * 0.5); ctx.stroke();
      },
      blush(x, y, R, k, color = "#C96A7C") { ctx.save(); ctx.globalAlpha = k; const bg = ctx.createRadialGradient(x, y, 0, x, y, R * 0.16); bg.addColorStop(0, color); bg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(x, y, R * 0.16, R * 0.1, 0, 0, TAU); ctx.fill(); ctx.restore(); },
      book(cx, cy, R, paper = "#F6F2E9", ink = "#8C8494") { ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.06); ctx.fillStyle = paper; ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, R * 0.02); ctx.beginPath(); ctx.roundRect(-R * 0.4, -R * 0.2, R * 0.8, R * 0.38, R * 0.05); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -R * 0.2); ctx.lineTo(0, R * 0.18); ctx.stroke(); ctx.restore(); },
      parts(colors = {}) {
        for (const p of S.parts) {
          ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.6); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          if (p.type === "heart") { ctx.fillStyle = colors.heart || "#C96A7C"; const s = p.sz / 10; ctx.beginPath(); ctx.moveTo(0, 3 * s); ctx.bezierCurveTo(-6 * s, -2 * s, -3 * s, -7 * s, 0, -3.4 * s); ctx.bezierCurveTo(3 * s, -7 * s, 6 * s, -2 * s, 0, 3 * s); ctx.fill(); }
          else if (p.type === "note") { ctx.fillStyle = colors.note || "#6E948A"; ctx.font = p.sz + "px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("♪", 0, 0); }
          else if (p.type === "z") { ctx.fillStyle = colors.z || "#8C8494"; ctx.font = "600 " + p.sz + "px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("z", 0, 0); }
          else if (p.type === "bubble") { ctx.strokeStyle = colors.bubble || "rgba(200,230,255,0.7)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, p.sz * 0.4, 0, TAU); ctx.stroke(); }
          else { ctx.fillStyle = colors.dot || "#8C8494"; ctx.beginPath(); ctx.arc(0, 0, p.sz * 0.22, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
      }
    };
    function render(g) { ctx.clearRect(0, 0, W, H); const sh = fx.shakeOffset(); ctx.save(); ctx.translate(sh.x, sh.y); fx.drawLayers(ctx, true); def.draw(ctx, g, S, face, { W, H, TAU, yawn: S.beh && S.beh.type === "yawn" ? Math.sin(S.beh.t / S.beh.dur * Math.PI) : 0, stretch: S.beh && S.beh.type === "stretch" ? Math.sin(S.beh.t / S.beh.dur * Math.PI) : 0, happy: S.mood === "happy" || S.pet.amt > 0.15, closed: S.mood === "sleepy" ? 1 : Math.min(1, S.blink * 1.25) }); fx.drawParts(ctx); fx.drawLayers(ctx, false); ctx.restore(); }
    function hit(x, y) { const g = geometry(); const [kx, ky, dy] = def.hit || [1.2, 1.15, 0]; const dx = (x - g.cx) / (g.R * kx), dyy = (y - g.cy - g.R * dy) / (g.R * ky); return dx * dx + dyy * dyy <= 1; }
    function petAt(x, y) { S.pet.x = x; S.pet.y = y; S.pet.amt = Math.min(1.2, S.pet.amt + 0.35); S.jv += 3; if (Math.random() < 0.35) spawn("heart", 1, x, y - 10); }
    if (opts.icon) { S.behT = 999; S.hopT = 999; S.blinkT = 999; S.t = 2.1; }
    let last = performance.now(), raf = 0, alive = true;
    (function loop(now) { if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; frame(dt); raf = requestAnimationFrame(loop); })(last);
    return {
      S, hit, petAt, geometry, resize, react, fx,
      character: def.character || null, lines: (def.character && def.character.lines) || null,
      destroy: () => { alive = false; cancelAnimationFrame(raf); for (const t of timers) clearTimeout(t); window.removeEventListener("resize", resize); },
      spawn: (t, n) => { const g = geometry(); spawn(t, n, g.cx, g.cy - g.R * 0.9); },
      setMouth: v => { S.mouthTarget = Math.max(0, Math.min(1, v)); },
      setMood: m => { S.mood = m; if (m !== "idle") S.beh = null; },
      poke: () => { const g = geometry(); petAt(g.cx + (Math.random() - 0.5) * g.R, g.cy); spawn("heart", 3, g.cx, g.cy - g.R); },
      land: (k = 1) => { S.squash = 1 + 0.22 * k; S.hop = 0; S.jv += 6 * k; const g = geometry(); spawn("dot", 5, g.cx, g.cy + g.R); },
      spin: () => { S.beh = { type: "wiggle", t: 0, dur: 0.9 }; S.jv += 5; const g = geometry(); spawn("heart", 2, g.cx, g.cy - g.R); }
    };
  };
}
