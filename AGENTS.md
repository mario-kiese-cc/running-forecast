# Running Forecast — Agent Instructions

## Project Overview

This is a **running forecast application** that predicts race performance based on training data, historical results, and physiological models. The project is in its early stages — read this file fully before making any changes.

## Architecture & Tech Stack

- **Runtime:** Node.js v26 (via nvm)
- **Framework:** Vue 3 (Composition API, `<script setup>`)
- **Build tool:** Vite
- **Language:** TypeScript (strict mode)
- **Test runner:** Vitest + @vue/test-utils
- **Package manager:** pnpm
- **Styling:** Plain CSS / CSS modules
- **Weather API:** Open-Meteo (free, no API key)

### Principles

- **Simplicity first** — prefer the simplest solution that works. Avoid premature abstraction.
- **Type safety** — use TypeScript with strict mode, or equivalent strong typing in whatever stack is chosen.
- **Testability** — every module must be testable in isolation. Design for dependency injection.
- **Small files** — keep files under 300 lines. Split when approaching this limit.
- **Single responsibility** — one module, one job. Name files after what they do.

## Code Conventions

### General

- Use descriptive variable names. No single-letter names except loop counters (`i`, `j`) and well-known math variables in formulas.
- Prefer `const` over `let`. Never use `var`.
- No `any` types in TypeScript. Use `unknown` and narrow with type guards.
- All functions must have explicit return types.
- Error handling: prefer Result types or explicit error returns over thrown exceptions for expected failures. Throw only for programmer errors.
- No console.log in production code. Use a structured logger.

### Naming

- Files: `kebab-case` (e.g., `race-predictor.ts`, `training-load.ts`)
- Types/Interfaces/Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Test files: `*.test.ts` colocated next to source files

### Comments

- Write comments for **why**, not **what**. The code should explain what.
- Document all public APIs with JSDoc or equivalent.
- Add `// TODO(username): description` for known issues. Never leave bare TODOs.

## Project Structure

```
running-forecast/
├── AGENTS.md              # This file — agent instructions
├── README.md              # Project documentation for humans
├── CHANGELOG.md           # Track notable changes
├── TODO.md                # Explicit task tracking (not inline TODOs)
├── .pi/
│   ├── settings.json      # Pi project-level settings
│   ├── prompts/           # Reusable prompt templates
│   └── skills/            # Project-specific skills
├── src/                   # Application source code
│   ├── index.ts           # Entry point
│   └── ...
├── tests/                 # Integration tests (unit tests colocated with source)
├── docs/                  # Design documents and ADRs
│   └── decisions/         # Architecture Decision Records
├── scripts/               # Build, deploy, and utility scripts
└── data/                  # Sample/test data (no secrets)
```

## Workflow Rules

### Before Starting Work

1. **Read first** — always read relevant existing files before modifying them.
2. **Check TODO.md** — look for related tasks or known issues.
3. **Understand context** — read related tests and documentation.

### While Working

4. **Small, atomic changes** — make one logical change at a time.
5. **Test as you go** — run tests after every meaningful change. Don't batch test runs.
6. **Verify before claiming done** — always run the relevant test suite. Never say "this should work" without verifying.
7. **Update docs** — if you change behavior, update the relevant documentation in the same change.
8. **Track decisions** — for non-trivial architectural choices, create an ADR in `docs/decisions/`.

### After Completing Work

9. **Run the full test suite** — ensure nothing is broken.
10. **Update CHANGELOG.md** — add an entry for user-visible changes.
11. **Summarize what you did** — briefly explain changes, decisions made, and anything the user should review.

## Testing Strategy

- **Unit tests** — colocated with source files (`foo.ts` → `foo.test.ts`). Test pure logic, edge cases, and error paths.
- **Integration tests** — in `tests/` directory. Test module interactions and data flow.
- **Test naming** — use descriptive names: `"should predict 5K time from 10K result using Riegel formula"`, not `"test1"`.
- **No snapshot tests** unless explicitly requested. They create maintenance burden.
- **Test commands:**
  - `pnpm test` — run all tests once
  - `pnpm test:watch` — run tests in watch mode
  - `pnpm build` — type-check + production build

## Common Pitfalls — Do NOT

- ❌ Do NOT generate mock data without clearly marking it as such.
- ❌ Do NOT use floating point equality comparisons for race times. Use epsilon comparisons.
- ❌ Do NOT hardcode file paths. Use path resolution relative to project root.
- ❌ Do NOT add dependencies without asking the user first.
- ❌ Do NOT delete or overwrite test files without understanding why the tests exist.
- ❌ Do NOT implement features not requested — ask if unsure about scope.
- ❌ Do NOT leave dead code. Remove unused imports, functions, and variables.

## Domain Knowledge

### Running Science Basics

- **Race distance equivalence** — Riegel formula: T2 = T1 × (D2/D1)^1.06
- **Training zones** — based on threshold pace, heart rate, or power
- **Training load** — consider volume (km/week), intensity distribution, progression rate
- **Taper** — performance improves with reduced volume before target race
- **Common distances** — 5K, 10K, half marathon (21.0975 km), marathon (42.195 km)
- **Pace format** — always display as min:sec/km (e.g., 4:30/km). Store internally as seconds per kilometer.

### Data Handling

- Times stored internally in **seconds** (float64).
- Distances stored internally in **meters** (float64).
- Dates in **ISO 8601** format.
- All user-facing output should use locale-appropriate formatting.

## Git Conventions

- Commit messages: `type(scope): description` — e.g., `feat(predictor): add Riegel race equivalence`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`
- Branch naming: `feature/short-description`, `fix/short-description`

## Environment

- **OS:** macOS
- **Shell:** zsh
- **Package manager:** to be decided (prefer pnpm or bun if Node.js)
- **Node version:** managed via nvm (currently v26.1.0)
