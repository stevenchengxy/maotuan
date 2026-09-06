// 2D 特效库：画在皮肤那张 2D 画布上，Live2D 角色和英雄皮肤共用。
// 粒子（花瓣、雪花、彩带、星星、骨头、爪印、汗滴、烟……）+ 图层（光环、地面冲击圈、漫画集中线、雨云、闪光、闪电、魔法阵、飘字）。
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const DEFAULT_COLORS = {
  heart: ["#F08A9B", "#F6A5B4", "#E8718A"], note: ["#8E7CC3", "#A895D6"], zzz: ["#9A94A6"], star: ["#F2C46B", "#FFD98A", "#FFB347"],
  sparkle: ["#FFFFFF", "#FFF2B0", "#BFE6FF"], petal: ["#F8B4C4", "#FCD5DF", "#F49BB0"], snow: ["#FFFFFF", "#DDF3FF", "#BFE6FF"],
  confetti: ["#F2C46B", "#5C7CC9", "#F08A9B", "#7FC8A9", "#FFFFFF"], bone: ["#FFF6E5", "#F5E6CC"], paw: ["#C68B59", "#A9714B"],
  sweat: ["#7FB3E6"], smoke: ["#B9B3BF", "#A29CA8"], coin: ["#F2C46B"], spark: ["#BFE6FF", "#FFFFFF", "#7FD0FF"], ember: ["#FF9F43", "#FFD27F", "#FF6B3D"],
  dot: ["#C9C3CC"], bubble: ["#BFE6FF"], leaf: ["#7FC8A9", "#5FA88A"], web: ["#F4F4F4"], wisp: ["#7CF5A8", "#3DDC84", "#B8FFD6"], ice: ["#BFE6FF", "#FFFFFF"]
};

