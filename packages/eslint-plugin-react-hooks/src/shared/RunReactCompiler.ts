/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable no-for-of-loops/no-for-of-loops */

import {transformFromAstSync} from '@babel/core';
import {parse as babelParse} from '@babel/parser';
import {File} from '@babel/types';
import BabelPluginReactCompiler, {
  parsePluginOptions,
  validateEnvironmentConfig,
  type PluginOptions,
  Logger,
  LoggerEvent,
} from 'babel-plugin-react-compiler';
import type {SourceCode} from 'eslint';
import type * as ESTree from 'estree';
import * as HermesParser from 'hermes-parser';
import {isDeepStrictEqual} from 'util';
import type {ParseResult} from '@babel/parser';
import {
  eprh_enableUseKeyedStateCompilerLint,
  eprh_enableVerboseNoSetStateInEffectCompilerLint,
  eprh_enableExhaustiveEffectDependenciesCompilerLint,
} from 'shared/ReactFeatureFlags';

// Pattern for component names: starts with uppercase letter
const COMPONENT_NAME_PATTERN = /^[A-Z]/;
// Pattern for hook names: starts with 'use' followed by uppercase letter or digit
const HOOK_NAME_PATTERN = /^use[A-Z0-9]/;

/**
 * Quick heuristic using ESLint's already-parsed AST to detect if the file
 * may contain React components or hooks based on function naming patterns.
 * Only checks top-level declarations since components/hooks are declared at module scope.
 * Returns true if compilation should proceed, false to skip.
 */
function mayContainReactCode(sourceCode: SourceCode): boolean {
  const ast = sourceCode.ast;

  // Only check top-level statements - components/hooks are declared at module scope
  for (const node of ast.body) {
    if (checkTopLevelNode(node)) {
      return true;
    }
  }

  return false;
}

function checkTopLevelNode(node: ESTree.Node): boolean {
  // Handle Flow component/hook declarations (hermes-eslint produces these node types)
  // @ts-expect-error not part of ESTree spec
  if (node.type === 'ComponentDeclaration' || node.type === 'HookDeclaration') {
    return true;
  }

  // Handle: export function MyComponent() {} or export const useHook = () => {}
  if (node.type === 'ExportNamedDeclaration') {
    const decl = (node as ESTree.ExportNamedDeclaration).declaration;
    if (decl != null) {
      return checkTopLevelNode(decl);
    }
    return false;
  }

  // Handle: export default function MyComponent() {} or export default () => {}
  if (node.type === 'ExportDefaultDeclaration') {
    const decl = (node as ESTree.ExportDefaultDeclaration).declaration;
    // Anonymous default function export - compile conservatively
    if (
      decl.type === 'FunctionExpression' ||
      decl.type === 'ArrowFunctionExpression' ||
      (decl.type === 'FunctionDeclaration' &&
        (decl as ESTree.FunctionDeclaration).id == null)
    ) {
      return true;
    }
    return checkTopLevelNode(decl as ESTree.Node);
  }

  // Handle: function MyComponent() {}
  // Also handles Flow component/hook syntax transformed to FunctionDeclaration with flags
  if (node.type === 'FunctionDeclaration') {
    // Check for Hermes-added flags indicating Flow component/hook syntax
    if ('__componentDeclaration' in node || '__hookDeclaration' in node) {
      return true;
    }
    const id = (node as ESTree.FunctionDeclaration).id;
    if (id != null) {
      const name = id.name;
      if (COMPONENT_NAME_PATTERN.test(name) || HOOK_NAME_PATTERN.test(name)) {
        return true;
      }
    }
  }

  // Handle: const MyComponent = () => {} or const useHook = function() {}
  if (node.type === 'VariableDeclaration') {
    for (const decl of (node as ESTree.VariableDeclaration).declarations) {
      if (decl.id.type === 'Identifier') {
        const init = decl.init;
        if (
          init != null &&
          (init.type === 'ArrowFunctionExpression' ||
            init.type === 'FunctionExpression')
        ) {
          const name = decl.id.name;
          if (
            COMPONENT_NAME_PATTERN.test(name) ||
            HOOK_NAME_PATTERN.test(name)
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

const COMPILER_OPTIONS: PluginOptions = {
  outputMode: 'lint',
  panicThreshold: 'none',
  // Don't emit errors on Flow suppressions--Flow already gave a signal
  flowSuppressions: false,
  environment: {
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

    // Experimental options controlled by ReactFeatureFlags
    enableUseKeyedState: eprh_enableUseKeyedStateCompilerLint,
    enableVerboseNoSetStateInEffect:
      eprh_enableVerboseNoSetStateInEffectCompilerLint,
    validateExhaustiveEffectDependencies:
      eprh_enableExhaustiveEffectDependenciesCompilerLint,
  },
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
  // Compat with older versions of eslint
  const options = parsePluginOptions({
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
    const idx = this.#values.findIndex(entry => entry[0] === key);
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
  }

  // Quick heuristic: skip files that don't appear to contain React code.
  // We still cache the empty result so subsequent rules don't re-run the check.
  if (!mayContainReactCode(sourceCode)) {
    const emptyResult: RunCacheEntry = {
      sourceCode: sourceCode.text,
      filename,
      userOpts,
      flowSuppressions: [],
      events: [],
    };
    if (entry != null) {
      Object.assign(entry, emptyResult);
    } else {
      cache.push(filename, emptyResult);
    }
    return {...emptyResult};
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
