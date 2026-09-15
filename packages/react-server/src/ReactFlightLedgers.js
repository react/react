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

// One total for each ledger passed to captureLedgers, in the same order.
// Keep the values opaque because they can only be read after Flight decoding.
export type LedgerTotals<V: $ReadOnlyArray<Ledger<empty>>> = {
  [K in keyof V]: mixed, // eslint-disable-line no-unused-vars
};

// Used to combine writes within a server flush and to accumulate totals on
// the client.
// TODO: Only the mask kind exists yet; the other kinds land in a later PR.
export type LedgerCell = {+kind: 1, state: number};

// TODO: Only the mask kind exists yet; the other kinds land in a later PR.
export function createLedgerCell(type: Ledger<empty>): LedgerCell {
  return {kind: MASK_LEDGER, state: 0};
}

// Ledger rows form a graph alongside the model. The client decodes them
// without initializing model chunks and computes each total from the graph.

export type UnitRecord = {
  children: null | Array<UnitRecord>,
  capturedLedgers: null | Array<Ledger<empty>>,
  cells: null | Map<Ledger<empty>, LedgerCell>,
  // Reused units may be declared later, or have no ledger records at all.
  references: null | Array<number>,
};

// The decoded unit graph of one response.
export type LedgerGraph = {
  units: Map<number, UnitRecord>,
  ...
};

// Points at its response's unit graph.
export type LedgerTotalRecord = {
  type: Ledger<empty>,
  roots: Array<UnitRecord>,
  graph: LedgerGraph,
  ...
};

// Compute one captured ledger's total from the unit graph. The server records
// writes where they happen; the client determines which capture receives them.
export function reduceLedgerCell(total: LedgerTotalRecord): LedgerCell {
  const type = total.type;
  // Use a fresh accumulator so the result doesn't alias cells shared by
  // other captures.
  const acc = createLedgerCell(type);
  const units = total.graph.units;
  // Start at this total's capture occurrences. The traversal appends other
  // units to the worklist, so use a copy of the roots.
  const queue = total.roots.slice();

  // Reuse can form cycles or reach the same work along several paths. Expand
  // each unit only once per total.
  const visited: Set<UnitRecord> = new Set();
  for (let i = 0; i < queue.length; i++) {
    const unit = queue[i];
    if (visited.has(unit)) {
      continue;
    }
    visited.add(unit);
    const cells = unit.cells;
    const cell = cells === null ? undefined : cells.get(type);
    if (cell !== undefined) {
      acc.state = (acc.state | cell.state) >>> 0;
    }

    // Each segment that reads a cache entry needs that entry's ledger writes,
    // even though its computation ran only once. Follow reuse references across
    // capture boundaries, including when the target itself establishes a capture.
    const references = unit.references;
    if (references !== null) {
      for (let j = 0; j < references.length; j++) {
        const target = units.get(references[j]);
        if (target !== undefined) {
          queue.push(target);
        }
      }
    }

    // Follow work started by this unit, stopping at nested captures of this
    // ledger. Filter only child edges: a reference may still reach the same
    // unit and include its effects.
    const children = unit.children;
    if (children !== null) {
      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        const capturedLedgers = child.capturedLedgers;
        if (capturedLedgers !== null && capturedLedgers.indexOf(type) !== -1) {
          continue;
        }
        queue.push(child);
      }
    }
  }
  return acc;
}

// Wire format for the writes combined in a flush.
// TODO: Only the mask kind exists yet; the other kinds land in a later PR.
export type LedgerDelta = number | string;

// Row IDs in ledger records are hexadecimal strings.

// Q: The unit's creator (null for the root) and captured ledger total IDs.
export type LedgerUnitDeclaration = [null | string, Array<string>];

// Z: Ledger type ID and the writes accumulated since the last flush.
export type LedgerDeltaRow = [string, LedgerDelta];

// F: Row IDs of reused computations.
export type LedgerReferencesRow = Array<string>;
