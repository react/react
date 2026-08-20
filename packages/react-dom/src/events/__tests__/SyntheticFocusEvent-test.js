/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

describe('SyntheticFocusEvent', () => {
  let React;
  let ReactDOMClient;
  let act;
  let container;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('onFocus events have the focus type', async () => {
    const log = [];
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <button
          onFocus={event => log.push(`onFocus: ${event.type}`)}
          onFocusCapture={event => log.push(`onFocusCapture: ${event.type}`)}
        />,
      );
    });

    const button = container.querySelector('button');

    await act(() => {
      button.dispatchEvent(
        new FocusEvent('focusin', {
          bubbles: true,
          cancelable: false,
        }),
      );
    });

    expect(log).toEqual(['onFocusCapture: focus', 'onFocus: focus']);
  });

  it('onBlur events have the blur type', async () => {
    const log = [];
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <button
          onBlur={event => log.push(`onBlur: ${event.type}`)}
          onBlurCapture={event => log.push(`onBlurCapture: ${event.type}`)}
        />,
      );
    });

    const button = container.querySelector('button');

    await act(() => {
      button.dispatchEvent(
        new FocusEvent('focusout', {
          bubbles: true,
          cancelable: false,
        }),
      );
    });

    expect(log).toEqual(['onBlurCapture: blur', 'onBlur: blur']);
  });
});
