/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const preprocessor = require('../preprocessor');

describe('preprocessor', () => {
  // Jest hands the transformer an OS-native absolute path, which uses
  // backslashes on Windows. The path classification below must therefore be
  // separator-agnostic, otherwise every source file is misclassified on
  // Windows: third_party files stop being excluded from the JSX transform and
  // the DevTools version-pragma transform is never applied.
  const source = 'const element = <div />;\n';

  it('excludes third_party files from the JSX transform (posix path)', () => {
    const filePath = '/repo/scripts/third_party/foo.js';
    expect(preprocessor.process(source, filePath).code).toBe(source);
  });

  it('excludes third_party files from the JSX transform (windows path)', () => {
    const filePath = 'C:\\repo\\scripts\\third_party\\foo.js';
    expect(preprocessor.process(source, filePath).code).toBe(source);
  });

  it('still transforms non-third_party files (windows path)', () => {
    const filePath = 'C:\\repo\\packages\\react\\src\\React.js';
    expect(preprocessor.process(source, filePath).code).not.toBe(source);
  });
});
