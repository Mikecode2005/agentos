#!/usr/bin/env node
/**
 * AgentOS CLI
 *
 * Usage:
 *   agentos init
 *   agentos memory add <text>
 *   agentos memory search <query>
 *   agentos memory why <query>
 *   agentos memory summary <query>
 *   agentos memory ingest git [--limit N] [--since DATE]
 *   agentos memory inspect
 *   agentos memory list [--type decision]
 *   agentos doctor
 *   agentos version
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
import { AGENTOS_VERSION } from "@agentos/core";
import type { MemoryType } from "@agentos/core";

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
AgentOS — The open-source operating system for AI agents

Usage:
  agentos <command> [options]

Commands:
  init                      Initialize AgentOS in the current project
  memory add <text>         Store a new memory (default type: decision)
  memory search <query>     Ranked search over memories
  memory why <query>        Institutional "why did we…?" answer with evidence
  memory summary <query>    Alias for memory why
  memory ingest git         Ingest git commits into memory
                            [--limit N] [--since YYYY-MM-DD]
  memory inspect            Show memory stats (screenshot-friendly)
  memory list               List memories [--type decision]
  doctor                    Health check
  version                   Print version
  help                      Show this help

Examples:
  agentos init
  agentos memory ingest git --limit 50
  agentos memory add "We chose Redis for session caching because of high read volume on auth"
  agentos memory why "why redis"
  agentos memory search "postgres"
  agentos memory inspect
`);
}

function ensureInit(cwd: string): MemoryStore {
  if (!isInitialized(cwd)) {
    console.error("AgentOS is not initialized in this directory.");
    console.error("Run: agentos init");
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
      console.log("✓ AgentOS is already initialized in this project.");
      console.log(`  Config: ${resolve(cwd, ".agentos/config.json")}`);
      return;
    }
    const config = initAgentOS(cwd);
    console.log("");
    console.log("  🧠 AgentOS initialized");
    console.log("");
    console.log(`  Project:  ${config.projectRoot}`);
    console.log(`  Memory:   ${config.memoryPath}`);
    console.log(`  Version:  ${config.version}`);
    console.log("");
    console.log("  Next steps:");
    if (isGitRepo(cwd)) {
      console.log("    agentos memory ingest git --limit 50");
    }
    console.log('    agentos memory add "We chose PostgreSQL because..."');
    console.log('    agentos memory why "why postgres"');
    console.log("    agentos memory inspect");
    console.log("");
    return;
  }

  if (command === "memory") {
    const sub = args[1];
    const store = ensureInit(cwd);
    await store.init();

    if (sub === "add") {
      const text = args.slice(2).join(" ").trim();
      if (!text) {
        console.error('Usage: agentos memory add "your decision or fact"');
        process.exit(1);
      }
      let type: MemoryType = "decision";
      const lower = text.toLowerCase();
      if (lower.startsWith("prefer") || lower.includes("preference")) {
        type = "preference";
      } else if (lower.includes("fact:") || lower.startsWith("note:")) {
        type = "project";
      }

      const entry = store.add(text, {
        type,
        source: "cli",
        author: process.env.USER || process.env.USERNAME || "user",
      });
      console.log("");
      console.log("  ✓ Memory stored");
      console.log(`  id:   ${entry.id}`);
      console.log(`  type: ${entry.type}`);
      console.log(
        `  ${entry.content.slice(0, 80)}${entry.content.length > 80 ? "…" : ""}`
      );
      console.log("");
      return;
    }

    if (sub === "search") {
      const query = args.slice(2).join(" ").trim();
      if (!query) {
        console.error("Usage: agentos memory search <query>");
        process.exit(1);
      }
      const results = store.search(query, { limit: 8 });
      if (results.length === 0) {
        console.log("");
        console.log("  No memories found for that query.");
        console.log('  Try: agentos memory ingest git   or   agentos memory add "..."');
        console.log("");
        return;
      }
      console.log("");
      console.log(
        `  🔍 ${results.length} result${results.length === 1 ? "" : "s"} for "${query}"`
      );
      console.log("");
      for (const r of results) {
        const e = r.entry;
        console.log(`  ┌─ ${e.type.toUpperCase()}  (score ${r.score.toFixed(2)})`);
        console.log(`  │  ${e.content}`);
        if (e.source) console.log(`  │  source: ${e.source}`);
        if (e.author) console.log(`  │  author: ${e.author}`);
        if (e.evidence?.commit) console.log(`  │  commit: ${e.evidence.commit}`);
        if (e.evidence?.files?.length) {
          console.log(
            `  │  files:  ${e.evidence.files.slice(0, 4).join(", ")}${e.evidence.files.length > 4 ? "…" : ""}`
          );
        }
        if (e.confidence !== undefined) {
          console.log(`  │  confidence: ${Math.round(e.confidence * 100)}%`);
        }
        console.log(`  │  ${e.createdAt.slice(0, 10)}`);
        console.log(`  └─`);
        console.log("");
      }
      return;
    }

    if (sub === "why" || sub === "summary") {
      const query = args.slice(2).join(" ").trim();
      if (!query) {
        console.error(`Usage: agentos memory ${sub} <query>`);
        process.exit(1);
      }
      const summary = store.why(query);
      console.log(formatDecisionSummary(summary));
      return;
    }

    if (sub === "ingest") {
      const target = args[2];
      if (target !== "git") {
        console.error("Usage: agentos memory ingest git [--limit N] [--since YYYY-MM-DD]");
        process.exit(1);
      }
      if (!isGitRepo(cwd)) {
        console.error("Not a git repository. Run this inside a git project.");
        process.exit(1);
      }

      const limitStr = parseFlag("--limit");
      const since = parseFlag("--since");
      const limit = limitStr ? parseInt(limitStr, 10) : 100;

      console.log("");
      console.log(`  📥 Ingesting git history (limit ${limit}${since ? `, since ${since}` : ""})…`);
      const result = ingestGitCommits(store, cwd, { limit, since, skipExisting: true });
      console.log("");
      console.log(`  Scanned:  ${result.scanned} commits`);
      console.log(`  Added:    ${result.added} memories`);
      console.log(`  Skipped:  ${result.skipped} (already ingested)`);
      if (result.added > 0) {
        const decisions = result.entries.filter((e) => e.type === "decision").length;
        console.log(`  Decisions detected: ${decisions}`);
        console.log("");
        console.log("  Top new memories:");
        for (const e of result.entries.slice(0, 5)) {
          console.log(
            `    [${e.type}] ${e.content.slice(0, 70)}${e.content.length > 70 ? "…" : ""}`
          );
        }
      }
      console.log("");
      console.log('  Try: agentos memory why "<topic>"');
      console.log("");
      return;
    }

    if (sub === "inspect") {
      const stats = store.stats();
      console.log("");
      console.log("  🧠 Agent Memory");
      console.log("");
      console.log(`  ${stats.total} total memories`);
      console.log("");
      console.log("  By type:");
      for (const [type, count] of Object.entries(stats.byType)) {
        if (count > 0) {
          const bar = "█".repeat(Math.min(count, 20));
          console.log(`    ${type.padEnd(12)} ${bar} ${count}`);
        }
      }
      if (Object.keys(stats.bySource).length > 0) {
        console.log("");
        console.log("  By source:");
        for (const [src, count] of Object.entries(stats.bySource).sort(
          (a, b) => b[1] - a[1]
        )) {
          console.log(`    ${src.padEnd(12)} ${count}`);
        }
      }
      if (stats.topTags.length > 0) {
        console.log("");
        console.log("  Top tags:");
        for (const { tag, count } of stats.topTags.slice(0, 8)) {
          console.log(`    #${tag} (${count})`);
        }
      }
      if (stats.oldest) {
        console.log("");
        console.log(`  Oldest: ${stats.oldest.slice(0, 10)}`);
        console.log(`  Newest: ${stats.newest?.slice(0, 10)}`);
      }
      console.log("");
      return;
    }

    if (sub === "list") {
      const typeFlag = parseFlag("--type");
      const entries = store.list(typeFlag as MemoryType | undefined);
      if (entries.length === 0) {
        console.log("  No memories yet.");
        return;
      }
      console.log("");
      for (const e of entries) {
        const prefix = e.evidence?.commit ? `commit:${e.evidence.commit}` : e.source;
        console.log(
          `  [${e.type}] ${e.content.slice(0, 90)}${e.content.length > 90 ? "…" : ""}`
        );
        if (prefix) console.log(`           └ ${prefix}`);
      }
      console.log("");
      console.log(`  ${entries.length} memories`);
      return;
    }

    console.error(`Unknown memory subcommand: ${sub}`);
    console.error("Use: add | search | why | summary | ingest | inspect | list");
    process.exit(1);
  }

  if (command === "doctor") {
    const initialized = isInitialized(cwd);
    console.log("");
    console.log("  AgentOS Health");
    console.log("");
    console.log(
      `  Initialized        ${initialized ? "██████████ 100%" : "░░░░░░░░░░   0%"}`
    );
    if (initialized) {
      const store = new MemoryStore(cwd);
      await store.init();
      const stats = store.stats();
      const memScore = Math.min(100, stats.total * 4 + (stats.bySource["commit"] ?? 0) * 2);
      const filled = Math.floor(memScore / 10);
      const bar = "█".repeat(filled) + "░".repeat(10 - filled);
      console.log(`  Memory density     ${bar} ${memScore}%`);
      console.log(`  Total memories     ${stats.total}`);
      console.log(
        `  From commits       ${stats.bySource["commit"] ?? 0}`
      );
      console.log(`  Decisions          ${stats.byType.decision}`);
      console.log("");
      if (stats.total === 0) {
        console.log("  ⚠  No memories yet");
        if (isGitRepo(cwd)) {
          console.log("     → agentos memory ingest git --limit 50");
        }
        console.log('     → agentos memory add "…"');
      } else if (stats.total < 5) {
        console.log("  ⚠  Low memory density — keep recording decisions");
      } else {
        console.log("  ✓  Looking good");
      }
    } else {
      console.log("");
      console.log("  Run: agentos init");
    }
    console.log("");
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
