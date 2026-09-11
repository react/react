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

// Used to combine writes within a server flush and to accumulate totals on
// the client.
// TODO: Only the mask kind exists yet; the other kinds land in a later PR.
export type LedgerCell = {+kind: 1, state: number};

// Wire format for the writes combined in a flush.
// TODO: Only the mask kind exists yet; the other kinds land in a later PR.
export type LedgerDelta = number | string;

// Row IDs in ledger records are hexadecimal strings.

// Q: The unit's creator, or null for the root.
export type LedgerUnitDeclaration = [null | string];

// Z: Ledger type ID and the writes accumulated since the last flush.
export type LedgerDeltaRow = [string, LedgerDelta];

// F: Row IDs of reused computations.
export type LedgerReferencesRow = Array<string>;
