# Agent Parity

Defines Claude/Codex alignment rules for this repository.

## Canonical Layer

Both surfaces route to:

- `agents/workspace/CONTEXT.md`
- `agents/workspace/shared/project-guide.md`
- `agents/workspace/shared/agent-parity.md`

## Surface Files

Claude-facing:

- `CLAUDE.md`
- `agents/workspace/skills/` (and optional `.claude/skills/` mirrors)

Codex-facing:

- `AGENTS.md`
- `agents/workspace/skills/` (and optional `.codex/skills/` mirrors)

## Parity Rules

1. Keep shims brief and aligned.
2. Do not rely on tool-specific slash command syntax in shared docs.
3. Keep style directives explicit and portable.
4. Keep long operational references out of startup shims.

## Efficiency Rules

1. Summary first, details by explicit lookup.
2. Remove duplicate policy blocks.
3. Prefer stable canonical files over scattered duplicated notes.
