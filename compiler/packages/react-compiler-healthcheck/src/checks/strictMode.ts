/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';

const JsFileExtensionRE = /(js|ts|jsx|tsx)$/;
const NextConfigFileRE = /^next\.config\.(js|mjs)$/;
const StrictModeRE = /<(React\.StrictMode|StrictMode)>/;
const NextStrictModeRE = /reactStrictMode:\s*true/;
let StrictModeUsage = false;

export default {
  run(source: string, path: string): void {
    if (StrictModeUsage) {
      return;
    }

    if (NextConfigFileRE.exec(path) !== null) {
      StrictModeUsage = NextStrictModeRE.exec(source) !== null;
    } else if (JsFileExtensionRE.exec(path) !== null) {
      StrictModeUsage = StrictModeRE.exec(source) !== null;
    }
  },

  report(): void {
    if (StrictModeUsage) {
      console.log(chalk.green('StrictMode usage found.'));
    } else {
      console.log(chalk.red('StrictMode usage not found.'));
    }
  },
};
