import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";

// names.js / tapTables.js 里还没有 capsule 这一条，所以名字、口气、点击反应先在这儿兜底；
// 以后表里补上了，withTaps 的结果会盖掉同名字段（orb.js 也是这么写的）。
const FALLBACK = {
  name: "罐罐",
  style: "勤快的小助理腔，短句，爱说「收到」「马上办」；办不到就老实承认，偶尔憨一下。",
  voice: { id: "Chinese (Mandarin)_Straightforward_Boy", speed: 1.04, pitch: 1 },
  tapLines: ["收到，马上办", "我在，随时听候", "雷达转着呢，放心", "这个我会，真的", "别戳啦，会转晕", "有事就叫我一声"],
  manyLine: "一个一个来，忙不过来啦",
  taps: [
    { // 立正接令：先缩一下，弹起来把手举高，头顶亮一圈，回一句「收到」
      actions: [
        { squash: 0.75, fx: [["ring", { at: "chest", color: "#5BEAF5", width: 3, r0: 8, r1: 56, dur: 0.5 }]] },
        { delay: 150, hop: 1, mood: "happy", fx: [["burst", "spark", 3, { at: "head", colors: ["#7FF0FF", "#FFFFFF"], speed: 60, lift: 30, gravity: 90, size: 0.8 }]] },
        { delay: 220, fx: [["text", "收到", { at: "headR", color: "#39C6D8", size: 18, dur: 0.9, rise: 24 }]] }
      ]
    },
    { // 雷达转起来找活干：抬头往右上扫一圈，扫完亮一下表示找到了
      actions: [
        { mood: "thinking", look: [0.6, -0.6], fx: [["hud", { at: "head", color: "#5BEAF5", r: 52, dur: 1 }]] },
        { delay: 340, fx: [["burst", "dot", 3, { at: "headR", colors: ["#5BEAF5"], speed: 40, lift: 28, size: 0.7 }]] },
        { delay: 380, mood: "happy", look: [0, 0], squash: 0.6, fx: [["glow", { at: "head", color: "#7FF0FF", r: 44, dur: 0.6 }]] }
      ]
    },
    { // 点头点太用力：整只晃两下差点栽倒，冒两滴汗，赶紧扶稳
      actions: [
        { squash: 1.1, fx: [["shake", { amp: 3, dur: 0.35 }], ["burst", "dot", 4, { at: "feet", colors: ["#C9D1E0", "#8C94A6"], speed: 60, lift: 8, gravity: 150, size: 0.8 }]] },
        { delay: 260, mood: "thinking", look: [-0.5, 0.2], fx: [["burst", "sweat", 2, { at: "headR", speed: 50, lift: 30, size: 0.85 }]] },
        { delay: 360, mood: "happy", look: [0, 0], squash: 0.5, fx: [["ring", { at: "feet", color: "#8C94A6", width: 2, r0: 10, r1: 60, dur: 0.5 }]] }
      ]
    },
    { // 转个身就去干活：脚下擦出火星，蹦回来邀功
      actions: [
        { spin: 1, fx: [["burst", "spark", 3, { at: "feet", colors: ["#7FF0FF", "#FFFFFF"], speed: 55, lift: 10, gravity: 140, size: 0.75 }]] },
        { delay: 320, hop: 1, mood: "happy", fx: [["burst", "star", 2, { at: "above", colors: ["#FFE8A8", "#FFFFFF"], speed: 40, lift: 25, size: 0.8 }]] },
        { delay: 280, fx: [["text", "办好了", { at: "headL", color: "#39C6D8", size: 17, dur: 0.9, rise: 22 }]] }
      ]
    }
  ],
  // 任务堆爆了：面罩闪一下、火花乱窜，冒白烟弹出「排队中」，垂下头缓一拍，重新亮灯站好
  manyTap: {
    actions: [
      { fx: [["flash", { color: "#DFF6FF", alpha: 0.16, dur: 0.18 }], ["burst", "spark", 8, { at: "head", colors: ["#7FF0FF", "#FFFFFF"], speed: 120, lift: 40, spread: 14 }], ["shake", { amp: 4, dur: 0.45 }]] },
      { delay: 220, mood: "thinking", fx: [["burst", "smoke", 4, { at: "above", colors: ["#C9D1E0", "#8C94A6"], speed: 35, lift: 25, gravity: -30, size: 0.95, stagger: 0.06 }], ["text", "排队中", { at: "headL", color: "#39C6D8", size: 18, dur: 1 }]] },
      { delay: 420, squash: 0.9, look: [0, 0.5], fx: [["burst", "dot", 5, { at: "chest", colors: ["#8C94A6"], speed: 45, lift: 10, gravity: 160, size: 0.8 }]] },
      { delay: 400, hop: 1, mood: "idle", look: [0, 0], fx: [["hud", { at: "chest", color: "#5BEAF5", r: 54, dur: 1 }], ["glow", { at: "head", color: "#7FF0FF", r: 42, dur: 0.8 }]] }
    ]
  }
};
const DEF = { ...FALLBACK, ...withTaps(SKIN_DEFAULTS.capsule, "capsule") };

