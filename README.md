# AgentOS

**The open-source operating system for AI agents.**

Give Claude Code, Codex, Cline, OpenCode and your own agents **persistent memory**, skills, tools, permissions, and multi-agent collaboration.

```bash
npx agentos init
```

## Quick Start (V0.3)

```bash
agentos init
agentos memory ingest git --limit 50
agentos memory why "why redis"

agentos connect claude-code
agentos connect codex

agentos skill install github
agentos skill list
agentos team create software-team
agentos team run software-team "improve auth session caching"
```

## Roadmap

| Version | Focus |
|---------|-------|
| **V0.1** | Persistent memory (JSONL store) |
| **V0.1.1** | Git ingest · TF-IDF retrieval · `memory why` |
| **V0.2** | ✅ Agent adapters |
| **V0.3** | ✅ Skills · local embeddings · micro-workers · agent teams |
| **V0.4** | Permissions & sandbox |
| **V0.5** | Multi-agent runtime (LLM-backed) |
| **V1.0** | Full AgentOS |

## Philosophy

> "Docker for AI agents."

We don't compete with Claude Code or Codex — we make all of them better.

## License

Apache-2.0
