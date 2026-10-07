/**
 * Git commit → AgentOS memory ingestion
 *
 * Turns repository history into institutional memory:
 * decisions, reasons, and evidence (commit SHA + files).
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { MemoryEntry, MemoryType } from "@agentos/core";
import type { MemoryStore } from "./store.js";

export interface GitCommit {
  sha: string;
  shortSha: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  body: string;
  files: string[];
}

export interface IngestOptions {
  limit?: number;
  since?: string;
  until?: string;
  path?: string;
  skipExisting?: boolean;
}

export interface IngestResult {
  scanned: number;
  added: number;
  skipped: number;
  entries: MemoryEntry[];
}

function runGit(cwd: string, args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

export function isGitRepo(cwd: string): boolean {
  return (
    existsSync(join(cwd, ".git")) ||
    runGit(cwd, "rev-parse --is-inside-work-tree") === "true"
  );
}

export function loadCommits(cwd: string, options: IngestOptions = {}): GitCommit[] {
  if (!isGitRepo(cwd)) return [];

  const limit = options.limit ?? 100;
  const pretty =
    "--pretty=format:%x1e%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b%x1f";

  const parts = [`log -n ${limit}`, pretty, "--name-only"];
  if (options.since) parts.push(`--since="${options.since}"`);
  if (options.until) parts.push(`--until="${options.until}"`);
  if (options.path) parts.push(`-- ${options.path}`);

  const raw = runGit(cwd, parts.join(" "));
  if (!raw) return [];

  const commits: GitCommit[] = [];
  const records = raw.split("\x1e").filter((r) => r.trim());

  for (const record of records) {
    const lines = record.split("\n");
    const header = lines[0] || "";
    const fields = header.split("\x1f");
    if (fields.length < 6) continue;

    const [sha, shortSha, author, email, date, subject, body = ""] = fields;
    const files = lines
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l && !l.includes("\x1f") && !l.includes("\x1e"));

    if (!sha || !subject) continue;

    commits.push({
      sha,
      shortSha: shortSha || sha.slice(0, 7),
      author: author || "unknown",
      email: email || "",
      date: date || new Date().toISOString(),
      subject: subject.trim(),
      body: (body || "").trim(),
      files,
    });
  }

  return commits;
}

function isDecisionLike(commit: GitCommit): boolean {
  const text = `${commit.subject} ${commit.body}`.toLowerCase();
  const signals = [
    /\b(why|because|reason|decision|chose|chosen|instead of|migrate|replace|switch to|adopt|introduce)\b/,
    /\b(breaking|architecture|refactor|redesign)\b/,
    /\b(add|added)\b.+\b(redis|postgres|mongo|kafka|s3|jwt|oauth|auth)\b/,
    /\b(use|using|switched to)\b.+\b(instead|rather)\b/,
  ];
  return signals.some((re) => re.test(text));
}

function classifyCommit(commit: GitCommit): MemoryType {
  const text = `${commit.subject} ${commit.body}`.toLowerCase();
  if (isDecisionLike(commit)) return "decision";
  if (/^(feat|feature)[:(]/i.test(commit.subject)) return "project";
  if (/^(fix|bugfix)[:(]/i.test(commit.subject)) return "episodic";
  if (/^(docs|chore|style|test)[:(]/i.test(commit.subject)) return "episodic";
  if (/\b(prefer|preference|always|never)\b/.test(text)) return "preference";
  return "episodic";
}

function commitToContent(commit: GitCommit): string {
  const parts = [commit.subject];
  if (commit.body) {
    const body = commit.body.split(/\n\n/)[0].replace(/\n/g, " ").trim();
    if (body && body.length > 10) parts.push(body);
  }
  return parts.join(" — ");
}

function extractTags(commit: GitCommit): string[] {
  const tags = new Set<string>();
  const m = commit.subject.match(
    /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?[:(]/i
  );
  if (m) tags.add(m[1].toLowerCase());

  const tech = [
    "redis", "postgres", "postgresql", "mongo", "mongodb", "mysql", "sqlite",
    "kafka", "rabbitmq", "s3", "jwt", "oauth", "auth", "graphql", "grpc",
    "docker", "kubernetes", "k8s", "terraform", "aws", "gcp", "azure",
    "typescript", "python", "rust", "go", "react", "next", "vue",
  ];
  const hay = `${commit.subject} ${commit.body} ${commit.files.join(" ")}`.toLowerCase();
  for (const t of tech) {
    if (hay.includes(t)) tags.add(t);
  }
  return [...tags];
}

export function ingestGitCommits(
  store: MemoryStore,
  cwd: string,
  options: IngestOptions = {}
): IngestResult {
  const commits = loadCommits(cwd, options);
  const skipExisting = options.skipExisting !== false;

  const existingShas = new Set<string>();
  if (skipExisting) {
    for (const e of store.list()) {
      const sha = e.metadata?.commitSha as string | undefined;
      if (sha) existingShas.add(sha);
      if (e.evidence?.commit) existingShas.add(e.evidence.commit);
    }
  }

  const added: MemoryEntry[] = [];
  let skipped = 0;

  for (const commit of commits) {
    if (existingShas.has(commit.sha) || existingShas.has(commit.shortSha)) {
      skipped++;
      continue;
    }

    const type = classifyCommit(commit);
    const content = commitToContent(commit);
    const tags = extractTags(commit);

    const entry = store.add(content, {
      type,
      source: `commit:${commit.shortSha}`,
      author: commit.author,
      confidence: isDecisionLike(commit) ? 0.85 : 0.7,
      tags,
      metadata: {
        commitSha: commit.sha,
        shortSha: commit.shortSha,
        email: commit.email,
        filesChanged: commit.files.length,
      },
      evidence: {
        commit: commit.shortSha,
        files: commit.files.slice(0, 20),
        excerpt: commit.body.slice(0, 300) || undefined,
      },
      createdAt: commit.date,
    });

    added.push(entry);
    existingShas.add(commit.sha);
  }

  return {
    scanned: commits.length,
    added: added.length,
    skipped,
    entries: added,
  };
}
