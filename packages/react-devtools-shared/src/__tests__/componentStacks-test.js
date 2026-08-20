/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  getVersionedRenderImplementation,
  normalizeCodeLocInfo,
} from 'react-devtools-shared/src/__tests__/utils';

describe('component stack', () => {
  let React;
  let act;
  let supportsOwnerStacks;

  beforeEach(() => {
    const utils = require('./utils');
    act = utils.act;

    React = require('react');
    if (
      React.version.startsWith('19') &&
      React.version.includes('experimental')
    ) {
      supportsOwnerStacks = true;
    }
  });

  const {render} = getVersionedRenderImplementation();

  // @reactVersion >=16.9
  it('should log the current component stack along with an error or warning', () => {
    const Grandparent = () => <Parent />;
    const Parent = () => <Child />;
    const Child = () => {
      console.error('Test error.');
      console.warn('Test warning.');
      return null;
    };

    act(() => render(<Grandparent />));

    expect(
      global.consoleErrorMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'Test error.',
      '\n    in Child (at **)' +
        '\n    in Parent (at **)' +
        '\n    in Grandparent (at **)',
    ]);
    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'Test warning.',
      '\n    in Child (at **)' +
        '\n    in Parent (at **)' +
        '\n    in Grandparent (at **)',
    ]);
  });

  // This test should have caught #19911
  // but didn't because both DevTools and ReactDOM are running in the same memory space,
  // so the case we're testing against (DevTools prod build and React DEV build) doesn't exist.
  // It would be nice to figure out a way to test this combination at some point...
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('should disable the current dispatcher before shallow rendering so no effects get scheduled', () => {
    let useEffectCount = 0;

    const Example = props => {
      React.useEffect(() => {
        useEffectCount++;
        expect(props).toBeDefined();
      }, [props]);
      console.warn('Warning to trigger appended component stacks.');
      return null;
    };

    act(() => render(<Example test="abc" />));

    expect(useEffectCount).toBe(1);

    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'Warning to trigger appended component stacks.',
      '\n    in Example (at **)',
    ]);
  });

  // @reactVersion >= 18.3
  it('should log the current component stack with debug info from promises', () => {
    const Child = () => {
      console.error('Test error.');
      console.warn('Test warning.');
      return null;
    };
    const ChildPromise = Promise.resolve(<Child />);
    ChildPromise.status = 'fulfilled';
    ChildPromise.value = <Child />;
    ChildPromise._debugInfo = [
      {
        name: 'ServerComponent',
        env: 'Server',
        owner: null,
      },
    ];
    const Parent = () => ChildPromise;
    const Grandparent = () => <Parent />;

    act(() => render(<Grandparent />));

    expect(
      global.consoleErrorMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'Test error.',
      supportsOwnerStacks
        ? '\n    in Child (at **)'
        : '\n    in Child (at **)' +
          '\n    in ServerComponent (at **)' +
          '\n    in Parent (at **)' +
          '\n    in Grandparent (at **)',
    ]);
    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'Test warning.',
      supportsOwnerStacks
        ? '\n    in Child (at **)'
        : '\n    in Child (at **)' +
          '\n    in ServerComponent (at **)' +
          '\n    in Parent (at **)' +
          '\n    in Grandparent (at **)',
    ]);
  });
});
