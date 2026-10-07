# GitHub Integration

Ingest PRs, issues, and review comments into AgentOS memory.

## Planned (V0.2+)

```bash
agentos memory ingest github --repo owner/name --since 2025-01-01
```

Will map:

| GitHub artifact | Memory type | Evidence |
|-----------------|-------------|----------|
| Merged PR title + body | decision / project | `pr: N`, files, author |
| Issue discussion | episodic | links |
| Architecture RFCs | decision | links |

Requires `GITHUB_TOKEN` or `gh` CLI auth.

For now, use local git ingestion:

```bash
agentos memory ingest git --limit 100
```
