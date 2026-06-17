/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let installFacade;
let facade;
let React;
let ReactDOMClient;
let act;
let container;

describe('react-devtools-facade', () => {
  beforeEach(() => {
    jest.resetModules();
    global.IS_REACT_ACT_ENVIRONMENT = true;

    // The hook lives on globalThis, which jsdom shares across tests in this
    // file, so a leftover hook would make installFacade() below throw. Remove
    // it for a clean slate. (The facade never installs any other global, which
    // the "does not install any tool globals" test verifies.)
    delete globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;

    // Install the facade BEFORE React so the hook captures the first commit.
    // Import through the package entry point to exercise the public surface.
    installFacade = require('../../index').installFacade;
    facade = installFacade();

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = React.act;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('installs __REACT_DEVTOOLS_GLOBAL_HOOK__ on globalThis', () => {
    expect(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBe(facade.hook);
  });

  it('returns a Facade handle exposing the hook and tracked state', () => {
    expect(facade.hook).toBe(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__);
    expect(facade.fiberRoots).toBeInstanceOf(Map);
    expect(facade.rendererInternals).toBeInstanceOf(Map);
    expect(facade.profilingState).toEqual({
      isActive: false,
      currentTraceName: null,
      traces: expect.any(Map),
      onCommit: null,
      onPostCommit: null,
    });
  });

  it('does not install any tool globals (the integrator decides those)', () => {
    expect(globalThis.__REACT_TOOLS__).toBeUndefined();
    expect(globalThis.__REACT_LLM_TOOLS__).toBeUndefined();
  });

  it('throws if a DevTools hook is already installed', () => {
    // A hook was already installed on globalThis in beforeEach.
    expect(() => installFacade()).toThrow(
      /React DevTools global hook is already installed/,
    );
  });

  it('installs onto an explicit target without touching globalThis', () => {
    const target = {};
    const localFacade = installFacade(target);

    expect(target.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBe(localFacade.hook);
    // The explicit-target facade is fully independent of the global one.
    expect(localFacade.hook).not.toBe(facade.hook);
    expect(localFacade.fiberRoots).not.toBe(facade.fiberRoots);
    // ...and installing onto a target does not disturb the global hook.
    expect(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBe(facade.hook);
  });

  it('records the renderer and its fiber root on mount', () => {
    function Greeting() {
      return <div>Hello</div>;
    }

    act(() => {
      ReactDOMClient.createRoot(container).render(<Greeting />);
    });

    // React injected a renderer: its internal constants were captured...
    expect(facade.rendererInternals.size).toBeGreaterThan(0);
    // ...and the hook recorded the committed root in facade.fiberRoots.
    let totalRoots = 0;
    facade.fiberRoots.forEach(roots => {
      totalRoots += roots.size;
    });
    expect(totalRoots).toBeGreaterThan(0);
  });

  it('removes unmounted roots from tracking', () => {
    function App() {
      return <div>hello</div>;
    }

    const root = ReactDOMClient.createRoot(container);
    act(() => {
      root.render(<App />);
    });

    const rendererID = Array.from(facade.hook.renderers.keys())[0];
    expect(facade.hook.getFiberRoots(rendererID).size).toBeGreaterThan(0);

    act(() => {
      root.unmount();
    });

    expect(facade.hook.getFiberRoots(rendererID).size).toBe(0);
  });
});
