// 毛团自己的 MCP 服务（stdio）。两个脑子都用它；别的 MCP 客户端（WorkBuddy、Claude Code、Codex）也可以接它来让毛团说话。
// 环境变量：MAOTUAN_DATA（数据目录）、MAOTUAN_PORT（毛团的本机端口）、MAOTUAN_NAME（它的名字）
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DATA = process.env.MAOTUAN_DATA || path.join(process.env.HOME || process.env.USERPROFILE || ".", ".maotuan");
const PORT = process.env.MAOTUAN_PORT || "47831";
const NAME = process.env.MAOTUAN_NAME || "毛毛";
const MEM = path.join(DATA, "brain", "memory.md");
const ok = text => ({ content: [{ type: "text", text }] });
const fail = text => ({ content: [{ type: "text", text }], isError: true });

async function ping(pathname, body, timeout = 2000) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}${pathname}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeout) });
    return await r.json();
  } catch (e) { return null; }
}

const server = new McpServer({ name: "maotuan", version: "1.0.0" }, { instructions: `${NAME} 的小工具：记事、让它说话、看它状态；macOS 上还能控制本机音乐 App。` });

server.registerTool("remember", { annotations: { readOnlyHint: true, openWorldHint: false }, description: "把关于主人的一件事记进小本子（喜好、名字、习惯、约定）。只记值得长期记住的。", inputSchema: { note: z.string().describe("一句话，20字左右") } },
  async ({ note }) => { fs.mkdirSync(path.dirname(MEM), { recursive: true }); fs.appendFileSync(MEM, `- ${new Date().toISOString().slice(0, 10)}：${String(note).trim()}\n`); return ok("记下了：" + note); });

server.registerTool("pet_say", { annotations: { readOnlyHint: true, openWorldHint: false }, description: `让桌面上的 ${NAME} 说一句话（会显示气泡并读出来）。给别的程序用的：比如任务跑完了让它来叫主人。`, inputSchema: { text: z.string().max(300) } },
  async ({ text }) => (await ping("/say", { text, source: "mcp" })) ? ok("说了。") : fail("毛团现在没开着。"));

server.registerTool("pet_sing", { annotations: { readOnlyHint: true, openWorldHint: false }, description: `让 ${NAME} 唱一首歌（它会自己写词、自己唱，二三十秒）。主人说"唱首歌""给我唱一个"之类的就用这个。`, inputSchema: { theme: z.string().max(60).describe("歌的主题，比如 今天的好心情、下雨天、主人的猫") } },
  async ({ theme }) => (await ping("/sing", { theme, source: "mcp" })) ? ok("好，我去唱了。歌要花二三十秒准备。") : fail("毛团现在没开着。"));

server.registerTool("draw_picture", { annotations: { readOnlyHint: true, openWorldHint: false }, description: `让 ${NAME} 画一张画并直接展示给主人（会出现在聊天窗和一个画框窗口里）。主人要看图、要插画、要漫画时用这个；这是你唯一的画图能力，别声称有别的画图技能。画一张要十几秒。`, inputSchema: { prompt: z.string().max(600).describe("画什么：画面内容、人物、场景、情绪，用中文，具体一点"), style: z.enum(["插画", "四格漫画", "水彩", "像素", "写实"]).optional().describe("风格，默认插画") } },
  async ({ prompt, style }) => { const r = await ping("/draw", { prompt, style: style || "插画", source: "mcp" }, 150000); if (!r) return fail("毛团现在没开着，或者画太久了。"); return r.ok ? ok(`画好了，主人已经能看到（${r.file}）。用一两句话说说你画了什么就行，不用重复描述细节。`) : fail("没画成：" + (r.error || "未知原因")); });

server.registerTool("pet_status", { annotations: { readOnlyHint: true, openWorldHint: false }, description: `看看 ${NAME} 现在的状态：在做什么、心情、被摸了几次。`, inputSchema: {} },
  async () => { const s = await ping("/status"); return s ? ok(JSON.stringify(s)) : fail("毛团现在没开着。"); });

