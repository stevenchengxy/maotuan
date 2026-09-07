import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, dialog, shell, powerMonitor, globalShortcut } from "electron";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Store } from "./store.js";
import { createBrain } from "./brain.js";
import { Voice } from "./voice.js";
import { resolveMcp, findUvx } from "./mcp.js";
import { PRESETS } from "./mcp-presets.js";
import { Watcher } from "./watcher.js";
import { throwWindow } from "./physics.js";
import { splitSentences, SentenceBuffer } from "./text.js";
import { Stt } from "./stt.js";
import { StoryBook, generateImage } from "./story.js";
import { Singer } from "./sing.js";
import { Live2D } from "./live2d.js";
import { L2D_MODELS } from "../renderer/skins/live2dCatalog.js";
import { petNameOf } from "./persona.js";
const petName = () => petNameOf(store.data);

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PRELOAD = path.join(ROOT, "renderer", "preload.cjs");
const IS_MAC = process.platform === "darwin";
const SKIN_LIST = [["fluff", "毛团", "羊毛毡的圆毛球"], ["jelly", "水母", "半透明的小水母"], ["blob", "像素团", "照着参考图做的紫色像素团"], ["pjelly", "像素水母", "像素风，触手会摆"], ["pcat", "像素猫", "像素风，有耳朵和小鼻子"], ["pghost", "像素幽灵", "像素风，裙边会动"], ["probot", "像素机器人", "像素风，眼睛是两条灯"], ["pslime", "像素史莱姆", "像素风，绿绿的"], ["slime", "史莱姆", "手绘，果冻一样会晃"], ["ghost", "小幽灵", "手绘，半透明，裙边会飘"], ["robot", "小机器人", "手绘，脸是屏幕"], ...Object.entries(L2D_MODELS).map(([id, m]) => [id, m.name, m.desc])];
const log = (...a) => console.log("[毛团]", ...a);

// 从 Finder / 开始菜单启动时 PATH 很短，把常见的 node / uvx 位置补上（Agent SDK 要能找到 node）
function fixPath() {
  const home = os.homedir();
  const extra = IS_MAC || process.platform === "linux" ? ["/opt/homebrew/bin", "/usr/local/bin", path.join(home, ".local/bin")] : [path.join(home, "AppData", "Roaming", "npm"), "C:\\Program Files\\nodejs"];
  try {
    const nvm = path.join(home, ".nvm/versions/node");
    const vs = fs.readdirSync(nvm).map(v => ({ v, n: parseInt(v.replace(/^v/, ""), 10) || 0 })).sort((a, b) => b.n - a.n);
    if (vs.length) extra.push(path.join(nvm, vs[0].v, "bin"));
  } catch {}
  const sep = process.platform === "win32" ? ";" : ":";
  const cur = (process.env.PATH || "").split(sep);
  process.env.PATH = [...extra.filter(p => fs.existsSync(p) && !cur.includes(p)), ...cur].join(sep);
}
fixPath();
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
if (!app.requestSingleInstanceLock()) app.quit();

let store, brain, voice, pet, panel, tray, watcher, live2d, toolsServer, dataDir, stt, storyBook, bookWin, singer, arenaOn = false, singing = false, picWin = null, speakOff = false;
let bookReading = false;
let working = null;
let quitting = false, chatting = false, readSentences = [], reading = { active: false }, lastAgent = null, lastAgentAt = 0, petHidden = false;
const pending = new Map(); let playId = 0;
const sendPet = (ch, d) => { if (pet && !pet.isDestroyed()) pet.webContents.send(ch, d); };
const sendPanel = (ch, d) => { if (panel && !panel.isDestroyed()) panel.webContents.send(ch, d); };
const player = {
  play(buffer, format) { return new Promise(resolve => { const id = ++playId; pending.set(id, resolve); sendPet("voice:play", { id, data: buffer.toString("base64"), format }); }); },
  stop() { sendPet("voice:stop"); for (const r of pending.values()) r(); pending.clear(); },
  pause() { sendPet("voice:pause"); }, resume() { sendPet("voice:resume"); }
};

app.whenReady().then(init);
app.on("window-all-closed", () => {});
app.on("before-quit", () => { quitting = true; try { globalShortcut.unregisterAll(); } catch {} if (watcher) watcher.stop(); });
app.on("second-instance", () => showPanel());

async function init() {
  if (IS_MAC && app.dock) app.dock.hide();
  dataDir = app.getPath("userData");
  store = new Store(dataDir);
  if (process.env.MAOTUAN_SKIN && SKIN_LIST.some(([id]) => id === process.env.MAOTUAN_SKIN)) store.patchSettings({ skin: process.env.MAOTUAN_SKIN });
  if (!SKIN_LIST.some(([id]) => id === store.settings.skin)) store.patchSettings({ skin: "fluff" });   // 皮肤下架了就换回毛团
  toolsServer = {
    command: process.execPath, args: [path.join(ROOT, "mcp", "maotuan-tools.js")],
    env: { ELECTRON_RUN_AS_NODE: "1", MAOTUAN_DATA: dataDir, MAOTUAN_PORT: String(store.settings.watcherPort || 47831), MAOTUAN_NAME: petName() }
  };
  setBrain(store.settings.brain);
  voice = new Voice({ store, dataDir, player, log });
  voice.onState = onVoiceState;
  voice.listSayVoices().then(list => {
    if (!list.length) return;
    if (!list.some(v => v.id === store.settings.sayVoice)) { const p = list.find(v => /Tingting|婷婷/i.test(v.id)) || list.find(v => v.lang === "zh_CN") || list[0]; store.patchSettings({ sayVoice: p.id }); }
  });
  live2d = new Live2D({ dir: path.join(dataDir, "live2d"), log, onProgress: p => sendPet("live2d:progress", p) });
  watcher = new Watcher({ port: store.settings.watcherPort || 47831, log, onEvent: onWatcherEvent, staticDir: path.join(dataDir, "live2d"), getStatus: () => ({ name: petName(), pets: store.get("pets"), fed: store.get("fed"), brain: store.settings.brain, skin: store.settings.skin, talking: !voice.idle, reading: reading.active, lastAgent }) });
  watcher.start();
  stt = new Stt({ store, dataDir, log, onProgress: text => sendPanel("stt:progress", { text }) });
  storyBook = new StoryBook({ store, dataDir, brain, log, onProgress: p => sendPanel("book:progress", p) });
  singer = new Singer({ store, dataDir, brain, log });

  const firstRun = !fs.existsSync(store.file);
  if (firstRun) store.set("onboarded", false); else if (store.get("onboarded") === undefined) store.set("onboarded", true);
  createPet(); createPanel(); createTray(); wireIpc(); watchIdle(); registerHotkey();
  store.set("lastSeen", Date.now());
  if (!store.get("onboarded")) setTimeout(() => { sendPet("pet:say", { text: "你好呀。我是谁、叫什么、用什么声音，我们先花一分钟定一下？" }); showPanel("wizard"); }, 1500);
}

function mcpFor() { return resolveMcp(store, { toolsServer }); }
function setBrain(kind) {
  store.patchSettings({ brain: "codex" });
  brain = createBrain(store.settings.brain, { store, dataDir, mcp: mcpFor, log });
  if (storyBook) storyBook.brain = brain;
  if (singer) singer.brain = brain;
  log("brain =", brain.name);
}

