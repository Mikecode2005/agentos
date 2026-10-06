# Basic Memory Example

```bash
# 1. Initialize
agentos init

# 2. Record architectural decisions
agentos memory add "We chose PostgreSQL over MongoDB because of strong consistency requirements and existing ops expertise on the team."
agentos memory add "Redis was introduced for session caching after auth endpoints showed repeated DB reads under load (PR #184)."
agentos memory add "JWT rotation every 15 minutes — security requirement from the compliance review in March."

# 3. Ask why
agentos memory search "why redis"
agentos memory search "postgres"

# 4. Inspect
agentos memory inspect
agentos doctor
```
