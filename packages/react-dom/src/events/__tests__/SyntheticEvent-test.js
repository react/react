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
let ReactDOMClient;
let act;

describe('SyntheticEvent', () => {
  let container;
  let root;

  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('should be able to `preventDefault`', async () => {
    let expectedCount = 0;

    const eventHandler = syntheticEvent => {
      expect(syntheticEvent.isDefaultPrevented()).toBe(false);
      syntheticEvent.preventDefault();
      expect(syntheticEvent.isDefaultPrevented()).toBe(true);
      expect(syntheticEvent.defaultPrevented).toBe(true);

      expectedCount++;
    };
    const nodeRef = React.createRef();
    await act(async () => {
      root.render(<div onClick={eventHandler} ref={nodeRef} />);
    });
    const node = nodeRef.current;

    const event = document.createEvent('Event');
    event.initEvent('click', true, true);
    node.dispatchEvent(event);

    expect(expectedCount).toBe(1);
  });

  it('should be prevented if nativeEvent is prevented', async () => {
    let expectedCount = 0;

    const eventHandler = syntheticEvent => {
      expect(syntheticEvent.isDefaultPrevented()).toBe(true);

      expectedCount++;
    };
    const nodeRef = React.createRef();
    await act(async () => {
      root.render(<div onClick={eventHandler} ref={nodeRef} />);
    });
    const node = nodeRef.current;

    let event;
    event = document.createEvent('Event');
    event.initEvent('click', true, true);
    event.preventDefault();
    node.dispatchEvent(event);

    event = document.createEvent('Event');
    event.initEvent('click', true, true);
    // Emulate IE8
    Object.defineProperty(event, 'defaultPrevented', {
      get() {},
    });
    Object.defineProperty(event, 'returnValue', {
      get() {
        return false;
      },
    });
    node.dispatchEvent(event);

    expect(expectedCount).toBe(2);
  });

  it('should be able to `stopPropagation`', async () => {
    let expectedCount = 0;

    const eventHandler = syntheticEvent => {
      expect(syntheticEvent.isPropagationStopped()).toBe(false);
      syntheticEvent.stopPropagation();
      expect(syntheticEvent.isPropagationStopped()).toBe(true);

      expectedCount++;
    };
    const nodeRef = React.createRef();
    await act(async () => {
      root.render(<div onClick={eventHandler} ref={nodeRef} />);
    });
    const node = nodeRef.current;

    const event = document.createEvent('Event');
    event.initEvent('click', true, true);
    node.dispatchEvent(event);

    expect(expectedCount).toBe(1);
  });
});
