/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {PluginObj} from '@babel/core';
import type {parseConfigPragmaForTests as ParseConfigPragma} from 'babel-plugin-react-compiler/src/Utils/TestUtils';
import type {printFunctionWithOutlined as PrintFunctionWithOutlined} from 'babel-plugin-react-compiler/src/HIR/PrintHIR';
import type {printReactiveFunctionWithOutlined as PrintReactiveFunctionWithOutlined} from 'babel-plugin-react-compiler/src/ReactiveScopes/PrintReactiveFunction';
import {TransformResult, transformFixtureInput} from './compiler';
import {
  PARSE_CONFIG_PRAGMA_IMPORT,
  PRINT_HIR_IMPORT,
  PRINT_REACTIVE_IR_IMPORT,
  BABEL_PLUGIN_SRC,
  BABEL_PLUGIN_RUST_SRC,
} from './constants';
import {TestFixture, getBasename, isExpectError} from './fixture-utils';
import {TestResult, writeOutputToString} from './reporter';
import {runSprout} from './sprout';
import type {
  CompilerPipelineValue,
  Effect,
  ValueKind,
  ValueReason,
} from 'babel-plugin-react-compiler/src';
import chalk from 'chalk';

const originalConsoleError = console.error;

// Try to avoid clearing the entire require cache, which (as of this PR)
// contains ~1250 files. This assumes that no dependencies have global caches
// that may need to be invalidated across Forget reloads.
const invalidationSubpath = 'packages/babel-plugin-react-compiler/dist';
const rustInvalidationSubpath =
  'packages/babel-plugin-react-compiler-rust/dist';
let version: number | null = null;
export function clearRequireCache() {
  Object.keys(require.cache).forEach(function (path) {
    if (
      path.includes(invalidationSubpath) ||
      path.includes(rustInvalidationSubpath)
    ) {
      delete require.cache[path];
    }
  });
}

async function compile(
  input: string,
  fixturePath: string,
  compilerVersion: number,
  shouldLog: boolean,
  includeEvaluator: boolean,
  enableRust: boolean = false,
): Promise<{
  error: string | null;
  compileResult: TransformResult | null;
}> {
  const seenConsoleErrors: Array<string> = [];
  console.error = (...messages: Array<string>) => {
    seenConsoleErrors.push(...messages);
  };
  if (version !== null && compilerVersion !== version) {
    clearRequireCache();
  }
  version = compilerVersion;

  let compileResult: TransformResult | null = null;
  let error: string | null = null;
  try {
    // Always load TS compiler for utilities (parseConfigPragmaForTests, print functions)
    const importedCompilerPlugin = require(BABEL_PLUGIN_SRC) as Record<
      string,
      unknown
    >;

    // Load the appropriate babel plugin
    const pluginSrc = enableRust ? BABEL_PLUGIN_RUST_SRC : BABEL_PLUGIN_SRC;
    const importedPlugin = enableRust
      ? (require(pluginSrc) as Record<string, unknown>)
      : importedCompilerPlugin;

    // NOTE: we intentionally require lazily here so that we can clear the require cache
    // and load fresh versions of the compiler when `compilerVersion` changes.
    const BabelPluginReactCompiler = importedPlugin['default'] as PluginObj;
    const EffectEnum = importedCompilerPlugin['Effect'] as typeof Effect;
    const ValueKindEnum = importedCompilerPlugin[
      'ValueKind'
    ] as typeof ValueKind;
    const ValueReasonEnum = importedCompilerPlugin[
      'ValueReason'
    ] as typeof ValueReason;
    const printFunctionWithOutlined = importedCompilerPlugin[
      PRINT_HIR_IMPORT
    ] as typeof PrintFunctionWithOutlined;
    const printReactiveFunctionWithOutlined = importedCompilerPlugin[
      PRINT_REACTIVE_IR_IMPORT
    ] as typeof PrintReactiveFunctionWithOutlined;
    const parseConfigPragmaForTests = importedCompilerPlugin[
      PARSE_CONFIG_PRAGMA_IMPORT
    ] as typeof ParseConfigPragma;

    let lastLogged: string | null = null;
    const debugIRLogger = shouldLog
      ? (value: CompilerPipelineValue) => {
          let printed: string;
          switch (value.kind) {
            case 'hir':
              printed = printFunctionWithOutlined(value.value);
              break;
            case 'reactive':
              printed = printReactiveFunctionWithOutlined(value.value);
              break;
            case 'debug':
              printed = value.value;
              break;
            case 'ast':
              // skip printing ast as we already write fixture output JS
              printed = '(ast)';
              break;
          }

          if (printed !== lastLogged) {
            lastLogged = printed;
            console.log(`${chalk.green(value.name)}:\n ${printed}\n`);
          } else {
            console.log(`${chalk.blue(value.name)}: (no change)\n`);
          }
        }
      : () => {};

    // only try logging if we filtered out all but one fixture,
    // since console log order is non-deterministic
    const result = await transformFixtureInput(
      input,
      fixturePath,
      parseConfigPragmaForTests,
      BabelPluginReactCompiler,
      includeEvaluator,
      debugIRLogger,
      EffectEnum,
      ValueKindEnum,
      ValueReasonEnum,
    );

    if (result.kind === 'err') {
      error = result.msg;
    } else {
      compileResult = result.value;
    }
  } catch (e) {
    if (shouldLog) {
      console.error(e.stack);
    }
    error = e.message.replace(/\u001b[^m]*m/g, '');
  }

  // Promote console errors so they can be recorded in fixture output
  for (const consoleError of seenConsoleErrors) {
    if (error != null) {
      error = `${error}\n\n${consoleError}`;
    } else {
      error = `ConsoleError: ${consoleError}`;
    }
  }
  console.error = originalConsoleError;

  return {
    error,
    compileResult,
  };
}

