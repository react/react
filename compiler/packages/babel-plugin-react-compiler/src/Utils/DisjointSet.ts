/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {GeneratedSource} from '../HIR/HIR';

// Represents items which form disjoint sets.
export default class DisjointSet<T> {
  #entries: Map<T, T> = new Map();

  /*
   * Updates the graph to reflect that the given @param items form a set,
   * linking any previous sets that the items were part of into a single
   * set.
   */
  union(items: Array<T>): void {
    const first = items.shift();
    CompilerError.invariant(first != null, {
      reason: 'Expected set to be non-empty',
      loc: GeneratedSource,
    });
    /*
     * determine an arbitrary "root" for this set: if the first
     * item already has a root then use that, otherwise the first item
     * will be the new root.
     */
    let root = this.find(first);
    if (root == null) {
      root = first;
      this.#entries.set(first, first);
    }
    // update remaining items (which may already be part of other sets)
    for (const item of items) {
      let itemParent = this.#entries.get(item);
      if (itemParent == null) {
        // new item, no existing set to update
        this.#entries.set(item, root);
        continue;
      } else if (itemParent === root) {
        continue;
      } else {
        let current = item;
        while (itemParent !== root) {
          this.#entries.set(current, root);
          current = itemParent;
          itemParent = this.#entries.get(current)!;
        }
      }
    }
  }

  /*
   * Finds the set to which the given @param item is associated, if @param item
   * is present in this set. If item is not present, returns null.
   *
   * Note that the returned value may be any item in the set to which the input
   * belongs: the only guarantee is that all items in a set will return the same
   * value in between calls to `union()`.
   */
  find(item: T): T | null {
    if (!this.#entries.has(item)) {
      return null;
    }
    const parent = this.#entries.get(item)!;
    if (parent === item) {
      // this is the root element
      return item;
    }
    // Recurse to find the root (caching all elements along the path to the root)
    const root = this.find(parent)!;
    // Cache the element itself
    this.#entries.set(item, root);
    return root;
  }

  has(item: T): boolean {
    return this.#entries.has(item);
  }

  /*
   * Forces the set into canonical form, ie with all items pointing directly to
   * their root, and returns a Map representing the mapping of items to their roots.
   */
  canonicalize(): Map<T, T> {
    const entries = new Map<T, T>();
    for (const item of this.#entries.keys()) {
      const root = this.find(item)!;
      entries.set(item, root);
    }
    return entries;
  }

  /*
   * Calls the provided callback once for each item in the disjoint set,
   * passing the @param item and the @param group to which it belongs.
   */
  forEach(fn: (item: T, group: T) => void): void {
    for (const item of this.#entries.keys()) {
      const group = this.find(item)!;
      fn(item, group);
    }
  }

  buildSets(): Array<Set<T>> {
    const ids: Map<T, number> = new Map();
    const sets: Map<number, Set<T>> = new Map();

    this.forEach((identifier, groupIdentifier) => {
      let id = ids.get(groupIdentifier);
      if (id == null) {
        id = ids.size;
        ids.set(groupIdentifier, id);
      }

      let set = sets.get(id);
      if (set === undefined) {
        set = new Set();
        sets.set(id, set);
      }
      set.add(identifier);
    });

    return [...sets.values()];
  }

  get size(): number {
    return this.#entries.size;
  }
}
