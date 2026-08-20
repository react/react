/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

describe('transform-lazy-jsx-import', () => {
  it('should use the mocked version of the "react" runtime in jsx', () => {
    jest.resetModules();
    const mock = jest.fn(type => 'fakejsx: ' + type);
    if (__DEV__) {
      jest.mock('react/jsx-dev-runtime', () => {
        return {
          jsxDEV: mock,
        };
      });
    } else {
      jest.mock('react/jsx-runtime', () => ({
        jsx: mock,
        jsxs: mock,
      }));
    }
    // eslint-disable-next-line react/react-in-jsx-scope
    const x = <div />;
    expect(x).toBe('fakejsx: div');
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