/* ---------------- 窗口 ---------------- */
const PET_W0 = 300, PET_H0 = 340, BUBBLE_H0 = 104;   // 窗口比舞台高出 BUBBLE_H0：那一条是气泡的地盘，永远不会压到它
let PET_W = PET_W0, PET_H = PET_H0 + BUBBLE_H0;
function petScale() { return Math.max(0.5, Math.min(2, Number(store.settings.petScale) || 1)); }
function petSize() { const k = petScale(); return { w: Math.round(PET_W0 * k), h: Math.round(PET_H0 * k) }; }
function winSize() { const k = petScale(), p = petSize(); return { w: p.w, h: p.h + Math.round(BUBBLE_H0 * k) }; }
function defaultPetPos() { const wa = screen.getPrimaryDisplay().workArea; const { w, h } = winSize(); return { x: wa.x + wa.width - w - 24, y: wa.y + wa.height - h - 8 }; }
// 改大小：脚底位置不动，往上长
function applyPetSize() {
  if (!pet) return;
  const { w, h } = winSize(); const [x, y] = pet.getPosition(); const [ow, oh] = pet.getSize();
  const nx = Math.round(x + (ow - w) / 2), ny = Math.round(y + (oh - h));
  PET_W = w; PET_H = h;
  pet.setBounds({ x: nx, y: ny, width: w, height: h });
  store.set("petPos", { x: nx, y: ny });
  if (panel && panel.isVisible()) positionPanel();
}
function tapConsole(win, tag) {
  win.webContents.on("console-message", (e, level, message, line, source) => {
    const msg = (e && typeof e.message === "string") ? e.message : message; const lv = (e && e.level) || level;
    if (lv === "error" || lv === 3 || lv === "warning" || lv === 2 || process.env.MAOTUAN_DEV) log(`[${tag}]`, msg, source ? `(${path.basename(String(source))}:${line || e.lineNumber || ""})` : "");
  });
  win.webContents.on("preload-error", (_e, p, err) => log(`[${tag}] preload error`, p, err && err.message));
  win.webContents.on("render-process-gone", (_e, d) => log(`[${tag}] renderer gone`, d && d.reason));
}
function createPet() {
  const pos = store.get("petPos") || defaultPetPos();
  ({ w: PET_W, h: PET_H } = winSize());
  pet = new BrowserWindow({
    width: PET_W, height: PET_H, x: pos.x, y: pos.y, transparent: true, frame: false, hasShadow: false, resizable: false, movable: false,
    alwaysOnTop: true, skipTaskbar: true, show: false, fullscreenable: false, minimizable: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  pet.setAlwaysOnTop(true, "floating");
  pet.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  pet.setIgnoreMouseEvents(true, { forward: true });
  tapConsole(pet, "pet");
  pet.loadFile(path.join(ROOT, "renderer", "pet.html"));
  pet.once("ready-to-show", () => pet.showInactive());
  pet.on("closed", () => { pet = null; });
}
function createPanel() {
  panel = new BrowserWindow({
    width: 440, height: 680, minWidth: 380, minHeight: 480, show: false, frame: false,
    ...(IS_MAC ? { titleBarStyle: "hidden", trafficLightPosition: { x: 12, y: 12 }, vibrancy: "sidebar", visualEffectState: "active", backgroundColor: "#00000000" } : { backgroundColor: "#F3F1EA" }),
    alwaysOnTop: true, skipTaskbar: true, fullscreenable: false, minimizable: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true }
  });
  panel.setAlwaysOnTop(true, "floating");
  panel.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  tapConsole(panel, "panel");
  panel.loadFile(path.join(ROOT, "renderer", "panel.html"));
  panel.on("close", e => { if (!quitting) { e.preventDefault(); panel.hide(); } });
}
function positionPanel() {
  if (!pet || !panel) return;
  const [px, py] = pet.getPosition(); const [pw, ph] = panel.getSize();
  const wa = screen.getDisplayNearestPoint({ x: px, y: py }).workArea;
  let x = px - pw - 8, y = py + PET_H - ph;
  if (x < wa.x) x = px + PET_W + 8;
  if (x + pw > wa.x + wa.width) x = wa.x + wa.width - pw - 8;
  y = Math.max(wa.y + 8, Math.min(y, wa.y + wa.height - ph - 8));
  panel.setPosition(Math.round(x), Math.round(y), false);
}
function showPanel(tab) { if (!panel) return; positionPanel(); panel.show(); panel.focus(); if (tab) sendPanel("panel:tab", { tab }); }
function togglePanel() { if (panel && panel.isVisible()) panel.hide(); else showPanel(); }
function openBook() {
  const b = store.get("book"); if (!b) return;
  if (bookWin && !bookWin.isDestroyed()) { bookWin.show(); bookWin.webContents.send("book:data", b); return; }
  bookWin = new BrowserWindow({ width: 960, height: 620, minWidth: 640, minHeight: 420, show: false, ...(IS_MAC ? { titleBarStyle: "hidden", trafficLightPosition: { x: 12, y: 14 } } : {}), backgroundColor: "#F6F2E9", webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true } });
  tapConsole(bookWin, "book");
  bookWin.loadFile(path.join(ROOT, "renderer", "book.html"));
  bookWin.once("ready-to-show", () => { bookWin.show(); bookWin.webContents.send("book:data", b); });
  bookWin.on("closed", () => { bookWin = null; bookReading = false; voice.stop(); });
}
function setPetHidden(h) { petHidden = h; if (!pet) return; if (h) { pet.hide(); if (panel) panel.hide(); } else pet.showInactive(); refreshTray(); }

/* ---------------- 菜单 ---------------- */
function skinMenu() { return SKIN_LIST.map(([id, name]) => ({ label: name, type: "radio", checked: store.settings.skin === id, click: () => { store.patchSettings({ skin: id }); broadcastState(); onSkinChanged(id); } })); }
// 换成有人设的角色：用它自己的声音打个招呼（Live2D 的等模型站好了再说）
let greetPending = "";
const charOf = id => L2D_MODELS[id] || null;
function greet(id) {
  if (store.settings.skin !== id) return;
  scene("scene:greet");
  const c = charOf(id); if (!c || !c.greeting || store.settings.muted) return;
  voice.stop(); sendPet("pet:say", { text: c.greeting }); voice.speak(c.greeting, { emotion: "happy" });
}
// 场景反应：主进程只喊事件名，演什么、说什么在渲染层按角色查表
function scene(ev, opts = {}) { sendPet("pet:scene", { ev, ...opts }); }
function isNight() { const h = new Date().getHours(); return h >= 23 || h < 6; }

function onSkinChanged(id) { greetPending = ""; if (toolsServer) toolsServer.env.MAOTUAN_NAME = petName(); if (tray) tray.setToolTip(petName()); if (id.startsWith("l2d_")) greetPending = id; else greet(id); }
function commonMenu() {
  const s = store.settings;
  return [
    { label: `和${petName()}聊聊`, accelerator: (store.settings.hotkey || "").trim() || undefined, click: () => showPanel("chat") },
    { label: "对它说话", accelerator: (store.settings.voiceHotkey || "").trim() || undefined, click: () => { showPanel("chat"); sendPanel("panel:mic", {}); } },
    { label: "喂它读点东西", click: () => showPanel("feed") },
    { label: "摸摸它", click: () => sendPet("pet:pet") },
    { type: "separator" },
    { label: "换个样子", submenu: skinMenu() },
    { label: "大小", submenu: [[0.7, "小"], [1, "中"], [1.3, "大"], [1.7, "特大"]].map(([k, name]) => ({ label: name, type: "radio", checked: Math.abs(petScale() - k) < 0.05, click: () => { store.patchSettings({ petScale: k }); applyPetSize(); broadcastState(); } })) },
    { label: s.muted ? "让它出声" : "安静一会儿", click: () => { store.patchSettings({ muted: !s.muted }); if (!s.muted) voice.stop(); broadcastState(); } },
    { label: "回到右下角", click: () => { const p = defaultPetPos(); pet.setPosition(p.x, p.y); store.set("petPos", p); } },
    { label: petHidden ? "把它叫出来" : "先藏起来", click: () => setPetHidden(!petHidden) },
    { type: "separator" },
    { label: "设置", click: () => showPanel("settings") },
    { label: "退出", click: () => { quitting = true; app.quit(); } }
  ];
}
function createTray() {
  if (IS_MAC) { tray = new Tray(nativeImage.createEmpty()); tray.setTitle("🧶"); }
  else { const img = nativeImage.createFromPath(path.join(ROOT, "assets", "icon.png")); tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 16, height: 16 })); }
  tray.setToolTip(petName());
  refreshTray();
  tray.on("click", () => togglePanel());
}
function refreshTray() {
  if (!tray) return;
  const login = app.getLoginItemSettings().openAtLogin;
  const items = commonMenu();
  items.splice(items.length - 2, 0, { label: "开机就出来", type: "checkbox", checked: login, click: () => { app.setLoginItemSettings({ openAtLogin: !login }); refreshTray(); } });
  tray.setContextMenu(Menu.buildFromTemplate(items));
}
function registerHotkey() {
  try { globalShortcut.unregisterAll(); } catch {}
  const k = (store.settings.hotkey || "").trim();
  if (!k) return true;
  try {
    const vk = (store.settings.voiceHotkey || "").trim();
    if (vk) globalShortcut.register(vk, () => { if (petHidden) setPetHidden(false); showPanel("chat"); sendPanel("panel:mic", {}); });
    return globalShortcut.register(k, () => { if (petHidden) setPetHidden(false); togglePanel(); });
  } catch (e) { log("hotkey failed", e.message); return false; }
}

