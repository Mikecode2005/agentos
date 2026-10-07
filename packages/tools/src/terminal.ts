/**
 * Sandboxed terminal tool
 */

import { spawn } from "node:child_process";
import {
  checkCommand,
  hasPermission,
  type Permission,
  type SandboxConfig,
} from "@agentos/permissions";

export interface TerminalResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut?: boolean;
  blocked?: boolean;
  reason?: string;
}

export interface TerminalOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export async function runTerminal(
  command: string,
  granted: Permission[],
  sandbox: SandboxConfig,
  options: TerminalOptions = {}
): Promise<TerminalResult> {
  if (!hasPermission(granted, "run_terminal") && !hasPermission(granted, "admin")) {
    return {
      ok: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      blocked: true,
      reason: "Missing permission: run_terminal",
    };
  }

  const cmdCheck = checkCommand(sandbox, command);
  if (!cmdCheck.ok) {
    return {
      ok: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      blocked: true,
      reason: cmdCheck.reason,
    };
  }

  const timeout = options.timeoutMs ?? sandbox.terminalTimeoutMs;
  const cwd = options.cwd ?? sandbox.projectRoot;

  return new Promise((resolve) => {
    const child = spawn("bash", ["-c", command], {
      cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({
        ok: false,
        stdout,
        stderr,
        exitCode: null,
        timedOut: true,
        reason: `Timed out after ${timeout}ms`,
      });
    }, timeout);

    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
      if (stdout.length > 512_000) stdout = stdout.slice(-512_000);
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 256_000) stderr = stderr.slice(-256_000);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout, stderr, exitCode: code });
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        stdout,
        stderr: stderr + String(err),
        exitCode: null,
        reason: err.message,
      });
    });
  });
}
