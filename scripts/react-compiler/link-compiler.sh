#!/usr/bin/env bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -eo pipefail

if [[ "$REACT_CLASS_EQUIVALENCE_TEST" == "true" ]]; then
  exit 0
fi

HERE=$(pwd)

cd compiler/packages/babel-plugin-react-compiler
# Free the global link name first — it may be held by another React checkout,
# and `yarn link` (register) won't overwrite an existing owner.
yarn --silent unlink 2>/dev/null || true
yarn --silent link
cd "$HERE"

yarn --silent link babel-plugin-react-compiler
