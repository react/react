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

// Renders random trees, interrupts random transitions at random points with
// synchronous updates, and checks after every step that what's committed is
// what rendering the current state from scratch would produce, and that
// effects stayed balanced. The tree is described by a plain spec so that the
// expected output can be computed without React. Leaves can suspend on data
// that's resolved at random points, and subtrees can be hidden; the check
// runs once nothing is pending anymore.

let React;
let ReactNoop;
let Scheduler;
let act;
let gen;

describe('ReactIncrementalResuming fuzz', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    gen = require('random-seed');
  });

  const WIDTH = 3;
  const DEPTH = 3;

  // ---- Spec generation -----------------------------------------------------

  function generateSpec(rand, ids) {
    function node(depth, canConsume) {
      const kinds = ['text', 'state', 'memo', 'class', 'async'];
      if (canConsume) {
        kinds.push('consumer');
      }
      if (depth > 0) {
        kinds.push('provider', 'list', 'maybe', 'suspense', 'activity');
      }
      const kind = kinds[rand.range(kinds.length)];
      const id = 'n' + ids.next++;
      switch (kind) {
        case 'text':
        case 'async':
        case 'consumer':
          return {kind, id};
        case 'state':
        case 'memo':
        case 'class':
        case 'maybe':
        case 'suspense':
        case 'activity':
          return {kind, id, children: children(depth, canConsume)};
        case 'provider':
          return {kind, id, children: children(depth, true)};
        case 'list': {
          const items = [];
          const count = 1 + rand.range(WIDTH);
          for (let i = 0; i < count; i++) {
            items.push('n' + ids.next++);
          }
          return {kind, id, items};
        }
        default:
          throw new Error(kind);
      }
    }
    function children(depth, canConsume) {
      const result = [];
      if (depth === 0) {
        return result;
      }
      const count = 1 + rand.range(WIDTH);
      for (let i = 0; i < count; i++) {
        result.push(node(depth - 1, canConsume));
      }
      return result;
    }
    return {kind: 'state', id: 'root', children: children(DEPTH, false)};
  }

  function initialState(spec, state) {
    switch (spec.kind) {
      case 'state':
      case 'memo':
      case 'class':
      case 'provider':
        state[spec.id] = 0;
        spec.children.forEach(c => initialState(c, state));
        break;
      case 'maybe':
      case 'activity':
        state[spec.id] = true;
        spec.children.forEach(c => initialState(c, state));
        break;
      case 'suspense':
        spec.children.forEach(c => initialState(c, state));
        break;
      case 'list':
        state[spec.id] = spec.items.slice();
        break;
      default:
        break;
    }
  }

  // ---- Expected output, computed without React -----------------------------

  // Only valid once nothing is pending: a suspended subtree in a transition
  // keeps showing what it showed before, which this doesn't model.
  function expectedOutput(spec, state, parentValue, ctx, hidden) {
    const id = spec.id;
    const span = prop =>
      hidden ? <span prop={prop} hidden={true} /> : <span prop={prop} />;
    switch (spec.kind) {
      case 'text':
      case 'async':
        return [span(id + ':' + parentValue)];
      case 'consumer':
        return [span(id + ':' + ctx)];
      case 'state':
      case 'memo':
      case 'class': {
        const value = state[id];
        const out = [span(id + ':' + value + ':' + parentValue)];
        spec.children.forEach(c => {
          out.push(...expectedOutput(c, state, value, ctx, hidden));
        });
        return out;
      }
      case 'provider': {
        const value = state[id];
        const out = [];
        spec.children.forEach(c => {
          out.push(...expectedOutput(c, state, parentValue, value, hidden));
        });
        return out;
      }
      case 'maybe': {
        if (!state[id]) {
          return [];
        }
        const out = [];
        spec.children.forEach(c => {
          out.push(...expectedOutput(c, state, parentValue, ctx, hidden));
        });
        return out;
      }
      case 'suspense': {
        const out = [];
        spec.children.forEach(c => {
          out.push(...expectedOutput(c, state, parentValue, ctx, hidden));
        });
        return out;
      }
      case 'activity': {
        const out = [];
        const hide = hidden || !state[id];
        spec.children.forEach(c => {
          out.push(...expectedOutput(c, state, parentValue, ctx, hide));
        });
        return out;
      }
      case 'list':
        return state[id].map(item => span(item + ':' + parentValue));
      default:
        throw new Error(spec.kind);
    }
  }

  // ---- Components ----------------------------------------------------------

  function createComponents(initial, setters, effects, resources) {
    const Context = React.createContext(-1);

    // Data a leaf reads. Each distinct key starts out pending and is resolved
    // by the script.
    function readResource(key) {
      let resource = resources.map.get(key);
      if (resource === undefined) {
        let resolve;
        const promise = new Promise(r => {
          resolve = r;
        });
        resource = {promise, resolve, resolved: false};
        resources.map.set(key, resource);
        resources.pending.push(key);
      }
      if (!resource.resolved) {
        throw resource.promise;
      }
      return key;
    }

    function Async({id, parentValue}) {
      const key = readResource(id + ':' + parentValue);
      Scheduler.log(id);
      return <span prop={key} />;
    }

    function Boundary({spec, parentValue}) {
      Scheduler.log(spec.id);
      return (
        <React.Suspense fallback={<span prop={'fallback:' + spec.id} />}>
          <Children specs={spec.children} parentValue={parentValue} />
        </React.Suspense>
      );
    }

    function Hideable({spec, parentValue}) {
      const [visible, setVisible] = React.useState(initial[spec.id]);
      useSetter(spec.id, setVisible);
      Scheduler.log(spec.id);
      return (
        <React.Activity mode={visible ? 'visible' : 'hidden'}>
          <Children specs={spec.children} parentValue={parentValue} />
        </React.Activity>
      );
    }

    function useTrackedEffect(id) {
      React.useEffect(() => {
        effects[id] = (effects[id] || 0) + 1;
        return () => {
          effects[id] -= 1;
        };
      }, []);
    }

    function Text({id, parentValue}) {
      Scheduler.log(id);
      return <span prop={id + ':' + parentValue} />;
    }

    function Consumer({id}) {
      const ctx = React.useContext(Context);
      Scheduler.log(id);
      return <span prop={id + ':' + ctx} />;
    }

    function Children({specs, parentValue}) {
      return specs.map(c => (
        <Node key={c.id} spec={c} parentValue={parentValue} />
      ));
    }

    // Setters are registered from effects, so that the script only updates
    // components that have mounted. React warns about updating one that
    // hasn't, and updating one that unmounted is a no-op.
    function useSetter(id, setter) {
      React.useEffect(() => {
        setters[id] = setter;
        return () => {
          if (setters[id] === setter) {
            delete setters[id];
          }
        };
      });
    }

    function Stateful({spec, parentValue}) {
      const [value, setValue] = React.useState(initial[spec.id]);
      useSetter(spec.id, setValue);
      useTrackedEffect(spec.id);
      Scheduler.log(spec.id);
      return (
        <>
          <span prop={spec.id + ':' + value + ':' + parentValue} />
          <Children specs={spec.children} parentValue={value} />
        </>
      );
    }

    const MemoStateful = React.memo(Stateful);

    class ClassStateful extends React.Component {
      state = {value: initial[this.props.spec.id]};
      shouldComponentUpdate(nextProps, nextState) {
        return (
          this.props.parentValue !== nextProps.parentValue ||
          this.state.value !== nextState.value
        );
      }
      setter = value => this.setState({value});
      componentDidMount() {
        const id = this.props.spec.id;
        effects[id] = (effects[id] || 0) + 1;
        setters[id] = this.setter;
      }
      componentDidUpdate() {
        setters[this.props.spec.id] = this.setter;
      }
      componentWillUnmount() {
        const id = this.props.spec.id;
        effects[id] -= 1;
        if (setters[id] === this.setter) {
          delete setters[id];
        }
      }
      render() {
        const {spec, parentValue} = this.props;
        Scheduler.log(spec.id);
        return (
          <>
            <span prop={spec.id + ':' + this.state.value + ':' + parentValue} />
            <Children specs={spec.children} parentValue={this.state.value} />
          </>
        );
      }
    }

    function Provider({spec, parentValue}) {
      const [value, setValue] = React.useState(initial[spec.id]);
      useSetter(spec.id, setValue);
      Scheduler.log(spec.id);
      return (
        <Context.Provider value={value}>
          <Children specs={spec.children} parentValue={parentValue} />
        </Context.Provider>
      );
    }

    function Maybe({spec, parentValue}) {
      const [show, setShow] = React.useState(initial[spec.id]);
      useSetter(spec.id, setShow);
      Scheduler.log(spec.id);
      return show ? (
        <Children specs={spec.children} parentValue={parentValue} />
      ) : null;
    }

    const Item = React.memo(function Item({id, parentValue}) {
      useTrackedEffect(id);
      Scheduler.log(id);
      return <span prop={id + ':' + parentValue} />;
    });

    function List({spec, parentValue}) {
      const [order, setOrder] = React.useState(initial[spec.id]);
      useSetter(spec.id, setOrder);
      Scheduler.log(spec.id);
      return order.map(item => (
        <Item key={item} id={item} parentValue={parentValue} />
      ));
    }

    function Node({spec, parentValue}) {
      switch (spec.kind) {
        case 'text':
          return <Text id={spec.id} parentValue={parentValue} />;
        case 'async':
          return <Async id={spec.id} parentValue={parentValue} />;
        case 'suspense':
          return <Boundary spec={spec} parentValue={parentValue} />;
        case 'activity':
          return <Hideable spec={spec} parentValue={parentValue} />;
        case 'consumer':
          return <Consumer id={spec.id} />;
        case 'state':
          return <Stateful spec={spec} parentValue={parentValue} />;
        case 'memo':
          return <MemoStateful spec={spec} parentValue={parentValue} />;
        case 'class':
          return <ClassStateful spec={spec} parentValue={parentValue} />;
        case 'provider':
          return <Provider spec={spec} parentValue={parentValue} />;
        case 'maybe':
          return <Maybe spec={spec} parentValue={parentValue} />;
        case 'list':
          return <List spec={spec} parentValue={parentValue} />;
        default:
          throw new Error(spec.kind);
      }
    }

    return Node;
  }

  // ---- Script --------------------------------------------------------------

  function nextValue(rand, spec, state) {
    switch (spec.kind) {
      case 'maybe':
      case 'activity':
        return !state[spec.id];
      case 'list': {
        const order = state[spec.id].slice();
        const op = rand.range(3);
        if (op === 0) {
          order.reverse();
        } else if (op === 1 && order.length > 1) {
          order.push(order.shift());
        } else {
          // Drop one or add it back.
          const all = spec.items;
          const missing = all.filter(i => order.indexOf(i) === -1);
          if (missing.length > 0) {
            order.splice(rand.range(order.length + 1), 0, missing[0]);
          } else if (order.length > 1) {
            order.splice(rand.range(order.length), 1);
          }
        }
        return order;
      }
      default:
        return state[spec.id] + 1 + rand.range(3);
    }
  }

  // Every stateful component, whether or not the model currently shows it:
  // a hidden one may still be mounted in React, since the update that hides it
  // may not have committed yet. Updating an unmounted one is a no-op.
  function allSetters(spec, out) {
    switch (spec.kind) {
      case 'state':
      case 'memo':
      case 'class':
      case 'provider':
      case 'maybe':
      case 'activity':
        out.push(spec);
        spec.children.forEach(c => allSetters(c, out));
        break;
      case 'suspense':
        spec.children.forEach(c => allSetters(c, out));
        break;
      case 'list':
        out.push(spec);
        break;
      default:
        break;
    }
    return out;
  }

  function liveEffectIds(spec, state, out) {
    switch (spec.kind) {
      case 'state':
      case 'memo':
      case 'class':
        out.push(spec.id);
        spec.children.forEach(c => liveEffectIds(c, state, out));
        break;
      case 'provider':
      case 'suspense':
        spec.children.forEach(c => liveEffectIds(c, state, out));
        break;
      case 'activity':
        // Effects in a hidden tree are disconnected; only check visible ones.
        if (state[spec.id]) {
          spec.children.forEach(c => liveEffectIds(c, state, out));
        }
        break;
      case 'maybe':
        if (state[spec.id]) {
          spec.children.forEach(c => liveEffectIds(c, state, out));
        }
        break;
      case 'list':
        state[spec.id].forEach(item => out.push(item));
        break;
      default:
        break;
    }
    return out;
  }

  async function runScenario(seed) {
    const rand = gen.create('seed' + seed);
    const spec = generateSpec(rand, {next: 0});
    const state = {};
    initialState(spec, state);
    const setters = {};
    const effects = {};
    const resources = {map: new Map(), pending: []};
    // Components read their initial state from the live model, so one that
    // remounts (after a hide and show) comes back with the model's value,
    // whether or not React committed the hidden state in between.
    const Node = createComponents(state, setters, effects, resources);
    const debug = process.env.RESUMING_FUZZ_DEBUG
      ? (...args) => process.stdout.write(args.join(' ') + '\n')
      : () => {};
    debug('spec', JSON.stringify(spec));

    // Resolve pending data, in random order, one at a time or in batches,
    // until nothing is pending. Rendering with pending data can suspend again
    // on new keys, so this loops.
    async function resolveEverything() {
      while (resources.pending.length > 0) {
        const batch = 1 + rand.range(resources.pending.length);
        for (let i = 0; i < batch; i++) {
          const index = rand.range(resources.pending.length);
          const key = resources.pending.splice(index, 1)[0];
          const resource = resources.map.get(key);
          resource.resolved = true;
          resource.resolve(key);
        }
        debug('  log', Scheduler.unstable_clearLog().join(' '));
        await act(async () => {});
      }
    }

    function applyValue(target, value) {
      state[target.id] = value;
    }

    function flat(jsx) {
      if (jsx === null || jsx === undefined) return '';
      if (Array.isArray(jsx)) return jsx.map(flat).join(' ');
      if (jsx.type === React.Fragment) return flat(jsx.props.children);
      if (typeof jsx.props.prop === 'string') {
        return jsx.props.prop + (jsx.props.hidden ? '(h)' : '');
      }
      return flat(jsx.props.children);
    }
    const root = ReactNoop.createRoot();
    await act(() => root.render(<Node spec={spec} parentValue={0} />));
    debug('  log', Scheduler.unstable_clearLog().join(' '));
    await resolveEverything();
    debug('  log', Scheduler.unstable_clearLog().join(' '));

    function check(step) {
      const expected = expectedOutput(spec, state, 0, -1, false);
      expect(root).toMatchRenderedOutput(
        expected.length === 1 ? expected[0] : <>{expected}</>,
      );
      const live = liveEffectIds(spec, state, []);
      const ids = Object.keys(effects);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const expectedCount = live.indexOf(id) === -1 ? 0 : 1;
        if (effects[id] !== expectedCount && !insideHidden(spec, state, id)) {
          throw new Error(
            `seed ${seed} step ${step}: effects for ${id} are ${effects[id]}, expected ${expectedCount}`,
          );
        }
      }
    }

    const steps = 3 + rand.range(5);
    for (let step = 0; step < steps; step++) {
      const candidates = allSetters(spec, []).filter(c => setters[c.id]);
      const target = candidates[rand.range(candidates.length)];
      const value = nextValue(rand, target, state);

      // Start a transition and let it run for a random number of units.
      React.startTransition(() => setters[target.id](value));
      applyValue(target, value);
      const units = rand.range(12);
      debug(
        'step',
        step,
        'transition',
        target.id,
        JSON.stringify(value),
        'units',
        units,
      );
      if (units > 0) {
        Scheduler.unstable_flushNumberOfYields(units);
      }
      debug('  log', Scheduler.unstable_clearLog().join(' '));

      // Interrupt it with one or two synchronous updates, possibly to the same
      // component, possibly a context value or a list, then let everything
      // settle.
      const interruptions = rand.range(3);
      for (let i = 0; i < interruptions; i++) {
        const live = allSetters(spec, []).filter(c => setters[c.id]);
        const other = live[rand.range(live.length)];
        const otherValue = nextValue(rand, other, state);
        applyValue(other, otherValue);
        if (rand.range(4) === 0) {
          // Another update in the same transition instead.
          debug('  same-lane', other.id, JSON.stringify(otherValue));
          React.startTransition(() => setters[other.id](otherValue));
        } else {
          debug('  sync', other.id, JSON.stringify(otherValue));
          ReactNoop.flushSync(() => setters[other.id](otherValue));
        }
      }
      // Some of the pending data may resolve while the transition is still
      // going, the rest once it's done.
      if (resources.pending.length > 0 && rand.range(2) === 0) {
        const key = resources.pending.shift();
        const resource = resources.map.get(key);
        resource.resolved = true;
        resource.resolve(key);
        debug('  resolve', key);
      }
      debug('  log', Scheduler.unstable_clearLog().join(' '));
      await act(async () => {});
      debug('  received', flat(root.getChildrenAsJSX()));
      debug('  expected', flat(expectedOutput(spec, state, 0, -1, false)));
      await resolveEverything();
      debug('  log', Scheduler.unstable_clearLog().join(' '));
      check(step);
    }
  }

  // Whether `id` is inside an Activity that's hidden (or was toggled), where
  // effect counts aren't checked.
  function insideHidden(spec, state, id) {
    let found = false;
    function visit(node, hidden) {
      if (node.id === id && hidden) {
        found = true;
      }
      const hide = hidden || (node.kind === 'activity' && !state[node.id]);
      if (node.children) {
        node.children.forEach(c => visit(c, hide));
      }
      if (node.kind === 'list' && hide && node.items.indexOf(id) !== -1) {
        found = true;
      }
    }
    visit(spec, false);
    return found;
  }

  // More seeds can be run locally with RESUMING_FUZZ_SEEDS=5000.
  const SEEDS = +process.env.RESUMING_FUZZ_SEEDS || 150;
  for (let seed = 0; seed < SEEDS; seed++) {
    it('converges and keeps effects balanced (seed ' + seed + ')', async () => {
      await runScenario(seed);
    });
  }
});
