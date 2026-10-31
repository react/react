/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';
import type {PluginOptions} from '../Entrypoint';

/*
 * The ESLint suppression bailout is only consulted when the compiler is not
 * already validating the equivalent rules itself.
 */
const OPTIONS: PluginOptions = {
  environment: {validateExhaustiveMemoizationDependencies: false},
};

function wasCompiled(source: string): boolean {
  const result = runBabelPluginReactCompiler(
    source,
    'Component.jsx',
    'typescript',
    OPTIONS,
  );
  return result.code!.includes('react/compiler-runtime');
}

it('compiles a component with no suppression', () => {
  expect(
    wasCompiled(`
      function Component(props) {
        const x = [props.value];
        return <div>{x}</div>;
      }
    `),
  ).toBe(true);
});

it('skips a component with an `eslint-disable-next-line` suppression', () => {
  expect(
    wasCompiled(`
      function Component(props) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const x = [props.value];
        return <div>{x}</div>;
      }
    `),
  ).toBe(false);
});

it('skips a component with an `eslint-disable-line` suppression', () => {
  expect(
    wasCompiled(`
      function Component(props) {
        const x = [props.value]; // eslint-disable-line react-hooks/exhaustive-deps
        return <div>{x}</div>;
      }
    `),
  ).toBe(false);
});

it('skips a component with a block `eslint-disable` suppression', () => {
  expect(
    wasCompiled(`
      function Component(props) {
        /* eslint-disable react-hooks/exhaustive-deps */
        const x = [props.value];
        /* eslint-enable react-hooks/exhaustive-deps */
        return <div>{x}</div>;
      }
    `),
  ).toBe(false);
});

it('does not skip a component suppressing an unrelated rule', () => {
  expect(
    wasCompiled(`
      function Component(props) {
        const x = [props.value]; // eslint-disable-line no-unused-vars
        return <div>{x}</div>;
      }
    `),
  ).toBe(true);
});
