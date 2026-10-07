/**
 * @agentos/agents — Adapters, context injection, memory MCP
 */

export {
  buildContextBlock,
  formatWhyForAgent,
  writeContextFile,
} from "./context.js";
export type { ContextOptions } from "./context.js";

export {
  injectBlock,
  removeBlock,
  standardInstructionBlock,
  recordAdapter,
  listConnectedAdapters,
  removeAdapterRecord,
  refreshContext,
  BEGIN_MARKER,
  END_MARKER,
} from "./adapter.js";
export type { AgentAdapter, ConnectResult } from "./adapter.js";

export { connectClaudeCode, disconnectClaudeCode } from "./claude-code.js";
export { connectCodex, disconnectCodex } from "./codex.js";
export { connectCline, disconnectCline } from "./cline.js";
export { connectOpenCode, disconnectOpenCode } from "./opencode.js";
export { connectGeneric, disconnectGeneric } from "./generic.js";
export { connectPlatform, disconnectPlatform, listPlatforms } from "./registry.js";

export { runMemoryMcp } from "./mcp-memory.js";
