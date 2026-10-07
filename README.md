# AgentOS

**The open-source operating system for AI agents.**

Give Claude Code, Codex, Cline, OpenCode, Gemini CLI, Cursor and your own agents **persistent memory**, skills, tools, permissions, and multi-agent collaboration.

```bash
npx agentos init
```

Your agents shouldn't forget what they learned yesterday.

---

## The Problem

Today's AI coding agents are amnesiacs. They solve a hard problem, ship a PR, then forget *why* the decision was made.

## The Solution

**AgentOS** is the infrastructure layer underneath agents — memory, skills, permissions, sandboxed tools, and multi-agent teams.

Not another agent. **The operating system for agents.**

---

## Quick Start (V0.4)

```bash
npx agentos init

# Institutional memory from git
agentos memory ingest git --limit 50
agentos memory why "why redis"

# Wire coding agents
agentos connect claude-code
agentos connect codex

# Skills
agentos skill install github
agentos skill list

# Permissions + sandboxed terminal
agentos permissions show
agentos terminal "ls src" --role coder

# Multi-agent team (LLM plan if API key set)
agentos team create software-team
agentos team run software-team "improve auth session caching"

# Localhost dashboard
agentos dashboard
# → http://127.0.0.1:3847

agentos --help
agentos doctor
```

---

## Features

### Memory
| Command | Description |
|---------|-------------|
| `memory add` | Store a decision or fact |
| `memory search` | Hybrid TF-IDF + local embeddings |
| `memory why` | Institutional answer with evidence |
| `memory ingest git` | Commit history → memories |
| `memory inspect` | Stats |

Offline feature-hash embeddings by default. Optional:

```bash
npm install @xenova/transformers
export AGENTOS_EMBEDDINGS=transformers
```

### Agent adapters
`connect claude-code | codex | cline | opencode | generic`

### Skills
Builtin: `github`, `postgres`, `debugging`, `research`, `deployment`

### Permissions & sandbox
`.agentos/permissions.json` — per-role capabilities, path allow/deny, blocked shell patterns.

### Terminal
```bash
agentos terminal "npm test" --role tester
```

### Teams (LLM-backed)
Set `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `AGENTOS_LLM_*`. Without a key → deterministic stub.

### Dashboard
```bash
agentos dashboard [--port 3847]
```

---

## Architecture

```
packages/
  core/ memory/ agents/ skills/ runtime/
  permissions/ tools/ providers/
apps/
  cli/ dashboard/
```

Docs: [memory](docs/memory.md) · [skills/runtime](docs/skills-runtime.md) · [V0.4](docs/v0.4.md)

---

## Roadmap

| Version | Focus |
|---------|-------|
| V0.1–0.1.1 | Memory · git ingest · `memory why` |
| V0.2 | ✅ Agent adapters |
| V0.3 | ✅ Skills · embeddings · workers · teams |
| **V0.4** | ✅ Permissions · sandbox terminal · LLM plans · dashboard · `--help` |
| V0.5 | Richer multi-agent execution · evaluation |
| V1.0 | Full AgentOS |

---

## Philosophy

> "Docker for AI agents."

We don't compete with Claude Code or Codex — we make **all of them** better.

**Model agnostic:** OpenAI · Anthropic · Google · local · OpenRouter · custom.

## License

Apache-2.0
