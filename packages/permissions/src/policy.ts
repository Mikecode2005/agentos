/**
 * Permission policy & sandbox for AgentOS agents
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { AGENTOS_DIR } from "@agentos/core";

export type Permission =
  | "read_repo"
  | "write_src"
  | "write_tests"
  | "run_tests"
  | "run_terminal"
  | "run_network"
  | "read_memory"
  | "write_memory"
  | "deploy"
  | "install_deps"
  | "git_write"
  | "admin";

export const ALL_PERMISSIONS: Permission[] = [
  "read_repo", "write_src", "write_tests", "run_tests", "run_terminal",
  "run_network", "read_memory", "write_memory", "deploy", "install_deps",
  "git_write", "admin",
];

export interface SandboxConfig {
  projectRoot: string;
  allowRead: string[];
  allowWrite: string[];
  denyPaths: string[];
  denyCommands: string[];
  terminalTimeoutMs: number;
  allowNetwork: boolean;
}

export interface PermissionPolicy {
  version: number;
  defaultPermissions: Permission[];
  roles: Record<string, Permission[]>;
  sandbox: SandboxConfig;
}

const POLICY_FILE = "permissions.json";

export function defaultPolicy(projectRoot: string): PermissionPolicy {
  return {
    version: 1,
    defaultPermissions: ["read_repo", "read_memory", "write_memory", "run_tests"],
    roles: {
      planner: ["read_repo", "read_memory"],
      researcher: ["read_repo", "read_memory", "run_network"],
      coder: [
        "read_repo", "write_src", "write_tests", "read_memory", "write_memory",
        "run_terminal", "run_tests",
      ],
      reviewer: ["read_repo", "read_memory"],
      tester: ["read_repo", "run_tests", "run_terminal", "read_memory"],
      deployer: ["read_repo", "run_terminal", "deploy", "read_memory", "write_memory"],
    },
    sandbox: {
      projectRoot,
      allowRead: [],
      allowWrite: ["src", "packages", "apps", "tests", "test", "__tests__"],
      denyPaths: [
        ".env", ".env.local", ".env.production", "credentials", "secrets",
        "*.pem", "*.key", "id_rsa",
      ],
      denyCommands: [
        "rm -rf /", "mkfs", "dd if=", ":(){", "shutdown", "reboot",
        "curl | sh", "wget | sh", "chmod 777",
      ],
      terminalTimeoutMs: 60_000,
      allowNetwork: false,
    },
  };
}

function policyPath(projectRoot: string): string {
  return join(projectRoot, AGENTOS_DIR, POLICY_FILE);
}

export function loadPolicy(projectRoot: string): PermissionPolicy {
  const path = policyPath(projectRoot);
  if (!existsSync(path)) return defaultPolicy(projectRoot);
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as PermissionPolicy;
    raw.sandbox.projectRoot = projectRoot;
    return raw;
  } catch {
    return defaultPolicy(projectRoot);
  }
}

export function savePolicy(projectRoot: string, policy: PermissionPolicy): void {
  const dir = join(projectRoot, AGENTOS_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(policyPath(projectRoot), JSON.stringify(policy, null, 2), "utf-8");
}

export function initPermissions(projectRoot: string): PermissionPolicy {
  if (existsSync(policyPath(projectRoot))) return loadPolicy(projectRoot);
  const policy = defaultPolicy(projectRoot);
  savePolicy(projectRoot, policy);
  return policy;
}

export function permissionsForRole(policy: PermissionPolicy, role: string): Permission[] {
  return policy.roles[role] ?? policy.defaultPermissions;
}

export function hasPermission(granted: Permission[], needed: Permission): boolean {
  if (granted.includes("admin")) return true;
  return granted.includes(needed);
}

export function checkPathAccess(
  sandbox: SandboxConfig,
  targetPath: string,
  mode: "read" | "write"
): { ok: boolean; reason?: string; resolved?: string } {
  const root = resolve(sandbox.projectRoot);
  const resolvedPath = isAbsolute(targetPath)
    ? resolve(targetPath)
    : resolve(root, targetPath);
  const rel = relative(root, resolvedPath);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return { ok: false, reason: `Path escapes project root: ${targetPath}` };
  }
  const base = resolvedPath.split(/[/\\]/).pop() ?? "";
  for (const pattern of sandbox.denyPaths) {
    if (pattern.startsWith("*.")) {
      const ext = pattern.slice(1);
      if (base.endsWith(ext) || resolvedPath.endsWith(ext)) {
        return { ok: false, reason: `Denied path pattern: ${pattern}` };
      }
    } else if (
      rel === pattern ||
      rel.startsWith(pattern + "/") ||
      base === pattern ||
      resolvedPath.includes(`/${pattern}/`) ||
      resolvedPath.endsWith(`/${pattern}`)
    ) {
      return { ok: false, reason: `Denied path: ${pattern}` };
    }
  }
  if (mode === "write") {
    if (sandbox.allowWrite.length === 0) {
      return { ok: false, reason: "No write paths configured" };
    }
    const allowed = sandbox.allowWrite.some(
      (p) => rel === p || rel.startsWith(p + "/")
    );
    if (!allowed) {
      return {
        ok: false,
        reason: `Write not allowed outside: ${sandbox.allowWrite.join(", ")}`,
      };
    }
  }
  if (mode === "read" && sandbox.allowRead.length > 0) {
    const allowed = sandbox.allowRead.some(
      (p) => rel === p || rel.startsWith(p + "/")
    );
    if (!allowed) {
      return {
        ok: false,
        reason: `Read not allowed outside: ${sandbox.allowRead.join(", ")}`,
      };
    }
  }
  return { ok: true, resolved: resolvedPath };
}

export function checkCommand(
  sandbox: SandboxConfig,
  command: string
): { ok: boolean; reason?: string } {
  const lower = command.toLowerCase();
  for (const deny of sandbox.denyCommands) {
    if (lower.includes(deny.toLowerCase())) {
      return { ok: false, reason: `Blocked command pattern: ${deny}` };
    }
  }
  if (!sandbox.allowNetwork) {
    for (const h of ["curl ", "wget ", "nc ", "ncat ", "ssh ", "scp "]) {
      if (lower.includes(h.trim()) || lower.includes(h)) {
        return {
          ok: false,
          reason: `Network commands disabled (allowNetwork=false): matched "${h.trim()}"`,
        };
      }
    }
  }
  return { ok: true };
}
