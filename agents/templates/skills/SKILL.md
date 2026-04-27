# Skill Definition Template

<!-- 
  COMMUNITY PATTERN: Modular Context Playbooks
  Skills are loaded on-demand. They provide specific instructions for specific tasks,
  keeping the root CLAUDE.md lean.
-->

## Skill Name: [Name of the Skill]
**Description:** [One sentence summary]
**Trigger Conditions:** [When should an agent load this skill?]

---

## Verifiable Outcomes

If this skill is successfully applied, the following must be true:
1. [Binary, testable outcome. e.g., "All React components have proper memoization."]
2. [Binary, testable outcome.]

---

## Scope / Rules

1. **Do not use this skill for:** [Explicitly define boundaries]
2. **Allowed Files:** [Types of files this skill generally modifies]
3. **Reference Docs:** [Link to external context if necessary]

---

## The Execution Playbook

**Step 1: Orient**
- [Instruction for orienting to the problem space specific to this skill]

**Step 2: Act**
- [Instruction for acting. Include anti-hallucination guardrails specific to this domain]

**Step 3: Verify**
- [Instruction for verifying success. Include exact bash commands or tests if applicable]

---

## Common Pitfalls (Known Hallucinations)

- **[Pitfall 1]:** [What the model usually gets wrong here] → **Correction:** [How to avoid it]
- **[Pitfall 2]:** [What the model usually gets wrong here] → **Correction:** [How to avoid it]
