/**
 * @agentos/core — Shared types and utilities
 */

export type MemoryType =
  | "episodic"
  | "semantic"
  | "project"
  | "preference"
  | "decision";

export interface MemoryEvidence {
  commit?: string;
  pr?: number;
  files?: string[];
  links?: string[];
  excerpt?: string;
}

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  metadata?: Record<string, unknown>;
  source?: string;
  author?: string;
  confidence?: number;
  tags?: string[];
  evidence?: MemoryEvidence;
  createdAt: string;
  updatedAt: string;
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

export type AgentPlatform =
  | "claude-code"
  | "codex"
  | "cline"
  | "opencode"
  | "gemini"
  | "cursor"
  | "generic";

export interface AdapterManifest {
  platform: AgentPlatform;
  name: string;
  instructionFiles: string[];
  discovery: "file" | "mcp" | "cli" | "env";
}

export interface AgentOSConfig {
  projectRoot: string;
  memoryPath: string;
  version: string;
  adapters?: AgentPlatform[];
}

export const AGENTOS_VERSION = "0.2.0";
export const AGENTOS_DIR = ".agentos";
export const MEMORY_FILE = "memory.jsonl";
export const INDEX_FILE = "index.json";
export const CONTEXT_FILE = "context.md";
export const ADAPTERS_FILE = "adapters.json";
