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
  'special',
  'host',
  'module',
  'error',
  'array',
  'object',
  'set',
  'map',
  'bound',
  'element',
  'props',
  'fragment',
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
    case 'bound':
      return node[getNodeType(node)];
    case 'object':
      return Object.values(node.object);
    case 'map':
      return node.map.flat();
    case 'fragment':
      return node.fragment;
    case 'element':
      return [].concat(node.element);
    case 'props':
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

function createRandom(seed) {
  const rand = Random.create(seed);
  return limit => rand(limit);
}

// Each operation adds a node or a reference, or changes when a value becomes
// available. Operations reuse nodes that already exist, which is how cycles
// appear.
const graphOperations = [
  'link',
  'self',
  'mutual',
  'duplicate',
  'map key',
  'promise',
  'rejected promise',
  'element',
  'props',
  'bound function',
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
  const containers = [];
  const counts = {};
  const add = (node, {target = true} = {}) => {
    const type = getNodeType(node);
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
      const keys = [
        'field' + i,
        ':' + i,
        '%3A' + i,
        '%25:' + i,
        '' + i,
        i === 0 ? '' : 'field' + i,
        '🙂' + i,
        'constructor' + i,
      ];
      const key = pickFrom(
        without.includes('colon')
          ? keys.filter(name => !name.includes(':'))
          : keys,
      );
      node.object[key] = item;
    } else {
      node[getNodeType(node)].push(item);
    }
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
  const specials = Object.keys(specialValueFactories).filter(
    name => !without.includes(name),
  );
  add({special: pickFrom(specials)});
  add({special: pickFrom(specials)});
  if (!without.includes('host')) {
    add({host: 'atom'});
  }
  const moduleCount = 2 + pick(2);
  for (let i = 0; i < moduleCount; i++) {
    const node = {module: 'export-' + i};
    if (pick(3) === 0) {
      node.async = true;
    }
    add(node);
  }
  ['array', 'object', 'set', 'map'].forEach(addContainer);
  containers.push(add({object: {}}));
  const options = {};

  // Most cases are small enough to read. One in LARGE_GRAPH_CHANCE gets many
  // more operations. That choice has its own random sequence, so that it does
  // not change the rest of the case.
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
      case 'bound function': {
        add({
          bound:
            pick(3) === 0
              ? []
              : [pickFrom(referenceTargets), pickFrom(referenceTargets)],
        });
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
      }
    }
  }
  const roots = {entry: pickFrom(containers), other: pickFrom(containers)};
  // Make every generated node reachable so the writer sees all expected errors.
  for (;;) {
    const reached = getReachableNodes({nodes, roots});
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

// Generates a large graph that waits for only a few events.
function generateScaleGraph(seed) {
  const pick = createRandom(seed + '/scale');
  const shape = ['bound', 'wide'][pick(2)];
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
  } else {
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
  }
  return {
    shape,
    size,
    graph: {
      nodes,
      roots: {entry, other: 'value'},
      afterEof: true,
      // Use larger packets here. With tiny ones a large graph takes a task
      // for every few bytes.
      packetSizes: [7, 4096, 16384],
      yieldBetweenPackets: false,
    },
  };
}

// Preserve node order and scheduling while removing unreachable nodes.
function pruneGraph(graph) {
  const reached = getReachableNodes(graph);
  const nodes = {};
  const names = Object.keys(graph.nodes);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (reached.has(name)) {
      nodes[name] = graph.nodes[name];
    }
  }
  return {...graph, nodes};
}

