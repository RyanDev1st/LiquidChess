# Session State Snapshot

<!-- 
  COMMUNITY PATTERN: Context Compaction
  As a session grows long, context rots. The agent gets confused by its own history.
  This file is used to compress the *current state* of a long-running session, allowing
  the context window to be cleared and re-initialized without losing progress.
-->

## Snapshot Creation Rules
Before clearing context, write the current state to this file.
Be dense. Do not use conversational prose. Use bullet points and precise paths.

---

**Task:** [What was the overarching task?]
**Timestamp:** [When was this snapshotted?]

### 1. Completed So Far
- [Action taken] -> [Specific file path]
- [Action taken] -> [Specific file path]

### 2. Current State System
- **Current active phase in PLAN.md:** [Phase & Stage]
- **Outstanding blockers:** [Any issues that need addressing]

### 3. Open Threads / Unsaved Work
- [List any assumptions made that haven't been validated]
- [List any half-finished functions]
- [List pending refactors postponed to later]

### 4. Resume Context Needed
When resuming, the next agent should load:
- [File A]
- [File B]

### 5. Known Traps Avoided 
*(Leave notes for your future self so you don't repeat mistakes)*
- "Tried [X], it failed because [Y]. Don't do it again."
