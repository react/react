/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Empty digests are otherwise treated as if no digest was provided. This lets
// React distinguish an intentional client render without reserving a
// user-space digest value.
export const REACT_RECOVERABLE_DIGEST = '';
