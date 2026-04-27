# Agent Context Cleanup Report

## Summary

- Date: 2026-04-26
- Agent: Copilot (GPT-5.3-Codex)
- Task: Full implementation pass to reduce agent context saturation and improve startup efficiency for Claude/Codex
- Stage: Production
- Workflow mode: Manager-first

## Objective

Reduce always-loaded instruction weight, remove duplicated startup policy blocks, restore canonical routing paths, and sanitize exposed credentials from tracked files.

## Scope

Included:

- startup shim refactor (`CLAUDE.md`, `AGENTS.md`)
- recreation of canonical `agents/workspace` layer
- doc routing consistency fixes for `docs/agents/*`
- credential sanitation in tracked config/env files
- global alignment for `~/.claude` startup footprint

Excluded:

- key rotation in external providers (must be performed by user)
- runtime CI automation for secret scanning

## Findings

1. Root startup shims were carrying stale or duplicated guidance and high-token policy payloads.
2. Canonical paths referenced by startup docs were missing in the repository.
3. Tracked config/env files contained live credential material.

## Decisions

1. Keep startup shims concise and policy-only.
2. Move canonical operational contract into `agents/workspace/shared/*`.
3. Treat long references as on-demand docs, not always-on startup context.
4. Sanitize tracked credential-bearing files immediately.

## Changes Made

- Updated startup shims:
  - `CLAUDE.md`
  - `AGENTS.md`
- Recreated canonical workspace layer:
  - `agents/workspace/CONTEXT.md`
  - `agents/workspace/shared/project-guide.md`
  - `agents/workspace/shared/agent-parity.md`
  - `agents/catalog/claude-skill-catalog.md`
  - `agents/workspace/skills/README.md`
  - `agents/workspace/skills/context7-cli/README.md`
  - `agents/workspace/skills/context7-cli/SKILL.md`
  - `agents/workspace/skills/red-team-review/SKILL.md`
  - `agents/workspace/stages/01-research/README.md`
  - `agents/workspace/stages/02-script/README.md`
  - `agents/workspace/stages/03-production/README.md`
- Updated docs routing consistency:
  - `docs/agents/README.md`
  - `docs/agents/implementation-guide.md`
  - `docs/agents/reports/README.md`
  - `docs/ARCHITECTURE.md`
- Sanitized credential-bearing config files:
  - `.env`
  - `claude-flow.config.json`
  - `app/backend/config/secrets.env`
  - `.gitignore` (added explicit protections)
- Global alignment:
  - `C:/Users/admin/.claude/CLAUDE.md`
  - `C:/Users/admin/.claude/settings.json`

## Verification

Commands run:

1. Stale-directive scan on startup/docs (`grep -nE ...`) -> no matches for:
   - `Always use /caveman ultra`
   - `rtk-instructions`
   - `lightrag-upload`
   - `lightrag-query`
2. Leaked-value scan on key files (`grep -nE ...`) -> no matches for previously exposed values.
3. Line-count reduction check (`wc -l`) ->
   - `CLAUDE.md`: 28 lines
   - `AGENTS.md`: 29 lines
   - `~/.claude/CLAUDE.md`: 15 lines

## Quality Gates

- Gate: canonical routing paths exist and resolve -> pass
- Gate: startup shims are concise/high-signal -> pass
- Gate: known leaked secrets removed from edited files -> pass
- Gate: docs/agents links use repository-relative canonical paths -> pass

## Risks

1. Credential values were removed from tracked files; local runtime now depends on user-provided secrets.
2. External provider keys should be rotated because previous values were exposed in tracked files.
3. Global plugin disablement (`episodic-memory`, `antigravity-skills`) may alter prior personal workflow behavior.

## Next Actions

1. Rotate all previously exposed provider and Discord/GitHub credentials.
2. Repopulate local secrets via untracked files or environment variables.
3. Optionally add CI secret scanning and startup-size guard checks.
