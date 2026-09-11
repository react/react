/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Ledger, LedgerKind} from 'shared/ReactLedgers';

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

// TODO: Record entries during a Flight render.
export function addToLedger<E>(ledger: Ledger<E>, entry: E): void {}
