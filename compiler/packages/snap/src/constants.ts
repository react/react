/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';

export const PROJECT_ROOT = path.join(process.cwd(), '..', '..');

// We assume this is run from `babel-plugin-react-compiler`
export const BABEL_PLUGIN_ROOT = path.normalize(
  path.join(PROJECT_ROOT, 'packages', 'babel-plugin-react-compiler'),
);

export const BABEL_PLUGIN_SRC = path.normalize(
  path.join(BABEL_PLUGIN_ROOT, 'dist', 'index.js'),
);
export const PRINT_HIR_IMPORT = 'printFunctionWithOutlined';
export const PRINT_REACTIVE_IR_IMPORT = 'printReactiveFunction';
export const PARSE_CONFIG_PRAGMA_IMPORT = 'parseConfigPragmaForTests';
export const FIXTURES_PATH = path.join(
  BABEL_PLUGIN_ROOT,
  'src',
  '__tests__',
  'fixtures',
  'compiler',
);
export const SNAPSHOT_EXTENSION = '.expect.md';

export const BABEL_PLUGIN_RUST_ROOT = path.normalize(
  path.join(PROJECT_ROOT, 'packages', 'babel-plugin-react-compiler-rust'),
);
export const BABEL_PLUGIN_RUST_SRC = path.normalize(
  path.join(BABEL_PLUGIN_RUST_ROOT, 'dist', 'index.js'),
);
export const CRATES_PATH = path.normalize(
  path.join(PROJECT_ROOT, '..', 'crates'),
);