const TURN = Math.PI * 2;
const CYAN = "#5BEAF5", LIT = "#7FF0FF", DIM = "#39C6D8";

// 胶囊：立着的白胶囊小助理。腰上一圈深色的带子，上半身嵌一块黑面罩，
// 面罩里两只发青光的眼睛；头顶一片会转的雷达；两只不连手臂的悬浮小圆手跟着身体晃。
export const makeCapsule = makeVectorSkin({
  ...DEF, character: DEF,
  rK: 0.2, iconK: 0.3, baseYK: 0.6, headK: 0.65, hit: [1.1, 1.22, 0.02],

  // 心情做成平滑值，切换时不会跳；雷达角度、面罩涟漪也在这儿推进
  tick(S, dt, g, { spawn }) {
    const E = S.extra;
    if (!E.ready) { E.ready = 1; E.sleepK = 0; E.happyK = 0; E.thinkK = 0; E.radar = 0; E.petPrev = 0; E.ripples = []; }
    const to = (a, b, k) => a + (b - a) * Math.min(1, dt * k);
    E.sleepK = to(E.sleepK, S.mood === "sleepy" ? 1 : 0, 4);
    E.happyK = to(E.happyK, (S.mood === "happy" || S.pet.amt > 0.15) ? 1 : 0, 6);
    E.thinkK = to(E.thinkK, S.mood === "thinking" ? 1 : 0, 4);
    // 想事情转得快，困了几乎不转（最慢也有 0.25 rad/s，不会倒着转）
    E.radar += dt * (1.1 + E.thinkK * 6.5 + E.happyK * 1.8 + (S.carried ? 3 : 0) - E.sleepK * 0.85);
    // 转满一圈就归零：角度不会一直累加下去，转过一圈时想事情就冒个点
    if (E.radar >= TURN) { E.radar -= TURN; if (S.mood === "thinking") spawn("dot", 1, g.cx + g.R * 0.3, g.cy - g.R * 1.2); }
    // 被摸一下，就在面罩上开一圈涟漪；位置存成"几个 R"，换窗口大小也不会跑偏
    if (S.pet.amt > E.petPrev + 0.05 && E.ripples.length < 4) E.ripples.push({ u: (S.pet.x - g.cx) / g.R, v: (S.pet.y - g.cy) / g.R, t: 0 });
    E.petPrev = S.pet.amt;
    if (E.ripples.length) { for (const r of E.ripples) r.t += dt; E.ripples = E.ripples.filter(r => r.t < 0.85); }
  },

  draw(ctx, g, S, face, X) {
    const { R, cx, cy } = g; const { TAU, closed, yawn, stretch } = X;
    const E = S.extra, sleepK = E.sleepK || 0, thinkK = E.thinkK || 0, happyK = E.happyK || 0;
    const bounce = happyK * Math.abs(Math.sin(S.t * 7)) * R * 0.09;          // 开心时上下弹
    const base = cy + R;                                                      // 脚底那条线
    const bw = R * 1.32, bh = R * 2 * (1 - sleepK * 0.15) * (1 + stretch * 0.06);
    const bx = cx - bw / 2, by = base - bh;

    // 地上的影子：在空中就缩小变淡
    const air = Math.max(0, g.baseY - cy + bounce), sk = 1 - Math.min(0.45, air / R * 0.5);
    ctx.save(); ctx.globalAlpha = 0.22 * sk; ctx.fillStyle = "#1B2236";
    ctx.beginPath(); ctx.ellipse(cx, g.baseY + R * 1.02, R * 0.6 * sk, R * 0.11 * sk, 0, 0, TAU); ctx.fill(); ctx.restore();

    // 整体：待机轻轻左右摇，落地压扁，困了往下缩一截
    ctx.save();
    ctx.translate(cx, base);
    ctx.rotate(S.tilt + S.jiggle * 0.03 + S.look.x * 0.02 + Math.sin(S.t * 1.4) * 0.045 * (1 - sleepK));
    ctx.scale(S.squash * (1 + sleepK * 0.09 - stretch * 0.03), 1 / S.squash);
    ctx.translate(-cx, -base - bounce);

    // ---- 头顶的小雷达（先画，根部会被身体盖住）----
    const mastTop = by - R * 0.22, ra = E.radar || 0, rc = Math.cos(ra);
    ctx.strokeStyle = "#7F8A9E"; ctx.lineWidth = Math.max(1.6, R * 0.055); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, by + R * 0.08); ctx.lineTo(cx, mastTop); ctx.stroke();
    ctx.save(); ctx.translate(cx, mastTop - R * 0.01); ctx.rotate(Math.sin(ra) * 0.3);
    const blade = R * 0.2 * Math.abs(rc) + R * 0.05;                          // 转到正面时最宽，转到侧面收成一条
    const bg = ctx.createLinearGradient(-blade, 0, blade, 0);
    bg.addColorStop(0, rc > 0 ? "#79849A" : "#DDE4EF"); bg.addColorStop(1, rc > 0 ? "#DDE4EF" : "#79849A");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, blade, R * 0.09, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(48,58,80,0.5)"; ctx.lineWidth = Math.max(1, R * 0.02); ctx.stroke();
    ctx.shadowColor = CYAN; ctx.shadowBlur = 7 + thinkK * 9;                  // 片尖上的信号灯
    ctx.fillStyle = LIT; ctx.beginPath(); ctx.arc(rc * blade * 0.92, Math.sin(ra) * R * 0.03, R * 0.035, 0, TAU); ctx.fill();
    ctx.restore();

    // ---- 胶囊身体：上下半圆 + 中间直筒 ----
    const capsule = () => { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bw / 2); };
    ctx.save();
    ctx.shadowColor = "rgba(18,24,42,0.35)"; ctx.shadowBlur = R * 0.22; ctx.shadowOffsetY = R * 0.05;
    const body = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    body.addColorStop(0, "#FFFFFF"); body.addColorStop(0.55, "#F1F4F9"); body.addColorStop(1, "#C7CFDE");
    ctx.fillStyle = body; capsule(); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "rgba(58,70,94,0.45)"; ctx.lineWidth = Math.max(1, R * 0.028); capsule(); ctx.stroke();

    // 壳上的细节都夹在胶囊里画
    ctx.save(); capsule(); ctx.clip();
    const sheen = ctx.createLinearGradient(bx, 0, bx + bw * 0.45, 0);
    sheen.addColorStop(0, "rgba(255,255,255,0)"); sheen.addColorStop(0.5, "rgba(255,255,255,0.95)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen; ctx.fillRect(bx + bw * 0.08, by + bh * 0.05, bw * 0.34, bh * 0.9);
    const foot = ctx.createLinearGradient(0, base - bh * 0.18, 0, base);
    foot.addColorStop(0, "rgba(88,100,126,0)"); foot.addColorStop(1, "rgba(88,100,126,0.38)");
    ctx.fillStyle = foot; ctx.fillRect(bx, base - bh * 0.18, bw, bh * 0.18);
    // 腰带：上下沿顺着筒身往下弯，看着像一圈套在身上
    const bt = by + bh * 0.56, bbh = bh * 0.16, sag = bh * 0.04;
    const belt = ctx.createLinearGradient(0, bt, 0, bt + bbh);
    belt.addColorStop(0, "#4A5266"); belt.addColorStop(0.45, "#262C3B"); belt.addColorStop(1, "#3E4557");
    ctx.fillStyle = belt; ctx.beginPath();
    ctx.moveTo(bx - 1, bt); ctx.quadraticCurveTo(cx, bt + sag, bx + bw + 1, bt);
    ctx.lineTo(bx + bw + 1, bt + bbh); ctx.quadraticCurveTo(cx, bt + bbh + sag, bx - 1, bt + bbh);
    ctx.closePath(); ctx.fill(); ctx.restore();
    // 腰带上的小灯：说话时跟着声音闪，平时慢慢呼吸
    const talk = S.talking || S.mouthLevel > 0.05;
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, Math.min(1, (talk ? 0.5 + S.mouthLevel * 0.5 : 0.4 + 0.3 * Math.sin(S.t * 1.8) + happyK * 0.3) * (1 - sleepK * 0.6)));
    ctx.shadowColor = CYAN; ctx.shadowBlur = 8; ctx.fillStyle = LIT;
    ctx.beginPath(); ctx.arc(cx, bt + bbh * 0.5 + sag * 0.8, R * 0.045, 0, TAU); ctx.fill(); ctx.restore();

    // ---- 面罩：上半身一块黑色弧形玻璃 ----
    const vw = bw * 0.84, vh = bh * 0.36, vx = cx - vw / 2, vy = by + bh * 0.11;
    const visor = () => {
      ctx.beginPath();
      ctx.moveTo(vx, vy + vh * 0.42);
      ctx.quadraticCurveTo(vx, vy, cx, vy);
      ctx.quadraticCurveTo(vx + vw, vy, vx + vw, vy + vh * 0.42);
      ctx.quadraticCurveTo(vx + vw, vy + vh, cx, vy + vh);
      ctx.quadraticCurveTo(vx, vy + vh, vx, vy + vh * 0.42);
      ctx.closePath();
    };
    const vg = ctx.createLinearGradient(0, vy, 0, vy + vh);
    vg.addColorStop(0, "#232B3D"); vg.addColorStop(0.5, "#121724"); vg.addColorStop(1, "#0A0E18");
    ctx.fillStyle = vg; visor(); ctx.fill();
    ctx.strokeStyle = "rgba(122,136,164,0.4)"; ctx.lineWidth = Math.max(1, R * 0.02); ctx.stroke();

    ctx.save(); visor(); ctx.clip();
    ctx.globalAlpha = 0.1; ctx.fillStyle = "#FFFFFF";                          // 玻璃反光
    ctx.beginPath(); ctx.ellipse(cx - vw * 0.22, vy + vh * 0.18, vw * 0.34, vh * 0.2, -0.25, 0, TAU); ctx.fill();
    if (thinkK > 0.02) {                                                       // 想事情：一条扫描线上下走
      const sy = vy + ((S.t * 0.55) % 1) * vh;
      ctx.globalAlpha = 0.2 * thinkK; ctx.strokeStyle = LIT; ctx.lineWidth = Math.max(1, R * 0.02);
      ctx.beginPath(); ctx.moveTo(vx, sy); ctx.lineTo(vx + vw, sy); ctx.stroke();
    }
    for (const rp of E.ripples || []) {                                        // 被摸：面罩上一圈圈涟漪
      const k = rp.t / 0.85, rr = R * 0.06 + k * R * 0.9;
      ctx.globalAlpha = (1 - k) * 0.75; ctx.strokeStyle = LIT; ctx.lineWidth = Math.max(1, R * 0.045 * (1 - k));
      const px = Math.max(vx + vw * 0.15, Math.min(vx + vw * 0.85, cx + rp.u * R));
      const py = Math.max(vy, Math.min(vy + vh, cy + rp.v * R));
      ctx.beginPath(); ctx.ellipse(px, py, rr, rr * 0.8, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();

    // ---- 眼睛：两块青光圆角矩形；眨眼变一条线，困了变两条短线，开心变上弯的月牙 ----
    const cl = Math.max(closed, yawn > 0.3 ? Math.min(1, (yawn - 0.3) * 2.5) : 0);
    const lx = S.look.x * R * 0.09, ly = S.look.y * R * 0.05;
    const ew = R * 0.3 * (1 - sleepK * 0.42), eh = R * 0.155, ey = vy + vh * 0.44 + ly;
    ctx.save(); ctx.shadowColor = "#37E4F0"; ctx.shadowBlur = 9 + S.pet.amt * 10 + happyK * 6;
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * R * 0.29 + lx;
      if (happyK > 0.5 && cl < 0.6) {
        ctx.strokeStyle = "#6EEFF7"; ctx.lineWidth = Math.max(1.6, R * 0.055); ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(ex, ey + R * 0.06, ew * 0.55, Math.PI * 1.14, Math.PI * 1.86); ctx.stroke();
      } else {
        const hh = Math.max(R * 0.024, eh * (1 - cl) * (1 - sleepK * 0.8));
        ctx.fillStyle = CYAN; ctx.beginPath(); ctx.roundRect(ex - ew / 2, ey - hh / 2, ew, hh, Math.min(hh / 2, R * 0.07)); ctx.fill();
        if (hh > R * 0.06) { ctx.fillStyle = "rgba(228,255,255,0.85)"; ctx.beginPath(); ctx.roundRect(ex - ew * 0.34, ey - hh * 0.3, ew * 0.3, hh * 0.26, hh * 0.12); ctx.fill(); }
      }
    }
    // ---- 嘴：面罩下沿的一小条光。说话是波形，想事情是三个点，困了一条暗线 ----
    const my = vy + vh * 0.8, mx = cx + lx;
    ctx.shadowBlur = 6; ctx.strokeStyle = CYAN; ctx.fillStyle = CYAN;
    ctx.lineWidth = Math.max(1.4, R * 0.032); ctx.lineCap = "round";
    if (talk) {
      const n = 8; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const x = mx - R * 0.2 + (i / n) * R * 0.4, y = my + Math.sin(S.t * 28 + i * 1.7) * R * (0.02 + S.mouthLevel * 0.09); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    } else if (yawn > 0.25) { ctx.beginPath(); ctx.ellipse(mx, my, R * 0.05 + yawn * R * 0.03, R * 0.03 + yawn * R * 0.06, 0, 0, TAU); ctx.fill(); }
    else if (thinkK > 0.5) { for (let i = -1; i <= 1; i++) { ctx.globalAlpha = Math.sin(S.t * 5 - i) > 0.3 ? 1 : 0.35; ctx.beginPath(); ctx.arc(mx + i * R * 0.09, my, R * 0.028, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    else if (sleepK > 0.5) { ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(mx - R * 0.05, my); ctx.lineTo(mx + R * 0.05, my); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (happyK > 0.4) { ctx.beginPath(); ctx.moveTo(mx - R * 0.11, my - R * 0.02); ctx.quadraticCurveTo(mx, my + R * 0.06, mx + R * 0.11, my - R * 0.02); ctx.stroke(); }
    else { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(mx - R * 0.08, my); ctx.lineTo(mx + R * 0.08, my); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();

    // ---- 两只悬浮小圆手：不连手臂，比身体慢半拍地晃 ----
    const hr = R * 0.17, restY = base - bh * 0.42;
    for (const sgn of [-1, 1]) {
      const ph = S.t * 1.5 + (sgn > 0 ? 0.9 : 0);
      let hx = cx + sgn * (bw * 0.5 + R * 0.26 + Math.sin(ph) * R * 0.03);
      let hy = restY + Math.sin(ph * 1.1) * R * 0.06 + sleepK * R * 0.22 - stretch * R * 0.25;
      hx += sgn * happyK * R * 0.16;                                            // 开心：两只手举起来挥
      hy -= happyK * (R * 0.72 + Math.sin(S.t * 9 + sgn) * R * 0.08);
      if (thinkK > 0.01 && sgn < 0) {                                           // 想事情：一只手托着"下巴"
        hx += (cx - R * 0.32 - hx) * thinkK; hy += (vy + vh + R * 0.12 - hy) * thinkK;
      }
      if (S.carried) hy += Math.sin(S.t * 9 + sgn * 1.6) * R * 0.1;
      ctx.save(); ctx.shadowColor = "rgba(18,24,42,0.3)"; ctx.shadowBlur = R * 0.14; ctx.shadowOffsetY = R * 0.03;
      const hg = ctx.createRadialGradient(hx - hr * 0.35, hy - hr * 0.4, hr * 0.15, hx, hy, hr * 1.15);
      hg.addColorStop(0, "#FFFFFF"); hg.addColorStop(0.55, "#E4E9F2"); hg.addColorStop(1, "#A3AFC4");
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = "rgba(52,64,88,0.55)"; ctx.lineWidth = Math.max(1, R * 0.028);
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.stroke();
    }
    ctx.restore();

    // 看书：摊在两只小手中间，不要盖到腰带
    if (S.mood === "reading") face.book(cx, cy + R * 0.22, R, "#F4F7FF", "#8A94A8");
    face.parts({ heart: "#FF7BAC", z: "#8A94A8", dot: CYAN, note: CYAN, bubble: "rgba(127,240,255,0.7)" });
  }
});
