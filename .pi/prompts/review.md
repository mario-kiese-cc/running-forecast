---
description: Review code for bugs, performance, and domain correctness
argument-hint: "[file-or-area]"
---
Review the code $@ for:

1. **Correctness** — logic errors, off-by-one, wrong formulas
2. **Domain accuracy** — running science formulas and unit conversions (seconds, meters, pace)
3. **Edge cases** — zero distances, negative times, missing data
4. **Type safety** — any type usage, missing null checks, unsafe casts
5. **Performance** — unnecessary allocations, O(n²) where O(n) is possible
6. **Test coverage** — are critical paths tested? Missing test cases?

Be specific. Reference line numbers. Suggest fixes inline.
