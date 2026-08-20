#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const yargs = require('yargs/yargs');
const {hideBin} = require('yargs/helpers');

// Constants
const COMPILER_ROOT = path.resolve(__dirname, '..');
const ENVIRONMENT_TS_PATH = path.join(
  COMPILER_ROOT,
  'packages/babel-plugin-react-compiler/src/HIR/Environment.ts'
);
const FIXTURES_PATH = path.join(
  COMPILER_ROOT,
  'packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler'
);
const FIXTURE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <flag-name>')
    .command('$0 <flag-name>', 'Enable a feature flag by default', yargs => {
      yargs.positional('flag-name', {
        describe: 'Name of the feature flag to enable',
        type: 'string',
      });
    })
    .example(
      '$0 validateExhaustiveMemoizationDependencies',
      'Enable the validateExhaustiveMemoizationDependencies flag'
    )
    .help('h')
    .alias('h', 'help')
    .strict()
    .parseSync();

  return argv['flag-name'];
}

/**
 * Enable a feature flag in Environment.ts by changing default(false) to default(true)
 */
function enableFlagInEnvironment(flagName) {
  console.log(`\nEnabling flag "${flagName}" in Environment.ts...`);

  const content = fs.readFileSync(ENVIRONMENT_TS_PATH, 'utf8');

  // Check if the flag exists with default(false)
  const flagPatternFalse = new RegExp(
    `(${escapeRegex(flagName)}:\\s*z\\.boolean\\(\\)\\.default\\()false(\\))`,
    'g'
  );

  if (!flagPatternFalse.test(content)) {
    // Check if flag exists at all
    const flagExistsPattern = new RegExp(
      `${escapeRegex(flagName)}:\\s*z\\.boolean\\(\\)`,
      'g'
    );
    if (flagExistsPattern.test(content)) {
      // Check if it's already true
      const flagPatternTrue = new RegExp(
        `${escapeRegex(flagName)}:\\s*z\\.boolean\\(\\)\\.default\\(true\\)`,
        'g'
      );
      if (flagPatternTrue.test(content)) {
        console.error(`Error: Flag "${flagName}" already has default(true)`);
        process.exit(1);
      }
      console.error(
        `Error: Flag "${flagName}" exists but doesn't have default(false)`
      );
      process.exit(1);
    }
    console.error(`Error: Flag "${flagName}" not found in Environment.ts`);
    process.exit(1);
  }

  // Perform the replacement
  const newContent = content.replace(flagPatternFalse, '$1true$2');

  // Verify the replacement worked
  if (content === newContent) {
    console.error(`Error: Failed to replace flag "${flagName}"`);
    process.exit(1);
  }

  fs.writeFileSync(ENVIRONMENT_TS_PATH, newContent, 'utf8');
  console.log(`Successfully enabled "${flagName}" in Environment.ts`);
}

/**
 * Helper to escape regex special characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Run yarn snap and capture output
 */
