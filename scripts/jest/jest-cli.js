'use strict';

const {spawn} = require('child_process');
const chalk = require('chalk');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

const ossConfig = './scripts/jest/config.source.js';
const wwwConfig = './scripts/jest/config.source-www.js';
const xplatConfig = './scripts/jest/config.source-xplat.js';
const devToolsConfig = './scripts/jest/config.build-devtools.js';

// TODO: These configs are separate but should be rolled into the configs above
// so that the CLI can provide them as options for any of the configs.
const persistentConfig = './scripts/jest/config.source-persistent.js';
const buildConfig = './scripts/jest/config.build.js';

const argv = yargs
  .parserConfiguration({
    // Important: This option tells yargs to move all other options not
    // specified here into the `_` key. We use this to send all of the
    // Jest options that we don't use through to Jest (like --watch).
    'unknown-options-as-args': true,
  })
  .wrap(yargs.terminalWidth())
  .options({
    debug: {
      alias: 'd',
      describe: 'Run with node debugger attached.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    project: {
      alias: 'p',
      describe: 'Run the given project.',
      requiresArg: true,
      type: 'string',
      default: 'default',
      choices: ['default', 'devtools'],
    },
    releaseChannel: {
      alias: 'r',
      describe: 'Run with the given release channel.',
      requiresArg: true,
      type: 'string',
      default: 'experimental',
      choices: ['experimental', 'stable', 'www-classic', 'www-modern', 'xplat'],
    },
    env: {
      alias: 'e',
      describe: 'Run with the given node environment.',
      requiresArg: true,
      type: 'string',
      choices: ['development', 'production'],
    },
    prod: {
      describe: 'Run with NODE_ENV=production.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    dev: {
      describe: 'Run with NODE_ENV=development.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    variant: {
      alias: 'v',
      describe: 'Run with www variant set to true.',
      requiresArg: false,
      type: 'boolean',
    },
    build: {
      alias: 'b',
      describe: 'Run tests on builds.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    persistent: {
      alias: 'n',
      describe: 'Run with persistence.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    ci: {
      describe: 'Run tests in CI',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    compactConsole: {
      alias: 'c',
      describe: 'Compact console output (hide file locations).',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    reactVersion: {
      describe: 'DevTools testing for specific version of React',
      requiresArg: true,
      type: 'string',
    },
    sourceMaps: {
      describe:
        'Enable inline source maps when transforming source files with Jest. Useful for debugging, but makes it slower.',
      type: 'boolean',
      default: false,
    },
    silent: {
      alias: 's',
      describe: 'Use silent reporter with dot progress (minimal output).',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
  }).argv;

function logError(message) {
  console.error(chalk.red(`\n${message}`));
}
function isWWWConfig() {
  return (
    (argv.releaseChannel === 'www-classic' ||
      argv.releaseChannel === 'www-modern') &&
    argv.project !== 'devtools'
  );
}

function isXplatConfig() {
  return argv.releaseChannel === 'xplat' && argv.project !== 'devtools';
}

function isOSSConfig() {
  return (
    argv.releaseChannel === 'stable' || argv.releaseChannel === 'experimental'
  );
}

function validateOptions() {
  let success = true;

  if (argv.project === 'devtools') {
    if (argv.prod) {
      logError(
        'DevTool tests do not support --prod. Remove this option to continue.'
      );
      success = false;
    }

    if (argv.dev) {
      logError(
        'DevTool tests do not support --dev. Remove this option to continue.'
      );
      success = false;
    }

    if (argv.env) {
      logError(
        'DevTool tests do not support --env. Remove this option to continue.'
      );
      success = false;
    }

    if (argv.persistent) {
      logError(
        'DevTool tests do not support --persistent. Remove this option to continue.'
      );
      success = false;
    }

    if (argv.variant) {
      logError(
        'DevTool tests do not support --variant. Remove this option to continue.'
      );
      success = false;
    }

    if (!argv.build) {
      logError('DevTool tests require --build.');
      success = false;
    }

    if (argv.reactVersion && !semver.validRange(argv.reactVersion)) {
      success = false;
      logError('please specify a valid version range for --reactVersion');
    }
  } else {
    if (argv.compactConsole) {
      logError('Only DevTool tests support compactConsole flag.');
      success = false;
    }
    if (argv.reactVersion) {
      logError('Only DevTools tests supports the --reactVersion flag.');
      success = false;
    }
  }

  if (isWWWConfig() || isXplatConfig()) {
    if (argv.variant === undefined) {
      // Turn internal experiments on by default
      argv.variant = true;
    }
  } else {
    if (argv.variant) {
      logError(
        'Variant is only supported for the www release channels. Update these options to continue.'
      );
      success = false;
    }
  }

  if (argv.build && argv.persistent) {
    logError(
      'Persistence is not supported for build targets. Update these options to continue.'
    );
    success = false;
  }

  if (!isOSSConfig() && argv.persistent) {
    logError(
      'Persistence only supported for oss release channels. Update these options to continue.'
    );
    success = false;
  }

  if (argv.build && isWWWConfig()) {
    logError(
      'Build targets are only not supported for www release channels. Update these options to continue.'
    );
    success = false;
  }

  if (argv.build && isXplatConfig()) {
    logError(
      'Build targets are only not supported for xplat release channels. Update these options to continue.'
    );
    success = false;
  }

  if (argv.env && argv.env !== 'production' && argv.prod) {
    logError(
      'Build type does not match --prod. Update these options to continue.'
    );
    success = false;
  }

  if (argv.env && argv.env !== 'development' && argv.dev) {
    logError(
      'Build type does not match --dev. Update these options to continue.'
    );
    success = false;
  }

  if (argv.prod && argv.dev) {
    logError(
      'Cannot supply both --prod and --dev. Remove one of these options to continue.'
    );
    success = false;
  }

  if (argv.build) {
    // TODO: We could build this if it hasn't been built yet.
    const buildDir = path.resolve('./build');
    if (!fs.existsSync(buildDir)) {
      logError(
        'Build directory does not exist, please run `yarn build` or remove the --build option.'
      );
      success = false;
    } else if (Date.now() - fs.statSync(buildDir).mtimeMs > 1000 * 60 * 15) {
      logError(
        'Warning: Running a build test with a build directory older than 15 minutes.\nPlease remember to run `yarn build` when using --build.'
      );
    }
  }

  if (!success) {
    console.log(''); // Extra newline.
    process.exit(1);
  }
}

function getCommandArgs() {
  // Add the correct Jest config.
  const args = ['./scripts/jest/jest.js', '--config'];
  if (argv.project === 'devtools') {
    args.push(devToolsConfig);
  } else if (argv.build) {
    args.push(buildConfig);
  } else if (argv.persistent) {
    args.push(persistentConfig);
  } else if (isWWWConfig()) {
    args.push(wwwConfig);
  } else if (isXplatConfig()) {
    args.push(xplatConfig);
  } else if (isOSSConfig()) {
    args.push(ossConfig);
  } else {
    // We should not get here.
    logError('Unrecognized release channel');
    process.exit(1);
  }

  // Set the debug options, if necessary.
  if (argv.debug) {
    args.unshift('--inspect-brk');
    args.push('--runInBand');

    // Prevent console logs from being hidden until test completes.
    args.push('--useStderr');
  }

  if (argv.ci === true) {
    args.push('--maxConcurrency=10');
  }

  // Use silent reporter if requested.
  if (argv.silent) {
    args.push('--reporters=jest-silent-reporter');
    args.push('--testLocationInResults');
  }

  // Push the remaining args onto the command.
  // This will send args like `--watch` to Jest.
  args.push(...argv._);

  return args;
}

function getEnvars() {
  const envars = {
    NODE_ENV: argv.env || 'development',
    RELEASE_CHANNEL: argv.releaseChannel.match(/modern|experimental/)
      ? 'experimental'
      : 'stable',

    // Pass this flag through to the config environment
    // so the base config can conditionally load the console setup file.
    compactConsole: argv.compactConsole,
  };

  if (argv.prod) {
    envars.NODE_ENV = 'production';
  }

  if (argv.dev) {
    envars.NODE_ENV = 'development';
  }

  if (argv.variant) {
    envars.VARIANT = true;
  }

  if (argv.reactVersion) {
    envars.REACT_VERSION = semver.coerce(argv.reactVersion);
  }

  if (argv.sourceMaps) {
    // This is off by default because it slows down the test runner, but it's
    // super useful when running the debugger.
    envars.JEST_ENABLE_SOURCE_MAPS = 'inline';
  }

  if (argv.silent) {
    // Enable dot output for jest-silent-reporter so that long test runs
    // show progress and don't appear to be hung.
    envars.JEST_SILENT_REPORTER_DOTS = true;
  }

  return envars;
}

function main() {
  validateOptions();

  const args = getCommandArgs();
  const envars = getEnvars();
  const env = Object.entries(envars).map(([k, v]) => `${k}=${v}`);

  if (argv.ci !== true) {
    // Print the full command we're actually running.
    const command = `$ ${env.join(' ')} node ${args.join(' ')}`;
    console.log(chalk.dim(command));

    // Print the release channel and project we're running for quick confirmation.
    console.log(
      chalk.blue(
        `\nRunning tests for ${argv.project} (${argv.releaseChannel})...`
      )
    );
  }

  // Print a message that the debugger is starting just
  // for some extra feedback when running the debugger.
  if (argv.debug) {
    console.log(chalk.green('\nStarting debugger...'));
    console.log(chalk.green('Open chrome://inspect and press "inspect"\n'));
  }

  // Run Jest.
  const jest = spawn('node', args, {
    stdio: 'inherit',
    env: {...envars, ...process.env},
  });

  // Ensure we close our process when we get a failure case.
  jest.on('close', code => {
    // Forward the exit code from the Jest process.
    if (code === 1) {
      process.exit(1);
    }
  });
}

main();
