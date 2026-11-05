/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// TODO: Only the mask kind exists yet; the other kinds land in a later PR.
export const MASK_LEDGER = 1;

export type LedgerKind = 1;

// A ledger identifies which writes a capture should collect. Each capture
// computes its own accumulated value.
// eslint-disable-next-line no-unused-vars
export type Ledger<-E> = {
  +kind: LedgerKind,
};
