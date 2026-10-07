/**
 * @agentos/memory — Persistent memory for AI agents
 *
 * - JSONL store under .agentos/
 * - TF-IDF ranked retrieval
 * - Git commit ingestion → institutional memory
 * - Extractive "why did we …?" summaries
 */

export { MemoryStore, initAgentOS, isInitialized } from "./store.js";
export type { AddMemoryOptions } from "./store.js";

export { rankMemories, tokenize } from "./search.js";

export {
  ingestGitCommits,
  loadCommits,
  isGitRepo,
} from "./git-ingest.js";
export type { GitCommit, IngestOptions, IngestResult } from "./git-ingest.js";

export {
  summarizeDecision,
  formatDecisionSummary,
} from "./summarize.js";

export { MemoryStore as default } from "./store.js";
