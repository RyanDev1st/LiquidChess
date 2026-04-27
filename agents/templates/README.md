# Agent Templates — April 2026

Production-grade templates for AI-agent–oriented projects.

**Sources synthesized:** Anthropic engineering (Dec 2024), Manus context engineering blog, community practice from r/ClaudeAI + r/LocalLLaMA, philschmid.de, humanlayer.dev, production post-mortems (2025).

---

## Design Axioms

1. **Simplicity first.** Add complexity only when it demonstrably improves outcomes.
2. **Token is currency.** Every startup-file line costs money and attention — earn it.
3. **Progressive disclosure.** Startup files point; they do not contain.
4. **Context is finite RAM.** Manage it with the same rigor as CPU/memory in systems engineering.
5. **Surgical changes only.** Every changed line must trace to the user's request.
6. **Verifiable success.** Rules must be binary and testable, not vague.

---

## Template Index

| Template | Use Case | Primary Problem Solved |
|----------|----------|----------------------|
| [`CLAUDE.md`](CLAUDE.md) | Root agent constitution | Bootstrap, cost, parity, instruction drift |
| [`PLAN.md`](PLAN.md) | Living execution plan (tail-anchored) | Goal drift, hallucination mid-task |
| [`LESSONS.md`](LESSONS.md) | Cross-session mistake log | Cross-session learning without bloat |
| [`skills/SKILL.md`](skills/SKILL.md) | On-demand playbook | Modular context, token efficiency |
| [`context/CONTEXT.md`](context/CONTEXT.md) | Scoped domain orientation | Workspace focus without bloat |
| [`agents/ORCHESTRATOR.md`](agents/ORCHESTRATOR.md) | Hub orchestrator prompt | Decomposition, shallow hierarchy, drift prevention |
| [`agents/SUBAGENT.md`](agents/SUBAGENT.md) | Specialized worker prompt | Isolated context, contract-based handoffs |
| [`memory/SESSION.md`](memory/SESSION.md) | Mid-session compaction snapshot | Long-session survival |
| [`memory/HANDOFF.md`](memory/HANDOFF.md) | Inter-agent state baton | Clean handoff, no context pollution |
| [`evals/EVAL.md`](evals/EVAL.md) | Adversarial quality gate | Hallucination detection, silent failure prevention |

---

## Key Community Insights (April 2026)

These patterns are validated in production — not just docs:

| Pattern | Source | Why it matters |
|---------|--------|---------------|
| `todo.md` at **prompt tail** | Manus engineering | Forces re-anchoring on goal after long tool chains |
| **Preserve failure traces** | Manus engineering | Agent learns from errors in-context; purging causes repeat failures |
| **Spec vs Output file classification** | r/ClaudeAI | Agents silently "refactor" spec files — they must know which files are sacred |
| **Git as primary memory** | r/LocalLLaMA | More reliable than RAG for coding agents; commit history is native state |
| **Design cascade** (spec→stages→low-level→code) | r/LocalLLaMA | Hallucinations spike when jumping plan→code |
| **Instruction drift** >500 lines | Community consensus | Bottom rules ignored; stay under 150–200 lines in root file |
| **Shallow orchestration** (≤2 tiers) | Production post-mortems | Deep hierarchies cause objective drift |
| **State machine phase-gating** | r/ClaudeAI power users | "Plan Mode" cannot call write tools — enforced, not trusted |
| **`lessons.md`** self-logging | r/LocalLLaMA | Cross-session continuity without bloating startup context |
| **Silent failure trap** | Production post-mortems | Tools returning null must throw, not silently continue |

---

## Token Budget Guidelines

| Slot | Target |
|------|--------|
| System prompt / constitution | 10–15% |
| Tool definitions | 15–20% |
| RAG / retrieved context | 30–40% |
| Conversation history | 20–30% |
| Output buffer | 10–15% |

**Route cheap tasks** (classification, formatting) to Flash-class models.
**Reserve frontier models** for planning, synthesis, edge-case resolution.

---

## Anti-Hallucination Stack

```
Layer 1 — Instruction  : explicit "I don't know" permission
Layer 2 — Grounding    : quote source before reasoning about it
Layer 3 — Verification : run tests/lint as gate evidence, not trust
Layer 4 — Adversarial  : reviewer agent from different model family
Layer 5 — Trace        : preserve failure history; never purge from context
```
