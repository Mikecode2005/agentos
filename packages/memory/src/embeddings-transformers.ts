/**
 * Optional transformers.js embeddings backend.
 *
 *   AGENTOS_EMBEDDINGS=transformers
 *   npm install @xenova/transformers
 */

import { embed as hashEmbed, cosineSimilarity } from "./embeddings.js";

let pipelinePromise: Promise<(text: string, opts?: object) => Promise<unknown>> | null = null;

async function getPipeline(): Promise<
  (text: string, opts?: object) => Promise<{ data: Float32Array }>
> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      // @ts-expect-error optional peer dependency
      const { pipeline } = await import("@xenova/transformers");
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    })();
  }
  return pipelinePromise as Promise<
    (text: string, opts?: object) => Promise<{ data: Float32Array }>
  >;
}

function meanPool(data: Float32Array, dims: number): number[] {
  const tokens = data.length / dims;
  const out = new Array(dims).fill(0);
  for (let t = 0; t < tokens; t++) {
    for (let d = 0; d < dims; d++) out[d] += data[t * dims + d];
  }
  for (let d = 0; d < dims; d++) out[d] /= tokens || 1;
  let norm = 0;
  for (const v of out) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return out.map((v) => v / norm);
}

export async function embedTransformers(text: string): Promise<number[]> {
  try {
    const extractor = await getPipeline();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    if (output && typeof output === "object" && "data" in output) {
      const data = (output as { data: Float32Array }).data;
      if (data.length <= 768) return Array.from(data);
      return meanPool(data, 384);
    }
    return hashEmbed(text);
  } catch {
    return hashEmbed(text);
  }
}

export function embeddingsBackend(): "transformers" | "hash" {
  return process.env.AGENTOS_EMBEDDINGS === "transformers" ? "transformers" : "hash";
}

export async function embedAuto(text: string): Promise<number[]> {
  if (embeddingsBackend() === "transformers") return embedTransformers(text);
  return hashEmbed(text);
}

export { cosineSimilarity };
