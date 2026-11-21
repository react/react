/**
 * @jest-environment jsdom
 */

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export {};

const React = require('react');
const {createRoot} = require('react-dom/client');
const {
  useRenderCounter,
  renderCounterRegistry,
  clearRenderCounterRegistry,
} = require('../../../react-compiler-runtime/src');

let root: ReturnType<typeof createRoot>;
let previousActEnvironment: unknown;

function Counter({name}: {name: string}) {
  useRenderCounter(name);
  return null;
}

function counters(name: string): Array<{count: number}> {
  return Array.from(renderCounterRegistry.get(name) ?? []);
}

function render(name: string) {
  React.act(() => root.render(React.createElement(Counter, {name})));
}

beforeEach(() => {
  renderCounterRegistry.clear();
  previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  root = createRoot(document.createElement('div'));
});

afterEach(() => {
  React.act(() => root.unmount());
  renderCounterRegistry.clear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

it('registers a counter without counting the initial render', () => {
  render('Component');
  expect(counters('Component')).toEqual([{count: 0}]);
});

it('keeps the same counter registered across repeated updates', () => {
  render('Component');
  const counter = counters('Component')[0];
  for (let count = 1; count <= 3; count++) {
    render('Component');
    expect(counters('Component')).toHaveLength(1);
    expect(counters('Component')[0]).toBe(counter);
    expect(counter.count).toBe(count);
  }
});

it('registers again after Strict Mode effect replay', () => {
  const setup = jest.fn();
  const cleanup = jest.fn();
  function StrictCounter() {
    useRenderCounter('Strict');
    React.useEffect(() => {
      setup();
      return cleanup;
    }, []);
    return null;
  }
  function renderStrict() {
    React.act(() =>
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(StrictCounter),
        ),
      ),
    );
  }
  renderStrict();
  expect(setup).toHaveBeenCalledTimes(2);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(counters('Strict')).toHaveLength(1);
  const counter = counters('Strict')[0];
  const initialCount = counter.count;
  renderStrict();
  expect(counters('Strict')).toHaveLength(1);
  expect(counters('Strict')[0]).toBe(counter);
  expect(counter.count).toBeGreaterThan(initialCount);
  React.act(() => root.render(null));
  expect(counters('Strict')).toEqual([]);
});

it('moves the existing counter when its name changes', () => {
  render('Before');
  const counter = counters('Before')[0];
  render('Before');
  render('After');
  expect(counters('Before')).toEqual([]);
  expect(counters('After')).toHaveLength(1);
  expect(counters('After')[0]).toBe(counter);
  expect(counter.count).toBe(2);
  for (const name of ['Next', 'Last', 'Before', 'After']) {
    const previousCount = counter.count;
    render(name);
    expect(Array.from(renderCounterRegistry.keys())).toEqual([name]);
    expect(counters(name)).toEqual([counter]);
    expect(counters(name)[0]).toBe(counter);
    expect(counter.count).toBe(previousCount + 1);
  }
  React.act(() => root.render(null));
  expect(counters('After')).toEqual([]);
  expect(renderCounterRegistry.size).toBe(0);
});

it('tracks instances with the same name independently', () => {
  function renderInstances(includeFirst: boolean) {
    React.act(() =>
      root.render(
        React.createElement(
          React.Fragment,
          null,
          includeFirst
            ? React.createElement(Counter, {key: 'first', name: 'Shared'})
            : null,
          React.createElement(Counter, {key: 'second', name: 'Shared'}),
        ),
      ),
    );
  }
  renderInstances(true);
  const [first, second] = counters('Shared');
  expect(counters('Shared')).toHaveLength(2);
  expect(first).not.toBe(second);
  renderInstances(false);
  expect(counters('Shared')).toHaveLength(1);
  expect(counters('Shared')[0]).toBe(second);
  expect(renderCounterRegistry.has('Shared')).toBe(true);
  React.act(() => root.render(null));
  expect(renderCounterRegistry.has('Shared')).toBe(false);
});

it('removes a counter when its component unmounts', () => {
  render('Component');
  React.act(() => root.render(null));
  expect(counters('Component')).toEqual([]);
  expect(renderCounterRegistry.has('Component')).toBe(false);
});

it('clears counts without removing registered counters', () => {
  render('Component');
  const counter = counters('Component')[0];
  render('Component');
  expect(counter.count).toBe(1);
  clearRenderCounterRegistry();
  expect(counter.count).toBe(0);
  expect(counters('Component')[0]).toBe(counter);
  render('Component');
  expect(counter.count).toBe(1);
  expect(counters('Component')[0]).toBe(counter);
});
