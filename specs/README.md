# Feature Specifications

This folder contains feature specifications — descriptions of **what** a feature does, **why** it exists, and **how to know it's done**. Specs are intentionally implementation-light: they should survive choices about Vue components, file layouts, and library versions.

When a spec is ready to build, create a corresponding implementation plan in `docs/plans/` referencing the spec.

## Conventions

Each spec uses the following structure:

1. **Summary** — one-paragraph elevator pitch.
2. **Motivation** — the user problem being solved.
3. **User stories** — concrete scenarios in the form *As a … I want … so that …*.
4. **Scope** — what is in, what is out.
5. **Functional requirements** — numbered, testable statements (FR-1, FR-2, …).
6. **Non-functional requirements** — performance, accessibility, persistence, privacy.
7. **UX notes** — wireframe-level interaction sketch (no pixels).
8. **Data model impact** — additions/changes to `src/types.ts` and stored state.
9. **Open questions** — decisions still to be made before implementation.
10. **Acceptance criteria** — checklist that defines "done".

## Index

- [`personal-scoring-profiles.md`](./personal-scoring-profiles.md)
- [`run-type-aware-scoring.md`](./run-type-aware-scoring.md)
- [`sun-uv-exposure.md`](./sun-uv-exposure.md)
- [`multi-day-comparison-view.md`](./multi-day-comparison-view.md)
