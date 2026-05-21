---
description: Refactor code while preserving behavior
argument-hint: "<file-or-area>"
---
Refactor $@ while preserving all existing behavior:

1. Read and understand the current code and its tests
2. Run existing tests to establish a green baseline
3. Make incremental changes — refactor in small, verifiable steps
4. Run tests after each step to ensure nothing breaks
5. If tests don't exist yet, write them BEFORE refactoring
6. Update any affected documentation
7. Summarize the refactoring: what changed, why, and what improved
