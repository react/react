/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from '@babel/types';
import invariant from 'invariant';
import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';
import type {Logger, LoggerEvent} from '../Entrypoint';

it('logs successful compilation', () => {
  const logs: [string | null, LoggerEvent][] = [];
  const logger: Logger = {
    logEvent(filename, event) {
      logs.push([filename, event]);
    },
  };

  const _ = runBabelPluginReactCompiler(
    'function Component(props) { return <div>{props}</div> }',
    'test.js',
    'flow',
    {logger, panicThreshold: 'all_errors'},
  );

  const [filename, event] = logs.at(0)!;
  expect(filename).toContain('test.js');
  expect(event.kind).toEqual('CompileSuccess');
  invariant(event.kind === 'CompileSuccess', 'typescript be smarter');
  expect(event.fnName).toEqual('Component');
  expect(event.fnLoc?.end).toEqual({column: 55, index: 55, line: 1});
  expect(event.fnLoc?.start).toEqual({column: 0, index: 0, line: 1});
});

it('logs failed compilation', () => {
  const logs: [string | null, LoggerEvent][] = [];
  const logger: Logger = {
    logEvent(filename, event) {
      logs.push([filename, event]);
    },
  };

  expect(() => {
    runBabelPluginReactCompiler(
      'function Component(props) { props.foo = 1; return <div>{props}</div> }',
      'test.js',
      'flow',
      {logger, panicThreshold: 'all_errors'},
    );
  }).toThrow();

  const [filename, event] = logs.at(0)!;
  expect(filename).toContain('test.js');
  expect(event.kind).toEqual('CompileError');
  invariant(event.kind === 'CompileError', 'typescript be smarter');

  expect(event.detail.severity).toEqual('Error');
  const errorDetail = event.detail.details?.find(d => d.kind === 'error');
  expect(errorDetail).toBeDefined();
  const loc = errorDetail!.loc as t.SourceLocation;
  expect(loc.start).toEqual({column: 28, index: 28, line: 1});
  expect(loc.end).toEqual({column: 33, index: 33, line: 1});
  expect(loc.identifierName).toEqual('props');

  // Make sure event.fnLoc is different from event.detail.loc
  expect(event.fnLoc?.start).toEqual({column: 0, index: 0, line: 1});
  expect(event.fnLoc?.end).toEqual({column: 70, index: 70, line: 1});
});
