/**
 * Shared agent adapter interface + connect helpers.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import type { AgentPlatform, AdapterManifest, AgentOSConfig } from "@agentos/core";
import { AGENTOS_DIR, ADAPTERS_FILE } from "@agentos/core";
import type { MemoryStore } from "@agentos/memory";
import { buildContextBlock, writeContextFile } from "./context.js";

export interface ConnectResult {
  platform: AgentPlatform;
  filesWritten: string[];
  message: string;
}

export interface AgentAdapter {
  manifest: AdapterManifest;
  connect(projectRoot: string, store: MemoryStore): ConnectResult;
  disconnect(projectRoot: string): ConnectResult;
}

export const BEGIN_MARKER = "<!-- agentos:begin -->";
export const END_MARKER = "<!-- agentos:end -->";

export function injectBlock(
  filePath: string,
  block: string,
  options: { createIfMissing?: boolean; prepend?: boolean } = {}
): boolean {
  const create = options.createIfMissing !== false;
  const wrapped = `${BEGIN_MARKER}\n${block.trim()}\n${END_MARKER}\n`;

  if (!existsSync(filePath)) {
    if (!create) return false;
    const dir = join(filePath, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, wrapped + "\n", "utf-8");
    return true;
  }

  const existing = readFileSync(filePath, "utf-8");
  const beginIdx = existing.indexOf(BEGIN_MARKER);
  const endIdx = existing.indexOf(END_MARKER);

  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    const before = existing.slice(0, beginIdx);
    const after = existing.slice(endIdx + END_MARKER.length);
    writeFileSync(filePath, before + wrapped + after.replace(/^\n/, ""), "utf-8");
    return true;
  }

  if (options.prepend) {
    writeFileSync(filePath, wrapped + "\n" + existing, "utf-8");
  } else {
    const sep = existing.endsWith("\n") ? "\n" : "\n\n";
    writeFileSync(filePath, existing + sep + wrapped, "utf-8");
  }
  return true;
}

export function removeBlock(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const existing = readFileSync(filePath, "utf-8");
  const beginIdx = existing.indexOf(BEGIN_MARKER);
  const endIdx = existing.indexOf(END_MARKER);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) return false;
  const before = existing.slice(0, beginIdx);
  const after = existing.slice(endIdx + END_MARKER.length).replace(/^\n/, "");
  writeFileSync(filePath, before + after, "utf-8");
  return true;
}

export function standardInstructionBlock(store: MemoryStore, platform: string): string {
  const context = buildContextBlock(store, { limit: 10 });
  return [
    `# AgentOS (${platform})`,
    "",
    "This project uses **AgentOS** for institutional memory.",
    "Before inventing architectural rationale, consult memory.",
    "",
    context,
    "",
    "## AgentOS CLI (run in project root)",
    "",
    "```bash",
    'npx agentos memory why "why did we choose X?"',
    "npx agentos memory search \"topic\"",
    'npx agentos memory add "We chose X because Y"',
    "npx agentos context              # refresh .agentos/context.md",
    "```",
    "",
    "When you make a lasting design decision, record it with `agentos memory add`.",
    "",
  ].join("\n");
}

export function recordAdapter(projectRoot: string, platform: AgentPlatform): void {
  const dir = join(projectRoot, AGENTOS_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, ADAPTERS_FILE);
  let list: AgentPlatform[] = [];
  if (existsSync(path)) {
    try {
      list = JSON.parse(readFileSync(path, "utf-8")) as AgentPlatform[];
    } catch {
      list = [];
    }
  }
  if (!list.includes(platform)) list.push(platform);
  writeFileSync(path, JSON.stringify(list, null, 2), "utf-8");
}

export function listConnectedAdapters(projectRoot: string): AgentPlatform[] {
  const path = join(projectRoot, AGENTOS_DIR, ADAPTERS_FILE);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as AgentPlatform[];
  } catch {
    return [];
  }
}

export function removeAdapterRecord(projectRoot: string, platform: AgentPlatform): void {
  const path = join(projectRoot, AGENTOS_DIR, ADAPTERS_FILE);
  if (!existsSync(path)) return;
  try {
    const list = (JSON.parse(readFileSync(path, "utf-8")) as AgentPlatform[]).filter(
      (p) => p !== platform
    );
    writeFileSync(path, JSON.stringify(list, null, 2), "utf-8");
  } catch {
    /* ignore */
  }
}

export function refreshContext(store: MemoryStore, projectRoot: string, query?: string): string {
  return writeContextFile(store, projectRoot, { query, limit: 15 });
}
