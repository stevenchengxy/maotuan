// 像素团：赛博朋克的像素小方块。低分辨率网格 + 霓虹光 + 扫描线 + 偶尔一下故障。
export function makePixel(canvas, opts = {}) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const N = 24, M = 22;
  const P = Object.assign({ body: "#8B5CF6", dark: "#5A3AB8", light: "#B99CFF", ink: "#0B0A16", cyan: "#22E7FF", pink: "#FF4F8B", z: "#A9B0FF", glow: "#8B5CF6" }, opts.colors || {});

  const S = {
    mood: "idle", talking: false, mouthLevel: 0, mouthTarget: 0,
    t: 0, hop: 0, hopT: 6, blink: 0, blinkT: 2.5,
    look: { x: 0, y: 0 }, lookTarget: { x: 0, y: 0 },
    pet: { x: 0, y: 0, amt: 0 }, parts: [],
    glitch: 0, glitchT: 5, squash: 1, tilt: 0, carried: false, spin: 0, beh: null, behT: 5, scale: 1
  };

  // 形状：圆脸 + 两只方耳朵；1 = 身体，2 = 耳朵
  const mask = [];
  for (let y = 0; y < M; y++) {
    const row = [];
    for (let x = 0; x < N; x++) {
      const nx = (x + 0.5) / N * 2 - 1, ny = (y + 0.5) / M * 2 - 1;
      const body = (nx * nx) / (0.93 * 0.93) + ((ny - 0.06) * (ny - 0.06)) / (0.86 * 0.86) <= 1;
      const ear = (y >= 1 && y <= 3 && ((x >= 4 && x <= 6) || (x >= 17 && x <= 19))) || (y === 0 && (x === 4 || x === 19));
      row.push(body ? 1 : ear ? 2 : 0);
    }
    mask.push(row);
  }
  const inside = (x, y) => y >= 0 && y < M && x >= 0 && x < N && mask[y][x] > 0;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  }
  resize();
  window.addEventListener("resize", resize);

  function geometry() {
    const R = Math.min(W * (opts.icon ? 0.36 : 0.24), H * (opts.icon ? 0.36 : 0.21)) * S.scale;
    const hopY = -Math.sin(Math.min(1, S.hop) * Math.PI) * R * 0.5;
    const baseY = H * (opts.icon ? 0.5 : 0.66);
    return { R, cx: W / 2, cy: baseY + hopY, baseY, hopY };
  }

  function spawn(type, n, x, y) {
    for (let i = 0; i < n; i++) S.parts.push({ type, x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 30, life: 1, sz: 3 + Math.random() * 3, col: Math.random() < 0.5 ? P.cyan : P.pink });
  }

  function frame(dt) {
    S.t += dt;
    if (S.pet.amt > 0) S.pet.amt = Math.max(0, S.pet.amt - dt * 0.9);
    S.hopT -= dt;
    if (S.hopT <= 0 && S.mood !== "sleepy" && S.mood !== "reading" && !S.carried) { S.hopT = 6 + Math.random() * 9; S.hop = 1.0001; }
    if (S.hop > 0) { S.hop = Math.max(0, S.hop - dt * 2.6); if (S.hop === 0) S.squash = 1.18; }
    S.squash += (1 - S.squash) * Math.min(1, dt * 10);
    S.blinkT -= dt;
    if (S.blinkT <= 0) { S.blinkT = 1.8 + Math.random() * 3.5; S.blink = 1; }
    if (S.blink > 0) S.blink = Math.max(0, S.blink - dt * 9);
    S.glitchT -= dt;
    if (S.glitchT <= 0) { S.glitchT = 3 + Math.random() * 7; S.glitch = 0.25; }
    if (S.glitch > 0) S.glitch = Math.max(0, S.glitch - dt);
    if (S.spin > 0) S.spin = Math.max(0, S.spin - dt);
    S.behT -= dt;
    if (!S.beh && S.behT <= 0 && S.mood === "idle") { S.behT = 5 + Math.random() * 8; const r = Math.random(); S.beh = r < 0.5 ? { type: "look", t: 0, dur: 2.5 } : { type: "glitch", t: 0, dur: 0.6 }; if (S.beh.type === "glitch") S.glitch = 0.6; }
    if (S.beh) { const b = S.beh; b.t += dt; if (b.type === "look" && Math.floor(b.t * 1.3) !== Math.floor((b.t - dt) * 1.3)) { S.lookTarget.x = Math.round((Math.random() - 0.5) * 2); S.lookTarget.y = Math.round((Math.random() - 0.5) * 1.2); } if (b.t >= b.dur) { S.beh = null; S.lookTarget.x = 0; S.lookTarget.y = 0; } }
    if (!S.beh && S.mood === "thinking") { S.lookTarget.x = 1; S.lookTarget.y = -1; }
    if (!S.beh && S.mood === "reading") { S.lookTarget.x = Math.sin(S.t * 1.5) > 0 ? 1 : -1; S.lookTarget.y = 1; }
    S.look.x += (S.lookTarget.x - S.look.x) * Math.min(1, dt * 8);
    S.look.y += (S.lookTarget.y - S.look.y) * Math.min(1, dt * 8);
    S.mouthLevel += (S.mouthTarget - S.mouthLevel) * Math.min(1, dt * 18);
    for (const p of S.parts) { p.life -= dt * 0.8; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; }
    S.parts = S.parts.filter(p => p.life > 0);
    const g = geometry();
    if (S.mood === "sleepy" && Math.random() < dt * 0.6) S.parts.push({ type: "z", x: g.cx + g.R * 0.7, y: g.cy - g.R * 0.9, vx: 6, vy: -18, life: 1, sz: 10, col: P.z });
    if (S.mood === "thinking" && Math.random() < dt * 0.4) S.parts.push({ type: "bit", x: g.cx + g.R * 0.8, y: g.cy - g.R, vx: 0, vy: -14, life: 1, sz: 3, col: P.cyan });
    render(g);
  }

  function render(g) {
    const { R, cx, cy, baseY, hopY } = g;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const c = Math.max(1, Math.round((R * 2 / N) * DPR));          // 一格多少设备像素
    const gw = c * N, gh = c * M;
    const sx = S.squash, sy = 1 / S.squash;
    const ox = Math.round(cx * DPR - gw / 2 * sx), oy = Math.round((cy + R * 0.92) * DPR - gh * sy);  // 底部对齐

    // 影子
    ctx.globalAlpha = 0.35 * (1 - Math.min(1, Math.abs(hopY) / (R * 0.5)) * 0.6);
    ctx.fillStyle = "#1a1030";
    const shw = gw * 0.8 * (1 - Math.min(1, Math.abs(hopY) / (R * 0.5)) * 0.3);
    ctx.fillRect(Math.round(cx * DPR - shw / 2), Math.round((baseY + R * 0.95) * DPR), Math.round(shw), c);
    ctx.globalAlpha = 1;

    // 霓虹光晕
    const pulse = 0.5 + 0.5 * Math.sin(S.t * 1.8);
    ctx.save();
    ctx.shadowColor = P.glow; ctx.shadowBlur = (18 + pulse * 10 + S.pet.amt * 14) * DPR;
    ctx.fillStyle = "rgba(139,92,246,0.35)";
    ctx.beginPath(); ctx.ellipse(cx * DPR, (cy + R * 0.05) * DPR, gw * 0.42 * sx, gh * 0.42 * sy, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const cell = (x, y, col, dx = 0) => {
      const px = ox + Math.round((x * c + dx) * sx), py = oy + Math.round(y * c * sy);
      ctx.fillStyle = col; ctx.fillRect(px, py, Math.ceil(c * sx), Math.ceil(c * sy));
    };
    const rowShift = y => (S.glitch > 0 && ((y * 7 + Math.floor(S.t * 30)) % 5 === 0)) ? (Math.random() < 0.5 ? -c : c) : 0;

    // 故障时的色差残影
    if (S.glitch > 0) {
      ctx.globalAlpha = 0.5;
      for (let y = 0; y < M; y++) for (let x = 0; x < N; x++) if (mask[y][x]) { cell(x, y, P.cyan, -c * 1.5); cell(x, y, P.pink, c * 1.5); }
      ctx.globalAlpha = 1;
    }

    // 身体：描边一格深色，左上受光
    const walk = S.carried ? Math.sin(S.t * 10) : 0;
    for (let y = 0; y < M; y++) {
      const shift = rowShift(y);
      for (let x = 0; x < N; x++) {
        const m = mask[y][x]; if (!m) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const nx = (x + 0.5) / N * 2 - 1, ny = (y + 0.5) / M * 2 - 1;
        let col = edge ? P.dark : (nx + ny < -0.75 ? P.light : nx + ny > 0.7 ? P.dark : P.body);
        if (S.pet.amt > 0) { const d = Math.hypot((ox + x * c) - S.pet.x * DPR, (oy + y * c) - S.pet.y * DPR); if (d < R * DPR * 0.5 && ((x + y) % 2 === 0)) col = P.light; }
        cell(x, y, col, shift);
      }
    }
    // 脚
    for (const [x0, k] of [[7, -1], [14, 1]]) for (let x = x0; x < x0 + 3; x++) cell(x, M - 1 + (S.carried ? Math.round(walk * k) : 0), P.dark);

    // 眼睛
    const lx = Math.round(S.look.x), ly = Math.round(S.look.y);
    const closed = S.mood === "sleepy" || S.blink > 0.4;
    const happy = S.mood === "happy" || S.pet.amt > 0.15;
    for (const ex of [8, 14]) {
      const x = ex + lx, y = 9 + ly;
      if (closed) { cell(x, y + 1, P.ink); cell(x + 1, y + 1, P.ink); }
      else if (happy) { cell(x, y + 1, P.ink); cell(x + 1, y, P.ink); cell(x + 2, y + 1, P.ink); }
      else { cell(x, y, P.ink); cell(x + 1, y, P.ink); cell(x, y + 1, P.ink); cell(x + 1, y + 1, P.ink); cell(x, y, P.cyan); }
    }
    // 腮红
    if (happy) { ctx.globalAlpha = 0.7; cell(5 + lx, 12, P.pink); cell(6 + lx, 12, P.pink); cell(17 + lx, 12, P.pink); cell(18 + lx, 12, P.pink); ctx.globalAlpha = 1; }
    // 嘴
    const mx = 11 + lx, my = 13 + Math.max(0, ly);
    if (S.talking || S.mouthLevel > 0.08) {
      const open = Math.round(1 + S.mouthLevel * 2.2);
      for (let yy = 0; yy < open; yy++) for (let xx = 0; xx < 2 + (open > 1 ? 1 : 0); xx++) cell(mx - (open > 1 ? 0 : 0) + xx, my + yy, P.ink);
      if (open > 1) cell(mx + 1, my + open - 1, P.pink);
    } else if (S.mood === "sleepy") { cell(mx, my, P.ink); }
    else if (S.mood === "thinking") { cell(mx, my, P.ink); cell(mx + 1, my - 1, P.ink); }
    else if (happy) { cell(mx - 1, my, P.ink); cell(mx + 1, my, P.ink); cell(mx, my + 1, P.ink); cell(mx + 2, my + 1, P.ink); }
    else { cell(mx, my, P.ink); cell(mx + 1, my, P.ink); }

    // 扫描线
    ctx.globalAlpha = 0.10; ctx.fillStyle = "#000";
    for (let yy = oy; yy < oy + gh * sy; yy += 3 * DPR) ctx.fillRect(ox, Math.round(yy), Math.round(gw * sx), Math.max(1, Math.round(DPR)));
    ctx.globalAlpha = 1;

    // 书
    if (S.mood === "reading") {
      const bx = cx * DPR, by = (cy + R * 0.75) * DPR, bw = R * 0.8 * DPR, bh = R * 0.36 * DPR;
      ctx.fillStyle = "#EDE9FE"; ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      ctx.fillStyle = P.dark; ctx.fillRect(bx - c / 2, by - bh / 2, c, bh);
      ctx.fillStyle = "#C4B5FD"; for (let i = 0; i < 3; i++) { ctx.fillRect(bx - bw / 2 + c, by - bh / 2 + c * (1 + i * 1.5), bw / 2 - 2 * c, c * 0.6); ctx.fillRect(bx + c, by - bh / 2 + c * (1 + i * 1.5), bw / 2 - 2 * c, c * 0.6); }
    }

    // 粒子
    for (const p of S.parts) {
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      if (p.type === "z") { ctx.fillStyle = p.col; ctx.font = `bold ${Math.round(p.sz * DPR)}px Menlo, monospace`; ctx.fillText("Z", p.x * DPR, p.y * DPR); }
      else if (p.type === "heart") { ctx.fillStyle = P.pink; const s = Math.max(1, Math.round(DPR * 2)); const hx = Math.round(p.x * DPR), hy = Math.round(p.y * DPR); for (const [dx, dy] of [[-1, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]) ctx.fillRect(hx + dx * s, hy + dy * s, s, s); }
      else { ctx.fillStyle = p.col; const s = Math.round(p.sz * DPR); ctx.fillRect(Math.round(p.x * DPR), Math.round(p.y * DPR), s, s); }
    }
    ctx.globalAlpha = 1;
  }

  function hit(x, y) { const g = geometry(); const dx = (x - g.cx) / (g.R * 1.15), dy = (y - g.cy) / (g.R * 1.15); return dx * dx + dy * dy <= 1; }
  function petAt(x, y) { S.pet.x = x; S.pet.y = y; S.pet.amt = Math.min(1.2, S.pet.amt + 0.35); if (Math.random() < 0.3) spawn("heart", 1, x, y - 10); if (Math.random() < 0.15) S.glitch = 0.12; }

  if (opts.icon) { S.behT = 999; S.hopT = 999; S.blinkT = 999; S.glitchT = 999; }
  let last = performance.now(), raf = 0, alive = true;
  (function loop(now) { if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; frame(dt); raf = requestAnimationFrame(loop); })(last);

  return {
    S, hit, petAt, geometry, resize,
    destroy: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); },
    spawn: (t, n) => { const g = geometry(); spawn(t === "heart" ? "heart" : "bit", n, g.cx, g.cy - g.R * 0.9); },
    setMouth: v => { S.mouthTarget = Math.max(0, Math.min(1, v)); },
    setMood: m => { S.mood = m; if (m !== "idle") S.beh = null; },
    poke: () => { const g = geometry(); petAt(g.cx, g.cy); spawn("heart", 3, g.cx, g.cy - g.R); S.glitch = 0.3; },
    land: (k = 1) => { S.squash = 1 + 0.25 * k; S.hop = 0; S.glitch = 0.2; const g = geometry(); spawn("bit", 6, g.cx, g.cy + g.R); },
    spin: () => { S.glitch = 0.5; S.spin = 0.8; const g = geometry(); spawn("bit", 8, g.cx, g.cy); }
  };
}
