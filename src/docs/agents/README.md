# Agent Reports

This folder is the human-readable reporting layer for agent work in LiquidChess.

It exists so Claude Code and Codex leave behind durable artifacts after substantial work, not just terminal output.

## Workflow

The repo uses a manager-first workflow:

1. Route the task through `agents/workspace/CONTEXT.md`.
2. Use `agents/workspace/stages/01-research`, `agents/workspace/stages/02-script`, and `agents/workspace/stages/03-production` to organize active work.
3. Only use parallel subagents when the work is genuinely breadth-first and can be split cleanly.
4. After substantial work, write a report in `src/docs/agents/reports/`.

This follows the same core pattern recommended by current OpenAI and Anthropic agent guidance:

- one orchestrator or manager for control flow
- specialized workers only when needed
- clear exit conditions
- persistent artifacts for planning, findings, and verification

## What goes here

- `reports/`: dated run reports, findings, verification notes, handoff summaries
- `report-template.md`: standard report structure
- `workflow.md`: the repo-specific agent workflow contract
- `implementation-guide.md`: how to run the workflow in practice

## Naming

Use this filename pattern for reports:

`YYYY-MM-DD-topic-agent-report.md`

Examples:

- `2026-04-02-agent-workflow-refresh-report.md`
- `2026-04-02-discord-cog-audit-report.md`
