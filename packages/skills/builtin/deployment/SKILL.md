---
name: deployment
description: Safe deploys, rollbacks, health checks, and release notes
version: 0.1.0
tags: [deploy, release, ci, cd, rollback]
tools: [terminal, github, filesystem]
triggers: [deploy, release, production, rollback, ship]
---

# Deployment Skill

1. Prefer progressive delivery (canary / staged) over big-bang when risk is high.
2. Require health checks and a documented rollback path before production.
3. Never deploy secrets from chat; use the project's secret manager.
4. Record release rationale:
   ```bash
   npx agentos memory add "Shipped v1.4 with connection pool fix; rollback = previous image tag"
   ```
5. After deploy: verify metrics/logs; link evidence in memory.
