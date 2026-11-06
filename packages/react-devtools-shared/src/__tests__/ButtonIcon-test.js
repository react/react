/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('ButtonIcon', () => {
  let React;
  let ReactDOMServer;
  let ButtonIcon;

  beforeEach(() => {
    React = require('react');
    ReactDOMServer = require('react-dom/server');
    ButtonIcon =
      require('react-devtools-shared/src/devtools/views/ButtonIcon').default;
  });

  it('should render icons that are not a single path', () => {
    const markup = ReactDOMServer.renderToStaticMarkup(
      <ButtonIcon type="parse-hook-names" />,
    );

    expect(markup).not.toContain('[object Object]');
    expect(markup).toContain('<polygon');
  });
});