function runTests() {
  console.log('\nRunning test suite (yarn snap)...');

  try {
    const output = execSync('yarn snap', {
      cwd: COMPILER_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    return {success: true, output};
  } catch (error) {
    // yarn snap exits with code 1 when tests fail, which throws an error
    return {success: false, output: error.stdout || error.message};
  }
}

/**
 * Parse failing test names from test output
 */
function parseFailingTests(output) {
  const failingTests = [];

  // Look for lines that contain "FAIL:" followed by the test name
  // Format: "FAIL: test-name" or with ANSI codes
  const lines = output.split('\n');
  for (const line of lines) {
    // Remove ANSI codes for easier parsing
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');

    // Match "FAIL: test-name"
    const match = cleanLine.match(/^FAIL:\s*(.+)$/);
    if (match) {
      failingTests.push(match[1].trim());
    }
  }

  return failingTests;
}

/**
 * Find the fixture file for a given test name
 */
function findFixtureFile(testName) {
  const basePath = path.join(FIXTURES_PATH, testName);

  for (const ext of FIXTURE_EXTENSIONS) {
    const filePath = basePath + ext;
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * Add pragma to disable the feature flag in a fixture file
 */
function addPragmaToFixture(filePath, flagName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  if (lines.length === 0) {
    console.warn(`Warning: Empty file ${filePath}`);
    return false;
  }

  const firstLine = lines[0];
  const pragma = `@${flagName}:false`;

  // Check if pragma already exists
  if (firstLine.includes(pragma)) {
    return false; // Already has the pragma
  }

  // Check if first line is a single-line comment
  if (firstLine.trim().startsWith('//')) {
    // Append pragma to existing comment
    lines[0] = firstLine + ' ' + pragma;
  } else if (firstLine.trim().startsWith('/*')) {
    // Multi-line comment - insert new line before it
    lines.unshift('// ' + pragma);
  } else {
    // No comment - insert new comment as first line
    lines.unshift('// ' + pragma);
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return true;
}

/**
 * Update snapshot files
 */
function updateSnapshots() {
  console.log('\nUpdating snapshots (yarn snap -u)...');

  try {
    execSync('yarn snap -u', {
      cwd: COMPILER_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log('Snapshots updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating snapshots:', error.message);
    return false;
  }
}

/**
 * Verify all tests pass
 */
function verifyAllTestsPass() {
  console.log('\nRunning final verification (yarn snap)...');

  const {success, output} = runTests();

  // Parse summary line: "N Tests, N Passed, N Failed"
  const summaryMatch = output.match(
    /(\d+)\s+Tests,\s+(\d+)\s+Passed,\s+(\d+)\s+Failed/
  );

  if (summaryMatch) {
    const [, total, passed, failed] = summaryMatch;
    console.log(
      `\nTest Results: ${total} Tests, ${passed} Passed, ${failed} Failed`
    );

    if (failed === '0') {
      console.log('All tests passed!');
      return true;
    } else {
      console.error(`${failed} tests still failing`);
      const failingTests = parseFailingTests(output);
      if (failingTests.length > 0) {
        console.error('\nFailing tests:');
        failingTests.forEach(test => console.error(`  - ${test}`));
      }
      return false;
    }
  }

  return success;
}

/**
 * Main function
 */
async function main() {
  const flagName = parseArgs();

  console.log(`\nEnabling flag: '${flagName}'`);

  try {
    // Step 1: Enable flag in Environment.ts
    enableFlagInEnvironment(flagName);

    // Step 2: Run tests to find failures
    const {output} = runTests();
    const failingTests = parseFailingTests(output);

    console.log(`\nFound ${failingTests.length} failing tests`);

    if (failingTests.length === 0) {
      console.log('No failing tests! Feature flag enabled successfully.');
      process.exit(0);
    }

    // Step 3: Add pragma to each failing fixture
    console.log(`\nAdding '@${flagName}:false' pragma to failing fixtures...`);

    const notFound = [];
    let notFoundCount = 0;

    for (const testName of failingTests) {
      const fixturePath = findFixtureFile(testName);

      if (!fixturePath) {
        console.warn(`Could not find fixture file for: ${testName}`);
        notFound.push(fixturePath);
        continue;
      }

      const updated = addPragmaToFixture(fixturePath, flagName);
      if (updated) {
        updatedCount++;
        console.log(`  Updated: ${testName}`);
      }
    }

    console.log(
      `\nSummary: Updated ${updatedCount} fixtures, ${notFoundCount} not found`
    );

    if (notFoundCount.length !== 0) {
      console.error(
        '\nFailed to update snapshots, could not find:\n' + notFound.join('\n')
      );
      process.exit(1);
    }

    // Step 4: Update snapshots
    if (!updateSnapshots()) {
      console.error('\nFailed to update snapshots');
      process.exit(1);
    }

    // Step 5: Verify all tests pass
    if (!verifyAllTestsPass()) {
      console.error('\nVerification failed: Some tests are still failing');
      process.exit(1);
    }

    console.log('\nSuccess! Feature flag enabled and all tests passing.');
    console.log(`\nSummary:`);
    console.log(`  - Enabled "${flagName}" in Environment.ts`);
    console.log(`  - Updated ${updatedCount} fixture files with pragma`);
    console.log(`  - All tests passing`);

    process.exit(0);
  } catch (error) {
    console.error('\nFatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
