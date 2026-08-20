/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const React = require('react');
const ReactDOMClient = require('react-dom/client');

const act = require('internal-test-utils').act;

describe('dangerouslySetInnerHTML', () => {
  describe('when the node has innerHTML property', () => {
    it('sets innerHTML on it', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div dangerouslySetInnerHTML={{__html: '<h1>Hello</h1>'}} />,
        );
      });
      expect(container.firstChild.innerHTML).toBe('<h1>Hello</h1>');
    });
  });
});
