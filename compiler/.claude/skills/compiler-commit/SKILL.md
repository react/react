---
name: compiler-commit
description: Use when you want to verify compiler changes and commit with the correct convention. Runs tests, lint, and format, then commits with the [compiler] or [rust-compiler] prefix.
---

# Compiler Commit

Verify and commit compiler changes with the correct convention.

Arguments:
- $ARGUMENTS: Commit title (required). Optionally a test pattern after `--` (e.g., `Fix aliasing bug -- aliasing`)

## Instructions

1. **Run `/compiler-verify`** first (with test pattern if provided after `--`). Stop on any failure.

2. **Run `/compiler-review`** on the uncommitted changes. Report the findings to the user. If any issues are found, stop and do NOT commit — let the user decide how to proceed.

3. **Detect commit prefix** from changed files:
   - If any files in `compiler/crates/` changed: use `[rust-compiler]`
   - Otherwise: use `[compiler]`

4. **Update orchestrator log**: If `compiler/docs/rust-port/rust-port-orchestrator-log.md` exists and the commit includes Rust changes (`compiler/crates/`):

   Run `test-rust-port` with `--json` to get machine-readable results:
   ```bash
   bash compiler/scripts/test-rust-port.sh --json 2>/dev/null
   ```
   This outputs a JSON object with fields: `pass`, `autoDetected`, `total`, `passed`, `failed`, `frontier`, `perPass`, `failures`.

   Then update the orchestrator log:
   - Update the `# Status` section with the results (use the frontier, per-pass counts, and pass/fail totals)
   - Add a `## YYYYMMDD-HHMMSS` log entry noting the commit and what changed

5. **Stage files** — stage only the relevant changed files by name (including the orchestrator log if updated in step 4). Do NOT use `git add -A` or `git add .`.

6. **Compose commit message**:
   ```
   [prefix] <title>

   <summary of what changed and why, 1-3 sentences>
   ```
   The title comes from $ARGUMENTS. Write the summary yourself based on the actual changes.

7. **Commit** using a heredoc for the message:
   ```bash
   git commit -m "$(cat <<'EOF'
   [rust-compiler] Title here

   Summary here.
   EOF
   )"
   ```

8. **Do NOT push** unless the user explicitly asks.

## Examples

- `/compiler-commit Fix aliasing bug in optional chains` — runs full verify, commits as `[compiler] Fix aliasing bug in optional chains`
- `/compiler-commit Implement scope tree types -- round_trip` — runs verify with `-p round_trip`, commits as `[rust-compiler] Implement scope tree types`
