/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {fork} from 'child_process';
import invariant from 'invariant';
import process from 'process';
import * as readline from 'readline';
import {hideBin} from 'yargs/helpers';

readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', function (_, key) {
  if (key && key.name === 'c' && key.ctrl) {
    // handle sigint
    if (childProc) {
      console.log('Interrupted!!');
      childProc.kill('SIGINT');
      childProc.unref();
      process.exit(-1);
    }
  }
});

const childProc = fork(require.resolve('./runner.js'), hideBin(process.argv), {
  // for some reason, keypress events aren't sent to handlers in both processes
  // when we `inherit` stdin.
  // pipe stdout and stderr so we can silence child process after parent exits
  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  // forward existing env variables, like `NODE_OPTIONS` which VSCode uses to attach
  // its debugger
  env: {...process.env, FORCE_COLOR: 'true'},
});

invariant(
  childProc.stdin && childProc.stdout && childProc.stderr,
  'Expected forked process to have piped stdio',
);
process.stdin.pipe(childProc.stdin);
childProc.stdout.pipe(process.stdout);
childProc.stderr.pipe(process.stderr);

childProc.on('exit', code => {
  process.exit(code ?? -1);
});
