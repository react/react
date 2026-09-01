#!/usr/bin/env node

'use strict';

const {spawn} = require('child_process');
const {join} = require('path');

const ROOT_PATH = join(__dirname, '..', '..');
const reactVersion = process.argv[2];
const inlinePackagePath = join(ROOT_PATH, 'packages', 'react-devtools-inline');
const shellPackagePath = join(ROOT_PATH, 'packages', 'react-devtools-shell');
const playwrightArtifactsPath = join(ROOT_PATH, 'tmp', 'playwright-artifacts');

const {SUCCESSFUL_COMPILATION_MESSAGE} = require(
  join(shellPackagePath, 'constants.js')
);

let buildProcess = null;
let serverProcess = null;
let testProcess = null;

function format(loggable) {
  return `${loggable}`
    .split('\n')
    .filter(line => {
      return line.trim() !== '';
    })
    .map(line => `  ${line}`)
    .join('\n');
}

function logBright(loggable) {
  console.log(`\x1b[1m${loggable}\x1b[0m`);
}

function logDim(loggable) {
  const formatted = format(loggable, 2);
  if (formatted !== '') {
    console.log(`\x1b[2m${formatted}\x1b[0m`);
  }
}

function logError(loggable) {
  const formatted = format(loggable, 2);
  if (formatted !== '') {
    console.error(`\x1b[31m${formatted}\x1b[0m`);
  }
}

function buildInlinePackage() {
  logBright('Building inline packages');

  buildProcess = spawn('yarn', ['build'], {cwd: inlinePackagePath});
  buildProcess.stdout.on('data', data => {
    logDim(data);
  });
  buildProcess.stderr.on('data', data => {
    if (
      `${data}`.includes('Warning') ||
      // E.g. [BABEL] Note: The code generator has deoptimised the styling of * as it exceeds the max of 500KB.
      `${data}`.includes('[BABEL] Note')
    ) {
      logDim(data);
    } else {
      logError(`Error:\n${data}`);

      exitWithCode(1);
    }
  });
  buildProcess.on('close', code => {
    logBright('Inline package built');

    runTestShell();
  });
}

function runTestShell() {
  const timeoutID = setTimeout(() => {
    // Assume the test shell server failed to start.
    logError('Testing shell server failed to start');
    exitWithCode(1);
  }, 60 * 1000);

  logBright('Starting testing shell server');

  if (!reactVersion) {
    serverProcess = spawn('yarn', ['start'], {cwd: shellPackagePath});
  } else {
    serverProcess = spawn('yarn', ['start'], {
      cwd: shellPackagePath,
      env: {...process.env, REACT_VERSION: reactVersion},
    });
  }

  serverProcess.stdout.on('data', data => {
    if (`${data}`.includes(SUCCESSFUL_COMPILATION_MESSAGE)) {
      logBright('Testing shell server running');

      clearTimeout(timeoutID);

      runEndToEndTests();
    }
  });

  serverProcess.stderr.on('data', data => {
    if (`${data}`.includes('EADDRINUSE')) {
      // Something is occupying this port;
      // We could kill the process and restart but probably better to prompt the user to do this.

      logError('Free up the port and re-run tests:');
      logBright('  kill -9 $(lsof -ti:8080)');

      exitWithCode(1);
    } else if (`${data}`.includes('ERROR')) {
      logError(`Error:\n${data}`);

      exitWithCode(1);
    } else {
      // Non-fatal stuff like Babel optimization warnings etc.
      logDim(data);
    }
  });
}

async function runEndToEndTests() {
  logBright('Running e2e tests');
  if (!reactVersion) {
    testProcess = spawn(
      'yarn',
      ['test:e2e', `--output=${playwrightArtifactsPath}`],
      {
        cwd: inlinePackagePath,
      }
    );
  } else {
    testProcess = spawn(
      'yarn',
      ['test:e2e', `--output=${playwrightArtifactsPath}`],
      {
        cwd: inlinePackagePath,
        env: {...process.env, REACT_VERSION: reactVersion},
      }
    );
  }

  testProcess.stdout.on('data', data => {
    // Log without formatting because Playwright applies its own formatting.
    const formatted = format(data);
    if (formatted !== '') {
      console.log(formatted);
    }
  });
  testProcess.stderr.on('data', data => {
    // Log without formatting because Playwright applies its own formatting.
    const formatted = format(data);
    if (formatted !== '') {
      console.error(formatted);
    }

    exitWithCode(1);
  });
  testProcess.on('close', code => {
    logBright(`Tests completed with code: ${code}`);

    exitWithCode(code);
  });
}

function exitWithCode(code) {
  if (buildProcess !== null) {
    try {
      logBright('Shutting down build process');
      buildProcess.kill();
    } catch (error) {
      logError(error);
    }
  }

  if (serverProcess !== null) {
    try {
      logBright('Shutting down shell server process');
      serverProcess.kill();
    } catch (error) {
      logError(error);
    }
  }

  if (testProcess !== null) {
    try {
      logBright('Shutting down test process');
      testProcess.kill();
    } catch (error) {
      logError(error);
    }
  }

  process.exit(code);
}

buildInlinePackage();
