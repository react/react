/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {tests} = require('./eslint-plugin-react-hooks-test-cases');
const {
  runBabelPluginReactCompiler,
} = require('../dist/Babel/RunReactCompilerBabelPlugin');
const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const prettierConfigPath = require.resolve('../.prettierrc');
const process = require('process');
const {createHash} = require('crypto');
const {create} = require('domain');

const FIXTURES_DIR = path.join(
  process.cwd(),
  'src',
  '__tests__',
  'fixtures',
  'compiler',
  'rules-of-hooks'
);

const PRETTIER_OPTIONS = prettier.resolveConfig.sync(FIXTURES_DIR, {
  config: prettierConfigPath,
});

const fixtures = [];
for (const test of tests.valid) {
  fixtures.push({code: test.code, valid: true});
}
for (const test of tests.invalid) {
  fixtures.push({code: test.code, valid: false});
}

for (const fixture of fixtures) {
  let error = null;
  let passes = true;
  try {
    // Does the fixture pass with hooks validation disabled? if not skip it
    runBabelPluginReactCompiler(
      fixture.code,
      'rules-of-hooks.js',
      'typescript',
      {
        environment: {
          validateHooksUsage: false,
        },
      }
    );
    // Does the fixture pass with hooks validation enabled?
    try {
      runBabelPluginReactCompiler(
        fixture.code,
        'rules-of-hooks.js',
        'typescript',
        {
          environment: {
            validateHooksUsage: true,
          },
        }
      );
    } catch (e) {
      passes = false;
    }
  } catch (e) {
    error = e;
  }
  let code = fixture.code;
  let prefix = '';
  if (error !== null) {
    prefix = `todo.bail.`;
    code = `// @skip\n// Unsupported input\n${code}`;
  } else if (fixture.valid === false) {
    if (passes) {
      prefix = `todo.error.invalid-`;
      code = `// @skip\n// Passed but should have failed\n${code}`;
    } else {
      prefix = `error.invalid-`;
      code = `// Expected to fail\n${code}`;
    }
  } else if (!passes) {
    // oops, error when it should have passed
    prefix = `todo.`;
    code = `// @skip\n// Failed but should have passed\n${code}`;
  }
  const formatted = prettier.format(code, PRETTIER_OPTIONS);
  const hmac = createHash('sha256');
  hmac.update(formatted, 'utf8');
  let name = `${prefix}rules-of-hooks-${hmac
    .digest('hex')
    .substring(0, 12)}.js`;
  const fixturePath = path.join(FIXTURES_DIR, name);
  fs.writeFileSync(fixturePath, formatted, 'utf8');
}
