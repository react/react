#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# Compare TS and Rust React Compiler output on external production files.
#
# Usage: bash compiler/scripts/test-internal-files.sh <config-path> <source-root> [flags]
# Flags: --limit N, --pattern PAT, --project NAME, --dry-run, --no-color

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

exec npx tsx "$REPO_ROOT/compiler/scripts/test-internal-files.ts" "$@"
