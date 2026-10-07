---
name: postgres
description: PostgreSQL schema design, queries, migrations, and performance
version: 0.1.0
tags: [postgres, sql, database, migration]
tools: [postgres, terminal, filesystem]
triggers: [postgres, postgresql, sql, migration, schema, index]
---

# PostgreSQL Skill

Guidelines:

1. Prefer explicit migrations over ad-hoc DDL in production.
2. Always consider indexes for filter/join columns used in hot paths.
3. Use transactions for multi-step writes.
4. Document why a table/index exists in AgentOS:
   ```bash
   npx agentos memory add "Added index on sessions.user_id because auth lookup was seq-scanning"
   ```
5. Avoid `SELECT *` in application code; project needed columns.
6. For connection pooling, prefer PgBouncer or built-in pool limits over unbounded clients.
