import { ClaudeBrain } from "./brains/claude.js";
import { CodexBrain } from "./brains/codex.js";
export function createBrain(kind, deps) { return kind === "codex" ? new CodexBrain(deps) : new ClaudeBrain(deps); }
