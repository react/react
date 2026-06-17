/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {ResolvedOptions} from './options';
import type {ScopeInfo} from './scope';
import type * as t from '@babel/types';

export interface DebugLogEntry {
  kind: 'debug';
  name: string;
  value: string;
}

export interface BindingRenameInfo {
  original: string;
  renamed: string;
  declarationStart: number;
}

export interface OrderedLogItem {
  type: 'event' | 'debug';
  event?: LoggerEvent;
  entry?: DebugLogEntry;
}

export interface CompileSuccess {
  kind: 'success';
  ast: t.File | null;
  events: Array<LoggerEvent>;
  orderedLog?: Array<OrderedLogItem>;
  renames?: Array<BindingRenameInfo>;
}

export interface CompileError {
  kind: 'error';
  error: {
    reason: string;
    description?: string;
    details: Array<unknown>;
  };
  events: Array<LoggerEvent>;
  orderedLog?: Array<OrderedLogItem>;
}

export type CompileResult = CompileSuccess | CompileError;

export type LoggerEvent = {
  kind: string;
  [key: string]: unknown;
};

// The napi-rs generated binding.
// This will be available once the native module is built.
// For now, we use a dynamic require that will be resolved at runtime.
let rustCompile:
  | ((ast: string, scope: string, options: string) => string)
  | null = null;

function getRustCompile(): (
  ast: string,
  scope: string,
  options: string,
) => string {
  if (rustCompile == null) {
    try {
      // Try to load the native module
      const native = require('../native');
      rustCompile = native.compile;
    } catch (e) {
      throw new Error(
        'babel-plugin-react-compiler-rust: Failed to load native module. ' +
          'Make sure the native addon is built. Error: ' +
          (e as Error).message,
      );
    }
  }
  return rustCompile!;
}

/**
 * Encode lone surrogate escapes so they survive the Rust serde_json round-trip.
 * JS JSON.stringify can produce \uD800-\uDFFF lone surrogates which are invalid
 * in Rust's serde_json (expects valid UTF-8/Unicode). We encode them as recoverable
 * markers (__SURROGATE_XXXX__) and restore them via restoreJsonSurrogates on output.
 *
 * Important: we must NOT replace escaped surrogate sequences like \\uD83D\\uDE80
 * that appear in extra.raw fields (literal source text). Those have a double
 * backslash in the JSON (the first \ escapes the second), so we use a negative
 * lookbehind to skip them.
 */
function sanitizeJsonSurrogates(json: string): string {
  // Encode lone surrogates as recoverable markers instead of replacing with
  // \uFFFD. This preserves the original surrogate values through the Rust
  // round-trip. restoreJsonSurrogates reverses this on the output side.
  return json
    .replace(
      /(?<!\\)\\u([dD][89aAbB][0-9a-fA-F]{2})(?!\\u[dD][c-fC-F][0-9a-fA-F]{2})/g,
      (_, hex) => `__SURROGATE_${hex.toUpperCase()}__`,
    )
    .replace(
      /(?<!\\u[dD][89aAbB][0-9a-fA-F]{2})(?<!\\)\\u([dD][c-fC-F][0-9a-fA-F]{2})/g,
      (_, hex) => `__SURROGATE_${hex.toUpperCase()}__`,
    );
}

function restoreJsonSurrogates(json: string): string {
  return json.replace(/__SURROGATE_([0-9A-F]{4})__/g, (_, hex) => `\\u${hex}`);
}

export function compileWithRust(
  ast: t.File,
  scopeInfo: ScopeInfo,
  options: ResolvedOptions,
  code?: string | null,
): CompileResult {
  const compile = getRustCompile();

  const optionsWithCode =
    code != null ? {...options, __sourceCode: code} : options;
  const resultJson = compile(
    sanitizeJsonSurrogates(JSON.stringify(ast)),
    JSON.stringify(scopeInfo),
    JSON.stringify(optionsWithCode),
  );

  return JSON.parse(restoreJsonSurrogates(resultJson)) as CompileResult;
}

export interface TimingEntry {
  name: string;
  duration_us: number;
}

export interface BridgeTiming {
  jsStringifyAst_us: number;
  jsStringifyScope_us: number;
  jsStringifyOptions_us: number;
  napiCall_us: number;
  jsParseResult_us: number;
}

export interface ProfiledCompileResult {
  result: CompileResult;
  bridgeTiming: BridgeTiming;
  rustTiming: Array<TimingEntry>;
}

export function compileWithRustProfiled(
  ast: t.File,
  scopeInfo: ScopeInfo,
  options: ResolvedOptions,
  code?: string | null,
): ProfiledCompileResult {
  const compile = getRustCompile();

  const optionsWithCode =
    code != null
      ? {...options, __sourceCode: code, __profiling: true}
      : {...options, __profiling: true};

  const t0 = performance.now();
  const astJson = sanitizeJsonSurrogates(JSON.stringify(ast));
  const t1 = performance.now();
  const scopeJson = JSON.stringify(scopeInfo);
  const t2 = performance.now();
  const optionsJson = JSON.stringify(optionsWithCode);
  const t3 = performance.now();

  const resultJson = compile(astJson, scopeJson, optionsJson);
  const t4 = performance.now();

  const result = JSON.parse(
    restoreJsonSurrogates(resultJson),
  ) as CompileResult & {
    timing?: Array<TimingEntry>;
  };
  const t5 = performance.now();

  const rustTiming = result.timing ?? [];
  delete result.timing;

  return {
    result,
    bridgeTiming: {
      jsStringifyAst_us: Math.round((t1 - t0) * 1000),
      jsStringifyScope_us: Math.round((t2 - t1) * 1000),
      jsStringifyOptions_us: Math.round((t3 - t2) * 1000),
      napiCall_us: Math.round((t4 - t3) * 1000),
      jsParseResult_us: Math.round((t5 - t4) * 1000),
    },
    rustTiming,
  };
}
