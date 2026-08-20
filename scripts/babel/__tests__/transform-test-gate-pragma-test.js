/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

describe('transform-test-gate-pragma', () => {
  // Fake runtime
  // eslint-disable-next-line no-unused-vars
  const _test_gate = (gateFn, testName, cb) => {
    // eslint-disable-next-line jest/no-done-callback, jest/valid-title
    it(testName, (...args) => {
      shouldPass = gateFn(context);
      return cb(...args);
    });
  };

  // eslint-disable-next-line no-unused-vars
  const _test_gate_focus = (gateFn, testName, cb) => {
    // NOTE: Tests in this file are not actually focused because the calls to
    // `test.only` and `fit` are compiled to `_test_gate_focus`. So if you want
    // to focus something, swap the following `test` call for `test.only`.
    // eslint-disable-next-line jest/no-done-callback, jest/valid-title
    it(testName, (...args) => {
      shouldPass = gateFn(context);
      isFocused = true;
      return cb(...args);
    });
  };

  // Feature flags, environment variables, etc. We can configure this in
  // our test set up.
  const context = {
    flagThatIsOff: false,
    flagThatIsOn: true,
    environment: 'fake-environment',
  };

  let shouldPass;
  let isFocused;
  beforeEach(() => {
    shouldPass = null;
    isFocused = false;
  });

  it('no pragma', () => {
    expect(shouldPass).toBe(null);
  });

  // unrelated comment
  it('no pragma, unrelated comment', () => {
    expect(shouldPass).toBe(null);
  });

  // @gate flagThatIsOn
  it('basic positive test', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOff
  it('basic negative test', () => {
    expect(shouldPass).toBe(false);
  });

  // @gate flagThatIsOn
  it('method', () => {
    expect(shouldPass).toBe(true);
  });

  /* eslint-disable jest/no-focused-tests */

  // @gate flagThatIsOn
  it.only('test.only', () => {
    expect(isFocused).toBe(true);
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOff
  it.only('it.only', () => {
    expect(isFocused).toBe(true);
    expect(shouldPass).toBe(false);
  });

  // @gate flagThatIsOn
  it.only('fit', () => {
    expect(isFocused).toBe(true);
    expect(shouldPass).toBe(true);
  });

  /* eslint-enable jest/no-focused-tests */

  // @gate !flagThatIsOff
  it('flag negation', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOn
  // @gate !flagThatIsOff
  it('multiple gates', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOn
  // @gate flagThatIsOff
  it('multiple gates 2', () => {
    expect(shouldPass).toBe(false);
  });

  // @gate !flagThatIsOff && flagThatIsOn
  it('&&', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOff || flagThatIsOn
  it('||', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate (flagThatIsOn || flagThatIsOff) && flagThatIsOn
  it('groups', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOn == !flagThatIsOff
  it('==', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOn === !flagThatIsOff
  it('===', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOn != !flagThatIsOff
  it('!=', () => {
    expect(shouldPass).toBe(false);
  });

  // @gate flagThatIsOn != !flagThatIsOff
  it('!==', () => {
    expect(shouldPass).toBe(false);
  });

  // @gate flagThatIsOn === true
  it('true', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOff === false
  it('false', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate environment === "fake-environment"
  it('double quoted strings', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate environment === 'fake-environment'
  it('single quoted strings', () => {
    expect(shouldPass).toBe(true);
  });

  // @gate flagThatIsOn // This is a comment
  it('line comment', () => {
    expect(shouldPass).toBe(true);
  });
});

describe('transform test-gate-pragma: actual runtime', () => {
  // These tests use the actual gating runtime used by the rest of our
  // test suite.

  // @gate __DEV__
  it('__DEV__', () => {
    if (!__DEV__) {
      throw Error("Doesn't work in production!");
    }
  });

  // @gate build === "development"
  it('strings', () => {
    if (!__DEV__) {
      throw Error("Doesn't work in production!");
    }
  });

  // Always should fail because of the unguarded console.error
  // @gate false
  it('works with console.error tracking', () => {
    console.error('Should cause test to fail');
  });

  // Always should fail because of the unguarded console.warn
  // @gate false
  it('works with console.warn tracking', () => {
    console.warn('Should cause test to fail');
  });

  // @gate false
  it('works with console tracking if error is thrown before end of test', () => {
    console.warn('Please stop that!');
    console.error('Stop that!');
    throw Error('I told you to stop!');
  });

  // @gate false
  it('a global error event is treated as a test failure', () => {
    dispatchEvent(
      new ErrorEvent('error', {
        error: new Error('Oops!'),
      })
    );
  });
});

describe('dynamic gate method', () => {
  // @gate experimental && __DEV__
  it('returns same conditions as pragma', () => {
    expect(gate(ctx => ctx.experimental && ctx.__DEV__)).toBe(true);
  });

  it('converts string conditions to accessor function', () => {
    expect(gate('experimental')).toBe(gate(flags => flags.experimental));
  });
});
