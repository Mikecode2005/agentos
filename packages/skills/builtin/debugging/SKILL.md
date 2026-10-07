---
name: debugging
description: Systematic debugging — reproduce, isolate, fix, verify
version: 0.1.0
tags: [debug, bug, error, stacktrace]
tools: [terminal, filesystem, browser]
triggers: [bug, error, debug, stack, crash, fail, failing]
---

# Debugging Skill

Process:

1. **Reproduce** — get a minimal failing case; note environment.
2. **Isolate** — binary search / bisect; check recent commits via AgentOS:
   ```bash
   npx agentos memory search "related change"
   npx agentos memory why "recent auth change"
   ```
3. **Hypothesize** — one change at a time.
4. **Fix** — smallest correct patch; add a regression test.
5. **Record** — if the bug reveals a design decision, store it:
   ```bash
   npx agentos memory add "Fixed race in session refresh by serializing token rotation"
   ```
