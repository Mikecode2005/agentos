/**
 * Retrieval ranking for AgentOS memory.
 *
 * V0.1.1 uses a lightweight TF-IDF + type/source/recency boosts.
 * No external embedding model required — works offline and fast.
 */

import type { MemoryEntry, MemorySearchResult, MemoryType } from "@agentos/core";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "must", "shall", "can", "need",
  "this", "that", "these", "those", "it", "its", "we", "our", "you",
  "your", "they", "their", "what", "which", "who", "whom", "how",
  "when", "where", "why", "if", "then", "than", "so", "as", "into",
  "about", "over", "after", "before", "between", "under", "again",
  "further", "once", "here", "there", "all", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "too", "very", "just", "also", "now", "use", "used", "using",
]);

const TYPE_BOOST: Record<MemoryType, number> = {
  decision: 1.35,
  project: 1.15,
  preference: 1.1,
  semantic: 1.05,
  episodic: 1.0,
};

const SOURCE_BOOST: Record<string, number> = {
  commit: 1.25,
  pr: 1.3,
  github: 1.2,
  architecture: 1.15,
  manual: 1.0,
  cli: 1.0,
  agent: 0.95,
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-_/]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
}

function docFreq(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const tokens of docs) {
    const unique = new Set(tokens);
    for (const t of unique) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  return df;
}

function recencyBoost(isoDate: string): number {
  const ageMs = Date.now() - new Date(isoDate).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return 1.15;
  if (ageDays < 30) return 1.08;
  if (ageDays < 90) return 1.0;
  if (ageDays < 365) return 0.92;
  return 0.85;
}

function sourceBoost(source?: string): number {
  if (!source) return 1.0;
  const key = source.toLowerCase().split(/[:/\s]/)[0];
  return SOURCE_BOOST[key] ?? 1.0;
}

export function rankMemories(
  entries: MemoryEntry[],
  query: string,
  options: { type?: MemoryType; limit?: number } = {}
): MemorySearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const filtered = options.type
    ? entries.filter((e) => e.type === options.type)
    : entries;

  if (filtered.length === 0) return [];

  const docs = filtered.map((e) =>
    tokenize(
      [
        e.content,
        ...(e.tags ?? []),
        e.source ?? "",
        e.author ?? "",
        e.evidence?.excerpt ?? "",
        ...(e.evidence?.files ?? []),
      ].join(" ")
    )
  );

  const df = docFreq(docs);
  const N = filtered.length;
  const queryTf = termFreq(queryTokens);
  const whyIntent =
    /\b(why|chose|chosen|decision|reason|because|instead)\b/i.test(query);

  const scored: MemorySearchResult[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i];
    const tokens = docs[i];
    if (tokens.length === 0) continue;

    const tf = termFreq(tokens);
    let score = 0;
    const matched = new Set<string>();

    for (const [term, qf] of queryTf) {
      const f = tf.get(term) ?? 0;
      if (f === 0) continue;
      matched.add(term);
      const idf = Math.log(1 + N / (1 + (df.get(term) ?? 0)));
      const tfNorm = (f * 2.2) / (f + 1.2);
      score += qf * tfNorm * idf;
    }

    if (score <= 0) continue;

    const lower = entry.content.toLowerCase();
    for (const term of queryTokens) {
      if (lower.includes(term)) score += 0.15;
    }

    score *= TYPE_BOOST[entry.type] ?? 1;
    score *= sourceBoost(entry.source);
    score *= recencyBoost(entry.createdAt);
    score *= 0.7 + 0.3 * (entry.confidence ?? 1);

    if (whyIntent && entry.type === "decision") {
      score *= 1.2;
    }

    scored.push({ entry, score, highlights: [...matched].slice(0, 6) });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, options.limit ?? 10);
}
