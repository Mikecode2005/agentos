/**
 * Append-only audit log for tool / permission events
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AGENTOS_DIR } from "@agentos/core";

export interface AuditEvent {
  ts: string;
  action: string;
  role?: string;
  agentId?: string;
  tool?: string;
  ok: boolean;
  detail?: string;
  blocked?: boolean;
}

export function auditLog(projectRoot: string, event: Omit<AuditEvent, "ts">): void {
  const dir = join(projectRoot, AGENTOS_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, "audit.jsonl");
  const row: AuditEvent = { ts: new Date().toISOString(), ...event };
  appendFileSync(path, JSON.stringify(row) + "\n", "utf-8");
}
