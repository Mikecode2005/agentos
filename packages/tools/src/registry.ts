/**
 * Tool registry
 */

import type { Permission, SandboxConfig } from "@agentos/permissions";
import { runTerminal, type TerminalResult } from "./terminal.js";

export interface ToolContext {
  projectRoot: string;
  permissions: Permission[];
  sandbox: SandboxConfig;
  agentId?: string;
  role?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  permissions: Permission[];
  run: (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  async invoke(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolContext
  ): Promise<{ ok: boolean; result?: unknown; error?: string }> {
    const tool = this.tools.get(name);
    if (!tool) return { ok: false, error: `Unknown tool: ${name}` };

    for (const need of tool.permissions) {
      if (!ctx.permissions.includes(need) && !ctx.permissions.includes("admin")) {
        return { ok: false, error: `Missing permission: ${need}` };
      }
    }

    try {
      const result = await tool.run(input, ctx);
      return { ok: true, result };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export function createBuiltinTools(): ToolRegistry {
  const reg = new ToolRegistry();

  reg.register({
    name: "terminal",
    description: "Run a sandboxed shell command",
    permissions: ["run_terminal"],
    async run(input, ctx) {
      const command = String(input.command ?? "");
      if (!command) throw new Error("command is required");
      const result: TerminalResult = await runTerminal(
        command,
        ctx.permissions,
        ctx.sandbox,
        { cwd: input.cwd ? String(input.cwd) : undefined }
      );
      return result;
    },
  });

  reg.register({
    name: "echo",
    description: "Echo input (debug)",
    permissions: [],
    async run(input) {
      return input;
    },
  });

  return reg;
}
