---
name: project-conventions
description: Project structure, testing, and workflow conventions. Use when bootstrapping new modules, unsure about file placement, or setting up infrastructure.
---

# Project Conventions

## File Organization

### Source Files
- Place in `src/` with flat or shallow nesting
- Name files after their primary export: `race-predictor.ts` exports `RacePredictor`
- Group by feature, not by type (no `models/`, `controllers/`, `utils/` top-level folders)
- Max 300 lines per file — split when approaching

### Test Files
- **Unit tests:** colocated with source: `src/race-predictor.test.ts`
- **Integration tests:** in `tests/` directory
- **Test data:** in `data/` directory with clear naming

### Documentation
- `AGENTS.md` — agent instructions (this project)
- `README.md` — human-oriented project docs
- `CHANGELOG.md` — notable changes per release
- `TODO.md` — task tracking
- `docs/decisions/` — Architecture Decision Records

## New Module Checklist

When creating a new module:

1. Create the source file in `src/` with proper types
2. Export a clear public API (prefer named exports)
3. Create a colocated test file with at least:
   - One happy-path test
   - One edge-case test
   - One error-case test
4. Add JSDoc to all public functions
5. Import and re-export from `src/index.ts` if part of the public API
6. Update TODO.md if this resolves or creates tasks

## Error Handling Pattern

```typescript
// Prefer Result types for expected failures
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// Use for operations that can fail predictably
function parseRaceTime(input: string): Result<number, string> {
  // ...
}

// Throw only for programmer errors (invariant violations)
function assertPositive(value: number, name: string): void {
  if (value <= 0) throw new Error(`${name} must be positive, got ${value}`);
}
```

## Commit Workflow

```bash
# Format: type(scope): description
git add -A
git commit -m "feat(predictor): add Riegel race equivalence formula"

# Types: feat, fix, refactor, test, docs, chore, perf
# Scope: short module or area name
```
