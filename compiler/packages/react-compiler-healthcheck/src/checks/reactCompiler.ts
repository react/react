/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as BabelCore from '@babel/core';
import {transformFromAstSync} from '@babel/core';
import * as BabelParser from '@babel/parser';
import BabelPluginReactCompiler, {
  ErrorSeverity,
  type CompilerErrorDetailOptions,
  type PluginOptions,
} from 'babel-plugin-react-compiler/src';
import {LoggerEvent as RawLoggerEvent} from 'babel-plugin-react-compiler/src/Entrypoint';
import chalk from 'chalk';

type LoggerEvent = RawLoggerEvent & {filename: string | null};

const SucessfulCompilation: Array<LoggerEvent> = [];
const ActionableFailures: Array<LoggerEvent> = [];
const OtherFailures: Array<LoggerEvent> = [];

const logger = {
  logEvent(filename: string | null, rawEvent: RawLoggerEvent) {
    const event = {...rawEvent, filename};
    switch (event.kind) {
      case 'CompileSuccess': {
        SucessfulCompilation.push(event);
        return;
      }
      case 'CompileError': {
        if (isActionableDiagnostic(event.detail)) {
          ActionableFailures.push(event);
          return;
        }
        OtherFailures.push(event);
        return;
      }
      case 'CompileDiagnostic':
      case 'PipelineError':
        OtherFailures.push(event);
        return;
    }
  },
};

const COMPILER_OPTIONS: PluginOptions = {
  noEmit: true,
  compilationMode: 'infer',
  panicThreshold: 'critical_errors',
  logger,
};

function isActionableDiagnostic(detail: CompilerErrorDetailOptions) {
  switch (detail.severity) {
    case ErrorSeverity.InvalidReact:
    case ErrorSeverity.InvalidJS:
      return true;
    case ErrorSeverity.InvalidConfig:
    case ErrorSeverity.Invariant:
    case ErrorSeverity.CannotPreserveMemoization:
    case ErrorSeverity.Todo:
      return false;
    default:
      throw new Error(`Unhandled error severity \`${detail.severity}\``);
  }
}

function runBabelPluginReactCompiler(
  text: string,
  file: string,
  language: 'flow' | 'typescript',
  options: PluginOptions | null,
): BabelCore.BabelFileResult {
  const ast = BabelParser.parse(text, {
    sourceFilename: file,
    plugins: [language, 'jsx'],
    sourceType: 'module',
  });
  const result = transformFromAstSync(ast, text, {
    filename: file,
    highlightCode: false,
    retainLines: true,
    plugins: [[BabelPluginReactCompiler, options]],
    sourceType: 'module',
    configFile: false,
    babelrc: false,
  });
  if (result?.code == null) {
    throw new Error(
      `Expected BabelPluginReactForget to codegen successfully, got: ${result}`,
    );
  }
  return result;
}

function compile(sourceCode: string, filename: string) {
  try {
    runBabelPluginReactCompiler(
      sourceCode,
      filename,
      'typescript',
      COMPILER_OPTIONS,
    );
  } catch {}
}

const JsFileExtensionRE = /(js|ts|jsx|tsx)$/;

/**
 * Counts unique source locations (filename + function definition location)
 * in source.
 * The compiler currently occasionally emits multiple error events for a
 * single file (e.g. to report multiple rules of react violations in the
 * same pass).
 * TODO: enable non-destructive `CompilerDiagnostic` logging in dev mode,
 * and log a "CompilationStart" event for every function we begin processing.
 */
function countUniqueLocInEvents(events: Array<LoggerEvent>): number {
  const seenLocs = new Set<string>();
  let count = 0;
  for (const e of events) {
    if (e.filename != null && e.fnLoc != null) {
      seenLocs.add(`${e.filename}:${e.fnLoc.start}:${e.fnLoc.end}`);
    } else {
      // failed to dedup due to lack of source locations
      count++;
    }
  }
  return count + seenLocs.size;
}

export default {
  run(source: string, path: string): void {
    if (JsFileExtensionRE.exec(path) !== null) {
      compile(source, path);
    }
  },

  report(): void {
    const totalComponents =
      SucessfulCompilation.length +
      countUniqueLocInEvents(OtherFailures) +
      countUniqueLocInEvents(ActionableFailures);
    console.log(
      chalk.green(
        `Successfully compiled ${SucessfulCompilation.length} out of ${totalComponents} components.`,
      ),
    );
  },
};
