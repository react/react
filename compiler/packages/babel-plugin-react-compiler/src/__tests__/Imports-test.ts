/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import invariant from 'invariant';
import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';

it('preserves JSX pragmas before generated runtime imports', () => {
  const result = runBabelPluginReactCompiler(
    `/* @jsxImportSource custom-jsx */

import {useState} from 'react';

export default function Component({children}) {
  const [count] = useState(0);
  return <div data-count={count}>{children}</div>;
}`,
    'test.tsx',
    'typescript',
    {panicThreshold: 'all_errors'},
  );

  invariant(result.code != null, 'Expected Babel transform to emit code');
  expect(result.code.indexOf('@jsxImportSource custom-jsx')).toBeLessThan(
    result.code.indexOf('react/compiler-runtime'),
  );
});