export async function transformFixture(
  fixture: TestFixture,
  compilerVersion: number,
  shouldLog: boolean,
  includeEvaluator: boolean,
  enableRust: boolean = false,
): Promise<TestResult> {
  const {input, snapshot: expected, snapshotPath: outputPath} = fixture;
  const basename = getBasename(fixture);
  const expectError = isExpectError(fixture);

  // Input will be null if the input file did not exist, in which case the output file
  // is stale
  if (input === null) {
    return {
      outputPath,
      actual: null,
      expected,
      unexpectedError: null,
    };
  }
  const {compileResult, error} = await compile(
    input,
    fixture.fixturePath,
    compilerVersion,
    shouldLog,
    includeEvaluator,
    enableRust,
  );

  let unexpectedError: string | null = null;
  if (expectError) {
    if (error === null) {
      unexpectedError = `Expected an error to be thrown for fixture: \`${basename}\`, remove the 'error.' prefix if an error is not expected.`;
    }
  } else {
    if (error !== null) {
      unexpectedError = `Expected fixture \`${basename}\` to succeed but it failed with error:\n\n${error}`;
    } else if (compileResult == null) {
      unexpectedError = `Expected output for fixture \`${basename}\`.`;
    }
  }

  const snapOutput: string | null = compileResult?.forgetOutput ?? null;
  let sproutOutput: string | null = null;
  if (compileResult?.evaluatorCode != null) {
    const sproutResult = runSprout(
      compileResult.evaluatorCode.original,
      compileResult.evaluatorCode.forget,
    );
    if (sproutResult.kind === 'invalid') {
      unexpectedError ??= '';
      unexpectedError += `\n\n${sproutResult.value}`;
    } else {
      sproutOutput = sproutResult.value;
    }
  } else if (!includeEvaluator && expected != null) {
    sproutOutput = expected.split('\n### Eval output\n')[1];
  }

  const actualOutput = writeOutputToString(
    input,
    snapOutput,
    sproutOutput,
    compileResult?.logs ?? null,
    error,
  );

  return {
    outputPath,
    actual: actualOutput,
    expected,
    unexpectedError,
  };
}
