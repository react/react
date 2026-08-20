#!/usr/bin/env node

'use strict';

const chalk = require('chalk');
const {exec} = require('child-process-promise');
const {readFileSync, writeFileSync} = require('fs');
const {readJsonSync, writeJsonSync} = require('fs-extra');
const inquirer = require('inquirer');
const {join, relative} = require('path');
const semver = require('semver');
const {
  CHANGELOG_PATH,
  DRY_RUN,
  MANIFEST_PATHS,
  PACKAGE_PATHS,
  PULL_REQUEST_BASE_URL,
  RELEASE_SCRIPT_TOKEN,
  ROOT_PATH,
} = require('./configuration');
const {
  checkNPMPermissions,
  clear,
  confirmContinue,
  execRead,
} = require('./utils');

// This is the primary control function for this script.
async function main() {
  clear();

  await checkNPMPermissions();

  const sha = await getPreviousCommitSha();
  const [shortCommitLog, formattedCommitLog] = await getCommitLog(sha);

  console.log('');
  console.log(
    'This release includes the following commits:',
    chalk.gray(shortCommitLog)
  );
  console.log('');

  const releaseType = await getReleaseType();

  const path = join(ROOT_PATH, PACKAGE_PATHS[0]);
  const previousVersion = readJsonSync(path).version;
  const {major, minor, patch} = semver(previousVersion);
  const nextVersion =
    releaseType === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

  updateChangelog(nextVersion, formattedCommitLog);

  await reviewChangelogPrompt();

  updatePackageVersions(previousVersion, nextVersion);
  updateManifestVersions(previousVersion, nextVersion);

  console.log('');
  console.log(
    `Packages and manifests have been updated from version ${chalk.bold(
      previousVersion
    )} to ${chalk.bold(nextVersion)}`
  );
  console.log('');

  await commitPendingChanges(previousVersion, nextVersion);

  printFinalInstructions();
}

async function commitPendingChanges(previousVersion, nextVersion) {
  console.log('');
  console.log('Committing revision and changelog.');
  console.log(chalk.dim('  git add .'));
  console.log(
    chalk.dim(
      `  git commit -m "React DevTools ${previousVersion} -> ${nextVersion}"`
    )
  );

  if (!DRY_RUN) {
    await exec(`
      git add .
      git commit -m "React DevTools ${previousVersion} -> ${nextVersion}"
    `);
  }

  console.log('');
  console.log(`Please push this commit before continuing:`);
  console.log(`  ${chalk.bold.green('git push')}`);

  await confirmContinue();
}

async function getCommitLog(sha) {
  let shortLog = '';
  let formattedLog = '';

  const hasGh = await hasGithubCLI();
  const rawLog = await execRead(`
    git log --topo-order --pretty=format:'%s' ${sha}...HEAD -- packages/react-devtools*
  `);
  const lines = rawLog.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/^\[devtools\] */i, '');
    const match = line.match(/(.+) \(#([0-9]+)\)/);
    if (match !== null) {
      const title = match[1];
      const pr = match[2];
      let username;
      if (hasGh) {
        const response = await execRead(
          `gh api /repos/facebook/react/pulls/${pr}`
        );
        const {user} = JSON.parse(response);
        username = `[${user.login}](${user.html_url})`;
      } else {
        username = '[USERNAME](https://github.com/USERNAME)';
      }
      formattedLog += `\n* ${title} (${username} in [#${pr}](${PULL_REQUEST_BASE_URL}${pr}))`;
      shortLog += `\n* ${title}`;
    } else {
      formattedLog += `\n* ${line}`;
      shortLog += `\n* ${line}`;
    }
  }

  return [shortLog, formattedLog];
}

async function hasGithubCLI() {
  try {
    await exec('which gh');
    return true;
  } catch (_) {}
  return false;
}

