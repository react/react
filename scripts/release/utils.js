'use strict';

const {exec} = require('child-process-promise');
const {createPatch} = require('diff');
const {hashElement} = require('folder-hash');
const {existsSync, readFileSync, writeFileSync} = require('fs');
const {readJson, writeJson} = require('fs-extra');
const logUpdate = require('log-update');
const {join} = require('path');
const createLogger = require('progress-estimator');
const prompt = require('prompt-promise');
const theme = require('./theme');
const {stablePackages, experimentalPackages} = require('../../ReactVersions');

// https://www.npmjs.com/package/progress-estimator#configuration
const logger = createLogger({
  storagePath: join(__dirname, '.progress-estimator'),
});

const addDefaultParamValue = (optionalShortName, longName, defaultValue) => {
  let found = false;
  for (let i = 0; i < process.argv.length; i++) {
    const current = process.argv[i];
    if (current === optionalShortName || current.startsWith(`${longName}=`)) {
      found = true;
      break;
    }
  }

  if (!found) {
    process.argv.push(`${longName}=${defaultValue}`);
  }
};

const confirm = async message => {
  const confirmation = await prompt(theme`\n{caution ${message}} (y/N) `);
  prompt.done();
  if (confirmation !== 'y' && confirmation !== 'Y') {
    console.log(theme`\n{caution Release cancelled.}`);
    process.exit(0);
  }
};

const execRead = async (command, options) => {
  const {stdout} = await exec(command, options);

  return stdout.trim();
};

const extractCommitFromVersionNumber = version => {
  // Support stable version format e.g. "0.0.0-0e526bcec-20210202"
  // and experimental version format e.g. "0.0.0-experimental-0e526bcec-20210202"
  const match = version.match(/0\.0\.0\-([a-z]+\-){0,1}([^-]+).+/);
  if (match === null) {
    throw Error(`Could not extra commit from version "${version}"`);
  }
  return match[2];
};

const getBuildInfo = async () => {
  const cwd = join(__dirname, '..', '..');

  const isExperimental = process.env.RELEASE_CHANNEL === 'experimental';

  const branch = await execRead('git branch | grep \\* | cut -d " " -f2', {
    cwd,
  });
  const commit = await execRead('git show -s --no-show-signature --format=%h', {
    cwd,
  });
  const checksum = await getChecksumForCurrentRevision(cwd);
  const dateString = await getDateStringForCommit(commit);
  const version = isExperimental
    ? `0.0.0-experimental-${commit}-${dateString}`
    : `0.0.0-${commit}-${dateString}`;

  // React version is stored explicitly, separately for DevTools support.
  // See updateVersionsForNext() below for more info.
  const packageJSON = await readJson(
    join(cwd, 'packages', 'react', 'package.json')
  );
  const reactVersion = isExperimental
    ? `${packageJSON.version}-experimental-${commit}-${dateString}`
    : `${packageJSON.version}-${commit}-${dateString}`;

  return {branch, checksum, commit, reactVersion, version};
};

const getChecksumForCurrentRevision = async cwd => {
  const packagesDir = join(cwd, 'packages');
  const hashedPackages = await hashElement(packagesDir, {
    encoding: 'hex',
    files: {exclude: ['.DS_Store']},
  });
  return hashedPackages.hash.slice(0, 7);
};

const getDateStringForCommit = async commit => {
  let dateString = await execRead(
    `git show -s --no-show-signature --format=%cd --date=format:%Y%m%d ${commit}`
  );

  // On CI environment, this string is wrapped with quotes '...'s
  if (dateString.startsWith("'")) {
    dateString = dateString.slice(1, 9);
  }

  return dateString;
};

const getCommitFromCurrentBuild = async () => {
  const cwd = join(__dirname, '..', '..');

  // If this build includes a build-info.json file, extract the commit from it.
  // Otherwise fall back to parsing from the package version number.
  // This is important to make the build reproducible (e.g. by Mozilla reviewers).
  const buildInfoJSON = join(
    cwd,
    'build',
    'oss-experimental',
    'react',
    'build-info.json'
  );
  if (existsSync(buildInfoJSON)) {
    const buildInfo = await readJson(buildInfoJSON);
    return buildInfo.commit;
  } else {
    const packageJSON = join(
      cwd,
      'build',
      'oss-experimental',
      'react',
      'package.json'
    );
    const {version} = await readJson(packageJSON);
    return extractCommitFromVersionNumber(version);
  }
};

