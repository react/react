/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {type Linter} from 'eslint';
import {
  allRules,
  mapErrorSeverityToESlint,
  recommendedRules,
} from './rules/ReactCompilerRule';

const meta = {
  name: 'eslint-plugin-react-compiler',
};

const configs = {
  recommended: {
    plugins: {
      'react-compiler': {
        rules: allRules,
      },
    },
    rules: Object.fromEntries(
      Object.entries(recommendedRules).map(([name, ruleConfig]) => {
        return [
          'react-compiler/' + name,
          mapErrorSeverityToESlint(ruleConfig.severity),
        ];
      }),
    ) as Record<string, Linter.StringSeverity>,
  },
};

const rules = Object.fromEntries(
  Object.entries(allRules).map(([name, {rule}]) => [name, rule]),
);

export {configs, rules, meta};
