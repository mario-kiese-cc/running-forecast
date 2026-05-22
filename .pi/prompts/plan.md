---
description: Plan an approach before implementing
argument-hint: "<goal-or-feature>"
---
Plan how to implement: $@

Do NOT write any code yet. Instead:

1. Read AGENTS.md, TODO.md, and any related existing files
2. Identify what modules/files need to be created or modified
3. List dependencies and potential risks
4. Propose 2-3 approaches if there's a non-obvious design choice
5. Estimate complexity (small/medium/large)
6. Ask clarifying questions if the scope is ambiguous

Output a clear implementation plan I can approve before you start building.

After presenting the plan, save it to `docs/plans/<kebab-case-title>.md` with a `## Status: Proposed` header. Update the status to `Approved` or `Rejected` when the user decides.
