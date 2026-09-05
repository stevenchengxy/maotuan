// 探一下：哪种 approvalPolicy 下 Codex 肯直接调用 MCP 工具
import { Codex } from "@openai/codex-sdk";
import path from "node:path";
const electron = path.resolve("node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const mcp = { maotuan: { command: electron, args: [path.resolve("mcp/maotuan-tools.js")], env: { ELECTRON_RUN_AS_NODE: "1", MAOTUAN_DATA: "/tmp/maotuan-probe", MAOTUAN_PORT: "47831", MAOTUAN_NAME: "毛毛" } } };
for (const approvalPolicy of (process.argv[2] ? [process.argv[2]] : ["never", "on-failure", "on-request"])) {
  const codex = new Codex({ config: { mcp_servers: mcp } });
  const thread = codex.startThread({ workingDirectory: "/tmp", skipGitRepoCheck: true, sandboxMode: "read-only", approvalPolicy, modelReasoningEffort: "low" });
  const t0 = Date.now(); const items = [];
  try {
    const { events } = await thread.runStreamed("请调用 remember 工具，note 填「主人喜欢乌龙茶」，然后用一句话告诉我结果。");
    for await (const ev of events) { if (ev.type === "item.completed") items.push(ev.item.type + (ev.item.type === "mcp_tool_call" ? `(${ev.item.server}.${ev.item.tool}:${ev.item.status}${ev.item.error ? " " + JSON.stringify(ev.item.error).slice(0, 120) : ""})` : ev.item.type === "agent_message" ? ": " + ev.item.text.slice(0, 80).replace(/\n/g, " ") : "")); if (ev.type === "turn.failed") items.push("FAILED " + JSON.stringify(ev.error).slice(0, 200)); }
  } catch (e) { items.push("THROW " + e.message.slice(0, 200)); }
  console.log(`\n== ${approvalPolicy} (${((Date.now() - t0) / 1000).toFixed(1)}s)\n` + items.join("\n"));
}
