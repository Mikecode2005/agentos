/**
 * Cline adapter — uses .clinerules / AGENTS.md conventions
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

const RULES = ".clinerules";
const AGENTS = "AGENTS.md";

export function connectCline(
  projectRoot: string,
  store: MemoryStore
): ConnectResult {
  const filesWritten: string[] = [];
  filesWritten.push(refreshContext(store, projectRoot));

  const block = standardInstructionBlock(store, "Cline");
  const rulesPath = join(projectRoot, RULES);
  injectBlock(rulesPath, block, { createIfMissing: true });
  filesWritten.push(rulesPath);

  const agentsPath = join(projectRoot, AGENTS);
  injectBlock(agentsPath, block, { createIfMissing: true });
  filesWritten.push(agentsPath);

  recordAdapter(projectRoot, "cline");

  return {
    platform: "cline",
    filesWritten,
    message: "Connected Cline. .clinerules and AGENTS.md include AgentOS memory.",
  };
}

export function disconnectCline(projectRoot: string): ConnectResult {
  const files: string[] = [];
  for (const rel of [RULES, AGENTS]) {
    const p = join(projectRoot, rel);
    if (removeBlock(p)) files.push(p);
  }
  removeAdapterRecord(projectRoot, "cline");
  return {
    platform: "cline",
    filesWritten: files,
    message: files.length
      ? "Removed AgentOS blocks from Cline instruction files"
      : "No AgentOS blocks found",
  };
}
