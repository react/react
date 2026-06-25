'use strict';

/* eslint-disable no-for-of-loops/no-for-of-loops */

const fs = require('fs');
const fse = require('fs-extra');
const {spawnSync} = require('child_process');
const path = require('path');
const tmp = require('tmp');
const shell = require('shelljs');
const {
  ReactVersion,
  stablePackages,
  experimentalPackages,
  canaryChannelLabel,
  rcNumber,
} = require('../../ReactVersions');
const yargs = require('yargs');
const Bundles = require('./bundles');

// Runs the build script for both stable and experimental release channels,
// by configuring an environment variable.

const sha = String(spawnSync('git', ['rev-parse', 'HEAD']).stdout).slice(0, 8);

let dateString = String(
  spawnSync('git', [
    'show',
    '-s',
    '--no-show-signature',
    '--format=%cd',
    '--date=format:%Y%m%d',
    sha,
  ]).stdout
).trim();

// On CI environment, this string is wrapped with quotes '...'s
if (dateString.startsWith("'")) {
  dateString = dateString.slice(1, 9);
}

// Build the artifacts using a placeholder React version. We'll then do a string
// replace to swap it with the correct version per release channel.
//
// The placeholder version is the same format that the "next" channel uses
const PLACEHOLDER_REACT_VERSION =
  ReactVersion + '-' + canaryChannelLabel + '-' + sha + '-' + dateString;

// TODO: We should inject the React version using a build-time parameter
// instead of overwriting the source files.
fs.writeFileSync(
  './packages/shared/ReactVersion.js',
  `export default '${PLACEHOLDER_REACT_VERSION}';\n`
);

const argv = yargs.wrap(yargs.terminalWidth()).options({
  releaseChannel: {
    alias: 'r',
    describe: 'Build the given release channel.',
    requiresArg: true,
    type: 'string',
    choices: ['experimental', 'stable'],
  },
  index: {
    alias: 'i',
    describe: 'Worker id.',
    requiresArg: true,
    type: 'number',
  },
  total: {
    alias: 't',
    describe: 'Total number of workers.',
    requiresArg: true,
    type: 'number',
  },
  ci: {
    describe: 'Run tests in CI',
    requiresArg: false,
    type: 'boolean',
    default: false,
  },
  type: {
    describe: `Build the given bundle type. (${Object.values(
      Bundles.bundleTypes
    )})`,
    requiresArg: false,
    type: 'string',
  },
  pretty: {
    describe: 'Force pretty output.',
    requiresArg: false,
    type: 'boolean',
  },
  'sync-fbsource': {
    describe: 'Include to sync build to fbsource.',
    requiresArg: false,
    type: 'string',
  },
  'sync-www': {
    describe: 'Include to sync build to www.',
    requiresArg: false,
    type: 'string',
  },
  'unsafe-partial': {
    describe: 'Do not clean ./build first.',
    requiresArg: false,
    type: 'boolean',
  },
}).argv;

async function main() {
  if (argv.ci === true) {
    buildForChannel(argv.releaseChannel, argv.total, argv.index);
    switch (argv.releaseChannel) {
      case 'stable': {
        processStable('./build');
        break;
      }
      case 'experimental': {
        processExperimental('./build');
        break;
      }
      default:
        throw new Error(`Unknown release channel ${argv.releaseChannel}`);
    }
  } else {
    const releaseChannel = argv.releaseChannel;
    if (releaseChannel === 'stable') {
      buildForChannel('stable', '', '');
      processStable('./build');
    } else if (releaseChannel === 'experimental') {
      buildForChannel('experimental', '', '');
      processExperimental('./build');
    } else {
      // Running locally, no concurrency. Move each channel's build artifacts into
      // a temporary directory so that they don't conflict.
      buildForChannel('stable', '', '');
      const stableDir = tmp.dirSync().name;
      crossDeviceRenameSync('./build', stableDir);
      processStable(stableDir);
      buildForChannel('experimental', '', '');
      const experimentalDir = tmp.dirSync().name;
      crossDeviceRenameSync('./build', experimentalDir);
      processExperimental(experimentalDir);

      // Then merge the experimental folder into the stable one. processExperimental
      // will have already removed conflicting files.
      //
      // In CI, merging is handled by the GitHub Download Artifacts plugin.
      mergeDirsSync(experimentalDir + '/', stableDir + '/');

      // Now restore the combined directory back to its original name
      crossDeviceRenameSync(stableDir, './build');
    }
  }
}

