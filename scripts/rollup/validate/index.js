'use strict';

/* eslint-disable no-for-of-loops/no-for-of-loops */

const path = require('path');
const {promisify} = require('util');
const glob = promisify(require('glob'));
const {ESLint} = require('eslint');

// Lint the final build artifacts. Helps catch bugs in our build pipeline.

function getFormat(filepath) {
  if (filepath.includes('facebook')) {
    if (filepath.includes('shims')) {
      // We don't currently lint these shims. We rely on the downstream Facebook
      // repo to transform them.
      // TODO: Should we lint them?
      return null;
    }
    if (filepath.includes('ESLintPluginReactHooks')) {
      // The ESLint plugin bundles compiler code with modern syntax that
      // doesn't need to conform to the ES5 www lint rules.
      return null;
    }
    return 'fb';
  }
  if (filepath.includes('react-native')) {
    if (filepath.includes('shims')) {
      // We don't currently lint these shims. We rely on the downstream Facebook
      // repo to transform them.
      // TODO: Should we lint them?
      return null;
    }
    return 'rn';
  }
  if (filepath.includes('cjs')) {
    if (
      filepath.includes('react-server-dom-webpack-plugin') ||
      filepath.includes('react-server-dom-webpack-node-register') ||
      filepath.includes('react-suspense-test-utils')
    ) {
      return 'cjs2015';
    }
    return 'cjs';
  }
  if (filepath.includes('esm')) {
    return 'esm';
  }
  if (
    filepath.includes('oss-experimental') ||
    filepath.includes('oss-stable')
  ) {
    // If a file in one of the open source channels doesn't match an earlier,
    // more specific rule, then assume it's CommonJS.
    return 'cjs';
  }
  throw new Error('Could not find matching lint format for file: ' + filepath);
}

function getESLintInstance(format) {
  return new ESLint({
    useEslintrc: false,
    overrideConfigFile: path.join(__dirname, `eslintrc.${format}.js`),
    ignore: false,
  });
}

async function lint(eslint, filepaths) {
  const results = await eslint.lintFiles(filepaths);
  if (
    results.some(result => result.errorCount > 0 || result.warningCount > 0)
  ) {
    process.exitCode = 1;
    console.log(`Lint failed`);
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);
    console.log(resultText);
  }
}

async function lintEverything() {
  console.log(`Linting build artifacts...`);

  const allFilepaths = await glob('build/**/*.js');

  const pathsByFormat = new Map();
  for (const filepath of allFilepaths) {
    const format = getFormat(filepath);
    if (format !== null) {
      const paths = pathsByFormat.get(format);
      if (paths === undefined) {
        pathsByFormat.set(format, [filepath]);
      } else {
        paths.push(filepath);
      }
    }
  }

  const promises = [];
  for (const [format, filepaths] of pathsByFormat) {
    const eslint = getESLintInstance(format);
    promises.push(lint(eslint, filepaths));
  }
  await Promise.all(promises);
}

lintEverything().catch(error => {
  process.exitCode = 1;
  console.error(error);
});