const getPublicPackages = isExperimental => {
  const packageNames = Object.keys(stablePackages);
  if (isExperimental) {
    packageNames.push(...experimentalPackages);
  }
  return packageNames;
};

const handleError = error => {
  logUpdate.clear();

  const message = error.message.trim().replace(/\n +/g, '\n');
  const stack = error.stack.replace(error.message, '');

  console.log(theme`{error ${message}}\n\n{path ${stack}}`);
  process.exit(1);
};

const logPromise = async (promise, text, estimate) =>
  logger(promise, text, {estimate});

const printDiff = (path, beforeContents, afterContents) => {
  const patch = createPatch(path, beforeContents, afterContents);
  const coloredLines = patch
    .split('\n')
    .slice(2) // Trim index file
    .map((line, index) => {
      if (index <= 1) {
        return theme.diffHeader(line);
      }
      switch (line[0]) {
        case '+':
          return theme.diffAdded(line);
        case '-':
          return theme.diffRemoved(line);
        case ' ':
          return line;
        case '@':
          return null;
        case '\\':
          return null;
      }
    })
    .filter(line => line);
  console.log(coloredLines.join('\n'));
  return patch;
};

// Convert an array param (expected format "--foo bar baz")
// to also accept comma input (e.g. "--foo bar,baz")
const splitCommaParams = array => {
  for (let i = array.length - 1; i >= 0; i--) {
    const param = array[i];
    if (param.includes(',')) {
      array.splice(i, 1, ...param.split(','));
    }
  }
};

// This method is used by both local Node release scripts and Circle CI bash scripts.
// It updates version numbers in package JSONs (both the version field and dependencies),
// As well as the embedded renderer version in "packages/shared/ReactVersion".
// Canaries version numbers use the format of 0.0.0-<sha>-<date> to be easily recognized (e.g. 0.0.0-01974a867-20200129).
// A separate "React version" is used for the embedded renderer version to support DevTools,
// since it needs to distinguish between different version ranges of React.
// It is based on the version of React in the local package.json (e.g. 16.12.0-01974a867-20200129).
// Both numbers will be replaced if the "next" release is promoted to a stable release.
const updateVersionsForNext = async (cwd, reactVersion, version) => {
  const isExperimental = reactVersion.includes('experimental');
  const packages = getPublicPackages(isExperimental);
  const packagesDir = join(cwd, 'packages');

  // Update the shared React version source file.
  // This is bundled into built renderers.
  // The promote script will replace this with a final version later.
  const sourceReactVersionPath = join(cwd, 'packages/shared/ReactVersion.js');
  const sourceReactVersion = readFileSync(
    sourceReactVersionPath,
    'utf8'
  ).replace(/export default '[^']+';/, `export default '${reactVersion}';`);
  writeFileSync(sourceReactVersionPath, sourceReactVersion);

  // Update the root package.json.
  // This is required to pass a later version check script.
  {
    const packageJSONPath = join(cwd, 'package.json');
    const packageJSON = await readJson(packageJSONPath);
    packageJSON.version = version;
    await writeJson(packageJSONPath, packageJSON, {spaces: 2});
  }

  for (let i = 0; i < packages.length; i++) {
    const packageName = packages[i];
    const packagePath = join(packagesDir, packageName);

    // Update version numbers in package JSONs
    const packageJSONPath = join(packagePath, 'package.json');
    const packageJSON = await readJson(packageJSONPath);
    packageJSON.version = version;

    // Also update inter-package dependencies.
    // Next releases always have exact version matches.
    // The promote script may later relax these (e.g. "^x.x.x") based on source package JSONs.
    const {dependencies, peerDependencies} = packageJSON;
    for (let j = 0; j < packages.length; j++) {
      const dependencyName = packages[j];
      if (dependencies && dependencies[dependencyName]) {
        dependencies[dependencyName] = version;
      }
      if (peerDependencies && peerDependencies[dependencyName]) {
        peerDependencies[dependencyName] = version;
      }
    }

    await writeJson(packageJSONPath, packageJSON, {spaces: 2});
  }
};

module.exports = {
  addDefaultParamValue,
  confirm,
  execRead,
  getBuildInfo,
  getChecksumForCurrentRevision,
  getCommitFromCurrentBuild,
  getDateStringForCommit,
  getPublicPackages,
  handleError,
  logPromise,
  printDiff,
  splitCommaParams,
  theme,
  updateVersionsForNext,
};
