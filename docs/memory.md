# AgentOS Memory Architecture

## Goal

Institutional memory for software projects — so agents (and humans) can answer:

> **Why did we use Redis here?**

…with evidence, not guesses.

## Storage

```
.agentos/
├── config.json          # project config
├── memory.jsonl         # append-only memory log
└── .gitignore           # keeps memory local by default
```

Each line in `memory.jsonl` is a `MemoryEntry`:

| Field | Purpose |
|-------|---------|
| `type` | decision · project · preference · semantic · episodic |
| `content` | Human-readable fact or decision |
| `source` | `commit:abc1234`, `cli`, `pr:184`, … |
| `evidence` | `{ commit, pr, files[], excerpt }` |
| `confidence` | 0–1 |
| `tags` | searchable labels |
| `author` / `createdAt` | provenance |

## Retrieval (V0.1.1)

Offline **TF-IDF + boosts** (no embedding API required):

1. Tokenize query & documents (stopword removal)
2. BM25-style TF saturation × IDF
3. Boosts:
   - **type** — decisions rank higher for “why” queries
   - **source** — commits / PRs > manual
   - **recency** — newer memories slightly preferred
   - **confidence**

Later: optional vector index (local or hosted) behind the same `search()` API.

## Git ingestion

```bash
agentos memory ingest git --limit 100 --since 2025-01-01
```

- Parses `git log` (subject, body, author, date, files)
- Classifies commits (decision vs feature vs fix…)
- Extracts tech tags (redis, postgres, jwt, …)
- Dedupes by commit SHA
- Stores original commit date as `createdAt`

## Summarization

```bash
agentos memory why "why redis"
```

Extractive pipeline:

1. Rank memories for the query
2. Prefer decision-type hits
3. Pull causal sentences (“because…”, “in order to…”)
4. Attach evidence (commit, files, author, date)
5. Aggregate confidence

Output is structured (`DecisionSummary`) and screenshot-friendly.

## Roadmap

| Stage | Capability |
|-------|------------|
| ✅ V0.1.1 | JSONL store, TF-IDF search, git ingest, extractive why |
| V0.2 | Agent adapters (auto-write decisions from Claude Code / Codex) |
| V0.3 | Optional local embeddings + hybrid search |
| V0.4 | PR / Slack / Linear ingest |
| V1 | Multi-agent shared memory + conflict detection |
