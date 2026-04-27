# Agent Workflow V2 Report

## Summary

- Date: 2026-04-02
- Agent: Codex
- Task: Finalize the repo workflow around manager-first delivery, parallel research, evaluator-optimizer quality control, and red-team review
- Stage: Production
- Workflow mode: Manager-first with research and quality-control policy updates

## Objective

Update the repo workflow using current external guidance and codify how the team should actually use it.

## Scope

Included:

- final external workflow check
- workflow update
- implementation guide
- red-team skill creation
- reporting template update

Excluded:

- runtime automation enforcement
- external platform authentication

## Sources

- OpenAI: https://openai.com/business/guides-and-resources/a-practical-guide-to-building-agents/
- OpenAI: https://openai.com/index/introducing-agentkit/
- OpenAI: https://developers.openai.com/api/docs/guides/agent-builder-safety
- Anthropic: https://claude.com/blog/building-agents-with-the-claude-agent-sdk
- Anthropic PDF: https://resources.anthropic.com/hubfs/Building%20Effective%20AI%20Agents-%20Architecture%20Patterns%20and%20Implementation%20Frameworks.pdf?hsLang=en

## Findings

- Manager-first is still the best default for most engineering work.
- Parallel delegation is best reserved for breadth-first research.
- Evaluator-optimizer loops are now a clearly recommended pattern when explicit quality criteria exist.
- Safety guidance increasingly emphasizes guardrails, human approvals, evals, and explicit red teaming.

## Decisions

- Keep manager-first as the default mode.
- Keep parallel research as an add-on, not the default.
- Add evaluator-optimizer as the quality-control mode once the product is preliminarily complete.
- Add red-team review as a post-quality gate before release confidence.

## Changes Made

- Added `docs/agents/implementation-guide.md`
- Updated `docs/agents/workflow.md`
- Updated `docs/agents/README.md`
- Updated `docs/agents/report-template.md`
- Added `agents/workspace/skills/red-team-review/SKILL.md`
- Added root Claude and Codex mirrors for `red-team-review`
- Added this report

## Verification

- Verified updated docs structure locally
- Performed a final web check against current OpenAI and Anthropic sources

## Quality Gates

- Gate: workflow reflects current external guidance
- Gate: implementation guidance is explicit and actionable
- Gate: quality-control and security phases are documented

## Red-Team Review

- Run: Not executed in this workflow update task
- Findings: N/A
- Mitigations: Added a dedicated `red-team-review` skill and process gate

## Risks

- The workflow is documented but not automatically enforced
- The local Claude skill mirror still is not a full mirror of the Codex mirror set

## Next Actions

- Enforce report generation through automation later if desired
- Optionally add evaluator and red-team report checklists as separate reusable docs
