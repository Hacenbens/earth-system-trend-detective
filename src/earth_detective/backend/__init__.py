"""Earth System Trend Detective backend, organised as clean architecture.

    domain/          entities, business rules, Result type, ports (interfaces). Pure Python, no framework.
    application/     use cases. Depend only on domain ports; return Result.
    infrastructure/  adapters: SQLite warehouse, JSON investigation store, statistics, logging.
    interfaces/http/ FastAPI delivery: routers, DTOs, Result -> HTTP mapping, middleware, composition root.

Dependencies point inwards only (interfaces -> application -> domain; infrastructure -> domain).
Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md and docs/app/backend_architecture.md.
"""
