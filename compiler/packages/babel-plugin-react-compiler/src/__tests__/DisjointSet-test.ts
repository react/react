/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import DisjointSet from '../Utils/DisjointSet';

type TestIdentifier = {
  id: number;
  name: string;
};

describe('DisjointSet', () => {
  let identifierId = 0;
  function makeIdentifier(name: string): TestIdentifier {
    return {
      id: identifierId++,
      name,
    };
  }

  function makeIdentifiers(...names: string[]): TestIdentifier[] {
    return names.map(name => makeIdentifier(name));
  }

  beforeEach(() => {
    identifierId = 0;
  });

  it('.find - finds the correct group which the item is associated with', () => {
    const identifiers = new DisjointSet<TestIdentifier>();
    const [x, y, z] = makeIdentifiers('x', 'y', 'z');

    identifiers.union([x]);
    identifiers.union([y, x]);

    expect(identifiers.find(x)).toBe(y);
    expect(identifiers.find(y)).toBe(y);
    expect(identifiers.find(z)).toBe(null);
  });

  it('.size - returns 0 when empty', () => {
    const identifiers = new DisjointSet<TestIdentifier>();

    expect(identifiers.size).toBe(0);
  });

  it('.size - returns the correct size when non-empty', () => {
    const identifiers = new DisjointSet<TestIdentifier>();
    const [x, y] = makeIdentifiers('x', 'y', 'z');

    identifiers.union([x]);
    identifiers.union([y, x]);

    expect(identifiers.size).toBe(2);
  });

  it('.buildSets - returns non-overlapping sets', () => {
    const identifiers = new DisjointSet<TestIdentifier>();
    const [a, b, c, x, y, z] = makeIdentifiers('a', 'b', 'c', 'x', 'y', 'z');

    identifiers.union([a]);
    identifiers.union([b, a]);
    identifiers.union([c, b]);

    identifiers.union([x]);
    identifiers.union([y, x]);
    identifiers.union([z, y]);
    identifiers.union([x, z]);

    expect(identifiers.buildSets()).toMatchInlineSnapshot(`
      [
        Set {
          {
            "id": 0,
            "name": "a",
          },
          {
            "id": 1,
            "name": "b",
          },
          {
            "id": 2,
            "name": "c",
          },
        },
        Set {
          {
            "id": 3,
            "name": "x",
          },
          {
            "id": 4,
            "name": "y",
          },
          {
            "id": 5,
            "name": "z",
          },
        },
      ]
    `);
  });

  // Regression test for issue #933
  it("`forEach` doesn't infinite loop when there are cycles", () => {
    const identifiers = new DisjointSet<TestIdentifier>();
    const [x, y, z] = makeIdentifiers('x', 'y', 'z');

    identifiers.union([x]);
    identifiers.union([y, x]);
    identifiers.union([z, y]);
    identifiers.union([x, z]);

    identifiers.forEach((_, group) => expect(group).toBe(z));
  });
});
