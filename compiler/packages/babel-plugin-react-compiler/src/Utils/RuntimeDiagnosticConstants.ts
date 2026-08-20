/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// WARNING: ensure this is synced with enum values in react-compiler-runtime:GuardKind
export enum GuardKind {
  PushHookGuard = 0,
  PopHookGuard = 1,
  AllowHook = 2,
  DisallowHook = 3,
}
