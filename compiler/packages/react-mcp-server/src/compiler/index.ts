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
} from 'babel-plugin-react-compiler/src';
import * as prettier from 'prettier';

export let lastResult: BabelCore.BabelFileResult | null = null;

export type PrintedCompilerPipelineValue =
  | {
      kind: 'hir';
      name: string;
      fnName: string | null;
      value: string;
    }
  | {kind: 'reactive'; name: string; fnName: string | null; value: string}
  | {kind: 'debug'; name: string; fnName: string | null; value: string};

type CompileOptions = {
  text: string;
  file: string;
  options: PluginOptions | null;
};
export async function compile({
  text,
  file,
  options,
}: CompileOptions): Promise<BabelCore.BabelFileResult> {
  const ast = await parseAsync(text, {
    sourceFileName: file,
    parserOpts: {
      plugins: ['typescript', 'jsx'],
    },
    sourceType: 'module',
  });
  if (ast == null) {
    throw new Error('Could not parse');
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
  });
  if (result?.code == null) {
    throw new Error(
      `Expected BabelPluginReactCompiler to compile successfully, got ${result}`,
    );
  }
  try {
    result.code = await prettier.format(result.code, {
      semi: false,
      parser: 'babel-ts',
    });
    if (result.code != null) {
      lastResult = result;
    }
  } catch (err) {
    // If prettier failed just log, no need to crash
    console.error(err);
  }
  return result;
}
