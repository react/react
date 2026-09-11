/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export const BIT_LEDGER = 0;
export const MASK_LEDGER = 1;
export const MIN_LEDGER = 2;
export const MAX_LEDGER = 3;
export const SET_LEDGER = 4;

export type LedgerKind = 0 | 1 | 2 | 3 | 4;

// A ledger identifies which writes a capture should collect. Each capture
// computes its own accumulated value.
// eslint-disable-next-line no-unused-vars
export type Ledger<-E> = {
  +kind: LedgerKind,
};

// One total for each ledger passed to captureLedgers, in the same order.
// Keep the values opaque because they can only be read after Flight decoding.
export type LedgerTotals<V: $ReadOnlyArray<Ledger<empty>>> = {
  [K in keyof V]: mixed, // eslint-disable-line no-unused-vars
};

// Used to combine writes within a server flush and to accumulate totals on
// the client.
export type LedgerCell =
  | {+kind: 0, state: boolean}
  | {+kind: 1, state: number}
  | {+kind: 2, state: null | number}
  | {+kind: 3, state: null | number}
  | {+kind: 4, state: Set<mixed>};

// Set entries use the same scalar encoding as model values.
export type LedgerEntryWireForm = string | number | boolean | null;

// A delta carries a bit (1), an encoded number, or an array of Set entries.
export type LedgerDelta = number | string | Array<LedgerEntryWireForm>;

// Row IDs in ledger records are hexadecimal strings.

// Q: The unit's creator (null for the root) and captured ledger total IDs.
export type LedgerUnitDeclaration = [null | string, Array<string>];

// Z: Ledger type ID and the writes accumulated since the last flush.
export type LedgerDeltaRow = [string, LedgerDelta];

// F: Row IDs of reused computations.
export type LedgerReferencesRow = Array<string>;
