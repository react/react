#!/usr/bin/env node

'use strict';

const chalk = require('chalk');
const {exec} = require('child-process-promise');
const {readJsonSync} = require('fs-extra');
const inquirer = require('inquirer');
const {join, relative} = require('path');
const {DRY_RUN, NPM_PACKAGES, ROOT_PATH} = require('./configuration');
const {
  checkNPMPermissions,
  clear,
  confirm,
  execRead,
  logger,
  readSavedBuildMetadata,
} = require('./utils');

// This is the primary control function for this script.
async function main() {
  clear();

  await confirm('Have you run the build-and-test script?', () => {
    const buildAndTestScriptPath = join(__dirname, 'build-and-test.js');
    const pathToPrint = relative(process.cwd(), buildAndTestScriptPath);

    console.log('Begin by running the build-and-test script:');
    console.log(chalk.bold.green('  ' + pathToPrint));
  });

  const {archivePath, currentCommitHash} = readSavedBuildMetadata();

  await checkNPMPermissions();

  await publishToNPM();

  await printFinalInstructions(currentCommitHash, archivePath);
}

async function printFinalInstructions(currentCommitHash, archivePath) {
  console.log('');
  console.log(
    'You are now ready to publish the extension to Chrome, Edge, and Firefox:'
  );
  console.log(
    `  ${chalk.blue.underline(
      'https://fburl.com/publish-react-devtools-extensions'
    )}`
  );
  console.log('');
  console.log('When publishing to Firefox, remember the following:');
  console.log(`  Commit Hash: ${chalk.bold(currentCommitHash)}`);
  console.log(`  Git archive: ${chalk.bold(archivePath)}`);
  console.log('');
  console.log('Also consider syncing this release to Facebook:');
  console.log(`  ${chalk.bold.green('js1 upgrade react-devtools')}`);
}

async function publishToNPM() {
  const {otp} = await inquirer.prompt([
    {
      type: 'input',
      name: 'otp',
      message: 'Please provide an NPM two-factor auth token:',
    },
  ]);

  console.log('');

  if (!otp) {
    console.error(chalk.red(`Invalid OTP provided: "${chalk.bold(otp)}"`));
    process.exit(0);
  }

  for (let index = 0; index < NPM_PACKAGES.length; index++) {
    const npmPackage = NPM_PACKAGES[index];
    const packagePath = join(ROOT_PATH, 'packages', npmPackage);
    const {version} = readJsonSync(join(packagePath, 'package.json'));

    // Check if this package version has already been published.
    // If so we might be resuming from a previous run.
    // We could infer this by comparing the build-info.json,
    // But for now the easiest way is just to ask if this is expected.
    const versionListJSON = await execRead(
      `npm view ${npmPackage} versions --json`
    );
    const versionList = JSON.parse(versionListJSON);
    const versionIsAlreadyPublished = versionList.includes(version);

    if (versionIsAlreadyPublished) {
      console.log('');
      console.log(
        `${npmPackage} version ${chalk.bold(
          version
        )} has already been published.`
      );

      await confirm(`Is this expected (will skip ${npmPackage}@${version})?`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`Publishing package ${chalk.bold(npmPackage)}`);
      console.log(chalk.dim(`  npm publish --otp=${otp}`));
    } else {
      const publishPromise = exec(`npm publish --otp=${otp}`, {
        cwd: packagePath,
      });

      await logger(
        publishPromise,
        `Publishing package ${chalk.bold(npmPackage)}`,
        {
          estimate: 2500,
        }
      );
    }
  }
}

main();
