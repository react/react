/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Ledger, LedgerKind} from 'shared/ReactLedgers';

import ReactSharedInternals from 'shared/ReactSharedInternals';
import {MASK_LEDGER} from 'shared/ReactLedgers';

function createLedger<E>(kind: LedgerKind): Ledger<E> {
  const type = {
    kind,
  };
  if (__DEV__) {
    if (Object.freeze) {
      Object.freeze(type);
    }
  }
  return type;
}

export function createMaskLedger(): Ledger<number> {
  return createLedger(MASK_LEDGER);
}

// TODO: Only the mask kind exists yet; the other kinds land in a later PR.
function normalizeLedgerEntry(type: Ledger<empty>, entry: mixed): mixed {
  return (entry as any) >>> 0;
}

export function addToLedger<E>(ledger: Ledger<E>, entry: E): void {
  const normalized = normalizeLedgerEntry(ledger, entry);
  const dispatcher = ReactSharedInternals.A;
  if (dispatcher === null || dispatcher.addToLedger === undefined) {
    // Other renderers don't collect ledger entries.
    return;
  }
  dispatcher.addToLedger(ledger, normalized);
}
