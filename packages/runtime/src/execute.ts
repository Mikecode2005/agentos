/**
 * Real team step execution — memory, terminal, files, skills, optional LLM
 */

import type { AgentRole, AgentTeam } from "@agentos/core";
import type { MemoryStore } from "@agentos/memory";
import {
  loadPolicy,
  permissionsForRole,
  type Permission,
} from "@agentos/permissions";
import { createBuiltinTools, type ToolContext } from "@agentos/tools";
import { matchSkills, formatSkillForAgent } from "@agentos/skills";
import type { PlanStep } from "./llm-plan.js";

export interface StepExecution {
  role: string;
  agentId: string;
  action: string;
  status: "completed" | "failed" | "blocked";
  toolsUsed: string[];
  result: unknown;
  error?: string;
  memoryHits?: number;
  skillsApplied?: string[];
}

async function llmAdvise(system: string, user: string): Promise<string | null> {
  try {
    const { llmComplete } = await import("@agentos/providers");
    const res = await llmComplete(user, system, { temperature: 0.2, maxTokens: 800 });
    return res?.content ?? null;
  } catch {
    return null;
  }
}

export async function executeStep(
  projectRoot: string,
  team: AgentTeam,
  step: PlanStep,
  store: MemoryStore,
  goal: string
): Promise<StepExecution> {
  const agent: AgentRole =
    team.agents.find((a) => a.role === step.agent) ?? team.agents[0];
  const policy = loadPolicy(projectRoot);
  const perms: Permission[] = permissionsForRole(policy, agent.role);
  const tools = createBuiltinTools();
  const ctx: ToolContext = {
    projectRoot,
    permissions: perms,
    sandbox: { ...policy.sandbox, projectRoot },
    agentId: agent.id,
    role: agent.role,
  };

  const toolsUsed: string[] = [];
  const skills = matchSkills(projectRoot, `${goal} ${step.action} ${step.detail ?? ""}`);
  const skillText = skills.slice(0, 2).map(formatSkillForAgent).join("\n");

  const memResults = store.search(goal, { limit: 5 });
  toolsUsed.push("memory.search");

  const memoryBrief = memResults
    .map((r) => `- [${r.entry.type}] ${r.entry.content.slice(0, 120)}`)
    .join("\n");

  try {
    if (agent.role === "researcher" || agent.role === "planner") {
      const why = store.why(goal);
      toolsUsed.push("memory.why");
      const list = await tools.invoke("list_dir", { path: "." }, ctx);
      if (list.ok) toolsUsed.push("list_dir");

      let advice: string | null = null;
      if (skillText || memResults.length) {
        advice = await llmAdvise(
          `You are the ${agent.role}. Be concise. Use institutional memory; do not invent history.\n${skillText}`,
          `Goal: ${goal}\nAction: ${step.action}\nMemory:\n${memoryBrief}\nWhy summary: ${why.headline}\n${why.reason}`
        );
      }

      return {
        role: agent.role,
        agentId: agent.id,
        action: step.action,
        status: "completed",
        toolsUsed,
        skillsApplied: skills.map((s) => s.id),
        memoryHits: memResults.length,
        result: {
          memory: memResults.map((r) => ({
            type: r.entry.type,
            content: r.entry.content,
            score: r.score,
            commit: r.entry.evidence?.commit,
          })),
          why,
          advice: advice ?? undefined,
          list_dir: list.result,
        },
      };
    }

    if (agent.role === "coder") {
      const listing = await tools.invoke("list_dir", { path: "src" }, ctx);
      toolsUsed.push("list_dir");
      const pkg = await tools.invoke("read_file", { path: "package.json" }, ctx);
      if (pkg.ok) toolsUsed.push("read_file");

      const advice =
        (await llmAdvise(
          `You are a coder agent. Propose concrete next edits.\n${skillText}`,
          `Goal: ${goal}\nAction: ${step.action}\nDetail: ${step.detail ?? ""}\nMemory:\n${memoryBrief}\npackage.json read ok=${pkg.ok}`
        )) ?? `Inspect repo and implement: ${step.action} (${goal})`;

      store.add(
        `[coder] ${step.action} for goal "${goal.slice(0, 80)}" — ${String(advice).slice(0, 200)}`,
        { type: "episodic", source: "agent:coder", author: agent.id, confidence: 0.6 }
      );
      toolsUsed.push("memory.add");

      return {
        role: agent.role,
        agentId: agent.id,
        action: step.action,
        status: "completed",
        toolsUsed,
        skillsApplied: skills.map((s) => s.id),
        memoryHits: memResults.length,
        result: { advice, packageJson: pkg.ok, srcListing: listing.result },
      };
    }

    if (agent.role === "tester") {
      const candidates = ["npm test --if-present", "npm run test --if-present"];
      let last: unknown = null;
      for (const cmd of candidates) {
        const r = await tools.invoke("terminal", { command: cmd }, ctx);
        toolsUsed.push("terminal");
        last = r;
        if (r.ok && r.result && typeof r.result === "object") {
          const tr = r.result as { blocked?: boolean };
          if (!tr.blocked) break;
        }
      }
      return {
        role: agent.role,
        agentId: agent.id,
        action: step.action,
        status: "completed",
        toolsUsed,
        skillsApplied: skills.map((s) => s.id),
        memoryHits: memResults.length,
        result: { terminal: last, memoryBrief },
      };
    }

    if (agent.role === "reviewer") {
      const why = store.why(goal);
      toolsUsed.push("memory.why");
      const advice =
        (await llmAdvise(
          `You are a reviewer. List risks and test gaps briefly.\n${skillText}`,
          `Goal: ${goal}\nAction: ${step.action}\nMemory:\n${memoryBrief}\nWhy: ${why.headline}`
        )) ?? why.reason;

      return {
        role: agent.role,
        agentId: agent.id,
        action: step.action,
        status: "completed",
        toolsUsed,
        skillsApplied: skills.map((s) => s.id),
        memoryHits: memResults.length,
        result: { review: advice, why },
      };
    }

    const statusCmd = await tools.invoke("terminal", { command: "git status -sb" }, ctx);
    toolsUsed.push("terminal");
    return {
      role: agent.role,
      agentId: agent.id,
      action: step.action,
      status: statusCmd.ok ? "completed" : "failed",
      toolsUsed,
      skillsApplied: skills.map((s) => s.id),
      memoryHits: memResults.length,
      result: statusCmd.result,
      error: statusCmd.error,
    };
  } catch (err) {
    return {
      role: agent.role,
      agentId: agent.id,
      action: step.action,
      status: "failed",
      toolsUsed,
      skillsApplied: skills.map((s) => s.id),
      memoryHits: memResults.length,
      result: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function executePlan(
  projectRoot: string,
  team: AgentTeam,
  steps: PlanStep[],
  store: MemoryStore,
  goal: string
): Promise<StepExecution[]> {
  const out: StepExecution[] = [];
  for (const step of steps) {
    out.push(await executeStep(projectRoot, team, step, store, goal));
  }
  return out;
}

export function roleTools(role: string): string[] {
  switch (role) {
    case "researcher":
      return ["memory.search", "memory.why", "read_file", "list_dir"];
    case "coder":
      return ["read_file", "write_file", "list_dir", "terminal", "memory.search", "memory.add"];
    case "tester":
      return ["terminal", "read_file", "list_dir", "memory.search"];
    case "reviewer":
      return ["read_file", "list_dir", "memory.search", "memory.why", "terminal"];
    case "deployer":
      return ["terminal", "read_file", "memory.add"];
    case "planner":
      return ["memory.search", "memory.why"];
    default:
      return ["memory.search", "read_file", "echo"];
  }
}