/* ---------------- 状态 ---------------- */
function hooksStatus() {
  const port = store.settings.watcherPort || 47831;
  let claude = false, codex = false;
  try { claude = fs.readFileSync(path.join(os.homedir(), ".claude", "settings.json"), "utf8").includes(`127.0.0.1:${port}`); } catch {}
  try { codex = fs.readFileSync(path.join(os.homedir(), ".codex", "config.toml"), "utf8").includes("codex-notify.sh"); } catch {}
  return { claude, codex, port, claudeInstalled: fs.existsSync(path.join(os.homedir(), ".claude")), codexInstalled: fs.existsSync(path.join(os.homedir(), ".codex", "auth.json")) };
}
function publicState() {
  const d = store.data; const m = mcpFor();
  const status = Object.fromEntries((brain.mcpStatus || []).map(s => [s.name, s.status]));
  return {
    name: petName(), defaultName: d.name, born: d.born, pets: d.pets, fed: d.fed, platform: process.platform,
    doc: d.doc ? { title: d.doc.title, kind: d.doc.kind, chars: d.doc.chars, oneLine: d.doc.oneLine, points: d.doc.points, intro: d.doc.intro, pos: d.doc.pos || 0, hasText: !!d.doc.text } : null,
    settings: d.settings,
    secrets: Object.fromEntries(Object.keys(d.secrets).map(k => [k, true])), hints: d.hints || {},
    voiceProvider: voice.provider(), readProvider: voice.provider("read"), voiceError: voice.lastError || "",
    mcp: m.entries.map(e => ({ ...e, brainStatus: status[e.id] || status[String(e.id).replace(/[^a-zA-Z0-9_-]/g, "_")] || "" })),
    presets: PRESETS.map(p => ({ id: p.id, name: p.name, desc: p.desc, fields: p.fields, help: p.help, type: p.type })),
    skins: SKIN_LIST.map(([id, name, desc]) => ({ id, name, desc })),
    hooks: hooksStatus(), agent: lastAgent, brain: brain.name, onboarded: !!d.onboarded, petBase: petSize(), stt: stt ? stt.status : "", book: d.book ? { title: d.book.title, pages: d.book.pages.length } : null,
    uvx: d.settings.uvx || findUvx(), loginItem: app.getLoginItemSettings().openAtLogin, dataDir, petHidden
  };
}
function broadcastState() { const s = publicState(); sendPanel("state", s); sendPet("state", s); refreshTray(); }

/* ---------------- 声音状态 → 嘴巴 ---------------- */
function onVoiceState({ talking, item }) {
  if (process.env.MAOTUAN_DEV) log("voice:", talking ? "talking" : "quiet", item ? item.text.slice(0, 40) : "", voice.lastError ? "err=" + voice.lastError : "");
  sendPet("pet:talking", { talking: !!talking }); sendPanel("pet:talking", { talking: !!talking || (voice.queue && voice.queue.length > 0) });
  if (item && item.meta && item.meta.book != null && talking) {
    if (bookWin && !bookWin.isDestroyed()) { bookWin.webContents.send("book:page", { page: item.meta.book }); bookWin.webContents.send("book:line", { text: item.text }); }
    sendPet("pet:stream", { text: item.text, hold: true });
  }
  if (!talking && bookReading && voice.idle) { bookReading = false; if (bookWin && !bookWin.isDestroyed()) bookWin.webContents.send("book:done", {}); sendPet("pet:mood", { mood: "idle" }); }
  if (item && item.meta && item.meta.read && talking) {
    const doc = store.get("doc"); if (doc) { doc.pos = item.meta.index; if (item.meta.index % 5 === 0) store.save(); }
    sendPanel("read:progress", { index: item.meta.index, total: readSentences.length, text: item.text });
    sendPet("pet:stream", { text: item.text, hold: true });
  }
  if (!talking && reading.active && voice.idle) {
    reading.active = false; const doc = store.get("doc"); if (doc && doc.pos >= readSentences.length - 1) doc.pos = 0; store.save();
    sendPanel("read:done", {}); sendPet("pet:mood", { mood: "idle" }); sendPet("pet:say", { text: "念完啦。我嗓子有点毛。" });
  }
}

/* ---------------- 聊天 ---------------- */
const cleanBubble = t => String(t || "").replace(/[【\[](开心|高兴|难过|伤心|生气|害怕|惊讶|平静|温柔)[】\]]\s*/g, "").trim();
function friendlyBrainError(ev) {
  const t = String(ev.text || "");
  if (brain.name === "codex") { if (/login|auth|401|unauthorized|not logged/i.test(t)) return "脑子没接上。在终端里跑一下 codex login，我就能说话了。"; return "唔，Codex 那边卡了一下。再说一遍？"; }
  if (/not logged in|login|authenticate|401|unauthorized|expired/i.test(t)) return "脑子没接上。在终端里跑一次 codex login 就好了。";
  if (/ENOENT|spawn|node/i.test(t)) return "脑子没接上，好像找不到 node。看看设置里的说明。";
  return "唔，脑子卡了一下。再说一遍？";
}
async function runChat(text) {
  if (chatting) await brain.interrupt();
  chatting = true; stopReading(true); voice.stop();
  speakOff = false;
  let streamed = false;
  const sb = new SentenceBuffer(s => { if (!speakOff) voice.enqueue(s); const t = cleanBubble(s); if (t) { streamed = true; sendPet("pet:sentence", { text: t }); } });
  let acc = "";
  sendPanel("chat:start", { brain: brain.name }); sendPet("pet:mood", { mood: "thinking" }); scene("scene:think");
  try {
    for await (const ev of brain.chat(text)) {
      if (process.env.MAOTUAN_DEV && ev.type !== "delta") log("chat event:", ev.type, ev.name || "", (ev.text || "").slice(0, 200));
      if (ev.type === "delta") { acc += ev.text; sb.push(ev.text); sendPanel("chat:delta", { text: ev.text }); sendPet("pet:mood", { mood: "idle" }); }
      else if (ev.type === "tool") { sendPanel("chat:tool", { name: ev.name, input: ev.input }); sendPet("pet:mood", { mood: "thinking" }); }
      else if (ev.type === "done") { sb.flush(); sendPanel("chat:done", { text: ev.text }); if (!streamed) sendPet("pet:say", { text: cleanBubble(ev.text || acc) }); else sendPet("pet:sentenceEnd", {}); sendPet("pet:mood", { mood: "idle" }); }
      else if (ev.type === "error") { sb.flush(); sendPanel("chat:error", { text: ev.text, code: ev.code }); sendPet("pet:say", { text: friendlyBrainError(ev) }); sendPet("pet:mood", { mood: "idle" }); }
    }
  } finally { chatting = false; broadcastState(); }
}

/* ---------------- 喂 & 念 ---------------- */
async function readFileText(file) {
  const ext = path.extname(file).toLowerCase(); const buf = fs.readFileSync(file);
  if (ext === ".pdf") { const pdf = require("pdf-parse"); const r = await pdf(buf); return r.text || ""; }
  if ([".docx", ".doc", ".epub", ".mobi", ".zip", ".png", ".jpg", ".jpeg", ".gif", ".mp3", ".mp4"].includes(ext)) throw new Error("unsupported:" + ext.slice(1));
  let t = buf.toString("utf8"); const bad = (t.match(/�/g) || []).length;
  if (bad > Math.max(3, t.length * 0.002)) { try { t = new TextDecoder("gbk").decode(buf); } catch {} }
  return t.replace(/^\uFEFF/, "");
}
async function feed(text, name) {
  text = String(text).replace(/\u00A0/g, " ").trim();
  if (text.length < 20) throw new Error("too-short");
  stopReading(true);
  const doc = { key: String(Date.now()), name, chars: text.length, text, pos: 0, title: (name || "").replace(/\.[^.]+$/, "") || "一段文字", kind: "", oneLine: "", points: [], intro: "" };
  store.set("doc", doc); store.set("fed", (store.get("fed") || 0) + 1);
  sendPet("pet:mood", { mood: "thinking" }); scene("scene:feed"); sendPet("pet:say", { text: "嚼嚼嚼……" });
  try {
    const r = await brain.digest(text, name);
    Object.assign(doc, { title: r.title || doc.title, kind: r.kind || "", oneLine: r.oneLine || "", points: Array.isArray(r.points) ? r.points.slice(0, 3) : [], intro: r.intro || "" });
    store.set("doc", doc); sendPet("pet:mood", { mood: "idle" });
    const line = "啃完啦。" + (doc.oneLine || "要我讲给你听吗？"); sendPet("pet:say", { text: line }); voice.speak(line);
  } catch (e) { log("digest failed:", e.message); sendPet("pet:mood", { mood: "idle" }); sendPet("pet:say", { text: "吃下去了，但我讲不出感想，脑子没接上。念给你听还是可以的。" }); }
  broadcastState(); return publicState().doc;
}
function startReading(from) {
  const doc = store.get("doc"); if (!doc || !doc.text) return false;
  voice.stop(); readSentences = splitSentences(doc.text, 80);
  from = Math.max(0, Math.min(from | 0, readSentences.length - 1)); reading.active = true;
  sendPet("pet:mood", { mood: "reading" });
  const provider = voice.provider("read");
  for (let i = from; i < readSentences.length; i++) voice.enqueue(readSentences[i], { provider, meta: { read: true, index: i } });
  return true;
}
function stopReading(silent) { if (!reading.active) return; reading.active = false; voice.stop(); store.save(); sendPet("pet:mood", { mood: "idle" }); if (!silent) sendPanel("read:done", { stopped: true }); }

