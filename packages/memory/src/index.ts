/**
 * @agentos/memory — Persistent memory for AI agents
 *
 * Stores episodic, semantic, project, preference, and decision memories
 * in a simple append-only JSONL file under .agentos/
 */

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import type {
  MemoryEntry,
  MemoryType,
  MemorySearchResult,
  MemoryStats,
  AgentOSConfig,
} from "@agentos/core";
import { AGENTOS_DIR, MEMORY_FILE, AGENTOS_VERSION } from "@agentos/core";

export interface AddMemoryOptions {
  type?: MemoryType;
  source?: string;
  author?: string;
  confidence?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export class MemoryStore {
  private readonly memoryPath: string;
  private entries: MemoryEntry[] = [];
  private loaded = false;

  constructor(projectRoot: string) {
    this.memoryPath = join(projectRoot, AGENTOS_DIR, MEMORY_FILE);
  }

  /** Ensure .agentos directory exists and load existing memories */
  async init(): Promise<void> {
    const dir = dirname(this.memoryPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.load();
  }

  private load(): void {
    if (this.loaded) return;
    if (!existsSync(this.memoryPath)) {
      this.entries = [];
      this.loaded = true;
      return;
    }
    const raw = readFileSync(this.memoryPath, "utf-8");
    this.entries = raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line) as MemoryEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is MemoryEntry => e !== null && !e.deletedAt);
    this.loaded = true;
  }

  private persist(entry: MemoryEntry): void {
    appendFileSync(this.memoryPath, JSON.stringify(entry) + "\n", "utf-8");
  }

  /** Add a new memory */
  add(content: string, options: AddMemoryOptions = {}): MemoryEntry {
    this.load();
    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      id: randomUUID(),
      type: options.type ?? "decision",
      content: content.trim(),
      source: options.source ?? "manual",
      author: options.author,
      confidence: options.confidence ?? 1,
      tags: options.tags ?? [],
      metadata: options.metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.entries.push(entry);
    this.persist(entry);
    return entry;
  }

  /** Simple keyword + type search (V0.1 — no embeddings yet) */
  search(
    query: string,
    options: { type?: MemoryType; limit?: number } = {}
  ): MemorySearchResult[] {
    this.load();
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    const scored = this.entries
      .filter((e) => !options.type || e.type === options.type)
      .map((entry) => {
        const text = (
          entry.content +
          " " +
          (entry.tags?.join(" ") ?? "") +
          " " +
          (entry.source ?? "")
        ).toLowerCase();

        let score = 0;
        const highlights: string[] = [];

        for (const term of terms) {
          if (text.includes(term)) {
            score += 1;
            if (entry.content.toLowerCase().includes(term)) {
              score += 0.5;
            }
          }
        }

        if (
          entry.type === "decision" &&
          (query.toLowerCase().includes("why") ||
            query.toLowerCase().includes("chose") ||
            query.toLowerCase().includes("decision"))
        ) {
          score += 0.3;
        }

        return { entry, score, highlights };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 10);

    return scored;
  }

  /** Get all memories of a type */
  list(type?: MemoryType): MemoryEntry[] {
    this.load();
    if (!type) return [...this.entries];
    return this.entries.filter((e) => e.type === type);
  }

  /** Stats for `agentos memory inspect` */
  stats(): MemoryStats {
    this.load();
    const byType: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      project: 0,
      preference: 0,
      decision: 0,
    };
    const tagCounts = new Map<string, number>();

    for (const e of this.entries) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      for (const tag of e.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const dates = this.entries.map((e) => e.createdAt).sort();

    return {
      total: this.entries.length,
      byType,
      topTags,
      oldest: dates[0],
      newest: dates[dates.length - 1],
    };
  }

  /** Soft-delete */
  delete(id: string): boolean {
    this.load();
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    const entry = this.entries[idx];
    entry.deletedAt = new Date().toISOString();
    this.entries.splice(idx, 1);
    this.rewrite();
    return true;
  }

  private rewrite(): void {
    const content =
      this.entries.map((e) => JSON.stringify(e)).join("\n") +
      (this.entries.length ? "\n" : "");
    writeFileSync(this.memoryPath, content, "utf-8");
  }
}

/** Initialize AgentOS in a project directory */
export function initAgentOS(projectRoot: string = process.cwd()): AgentOSConfig {
  const dir = join(projectRoot, AGENTOS_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const configPath = join(dir, "config.json");
  const config: AgentOSConfig = {
    projectRoot,
    memoryPath: join(dir, MEMORY_FILE),
    version: AGENTOS_VERSION,
  };

  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  const memPath = join(dir, MEMORY_FILE);
  if (!existsSync(memPath)) {
    writeFileSync(memPath, "", "utf-8");
  }

  return config;
}

export function isInitialized(projectRoot: string = process.cwd()): boolean {
  return existsSync(join(projectRoot, AGENTOS_DIR, "config.json"));
}

export { MemoryStore as default };
