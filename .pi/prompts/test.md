---
description: Write thorough tests for a module or feature
argument-hint: "<file-or-module>"
---
Write comprehensive tests for $@:

1. Read the source code to understand all code paths
2. Read AGENTS.md for testing conventions
3. Write tests covering:
   - Happy path with realistic running data
   - Edge cases (zero values, boundary conditions, extreme inputs)
   - Error cases (invalid input, missing data, type mismatches)
   - Domain-specific cases (e.g., ultra-marathon distances, sub-elite vs recreational paces)
4. Use descriptive test names: `"should predict half marathon time from 10K PR"`
5. Run all tests and verify they pass
6. Report coverage gaps if any remain
