/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const Random = require('random-seed');

// References use node names so a graph can include cycles. For example:
//
//   nodes: {
//     array: {array: ['array']},
//     promise: {promise: 'array'},
//   },
//   roots: {entry: 'array', other: 'promise'},
const nodeTypes = [
  'value',
  'date',
  'binary',
  'text',
  'blob',
  'special',
  'host',
  'module',
  'error',
  'array',
  'object',
  'set',
  'map',
  'iterator',
  'bound',
  'element',
  'props',
  'fragment',
  'promise',
  'stream',
  'bytes',
  'iterable',
  'component',
];

function getNodeType(node) {
  const type = nodeTypes.find(candidate => candidate in node);
  if (type === undefined) {
    throw new Error('A graph node has none of: ' + nodeTypes.join(', '));
  }
  return type;
}

function getReferencedNodes(node) {
  switch (getNodeType(node)) {
    case 'array':
    case 'set':
    case 'iterator':
    case 'bound':
    case 'stream':
      return node[getNodeType(node)]
        .concat('returns' in node ? [node.returns] : [])
        .concat(typeof node.fail === 'string' ? [node.fail] : []);
    case 'object':
      return Object.values(node.object);
    case 'iterable':
      return node.iterable.concat(
        node.returns === undefined ? [] : [node.returns],
      );
    case 'map':
      return node.map.flat();
    case 'fragment':
      return node.fragment;
    case 'element':
      return [].concat(node.element);
    case 'props':
    case 'promise':
    case 'component':
      return [node[getNodeType(node)]];
    case 'error':
      return (node.cause === undefined ? [] : [node.cause]).concat(
        node.errors === undefined ? [] : node.errors,
      );
    default:
      return [];
  }
}

function getReachableNodes(
  graph,
  {roots = Object.values(graph.roots), includeErrorProperties = true} = {},
) {
  const reached = new Set();
  const todo = roots.slice();
  while (todo.length > 0) {
    const name = todo.pop();
    const node = graph.nodes[name];
    if (!reached.has(name) && node !== undefined) {
      reached.add(name);
      if (includeErrorProperties || getNodeType(node) !== 'error') {
        todo.push(...getReferencedNodes(node));
      }
    }
  }
  return reached;
}

const specialValueFactories = {
  bigint: () => 1234567890123456789n,
  nan: () => NaN,
  'negative zero': () => -0,
  infinity: () => -Infinity,
  symbol: () => Symbol.for('flight-fuzz'),
  escaped: () => '$escaped\n🙂',
  buffer: () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer,
  'typed array': () => new Int16Array([1, -2, 3]),
  'data view': () => new DataView(new ArrayBuffer(7), 1, 5),
  'bigint array': () => new BigInt64Array([42n, -1n]),
  'float array': () => new Float64Array([1.5, -2.25, 0]),
  'clamped array': () => new Uint8ClampedArray([0, 128, 255]),
  undefined: () => undefined,
  'positive infinity': () => Infinity,
  // Larger than a packet, to exercise fragmented binary data.
  'large binary': () => Uint8Array.from({length: 6000}, (_, i) => i % 251),
  'large blob': () => new Blob(['blob-'.repeat(1200)], {type: 'text/plain'}),
  'form data': () => {
    const form = new FormData();
    form.append('repeated', 'first');
    form.append('repeated', 'second');
    form.append('file', new Blob(['🙂']), 'source.bin');
    return form;
  },
};

function createRandom(seed) {
  const rand = Random.create(seed);
  return limit => rand(limit);
}

module.exports = {
  getNodeType,
  getReferencedNodes,
  getReachableNodes,
  specialValueFactories,
  createRandom,
};
