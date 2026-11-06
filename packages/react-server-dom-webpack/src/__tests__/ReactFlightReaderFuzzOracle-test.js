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

// These controls exercise the shared checker without running React.
const {createObjectCheck} = require('./fuzz/FlightReaderOracle');

describe('Flight reader object checks', () => {
  it('rechecks every received copy of a source cycle', () => {
    const source = {value: 'expected'};
    source.next = source;
    const copy = {value: 'expected'};
    copy.next = copy;
    const received = {value: 'expected', next: copy};
    const check = createObjectCheck(source, received);
    check();

    copy.value = 'changed';
    expect(check).toThrow();
    expect(() => createObjectCheck(source, received)()).toThrow();
  });

  it('rejects merging equal but distinct source objects', () => {
    const source = {a: {value: 1}, b: {value: 1}};
    createObjectCheck(source, {a: {value: 1}, b: {value: 1}})();

    const merged = {value: 1};
    expect(() => createObjectCheck(source, {a: merged, b: merged})()).toThrow(
      'two distinct source objects',
    );
  });
});
