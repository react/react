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
let act;
let container;
let Fragment;

describe('FragmentRefs event registry', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    Fragment = React.Fragment;
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // @gate enableFragmentRefs
  it('does not forget a registered listener when removing an unknown listener', async () => {
    const fragmentRef = React.createRef();
    const root = ReactDOMClient.createRoot(container);
    let showSecondChild;

    function Test() {
      const [showSecond, setShowSecond] = React.useState(false);
      showSecondChild = () => setShowSecond(true);
      return (
        <Fragment ref={fragmentRef}>
          <button id="first">First</button>
          {showSecond && <button id="second">Second</button>}
        </Fragment>
      );
    }

    await act(() => {
      root.render(<Test />);
    });

    const calls = [];
    function registeredListener(event) {
      calls.push(event.currentTarget.id);
    }
    function unknownListener() {}

    fragmentRef.current.addEventListener('click', registeredListener);
    fragmentRef.current.removeEventListener('click', unknownListener);

    // The current child still has the registered listener even if retained
    // Fragment bookkeeping was corrupted. A newly added child exposes the bug.
    document.getElementById('first').click();
    expect(calls).toEqual(['first']);

    await act(() => {
      showSecondChild();
    });

    document.getElementById('second').click();
    expect(calls).toEqual(['first', 'second']);
  });

  // @gate enableFragmentRefs
  it('does not remove a listener registered directly on a child', async () => {
    const fragmentRef = React.createRef();
    const childRef = React.createRef();
    const root = ReactDOMClient.createRoot(container);
    let directCalls = 0;
    let fragmentCalls = 0;

    function directListener() {
      directCalls++;
    }
    function fragmentListener() {
      fragmentCalls++;
    }

    await act(() => {
      root.render(
        <Fragment ref={fragmentRef}>
          <button ref={childRef}>Child</button>
        </Fragment>,
      );
    });

    childRef.current.addEventListener('click', directListener);
    fragmentRef.current.addEventListener('click', fragmentListener);

    fragmentRef.current.removeEventListener('click', directListener);
    childRef.current.click();

    expect(directCalls).toBe(1);
    expect(fragmentCalls).toBe(1);
  });

  // @gate enableFragmentRefs
  it('treats omitted capture and false as the same listener identity', async () => {
    const fragmentRef = React.createRef();
    const root = ReactDOMClient.createRoot(container);
    let showSecondChild;

    function Test() {
      const [showSecond, setShowSecond] = React.useState(false);
      showSecondChild = () => setShowSecond(true);
      return (
        <Fragment ref={fragmentRef}>
          <button id="first">First</button>
          {showSecond && <button id="second">Second</button>}
        </Fragment>
      );
    }

    await act(() => {
      root.render(<Test />);
    });

    const calls = [];
    function removedListener(event) {
      calls.push(`removed:${event.currentTarget.id}`);
    }
    function retainedListener(event) {
      calls.push(`retained:${event.currentTarget.id}`);
    }

    fragmentRef.current.addEventListener('click', removedListener);
    fragmentRef.current.addEventListener('click', retainedListener);

    // Omitted capture and `false` are the same EventTarget listener identity.
    fragmentRef.current.removeEventListener('click', removedListener, false);

    document.getElementById('first').click();
    expect(calls).toEqual(['retained:first']);

    await act(() => {
      showSecondChild();
    });

    calls.length = 0;
    document.getElementById('second').click();
    expect(calls).toEqual(['retained:second']);
  });
});
