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

// A capture describes where to collect writes. It can be rendered by multiple
// requests; each request assigns its own stream IDs to these handles.
export type LedgerTotal = {
  $$typeof: symbol,
  type: Ledger<empty>,
  then: () => mixed,
};

export type LedgerDataObject<T> = {
  $$typeof: symbol,
  totals: Array<LedgerTotal>,
  input: T,
};

// Used to combine writes within a server work batch and to accumulate totals
// on the client.
export type LedgerCell =
  | {+kind: 0, state: boolean}
  | {+kind: 1, state: number}
  | {+kind: 2, state: null | number}
  | {+kind: 3, state: null | number}
  | {+kind: 4, state: Set<mixed>};

export function createLedgerCell(type: Ledger<empty>): LedgerCell {
  switch (type.kind) {
    case BIT_LEDGER:
      return {kind: BIT_LEDGER, state: false};
    case MASK_LEDGER:
      return {kind: MASK_LEDGER, state: 0};
    case MIN_LEDGER:
      return {kind: MIN_LEDGER, state: null};
    case MAX_LEDGER:
      return {kind: MAX_LEDGER, state: null};
    default:
      return {kind: SET_LEDGER, state: new Set()};
  }
}

// Only Set Ledgers hold a mutable value. Copy it before exposing it to a
// consumer so mutations cannot change the cached reduction. Scalars can be shared.
export function cloneLedgerCellValue(
  cell: LedgerCell,
): boolean | number | null | Set<mixed> {
  return cell.kind === SET_LEDGER ? new Set(cell.state) : cell.state;
}

// Units retain writes where they occurred. Each total traverses the graph to
// determine which units belong to its capture, then retains that reduction.
// Ledger rows describe this work without requiring the model to be initialized.

export type UnitRecord = {
  children: null | Array<UnitRecord>,
  capturedLedgers: null | Array<Ledger<empty>>,
  cells: null | Map<Ledger<empty>, LedgerCell>,
  // Reused units may be declared later, or have no ledger records at all.
  references: null | Array<UnitRecord>,
  isQueued: boolean,
  nextDirty: null | UnitRecord,
};

// The decoded unit graph of one response.
export type LedgerGraph = {
  // The client extends these records with its chunks; reduction only reads the map.
  // eslint-disable-next-line no-undef
  +totals: $ReadOnlyMap<number, LedgerTotalRecord>,
  isTracking: boolean,
  dirtyUnits: null | UnitRecord,
  // A closed graph can never change again.
  closed: boolean,
  ...
};

// Each capture owns its reduction. Forwarding and the final client read share
// that computation; destinations only track what they have emitted.
export type LedgerTotalRecord = {
  type: Ledger<empty>,
  // The decoder appends new capture occurrences here for the next traversal.
  pendingCaptureUnits: Array<UnitRecord>,
  // Cleared once the closed graph has been fully reduced for this total.
  graph: null | LedgerGraph,
  cell: null | LedgerCell,
  // Retained between updates for membership checks and traversal of new work.
  visitedUnits: null | WeakSet<UnitRecord>,
  ...
};

// A total decoded from another response: the total symbol as $$typeof, and
// the record a server serializing it into its own response forwards from.
export type DecodedLedgerTotal = {
  $$typeof: symbol,
  total: LedgerTotalRecord,
  ...
};

// Forwarding and the final client read share this computation. A poll advances
// all started totals before consuming the dirty queue, so destinations can read
// the cached results independently without keeping their own change histories.
export function readLedgerTotal(total: LedgerTotalRecord): LedgerCell {
  const graph = total.graph;
  if (graph !== null) {
    const dirty = graph.dirtyUnits;
    if (dirty !== null) {
      graph.totals.forEach(record => {
        updateLedgerTotal(record, dirty);
      });
      let unit: null | UnitRecord = dirty;
      while (unit !== null) {
        const next = unit.nextDirty;
        unit.isQueued = false;
        unit.nextDirty = null;
        unit = next;
      }
      graph.dirtyUnits = null;
    }
  }
  let cell = total.cell;
  if (cell === null) {
    // Other totals may have consumed earlier dirty queues. This total's first
    // traversal reads current cells, which still account for those writes.
    total.cell = cell = createLedgerCell(total.type);
    total.visitedUnits = new WeakSet();
    updateLedgerTotal(total, null);
  }
  if (graph !== null) {
    if (graph.closed) {
      // The reduction is complete. Keep its cell for later forwarding.
      total.graph = null;
      total.visitedUnits = null;
    } else if (!graph.isTracking) {
      // The first read accounts for earlier writes. Only subsequent changes
      // need to be queued, so ordinary client decoding doesn't track them.
      graph.isTracking = true;
    }
  }
  return cell;
}

