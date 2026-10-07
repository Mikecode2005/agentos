#!/usr/bin/env node
/**
 * AgentOS CLI v0.3
 */

import { resolve } from "node:path";
import {
  initAgentOS,
  isInitialized,
  MemoryStore,
  ingestGitCommits,
  isGitRepo,
  formatDecisionSummary,
} from "@agentos/memory";
import {
  connectPlatform,
  disconnectPlatform,
  listPlatforms,
  listConnectedAdapters,
  refreshContext,
  buildContextBlock,
} from "@agentos/agents";
import { runSkillCommand } from "./skill-cmd.js";
import { runTeamCommand } from "./team-cmd.js";
import { AGENTOS_VERSION } from "@agentos/core";
import type { MemoryType } from "@agentos/core";

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
AgentOS — The open-source operating system for AI agents  v${AGENTOS_VERSION}

Usage:
  agentos <command> [options]

Setup:
  init                         Initialize AgentOS in the current project
  connect <platform>           Wire an agent to AgentOS memory
  disconnect <platform>        Remove AgentOS blocks
  context [query]              Refresh .agentos/context.md

Memory:
  memory add|search|why|ingest|inspect|list

Skills:
  skill list|install <name>|show <name>

Teams:
  team create [name]|list|run <name> <goal>

Other:
  doctor | version | help

Examples:
  agentos init
  agentos memory ingest git --limit 50
  agentos connect claude-code
  agentos skill install github
  agentos team create software-team
  agentos team run software-team "improve auth caching"
`);
}

function ensureInit(cwd: string): MemoryStore {
  if (!isInitialized(cwd)) {
    console.error("AgentOS is not initialized. Run: agentos init");
    process.exit(1);
  }
  return new MemoryStore(cwd);
}

function parseFlag(name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function main() {
  const cwd = process.cwd();

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }
  if (command === "version" || command === "--version" || command === "-v") {
    console.log(`AgentOS v${AGENTOS_VERSION}`);
    return;
  }

  if (command === "init") {
    if (isInitialized(cwd)) {
      console.log("✓ Already initialized.");
      return;
    }
    const config = initAgentOS(cwd);
    console.log("\n  🧠 AgentOS initialized\n");
    console.log(`  Memory: ${config.memoryPath}\n`);
    console.log("  Next: agentos memory ingest git --limit 50");
    console.log("        agentos connect claude-code");
    console.log("        agentos skill install github\n");
    return;
  }

  if (command === "connect") {
    const platform = args[1];
    if (!platform) {
      console.error(`Usage: agentos connect <platform>\nPlatforms: ${listPlatforms().join(", ")}`);
      process.exit(1);
    }
    const store = ensureInit(cwd);
    await store.init();
    const result = connectPlatform(platform, cwd, store);
    console.log(`\n  ✓ ${result.message}\n`);
    for (const f of result.filesWritten) console.log(`    ${f}`);
    console.log("");
    return;
  }

  if (command === "disconnect") {
    const platform = args[1];
    if (!platform) { console.error("Usage: agentos disconnect <platform>"); process.exit(1); }
    ensureInit(cwd);
    const result = disconnectPlatform(platform, cwd);
    console.log(`\n  ✓ ${result.message}\n`);
    return;
  }

  if (command === "context") {
    const store = ensureInit(cwd);
    await store.init();
    const query = args.slice(1).join(" ").trim() || undefined;
    const path = refreshContext(store, cwd, query);
    console.log(`\n  ✓ Context written → ${path}\n`);
    return;
  }

  if (command === "skill") {
    ensureInit(cwd);
    runSkillCommand(args.slice(1), cwd);
    return;
  }

  if (command === "team") {
    const store = ensureInit(cwd);
    await store.init();
    await runTeamCommand(args.slice(1), cwd, store);
    return;
  }

  if (command === "memory") {
    const sub = args[1];
    const store = ensureInit(cwd);
    await store.init();

    if (sub === "add") {
      const text = args.slice(2).join(" ").trim();
      if (!text) { console.error('Usage: agentos memory add "..."'); process.exit(1); }
      const entry = store.add(text, {
        type: "decision",
        source: "cli",
        author: process.env.USER || "user",
      });
      console.log(`\n  ✓ Memory stored [${entry.type}] ${entry.content.slice(0, 80)}\n`);
      try { refreshContext(store, cwd); } catch { /* */ }
      return;
    }

    if (sub === "search") {
      const query = args.slice(2).join(" ").trim();
      if (!query) { console.error("Usage: agentos memory search <query>"); process.exit(1); }
      const results = store.search(query, { limit: 8 });
      console.log(`\n  🔍 ${results.length} results for "${query}"\n`);
      for (const r of results) {
        console.log(`  [${r.entry.type}] ${r.entry.content}`);
        if (r.scores) console.log(`    lexical=${r.scores.lexical?.toFixed(2)} vector=${r.scores.vector?.toFixed(3)}`);
        console.log("");
      }
      return;
    }

    if (sub === "why" || sub === "summary") {
      const query = args.slice(2).join(" ").trim();
      if (!query) { console.error(`Usage: agentos memory ${sub} <query>`); process.exit(1); }
      console.log(formatDecisionSummary(store.why(query)));
      return;
    }

    if (sub === "ingest") {
      if (args[2] !== "git") { console.error("Usage: agentos memory ingest git [--limit N]"); process.exit(1); }
      if (!isGitRepo(cwd)) { console.error("Not a git repo"); process.exit(1); }
      const limit = parseInt(parseFlag("--limit") || "100", 10);
      const since = parseFlag("--since");
      const result = ingestGitCommits(store, cwd, { limit, since, skipExisting: true });
      console.log(`\n  Scanned ${result.scanned} · Added ${result.added} · Skipped ${result.skipped}\n`);
      return;
    }

    if (sub === "inspect") {
      const stats = store.stats();
      console.log(`\n  🧠 ${stats.total} memories`);
      console.log(`  Embeddings: ${stats.withEmbeddings ?? 0}`);
      for (const [t, c] of Object.entries(stats.byType)) {
        if (c > 0) console.log(`    ${t}: ${c}`);
      }
      console.log("");
      return;
    }

    if (sub === "list") {
      for (const e of store.list()) {
        console.log(`  [${e.type}] ${e.content.slice(0, 90)}`);
      }
      return;
    }

    console.error("Use: add | search | why | ingest | inspect | list");
    process.exit(1);
  }

  if (command === "doctor") {
    const initialized = isInitialized(cwd);
    console.log("\n  AgentOS Health\n");
    console.log(`  Initialized  ${initialized ? "yes" : "no"}`);
    if (initialized) {
      const store = new MemoryStore(cwd);
      await store.init();
      const stats = store.stats();
      console.log(`  Memories     ${stats.total}`);
      console.log(`  Embeddings   ${stats.withEmbeddings ?? 0}`);
      console.log(`  Agents       ${listConnectedAdapters(cwd).join(", ") || "none"}\n`);
    }
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
