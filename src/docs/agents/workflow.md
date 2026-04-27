# Agent Workflow

This document defines the preferred agentic workflow for LiquidChess.

## Chosen Pattern

LiquidChess uses a layered workflow:

1. Manager-first by default
2. Parallel research as a controlled add-on
3. Evaluator-optimizer loops for quality control on preliminary-complete product states
4. Red-team review before release confidence or external exposure

Why this pattern:

- OpenAI’s current guidance recommends starting with the simplest useful orchestration and adding complexity only when it creates clear value.
- Anthropic’s current guidance explicitly calls out parallel and evaluator-optimizer patterns as useful, but not universal defaults.
- For this repo, most engineering work benefits from one lead agent, while research breadth and post-build quality control justify additional loops.

## Rules

1. Start with a single lead agent.
2. Use `agents/workspace/` as the canonical planning and routing layer.
3. Move through the three stages deliberately:
   - Research: understand the problem, sources, constraints
   - Script: draft transforms, scaffolds, migration steps
   - Production: finalize changes and verify them
4. Delegate only when:
   - subtasks are independent
   - write scopes are disjoint
   - the lead agent can continue useful work without blocking
5. Use parallel workers mainly for research breadth, not routine coding.
6. Once the product is functional in its preliminary state, use an evaluator-optimizer loop for quality control.
7. Before broad release or deployment confidence, run a red-team pass with the `red-team-review` skill.
8. Require a report artifact for substantial work in `src/docs/agents/reports/`.

## Modes

### 1. Manager-First Default

One lead agent owns the task from planning through verification.

Use this for:

- normal coding work
- bug fixing
- docs updates
- migrations with a clear implementation path

### 2. Parallel Research Add-On

The lead agent delegates independent research threads and then synthesizes them.

Use this for:

- platform or vendor comparisons
- architecture audits
- large-source synthesis
- migration discovery

Avoid it when the next step depends on tightly coupled implementation details.

### 3. Evaluator-Optimizer Loop

A generator produces the implementation and an evaluator reviews it against explicit rules, tests, or quality criteria. The generator refines until the gates are met.

Use this when:

- the product is already working in a preliminary state
- refactoring risk is high
- quality gates are strict
- tests or policy checks can drive iteration

This pattern is especially useful for:

- complex refactors
- security-critical implementation work
- strict documentation or style conformance
- agentic TDD loops

The evaluator may be:

- a separate agent
- the same model with a strict critic prompt
- a mix of model critique and automated tests

### 4. Red-Team Gate

Run a red-team pass after the evaluator-optimizer loop stabilizes the product.

Use it to pressure-test:

- prompt injection resistance
- tool misuse paths
- auth and authorization boundaries
- unsafe file or network access
- secrets handling
- web-facing security issues
- jailbreak surfaces

Use the repo-local `red-team-review` skill for this pass and record findings in the report artifact.

## Required Outputs

Every substantial agent run should leave:

- updated source files when applicable
- verification notes
- a report in `src/docs/agents/reports/`

The report should capture:

- objective
- scope
- workflow mode used
- decisions made
- sources used
- files changed
- verification performed
- quality gates used
- red-team findings if applicable
- remaining risks or follow-ups

## Exit Conditions

The run is complete when:

- the requested change is implemented or the blocker is explicit
- verification has been attempted
- the report artifact is written
- handoff context is sufficient for a future agent or human

## Source Basis

This workflow was selected using current public guidance from:

- OpenAI, "A practical guide to building agents"
- OpenAI, "New tools for building agents"
- OpenAI, "Safety in building agents"
- OpenAI, "Introducing AgentKit"
- Anthropic, "How we built our multi-agent research system"
- Anthropic, "Building Effective AI Agents"