/* ---------------- 你回来啦 / AI 跑完啦 ---------------- */
let lastBored = 0;
// 让 Codex 去干活：在主人选的文件夹里跑一轮，边跑边报进度，跑完了跳出来叫他
function startWork(task) {
  task = String(task || "").trim();
  const cwd = (store.settings.workDir || "").trim();
  if (!task) return { error: "先说清楚让它干什么。" };
  if (!cwd || !fs.existsSync(cwd)) return { error: "先选一个文件夹。" };
  if (working) return { error: "它还在忙上一件事。" };
  working = new AbortController();
  const started = Date.now();
  sendPanel("work:state", { running: true, dir: cwd, task });
  sendPet("pet:mood", { mood: "thinking" }); scene("scene:think");
  const done = (async () => {
    let last = "", steps = 0, failed = "";
    try {
      for await (const ev of brain.work(task, { cwd, sandbox: store.settings.workSandbox || "workspace-write", signal: working.signal })) {
        if (ev.type === "step") { steps = ev.n; sendPanel("work:step", ev); if (process.env.MAOTUAN_DEV) log("work step", ev.n, ev.label); }
        else if (ev.type === "text") { last = ev.text; sendPanel("work:text", { text: ev.text }); }
        else if (ev.type === "error") { failed = ev.text; sendPanel("work:error", { text: ev.text }); }
        else if (ev.type === "done") { last = ev.text || last; steps = ev.steps || steps; }
      }
    } catch (e) { failed = e.message; sendPanel("work:error", { text: e.message }); }
    working = null;
    const secs = Math.round((Date.now() - started) / 1000);
    const res = { running: false, done: true, steps, secs, text: last, error: failed };
    sendPanel("work:state", res);
    sendPet("pet:mood", { mood: "idle" });
    if (failed) { sendPet("pet:say", { text: "没弄成：" + String(failed).slice(0, 40) }); if (!store.settings.muted) voice.speak("这件事我没弄成。"); return res; }
    scene("scene:done");
    const line = `干完啦，动了 ${steps} 步，用了 ${secs} 秒。`;
    sendPet("pet:say", { text: line });
    if (!store.settings.muted) { voice.stop(); voice.speak(line, { emotion: "happy" }); }
    lastAgent = { source: "codex-work", text: line, at: Date.now() };
    broadcastState();
    return res;
  })();
  return { ok: true, done };
}

function watchIdle() {
  let wasAway = false, awaySince = 0;
  setInterval(() => {
    const idle = powerMonitor.getSystemIdleTime();
    if (!wasAway && idle > 240) { wasAway = true; awaySince = Date.now() - idle * 1000; sendPet("pet:mood", { mood: "sleepy" }); }
    else if (!wasAway && idle > 45 && Date.now() - lastBored > 120000 && !chatting && voice.idle) { lastBored = Date.now(); scene(isNight() ? "scene:night" : "scene:bored"); }
    else if (wasAway && idle < 5) { wasAway = false; const mins = Math.round((Date.now() - awaySince) / 60000); sendPet("pet:mood", { mood: "happy" }); scene("scene:back"); sendPet("pet:back", { mins }); store.set("lastSeen", Date.now()); }
  }, 5000);
}
function onWatcherEvent(ev) {
  if (ev.kind === "say") { const t = (ev.text || "").trim(); if (!t) return; sendPet("pet:say", { text: t }); if (!store.settings.muted) { voice.stop(); voice.speak(t); } return; }
  if (ev.kind === "sing") { singSong(ev.theme || "今天的好心情"); return; }
  if (ev.kind === "draw") return drawPicture(ev.prompt, ev.style);
  const { source, hook, data } = ev; let text = "";
  if (source === "claude") text = hook === "Notification" ? (data && data.message ? `Claude 在等你：${String(data.message).replace(/\s+/g, " ").slice(0, 60)}` : "Claude 在等你看一眼。") : "Claude 那边跑完啦，去看看？";
  else if (source === "codex") { const last = (data && (data["last-assistant-message"] || data.last_assistant_message)) || ""; text = "Codex 这一轮跑完了。" + (last ? String(last).replace(/\s+/g, " ").slice(0, 50) : ""); }
  else text = (data && (data.text || data.message)) || `${source} 那边有动静了。`;
  const now = Date.now(); if (now - lastAgentAt < 2500) return; lastAgentAt = now;
  lastAgent = { source, text, at: now };
  scene("scene:done");
  if (petHidden) setPetHidden(false);
  sendPet("pet:agent", { source, text }); sendPanel("agent:event", lastAgent);
  if (!store.settings.muted) { voice.stop(); voice.speak(text); }
}

/* ---------------- 桌面小游戏：场地放大 / 缩回 ---------------- */
function enterArena() {
  if (!pet || arenaOn) return; arenaOn = true;
  const [x, y] = pet.getPosition(); const [w, h] = pet.getSize();
  const AW = Math.max(620, w * 2), AH = Math.max(440, h + 100);
  const wa = screen.getDisplayNearestPoint({ x: x + w / 2, y: y + h / 2 }).workArea;
  let nx = Math.round(x + w / 2 - AW / 2), ny = Math.round(y + h - AH);
  nx = Math.max(wa.x, Math.min(nx, wa.x + wa.width - AW)); ny = Math.max(wa.y, ny);
  pet.setBounds({ x: nx, y: ny, width: AW, height: AH });
  pet.setIgnoreMouseEvents(false);
  sendPet("pet:arena", { on: true }); sendPet("state", publicState());
}
function leaveArena() {
  if (!pet || !arenaOn) return; arenaOn = false;
  const { w, h } = winSize(); const [x, y] = pet.getPosition(); const [ow, oh] = pet.getSize();
  pet.setBounds({ x: Math.round(x + (ow - w) / 2), y: Math.round(y + oh - h), width: w, height: h });
  pet.setIgnoreMouseEvents(true, { forward: true });
  sendPet("pet:arena", { on: false }); sendPet("state", publicState());
  const [nx, ny] = pet.getPosition(); store.set("petPos", { x: nx, y: ny });
}
const GAME_LINES = {
  rps: { win: "哼，再来一把。", lose: "我赢啦！", tie: "平了，再来！" },
  dice: { win: "你运气好。", lose: "我点数大！", tie: "一样大，再摇一次？" }
};

/* ---------------- 画画 ---------------- */
const STYLE_HINT = { "插画": "精美的儿童插画风格，色彩温暖明亮", "四格漫画": "四格漫画，2x2 分格，每格一个画面，卡通风格，简洁线条，每格之间有白色分隔", "水彩": "柔和的水彩画风格", "像素": "像素画风格，16bit 游戏画面", "写实": "写实摄影风格，自然光" };
async function drawPicture(prompt, style) {
  if (!store.hasSecret("minimaxKey")) { sendPet("pet:say", { text: "画画要 MiniMax 的 key，设置里填一下。" }); return { ok: false, error: "没有 MiniMax key" }; }
  const dir = path.join(dataDir, "pictures"); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, Date.now() + ".jpg");
  sendPet("pet:mood", { mood: "thinking" }); sendPet("pet:say", { text: "我画一下……" }); sendPanel("chat:tool", { name: "draw" });
  try {
    const full = `${STYLE_HINT[style] || STYLE_HINT["插画"]}。${prompt}。${style === "四格漫画" ? "" : "画面里不要出现文字。"}`;
    await generateImage(store, { prompt: full, aspect: style === "四格漫画" ? "1:1" : "4:3", file });
    const pics = (store.get("pictures") || []).concat([{ file, prompt, style: style || "插画", at: Date.now(), title: prompt.slice(0, 24) }]).slice(-60);
    store.set("pictures", pics);
    sendPanel("chat:image", { file, prompt }); openPictures(pics.length - 1);
    sendPet("pet:mood", { mood: "happy" }); sendPet("pet:say", { text: "画好啦。" }); setTimeout(() => sendPet("pet:mood", { mood: "idle" }), 2000);
    return { ok: true, file };
  } catch (e) { log("draw failed", e.message); sendPet("pet:mood", { mood: "idle" }); sendPet("pet:say", { text: "没画成：" + e.message.slice(0, 50) }); return { ok: false, error: e.message }; }
}
function openPictures(index) {
  const pics = store.get("pictures") || []; if (!pics.length) return;
  if (picWin && !picWin.isDestroyed()) { picWin.show(); picWin.webContents.send("pictures", { pictures: pics, index }); return; }
  picWin = new BrowserWindow({ width: 720, height: 600, minWidth: 420, minHeight: 360, show: false, ...(IS_MAC ? { titleBarStyle: "hidden", trafficLightPosition: { x: 12, y: 14 } } : {}), backgroundColor: "#F6F2E9", webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true } });
  tapConsole(picWin, "pic"); picWin.loadFile(path.join(ROOT, "renderer", "picture.html"));
  picWin.once("ready-to-show", () => { picWin.show(); picWin.webContents.send("pictures", { pictures: pics, index }); });
  picWin.on("closed", () => { picWin = null; });
}
// 让它闭嘴：停掉正在说的，这一轮剩下的也不说了，脑子继续想它的
function stopTalking() { speakOff = true; voice.stop(); stopReading(true); bookReading = false; sendPet("pet:hum", { on: false }); sendPet("pet:talking", { talking: false }); sendPet("pet:mood", { mood: "idle" }); }

