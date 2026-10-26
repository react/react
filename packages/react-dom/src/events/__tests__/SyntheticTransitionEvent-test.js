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

describe('SyntheticTransitionEvent', () => {
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

  async function testTransitionEvent(propName, nativeEventName) {
    const events = [];
    const onTransitionEvent = event => {
      event.persist();
      events.push(event);
    };
    await act(async () => {
      root.render(React.createElement('div', {[propName]: onTransitionEvent}));
    });

    const event = new Event(nativeEventName, {bubbles: true});
    // jsdom doesn't implement TransitionEvent so we add the fields manually.
    Object.assign(event, {
      propertyName: 'opacity',
      elapsedTime: 0.5,
      pseudoElement: '::before',
    });
    container.firstChild.dispatchEvent(event);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe(nativeEventName);
    expect(events[0].propertyName).toBe('opacity');
    expect(events[0].elapsedTime).toBe(0.5);
    expect(events[0].pseudoElement).toBe('::before');
  }

  it('should normalize properties from the TransitionEvent interface for onTransitionRun', async () => {
    await testTransitionEvent('onTransitionRun', 'transitionrun');
  });

  it('should normalize properties from the TransitionEvent interface for onTransitionStart', async () => {
    await testTransitionEvent('onTransitionStart', 'transitionstart');
  });

  it('should normalize properties from the TransitionEvent interface for onTransitionCancel', async () => {
    await testTransitionEvent('onTransitionCancel', 'transitioncancel');
  });

  it('should normalize properties from the TransitionEvent interface for onTransitionEnd', async () => {
    await testTransitionEvent('onTransitionEnd', 'transitionend');
  });
});
