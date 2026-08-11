/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {fromZodError} from 'zod-validation-error/v4';
import {CompilerError} from '../CompilerError';
import {
  CompilationMode,
  defaultOptions,
  parsePluginOptions,
  PluginOptions,
} from '../Entrypoint';
import {EnvironmentConfig} from '..';
import {GeneratedSource} from '../HIR/HIR';
import {
  EnvironmentConfigSchema,
  PartialEnvironmentConfig,
} from '../HIR/Environment';
import {Err, Ok, Result} from './Result';
import {hasOwnProperty} from './utils';

function tryParseTestPragmaValue(val: string): Result<unknown, unknown> {
  try {
    let parsedVal: unknown;
    const stringMatch = /^"([^"]*)"$/.exec(val);
    if (stringMatch && stringMatch.length > 1) {
      parsedVal = stringMatch[1];
    } else {
      parsedVal = JSON.parse(val);
    }
    return Ok(parsedVal);
  } catch (e) {
    return Err(e);
  }
}

const testComplexConfigDefaults: PartialEnvironmentConfig = {
  validateNoCapitalizedCalls: [],
  enableEmitInstrumentForget: {
    fn: {
      source: 'react-compiler-runtime',
      importSpecifierName: 'useRenderCounter',
    },
    gating: {
      source: 'react-compiler-runtime',
      importSpecifierName: 'shouldInstrument',
    },
    globalGating: 'DEV',
  },
  enableEmitHookGuards: {
    source: 'react-compiler-runtime',
    importSpecifierName: '$dispatcherGuard',
  },
};

function* splitPragma(
  pragma: string,
): Generator<{key: string; value: string | null}> {
  for (const entry of pragma.split('@')) {
    const keyVal = entry.trim();
    const valIdx = keyVal.indexOf(':');
    if (valIdx === -1) {
      yield {key: keyVal.split(' ', 1)[0], value: null};
    } else {
      yield {key: keyVal.slice(0, valIdx), value: keyVal.slice(valIdx + 1)};
    }
  }
}

/**
 * For snap test fixtures and playground only.
 */
function parseConfigPragmaEnvironmentForTest(
  pragma: string,
  defaultConfig: PartialEnvironmentConfig,
): EnvironmentConfig {
  // throw early if the defaults are invalid
  EnvironmentConfigSchema.parse(defaultConfig);

  const maybeConfig: Partial<Record<keyof EnvironmentConfig, unknown>> =
    defaultConfig;

  for (const {key, value: val} of splitPragma(pragma)) {
    if (!hasOwnProperty(EnvironmentConfigSchema.shape, key)) {
      continue;
    }
    const isSet = val == null || val === 'true';
    if (isSet && key in testComplexConfigDefaults) {
      maybeConfig[key] = testComplexConfigDefaults[key];
    } else if (isSet) {
      maybeConfig[key] = true;
    } else if (val === 'false') {
      maybeConfig[key] = false;
    } else if (val) {
      const parsedVal = tryParseTestPragmaValue(val).unwrap();
      if (key === 'customMacros' && typeof parsedVal === 'string') {
        maybeConfig[key] = [parsedVal.split('.')[0]];
        continue;
      }
      maybeConfig[key] = parsedVal;
    }
  }
  const config = EnvironmentConfigSchema.safeParse(maybeConfig);
  if (config.success) {
    /**
     * Unless explicitly enabled, do not insert HMR handling code
     * in test fixtures or playground to reduce visual noise.
     */
    if (config.data.enableResetCacheOnSourceFileChanges == null) {
      config.data.enableResetCacheOnSourceFileChanges = false;
    }
    return config.data;
  }
  CompilerError.invariant(false, {
    reason: 'Internal error, could not parse config from pragma string',
    description: `${fromZodError(config.error)}`,
    loc: GeneratedSource,
  });
}

const testComplexPluginOptionDefaults: PluginOptions = {
  gating: {
    source: 'ReactForgetFeatureFlag',
    importSpecifierName: 'isForgetEnabled_Fixtures',
  },
};
export function parseConfigPragmaForTests(
  pragma: string,
  defaults: {
    compilationMode: CompilationMode;
    environment?: PartialEnvironmentConfig;
  },
): PluginOptions {
  const environment = parseConfigPragmaEnvironmentForTest(
    pragma,
    defaults.environment ?? {},
  );
  const options: Record<keyof PluginOptions, unknown> = {
    ...defaultOptions,
    panicThreshold: 'all_errors',
    compilationMode: defaults.compilationMode,
    environment,
  };
  for (const {key, value: val} of splitPragma(pragma)) {
    if (!hasOwnProperty(defaultOptions, key)) {
      continue;
    }
    const isSet = val == null || val === 'true';
    if (isSet && key in testComplexPluginOptionDefaults) {
      options[key] = testComplexPluginOptionDefaults[key];
    } else if (isSet) {
      options[key] = true;
    } else if (val === 'false') {
      options[key] = false;
    } else if (val != null) {
      const parsedVal = tryParseTestPragmaValue(val).unwrap();
      if (key === 'target' && parsedVal === 'donotuse_meta_internal') {
        options[key] = {
          kind: parsedVal,
          runtimeModule: 'react',
        };
      } else {
        options[key] = parsedVal;
      }
    }
  }
  return parsePluginOptions(options);
}
