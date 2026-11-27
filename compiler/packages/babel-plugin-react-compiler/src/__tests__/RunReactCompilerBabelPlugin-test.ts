/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';

it('accepts null options and uses the compiler defaults', () => {
  const source =
    'function Component(props) { return <div>{props.value}</div>; }';

  const result = runBabelPluginReactCompiler(source, 'test.js', 'flow', null);
  const defaults = runBabelPluginReactCompiler(source, 'test.js', 'flow', {});

  expect(result.code).toBe(defaults.code);
});
