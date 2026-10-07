#!/usr/bin/env node
/**
 * AgentOS CLI v0.4
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
import {
  initPermissions,
  loadPolicy,
  permissionsForRole,
  ALL_PERMISSIONS,
} from "@agentos/permissions";
import { runTerminal } from "@agentos/tools";
import { resolveProviderConfig } from "@agentos/providers";
import { AGENTOS_VERSION } from "@agentos/core";
import type { MemoryType } from "@agentos/core";

const args = process.argv.slice(2);
const command = args[0];

function printHelp(topic?: string) {
  if (topic === "memory") {
    console.log(`\nagentos memory\n  add|search|why|ingest|inspect|list\n`);
    return;
  }
  if (topic === "skill") {
    console.log(`\nagentos skill list|install|show\n`);
    return;
  }
  if (topic === "team") {
    console.log(`\nagentos team create|list|run\nLLM: OPENAI_API_KEY or AGENTOS_LLM_*\n`);
    return;
  }
  if (topic === "permissions") {
    console.log(`\nagentos permissions init|show\n`);
    return;
  }
  console.log(`
AgentOS — The open-source operating system for AI agents  v${AGENTOS_VERSION}

Usage:
  agentos <command> [options]
  agentos <command> --help

Setup:
  init                         Initialize AgentOS
  connect <platform>           claude-code | codex | cline | opencode | generic
  disconnect <platform>
  context [query]

Memory:
  memory add|search|why|ingest|inspect|list

Skills:
  skill list|install|show

Teams:
  team create|list|run

Permissions & tools:
  permissions init|show
  terminal <command> [--role <role>]
  dashboard [--port 3847]

Other:
  doctor | version | help

Examples:
  agentos init
  agentos memory ingest git --limit 50
  agentos connect claude-code
  agentos skill install github
  agentos team run software-team "improve auth"
  agentos terminal "ls src" --role coder
  agentos dashboard

Docs: https://github.com/Mikecode2005/agentos
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
    printHelp(args[1]);
    return;
  }
  if (command === "version" || command === "--version" || command === "-v") {
    console.log(`AgentOS v${AGENTOS_VERSION}`);
    return;
  }
  if (args[1] === "--help" || args[1] === "-h") {
    printHelp(command);
    return;
  }

  if (command === "init") {
    if (isInitialized(cwd)) {
      console.log("✓ Already initialized.");
      return;
    }
    const config = initAgentOS(cwd);
    initPermissions(cwd);
    console.log("\n  🧠 AgentOS initialized");
    console.log(`  Memory: ${config.memoryPath}`);
    console.log(`  Version: ${config.version}\n`);
    console.log("  Next: agentos memory ingest git --limit 50");
    console.log("        agentos connect claude-code");
    console.log("        agentos dashboard\n");
    return;
  }

  if (command === "connect") {
    const platform = args[1];
    if (!platform) {
      console.error(`Usage: agentos connect <platform>\n${listPlatforms().join(", ")}`);
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
    console.log(`\n  ✓ ${disconnectPlatform(platform, cwd).message}\n`);
    return;
  }

  if (command === "context") {
    const store = ensureInit(cwd);
    await store.init();
    const query = args.slice(1).join(" ").trim() || undefined;
    console.log(`\n  ✓ Context → ${refreshContext(store, cwd, query)}\n`);
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

  if (command === "permissions") {
    const sub = args[1];
    ensureInit(cwd);
    if (sub === "init") {
      const policy = initPermissions(cwd);
      console.log("\n  ✓ Permissions written");
      console.log(`    roles: ${Object.keys(policy.roles).join(", ")}\n`);
      return;
    }
    if (sub === "show" || !sub) {
      const policy = loadPolicy(cwd);
      console.log("\n  Permissions\n");
      console.log("  Default:", policy.defaultPermissions.join(", "));
      for (const [role, perms] of Object.entries(policy.roles)) {
        console.log(`  ${role.padEnd(12)} ${perms.join(", ")}`);
      }
      console.log(`\n  allowWrite: ${policy.sandbox.allowWrite.join(", ")}`);
      console.log(`  allowNetwork: ${policy.sandbox.allowNetwork}`);
      console.log(`  tokens: ${ALL_PERMISSIONS.join(", ")}\n`);
      return;
    }
    console.error("Usage: agentos permissions init | show");
    process.exit(1);
  }

  if (command === "terminal") {
    const role = parseFlag("--role") || "coder";
    const cmdParts: string[] = [];
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--role") { i++; continue; }
      cmdParts.push(args[i]);
    }
    let shellCmd = cmdParts.join(" ").trim();
    if (!shellCmd) {
      console.error('Usage: agentos terminal "command" [--role coder]');
      process.exit(1);
    }
    ensureInit(cwd);
    const policy = loadPolicy(cwd);
    const granted = permissionsForRole(policy, role);
    console.log(`\n  $ ${shellCmd}\n  role=${role}\n`);
    const result = await runTerminal(shellCmd, granted, policy.sandbox);
    if (result.blocked) {
      console.error(`  ✗ Blocked: ${result.reason}`);
      process.exit(1);
    }
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.timedOut) {
      console.error(`\n  ✗ ${result.reason}`);
      process.exit(1);
    }
    process.exit(result.exitCode ?? 1);
  }

  if (command === "dashboard") {
    process.argv = [process.argv[0], "dashboard", ...args.slice(1)];
    try {
      await import("@agentos/dashboard");
    } catch {
      try {
        await import("../../../apps/dashboard/src/index.js");
      } catch {
        console.error("Dashboard not found. Try: npx tsx apps/dashboard/src/index.ts");
        process.exit(1);
      }
    }
    return;
  }

  if (command === "memory") {
    const sub = args[1];
    const store = ensureInit(cwd);
    await store.init();

    if (sub === "add") {
      const text = args.slice(2).join(" ").trim();
      if (!text) { console.error('Usage: agentos memory add "…"'); process.exit(1); }
      const entry = store.add(text, {
        type: "decision",
        source: "cli",
        author: process.env.USER || "user",
      });
      console.log(`\n  ✓ [${entry.type}] ${entry.content.slice(0, 80)}\n`);
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
      console.log(`\n  🧠 ${stats.total} memories · embeddings ${stats.withEmbeddings ?? 0}`);
      for (const [t, c] of Object.entries(stats.byType)) if (c > 0) console.log(`    ${t}: ${c}`);
      console.log("");
      return;
    }
    if (sub === "list") {
      for (const e of store.list()) console.log(`  [${e.type}] ${e.content.slice(0, 90)}`);
      return;
    }
    console.error("Use: add | search | why | ingest | inspect | list");
    process.exit(1);
  }

  if (command === "doctor") {
    const initialized = isInitialized(cwd);
    console.log("\n  AgentOS Health\n");
    console.log(`  Version       ${AGENTOS_VERSION}`);
    console.log(`  Initialized   ${initialized ? "yes" : "no"}`);
    if (initialized) {
      const store = new MemoryStore(cwd);
      await store.init();
      const stats = store.stats();
      const llm = resolveProviderConfig();
      console.log(`  Memories      ${stats.total}`);
      console.log(`  Embeddings    ${stats.withEmbeddings ?? 0}`);
      console.log(`  Agents        ${listConnectedAdapters(cwd).join(", ") || "none"}`);
      console.log(
        `  LLM           ${llm.provider === "none" ? "not configured (stub plans)" : `${llm.provider} / ${llm.model}`}\n`
      );
    } else {
      console.log("\n  Run: agentos init\n");
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
