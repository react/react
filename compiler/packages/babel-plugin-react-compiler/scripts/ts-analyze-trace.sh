#!/usr/bin/env bash
#
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

# Generates a TypeScript performance trace in a tmp folder, then runs the analyze-trace npm module
# to identify any hotspots that might cause slow compilation
# See https://github.com/microsoft/typescript-analyze-trace for CLI args

set -eo pipefail

tmp_dir=$(mktemp -d -t forget-XXXXXXXXXX)
./node_modules/typescript/bin/tsc -p ./tsconfig.json --generateTrace $tmp_dir --incremental false && npx @typescript/analyze-trace $tmp_dir "$@"