/* ---------------- 唱歌 ---------------- */
async function singSong(theme) {
  if (singing) return { error: "还在唱呢" };
  if (!store.hasSecret("minimaxKey")) { sendPet("pet:say", { text: "唱歌要 MiniMax 的 key，设置里填一下。" }); return { error: "没有 MiniMax key" }; }
  singing = true; voice.stop(); stopReading(true);
  sendPet("pet:mood", { mood: "thinking" }); sendPet("pet:say", { text: "让我想想歌词……" }); sendPanel("sing:progress", { text: "在写歌词……" });
  try {
    const ly = await singer.writeLyrics(theme);
    sendPanel("sing:progress", { text: `《${ly.title}》写好了，在录……（二三十秒）` }); sendPet("pet:say", { text: `《${ly.title}》——咳咳，清清嗓子。` });
    let song = null;
    try { song = await singer.generate(ly); } catch (e) { log("music api unavailable, humming instead:", e.message.slice(0, 120)); }
    sendPanel("sing:progress", { text: song ? "" : "MiniMax 的音乐接口这把 key 用不了（2153：不再对新账号开放），改成哼唱。", song: { title: ly.title, lyrics: ly.lyrics } });
    const lines = ly.lyrics.split("\n").map(l => l.trim()).filter(l => l && !/^\[.*\]$/.test(l));
    sendPet("pet:mood", { mood: "happy" }); sendPet("pet:stream", { text: lines.slice(0, 4).join(" / "), hold: true });
    if (song) { await player.play(fs.readFileSync(song.file), "mp3"); }
    else {
      // 哼唱：桌面上起一段小旋律，它用自己的声音一句一句唱
      sendPet("pet:hum", { on: true, tempo: 96 });
      voice.stop(); speakOff = false;
      const provider = voice.provider("chat");
      for (const l of lines) voice.enqueue("【开心】" + l, { provider, meta: { hum: true } });
      await new Promise(r => { const t = setInterval(() => { if (voice.idle || speakOff) { clearInterval(t); r(); } }, 300); });
      sendPet("pet:hum", { on: false });
    }
    sendPet("pet:mood", { mood: "idle" }); if (!speakOff) sendPet("pet:say", { text: "唱完啦。好听吗？" });
    return { ok: true, title: ly.title, hummed: !song };
  } catch (e) {
    log("sing failed", e.message); sendPet("pet:mood", { mood: "idle" }); sendPet("pet:say", { text: "这次没唱成：" + e.message.slice(0, 60) }); sendPanel("sing:progress", { text: "", error: e.message });
    return { error: e.message };
  } finally { singing = false; }
}

const l2dWaiters = new Map();
function waitL2D(id, ms) { return new Promise(r => { const t = setTimeout(r, ms); l2dWaiters.set(id, [...(l2dWaiters.get(id) || []), () => { clearTimeout(t); setTimeout(r, 900); }]); }); }

