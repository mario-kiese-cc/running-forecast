---
description: Systematically debug an issue
argument-hint: "<problem-description>"
---
Debug the following issue: $@

Follow a systematic approach:
1. **Reproduce** — understand the exact steps and expected vs actual behavior
2. **Hypothesize** — form 2-3 hypotheses about the root cause before reading code
3. **Investigate** — read the relevant code paths, check types, trace data flow
4. **Isolate** — write a minimal test that reproduces the bug
5. **Fix** — make the smallest change that fixes the root cause (not symptoms)
6. **Verify** — run the reproducing test and the full suite
7. **Prevent** — add a regression test if one doesn't exist
8. **Explain** — summarize root cause, fix, and how to prevent recurrence