function buildForChannel(channel, total, index) {
  const {status} = spawnSync(
    'node',
    ['./scripts/rollup/build.js', ...process.argv.slice(2)],
    {
      stdio: ['pipe', process.stdout, process.stderr],
      env: {
        ...process.env,
        RELEASE_CHANNEL: channel,
        CI_TOTAL: total,
        CI_INDEX: index,
      },
    }
  );

  if (status !== 0) {
    // Error of spawned process is already piped to this stderr
    process.exit(status);
  }
}

function processStable(buildDir) {
  if (fs.existsSync(buildDir + '/node_modules')) {
    // Identical to `oss-stable` but with real, semver versions. This is what
    // will get published to @latest.
    shell.cp('-r', buildDir + '/node_modules', buildDir + '/oss-stable-semver');
    if (canaryChannelLabel === 'rc') {
      // During the RC phase, we also generate an RC build that pins to exact
      // versions but does not include a SHA, e.g. `19.0.0-rc.0`. This is purely
      // for signaling purposes — aside from the version, it's no different from
      // the corresponding canary.
      shell.cp('-r', buildDir + '/node_modules', buildDir + '/oss-stable-rc');
    }

    const defaultVersionIfNotFound = '0.0.0' + '-' + sha + '-' + dateString;
    const versionsMap = new Map();
    for (const moduleName in stablePackages) {
      const version = stablePackages[moduleName];
      versionsMap.set(
        moduleName,
        version + '-' + canaryChannelLabel + '-' + sha + '-' + dateString,
        defaultVersionIfNotFound
      );
    }
    updatePackageVersions(
      buildDir + '/node_modules',
      versionsMap,
      defaultVersionIfNotFound,
      true
    );
    fs.renameSync(buildDir + '/node_modules', buildDir + '/oss-stable');
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/oss-stable',
      ReactVersion + '-' + canaryChannelLabel + '-' + sha + '-' + dateString
    );

    if (canaryChannelLabel === 'rc') {
      const rcVersionsMap = new Map();
      for (const moduleName in stablePackages) {
        const version = stablePackages[moduleName];
        rcVersionsMap.set(moduleName, version + `-rc.${rcNumber}`);
      }
      updatePackageVersions(
        buildDir + '/oss-stable-rc',
        rcVersionsMap,
        defaultVersionIfNotFound,
        // For RCs, we pin to exact versions, like we do for canaries.
        true
      );
      updatePlaceholderReactVersionInCompiledArtifacts(
        buildDir + '/oss-stable-rc',
        ReactVersion
      );
    }

    const rnVersionString =
      ReactVersion + '-native-fb-' + sha + '-' + dateString;
    if (fs.existsSync(buildDir + '/facebook-react-native')) {
      updatePlaceholderReactVersionInCompiledArtifacts(
        buildDir + '/facebook-react-native',
        rnVersionString
      );
    }

    if (fs.existsSync(buildDir + '/react-native')) {
      updatePlaceholderReactVersionInCompiledArtifacts(
        buildDir + '/react-native',
        rnVersionString,
        filename => filename.endsWith('.fb.js')
      );

      updatePlaceholderReactVersionInCompiledArtifacts(
        buildDir + '/react-native',
        ReactVersion,
        filename => !filename.endsWith('.fb.js') && filename.endsWith('.js')
      );
    }

    // Now do the semver ones
    const semverVersionsMap = new Map();
    for (const moduleName in stablePackages) {
      const version = stablePackages[moduleName];
      semverVersionsMap.set(moduleName, version);
    }
    updatePackageVersions(
      buildDir + '/oss-stable-semver',
      semverVersionsMap,
      defaultVersionIfNotFound,
      // Use ^ only for non-prerelease versions
      false
    );
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/oss-stable-semver',
      ReactVersion
    );
  }

  if (fs.existsSync(buildDir + '/facebook-www')) {
    for (const fileName of fs.readdirSync(buildDir + '/facebook-www')) {
      const filePath = buildDir + '/facebook-www/' + fileName;
      const stats = fs.statSync(filePath);
      if (!stats.isDirectory()) {
        fs.renameSync(filePath, filePath.replace('.js', '.classic.js'));
      }
    }
    const versionString =
      ReactVersion + '-www-classic-' + sha + '-' + dateString;
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/facebook-www',
      versionString
    );
    // Also save a file with the version number
    fs.writeFileSync(buildDir + '/facebook-www/VERSION_CLASSIC', versionString);
  }

  if (fs.existsSync(buildDir + '/sizes')) {
    fs.renameSync(buildDir + '/sizes', buildDir + '/sizes-stable');
  }
}

