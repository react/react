/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

module.exports = function externalRuntime() {
  // When generating the source code for the Fizz runtime chunks we use global identifiers to refer
  // to different parts of the implementation. When generating the external runtime we need to
  // replace those with local identifiers instead.
  return {
    name: 'scripts/rollup/plugins/dynamic-imports',
    renderChunk(source) {
      // This replaces "window['$globalVar']" with "$globalVar".
      const variables = new Set();
      source = source.replace(
        /window\[['"](\$[A-z0-9_]*)['"]\]/g,
        (_, variableName) => {
          variables.add(variableName);
          return variableName;
        }
      );
      const startOfFn = 'use strict';
      let index = source.indexOf(startOfFn);
      if (index === -1) {
        return source;
      }
      index += startOfFn.length + 2;

      // Insert the declarations in the beginning of the function closure
      // to scope them to inside the runtime.
      let declarations = 'let ';
      variables.forEach(variable => {
        if (declarations !== 'let ') {
          declarations += ', ';
        }
        declarations += variable;
      });
      declarations += ';';
      source = source.slice(0, index) + declarations + source.slice(index);
      return source;
    },
  };
};
