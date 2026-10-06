# Adapters

Adapters connect AgentOS to existing coding agents.

Planned (V0.2+):

- `claude-code/` — Claude Code integration
- `codex/` — OpenAI Codex / related tooling
- `cline/` — Cline
- `opencode/` — OpenCode
- `gemini/` — Gemini CLI
- `cursor/` — Cursor

Each adapter will expose a thin bridge so the agent can read/write AgentOS memory, use skills, and respect permissions without changing the agent's own model.
