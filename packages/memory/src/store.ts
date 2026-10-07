/**
 * MemoryStore — persistent JSONL-backed memory for AgentOS
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
  MemoryEvidence,
  AgentOSConfig,
  DecisionSummary,
} from "@agentos/core";
import { AGENTOS_DIR, MEMORY_FILE, AGENTOS_VERSION } from "@agentos/core";
import { rankMemories } from "./search.js";
import { embed } from "./embeddings.js";
import { summarizeDecision } from "./summarize.js";

export interface AddMemoryOptions {
  type?: MemoryType;
  source?: string;
  author?: string;
  confidence?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  evidence?: MemoryEvidence;
  createdAt?: string;
}

export class MemoryStore {
  private readonly memoryPath: string;
  private readonly projectRoot: string;
  private entries: MemoryEntry[] = [];
  private loaded = false;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.memoryPath = join(projectRoot, AGENTOS_DIR, MEMORY_FILE);
  }

  async init(): Promise<void> {
    const dir = dirname(this.memoryPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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

  private rewrite(): void {
    const content =
      this.entries.map((e) => JSON.stringify(e)).join("\n") +
      (this.entries.length ? "\n" : "");
    writeFileSync(this.memoryPath, content, "utf-8");
  }

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
      evidence: options.evidence,
      embedding: embed(
        [content.trim(), ...(options.tags ?? []), options.source ?? ""].join(" ")
      ),
      createdAt: options.createdAt ?? now,
      updatedAt: now,
    };
    this.entries.push(entry);
    this.persist(entry);
    return entry;
  }

  update(
    id: string,
    patch: Partial<
      Pick<
        MemoryEntry,
        "content" | "type" | "tags" | "confidence" | "metadata" | "evidence"
      >
    >
  ): MemoryEntry | null {
    this.load();
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return null;
    if (patch.content !== undefined) {
      entry.content = patch.content.trim();
      entry.embedding = embed(
        [entry.content, ...(patch.tags ?? entry.tags ?? []), entry.source ?? ""].join(" ")
      );
    }
    if (patch.type !== undefined) entry.type = patch.type;
    if (patch.tags !== undefined) entry.tags = patch.tags;
    if (patch.confidence !== undefined) entry.confidence = patch.confidence;
    if (patch.metadata !== undefined)
      entry.metadata = { ...entry.metadata, ...patch.metadata };
    if (patch.evidence !== undefined)
      entry.evidence = { ...entry.evidence, ...patch.evidence };
    entry.updatedAt = new Date().toISOString();
    this.rewrite();
    return entry;
  }

  search(
    query: string,
    options: { type?: MemoryType; limit?: number } = {}
  ): MemorySearchResult[] {
    this.load();
    return rankMemories(this.entries, query, options);
  }

  why(query: string, limit = 8): DecisionSummary {
    const results = this.search(query, { limit });
    return summarizeDecision(query, results);
  }

  list(type?: MemoryType): MemoryEntry[] {
    this.load();
    if (!type) return [...this.entries];
    return this.entries.filter((e) => e.type === type);
  }

  getById(id: string): MemoryEntry | undefined {
    this.load();
    return this.entries.find((e) => e.id === id);
  }

  stats(): MemoryStats {
    this.load();
    const byType: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      project: 0,
      preference: 0,
      decision: 0,
    };
    const bySource: Record<string, number> = {};
    const tagCounts = new Map<string, number>();

    for (const e of this.entries) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      const srcKey = (e.source ?? "unknown").split(":")[0];
      bySource[srcKey] = (bySource[srcKey] ?? 0) + 1;
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
      bySource,
      topTags,
      oldest: dates[0],
      newest: dates[dates.length - 1],
      withEmbeddings: this.entries.filter((e) => e.embedding?.length).length,
    };
  }

  delete(id: string): boolean {
    this.load();
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    this.entries.splice(idx, 1);
    this.rewrite();
    return true;
  }
}

export function initAgentOS(projectRoot: string = process.cwd()): AgentOSConfig {
  const dir = join(projectRoot, AGENTOS_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

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
  if (!existsSync(memPath)) writeFileSync(memPath, "", "utf-8");

  const gi = join(dir, ".gitignore");
  if (!existsSync(gi)) writeFileSync(gi, "*\n!.gitignore\n", "utf-8");

  return config;
}

export function isInitialized(projectRoot: string = process.cwd()): boolean {
  return existsSync(join(projectRoot, AGENTOS_DIR, "config.json"));
}
