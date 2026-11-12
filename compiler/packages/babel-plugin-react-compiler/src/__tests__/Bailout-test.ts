/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {transformSync} from '@babel/core';
import BabelPluginReactCompiler from '../Babel/BabelPlugin';

function compile(input: string): string {
  const result = transformSync(input, {
    filename: 'test.js',
    babelrc: false,
    configFile: false,
    compact: false,
    plugins: [
      [
        BabelPluginReactCompiler,
        {
          panicThreshold: 'none',
          logger: {
            logEvent() {},
          },
        },
      ],
    ],
  });
  if (result == null || result.code == null) {
    throw new Error('Expected the compiler to emit code');
  }
  return result.code;
}

// Runs the bailed out function. The code is emitted in strict mode so that
// assigning to a variable the compiler failed to declare throws instead of
// silently creating a global.
function run(code: string, call: string): unknown {
  return new Function(`'use strict';\n${code}\nreturn ${call};`)();
}

describe('compiler bailout', () => {
  // Regression test for https://github.com/facebook/react/issues/38178
  //
  // Bailing out leaves the input AST in place, but by that point BuildHIR has
  // already renamed the `a` binding to `a_0`. Babel's `scope.rename` does not
  // visit the left hand side of a `for..of` / `for..in` statement, so a
  // destructuring target there kept its original name and the emitted function
  // assigned to an undeclared variable.
  it('keeps an object destructuring target in sync with the renamed binding', () => {
    const code = compile(`
      function List({items}) {
        'use memo';
        const out = [];
        { let a = 1; out.push(a); }
        let a;
        for ({a} of items) out.push(a);
        return out.join(',');
      }
    `);
    expect(run(code, 'List({items: [{a: 2}, {a: 3}]})')).toBe('1,2,3');
  });

  it('keeps an array destructuring target in sync with the renamed binding', () => {
    const code = compile(`
      function List({rows}) {
        'use memo';
        const out = [];
        { let a = 1; out.push(a); }
        let a;
        for ([a] of rows) out.push(a);
        return out.join(',');
      }
    `);
    expect(run(code, 'List({rows: [[2], [3]]})')).toBe('1,2,3');
  });

  it('keeps a plain identifier target in sync with the renamed binding', () => {
    const code = compile(`
      function List({items}) {
        'use memo';
        const out = [];
        { let a = 1; out.push(a); }
        let a;
        for (a of items) out.push(a);
        return out.join(',');
      }
    `);
    expect(run(code, 'List({items: [2, 3]})')).toBe('1,2,3');
  });
});
