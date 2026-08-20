/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let babel = require('@babel/core');
let devExpressionWithCodes = require('../transform-error-messages');

function transform(input, options = {}) {
  return babel.transform(input, {
    plugins: [[devExpressionWithCodes, options]],
  }).code;
}

let oldEnv;

describe('error transform', () => {
  beforeEach(() => {
    oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = '';
  });

  afterEach(() => {
    process.env.NODE_ENV = oldEnv;
  });

  it('should replace error constructors', () => {
    expect(
      transform(`
new Error('Do not override existing functions.');
`)
    ).toMatchSnapshot();
  });

  it('should replace error constructors (no new)', () => {
    expect(
      transform(`
Error('Do not override existing functions.');
`)
    ).toMatchSnapshot();
  });

  it("should output FIXME for errors that don't have a matching error code", () => {
    expect(
      transform(`
Error('This is not a real error message.');
`)
    ).toMatchSnapshot();
  });

  it(
    "should output FIXME for errors that don't have a matching error " +
      'code, unless opted out with a comment',
    () => {
      // TODO: Since this only detects one of many ways to disable a lint
      // rule, we should instead search for a custom directive (like
      // no-minify-errors) instead of ESLint. Will need to update our lint
      // rule to recognize the same directive.
      expect(
        transform(`
// eslint-disable-next-line react-internal/prod-error-codes
Error('This is not a real error message.');
`)
      ).toMatchSnapshot();
    }
  );

  it('should not touch other calls or new expressions', () => {
    expect(
      transform(`
new NotAnError();
NotAnError();
`)
    ).toMatchSnapshot();
  });

  it('should support interpolating arguments with template strings', () => {
    expect(
      transform(`
new Error(\`Expected \${foo} target to be an array; got \${bar}\`);
`)
    ).toMatchSnapshot();
  });

  it('should support interpolating arguments with concatenation', () => {
    expect(
      transform(`
new Error('Expected ' + foo + ' target to be an array; got ' + bar);
`)
    ).toMatchSnapshot();
  });

  it('should support error constructors with concatenated messages', () => {
    expect(
      transform(`
new Error(\`Expected \${foo} target to \` + \`be an array; got \${bar}\`);
`)
    ).toMatchSnapshot();
  });

  it('handles escaped backticks in template string', () => {
    expect(
      transform(`
new Error(\`Expected \\\`\$\{listener\}\\\` listener to be a function, instead got a value of \\\`\$\{type\}\\\` type.\`);
`)
    ).toMatchSnapshot();
  });

  it('handles ignoring errors that are comment-excluded inside ternary expressions', () => {
    expect(
      transform(`
let val = someBool
  ? //eslint-disable-next-line react-internal/prod-error-codes
    new Error('foo')
  : someOtherBool
  ? new Error('bar')
  : //eslint-disable-next-line react-internal/prod-error-codes
    new Error('baz');
`)
    ).toMatchSnapshot();
  });

  it('handles ignoring errors that are comment-excluded outside ternary expressions', () => {
    expect(
      transform(`
//eslint-disable-next-line react-internal/prod-error-codes
let val = someBool
  ? new Error('foo')
  : someOtherBool
  ? new Error('bar')
  : new Error('baz');
`)
    ).toMatchSnapshot();
  });

  it('handles deeply nested expressions', () => {
    expect(
      transform(`
let val =
  (a,
  (b,
  // eslint-disable-next-line react-internal/prod-error-codes
  new Error('foo')));
`)
    ).toMatchSnapshot();

    expect(
      transform(`
let val =
  (a,
  // eslint-disable-next-line react-internal/prod-error-codes
  (b, new Error('foo')));
`)
    ).toMatchSnapshot();
  });

  it('should support extra arguments to error constructor', () => {
    expect(
      transform(`
new Error(\`Expected \${foo} target to \` + \`be an array; got \${bar}\`, {cause: error});
`)
    ).toMatchSnapshot();
  });
});
