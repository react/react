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

// Add references and nodes, or change when values become available.
// Reusing existing nodes can create cycles.
const graphOperations = [
  'link',
  'self',
  'mutual',
  'duplicate',
  'map key',
  'promise',
  'rejected promise',
  'stream',
  'failing stream',
  'canceled stream',
  'byte stream',
  'iterable',
  'iterator',
  'element',
  'props',
  'component',
  'failing component',
  'bound function',
  'error',
  'aggregate error',
  'fragment',
  'failing module',
  'after eof',
  'root promise',
];

function generateGraph(seed, {without = []} = {}) {
  const pick = createRandom(seed + '/graph');
  const pickFrom = list => list[pick(list.length)];
  const allowedOperations = graphOperations.filter(
    operation => !without.includes(operation),
  );
  const names = [];
  const nodes = {};
  const referenceTargets = [];
  // Sync iterators must only be serialized once. Don't reuse them in another
  // container or put them in stream items that may be serialized again.
  const singleUseNodes = [];
  const containers = [];
  const streamItemNodes = [];
  const counts = {};
  const add = (node, {target = true, type = getNodeType(node)} = {}) => {
    counts[type] = (counts[type] || 0) + 1;
    const name = type + (counts[type] - 1);
    names.push(name);
    nodes[name] = node;
    if (target) {
      referenceTargets.push(name);
    }
    return name;
  };
  const addContainer = type => {
    const name = add({[type]: type === 'object' ? {} : []});
    containers.push(name);
    return name;
  };
  const errors = [];
  const addError = () => {
    const name = add({error: 'error ' + errors.length});
    errors.push(name);
    return name;
  };
  // Different nodes can represent the same Map key (for example, 0 and -0).
  // Compare their values so adding a key doesn't overwrite an existing entry.
  const keyValues = new Map();
  const propsKeys = new Map();
  const getMapKeyValue = name => {
    if (!keyValues.has(name)) {
      const node = nodes[name];
      let value = node;
      switch (getNodeType(node)) {
        case 'value':
          value = node.value;
          break;
        case 'special':
          value = specialValueFactories[node.special]();
          break;
        case 'text':
          value = node.text + '🙂'.repeat(400);
          break;
        case 'props':
          if (!propsKeys.has(node.props)) {
            propsKeys.set(node.props, {});
          }
          value = propsKeys.get(node.props);
          break;
      }
      keyValues.set(name, value);
    }
    return keyValues.get(name);
  };
  const addReference = (container, item) => {
    const node = nodes[container];
    if ('map' in node) {
      const used = new Set(node.map.map(entry => getMapKeyValue(entry[0])));
      const free = referenceTargets.filter(
        name => !used.has(getMapKeyValue(name)),
      );
      const key =
        free.length > 0
          ? pickFrom(free)
          : add({value: 'key ' + used.size}, {target: false});
      node.map.push([key, item]);
    } else if ('object' in node) {
      const i = Object.keys(node.object).length;
      // Include names that need escaping and integer-like keys that affect order.
      const keys = without.includes('colon')
        ? ['field' + i]
        : [
            'field' + i,
            ':' + i,
            '%3A' + i,
            '%25:' + i,
            '' + i,
            i === 0 ? '' : 'field' + i,
            '🙂' + i,
            'constructor' + i,
          ];
      const key = pickFrom(keys);
      node.object[key] = item;
    } else {
      node[getNodeType(node)].push(item);
    }
  };
  const createStreamItem = (
    item = pickFrom(referenceTargets),
    target = true,
  ) => {
    const name = add({array: [item]}, {type: 'item', target});
    containers.push(name);
    streamItemNodes.push(name);
    return name;
  };

  add({value: 'value'});
  add({value: 'other value'});
  add({value: ''});
  add({value: 42});
  add({value: -1.5});
  add({value: 0});
  add({value: true});
  add({value: false});
  add({value: null});
  add({date: 1700000000000 + pick(100000)});
  add({binary: pick(256)});
  add({text: 'text-' + pick(1000)});
  add({blob: 'blob-' + pick(1000)});
  const specials = Object.keys(specialValueFactories).filter(
    name => !without.includes(name),
  );
  add({special: pickFrom(specials)});
  add({special: pickFrom(specials)});
  if (!without.includes('host')) {
    add({host: 'atom'});
  }
  const moduleCount = without.includes('module') ? 0 : 2 + pick(2);
  for (let i = 0; i < moduleCount; i++) {
    const node = {module: 'export-' + i};
    if (pick(3) === 0) {
      node.async = true;
    }
    add(node);
  }
  ['array', 'object', 'set', 'map'].forEach(addContainer);
  if (!without.includes('colon')) {
    containers.push(add({object: {}}));
  }
  const options = {};

  // Most cases stay small enough to inspect. One graph in LARGE_GRAPH_CHANCE
  // grows the same mixed graph further, using a separate seed so scheduling is
  // independent.
  const LARGE_GRAPH_CHANCE = 8;
  const SMALL_GRAPH_OPERATIONS = 8;
  const SMALL_GRAPH_EXTRA = 16;
  const LARGE_GRAPH_OPERATIONS = 64;
  const LARGE_GRAPH_EXTRA = 64;
  const operationCount =
    createRandom(seed + '/size')(LARGE_GRAPH_CHANCE) === 0
      ? LARGE_GRAPH_OPERATIONS + pick(LARGE_GRAPH_EXTRA)
      : SMALL_GRAPH_OPERATIONS + pick(SMALL_GRAPH_EXTRA);
  for (let step = 0; step < operationCount; step++) {
    const before = names.length;
    const existing = containers.slice();
    switch (pickFrom(allowedOperations)) {
      case 'link': {
        addReference(pickFrom(containers), pickFrom(referenceTargets));
        break;
      }
      case 'self': {
        const container = pickFrom(containers);
        addReference(container, container);
        break;
      }
      case 'mutual': {
        const a = pickFrom(containers);
        const b = pickFrom(containers);
        addReference(a, b);
        addReference(b, a);
        break;
      }
      case 'duplicate': {
        const container = pickFrom(containers);
        const target = pickFrom(referenceTargets);
        addReference(container, target);
        addReference(container, target);
        break;
      }
      case 'map key': {
        const map = addContainer('map');
        const key = pickFrom(referenceTargets);
        nodes[map].map.push([key, key]);
        break;
      }
      case 'promise': {
        // Promise resolution reads .then, which throws on a client reference.
        add({
          promise: pickFrom(
            referenceTargets.filter(name => !('module' in nodes[name])),
          ),
        });
        break;
      }
      case 'rejected promise': {
        add({promise: addError(), reject: true});
        break;
      }
      case 'stream': {
        const choice = pick(3);
        if (choice === 0) {
          // Reuse one value across both items, which are only in the stream, so a
          // typed array or a nested stream is re-emitted for each item.
          const shared = pickFrom(referenceTargets);
          add({
            stream: [
              createStreamItem(shared, false),
              createStreamItem(shared, false),
            ],
          });
        } else if (choice === 1) {
          // Reuse a sync iterator across stream items. The items are only in the
          // stream, so the writer re-reads the iterator for the second item; its
          // contents must be retained after the first item consumes it.
          const iterator = add(
            {
              iterator: [
                pickFrom(referenceTargets),
                pickFrom(referenceTargets),
              ],
            },
            {target: false},
          );
          add({
            stream: [
              createStreamItem(iterator, false),
              createStreamItem(iterator, false),
            ],
          });
        } else {
          add({stream: [createStreamItem(), createStreamItem()]});
        }
        break;
      }
      case 'failing stream': {
        // An error can discard queued items before the writer reads them.
        // Use an empty stream so the expected result is unambiguous.
        add({stream: [], fail: addError()});
        break;
      }
      case 'canceled stream': {
        add({stream: [createStreamItem()], cancel: true});
        break;
      }
      case 'byte stream': {
        add({bytes: 1 + pick(3)});
        break;
      }
      case 'iterable': {
        add({
          iterable: [createStreamItem(), createStreamItem()],
          returns: createStreamItem(),
          single: pick(2) === 0,
        });
        break;
      }
      case 'iterator': {
        singleUseNodes.push(
          add(
            {
              iterator: [
                pickFrom(referenceTargets),
                pickFrom(referenceTargets),
              ],
            },
            {target: false},
          ),
        );
        break;
      }
      case 'element': {
        add({
          element:
            pick(2) === 0
              ? pickFrom(referenceTargets)
              : [pickFrom(referenceTargets), pickFrom(referenceTargets)],
        });
        break;
      }
      case 'props': {
        const elements = names.filter(name => 'element' in nodes[name]);
        if (elements.length === 0) {
          add({props: add({element: pickFrom(referenceTargets)})});
        } else {
          add({props: pickFrom(elements)});
        }
        break;
      }
      case 'component': {
        add({component: pickFrom(referenceTargets)});
        break;
      }
      case 'failing component': {
        add({component: addError(), throw: true});
        break;
      }
      case 'bound function': {
        add({
          bound:
            pick(3) === 0
              ? []
              : [pickFrom(referenceTargets), pickFrom(referenceTargets)],
        });
        break;
      }
      case 'error': {
        nodes[addError()].cause = pickFrom(referenceTargets);
        break;
      }
      case 'aggregate error': {
        // Use existing values: AggregateError copies the array in its constructor.
        const aggregated = [
          pickFrom(referenceTargets),
          pickFrom(referenceTargets),
        ];
        nodes[addError()].errors = aggregated;
        break;
      }
      case 'fragment': {
        const hosts = names.filter(name => 'host' in nodes[name]);
        if (hosts.length > 0) {
          add({fragment: [pickFrom(hosts), pickFrom(hosts)]});
        }
        break;
      }
      case 'failing module': {
        const modules = names.filter(
          name => 'module' in nodes[name] && nodes[name].fail === undefined,
        );
        if (modules.length > 0) {
          const node = nodes[pickFrom(modules)];
          node.fail = node.async && pick(2) === 0 ? 'evaluate' : 'load';
        }
        break;
      }
      case 'after eof': {
        options.afterEof = true;
        break;
      }
      case 'root promise': {
        options.rootPromise = true;
        break;
      }
      default:
        break;
    }
    // Connect new nodes to existing containers so they can be reached from a root.
    for (let i = before; i < names.length; i++) {
      if (referenceTargets.includes(names[i])) {
        addReference(pickFrom(existing), names[i]);
      } else if (singleUseNodes.includes(names[i])) {
        addReference(
          pickFrom(existing.filter(name => !streamItemNodes.includes(name))),
          names[i],
        );
      }
    }
  }
  const roots = {entry: pickFrom(containers), other: pickFrom(containers)};
  // Make every generated node reachable so the writer sees all expected errors.
  // Error causes don't count here because production doesn't serialize them.
  for (;;) {
    const reached = getReachableNodes(
      {nodes, roots},
      {includeErrorProperties: false},
    );
    const missing = referenceTargets.filter(name => !reached.has(name));
    if (missing.length === 0) {
      break;
    }
    addReference(
      pickFrom(containers.filter(name => reached.has(name))),
      pickFrom(missing),
    );
  }
  return {nodes, roots, ...options};
}

