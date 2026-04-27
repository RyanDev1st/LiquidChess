# Agent Lessons Log

<!-- COMMUNITY PATTERN: "lessons.md"
  The agent self-documents mistakes here so they persist across sessions.
  This file is LOADED AT THE START of every session (referenced in CLAUDE.md).
  It does NOT replace the root CLAUDE.md — it supplements it with earned experience.
  
  HOW TO USE:
    - Agent: at end of any session where a non-obvious mistake was made, append a new entry.
    - Human: periodically review and promote critical lessons to CLAUDE.md rules.
    - Human: prune entries older than [6 months] that are no longer relevant.
  
  FORMAT: One entry per mistake. Keep entries ≤ 5 lines each.
  TARGET: Stay under 50 total entries. Promote + prune at 40+.
-->

## Format

```
### [YYYY-MM-DD] [Category] — [Short title]
**What happened:** [One sentence]
**Root cause:** [One sentence]
**Fix / prevention:** [Actionable rule]
**Promoted to CLAUDE.md?** [Yes / No — pending]
```

---

## Entries

<!-- Add new entries below. Most recent first. -->

### [YYYY-MM-DD] [Category: e.g., Paths / APIs / Scope / Context] — [Title]
**What happened:** [description]
**Root cause:** [cause]
**Fix / prevention:** [rule]
**Promoted to CLAUDE.md?** No — pending review

---

<!-- Example entries for reference — delete before use -->

<!--
### 2026-03-14 Paths — Used relative paths after directory change
**What happened:** Tool call failed because agent used `./src/` after moving into a subdirectory.
**Root cause:** Relative paths silently break when `cwd` shifts during a task.
**Fix / prevention:** Always use absolute paths in all tool calls. Verify cwd before any file operation.
**Promoted to CLAUDE.md?** Yes

### 2026-02-28 Scope — Modified settings.yaml unprompted
**What happened:** Agent "improved" settings.yaml while fixing an unrelated bug.
**Root cause:** settings.yaml was not classified as SACRED in CLAUDE.md at the time.
**Fix / prevention:** All config files are SACRED unless explicitly listed as OUTPUT. Added to CLAUDE.md.
**Promoted to CLAUDE.md?** Yes

### 2026-02-15 APIs — Used non-existent function `parse_board_v2`
**What happened:** Agent invented a function signature that doesn't exist in the codebase.
**Root cause:** Did not verify against source before use. Assumed function existed based on naming pattern.
**Fix / prevention:** Always grep/search for function signature in source before using it. Never assume.
**Promoted to CLAUDE.md?** Yes

### 2026-01-30 Context — Retry loop continued after tool returned null
**What happened:** RAG tool returned empty result; agent proceeded as if it had data, producing hallucinated citations.
**Root cause:** Silent failure — null return was not treated as an error.
**Fix / prevention:** Any tool returning empty/null must be treated as BLOCKED, not as "no relevant data". Escalate.
**Promoted to CLAUDE.md?** No — task-specific
-->
