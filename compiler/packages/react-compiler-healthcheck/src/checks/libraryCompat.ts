/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';
import {config} from '../config';

const packageJsonRE = /package\.json$/;
const knownIncompatibleLibrariesUsage = new Set();

export default {
  run(source: string, path: string): void {
    if (packageJsonRE.exec(path) !== null) {
      const contents = JSON.parse(source);
      const deps = contents.dependencies;
      if (deps != null) {
        for (const library of config.knownIncompatibleLibraries) {
          if (Object.hasOwn(deps, library)) {
            knownIncompatibleLibrariesUsage.add(library);
          }
        }
      }
    }
  },

  report(): void {
    if (knownIncompatibleLibrariesUsage.size > 0) {
      console.log(chalk.red(`Found the following incompatible libraries:`));
      for (const library of knownIncompatibleLibrariesUsage) {
        console.log(library);
      }
    } else {
      console.log(chalk.green(`Found no usage of incompatible libraries.`));
    }
  },
};
