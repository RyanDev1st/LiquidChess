# Living Execution Plan — [Task Name]

<!-- MANUS PATTERN: "Recite the plan."
  This file lives at the TAIL of the agent's context — always the last thing read.
  It forces re-anchoring on the current objective after long tool chains.
  Update this file IN-PLACE after each step. Do not recreate it.
  NEVER delete failed steps — mark them [FAILED: reason] so the agent learns from them.
  DELETE this file only when the parent task is fully complete.
-->

## Goal

[One sentence: what does "done" look like for this task?]

## Phase Breakdown

<!-- The design cascade. Never jump from goal → code without this. -->

```
Phase 1: Spec / requirements clarity
Phase 2: Stage breakdown (what are the independent units of work?)
Phase 3: Low-level design per stage (which files, which functions?)
Phase 4: Implementation (one stage at a time)
Phase 5: Gate / verification
```

---

## Phase 1 — Spec

**Status:** [TODO | IN_PROGRESS | DONE | FAILED: reason]

Requirements confirmed:
- [ ] [Requirement A]
- [ ] [Requirement B]

Assumptions (explicit — do not embed silently):
- [Assumption 1]

Open questions (block until resolved):
- [Question A] — **Blocking:** [Yes/No]

---

## Phase 2 — Stage Breakdown

**Status:** [TODO | IN_PROGRESS | DONE | FAILED: reason]

| Stage | Description | Dependencies | Status |
|-------|-------------|-------------|--------|
| S1 | [description] | none | TODO |
| S2 | [description] | S1 | TODO |
| S3 | [description] | S2 | TODO |

---

## Phase 3 — Low-Level Design

**Status:** [TODO | IN_PROGRESS | DONE | FAILED: reason]

<!-- Fill per stage. Be specific — file paths, function names. -->

### Stage S1: [name]
- **Files to create:** `[path]`
- **Files to modify:** `[path]`, lines `[range]`
- **Pattern reference:** `[path/to/existing/example]`
- **Test file:** `[path]`

### Stage S2: [name]
- ...

---

## Phase 4 — Implementation Log

**Current stage:** [S1 / S2 / etc.]

| Step | Action | Result | Status |
|------|--------|--------|--------|
| 1 | [action] | [result] | ✅ DONE |
| 2 | [action] | [error description] | ❌ FAILED: [reason] |
| 3 | [action] | [result] | 🔄 IN PROGRESS |

---

## Phase 5 — Gate

**Status:** [TODO | IN_PROGRESS | DONE | FAILED]

- [ ] All tests pass: `[command + output]`
- [ ] Lint clean: `[command + output]`
- [ ] No files modified outside task scope (verify against git diff)
- [ ] No TODOs or FIXMEs in delivered code
- [ ] Sacred files unchanged

**Gate evidence:**
```
[Paste actual command output here — not "it looks good"]
```

---

## Blockers

<!-- Items requiring human input before proceeding. -->

- [ ] [Blocker description] — **Info needed:** [specific question]

---

## Resume Instructions

When starting a new session on this task:
1. Read `[most recently modified file]` first to confirm state.
2. Check Phase 4 Implementation Log for last known status.
3. Say: *"Resuming [task name] at [Phase X / Stage Y]. My next action is: [action]."*
