---
name: verify
description: Use when you want to validate changes before committing, or when you need to check all React contribution requirements.
---

# Verification

Run all verification steps.

Arguments:
- $ARGUMENTS: Test pattern for the test step

## Instructions

Run these first in sequence:
1. Run `yarn prettier` - format code (stop if fails)
2. Run `yarn linc` - lint changed files (stop if fails)

Then run these with subagents in parallel:
1. Use `/flow` to type check (stop if fails)
2. Use `/test` to test changes in source (stop if fails)
3. Use `/test www` to test changes in www (stop if fails)

If all pass, show success summary. On failure, stop immediately and report the issue with suggested fixes.
