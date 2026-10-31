/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';
import type {Logger, LoggerEvent, PluginOptions} from '../Entrypoint';

/*
 * The inline class declaration is recorded as an error while lowering, so
 * `Component` is never compiled. The imported `useFoo` is resolved through
 * `moduleTypeProvider` during type inference, which only runs if compilation
 * continues past that error.
 */
const SOURCE = `
import {useFoo} from 'some-module';
function Component(props) {
  class Inner {}
  return useFoo(props, Inner);
}
`;

function compile(options: PluginOptions): {
  code: string | null | undefined;
  resolvedModules: Array<string>;
} {
  const resolvedModules: Array<string> = [];
  const result = runBabelPluginReactCompiler(SOURCE, 'test.js', 'flow', {
    panicThreshold: 'none',
    ...options,
    environment: {
      moduleTypeProvider: (moduleName: string) => {
        resolvedModules.push(moduleName);
        return null;
      },
    },
  });
  return {code: result.code, resolvedModules};
}

function compileWithLogger(options: PluginOptions): {
  code: string | null | undefined;
  resolvedModules: Array<string>;
  events: Array<LoggerEvent>;
} {
  const events: Array<LoggerEvent> = [];
  const logger: Logger = {
    logEvent(_filename, event) {
      events.push(event);
    },
  };
  return {...compile({...options, logger}), events};
}

it('stops after the first error when nothing observes the errors', () => {
  const {code, resolvedModules} = compile({});
  expect(resolvedModules).toEqual([]);
  expect(code).not.toContain('compiler-runtime');
});

it('keeps going to collect every error when a logger is attached', () => {
  const {code, resolvedModules, events} = compileWithLogger({});
  expect(resolvedModules).toEqual(['some-module']);
  expect(events.length).toBeGreaterThan(0);
  expect(events.every(event => event.kind === 'CompileError')).toBe(true);
  // The output is the same either way: the function is not compiled.
  expect(code).toEqual(compile({}).code);
});

it('keeps going to collect every error in lint mode', () => {
  const {resolvedModules} = compile({outputMode: 'lint'});
  expect(resolvedModules).toEqual(['some-module']);
});

it('keeps going to collect every error when errors can throw', () => {
  const resolvedModules: Array<string> = [];
  expect(() =>
    runBabelPluginReactCompiler(SOURCE, 'test.js', 'flow', {
      panicThreshold: 'all_errors',
      environment: {
        moduleTypeProvider: (moduleName: string) => {
          resolvedModules.push(moduleName);
          return null;
        },
      },
    }),
  ).toThrow();
  expect(resolvedModules).toEqual(['some-module']);
});