function processExperimental(buildDir, version) {
  if (fs.existsSync(buildDir + '/node_modules')) {
    const defaultVersionIfNotFound =
      '0.0.0' + '-experimental-' + sha + '-' + dateString;
    const versionsMap = new Map();
    for (const moduleName in stablePackages) {
      versionsMap.set(moduleName, defaultVersionIfNotFound);
    }
    for (const moduleName of experimentalPackages) {
      versionsMap.set(moduleName, defaultVersionIfNotFound);
    }
    updatePackageVersions(
      buildDir + '/node_modules',
      versionsMap,
      defaultVersionIfNotFound,
      true
    );
    fs.renameSync(buildDir + '/node_modules', buildDir + '/oss-experimental');
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/oss-experimental',
      // TODO: The npm version for experimental releases does not include the
      // React version, but the runtime version does so that DevTools can do
      // feature detection. Decide what to do about this later.
      ReactVersion + '-experimental-' + sha + '-' + dateString
    );
  }

  if (fs.existsSync(buildDir + '/facebook-www')) {
    for (const fileName of fs.readdirSync(buildDir + '/facebook-www')) {
      const filePath = buildDir + '/facebook-www/' + fileName;
      const stats = fs.statSync(filePath);
      if (!stats.isDirectory()) {
        fs.renameSync(filePath, filePath.replace('.js', '.modern.js'));
      }
    }
    const versionString =
      ReactVersion + '-www-modern-' + sha + '-' + dateString;
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/facebook-www',
      versionString
    );

    // Also save a file with the version number
    fs.writeFileSync(buildDir + '/facebook-www/VERSION_MODERN', versionString);
  }

  const rnVersionString = ReactVersion + '-native-fb-' + sha + '-' + dateString;
  if (fs.existsSync(buildDir + '/facebook-react-native')) {
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/facebook-react-native',
      rnVersionString
    );

    // Also save a file with the version number
    fs.writeFileSync(
      buildDir + '/facebook-react-native/VERSION_NATIVE_FB',
      rnVersionString
    );
  }

  if (fs.existsSync(buildDir + '/react-native')) {
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/react-native',
      rnVersionString,
      filename => filename.endsWith('.fb.js')
    );

    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/react-native',
      ReactVersion,
      filename => !filename.endsWith('.fb.js') && filename.endsWith('.js')
    );
  }

  if (fs.existsSync(buildDir + '/sizes')) {
    fs.renameSync(buildDir + '/sizes', buildDir + '/sizes-experimental');
  }
  if (fs.existsSync(buildDir + '/bundle-sizes.json')) {
    fs.renameSync(
      buildDir + '/bundle-sizes.json',
      buildDir + '/bundle-sizes-experimental.json'
    );
  }

  // Delete all other artifacts that weren't handled above. We assume they are
  // duplicates of the corresponding artifacts in the stable channel. Ideally,
  // the underlying build script should not have produced these files in the
  // first place.
  for (const pathName of fs.readdirSync(buildDir)) {
    if (
      pathName !== 'oss-experimental' &&
      pathName !== 'facebook-www' &&
      pathName !== 'sizes-experimental'
    ) {
      fs.rmSync(path.join(buildDir, pathName), {
        recursive: true,
        force: true,
      });
    }
  }
}

