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

    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('should normalize properties from the TransitionEvent interface for onTransitionEnd', async () => {
    const events = [];
    const onTransitionEnd = event => {
      event.persist();
      events.push(event);
    };
    await act(async () => {
      root.render(<div onTransitionEnd={onTransitionEnd} />);
    });

    const event = new Event('transitionend', {bubbles: true});
    Object.assign(event, {
      propertyName: 'opacity',
      elapsedTime: 0.5,
      pseudoElement: '::before',
    });
    container.firstChild.dispatchEvent(event);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('transitionend');
    expect(events[0].propertyName).toBe('opacity');
    expect(events[0].elapsedTime).toBe(0.5);
    expect(events[0].pseudoElement).toBe('::before');
  });

  it('should normalize properties from the TransitionEvent interface for onTransitionRun', async () => {
    const events = [];
    const onTransitionRun = event => {
      event.persist();
      events.push(event);
    };
    await act(async () => {
      root.render(<div onTransitionRun={onTransitionRun} />);
    });

    const event = new Event('transitionrun', {bubbles: true});
    Object.assign(event, {
      propertyName: 'transform',
      elapsedTime: 0,
      pseudoElement: '::after',
    });
    container.firstChild.dispatchEvent(event);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('transitionrun');
    expect(events[0].propertyName).toBe('transform');
    expect(events[0].elapsedTime).toBe(0);
    expect(events[0].pseudoElement).toBe('::after');
  });

  it('should normalize properties from the TransitionEvent interface for onTransitionStart', async () => {
    const events = [];
    const onTransitionStart = event => {
      event.persist();
      events.push(event);
    };
    await act(async () => {
      root.render(<div onTransitionStart={onTransitionStart} />);
    });

    const event = new Event('transitionstart', {bubbles: true});
    Object.assign(event, {
      propertyName: 'width',
      elapsedTime: 0.1,
      pseudoElement: '::before',
    });
    container.firstChild.dispatchEvent(event);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('transitionstart');
    expect(events[0].propertyName).toBe('width');
    expect(events[0].elapsedTime).toBe(0.1);
    expect(events[0].pseudoElement).toBe('::before');
  });

  it('should normalize properties from the TransitionEvent interface for onTransitionCancel', async () => {
    const events = [];
    const onTransitionCancel = event => {
      event.persist();
      events.push(event);
    };
    await act(async () => {
      root.render(<div onTransitionCancel={onTransitionCancel} />);
    });

    const event = new Event('transitioncancel', {bubbles: true});
    Object.assign(event, {
      propertyName: 'height',
      elapsedTime: 0.2,
      pseudoElement: '::marker',
    });
    container.firstChild.dispatchEvent(event);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('transitioncancel');
    expect(events[0].propertyName).toBe('height');
    expect(events[0].elapsedTime).toBe(0.2);
    expect(events[0].pseudoElement).toBe('::marker');
  });
});
