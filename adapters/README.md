# Adapters

Adapters connect AgentOS memory to existing coding agents by injecting
instruction files those agents already load.

## Quick connect

```bash
agentos init
agentos memory ingest git --limit 50

agentos connect claude-code   # → CLAUDE.md
agentos connect codex         # → AGENTS.md + .codex/instructions.md
agentos connect cline         # → .clinerules + AGENTS.md
agentos connect opencode      # → AGENTS.md + OPENCODE.md
agentos connect generic       # → AGENTS.md only
```

## How it works

1. **Context file** — `.agentos/context.md` is regenerated with ranked decisions
2. **Instruction inject** — a managed block (between `<!-- agentos:begin/end -->`)
   is written into the agent’s instruction file
3. **CLI bridge** — agents are told to run `agentos memory why/search/add`

Agents do **not** need a special SDK. They read markdown they already understand.

## Platforms

| Platform | Instruction files | Status |
|----------|-------------------|--------|
| Claude Code | `CLAUDE.md` | ✅ V0.2 |
| Codex | `AGENTS.md`, `.codex/instructions.md` | ✅ V0.2 |
| Cline | `.clinerules`, `AGENTS.md` | ✅ V0.2 |
| OpenCode | `AGENTS.md`, `OPENCODE.md` | ✅ V0.2 |
| Generic | `AGENTS.md` | ✅ V0.2 |
| Gemini CLI | TBD | planned |
| Cursor | TBD | planned |

## Disconnect

```bash
agentos disconnect claude-code
```

Only removes the AgentOS managed block; the rest of the file is left intact.

## Implementation

Logic lives in `packages/agents` (`@agentos/agents`).
This `adapters/` folder documents the public contract.
