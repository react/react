/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as BabelCore from '@babel/core';
import {transformFromAstSync} from '@babel/core';
import * as BabelParser from '@babel/parser';
import invariant from 'invariant';
import type {PluginOptions} from '../Entrypoint';
import BabelPluginReactCompiler from './BabelPlugin';

export const DEFAULT_PLUGINS = ['babel-plugin-fbt', 'babel-plugin-fbt-runtime'];
export function runBabelPluginReactCompiler(
  text: string,
  file: string,
  language: 'flow' | 'typescript',
  options: PluginOptions | null,
  includeAst: boolean = false,
): BabelCore.BabelFileResult {
  const ast = BabelParser.parse(text, {
    sourceFilename: file,
    plugins: [language, 'jsx'],
    sourceType: 'module',
  });
  const result = transformFromAstSync(ast, text, {
    ast: includeAst,
    filename: file,
    highlightCode: false,
    retainLines: true,
    plugins: [
      [BabelPluginReactCompiler, options],
      'babel-plugin-fbt',
      'babel-plugin-fbt-runtime',
    ],
    sourceType: 'module',
    configFile: false,
    babelrc: false,
  });
  invariant(
    result?.code != null,
    `Expected BabelPluginReactForget to codegen successfully, got: ${result}`,
  );
  return result;
}
