# AgentOS

**The open-source operating system for AI agents.**

Give Claude Code, Codex, Cline, OpenCode, Gemini CLI, Cursor and your own agents **persistent memory**, skills, tools, permissions, and multi-agent collaboration.

```bash
npx agentos init
```

Your agents shouldn't forget what they learned yesterday.

---

## The Problem

Today's AI coding agents are amnesiacs.

They solve a hard problem, ship a PR, then forget *why* the decision was made.

Next week you ask:

> "Why did we use Redis here?"

…and the agent starts guessing from the codebase again.

## The Solution

**AgentOS** is the infrastructure layer underneath agents.

```
Claude Code / Codex / Cline / OpenCode / Gemini CLI / Cursor / Custom Agents
                              │
                              ▼
┌─────────────────────────────────────────────┐
│                 AgentOS                     │
│                                             │
│  Memory  ·  Skills  ·  Tool Registry        │
│  Agent Identity  ·  Permissions             │
│  Task Runtime  ·  Agent Communication       │
│  Context Compression  ·  Observability      │
│  Evaluation  ·  Long-term Knowledge         │
└─────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
      GitHub               Slack               Notion
      Discord              Linear              Jira
      PostgreSQL           filesystem          MCP tools
```

Not another agent.  
**The operating system for agents.**

---

## Killer Feature: Institutional Memory

```bash
agentos memory ingest git --limit 100
agentos memory why "why did we choose redis?"
```

```
📌 Redis was introduced for session caching after auth endpoints
   showed repeated DB reads under load

Reason:
The API was experiencing repeated database reads during
authentication and session validation.

Decisions & evidence:
• Redis for session caching — high read volume on auth
  └ Michael · 2025-03-18 · commit 82a91f
• JWT rotation every 15 minutes — compliance review
  └ PR #184

Confidence: 91%
Sources: commit:82a91f, PR #184, src/auth/session.ts
```

This is not "AI remembers your conversations."  
This is **institutional memory for software development** — backed by commits, PRs, and decisions.

---

## Quick Start (V0.3)

```bash
# Initialize AgentOS in your project
npx agentos init

# Turn git history into institutional memory
agentos memory ingest git --limit 50

# Ask why (structured answer with evidence)
agentos memory why "why redis"

# Or store a decision manually
agentos memory add "We chose PostgreSQL over MongoDB because of strong consistency requirements."

# Hybrid search (TF-IDF + local embeddings)
agentos memory search "postgres"

# Wire your coding agent
agentos connect claude-code
agentos connect codex

# Install skills
agentos skill install github
agentos skill install debugging
agentos skill list

# Multi-agent team
agentos team create software-team
agentos team run software-team "improve auth session caching"

# Health check
agentos memory inspect
agentos doctor
```

---

## Features (V0.3)

### Memory

| Command | Description |
|---------|-------------|
| `memory add <text>` | Store a decision or fact |
| `memory search <query>` | Hybrid ranked search (TF-IDF + local embeddings) |
| `memory why <query>` | Institutional “why did we…?” answer with evidence |
| `memory ingest git` | Turn git history into memories (`--limit`, `--since`) |
| `memory inspect` | Screenshot-friendly stats |
| `memory list` | List all memories |

- Append-only JSONL store under `.agentos/`
- Evidence links: commit SHA, files, author, date
- Offline local embeddings (feature hashing, no model download)
- Extractive decision summaries

### Agent adapters

```bash
agentos connect claude-code   # → CLAUDE.md
agentos connect codex         # → AGENTS.md + .codex/instructions.md
agentos connect cline         # → .clinerules + AGENTS.md
agentos connect opencode      # → AGENTS.md + OPENCODE.md
agentos connect generic       # → AGENTS.md
agentos disconnect <platform>
agentos context [query]       # refresh .agentos/context.md
```

Agents load instruction files they already understand. No special SDK required.

### Skills

```bash
agentos skill list
agentos skill install github
agentos skill show debugging
```

**Builtin skills:** `github`, `postgres`, `debugging`, `research`, `deployment`

Each skill is a `SKILL.md` playbook (frontmatter + instructions) that agents can load for specialized work.

### Teams & micro-workers

```bash
agentos team create software-team
agentos team list
agentos team run software-team "your goal"
```

Default roles: **planner → researcher → coder → reviewer → tester → deployer**

In-process worker pool handles tasks like `memory.search`, `memory.why`, `agent.plan`.

---

## Architecture

```
agentos/
├── apps/
│   └── cli/              # npx agentos
├── packages/
│   ├── core/             # Shared types
│   ├── memory/           # Store, search, git ingest, embeddings
│   ├── agents/           # Adapters & context injection
│   ├── skills/           # Skill registry + builtins
│   ├── runtime/          # Workers & multi-agent teams
│   ├── tools/            # (coming)
│   ├── permissions/      # (coming)
│   └── evaluation/       # (coming)
├── adapters/             # Platform docs
├── integrations/         # GitHub, Slack, … (planned)
├── examples/
└── docs/
```

### Docs

- [Memory architecture](docs/memory.md) — storage, retrieval, git ingest, summaries
- [Skills & runtime](docs/skills-runtime.md) — skills, embeddings, workers, teams

---

## Roadmap

| Version | Focus |
|---------|-------|
| **V0.1** | Persistent memory (JSONL store) |
| **V0.1.1** | Git ingest · TF-IDF retrieval · `memory why` |
| **V0.2** | ✅ Agent adapters (Claude Code, Codex, Cline, OpenCode, generic) |
| **V0.3** | ✅ Skills · local embeddings · micro-workers · agent teams |
| **V0.4** | Permissions & sandbox |
| **V0.5** | Multi-agent runtime (LLM-backed steps) |
| **V1.0** | Full AgentOS: memory + multi-agent + universal adapters |

---

## Philosophy

> "Docker for AI agents."

| Docker | AgentOS |
|--------|---------|
| standard runtime | standard runtime |
| containers | agents |
| networking | agent communication |
| storage | memory |
| permissions | permissions & sandbox |
| deployment | evaluation & observability |

We don't compete with Claude Code or Codex.  
We make **all of them** dramatically better.

---

## Model Agnostic

Works with:

- OpenAI · Anthropic · Google · DeepSeek · Qwen · Mistral  
- OpenRouter · Local models · Custom models  

---

## Contributing

This is early. The first 1,000 stars will come from making **universal persistent memory** for existing agents unbelievably good.

PRs, issues, and ideas welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

Apache-2.0

---

Built for the age of agents.  
Your agents deserve an operating system.
