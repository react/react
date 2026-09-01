/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {RuleTester} from 'eslint';
import {
  CompilerTestCases,
  normalizeIndent,
  TestRecommendedRules,
} from './shared-utils';

const tests: CompilerTestCases = {
  valid: [
    {
      name: 'Basic example',
      filename: 'test.tsx',
      code: normalizeIndent`
        function Button(props) {
          return null;
        }
      `,
    },
    {
      name: 'Repro for hooks as normal values',
      filename: 'test.tsx',
      code: normalizeIndent`
        function Button(props) {
          const scrollview = React.useRef<ScrollView>(null);
          return <Button thing={scrollview} />;
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'Mutating useState value',
      filename: 'test.tsx',
      code: `
        import { useState } from 'react';
        function Component(props) {
          // typescript syntax that hermes-parser doesn't understand yet
          const x: \`foo\${1}\` = 'foo1';
          const [state, setState] = useState({a: 0});
          state.a = 1;
          return <div>{props.foo}</div>;
        }
      `,
      errors: [
        {
          message: /Modifying a value returned from 'useState\(\)'/,
          line: 7,
        },
      ],
    },
  ],
};

const eslintTester = new RuleTester({
  // @ts-ignore[2353] - outdated types
  parser: require.resolve('@typescript-eslint/parser'),
});
eslintTester.run('react-compiler', TestRecommendedRules, tests);
