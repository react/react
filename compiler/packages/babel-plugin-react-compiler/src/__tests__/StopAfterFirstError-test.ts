/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {transformFromAstSync} from '@babel/core';
import * as BabelParser from '@babel/parser';
import type {NodePath} from '@babel/traverse';
import type * as t from '@babel/types';
import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';
import {CompilerError, ErrorCategory} from '../CompilerError';
import {
  compileFn,
  parsePluginOptions,
  ProgramContext,
  type Logger,
  type LoggerEvent,
  type PluginOptions,
} from '../Entrypoint';

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

/*
 * `Broken` fails to compile (`var` is not supported). Before it fails, it would
 * outline its arrow function and reserve the program-wide name `_temp`, so the
 * outlined function in `Healthy` would become `_temp2`.
 */
const OUTLINING_SOURCE = `
function Broken(props) {
  var x = props.x;
  const helper = y => y * 2;
  return <div>{helper(x)}</div>;
}
function Healthy(props) {
  const helper = y => y * 2;
  return <span>{helper(props.x)}</span>;
}
`;

it('does not reserve names for functions that fail to compile', () => {
  const code = runBabelPluginReactCompiler(
    OUTLINING_SOURCE,
    'test.js',
    'flow',
    {panicThreshold: 'none'},
  ).code;
  expect(code).toContain('function _temp(');
  expect(code).not.toContain('_temp2');
});

it('reserves the same names as before when a logger is attached', () => {
  const logger: Logger = {logEvent() {}};
  const code = runBabelPluginReactCompiler(
    OUTLINING_SOURCE,
    'test.js',
    'flow',
    {panicThreshold: 'none', logger},
  ).code;
  expect(code).toContain('function _temp2(');
});

/*
 * Compiles the first function of `source` with the exported `compileFn` and
 * returns the error it reports.
 */
function compileFirstFunction(
  source: string,
  stopAtFirstError?: boolean,
): CompilerError {
  const opts = parsePluginOptions({panicThreshold: 'none'});
  const ast = BabelParser.parse(source, {
    sourceType: 'module',
    plugins: ['flow', 'jsx'],
  });
  let error: CompilerError | null = null;
  transformFromAstSync(ast, source, {
    filename: 'test.js',
    configFile: false,
    babelrc: false,
    plugins: [
      () => ({
        visitor: {
          Program(program: NodePath<t.Program>) {
            const programContext = new ProgramContext({
              program,
              opts,
              filename: 'test.js',
              code: source,
              suppressions: [],
              hasModuleScopeOptOut: false,
            });
            const fn = program.get('body.0') as NodePath<t.FunctionDeclaration>;
            const result = compileFn(
              fn,
              opts.environment,
              'Component',
              'client',
              programContext,
              null,
              'test.js',
              source,
              stopAtFirstError,
            );
            error = result.unwrapErr();
          },
        },
      }),
    ],
  });
  return error!;
}

const MULTI_ERROR_SOURCE = `
function Component(props) {
  var x = props.x;
  props.y = 1;
  return <div>{x}</div>;
}
`;

it('collects every error by default when compileFn is called directly', () => {
  const categories = compileFirstFunction(MULTI_ERROR_SOURCE).details.map(
    detail => detail.category,
  );
  expect(categories).toContain(ErrorCategory.Todo);
  expect(categories).toContain(ErrorCategory.Immutability);
});

it('only stops at the first error when compileFn is asked to', () => {
  const categories = compileFirstFunction(MULTI_ERROR_SOURCE, true).details.map(
    detail => detail.category,
  );
  expect(categories).toEqual([ErrorCategory.Todo]);
});
