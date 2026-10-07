/**
 * Memory tools over stdio (JSON lines)
 *   {"id":1,"method":"memory.search","params":{"query":"redis"}}
 * Run: agentos mcp
 */

import { createInterface } from "node:readline";
import { MemoryStore, isInitialized } from "@agentos/memory";

export async function runMemoryMcp(projectRoot: string = process.cwd()): Promise<void> {
  if (!isInitialized(projectRoot)) {
    console.error(JSON.stringify({ ok: false, error: "AgentOS not initialized" }));
    process.exit(1);
  }
  const store = new MemoryStore(projectRoot);
  await store.init();

  const rl = createInterface({ input: process.stdin, terminal: false });
  console.error("[agentos-mcp] memory tools ready (search|why|add|stats)");

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let req: { id?: string | number; method?: string; params?: Record<string, unknown> };
    try {
      req = JSON.parse(trimmed);
    } catch {
      console.log(JSON.stringify({ ok: false, error: "invalid json" }));
      continue;
    }
    const id = req.id ?? null;
    const method = req.method ?? "";
    const params = req.params ?? {};

    try {
      let result: unknown;
      if (method === "memory.search") {
        result = store.search(String(params.query ?? ""), {
          limit: Number(params.limit ?? 8),
        });
      } else if (method === "memory.why") {
        result = store.why(String(params.query ?? ""));
      } else if (method === "memory.add") {
        result = store.add(String(params.content ?? ""), {
          type: (params.type as "decision") || "decision",
          source: "mcp",
          author: String(params.author ?? "agent"),
        });
      } else if (method === "memory.stats") {
        result = store.stats();
      } else if (method === "tools/list") {
        result = [
          { name: "memory.search", description: "Hybrid memory search" },
          { name: "memory.why", description: "Institutional why answer" },
          { name: "memory.add", description: "Store a decision/fact" },
          { name: "memory.stats", description: "Memory statistics" },
        ];
      } else {
        console.log(JSON.stringify({ id, ok: false, error: `unknown method: ${method}` }));
        continue;
      }
      console.log(JSON.stringify({ id, ok: true, result }));
    } catch (err) {
      console.log(
        JSON.stringify({
          id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  }
}
