/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {transformFromAstSync} from '@babel/core';
import {parse as babelParse} from '@babel/parser';
import {File} from '@babel/types';
import BabelPluginReactCompiler, {
  parsePluginOptions,
  validateEnvironmentConfig,
  type PluginOptions,
} from 'babel-plugin-react-compiler/src';
import {Logger, LoggerEvent} from 'babel-plugin-react-compiler/src/Entrypoint';
import type {SourceCode} from 'eslint';
// @ts-expect-error: no types available
import * as HermesParser from 'hermes-parser';
import {isDeepStrictEqual} from 'util';
import type {ParseResult} from '@babel/parser';

/**
 * Lazy-loaded Rust compiler Babel plugin.
 * Only loaded when __unstable_useRustCompiler is enabled.
 */
let _rustPluginLoaded = false;
let _rustPlugin: ((babel: any) => any) | null = null;

function getRustPlugin(): (babel: any) => any {
  if (!_rustPluginLoaded) {
    _rustPluginLoaded = true;
    try {
      _rustPlugin =
        // eslint-disable-next-line no-restricted-syntax
        require('babel-plugin-react-compiler-rust').default;
    } catch {
      _rustPlugin = null;
    }
  }
  if (_rustPlugin == null) {
    throw new Error(
      'eslint-plugin-react-compiler: __unstable_useRustCompiler is enabled but ' +
        'babel-plugin-react-compiler-rust is not available. ' +
        'Make sure the package is installed and its native module is built.',
    );
  }
  return _rustPlugin;
}

const COMPILER_OPTIONS: PluginOptions = {
  outputMode: 'lint',
  panicThreshold: 'none',
  // Don't emit errors on Flow suppressions--Flow already gave a signal
  flowSuppressions: false,
  environment: validateEnvironmentConfig({
    validateRefAccessDuringRender: true,
    validateNoSetStateInRender: true,
    validateNoSetStateInEffects: true,
    validateNoJSXInTryStatements: true,
    validateNoImpureFunctionsInRender: true,
    validateStaticComponents: true,
    validateNoFreezingKnownMutableFunctions: true,
    validateNoVoidUseMemo: true,
    // TODO: remove, this should be in the type system
    validateNoCapitalizedCalls: [],
    validateHooksUsage: true,
    validateNoDerivedComputationsInEffects: true,
  }),
};

export type RunCacheEntry = {
  sourceCode: string;
  filename: string;
  userOpts: PluginOptions;
  flowSuppressions: Array<{line: number; code: string}>;
  events: Array<LoggerEvent>;
};

type RunParams = {
  sourceCode: SourceCode;
  filename: string;
  userOpts: PluginOptions;
};
const FLOW_SUPPRESSION_REGEX = /\$FlowFixMe\[([^\]]*)\]/g;

function getFlowSuppressions(
  sourceCode: SourceCode,
): Array<{line: number; code: string}> {
  const comments = sourceCode.getAllComments();
  const results: Array<{line: number; code: string}> = [];

  for (const commentNode of comments) {
    const matches = commentNode.value.matchAll(FLOW_SUPPRESSION_REGEX);
    for (const match of matches) {
      if (match.index != null && commentNode.loc != null) {
        const code = match[1];
        results.push({
          line: commentNode.loc!.end.line,
          code,
        });
      }
    }
  }
  return results;
}

