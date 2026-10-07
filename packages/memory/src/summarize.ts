/**
 * Extractive decision summarization for AgentOS.
 *
 * Produces structured "why did we …?" answers from ranked memories
 * without requiring an LLM (fast, offline, deterministic).
 */

import type { DecisionSummary, MemorySearchResult } from "@agentos/core";

function pickHeadline(query: string, top: MemorySearchResult[]): string {
  if (top.length === 0) return `No institutional memory found for: ${query}`;
  const best = top[0].entry;
  const decision = top.find((r) => r.entry.type === "decision");
  const entry = decision?.entry ?? best;
  const text = entry.content;
  if (text.length <= 120) return text;
  return text.slice(0, 117) + "…";
}

function extractReason(results: MemorySearchResult[]): string {
  const decisions = results.filter((r) => r.entry.type === "decision");
  const pool = decisions.length > 0 ? decisions : results;

  const reasons: string[] = [];
  for (const r of pool.slice(0, 3)) {
    const c = r.entry.content;
    const causal = c.match(
      /[^.!?]*(?:because|since|due to|so that|in order to|to avoid|to improve)[^.!?]*[.!?]?/i
    );
    if (causal) {
      reasons.push(causal[0].trim());
    } else {
      reasons.push(c.length > 160 ? c.slice(0, 157) + "…" : c);
    }
  }

  const unique = [...new Set(reasons.map((s) => s.toLowerCase()))].map(
    (low) => reasons.find((r) => r.toLowerCase() === low)!
  );

  return unique.slice(0, 2).join(" ") || "Insufficient evidence in memory.";
}

function collectSources(results: MemorySearchResult[]): string[] {
  const sources = new Set<string>();
  for (const r of results) {
    if (r.entry.source) sources.add(r.entry.source);
    if (r.entry.evidence?.commit) sources.add(`commit:${r.entry.evidence.commit}`);
    if (r.entry.evidence?.pr) sources.add(`PR #${r.entry.evidence.pr}`);
    for (const f of r.entry.evidence?.files ?? []) {
      if (sources.size < 12) sources.add(f);
    }
  }
  return [...sources].slice(0, 12);
}

export function summarizeDecision(
  query: string,
  results: MemorySearchResult[]
): DecisionSummary {
  if (results.length === 0) {
    return {
      query,
      headline: `No institutional memory found for: "${query}"`,
      reason:
        "Nothing relevant in AgentOS memory yet. Try `agentos memory ingest git` or add decisions manually.",
      decisions: [],
      relatedFacts: [],
      confidence: 0,
      sources: [],
    };
  }

  const decisions = results
    .filter((r) => r.entry.type === "decision" || r.score > 1.5)
    .slice(0, 5)
    .map((r) => ({
      content: r.entry.content,
      author: r.entry.author,
      date: r.entry.createdAt?.slice(0, 10),
      confidence: r.entry.confidence ?? 0.7,
      evidence: r.entry.evidence,
      score: Math.round(r.score * 100) / 100,
    }));

  const relatedFacts = results
    .filter((r) => r.entry.type !== "decision")
    .slice(0, 5)
    .map((r) => r.entry.content);

  const topN = results.slice(0, 3);
  const avgConf =
    topN.reduce((s, r) => s + (r.entry.confidence ?? 0.7), 0) / topN.length;
  const scoreNorm = Math.min(1, topN[0].score / 5);
  const confidence = Math.round((0.6 * avgConf + 0.4 * scoreNorm) * 100) / 100;

  return {
    query,
    headline: pickHeadline(query, results),
    reason: extractReason(results),
    decisions,
    relatedFacts,
    confidence,
    sources: collectSources(results),
  };
}

export function formatDecisionSummary(summary: DecisionSummary): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  📌 ${summary.headline}`);
  lines.push("");
  lines.push(`  Reason:`);
  lines.push(`  ${summary.reason}`);
  lines.push("");

  if (summary.decisions.length > 0) {
    lines.push(`  Decisions & evidence:`);
    for (const d of summary.decisions) {
      lines.push(`  • ${d.content}`);
      const meta: string[] = [];
      if (d.author) meta.push(d.author);
      if (d.date) meta.push(d.date);
      if (d.evidence?.commit) meta.push(`commit ${d.evidence.commit}`);
      if (d.evidence?.pr) meta.push(`PR #${d.evidence.pr}`);
      if (meta.length) lines.push(`    └ ${meta.join(" · ")}`);
    }
    lines.push("");
  }

  if (summary.relatedFacts.length > 0) {
    lines.push(`  Related context:`);
    for (const f of summary.relatedFacts.slice(0, 3)) {
      lines.push(`  – ${f.length > 100 ? f.slice(0, 97) + "…" : f}`);
    }
    lines.push("");
  }

  lines.push(`  Confidence: ${Math.round(summary.confidence * 100)}%`);
  if (summary.sources.length > 0) {
    lines.push(`  Sources: ${summary.sources.slice(0, 6).join(", ")}`);
  }
  lines.push("");
  return lines.join("\n");
}
