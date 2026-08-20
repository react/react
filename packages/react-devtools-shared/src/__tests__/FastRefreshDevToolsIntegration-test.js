/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getVersionedRenderImplementation} from './utils';

describe('Fast Refresh', () => {
  let React;
  let ReactFreshRuntime;
  let act;
  let babel;
  let exportsObj;
  let freshPlugin;
  let store;
  let withErrorsOrWarningsIgnored;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;

    exportsObj = undefined;

    babel = require('@babel/core');
    freshPlugin = require('react-refresh/babel');

    store = global.store;

    React = require('react');

    ReactFreshRuntime = require('react-refresh/runtime');
    ReactFreshRuntime.injectIntoGlobalHook(global);

    const utils = require('./utils');
    act = utils.act;
    withErrorsOrWarningsIgnored = utils.withErrorsOrWarningsIgnored;
  });

  const {render: renderImplementation, getContainer} =
    getVersionedRenderImplementation();

  function execute(source) {
    const compiled = babel.transform(source, {
      babelrc: false,
      presets: ['@babel/react'],
      plugins: [
        [freshPlugin, {skipEnvCheck: true}],
        '@babel/plugin-transform-modules-commonjs',
        '@babel/plugin-transform-destructuring',
      ].filter(Boolean),
    }).code;
    exportsObj = {};
    // eslint-disable-next-line no-new-func
    new Function(
      'global',
      'React',
      'exports',
      '$RefreshReg$',
      '$RefreshSig$',
      compiled,
    )(global, React, exportsObj, $RefreshReg$, $RefreshSig$);
    // Module systems will register exports as a fallback.
    // This is useful for cases when e.g. a class is exported,
    // and we don't want to propagate the update beyond this module.
    $RefreshReg$(exportsObj.default, 'exports.default');
    return exportsObj.default;
  }

  function render(source) {
    const Component = execute(source);
    act(() => {
      renderImplementation(<Component />);
    });
    // Module initialization shouldn't be counted as a hot update.
    expect(ReactFreshRuntime.performReactRefresh()).toBe(null);
  }

  function patch(source) {
    const prevExports = exportsObj;
    execute(source);
    const nextExports = exportsObj;

    // Check if exported families have changed.
    // (In a real module system we'd do this for *all* exports.)
    // For example, this can happen if you convert a class to a function.
    // Or if you wrap something in a HOC.
    const didExportsChange =
      ReactFreshRuntime.getFamilyByType(prevExports.default) !==
      ReactFreshRuntime.getFamilyByType(nextExports.default);
    if (didExportsChange) {
      // In a real module system, we would propagate such updates upwards,
      // and re-execute modules that imported this one. (Just like if we edited them.)
      // This makes adding/removing/renaming exports re-render references to them.
      // Here, we'll just force a re-render using the newer type to emulate this.
      const NextComponent = nextExports.default;
      act(() => {
        renderImplementation(<NextComponent />);
      });
    }
    act(() => {
      const result = ReactFreshRuntime.performReactRefresh();
      if (!didExportsChange) {
        // Normally we expect that some components got updated in our tests.
        expect(result).not.toBe(null);
      } else {
        // However, we have tests where we convert functions to classes,
        // and in those cases it's expected nothing would get updated.
        // (Instead, the export change branch above would take care of it.)
      }
    });
    expect(ReactFreshRuntime._getMountedRootCount()).toBe(1);
  }

  function $RefreshReg$(type, id) {
    ReactFreshRuntime.register(type, id);
  }

  function $RefreshSig$() {
    return ReactFreshRuntime.createSignatureFunctionForTransform();
  }

  // @reactVersion >= 16.9
  it('should not break the DevTools store', () => {
    render(`
      function Parent() {
        return <Child key="A" />;
      };

      function Child() {
        return <div />;
      };

      export default Parent;
    `);
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child key="A">
    `);

    let element = getContainer().firstChild;
    expect(getContainer().firstChild).not.toBe(null);

    patch(`
      function Parent() {
        return <Child key="A" />;
      };

      function Child() {
        return <div />;
      };

      export default Parent;
    `);
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child key="A">
    `);

    // State is preserved; this verifies that Fast Refresh is wired up.
    expect(getContainer().firstChild).toBe(element);
    element = getContainer().firstChild;

    patch(`
      function Parent() {
        return <Child key="B" />;
      };

      function Child() {
        return <div />;
      };

      export default Parent;
    `);
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child key="B">
    `);

    // State is reset because hooks changed.
    expect(getContainer().firstChild).not.toBe(element);
  });

  // @reactVersion < 18.0
  // @reactVersion >= 16.9
  it('should not break when there are warnings in between patching (before post commit hook)', () => {
    withErrorsOrWarningsIgnored(['Expected:'], () => {
      render(`
      const {useState} = React;

      export default function Component() {
        const [state, setState] = useState(1);
        console.warn("Expected: warning during render");
        return null;
      }
    `);
    });
    expect(store).toMatchInlineSnapshot(`
      ✕ 0, ⚠ 1
      [root]
          <Component> ⚠
    `);

    withErrorsOrWarningsIgnored(['Expected:'], () => {
      patch(`
      const {useEffect, useState} = React;

      export default function Component() {
        const [state, setState] = useState(1);
        console.warn("Expected: warning during render");
        return null;
      }
    `);
    });
    expect(store).toMatchInlineSnapshot(`
      ✕ 0, ⚠ 2
      [root]
          <Component> ⚠
    `);

    withErrorsOrWarningsIgnored(['Expected:'], () => {
      patch(`
      const {useEffect, useState} = React;

      export default function Component() {
        const [state, setState] = useState(1);
        useEffect(() => {
          console.error("Expected: error during effect");
        });
        console.warn("Expected: warning during render");
        return null;
      }
    `);
    });
    expect(store).toMatchInlineSnapshot(`
      ✕ 0, ⚠ 1
      [root]
          <Component> ⚠
    `);

    withErrorsOrWarningsIgnored(['Expected:'], () => {
      patch(`
      const {useEffect, useState} = React;

      export default function Component() {
        const [state, setState] = useState(1);
        console.warn("Expected: warning during render");
        return null;
      }
    `);
    });
    expect(store).toMatchInlineSnapshot(`
      ✕ 0, ⚠ 1
      [root]
          <Component> ⚠
    `);
  });

  // @reactVersion >= 18.0
  it('should not break when there are warnings in between patching (with post commit hook)', () => {
    withErrorsOrWarningsIgnored(['Expected:'], () => {
      render(`
      const {useState} = React;

      export default function Component() {
        const [state, setState] = useState(1);
        console.warn("Expected: warning during render");
        return null;
      }
    `);
    });
    expect(store).toMatchInlineSnapshot(`
      ✕ 0, ⚠ 1
      [root]
          <Component> ⚠
    `);

    withErrorsOrWarningsIgnored(['Expected:'], () => {
      patch(`
      const {useEffect, useState} = React;

      export default function Component() {
        const [state, setState] = useState(1);
        console.warn("Expected: warning during render");
        return null;
      }
    `);
    });
    expect(store).toMatchInlineSnapshot(`
      ✕ 0, ⚠ 2
      [root]
          <Component> ⚠
    `);

    withErrorsOrWarningsIgnored(['Expected:'], () => {
      patch(`
      const {useEffect, useState} = React;

      export default function Component() {
        const [state, setState] = useState(1);
        useEffect(() => {
          console.error("Expected: error during effect");
        });
        console.warn("Expected: warning during render");
        return null;
      }
    `);
    });
    expect(store).toMatchInlineSnapshot(`
      ✕ 1, ⚠ 1
      [root]
          <Component> ✕⚠
    `);

    withErrorsOrWarningsIgnored(['Expected:'], () => {
      patch(`
      const {useEffect, useState} = React;

      export default function Component() {
        const [state, setState] = useState(1);
        console.warn("Expected: warning during render");
        return null;
      }
    `);
    });
    expect(store).toMatchInlineSnapshot(`
      ✕ 0, ⚠ 1
      [root]
          <Component> ⚠
    `);
  });

  // TODO (bvaughn) Write a test that checks in between the steps of patch
});
