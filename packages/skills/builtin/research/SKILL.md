---
name: research
description: Research unfamiliar APIs, libraries, and design options
version: 0.1.0
tags: [research, docs, compare, evaluate]
tools: [browser, filesystem]
triggers: [research, compare, evaluate, options, alternatives, docs]
---

# Research Skill

1. Clarify the decision criteria (latency, cost, ops familiarity, consistency).
2. Check project memory first — we may already have decided:
   ```bash
   npx agentos memory why "related topic"
   npx agentos memory search "library name"
   ```
3. Compare 2–3 options with a short table (pros / cons / fit).
4. Recommend one option with a clear reason.
5. If a choice is made, record it in AgentOS immediately.
