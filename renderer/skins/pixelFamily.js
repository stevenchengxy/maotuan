import { SPRITES } from "./sprites.js";

// 像素家族的引擎：一张图纸 + 一套动作。格子对齐到设备像素，边缘干净。
export function makePixelSkin(spriteId) {
  const SP = SPRITES[spriteId] || SPRITES.blob;
  return function (canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, DPR = 1;
    const N = 12, M = Math.max(SP.rows.length + (SP.tentacles ? 6 : 0), 10);
    const P = { body: SP.body, dark: SP.dark || "#333", light: SP.light || "#FFFFFF", accent: SP.accent || "#22E7FF", eye: SP.eyeColor || (SP.eyes.color || "#0B0A16"), tile: "#1A1530", tileEdge: "#33295C", pink: "#FF5C8A", z: "#A9B0FF" };
    const S = { mood: "idle", talking: false, mouthLevel: 0, mouthTarget: 0, t: 0, hop: 0, hopT: 7, blink: 0, blinkT: 2.6, look: { x: 0, y: 0 }, lookTarget: { x: 0, y: 0 }, pet: { x: 0, y: 0, amt: 0 }, parts: [], glitch: 0, squash: 1, carried: false, flip: 0, beh: null, behT: 5, scale: 1 };

    const grid = SP.rows.map(r => r.padEnd(N, ".").split(""));
    const cellAt = (x, y) => (y >= 0 && y < grid.length && x >= 0 && x < N) ? grid[y][x] : ".";

    function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); }
    resize(); window.addEventListener("resize", resize);

    function geometry() {
      const R = Math.min(W * (opts.icon ? 0.36 : 0.24), H * (opts.icon ? 0.36 : 0.21)) * S.scale;
      const hopY = -Math.sin(Math.min(1, S.hop) * Math.PI) * R * 0.5;
      const floatY = SP.float ? Math.sin(S.t * 1.1) * R * 0.08 : 0;
      const baseY = H * (opts.icon ? 0.5 : 0.62);
      return { R, cx: W / 2, cy: baseY + hopY + floatY, baseY, hopY };
    }
    function spawn(type, n, x, y) { for (let i = 0; i < n; i++) S.parts.push({ type, x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 30, life: 1, sz: 3 + Math.random() * 3, col: Math.random() < 0.5 ? P.accent : P.pink }); }

    function frame(dt) {
      S.t += dt;
      if (S.pet.amt > 0) S.pet.amt = Math.max(0, S.pet.amt - dt * 0.9);
      S.hopT -= dt;
      if (S.hopT <= 0 && S.mood !== "sleepy" && S.mood !== "reading" && !S.carried && !SP.float) { S.hopT = 7 + Math.random() * 9; S.hop = 1.0001; }
      if (S.hop > 0) { S.hop = Math.max(0, S.hop - dt * 2.6); if (S.hop === 0) S.squash = 1.18; }
      S.squash += (1 - S.squash) * Math.min(1, dt * 10);
      S.blinkT -= dt; if (S.blinkT <= 0) { S.blinkT = 1.8 + Math.random() * 3.5; S.blink = 1; }
      if (S.blink > 0) S.blink = Math.max(0, S.blink - dt * 9);
      if (S.glitch > 0) S.glitch = Math.max(0, S.glitch - dt);
      if (S.flip > 0) S.flip = Math.max(0, S.flip - dt);
      S.behT -= dt;
      if (!S.beh && S.behT <= 0 && S.mood === "idle") { S.behT = 5 + Math.random() * 8; S.beh = { type: "look", t: 0, dur: 2.5 }; }
      if (S.beh) { const b = S.beh; b.t += dt; if (Math.floor(b.t * 1.3) !== Math.floor((b.t - dt) * 1.3)) { S.lookTarget.x = Math.round((Math.random() - 0.5) * 2); S.lookTarget.y = Math.round((Math.random() - 0.5) * 1.2); } if (b.t >= b.dur) { S.beh = null; S.lookTarget.x = 0; S.lookTarget.y = 0; } }
      if (!S.beh && S.mood === "thinking") { S.lookTarget.x = 1; S.lookTarget.y = -1; }
      if (!S.beh && S.mood === "reading") { S.lookTarget.x = Math.sin(S.t * 1.5) > 0 ? 1 : -1; S.lookTarget.y = 1; }
      S.look.x += (S.lookTarget.x - S.look.x) * Math.min(1, dt * 8); S.look.y += (S.lookTarget.y - S.look.y) * Math.min(1, dt * 8);
      S.mouthLevel += (S.mouthTarget - S.mouthLevel) * Math.min(1, dt * 18);
      for (const p of S.parts) { p.life -= dt * 0.8; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; }
      S.parts = S.parts.filter(p => p.life > 0);
      const g = geometry();
      if (S.mood === "sleepy" && Math.random() < dt * 0.6) S.parts.push({ type: "z", x: g.cx + g.R * 0.7, y: g.cy - g.R * 0.9, vx: 6, vy: -18, life: 1, sz: 10, col: P.z });
      if (S.mood === "thinking" && Math.random() < dt * 0.4) S.parts.push({ type: "bit", x: g.cx + g.R * 0.8, y: g.cy - g.R, vx: 0, vy: -14, life: 1, sz: 3, col: P.accent });
      render(g);
    }

    function render(g) {
      const { R, cx, cy, baseY, hopY } = g;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const c = Math.max(1, Math.round((R * 2 / N) * DPR));
      const gw = c * N, gh = c * SP.rows.length;
      const sx = S.squash, sy = 1 / S.squash;
      const wob = SP.wobble ? 1 + Math.sin(S.t * 2.6) * 0.03 : 1;
      const ox = Math.round(cx * DPR - gw / 2 * sx * wob), oy = Math.round((cy + R * 0.85) * DPR - gh * sy / wob);
      const mirror = S.flip > 0 && Math.floor(S.flip * 12) % 2 === 1;

      // 底座：深色圆角方块 + 微光（参考图那种）
      if (SP.tile && !opts.noTile) {
        const tl = SP.tentacles ? Math.max(...SP.tentacles.map(t => t.len)) : 0;
        const tw = c * (N + 3), th = c * (N + 3 + tl), tx = Math.round(cx * DPR - tw / 2), ty = Math.round((cy + R * 0.85) * DPR - gh * 0.5 - c * (N + 3) / 2);
        ctx.save(); ctx.shadowColor = P.body; ctx.shadowBlur = (14 + S.pet.amt * 12) * DPR;
        ctx.fillStyle = P.tile; ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, c * 2.2); ctx.fill(); ctx.restore();
        const tg = ctx.createLinearGradient(0, ty, 0, ty + th); tg.addColorStop(0, "rgba(255,255,255,0.06)"); tg.addColorStop(1, "rgba(0,0,0,0.12)");
        ctx.fillStyle = tg; ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, c * 2.2); ctx.fill();
        ctx.strokeStyle = P.tileEdge; ctx.lineWidth = Math.max(1, DPR); ctx.beginPath(); ctx.roundRect(tx + 0.5, ty + 0.5, tw - 1, th - 1, c * 2.2); ctx.stroke();
      } else {
        // 没有方框：地上一道软影子
        const k = 1 - Math.min(1, Math.abs(hopY) / (R * 0.5)) * 0.5;
        const tl = SP.tentacles ? Math.max(...SP.tentacles.map(t => t.len)) : 0;
        const shy = (baseY + R * 0.92) * DPR + tl * c;
        const sg = ctx.createRadialGradient(cx * DPR, shy, 0, cx * DPR, shy, gw * 0.42 * k);
        sg.addColorStop(0, "rgba(30,20,50,0.28)"); sg.addColorStop(1, "rgba(30,20,50,0)");
        ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx * DPR, shy, gw * 0.42 * k, c * 1.2, 0, 0, Math.PI * 2); ctx.fill();
      }

      const cell = (x, y, col, dx = 0, dy = 0) => {
        if (mirror) x = N - 1 - x;
        const px = ox + Math.round((x * c + dx) * sx * wob), py = oy + Math.round((y * c + dy) * sy / wob);
        ctx.fillStyle = col; ctx.fillRect(px, py, Math.ceil(c * sx * wob), Math.ceil(c * sy / wob));
      };
      const glitchShift = y => (S.glitch > 0 && ((y * 7 + Math.floor(S.t * 30)) % 5 === 0)) ? (Math.random() < 0.5 ? -c : c) : 0;
      const dangle = y => (S.carried && y >= grid.length - 2) ? Math.round(Math.sin(S.t * 9) * c * 0.6) : 0;

      // 触手（水母）：每行左右摆一格
      if (SP.tentacles) for (const tn of SP.tentacles) for (let k = 0; k < tn.len; k++) { const y = grid.length + k; const sway = Math.round(Math.sin(S.t * 2 + tn.col + k * 0.7) * 0.9 + (S.carried ? -0.8 : 0)); cell(tn.col + sway, y, k % 2 ? P.dark : P.body); }

      // 身体
      for (let y = 0; y < grid.length; y++) {
        const shift = glitchShift(y) + dangle(y);
        for (let x = 0; x < N; x++) {
          const ch = grid[y][x]; if (ch === ".") continue;
          if (SP.wave && y === grid.length - 1 && ((x + Math.floor(S.t * 4)) % 2 === 0)) continue;   // 幽灵裙边
          let col = ch === "#" ? P.body : ch === "L" ? P.light : ch === "D" ? P.dark : ch === "W" ? "#FFFFFF" : ch === "A" ? P.accent : P.body;
          if (S.pet.amt > 0 && ch === "#") { const d = Math.hypot((ox + x * c) - S.pet.x * DPR, (oy + y * c) - S.pet.y * DPR); if (d < R * DPR * 0.45 && ((x + y) % 2 === 0)) col = P.light === "#FFFFFF" ? mix(P.body, "#FFFFFF", 0.35) : P.light; }
          cell(x, y, col, shift);
        }
      }
      // 鼻子（猫）
      if (SP.nose) for (let i = 0; i < SP.nose.w; i++) cell(SP.nose.col + i, SP.nose.row, P.pink);

      // 眼睛：两块黑方块；眨眼变一条线；开心变 ^；睡觉是线
      const E = SP.eyes; const lx = Math.round(S.look.x), ly = Math.round(S.look.y);
      const closed = S.mood === "sleepy" || S.blink > 0.4;
      const happy = S.mood === "happy" || S.pet.amt > 0.15;
      const eyeCol = E.color || P.eye;
      for (const ex of E.cols) {
        const x = ex + lx, y = E.row + ly;
        if (closed) { for (let i = 0; i < E.w; i++) cell(x + i, y + E.h - 1, eyeCol); }
        else if (happy && E.h > 1) { cell(x, y + 1, eyeCol); for (let i = 1; i < E.w; i++) cell(x + i, y, eyeCol); cell(x + E.w, y + 1, eyeCol); }
        else { for (let yy = 0; yy < E.h; yy++) for (let xx = 0; xx < E.w; xx++) cell(x + xx, y + yy, eyeCol); }
      }
      if (happy && SP.blush !== false) { ctx.globalAlpha = 0.75; cell(E.cols[0] - 1 + lx, E.row + E.h, P.pink); cell(E.cols[1] + E.w + lx, E.row + E.h, P.pink); ctx.globalAlpha = 1; }

      // 嘴：只有说话 / 打哈欠的时候才出现（参考图平时没有嘴）
      const Mo = SP.mouth;
      if (Mo && (S.talking || S.mouthLevel > 0.08)) {
        const open = Math.round(1 + S.mouthLevel * 2);
        if (Mo.style === "grid") { for (let i = 0; i < Mo.w; i++) if ((i + Math.floor(S.t * 12)) % 2 === 0) cell(Mo.col + i + lx, Mo.row, P.eye); }
        else { for (let yy = 0; yy < open; yy++) for (let xx = 0; xx < Mo.w; xx++) cell(Mo.col + xx + lx, Mo.row + yy, P.eye); if (open > 1) cell(Mo.col + lx, Mo.row + open - 1, P.pink); }
      } else if (Mo && S.mood === "sleepy") { cell(Mo.col + lx, Mo.row, P.eye); }

      // 书
      if (S.mood === "reading") { const bx = cx * DPR, by = (cy + R * 0.95) * DPR, bw = R * 0.8 * DPR, bh = R * 0.34 * DPR; ctx.fillStyle = "#EDE9FE"; ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh); ctx.fillStyle = P.dark; ctx.fillRect(bx - c / 2, by - bh / 2, c, bh); }

      for (const p of S.parts) {
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        if (p.type === "z") { ctx.fillStyle = p.col; ctx.font = `bold ${Math.round(p.sz * DPR)}px Menlo, monospace`; ctx.fillText("Z", p.x * DPR, p.y * DPR); }
        else if (p.type === "heart") { ctx.fillStyle = P.pink; const s = Math.max(1, Math.round(DPR * 2)); const hx = Math.round(p.x * DPR), hy = Math.round(p.y * DPR); for (const [dx, dy] of [[-1, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]) ctx.fillRect(hx + dx * s, hy + dy * s, s, s); }
        else { ctx.fillStyle = p.col; const s = Math.round(p.sz * DPR); ctx.fillRect(Math.round(p.x * DPR), Math.round(p.y * DPR), s, s); }
      }
      ctx.globalAlpha = 1;
    }
    function mix(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const ch = s => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; }

    function hit(x, y) { const g = geometry(); const dx = (x - g.cx) / (g.R * 1.2), dy = (y - g.cy + g.R * 0.1) / (g.R * 1.25); return dx * dx + dy * dy <= 1; }
    function petAt(x, y) { S.pet.x = x; S.pet.y = y; S.pet.amt = Math.min(1.2, S.pet.amt + 0.35); if (Math.random() < 0.3) spawn("heart", 1, x, y - 10); if (Math.random() < 0.12) S.glitch = 0.1; }

    if (opts.icon) { S.behT = 999; S.hopT = 999; S.blinkT = 999; }
    let last = performance.now(), raf = 0, alive = true;
    (function loop(now) { if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; frame(dt); raf = requestAnimationFrame(loop); })(last);

    return {
      S, hit, petAt, geometry, resize,
      destroy: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); },
      spawn: (t, n) => { const g = geometry(); spawn(t === "heart" ? "heart" : "bit", n, g.cx, g.cy - g.R * 0.9); },
      setMouth: v => { S.mouthTarget = Math.max(0, Math.min(1, v)); },
      setMood: m => { S.mood = m; if (m !== "idle") S.beh = null; },
      poke: () => { const g = geometry(); petAt(g.cx, g.cy); spawn("heart", 3, g.cx, g.cy - g.R); S.glitch = 0.25; },
      land: (k = 1) => { S.squash = 1 + 0.25 * k; S.hop = 0; S.glitch = 0.15; const g = geometry(); spawn("bit", 6, g.cx, g.cy + g.R); },
      spin: () => { S.flip = 0.9; S.glitch = 0.3; const g = geometry(); spawn("bit", 8, g.cx, g.cy); }
    };
  };
}
