# AgentOS

**The open-source operating system for AI agents.**

Give Claude Code, Codex, Cline, OpenCode, Gemini CLI, Cursor and your own agents **persistent memory**, tools, skills, permissions, and multi-agent collaboration.

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

...and the agent starts guessing from the codebase again.

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
agentos memory search "why did we choose redis?"
```

```
Decision: Redis was introduced on March 18.

Reason:
The API was experiencing repeated database reads during
authentication and session validation.

Evidence:
PR #184
commit 82a91f
Slack discussion #backend
architecture.md

Decision maker: Michael
Status: Still active
Confidence: 94%
```

This is not "AI remembers your conversations."  
This is **institutional memory for software development**.

---

## Quick Start (V0.1 – Persistent Memory)

```bash
# Initialize AgentOS in your project
npx agentos init

# Store a decision
agentos memory add "We chose PostgreSQL over MongoDB because of strong consistency requirements and existing ops expertise."

# Search memory
agentos memory search "why postgres?"

# Inspect memory health
agentos memory inspect
```

---

## Roadmap

| Version | Focus |
|---------|-------|
| **V0.1** | Persistent memory (episodic + semantic + project) |
| **V0.2** | Agent adapters (Claude Code, Codex, Cline, OpenCode) |
| **V0.3** | Skills system |
| **V0.4** | Permissions & sandbox |
| **V0.5** | Multi-agent runtime |
| **V1.0** | Full AgentOS: memory + multi-agent + universal adapters |

---

## Architecture

```
agentos/
├── apps/
│   ├── cli/           # npx agentos
│   ├── dashboard/     # (coming)
│   └── playground/
├── packages/
│   ├── core/
│   ├── memory/        # ← current focus
│   ├── agents/
│   ├── skills/
│   ├── tools/
│   ├── runtime/
│   ├── permissions/
│   ├── evaluation/
│   └── providers/
├── adapters/
│   ├── claude-code/
│   ├── codex/
│   ├── cline/
│   ├── opencode/
│   ├── gemini/
│   └── cursor/
├── integrations/
│   ├── github/
│   ├── slack/
│   ├── discord/
│   ├── notion/
│   ├── linear/
│   └── postgres/
├── examples/
├── docs/
└── tests/
```

---

## Philosophy

> "Docker for AI agents."

Not literally Docker — but conceptually:

| Docker              | AgentOS                  |
|---------------------|--------------------------|
| standard runtime    | standard runtime         |
| containers          | agents                   |
| networking          | agent communication      |
| storage             | memory                   |
| permissions         | permissions & sandbox    |
| deployment          | evaluation & observability |

We don't compete with Claude Code or Codex.  
We make **all of them** dramatically better.

---

## Model Agnostic

Works with:

- OpenAI
- Anthropic
- Google
- DeepSeek
- Qwen
- Mistral
- OpenRouter
- Local models
- Custom models

---

## Contributing

This is early. The first 1,000 stars will come from making **universal persistent memory** for existing agents unbelievably good.

PRs, issues, and ideas welcome.

---

## License

Apache-2.0

---

Built for the age of agents.  
Your agents deserve an operating system.
