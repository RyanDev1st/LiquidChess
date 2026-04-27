# Project Guide

Concise operations reference. Load details from linked docs on demand.

## Key Commands

Run from `src/`:

```bash
npm run dev            # Vite dev server
npm run bot            # Discord bot
npm run observe        # Full system
npm run test           # pytest suite
npm run build:web      # Production build
```

## Architecture Buckets

- `src/app/backend/` — Python bot, analysis engine, Discord services
- `src/app/frontend/` — Vite + React web UI
- `src/design/` — design references and component specs
- `src/docs/` — system documentation

## Engineering Constraints

1. Keep async paths non-blocking.
2. Keep business logic in service modules, not command handlers.
3. Ignore `src/node_modules/` and `src/rag_storage/`.
4. Keep secrets out of tracked files.

## References

- `src/docs/SCHEMA.md`
- `src/docs/IMPLEMENTATION.md`
- `src/docs/agents/workflow.md`
- `src/docs/agents/implementation-guide.md`
