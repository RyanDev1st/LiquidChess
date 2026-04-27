# Workspace Context

Canonical control plane for agent behavior in this repository.

## Purpose

Keep startup context small and stable:

1. Always-loaded files stay short and policy-focused.
2. Detailed references are loaded on demand.
3. Stage folders hold task artifacts, not global policy.

## Routing

Use this sequence for meaningful work:

1. `agents/workspace/stages/01-research/`
2. `agents/workspace/stages/02-script/`
3. `agents/workspace/stages/03-production/`

## Canonical Sources

- `agents/workspace/shared/project-guide.md`
- `agents/workspace/shared/agent-parity.md`
- `agents/workspace/skills/`
- `agents/catalog/claude-skill-catalog.md`

## Context Budget Rules

1. Keep startup files concise and high-signal.
2. Do not duplicate long command catalogs across startup files.
3. Prefer summary first, details on demand.
4. Avoid stale paths and dead references.

## Operating Rule

When guidance changes:

1. Update `agents/workspace/shared/*` first.
2. Keep `CLAUDE.md` and `AGENTS.md` as compatibility shims.
3. Keep reports in `src/docs/agents/reports/` for substantial work.
