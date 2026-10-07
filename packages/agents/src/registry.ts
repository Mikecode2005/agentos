/**
 * Platform registry — single entry point for connect/disconnect
 */

import type { AgentPlatform } from "@agentos/core";
import type { MemoryStore } from "@agentos/memory";
import type { ConnectResult } from "./adapter.js";
import { connectClaudeCode, disconnectClaudeCode } from "./claude-code.js";
import { connectCodex, disconnectCodex } from "./codex.js";
import { connectCline, disconnectCline } from "./cline.js";
import { connectOpenCode, disconnectOpenCode } from "./opencode.js";
import { connectGeneric, disconnectGeneric } from "./generic.js";

const PLATFORMS: AgentPlatform[] = [
  "claude-code",
  "codex",
  "cline",
  "opencode",
  "generic",
];

export function listPlatforms(): AgentPlatform[] {
  return [...PLATFORMS];
}

export function connectPlatform(
  platform: string,
  projectRoot: string,
  store: MemoryStore
): ConnectResult {
  const p = platform.toLowerCase().replace(/_/g, "-");
  switch (p) {
    case "claude":
    case "claude-code":
      return connectClaudeCode(projectRoot, store);
    case "codex":
    case "openai":
      return connectCodex(projectRoot, store);
    case "cline":
      return connectCline(projectRoot, store);
    case "opencode":
    case "open-code":
      return connectOpenCode(projectRoot, store);
    case "generic":
    case "agents":
      return connectGeneric(projectRoot, store);
    default:
      throw new Error(
        `Unknown platform: ${platform}. Supported: ${PLATFORMS.join(", ")}`
      );
  }
}

export function disconnectPlatform(
  platform: string,
  projectRoot: string
): ConnectResult {
  const p = platform.toLowerCase().replace(/_/g, "-");
  switch (p) {
    case "claude":
    case "claude-code":
      return disconnectClaudeCode(projectRoot);
    case "codex":
    case "openai":
      return disconnectCodex(projectRoot);
    case "cline":
      return disconnectCline(projectRoot);
    case "opencode":
    case "open-code":
      return disconnectOpenCode(projectRoot);
    case "generic":
    case "agents":
      return disconnectGeneric(projectRoot);
    default:
      throw new Error(
        `Unknown platform: ${platform}. Supported: ${PLATFORMS.join(", ")}`
      );
  }
}
