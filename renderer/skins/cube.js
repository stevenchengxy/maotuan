import { makeVectorSkin } from "./vectorBase.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";
const DEF = withTaps(SKIN_DEFAULTS.cube, "cube");

// 方方：等距视角的小立方体机器人。三个平行四边形拼出来（顶面亮、正面中、侧面暗），
// 正面就是它的脸；绕竖轴慢慢摆（侧面宽度周期变化 = 假 3D 的"转一点又转回来"），顶面上浮着一颗天线球。
const INK = "#16324F";   // 眼睛和嘴
const EDGE = "#3E6A96";  // 棱边描边（深浅桌面都吃得住）
const CYAN = "#5FD8FF";  // 科技蓝的高光
const SPIN_DUR = 1.15;   // 转满一圈用多久

export const makeCube = makeVectorSkin({
  ...DEF, character: DEF,
  rK: 0.2, baseYK: 0.6, headK: 0.62, hit: [1.25, 1.15, 0.1],

  // 自己管三件事：开心时转整圈、困了塌成扁盒子、被摸时先压扁
  tick(S, dt) {
    const E = S.extra;
    if (E.ready === undefined) { E.ready = 1; E.spinT = 0; E.flat = 0; E.q = 0; E.wasHappy = false; E.lastBeh = null; E.lastPet = 0; }
    // 开心 / 被叫去转圈：绕竖轴走完一个完整周期
    const isHappy = S.mood === "happy";
    if (isHappy && !E.wasHappy) E.spinT = SPIN_DUR;
    E.wasHappy = isHappy;
    if (S.beh !== E.lastBeh) { if (S.beh && S.beh.type === "wiggle") E.spinT = SPIN_DUR; E.lastBeh = S.beh; }
    if (E.spinT > 0) E.spinT = Math.max(0, E.spinT - dt);
    // 困了：慢慢塌下去；醒过来弹得快一点
    const want = S.mood === "sleepy" ? 1 : 0;
    E.flat += (want - E.flat) * Math.min(1, dt * (want ? 1.6 : 5));
    // 被摸：整块压一下，剩下的交给 vectorBase 的回弹和弹簧
    if (S.pet.amt > E.lastPet + 0.02) S.squash = Math.max(S.squash, 1.2);
    E.lastPet = S.pet.amt;
    // 想事情：头顶问号的亮度
    E.q += ((S.mood === "thinking" ? 1 : 0) - E.q) * Math.min(1, dt * 4);
  },

  draw(ctx, g, S, face, X) {
    const { R, cx, cy } = g;
    const { TAU, happy, closed, yawn, stretch } = X;
    const E = S.extra, flat = E.flat || 0, spinT = E.spinT || 0;

    // ——— 朝向：始终偏着一点（这样三个面都在），再左右小幅摆动、跟着鼠标多转一点；开心时 yaw 走完一整圈。
    // 往左跟得多、往右跟得少，免得正对着你时侧面缩没了，看不出是个立方体。
    let yaw = -0.42 + Math.cos(S.t * 0.5) * 0.18 + S.look.x * (S.look.x < 0 ? 0.26 : 0.14) + S.jiggle * 0.12;
    if (S.carried) yaw += Math.sin(S.t * 6) * 0.1;
    if (spinT > 0) { const p = 1 - spinT / SPIN_DUR; yaw += p * p * (3 - 2 * p) * TAU; }
    const cs = Math.cos(yaw), sn = Math.sin(yaw);

    // ——— 尺寸：squash 压扁、stretch 拉长、flat 是困了以后塌成的扁盒子
    const sq = S.squash;
    const a = R * 0.82 * sq * (1 + flat * 0.1) * (1 - stretch * 0.04);            // 顶面半宽
    const b = a * 0.44;                                                            // 俯视压扁后的半进深
    const halfH = R * 0.7 / sq * (1 - flat * 0.72) * (1 + stretch * 0.14) * (1 + S.jiggle * 0.1);
    const groundY = cy + R * 0.8;          // 底面中心（跟着蹦跳一起走）
    const bodyCY = groundY - halfH;

    // 地上的影子：蹦起来就小一点淡一点
    const lift = Math.min(1, Math.abs(g.hopY) / (R * 0.45));
    ctx.fillStyle = "rgba(20,44,72," + (0.22 - lift * 0.1).toFixed(3) + ")";
    ctx.beginPath(); ctx.ellipse(cx, g.baseY + R * 0.86, a * (1.02 - lift * 0.3), R * 0.13 * (1 - lift * 0.25), 0, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(cx, groundY); ctx.rotate(S.tilt * 0.7); ctx.translate(-cx, -groundY);

    // ——— 八个角投影到屏幕（绕竖轴转 yaw，再按等距压扁）
    const px = (u, v) => cx + (u * cs - v * sn) * a;
    const py = (u, v, dy) => bodyCY + dy - (u * sn + v * cs) * b;
    const CO = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const T = CO.map(c => [px(c[0], c[1]), py(c[0], c[1], -halfH)]);
    const B = CO.map(c => [px(c[0], c[1]), py(c[0], c[1], halfH)]);
    const NORM = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // 0 号面是脸，2 号是背面
    // 法线朝着我们的那些侧面才画（同时也就决定了侧面的宽度怎么变）
    const vis = [];
    for (let i = 0; i < 4; i++) if (NORM[i][0] * sn + NORM[i][1] * cs < 0) { const j = (i + 1) % 4; vis.push({ i, q: [T[i], T[j], B[j], B[i]] }); }
    const all = vis.concat([{ i: 4, q: T }]);
    const quad = q => { ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.closePath(); };

    // 一、先把所有棱边用粗深色描一遍（描在下面，填色时只留外面半截）
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(2, R * 0.075);
    ctx.beginPath(); for (const f of all) quad(f.q); ctx.stroke();

    // 二、填面：顶面亮 / 正面中 / 侧面暗 / 背面最暗
    for (const f of all) {
      let y0 = 1e9, y1 = -1e9; for (const p of f.q) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      const gr = ctx.createLinearGradient(0, y0, 0, y1 + 0.01);
      if (f.i === 4) { gr.addColorStop(0, "#FAFDFF"); gr.addColorStop(1, "#CFE6FA"); }
      else if (f.i === 0) { gr.addColorStop(0, "#E6F1FC"); gr.addColorStop(1, "#B3D0E9"); }
      else if (f.i === 2) { gr.addColorStop(0, "#89A8C5"); gr.addColorStop(1, "#6B8BAB"); }
      else { gr.addColorStop(0, "#A6C2DC"); gr.addColorStop(1, "#7F9FBE"); }
      ctx.fillStyle = gr; ctx.beginPath(); quad(f.q); ctx.fill();
    }
    // 三、再补一道细的浅色棱线，边看起来像磨过
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = Math.max(1, R * 0.018);
    ctx.beginPath(); for (const f of all) quad(f.q); ctx.stroke();

    // 顶面上的内嵌方框
    ctx.strokeStyle = "rgba(62,106,150,0.35)"; ctx.lineWidth = Math.max(1, R * 0.014);
    ctx.beginPath();
    ctx.moveTo(px(-0.62, -0.62), py(-0.62, -0.62, -halfH)); ctx.lineTo(px(0.62, -0.62), py(0.62, -0.62, -halfH));
    ctx.lineTo(px(0.62, 0.62), py(0.62, 0.62, -halfH)); ctx.lineTo(px(-0.62, 0.62), py(-0.62, 0.62, -halfH));
    ctx.closePath(); ctx.stroke();

    // 侧面 / 背面的细节：背面是散热格栅，侧面一道接缝加一颗指示灯
    for (const f of vis) {
      const q = f.q;   // [左上, 右上, 右下, 左下]
      if (f.i === 2) {
        ctx.strokeStyle = "rgba(24,52,84,0.42)"; ctx.lineWidth = Math.max(1.2, R * 0.026);
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          const ax = q[0][0] + (q[3][0] - q[0][0]) * t, ay = q[0][1] + (q[3][1] - q[0][1]) * t;
          const bx = q[1][0] + (q[2][0] - q[1][0]) * t, by = q[1][1] + (q[2][1] - q[1][1]) * t;
          ctx.beginPath(); ctx.moveTo(ax + (bx - ax) * 0.2, ay + (by - ay) * 0.2); ctx.lineTo(ax + (bx - ax) * 0.8, ay + (by - ay) * 0.8); ctx.stroke();
        }
      } else if (f.i !== 0) {
        const t = 0.34;
        const tx = q[0][0] + (q[1][0] - q[0][0]) * t, ty = q[0][1] + (q[1][1] - q[0][1]) * t;
        const bx = q[3][0] + (q[2][0] - q[3][0]) * t, by = q[3][1] + (q[2][1] - q[3][1]) * t;
        ctx.strokeStyle = "rgba(24,52,84,0.28)"; ctx.lineWidth = Math.max(1, R * 0.02);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by); ctx.stroke();
        ctx.save(); ctx.shadowColor = CYAN; ctx.shadowBlur = S.mood === "sleepy" ? 2 : 7;
        ctx.fillStyle = S.mood === "sleepy" ? "#5A88A8" : CYAN;
        ctx.beginPath(); ctx.arc(tx + (bx - tx) * 0.62 + (q[1][0] - q[0][0]) * 0.3, ty + (by - ty) * 0.62 + (q[1][1] - q[0][1]) * 0.3, R * 0.028, 0, TAU); ctx.fill(); ctx.restore();
      }
    }

    // ——— 正面就是脸：把坐标系压成正面那块平行四边形（cs 越小脸越窄，转过去就看不见了）
    if (cs > 0.1) {
      ctx.save();
      ctx.translate(cx + sn * a, bodyCY + cs * b);
      ctx.transform(cs, -sn * b / a, 0, 1, 0, 0);   // x 轴跟着面走，y 轴还是竖直的
      const fh = halfH;
      const er = Math.min(R * 0.155, fh * 0.5);
      const eyeY = -fh * 0.14 + S.look.y * Math.min(R * 0.05, fh * 0.14);
      const my = fh * 0.46;
      const lx = S.look.x * R * 0.05;
      const cl = Math.max(closed, yawn > 0.35 ? 1 : 0);   // 眨眼 / 打哈欠时闭上

      // 脸周围一圈浅浅的面板凹槽
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = Math.max(1, R * 0.016);
      ctx.beginPath(); ctx.roundRect(-a * 0.74, -fh * 0.66, a * 1.48, fh * 1.3, Math.min(R * 0.1, fh * 0.4)); ctx.stroke();

      // 两只圆眼睛
      for (const sgn of [-1, 1]) {
        const ex = sgn * a * 0.4 + lx;
        if (cl > 0.82) {                       // 闭着：困了是向下扣的弧，眨眼是向上弯的弧
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.6, er * 0.34); ctx.lineCap = "round";
          ctx.beginPath();
          if (S.mood === "sleepy" || yawn > 0.35) ctx.arc(ex, eyeY - er * 0.3, er * 0.95, Math.PI * 0.12, Math.PI * 0.88);
          else ctx.arc(ex, eyeY + er * 0.55, er * 0.95, Math.PI * 1.12, Math.PI * 1.88);
          ctx.stroke();
        } else if (happy) {                    // 开心：弯成两个小尖角
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.8, er * 0.36); ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(ex - er * 0.85, eyeY + er * 0.4); ctx.quadraticCurveTo(ex, eyeY - er * 0.66, ex + er * 0.85, eyeY + er * 0.4); ctx.stroke();
        } else {                               // 平时：深色圆眼 + 青色瞳环，眨眼时上下压扁
          const eh = er * (1 - cl * 0.9);
          ctx.save(); ctx.shadowColor = "rgba(95,216,255,0.85)"; ctx.shadowBlur = 7 + S.pet.amt * 8;
          ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex, eyeY, er, eh, 0, 0, TAU); ctx.fill(); ctx.restore();
          ctx.strokeStyle = CYAN; ctx.lineWidth = Math.max(1.2, er * 0.2);
          ctx.beginPath(); ctx.ellipse(ex + S.look.x * er * 0.18, eyeY + S.look.y * eh * 0.2, er * 0.46, eh * 0.46, 0, 0, TAU); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.beginPath(); ctx.ellipse(ex - er * 0.36, eyeY - eh * 0.36, er * 0.2, eh * 0.15, -0.3, 0, TAU); ctx.fill();
        }
      }

      // 一张小嘴：说话跟着 mouthLevel 张合，其余按心情换形状
      ctx.lineCap = "round";
      if (yawn > 0.25) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(lx, my, R * 0.055 * yawn + R * 0.018, R * 0.085 * yawn + R * 0.014, 0, 0, TAU); ctx.fill(); }
      else if (S.talking || S.mouthLevel > 0.05) { const o = Math.max(0.12, S.mouthLevel); ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(lx, my, R * (0.055 + o * 0.035), R * (0.016 + o * 0.075), 0, 0, TAU); ctx.fill(); }
      else if (S.mood === "sleepy") { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.6, R * 0.03); ctx.beginPath(); ctx.moveTo(lx - R * 0.05, my); ctx.lineTo(lx + R * 0.05, my); ctx.stroke(); }
      else if (S.mood === "thinking") { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.6, R * 0.03); ctx.beginPath(); ctx.moveTo(lx - R * 0.07, my + R * 0.012); ctx.lineTo(lx + R * 0.04, my - R * 0.022); ctx.stroke(); }
      else { const w = R * (happy ? 0.13 : 0.08), d = R * (happy ? 0.075 : 0.04); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.6, R * 0.032); ctx.beginPath(); ctx.moveTo(lx - w, my - d * 0.4); ctx.quadraticCurveTo(lx, my + d * 1.7, lx + w, my - d * 0.4); ctx.stroke(); }

      // 脸颊上两条状态灯：开心或被摸时亮起来
      const lv = happy ? 1 : Math.min(1, S.pet.amt);
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.globalAlpha = Math.max(0.05, 0.35 + lv * 0.6);
        ctx.shadowColor = CYAN; ctx.shadowBlur = lv > 0.4 ? 8 : 2;
        ctx.fillStyle = lv > 0.4 ? "#8DE8FF" : "#7FA6C4";
        ctx.beginPath(); ctx.roundRect(sgn * a * 0.62 - a * 0.07, my - R * 0.024, a * 0.14, R * 0.042, R * 0.02); ctx.fill(); ctx.restore();
      }
      ctx.restore();
    }

    // ——— 顶面上浮着的天线球（困了会暗下来、往下垂）
    const topCY = bodyCY - halfH;
    const lit = S.mood !== "sleepy";
    const ballX = cx + Math.sin(S.t * 1.7) * R * 0.05 * (1 - flat * 0.6) + S.look.x * R * 0.06 + flat * R * 0.12;
    const ballY = topCY - R * (0.56 - flat * 0.24) + Math.sin(S.t * 2.2) * R * 0.025;
    ctx.fillStyle = "#8FB2D0"; ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1, R * 0.02);
    ctx.beginPath(); ctx.ellipse(cx, topCY, R * 0.11, R * 0.05, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.fillStyle = CYAN;
    for (let i = 1; i <= 2; i++) {           // 底座和球之间悬着两颗小光点
      const t = i / 3;
      ctx.globalAlpha = Math.max(0.05, (lit ? 0.6 : 0.2) + 0.3 * Math.sin(S.t * 6 - i * 1.3));
      ctx.beginPath(); ctx.arc(cx + (ballX - cx) * t, topCY + (ballY - topCY) * t, R * 0.025, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.shadowColor = CYAN; ctx.shadowBlur = lit ? 12 + (S.talking ? 7 : 0) + S.pet.amt * 8 : 3;
    ctx.fillStyle = lit ? "#8DE8FF" : "#5A88A8"; ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1, R * 0.018);
    ctx.beginPath(); ctx.arc(ballX, ballY, R * 0.11, 0, TAU); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(ballX, ballY, R * 0.11, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = Math.max(1, R * 0.016); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(ballX - R * 0.022, ballY - R * 0.028, R * 0.045, Math.PI * 0.92, Math.PI * 1.72); ctx.stroke();

    // ——— 想事情：天线球旁边浮出一个问号形状的光
    const q = E.q || 0;
    if (q > 0.02) {
      const qr = R * 0.17, qx = ballX + R * 0.34, qy = ballY - R * 0.26 - Math.sin(S.t * 2) * R * 0.02;
      ctx.save();
      ctx.globalAlpha = Math.min(1, q) * (0.8 + 0.2 * Math.sin(S.t * 3.4));
      ctx.shadowColor = CYAN; ctx.shadowBlur = 14;
      ctx.strokeStyle = "#2FA6DE"; ctx.lineWidth = Math.max(2, qr * 0.34); ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(qx, qy - qr * 0.45, qr * 0.55, Math.PI * 0.86, Math.PI * 2.1);
      ctx.quadraticCurveTo(qx + qr * 0.42, qy + qr * 0.3, qx, qy + qr * 0.52);
      ctx.stroke();
      ctx.fillStyle = "#2FA6DE"; ctx.beginPath(); ctx.arc(qx, qy + qr, qr * 0.19, 0, TAU); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    if (S.mood === "reading") face.book(cx, groundY - R * 0.04, R, "#F2F8FF", "#7FA3C4");
    face.parts({ heart: "#FF8FB8", z: "#8FB2D0", dot: CYAN, note: CYAN });
  }
});
