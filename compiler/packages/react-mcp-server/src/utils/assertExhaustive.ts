/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Trigger an exhaustiveness check in TypeScript and throw at runtime.
 */
export default function assertExhaustive(_: never, errorMsg: string): never {
  throw new Error(errorMsg);
}
