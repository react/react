/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('gate', () => {
  //@gate false
  it('should expect an error for this test', () => {
    throw new Error('This test should fail');
  });

  //@gate true
  it('should not an error for this test', () => {});
});
