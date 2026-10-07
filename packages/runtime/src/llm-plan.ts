/**
 * LLM-backed planning for agent teams
 * Falls back to deterministic stub when no API key is configured.
 */

import type { AgentTeam } from "@agentos/core";

export interface PlanStep {
  agent: string;
  action: string;
  detail?: string;
}

export interface AgentPlan {
  goal: string;
  summary: string;
  steps: PlanStep[];
  source: "llm" | "stub";
  model?: string;
}

const STUB_STEPS: PlanStep[] = [
  { agent: "researcher", action: "gather context from memory and repo" },
  { agent: "coder", action: "implement changes" },
  { agent: "reviewer", action: "review diff for risk" },
  { agent: "tester", action: "run tests and verify" },
];

export function stubPlan(goal: string): AgentPlan {
  return {
    goal,
    summary: `Deterministic plan for: ${goal}`,
    steps: STUB_STEPS.map((s) => ({ ...s, detail: goal })),
    source: "stub",
  };
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in response");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function llmPlan(goal: string, team: AgentTeam): Promise<AgentPlan> {
  let llmComplete: typeof import("@agentos/providers").llmComplete;
  try {
    const mod = await import("@agentos/providers");
    llmComplete = mod.llmComplete;
  } catch {
    return stubPlan(goal);
  }

  const roles = team.agents.map((a) => a.role).join(", ");
  const system = `You are the planner for an AgentOS software team.
Available roles: ${roles}.
Respond with ONLY valid JSON:
{
  "summary": "one sentence plan",
  "steps": [
    { "agent": "<role>", "action": "<short action>", "detail": "<optional>" }
  ]
}
Use 3-6 steps. Prefer researcher → coder → reviewer → tester order when relevant.`;

  try {
    const res = await llmComplete(
      `Goal: ${goal}\n\nProduce a JSON plan.`,
      system,
      { temperature: 0.2, maxTokens: 1024 }
    );
    if (!res) return stubPlan(goal);

    const parsed = extractJson(res.content) as {
      summary?: string;
      steps?: PlanStep[];
    };
    const steps = (parsed.steps ?? []).filter((s) => s.agent && s.action);
    if (steps.length === 0) return stubPlan(goal);

    return {
      goal,
      summary: parsed.summary || `Plan for: ${goal}`,
      steps,
      source: "llm",
      model: res.model,
    };
  } catch {
    return stubPlan(goal);
  }
}
