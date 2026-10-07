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
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
  highlights?: string[];
  scores?: { lexical?: number; vector?: number };
}

export interface MemoryStats {
  total: number;
  byType: Record<MemoryType, number>;
  bySource: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  oldest?: string;
  newest?: string;
  withEmbeddings?: number;
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
  skills?: string[];
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

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  version?: string;
  tags?: string[];
  tools?: string[];
  triggers?: string[];
  body: string;
  path?: string;
  builtin?: boolean;
}

export type WorkerStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface WorkerTask {
  id: string;
  type: string;
  input: Record<string, unknown>;
  status: WorkerStatus;
  agentId?: string;
  result?: unknown;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentRole {
  id: string;
  role: string;
  description?: string;
  permissions: string[];
  skills: string[];
  tools: string[];
  memoryScope: "project" | "user" | "global";
}

export interface AgentTeam {
  id: string;
  name: string;
  agents: AgentRole[];
  createdAt: string;
}

export const AGENTOS_VERSION = "0.4.0";
export const AGENTOS_DIR = ".agentos";
export const MEMORY_FILE = "memory.jsonl";
export const INDEX_FILE = "index.json";
export const CONTEXT_FILE = "context.md";
export const ADAPTERS_FILE = "adapters.json";
export const SKILLS_DIR = "skills";
export const TEAMS_FILE = "teams.json";
export const EMBEDDING_DIM = 256;
