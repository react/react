---
name: rust-port-status
description: Show the status of all Rust port plan documents and recent related commits. Use when you need to understand what's been done vs what remains.
---

# Rust Port Status

Show current status of the Rust compiler port.

## Instructions

1. List all files in `compiler/docs/rust-port/`
2. For each numbered plan doc (e.g., `rust-port-0001-*.md`):
   - Show the title (first heading)
   - Show the status line (if present)
   - Note whether it has "Remaining Work" items
   - Show recent commits referencing it: `git log --oneline --grep="<key phrase>"`
3. Show a summary table of plan doc statuses
4. Show the 10 most recent `[rust-compiler]` commits: `git log --oneline --grep="rust-compiler" -10`
