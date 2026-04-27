# 02 — Agentic Security & Audit Protocol (ASAP)

<!-- 
  DEEP EXPERT CONSENSUS (2025/2026)
  Compiled from OWASP Agentic Top 10, Microsoft Agent Governance Toolkit, and SAIF.
-->

## 1. Prompt Injection as RCE (Remote Code Execution)

In an agentic system with filesystem or internet access, prompt injection is not a "jailbreak", it is Remote Code Execution.

- **Dual-LLM Quarantine Pattern:** The executing agent (with tools) must NEVER ingest untrusted raw user input. Untrusted content (e.g., parsing a scraped webpage or a user uploaded CV) must be piped through a heavily sandboxed, tool-less "Analyzer LLM" which passes only structured, cleaned intent forward to the Orchestrator.
- **Sign-then-Analyze:** Any plugin, module, or skill added to the system must have cryptographic provenance. 

## 2. IAM & Privilege Escalation

Treat the AI agent as a slightly malicious, highly capable 3rd party contractor. 

- **No God-Mode Tokens:** Agents must never be provisioned with long-lived read/write admin tokens. They must request ephemeral, Just-In-Time (JIT) scoped tokens.
- **Blast Radius Mitigation:** Containerize all agent executions. If an agent executes `npm i`, it does so in a strictly limited filesystem sandbox with no ability to sniff the host OS.

## 3. Open Source CI/CD Supply Chain

To pass public security audits in 2026:
- **Dependency Pinning:** The build system must use strictly hashed lockfiles (`poetry.lock`, `uv.lock`, `package-lock.json`). An agent is strictly prohibited from bypassing hashes.
- **AI-SBOM:** The project must generate a Software Bill of Materials that explicitly inventories not just standard dependencies, but ALL specific LLM models, endpoints, and RAG schemas used in production.
- **SCA Gate:** Software Composition Analysis must block CI/CD for any package with a CVE score > 4.0. No exceptions without explicit human override.
