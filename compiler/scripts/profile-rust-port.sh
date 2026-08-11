#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# Thin wrapper for the profiling script.
#
# Usage: bash compiler/scripts/profile-rust-port.sh [flags]
# Flags: --release, --json, --limit N

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

exec npx tsx "$REPO_ROOT/compiler/scripts/profile-rust-port.ts" "$@"
