import { execFile } from "node:child_process";
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// 本机「音乐」App：用 AppleScript 控制，不需要任何账号
function osa(script) {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message || "").trim()));
      else resolve(stdout.trim());
    });
  });
}
const q = s => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
const ok = text => ({ content: [{ type: "text", text }] });
const fail = text => ({ content: [{ type: "text", text }], isError: true });

async function status() {
  const out = await osa(`tell application "Music"
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
  return out;
}

export function appleMusicServer() {
  const tools = [
    tool("music_status", "看看本机「音乐」App 现在在放什么、是不是暂停着、音量多少。", {},
      async () => {
        try {
          const s = await status();
          if (s === "not running") return ok("音乐 App 没开着。");
          const [st, v, name, artist, album] = s.split("|");
          return ok(name ? `${st === "playing" ? "正在放" : "停着"}：${name} — ${artist}（${album}），音量 ${v}` : `播放器${st}，没有选中的歌，音量 ${v}`);
        } catch (e) { return fail("看不到音乐 App 的状态：" + e.message); }
      }, { annotations: { readOnlyHint: true } }),

    tool("music_play", "放歌。给 query 就在资料库里找名字、歌手或专辑里含这个词的歌来放；不给就继续播放当前的。", { query: z.string().optional().describe("歌名 / 歌手 / 专辑里的关键词") },
      async ({ query }) => {
        try {
          if (!query) { await osa(`tell application "Music" to play`); return ok("继续放了。"); }
          const out = await osa(`tell application "Music"
  set found to (every track of playlist 1 whose name contains ${q(query)} or artist contains ${q(query)} or album contains ${q(query)})
  if (count of found) is 0 then return "none"
  set trk to item 1 of found
  play trk
  return (name of trk) & " — " & (artist of trk)
end tell`);
          return out === "none" ? ok(`资料库里没找到和「${query}」有关的歌。我只能放你资料库和播放列表里的。`) : ok("在放：" + out);
        } catch (e) { return fail("没放成：" + e.message); }
      }),

    tool("music_play_playlist", "放某个播放列表（按名字模糊匹配），随机播放。", { name: z.string() },
      async ({ name }) => {
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
      }),

    tool("music_pause", "暂停。", {}, async () => { try { await osa(`tell application "Music" to pause`); return ok("停了。"); } catch (e) { return fail(e.message); } }),
    tool("music_next", "下一首。", {}, async () => { try { await osa(`tell application "Music" to next track`); return ok("换了一首。" ); } catch (e) { return fail(e.message); } }),
    tool("music_previous", "上一首。", {}, async () => { try { await osa(`tell application "Music" to previous track`); return ok("回到上一首。"); } catch (e) { return fail(e.message); } }),
    tool("music_volume", "调音量，0 到 100。", { level: z.number().min(0).max(100) },
      async ({ level }) => { try { await osa(`tell application "Music" to set sound volume to ${Math.round(level)}`); return ok(`音量 ${Math.round(level)}。`); } catch (e) { return fail(e.message); } })
  ];
  return createSdkMcpServer({ name: "music", version: "1.0.0", tools, instructions: "控制本机 Apple「音乐」App。只能放资料库里有的歌。" });
}
