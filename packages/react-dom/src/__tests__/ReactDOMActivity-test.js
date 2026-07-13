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
let Scheduler;
let act;
let Activity;
let useState;
let useLayoutEffect;
let useEffect;
let LegacyHidden;
let assertLog;
let Suspense;

describe('ReactDOMActivity', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    Scheduler = require('scheduler/unstable_mock');
    Activity = React.Activity;
    useState = React.useState;
    Suspense = React.Suspense;
    useState = React.useState;
    LegacyHidden = React.unstable_LegacyHidden;
    useLayoutEffect = React.useLayoutEffect;
    useEffect = React.useEffect;
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    const InternalTestUtils = require('internal-test-utils');
    act = InternalTestUtils.act;
    assertLog = InternalTestUtils.assertLog;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  function Text(props) {
    Scheduler.log(props.text);
    return <span prop={props.text}>{props.children}</span>;
  }

  it(
    'hiding an Activity boundary also hides the direct children of any ' +
      'portals it contains, regardless of how deeply nested they are',
    async () => {
      const portalContainer = document.createElement('div');

      let setShow;
      function Accordion({children}) {
        const [shouldShow, _setShow] = useState(true);
        setShow = _setShow;
        return (
          <Activity mode={shouldShow ? 'visible' : 'hidden'}>
            {children}
          </Activity>
        );
      }

      function App() {
        return (
          <Accordion>
            <div>
              {ReactDOM.createPortal(
                <div>Portal contents</div>,
                portalContainer,
              )}
            </div>
          </Accordion>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<App />));
      expect(container.innerHTML).toBe('<div></div>');
      expect(portalContainer.innerHTML).toBe('<div>Portal contents</div>');

      // Hide the Activity boundary. Not only are the nearest DOM elements hidden,
      // but also the children of the nested portal contained within it.
      await act(() => setShow(false));
      expect(container.innerHTML).toBe('<div style="display: none;"></div>');
      expect(portalContainer.innerHTML).toBe(
        '<div style="display: none;">Portal contents</div>',
      );
    },
  );

  it(
    'revealing an Activity boundary inside a portal does not reveal the ' +
      'portal contents if has a hidden Activity parent',
    async () => {
      const portalContainer = document.createElement('div');

      let setShow;
      function Accordion({children}) {
        const [shouldShow, _setShow] = useState(false);
        setShow = _setShow;
        return (
          <Activity mode={shouldShow ? 'visible' : 'hidden'}>
            {children}
          </Activity>
        );
      }

      function App() {
        return (
          <Activity mode="hidden">
            <div>
              {ReactDOM.createPortal(
                <Accordion>
                  <div>Portal contents</div>
                </Accordion>,
                portalContainer,
              )}
            </div>
          </Activity>
        );
      }

      // Start with both boundaries hidden.
      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<App />));
      expect(container.innerHTML).toBe('<div style="display: none;"></div>');
      expect(portalContainer.innerHTML).toBe(
        '<div style="display: none;">Portal contents</div>',
      );

      // Reveal the inner Activity boundary. It should not reveal its children,
      // because there's a parent Activity boundary that is still hidden.
      await act(() => setShow(true));
      expect(container.innerHTML).toBe('<div style="display: none;"></div>');
      expect(portalContainer.innerHTML).toBe(
        '<div style="display: none;">Portal contents</div>',
      );
    },
  );

  it('hides new portals added to an already hidden tree', async () => {
    function Child() {
      return <Text text="Child" />;
    }

    const portalContainer = document.createElement('div');

    function Portal({children}) {
      return <div>{ReactDOM.createPortal(children, portalContainer)}</div>;
    }

    const root = ReactDOMClient.createRoot(container);
    // Mount hidden tree.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Text text="Parent" />
        </Activity>,
      );
    });
    assertLog(['Parent']);
    expect(container.innerHTML).toBe(
      '<span prop="Parent" style="display: none;"></span>',
    );
    expect(portalContainer.innerHTML).toBe('');

    // Add a portal inside the hidden tree.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Text text="Parent" />
          <Portal>
            <Child />
          </Portal>
        </Activity>,
      );
    });
    assertLog(['Parent', 'Child']);
    expect(container.innerHTML).toBe(
      '<span prop="Parent" style="display: none;"></span><div style="display: none;"></div>',
    );
    expect(portalContainer.innerHTML).toBe(
      '<span prop="Child" style="display: none;"></span>',
    );

    // Now reveal it.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Text text="Parent" />
          <Portal>
            <Child />
          </Portal>
        </Activity>,
      );
    });

    assertLog(['Parent', 'Child']);
    expect(container.innerHTML).toBe(
      '<span prop="Parent" style=""></span><div style=""></div>',
    );
    expect(portalContainer.innerHTML).toBe(
      '<span prop="Child" style=""></span>',
    );
  });

  it('hides new insertions inside an already hidden portal', async () => {
    function Child({text}) {
      useLayoutEffect(() => {
        Scheduler.log(`Mount layout ${text}`);
        return () => {
          Scheduler.log(`Unmount layout ${text}`);
        };
      }, [text]);
      return <Text text={text} />;
    }

    const portalContainer = document.createElement('div');

    function Portal({children}) {
      return <div>{ReactDOM.createPortal(children, portalContainer)}</div>;
    }

    const root = ReactDOMClient.createRoot(container);
    // Mount hidden tree.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Portal>
            <Child text="A" />
          </Portal>
        </Activity>,
      );
    });
    assertLog(['A']);
    expect(container.innerHTML).toBe('<div style="display: none;"></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="A" style="display: none;"></span>',
    );

    // Add a node inside the hidden portal.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Portal>
            <Child text="A" />
            <Child text="B" />
          </Portal>
        </Activity>,
      );
    });
    assertLog(['A', 'B']);
    expect(container.innerHTML).toBe('<div style="display: none;"></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="A" style="display: none;"></span><span prop="B" style="display: none;"></span>',
    );

    // Now reveal it.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Portal>
            <Child text="A" />
            <Child text="B" />
          </Portal>
        </Activity>,
      );
    });

    assertLog(['A', 'B', 'Mount layout A', 'Mount layout B']);
    expect(container.innerHTML).toBe('<div style=""></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="A" style=""></span><span prop="B" style=""></span>',
    );
  });

  it('reveal an inner Suspense boundary without revealing an outer Activity on the same host child', async () => {
    const promise = new Promise(() => {});

    function Child({showInner}) {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout');
        return () => {
          Scheduler.log('Unmount layout');
        };
      }, []);
      return (
        <>
          {showInner ? null : promise}
          <Text text="Child" />
        </>
      );
    }

    const portalContainer = document.createElement('div');

    function Portal({children}) {
      return <div>{ReactDOM.createPortal(children, portalContainer)}</div>;
    }

    const root = ReactDOMClient.createRoot(container);

    // Prerender the whole tree.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Portal>
            <Suspense name="Inner" fallback={<span>Loading</span>}>
              <Child showInner={true} />
            </Suspense>
          </Portal>
        </Activity>,
      );
    });

    assertLog(['Child']);
    expect(container.innerHTML).toBe('<div style="display: none;"></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="Child" style="display: none;"></span>',
    );

    // Re-suspend the inner.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Portal>
            <Suspense name="Inner" fallback={<span>Loading</span>}>
              <Child showInner={false} />
            </Suspense>
          </Portal>
        </Activity>,
      );
    });
    assertLog([]);
    expect(container.innerHTML).toBe('<div style="display: none;"></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="Child" style="display: none;"></span><span style="display: none;">Loading</span>',
    );

    // Toggle to visible while suspended.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Portal>
            <Suspense name="Inner" fallback={<span>Loading</span>}>
              <Child showInner={false} />
            </Suspense>
          </Portal>
        </Activity>,
      );
    });
    assertLog([]);
    expect(container.innerHTML).toBe('<div style=""></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="Child" style="display: none;"></span><span style="">Loading</span>',
    );

    // Now reveal.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Portal>
            <Suspense name="Inner" fallback={<span>Loading</span>}>
              <Child showInner={true} />
            </Suspense>
          </Portal>
        </Activity>,
      );
    });
    assertLog(['Child', 'Mount layout']);
    expect(container.innerHTML).toBe('<div style=""></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="Child" style=""></span>',
    );
  });

  it('mounts/unmounts layout effects in portal when visibility changes (starting visible)', async () => {
    function Child() {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout');
        return () => {
          Scheduler.log('Unmount layout');
        };
      }, []);
      return <Text text="Child" />;
    }

    const portalContainer = document.createElement('div');

    function Portal({children}) {
      return <div>{ReactDOM.createPortal(children, portalContainer)}</div>;
    }

    const root = ReactDOMClient.createRoot(container);
    // Mount visible tree.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Portal>
            <Child />
          </Portal>
        </Activity>,
      );
    });
    assertLog(['Child', 'Mount layout']);
    expect(container.innerHTML).toBe('<div></div>');
    expect(portalContainer.innerHTML).toBe('<span prop="Child"></span>');

    // Hide the tree. The layout effect is unmounted.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Portal>
            <Child />
          </Portal>
        </Activity>,
      );
    });
    assertLog(['Unmount layout', 'Child']);
    expect(container.innerHTML).toBe('<div style="display: none;"></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="Child" style="display: none;"></span>',
    );
  });

  it('mounts/unmounts layout effects in portal when visibility changes (starting hidden)', async () => {
    function Child() {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout');
        return () => {
          Scheduler.log('Unmount layout');
        };
      }, []);
      return <Text text="Child" />;
    }

    const portalContainer = document.createElement('div');

    function Portal({children}) {
      return <div>{ReactDOM.createPortal(children, portalContainer)}</div>;
    }

    const root = ReactDOMClient.createRoot(container);
    // Mount hidden tree.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Portal>
            <Child />
          </Portal>
        </Activity>,
      );
    });
    // No layout effect.
    assertLog(['Child']);
    expect(container.innerHTML).toBe('<div style="display: none;"></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="Child" style="display: none;"></span>',
    );

    // Unhide the tree. The layout effect is mounted.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Portal>
            <Child />
          </Portal>
        </Activity>,
      );
    });
    assertLog(['Child', 'Mount layout']);
    expect(container.innerHTML).toBe('<div style=""></div>');
    expect(portalContainer.innerHTML).toBe(
      '<span prop="Child" style=""></span>',
    );
  });

  // @gate enableLegacyHidden
  it('does not toggle effects or hide nodes for LegacyHidden component inside portal', async () => {
    function Child() {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout');
        return () => {
          Scheduler.log('Unmount layout');
        };
      }, []);
      useEffect(() => {
        Scheduler.log('Mount passive');
        return () => {
          Scheduler.log('Unmount passive');
        };
      }, []);
      return <Text text="Child" />;
    }

    const portalContainer = document.createElement('div');

    function Portal({children}) {
      return <div>{ReactDOM.createPortal(children, portalContainer)}</div>;
    }

    const root = ReactDOMClient.createRoot(container);
    // Mount visible tree.
    await act(() => {
      root.render(
        <LegacyHidden mode="visible">
          <Portal>
            <Child />
          </Portal>
        </LegacyHidden>,
      );
    });
    assertLog(['Child', 'Mount layout', 'Mount passive']);
    expect(container.innerHTML).toBe('<div></div>');
    expect(portalContainer.innerHTML).toBe('<span prop="Child"></span>');

    // Hide the tree.
    await act(() => {
      root.render(
        <LegacyHidden mode="hidden">
          <Portal>
            <Child />
          </Portal>
        </LegacyHidden>,
      );
    });
    // Effects not unmounted.
    assertLog(['Child']);
    expect(container.innerHTML).toBe('<div></div>');
    expect(portalContainer.innerHTML).toBe('<span prop="Child"></span>');

    // Unhide the tree.
    await act(() => {
      root.render(
        <LegacyHidden mode="visible">
          <Portal>
            <Child />
          </Portal>
        </LegacyHidden>,
      );
    });
    // Effects already mounted.
    assertLog(['Child']);
    expect(container.innerHTML).toBe('<div></div>');
    expect(portalContainer.innerHTML).toBe('<span prop="Child"></span>');
  });
});
