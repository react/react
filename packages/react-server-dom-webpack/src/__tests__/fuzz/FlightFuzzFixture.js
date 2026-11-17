/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {
  getNodeType,
  getReachableNodes,
  specialValueFactories,
} = require('./FlightFuzzGraph');

function createFixture(graph) {
  checkReachability(graph);
  const {nodes} = graph;

  const values = {};
  const getValue = name => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error('The graph refers to ' + name + ', which is not a node');
    }
    return values[name];
  };
  // Allocate containers before filling them so references can form cycles.
  for (const name in nodes) {
    const node = nodes[name];
    switch (getNodeType(node)) {
      case 'value':
        values[name] = node.value;
        break;
      case 'date':
        values[name] = new Date(node.date);
        break;
      case 'special':
        values[name] = specialValueFactories[node.special]();
        break;
      case 'array':
        values[name] = [];
        break;
      case 'object':
        values[name] = {};
        break;
      case 'set':
        values[name] = new Set();
        break;
      case 'map':
        values[name] = new Map();
        break;
      default:
        break;
    }
  }
  for (const name in nodes) {
    const node = nodes[name];
    switch (getNodeType(node)) {
      case 'array':
        node.array.forEach(item => values[name].push(getValue(item)));
        break;
      case 'object':
        Object.keys(node.object).forEach(key => {
          values[name][key] = getValue(node.object[key]);
        });
        break;
      case 'set':
        node.set.forEach(item => values[name].add(getValue(item)));
        break;
      case 'map':
        node.map.forEach(([key, item]) => {
          if (values[name].has(getValue(key))) {
            throw new Error(
              name + ' has two entries for the same source Map key',
            );
          }
          values[name].set(getValue(key), getValue(item));
        });
        break;
      default:
        break;
    }
  }

  const model = {
    entry: getValue(graph.roots.entry),
    other: getValue(graph.roots.other),
  };
  return {model};
}

function checkReachability(graph) {
  const {nodes} = graph;
  const reached = getReachableNodes(graph);
  Object.keys(nodes).forEach(name => {
    if (!reached.has(name)) {
      throw new Error(name + ' is not reachable from the roots');
    }
  });
}

module.exports = {createFixture};
