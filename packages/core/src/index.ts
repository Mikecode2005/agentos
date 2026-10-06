/**
 * @agentos/core — Shared types and utilities
 */

export type MemoryType =
  | "episodic"
  | "semantic"
  | "project"
  | "preference"
  | "decision";

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  /** Optional structured metadata */
  metadata?: Record<string, unknown>;
  /** Source of the memory (PR, commit, Slack, manual, agent, etc.) */
  source?: string;
  /** Who created it */
  author?: string;
  /** Confidence 0–1 */
  confidence?: number;
  /** Tags for filtering */
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  /** Soft delete */
  deletedAt?: string;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
  highlights?: string[];
}

export interface MemoryStats {
  total: number;
  byType: Record<MemoryType, number>;
  topTags: Array<{ tag: string; count: number }>;
  oldest?: string;
  newest?: string;
}

export interface AgentIdentity {
  id: string;
  role: string;
  permissions: string[];
  memoryScope: "project" | "user" | "global";
  tools: string[];
}

export interface AgentOSConfig {
  projectRoot: string;
  memoryPath: string;
  version: string;
}

export const AGENTOS_VERSION = "0.1.0";
export const AGENTOS_DIR = ".agentos";
export const MEMORY_FILE = "memory.jsonl";
