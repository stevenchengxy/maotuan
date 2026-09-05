// 水母：半透明的伞、会飘的触手、柔光。安安静静地漂着。
export function makeJelly(canvas, opts = {}) {
  const ctx = canvas.getContext("2d");
  const TAU = Math.PI * 2;
  let W = 0, H = 0, DPR = 1;
  const C = Object.assign({ bell: "rgba(128,196,255,0.62)", bellEdge: "rgba(92,150,255,0.16)", rim: "rgba(220,240,255,0.9)", inner: "rgba(60,110,220,0.25)", tentacle: "rgba(150,200,255,0.55)", ink: "#23304A", blush: "#FF8FB1", glow: "#7CC4FF", bubble: "rgba(200,230,255,0.7)" }, opts.colors || {});
  const S = { mood: "idle", talking: false, mouthLevel: 0, mouthTarget: 0, t: 0, blink: 0, blinkT: 3, look: { x: 0, y: 0 }, lookTarget: { x: 0, y: 0 }, pet: { x: 0, y: 0, amt: 0 }, parts: [], ripples: [], pulse: 0, pulseT: 0, squash: 1, carried: false, beh: null, behT: 6, vy: 0, scale: 1 };
  const tents = Array.from({ length: 7 }, (_, i) => ({ x: (i / 6) * 2 - 1, len: 1.0 + Math.random() * 0.5, ph: Math.random() * TAU, w: 0.6 + Math.random() * 0.6 }));

  function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  resize(); window.addEventListener("resize", resize);

  function geometry() {
    const R = Math.min(W * (opts.icon ? 0.30 : 0.21), H * (opts.icon ? 0.30 : 0.19)) * S.scale;
    const baseY = H * (opts.icon ? 0.42 : 0.50);
    const cy = baseY + Math.sin(S.t * 0.8) * R * 0.10 + S.vy;
    return { R, cx: W / 2, cy, baseY, hopY: 0 };
  }
  function spawn(type, n, x, y) { for (let i = 0; i < n; i++) S.parts.push({ type, x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 12, vy: -16 - Math.random() * 16, life: 1, sz: 6 + Math.random() * 6, rot: 0 }); }

  function frame(dt) {
    S.t += dt;
    if (S.pet.amt > 0) S.pet.amt = Math.max(0, S.pet.amt - dt * 0.8);
    S.blinkT -= dt; if (S.blinkT <= 0) { S.blinkT = 2 + Math.random() * 4; S.blink = 1; }
    if (S.blink > 0) S.blink = Math.max(0, S.blink - dt * 7);
    // 伞的收缩：快收慢放
    const period = S.talking ? 1.4 : S.mood === "sleepy" ? 3.6 : 2.4;
    S.pulseT += dt; if (S.pulseT > period) S.pulseT = 0;
    const ph = S.pulseT / period;
    S.pulse = ph < 0.25 ? Math.sin(ph / 0.25 * Math.PI / 2) : Math.cos((ph - 0.25) / 0.75 * Math.PI / 2);
    S.squash += (1 - S.squash) * Math.min(1, dt * 6);
    S.vy += (0 - S.vy) * Math.min(1, dt * 3);
    S.behT -= dt; if (!S.beh && S.behT <= 0 && S.mood === "idle") { S.behT = 5 + Math.random() * 8; S.beh = { type: "look", t: 0, dur: 2.5 }; }
    if (S.beh) { const b = S.beh; b.t += dt; if (Math.floor(b.t * 1.2) !== Math.floor((b.t - dt) * 1.2)) { S.lookTarget.x = (Math.random() - 0.5) * 1.4; S.lookTarget.y = (Math.random() - 0.5) * 0.6; } if (b.t >= b.dur) { S.beh = null; S.lookTarget.x = 0; S.lookTarget.y = 0; } }
    if (!S.beh && S.mood === "thinking") { S.lookTarget.x = 0.6; S.lookTarget.y = -0.7; }
    if (!S.beh && S.mood === "reading") { S.lookTarget.x = Math.sin(S.t * 1.2) * 0.5; S.lookTarget.y = 0.5; }
    S.look.x += (S.lookTarget.x - S.look.x) * Math.min(1, dt * 5); S.look.y += (S.lookTarget.y - S.look.y) * Math.min(1, dt * 5);
    S.mouthLevel += (S.mouthTarget - S.mouthLevel) * Math.min(1, dt * 18);
    for (const p of S.parts) { p.life -= dt * 0.6; p.x += p.vx * dt; p.y += p.vy * dt; if (p.type === "bubble") p.vy -= 6 * dt; else p.vy += 20 * dt; }
    S.parts = S.parts.filter(p => p.life > 0);
    for (const r of S.ripples) { r.t += dt; } S.ripples = S.ripples.filter(r => r.t < 0.9);
    const g = geometry();
    if (Math.random() < dt * 0.35) S.parts.push({ type: "bubble", x: g.cx + (Math.random() - 0.5) * g.R * 1.6, y: g.cy + g.R * 1.2, vx: 0, vy: -10, life: 1, sz: 2 + Math.random() * 4 });
    if (S.mood === "sleepy" && Math.random() < dt * 0.6) S.parts.push({ type: "z", x: g.cx + g.R * 0.7, y: g.cy - g.R * 0.7, vx: 6, vy: -14, life: 1, sz: 12 });
    render(g);
  }

  function render(g) {
    const { R, cx, cy } = g;
    ctx.clearRect(0, 0, W, H);
    const bx = 1 + S.pulse * 0.07 * S.squash, by = (1 - S.pulse * 0.06) / S.squash;
    const lean = S.look.x * 0.06;

    // 触手（在伞后面）
    ctx.lineCap = "round";
    for (const tn of tents) {
      const x0 = cx + tn.x * R * 0.8 * bx, y0 = cy + R * 0.28;
      const L = R * tn.len * (S.carried ? 0.7 : 1);
      const sway = Math.sin(S.t * 1.4 + tn.ph) * R * 0.25 + (S.carried ? -R * 0.5 : 0) + lean * R * 2;
      ctx.strokeStyle = C.tentacle; ctx.lineWidth = Math.max(1, R * 0.05 * tn.w); ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + sway * 0.3, y0 + L * 0.4, x0 + sway * 0.8 + Math.sin(S.t * 2.2 + tn.ph) * R * 0.12, y0 + L * 0.75, x0 + sway, y0 + L);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 涟漪
    for (const r of S.ripples) { ctx.strokeStyle = C.rim; ctx.globalAlpha = (1 - r.t / 0.9) * 0.6; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x, r.y, R * 0.15 + r.t * R * 0.9, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // 伞：柔光 + 渐变 + 边缘
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(lean); ctx.scale(bx, by); ctx.translate(-cx, -cy);
    ctx.shadowColor = C.glow; ctx.shadowBlur = 24 + S.pet.amt * 16 + (S.talking ? 8 : 0);
    const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.45, R * 0.1, cx, cy, R * 1.1);
    grad.addColorStop(0, "rgba(235,248,255,0.85)"); grad.addColorStop(0.45, C.bell); grad.addColorStop(1, C.bellEdge);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - R, cy + R * 0.2);
    ctx.bezierCurveTo(cx - R * 1.05, cy - R * 0.9, cx + R * 1.05, cy - R * 0.9, cx + R, cy + R * 0.2);
    // 波浪形的伞沿
    for (let i = 0; i <= 6; i++) { const x = cx + R - (i / 6) * 2 * R; const yy = cy + R * 0.2 + (i % 2 ? R * 0.10 : 0) + Math.sin(S.t * 2 + i) * R * 0.02; ctx.quadraticCurveTo(x + R / 6, cy + R * 0.28, x, yy); }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // 内脏的影子
    ctx.fillStyle = C.inner; ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.1, R * 0.45, R * 0.28, 0, 0, TAU); ctx.fill();
    // 顶部高光
    ctx.strokeStyle = C.rim; ctx.lineWidth = Math.max(1, R * 0.03); ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(cx - R * 0.1, cy - R * 0.05, R * 0.8, Math.PI * 1.2, Math.PI * 1.7); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // 脸
    const lx = S.look.x * R * 0.08, ly = S.look.y * R * 0.05;
    const fy = cy - R * 0.05 + ly;
    const closed = S.mood === "sleepy" ? 1 : Math.min(1, S.blink * 1.3);
    const happy = S.mood === "happy" || S.pet.amt > 0.15;
    ctx.globalAlpha = 0.25 + (happy ? 0.3 : 0);
    for (const sgn of [-1, 1]) { ctx.fillStyle = C.blush; ctx.beginPath(); ctx.ellipse(cx + sgn * R * 0.5 + lx, fy + R * 0.2, R * 0.13, R * 0.08, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const sgn of [-1, 1]) {
      const x = cx + sgn * R * 0.3 + lx;
      if (closed > 0.85) { ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1.5, R * 0.035); ctx.beginPath(); ctx.arc(x, fy + (happy ? R * 0.06 : -R * 0.02), R * 0.1, happy ? Math.PI * 1.12 : Math.PI * 0.12, happy ? Math.PI * 1.88 : Math.PI * 0.88); ctx.stroke(); continue; }
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, fy, R * 0.085, R * 0.11 * (happy ? 0.75 : 1), 0, 0, TAU); ctx.clip();
      ctx.fillStyle = C.ink; ctx.fillRect(x - R, fy - R, R * 2, R * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.ellipse(x - R * 0.03, fy - R * 0.04, R * 0.03, R * 0.028, 0, 0, TAU); ctx.fill();
      if (closed > 0) { ctx.fillStyle = "rgba(160,205,255,0.95)"; ctx.fillRect(x - R, fy - R * 0.11, R * 2, R * 0.22 * closed); }
      ctx.restore();
    }
    const my = fy + R * 0.25;
    ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = Math.max(1.5, R * 0.03); ctx.lineCap = "round"; ctx.beginPath();
    if (S.talking || S.mouthLevel > 0.05) { const o = Math.max(0.1, S.mouthLevel); ctx.ellipse(cx + lx, my, R * (0.05 + o * 0.04), R * (0.02 + o * 0.08), 0, 0, TAU); ctx.fill(); }
    else if (S.mood === "sleepy") { ctx.arc(cx + lx, my, R * 0.025, 0, TAU); ctx.stroke(); }
    else if (S.mood === "thinking") { ctx.moveTo(cx - R * 0.05 + lx, my); ctx.lineTo(cx + R * 0.06 + lx, my - R * 0.02); ctx.stroke(); }
    else { const w = happy ? R * 0.1 : R * 0.06; ctx.moveTo(cx - w + lx, my - R * 0.02); ctx.quadraticCurveTo(cx + lx, my + R * (happy ? 0.09 : 0.05), cx + w + lx, my - R * 0.02); ctx.stroke(); }

    if (S.mood === "reading") { ctx.save(); ctx.translate(cx, cy + R * 0.62); ctx.fillStyle = "rgba(245,250,255,0.9)"; ctx.strokeStyle = "rgba(90,130,200,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(-R * 0.36, -R * 0.16, R * 0.72, R * 0.32, R * 0.04); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -R * 0.16); ctx.lineTo(0, R * 0.16); ctx.stroke(); ctx.restore(); }

    for (const p of S.parts) {
      ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.4); ctx.translate(p.x, p.y);
      if (p.type === "heart") { ctx.fillStyle = C.blush; const s = p.sz / 10; ctx.beginPath(); ctx.moveTo(0, 3 * s); ctx.bezierCurveTo(-6 * s, -2 * s, -3 * s, -7 * s, 0, -3.4 * s); ctx.bezierCurveTo(3 * s, -7 * s, 6 * s, -2 * s, 0, 3 * s); ctx.fill(); }
      else if (p.type === "z") { ctx.fillStyle = "#7A88B8"; ctx.font = "600 " + p.sz + "px Georgia, serif"; ctx.fillText("z", 0, 0); }
      else if (p.type === "note") { ctx.fillStyle = "#6E94C8"; ctx.font = p.sz + "px Georgia, serif"; ctx.fillText("♪", 0, 0); }
      else { ctx.strokeStyle = C.bubble; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, p.sz, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
  }

  function hit(x, y) { const g = geometry(); const dx = (x - g.cx) / (g.R * 1.12), dy = (y - g.cy + g.R * 0.1) / (g.R * 0.95); return dx * dx + dy * dy <= 1; }
  function petAt(x, y) { S.pet.x = x; S.pet.y = y; S.pet.amt = Math.min(1.2, S.pet.amt + 0.3); if (Math.random() < 0.25) S.ripples.push({ x, y, t: 0 }); if (Math.random() < 0.3) spawn("heart", 1, x, y - 10); }

  if (opts.icon) { S.behT = 999; S.blinkT = 999; }
  let last = performance.now(), raf = 0, alive = true;
  (function loop(now) { if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; frame(dt); raf = requestAnimationFrame(loop); })(last);

  return {
    S, hit, petAt, geometry, resize,
    destroy: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); },
    spawn: (t, n) => { const g = geometry(); spawn(t, n, g.cx, g.cy - g.R * 0.8); },
    setMouth: v => { S.mouthTarget = Math.max(0, Math.min(1, v)); },
    setMood: m => { S.mood = m; if (m !== "idle") S.beh = null; },
    poke: () => { const g = geometry(); petAt(g.cx, g.cy); spawn("heart", 3, g.cx, g.cy - g.R); S.ripples.push({ x: g.cx, y: g.cy, t: 0 }); },
    land: (k = 1) => { S.squash = 1 + 0.2 * k; S.vy = 6 * k; const g = geometry(); S.ripples.push({ x: g.cx, y: g.cy + g.R * 0.3, t: 0 }); },
    spin: () => { S.squash = 1.15; const g = geometry(); S.ripples.push({ x: g.cx, y: g.cy, t: 0 }); spawn("heart", 2, g.cx, g.cy - g.R); }
  };
}
