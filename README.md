# AgentOS

**The open-source operating system for AI agents.**

Persistent memory, skills, sandboxed tools, permissions, and multi-agent teams for Claude Code, Codex, Cline, OpenCode, and custom agents.

```bash
npx agentos init
```

## Quick Start (V0.5)

```bash
agentos init
agentos memory ingest git --limit 50
agentos memory why "why redis"

agentos connect claude-code
agentos skill install debugging

agentos team create software-team
agentos team run software-team "improve auth session caching"

agentos terminal "npm test" --role tester
agentos permissions show

agentos mcp
agentos dashboard
agentos --help
```

### LLM (optional)
```bash
export OPENAI_API_KEY=sk-...
agentos team run software-team "your goal"
```

Without a key: deterministic plan + **real tool execution** still runs.

## What's real (V0.5)

| Capability | Status |
|------------|--------|
| Git → institutional memory | ✅ |
| Hybrid search + `memory why` | ✅ |
| Agent file adapters | ✅ |
| Role permissions + path sandbox | ✅ |
| Terminal + read/write file tools | ✅ |
| Team steps executing tools | ✅ |
| Skills matched into steps | ✅ |
| Audit log | ✅ |
| Memory MCP stdio tools | ✅ |
| LLM plan (when key set) | ✅ |

## Architecture

```
packages/
  memory/ agents/ skills/ runtime/
  permissions/ tools/ providers/
apps/
  cli/ dashboard/
```

Docs: [memory](docs/memory.md) · [V0.4](docs/v0.4.md) · [V0.5](docs/v0.5.md)

## Roadmap

| Version | Focus |
|---------|-------|
| V0.1–0.4 | Memory · adapters · skills · permissions · dashboard |
| **V0.5** | ✅ Real tool execution · MCP memory · audit · skill apply |
| V0.6 | Full MCP protocol · tighter agent write loops |
| V1.0 | Production AgentOS |

## License

Apache-2.0
