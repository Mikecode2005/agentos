/**
 * Local embeddings for hybrid memory search.
 *
 * Uses deterministic feature hashing (no model download required).
 */

import { createHash } from "node:crypto";
import { EMBEDDING_DIM } from "@agentos/core";

const DIM = EMBEDDING_DIM;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-_/]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function hashToken(token: string): { index: number; sign: number } {
  const h = createHash("sha256").update(token).digest();
  const index = h.readUInt32BE(0) % DIM;
  const sign = (h[4] & 1) === 0 ? 1 : -1;
  return { index, sign };
}

export function embed(text: string, dim: number = DIM): number[] {
  const vec = new Array(dim).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vec;

  const features = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    features.push(`${tokens[i]}_${tokens[i + 1]}`);
  }

  for (const tok of features) {
    const { index, sign } = hashToken(tok);
    vec[index] += sign;
  }

  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) vec[i] /= norm;
  return vec;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

export function hybridScore(
  lexicalScore: number,
  vectorSim: number,
  alpha = 0.35
): number {
  const lexNorm = Math.min(1, lexicalScore / 4);
  const vecNorm = Math.max(0, vectorSim);
  return (1 - alpha) * lexNorm + alpha * vecNorm;
}

export function embedBatch(
  items: Array<{ id: string; text: string }>
): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const item of items) {
    out.set(item.id, embed(item.text));
  }
  return out;
}
