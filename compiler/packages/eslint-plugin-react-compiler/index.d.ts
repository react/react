/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Linter, Rule} from 'eslint';

declare const meta: {
  name: string;
};

declare const configs: {
  recommended: {
    plugins: {
      'react-compiler': {
        rules: Record<string, {rule: Rule.RuleModule; severity: string}>;
      };
    };
    rules: Record<string, Linter.StringSeverity>;
  };
};

declare const rules: Record<string, Rule.RuleModule>;

export {configs, meta, rules};
