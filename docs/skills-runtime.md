# Skills, Embeddings, Workers & Agents (V0.3)

## Skills

```bash
agentos skill list
agentos skill install github
agentos skill install postgres
agentos skill show debugging
```

Location: `.agentos/skills/<id>/SKILL.md` and `packages/skills/builtin/`.

## Local embeddings (hybrid search)

Feature hashing (256-d), offline, no model download. Search blends TF-IDF + cosine similarity.

## Micro-workers

```ts
const pool = new WorkerPool({ concurrency: 4 });
registerBuiltinHandlers(pool, { searchMemory, whyMemory, addMemory });
pool.submit("memory.search", { query: "redis" });
```

## Agent teams

```bash
agentos team create software-team
agentos team run software-team "improve session caching"
```

Roles: planner, researcher, coder, reviewer, tester, deployer.
