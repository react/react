/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import babelJest from 'babel-jest';
import {
  validateEnvironmentConfig,
  EnvironmentConfig,
} from 'babel-plugin-react-compiler';
import {execSync} from 'child_process';

import type {NodePath, Visitor} from '@babel/traverse';
import type {CallExpression} from '@babel/types';
import BabelPluginReactCompiler from 'babel-plugin-react-compiler';

/**
 * -- IMPORTANT --
 * When making changes to any babel plugins defined this file
 * (e.g. `ReactForgetFunctionTransform`), make sure to bump e2eTransformerCacheKey
 * as our script files are currently not used for babel cache breaking!!
 */
const e2eTransformerCacheKey = 1;
const forgetOptions: EnvironmentConfig = validateEnvironmentConfig({
  enableAssumeHooksFollowRulesOfReact: true,
});
const debugMode = process.env['DEBUG_FORGET_COMPILER'] != null;

const compilerCacheKey = execSync(
  'yarn --silent --cwd ../.. hash packages/babel-plugin-react-compiler/dist',
)
  .toString()
  .trim();

if (debugMode) {
  console.log('cachebreaker', compilerCacheKey);
}

module.exports = (useForget: boolean) => {
  function createTransformer() {
    return babelJest.createTransformer({
      passPerPreset: true,
      presets: [
        '@babel/preset-typescript',
        {
          plugins: [
            useForget
              ? [
                  BabelPluginReactCompiler,
                  {
                    environment: forgetOptions,
                    /*
                     * Jest hashes the babel config as a cache breaker.
                     * (see https://github.com/jestjs/jest/blob/v29.6.2/packages/babel-jest/src/index.ts#L84)
                     */
                    compilerCacheKey,
                    transformOptionsCacheKey: forgetOptions,
                    e2eTransformerCacheKey,
                  },
                ]
              : '@babel/plugin-syntax-jsx',
          ],
        },
        '@babel/preset-react',
        {
          plugins: [
            [
              function BabelPluginRewriteRequirePath(): {visitor: Visitor} {
                return {
                  visitor: {
                    CallExpression(path: NodePath<CallExpression>): void {
                      const {callee} = path.node;
                      if (
                        callee.type === 'Identifier' &&
                        callee.name === 'require'
                      ) {
                        const arg = path.node.arguments[0];
                        if (arg.type === 'StringLiteral') {
                          /*
                           * The compiler adds requires of "React", which is expected to be a wrapper
                           * around the "react" package. For tests, we just rewrite the require.
                           */
                          if (arg.value === 'React') {
                            arg.value = 'react';
                          }
                        }
                      }
                    },
                  },
                };
              },
            ],
            '@babel/plugin-transform-modules-commonjs',
          ],
        },
      ],
      targets: {
        esmodules: true,
      },
    } as any);
    /*
     * typecast needed as DefinitelyTyped does not have updated Babel configs types yet
     * (missing passPerPreset and targets).
     */
  }

  return {
    createTransformer,
  };
};