async function getPreviousCommitSha() {
  const choices = [];

  const lines = await execRead(`
    git log --max-count=5 --topo-order --pretty=format:'%H:::%s:::%as' HEAD -- ${join(
      ROOT_PATH,
      PACKAGE_PATHS[0]
    )}
  `);

  lines.split('\n').forEach((line, index) => {
    const [hash, message, date] = line.split(':::');
    choices.push({
      name: `${chalk.bold(hash)} ${chalk.dim(date)} ${message}`,
      value: hash,
      short: date,
    });
  });

  const {sha} = await inquirer.prompt([
    {
      type: 'list',
      name: 'sha',
      message: 'Which of the commits above marks the last DevTools release?',
      choices,
      default: choices[0].value,
    },
  ]);

  return sha;
}

async function getReleaseType() {
  const {releaseType} = await inquirer.prompt([
    {
      type: 'list',
      name: 'releaseType',
      message: 'Which type of release is this?',
      choices: [
        {
          name: 'Minor (new user facing functionality)',
          value: 'minor',
          short: 'Minor',
        },
        {name: 'Patch (bug fixes only)', value: 'patch', short: 'Patch'},
      ],
      default: 'patch',
    },
  ]);

  return releaseType;
}

function printFinalInstructions() {
  const buildAndTestcriptPath = join(__dirname, 'build-and-test.js');
  const pathToPrint = relative(process.cwd(), buildAndTestcriptPath);

  console.log('');
  console.log('Continue by running the build-and-test script:');
  console.log(chalk.bold.green('  ' + pathToPrint));
}

async function reviewChangelogPrompt() {
  console.log('');
  console.log(
    'The changelog has been updated with commits since the previous release:'
  );
  console.log(`  ${chalk.bold(CHANGELOG_PATH)}`);
  console.log('');
  console.log('Please review the new changelog text for the following:');
  console.log('  1. Filter out any non-user-visible changes (e.g. typo fixes)');
  console.log('  2. Organize the list into Features vs Bugfixes');
  console.log('  3. Combine related PRs into a single bullet list');
  console.log(
    '  4. Replacing the "USERNAME" placeholder text with the GitHub username(s)'
  );
  console.log('');
  console.log(`  ${chalk.bold.green(`open ${CHANGELOG_PATH}`)}`);

  await confirmContinue();
}

function updateChangelog(nextVersion, commitLog) {
  const path = join(ROOT_PATH, CHANGELOG_PATH);
  const oldChangelog = readFileSync(path, 'utf8');

  const [beginning, end] = oldChangelog.split(RELEASE_SCRIPT_TOKEN);

  const dateString = new Date().toLocaleDateString('en-us', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const header = `---\n\n### ${nextVersion}\n${dateString}`;

  const newChangelog = `${beginning}${RELEASE_SCRIPT_TOKEN}\n\n${header}\n${commitLog}${end}`;

  console.log(chalk.dim('  Updating changelog: ' + CHANGELOG_PATH));

  if (!DRY_RUN) {
    writeFileSync(path, newChangelog);
  }
}

function updateManifestVersions(previousVersion, nextVersion) {
  MANIFEST_PATHS.forEach(partialPath => {
    const path = join(ROOT_PATH, partialPath);
    const json = readJsonSync(path);
    json.version = nextVersion;

    if (json.hasOwnProperty('version_name')) {
      json.version_name = nextVersion;
    }

    console.log(chalk.dim('  Updating manifest JSON: ' + partialPath));

    if (!DRY_RUN) {
      writeJsonSync(path, json, {spaces: 2});
    }
  });
}

function updatePackageVersions(previousVersion, nextVersion) {
  PACKAGE_PATHS.forEach(partialPath => {
    const path = join(ROOT_PATH, partialPath);
    const json = readJsonSync(path);
    json.version = nextVersion;

    for (let key in json.dependencies) {
      if (key.startsWith('react-devtools')) {
        const version = json.dependencies[key];

        json.dependencies[key] = version.replace(previousVersion, nextVersion);
      }
    }

    console.log(chalk.dim('  Updating package JSON: ' + partialPath));

    if (!DRY_RUN) {
      writeJsonSync(path, json, {spaces: 2});
    }
  });
}

main();
