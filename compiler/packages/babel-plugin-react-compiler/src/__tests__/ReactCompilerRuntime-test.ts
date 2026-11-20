/**
 * @jest-environment jsdom
 */

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {transformSync} from '@babel/core';
import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';

const runtimePath = '../../../react-compiler-runtime/src';

beforeEach(() => {
  jest.resetModules();
  jest.dontMock('react');
});

afterEach(() => {
  jest.dontMock('react');
});

describe.each(['modern', 'legacy'])('%s dispatcher internals', shape => {
  function setup() {
    const dispatcher = {
      useState: jest.fn(() => 'state'),
      useMemoCache: jest.fn(() => ['cache']),
    };
    const internals: any =
      shape === 'modern'
        ? {H: dispatcher}
        : {ReactCurrentDispatcher: {current: dispatcher}};
    jest.doMock('react', () => ({
      [shape === 'modern'
        ? '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE'
        : '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED']: internals,
    }));
    const {$dispatcherGuard: guard} = require(runtimePath);
    const current = () =>
      shape === 'modern'
        ? internals.H
        : internals.ReactCurrentDispatcher.current;
    return {guard, current, dispatcher};
  }

  it('installs the guard and restores the original dispatcher', () => {
    const {guard, current, dispatcher} = setup();
    guard(0);
    expect(current()).not.toBe(dispatcher);
    expect(() => current().useState()).toThrow(
      'Unexpected React hook call (useState)',
    );
    guard(1);
    expect(current()).toBe(dispatcher);
  });

  it('restores nested expected-hook regions', () => {
    const {guard, current, dispatcher} = setup();
    guard(0);
    const guarded = current();
    guard(2);
    expect(current()).toBe(dispatcher);
    expect(current().useState()).toBe('state');
    guard(2);
    expect(current()).toBe(dispatcher);
    guard(3);
    expect(current()).toBe(dispatcher);
    guard(3);
    expect(current()).toBe(guarded);
    guard(1);
    expect(current()).toBe(dispatcher);
  });

  it('restores nested compiled hooks inside an expected-hook region', () => {
    const {guard, current, dispatcher} = setup();
    guard(0);
    const guarded = current();
    guard(2);
    guard(0);
    expect(current()).toBe(guarded);
    guard(1);
    expect(current()).toBe(dispatcher);
    guard(3);
    expect(current()).toBe(guarded);
    guard(1);
    expect(current()).toBe(dispatcher);
  });

  it('restores the dispatcher when a nested compiled call throws', () => {
    const {guard, current, dispatcher} = setup();
    guard(0);
    const guarded = current();
    expect(() => {
      try {
        guard(0);
      } finally {
        guard(1);
      }
    }).toThrow('Unexpected call to custom hook or component');
    expect(current()).toBe(guarded);
    guard(1);
    expect(current()).toBe(dispatcher);
  });

  it('forwards memo-cache calls to the original dispatcher', () => {
    const {guard, current, dispatcher} = setup();
    guard(0);
    expect(current().useMemoCache(2)).toEqual(['cache']);
    expect(dispatcher.useMemoCache).toHaveBeenCalledWith(2);
    guard(1);
    expect(current()).toBe(dispatcher);
  });
});

it('uses a present H field even when its value is null', () => {
  const legacy = {};
  const internals = {H: null, ReactCurrentDispatcher: {current: legacy}};
  jest.doMock('react', () => ({
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: internals,
  }));
  const {$dispatcherGuard: guard} = require(runtimePath);
  guard(0);
  expect(internals.H).not.toBeNull();
  expect(internals.ReactCurrentDispatcher.current).toBe(legacy);
  expect(() => guard(1)).toThrow('unexpected null in guard stack');
});

function compileComponent(source: string, runtime: any) {
  const compiled = runBabelPluginReactCompiler(
    source,
    'hook-guards.js',
    'flow',
    {
      compilationMode: 'all',
      panicThreshold: 'all_errors',
      environment: {
        enableEmitHookGuards: {
          source: 'react-compiler-runtime',
          importSpecifierName: '$dispatcherGuard',
        },
        // Let invalid hook calls reach the runtime guard under test.
        validateHooksUsage: false,
      },
    },
  );
  expect(compiled.code).toContain('$dispatcherGuard');
  const transformed = transformSync(compiled.code!, {
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports: any = {};
  new Function('require', 'exports', transformed!.code!)((name: string) => {
    if (name === 'react-compiler-runtime') {
      return runtime;
    }
    if (name === 'indirect-hook') {
      return {invoke: (fn: () => unknown) => fn()};
    }
    return require(name);
  }, exports);
  return exports.Component;
}

it('renders compiled hooks, updates state, and recovers after a guard error', () => {
  const React = require('react');
  const {createRoot} = require('react-dom/client');
  const runtime = require(runtimePath);
  const Component = compileComponent(
    `import {createElement, useState} from 'react';
     function useValue() { return useState(0); }
     export function Component() {
       const [value, setValue] = useValue();
       return createElement('button', {onClick: () => setValue(value + 1)}, value);
     }`,
    runtime,
  );
  const InvalidComponent = compileComponent(
    `import {createElement, useState} from 'react';
     import {invoke} from 'indirect-hook';
     export function Component() {
       const value = invoke(useState);
       return createElement('div', null, value);
     }`,
    runtime,
  );
  const errors: Array<Error> = [];
  class Boundary extends React.Component {
    state = {failed: false};
    static getDerivedStateFromError() {
      return {failed: true};
    }
    render() {
      return this.state.failed ? 'caught' : this['props'].children;
    }
  }
  const container = document.createElement('div');
  const root = createRoot(container, {
    onCaughtError: (error: Error) => errors.push(error),
  });
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  try {
    React.act(() => root.render(React.createElement(Component)));
    expect(container.textContent).toBe('0');
    React.act(() => container.querySelector('button')!.click());
    expect(container.textContent).toBe('1');
    React.act(() =>
      root.render(
        React.createElement(
          Boundary,
          null,
          React.createElement(InvalidComponent),
        ),
      ),
    );
    expect(container.textContent).toBe('caught');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain(
      'Unexpected React hook call (useState)',
    );
    React.act(() => root.render(React.createElement(Component)));
    expect(container.textContent).toBe('0');
    expect(errors).toHaveLength(1);
  } finally {
    React.act(() => root.unmount());
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  }
});
