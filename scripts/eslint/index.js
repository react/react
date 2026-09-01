/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const minimatch = require('minimatch');
const {ESLint} = require('eslint');
const listChangedFiles = require('../shared/listChangedFiles');

const allPaths = ['**/*.js'];

let changedFiles = null;

async function runESLintOnFilesWithOptions(filePatterns, onlyChanged, options) {
  const eslint = new ESLint(options);
  const formatter = await eslint.loadFormatter();

  if (onlyChanged && changedFiles === null) {
    // Calculate lazily.
    changedFiles = [...listChangedFiles()];
  }
  const finalFilePatterns = onlyChanged
    ? intersect(changedFiles, filePatterns)
    : filePatterns;
  const results = await eslint.lintFiles(finalFilePatterns);

  if (options != null && options.fix === true) {
    await ESLint.outputFixes(results);
  }

  // When using `ignorePattern`, eslint will show `File ignored...` warnings for any ignores.
  // We don't care because we *expect* some passed files will be ignores if `ignorePattern` is used.
  const messages = results.filter(item => {
    if (!onlyChanged) {
      // Don't suppress the message on a full run.
      // We only expect it to happen for "only changed" runs.
      return true;
    }
    const ignoreMessage =
      'File ignored because of a matching ignore pattern. Use "--no-ignore" to override.';
    return !(item.messages[0] && item.messages[0].message === ignoreMessage);
  });

  const errorCount = results.reduce(
    (count, result) => count + result.errorCount,
    0
  );
  const warningCount = results.reduce(
    (count, result) => count + result.warningCount,
    0
  );
  const ignoredMessageCount = results.length - messages.length;
  return {
    output: formatter.format(messages),
    errorCount: errorCount,
    warningCount: warningCount - ignoredMessageCount,
  };
}

function intersect(files, patterns) {
  let intersection = [];
  patterns.forEach(pattern => {
    intersection = [
      ...intersection,
      ...minimatch.match(files, pattern, {matchBase: true}),
    ];
  });
  return [...new Set(intersection)];
}

async function runESLint({onlyChanged, paths, ...options}) {
  if (typeof onlyChanged !== 'boolean') {
    throw new Error('Pass options.onlyChanged as a boolean.');
  }
  if (onlyChanged && paths !== undefined) {
    throw new Error('Cannot specify paths when onlyChanged is true.');
  }
  if (paths === undefined || paths.length === 0) {
    paths = allPaths;
  }
  const {errorCount, warningCount, output} = await runESLintOnFilesWithOptions(
    paths,
    onlyChanged,
    options
  );
  console.log(output);
  return errorCount === 0 && warningCount === 0;
}

module.exports = runESLint;
