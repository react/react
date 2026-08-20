/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let React;
let ReactNoop;
let waitForAll;

// This is a new feature in Fiber so I put it in its own test file. It could
// probably move to one of the other test files once it is official.
describe('ReactTopLevelText', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactNoop = require('react-noop-renderer');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
  });

  it('should render a component returning strings directly from render', async () => {
    const Text = ({value}) => value;
    ReactNoop.render(<Text value="foo" />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('foo');
  });

  it('should render a component returning numbers directly from render', async () => {
    const Text = ({value}) => value;
    ReactNoop.render(<Text value={10} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('10');
  });

  it('should render a component returning bigints directly from render', async () => {
    const Text = ({value}) => value;
    ReactNoop.render(<Text value={10n} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('10');
  });
});