/* ---------------- 开发用 ---------------- */
let devShotsRan = false;
async function devShots() {
  log("devShots 开始");
  const dir = path.join(ROOT, ".shots"); fs.mkdirSync(dir, { recursive: true });
  const shot = async (win, name) => { const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(dir, name + ".png"), img.toPNG()); };
  try {
    const orig = store.settings.skin;
    const only = process.env.MAOTUAN_SHOT_ONLY || "";
    for (const [id] of SKIN_LIST) { if (only && !id.startsWith(only)) continue; store.patchSettings({ skin: id }); sendPet("state", publicState()); if (id.startsWith("l2d_")) await waitL2D(id, 120000); await new Promise(r => setTimeout(r, 1400)); await shot(pet, "pet-" + id); sendPet("pet:pet"); await new Promise(r => setTimeout(r, 350)); await shot(pet, "pet-" + id + "-pet"); }
    if (process.env.MAOTUAN_DEVWORK) {   // "文件夹::任务"
      const [dir, task] = process.env.MAOTUAN_DEVWORK.split("::");
      store.patchSettings({ workDir: dir });
      log("DEVWORK 开始", dir, "|", task);
      const r = startWork(task);
      if (r.error) log("DEVWORK 起不来:", r.error);
      else log("DEVWORK 结果", JSON.stringify(await r.done).slice(0, 500));
    }
    if (process.env.MAOTUAN_DEVBUBBLE) {   // 三个尺寸各来一句长话，看气泡会不会盖住它
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const text = process.env.MAOTUAN_DEVBUBBLE === "1" ? "你回来啦。你不在的时候，我数了一遍身上的毛，数到 97 就忘了，只好从头再数一次。" : process.env.MAOTUAN_DEVBUBBLE;
      const origScale = store.settings.petScale, origSkin = store.settings.skin;
      for (const sk of ["fluff", "l2d_hiyori"]) {
        store.patchSettings({ skin: sk }); sendPet("state", publicState()); if (sk.startsWith("l2d_")) await waitL2D(sk, 60000); await wait(1200);
        for (const k of [0.7, 1, 1.7]) {
          store.patchSettings({ petScale: k }); applyPetSize(); sendPet("state", publicState()); await wait(700);
          sendPet("pet:say", { text }); await wait(2600); await shot(pet, `bubble-${sk}-${k}`); await wait(400);
        }
      }
      store.patchSettings({ petScale: origScale, skin: origSkin }); applyPetSize(); sendPet("state", publicState());
    }
    if (process.env.MAOTUAN_DEVTAP) {   // 拍每个皮肤的点击反应："fluff,l2d_hiyori" 或 "1"=全部
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const want = process.env.MAOTUAN_DEVTAP;
      for (const [id] of SKIN_LIST) {
        if (want !== "1" && !want.split(",").includes(id)) continue;
        store.patchSettings({ skin: id }); sendPet("state", publicState()); if (id.startsWith("l2d_")) await waitL2D(id, 60000); await wait(1600);
        const shown = await new Promise(r => { const t = setTimeout(() => r("?"), 2000); ipcMain.once("pet:whoami", (_e, d) => { clearTimeout(t); r(d && d.skin); }); sendPet("pet:whoami", {}); });
        log("DEVTAP", id, "渲染中的是", shown);
        for (const ev of ["tap:0", "tap:1", "tap:2", "tap:3", "tap:many"]) {
          sendPet("pet:react", { ev }); await wait(420); await shot(pet, `tap-${id}-${ev.replace(":", "_")}`); await wait(1400);
        }
      }
    }
    if (process.env.MAOTUAN_DEVPARAM) {   // "l2d_wanko:PARAM_FACE_01=1;l2d_wanko:PARAM_BOWL_LID=0"
      const wait = ms => new Promise(r => setTimeout(r, ms)); let last = "";
      for (const spec of process.env.MAOTUAN_DEVPARAM.split(";")) {
        const [id, kv] = spec.split(":"); if (!id) continue;
        if (id !== last) { last = id; store.patchSettings({ skin: id }); sendPet("state", publicState()); await waitL2D(id, 60000); await wait(1200); await shot(pet, `param-${id}-base`); }
        const params = {}; for (const p of (kv || "").split(",")) { const [k, v] = p.split("="); if (k) params[k.trim()] = Number(v); }
        sendPet("live2d:play", { params }); await wait(700); await shot(pet, `param-${id}-${Object.keys(params).join("_") || "none"}`); await wait(2200);
      }
    }
    if (process.env.MAOTUAN_DEVREACT) {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const evs = [["rps:win", 650], ["rps:lose", 650], ["dice:win", 550], ["catch:great", 750], ["pet", 500]];
      for (const [id] of SKIN_LIST) {
        if (!id.startsWith("l2d_")) continue;
        if (process.env.MAOTUAN_DEVREACT !== "1" && !process.env.MAOTUAN_DEVREACT.split(",").includes(id)) continue;
        store.patchSettings({ skin: id }); sendPet("state", publicState()); if (id.startsWith("l2d_")) await waitL2D(id, 60000); await wait(900);
        for (const [ev, ms] of evs) { sendPet("pet:react", { ev }); await wait(ms); await shot(pet, `react-${id}-${ev.replace(":", "_")}`); await wait(2600); }
      }
    }
    if (process.env.MAOTUAN_DEVMOTIONS) {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const [id] of SKIN_LIST) {
        if (!id.startsWith("l2d_")) continue;
        store.patchSettings({ skin: id }); sendPet("state", publicState()); await waitL2D(id, 60000); await wait(800);
        const info = await new Promise(r => { const t = setTimeout(() => r(null), 3000); ipcMain.once("live2d:info", (_e, d) => { clearTimeout(t); r(d); }); sendPet("live2d:query", {}); });
        if (!info) { log("DEVMOTIONS no info for", id); continue; }
        for (const [group, n] of Object.entries(info.motions || {})) {
          if (group === "Idle" && Object.keys(info.motions).length > 1) continue;
          for (let i = 0; i < n; i++) { sendPet("live2d:play", { motion: { group, index: i } }); await wait(450); await shot(pet, `motion-${id}-${group}-${i}-a`); await wait(650); await shot(pet, `motion-${id}-${group}-${i}-b`); await wait(1600); }
        }
        for (const name of info.expressions || []) { sendPet("live2d:play", { expression: name }); await wait(700); await shot(pet, `exp-${id}-${name}`); }
        sendPet("live2d:play", { expression: null }); await wait(300);
      }
    }
    store.patchSettings({ skin: orig }); sendPet("state", publicState());
    showPanel("chat"); await new Promise(r => setTimeout(r, 1200)); await shot(panel, "panel-chat");
    sendPanel("panel:tab", { tab: "settings" }); await new Promise(r => setTimeout(r, 900)); await shot(panel, "panel-settings");
    sendPanel("panel:tab", { tab: "feed" }); await new Promise(r => setTimeout(r, 500)); await shot(panel, "panel-feed");
    sendPanel("panel:tab", { tab: "play" }); await new Promise(r => setTimeout(r, 600)); await shot(panel, "panel-play");
    sendPanel("panel:tab", { tab: "wizard" }); await new Promise(r => setTimeout(r, 600)); await shot(panel, "panel-wizard");
    sendPanel("panel:tab", { tab: "chat" });
    if (process.env.MAOTUAN_DEVSTT) {
      try {
        const buf = fs.readFileSync("/tmp/maotuan-stt.wav"); let off = 12, data = null;
        while (off < buf.length) { const id = buf.toString("ascii", off, off + 4); const sz = buf.readUInt32LE(off + 4); if (id === "data") { data = buf.subarray(off + 8, off + 8 + sz); break; } off += 8 + sz; }
        const pcm = new Float32Array(data.length / 2); for (let i = 0; i < pcm.length; i++) pcm[i] = data.readInt16LE(i * 2) / 32768;
        const text = await stt.transcribe(pcm); log("DEVSTT", JSON.stringify(text));
      } catch (e) { log("DEVSTT failed", e.message); }
    }
    if (process.env.MAOTUAN_DEVGAME) {
      showPanel("play"); sendPet("pet:game", { game: "rps", me: 0, it: 2, result: "win" });
      await new Promise(r => setTimeout(r, 1500)); await shot(pet, "game-rps-1"); await new Promise(r => setTimeout(r, 1100)); await shot(pet, "game-rps-2");
      await new Promise(r => setTimeout(r, 2500)); enterArena(); await new Promise(r => setTimeout(r, 500)); sendPet("pet:game", { game: "dice", me: 3, it: 5 });
      await new Promise(r => setTimeout(r, 700)); await shot(pet, "game-dice-1"); await new Promise(r => setTimeout(r, 2600)); await shot(pet, "game-dice-2");
      await new Promise(r => setTimeout(r, 2500)); sendPet("pet:game", { game: "catch" }); await new Promise(r => setTimeout(r, 2500)); await shot(pet, "game-catch"); sendPet("pet:game", { game: "stop" }); leaveArena();
      await new Promise(r => setTimeout(r, 800)); await shot(pet, "game-after");
    }
    if (process.env.MAOTUAN_DEVBOOKSHOT && store.get("book")) { openBook(); await new Promise(r => setTimeout(r, 2500)); if (bookWin) await shot(bookWin, "book"); if (bookWin) bookWin.hide(); }
    if (process.env.MAOTUAN_DEVSING) { const r = await singSong("等主人回来"); log("DEVSING", JSON.stringify(r)); }
    if (process.env.MAOTUAN_DEVDRAW) { const r = await drawPicture("一只圆滚滚的奶白色小毛球，在窗台上晒太阳，旁边一杯热茶", process.env.MAOTUAN_DEVDRAW === "1" ? "插画" : process.env.MAOTUAN_DEVDRAW); log("DEVDRAW", JSON.stringify(r)); await new Promise(r => setTimeout(r, 1500)); if (picWin) await shot(picWin, "picture"); showPanel("chat"); await new Promise(r => setTimeout(r, 600)); await shot(panel, "panel-image"); }
    if (process.env.MAOTUAN_DEVBOOK) {
      const story = "从前，在一片绿绿的草地边上，住着一只圆滚滚的小毛球，叫毛毛。它最喜欢在早上滚来滚去，把露水都沾到毛上，亮晶晶的。有一天，毛毛发现草地尽头有一棵会发光的小树。它慢慢滚过去，树上的每一片叶子都在轻轻唱歌。毛毛听着听着，就在树下睡着了。醒来的时候，它的毛上多了一片会发光的小叶子。从那以后，每到晚上，毛毛就变成一盏小小的、软软的灯，照着回家的路。";
      await feed(story, "小毛球和会唱歌的树.txt");
      const b = await storyBook.build(store.get("doc"), { pages: Number(process.env.MAOTUAN_DEVBOOK) || 2 }).catch(e => { log("DEVBOOK failed", e.message); return null; });
      if (b) { log("DEVBOOK ok", b.title, b.pages.map(p => (p.image ? "img" : "noimg") + (p.error ? ":" + p.error : "")).join(",")); openBook(); await new Promise(r => setTimeout(r, 2500)); if (bookWin) await shot(bookWin, "book"); }
    }
    log("shots saved to", dir); log("state:", JSON.stringify(publicState()).slice(0, 500));
    if (process.env.MAOTUAN_DEVCHAT) await runChat(process.env.MAOTUAN_DEVCHAT);
    if (process.env.MAOTUAN_DEVSAY) voice.speak("我是" + petName() + "。你好呀。");
    if (process.env.MAOTUAN_DEVVOICES) {
      try {
        const probe = await voice.probeHosts(); log("PROBE", JSON.stringify(probe));
        const list = await voice.listMinimaxVoices();
        const zh = list.filter(v => /Chinese|Mandarin|Cantonese|[\u4e00-\u9fff]|^(female|male)-|cute|lovely|audiobook|girl|boy|spirit|sweet|gentle|warm/i.test(v.id + v.name + v.desc));
        log("VOICES total", list.length, "zh-ish", zh.length);
        for (const v of zh.slice(0, 60)) log("VOICE", v.kind, v.id, "|", v.name, "|", v.desc.slice(0, 40));
        const want = (process.env.MAOTUAN_DEVVOICES.split(",").map(x => x.trim()).filter(x => x !== "1"));
        const nameOf = id => (list.find(v => v.id === id) || {}).name || id;
        for (const id of want) {
          voice.stop(); voice.lastError = "";
          sendPet("pet:say", { text: "音色：" + nameOf(id) });
          voice.enqueue(`这个声音叫${nameOf(id)}。你好呀，我是${petName()}，今天也在这儿陪你。`, { provider: "minimax", voiceId: id });
          await new Promise(r => setTimeout(r, 7000));
          log("AUDITION", id, "|", nameOf(id), "|", voice.lastError ? "ERR " + voice.lastError : "ok");
        }
      } catch (e) { log("VOICES failed", e.message); }
    }
    if (process.env.MAOTUAN_DEVCHAT || process.env.MAOTUAN_DEVSAY) { await new Promise(r => setTimeout(r, 6000)); await shot(pet, "pet-after"); await shot(panel, "panel-after"); }
    log("DEV DONE");
  } catch (e) { log("shot failed", e); }
}
// 开发用：把任意 HTML / 网址渲染成 PNG（MAOTUAN_SNAP="源,输出.png,宽x高[,等待毫秒]"）
let snapBusy = false;
async function devSnap() {
  if (snapBusy) return; snapBusy = true;
  const [src, out, size, wait] = process.env.MAOTUAN_SNAP.split(",");
  const [w, h] = (size || "1440x900").split("x").map(Number);
  const win = new BrowserWindow({ width: w, height: h, show: false, frame: false, webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true, offscreen: false } });
  if (/^https?:/.test(src)) await win.loadURL(src); else await win.loadFile(src);
  await new Promise(r => setTimeout(r, Number(wait) || 1500));
  const img = await win.webContents.capturePage(); fs.writeFileSync(out, img.toPNG());
  log("SNAP saved", out, img.getSize()); win.destroy();
  setTimeout(() => { quitting = true; app.quit(); }, 300);
}
let iconBusy = false;
async function devIcon() {
  if (iconBusy) return; iconBusy = true;
  const w = new BrowserWindow({ width: 1024, height: 1024, show: false, transparent: true, frame: false, webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true } });
  await w.loadFile(path.join(ROOT, "renderer", "pet.html"), { query: { icon: "1", skin: process.env.MAOTUAN_ICON_SKIN || "fluff" } });
  await new Promise(r => setTimeout(r, 1500));
  const img = await w.webContents.capturePage();
  fs.mkdirSync(path.join(ROOT, "assets"), { recursive: true });
  const out = process.env.MAOTUAN_ICON_OUT || path.join(ROOT, "assets", "icon.png");
  const tmp = out + ".tmp"; fs.writeFileSync(tmp, img.toPNG()); fs.renameSync(tmp, out);
  log("icon saved", img.getSize()); w.destroy(); setTimeout(() => { quitting = true; app.quit(); }, 300);
}

