/**
 * Lightweight tests for retrieval ranking.
 * Run: node --import tsx --test packages/memory/src/search.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankMemories, tokenize } from "./search.js";
import type { MemoryEntry } from "@agentos/core";

function entry(
  partial: Partial<MemoryEntry> & { content: string }
): MemoryEntry {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    type: partial.type ?? "episodic",
    content: partial.content,
    source: partial.source,
    author: partial.author,
    confidence: partial.confidence ?? 1,
    tags: partial.tags ?? [],
    evidence: partial.evidence,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
  };
}

describe("tokenize", () => {
  it("removes stopwords and lowercases", () => {
    const t = tokenize("Why did we choose Redis for the session store?");
    assert.ok(t.includes("redis"));
    assert.ok(t.includes("session"));
    assert.ok(!t.includes("why"));
    assert.ok(!t.includes("the"));
  });
});

describe("rankMemories", () => {
  const corpus: MemoryEntry[] = [
    entry({
      type: "decision",
      content:
        "We chose Redis for session caching because auth endpoints had repeated database reads",
      source: "commit:abc1234",
      evidence: { commit: "abc1234", files: ["src/auth/session.ts"] },
      tags: ["redis", "auth"],
      confidence: 0.9,
    }),
    entry({
      type: "project",
      content: "Added user profile page with avatar upload",
      source: "commit:def5678",
      tags: ["feat"],
    }),
    entry({
      type: "decision",
      content:
        "PostgreSQL instead of MongoDB for strong consistency and existing ops expertise",
      source: "cli",
      tags: ["postgres", "mongodb"],
      confidence: 0.95,
    }),
  ];

  it("ranks redis decision highest for redis query", () => {
    const results = rankMemories(corpus, "why redis session");
    assert.ok(results.length >= 1);
    assert.match(results[0].entry.content, /Redis/i);
    assert.equal(results[0].entry.type, "decision");
  });

  it("finds postgres decision", () => {
    const results = rankMemories(corpus, "why postgres");
    assert.ok(results.length >= 1);
    assert.match(results[0].entry.content, /PostgreSQL/i);
  });

  it("returns empty for unrelated query", () => {
    const results = rankMemories(corpus, "kubernetes helm charts");
    assert.equal(results.length, 0);
  });
});
