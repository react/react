#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# End-to-end test runner comparing the Rust compiler (Babel/NAPI bridge)
# against the TS reference plugin.
#
# Usage: bash compiler/scripts/test-e2e.sh [fixtures-path] [--variant babel] [--limit N] [--no-color]

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

exec npx tsx "$REPO_ROOT/compiler/scripts/test-e2e.ts" "$@"