function updateLedgerTotal(
  total: LedgerTotalRecord,
  dirty: null | UnitRecord,
): void {
  const acc = total.cell;
  const visitedUnits = total.visitedUnits;
  if (acc === null || visitedUnits === null) {
    return;
  }
  const type = total.type;
  const queue: Array<UnitRecord> = [];
  // First select dirty units already visited by this total. Do this before
  // adding new capture units, so a unit in both lists is queued only once.
  let changed: null | UnitRecord = dirty;
  while (changed !== null) {
    if (visitedUnits.has(changed)) {
      queue.push(changed);
    }
    changed = changed.nextDirty;
  }
  const pendingCaptureUnits = total.pendingCaptureUnits;
  for (let i = 0; i < pendingCaptureUnits.length; i++) {
    const unit = pendingCaptureUnits[i];
    if (!visitedUnits.has(unit)) {
      visitedUnits.add(unit);
      queue.push(unit);
    }
  }
  // Newly reached units may contain writes from before the previous poll.
  // Recombining a dirty unit's whole cell is also safe: the Ledger operations
  // tolerate repeated contributions, so we don't need individual write deltas.
  for (let i = 0; i < queue.length; i++) {
    const unit = queue[i];
    const cells = unit.cells;
    const cell = cells === null ? undefined : cells.get(type);
    if (cell !== undefined) {
      // Both cells belong to the same ledger, so their kinds match. Flow
      // doesn't retain that relationship across the lookup.
      const source = cell as any;
      switch (acc.kind) {
        case BIT_LEDGER:
          acc.state = acc.state || source.state;
          break;
        case MASK_LEDGER:
          acc.state = (acc.state | source.state) >>> 0;
          break;
        case MIN_LEDGER: {
          const state: null | number = source.state;
          const previous = acc.state;
          if (state !== null && (previous === null || state < previous)) {
            acc.state = state;
          }
          break;
        }
        case MAX_LEDGER: {
          const state: null | number = source.state;
          const previous = acc.state;
          if (state !== null && (previous === null || state > previous)) {
            acc.state = state;
          }
          break;
        }
        case SET_LEDGER: {
          const state: Set<mixed> = source.state;
          state.forEach(entry => {
            acc.state.add(entry);
          });
          break;
        }
      }
    }

    // Each segment that reads a cache entry needs that entry's ledger writes,
    // even though its computation ran only once. Follow reuse references across
    // capture boundaries, including when the target itself establishes a capture.
    const references = unit.references;
    if (references !== null) {
      for (let j = 0; j < references.length; j++) {
        const target = references[j];
        if (!visitedUnits.has(target)) {
          visitedUnits.add(target);
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
        if (!visitedUnits.has(child)) {
          visitedUnits.add(child);
          queue.push(child);
        }
      }
    }
  }
  // The visited set remembers these units; later declarations add occurrences.
  pendingCaptureUnits.length = 0;
}

// Set entries use the same scalar encoding as model values.
export type LedgerEntryWireForm = string | number | boolean | null;

// A delta carries a bit (1), an encoded number, or an array of Set entries.
export type LedgerDelta = number | string | Array<LedgerEntryWireForm>;

// Row IDs in ledger records are hexadecimal strings.

// Q: The unit's creator (null for the root) and captured ledger total IDs.
export type LedgerUnitDeclaration = [null | string, Array<string>];

// Z: Ledger type ID and the writes accumulated since the previous emission.
export type LedgerDeltaRow = [string, LedgerDelta];

// F: Row IDs of reused computations.
export type LedgerReferencesRow = Array<string>;
