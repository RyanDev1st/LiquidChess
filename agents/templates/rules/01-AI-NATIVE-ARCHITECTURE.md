# 01 — AI-Native Architectures & Protocol

<!-- 
  DEEP EXPERT CONSENSUS (2025/2026)
  Rules for building scalable codebases native to agentic management.
  Reflects the shift from raw text prompting to structural/MCP token logic.
-->

## 1. Context Topology & AST Targeting

Traditional "feed the file" prompting is obsolete and prone to severe "lost-in-the-middle" hallucinations. Codebases must be designed for structural querying.

- **Flattened Call Chains:** Agents struggle heavily with deep inheritance or highly chained abstractions. Code must favor flattened, explicit `Go`-style functions. Complex closures and implicit magic are banned.
- **Vertical Slicing:** To minimize the tool-call cost of reading context, bundle all aspects of a feature (schema, route, handler, mock) into the same local directory slice, not across technical layers.
- **Semantic Anchors:** Use exhaustive JSDoc/docstrings. An agent should be able to query the Abstract Syntax Tree (AST) for a function signature and document string to know exactly what it does, without spending tokens reading the implementation.

## 2. Token Formatting & Output Channels

- **Schema Formats:** Do not force agents to return complex unstructured JSON. If complex logic is needed, use *Code Mode* (the agent writes and executes TypeScript/Python to make the call) or token-efficient supersets like *TOON*.
- **Tool Access via MCP:** Agents interact with external databases and Git solely via the Model Context Protocol (MCP). No bespoke prompt-based API mocking.

## 3. Context Rot & Compaction

LLM context rots linearly over long sessions.
- **Hard 160K Compaction:** If the raw session context nears 160K tokens (or earlier if reasoning degrades), the orchestrator must halt, write a sparse snapshot to `memory/SESSION.md`, and completely flush the context window.
- **Information Tiering:**
  1. *Working Context:* (Files currently open). Keep < 200 lines each.
  2. *Session Memory:* (Command success/failure logs).
  3. *Artifact IDs:* Do not load the whole DB schema. Load its reference ID, and let the agent query the specific table it needs.
