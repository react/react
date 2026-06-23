/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOM;
let ReactDOMClient;
let ReactFreshRuntime;
let Scheduler;
let act;
let createReactClass;
let waitFor;
let assertLog;

describe('ReactFresh', () => {
  let container;
  let root;

  beforeEach(() => {
    if (__DEV__) {
      jest.resetModules();
      React = require('react');
      ReactFreshRuntime = require('react-refresh/runtime');
      ReactFreshRuntime.injectIntoGlobalHook(global);
      ReactDOM = require('react-dom');
      ReactDOMClient = require('react-dom/client');
      Scheduler = require('scheduler');
      act = require('internal-test-utils').act;

      const InternalTestUtils = require('internal-test-utils');
      waitFor = InternalTestUtils.waitFor;
      assertLog = InternalTestUtils.assertLog;

      createReactClass = require('create-react-class/factory')(
        React.Component,
        React.isValidElement,
        new React.Component().updater,
      );
      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      document.body.appendChild(container);
    }
  });

  afterEach(() => {
    if (__DEV__) {
      delete global.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      document.body.removeChild(container);
    }
  });

  function prepare(version) {
    const Component = version();
    return Component;
  }

  async function render(version, props) {
    const Component = version();
    await act(() => {
      root.render(<Component {...props} />);
    });
    return Component;
  }

  async function patch(version) {
    const Component = version();
    await act(() => {
      ReactFreshRuntime.performReactRefresh();
    });
    return Component;
  }

  function patchSync(version) {
    const Component = version();
    ReactFreshRuntime.performReactRefresh();
    return Component;
  }

  function $RefreshReg$(type, id) {
    ReactFreshRuntime.register(type, id);
  }

  function $RefreshSig$(type, key, forceReset, getCustomHooks) {
    ReactFreshRuntime.setSignature(type, key, forceReset, getCustomHooks);
    return type;
  }

  // Note: This is based on a similar component we use in www. We can delete
  // once the extra div wrapper is no longer necessary.
  function LegacyHiddenDiv({children, mode}) {
    return (
      <div hidden={mode === 'hidden'}>
        <React.unstable_LegacyHidden
          mode={mode === 'hidden' ? 'unstable-defer-without-hiding' : mode}>
          {children}
        </React.unstable_LegacyHidden>
      </div>
    );
  }

  it('can preserve state for compatible types', async () => {
    if (__DEV__) {
      const HelloV1 = await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      const HelloV2 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Bump the state again.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Perform top-down renders with both fresh and stale types.
      // Neither should change the state or color.
      // They should always resolve to the latest version.
      await render(() => HelloV1);
      await render(() => HelloV2);
      await render(() => HelloV1);
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Bump the state again.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('3');
      expect(el.style.color).toBe('red');

      // Finally, a render with incompatible type should reset it.
      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        // No register call.
        // This is considered a new type.
        return Hello;
      });
      expect(container.firstChild).not.toBe(el);
      const newEl = container.firstChild;
      expect(newEl.textContent).toBe('0');
      expect(newEl.style.color).toBe('blue');
    }
  });

  it('can preserve state for forwardRef', async () => {
    if (__DEV__) {
      const OuterV1 = await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.forwardRef(() => <Hello />);
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      const OuterV2 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.forwardRef(() => <Hello />);
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Bump the state again.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Perform top-down renders with both fresh and stale types.
      // Neither should change the state or color.
      // They should always resolve to the latest version.
      await render(() => OuterV1);
      await render(() => OuterV2);
      await render(() => OuterV1);
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Finally, a render with incompatible type should reset it.
      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        // Note: no forwardRef wrapper this time.
        return Hello;
      });

      expect(container.firstChild).not.toBe(el);
      const newEl = container.firstChild;
      expect(newEl.textContent).toBe('0');
      expect(newEl.style.color).toBe('blue');
    }
  });

  it('should not consider two forwardRefs around the same type to be equivalent', async () => {
    if (__DEV__) {
      const ParentV1 = await render(
        () => {
          function Hello() {
            const [val, setVal] = React.useState(0);
            return (
              <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
                {val}
              </p>
            );
          }
          $RefreshReg$(Hello, 'Hello');

          function renderInner() {
            return <Hello />;
          }
          // Both of these are wrappers around the same inner function.
          // They should be treated as distinct types across reloads.
          const ForwardRefA = React.forwardRef(renderInner);
          $RefreshReg$(ForwardRefA, 'ForwardRefA');
          const ForwardRefB = React.forwardRef(renderInner);
          $RefreshReg$(ForwardRefB, 'ForwardRefB');

          function Parent({cond}) {
            return cond ? <ForwardRefA /> : <ForwardRefB />;
          }
          $RefreshReg$(Parent, 'Parent');

          return Parent;
        },
        {cond: true},
      );

      // Bump the state before switching up types.
      let el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Switching up the inner types should reset the state.
      await render(() => ParentV1, {cond: false});
      expect(el).not.toBe(container.firstChild);
      el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');

      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Switch them up back again.
      await render(() => ParentV1, {cond: true});
      expect(el).not.toBe(container.firstChild);
      el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');

      // Now bump up the state to prepare for patching.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Patch to change the color.
      const ParentV2 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        function renderInner() {
          return <Hello />;
        }
        // Both of these are wrappers around the same inner function.
        // They should be treated as distinct types across reloads.
        const ForwardRefA = React.forwardRef(renderInner);
        $RefreshReg$(ForwardRefA, 'ForwardRefA');
        const ForwardRefB = React.forwardRef(renderInner);
        $RefreshReg$(ForwardRefB, 'ForwardRefB');

        function Parent({cond}) {
          return cond ? <ForwardRefA /> : <ForwardRefB />;
        }
        $RefreshReg$(Parent, 'Parent');

        return Parent;
      });

      // The state should be intact; the color should change.
      expect(el).toBe(container.firstChild);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Switching up the condition should still reset the state.
      await render(() => ParentV2, {cond: false});
      expect(el).not.toBe(container.firstChild);
      el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('red');

      // Now bump up the state to prepare for top-level renders.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el).toBe(container.firstChild);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Finally, verify using top-level render with stale type keeps state.
      await render(() => ParentV1);
      await render(() => ParentV2);
      await render(() => ParentV1);
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');
    }
  });

  it('can update forwardRef render function with its wrapper', async () => {
    if (__DEV__) {
      await render(() => {
        function Hello({color}) {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.forwardRef(() => <Hello color="blue" />);
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      await patch(() => {
        function Hello({color}) {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.forwardRef(() => <Hello color="red" />);
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');
    }
  });

  it('can update forwardRef render function in isolation', async () => {
    if (__DEV__) {
      await render(() => {
        function Hello({color}) {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        function renderHello() {
          return <Hello color="blue" />;
        }
        $RefreshReg$(renderHello, 'renderHello');

        return React.forwardRef(renderHello);
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update of just the rendering function.
      await patch(() => {
        function Hello({color}) {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        function renderHello() {
          return <Hello color="red" />;
        }
        $RefreshReg$(renderHello, 'renderHello');

        // Not updating the wrapper.
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');
    }
  });

  it('can preserve state for simple memo', async () => {
    if (__DEV__) {
      const OuterV1 = await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.memo(Hello);
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      const OuterV2 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.memo(Hello);
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Bump the state again.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Perform top-down renders with both fresh and stale types.
      // Neither should change the state or color.
      // They should always resolve to the latest version.
      await render(() => OuterV1);
      await render(() => OuterV2);
      await render(() => OuterV1);
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Finally, a render with incompatible type should reset it.
      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        // Note: no wrapper this time.
        return Hello;
      });

      expect(container.firstChild).not.toBe(el);
      const newEl = container.firstChild;
      expect(newEl.textContent).toBe('0');
      expect(newEl.style.color).toBe('blue');
    }
  });

  it('can preserve state for memo with custom comparison', async () => {
    if (__DEV__) {
      const OuterV1 = await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }

        const Outer = React.memo(Hello, () => true);
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      const OuterV2 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }

        const Outer = React.memo(Hello, () => true);
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Bump the state again.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Perform top-down renders with both fresh and stale types.
      // Neither should change the state or color.
      // They should always resolve to the latest version.
      await render(() => OuterV1);
      await render(() => OuterV2);
      await render(() => OuterV1);
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Finally, a render with incompatible type should reset it.
      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        // Note: no wrapper this time.
        return Hello;
      });

      expect(container.firstChild).not.toBe(el);
      const newEl = container.firstChild;
      expect(newEl.textContent).toBe('0');
      expect(newEl.style.color).toBe('blue');
    }
  });

  it('can update simple memo function in isolation', async () => {
    if (__DEV__) {
      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        return React.memo(Hello);
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update of just the rendering function.
      await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        // Not updating the wrapper.
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');
    }
  });

  it('can preserve state for memo(forwardRef)', async () => {
    if (__DEV__) {
      const OuterV1 = await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.memo(React.forwardRef(() => <Hello />));
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      const OuterV2 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.memo(React.forwardRef(() => <Hello />));
        $RefreshReg$(Outer, 'Outer');
        return Outer;
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Bump the state again.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Perform top-down renders with both fresh and stale types.
      // Neither should change the state or color.
      // They should always resolve to the latest version.
      await render(() => OuterV1);
      await render(() => OuterV2);
      await render(() => OuterV1);
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Finally, a render with incompatible type should reset it.
      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        // Note: no wrapper this time.
        return Hello;
      });

      expect(container.firstChild).not.toBe(el);
      const newEl = container.firstChild;
      expect(newEl.textContent).toBe('0');
      expect(newEl.style.color).toBe('blue');
    }
  });

  it('can preserve state for lazy after resolution', async () => {
    if (__DEV__) {
      let resolve;
      const AppV1 = await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.lazy(
          () =>
            new Promise(_resolve => {
              resolve = () => _resolve({default: Hello});
            }),
        );
        $RefreshReg$(Outer, 'Outer');

        function App() {
          return (
            <React.Suspense fallback={<p>Loading</p>}>
              <Outer />
            </React.Suspense>
          );
        }
        $RefreshReg$(App, 'App');

        return App;
      });

      expect(container.textContent).toBe('Loading');
      await act(() => {
        resolve();
      });
      expect(container.textContent).toBe('0');

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      const AppV2 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.lazy(
          () =>
            new Promise(_resolve => {
              resolve = () => _resolve({default: Hello});
            }),
        );
        $RefreshReg$(Outer, 'Outer');

        function App() {
          return (
            <React.Suspense fallback={<p>Loading</p>}>
              <Outer />
            </React.Suspense>
          );
        }
        $RefreshReg$(App, 'App');

        return App;
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Bump the state again.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Perform top-down renders with both fresh and stale types.
      // Neither should change the state or color.
      // They should always resolve to the latest version.
      await render(() => AppV1);
      await render(() => AppV2);
      await render(() => AppV1);
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('2');
      expect(el.style.color).toBe('red');

      // Finally, a render with incompatible type should reset it.
      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        // Note: no lazy wrapper this time.

        function App() {
          return (
            <React.Suspense fallback={<p>Loading</p>}>
              <Hello />
            </React.Suspense>
          );
        }
        $RefreshReg$(App, 'App');

        return App;
      });

      expect(container.firstChild).not.toBe(el);
      const newEl = container.firstChild;
      expect(newEl.textContent).toBe('0');
      expect(newEl.style.color).toBe('blue');
    }
  });

  it('can patch lazy before resolution', async () => {
    if (__DEV__) {
      let resolve;
      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.lazy(
          () =>
            new Promise(_resolve => {
              resolve = () => _resolve({default: Hello});
            }),
        );
        $RefreshReg$(Outer, 'Outer');

        function App() {
          return (
            <React.Suspense fallback={<p>Loading</p>}>
              <Outer />
            </React.Suspense>
          );
        }

        return App;
      });

      expect(container.textContent).toBe('Loading');

      // Perform a hot update.
      await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
      });

      await act(() => {
        resolve();
      });

      // Expect different color on initial mount.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('red');

      // Bump state.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Test another reload.
      await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('orange');
    }
  });

  it('can patch lazy(forwardRef) before resolution', async () => {
    if (__DEV__) {
      let resolve;
      await render(() => {
        function renderHello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        const Hello = React.forwardRef(renderHello);
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.lazy(
          () =>
            new Promise(_resolve => {
              resolve = () => _resolve({default: Hello});
            }),
        );
        $RefreshReg$(Outer, 'Outer');

        function App() {
          return (
            <React.Suspense fallback={<p>Loading</p>}>
              <Outer />
            </React.Suspense>
          );
        }

        return App;
      });

      expect(container.textContent).toBe('Loading');

      // Perform a hot update.
      await patch(() => {
        function renderHello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        const Hello = React.forwardRef(renderHello);
        $RefreshReg$(Hello, 'Hello');
      });

      await act(() => {
        resolve();
      });

      // Expect different color on initial mount.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('red');

      // Bump state.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Test another reload.
      await patch(() => {
        function renderHello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        const Hello = React.forwardRef(renderHello);
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('orange');
    }
  });

  it('can patch lazy(memo) before resolution', async () => {
    if (__DEV__) {
      let resolve;
      await render(() => {
        function renderHello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        const Hello = React.memo(renderHello);
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.lazy(
          () =>
            new Promise(_resolve => {
              resolve = () => _resolve({default: Hello});
            }),
        );
        $RefreshReg$(Outer, 'Outer');

        function App() {
          return (
            <React.Suspense fallback={<p>Loading</p>}>
              <Outer />
            </React.Suspense>
          );
        }

        return App;
      });

      expect(container.textContent).toBe('Loading');

      // Perform a hot update.
      await patch(() => {
        function renderHello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        const Hello = React.memo(renderHello);
        $RefreshReg$(Hello, 'Hello');
      });

      await act(() => {
        resolve();
      });

      // Expect different color on initial mount.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('red');

      // Bump state.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Test another reload.
      await patch(() => {
        function renderHello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        const Hello = React.memo(renderHello);
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('orange');
    }
  });

  it('can patch lazy(memo(forwardRef)) before resolution', async () => {
    if (__DEV__) {
      let resolve;
      await render(() => {
        function renderHello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        const Hello = React.memo(React.forwardRef(renderHello));
        $RefreshReg$(Hello, 'Hello');

        const Outer = React.lazy(
          () =>
            new Promise(_resolve => {
              resolve = () => _resolve({default: Hello});
            }),
        );
        $RefreshReg$(Outer, 'Outer');

        function App() {
          return (
            <React.Suspense fallback={<p>Loading</p>}>
              <Outer />
            </React.Suspense>
          );
        }

        return App;
      });

      expect(container.textContent).toBe('Loading');

      // Perform a hot update.
      await patch(() => {
        function renderHello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        const Hello = React.memo(React.forwardRef(renderHello));
        $RefreshReg$(Hello, 'Hello');
      });

      await act(() => {
        resolve();
      });

      // Expect different color on initial mount.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('red');

      // Bump state.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Test another reload.
      await patch(() => {
        function renderHello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        const Hello = React.memo(React.forwardRef(renderHello));
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('orange');
    }
  });

  it('only patches the fallback tree while suspended', async () => {
    if (__DEV__) {
      const AppV1 = await render(
        () => {
          function Hello({children}) {
            const [val, setVal] = React.useState(0);
            return (
              <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
                {children} {val}
              </p>
            );
          }
          $RefreshReg$(Hello, 'Hello');

          function Never() {
            throw new Promise(resolve => {});
          }

          function App({shouldSuspend}) {
            return (
              <React.Suspense fallback={<Hello>Fallback</Hello>}>
                <Hello>Content</Hello>
                {shouldSuspend && <Never />}
              </React.Suspense>
            );
          }

          return App;
        },
        {shouldSuspend: false},
      );

      // We start with just the primary tree.
      expect(container.childNodes.length).toBe(1);
      const primaryChild = container.firstChild;
      expect(primaryChild.textContent).toBe('Content 0');
      expect(primaryChild.style.color).toBe('blue');
      expect(primaryChild.style.display).toBe('');

      // Bump primary content state.
      await act(() => {
        primaryChild.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.childNodes.length).toBe(1);
      expect(container.childNodes[0]).toBe(primaryChild);
      expect(primaryChild.textContent).toBe('Content 1');
      expect(primaryChild.style.color).toBe('blue');
      expect(primaryChild.style.display).toBe('');

      // Perform a hot update.
      await patch(() => {
        function Hello({children}) {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'green'}} onClick={() => setVal(val + 1)}>
              {children} {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.childNodes.length).toBe(1);
      expect(container.childNodes[0]).toBe(primaryChild);
      expect(primaryChild.textContent).toBe('Content 1');
      expect(primaryChild.style.color).toBe('green');
      expect(primaryChild.style.display).toBe('');

      // Now force the tree to suspend.
      await render(() => AppV1, {shouldSuspend: true});

      // Expect to see two trees, one of them is hidden.
      expect(container.childNodes.length).toBe(2);
      expect(container.childNodes[0]).toBe(primaryChild);
      const fallbackChild = container.childNodes[1];
      expect(primaryChild.textContent).toBe('Content 1');
      expect(primaryChild.style.color).toBe('green');
      expect(primaryChild.style.display).toBe('none');
      expect(fallbackChild.textContent).toBe('Fallback 0');
      expect(fallbackChild.style.color).toBe('green');
      expect(fallbackChild.style.display).toBe('');

      // Bump fallback state.
      await act(() => {
        fallbackChild.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(container.childNodes.length).toBe(2);
      expect(container.childNodes[0]).toBe(primaryChild);
      expect(container.childNodes[1]).toBe(fallbackChild);
      expect(primaryChild.textContent).toBe('Content 1');
      expect(primaryChild.style.color).toBe('green');
      expect(primaryChild.style.display).toBe('none');
      expect(fallbackChild.textContent).toBe('Fallback 1');
      expect(fallbackChild.style.color).toBe('green');
      expect(fallbackChild.style.display).toBe('');

      // Perform a hot update.
      await patch(() => {
        function Hello({children}) {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {children} {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
      });

      // Only update color in the visible child
      expect(container.childNodes.length).toBe(2);
      expect(container.childNodes[0]).toBe(primaryChild);
      expect(container.childNodes[1]).toBe(fallbackChild);
      expect(primaryChild.textContent).toBe('Content 1');
      expect(primaryChild.style.color).toBe('green');
      expect(primaryChild.style.display).toBe('none');
      expect(fallbackChild.textContent).toBe('Fallback 1');
      expect(fallbackChild.style.color).toBe('red');
      expect(fallbackChild.style.display).toBe('');

      // Only primary tree should exist now:
      await render(() => AppV1, {shouldSuspend: false});
      expect(container.childNodes.length).toBe(1);
      expect(container.childNodes[0]).toBe(primaryChild);
      expect(primaryChild.textContent).toBe('Content 1');
      expect(primaryChild.style.color).toBe('red');
      expect(primaryChild.style.display).toBe('');

      // Perform a hot update.
      await patch(() => {
        function Hello({children}) {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
              {children} {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.childNodes.length).toBe(1);
      expect(container.childNodes[0]).toBe(primaryChild);
      expect(primaryChild.textContent).toBe('Content 1');
      expect(primaryChild.style.color).toBe('orange');
      expect(primaryChild.style.display).toBe('');
    }
  });

  it('does not re-render ancestor components unnecessarily during a hot update', async () => {
    if (__DEV__) {
      let appRenders = 0;

      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        function App() {
          appRenders++;
          return <Hello />;
        }
        $RefreshReg$(App, 'App');
        return App;
      });

      expect(appRenders).toBe(1);

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // No re-renders from the top.
      expect(appRenders).toBe(1);

      // Perform a hot update for Hello only.
      await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Still no re-renders from the top.
      expect(appRenders).toBe(1);

      // Bump the state.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('2');

      // Still no re-renders from the top.
      expect(appRenders).toBe(1);
    }
  });

  it('batches re-renders during a hot update', async () => {
    if (__DEV__) {
      let helloRenders = 0;

      await render(() => {
        function Hello({children}) {
          helloRenders++;
          return <div>X{children}X</div>;
        }
        $RefreshReg$(Hello, 'Hello');

        function App() {
          return (
            <Hello>
              <Hello>
                <Hello />
              </Hello>
              <Hello>
                <Hello />
              </Hello>
            </Hello>
          );
        }
        return App;
      });
      expect(helloRenders).toBe(5);
      expect(container.textContent).toBe('XXXXXXXXXX');
      helloRenders = 0;

      await patch(() => {
        function Hello({children}) {
          helloRenders++;
          return <div>O{children}O</div>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(helloRenders).toBe(5);
      expect(container.textContent).toBe('OOOOOOOOOO');
    }
  });

  it('does not leak state between components', async () => {
    if (__DEV__) {
      const AppV1 = await render(
        () => {
          function Hello1() {
            const [val, setVal] = React.useState(0);
            return (
              <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
                {val}
              </p>
            );
          }
          $RefreshReg$(Hello1, 'Hello1');
          function Hello2() {
            const [val, setVal] = React.useState(0);
            return (
              <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
                {val}
              </p>
            );
          }
          $RefreshReg$(Hello2, 'Hello2');
          function App({cond}) {
            return cond ? <Hello1 /> : <Hello2 />;
          }
          $RefreshReg$(App, 'App');
          return App;
        },
        {cond: false},
      );

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Switch the condition, flipping inner content.
      // This should reset the state.
      await render(() => AppV1, {cond: true});
      const el2 = container.firstChild;
      expect(el2).not.toBe(el);
      expect(el2.textContent).toBe('0');
      expect(el2.style.color).toBe('blue');

      // Bump it again.
      await act(() => {
        el2.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el2.textContent).toBe('1');

      // Perform a hot update for both inner components.
      await patch(() => {
        function Hello1() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello1, 'Hello1');
        function Hello2() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello2, 'Hello2');
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el2);
      expect(el2.textContent).toBe('1');
      expect(el2.style.color).toBe('red');

      // Flip the condition again.
      await render(() => AppV1, {cond: false});
      const el3 = container.firstChild;
      expect(el3).not.toBe(el2);
      expect(el3.textContent).toBe('0');
      expect(el3.style.color).toBe('red');
    }
  });

  it('can force remount by changing signature', async () => {
    if (__DEV__) {
      const HelloV1 = await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        // When this changes, we'll expect a remount:
        $RefreshSig$(Hello, '1');
        return Hello;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      const HelloV2 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        // The signature hasn't changed since the last time:
        $RefreshSig$(Hello, '1');
        return Hello;
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');

      // Perform a hot update.
      const HelloV3 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'yellow'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        // We're changing the signature now so it will remount:
        $RefreshReg$(Hello, 'Hello');
        $RefreshSig$(Hello, '2');
        return Hello;
      });

      // Expect a remount.
      expect(container.firstChild).not.toBe(el);
      const newEl = container.firstChild;
      expect(newEl.textContent).toBe('0');
      expect(newEl.style.color).toBe('yellow');

      // Bump state again.
      await act(() => {
        newEl.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(newEl.textContent).toBe('1');
      expect(newEl.style.color).toBe('yellow');

      // Perform top-down renders with both fresh and stale types.
      // Neither should change the state or color.
      // They should always resolve to the latest version.
      await render(() => HelloV1);
      await render(() => HelloV2);
      await render(() => HelloV3);
      await render(() => HelloV2);
      await render(() => HelloV1);
      expect(container.firstChild).toBe(newEl);
      expect(newEl.textContent).toBe('1');
      expect(newEl.style.color).toBe('yellow');

      // Verify we can patch again while preserving the signature.
      await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'purple'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        // Same signature as last time.
        $RefreshReg$(Hello, 'Hello');
        $RefreshSig$(Hello, '2');
        return Hello;
      });

      expect(container.firstChild).toBe(newEl);
      expect(newEl.textContent).toBe('1');
      expect(newEl.style.color).toBe('purple');

      // Check removing the signature also causes a remount.
      await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        // No signature this time.
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // Expect a remount.
      expect(container.firstChild).not.toBe(newEl);
      const finalEl = container.firstChild;
      expect(finalEl.textContent).toBe('0');
      expect(finalEl.style.color).toBe('orange');
    }
  });

  it('keeps a valid tree when forcing remount', async () => {
    if (__DEV__) {
      const HelloV1 = prepare(() => {
        function Hello() {
          return null;
        }
        $RefreshReg$(Hello, 'Hello');
        $RefreshSig$(Hello, '1');
        return Hello;
      });

      const Bailout = React.memo(({children}) => {
        return children;
      });

      // Each of those renders three instances of HelloV1,
      // but in different ways.
      const trees = [
        <div>
          <HelloV1 />
          <div>
            <HelloV1 />
            <Bailout>
              <HelloV1 />
            </Bailout>
          </div>
        </div>,
        <div>
          <div>
            <HelloV1>
              <HelloV1 />
            </HelloV1>
            <HelloV1 />
          </div>
        </div>,
        <div>
          <span />
          <HelloV1 />
          <HelloV1 />
          <HelloV1 />
        </div>,
        <div>
          <HelloV1 />
          <span />
          <HelloV1 />
          <HelloV1 />
        </div>,
        <div>
          <div>foo</div>
          <HelloV1 />
          <div>
            <HelloV1 />
          </div>
          <HelloV1 />
          <span />
        </div>,
        <div>
          <HelloV1>
            <span />
            Hello
            <span />
          </HelloV1>
          ,
          <HelloV1>
            <>
              <HelloV1 />
            </>
          </HelloV1>
          ,
        </div>,
        <HelloV1>
          <HelloV1>
            <Bailout>
              <span />
              <HelloV1>
                <span />
              </HelloV1>
              <span />
            </Bailout>
          </HelloV1>
        </HelloV1>,
        <div>
          <span />
          <HelloV1 key="0" />
          <HelloV1 key="1" />
          <HelloV1 key="2" />
          <span />
        </div>,
        <div>
          <span />
          {null}
          <HelloV1 key="1" />
          {null}
          <HelloV1 />
          <HelloV1 />
          <span />
        </div>,
        <div>
          <HelloV1 key="2" />
          <span />
          <HelloV1 key="0" />
          <span />
          <HelloV1 key="1" />
        </div>,
        <div>
          {[[<HelloV1 key="2" />]]}
          <span>
            <HelloV1 key="0" />
            {[null]}
            <HelloV1 key="1" />
          </span>
        </div>,
        <div>
          {['foo', <HelloV1 key="hi" />, null, <HelloV1 key="2" />]}
          <span>
            {[null]}
            <HelloV1 key="x" />
          </span>
        </div>,
        <HelloV1>
          <HelloV1>
            <span />
            <Bailout>
              <HelloV1>hi</HelloV1>
              <span />
            </Bailout>
          </HelloV1>
        </HelloV1>,
      ];

      await act(() => {
        root.render(null);
      });

      for (let i = 0; i < trees.length; i++) {
        await runRemountingStressTest(trees[i]);
      }

      // Then check that each tree is resilient to updates from another tree.
      for (let i = 0; i < trees.length; i++) {
        for (let j = 0; j < trees.length; j++) {
          await act(() => {
            root.render(null);
          });

          // Intentionally don't clean up between the tests:
          await runRemountingStressTest(trees[i]);
          await runRemountingStressTest(trees[j]);
          await runRemountingStressTest(trees[i]);
        }
      }
    }
  }, 10000);

  async function runRemountingStressTest(tree) {
    await patch(() => {
      function Hello({children}) {
        return <section data-color="blue">{children}</section>;
      }
      $RefreshReg$(Hello, 'Hello');
      $RefreshSig$(Hello, '1');
      return Hello;
    });

    await act(() => {
      root.render(tree);
    });

    const elements = container.querySelectorAll('section');
    // Each tree above produces exactly three <section> elements:
    expect(elements.length).toBe(3);
    elements.forEach(el => {
      expect(el.dataset.color).toBe('blue');
    });

    // Patch color without changing the signature.
    await patch(() => {
      function Hello({children}) {
        return <section data-color="red">{children}</section>;
      }
      $RefreshReg$(Hello, 'Hello');
      $RefreshSig$(Hello, '1');
      return Hello;
    });

    const elementsAfterPatch = container.querySelectorAll('section');
    expect(elementsAfterPatch.length).toBe(3);
    elementsAfterPatch.forEach((el, index) => {
      // The signature hasn't changed so we expect DOM nodes to stay the same.
      expect(el).toBe(elements[index]);
      // However, the color should have changed:
      expect(el.dataset.color).toBe('red');
    });

    // Patch color *and* change the signature.
    await patch(() => {
      function Hello({children}) {
        return <section data-color="orange">{children}</section>;
      }
      $RefreshReg$(Hello, 'Hello');
      $RefreshSig$(Hello, '2'); // Remount
      return Hello;
    });

    const elementsAfterRemount = container.querySelectorAll('section');
    expect(elementsAfterRemount.length).toBe(3);
    elementsAfterRemount.forEach((el, index) => {
      // The signature changed so we expect DOM nodes to be different.
      expect(el).not.toBe(elements[index]);
      // They should all be using the new color:
      expect(el.dataset.color).toBe('orange');
    });

    // Now patch color but *don't* change the signature.
    await patch(() => {
      function Hello({children}) {
        return <section data-color="black">{children}</section>;
      }
      $RefreshReg$(Hello, 'Hello');
      $RefreshSig$(Hello, '2'); // Same signature as before
      return Hello;
    });

    expect(container.querySelectorAll('section').length).toBe(3);
    container.querySelectorAll('section').forEach((el, index) => {
      // The signature didn't change so DOM nodes should stay the same.
      expect(el).toBe(elementsAfterRemount[index]);
      // They should all be using the new color:
      expect(el.dataset.color).toBe('black');
    });

    await act(() => {
      root.render(tree);
    });

    expect(container.querySelectorAll('section').length).toBe(3);
    container.querySelectorAll('section').forEach((el, index) => {
      expect(el).toBe(elementsAfterRemount[index]);
      expect(el.dataset.color).toBe('black');
    });
  }

  it('can remount on signature change within a <root> wrapper', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => Hello);
    }
  });

  it('can remount on signature change within a simple memo wrapper', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => React.memo(Hello));
    }
  });

  it('can remount on signature change within a lazy simple memo wrapper', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello =>
        React.lazy(() => ({
          then(cb) {
            cb({default: React.memo(Hello)});
          },
        })),
      );
    }
  });

  it('can remount on signature change within forwardRef', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => React.forwardRef(Hello));
    }
  });

  it('can remount on signature change within forwardRef render function', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello =>
        React.forwardRef(() => <Hello />),
      );
    }
  });

  it('can remount on signature change within nested memo', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello =>
        React.memo(React.memo(React.memo(Hello))),
      );
    }
  });

  it('can remount on signature change within a memo wrapper and custom comparison', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => React.memo(Hello, () => true));
    }
  });

  it('can remount on signature change within a class', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => {
        const child = <Hello />;
        return class Wrapper extends React.PureComponent {
          render() {
            return child;
          }
        };
      });
    }
  });

  it('can remount on signature change within a context provider', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => {
        const Context = React.createContext();
        const child = (
          <Context.Provider value="constant">
            <Hello />
          </Context.Provider>
        );
        return function Wrapper() {
          return child;
        };
      });
    }
  });

  it('can remount on signature change within a context consumer', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => {
        const Context = React.createContext();
        const child = <Context.Consumer>{() => <Hello />}</Context.Consumer>;
        return function Wrapper() {
          return child;
        };
      });
    }
  });

  it('can remount on signature change within a suspense node', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => {
        // TODO: we'll probably want to test fallback trees too.
        const child = (
          <React.Suspense>
            <Hello />
          </React.Suspense>
        );
        return function Wrapper() {
          return child;
        };
      });
    }
  });

  it('can remount on signature change within a mode node', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => {
        const child = (
          <React.StrictMode>
            <Hello />
          </React.StrictMode>
        );
        return function Wrapper() {
          return child;
        };
      });
    }
  });

  it('can remount on signature change within a fragment node', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => {
        const child = (
          <>
            <Hello />
          </>
        );
        return function Wrapper() {
          return child;
        };
      });
    }
  });

  it('can remount on signature change within multiple siblings', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => {
        const child = (
          <>
            <>
              <React.Fragment />
            </>
            <Hello />
            <React.Fragment />
          </>
        );
        return function Wrapper() {
          return child;
        };
      });
    }
  });

  it('can remount on signature change within a profiler node', async () => {
    if (__DEV__) {
      await testRemountingWithWrapper(Hello => {
        const child = <Hello />;
        return function Wrapper() {
          return (
            <React.Profiler onRender={() => {}} id="foo">
              {child}
            </React.Profiler>
          );
        };
      });
    }
  });

  async function testRemountingWithWrapper(wrap) {
    await render(() => {
      function Hello() {
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      }
      $RefreshReg$(Hello, 'Hello');
      // When this changes, we'll expect a remount:
      $RefreshSig$(Hello, '1');

      // Use the passed wrapper.
      // This will be different in every test.
      return wrap(Hello);
    });

    // Bump the state before patching.
    const el = container.firstChild;
    expect(el.textContent).toBe('0');
    expect(el.style.color).toBe('blue');
    await act(() => {
      el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
    expect(el.textContent).toBe('1');

    // Perform a hot update that doesn't remount.
    await patch(() => {
      function Hello() {
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      }
      $RefreshReg$(Hello, 'Hello');
      // The signature hasn't changed since the last time:
      $RefreshSig$(Hello, '1');
      return Hello;
    });

    // Assert the state was preserved but color changed.
    expect(container.firstChild).toBe(el);
    expect(el.textContent).toBe('1');
    expect(el.style.color).toBe('red');

    // Perform a hot update that remounts.
    await patch(() => {
      function Hello() {
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'yellow'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      }
      // We're changing the signature now so it will remount:
      $RefreshReg$(Hello, 'Hello');
      $RefreshSig$(Hello, '2');
      return Hello;
    });

    // Expect a remount.
    expect(container.firstChild).not.toBe(el);
    const newEl = container.firstChild;
    expect(newEl.textContent).toBe('0');
    expect(newEl.style.color).toBe('yellow');

    // Bump state again.
    await act(() => {
      newEl.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
    expect(newEl.textContent).toBe('1');
    expect(newEl.style.color).toBe('yellow');

    // Verify we can patch again while preserving the signature.
    await patch(() => {
      function Hello() {
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'purple'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      }
      // Same signature as last time.
      $RefreshReg$(Hello, 'Hello');
      $RefreshSig$(Hello, '2');
      return Hello;
    });

    expect(container.firstChild).toBe(newEl);
    expect(newEl.textContent).toBe('1');
    expect(newEl.style.color).toBe('purple');

    // Check removing the signature also causes a remount.
    await patch(() => {
      function Hello() {
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      }
      // No signature this time.
      $RefreshReg$(Hello, 'Hello');
      return Hello;
    });

    // Expect a remount.
    expect(container.firstChild).not.toBe(newEl);
    const finalEl = container.firstChild;
    expect(finalEl.textContent).toBe('0');
    expect(finalEl.style.color).toBe('orange');
  }

  it('double invokes effects after a forced remount in StrictMode', async () => {
    if (__DEV__) {
      const log = [];

      const createAppV1 = () => {
        function Hello() {
          React.useEffect(() => {
            log.push('mount v1');
            return () => log.push('unmount v1');
          }, []);
          return <p style={{color: 'blue'}}>Hello</p>;
        }
        $RefreshReg$(Hello, 'Hello');
        $RefreshSig$(Hello, '1');

        return Hello;
      };

      const App = createAppV1();

      await act(() => {
        root.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual(['mount v1', 'unmount v1', 'mount v1']);
      log.length = 0;

      await patch(() => {
        function Hello() {
          React.useEffect(() => {
            log.push('mount v2');
            return () => log.push('unmount v2');
          }, []);
          return <p style={{color: 'red'}}>Hello</p>;
        }
        $RefreshReg$(Hello, 'Hello');
        $RefreshSig$(Hello, '2');
        return null;
      });

      expect(container.firstChild.style.color).toBe('red');
      expect(log).toEqual(['unmount v1', 'mount v2', 'unmount v2', 'mount v2']);
    }
  });

  it('double invokes an effect added during Fast Refresh remount in StrictMode', async () => {
    if (__DEV__) {
      const log = [];

      const createAppV1 = () => {
        function Hello() {
          return <p style={{color: 'blue'}}>Hello</p>;
        }
        $RefreshReg$(Hello, 'Hello');
        $RefreshSig$(Hello, '1');
        return Hello;
      };

      const App = createAppV1();

      await act(() => {
        root.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([]);

      await patch(() => {
        function Hello() {
          React.useEffect(() => {
            log.push('mount v2');
            return () => log.push('unmount v2');
          }, []);
          return <p style={{color: 'red'}}>Hello</p>;
        }
        $RefreshReg$(Hello, 'Hello');
        $RefreshSig$(Hello, '2');
        return null;
      });

      expect(container.firstChild.style.color).toBe('red');
      expect(log).toEqual(['mount v2', 'unmount v2', 'mount v2']);
    }
  });

  it('resets hooks with dependencies on hot reload', async () => {
    if (__DEV__) {
      let useEffectWithEmptyArrayCalls = 0;

      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          const tranformed = React.useMemo(() => val * 2, [val]);
          const handleClick = React.useCallback(() => setVal(v => v + 1), []);

          React.useEffect(() => {
            useEffectWithEmptyArrayCalls++;
          }, []);

          return (
            <p style={{color: 'blue'}} onClick={handleClick}>
              {tranformed}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      expect(useEffectWithEmptyArrayCalls).toBe(1); // useEffect ran
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('2'); // val * 2
      expect(useEffectWithEmptyArrayCalls).toBe(1); // useEffect didn't re-run

      // Perform a hot update.
      await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          const tranformed = React.useMemo(() => val * 10, [val]);
          const handleClick = React.useCallback(() => setVal(v => v - 1), []);

          React.useEffect(() => {
            useEffectWithEmptyArrayCalls++;
          }, []);

          return (
            <p style={{color: 'red'}} onClick={handleClick}>
              {tranformed}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // Assert the state was preserved but memo was evicted.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('10'); // val * 10
      expect(el.style.color).toBe('red');
      expect(useEffectWithEmptyArrayCalls).toBe(2); // useEffect re-ran

      // This should fire the new callback which decreases the counter.
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('red');
      expect(useEffectWithEmptyArrayCalls).toBe(2); // useEffect didn't re-run
    }
  });

  // This pattern is inspired by useSubscription and similar mechanisms.
  it('does not get into infinite loops during render phase updates', async () => {
    if (__DEV__) {
      await render(() => {
        function Hello() {
          const source = React.useMemo(() => ({value: 10}), []);
          const [state, setState] = React.useState({value: null});
          if (state !== source) {
            setState(source);
          }
          return <p style={{color: 'blue'}}>{state.value}</p>;
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      const el = container.firstChild;
      expect(el.textContent).toBe('10');
      expect(el.style.color).toBe('blue');

      // Perform a hot update.
      await patch(() => {
        function Hello() {
          const source = React.useMemo(() => ({value: 20}), []);
          const [state, setState] = React.useState({value: null});
          if (state !== source) {
            // This should perform a single render-phase update.
            setState(source);
          }
          return <p style={{color: 'red'}}>{state.value}</p>;
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('20');
      expect(el.style.color).toBe('red');
    }
  });

  // @gate enableLegacyHidden && __DEV__
  it('can hot reload offscreen components', async () => {
    const AppV1 = prepare(() => {
      function Hello() {
        React.useLayoutEffect(() => {
          Scheduler.log('Hello#layout');
        });
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      }
      $RefreshReg$(Hello, 'Hello');

      return function App({offscreen}) {
        React.useLayoutEffect(() => {
          Scheduler.log('App#layout');
        });
        return (
          <LegacyHiddenDiv mode={offscreen ? 'hidden' : 'visible'}>
            <Hello />
          </LegacyHiddenDiv>
        );
      };
    });

    root.render(<AppV1 offscreen={true} />);
    await waitFor(['App#layout']);
    const el = container.firstChild;
    expect(el.hidden).toBe(true);
    expect(el.firstChild).toBe(null); // Offscreen content not flushed yet.

    // Perform a hot update.
    patchSync(() => {
      function Hello() {
        React.useLayoutEffect(() => {
          Scheduler.log('Hello#layout');
        });
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      }
      $RefreshReg$(Hello, 'Hello');
    });

    // It's still offscreen so we don't see anything.
    expect(container.firstChild).toBe(el);
    expect(el.hidden).toBe(true);
    expect(el.firstChild).toBe(null);

    // Process the offscreen updates.
    await waitFor(['Hello#layout']);
    expect(container.firstChild).toBe(el);
    expect(el.firstChild.textContent).toBe('0');
    expect(el.firstChild.style.color).toBe('red');

    await act(() => {
      el.firstChild.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
        }),
      );
    });

    assertLog(['Hello#layout']);
    expect(el.firstChild.textContent).toBe('1');
    expect(el.firstChild.style.color).toBe('red');

    // Hot reload while we're offscreen.
    patchSync(() => {
      function Hello() {
        React.useLayoutEffect(() => {
          Scheduler.log('Hello#layout');
        });
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      }
      $RefreshReg$(Hello, 'Hello');
    });

    // It's still offscreen so we don't see the updates.
    expect(container.firstChild).toBe(el);
    expect(el.firstChild.textContent).toBe('1');
    expect(el.firstChild.style.color).toBe('red');

    // Process the offscreen updates.
    await waitFor(['Hello#layout']);
    expect(container.firstChild).toBe(el);
    expect(el.firstChild.textContent).toBe('1');
    expect(el.firstChild.style.color).toBe('orange');
  });

  it('remounts failed error boundaries (componentDidCatch)', async () => {
    if (__DEV__) {
      await render(() => {
        function Hello() {
          return <h1>Hi</h1>;
        }
        $RefreshReg$(Hello, 'Hello');

        class Boundary extends React.Component {
          state = {error: null};
          componentDidCatch(error) {
            this.setState({error});
          }
          render() {
            if (this.state.error) {
              return <h1>Oops: {this.state.error.message}</h1>;
            }
            return this.props.children;
          }
        }

        function App() {
          return (
            <>
              <p>A</p>
              <Boundary>
                <Hello />
              </Boundary>
              <p>B</p>
            </>
          );
        }

        return App;
      });

      expect(container.innerHTML).toBe('<p>A</p><h1>Hi</h1><p>B</p>');
      const firstP = container.firstChild;
      const secondP = firstP.nextSibling.nextSibling;

      // Perform a hot update that fails.
      await patch(() => {
        function Hello() {
          throw new Error('No');
        }
        $RefreshReg$(Hello, 'Hello');
      });

      expect(container.innerHTML).toBe('<p>A</p><h1>Oops: No</h1><p>B</p>');
      expect(container.firstChild).toBe(firstP);
      expect(container.firstChild.nextSibling.nextSibling).toBe(secondP);

      // Perform a hot update that fixes the error.
      await patch(() => {
        function Hello() {
          return <h1>Fixed!</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });

      // This should remount the error boundary (but not anything above it).
      expect(container.innerHTML).toBe('<p>A</p><h1>Fixed!</h1><p>B</p>');
      expect(container.firstChild).toBe(firstP);
      expect(container.firstChild.nextSibling.nextSibling).toBe(secondP);

      // Verify next hot reload doesn't remount anything.
      const helloNode = container.firstChild.nextSibling;
      await patch(() => {
        function Hello() {
          return <h1>Nice.</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.firstChild.nextSibling).toBe(helloNode);
      expect(helloNode.textContent).toBe('Nice.');
    }
  });

  it('remounts failed error boundaries (getDerivedStateFromError)', async () => {
    if (__DEV__) {
      await render(() => {
        function Hello() {
          return <h1>Hi</h1>;
        }
        $RefreshReg$(Hello, 'Hello');

        class Boundary extends React.Component {
          state = {error: null};
          static getDerivedStateFromError(error) {
            return {error};
          }
          render() {
            if (this.state.error) {
              return <h1>Oops: {this.state.error.message}</h1>;
            }
            return this.props.children;
          }
        }

        function App() {
          return (
            <>
              <p>A</p>
              <Boundary>
                <Hello />
              </Boundary>
              <p>B</p>
            </>
          );
        }

        return App;
      });

      expect(container.innerHTML).toBe('<p>A</p><h1>Hi</h1><p>B</p>');
      const firstP = container.firstChild;
      const secondP = firstP.nextSibling.nextSibling;

      // Perform a hot update that fails.
      await patch(() => {
        function Hello() {
          throw new Error('No');
        }
        $RefreshReg$(Hello, 'Hello');
      });

      expect(container.innerHTML).toBe('<p>A</p><h1>Oops: No</h1><p>B</p>');
      expect(container.firstChild).toBe(firstP);
      expect(container.firstChild.nextSibling.nextSibling).toBe(secondP);

      // Perform a hot update that fixes the error.
      await patch(() => {
        function Hello() {
          return <h1>Fixed!</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });

      // This should remount the error boundary (but not anything above it).
      expect(container.innerHTML).toBe('<p>A</p><h1>Fixed!</h1><p>B</p>');
      expect(container.firstChild).toBe(firstP);
      expect(container.firstChild.nextSibling.nextSibling).toBe(secondP);

      // Verify next hot reload doesn't remount anything.
      const helloNode = container.firstChild.nextSibling;
      await patch(() => {
        function Hello() {
          return <h1>Nice.</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.firstChild.nextSibling).toBe(helloNode);
      expect(helloNode.textContent).toBe('Nice.');
    }
  });

  it('remounts error boundaries that failed asynchronously after hot update', async () => {
    if (__DEV__) {
      await render(() => {
        function Hello() {
          const [x] = React.useState('');
          React.useEffect(() => {}, []);
          x.slice(); // Doesn't throw initially.
          return <h1>Hi</h1>;
        }
        $RefreshReg$(Hello, 'Hello');

        class Boundary extends React.Component {
          state = {error: null};
          static getDerivedStateFromError(error) {
            return {error};
          }
          render() {
            if (this.state.error) {
              return <h1>Oops: {this.state.error.message}</h1>;
            }
            return this.props.children;
          }
        }

        function App() {
          return (
            <>
              <p>A</p>
              <Boundary>
                <Hello />
              </Boundary>
              <p>B</p>
            </>
          );
        }

        return App;
      });

      expect(container.innerHTML).toBe('<p>A</p><h1>Hi</h1><p>B</p>');
      const firstP = container.firstChild;
      const secondP = firstP.nextSibling.nextSibling;

      // Perform a hot update that fails.
      let crash;
      await patch(() => {
        function Hello() {
          const [x, setX] = React.useState('');
          React.useEffect(() => {
            crash = () => {
              setX(42); // This will crash next render.
            };
          }, []);
          x.slice();
          return <h1>Hi</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });

      expect(container.innerHTML).toBe('<p>A</p><h1>Hi</h1><p>B</p>');
      // Run timeout inside effect:
      await act(() => {
        crash();
      });
      expect(container.innerHTML).toBe(
        '<p>A</p><h1>Oops: x.slice is not a function</h1><p>B</p>',
      );
      expect(container.firstChild).toBe(firstP);
      expect(container.firstChild.nextSibling.nextSibling).toBe(secondP);

      // Perform a hot update that fixes the error.
      await patch(() => {
        function Hello() {
          const [x] = React.useState('');
          React.useEffect(() => {}, []); // Removes the bad effect code.
          x.slice(); // Doesn't throw initially.
          return <h1>Fixed!</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });

      // This should remount the error boundary (but not anything above it).
      expect(container.innerHTML).toBe('<p>A</p><h1>Fixed!</h1><p>B</p>');
      expect(container.firstChild).toBe(firstP);
      expect(container.firstChild.nextSibling.nextSibling).toBe(secondP);

      // Verify next hot reload doesn't remount anything.
      const helloNode = container.firstChild.nextSibling;
      await patch(() => {
        function Hello() {
          const [x] = React.useState('');
          React.useEffect(() => {}, []);
          x.slice();
          return <h1>Nice.</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });

      expect(container.firstChild.nextSibling).toBe(helloNode);
      expect(helloNode.textContent).toBe('Nice.');
    }
  });

  it('remounts a failed root on mount', async () => {
    if (__DEV__) {
      await expect(
        render(() => {
          function Hello() {
            throw new Error('No');
          }
          $RefreshReg$(Hello, 'Hello');

          return Hello;
        }),
      ).rejects.toThrow('No');
      expect(container.innerHTML).toBe('');

      // A bad retry
      await expect(async () => {
        await patch(() => {
          function Hello() {
            throw new Error('Not yet');
          }
          $RefreshReg$(Hello, 'Hello');
        });
      }).rejects.toThrow('Not yet');
      expect(container.innerHTML).toBe('');

      // Perform a hot update that fixes the error.
      await patch(() => {
        function Hello() {
          return <h1>Fixed!</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      // This should mount the root.
      expect(container.innerHTML).toBe('<h1>Fixed!</h1>');

      // Ensure we can keep failing and recovering later.
      await expect(async () => {
        await patch(() => {
          function Hello() {
            throw new Error('No 2');
          }
          $RefreshReg$(Hello, 'Hello');
        });
      }).rejects.toThrow('No 2');
      expect(container.innerHTML).toBe('');
      await expect(async () => {
        await patch(() => {
          function Hello() {
            throw new Error('Not yet 2');
          }
          $RefreshReg$(Hello, 'Hello');
        });
      }).rejects.toThrow('Not yet 2');
      expect(container.innerHTML).toBe('');
      await patch(() => {
        function Hello() {
          return <h1>Fixed 2!</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.innerHTML).toBe('<h1>Fixed 2!</h1>');

      // Updates after intentional unmount are ignored.
      await act(() => {
        root.unmount();
      });
      await patch(() => {
        function Hello() {
          throw new Error('Ignored');
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.innerHTML).toBe('');
      await patch(() => {
        function Hello() {
          return <h1>Ignored</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.innerHTML).toBe('');
    }
  });

  it('does not retry an intentionally unmounted failed root', async () => {
    if (__DEV__) {
      await expect(
        render(() => {
          function Hello() {
            throw new Error('No');
          }
          $RefreshReg$(Hello, 'Hello');

          return Hello;
        }),
      ).rejects.toThrow('No');
      expect(container.innerHTML).toBe('');

      // Intentional unmount.
      await act(() => {
        root.unmount();
      });

      // Perform a hot update that fixes the error.
      await patch(() => {
        function Hello() {
          return <h1>Fixed!</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      // This should stay unmounted.
      expect(container.innerHTML).toBe('');
    }
  });

  it('remounts a failed root on update', async () => {
    if (__DEV__) {
      await render(() => {
        function Hello() {
          return <h1>Hi</h1>;
        }
        $RefreshReg$(Hello, 'Hello');

        return Hello;
      });
      expect(container.innerHTML).toBe('<h1>Hi</h1>');

      // Perform a hot update that fails.
      // This removes the root.
      await expect(async () => {
        await patch(() => {
          function Hello() {
            throw new Error('No');
          }
          $RefreshReg$(Hello, 'Hello');
        });
      }).rejects.toThrow('No');
      expect(container.innerHTML).toBe('');

      // A bad retry
      await expect(async () => {
        await patch(() => {
          function Hello() {
            throw new Error('Not yet');
          }
          $RefreshReg$(Hello, 'Hello');
        });
      }).rejects.toThrow('Not yet');
      expect(container.innerHTML).toBe('');

      // Perform a hot update that fixes the error.
      await patch(() => {
        function Hello() {
          return <h1>Fixed!</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      // This should remount the root.
      expect(container.innerHTML).toBe('<h1>Fixed!</h1>');

      // Verify next hot reload doesn't remount anything.
      const helloNode = container.firstChild;
      await patch(() => {
        function Hello() {
          return <h1>Nice.</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.firstChild).toBe(helloNode);
      expect(helloNode.textContent).toBe('Nice.');

      // Break again.
      await expect(async () => {
        await patch(() => {
          function Hello() {
            throw new Error('Oops');
          }
          $RefreshReg$(Hello, 'Hello');
        });
      }).rejects.toThrow('Oops');
      expect(container.innerHTML).toBe('');

      // Perform a hot update that fixes the error.
      await patch(() => {
        function Hello() {
          return <h1>At last.</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      // This should remount the root.
      expect(container.innerHTML).toBe('<h1>At last.</h1>');

      // Check we don't attempt to reverse an intentional unmount.
      await act(() => {
        root.unmount();
      });
      expect(container.innerHTML).toBe('');
      await patch(() => {
        function Hello() {
          return <h1>Never mind me!</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.innerHTML).toBe('');

      // Mount a new container.
      root = ReactDOMClient.createRoot(container);
      await render(() => {
        function Hello() {
          return <h1>Hi</h1>;
        }
        $RefreshReg$(Hello, 'Hello');

        return Hello;
      });
      expect(container.innerHTML).toBe('<h1>Hi</h1>');

      // Break again.
      await expect(async () => {
        await patch(() => {
          function Hello() {
            throw new Error('Oops');
          }
          $RefreshReg$(Hello, 'Hello');
        });
      }).rejects.toThrow('Oops');
      expect(container.innerHTML).toBe('');

      // Check we don't attempt to reverse an intentional unmount, even after an error.
      await act(() => {
        root.unmount();
      });
      expect(container.innerHTML).toBe('');
      await patch(() => {
        function Hello() {
          return <h1>Never mind me!</h1>;
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(container.innerHTML).toBe('');
    }
  });

  it('regression test: does not get into an infinite loop', async () => {
    if (__DEV__) {
      const containerA = document.createElement('div');
      const containerB = document.createElement('div');
      const rootA = ReactDOMClient.createRoot(containerA);
      const rootB = ReactDOMClient.createRoot(containerB);

      // Initially, nothing interesting.
      const RootAV1 = () => {
        return 'A1';
      };
      $RefreshReg$(RootAV1, 'RootA');
      const RootBV1 = () => {
        return 'B1';
      };
      $RefreshReg$(RootBV1, 'RootB');

      await act(() => {
        rootA.render(<RootAV1 />);
        rootB.render(<RootBV1 />);
      });
      expect(containerA.innerHTML).toBe('A1');
      expect(containerB.innerHTML).toBe('B1');

      // Then make the first root fail.
      const RootAV2 = () => {
        throw new Error('A2!');
      };
      $RefreshReg$(RootAV2, 'RootA');
      await expect(
        act(() => {
          ReactFreshRuntime.performReactRefresh();
        }),
      ).rejects.toThrow('A2!');
      expect(containerA.innerHTML).toBe('');
      expect(containerB.innerHTML).toBe('B1');

      // Then patch the first root, but make it fail in the commit phase.
      // This used to trigger an infinite loop due to a list of failed roots
      // being mutated while it was being iterated on.
      const RootAV3 = () => {
        React.useLayoutEffect(() => {
          throw new Error('A3!');
        }, []);
        return 'A3';
      };
      $RefreshReg$(RootAV3, 'RootA');
      await expect(
        act(() => {
          ReactFreshRuntime.performReactRefresh();
        }),
      ).rejects.toThrow('A3!');
      expect(containerA.innerHTML).toBe('');
      expect(containerB.innerHTML).toBe('B1');

      const RootAV4 = () => {
        return 'A4';
      };
      $RefreshReg$(RootAV4, 'RootA');
      await act(() => {
        ReactFreshRuntime.performReactRefresh();
      });
      expect(containerA.innerHTML).toBe('A4');
      expect(containerB.innerHTML).toBe('B1');
    }
  });

  it('remounts classes on every edit', async () => {
    if (__DEV__) {
      const HelloV1 = await render(() => {
        class Hello extends React.Component {
          state = {count: 0};
          handleClick = () => {
            this.setState(prev => ({
              count: prev.count + 1,
            }));
          };
          render() {
            return (
              <p style={{color: 'blue'}} onClick={this.handleClick}>
                {this.state.count}
              </p>
            );
          }
        }
        // For classes, we wouldn't do this call via Babel plugin.
        // Instead, we'd do it at module boundaries.
        // Normally classes would get a different type and remount anyway,
        // but at module boundaries we may want to prevent propagation.
        // However we still want to force a remount and use latest version.
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      const HelloV2 = await patch(() => {
        class Hello extends React.Component {
          state = {count: 0};
          handleClick = () => {
            this.setState(prev => ({
              count: prev.count + 1,
            }));
          };
          render() {
            return (
              <p style={{color: 'red'}} onClick={this.handleClick}>
                {this.state.count}
              </p>
            );
          }
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // It should have remounted the class.
      expect(container.firstChild).not.toBe(el);
      const newEl = container.firstChild;
      expect(newEl.textContent).toBe('0');
      expect(newEl.style.color).toBe('red');
      await act(() => {
        newEl.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(newEl.textContent).toBe('1');

      // Now top-level renders of both types resolve to latest.
      await render(() => HelloV1);
      await render(() => HelloV2);
      expect(container.firstChild).toBe(newEl);
      expect(newEl.style.color).toBe('red');
      expect(newEl.textContent).toBe('1');

      const HelloV3 = await patch(() => {
        class Hello extends React.Component {
          state = {count: 0};
          handleClick = () => {
            this.setState(prev => ({
              count: prev.count + 1,
            }));
          };
          render() {
            return (
              <p style={{color: 'orange'}} onClick={this.handleClick}>
                {this.state.count}
              </p>
            );
          }
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // It should have remounted the class again.
      expect(container.firstChild).not.toBe(el);
      const finalEl = container.firstChild;
      expect(finalEl.textContent).toBe('0');
      expect(finalEl.style.color).toBe('orange');
      await act(() => {
        finalEl.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(finalEl.textContent).toBe('1');

      await render(() => HelloV3);
      await render(() => HelloV2);
      await render(() => HelloV1);
      expect(container.firstChild).toBe(finalEl);
      expect(finalEl.style.color).toBe('orange');
      expect(finalEl.textContent).toBe('1');
    }
  });

  it('updates refs when remounting', async () => {
    if (__DEV__) {
      const testRef = React.createRef();
      await render(
        () => {
          class Hello extends React.Component {
            getColor() {
              return 'green';
            }
            render() {
              return <p />;
            }
          }
          $RefreshReg$(Hello, 'Hello');
          return Hello;
        },
        {ref: testRef},
      );
      expect(testRef.current.getColor()).toBe('green');

      await patch(() => {
        class Hello extends React.Component {
          getColor() {
            return 'orange';
          }
          render() {
            return <p />;
          }
        }
        $RefreshReg$(Hello, 'Hello');
      });
      expect(testRef.current.getColor()).toBe('orange');

      await patch(() => {
        const Hello = React.forwardRef((props, ref) => {
          React.useImperativeHandle(ref, () => ({
            getColor() {
              return 'pink';
            },
          }));
          return <p />;
        });
        $RefreshReg$(Hello, 'Hello');
      });
      expect(testRef.current.getColor()).toBe('pink');

      await patch(() => {
        const Hello = React.forwardRef((props, ref) => {
          React.useImperativeHandle(ref, () => ({
            getColor() {
              return 'yellow';
            },
          }));
          return <p />;
        });
        $RefreshReg$(Hello, 'Hello');
      });
      expect(testRef.current.getColor()).toBe('yellow');

      await patch(() => {
        const Hello = React.forwardRef((props, ref) => {
          React.useImperativeHandle(ref, () => ({
            getColor() {
              return 'yellow';
            },
          }));
          return <p />;
        });
        $RefreshReg$(Hello, 'Hello');
      });
      expect(testRef.current.getColor()).toBe('yellow');
    }
  });

  it('remounts on conversion from class to function and back', async () => {
    if (__DEV__) {
      const HelloV1 = await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update that turns it into a class.
      const HelloV2 = await patch(() => {
        class Hello extends React.Component {
          state = {count: 0};
          handleClick = () => {
            this.setState(prev => ({
              count: prev.count + 1,
            }));
          };
          render() {
            return (
              <p style={{color: 'red'}} onClick={this.handleClick}>
                {this.state.count}
              </p>
            );
          }
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // It should have remounted.
      expect(container.firstChild).not.toBe(el);
      const newEl = container.firstChild;
      expect(newEl.textContent).toBe('0');
      expect(newEl.style.color).toBe('red');
      await act(() => {
        newEl.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(newEl.textContent).toBe('1');

      // Now top-level renders of both types resolve to latest.
      await render(() => HelloV1);
      await render(() => HelloV2);
      expect(container.firstChild).toBe(newEl);
      expect(newEl.style.color).toBe('red');
      expect(newEl.textContent).toBe('1');

      // Now convert it back to a function.
      const HelloV3 = await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // It should have remounted again.
      expect(container.firstChild).not.toBe(el);
      const finalEl = container.firstChild;
      expect(finalEl.textContent).toBe('0');
      expect(finalEl.style.color).toBe('orange');
      await act(() => {
        finalEl.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(finalEl.textContent).toBe('1');

      await render(() => HelloV3);
      await render(() => HelloV2);
      await render(() => HelloV1);
      expect(container.firstChild).toBe(finalEl);
      expect(finalEl.style.color).toBe('orange');
      expect(finalEl.textContent).toBe('1');

      // Now that it's a function, verify edits keep state.
      await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'purple'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });
      expect(container.firstChild).toBe(finalEl);
      expect(finalEl.style.color).toBe('purple');
      expect(finalEl.textContent).toBe('1');
    }
  });

  it('can update multiple roots independently', async () => {
    if (__DEV__) {
      // Declare the first version.
      const HelloV1 = () => {
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      };
      $RefreshReg$(HelloV1, 'Hello');

      // Perform a hot update before any roots exist.
      const HelloV2 = () => {
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      };
      $RefreshReg$(HelloV2, 'Hello');
      await act(() => {
        ReactFreshRuntime.performReactRefresh();
      });

      // Mount three roots.
      const cont1 = document.createElement('div');
      const cont2 = document.createElement('div');
      const cont3 = document.createElement('div');
      document.body.appendChild(cont1);
      document.body.appendChild(cont2);
      document.body.appendChild(cont3);
      const root1 = ReactDOMClient.createRoot(cont1);
      const root2 = ReactDOMClient.createRoot(cont2);
      const root3 = ReactDOMClient.createRoot(cont3);
      try {
        await act(() => {
          root1.render(<HelloV1 id={1} />);
        });
        await act(() => {
          root2.render(<HelloV2 id={2} />);
        });
        await act(() => {
          root3.render(<HelloV1 id={3} />);
        });

        // Expect we see the V2 color.
        expect(cont1.firstChild.style.color).toBe('red');
        expect(cont2.firstChild.style.color).toBe('red');
        expect(cont3.firstChild.style.color).toBe('red');
        expect(cont1.firstChild.textContent).toBe('0');
        expect(cont2.firstChild.textContent).toBe('0');
        expect(cont3.firstChild.textContent).toBe('0');

        // Bump the state for each of them.
        await act(() => {
          cont1.firstChild.dispatchEvent(
            new MouseEvent('click', {bubbles: true}),
          );
          cont2.firstChild.dispatchEvent(
            new MouseEvent('click', {bubbles: true}),
          );
          cont3.firstChild.dispatchEvent(
            new MouseEvent('click', {bubbles: true}),
          );
        });
        expect(cont1.firstChild.style.color).toBe('red');
        expect(cont2.firstChild.style.color).toBe('red');
        expect(cont3.firstChild.style.color).toBe('red');
        expect(cont1.firstChild.textContent).toBe('1');
        expect(cont2.firstChild.textContent).toBe('1');
        expect(cont3.firstChild.textContent).toBe('1');

        // Perform another hot update.
        const HelloV3 = () => {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'green'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        };
        $RefreshReg$(HelloV3, 'Hello');
        await act(() => {
          ReactFreshRuntime.performReactRefresh();
        });

        // It should affect all roots.
        expect(cont1.firstChild.style.color).toBe('green');
        expect(cont2.firstChild.style.color).toBe('green');
        expect(cont3.firstChild.style.color).toBe('green');
        expect(cont1.firstChild.textContent).toBe('1');
        expect(cont2.firstChild.textContent).toBe('1');
        expect(cont3.firstChild.textContent).toBe('1');

        // Unmount the second root.
        await act(() => {
          root2.unmount();
        });
        // Make the first root throw and unmount on hot update.
        const HelloV4 = ({id}) => {
          if (id === 1) {
            throw new Error('Oops.');
          }
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'orange'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        };
        $RefreshReg$(HelloV4, 'Hello');
        await expect(
          act(() => {
            ReactFreshRuntime.performReactRefresh();
          }),
        ).rejects.toThrow('Oops.');

        // Still, we expect the last root to be updated.
        expect(cont1.innerHTML).toBe('');
        expect(cont2.innerHTML).toBe('');
        expect(cont3.firstChild.style.color).toBe('orange');
        expect(cont3.firstChild.textContent).toBe('1');
      } finally {
        document.body.removeChild(cont1);
        document.body.removeChild(cont2);
        document.body.removeChild(cont3);
      }
    }
  });

  // Module runtimes can use this to decide whether
  // to propagate an update up to the modules that imported it,
  // or to stop at the current module because it's a component.
  // This can't and doesn't need to be 100% precise.
  it('can detect likely component types', () => {
    function useTheme() {}
    function Widget() {}

    if (__DEV__) {
      expect(ReactFreshRuntime.isLikelyComponentType(false)).toBe(false);
      expect(ReactFreshRuntime.isLikelyComponentType(null)).toBe(false);
      expect(ReactFreshRuntime.isLikelyComponentType('foo')).toBe(false);

      // We need to hit a balance here.
      // If we lean towards assuming everything is a component,
      // editing modules that export plain functions won't trigger
      // a proper reload because we will bottle up the update.
      // So we're being somewhat conservative.
      expect(ReactFreshRuntime.isLikelyComponentType(() => {})).toBe(false);
      expect(ReactFreshRuntime.isLikelyComponentType(function () {})).toBe(
        false,
      );
      expect(
        ReactFreshRuntime.isLikelyComponentType(function lightenColor() {}),
      ).toBe(false);
      const loadUser = () => {};
      expect(ReactFreshRuntime.isLikelyComponentType(loadUser)).toBe(false);
      const useStore = () => {};
      expect(ReactFreshRuntime.isLikelyComponentType(useStore)).toBe(false);
      expect(ReactFreshRuntime.isLikelyComponentType(useTheme)).toBe(false);
      const rogueProxy = new Proxy(
        {},
        {
          get(target, property) {
            throw new Error();
          },
        },
      );
      expect(ReactFreshRuntime.isLikelyComponentType(rogueProxy)).toBe(false);

      // These seem like function components.
      const Button = () => {};
      expect(ReactFreshRuntime.isLikelyComponentType(Button)).toBe(true);
      expect(ReactFreshRuntime.isLikelyComponentType(Widget)).toBe(true);
      const ProxyButton = new Proxy(Button, {
        get(target, property) {
          return target[property];
        },
      });
      expect(ReactFreshRuntime.isLikelyComponentType(ProxyButton)).toBe(true);
      const anon = (() => () => {})();
      anon.displayName = 'Foo';
      expect(ReactFreshRuntime.isLikelyComponentType(anon)).toBe(true);

      // These seem like class components.
      class Btn extends React.Component {}
      class PureBtn extends React.PureComponent {}
      const ProxyBtn = new Proxy(Btn, {
        get(target, property) {
          return target[property];
        },
      });
      expect(ReactFreshRuntime.isLikelyComponentType(Btn)).toBe(true);
      expect(ReactFreshRuntime.isLikelyComponentType(PureBtn)).toBe(true);
      expect(ReactFreshRuntime.isLikelyComponentType(ProxyBtn)).toBe(true);
      expect(
        ReactFreshRuntime.isLikelyComponentType(
          createReactClass({render() {}}),
        ),
      ).toBe(true);

      // These don't.
      class Figure {
        move() {}
      }
      expect(ReactFreshRuntime.isLikelyComponentType(Figure)).toBe(false);
      class Point extends Figure {}
      expect(ReactFreshRuntime.isLikelyComponentType(Point)).toBe(false);

      // Run the same tests without Babel.
      // This tests real arrow functions and classes, as implemented in Node.

      // eslint-disable-next-line no-new-func
      new Function(
        'global',
        'React',
        'ReactFreshRuntime',
        'expect',
        'createReactClass',
        `
        expect(ReactFreshRuntime.isLikelyComponentType(() => {})).toBe(false);
        expect(ReactFreshRuntime.isLikelyComponentType(function() {})).toBe(false);
        expect(
          ReactFreshRuntime.isLikelyComponentType(function lightenColor() {}),
        ).toBe(false);
        const loadUser = () => {};
        expect(ReactFreshRuntime.isLikelyComponentType(loadUser)).toBe(false);
        const useStore = () => {};
        expect(ReactFreshRuntime.isLikelyComponentType(useStore)).toBe(false);
        function useTheme() {}
        expect(ReactFreshRuntime.isLikelyComponentType(useTheme)).toBe(false);

        // These seem like function components.
        let Button = () => {};
        expect(ReactFreshRuntime.isLikelyComponentType(Button)).toBe(true);
        function Widget() {}
        expect(ReactFreshRuntime.isLikelyComponentType(Widget)).toBe(true);
        let anon = (() => () => {})();
        anon.displayName = 'Foo';
        expect(ReactFreshRuntime.isLikelyComponentType(anon)).toBe(true);

        // These seem like class components.
        class Btn extends React.Component {}
        class PureBtn extends React.PureComponent {}
        expect(ReactFreshRuntime.isLikelyComponentType(Btn)).toBe(true);
        expect(ReactFreshRuntime.isLikelyComponentType(PureBtn)).toBe(true);
        expect(
          ReactFreshRuntime.isLikelyComponentType(createReactClass({render() {}})),
        ).toBe(true);

        // These don't.
        class Figure {
          move() {}
        }
        expect(ReactFreshRuntime.isLikelyComponentType(Figure)).toBe(false);
        class Point extends Figure {}
        expect(ReactFreshRuntime.isLikelyComponentType(Point)).toBe(false);
      `,
      )(global, React, ReactFreshRuntime, expect, createReactClass);
    }
  });

  it('reports updated and remounted families to the caller', () => {
    if (__DEV__) {
      const HelloV1 = () => {
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      };
      $RefreshReg$(HelloV1, 'Hello');

      const HelloV2 = () => {
        const [val, setVal] = React.useState(0);
        return (
          <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
            {val}
          </p>
        );
      };
      $RefreshReg$(HelloV2, 'Hello');

      const update = ReactFreshRuntime.performReactRefresh();
      expect(update.updatedFamilies.size).toBe(1);
      expect(update.staleFamilies.size).toBe(0);
      const family = update.updatedFamilies.values().next().value;
      expect(family.current.name).toBe('HelloV2');
      // For example, we can use this to print a log of what was updated.
    }
  });

  function initFauxDevToolsHook() {
    const onCommitFiberRoot = jest.fn();
    const onCommitFiberUnmount = jest.fn();

    let idCounter = 0;
    const renderers = new Map();

    // This is a minimal shim for the global hook installed by DevTools.
    // The real one is in packages/react-devtools-shared/src/hook.js.
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers,
      supportsFiber: true,
      inject(renderer) {
        const id = ++idCounter;
        renderers.set(id, renderer);
        return id;
      },
      onCommitFiberRoot,
      onCommitFiberUnmount,
    };
  }

  // This simulates the scenario in https://github.com/facebook/react/issues/17626
  it('can inject the runtime after the renderer executes', async () => {
    if (__DEV__) {
      initFauxDevToolsHook();

      // Load these first, as if they're coming from a CDN.
      jest.resetModules();
      React = require('react');
      ReactDOM = require('react-dom');
      ReactDOMClient = require('react-dom/client');
      Scheduler = require('scheduler');
      act = require('internal-test-utils').act;

      // Important! Inject into the global hook *after* ReactDOM runs:
      ReactFreshRuntime = require('react-refresh/runtime');
      ReactFreshRuntime.injectIntoGlobalHook(global);

      root = ReactDOMClient.createRoot(container);

      // We're verifying that we're able to track roots mounted after this point.
      // The rest of this test is taken from the simplest first test case.

      await render(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'blue'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // Bump the state before patching.
      const el = container.firstChild;
      expect(el.textContent).toBe('0');
      expect(el.style.color).toBe('blue');
      await act(() => {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(el.textContent).toBe('1');

      // Perform a hot update.
      await patch(() => {
        function Hello() {
          const [val, setVal] = React.useState(0);
          return (
            <p style={{color: 'red'}} onClick={() => setVal(val + 1)}>
              {val}
            </p>
          );
        }
        $RefreshReg$(Hello, 'Hello');
        return Hello;
      });

      // Assert the state was preserved but color changed.
      expect(container.firstChild).toBe(el);
      expect(el.textContent).toBe('1');
      expect(el.style.color).toBe('red');
    }
  });

  // This simulates the scenario in https://github.com/facebook/react/issues/20100
  it('does not block DevTools when an unsupported legacy renderer is injected', () => {
    if (__DEV__) {
      initFauxDevToolsHook();

      const onCommitFiberRoot =
        global.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;

      // Redirect all React/ReactDOM requires to v16.8.0
      // This version predates Fast Refresh support.
      jest.mock('scheduler', () => jest.requireActual('scheduler-0-13'));
      jest.mock('scheduler/tracing', () =>
        jest.requireActual('scheduler-0-13/tracing'),
      );
      jest.mock('react', () => jest.requireActual('react-16-8'));
      jest.mock('react-dom', () => jest.requireActual('react-dom-16-8'));

      // Load React and company.
      jest.resetModules();
      React = require('react');
      ReactDOM = require('react-dom');
      Scheduler = require('scheduler');

      // Important! Inject into the global hook *after* ReactDOM runs:
      ReactFreshRuntime = require('react-refresh/runtime');
      ReactFreshRuntime.injectIntoGlobalHook(global);

      // NOTE: Intentionally using createElement in this test instead of JSX
      // because old versions of React are incompatible with the JSX transform
      // used by our test suite.
      const Hello = () => {
        const [state] = React.useState('Hi!');
        // Intentionally
        return React.createElement('div', null, state);
      };
      $RefreshReg$(Hello, 'Hello');
      const Component = Hello;
      ReactDOM.render(React.createElement(Component), container);

      expect(onCommitFiberRoot).toHaveBeenCalled();
    }
  });
});
