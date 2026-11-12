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

describe('SyntheticUIEvent', () => {
  let container;
  let root;

  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('should normalize properties from the UIEvent interface for onResize', async () => {
    const events = [];
    const onResize = event => {
      event.persist();
      events.push(event);
    };
    await act(async () => {
      root.render(<video onResize={onResize} />);
    });

    const event = new UIEvent('resize', {
      bubbles: false,
      view: window,
      detail: 0,
    });
    container.firstChild.dispatchEvent(event);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('resize');
    expect(events[0].view).toBe(window);
    expect(events[0].detail).toBe(0);
  });

  it('should normalize properties from the UIEvent interface for onScroll', async () => {
    const events = [];
    const onScroll = event => {
      event.persist();
      events.push(event);
    };
    await act(async () => {
      root.render(<div onScroll={onScroll} />);
    });

    const event = new UIEvent('scroll', {
      bubbles: true,
      view: window,
      detail: 0,
    });
    container.firstChild.dispatchEvent(event);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('scroll');
    expect(events[0].view).toBe(window);
    expect(events[0].detail).toBe(0);
  });

  it('should normalize properties from the UIEvent interface for onScrollEnd', async () => {
    const events = [];
    const onScrollEnd = event => {
      event.persist();
      events.push(event);
    };
    await act(async () => {
      root.render(<div onScrollEnd={onScrollEnd} />);
    });

    const event = new UIEvent('scrollend', {
      bubbles: true,
      view: window,
      detail: 0,
    });
    container.firstChild.dispatchEvent(event);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('scrollend');
    expect(events[0].view).toBe(window);
    expect(events[0].detail).toBe(0);
  });
});
