/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as BabelCore from '@babel/core';
import {parseAsync, transformFromAstAsync} from '@babel/core';
import BabelPluginReactCompiler, {
  type PluginOptions,
} from 'babel-plugin-react-compiler';
import * as babelParser from 'prettier/plugins/babel.js';
import estreeParser from 'prettier/plugins/estree';
import * as typescriptParser from 'prettier/plugins/typescript';
import * as prettier from 'prettier/standalone';

export let lastResult: BabelCore.BabelFileResult | null = null;

type CompileOptions = {
  text: string;
  file: string;
  options: PluginOptions | null;
};
export async function compile({
  text,
  file,
  options,
}: CompileOptions): Promise<BabelCore.BabelFileResult | null> {
  const ast = await parseAsync(text, {
    sourceFileName: file,
    parserOpts: {
      plugins: ['typescript', 'jsx'],
    },
    sourceType: 'module',
    configFile: false,
    babelrc: false,
  });
  if (ast == null) {
    return null;
  }
  const plugins =
    options != null
      ? [[BabelPluginReactCompiler, options]]
      : [[BabelPluginReactCompiler]];
  const result = await transformFromAstAsync(ast, text, {
    filename: file,
    highlightCode: false,
    retainLines: true,
    plugins,
    sourceType: 'module',
    sourceFileName: file,
    configFile: false,
    babelrc: false,
  });
  if (result?.code == null) {
    throw new Error(
      `Expected BabelPluginReactCompiler to compile successfully, got ${result}`,
    );
  }
  result.code = await prettier.format(result.code, {
    semi: false,
    parser: 'babel-ts',
    plugins: [babelParser, estreeParser, typescriptParser],
  });
  if (result.code != null) {
    lastResult = result;
  }
  return result;
}
