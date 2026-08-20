#!/usr/bin/env node

'use strict';

const chalk = require('chalk');
const {exec} = require('child-process-promise');
const inquirer = require('inquirer');
const {homedir} = require('os');
const {join, relative} = require('path');
const {DRY_RUN, ROOT_PATH} = require('./configuration');
const {
  clear,
  confirm,
  confirmContinue,
  execRead,
  logger,
  saveBuildMetadata,
} = require('./utils');

// This is the primary control function for this script.
async function main() {
  clear();

  await confirm('Have you stopped all NPM DEV scripts?', () => {
    const packagesPath = relative(process.cwd(), join(__dirname, 'packages'));

    console.log('Stop all NPM DEV scripts in the following directories:');
    console.log(
      chalk.bold('  ' + join(packagesPath, 'react-devtools-core')),
      chalk.gray('(start:backend, start:standalone)')
    );
    console.log(
      chalk.bold('  ' + join(packagesPath, 'react-devtools-inline')),
      chalk.gray('(start)')
    );

    const buildAndTestScriptPath = join(__dirname, 'build-and-test.js');
    const pathToPrint = relative(process.cwd(), buildAndTestScriptPath);

    console.log('\nThen restart this release step:');
    console.log(chalk.bold.green('  ' + pathToPrint));
  });

  await confirm('Have you run the prepare-release script?', () => {
    const prepareReleaseScriptPath = join(__dirname, 'prepare-release.js');
    const pathToPrint = relative(process.cwd(), prepareReleaseScriptPath);

    console.log('Begin by running the prepare-release script:');
    console.log(chalk.bold.green('  ' + pathToPrint));
  });

  const archivePath = await archiveGitRevision();
  const currentCommitHash = await downloadLatestReactBuild();

  await buildAndTestInlinePackage();
  await buildAndTestStandalonePackage();
  await buildAndTestExtensions();

  saveBuildMetadata({archivePath, currentCommitHash});

  printFinalInstructions();
}

async function archiveGitRevision() {
  const desktopPath = join(homedir(), 'Desktop');
  const archivePath = join(desktopPath, 'DevTools.tgz');

  console.log(`Creating git archive at ${chalk.dim(archivePath)}`);
  console.log('');

  if (!DRY_RUN) {
    await exec(`git archive main | gzip > ${archivePath}`, {cwd: ROOT_PATH});
  }

  return archivePath;
}

async function buildAndTestExtensions() {
  const extensionsPackagePath = join(
    ROOT_PATH,
    'packages',
    'react-devtools-extensions'
  );
  const buildExtensionsPromise = exec('yarn build', {
    cwd: extensionsPackagePath,
  });

  await logger(
    buildExtensionsPromise,
    `Building browser extensions ${chalk.dim('(this may take a minute)')}`,
    {
      estimate: 60000,
    }
  );

  console.log('');
  console.log(`Extensions have been build for Chrome, Edge, and Firefox.`);
  console.log('');
  console.log('Smoke test each extension before continuing:');
  console.log(`  ${chalk.bold.green('cd ' + extensionsPackagePath)}`);
  console.log('');
  console.log(`  ${chalk.dim('# Test Chrome extension')}`);
  console.log(`  ${chalk.bold.green('yarn test:chrome')}`);
  console.log('');
  console.log(`  ${chalk.dim('# Test Edge extension')}`);
  console.log(`  ${chalk.bold.green('yarn test:edge')}`);
  console.log('');
  console.log(`  ${chalk.dim('# Firefox Chrome extension')}`);
  console.log(`  ${chalk.bold.green('yarn test:firefox')}`);

  await confirmContinue();
}

async function buildAndTestStandalonePackage() {
  const corePackagePath = join(ROOT_PATH, 'packages', 'react-devtools-core');
  const corePackageDest = join(corePackagePath, 'dist');

  await exec(`rm -rf ${corePackageDest}`);
  const buildCorePromise = exec('yarn build', {cwd: corePackagePath});

  await logger(
    buildCorePromise,
    `Building ${chalk.bold('react-devtools-core')} package.`,
    {
      estimate: 25000,
    }
  );

  const standalonePackagePath = join(ROOT_PATH, 'packages', 'react-devtools');
  const safariFixturePath = join(
    ROOT_PATH,
    'fixtures',
    'devtools',
    'standalone',
    'index.html'
  );

  console.log('');
  console.log(
    `Test the ${chalk.bold('react-devtools-core')} target before continuing:`
  );
  console.log(`  ${chalk.bold.green('cd ' + standalonePackagePath)}`);
  console.log(`  ${chalk.bold.green('yarn start')}`);
  console.log('');
  console.log(
    'The following fixture can be useful for testing Safari integration:'
  );
  console.log(`  ${chalk.dim(safariFixturePath)}`);

  await confirmContinue();
}

async function buildAndTestInlinePackage() {
  const inlinePackagePath = join(
    ROOT_PATH,
    'packages',
    'react-devtools-inline'
  );
  const inlinePackageDest = join(inlinePackagePath, 'dist');

  await exec(`rm -rf ${inlinePackageDest}`);
  const buildPromise = exec('yarn build', {cwd: inlinePackagePath});

  await logger(
    buildPromise,
    `Building ${chalk.bold('react-devtools-inline')} package.`,
    {
      estimate: 10000,
    }
  );

  const shellPackagePath = join(ROOT_PATH, 'packages', 'react-devtools-shell');

  console.log('');
  console.log(`Built ${chalk.bold('react-devtools-inline')} target.`);
  console.log('');
  console.log('Test this build before continuing:');
  console.log(`  ${chalk.bold.green('cd ' + shellPackagePath)}`);
  console.log(`  ${chalk.bold.green('yarn start')}`);

  await confirmContinue();
}

async function downloadLatestReactBuild() {
  const releaseScriptPath = join(ROOT_PATH, 'scripts', 'release');
  const installPromise = exec('yarn install', {cwd: releaseScriptPath});

  await logger(
    installPromise,
    `Installing release script dependencies. ${chalk.dim(
      '(this may take a minute if CI is still running)'
    )}`,
    {
      estimate: 5000,
    }
  );

  console.log('');

  const currentCommitHash = (await exec('git rev-parse HEAD')).stdout.trim();
  if (!currentCommitHash) {
    throw new Error('Failed to get current commit hash');
  }

  const {commit} = await inquirer.prompt([
    {
      type: 'input',
      name: 'commit',
      message: 'Which React version (commit) should be used?',
      default: currentCommitHash,
    },
  ]);
  console.log('');

  const downloadScriptPath = join(
    releaseScriptPath,
    'download-experimental-build.js'
  );
  const downloadPromise = execRead(
    `"${downloadScriptPath}" --commit=${commit}`
  );

  await logger(downloadPromise, 'Downloading React artifacts from CI.', {
    estimate: 15000,
  });

  return currentCommitHash;
}

function printFinalInstructions() {
  const publishReleaseScriptPath = join(__dirname, 'publish-release.js');
  const pathToPrint = relative(process.cwd(), publishReleaseScriptPath);

  console.log('');
  console.log('Continue by running the publish-release script:');
  console.log(chalk.bold.green('  ' + pathToPrint));
}

main();
