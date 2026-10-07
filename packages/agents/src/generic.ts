/**
 * Generic adapter — AGENTS.md only (works with many tools)
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

export function connectGeneric(
  projectRoot: string,
  store: MemoryStore
): ConnectResult {
  const filesWritten: string[] = [];
  filesWritten.push(refreshContext(store, projectRoot));

  const path = join(projectRoot, AGENTS);
  injectBlock(path, standardInstructionBlock(store, "generic agent"), {
    createIfMissing: true,
  });
  filesWritten.push(path);

  recordAdapter(projectRoot, "generic");

  return {
    platform: "generic",
    filesWritten,
    message: "Connected generic agent via AGENTS.md.",
  };
}

export function disconnectGeneric(projectRoot: string): ConnectResult {
  const path = join(projectRoot, AGENTS);
  const removed = removeBlock(path);
  removeAdapterRecord(projectRoot, "generic");
  return {
    platform: "generic",
    filesWritten: removed ? [path] : [],
    message: removed
      ? "Removed AgentOS block from AGENTS.md"
      : "No AgentOS block found in AGENTS.md",
  };
}
