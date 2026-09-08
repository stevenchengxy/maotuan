// 把 .shots/ 里的截图拼成 docs/ 里的合照。
// 用法：node scripts/sheet.mjs <chars|chars-taps|live2d|live2d-fx|taps|scenes> [picks.json]
//
// 注意：@napi-rs/canvas 不会自己找系统中文字体，不注册就全是豆腐块——
// 之前的合照标题和角色名就这么变成方框的。
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { L2D_MODELS } from "../renderer/skins/live2dCatalog.js";
import { CHARS } from "../renderer/skins/charCatalog.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(ROOT, ".shots");
const DOCS = path.join(ROOT, "docs");

for (const [file, name] of [["/System/Library/Fonts/STHeiti Medium.ttc", "MTHei"],
                            ["/System/Library/Fonts/STHeiti Light.ttc", "MTHeiLight"]]) {
  if (fs.existsSync(file)) GlobalFonts.registerFromPath(file, name);
}
const HEI = '"MTHei", "PingFang SC", sans-serif';
const LIGHT = '"MTHeiLight", "MTHei", "PingFang SC", sans-serif';
const F = (w, px, fam = HEI) => `${w} ${px}px ${fam}`;

const INK = "#3B3229", MUTED = "#8C8073", FAINT = "#B3A899", PAPER = "#F7F3EC";

// 一格：把图按高度塞进去，脚踩格子底边
function cell(g, file, x, y, w, h) {
  if (!fs.existsSync(file)) return false;
  return loadImage(file).then(img => {
    const k = Math.min(w / img.width, h / img.height);
    g.drawImage(img, x + (w - img.width * k) / 2, y + (h - img.height * k), img.width * k, img.height * k);
    return true;
  });
}

function frame({ cols, rows, cw, ch, gap = 10, lab = 24, left = 0, top = 0, padx = 26, padb = 26 }) {
  const W = left + cols * cw + (cols - 1) * gap + padx;
  const H = top + rows * (ch + lab) + (rows - 1) * gap + padb;
  const c = createCanvas(W, H), g = c.getContext("2d");
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  return { c, g, W, H };
}

function title(g, W, t, sub) {
  g.textAlign = "center";
  g.fillStyle = INK; g.font = F(600, 25);
  g.fillText(t, W / 2, 44);
  if (sub) { g.fillStyle = FAINT; g.font = F(400, 13, LIGHT); g.fillText(sub, W / 2, 68); }
}

// 一行一个角色，一列一个事件
async function grid({ out, t, sub, rows, cols, shot, cw = 240, ch = 280, left = 124 }) {
  const { c, g, W, H } = frame({ cols: cols.length, rows: rows.length, cw, ch, left, top: 96 });
  title(g, W, t, sub);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r], y = 96 + r * (ch + 24 + 10);
    g.fillStyle = r % 2 ? "#FFFFFF" : "#FCFAF6";
    g.beginPath(); g.roundRect(13, y - 6, W - 26, ch + 30, 12); g.fill();
    g.textAlign = "right";
    g.fillStyle = INK; g.font = F(600, 17); g.fillText(row.name, left - 18, y + ch / 2 - 4);
    if (row.sub) { g.fillStyle = FAINT; g.font = F(400, 11, LIGHT); g.fillText(row.sub, left - 18, y + ch / 2 + 15); }
    for (let q = 0; q < cols.length; q++) {
      const x = left + q * (cw + 10);
      await cell(g, path.join(SHOTS, shot(row, cols[q])), x, y, cw, ch);
      g.textAlign = "center"; g.fillStyle = MUTED; g.font = F(500, 12);
      g.fillText(cols[q].label, x + cw / 2, y + ch + 15);
    }
  }
  fs.mkdirSync(DOCS, { recursive: true });
  fs.writeFileSync(path.join(DOCS, out), c.toBuffer("image/png"));
  console.log(out, `${W}×${H}`);
}

// 一排卡片，每张一个角色
async function row({ out, t, sub, items, cw = 300, ch = 330, cols = 3 }) {
  const rows = Math.ceil(items.length / cols);
  const { c, g, W, H } = frame({ cols, rows, cw, ch, gap: 16, lab: 52, top: 96 });
  title(g, W, t, sub);
  for (let i = 0; i < items.length; i++) {
    const it = items[i], cx = i % cols, cy = (i / cols) | 0;
    const x = 26 + cx * (cw + 16), y = 96 + cy * (ch + 52 + 16);
    g.fillStyle = "#FFFFFF"; g.strokeStyle = "#EADFD4"; g.lineWidth = 1;
    g.beginPath(); g.roundRect(x, y, cw, ch + 52, 14); g.fill(); g.stroke();
    await cell(g, path.join(SHOTS, it.shot), x + 10, y + 10, cw - 20, ch - 20);
    g.textAlign = "center";
    g.fillStyle = INK; g.font = F(600, 17); g.fillText(it.name, x + cw / 2, y + ch + 12);
    if (it.sub) { g.fillStyle = FAINT; g.font = F(400, 12, LIGHT); g.fillText(it.sub, x + cw / 2, y + ch + 32); }
  }
  fs.writeFileSync(path.join(DOCS, out), c.toBuffer("image/png"));
  console.log(out, `${W}×${H}`);
}

const L2D = Object.entries(L2D_MODELS).map(([id, m]) => ({ id, name: m.name, sub: m.full !== m.name ? m.full : m.desc }));
const AI = Object.entries(CHARS).map(([id, c]) => ({ id, name: c.name, sub: c.desc.replace("画的 · ", "") }));

