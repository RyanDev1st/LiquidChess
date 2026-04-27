# Domain Context: [Domain Name]

<!-- 
  COMMUNITY PATTERN: Scoped Domain Orientation
  Instead of putting all context in CLAUDE.md, break it out into domain-specific files.
  Load this file ONLY when working within this specific domain.
-->

## Overview
**Domain:** [Which part of the system is this?]
**Primary Responsibility:** [What does this domain do?]

## Architectural Rules
*(Domain-specific bounds. Do not repeat global rules from CLAUDE.md)*
1. [Specific rule, e.g., "All components here must be Server Components in Next.js"]
2. [Specific rule, e.g., "State must be managed via Redux, no local state"]

## Key Interfaces & Contracts
| Interface | Purpose | Path |
|-----------|---------|------|
| `[IInterfaceName]` | [What it does] | `[path/to/file]` |

## Data Flow
- **Input comes from:** [Where?]
- **Processing:** [What happens?]
- **Output goes to:** [Where?]

## Known Quirks & Tech Debt
*(Document the weird stuff here so agents don't hallucinate "fixes" that break things)*
- "Function X is written strangely because of [Legacy constraints]. Do not refactor."
- "Dependency Y has a bug with [Z]. Workaround is implemented at [Path]."
