#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const prompt = require('prompt-promise');

const run = async () => {
  while (true) {
    const otp = await prompt('NPM 2-factor auth code: ');
    prompt.done();
    if (otp) {
      return otp;
    } else {
      console.error('\nTwo-factor auth is required to publish.');
      // (Ask again.)
    }
  }
};

module.exports = run;
