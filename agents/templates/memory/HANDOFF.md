# Agent Handoff Protocol

<!-- 
  COMMUNITY PATTERN: Clean Baton Passing
  When transferring control to another agent, explicitly passing state prevents
  the new agent from hallucinating context or missing subtle assumptions.
-->

## The Handoff Contract
When delegating work to another agent or handing back to a user, provide a structured handoff.

---

### [Agent Persona A] -> [Agent Persona B / User]

**Objective Transferred:** [What is the next entity supposed to do?]

**Required Context:**
- `[File path 1]`
- `[File path 2]`

**Work Completed:**
1. [What did you do?]
2. [What did you do?]

**Decisions & Assumptions Made:**
*(Crucial: Prevent silent logic bombs)*
- Assumed [X] because [Y].
- Chose [Library A] over [Library B] because [Z].

**What Not To Do:**
*(Prevent the new agent from exploring dead ends)*
- Do not attempt [Path A], it failed because [Reason].

**Blocking Issues / Gaps:**
- Need [Auth Token] to proceed.
- API endpoint `[URL]` is currently returning 404.
