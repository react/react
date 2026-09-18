#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# Thin wrapper that delegates to the TS test script.
# The TS script handles building the native module itself.
#
# Usage: bash compiler/scripts/test-rust-port.sh [<pass>] [<fixtures-path>] [flags]
# Flags: --no-color, --json, --failures, --limit N, --mode MODE

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

exec npx tsx "$REPO_ROOT/compiler/scripts/test-rust-port.ts" "$@"
