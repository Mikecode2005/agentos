/**
 * @agentos/core — Shared types and utilities
 */

export type MemoryType =
  | "episodic"
  | "semantic"
  | "project"
  | "preference"
  | "decision";

/** Evidence linking a memory back to source artifacts */
export interface MemoryEvidence {
  /** git commit SHA (short or full) */
  commit?: string;
  /** PR number e.g. 184 */
  pr?: number;
  /** files touched */
  files?: string[];
  /** external links (Slack, Notion, Linear, etc.) */
  links?: string[];
  /** raw message / body excerpt */
  excerpt?: string;
}

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  /** Optional structured metadata */
  metadata?: Record<string, unknown>;
  /** Source of the memory (commit, pr, slack, manual, agent, etc.) */
  source?: string;
  /** Who created it */
  author?: string;
  /** Confidence 0–1 */
  confidence?: number;
  /** Tags for filtering */
  tags?: string[];
  /** Structured evidence for institutional memory */
  evidence?: MemoryEvidence;
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
  bySource: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  oldest?: string;
  newest?: string;
}

/** Structured answer to "why did we …?" */
export interface DecisionSummary {
  query: string;
  headline: string;
  reason: string;
  decisions: Array<{
    content: string;
    author?: string;
    date?: string;
    confidence: number;
    evidence?: MemoryEvidence;
    score: number;
  }>;
  relatedFacts: string[];
  confidence: number;
  sources: string[];
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

export const AGENTOS_VERSION = "0.1.1";
export const AGENTOS_DIR = ".agentos";
export const MEMORY_FILE = "memory.jsonl";
export const INDEX_FILE = "index.json";
