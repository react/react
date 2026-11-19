#!/usr/bin/env bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -eo pipefail

# Link this workspace's react-compiler-runtime directly. A global `yarn link`
# registration is shared by every checkout on the machine, so it can point at
# another (or since-deleted) checkout and break the runtime import in fixtures.
mkdir -p node_modules
ln -sfn ../../react-compiler-runtime node_modules/react-compiler-runtime
