/**
 * Tool registry — all invocations permission-gated + audited
 */

import type { Permission, SandboxConfig } from "@agentos/permissions";
import { auditLog } from "@agentos/permissions";
import { runTerminal, type TerminalResult } from "./terminal.js";
import { fsRead, fsWrite, fsList } from "./filesystem.js";

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
    if (!tool) {
      auditLog(ctx.projectRoot, {
        action: "tool.invoke",
        tool: name,
        role: ctx.role,
        agentId: ctx.agentId,
        ok: false,
        detail: "unknown tool",
      });
      return { ok: false, error: `Unknown tool: ${name}` };
    }

    for (const need of tool.permissions) {
      if (!ctx.permissions.includes(need) && !ctx.permissions.includes("admin")) {
        auditLog(ctx.projectRoot, {
          action: "tool.invoke",
          tool: name,
          role: ctx.role,
          agentId: ctx.agentId,
          ok: false,
          blocked: true,
          detail: `missing ${need}`,
        });
        return { ok: false, error: `Missing permission: ${need}` };
      }
    }

    try {
      const result = await tool.run(input, ctx);
      const blocked =
        result &&
        typeof result === "object" &&
        "blocked" in result &&
        (result as { blocked?: boolean }).blocked === true;
      auditLog(ctx.projectRoot, {
        action: "tool.invoke",
        tool: name,
        role: ctx.role,
        agentId: ctx.agentId,
        ok: !blocked,
        blocked: !!blocked,
        detail: typeof input.command === "string" ? String(input.command).slice(0, 80) : undefined,
      });
      if (blocked) {
        return {
          ok: false,
          error:
            (result as { error?: string; reason?: string }).error ||
            (result as { reason?: string }).reason ||
            "blocked",
          result,
        };
      }
      return { ok: true, result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      auditLog(ctx.projectRoot, {
        action: "tool.invoke",
        tool: name,
        role: ctx.role,
        agentId: ctx.agentId,
        ok: false,
        detail: msg,
      });
      return { ok: false, error: msg };
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
      return runTerminal(command, ctx.permissions, ctx.sandbox, {
        cwd: input.cwd ? String(input.cwd) : undefined,
      });
    },
  });

  reg.register({
    name: "read_file",
    description: "Read a file or list a directory under the project sandbox",
    permissions: ["read_repo"],
    async run(input, ctx) {
      const path = String(input.path ?? "");
      if (!path) throw new Error("path is required");
      return fsRead(path, ctx.permissions, ctx.sandbox);
    },
  });

  reg.register({
    name: "write_file",
    description: "Write a file under allowed write paths",
    permissions: ["write_src"],
    async run(input, ctx) {
      const path = String(input.path ?? "");
      const content = String(input.content ?? "");
      if (!path) throw new Error("path is required");
      return fsWrite(path, content, ctx.permissions, ctx.sandbox);
    },
  });

  reg.register({
    name: "list_dir",
    description: "List directory contents",
    permissions: ["read_repo"],
    async run(input, ctx) {
      return fsList(String(input.path ?? "."), ctx.permissions, ctx.sandbox);
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
