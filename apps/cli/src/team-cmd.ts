/**
 * Team CLI — real execution path
 */
import type { MemoryStore } from "@agentos/memory";
import {
  WorkerPool,
  registerBuiltinHandlers,
  createTeam,
  listTeams,
  runTeamGoal,
} from "@agentos/runtime";

export async function runTeamCommand(
  args: string[],
  cwd: string,
  store: MemoryStore
): Promise<void> {
  const sub = args[0];

  if (sub === "create") {
    const name = args[1] || "software-team";
    const team = createTeam(cwd, name, "software");
    console.log("");
    console.log(`  ✓ Team created: ${team.name}`);
    console.log(`    id: ${team.id}`);
    console.log("    agents:");
    for (const a of team.agents) {
      console.log(`      • ${a.role.padEnd(12)} skills=[${a.skills.join(", ")}]`);
    }
    console.log("");
    console.log(`  Run: agentos team run ${team.name} "your goal"`);
    console.log("");
    return;
  }

  if (sub === "list") {
    const teams = listTeams(cwd);
    console.log("");
    if (teams.length === 0) {
      console.log("  No teams yet. Create one: agentos team create software-team");
    } else {
      for (const t of teams) {
        console.log(`  ${t.name}  (${t.agents.length} agents)  id=${t.id.slice(0, 8)}…`);
      }
    }
    console.log("");
    return;
  }

  if (sub === "run") {
    const name = args[1];
    const goal = args.slice(2).join(" ").trim();
    if (!name || !goal) {
      console.error('Usage: agentos team run <team-name> "goal description"');
      process.exit(1);
    }
    const pool = new WorkerPool({ concurrency: 4 });
    registerBuiltinHandlers(pool, {
      searchMemory: (q) => store.search(q, { limit: 5 }),
      whyMemory: (q) => store.why(q),
      addMemory: (text) => store.add(text, { source: "agent", type: "decision" }),
    });
    console.log("");
    console.log(`  🤖 Running team "${name}" on: ${goal}`);
    console.log("  (LLM plan if configured · real tools under permissions)");
    console.log("");
    try {
      const result = await runTeamGoal(cwd, name, goal, pool, store);
      const plan = result.plan as {
        summary?: string;
        source?: string;
        model?: string;
      };
      console.log(
        `  Plan source: ${plan?.source ?? "unknown"}${plan?.model ? ` (${plan.model})` : ""}`
      );
      if (plan?.summary) console.log(`  Summary: ${plan.summary}`);
      console.log("");
      console.log("  Steps:");
      for (const s of result.steps) {
        const icon =
          s.status === "completed" ? "✓" : s.status === "blocked" ? "⊘" : "✗";
        const r =
          s.result && typeof s.result === "object"
            ? (s.result as {
                toolsUsed?: string[];
                memoryHits?: number;
                skillsApplied?: string[];
                action?: string;
              })
            : {};
        console.log(
          `    ${icon} [${s.status}] ${s.role}: ${s.error || r.action || "ok"}`
        );
        if (r.toolsUsed?.length)
          console.log(`         tools: ${r.toolsUsed.join(", ")}`);
        if (r.memoryHits !== undefined)
          console.log(`         memory hits: ${r.memoryHits}`);
        if (r.skillsApplied?.length)
          console.log(`         skills: ${r.skillsApplied.join(", ")}`);
      }
      console.log("");
      console.log("  Tip: agentos memory inspect · check .agentos/audit.jsonl");
      console.log("");
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
    return;
  }

  console.error("Usage: agentos team create | list | run <name> <goal>");
  process.exit(1);
}