const SKIN_NAMES = { fluff: "毛毛", jelly: "小水", slime: "果冻", ghost: "幽幽", robot: "滴滴",
  blob: "方块", pjelly: "蓝蓝", pcat: "橘子", pghost: "小幽", probot: "哔哔", pslime: "绿豆",
  orb: "小澈", term: "小终", capsule: "罐罐", cube: "方方", wisp: "数萤", moon: "小月" };

const GAMES = [
  { key: "rps_win", label: "猜拳赢了" }, { key: "rps_lose", label: "猜拳输了" },
  { key: "dice_win", label: "骰子赢了" }, { key: "catch_great", label: "接豆子大胜" },
  { key: "pet", label: "被摸" },
];
const TAPS = [0, 1, 2, 3].map(i => ({ key: "tap_" + i, label: "第 " + (i + 1) + " 下" }))
  .concat([{ key: "tap_many", label: "连点五下" }]);
const SCENES = [["greet", "换样子"], ["back", "主人回来"], ["bored", "发呆"], ["think", "在想"],
                ["done", "跑完了"], ["feed", "吃文件"], ["night", "深夜"], ["listen", "在听你说"]]
  .map(([key, label]) => ({ key, label }));

const mode = process.argv[2];
const picks = process.argv[3] && fs.existsSync(process.argv[3]) ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")) : null;
// picks: { l2d_hiyori: { rps_win: 850, ... } } —— 每个反应挑中的那一帧
const at = (id, key) => (picks && picks[id] && picks[id][key]) || null;

if (mode === "live2d-fx") {
  await grid({
    out: "live2d-fx-sheet.png",
    t: "毛团 · Live2D 角色的游戏特效",
    sub: "角色模型 © Live2D Inc. · 每人一套自己的表情、动作、粒子、台词、音色",
    rows: L2D, cols: GAMES, cw: 250, ch: 290,
    shot: (r, c) => { const t = at(r.id, c.key); return `react-${r.id}-${c.key}${t ? "-" + t : ""}.png`; },
  });
} else if (mode === "live2d") {
  await row({
    out: "live2d-sheet.png", t: "毛团 · 二次元角色（Live2D）",
    sub: "角色模型 © Live2D Inc. 官方免费示例 · 在毛团里实时渲染，会眨眼、呼吸、看鼠标、跟着说话张嘴",
    items: L2D.map(x => ({ ...x, shot: `pet-${x.id}.png` })), cols: 4, cw: 260, ch: 330,
  });
} else if (mode === "chars") {
  await row({
    out: "chars-sheet.png", t: "毛团 · 画出来的角色",
    sub: "第一次选中时用你自己的 MiniMax key 在本机画一张四格表情表，切成四张脸；仓库和安装包里不含任何图片",
    items: AI.map(x => ({ ...x, shot: `pet-${x.id}.png` })), cols: 3, cw: 300, ch: 330,
  });
} else if (mode === "chars-taps") {
  await grid({
    out: "chars-taps.png", t: "毛团 · 点一下画出来的角色",
    sub: "四个变体轮着来，第五格是两秒里被连点五下",
    rows: AI, cols: TAPS, cw: 200, ch: 235, left: 110,
    shot: (r, c) => `tap-${r.id}-${c.key}.png`,
  });
} else if (mode === "taps") {
  // 31 套皮肤，按家族分组
  const FAM = [
    ["手绘", ["fluff", "jelly", "slime", "ghost", "robot"]],
    ["像素", ["blob", "pjelly", "pcat", "pghost", "probot", "pslime"]],
    ["桌面助手", ["orb", "term", "capsule", "cube", "wisp", "moon"]],
    ["画出来的", Object.keys(CHARS)],
    ["二次元 Live2D", Object.keys(L2D_MODELS)],
  ];
  const NAMES = Object.fromEntries([...L2D, ...AI].map(x => [x.id, x]));
  const rows = [];
  for (const [fam, ids] of FAM) for (let i = 0; i < ids.length; i++) {
    const id = ids[i], k = NAMES[id];
    rows.push({ id, name: k ? k.name : (SKIN_NAMES[id] || id), sub: i === 0 ? fam : "" });
  }
  await grid({
    out: "taps-sheet.png", t: "毛团 · 点它一下",
    sub: "31 套皮肤，每套四个变体轮着来，第五格是两秒里被连点五下",
    rows, cols: TAPS, cw: 160, ch: 186, left: 108,
    shot: (r, c) => `tap-${r.id}-${c.key}.png`,
  });
} else if (mode === "scenes") {
  const ids = (process.env.SHEET_IDS || "").split(",").filter(Boolean);
  const rows = [...AI, ...L2D].filter(x => !ids.length || ids.includes(x.id));
  await grid({
    out: "scenes-chars-sheet.png", t: "八个使用场景，每个角色的反应都不一样",
    sub: "换样子 · 主人回来 · 发呆 · 在想 · Codex 跑完了 · 吃文件 · 深夜 · 在听你说话",
    rows, cols: SCENES, cw: 170, ch: 200, left: 110,
    shot: (r, c) => `scene-${r.id}-${c.key}.png`,
  });
} else {
  console.error("用法: node scripts/sheet.mjs <chars|chars-taps|live2d|live2d-fx|scenes> [picks.json]");
  process.exit(1);
}