function runReactCompilerImpl({
  sourceCode,
  filename,
  userOpts,
}: RunParams): RunCacheEntry {
  const useRustCompiler =
    (userOpts as Record<string, unknown>).__unstable_useRustCompiler === true;

  // Compat with older versions of eslint
  const options: PluginOptions = parsePluginOptions({
    ...COMPILER_OPTIONS,
    ...userOpts,
    environment: {
      ...COMPILER_OPTIONS.environment,
      ...userOpts.environment,
    },
  });
  const results: RunCacheEntry = {
    sourceCode: sourceCode.text,
    filename,
    userOpts,
    flowSuppressions: [],
    events: [],
  };
  const userLogger: Logger | null = options.logger;
  options.logger = {
    logEvent: (eventFilename, event): void => {
      userLogger?.logEvent(eventFilename, event);
      results.events.push(event);
    },
  };

  try {
    options.environment = validateEnvironmentConfig(options.environment ?? {});
  } catch (err: unknown) {
    options.logger?.logEvent(filename, err as LoggerEvent);
  }

  let babelAST: ParseResult<File> | null = null;
  if (filename.endsWith('.tsx') || filename.endsWith('.ts')) {
    try {
      babelAST = babelParse(sourceCode.text, {
        sourceFilename: filename,
        sourceType: 'unambiguous',
        plugins: ['typescript', 'jsx'],
      });
    } catch {
      /* empty */
    }
  } else {
    try {
      babelAST = HermesParser.parse(sourceCode.text, {
        babel: true,
        enableExperimentalComponentSyntax: true,
        sourceFilename: filename,
        sourceType: 'module',
      });
    } catch {
      /* empty */
    }
  }

  if (babelAST != null) {
    results.flowSuppressions = getFlowSuppressions(sourceCode);

    if (useRustCompiler) {
      // Rust compiler path: use the Rust NAPI Babel plugin instead of the
      // TS compiler. The Rust plugin handles scope extraction, compilation,
      // and event forwarding internally via its own resolveOptions +
      // compileWithRust pipeline.
      const RustPlugin = getRustPlugin();
      const rustOpts: Record<string, unknown> = {
        ...COMPILER_OPTIONS,
        ...userOpts,
        environment: {
          ...(COMPILER_OPTIONS.environment as Record<string, unknown>),
          ...((userOpts.environment as Record<string, unknown>) ?? {}),
        },
        logger: {
          logEvent: (
            eventFilename: string | null,
            event: LoggerEvent,
          ): void => {
            userLogger?.logEvent(eventFilename ?? '', event);
            results.events.push(event);
          },
        },
      };
      // Don't pass the ESLint-only flag to the compiler
      delete rustOpts.__unstable_useRustCompiler;

      try {
        transformFromAstSync(babelAST, sourceCode.text, {
          filename,
          highlightCode: false,
          retainLines: true,
          plugins: [[RustPlugin, rustOpts]],
          sourceType: 'module',
          configFile: false,
          babelrc: false,
        });
      } catch {
        /* errors handled by injected logger */
      }
    } else {
      try {
        transformFromAstSync(babelAST, sourceCode.text, {
          filename,
          highlightCode: false,
          retainLines: true,
          plugins: [[BabelPluginReactCompiler, options]],
          sourceType: 'module',
          configFile: false,
          babelrc: false,
        });
      } catch (err) {
        /* errors handled by injected logger */
      }
    }
  }

  return results;
}

const SENTINEL = Symbol();

// Array backed LRU cache -- should be small < 10 elements
class LRUCache<K, T> {
  // newest at headIdx, then headIdx + 1, ..., tailIdx
  #values: Array<[K, T | Error] | [typeof SENTINEL, void]>;
  #headIdx: number = 0;

  constructor(size: number) {
    this.#values = new Array(size).fill(SENTINEL);
  }

  // gets a value and sets it as "recently used"
  get(key: K): T | null {
    let idx = this.#values.findIndex(entry => entry[0] === key);
    // If found, move to front
    if (idx === this.#headIdx) {
      return this.#values[this.#headIdx][1] as T;
    } else if (idx < 0) {
      return null;
    }

    const entry: [K, T] = this.#values[idx] as [K, T];

    const len = this.#values.length;
    for (let i = 0; i < Math.min(idx, len - 1); i++) {
      this.#values[(this.#headIdx + i + 1) % len] =
        this.#values[(this.#headIdx + i) % len];
    }
    this.#values[this.#headIdx] = entry;
    return entry[1];
  }
  push(key: K, value: T): void {
    this.#headIdx =
      (this.#headIdx - 1 + this.#values.length) % this.#values.length;
    this.#values[this.#headIdx] = [key, value];
  }
}
const cache = new LRUCache<string, RunCacheEntry>(10);

export default function runReactCompiler({
  sourceCode,
  filename,
  userOpts,
}: RunParams): RunCacheEntry {
  const entry = cache.get(filename);
  if (
    entry != null &&
    entry.sourceCode === sourceCode.text &&
    isDeepStrictEqual(entry.userOpts, userOpts)
  ) {
    return entry;
  } else if (entry != null) {
    if (process.env['DEBUG']) {
      console.log(
        `Cache hit for ${filename}, but source code or options changed, recomputing`,
      );
    }
  }

  const runEntry = runReactCompilerImpl({
    sourceCode,
    filename,
    userOpts,
  });
  // If we have a cache entry, we can update it
  if (entry != null) {
    Object.assign(entry, runEntry);
  } else {
    cache.push(filename, runEntry);
  }
  return {...runEntry};
}
