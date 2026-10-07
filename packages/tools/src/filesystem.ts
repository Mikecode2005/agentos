/**
 * Sandboxed filesystem tools — path checks via @agentos/permissions
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname } from "node:path";
import {
  checkPathAccess,
  hasPermission,
  type Permission,
  type SandboxConfig,
} from "@agentos/permissions";

export interface FsResult {
  ok: boolean;
  path?: string;
  content?: string;
  entries?: string[];
  error?: string;
  blocked?: boolean;
}

function need(granted: Permission[], perm: Permission): FsResult | null {
  if (!hasPermission(granted, perm) && !hasPermission(granted, "admin")) {
    return { ok: false, blocked: true, error: `Missing permission: ${perm}` };
  }
  return null;
}

export function fsRead(
  targetPath: string,
  granted: Permission[],
  sandbox: SandboxConfig,
  maxBytes = 200_000
): FsResult {
  const denied = need(granted, "read_repo");
  if (denied) return denied;
  const check = checkPathAccess(sandbox, targetPath, "read");
  if (!check.ok) return { ok: false, blocked: true, error: check.reason };
  const resolved = check.resolved!;
  if (!existsSync(resolved)) return { ok: false, error: `Not found: ${targetPath}` };
  const st = statSync(resolved);
  if (st.isDirectory()) {
    return { ok: true, path: targetPath, entries: readdirSync(resolved).slice(0, 200) };
  }
  const buf = readFileSync(resolved);
  const content =
    buf.length > maxBytes
      ? buf.subarray(0, maxBytes).toString("utf-8") + "\n…[truncated]"
      : buf.toString("utf-8");
  return { ok: true, path: targetPath, content };
}

export function fsWrite(
  targetPath: string,
  content: string,
  granted: Permission[],
  sandbox: SandboxConfig
): FsResult {
  const denied = need(granted, "write_src");
  if (denied) return denied;
  const check = checkPathAccess(sandbox, targetPath, "write");
  if (!check.ok) return { ok: false, blocked: true, error: check.reason };
  const resolved = check.resolved!;
  const dir = dirname(resolved);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(resolved, content, "utf-8");
  return { ok: true, path: targetPath };
}

export function fsList(
  targetPath: string,
  granted: Permission[],
  sandbox: SandboxConfig
): FsResult {
  return fsRead(targetPath, granted, sandbox);
}
