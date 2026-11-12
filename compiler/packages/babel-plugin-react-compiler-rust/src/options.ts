/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as BabelCore from '@babel/core';
import type * as t from '@babel/types';

export interface ResolvedOptions {
  // Pre-resolved by JS
  shouldCompile: boolean;
  enableReanimated: boolean;
  isDev: boolean;
  filename: string | null;

  // Pass-through
  compilationMode: string;
  panicThreshold: string;
  target: unknown;
  gating: unknown;
  dynamicGating: unknown;
  noEmit: boolean;
  outputMode: string | null;
  eslintSuppressionRules: string[] | null;
  flowSuppressions: boolean;
  ignoreUseNoForget: boolean;
  customOptOutDirectives: string[] | null;
  environment: Record<string, unknown>;
}

export interface Logger {
  logEvent(filename: string | null, event: unknown): void;
  debugLogIRs?(value: unknown): void;
}

export type PluginOptions = Partial<ResolvedOptions> & {
  sources?: ((filename: string) => boolean) | string[];
  enableReanimatedCheck?: boolean;
  logger?: Logger | null;
} & Record<string, unknown>;

/**
 * Check if the Babel pipeline uses the Reanimated plugin.
 */
function pipelineUsesReanimatedPlugin(
  plugins: Array<BabelCore.PluginItem> | null | undefined,
): boolean {
  if (Array.isArray(plugins)) {
    for (const plugin of plugins) {
      if (plugin != null && typeof plugin === 'object' && 'key' in plugin) {
        const key = (plugin as any).key;
        if (
          typeof key === 'string' &&
          key.indexOf('react-native-reanimated') !== -1
        ) {
          return true;
        }
      }
    }
  }
  // Check if reanimated module is available
  if (typeof require !== 'undefined') {
    try {
      return !!require.resolve('react-native-reanimated');
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Prepare the environment config for JSON serialization to Rust.
 * Converts Map instances to plain objects, pre-resolves moduleTypeProvider,
 * and strips non-serializable fields.
 */
function serializeEnvironment(
  rawEnv: Record<string, unknown>,
  ast: t.File,
): Record<string, unknown> {
  const environment: Record<string, unknown> = {...rawEnv};

  // Convert customHooks Map to plain object for JSON serialization
  if (rawEnv.customHooks instanceof Map) {
    const hooks: Record<string, unknown> = {};
    for (const [key, value] of rawEnv.customHooks) {
      hooks[key] = value;
    }
    environment.customHooks = hooks;
  }

  // Pre-resolve moduleTypeProvider: collect all import sources from AST,
  // call the provider for each, and serialize results as a map
  const moduleTypeProvider = rawEnv.moduleTypeProvider as
    | ((name: string) => unknown)
    | null
    | undefined;
  delete environment.moduleTypeProvider;

  if (typeof moduleTypeProvider === 'function') {
    const moduleTypes: Record<string, unknown> = {};
    for (const node of ast.program.body) {
      if (
        node.type === 'ImportDeclaration' &&
        typeof node.source.value === 'string'
      ) {
        const moduleName = node.source.value;
        if (!(moduleName in moduleTypes)) {
          const result = moduleTypeProvider(moduleName);
          if (result != null) {
            moduleTypes[moduleName] = result;
          }
        }
      }
    }
    if (Object.keys(moduleTypes).length > 0) {
      environment.moduleTypeProvider = moduleTypes;
    }
  }

  delete environment.flowTypeProvider;

  return environment;
}

export function resolveOptions(
  rawOpts: PluginOptions,
  file: BabelCore.BabelFile,
  filename: string | null,
  ast: t.File,
): ResolvedOptions {
  // Resolve sources filter (may be a function)
  let shouldCompile = true;
  if (rawOpts.sources != null && filename != null) {
    if (typeof rawOpts.sources === 'function') {
      shouldCompile = rawOpts.sources(filename);
    } else if (Array.isArray(rawOpts.sources)) {
      shouldCompile = rawOpts.sources.some(
        (prefix: string) => filename.indexOf(prefix) !== -1,
      );
    }
  } else if (rawOpts.sources != null && filename == null) {
    shouldCompile = false; // sources specified but no filename
  }

  // Resolve reanimated check
  const enableReanimated =
    rawOpts.enableReanimatedCheck !== false &&
    pipelineUsesReanimatedPlugin(file.opts.plugins);

  // Resolve isDev
  const isDev =
    (typeof globalThis !== 'undefined' &&
      (globalThis as any).__DEV__ === true) ||
    process.env['NODE_ENV'] === 'development';

  return {
    shouldCompile,
    enableReanimated,
    isDev,
    filename,
    compilationMode: (rawOpts.compilationMode as string) ?? 'infer',
    panicThreshold: (rawOpts.panicThreshold as string) ?? 'none',
    target: rawOpts.target ?? '19',
    gating: rawOpts.gating ?? null,
    dynamicGating: rawOpts.dynamicGating ?? null,
    noEmit: rawOpts.noEmit ?? false,
    outputMode: (rawOpts.outputMode as string) ?? null,
    eslintSuppressionRules: rawOpts.eslintSuppressionRules ?? null,
    flowSuppressions: rawOpts.flowSuppressions ?? true,
    ignoreUseNoForget: rawOpts.ignoreUseNoForget ?? false,
    customOptOutDirectives: rawOpts.customOptOutDirectives ?? null,
    environment: serializeEnvironment(
      (rawOpts.environment as Record<string, unknown>) ?? {},
      ast,
    ),
  };
}