function crossDeviceRenameSync(source, destination) {
  return fse.moveSync(source, destination, {overwrite: true});
}

/*
 * Grabs the built packages in ${tmp_build_dir}/node_modules and updates the
 * `version` key in their package.json to 0.0.0-${date}-${commitHash} for the commit
 * you're building. Also updates the dependencies and peerDependencies
 * to match this version for all of the 'React' packages
 * (packages available in this repo).
 */
function updatePackageVersions(
  modulesDir,
  versionsMap,
  defaultVersionIfNotFound,
  pinToExactVersion
) {
  for (const moduleName of fs.readdirSync(modulesDir)) {
    let version = versionsMap.get(moduleName);
    if (version === undefined) {
      // TODO: If the module is not in the version map, we should exclude it
      // from the build artifacts.
      version = defaultVersionIfNotFound;
    }
    const packageJSONPath = path.join(modulesDir, moduleName, 'package.json');
    const stats = fs.statSync(packageJSONPath);
    if (stats.isFile()) {
      const packageInfo = JSON.parse(fs.readFileSync(packageJSONPath));

      // Update version
      packageInfo.version = version;

      if (packageInfo.dependencies) {
        for (const dep of Object.keys(packageInfo.dependencies)) {
          const depVersion = versionsMap.get(dep);
          if (depVersion !== undefined) {
            packageInfo.dependencies[dep] = pinToExactVersion
              ? depVersion
              : '^' + depVersion;
          }
        }
      }
      if (packageInfo.peerDependencies) {
        if (
          !pinToExactVersion &&
          (moduleName === 'use-sync-external-store' ||
            moduleName === 'use-subscription')
        ) {
          // use-sync-external-store supports older versions of React, too, so
          // we don't override to the latest version. We should figure out some
          // better way to handle this.
          // TODO: Remove this special case.
        } else {
          for (const dep of Object.keys(packageInfo.peerDependencies)) {
            const depVersion = versionsMap.get(dep);
            if (depVersion !== undefined) {
              packageInfo.peerDependencies[dep] = pinToExactVersion
                ? depVersion
                : '^' + depVersion;
            }
          }
        }
      }

      // Write out updated package.json
      fs.writeFileSync(packageJSONPath, JSON.stringify(packageInfo, null, 2));
    }
  }
}

function updatePlaceholderReactVersionInCompiledArtifacts(
  artifactsDirectory,
  newVersion,
  filteringClosure
) {
  // Update the version of React in the compiled artifacts by searching for
  // the placeholder string and replacing it with a new one.
  if (filteringClosure == null) {
    filteringClosure = filename => filename.endsWith('.js');
  }

  const artifactFilenames = String(
    spawnSync('grep', [
      '-lr',
      PLACEHOLDER_REACT_VERSION,
      '--',
      artifactsDirectory,
    ]).stdout
  )
    .trim()
    .split('\n')
    .filter(filteringClosure);

  for (const artifactFilename of artifactFilenames) {
    const originalText = fs.readFileSync(artifactFilename, 'utf8');
    const replacedText = originalText.replaceAll(
      PLACEHOLDER_REACT_VERSION,
      newVersion
    );
    fs.writeFileSync(artifactFilename, replacedText);
  }
}

/**
 * cross-platform alternative to `rsync -ar`
 * @param {string} source
 * @param {string} destination
 */
function mergeDirsSync(source, destination) {
  for (const sourceFileBaseName of fs.readdirSync(source)) {
    const sourceFileName = path.join(source, sourceFileBaseName);
    const targetFileName = path.join(destination, sourceFileBaseName);

    const sourceFile = fs.statSync(sourceFileName);
    if (sourceFile.isDirectory()) {
      fse.ensureDirSync(targetFileName);
      mergeDirsSync(sourceFileName, targetFileName);
    } else {
      fs.copyFileSync(sourceFileName, targetFileName);
    }
  }
}

main();
