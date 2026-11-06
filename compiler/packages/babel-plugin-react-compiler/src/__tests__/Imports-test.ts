/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {transformSync} from '@babel/core';
import * as ts from 'typescript';
import BabelPluginReactCompiler from '../Babel/BabelPlugin';

function compile(source: string): string {
  return transformSync(source, {
    filename: 'test.tsx',
    configFile: false,
    babelrc: false,
    parserOpts: {plugins: ['jsx', 'typescript']},
    plugins: [[BabelPluginReactCompiler, {panicThreshold: 'all_errors'}]],
  })!.code!;
}

describe('generated imports', () => {
  it('preserves the JSX import source for downstream TypeScript compilation', () => {
    const output = compile(`
      /** @jsxImportSource custom-jsx */
      export default function Component({children}) {
        return <div>{children}</div>;
      }
    `);
    expect(output).toContain('react/compiler-runtime');
    const transformed = ts.transpileModule(output, {
      compilerOptions: {jsx: ts.JsxEmit.ReactJSX},
      fileName: 'test.tsx',
    }).outputText;
    expect(transformed).toContain('custom-jsx/jsx-runtime');
  });

  it('preserves classic JSX and fragment factories', () => {
    const output = compile(`
      /** @jsx customJsx */
      /** @jsxFrag CustomFragment */
      export default function Component({children}) {
        return <><div>{children}</div></>;
      }
    `);
    expect(output).toContain('react/compiler-runtime');
    const transformed = ts.transpileModule(output, {
      compilerOptions: {jsx: ts.JsxEmit.React},
      fileName: 'test.tsx',
    }).outputText;
    expect(transformed).toContain('customJsx(CustomFragment');
    expect(transformed).not.toContain('React.createElement');
  });

  it('keeps statement annotations on the original statement', () => {
    const output = compile(`
      /** @jsxImportSource custom-jsx */
      // Keep this annotation with the component.
      export default function Component({children}) {
        return <div>{children}</div>;
      }
    `);
    expect(output).toMatch(
      /\/\/ Keep this annotation with the component\.\nexport default function Component/,
    );
    expect(output).toContain('react/compiler-runtime');
  });
});
