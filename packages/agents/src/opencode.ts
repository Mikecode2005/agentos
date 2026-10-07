/**
 * OpenCode adapter
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

const AGENTS = "AGENTS.md";
const OPENCODE = "OPENCODE.md";

export function connectOpenCode(
  projectRoot: string,
  store: MemoryStore
): ConnectResult {
  const filesWritten: string[] = [];
  filesWritten.push(refreshContext(store, projectRoot));

  const block = standardInstructionBlock(store, "OpenCode");
  for (const rel of [AGENTS, OPENCODE]) {
    const p = join(projectRoot, rel);
    injectBlock(p, block, { createIfMissing: true });
    filesWritten.push(p);
  }

  recordAdapter(projectRoot, "opencode");

  return {
    platform: "opencode",
    filesWritten,
    message: "Connected OpenCode. AGENTS.md and OPENCODE.md include AgentOS memory.",
  };
}

export function disconnectOpenCode(projectRoot: string): ConnectResult {
  const files: string[] = [];
  for (const rel of [AGENTS, OPENCODE]) {
    const p = join(projectRoot, rel);
    if (removeBlock(p)) files.push(p);
  }
  removeAdapterRecord(projectRoot, "opencode");
  return {
    platform: "opencode",
    filesWritten: files,
    message: files.length
      ? "Removed AgentOS blocks from OpenCode instruction files"
      : "No AgentOS blocks found",
  };
}
