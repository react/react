/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

// The link-cut forest keeps, for a set of nodes, each node's parent, and
// answers which root a node reaches. This checks it against a naive forest
// that stores a parent pointer per node and walks pointers to find a root.

let findWaitRoot;
let linkWait;
let cutWait;

function createNode() {
  return {pathParent: null, pathLeft: null, pathRight: null};
}

// A deterministic PRNG so a failing seed can be reproduced.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('ReactFlightClientWaitForest', () => {
  beforeEach(() => {
    jest.resetModules();
    const forest = require('../ReactFlightClientWaitForest');
    findWaitRoot = forest.findWaitRoot;
    linkWait = forest.linkWait;
    cutWait = forest.cutWait;
  });

  it('finds the root of a single node and a short chain', () => {
    const a = createNode();
    expect(findWaitRoot(a)).toBe(a);

    const b = createNode();
    const c = createNode();
    // a -> b -> c (a's parent is b, b's parent is c).
    linkWait(a, b);
    linkWait(b, c);
    expect(findWaitRoot(a)).toBe(c);
    expect(findWaitRoot(b)).toBe(c);
    expect(findWaitRoot(c)).toBe(c);
  });

  it('follows a cut back to the detached root', () => {
    const a = createNode();
    const b = createNode();
    const c = createNode();
    linkWait(a, b);
    linkWait(b, c);
    // Cut b from c. a -> b is its own tree now; c is alone.
    cutWait(b);
    expect(findWaitRoot(a)).toBe(b);
    expect(findWaitRoot(b)).toBe(b);
    expect(findWaitRoot(c)).toBe(c);
  });

  it('reparents a cut subtree under a new parent', () => {
    const nodes = [createNode(), createNode(), createNode(), createNode()];
    const [a, b, c, d] = nodes;
    linkWait(a, b);
    linkWait(b, c);
    expect(findWaitRoot(a)).toBe(c);
    cutWait(b);
    linkWait(b, d);
    expect(findWaitRoot(a)).toBe(d);
    expect(findWaitRoot(b)).toBe(d);
    expect(findWaitRoot(c)).toBe(c);
    expect(findWaitRoot(d)).toBe(d);
  });

  // Naive reference forest.
  function naiveRoot(parents, i) {
    let guard = 0;
    while (parents[i] !== null) {
      i = parents[i];
      if (++guard > parents.length + 1) {
        throw new Error('naive forest has a cycle at ' + i);
      }
    }
    return i;
  }

  function runDifferential(seed, nodeCount, operations) {
    const rng = makeRng(seed);
    const nodes = [];
    const parents = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push(createNode());
      parents.push(null);
    }
    const randInt = n => Math.floor(rng() * n);
    let links = 0;
    let cuts = 0;
    for (let op = 0; op < operations; op++) {
      const choice = rng();
      if (choice < 0.55) {
        // Link: child must be a root, and its parent must not be inside the
        // child's own tree, so the forest stays acyclic.
        const child = randInt(nodeCount);
        if (parents[child] !== null) {
          continue;
        }
        const parent = randInt(nodeCount);
        if (parent === child || naiveRoot(parents, parent) === child) {
          continue;
        }
        parents[child] = parent;
        linkWait(nodes[child], nodes[parent]);
        links++;
      } else if (choice < 0.85) {
        // Cut a node from its parent.
        const child = randInt(nodeCount);
        if (parents[child] === null) {
          continue;
        }
        parents[child] = null;
        cutWait(nodes[child]);
        cuts++;
      } else {
        // Check a random node against the naive root.
        const i = randInt(nodeCount);
        expect(findWaitRoot(nodes[i])).toBe(nodes[naiveRoot(parents, i)]);
      }
      // Periodically sweep every node so disagreements never hide for long.
      if ((op & 0x3ff) === 0) {
        for (let i = 0; i < nodeCount; i++) {
          expect(findWaitRoot(nodes[i])).toBe(nodes[naiveRoot(parents, i)]);
        }
      }
    }
    // Final full sweep.
    for (let i = 0; i < nodeCount; i++) {
      expect(findWaitRoot(nodes[i])).toBe(nodes[naiveRoot(parents, i)]);
    }
    return {links, cuts};
  }

  it('matches a naive forest across many random operations', () => {
    // These runs loop far past the default guard for test code.
    const originalMaxIterations = global.__MAX_ITERATIONS__;
    global.__MAX_ITERATIONS__ = 10000000;
    try {
      const seeds = [1, 7, 42, 123456789, 0xabcdef];
      for (let i = 0; i < seeds.length; i++) {
        const stats = runDifferential(seeds[i], 64, 45000);
        // Each seed should exercise a healthy mix of both operations.
        expect(stats.links).toBeGreaterThan(1000);
        expect(stats.cuts).toBeGreaterThan(1000);
      }
    } finally {
      global.__MAX_ITERATIONS__ = originalMaxIterations;
    }
  });
});
