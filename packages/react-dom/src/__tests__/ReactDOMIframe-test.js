/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOMIframe', () => {
  let React;
  let ReactDOMClient;
  let act;

  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
  });

  it('should trigger load events', async () => {
    const onLoadSpy = jest.fn();
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(React.createElement('iframe', {onLoad: onLoadSpy}));
    });
    const iframe = container.firstChild;

    const loadEvent = document.createEvent('Event');
    loadEvent.initEvent('load', false, false);

    await act(() => {
      iframe.dispatchEvent(loadEvent);
    });

    expect(onLoadSpy).toHaveBeenCalled();
  });
});
