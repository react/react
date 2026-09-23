/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getModernRenderImplementation} from './utils';

describe('SearchInput', () => {
  let act;
  let React;
  let SearchInput;

  beforeEach(() => {
    const utils = require('./utils');
    act = utils.act;

    React = require('react');

    SearchInput = require('../devtools/views/SearchInput').default;
  });

  const {render, getContainer} = getModernRenderImplementation();

  it('should focus the input on Ctrl+F', () => {
    const noop = () => {};
    act(() =>
      render(
        <SearchInput
          goToNextResult={noop}
          goToPreviousResult={noop}
          goToResult={noop}
          placeholder="Search"
          search={noop}
          searchIndex={0}
          searchResultsCount={0}
          searchText=""
        />,
      ),
    );

    const input = getContainer().querySelector('input');
    expect(document.activeElement).not.toBe(input);

    document.documentElement.dispatchEvent(
      new KeyboardEvent('keydown', {key: 'f', ctrlKey: true}),
    );

    expect(document.activeElement).toBe(input);
  });
});
