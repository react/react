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

describe('SyntheticAnimationEvent', () => {
  let container;
  let root;

  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    // The container has to be attached for events to fire.
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('should normalize properties from the AnimationEvent interface for onAnimationCancel', async () => {
    const events = [];
    const onAnimationCancel = event => {
      event.persist();
      events.push(event);
    };
    await act(async () => {
      root.render(<div onAnimationCancel={onAnimationCancel} />);
    });

    const event = new Event('animationcancel', {bubbles: true});
    // jsdom doesn't implement AnimationEvent so we add the fields manually.
    Object.assign(event, {
      animationName: 'fade',
      elapsedTime: 0.5,
      pseudoElement: '::before',
    });
    container.firstChild.dispatchEvent(event);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('animationcancel');
    expect(events[0].animationName).toBe('fade');
    expect(events[0].elapsedTime).toBe(0.5);
    expect(events[0].pseudoElement).toBe('::before');
  });
});