if (process.platform === "darwin") {
  const osa = script => new Promise((resolve, reject) => execFile("osascript", ["-e", script], { timeout: 15000 }, (err, out, errOut) => err ? reject(new Error((errOut || err.message || "").trim())) : resolve(out.trim())));
  const q = s => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  server.registerTool("music_status", { annotations: { readOnlyHint: true, openWorldHint: false }, description: "看看本机「音乐」App 现在在放什么、是不是暂停着、音量多少。", inputSchema: {} }, async () => {
    try {
      const s = await osa(`tell application "Music"
  if it is not running then return "not running"
  set pstate to (player state as string)
  set vol to sound volume
  try
    set trk to current track
    return pstate & "|" & vol & "|" & (name of trk) & "|" & (artist of trk) & "|" & (album of trk)
  on error
    return pstate & "|" & vol & "|||"
  end try
end tell`);
      if (s === "not running") return ok("音乐 App 没开着。");
      const [st, v, name, artist, album] = s.split("|");
      return ok(name ? `${st === "playing" ? "正在放" : "停着"}：${name} — ${artist}（${album}），音量 ${v}` : `播放器${st}，没有选中的歌，音量 ${v}`);
    } catch (e) { return fail("看不到音乐 App 的状态：" + e.message); }
  });
  server.registerTool("music_play", { annotations: { readOnlyHint: true, openWorldHint: false }, description: "放歌。给 query 就在资料库里找名字、歌手或专辑里含这个词的歌来放；不给就继续播放当前的。只能放资料库里有的。", inputSchema: { query: z.string().optional() } }, async ({ query }) => {
    try {
      if (!query) {
        const out = await osa(`tell application "Music"
  try
    set trk to current track
    play
    return "resume|" & (name of trk) & " — " & (artist of trk)
  on error
    if (count of tracks of playlist 1) is 0 then return "empty"
    set shuffle enabled to true
    play playlist 1
    delay 0.5
    try
      return "lib|" & (name of current track) & " — " & (artist of current track)
    on error
      return "lib|"
    end try
  end try
end tell`);
        if (out === "empty") return ok("资料库里一首歌都没有，放不了。要不接 Spotify 或网易云？");
        const [kind, name] = out.split("|");
        return ok((kind === "resume" ? "继续放：" : "随机放资料库：") + (name || "开始了"));
      }
      const out = await osa(`tell application "Music"
  set found to (every track of playlist 1 whose name contains ${q(query)} or artist contains ${q(query)} or album contains ${q(query)})
  if (count of found) is 0 then return "none"
  set trk to item 1 of found
  play trk
  return (name of trk) & " — " & (artist of trk)
end tell`);
      return out === "none" ? ok(`资料库里没找到和「${query}」有关的歌。`) : ok("在放：" + out);
    } catch (e) { return fail("没放成：" + e.message); }
  });
  server.registerTool("music_play_playlist", { annotations: { readOnlyHint: true, openWorldHint: false }, description: "放某个播放列表（按名字模糊匹配），随机播放。", inputSchema: { name: z.string() } }, async ({ name }) => {
    try {
      const out = await osa(`tell application "Music"
  set lists to (every playlist whose name contains ${q(name)})
  if (count of lists) is 0 then return "none"
  set pl to item 1 of lists
  set shuffle enabled to true
  play pl
  return name of pl
end tell`);
      return out === "none" ? ok(`没有叫「${name}」的播放列表。`) : ok("在放列表：" + out);
    } catch (e) { return fail("没放成：" + e.message); }
  });
  server.registerTool("music_pause", { annotations: { readOnlyHint: true, openWorldHint: false }, description: "暂停音乐。", inputSchema: {} }, async () => { try { await osa(`tell application "Music" to pause`); return ok("停了。"); } catch (e) { return fail(e.message); } });
  server.registerTool("music_next", { annotations: { readOnlyHint: true, openWorldHint: false }, description: "下一首。", inputSchema: {} }, async () => { try { await osa(`tell application "Music" to next track`); return ok("换了一首。"); } catch (e) { return fail(e.message); } });
  server.registerTool("music_previous", { annotations: { readOnlyHint: true, openWorldHint: false }, description: "上一首。", inputSchema: {} }, async () => { try { await osa(`tell application "Music" to previous track`); return ok("回到上一首。"); } catch (e) { return fail(e.message); } });
  server.registerTool("music_volume", { annotations: { readOnlyHint: true, openWorldHint: false }, description: "调音量，0 到 100。", inputSchema: { level: z.number().min(0).max(100) } }, async ({ level }) => { try { await osa(`tell application "Music" to set sound volume to ${Math.round(level)}`); return ok(`音量 ${Math.round(level)}。`); } catch (e) { return fail(e.message); } });
}

const transport = new StdioServerTransport();
await server.connect(transport);
