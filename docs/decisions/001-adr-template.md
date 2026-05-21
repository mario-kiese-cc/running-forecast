# ADR-001: Architecture Decision Record Template

**Status:** Accepted
**Date:** 2025-05-21
**Decision Makers:** Mario

## Context

We need a lightweight way to document architectural decisions so the agent (and future contributors) understand *why* things are the way they are, not just *what* they are.

## Decision

Use Architecture Decision Records (ADRs) in `docs/decisions/` with sequential numbering. Each ADR follows this template structure.

## Consequences

- Every non-trivial architectural choice gets documented
- The agent can read ADRs to understand constraints before making changes
- ADRs are immutable once accepted — supersede with a new ADR rather than editing

## Template

```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Date:** YYYY-MM-DD
**Decision Makers:** names

## Context
What is the issue? What forces are at play?

## Options Considered
1. Option A — pros/cons
2. Option B — pros/cons

## Decision
What was decided and why.

## Consequences
What becomes easier or harder as a result.
```
