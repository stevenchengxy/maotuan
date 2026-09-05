// 小毛团：Canvas 手绘。三层毛、会呼吸、会眨眼、会打哈欠、会伸懒腰、会被摸乱。
export function makeFluff(canvas, opts = {}) {
  const ctx = canvas.getContext("2d");
  const TAU = Math.PI * 2;
  let W = 0, H = 0, DPR = 1;

  const C = Object.assign({
    a: "#EBCB8E", b: "#D2A85F", c: "#A67C3E", hi: "#F7E3B0", ink: "#3A3238", blush: "#C96A7C", note: "#6E948A", z: "#8C8494", paper: "#F6F2E9", lid: "#D9B36A"
  }, opts.colors || {});

  const S = {
    mood: "idle",            // idle happy sleepy thinking reading
    talking: false, mouthLevel: 0, mouthTarget: 0,
    t: 0,
    hop: 0, hopT: 6,
    blink: 0, blinkT: 2.5,
    look: { x: 0, y: 0 }, lookTarget: { x: 0, y: 0 }, lookHold: 0,
    pet: { x: 0, y: 0, amt: 0 },
    parts: [],
    beh: null, behT: 5,      // 小动作
    ear: [0, 0],             // 耳朵抖
    squash: 1, tilt: 0, carried: false,
    scale: 1
  };

  // 每根毛的固定参数，一次算好
  const seed = mulberry32(7);
  const furUnder = mk(240, 0.11, 0.08), furMid = mk(460, 0.07, 0.07), furTop = mk(180, 0.04, 0.04), furIn = mkIn(220);
  function mk(n, base, vary) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ a: (i / n) * TAU - Math.PI / 2 + (seed() - 0.5) * 0.02, len: base + seed() * vary, wob: seed() * TAU, tone: seed(), curl: (seed() - 0.5) * 0.6 });
    return out;
  }
  function mkIn(n) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = seed() * TAU, r = 0.25 + Math.sqrt(seed()) * 0.62; out.push({ a, r, len: 0.03 + seed() * 0.035, wob: seed() * TAU, tone: seed() }); }
    return out;
  }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const gauss = (d, w) => Math.exp(-d * d / w);

  // 轮廓：呼吸 + 两只耳朵（会抖）
  function bodyR(a, R) {
    const t = S.t;
    let r = R * (1 + 0.03 * Math.sin(3 * a + t * 0.8) + 0.018 * Math.sin(5 * a - t * 0.55) + 0.012 * Math.sin(7 * a + t * 1.3));
    const e1 = gauss(angDiff(a, -2.20 + S.ear[0] * 0.15), 0.011) * (0.32 + S.ear[0] * 0.06);
    const e2 = gauss(angDiff(a, -0.94 + S.ear[1] * 0.15), 0.011) * (0.32 + S.ear[1] * 0.06);
    return r * (1 + e1 + e2);
  }

  function geometry() {
    const R = Math.min(W * (opts.icon ? 0.33 : 0.235), H * (opts.icon ? 0.33 : 0.205)) * S.scale;
    const hopY = -Math.sin(Math.min(1, S.hop) * Math.PI) * R * 0.45;
    const breathe = Math.sin(S.t * (S.mood === "sleepy" ? 1.0 : 1.7));
    const baseY = H * (opts.icon ? 0.50 : 0.66);
    const cx = W / 2, cy = baseY + hopY;
    let sx = S.squash, sy = 1 / S.squash;
    sy *= 1 + breathe * 0.012; sx *= 1 - breathe * 0.008;
    if (S.beh && S.beh.type === "stretch") { const k = Math.sin(S.beh.t / S.beh.dur * Math.PI); sx *= 1 + 0.10 * k; sy *= 1 - 0.07 * k; }
    return { R, cx, cy, sx, sy, hopY, breathe, baseY };
  }

  function spawn(type, n, x, y) {
    for (let i = 0; i < n; i++) S.parts.push({ type, x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 16, vy: -20 - Math.random() * 20, life: 1, rot: (Math.random() - 0.5) * 0.7, sz: 8 + Math.random() * 6 });
  }

  function schedule() {
    S.behT = 4 + Math.random() * 7;
    if (S.mood !== "idle") return;
    const r = Math.random();
    if (r < 0.30) S.beh = { type: "look", t: 0, dur: 2.4 + Math.random() * 2, n: 0 };
    else if (r < 0.48) S.beh = { type: "yawn", t: 0, dur: 1.9 };
    else if (r < 0.66) S.beh = { type: "stretch", t: 0, dur: 1.3 };
    else if (r < 0.84) S.beh = { type: "ear", t: 0, dur: 0.5, side: Math.random() < 0.5 ? 0 : 1 };
    else S.beh = { type: "wiggle", t: 0, dur: 1.1 };
  }

  function frame(dt) {
    S.t += dt;
    if (S.pet.amt > 0) S.pet.amt = Math.max(0, S.pet.amt - dt * 0.9);

    // 蹦
    S.hopT -= dt;
    if (S.hopT <= 0 && S.mood !== "sleepy" && S.mood !== "reading" && !S.carried) { S.hopT = 7 + Math.random() * 10; S.hop = 1.0001; }
    if (S.hop > 0) { S.hop = Math.max(0, S.hop - dt * 2.4); if (S.hop === 0) S.squash = 1.14; }
    S.squash += (1 - S.squash) * Math.min(1, dt * 9);

    // 眨眼
    S.blinkT -= dt;
    if (S.blinkT <= 0) { S.blinkT = 1.6 + Math.random() * 3.6; S.blink = 1; if (Math.random() < 0.25) S.blinkT = 0.35; }
    if (S.blink > 0) S.blink = Math.max(0, S.blink - dt * 8);

    // 小动作
    S.behT -= dt;
    if (!S.beh && S.behT <= 0) schedule();
    if (S.beh) {
      const b = S.beh; b.t += dt;
      if (b.type === "look") {
        if (S.lookHold <= 0) { S.lookTarget.x = (Math.random() - 0.5) * 1.6; S.lookTarget.y = (Math.random() - 0.5) * 0.8; S.lookHold = 0.7 + Math.random() * 0.8; }
      } else if (b.type === "ear") {
        S.ear[b.side] = Math.sin(b.t / b.dur * Math.PI * 2) * 1.2;
      } else if (b.type === "wiggle") {
        S.tilt = Math.sin(b.t / b.dur * Math.PI * 3) * 0.05 * Math.sin(b.t / b.dur * Math.PI);
      }
      if (b.t >= b.dur) { S.beh = null; S.ear = [0, 0]; S.tilt = 0; S.lookTarget.x = 0; S.lookTarget.y = 0; }
    }
    if (S.lookHold > 0) S.lookHold -= dt;
    if (!S.beh && S.mood === "reading") { S.lookTarget.x = Math.sin(S.t * 1.2) * 0.5; S.lookTarget.y = 0.5; }
    if (!S.beh && S.mood === "thinking") { S.lookTarget.x = 0.6; S.lookTarget.y = -0.7; }
    S.look.x += (S.lookTarget.x - S.look.x) * Math.min(1, dt * 6);
    S.look.y += (S.lookTarget.y - S.look.y) * Math.min(1, dt * 6);

    // 嘴
    S.mouthLevel += (S.mouthTarget - S.mouthLevel) * Math.min(1, dt * 18);

    // 粒子
    for (const p of S.parts) { p.life -= dt * 0.7; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 22 * dt; p.rot += dt * 0.6; }
    S.parts = S.parts.filter(p => p.life > 0);
    const g = geometry();
    if (S.mood === "sleepy" && Math.random() < dt * 0.6) spawn("z", 1, g.cx + g.R * 0.7, g.cy - g.R * 0.9);
    if (S.mood === "reading" && S.talking && Math.random() < dt * 0.5) spawn("note", 1, g.cx + g.R * 0.8, g.cy - g.R * 0.8);
    if (S.mood === "thinking" && Math.random() < dt * 0.35) spawn("dot", 1, g.cx + g.R * 0.75, g.cy - g.R * 0.95);

    render(g);
  }

  function strokeFur(list, g, kind) {
    const { R, cx, cy } = g;
    ctx.lineCap = "round";
    for (const f of list) {
      const a = f.a;
      const r = bodyR(a, R);
      let bend = 0, lenK = 1;
      if (S.pet.amt > 0) {
        const pa = Math.atan2(S.pet.y - cy, S.pet.x - cx);
        const w = gauss(angDiff(a, pa), 0.32) * S.pet.amt;
        bend += w * 0.7 * Math.sign(angDiff(a, pa) || 1); lenK *= 1 - w * 0.3;
      }
      // 毛的流向：轻轻飘 + 底下的毛往下垂
      bend += Math.sin(S.t * 1.1 + f.wob) * 0.05 + f.curl * 0.15;
      const droop = Math.max(0, Math.sin(a)) * 0.25;
      bend += droop * (Math.cos(a) > 0 ? 1 : -1) * 0.5;
      // 耳朵附近的毛跟着抖
      bend += gauss(angDiff(a, -2.2), 0.05) * S.ear[0] * 0.3 + gauss(angDiff(a, -0.94), 0.05) * S.ear[1] * 0.3;

      const clump = 0.72 + 0.28 * Math.sin(a * 9 + 1.3) * Math.sin(a * 4 - 0.4) + 0.12 * Math.sin(a * 23 + f.wob);
      const len = R * f.len * lenK * clump;
      const x0 = cx + Math.cos(a) * r * 0.90, y0 = cy + Math.sin(a) * r * 0.90 * 0.96;
      const a2 = a + bend;
      const x2 = cx + Math.cos(a2) * (r + len), y2 = cy + Math.sin(a2) * (r + len) * 0.96;
      const xm = cx + Math.cos(a + bend * 0.4) * (r + len * 0.5), ym = cy + Math.sin(a + bend * 0.4) * (r + len * 0.5) * 0.96;
      if (kind === "under") { ctx.strokeStyle = f.tone < 0.5 ? C.c : C.b; ctx.globalAlpha = 0.12 + f.tone * 0.12; ctx.lineWidth = Math.max(1, R * 0.04); }
      else if (kind === "mid") { ctx.strokeStyle = f.tone < 0.3 ? C.c : f.tone < 0.75 ? C.b : C.a; ctx.globalAlpha = 0.45 + f.tone * 0.3; ctx.lineWidth = Math.max(1, R * 0.02); }
      else { // top：只画受光的那一侧
        const light = Math.max(0, -Math.cos(a - Math.PI * 0.75));
        if (light < 0.15) continue;
        ctx.strokeStyle = C.hi; ctx.globalAlpha = 0.25 + light * 0.4; ctx.lineWidth = Math.max(1, R * 0.016);
      }
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(xm, ym, x2, y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function render(g) {
    const { R, cx, cy, sx, sy, hopY, baseY } = g;
    ctx.clearRect(0, 0, W, H);

    // 影子
    const shadowK = 1 - Math.min(1, Math.abs(hopY) / (R * 0.45)) * 0.5;
    const sg = ctx.createRadialGradient(cx, baseY + R * 1.02, 0, cx, baseY + R * 1.02, R * 0.95 * shadowK);
    sg.addColorStop(0, "rgba(40,30,40,0.28)"); sg.addColorStop(1, "rgba(40,30,40,0)");
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(cx, baseY + R * 1.02, R * 0.95 * shadowK, R * 0.2 * shadowK, 0, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(cx, cy + R * 0.95);
    ctx.rotate(S.tilt);
    ctx.scale(sx, sy);
    ctx.translate(-cx, -(cy + R * 0.95));

    // 脚
    const walk = S.carried ? Math.sin(S.t * 9) * 0.10 : (S.hop > 0 ? -0.12 : Math.sin(S.t * 2.2) * 0.02);
    ctx.fillStyle = C.c;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sgn * R * 0.42, cy + R * 0.90 + (sgn > 0 ? walk : -walk) * R, R * 0.21, R * 0.12, sgn * 0.1, 0, TAU);
      ctx.fill();
    }

    // 绒边：两圈半透明的轮廓，让边缘软下来
    for (const [k, al, col] of [[1.22, 0.05, C.b], [1.14, 0.09, C.b], [1.07, 0.16, C.b]]) {
      ctx.beginPath();
      for (let i = 0; i <= 140; i++) { const a = i / 140 * TAU - Math.PI / 2; const r = bodyR(a, R) * k; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.96; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath(); ctx.globalAlpha = al; ctx.fillStyle = col; ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 身体
    const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.40, R * 0.1, cx, cy, R * 1.3);
    body.addColorStop(0, C.a); body.addColorStop(0.55, C.b); body.addColorStop(1, C.c);
    ctx.beginPath();
    for (let i = 0; i <= 140; i++) { const a = i / 140 * TAU - Math.PI / 2; const r = bodyR(a, R); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.96; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fillStyle = body; ctx.fill();

    // 毛：底层、中层、内层绒、高光层
    strokeFur(furUnder, g, "under");
    strokeFur(furMid, g, "mid");
    ctx.lineCap = "round";
    for (const f of furIn) {
      const rr = bodyR(f.a, R) * f.r;
      const x0 = cx + Math.cos(f.a) * rr, y0 = cy + Math.sin(f.a) * rr * 0.96;
      const a2 = f.a + Math.sin(S.t * 0.9 + f.wob) * 0.12;
      const len = R * f.len;
      ctx.strokeStyle = f.tone < 0.5 ? C.b : C.hi; ctx.globalAlpha = 0.10 + f.tone * 0.12; ctx.lineWidth = Math.max(1, R * 0.018);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a2) * len, y0 + Math.sin(a2) * len * 0.96); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    strokeFur(furTop, g, "top");

    // 脸
    face(g);

    ctx.restore();

    if (S.mood === "reading") book(g);
    for (const p of S.parts) part(p);
  }

  function face(g) {
    const { R, cx, cy } = g;
    const lx = S.look.x * R * 0.07, ly = S.look.y * R * 0.05;
    const faceY = cy - R * 0.08;
    const ex = R * 0.31;
    const yawn = S.beh && S.beh.type === "yawn" ? Math.sin(S.beh.t / S.beh.dur * Math.PI) : 0;
    const happy = S.mood === "happy" || S.pet.amt > 0.15;
    const closed = S.mood === "sleepy" ? 1 : Math.max(Math.min(1, S.blink * 1.25), yawn > 0.3 ? Math.min(1, (yawn - 0.3) * 2.5) : 0, happy ? 0.0 : 0);
    const squint = happy ? 0.35 : 0;

    // 腮红
    ctx.save();
    ctx.globalAlpha = 0.16 + (happy ? 0.30 * Math.min(1, 0.6 + S.pet.amt) : 0) + yawn * 0.1;
    for (const sgn of [-1, 1]) {
      const bx = cx + sgn * R * 0.55 + lx * 0.5, by = faceY + R * 0.18;
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, R * 0.16);
      bg.addColorStop(0, C.blush); bg.addColorStop(1, "rgba(201,106,124,0)");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(bx, by, R * 0.16, R * 0.1, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // 眼睛
    for (const sgn of [-1, 1]) {
      const x = cx + sgn * ex + lx, y = faceY + ly;
      const eh = R * 0.115 * (1 - squint), ew = R * 0.085;
      if (closed > 0.9) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1.6, R * 0.036); ctx.lineCap = "round";
        ctx.beginPath();
        if (S.mood === "sleepy" || yawn > 0.3) ctx.arc(x, y - R * 0.02, R * 0.11, Math.PI * 0.12, Math.PI * 0.88);
        else ctx.arc(x, y + R * 0.06, R * 0.11, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        continue;
      }
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y, ew, eh, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = C.ink; ctx.fillRect(x - ew, y - eh, ew * 2, eh * 2);
      // 高光：一大一小
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath(); ctx.ellipse(x - ew * 0.35, y - eh * 0.38, ew * 0.34, eh * 0.26, -0.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + ew * 0.35, y + eh * 0.42, ew * 0.16, eh * 0.12, 0, 0, TAU); ctx.fill();
      // 眼皮从上面盖下来
      if (closed > 0) { ctx.fillStyle = C.lid; ctx.fillRect(x - ew, y - eh, ew * 2, eh * 2 * closed); }
      ctx.restore();
    }

    // 嘴
    const my = faceY + R * 0.27 + ly * 0.6;
    ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = Math.max(1.5, R * 0.032); ctx.lineCap = "round";
    ctx.beginPath();
    if (yawn > 0.2) {
      ctx.ellipse(cx + lx, my + R * 0.03, R * 0.07 * yawn + R * 0.02, R * 0.11 * yawn + R * 0.01, 0, 0, TAU); ctx.fill();
    } else if (S.talking || S.mouthLevel > 0.05) {
      const open = Math.max(0.08, S.mouthLevel);
      ctx.ellipse(cx + lx, my + R * 0.02, R * (0.06 + open * 0.05), R * (0.02 + open * 0.09), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(cx + lx, my - R * 0.01, R * (0.05 + open * 0.03), R * 0.012, 0, 0, TAU); ctx.fill();
    } else if (S.mood === "sleepy") {
      ctx.arc(cx + lx, my, R * 0.03, 0, TAU); ctx.stroke();
    } else if (S.mood === "thinking") {
      ctx.moveTo(cx - R * 0.05 + lx, my + R * 0.01); ctx.lineTo(cx + R * 0.07 + lx, my - R * 0.02); ctx.stroke();
    } else {
      // ω 形小嘴
      const w = happy ? R * 0.11 : R * 0.075, d = happy ? R * 0.07 : R * 0.045;
      ctx.moveTo(cx - w + lx, my - d * 0.5);
      ctx.quadraticCurveTo(cx - w * 0.5 + lx, my + d, cx + lx, my);
      ctx.quadraticCurveTo(cx + w * 0.5 + lx, my + d, cx + w + lx, my - d * 0.5);
      ctx.stroke();
    }
  }

  function book(g) {
    const { R, cx, cy } = g;
    ctx.save();
    ctx.translate(cx + S.look.x * R * 0.03, cy + R * 0.72); ctx.rotate(-0.06);
    ctx.fillStyle = C.paper; ctx.strokeStyle = C.z; ctx.lineWidth = Math.max(1, R * 0.02);
    ctx.beginPath(); ctx.roundRect(-R * 0.4, -R * 0.2, R * 0.8, R * 0.38, R * 0.05); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -R * 0.2); ctx.lineTo(0, R * 0.18); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-R * 0.33, -R * 0.1 + i * R * 0.08); ctx.lineTo(-R * 0.07, -R * 0.1 + i * R * 0.08); ctx.moveTo(R * 0.07, -R * 0.1 + i * R * 0.08); ctx.lineTo(R * 0.33, -R * 0.1 + i * R * 0.08); ctx.stroke(); }
    ctx.restore();
  }

  function part(p) {
    ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.6); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    if (p.type === "heart") { ctx.fillStyle = C.blush; const s = p.sz / 10; ctx.beginPath(); ctx.moveTo(0, 3 * s); ctx.bezierCurveTo(-6 * s, -2 * s, -3 * s, -7 * s, 0, -3.4 * s); ctx.bezierCurveTo(3 * s, -7 * s, 6 * s, -2 * s, 0, 3 * s); ctx.fill(); }
    else if (p.type === "note") { ctx.fillStyle = C.note; ctx.font = p.sz + "px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("♪", 0, 0); }
    else if (p.type === "z") { ctx.fillStyle = C.z; ctx.font = "600 " + p.sz + "px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("z", 0, 0); }
    else { ctx.fillStyle = C.z; ctx.beginPath(); ctx.arc(0, 0, p.sz * 0.2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // 命中：算不算碰到了它
  function hit(x, y) {
    const g = geometry();
    const dx = (x - g.cx) / (g.R * 1.22), dy = (y - g.cy) / (g.R * 1.18);
    return dx * dx + dy * dy <= 1;
  }
  function petAt(x, y) {
    S.pet.x = x; S.pet.y = y; S.pet.amt = Math.min(1.2, S.pet.amt + 0.35);
    if (Math.random() < 0.35) spawn("heart", 1, x, y - 10);
  }

  if (opts.icon) { S.behT = 999; S.hopT = 999; S.blinkT = 999; S.t = 2.1; }
  let last = performance.now();
  (function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; frame(dt); requestAnimationFrame(loop); })(last);

  return {
    S, hit, petAt, geometry, resize,
    spawn: (t, n) => { const g = geometry(); spawn(t, n, g.cx, g.cy - g.R * 0.9); },
    setMouth: v => { S.mouthTarget = Math.max(0, Math.min(1, v)); },
    setMood: m => { S.mood = m; if (m !== "idle") S.beh = null; },
    poke: () => { const g = geometry(); petAt(g.cx + (Math.random() - 0.5) * g.R, g.cy); spawn("heart", 3, g.cx, g.cy - g.R); }
  };
}
