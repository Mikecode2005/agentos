/**
 * OpenAI Codex / coding-agent adapter
 *
 * Uses AGENTS.md (common convention) and .codex/instructions.md when present.
 */

import { join } from "node:path";
import type { MemoryStore } from "@agentos/memory";
import {
  injectBlock,
  removeBlock,
  standardInstructionBlock,
  recordAdapter,
  removeAdapterRecord,
  refreshContext,
  type ConnectResult,
} from "./adapter.js";

const PRIMARY = "AGENTS.md";
const FALLBACK = ".codex/instructions.md";

export function connectCodex(
  projectRoot: string,
  store: MemoryStore
): ConnectResult {
  const filesWritten: string[] = [];

  const contextPath = refreshContext(store, projectRoot);
  filesWritten.push(contextPath);

  const block = standardInstructionBlock(store, "Codex");

  const agentsPath = join(projectRoot, PRIMARY);
  injectBlock(agentsPath, block, { createIfMissing: true });
  filesWritten.push(agentsPath);

  const codexPath = join(projectRoot, FALLBACK);
  injectBlock(codexPath, block, { createIfMissing: true });
  filesWritten.push(codexPath);

  recordAdapter(projectRoot, "codex");

  return {
    platform: "codex",
    filesWritten,
    message:
      "Connected Codex. AGENTS.md and .codex/instructions.md include AgentOS memory.",
  };
}

export function disconnectCodex(projectRoot: string): ConnectResult {
  const files: string[] = [];
  for (const rel of [PRIMARY, FALLBACK]) {
    const p = join(projectRoot, rel);
    if (removeBlock(p)) files.push(p);
  }
  removeAdapterRecord(projectRoot, "codex");
  return {
    platform: "codex",
    filesWritten: files,
    message:
      files.length > 0
        ? `Removed AgentOS blocks from ${files.map((f) => f.split("/").pop()).join(", ")}`
        : "No AgentOS blocks found",
  };
}
