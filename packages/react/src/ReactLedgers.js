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
import {
  BIT_LEDGER,
  MASK_LEDGER,
  MIN_LEDGER,
  MAX_LEDGER,
  SET_LEDGER,
} from 'react-server/src/ReactFlightLedgers';

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

// Records whether any write occurred, so no entry value is needed.
export function createBitLedger(): Ledger<void> {
  return createLedger(BIT_LEDGER);
}

export function createMaskLedger(): Ledger<number> {
  return createLedger(MASK_LEDGER);
}

export function createMinLedger(): Ledger<number> {
  return createLedger(MIN_LEDGER);
}

export function createMaxLedger(): Ledger<number> {
  return createLedger(MAX_LEDGER);
}

export function createSetLedger<K>(): Ledger<K> {
  return createLedger(SET_LEDGER);
}

function normalizeLedgerEntry(type: Ledger<empty>, entry: mixed): mixed {
  switch (type.kind) {
    case BIT_LEDGER:
      return true;
    case MASK_LEDGER:
      return (entry as any) >>> 0;
    case MIN_LEDGER:
    case MAX_LEDGER:
      // Normalize -0 to 0.
      return entry === 0 ? 0 : entry;
    default: {
      // Set entries need stable equality when work is serialized and reused.
      // Object identity does not provide that, so only primitives are supported.
      if (
        (typeof entry === 'object' || typeof entry === 'function') &&
        entry !== null
      ) {
        throw new Error(
          'Only a primitive can be added to a set ledger. A set ledger ' +
            'nets entries by value, but a Set can only compare this entry ' +
            'by reference, so structurally equal entries would silently ' +
            'count as distinct. Primitives are the only entries whose ' +
            'equality is well defined.',
        );
      }
      if (typeof entry === 'symbol' && Symbol.keyFor(entry) === undefined) {
        throw new Error(
          'Only a global symbol received from Symbol.for(...) can be added ' +
            'to a set ledger. A set ledger nets entries by value, but a ' +
            'symbol that is not registered has no name to net it by, so no ' +
            'other entry could ever equal it and it could not reach the ' +
            'client.',
        );
      }
      // Normalize -0 to 0.
      return entry === 0 ? 0 : entry;
    }
  }
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
