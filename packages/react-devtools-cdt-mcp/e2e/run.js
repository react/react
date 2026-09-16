/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

require('@babel/register')({
  babelrc: false,
  configFile: false,
  extensions: ['.js'],
  only: [__dirname],
  plugins: ['@babel/plugin-transform-flow-strip-types'],
});

require('./run.flow')
  .main()
  .catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
