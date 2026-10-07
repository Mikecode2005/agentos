---
name: github
description: Work with GitHub repositories, PRs, issues, and commits
version: 0.1.0
tags: [github, git, pr, review]
tools: [github, terminal, filesystem]
triggers: [github, pull request, pr, issue, commit, review]
---

# GitHub Skill

When working with GitHub:

1. Prefer `gh` CLI when available (`gh pr list`, `gh pr view`, `gh issue list`).
2. Always check existing PRs before opening duplicates.
3. Link decisions to PR numbers and commit SHAs in AgentOS memory:
   ```bash
   npx agentos memory add "Merged auth refactor in PR #184 because session reads were hot"
   ```
4. For reviews: summarize risk, tests, and migration notes.
5. Never force-push to shared default branches.
