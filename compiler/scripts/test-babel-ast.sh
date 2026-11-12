#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

FIXTURE_SRC_DIR="$1"
if [ -z "$FIXTURE_SRC_DIR" ]; then
  # Default: the compiler's own test fixtures
  FIXTURE_SRC_DIR="$REPO_ROOT/compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures"
fi

# Parse source files into JSON in a temp directory
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "Parsing fixtures from $FIXTURE_SRC_DIR..."
node "$REPO_ROOT/compiler/scripts/babel-ast-to-json.mjs" "$FIXTURE_SRC_DIR" "$TMPDIR"

# Bump the default 8 MiB Rust thread stack to 32 MiB. The round_trip test
# walks deeply-nested Babel AST fixtures via recursive serde Visitor; some
# fixtures exceed the default stack on Linux CI runners. RUST_MIN_STACK only
# affects threads spawned via std::thread (which is how the libtest harness
# runs each test), so this is enough without changing the test sources.
export RUST_MIN_STACK=33554432

echo "Running round-trip test..."
cd "$REPO_ROOT/compiler/crates"
FIXTURE_JSON_DIR="$TMPDIR" ~/.cargo/bin/cargo test -p react_compiler_ast --test round_trip -- --nocapture

echo "Running scope resolution test..."
FIXTURE_JSON_DIR="$TMPDIR" ~/.cargo/bin/cargo test -p react_compiler_ast --test scope_resolution -- --nocapture
