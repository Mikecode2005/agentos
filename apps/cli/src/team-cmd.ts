/**
 * Team CLI subcommands
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
    console.log("");
    const result = await runTeamGoal(cwd, name, goal, pool);
    console.log("  Plan:");
    console.log("  ", JSON.stringify(result.plan, null, 2).split("\n").join("\n  "));
    console.log("");
    console.log("  Steps:");
    for (const s of result.steps) {
      console.log(`    [${s.status}] ${s.role}: ${s.error || "ok"}`);
    }
    console.log("");
    return;
  }

  console.error("Usage: agentos team create | list | run <name> <goal>");
  process.exit(1);
}
