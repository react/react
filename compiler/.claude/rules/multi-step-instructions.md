---
description: Ensure all steps in multi-step user instructions are completed
globs:
  - compiler/**/*
---

When the user gives multi-step instructions (e.g., "implement X, then /review, then /compiler-commit"):
- Track all steps as a checklist
- Complete ALL steps before responding
- Before declaring done, re-read the original prompt to verify nothing was missed
- If interrupted mid-way, note which steps remain
