/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import generate from '@babel/generator';
import {parse} from '@babel/parser';
import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';
import type {LoggerEvent} from '../Entrypoint';

it('preserves named function self-references without a critical compiler error', () => {
  const source = `
    export function MyComponent() {
      return <HelloWorld onClick={() => {
        foo(function bar() {
          if (Math.random() > .5) {
            baz();
          } else {
            qux(bar);
          }
        });
      }} />;
    }
  `;
  const events: Array<LoggerEvent> = [];
  const result = runBabelPluginReactCompiler(source, 'test.js', 'flow', {
    panicThreshold: 'critical_errors',
    logger: {
      logEvent(_filename, event) {
        events.push(event);
      },
    },
  });

  // A graceful bailout must leave the original function intact.
  const normalize = (code: string): string =>
    generate(parse(code, {sourceType: 'module', plugins: ['jsx']})).code;
  expect(normalize(result.code!)).toEqual(normalize(source));
  expect(events).toContainEqual(
    expect.objectContaining({
      kind: 'CompileError',
      detail: expect.objectContaining({
        reason:
          'References to a named function expression from within its own body are not yet supported',
      }),
    }),
  );
});
