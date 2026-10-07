/**
 * Agent subsystem — teams of role-based agents
 */

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { AgentRole, AgentTeam } from "@agentos/core";
import { AGENTOS_DIR, TEAMS_FILE } from "@agentos/core";
import type { WorkerPool } from "./workers.js";
import { llmPlan, stubPlan } from "./llm-plan.js";

export const SOFTWARE_TEAM_ROLES: Omit<AgentRole, "id">[] = [
  {
    role: "planner",
    description: "Breaks goals into steps and assigns work",
    permissions: ["read_repo", "read_memory"],
    skills: ["research"],
    tools: ["memory", "filesystem"],
    memoryScope: "project",
  },
  {
    role: "researcher",
    description: "Gathers context from memory, docs, and code",
    permissions: ["read_repo", "read_memory"],
    skills: ["research", "github"],
    tools: ["memory", "browser", "filesystem"],
    memoryScope: "project",
  },
  {
    role: "coder",
    description: "Implements changes in the codebase",
    permissions: ["read_repo", "write_src", "read_memory"],
    skills: ["debugging", "github"],
    tools: ["filesystem", "terminal", "github"],
    memoryScope: "project",
  },
  {
    role: "reviewer",
    description: "Reviews diffs for correctness and risk",
    permissions: ["read_repo", "read_memory"],
    skills: ["github", "debugging"],
    tools: ["filesystem", "github"],
    memoryScope: "project",
  },
  {
    role: "tester",
    description: "Runs tests and verifies behavior",
    permissions: ["read_repo", "run_tests"],
    skills: ["debugging"],
    tools: ["terminal", "filesystem"],
    memoryScope: "project",
  },
  {
    role: "deployer",
    description: "Handles release and rollback procedures",
    permissions: ["read_repo", "deploy"],
    skills: ["deployment", "github"],
    tools: ["terminal", "github"],
    memoryScope: "project",
  },
];

function teamsPath(projectRoot: string): string {
  return join(projectRoot, AGENTOS_DIR, TEAMS_FILE);
}

function loadTeams(projectRoot: string): AgentTeam[] {
  const path = teamsPath(projectRoot);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as AgentTeam[];
  } catch {
    return [];
  }
}

function saveTeams(projectRoot: string, teams: AgentTeam[]): void {
  const dir = join(projectRoot, AGENTOS_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(teamsPath(projectRoot), JSON.stringify(teams, null, 2), "utf-8");
}

export function createTeam(
  projectRoot: string,
  name: string,
  preset: "software" | "custom" = "software",
  customRoles?: Omit<AgentRole, "id">[]
): AgentTeam {
  const roles =
    preset === "software" ? SOFTWARE_TEAM_ROLES : customRoles ?? SOFTWARE_TEAM_ROLES;

  const team: AgentTeam = {
    id: randomUUID(),
    name,
    agents: roles.map((r) => ({ ...r, id: `${r.role}-${randomUUID().slice(0, 8)}` })),
    createdAt: new Date().toISOString(),
  };

  const teams = loadTeams(projectRoot);
  teams.push(team);
  saveTeams(projectRoot, teams);
  return team;
}

export function listTeams(projectRoot: string): AgentTeam[] {
  return loadTeams(projectRoot);
}

export function getTeam(projectRoot: string, idOrName: string): AgentTeam | null {
  return (
    loadTeams(projectRoot).find(
      (t) => t.id === idOrName || t.name === idOrName
    ) ?? null
  );
}

export interface TeamRunResult {
  teamId: string;
  goal: string;
  plan: unknown;
  steps: Array<{
    agentId: string;
    role: string;
    taskId: string;
    status: string;
    result?: unknown;
    error?: string;
  }>;
}

export async function runTeamGoal(
  projectRoot: string,
  teamIdOrName: string,
  goal: string,
  pool: WorkerPool
): Promise<TeamRunResult> {
  const team = getTeam(projectRoot, teamIdOrName);
  if (!team) throw new Error(`Team not found: ${teamIdOrName}`);

  const planner = team.agents.find((a) => a.role === "planner") ?? team.agents[0];

  let planObj: {
    goal: string;
    steps?: Array<{ agent: string; action: string; detail?: string }>;
    summary?: string;
    source?: string;
  };
  try {
    planObj = await llmPlan(goal, team);
  } catch {
    const planTask = pool.submit("agent.plan", { goal }, planner.id);
    await waitForTask(pool, planTask.id, 5000);
    const plan = pool.get(planTask.id);
    planObj = (plan?.result as typeof planObj) ?? stubPlan(goal);
  }

  const steps: TeamRunResult["steps"] = [];

  for (const step of planObj.steps ?? []) {
    const agent =
      team.agents.find((a) => a.role === step.agent) ?? team.agents[0];
    let type = "echo";
    const input: Record<string, unknown> = {
      goal,
      action: step.action,
      detail: step.detail,
      role: step.agent,
    };
    if (step.agent === "researcher") {
      type = "memory.search";
      input.query = goal;
    }
    const task = pool.submit(type, input, agent.id);
    await waitForTask(pool, task.id, 5000);
    const done = pool.get(task.id)!;
    steps.push({
      agentId: agent.id,
      role: agent.role,
      taskId: done.id,
      status: done.status,
      result: done.result,
      error: done.error,
    });
  }

  return {
    teamId: team.id,
    goal,
    plan: planObj,
    steps,
  };
}

function waitForTask(pool: WorkerPool, id: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const t = pool.get(id);
      if (!t || t.status === "completed" || t.status === "failed" || t.status === "cancelled") {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve();
        return;
      }
      setTimeout(tick, 20);
    };
    tick();
  });
}
