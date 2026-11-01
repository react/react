#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

dry_run=false
if [ "${1:-}" = "--dry-run" ]; then
  dry_run=true
elif [ "$#" -ne 0 ]; then
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
fi

publish_with_retry() {
  local output
  local published_crate

  while true; do
    output=$(mktemp)
    if [ "${#excluded_crates[@]}" -eq 0 ]; then
      publish_command=(cargo publish --locked --workspace)
    else
      publish_command=(cargo publish --locked --workspace "${excluded_crates[@]}")
    fi
    if "${publish_command[@]}" 2> >(tee "$output" >&2); then
      rm -f "$output"
      return
    fi

    if grep -q "status 429 Too Many Requests" "$output"; then
      rm -f "$output"
      echo "Rate limited; retrying workspace publish in 10 minutes"
      sleep 600
      continue
    fi

    published_crate=$(sed -n 's/.*error: crate \([^@]*\)@.* already exists on crates.io index/\1/p' "$output" | tail -1)
    if [ -n "$published_crate" ]; then
      rm -f "$output"
      excluded_crates+=("--exclude" "$published_crate")
      continue
    fi

    rm -f "$output"
    return 1
  done
}

cargo check --locked --workspace

excluded_crates=()

if [ "$dry_run" = "true" ]; then
  cargo publish --locked --workspace --dry-run
else
  publish_with_retry
fi

echo "Published all React Compiler crates. Revoke the bootstrap token after configuring trusted publishers."
