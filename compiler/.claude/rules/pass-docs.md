---
description: Read pass documentation before modifying compiler passes
globs:
  - compiler/packages/babel-plugin-react-compiler/src/**/*.ts
---

Before modifying a compiler pass, read its documentation in `compiler/packages/babel-plugin-react-compiler/docs/passes/`. Pass docs explain the pass's role in the pipeline, its inputs/outputs, and key invariants.

Pass docs are numbered to match pipeline order (e.g., `08-inferMutationAliasingEffects.md`). Check `Pipeline.ts` if you're unsure which doc corresponds to the code you're modifying.
