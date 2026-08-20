/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type TypeOfMode = number;

export const NoMode = /*                         */ 0b0000000;
// TODO: Remove ConcurrentMode by reading from the root tag instead
export const ConcurrentMode = /*                 */ 0b0000001;
export const ProfileMode = /*                    */ 0b0000010;
//export const DebugTracingMode = /*             */ 0b0000100; // Removed
export const StrictLegacyMode = /*               */ 0b0001000;
export const StrictEffectsMode = /*              */ 0b0010000;
// Keep track of if we're in a SuspenseyImages eligible subtree.
// TODO: Remove this when enableSuspenseyImages ship where it's always on.
export const SuspenseyImagesMode = /*            */ 0b0100000;
