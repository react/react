/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as BabelCore from '@babel/core';
import {compileProgram, Logger, parsePluginOptions} from '../Entrypoint';
import {
  injectReanimatedFlag,
  pipelineUsesReanimatedPlugin,
} from '../Entrypoint/Reanimated';
import {CompilerError} from '..';

const ENABLE_REACT_COMPILER_TIMINGS =
  process.env['ENABLE_REACT_COMPILER_TIMINGS'] === '1';

/*
 * The React Forget Babel Plugin
 * @param {*} _babel
 * @returns
 */
export default function BabelPluginReactCompiler(
  _babel: typeof BabelCore,
): BabelCore.PluginObj {
  return {
    name: 'react-forget',
    visitor: {
      /*
       * Note: Babel does some "smart" merging of visitors across plugins, so even if A is inserted
       * prior to B, if A does not have a Program visitor and B does, B will run first. We always
       * want Forget to run true to source as possible.
       */
      Program: {
        enter(prog, pass): void {
          try {
            const filename = pass.filename ?? 'unknown';
            if (ENABLE_REACT_COMPILER_TIMINGS === true) {
              performance.mark(`${filename}:start`, {
                detail: 'BabelPlugin:Program:start',
              });
            }
            let opts = parsePluginOptions(pass.opts);
            const isDev =
              (typeof __DEV__ !== 'undefined' && __DEV__ === true) ||
              process.env['NODE_ENV'] === 'development';
            if (
              opts.enableReanimatedCheck === true &&
              pipelineUsesReanimatedPlugin(pass.file.opts.plugins)
            ) {
              opts = injectReanimatedFlag(opts);
            }
            if (
              opts.environment.enableResetCacheOnSourceFileChanges !== false &&
              isDev
            ) {
              opts = {
                ...opts,
                environment: {
                  ...opts.environment,
                  enableResetCacheOnSourceFileChanges: true,
                },
              };
            }
            compileProgram(prog, {
              opts,
              filename: pass.filename ?? null,
              comments: pass.file.ast.comments ?? [],
              code: pass.file.code,
            });
            if (ENABLE_REACT_COMPILER_TIMINGS === true) {
              performance.mark(`${filename}:end`, {
                detail: 'BabelPlugin:Program:end',
              });
            }
          } catch (e) {
            if (e instanceof CompilerError) {
              throw e.withPrintedMessage(pass.file.code, {eslint: false});
            }
            throw e;
          }
        },
        exit(_, pass): void {
          if (ENABLE_REACT_COMPILER_TIMINGS === true) {
            const filename = pass.filename ?? 'unknown';
            const measurement = performance.measure(filename, {
              start: `${filename}:start`,
              end: `${filename}:end`,
              detail: 'BabelPlugin:Program',
            });
            if ('logger' in pass.opts && pass.opts.logger != null) {
              const logger: Logger = pass.opts.logger as Logger;
              logger.logEvent(filename, {
                kind: 'Timing',
                measurement,
              });
            }
          }
        },
      },
    },
  };
}
