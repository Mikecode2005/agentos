/**
 * Claude Code adapter
 *
 * Injects AgentOS memory into CLAUDE.md (project instructions
 * that Claude Code loads automatically).
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

const INSTRUCTION_FILE = "CLAUDE.md";

export function connectClaudeCode(
  projectRoot: string,
  store: MemoryStore
): ConnectResult {
  const filesWritten: string[] = [];

  const contextPath = refreshContext(store, projectRoot);
  filesWritten.push(contextPath);

  const claudePath = join(projectRoot, INSTRUCTION_FILE);
  const block = standardInstructionBlock(store, "Claude Code");
  injectBlock(claudePath, block, { createIfMissing: true, prepend: false });
  filesWritten.push(claudePath);

  recordAdapter(projectRoot, "claude-code");

  return {
    platform: "claude-code",
    filesWritten,
    message:
      "Connected Claude Code. CLAUDE.md now includes AgentOS memory. " +
      "Claude will load it automatically in this project.",
  };
}

export function disconnectClaudeCode(projectRoot: string): ConnectResult {
  const claudePath = join(projectRoot, INSTRUCTION_FILE);
  const removed = removeBlock(claudePath);
  removeAdapterRecord(projectRoot, "claude-code");
  return {
    platform: "claude-code",
    filesWritten: removed ? [claudePath] : [],
    message: removed
      ? "Removed AgentOS block from CLAUDE.md"
      : "No AgentOS block found in CLAUDE.md",
  };
}
