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

describe('ReactServerStreamConfigNode', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('hashes with md5', () => {
    const crypto = require('crypto');
    const createFastHash =
      require('react-server/src/ReactServerStreamConfigNode').createFastHash;

    expect(createFastHash('hello')).toBe(
      crypto.createHash('md5').update('hello').digest('hex'),
    );
  });

  it('hashes without md5 when FIPS mode is enabled', () => {
    jest.mock('crypto', () => ({
      ...jest.requireActual('crypto'),
      getFips: () => 1,
      createHash: () => {
        throw new Error('md5 is not available in FIPS mode');
      },
    }));
    const createFastHashJS =
      require('react-server/src/createFastHashJS').createFastHashJS;
    const createFastHash =
      require('react-server/src/ReactServerStreamConfigNode').createFastHash;

    expect(createFastHash('hello')).toBe(createFastHashJS('hello'));
  });
});