export function makeFx(getGeom) {
  const parts = [], layers = [];
  const colorOf = (o, kind) => (o.colors && pick(o.colors)) || (o.color) || pick(DEFAULT_COLORS[kind] || DEFAULT_COLORS.dot);
  // 锚点：head / chest / feet / headR / headL / item(用 ctx 给的坐标)
  function at(o, ctx) {
    const g = getGeom();
    if (o.x !== undefined && typeof o.x === "number") return { x: o.x, y: o.y ?? g.head.y };
    const a = o.at || (ctx && ctx.x !== undefined ? "item" : "head");
    if (a === "item" && ctx) return { x: ctx.x, y: ctx.y };
    if (a === "headR") return { x: g.head.x + g.R * 0.75, y: g.head.y - g.R * 0.2 };
    if (a === "headL") return { x: g.head.x - g.R * 0.75, y: g.head.y - g.R * 0.2 };
    if (a === "above") return { x: g.head.x, y: Math.max(30, g.head.y - 40) };
    return g[a] || g.head;
  }
  function burst(kind, n = 8, o = {}, ctx) {
    const p = at(o, ctx), g = getGeom();
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), sp = rnd((o.speed || 90) * 0.35, o.speed || 90);
      parts.push({ kind, x: p.x + rnd(-1, 1) * (o.spread ?? 14), y: p.y + rnd(-1, 1) * (o.spread ?? 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.lift ?? 45), g: o.gravity ?? 70, life: rnd(0.8, 1.5) * (o.life || 1), size: rnd(0.8, 1.3) * (o.size || 1), rot: rnd(0, TAU), vr: rnd(-4, 4), color: colorOf(o, kind), seed: Math.random() * 7, delay: (o.stagger || 0) * i });
    }
  }
  function shower(kind, n = 20, o = {}) {
    const g = getGeom(); const w = o.width ?? g.R * 5.5, dur = o.dur ?? 1.6;
    for (let i = 0; i < n; i++) parts.push({ kind, delay: Math.random() * dur, x: g.cx + rnd(-w / 2, w / 2), y: -14 - Math.random() * 30, vx: rnd(-12, 12), vy: rnd(28, 60) * (o.speed || 1), g: o.gravity ?? 8, sway: rnd(0.8, 2.2), life: 3.4, size: rnd(0.8, 1.3) * (o.size || 1), rot: rnd(0, TAU), vr: rnd(-2, 2), color: colorOf(o, kind), seed: Math.random() * 7 });
  }
  function rise(kind, n = 6, o = {}, ctx) {   // 从脚下往上飘（烟、火星、气泡）
    const p = at({ at: o.at || "feet", ...o }, ctx), g = getGeom();
    for (let i = 0; i < n; i++) parts.push({ kind, delay: (o.stagger ?? 0.06) * i, x: p.x + rnd(-1, 1) * (o.spread ?? g.R * 0.5), y: p.y, vx: rnd(-10, 10), vy: -rnd(30, 70) * (o.speed || 1), g: o.gravity ?? -10, life: rnd(0.9, 1.6) * (o.life || 1), size: rnd(0.8, 1.4) * (o.size || 1), rot: 0, vr: rnd(-1, 1), color: colorOf(o, kind), seed: Math.random() * 7, grow: o.grow ?? (kind === "smoke" ? 1 : 0) });
  }
  const layer = (type, o, ctx) => { const p = at({ at: o.at || (type === "ring" || type === "magic" ? "feet" : type === "glow" ? "chest" : "head"), ...o }, ctx); layers.push({ type, t: 0, ...o, x: p.x, y: p.y }); };
  const ring = (o = {}, ctx) => layer("ring", { dur: 0.7, color: "#F2C46B", width: 3, r0: 6, r1: 90, ...o }, ctx);
  const glow = (o = {}, ctx) => layer("glow", { dur: 1.2, color: "#FFD27F", r: 60, ...o }, ctx);
  const lines = (o = {}, ctx) => layer("lines", { dur: 0.9, color: "#33303A", n: 14, len: 46, ...o }, ctx);
  const cloud = (o = {}, ctx) => layer("cloud", { dur: 2.2, color: "#9A94A6", rain: true, at: "above", ...o }, ctx);
  const flash = (o = {}) => layers.push({ type: "flash", t: 0, dur: 0.25, color: "#FFFFFF", alpha: 0.55, ...o });
  const bolt = (o = {}, ctx) => layer("bolt", { dur: 0.4, color: "#FFF7B0", glow: "#7FD0FF", ...o }, ctx);
  const magic = (o = {}, ctx) => layer("magic", { dur: 1.6, color: "#B48CFF", r: 70, ...o }, ctx);
  const text = (str, o = {}, ctx) => layer("text", { dur: 1.4, str, color: "#33303A", size: 22, rise: 30, ...o }, ctx);
  const web = (o = {}, ctx) => layer("web", { dur: 1.2, color: "#F4F4F4", ...o }, ctx);
  const shake = (o = {}) => layers.push({ type: "shake", t: 0, dur: 0.45, amp: 5, ...o });
  const hud = (o = {}, ctx) => layer("hud", { dur: 1.8, color: "#7FD0FF", r: 60, ...o }, ctx);
  const clone = (o = {}, ctx) => layer("clone", { dur: 1.4, color: "#3DDC84", ...o }, ctx);

  function tick(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt + (p.sway ? Math.sin((p.life * 3 + p.seed) * p.sway) * 18 * dt : 0); p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.grow) p.size += dt * 1.2;
    }
    for (let i = layers.length - 1; i >= 0; i--) { const l = layers[i]; l.t += dt; if (l.t >= l.dur) layers.splice(i, 1); }
  }
  // 当前需要的画布抖动量
  function shakeOffset() { const s = layers.find(l => l.type === "shake"); if (!s) return { x: 0, y: 0 }; const k = 1 - s.t / s.dur; return { x: Math.sin(s.t * 70) * s.amp * k, y: Math.cos(s.t * 55) * s.amp * 0.6 * k }; }

  function drawLayers(ctx, below) {
    for (const l of layers) {
      const k = l.t / l.dur, fadeOut = 1 - k;
      if (l.type === "shake") continue;
      const isBelow = l.type === "ring" || l.type === "magic" || l.type === "glow" || l.type === "clone";
      if (isBelow !== below) continue;
      ctx.save();
      if (l.type === "ring") { const r = l.r0 + (l.r1 - l.r0) * (1 - Math.pow(1 - k, 2)); ctx.globalAlpha = fadeOut * 0.9; ctx.strokeStyle = l.color; ctx.lineWidth = l.width * (1 - k * 0.5); ctx.beginPath(); ctx.ellipse(l.x, l.y, r, r * 0.32, 0, 0, TAU); ctx.stroke(); }
      else if (l.type === "glow") { const a = Math.sin(k * Math.PI) * 0.8; const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r); gr.addColorStop(0, l.color); gr.addColorStop(1, "rgba(255,255,255,0)"); ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill(); }
      else if (l.type === "lines") { ctx.globalAlpha = fadeOut; ctx.strokeStyle = l.color; ctx.lineWidth = 2.2; ctx.lineCap = "round"; for (let i = 0; i < l.n; i++) { const a = i / l.n * TAU + 0.3; const r0 = 22 + k * 30, r1 = r0 + l.len * (0.5 + 0.5 * Math.sin(i * 1.7)) * (1 - k * 0.4); ctx.beginPath(); ctx.moveTo(l.x + Math.cos(a) * r0, l.y + Math.sin(a) * r0 * 0.8); ctx.lineTo(l.x + Math.cos(a) * r1, l.y + Math.sin(a) * r1 * 0.8); ctx.stroke(); } }
      else if (l.type === "cloud") { const a = Math.min(1, l.t * 4, fadeOut * 3); ctx.globalAlpha = a; const wob = Math.sin(l.t * 3) * 2; ctx.fillStyle = l.color; for (const [dx, dy, r] of [[-14, 2, 10], [0, -4, 13], [14, 2, 10], [0, 4, 9]]) { ctx.beginPath(); ctx.arc(l.x + dx + wob, l.y + dy, r, 0, TAU); ctx.fill(); } if (l.rain) { ctx.strokeStyle = "#7FB3E6"; ctx.lineWidth = 1.6; for (let i = 0; i < 5; i++) { const ph = (l.t * 2.2 + i * 0.37) % 1; const x = l.x - 16 + i * 8 + wob, y = l.y + 12 + ph * 26; ctx.globalAlpha = a * (1 - ph); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1.5, y + 6); ctx.stroke(); } } }
      else if (l.type === "flash") { ctx.globalAlpha = l.alpha * fadeOut; ctx.fillStyle = l.color; ctx.fillRect(-50, -50, 5000, 5000); }
      else if (l.type === "bolt") { const g = getGeom(); const x0 = l.x, y0 = l.y1 ?? -10, y1 = l.y2 ?? l.y; ctx.globalAlpha = fadeOut; ctx.lineJoin = "round"; for (const [w, c] of [[9, l.glow], [3, l.color]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.globalAlpha = fadeOut * (w > 5 ? 0.35 : 1); ctx.beginPath(); ctx.moveTo(x0, y0); const n = 7; for (let i = 1; i <= n; i++) { const yy = y0 + (y1 - y0) * i / n; const jit = i === n ? 0 : Math.sin(i * 9.1 + Math.floor(l.t * 30) * 3.7) * g.R * 0.35; ctx.lineTo(x0 + jit, yy); } ctx.stroke(); } }
      else if (l.type === "magic") { const a = Math.min(1, l.t * 3, fadeOut * 2.5); ctx.globalAlpha = a; ctx.strokeStyle = l.color; ctx.lineWidth = 2; const r = l.r, ry = r * 0.32; ctx.translate(l.x, l.y); for (const [rr, dir] of [[r, 1], [r * 0.72, -1]]) { ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.32, 0, 0, TAU); ctx.stroke(); for (let i = 0; i < 12; i++) { const ang = i / 12 * TAU + l.t * 1.4 * dir; ctx.beginPath(); ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr * 0.32, i % 3 === 0 ? 2.6 : 1.4, 0, TAU); ctx.fillStyle = l.color; ctx.fill(); } } ctx.beginPath(); for (let i = 0; i < 3; i++) { const ang = i / 3 * TAU + l.t * 0.9; const px = Math.cos(ang) * r * 0.86, py = Math.sin(ang) * ry * 0.86; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); }
      else if (l.type === "text") { const a = Math.min(1, l.t * 6, fadeOut * 3); ctx.globalAlpha = a; ctx.fillStyle = l.color; ctx.font = `700 ${l.size}px -apple-system, "PingFang SC", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const pop = l.t < 0.2 ? 0.7 + 0.3 * (l.t / 0.2) : 1; ctx.translate(l.x, l.y - l.t * l.rise); ctx.scale(pop, pop); ctx.fillText(l.str, 0, 0); }
      else if (l.type === "web") { const a = Math.min(1, l.t * 8) * fadeOut; ctx.globalAlpha = a; ctx.strokeStyle = l.color; ctx.lineWidth = 1.6; const tx = l.tx ?? l.x + 120, ty = l.ty ?? l.y - 120; const reach = Math.min(1, l.t * 5); const ex = l.x + (tx - l.x) * reach, ey = l.y + (ty - l.y) * reach; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(ex, ey); ctx.stroke(); if (reach >= 1) { ctx.translate(tx, ty); for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * 14, Math.sin(ang) * 14); ctx.stroke(); } for (const rr of [5, 10]) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const ang = i / 8 * TAU; const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } } }
      else if (l.type === "hud") { const a = Math.min(1, l.t * 3) * Math.min(1, fadeOut * 3); ctx.globalAlpha = a * 0.9; ctx.strokeStyle = l.color; ctx.lineWidth = 1.5; ctx.translate(l.x, l.y); for (const [rr, dir, dash] of [[l.r, 1, [14, 8]], [l.r * 0.8, -1.4, [4, 6]], [l.r * 1.15, 0.6, [30, 40]]]) { ctx.save(); ctx.rotate(l.t * dir); ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke(); ctx.restore(); } for (let i = 0; i < 4; i++) { const ang = i / 4 * TAU + l.t * 0.8; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * l.r * 0.9, Math.sin(ang) * l.r * 0.9); ctx.lineTo(Math.cos(ang) * l.r * 1.05, Math.sin(ang) * l.r * 1.05); ctx.stroke(); } }
      else if (l.type === "clone") { /* 由皮肤自己画分身，这里只留时间轴 */ }
      ctx.restore();
    }
  }
  function drawParts(ctx) {
    for (const p of parts) {
      if (p.delay > 0) continue;
      const a = Math.min(1, p.life * 1.6);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
      const s = p.size;
      switch (p.kind) {
        case "heart": { const r = 5 * s; ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.7, -r * 1.3, 0, -r * 0.4); ctx.bezierCurveTo(r * 0.7, -r * 1.3, r * 1.6, -r * 0.2, 0, r * 0.9); ctx.fill(); break; }
        case "star": { const r = 5.5 * s; ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const ang = -Math.PI / 2 + i / 10 * TAU; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.closePath(); ctx.fill(); break; }
        case "sparkle": case "ice": { const r = 6 * s * (0.7 + 0.3 * Math.sin(p.life * 12 + p.seed)); ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.28 : r; const ang = i / 8 * TAU; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.closePath(); ctx.fill(); ctx.globalAlpha = a * 0.35; ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, TAU); ctx.fill(); break; }
        case "petal": { ctx.beginPath(); ctx.ellipse(0, 0, 5.5 * s, 3.2 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = a * 0.5; ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.ellipse(-1.5 * s, -0.8 * s, 2 * s, 1.1 * s, 0, 0, TAU); ctx.fill(); break; }
        case "snow": { const r = 3.6 * s; ctx.lineWidth = 1.2; for (let i = 0; i < 3; i++) { const ang = i / 3 * Math.PI; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r); ctx.lineTo(-Math.cos(ang) * r, -Math.sin(ang) * r); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, TAU); ctx.fill(); break; }
        case "confetti": { ctx.fillRect(-3.5 * s, -1.6 * s, 7 * s, 3.2 * s); break; }
        case "note": case "zzz": { ctx.font = `${(p.kind === "zzz" ? 13 : 15) * s}px -apple-system, "PingFang SC", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.kind === "zzz" ? "z" : "♪", 0, 0); break; }
        case "bone": { ctx.lineWidth = 3.2 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-5 * s, 0); ctx.lineTo(5 * s, 0); ctx.stroke(); for (const sx of [-5, 5]) for (const sy of [-1.8, 1.8]) { ctx.beginPath(); ctx.arc(sx * s, sy * s, 2.2 * s, 0, TAU); ctx.fill(); } break; }
        case "paw": { ctx.beginPath(); ctx.ellipse(0, 1.5 * s, 3.6 * s, 3 * s, 0, 0, TAU); ctx.fill(); for (const [dx, dy] of [[-3.4, -2.6], [-1.1, -4], [1.4, -4], [3.6, -2.4]]) { ctx.beginPath(); ctx.arc(dx * s, dy * s, 1.3 * s, 0, TAU); ctx.fill(); } break; }
        case "sweat": { const r = 4 * s; ctx.beginPath(); ctx.moveTo(0, -r * 1.4); ctx.quadraticCurveTo(r, 0, 0, r); ctx.quadraticCurveTo(-r, 0, 0, -r * 1.4); ctx.fill(); ctx.globalAlpha = a * 0.6; ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(-r * 0.3, 0, r * 0.25, 0, TAU); ctx.fill(); break; }
        case "smoke": { ctx.globalAlpha = a * 0.55; ctx.beginPath(); ctx.arc(0, 0, 7 * s, 0, TAU); ctx.fill(); break; }
        case "coin": { ctx.beginPath(); ctx.arc(0, 0, 4.5 * s, 0, TAU); ctx.fill(); ctx.strokeStyle = "#B8862B"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 2.6 * s, 0, TAU); ctx.stroke(); break; }
        case "spark": { ctx.lineWidth = 1.8 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-4 * s, 0); ctx.lineTo(4 * s, 0); ctx.stroke(); break; }
        case "ember": { ctx.globalAlpha = a * 0.9; ctx.beginPath(); ctx.arc(0, 0, 2.6 * s, 0, TAU); ctx.fill(); break; }
        case "bubble": { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 4 * s, 0, TAU); ctx.stroke(); break; }
        case "leaf": { ctx.beginPath(); ctx.ellipse(0, 0, 6 * s, 2.6 * s, 0.6, 0, TAU); ctx.fill(); break; }
        case "wisp": { ctx.globalAlpha = a * 0.8; ctx.beginPath(); ctx.ellipse(0, 0, 5 * s, 2.4 * s, p.rot * 2, 0, TAU); ctx.fill(); ctx.globalAlpha = a * 0.3; ctx.beginPath(); ctx.arc(0, 0, 7 * s, 0, TAU); ctx.fill(); break; }
        default: { ctx.beginPath(); ctx.arc(0, 0, 2.2 * s, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    }
  }
  function clear() { parts.length = 0; layers.length = 0; }
  const ops = { burst, shower, rise, ring, glow, lines, cloud, flash, bolt, magic, text, web, shake, hud, clone };
  // 让配置表能写 ["burst","petal",20,{...}] 这种
  function run(list, ctx) { for (const [op, ...args] of list || []) { const f = ops[op]; if (!f) continue; if (op === "burst" || op === "shower" || op === "rise") f(args[0], args[1], args[2] || {}, ctx); else if (op === "text") f(args[0], args[1] || {}, ctx); else f(args[0] || {}, ctx); } }
  return { ...ops, run, tick, drawLayers, drawParts, shakeOffset, clear, parts, layers };
}
