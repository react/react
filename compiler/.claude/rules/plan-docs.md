---
description: Guidelines for editing Rust port plan documents
globs:
  - compiler/docs/rust-port/*.md
---

When editing plan documents in `compiler/docs/rust-port/`:

- Use `/plan-update <doc-path> <topic>` for deep research across all compiler passes before making significant updates
- Read the architecture guide (`rust-port-architecture.md`) for context
- Reference specific pass docs from `compiler/packages/babel-plugin-react-compiler/docs/passes/` when discussing pass behavior
- Update the "Current status" line at the top of plan docs after changes
- Keep plan docs as the source of truth — if implementation diverges from the plan, update the plan
