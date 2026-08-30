/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails reactcore
 */

'use strict';

let React;
let ReactDOMClient;
let ReactDOM;
let createPortal;
let act;
let container;
let Fragment;
let Activity;
let mockIntersectionObserver;
let simulateIntersection;
let setClientRects;
let mockRangeClientRects;
let assertConsoleErrorDev;

function Wrapper({children}) {
  return children;
}

describe('FragmentRefs', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    Fragment = React.Fragment;
    Activity = React.Activity;
    ReactDOMClient = require('react-dom/client');
    ReactDOM = require('react-dom');
    createPortal = ReactDOM.createPortal;
    act = require('internal-test-utils').act;
    const IntersectionMocks = require('./utils/IntersectionMocks');
    mockIntersectionObserver = IntersectionMocks.mockIntersectionObserver;
    simulateIntersection = IntersectionMocks.simulateIntersection;
    setClientRects = IntersectionMocks.setClientRects;
    mockRangeClientRects = IntersectionMocks.mockRangeClientRects;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // @gate enableFragmentRefs
  it('attaches a ref to Fragment', async () => {
    const fragmentRef = React.createRef();
    const root = ReactDOMClient.createRoot(container);

    await act(() =>
      root.render(
        <div id="parent">
          <Fragment ref={fragmentRef}>
            <div id="child">Hi</div>
          </Fragment>
        </div>,
      ),
    );
    expect(container.innerHTML).toEqual(
      '<div id="parent"><div id="child">Hi</div></div>',
    );

    expect(fragmentRef.current).not.toBe(null);
  });

  // @gate enableFragmentRefs
  it('accepts a ref callback', async () => {
    let fragmentRef;
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <Fragment ref={ref => (fragmentRef = ref)}>
          <div id="child">Hi</div>
        </Fragment>,
      );
    });

    expect(fragmentRef._fragmentFiber).toBeTruthy();
  });

  // @gate enableFragmentRefs
  it('is available in effects', async () => {
    function Test() {
      const fragmentRef = React.useRef(null);
      React.useLayoutEffect(() => {
        expect(fragmentRef.current).not.toBe(null);
      });
      React.useEffect(() => {
        expect(fragmentRef.current).not.toBe(null);
      });
      return (
        <Fragment ref={fragmentRef}>
          <div />
        </Fragment>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Test />));
  });

  // @gate enableFragmentRefs && enableFragmentRefsInstanceHandles
  it('attaches fragment handles to nodes', async () => {
    const fragmentParentRef = React.createRef();
    const fragmentRef = React.createRef();

    function Test({show}) {
      return (
        <Fragment ref={fragmentParentRef}>
          <Fragment ref={fragmentRef}>
            <div id="childA">A</div>
            <div id="childB">B</div>
          </Fragment>
          <div id="childC">C</div>
          {show && <div id="childD">D</div>}
        </Fragment>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Test show={false} />));

    const childA = document.querySelector('#childA');
    const childB = document.querySelector('#childB');
    const childC = document.querySelector('#childC');

    expect(childA.reactFragments.has(fragmentRef.current)).toBe(true);
    expect(childB.reactFragments.has(fragmentRef.current)).toBe(true);
    expect(childC.reactFragments.has(fragmentRef.current)).toBe(false);
    expect(childA.reactFragments.has(fragmentParentRef.current)).toBe(true);
    expect(childB.reactFragments.has(fragmentParentRef.current)).toBe(true);
    expect(childC.reactFragments.has(fragmentParentRef.current)).toBe(true);

    await act(() => root.render(<Test show={true} />));

    const childD = document.querySelector('#childD');
    expect(childD.reactFragments.has(fragmentRef.current)).toBe(false);
    expect(childD.reactFragments.has(fragmentParentRef.current)).toBe(true);
  });

  describe('focus methods', () => {
    describe('focus()', () => {
      // @gate enableFragmentRefs
      it('focuses the first focusable child', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <div>
              <Fragment ref={fragmentRef}>
                <div id="child-a" />
                <style>{`#child-c {}`}</style>
                <a id="child-b" href="/">
                  B
                </a>
                <a id="child-c" href="/">
                  C
                </a>
              </Fragment>
            </div>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement.id).toEqual('child-b');
        document.activeElement.blur();
      });

      // @gate enableFragmentRefs
      it('focuses deeply nested focusable children, depth first', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a">
                <div tabIndex={0} id="grandchild-a">
                  <a id="greatgrandchild-a" href="/" />
                </div>
              </div>
              <a id="child-b" href="/" />
            </Fragment>
          );
        }
        await act(() => {
          root.render(<Test />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement.id).toEqual('grandchild-a');
      });

      // @gate enableFragmentRefs
      it('preserves document order when adding and removing children', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test({showA, showB}) {
          return (
            <Fragment ref={fragmentRef}>
              {showA && <a href="/" id="child-a" />}
              {showB && <a href="/" id="child-b" />}
            </Fragment>
          );
        }

        // Render with A as the first focusable child
        await act(() => {
          root.render(<Test showA={true} showB={false} />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement.id).toEqual('child-a');
        document.activeElement.blur();
        // A is still the first focusable child, but B is also tracked
        await act(() => {
          root.render(<Test showA={true} showB={true} />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement.id).toEqual('child-a');
        document.activeElement.blur();

        // B is now the first focusable child
        await act(() => {
          root.render(<Test showA={false} showB={true} />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement.id).toEqual('child-b');
        document.activeElement.blur();
      });

      // @gate enableFragmentRefs
      it('keeps focus on the first focusable child if already focused', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <a id="child-a" href="/">
                A
              </a>
              <a id="child-b" href="/">
                B
              </a>
            </Fragment>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        // Focus the first child manually
        document.getElementById('child-a').focus();
        expect(document.activeElement.id).toEqual('child-a');

        // Calling fragment.focus() should keep focus on child-a,
        // not skip to child-b
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement.id).toEqual('child-a');
        document.activeElement.blur();
      });

      // @gate enableFragmentRefs
      it('keeps focus on a nested child if already focused', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <div>
                <input id="nested-input" />
              </div>
              <a id="sibling-link" href="/">
                Link
              </a>
            </Fragment>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        // Focus the nested input manually
        document.getElementById('nested-input').focus();
        expect(document.activeElement.id).toEqual('nested-input');

        // Calling fragment.focus() should keep focus on nested-input
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement.id).toEqual('nested-input');
        document.activeElement.blur();
      });

      // @gate enableFragmentRefs
      it('focuses the first focusable child in a fieldset', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <fieldset>
                <legend>Shipping</legend>
                <input id="street" name="street" />
                <input id="city" name="city" />
              </fieldset>
            </Fragment>
          );
        }

        await act(() => {
          root.render(<Test />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement.id).toEqual('street');
        document.activeElement.blur();
      });
    });

    describe('focusLast()', () => {
      // @gate enableFragmentRefs
      it('focuses the last focusable child', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <div>
              <Fragment ref={fragmentRef}>
                <a id="child-a" href="/">
                  A
                </a>
                <a id="child-b" href="/">
                  B
                </a>
                <Wrapper>
                  <a id="child-c" href="/">
                    C
                  </a>
                </Wrapper>
                <div id="child-d" />
                <style id="child-e">{`#child-d {}`}</style>
              </Fragment>
            </div>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        await act(() => {
          fragmentRef.current.focusLast();
        });
        expect(document.activeElement.id).toEqual('child-c');
        document.activeElement.blur();
      });

      // @gate enableFragmentRefs
      it('focuses deeply nested focusable children, depth first', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a" href="/">
                <a id="grandchild-a" href="/" />
                <a id="grandchild-b" href="/" />
              </div>
              <div tabIndex={0} id="child-b">
                <a id="grandchild-a" href="/" />
                <a id="grandchild-b" href="/" />
              </div>
            </Fragment>
          );
        }
        await act(() => {
          root.render(<Test />);
        });
        await act(() => {
          fragmentRef.current.focusLast();
        });
        expect(document.activeElement.id).toEqual('grandchild-b');
      });
    });

    describe('blur()', () => {
      // @gate enableFragmentRefs
      it('removes focus from an element inside of the Fragment', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <a id="child-a" href="/">
                A
              </a>
            </Fragment>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement.id).toEqual('child-a');

        await act(() => {
          fragmentRef.current.blur();
        });
        expect(document.activeElement).toEqual(document.body);
      });

      // @gate enableFragmentRefs
      it('does not remove focus from elements outside of the Fragment', async () => {
        const fragmentRefA = React.createRef();
        const fragmentRefB = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <Fragment ref={fragmentRefA}>
              <a id="child-a" href="/">
                A
              </a>
              <Fragment ref={fragmentRefB}>
                <a id="child-b" href="/">
                  B
                </a>
              </Fragment>
            </Fragment>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        await act(() => {
          fragmentRefA.current.focus();
        });
        expect(document.activeElement.id).toEqual('child-a');

        await act(() => {
          fragmentRefB.current.blur();
        });
        expect(document.activeElement.id).toEqual('child-a');
      });
    });
  });

  describe('events', () => {
    describe('add/remove event listeners', () => {
      // @gate enableFragmentRefs
      it('adds and removes event listeners from children', async () => {
        const parentRef = React.createRef();
        const fragmentRef = React.createRef();
        const childARef = React.createRef();
        const childBRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        let logs = [];

        function handleFragmentRefClicks() {
          logs.push('fragmentRef');
        }

        function Test() {
          React.useEffect(() => {
            fragmentRef.current.addEventListener(
              'click',
              handleFragmentRefClicks,
            );

            return () => {
              fragmentRef.current.removeEventListener(
                'click',
                handleFragmentRefClicks,
              );
            };
          }, []);
          return (
            <div ref={parentRef}>
              <Fragment ref={fragmentRef}>
                <>Text</>
                <div ref={childARef}>A</div>
                <>
                  <div ref={childBRef}>B</div>
                </>
              </Fragment>
            </div>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        childARef.current.addEventListener('click', () => {
          logs.push('A');
        });

        childBRef.current.addEventListener('click', () => {
          logs.push('B');
        });

        // Clicking on the parent should not trigger any listeners
        parentRef.current.click();
        expect(logs).toEqual([]);

        // Clicking a child triggers its own listeners and the Fragment's
        childARef.current.click();
        expect(logs).toEqual(['fragmentRef', 'A']);

        logs = [];

        childBRef.current.click();
        expect(logs).toEqual(['fragmentRef', 'B']);

        logs = [];

        fragmentRef.current.removeEventListener(
          'click',
          handleFragmentRefClicks,
        );

        childARef.current.click();
        expect(logs).toEqual(['A']);

        logs = [];

        childBRef.current.click();
        expect(logs).toEqual(['B']);
      });

      // @gate enableFragmentRefs
      it('adds and removes event listeners from children with multiple fragments', async () => {
        const fragmentRef = React.createRef();
        const nestedFragmentRef = React.createRef();
        const nestedFragmentRef2 = React.createRef();
        const childARef = React.createRef();
        const childBRef = React.createRef();
        const childCRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        await act(() => {
          root.render(
            <div>
              <Fragment ref={fragmentRef}>
                <div ref={childARef}>A</div>
                <div>
                  <Fragment ref={nestedFragmentRef}>
                    <div ref={childBRef}>B</div>
                  </Fragment>
                </div>
                <Fragment ref={nestedFragmentRef2}>
                  <div ref={childCRef}>C</div>
                </Fragment>
              </Fragment>
            </div>,
          );
        });

        let logs = [];

        function handleFragmentRefClicks() {
          logs.push('fragmentRef');
        }

        function handleNestedFragmentRefClicks() {
          logs.push('nestedFragmentRef');
        }

        function handleNestedFragmentRef2Clicks() {
          logs.push('nestedFragmentRef2');
        }

        fragmentRef.current.addEventListener('click', handleFragmentRefClicks);
        nestedFragmentRef.current.addEventListener(
          'click',
          handleNestedFragmentRefClicks,
        );
        nestedFragmentRef2.current.addEventListener(
          'click',
          handleNestedFragmentRef2Clicks,
        );

        childBRef.current.click();
        // Event bubbles to the parent fragment
        expect(logs).toEqual(['nestedFragmentRef', 'fragmentRef']);

        logs = [];

        childARef.current.click();
        expect(logs).toEqual(['fragmentRef']);

        logs = [];
        childCRef.current.click();
        expect(logs).toEqual(['fragmentRef', 'nestedFragmentRef2']);

        logs = [];

        fragmentRef.current.removeEventListener(
          'click',
          handleFragmentRefClicks,
        );
        nestedFragmentRef.current.removeEventListener(
          'click',
          handleNestedFragmentRefClicks,
        );
        childCRef.current.click();
        expect(logs).toEqual(['nestedFragmentRef2']);
      });

      // @gate enableFragmentRefs
      it('adds an event listener to a newly added child', async () => {
        const fragmentRef = React.createRef();
        const childRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);
        let showChild;

        function Component() {
          const [shouldShowChild, setShouldShowChild] = React.useState(false);
          showChild = () => {
            setShouldShowChild(true);
          };

          return (
            <div>
              <Fragment ref={fragmentRef}>
                <div id="a">A</div>
                {shouldShowChild && (
                  <div ref={childRef} id="b">
                    B
                  </div>
                )}
              </Fragment>
            </div>
          );
        }

        await act(() => {
          root.render(<Component />);
        });

        expect(fragmentRef.current).not.toBe(null);
        expect(childRef.current).toBe(null);

        let hasClicked = false;
        fragmentRef.current.addEventListener('click', () => {
          hasClicked = true;
        });

        await act(() => {
          showChild();
        });
        expect(childRef.current).not.toBe(null);

        childRef.current.click();
        expect(hasClicked).toBe(true);
      });

      // @gate enableFragmentRefs
      it('applies event listeners to host children nested within non-host children', async () => {
        const fragmentRef = React.createRef();
        const childRef = React.createRef();
        const nestedChildRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        await act(() => {
          root.render(
            <div>
              <Fragment ref={fragmentRef}>
                <div ref={childRef}>Host A</div>
                <Wrapper>
                  <Wrapper>
                    <Wrapper>
                      <div ref={nestedChildRef}>Host B</div>
                    </Wrapper>
                  </Wrapper>
                </Wrapper>
              </Fragment>
            </div>,
          );
        });
        const logs = [];
        fragmentRef.current.addEventListener('click', e => {
          logs.push(e.target.textContent);
        });

        expect(logs).toEqual([]);
        childRef.current.click();
        expect(logs).toEqual(['Host A']);
        nestedChildRef.current.click();
        expect(logs).toEqual(['Host A', 'Host B']);
      });

      // @gate enableFragmentRefs
      it('allows adding and cleaning up listeners in effects', async () => {
        const root = ReactDOMClient.createRoot(container);

        let logs = [];
        function logClick(e) {
          logs.push(e.currentTarget.id);
        }

        let rerender;
        let removeEventListeners;

        function Test() {
          const fragmentRef = React.useRef(null);
          // eslint-disable-next-line no-unused-vars
          const [_, setState] = React.useState(0);
          rerender = () => {
            setState(p => p + 1);
          };
          removeEventListeners = () => {
            fragmentRef.current.removeEventListener('click', logClick);
          };
          React.useEffect(() => {
            fragmentRef.current.addEventListener('click', logClick);

            return removeEventListeners;
          });

          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a" />
            </Fragment>
          );
        }

        // The event listener was applied
        await act(() => root.render(<Test />));
        expect(logs).toEqual([]);
        document.querySelector('#child-a').click();
        expect(logs).toEqual(['child-a']);

        // The event listener can be removed and re-added
        logs = [];
        await act(rerender);
        document.querySelector('#child-a').click();
        expect(logs).toEqual(['child-a']);
      });

      // @gate enableFragmentRefs
      it('does not apply removed event listeners to new children', async () => {
        const root = ReactDOMClient.createRoot(container);
        const fragmentRef = React.createRef(null);
        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a" />
            </Fragment>
          );
        }

        let logs = [];
        function logClick(e) {
          logs.push(e.currentTarget.id);
        }
        await act(() => {
          root.render(<Test />);
        });
        fragmentRef.current.addEventListener('click', logClick);
        const childA = document.querySelector('#child-a');
        childA.click();
        expect(logs).toEqual(['child-a']);

        logs = [];
        fragmentRef.current.removeEventListener('click', logClick);
        childA.click();
        expect(logs).toEqual([]);
      });

      // @gate enableFragmentRefs
      it('removes a capture listener registered with boolean when removed with options object', async () => {
        const fragmentRef = React.createRef(null);
        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a" />
            </Fragment>
          );
        }
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<Test />);
        });

        const logs = [];
        function logCapture() {
          logs.push('capture');
        }

        // Register with boolean `true` (capture phase)
        fragmentRef.current.addEventListener('click', logCapture, true);
        document.querySelector('#child-a').click();
        expect(logs).toEqual(['capture']);

        logs.length = 0;

        // Remove with equivalent options object {capture: true}
        // Per DOM spec, these are identical - the listener MUST be removed
        fragmentRef.current.removeEventListener('click', logCapture, {
          capture: true,
        });
        document.querySelector('#child-a').click();
        // Listener should have been removed - logs must remain empty
        expect(logs).toEqual([]);
      });

      // @gate enableFragmentRefs
      it('removes a capture listener registered with options object when removed with boolean', async () => {
        const fragmentRef = React.createRef(null);
        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-b" />
            </Fragment>
          );
        }
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<Test />);
        });

        const logs = [];
        function logCapture() {
          logs.push('capture');
        }

        // Register with options object {capture: true}
        fragmentRef.current.addEventListener('click', logCapture, {
          capture: true,
        });
        document.querySelector('#child-b').click();
        expect(logs).toEqual(['capture']);

        logs.length = 0;

        // Remove with boolean `true`
        // Per DOM spec, these are identical - the listener MUST be removed
        fragmentRef.current.removeEventListener('click', logCapture, true);
        document.querySelector('#child-b').click();
        // Listener should have been removed - logs must remain empty
        expect(logs).toEqual([]);
      });

      // @gate enableFragmentRefs
      it('applies event listeners to portaled children', async () => {
        const fragmentRef = React.createRef();
        const childARef = React.createRef();
        const childBRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a" ref={childARef} />
              {createPortal(
                <div id="child-b" ref={childBRef} />,
                document.body,
              )}
            </Fragment>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        const logs = [];
        fragmentRef.current.addEventListener('click', e => {
          logs.push(e.target.id);
        });

        childARef.current.click();
        expect(logs).toEqual(['child-a']);

        logs.length = 0;
        childBRef.current.click();
        expect(logs).toEqual(['child-b']);
      });

      describe('with activity', () => {
        // @gate enableFragmentRefs
        it('does not apply event listeners to hidden trees', async () => {
          const parentRef = React.createRef();
          const fragmentRef = React.createRef();
          const root = ReactDOMClient.createRoot(container);

          function Test() {
            return (
              <div ref={parentRef}>
                <Fragment ref={fragmentRef}>
                  <div>Child 1</div>
                  <Activity mode="hidden">
                    <div>Child 2</div>
                  </Activity>
                  <div>Child 3</div>
                </Fragment>
              </div>
            );
          }

          await act(() => {
            root.render(<Test />);
          });

          const logs = [];
          fragmentRef.current.addEventListener('click', e => {
            logs.push(e.target.textContent);
          });

          const [child1, child2, child3] = parentRef.current.children;
          child1.click();
          child2.click();
          child3.click();
          expect(logs).toEqual(['Child 1', 'Child 3']);
        });

        // @gate enableFragmentRefs
        it('applies event listeners to visible trees', async () => {
          const parentRef = React.createRef();
          const fragmentRef = React.createRef();
          const root = ReactDOMClient.createRoot(container);

          function Test() {
            return (
              <div ref={parentRef}>
                <Fragment ref={fragmentRef}>
                  <div>Child 1</div>
                  <Activity mode="visible">
                    <div>Child 2</div>
                  </Activity>
                  <div>Child 3</div>
                </Fragment>
              </div>
            );
          }

          await act(() => {
            root.render(<Test />);
          });

          const logs = [];
          fragmentRef.current.addEventListener('click', e => {
            logs.push(e.target.textContent);
          });

          const [child1, child2, child3] = parentRef.current.children;
          child1.click();
          child2.click();
          child3.click();
          expect(logs).toEqual(['Child 1', 'Child 2', 'Child 3']);
        });

        // @gate enableFragmentRefs
        it('handles Activity modes switching', async () => {
          const fragmentRef = React.createRef();
          const fragmentRef2 = React.createRef();
          const parentRef = React.createRef();
          const root = ReactDOMClient.createRoot(container);

          function Test({mode}) {
            return (
              <div id="parent" ref={parentRef}>
                <Fragment ref={fragmentRef}>
                  <Activity mode={mode}>
                    <div id="child1">Child</div>
                    <Fragment ref={fragmentRef2}>
                      <div id="child2">Child 2</div>
                    </Fragment>
                  </Activity>
                </Fragment>
              </div>
            );
          }

          await act(() => {
            root.render(<Test mode="visible" />);
          });

          let logs = [];
          fragmentRef.current.addEventListener('click', () => {
            logs.push('clicked 1');
          });
          fragmentRef2.current.addEventListener('click', () => {
            logs.push('clicked 2');
          });
          parentRef.current.lastChild.click();
          expect(logs).toEqual(['clicked 1', 'clicked 2']);

          logs = [];
          await act(() => {
            root.render(<Test mode="hidden" />);
          });
          parentRef.current.firstChild.click();
          parentRef.current.lastChild.click();
          expect(logs).toEqual([]);

          logs = [];
          await act(() => {
            root.render(<Test mode="visible" />);
          });
          parentRef.current.lastChild.click();
          // Event order is flipped here because the nested child re-registers first
          expect(logs).toEqual(['clicked 2', 'clicked 1']);
        });
      });
    });

    describe('dispatchEvent()', () => {
      // @gate enableFragmentRefs
      it('fires events on the host parent if bubbles=true', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);
        let logs = [];

        function handleClick(e) {
          logs.push([e.type, e.target.id, e.currentTarget.id]);
        }

        function Test({isMounted}) {
          return (
            <div onClick={handleClick} id="grandparent">
              <div onClick={handleClick} id="parent">
                {isMounted && (
                  <Fragment ref={fragmentRef}>
                    <div onClick={handleClick} id="child">
                      Hi
                    </div>
                  </Fragment>
                )}
              </div>
            </div>
          );
        }

        await act(() => {
          root.render(<Test isMounted={true} />);
        });

        let isCancelable = !fragmentRef.current.dispatchEvent(
          new MouseEvent('click', {bubbles: true}),
        );
        expect(logs).toEqual([
          ['click', 'parent', 'parent'],
          ['click', 'parent', 'grandparent'],
        ]);
        expect(isCancelable).toBe(false);

        const fragmentInstanceHandle = fragmentRef.current;
        await act(() => {
          root.render(<Test isMounted={false} />);
        });
        logs = [];
        isCancelable = !fragmentInstanceHandle.dispatchEvent(
          new MouseEvent('click', {bubbles: true}),
        );
        expect(logs).toEqual([]);
        expect(isCancelable).toBe(false);

        logs = [];
        isCancelable = !fragmentInstanceHandle.dispatchEvent(
          new MouseEvent('click', {bubbles: false}),
        );
        expect(logs).toEqual([]);
        expect(isCancelable).toBe(false);
      });

      // @gate enableFragmentRefs
      it('fires events on self, and only self if bubbles=false', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);
        let logs = [];

        function handleClick(e) {
          logs.push([e.type, e.target.id, e.currentTarget.id]);
        }

        function Test() {
          return (
            <div id="parent" onClick={handleClick}>
              <Fragment ref={fragmentRef} />
            </div>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        fragmentRef.current.addEventListener('click', handleClick);

        fragmentRef.current.dispatchEvent(
          new MouseEvent('click', {bubbles: true}),
        );
        expect(logs).toEqual([
          ['click', undefined, undefined],
          ['click', 'parent', 'parent'],
        ]);

        logs = [];

        fragmentRef.current.dispatchEvent(
          new MouseEvent('click', {bubbles: false}),
        );
        expect(logs).toEqual([['click', undefined, undefined]]);
      });
    });
  });

  describe('observers', () => {
    beforeEach(() => {
      mockIntersectionObserver();
    });

    // @gate enableFragmentRefs
    it('attaches intersection observers to children', async () => {
      let logs = [];
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          logs.push(entry.target.id);
        });
      });
      function Test({showB}) {
        const fragmentRef = React.useRef(null);
        React.useEffect(() => {
          fragmentRef.current.observeUsing(observer);
          const lastRefValue = fragmentRef.current;
          return () => {
            lastRefValue.unobserveUsing(observer);
          };
        }, []);
        return (
          <div id="parent">
            <React.Fragment ref={fragmentRef}>
              <div id="childA">A</div>
              {showB && <div id="childB">B</div>}
            </React.Fragment>
          </div>
        );
      }

      function simulateAllChildrenIntersecting() {
        const parent = container.firstChild;
        if (parent) {
          const children = Array.from(parent.children).map(child => {
            return [child, {y: 0, x: 0, width: 1, height: 1}, 1];
          });
          simulateIntersection(...children);
        }
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Test showB={false} />));
      simulateAllChildrenIntersecting();
      expect(logs).toEqual(['childA']);

      // Reveal child and expect it to be observed
      logs = [];
      await act(() => root.render(<Test showB={true} />));
      simulateAllChildrenIntersecting();
      expect(logs).toEqual(['childA', 'childB']);

      // Hide child and expect it to be unobserved
      logs = [];
      await act(() => root.render(<Test showB={false} />));
      simulateAllChildrenIntersecting();
      expect(logs).toEqual(['childA']);

      // Unmount component and expect all children to be unobserved
      logs = [];
      await act(() => root.render(null));
      simulateAllChildrenIntersecting();
      expect(logs).toEqual([]);
    });

    // @gate enableFragmentRefs
    it('warns when unobserveUsing() is called with an observer that was not observed', async () => {
      const fragmentRef = React.createRef();
      const observer = new IntersectionObserver(() => {});
      const observer2 = new IntersectionObserver(() => {});
      function Test() {
        return (
          <React.Fragment ref={fragmentRef}>
            <div />
          </React.Fragment>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Test />));

      // Warning when there is no attached observer
      fragmentRef.current.unobserveUsing(observer);
      assertConsoleErrorDev([
        'You are calling unobserveUsing() with an observer that is not being observed with this fragment ' +
          'instance. First attach the observer with observeUsing()',
      ]);

      // Warning when the attached observer does not match
      fragmentRef.current.observeUsing(observer);
      fragmentRef.current.unobserveUsing(observer2);
      assertConsoleErrorDev([
        'You are calling unobserveUsing() with an observer that is not being observed with this fragment ' +
          'instance. First attach the observer with observeUsing()',
      ]);
    });

    // @gate enableFragmentRefs && enableFragmentRefsInstanceHandles
    it('attaches handles to observed elements to allow caching of observers', async () => {
      const targetToCallbackMap = new WeakMap();
      let cachedObserver = null;
      function createObserverIfNeeded(fragmentInstance, onIntersection) {
        const callbacks = targetToCallbackMap.get(fragmentInstance);
        targetToCallbackMap.set(
          fragmentInstance,
          callbacks ? [...callbacks, onIntersection] : [onIntersection],
        );
        if (cachedObserver !== null) {
          return cachedObserver;
        }
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            const fragmentInstances = entry.target.reactFragments;
            if (fragmentInstances) {
              Array.from(fragmentInstances).forEach(fInstance => {
                const cbs = targetToCallbackMap.get(fInstance) || [];
                cbs.forEach(callback => {
                  callback(entry);
                });
              });
            }

            targetToCallbackMap.get(entry.target)?.forEach(callback => {
              callback(entry);
            });
          });
        });
        cachedObserver = observer;
        return observer;
      }

      function IntersectionObserverFragment({onIntersection, children}) {
        const fragmentRef = React.useRef(null);
        React.useLayoutEffect(() => {
          const observer = createObserverIfNeeded(
            fragmentRef.current,
            onIntersection,
          );
          fragmentRef.current.observeUsing(observer);
          const lastRefValue = fragmentRef.current;
          return () => {
            lastRefValue.unobserveUsing(observer);
          };
        }, []);
        return <React.Fragment ref={fragmentRef}>{children}</React.Fragment>;
      }

      let logs = [];
      function logIntersection(id) {
        logs.push(`observe: ${id}`);
      }

      function ChildWithManualIO({id}) {
        const divRef = React.useRef(null);
        React.useLayoutEffect(() => {
          const observer = createObserverIfNeeded(divRef.current, entry => {
            logIntersection(id);
          });
          observer.observe(divRef.current);
          return () => {
            observer.unobserve(divRef.current);
          };
        }, []);
        return (
          <div id={id} ref={divRef}>
            {id}
          </div>
        );
      }

      function Test() {
        return (
          <>
            <IntersectionObserverFragment
              onIntersection={() => logIntersection('grandparent')}>
              <IntersectionObserverFragment
                onIntersection={() => logIntersection('parentA')}>
                <div id="childA">A</div>
              </IntersectionObserverFragment>
            </IntersectionObserverFragment>
            <IntersectionObserverFragment
              onIntersection={() => logIntersection('parentB')}>
              <div id="childB">B</div>
              <ChildWithManualIO id="childC" />
            </IntersectionObserverFragment>
          </>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Test />));

      simulateIntersection([
        container.querySelector('#childA'),
        {y: 0, x: 0, width: 1, height: 1},
        1,
      ]);
      expect(logs).toEqual(['observe: grandparent', 'observe: parentA']);

      logs = [];

      simulateIntersection([
        container.querySelector('#childB'),
        {y: 0, x: 0, width: 1, height: 1},
        1,
      ]);
      expect(logs).toEqual(['observe: parentB']);

      logs = [];
      simulateIntersection([
        container.querySelector('#childC'),
        {y: 0, x: 0, width: 1, height: 1},
        1,
      ]);
      expect(logs).toEqual(['observe: parentB', 'observe: childC']);
    });
  });

  describe('getClientRects', () => {
    // @gate enableFragmentRefs
    it('returns the bounding client rects of all children', async () => {
      const fragmentRef = React.createRef();
      const childARef = React.createRef();
      const childBRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      function Test() {
        return (
          <React.Fragment ref={fragmentRef}>
            <div ref={childARef} />
            <div ref={childBRef} />
          </React.Fragment>
        );
      }

      await act(() => root.render(<Test />));
      setClientRects(childARef.current, [
        {
          x: 1,
          y: 2,
          width: 3,
          height: 4,
        },
        {
          x: 5,
          y: 6,
          width: 7,
          height: 8,
        },
      ]);
      setClientRects(childBRef.current, [{x: 9, y: 10, width: 11, height: 12}]);
      const clientRects = fragmentRef.current.getClientRects();
      expect(clientRects.length).toBe(3);
      expect(clientRects[0].left).toBe(1);
      expect(clientRects[1].left).toBe(5);
      expect(clientRects[2].left).toBe(9);
    });
  });

  describe('getRootNode', () => {
    // @gate enableFragmentRefs
    it('returns the root node of the parent', async () => {
      const fragmentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      function Test() {
        return (
          <div>
            <React.Fragment ref={fragmentRef}>
              <div />
            </React.Fragment>
          </div>
        );
      }

      await act(() => root.render(<Test />));
      expect(fragmentRef.current.getRootNode()).toBe(document);
    });

    // The desired behavior here is to return the topmost disconnected element when
    // fragment + parent are unmounted. Currently we have a pass during unmount that
    // recursively cleans up return pointers of the whole tree. We can change this
    // with a future refactor. See: https://github.com/facebook/react/pull/32682#discussion_r2008313082
    // @gate enableFragmentRefs
    it('returns the topmost disconnected element if the fragment and parent are unmounted', async () => {
      const containerRef = React.createRef();
      const parentRef = React.createRef();
      const fragmentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      function Test({mounted}) {
        return (
          <div ref={containerRef} id="container">
            {mounted && (
              <div ref={parentRef} id="parent">
                <React.Fragment ref={fragmentRef}>
                  <div />
                </React.Fragment>
              </div>
            )}
          </div>
        );
      }

      await act(() => root.render(<Test mounted={true} />));
      expect(fragmentRef.current.getRootNode()).toBe(document);
      const fragmentHandle = fragmentRef.current;
      await act(() => root.render(<Test mounted={false} />));
      // TODO: The commented out assertion is the desired behavior. For now, we return
      // the fragment instance itself. This is currently the same behavior if you unmount
      // the fragment but not the parent. See context above.
      // expect(fragmentHandle.getRootNode().id).toBe(parentRefHandle.id);
      expect(fragmentHandle.getRootNode()).toBe(fragmentHandle);
    });

    // @gate enableFragmentRefs
    it('returns self when only the fragment was unmounted', async () => {
      const fragmentRef = React.createRef();
      const parentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      function Test({mounted}) {
        return (
          <div ref={parentRef} id="parent">
            {mounted && (
              <React.Fragment ref={fragmentRef}>
                <div />
              </React.Fragment>
            )}
          </div>
        );
      }

      await act(() => root.render(<Test mounted={true} />));
      expect(fragmentRef.current.getRootNode()).toBe(document);
      const fragmentHandle = fragmentRef.current;
      await act(() => root.render(<Test mounted={false} />));
      expect(fragmentHandle.getRootNode()).toBe(fragmentHandle);
    });
  });

  describe('compareDocumentPosition', () => {
    function expectPosition(position, spec) {
      const positionResult = {
        following: (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        preceding: (position & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
        contains: (position & Node.DOCUMENT_POSITION_CONTAINS) !== 0,
        containedBy: (position & Node.DOCUMENT_POSITION_CONTAINED_BY) !== 0,
        disconnected: (position & Node.DOCUMENT_POSITION_DISCONNECTED) !== 0,
        implementationSpecific:
          (position & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC) !== 0,
      };
      expect(positionResult).toEqual(spec);
    }
    // @gate enableFragmentRefs
    it('returns the relationship between the fragment instance and a given node', async () => {
      const fragmentRef = React.createRef();
      const beforeRef = React.createRef();
      const afterRef = React.createRef();
      const middleChildRef = React.createRef();
      const firstChildRef = React.createRef();
      const lastChildRef = React.createRef();
      const containerRef = React.createRef();
      const disconnectedElement = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      function Test() {
        return (
          <div ref={containerRef} id="container">
            <div ref={beforeRef} id="before" />
            <React.Fragment ref={fragmentRef}>
              <div ref={firstChildRef} id="first" />
              <div ref={middleChildRef} id="middle" />
              <div ref={lastChildRef} id="last" />
            </React.Fragment>
            <div ref={afterRef} id="after" />
          </div>
        );
      }

      await act(() => root.render(<Test />));

      // document.body is preceding and contains the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(document.body),
        {
          preceding: true,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      // beforeRef is preceding the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(beforeRef.current),
        {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      // afterRef is following the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(afterRef.current),
        {
          preceding: false,
          following: true,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      // firstChildRef is contained by the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(firstChildRef.current),
        {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      // middleChildRef is contained by the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(middleChildRef.current),
        {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      // lastChildRef is contained by the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(lastChildRef.current),
        {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      // containerRef precedes and contains the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(containerRef.current),
        {
          preceding: true,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      expectPosition(
        fragmentRef.current.compareDocumentPosition(disconnectedElement),
        {
          preceding: false,
          following: true,
          contains: false,
          containedBy: false,
          disconnected: true,
          implementationSpecific: true,
        },
      );
    });

    // @gate enableFragmentRefs
    it('handles fragment instances with one child', async () => {
      const fragmentRef = React.createRef();
      const beforeRef = React.createRef();
      const afterRef = React.createRef();
      const containerRef = React.createRef();
      const onlyChildRef = React.createRef();
      const disconnectedElement = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      function Test() {
        return (
          <div id="container" ref={containerRef}>
            <div id="innercontainer">
              <div ref={beforeRef} id="before" />
              <React.Fragment ref={fragmentRef}>
                <div ref={onlyChildRef} id="within" />
              </React.Fragment>
              <div id="after" ref={afterRef} />
            </div>
          </div>
        );
      }

      await act(() => root.render(<Test />));
      expectPosition(
        fragmentRef.current.compareDocumentPosition(beforeRef.current),
        {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(afterRef.current),
        {
          preceding: false,
          following: true,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(onlyChildRef.current),
        {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(containerRef.current),
        {
          preceding: true,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(disconnectedElement),
        {
          preceding: false,
          following: true,
          contains: false,
          containedBy: false,
          disconnected: true,
          implementationSpecific: true,
        },
      );
    });

    // @gate enableFragmentRefs
    it('handles empty fragment instances', async () => {
      const fragmentRef = React.createRef();
      const beforeParentRef = React.createRef();
      const beforeRef = React.createRef();
      const afterRef = React.createRef();
      const afterParentRef = React.createRef();
      const containerRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      function Test() {
        return (
          <>
            <div id="before-container" ref={beforeParentRef} />
            <div id="container" ref={containerRef}>
              <div id="before" ref={beforeRef} />
              <React.Fragment ref={fragmentRef} />
              <div id="after" ref={afterRef} />
            </div>
            <div id="after-container" ref={afterParentRef} />
          </>
        );
      }

      await act(() => root.render(<Test />));

      expectPosition(
        fragmentRef.current.compareDocumentPosition(document.body),
        {
          preceding: true,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(beforeRef.current),
        {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(beforeParentRef.current),
        {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(afterRef.current),
        {
          preceding: false,
          following: true,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(afterParentRef.current),
        {
          preceding: false,
          following: true,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(containerRef.current),
        {
          preceding: false,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        },
      );
    });

    // @gate enableFragmentRefs
    it('handles nested children', async () => {
      const fragmentRef = React.createRef();
      const nestedFragmentRef = React.createRef();
      const childARef = React.createRef();
      const childBRef = React.createRef();
      const childCRef = React.createRef();
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);

      function Child() {
        return (
          <div ref={childCRef} id="C">
            C
          </div>
        );
      }

      function Test() {
        return (
          <React.Fragment ref={fragmentRef}>
            <div ref={childARef} id="A">
              A
            </div>
            <React.Fragment ref={nestedFragmentRef}>
              <div ref={childBRef} id="B">
                B
              </div>
            </React.Fragment>
            <Child />
          </React.Fragment>
        );
      }

      await act(() => root.render(<Test />));

      expectPosition(
        fragmentRef.current.compareDocumentPosition(childARef.current),
        {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(childBRef.current),
        {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        },
      );
      expectPosition(
        fragmentRef.current.compareDocumentPosition(childCRef.current),
        {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        },
      );
    });

    // @gate enableFragmentRefs
    it('returns disconnected for comparison with an unmounted fragment instance', async () => {
      const fragmentRef = React.createRef();
      const containerRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      function Test({mount}) {
        return (
          <div ref={containerRef}>
            {mount && (
              <Fragment ref={fragmentRef}>
                <div />
              </Fragment>
            )}
          </div>
        );
      }

      await act(() => root.render(<Test mount={true} />));

      const fragmentHandle = fragmentRef.current;

      expectPosition(
        fragmentHandle.compareDocumentPosition(containerRef.current),
        {
          preceding: true,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      await act(() => {
        root.render(<Test mount={false} />);
      });

      expectPosition(
        fragmentHandle.compareDocumentPosition(containerRef.current),
        {
          preceding: false,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: true,
          implementationSpecific: false,
        },
      );
    });

    // @gate enableFragmentRefs
    it('compares a root-level Fragment', async () => {
      const fragmentRef = React.createRef();
      const emptyFragmentRef = React.createRef();
      const childRef = React.createRef();
      const siblingPrecedingRef = React.createRef();
      const siblingFollowingRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      function Test() {
        return (
          <Fragment>
            <div ref={siblingPrecedingRef} />
            <Fragment ref={fragmentRef}>
              <div ref={childRef} />
            </Fragment>
            <Fragment ref={emptyFragmentRef} />
            <div ref={siblingFollowingRef} />
          </Fragment>
        );
      }

      await act(() => root.render(<Test />));

      const fragmentInstance = fragmentRef.current;
      if (fragmentInstance == null) {
        throw new Error('Expected fragment instance to be non-null');
      }
      const emptyFragmentInstance = emptyFragmentRef.current;
      if (emptyFragmentInstance == null) {
        throw new Error('Expected empty fragment instance to be non-null');
      }

      expectPosition(
        fragmentInstance.compareDocumentPosition(childRef.current),
        {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      expectPosition(
        fragmentInstance.compareDocumentPosition(siblingPrecedingRef.current),
        {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      expectPosition(
        fragmentInstance.compareDocumentPosition(siblingFollowingRef.current),
        {
          preceding: false,
          following: true,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      expectPosition(
        emptyFragmentInstance.compareDocumentPosition(childRef.current),
        {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        },
      );

      expectPosition(
        emptyFragmentInstance.compareDocumentPosition(
          siblingPrecedingRef.current,
        ),
        {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        },
      );

      expectPosition(
        emptyFragmentInstance.compareDocumentPosition(
          siblingFollowingRef.current,
        ),
        {
          preceding: false,
          following: true,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        },
      );
    });

    describe('with portals', () => {
      // @gate enableFragmentRefs
      it('handles portaled elements', async () => {
        const fragmentRef = React.createRef();
        const portaledSiblingRef = React.createRef();
        const portaledChildRef = React.createRef();

        function Test() {
          return (
            <div id="wrapper">
              {createPortal(<div ref={portaledSiblingRef} id="A" />, container)}
              <Fragment ref={fragmentRef}>
                {createPortal(<div ref={portaledChildRef} id="B" />, container)}
                <div id="C" />
              </Fragment>
            </div>
          );
        }

        const root = ReactDOMClient.createRoot(container);
        await act(() => root.render(<Test />));

        // The sibling is preceding in both the DOM and the React tree
        expectPosition(
          fragmentRef.current.compareDocumentPosition(
            portaledSiblingRef.current,
          ),
          {
            preceding: true,
            following: false,
            contains: false,
            containedBy: false,
            disconnected: false,
            implementationSpecific: false,
          },
        );

        // The child is contained by in the React tree but not in the DOM
        expectPosition(
          fragmentRef.current.compareDocumentPosition(portaledChildRef.current),
          {
            preceding: false,
            following: false,
            contains: false,
            containedBy: false,
            disconnected: false,
            implementationSpecific: true,
          },
        );
      });

      // @gate enableFragmentRefs
      it('handles multiple portals to the same element', async () => {
        const root = ReactDOMClient.createRoot(container);
        const fragmentRef = React.createRef();
        const childARef = React.createRef();
        const childBRef = React.createRef();
        const childCRef = React.createRef();
        const childDRef = React.createRef();
        const childERef = React.createRef();

        function Test() {
          const [c, setC] = React.useState(false);
          React.useEffect(() => {
            setC(true);
          });

          return (
            <>
              {createPortal(
                <Fragment ref={fragmentRef}>
                  <div id="A" ref={childARef} />
                  {c ? (
                    <div id="C" ref={childCRef}>
                      <div id="D" ref={childDRef} />
                    </div>
                  ) : null}
                </Fragment>,
                document.body,
              )}
              {createPortal(<p id="B" ref={childBRef} />, document.body)}
              <div id="E" ref={childERef} />
            </>
          );
        }

        await act(() => root.render(<Test />));

        // Due to effect, order is E / A->B->C->D
        expect(document.body.outerHTML).toBe(
          '<body>' +
            '<div><div id="E"></div></div>' +
            '<div id="A"></div>' +
            '<p id="B"></p>' +
            '<div id="C"><div id="D"></div></div>' +
            '</body>',
        );

        expectPosition(
          fragmentRef.current.compareDocumentPosition(document.body),
          {
            preceding: true,
            following: false,
            contains: true,
            containedBy: false,
            disconnected: false,
            implementationSpecific: false,
          },
        );
        expectPosition(
          fragmentRef.current.compareDocumentPosition(childARef.current),
          {
            preceding: false,
            following: false,
            contains: false,
            containedBy: true,
            disconnected: false,
            implementationSpecific: false,
          },
        );
        // Contained by in DOM, but following in React tree
        expectPosition(
          fragmentRef.current.compareDocumentPosition(childBRef.current),
          {
            preceding: false,
            following: false,
            contains: false,
            containedBy: false,
            disconnected: false,
            implementationSpecific: true,
          },
        );
        expectPosition(
          fragmentRef.current.compareDocumentPosition(childCRef.current),
          {
            preceding: false,
            following: false,
            contains: false,
            containedBy: true,
            disconnected: false,
            implementationSpecific: false,
          },
        );
        expectPosition(
          fragmentRef.current.compareDocumentPosition(childDRef.current),
          {
            preceding: false,
            following: false,
            contains: false,
            containedBy: true,
            disconnected: false,
            implementationSpecific: false,
          },
        );
        // Preceding DOM but following in React tree
        expectPosition(
          fragmentRef.current.compareDocumentPosition(childERef.current),
          {
            preceding: false,
            following: false,
            contains: false,
            containedBy: false,
            disconnected: false,
            implementationSpecific: true,
          },
        );
      });

      // @gate enableFragmentRefs
      it('handles empty fragments', async () => {
        const fragmentRef = React.createRef();
        const childARef = React.createRef();
        const childBRef = React.createRef();

        function Test() {
          return (
            <>
              <div id="A" ref={childARef} />
              {createPortal(<Fragment ref={fragmentRef} />, document.body)}
              <div id="B" ref={childBRef} />
            </>
          );
        }

        const root = ReactDOMClient.createRoot(container);
        await act(() => root.render(<Test />));

        expectPosition(
          fragmentRef.current.compareDocumentPosition(document.body),
          {
            preceding: true,
            following: false,
            contains: true,
            containedBy: false,
            disconnected: false,
            implementationSpecific: true,
          },
        );
        expectPosition(
          fragmentRef.current.compareDocumentPosition(childARef.current),
          {
            preceding: true,
            following: false,
            contains: false,
            containedBy: false,
            disconnected: false,
            implementationSpecific: true,
          },
        );
        expectPosition(
          fragmentRef.current.compareDocumentPosition(childBRef.current),
          {
            preceding: true,
            following: false,
            contains: false,
            containedBy: false,
            disconnected: false,
            implementationSpecific: true,
          },
        );
      });
    });
  });

  describe('scrollIntoView', () => {
    function expectLast(arr, test) {
      expect(arr[arr.length - 1]).toBe(test);
    }
    // @gate enableFragmentRefs && enableFragmentRefsScrollIntoView
    it('does not yet support options', async () => {
      const fragmentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Fragment ref={fragmentRef} />);
      });

      expect(() => {
        fragmentRef.current.scrollIntoView({block: 'start'});
      }).toThrowError(
        'FragmentInstance.scrollIntoView() does not support ' +
          'scrollIntoViewOptions. Use the alignToTop boolean instead.',
      );
    });

    describe('with children', () => {
      // @gate enableFragmentRefs && enableFragmentRefsScrollIntoView
      it('settles scroll on the first child by default, or if alignToTop=true', async () => {
        const fragmentRef = React.createRef();
        const childARef = React.createRef();
        const childBRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            <React.Fragment ref={fragmentRef}>
              <div ref={childARef} id="a">
                A
              </div>
              <div ref={childBRef} id="b">
                B
              </div>
            </React.Fragment>,
          );
        });

        let logs = [];
        childARef.current.scrollIntoView = jest.fn().mockImplementation(() => {
          logs.push('childA');
        });
        childBRef.current.scrollIntoView = jest.fn().mockImplementation(() => {
          logs.push('childB');
        });

        // Default call
        fragmentRef.current.scrollIntoView();
        expectLast(logs, 'childA');
        logs = [];
        // alignToTop=true
        fragmentRef.current.scrollIntoView(true);
        expectLast(logs, 'childA');
      });

      // @gate enableFragmentRefs && enableFragmentRefsScrollIntoView
      it('calls scrollIntoView on the last child if alignToTop is false', async () => {
        const fragmentRef = React.createRef();
        const childARef = React.createRef();
        const childBRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            <Fragment ref={fragmentRef}>
              <div ref={childARef}>A</div>
              <div ref={childBRef}>B</div>
            </Fragment>,
          );
        });

        const logs = [];
        childARef.current.scrollIntoView = jest.fn().mockImplementation(() => {
          logs.push('childA');
        });
        childBRef.current.scrollIntoView = jest.fn().mockImplementation(() => {
          logs.push('childB');
        });

        fragmentRef.current.scrollIntoView(false);
        expectLast(logs, 'childB');
      });

      // @gate enableFragmentRefs && enableFragmentRefsScrollIntoView
      it('handles portaled elements -- same scroll container', async () => {
        const fragmentRef = React.createRef();
        const childARef = React.createRef();
        const childBRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test() {
          return (
            <Fragment ref={fragmentRef}>
              {createPortal(
                <div ref={childARef} id="child-a">
                  A
                </div>,
                document.body,
              )}

              <div ref={childBRef} id="child-b">
                B
              </div>
            </Fragment>
          );
        }

        await act(() => {
          root.render(<Test />);
        });

        const logs = [];
        childARef.current.scrollIntoView = jest.fn().mockImplementation(() => {
          logs.push('childA');
        });
        childBRef.current.scrollIntoView = jest.fn().mockImplementation(() => {
          logs.push('childB');
        });

        // Default call
        fragmentRef.current.scrollIntoView();
        expectLast(logs, 'childA');
      });

      // @gate enableFragmentRefs && enableFragmentRefsScrollIntoView
      it('handles portaled elements -- different scroll container', async () => {
        const fragmentRef = React.createRef();
        const headerChildRef = React.createRef();
        const childARef = React.createRef();
        const childBRef = React.createRef();
        const childCRef = React.createRef();
        const scrollContainerRef = React.createRef();
        const scrollContainerNestedRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);

        function Test({mountFragment}) {
          return (
            <>
              <div id="header" style={{position: 'fixed'}}>
                <div id="parent-a" />
              </div>
              <div id="parent-b" />
              <div
                id="scroll-container"
                ref={scrollContainerRef}
                style={{overflow: 'scroll'}}>
                <div id="parent-c" />
                <div
                  id="scroll-container-nested"
                  ref={scrollContainerNestedRef}
                  style={{overflow: 'scroll'}}>
                  <div id="parent-d" />
                </div>
              </div>
              {mountFragment && (
                <Fragment ref={fragmentRef}>
                  {createPortal(
                    <div ref={headerChildRef} id="header-content">
                      Header
                    </div>,
                    document.querySelector('#parent-a'),
                  )}
                  {createPortal(
                    <div ref={childARef} id="child-a">
                      A
                    </div>,
                    document.querySelector('#parent-b'),
                  )}
                  {createPortal(
                    <div ref={childBRef} id="child-b">
                      B
                    </div>,
                    document.querySelector('#parent-b'),
                  )}
                  {createPortal(
                    <div ref={childCRef} id="child-c">
                      C
                    </div>,
                    document.querySelector('#parent-c'),
                  )}
                </Fragment>
              )}
            </>
          );
        }

        await act(() => {
          root.render(<Test mountFragment={false} />);
        });
        // Now that the portal locations exist, mount the fragment
        await act(() => {
          root.render(<Test mountFragment={true} />);
        });

        let logs = [];
        headerChildRef.current.scrollIntoView = jest.fn(() => {
          logs.push('header');
        });
        childARef.current.scrollIntoView = jest.fn(() => {
          logs.push('A');
        });
        childBRef.current.scrollIntoView = jest.fn(() => {
          logs.push('B');
        });
        childCRef.current.scrollIntoView = jest.fn(() => {
          logs.push('C');
        });

        // Default call
        fragmentRef.current.scrollIntoView();
        expectLast(logs, 'header');

        childARef.current.scrollIntoView.mockClear();
        childBRef.current.scrollIntoView.mockClear();
        childCRef.current.scrollIntoView.mockClear();

        logs = [];

        // // alignToTop=false
        fragmentRef.current.scrollIntoView(false);
        expectLast(logs, 'C');
      });
    });

    describe('without children', () => {
      // @gate enableFragmentRefs && enableFragmentRefsScrollIntoView
      it('calls scrollIntoView on the next sibling by default, or if alignToTop=true', async () => {
        const fragmentRef = React.createRef();
        const siblingARef = React.createRef();
        const siblingBRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            <div>
              <Wrapper>
                <div ref={siblingARef} />
              </Wrapper>
              <Fragment ref={fragmentRef} />
              <div ref={siblingBRef} />
            </div>,
          );
        });

        siblingARef.current.scrollIntoView = jest.fn();
        siblingBRef.current.scrollIntoView = jest.fn();

        // Default call
        fragmentRef.current.scrollIntoView();
        expect(siblingARef.current.scrollIntoView).toHaveBeenCalledTimes(0);
        expect(siblingBRef.current.scrollIntoView).toHaveBeenCalledTimes(1);

        siblingBRef.current.scrollIntoView.mockClear();

        // alignToTop=true
        fragmentRef.current.scrollIntoView(true);
        expect(siblingARef.current.scrollIntoView).toHaveBeenCalledTimes(0);
        expect(siblingBRef.current.scrollIntoView).toHaveBeenCalledTimes(1);
      });

      // @gate enableFragmentRefs && enableFragmentRefsScrollIntoView
      it('calls scrollIntoView on the prev sibling if alignToTop is false', async () => {
        const fragmentRef = React.createRef();
        const siblingARef = React.createRef();
        const siblingBRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);
        function C() {
          return (
            <Wrapper>
              <div id="C" ref={siblingARef} />
            </Wrapper>
          );
        }
        function Test() {
          return (
            <div id="A">
              <div id="B" />
              <C />
              <Fragment ref={fragmentRef} />
              <div id="D" ref={siblingBRef} />
              <div id="E" />
            </div>
          );
        }
        await act(() => {
          root.render(<Test />);
        });

        siblingARef.current.scrollIntoView = jest.fn();
        siblingBRef.current.scrollIntoView = jest.fn();

        // alignToTop=false
        fragmentRef.current.scrollIntoView(false);
        expect(siblingARef.current.scrollIntoView).toHaveBeenCalledTimes(1);
        expect(siblingBRef.current.scrollIntoView).toHaveBeenCalledTimes(0);
      });

      // @gate enableFragmentRefs && enableFragmentRefsScrollIntoView
      it('calls scrollIntoView on the parent if there are no siblings', async () => {
        const fragmentRef = React.createRef();
        const parentRef = React.createRef();
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            <div ref={parentRef}>
              <Wrapper>
                <Fragment ref={fragmentRef} />
              </Wrapper>
            </div>,
          );
        });

        parentRef.current.scrollIntoView = jest.fn();
        fragmentRef.current.scrollIntoView();
        expect(parentRef.current.scrollIntoView).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('with text nodes', () => {
    // @gate enableFragmentRefs && enableFragmentRefsTextNodes
    it('getClientRects includes text node bounds', async () => {
      const restoreRange = mockRangeClientRects([
        {x: 0, y: 0, width: 80, height: 16},
      ]);
      const fragmentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <Fragment ref={fragmentRef}>Hello World</Fragment>
          </div>,
        ),
      );

      const rects = fragmentRef.current.getClientRects();
      expect(rects.length).toBe(1);
      expect(rects[0].width).toBe(80);
      restoreRange();
    });

    // @gate enableFragmentRefs && enableFragmentRefsTextNodes
    it('getClientRects includes both text and element bounds', async () => {
      const restoreRange = mockRangeClientRects([
        {x: 0, y: 0, width: 60, height: 16},
      ]);
      const fragmentRef = React.createRef();
      const childRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <Fragment ref={fragmentRef}>
              Text before
              <div ref={childRef}>Element</div>
              Text after
            </Fragment>
          </div>,
        ),
      );

      setClientRects(childRef.current, [
        {x: 10, y: 10, width: 100, height: 20},
      ]);
      const rects = fragmentRef.current.getClientRects();
      // Should have rects from 2 text nodes + 1 element = 3 total
      expect(rects.length).toBe(3);
      restoreRange();
    });

    // @gate enableFragmentRefs
    it('compareDocumentPosition works with text children', async () => {
      const fragmentRef = React.createRef();
      const beforeRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <div ref={beforeRef} />
            <Fragment ref={fragmentRef}>Text content</Fragment>
          </div>,
        ),
      );

      const position = fragmentRef.current.compareDocumentPosition(
        beforeRef.current,
      );
      expect(position & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    // @gate enableFragmentRefs
    it('focus is a no-op on text-only fragment', async () => {
      const fragmentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <Fragment ref={fragmentRef}>Text only content</Fragment>
          </div>,
        ),
      );

      // Should not throw or warn - just a silent no-op
      fragmentRef.current.focus();
      // Test passes if no error is thrown
    });

    // @gate enableFragmentRefs
    it('focusLast is a no-op on text-only fragment', async () => {
      const fragmentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <Fragment ref={fragmentRef}>Text only content</Fragment>
          </div>,
        ),
      );

      // Should not throw or warn - just a silent no-op
      fragmentRef.current.focusLast();
    });

    // @gate enableFragmentRefs && enableFragmentRefsTextNodes
    it('warns when observeUsing is called on text-only fragment', async () => {
      mockIntersectionObserver();
      const fragmentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <Fragment ref={fragmentRef}>Text only content</Fragment>
          </div>,
        ),
      );

      const observer = new IntersectionObserver(() => {});
      fragmentRef.current.observeUsing(observer);
      assertConsoleErrorDev(
        [
          'observeUsing() was called on a FragmentInstance with only text children. ' +
            'Observers do not work on text nodes.',
        ],
        {withoutStack: true},
      );
    });

    // @gate enableFragmentRefs && enableFragmentRefsScrollIntoView
    it('scrollIntoView works on text-only fragment using Range API', async () => {
      const restoreRange = mockRangeClientRects([
        {x: 100, y: 200, width: 80, height: 16},
      ]);
      const fragmentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <Fragment ref={fragmentRef}>Text content</Fragment>
          </div>,
        ),
      );

      // Mock window.scrollTo to verify it was called
      const originalScrollTo = window.scrollTo;
      const scrollToMock = jest.fn();
      window.scrollTo = scrollToMock;

      fragmentRef.current.scrollIntoView();

      // Should have called window.scrollTo for the text node
      expect(scrollToMock).toHaveBeenCalled();

      window.scrollTo = originalScrollTo;
      restoreRange();
    });

    // @gate enableFragmentRefs
    it('treats passive:true and passive:false as same listener per DOM spec', async () => {
      const fragmentRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <Fragment ref={fragmentRef}>
            <div id="child" />
          </Fragment>,
        );
      });

      const logs = [];
      const handler = () => logs.push('fired');

      const child = document.querySelector('#child');
      const spy = jest.spyOn(child, 'addEventListener');
      // Per DOM spec, listener identity is (type, callback, capture).
      // passive is NOT part of the key, so these are the SAME listener.
      fragmentRef.current.addEventListener('click', handler, {passive: false});
      // Second add is a no-op: same (type, callback, capture) identity.
      fragmentRef.current.addEventListener('click', handler, {passive: true});
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('click', handler, {passive: false});

      document.querySelector('#child').click();
      // First handler fires once (second add was a no-op).
      expect(logs).toEqual(['fired']);

      // removeEventListener also ignores passive when matching
      fragmentRef.current.removeEventListener('click', handler, {
        passive: true,
      });

      logs.length = 0;
      document.querySelector('#child').click();
      expect(logs).toEqual([]);
    });
    // @gate enableFragmentRefs
    it('removes a listener registered with passive:false when removed with passive:true', async () => {
      const fragmentRef = React.createRef(null);
      function Test() {
        return (
          <>
            <div id="child-x" />
          </>
        );
      }
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <Fragment ref={fragmentRef}>
            <Test />
          </Fragment>,
        );
      });
      const logs = [];
      function handler() {
        logs.push('fired');
      }
      // Register with passive: false
      fragmentRef.current.addEventListener('click', handler, {
        passive: false,
      });
      document.querySelector('#child-x').click();
      expect(logs).toEqual(['fired']);
      logs.length = 0;
      // Remove with passive: true - per DOM spec, passive is NOT part of identity
      // so this MUST remove the listener regardless of passive mismatch.
      fragmentRef.current.removeEventListener('click', handler, {
        passive: true,
      });
      document.querySelector('#child-x').click();
      // Listener removed - no more invocations
      expect(logs).toEqual([]);
    });
  });
});
