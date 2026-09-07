import { CodexBrain } from "./brains/codex.js";
// 现在只接 Codex（Claude 的 Agent SDK 已经不对外了）
export function createBrain(_kind, deps) { return new CodexBrain(deps); }