function* generateReductionCandidates(graph) {
  const names = Object.keys(graph.nodes);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    yield {...graph, roots: {entry: name, other: name}};
  }
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const node = graph.nodes[name];
    const replace = next => ({...graph, nodes: {...graph.nodes, [name]: next}});
    yield replace({value: null});
    const type = getNodeType(node);
    // Try removing large pieces first, so that it does not take one run for
    // every removed item.
    const list = type === 'object' ? Object.keys(node.object) : node[type];
    if (Array.isArray(list) && type !== 'element') {
      for (let width = list.length; width > 0; width = Math.floor(width / 2)) {
        for (let start = 0; start < list.length; start += width) {
          const kept = list.slice(0, start).concat(list.slice(start + width));
          yield replace({
            ...node,
            [type]:
              type === 'object'
                ? Object.fromEntries(
                    kept.map(field => [field, node.object[field]]),
                  )
                : kept,
          });
        }
      }
    }
    const options = ['async', 'fail', 'reject', 'loaded'];
    for (let j = 0; j < options.length; j++) {
      const key = options[j];
      if (key in node) {
        const next = {...node};
        delete next[key];
        yield replace(next);
      }
    }
  }
  const options = ['rootPromise', 'afterEof'];
  for (let i = 0; i < options.length; i++) {
    const key = options[i];
    if (graph[key]) {
      const next = {...graph};
      delete next[key];
      yield next;
    }
  }
}

async function shrinkGraph(original, reproduces, budget) {
  let graph = original;
  let attempts = 0;
  let reproduction = null;
  const seen = new Set([JSON.stringify(graph)]);
  for (;;) {
    let changed = false;
    const previousSize = JSON.stringify(graph).length;
    const candidates = generateReductionCandidates(graph);
    for (;;) {
      const step = candidates.next();
      if (step.done) {
        break;
      }
      if (attempts + 2 > budget) {
        return {graph, attempts, reproduction};
      }
      const next = pruneGraph(step.value);
      const key = JSON.stringify(next);
      if (key.length >= previousSize || seen.has(key)) {
        continue;
      }
      seen.add(key);
      attempts++;
      if (!(await reproduces(next))) {
        continue;
      }
      // Require two consecutive failures before accepting a smaller graph.
      attempts++;
      const confirmed = await reproduces(next);
      if (!confirmed) {
        continue;
      }
      graph = next;
      reproduction = confirmed;
      changed = true;
      break;
    }
    if (!changed) {
      return {graph, attempts, reproduction};
    }
  }
}

function formatGraphTest(graph, readTiming) {
  const lines = ["it('pasted', () =>", '  runGraph({', '    nodes: {'];
  for (const name in graph.nodes) {
    lines.push(
      '      ' +
        JSON.stringify(name) +
        ': ' +
        JSON.stringify(graph.nodes[name]) +
        ',',
    );
  }
  lines.push('    },');
  for (const key in graph) {
    if (
      !['nodes', 'events', 'packetSizes', 'yieldBetweenPackets'].includes(key)
    ) {
      lines.push(
        '    ' + JSON.stringify(key) + ': ' + JSON.stringify(graph[key]) + ',',
      );
    }
  }
  ['events', 'packetSizes', 'yieldBetweenPackets'].forEach(key => {
    if (graph[key] !== undefined) {
      lines.push('    ' + key + ': ' + JSON.stringify(graph[key]) + ',');
    }
  });
  lines.push(
    '    readTiming: ' + JSON.stringify(readTiming) + ',',
    '  }),',
    ');',
  );
  return lines.join('\n');
}

function formatReplayCommand(
  seed,
  testName,
  development,
  {build = false, releaseChannel = 'experimental'} = {},
) {
  const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
  const pattern = '^' + testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$';
  return (
    'FUZZ_TEST_SEED=' +
    quote(seed) +
    ' FLIGHT_FUZZ_CASES=1 yarn test ' +
    'ReactFlightFuzz' +
    (build ? ' --build' : '') +
    (releaseChannel === 'stable' ? ' --release-channel=stable' : '') +
    (development ? '' : ' --prod') +
    ' --runInBand -t ' +
    quote(pattern)
  );
}

module.exports = {
  getNodeType,
  getReachableNodes,
  specialValueFactories,
  createRandom,
  generateGraph,
  generateScaleGraph,
  shrinkGraph,
  formatGraphTest,
  formatReplayCommand,
};
