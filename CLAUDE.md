# CLAUDE.md

Claude-facing compatibility shim. Route to the canonical layer, not this file.

## Canonical Context

- `agents/workspace/CONTEXT.md`
- `agents/workspace/shared/project-guide.md`
- `agents/workspace/shared/agent-parity.md`
- `agents/workspace/skills/`

## Always-On Rules

1. Follow this pipeline for all tasks: Search or Research -> Address the problem -> Plan -> Implement -> Audit. Skip steps when necessary. 
2. Startup context stays minimal — load long references on demand.
3. Do not duplicate command catalogs here.
4. For design tasks under `src/design/`, follow `src/design/CONTEXT.md`.
5. Ignore `src/node_modules/` and `src/rag_storage/` in all operations.
6. Always execute inline, do not use subagents for medium to high-signal tasks.
7. Always update `src\docs\SCHEMA.md` and `src\docs\WEB_FRONTEND.md`; `src\docs\memory` with learnings and progresses after each phase. Conversely, always check these files for reference before executing any task.

Name the files accordingly with the main ideas. The top of the page has to have a short summary and the timestamp of the last update.

8. At the end of each phase, git commit with a concise message describing the change, and push to the remote repository `https://github.com/RyanDev1st/LiquidChess`

## Project Schema

- `src/docs/SCHEMA.md` — canonical directory structure
- `src/docs/IMPLEMENTATION.md` — architecture, patterns, deployment
- `src/app/backend/` — Python bot + analysis engine
- `src/app/frontend/` — React/Vite web UI

## Parity

Keep aligned with `AGENTS.md`. Update `agents/workspace/shared/` first.