/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

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
  'special',
  'module',
  'error',
  'array',
  'object',
  'set',
  'map',
  'promise',
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
      return node[getNodeType(node)];
    case 'object':
      return Object.values(node.object);
    case 'map':
      return node.map.flat();
    case 'promise':
      return [node[getNodeType(node)]];
    default:
      return [];
  }
}

function getReachableNodes(graph) {
  const reached = new Set();
  const todo = Object.values(graph.roots);
  while (todo.length > 0) {
    const name = todo.pop();
    const node = graph.nodes[name];
    if (!reached.has(name) && node !== undefined) {
      reached.add(name);
      todo.push(...getReferencedNodes(node));
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
  undefined: () => undefined,
  'positive infinity': () => Infinity,
};

module.exports = {
  getNodeType,
  getReachableNodes,
  specialValueFactories,
};