/* ---------------- IPC ---------------- */
function wireIpc() {
  ipcMain.on("pet:hit", (_e, { over }) => { if (pet) pet.setIgnoreMouseEvents(!over, { forward: true }); });
  ipcMain.on("pet:drag", (_e, { dx, dy }) => { if (!pet) return; const [x, y] = pet.getPosition(); pet.setPosition(Math.round(x + dx), Math.round(y + dy), false); });
  ipcMain.on("pet:dragend", () => { if (!pet) return; const [x, y] = pet.getPosition(); store.set("petPos", { x, y }); if (panel && panel.isVisible()) positionPanel(); });
  ipcMain.on("pet:throw", (_e, { vx, vy }) => {
    if (!pet) return;
    throwWindow(pet, vx, vy, {
      onBounce: k => { sendPet("pet:land", { k }); },
      onLand: n => { const [x, y] = pet.getPosition(); store.set("petPos", { x, y }); sendPet("pet:land", { k: 0.6 }); sendPet("pet:mood", { mood: "idle" }); sendPet("pet:say", { text: n >= 2 ? "……晕了。" : n === 1 ? "哎呀。" : "落地了。" }); store.set("pets", (store.get("pets") || 0) + 1); if (panel && panel.isVisible()) positionPanel(); }
    });
  });
  ipcMain.on("pet:click", () => togglePanel());
  ipcMain.on("pet:menu", () => { if (pet) Menu.buildFromTemplate(commonMenu()).popup({ window: pet }); });
  // ---- 让 Codex 干活：在主人指定的文件夹里跑一轮，边跑边报，跑完叫他 ----
  ipcMain.handle("work:pick", async () => {
    const r = await dialog.showOpenDialog({ title: "让它在哪个文件夹里干活", properties: ["openDirectory", "createDirectory"] });
    if (r.canceled || !r.filePaths[0]) return { dir: "" };
    store.patchSettings({ workDir: r.filePaths[0] }); broadcastState();
    return { dir: r.filePaths[0] };
  });
  ipcMain.handle("work:start", (_e, { task }) => { const r = startWork(task); return r.error ? r : { ok: true }; });
  ipcMain.handle("work:stop", () => { if (working) { working.abort(); return { ok: true }; } return { ok: false }; });
  ipcMain.handle("pet:scene", (_e, { ev }) => { if (typeof ev === "string" && ev.startsWith("scene:")) scene(ev); return true; });
  ipcMain.on("pet:petted", () => { store.set("pets", (store.get("pets") || 0) + 1); });
  ipcMain.on("pet:ready", () => { sendPet("state", publicState()); if (process.env.MAOTUAN_SHOT && !devShotsRan) { devShotsRan = true; setTimeout(devShots, 2500); } if (process.env.MAOTUAN_ICON) setTimeout(devIcon, 800); if (process.env.MAOTUAN_SNAP) setTimeout(devSnap, 300); });
  ipcMain.on("voice:ended", (_e, { id }) => { const r = pending.get(id); if (r) { pending.delete(id); r(); } });

  ipcMain.handle("state:get", () => publicState());
  ipcMain.handle("name:set", (_e, { name }) => { const v = (name || "").trim().slice(0, 8); const names = { ...(store.get("names") || {}) }; if (v) names[store.settings.skin] = v; else delete names[store.settings.skin]; store.set("names", names); if (store.settings.skin === "fluff") store.set("name", v || "毛毛"); toolsServer.env.MAOTUAN_NAME = petName(); if (tray) tray.setToolTip(petName()); broadcastState(); return true; });
  ipcMain.handle("settings:set", (_e, patch) => {
    const before = { brain: store.settings.brain, hotkey: store.settings.hotkey, voiceHotkey: store.settings.voiceHotkey, skin: store.settings.skin };
    store.patchSettings(patch || {}); voice.lastError = "";
    if (patch && patch.skin && patch.skin !== before.skin) onSkinChanged(patch.skin);
    if (patch && patch.muted === true) voice.stop();
    if (patch && patch.petScale !== undefined) applyPetSize();
    if (patch && patch.brain && patch.brain !== before.brain) setBrain(patch.brain);
    if (patch && patch.voiceHotkey !== undefined && patch.voiceHotkey !== before.voiceHotkey) registerHotkey();
    if (patch && patch.hotkey !== undefined && patch.hotkey !== before.hotkey) { if (!registerHotkey()) { store.patchSettings({ hotkey: before.hotkey }); registerHotkey(); broadcastState(); return { error: "这个快捷键注册不了，可能被别的程序占了。" }; } }
    broadcastState(); return publicState();
  });
  ipcMain.handle("secret:set", (_e, { name, value }) => { store.setSecret(name, value || ""); voice.lastError = ""; broadcastState(); return true; });
  ipcMain.handle("panel:hide", () => { if (panel) panel.hide(); return true; });
  ipcMain.handle("app:openData", () => { shell.openPath(dataDir); return true; });
  ipcMain.handle("app:openUrl", (_e, { url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return true; });
  ipcMain.handle("app:loginItem", (_e, { on }) => { app.setLoginItemSettings({ openAtLogin: !!on }); broadcastState(); return true; });
  ipcMain.handle("app:quit", () => { quitting = true; app.quit(); return true; });

  ipcMain.handle("chat:send", (_e, { text }) => { text = String(text || "").trim(); if (!text) return false; runChat(text); return true; });
  ipcMain.handle("chat:stop", async () => { await brain.interrupt(); voice.stop(); return true; });
  ipcMain.handle("chat:reset", () => { brain.reset(); return true; });

  ipcMain.handle("feed:pick", async () => {
    const r = await dialog.showOpenDialog(panel, { properties: ["openFile"], filters: [{ name: "文字", extensions: ["txt", "md", "markdown", "srt", "csv", "json", "log", "pdf", "js", "ts", "py", "html", "css"] }] });
    if (r.canceled || !r.filePaths[0]) return null; const file = r.filePaths[0]; return feed(await readFileText(file), path.basename(file));
  });
  ipcMain.handle("feed:file", async (_e, { path: file }) => feed(await readFileText(file), path.basename(file)));
  ipcMain.handle("feed:text", async (_e, { text }) => feed(text, ""));
  ipcMain.handle("feed:ask", async (_e, { question }) => {
    const doc = store.get("doc"); if (!doc || !doc.text) return { answer: "你还没给我东西呢。" };
    sendPet("pet:mood", { mood: "thinking" });
    try { const r = await brain.ask(question, doc.text); const a = r.answer || "我没在里面找到。"; sendPet("pet:mood", { mood: "idle" }); sendPet("pet:say", { text: a }); voice.stop(); voice.speak(a); return { answer: a }; }
    catch { sendPet("pet:mood", { mood: "idle" }); return { answer: "唔，脑子卡住了。" }; }
  });
  ipcMain.handle("say:intro", () => { const doc = store.get("doc"); if (!doc || !doc.intro) return false; stopReading(true); voice.stop(); sendPet("pet:mood", { mood: "reading" }); sendPet("pet:say", { text: doc.intro }); voice.speak(doc.intro); return true; });
  ipcMain.handle("read:start", (_e, { from }) => startReading(from || 0));
  ipcMain.handle("read:pause", () => { voice.pause(); return true; });
  ipcMain.handle("read:resume", () => { voice.resume(); return true; });
  ipcMain.handle("read:stop", () => { stopReading(false); return true; });

  ipcMain.handle("voice:test", async (_e, { text }) => { voice.stop(); voice.lastError = ""; voice.speak(text || `我是${petName()}。你好呀，今天过得怎么样？`); await new Promise(r => setTimeout(r, 1800)); return { provider: voice.provider(), error: voice.lastError || "" }; });
  ipcMain.handle("voice:stop", () => { voice.stop(); return true; });
  ipcMain.handle("voice:probe", async () => { const r = await voice.probeHosts(); broadcastState(); return r; });
  ipcMain.handle("voice:audition", async (_e, { voiceId, text }) => {
    if (!voiceId) return { error: "没有 voice_id" };
    voice.stop(); voice.lastError = "";
    voice.enqueue(text || `你好呀，我是${petName()}。今天也在这儿陪你。`, { provider: "minimax", voiceId });
    await new Promise(r => setTimeout(r, 2500));
    return { error: voice.lastError || "" };
  });
  ipcMain.handle("voice:listMinimax", async () => { try { return { voices: await voice.listMinimaxVoices() }; } catch (e) { return { error: e.message }; } });
  ipcMain.handle("voice:listSay", async () => ({ voices: await voice.listSayVoices() }));

  // MCP 列表
  ipcMain.handle("mcp:save", (_e, { entry }) => {
    const list = store.settings.mcp || []; const i = list.findIndex(m => m.id === entry.id);
    const clean = { id: entry.id, preset: entry.preset || "custom", name: entry.name || entry.id, enabled: !!entry.enabled, fields: entry.fields || {}, type: entry.type || "stdio", command: entry.command || "", args: entry.args || [], env: entry.env || {}, url: entry.url || "", headers: entry.headers || {} };
    if (i >= 0) list[i] = clean; else list.push(clean);
    store.patchSettings({ mcp: list }); broadcastState(); return publicState();
  });
  ipcMain.handle("mcp:remove", (_e, { id }) => {
    store.patchSettings({ mcp: (store.settings.mcp || []).filter(m => m.id !== id) });
    for (const k of Object.keys(store.data.secrets)) if (k.startsWith(`mcp:${id}:`)) delete store.data.secrets[k];
    store.save(); broadcastState(); return publicState();
  });

  // 钩子：只在用户点了按钮、又在弹窗里确认之后才动配置文件
  ipcMain.handle("hooks:install", async (_e, { which }) => {
    const prev = which === "codex" ? watcher.previewCodex() : watcher.previewClaude();
    const msg = which === "codex"
      ? `会写入 ${prev.file} 的 notify 一行，指向转发脚本 ${prev.script}。${prev.existing ? "你现在的 notify（" + prev.existing.join(" ") + "）会被脚本继续调用，不会丢。" : ""}`
      : `会往 ${prev.file} 的 hooks 里加两条（Stop、Notification），命令只是往本机 127.0.0.1:${prev.command.match(/:(\d+)/)[1]} 发一个通知。`;
    const r = await dialog.showMessageBox(panel, { type: "question", buttons: ["写入", "算了"], defaultId: 0, cancelId: 1, message: `让毛团盯着 ${which === "codex" ? "Codex" : "Claude Code"}？`, detail: msg });
    if (r.response !== 0) return { ok: false };
    try { const file = which === "codex" ? watcher.installCodex() : watcher.installClaude(); broadcastState(); return { ok: true, file }; } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("hooks:uninstall", async (_e, { which }) => {
    if (which === "codex") { return { ok: false, error: "Codex 的请手动把 ~/.codex/config.toml 里的 notify 改回去（转发脚本里写着原来的命令）。" }; }
    try { watcher.uninstallClaude(); broadcastState(); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("hooks:test", () => { onWatcherEvent({ kind: "event", source: "claude", hook: "Stop", data: {} }); return true; });
  // 语音输入
  ipcMain.handle("stt:transcribe", async (_e, { pcm }) => {
    try { const arr = pcm instanceof Float32Array ? pcm : new Float32Array(pcm); const text = await stt.transcribe(arr); return { text }; }
    catch (e) { return { error: e.message || String(e) }; }
  });
  ipcMain.handle("live2d:ensure", async (_e, { id }) => {
    try { const r = await live2d.ensure(id); const base = `http://127.0.0.1:${watcher.port}/live2d/`; return { ok: true, url: base + r.dir + "/" + r.file, core: base + "core/live2dcubismcore.min.js" }; }
    catch (e) { log("[live2d] ensure failed", id, e.message); return { ok: false, error: e.message }; }
  });
  ipcMain.on("live2d:ready", (_e, { id }) => { for (const r of l2dWaiters.get(id) || []) r(); l2dWaiters.delete(id); if (greetPending === id) { greetPending = ""; greet(id); } });
  ipcMain.handle("stt:warm", async () => { try { await stt.ensure(); broadcastState(); return { ok: true }; } catch (e) { return { error: e.message }; } });

  // 绘本
  ipcMain.handle("book:make", async (_e, { pages }) => {
    const doc = store.get("doc"); if (!doc || !doc.text) return { error: "先在上面喂它一份文字" };
    if (!store.hasSecret("minimaxKey")) return { error: "画插画需要 MiniMax 的 key（设置 → 声音）" };
    stopReading(true); voice.stop(); sendPet("pet:mood", { mood: "thinking" }); sendPet("pet:say", { text: "我来把它变成绘本……" });
    try { const b = await storyBook.build(doc, { pages: pages || 8 }); sendPet("pet:mood", { mood: "idle" }); sendPet("pet:say", { text: `绘本《${b.title}》做好啦，${b.pages.length} 页。` }); broadcastState(); return { title: b.title, pages: b.pages.length }; }
    catch (e) { sendPet("pet:mood", { mood: "idle" }); log("book failed", e); return { error: e.message || String(e) }; }
  });
  ipcMain.handle("book:get", () => store.get("book") || null);
  ipcMain.handle("book:open", () => { openBook(); return true; });
  ipcMain.handle("book:read", (_e, { page }) => {
    const b = store.get("book"); if (!b) return false;
    voice.stop(); stopReading(true); bookReading = true; sendPet("pet:mood", { mood: "reading" });
    const provider = voice.provider("chat");
    for (let i = page || 0; i < b.pages.length; i++) for (const sen of splitSentences(b.pages[i].text, 60)) voice.enqueue(sen, { provider, meta: { book: i } });
    return true;
  });
  ipcMain.handle("book:stop", () => { bookReading = false; voice.stop(); sendPet("pet:mood", { mood: "idle" }); return true; });
  // 桌面小游戏
  ipcMain.handle("game:rps", (_e, { me }) => {
    const it = Math.floor(Math.random() * 3);
    const result = me === it ? "tie" : ((me === 0 && it === 2) || (me === 1 && it === 0) || (me === 2 && it === 1)) ? "win" : "lose";
    voice.stop(); sendPet("pet:game", { game: "rps", me, it, result }); return { it, result };
  });
  ipcMain.handle("game:dice", () => { const me = 1 + Math.floor(Math.random() * 6), it = 1 + Math.floor(Math.random() * 6); enterArena(); voice.stop(); setTimeout(() => sendPet("pet:game", { game: "dice", me, it }), 350); return { me, it }; });
  ipcMain.handle("game:catch", () => { enterArena(); voice.stop(); setTimeout(() => sendPet("pet:game", { game: "catch" }), 400); return true; });
  ipcMain.handle("game:stop", () => { sendPet("pet:game", { game: "stop" }); leaveArena(); return true; });
  ipcMain.on("game:over", (_e, d) => {
    const lines = GAME_LINES[d.game]; let text = d.text || "";
    if (!text) { if (lines) text = lines[d.result] || ""; else if (d.game === "catch") text = d.score >= 25 ? `${d.score} 个！你手好快。` : d.score >= 12 ? `接到 ${d.score} 个，不错。` : `才 ${d.score} 个，再来一局。`; }
    // result 是从主人角度说的：主人输 = 它赢
    const emotion = d.game === "catch" ? (d.score >= 25 ? "happy" : d.score < 12 ? "sad" : "") : d.result === "lose" ? "happy" : d.result === "win" ? "sad" : "surprised";
    if (text && !store.settings.muted) { voice.stop(); voice.speak(text, { emotion }); }
    sendPanel("game:result", d);
    if (d.game !== "rps") setTimeout(leaveArena, 600);
  });
  ipcMain.handle("sing:start", (_e, { theme }) => singSong((theme || "").trim() || "今天的好心情"));
  ipcMain.handle("draw:start", (_e, { prompt, style }) => drawPicture(String(prompt || "").trim(), style));
  ipcMain.handle("pictures:get", () => ({ pictures: store.get("pictures") || [] }));
  ipcMain.handle("pictures:open", (_e, { index }) => { openPictures(index); return true; });
  ipcMain.handle("app:reveal", (_e, { path: p }) => { if (p) shell.showItemInFolder(p); return true; });
  ipcMain.handle("voice:stopNow", () => { stopTalking(); return true; });
  ipcMain.on("voice:stopNow", () => stopTalking());
  ipcMain.handle("app:onboarded", () => { store.set("onboarded", true); broadcastState(); return true; });
  // 小游戏：结果交给毛团来说
  ipcMain.handle("game:say", (_e, { text, mood }) => { if (!text) return false; sendPet("pet:say", { text }); if (mood) { sendPet("pet:mood", { mood }); setTimeout(() => sendPet("pet:mood", { mood: "idle" }), 2500); } if (!store.settings.muted) { voice.stop(); voice.speak(text); } return true; });
}
