/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {transformSync} from '@babel/core';
import * as BabelPluginReactCompiler from '..';

/**
 * Regression test for a bug where synthesized Babel AST nodes could end up
 * with their `.loc` field set to the compiler's internal `GeneratedSource`
 * sentinel (a `Symbol`) instead of `null`. Babel's `Node.loc` type contract
 * is `SourceLocation | null`, so a `Symbol` value there breaks any consumer
 * that structurally clones or serializes the AST (e.g. `v8.serialize`,
 * `child_process.send`, jest-worker IPC), even though the AST prints to
 * identical source text either way - so a snapshot of printed source code
 * cannot catch this class of regression.
 */
function collectSymbolLocs(node: unknown, path: string): Array<string> {
  const found: Array<string> = [];
  function walk(value: unknown, currentPath: string): void {
    if (value == null || typeof value !== 'object') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${currentPath}[${i}]`));
      return;
    }
    const maybeNode = value as {type?: unknown; loc?: unknown};
    if (typeof maybeNode.type === 'string' && typeof maybeNode.loc === 'symbol') {
      found.push(`${currentPath} (type=${maybeNode.type})`);
    }
    for (const key of Object.keys(value)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') {
        continue;
      }
      walk((value as Record<string, unknown>)[key], `${currentPath}.${key}`);
    }
  }
  walk(node, path);
  return found;
}

describe('CodegenReactiveFunction', () => {
  it('does not leak the GeneratedSource Symbol sentinel into synthesized AST node .loc fields', () => {
    // Adapted from the reported repro: destructured bindings from a
    // function-call result, referenced from 2+ independent JSX memo scopes,
    // force the compiler to hoist a synthesized temporary identifier for one
    // of the destructured names.
    const source = `
      import {useMemo} from 'react';

      function visualFor(state, getLabels) {
        return {label: getLabels(state), tint: 'red', glyph: () => null};
      }

      export function Example({state, getLabels, colors, onTap}) {
        const session = useMemo(() => ({state}), [state]);
        if (session.state === 'off') return null;

        const handleTap = () => onTap?.(session.state);
        const {label, tint, glyph} = visualFor(session.state, getLabels);

        return (
          <button aria-label={label} onClick={handleTap} style={{background: tint}}>
            <span>
              {session.state === 'listening' ? <em>...</em> : glyph(colors.fg)}
              <span style={{color: colors.fg}}>{label}</span>
            </span>
          </button>
        );
      }
    `;

    const result = transformSync(source, {
      filename: 'test.jsx',
      presets: [require.resolve('@babel/preset-react')],
      plugins: [[BabelPluginReactCompiler.default, {}]],
      ast: true,
      code: false,
    });

    expect(result?.ast).not.toBeNull();
    const symbolLocs = collectSymbolLocs(result!.ast!.program, 'program');
    expect(symbolLocs).toEqual([]);

    // The AST must also be structurally cloneable, matching the real-world
    // failure mode reported (v8.serialize / jest-worker / child_process IPC).
    expect(() => {
      // eslint-disable-next-line no-restricted-globals
      require('v8').serialize(result!.ast);
    }).not.toThrow();
  });
});
