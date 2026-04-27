# Agent Workflow Implementation Guide

This is the practical operating guide for agentic work in LiquidChess.

## Default Mode

Use the manager-first workflow by default.

How to use it:

1. Start in `agents/workspace/stages/01-research/`.
2. Move to `agents/workspace/stages/02-script/` only when the problem is understood.
3. Move to `agents/workspace/stages/03-production/` only when the implementation path is clear.
4. Keep one lead agent responsible for edits, verification, and the final report.

Use this mode for:

- normal feature work
- bug fixes
- documentation updates
- repo maintenance

## Add-On Mode: Parallel Research

Use parallel research only when the work is naturally breadth-first.

How to use it:

1. Keep one lead agent.
2. Delegate independent research threads only.
3. Do not split overlapping write scopes during the research phase.
4. Merge findings back into one research summary before implementation.

Use this mode for:

- platform comparisons
- architecture audits
- large documentation reviews
- migration discovery

## Quality Mode: Evaluator-Optimizer Loop

Use this after the product reaches a preliminary but functional state.

Pattern:

1. Generator agent produces or refactors the implementation.
2. Evaluator agent reviews it against explicit criteria.
3. Generator refines based on that critique.
4. Repeat until the quality gates are satisfied.

Use this mode for:

- complex refactors
- security-sensitive implementations
- strict style or architecture conformance
- agentic TDD loops

Required evaluation criteria:

- tests pass
- requirements are satisfied
- architecture constraints are still respected
- known style or design rules are met
- no new high-severity findings remain

## Security Mode: Red-Team Gate

After the evaluator-optimizer loop stabilizes the product, run a red-team pass before release candidates or external demos.

Use the repo-local `red-team-review` skill for this step.

Minimum red-team scope:

- prompt injection paths
- tool abuse and excessive permissions
- auth and authorization gaps
- unsafe file access
- input validation failures
- obvious web security issues
- secrets exposure
- jailbreak or instruction override surfaces

Expected outputs:

- attack checklist
- findings ranked by severity
- mitigations or compensating controls
- residual risk statement

## Recommended Sequence

For most meaningful product work, use this order:

1. Manager-first implementation
2. Parallel research only if needed
3. Evaluator-optimizer loop once the product works end-to-end
4. Red-team review before broader release or deployment confidence

## Artifact Rules

For substantial work, always create:

- a report in `src/docs/agents/reports/`
- verification notes
- a list of remaining risks or follow-ups