// Generate a large graph with a small number of async dependencies.
function generateScaleGraph(seed) {
  const pick = createRandom(seed + '/scale');
  const shape = ['bound', 'wide', 'cycle'][pick(3)];
  const size = 2 ** (5 + pick(shape === 'bound' ? 7 : 4));
  const nodes = {
    tail: {module: 'loaded'},
    value: {value: 'done'},
  };
  let entry;
  if (shape === 'bound') {
    let previous = 'tail';
    for (let i = 0; i < size; i++) {
      const name = 'bound' + i;
      nodes[name] = {bound: [previous], loaded: true};
      previous = name;
    }
    entry = previous;
  } else if (shape === 'wide') {
    nodes.shared = {object: {tail: 'tail', value: 'value'}};
    const items = [];
    for (let i = 0; i < size; i++) {
      const name = 'item' + i;
      nodes[name] =
        pick(2) === 0 ? {set: ['shared']} : {map: [['value', 'shared']]};
      items.push(name);
    }
    nodes.items = {array: items};
    entry = 'items';
  } else {
    const cells = [];
    for (let i = 0; i < size; i++) {
      const next = 'cells';
      nodes['cell' + i] =
        pick(2) === 0 ? {object: {next, tail: 'tail'}} : {set: [next, 'tail']};
      cells.push('cell' + i);
    }
    // Point each cell back to the Set. This creates a large cycle without
    // deeply nesting the values the writer traverses synchronously.
    nodes.cells = {set: cells};
    entry = 'cells';
  }
  return {
    shape,
    size,
    graph: {
      nodes,
      roots: {entry, other: 'value'},
      afterEof: true,
      // Fragment packets without a task for every byte of a large graph.
      packetSizes: [7, 4096, 16384],
      yieldBetweenPackets: false,
    },
  };
}

module.exports = {
  getNodeType,
  getReferencedNodes,
  getReachableNodes,
  specialValueFactories,
  createRandom,
  generateGraph,
  generateScaleGraph,
};
