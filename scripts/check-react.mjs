// 校验 Live2D 角色的反应表：动作组 / 序号 / 表情名 / 参数名都对着本机的真模型查，
// 特效名、粒子、锚点对着 fx2d 查。
// 用法：node scripts/check-react.mjs <react.json>   （{ "l2d_hiyori": { "rps:win": [...] }, ... }）
// 先跑 scripts/l2d-inventory.mjs 生成 /tmp/l2d-inventory.json
import fs from "node:fs";

const OPS = new Set(["burst","shower","rise","ring","glow","lines","cloud","flash","bolt","magic","text","web","shake","hud","clone","beam","cracks","grid"]);
const KINDS = new Set(["heart","note","zzz","star","sparkle","petal","snow","confetti","bone","paw","sweat","smoke","coin","spark","ember","dot","bubble","leaf","web","wisp","ice"]);
const ANCHORS = new Set(["head","chest","feet","headR","headL","above","item"]);
const MOODS = new Set(["happy","thinking","sleepy","idle","reading"]);
const KEYS = new Set(["motion","exp","params","dur","hold","mood","fx","hop","spin","squash","delay"]);
const EVENTS = ["pet","poke","rps:reveal","rps:win","rps:lose","rps:tie","dice:start","dice:win","dice:lose","dice:tie",
                "catch:start","catch:get","catch:five","catch:miss","catch:great","catch:ok","catch:bad","land","spin"];

const inv = JSON.parse(fs.readFileSync("/tmp/l2d-inventory.json", "utf8"));
const table = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const bad = [], warn = [];

for (const [id, react] of Object.entries(table)) {
  const v = inv[id];
  if (!v || v.missing) { warn.push(`${id}: 本机没有这个模型，跳过`); continue; }
  const P = new Set(v.params), E = new Set(v.exps);
  for (const ev of EVENTS) if (!react[ev]) bad.push(`${id}: 少了 ${ev}`);
  for (const [ev, acts] of Object.entries(react)) {
    if (!EVENTS.includes(ev)) { bad.push(`${id} ${ev}: 不是这套里的事件名`); continue; }
    if (!Array.isArray(acts) || !acts.length) { bad.push(`${id} ${ev}: 空的`); continue; }
    acts.forEach((a, i) => {
      const at = `${id} ${ev}[${i}]`;
      for (const k of Object.keys(a)) if (!KEYS.has(k)) bad.push(`${at}: 没有 ${k} 这个键`);
      if (a.motion) {
        const [g, n] = a.motion;
        if (!(g in v.motions)) bad.push(`${at}: 没有 ${g} 这个动作组（有 ${Object.keys(v.motions).join("/")}）`);
        else if (!(Number.isInteger(n) && n >= 0 && n < v.motions[g])) bad.push(`${at}: ${g} 只有 ${v.motions[g]} 段，没有第 ${n} 段`);
      }
      if (a.exp && !E.has(a.exp)) bad.push(`${at}: 没有 ${a.exp} 这个表情${E.size ? "（有 " + [...E].join("/") + "）" : "（这个模型没有表情文件）"}`);
      if (a.params) for (const [k, n] of Object.entries(a.params)) {
        if (!P.has(k)) { bad.push(`${at}: 没有 ${k} 这个参数`); continue; }
        // 名字里带 SWITCH / Change 的是「换道具」开关，动了它角色手里的东西就变了
        // （小春的 PARAM_HAND_SWITCH_L 写成 2，绒球就变成了旗子）
        if (/switch|change|dhange/i.test(k) && Number(n) !== 0) bad.push(`${at}: ${k} 是换道具的开关，别动它`);
        const r = v.ranges && v.ranges[k];
        if (r && (n < r[0] || n > r[1])) bad.push(`${at}: ${k}=${n} 超出范围 ${r[0]}~${r[1]}`);
      }
      if (a.mood && !MOODS.has(a.mood)) bad.push(`${at}: 没有 ${a.mood} 这个心情`);
      for (const f of a.fx || []) {
        if (!Array.isArray(f) || !OPS.has(f[0])) { bad.push(`${at}: 未知特效 ${JSON.stringify(f)}`); continue; }
        let o;
        if (["burst","shower","rise"].includes(f[0])) { if (!KINDS.has(f[1])) bad.push(`${at}: 没有 ${f[1]} 这种粒子`); o = f[3]; }
        else if (f[0] === "text") o = f[2];
        else o = f[1];
        if (o && typeof o === "object") {
          if (o.at && !ANCHORS.has(o.at)) bad.push(`${at}: 没有 ${o.at} 这个锚点`);
          if (f[0] === "flash" && Number(o.alpha) > 0.18) bad.push(`${at}: 白闪 ${o.alpha} 太亮（上限 0.18）`);
          if (f[0] === "shake" && Number(o.amp) > 4) bad.push(`${at}: 抖动 ${o.amp} 太大（上限 4）`);
          if (f[0] === "ring" && o.at === "feet" && Number(o.r1) > 110) warn.push(`${at}: 脚下光环 r1=${o.r1} 偏大`);
          // 粒子的 size 是倍数不是像素：1 大概 5px，写成 12 就是一颗糊住整张脸的星星
          if (["burst", "shower", "rise"].includes(f[0]) && Number(o.size) > 2.2)
            bad.push(`${at}: 粒子 size=${o.size} 是倍数不是像素（1 约等于 5px），最多 2`);
          // 特效里的 life / dur / stagger 是秒，动作里的 dur / hold 才是毫秒
          for (const [k, cap] of [["life", 6], ["dur", 6], ["stagger", 2]])
            if (Number(o[k]) > cap) bad.push(`${at}: ${f[0]} 的 ${k}=${o[k]} 是秒不是毫秒（最多 ${cap}）`);
        }
      }
    });
    // 第一拍要立刻看得见
    const a0 = acts[0];
    if (a0.delay) bad.push(`${id} ${ev}: 第一拍延后了 ${a0.delay}ms`);
    if (!["motion","exp","params","fx","hop","spin","squash"].some(k => k in a0)) bad.push(`${id} ${ev}: 第一拍什么都看不出来`);
  }
  // 赢的三件事不能长一样
  const sig = e => JSON.stringify((react[e] || []).map(a => [a.motion, a.exp, (a.fx || []).map(f => f.slice(0, 2))]));
  const wins = ["rps:win", "dice:win", "catch:great"];
  for (let i = 0; i < wins.length; i++) for (let j = i + 1; j < wins.length; j++)
    if (sig(wins[i]) === sig(wins[j])) bad.push(`${id}: ${wins[i]} 和 ${wins[j]} 一模一样`);
  // 赢和输要分得出来
  for (const [w, l] of [["rps:win", "rps:lose"], ["dice:win", "dice:lose"], ["catch:great", "catch:bad"]])
    if (sig(w) === sig(l)) bad.push(`${id}: ${w} 和 ${l} 一模一样`);
}

for (const w of warn) console.log("  ~", w);
for (const b of bad) console.log("  ✗", b);
console.log(bad.length ? `${bad.length} 处要改` : "都对得上");
process.exit(bad.length ? 1 : 0);
