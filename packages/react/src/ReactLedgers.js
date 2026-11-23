/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Ledger,
  LedgerKind,
  LedgerTotals,
  LedgerTotal,
  LedgerDataObject,
} from 'react-server/src/ReactFlightLedgers';

import ReactSharedInternals from 'shared/ReactSharedInternals';
import {
  REACT_LEDGER_DATA_TYPE,
  REACT_LEDGER_TOTAL_TYPE,
} from 'shared/ReactSymbols';
import {MASK_LEDGER} from 'react-server/src/ReactFlightLedgers';

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

export function captureLedgers<T, V: $ReadOnlyArray<Ledger<empty>>>(
  input: T,
  ledgers: V,
): {+data: T, +ledgers: LedgerTotals<V>} {
  const totals: Array<LedgerTotal> = [];
  for (let i = 0; i < ledgers.length; i++) {
    totals.push({
      $$typeof: REACT_LEDGER_TOTAL_TYPE,
      type: ledgers[i],
      then() {
        // Awaiting a total here could make the render depend on its own completion.
        throw new Error(
          'A ledger total cannot be read in a Server Components environment. ' +
            'Pass it to the client, where it resolves after the response has ' +
            'finished streaming.',
        );
      },
    });
  }
  // The capture takes effect where this wrapper is rendered, not where it
  // is created. Keep it independent of any request until then.
  const data: LedgerDataObject<T> = {
    $$typeof: REACT_LEDGER_DATA_TYPE,
    totals,
    input,
  };
  return {data: data as any, ledgers: totals as any};
}
