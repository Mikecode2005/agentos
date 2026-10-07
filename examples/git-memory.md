# Git → Memory → Why

```bash
# Inside any git project
agentos init

# Ingest recent history
agentos memory ingest git --limit 80

# Ask institutional questions
agentos memory why "why postgres"
agentos memory why "authentication"
agentos memory why "redis"

# Ranked search still works
agentos memory search "jwt"

# Health
agentos memory inspect
agentos doctor
```

## What gets stored

| Commit signal | Memory type | Example |
|---------------|-------------|---------|
| "because", "chose", "migrate to" | decision | Architectural choice |
| `feat:` | project | Feature landing |
| `fix:` | episodic | Bug context |
| tech keywords in message/files | tags | `#redis` `#jwt` |

Each memory keeps **evidence**: short SHA, files touched, author, original date.
