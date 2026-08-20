#!/usr/bin/env bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -eo pipefail

# Hashes JS files in the provided directory to create a cache-breaker

find $1 -name '*.js' | sort | xargs shasum | shasum | awk '{ print $1 }'
