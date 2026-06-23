---
description: Compiler commit message convention
globs:
  - compiler/**/*.js
  - compiler/**/*.jsx
  - compiler/**/*.ts
  - compiler/**/*.tsx
  - compiler/**/*.rs
  - compiler/**/*.json
  - compiler/**/*.md
---

When committing changes in the compiler directory, follow this convention:

- **Rust port work** (files in `compiler/crates/` and/or `compiler/docs/rust-port`): prefix with `[rust-compiler]`
- **TS compiler work** (files in `compiler/packages/`): prefix with `[compiler]`

Format:
```
[prefix] Title

Summary of changes (1-3 sentences).
```

Use `/compiler-commit` to automatically verify and commit with the correct convention.
