# Contributing to AgentOS

Thanks for your interest in building the operating system for AI agents.

## Current Focus (V0.1)

**Universal persistent memory** for Claude Code, Codex, Cline, OpenCode and other agents.

The sharpest path to the first 1,000 stars is making memory so good that people screenshot `agentos memory inspect` and share it.

## Development Setup

```bash
git clone https://github.com/Mikecode2005/agentos.git
cd agentos
npm install
npm run build
```

Run the CLI locally:

```bash
npx tsx apps/cli/src/index.ts init
npx tsx apps/cli/src/index.ts memory add "Test decision"
npx tsx apps/cli/src/index.ts memory search "test"
```

## Project Structure

See the root README for the monorepo layout.

## Principles

1. **Model-agnostic** — never lock users into one provider.
2. **Agent-agnostic** — adapters, not lock-in.
3. **Shareable output** — every command should produce something people want to screenshot.
4. **Small, focused PRs** — especially while we are still shaping the core.

## Code Style

- TypeScript (strict)
- ESM
- Prefer simple, readable code over clever abstractions in V0.x

## Questions?

Open an issue. We're early — ideas are as valuable as code.
