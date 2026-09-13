#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIXTURES_DIR=""
LIMIT=""
CRITERION_ARGS=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --fixtures)
      FIXTURES_DIR="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --)
      shift
      CRITERION_ARGS=("$@")
      break
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: bash compiler/scripts/benchmark-rust-compiler.sh [--fixtures DIR] [--limit N] [-- <criterion args>]" >&2
      exit 1
      ;;
  esac
done

BENCHMARK_DIR="$(mktemp -d)"
trap 'rm -rf "$BENCHMARK_DIR"' EXIT

GENERATOR_ARGS=(--output "$BENCHMARK_DIR")
if [ -n "$FIXTURES_DIR" ]; then
  GENERATOR_ARGS+=(--fixtures "$FIXTURES_DIR")
fi
if [ -n "$LIMIT" ]; then
  GENERATOR_ARGS+=(--limit "$LIMIT")
fi

npx --yes tsx "$REPO_ROOT/compiler/scripts/generate-rust-benchmark-inputs.ts" "${GENERATOR_ARGS[@]}"

cd "$REPO_ROOT/compiler"
REACT_COMPILER_BENCHMARK_DIR="$BENCHMARK_DIR" \
  "${CARGO:-cargo}" bench -p react_compiler --bench compile_program -- "${CRITERION_ARGS[@]}"