'use strict';

const {
  existsSync,
  readdirSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
} = require('fs');
const Bundles = require('./bundles');
const {
  asyncCopyTo,
  asyncExecuteCommand,
  asyncExtractTar,
  asyncRimRaf,
} = require('./utils');

const {
  NODE_ES2015,
  ESM_DEV,
  ESM_PROD,
  NODE_DEV,
  NODE_PROD,
  NODE_PROFILING,
  BUN_DEV,
  BUN_PROD,
  FB_WWW_DEV,
  FB_WWW_PROD,
  FB_WWW_PROFILING,
  RN_OSS_DEV,
  RN_OSS_PROD,
  RN_OSS_PROFILING,
  RN_FB_DEV,
  RN_FB_PROD,
  RN_FB_PROFILING,
  BROWSER_SCRIPT,
  CJS_DTS,
  ESM_DTS,
} = Bundles.bundleTypes;

function getPackageName(name) {
  if (name.indexOf('/') !== -1) {
    return name.split('/')[0];
  }
  return name;
}

function getBundleOutputPath(bundle, bundleType, filename, packageName) {
  switch (bundleType) {
    case NODE_ES2015:
      return `build/node_modules/${packageName}/cjs/${filename}`;
    case ESM_DEV:
    case ESM_PROD:
    case ESM_DTS:
      return `build/node_modules/${packageName}/esm/${filename}`;
    case BUN_DEV:
    case BUN_PROD:
      return `build/node_modules/${packageName}/cjs/${filename}`;
    case NODE_DEV:
    case NODE_PROD:
    case NODE_PROFILING:
    case CJS_DTS:
      return `build/node_modules/${packageName}/cjs/${filename}`;
    case FB_WWW_DEV:
    case FB_WWW_PROD:
    case FB_WWW_PROFILING:
      return `build/facebook-www/${filename}`;
    case RN_OSS_DEV:
    case RN_OSS_PROD:
    case RN_OSS_PROFILING:
      switch (packageName) {
        case 'react-native-renderer':
          return `build/react-native/implementations/${filename}`;
        default:
          throw new Error('Unknown RN package.');
      }
    case RN_FB_DEV:
    case RN_FB_PROD:
    case RN_FB_PROFILING:
      switch (packageName) {
        case 'scheduler':
        case 'react':
        case 'react-dom':
        case 'react-is':
        case 'react-test-renderer':
          return `build/facebook-react-native/${packageName}/cjs/${filename}`;
        case 'react-native-renderer':
          return `build/react-native/implementations/${filename.replace(
            /\.js$/,
            '.fb.js'
          )}`;
        default:
          throw new Error('Unknown RN package.');
      }
    case BROWSER_SCRIPT: {
      // Bundles that are served as browser scripts need to be able to be sent
      // straight to the browser with any additional bundling. We shouldn't use
      // a module to re-export. Depending on how they are served, they also may
      // not go through package.json module resolution, so we shouldn't rely on
      // that either. We should consider the output path as part of the public
      // contract, and explicitly specify its location within the package's
      // directory structure.
      const outputPath = bundle.outputPath;
      if (!outputPath) {
        throw new Error(
          'Bundles with type BROWSER_SCRIPT must specific an explicit ' +
            'output path.'
        );
      }
      return `build/node_modules/${packageName}/${outputPath}`;
    }
    default:
      throw new Error('Unknown bundle type.');
  }
}

async function copyWWWShims() {
  await asyncCopyTo(
    `${__dirname}/shims/facebook-www`,
    'build/facebook-www/shims'
  );
}

async function copyRNShims() {
  await asyncCopyTo(
    `${__dirname}/shims/react-native`,
    'build/react-native/shims'
  );
  await asyncCopyTo(
    require.resolve('react-native-renderer/src/ReactNativeTypes.js'),
    'build/react-native/shims/ReactNativeTypes.js'
  );
}

async function copyAllShims() {
  await Promise.all([copyWWWShims(), copyRNShims()]);
}

function getTarOptions(tgzName, packageName) {
  // Files inside the `npm pack`ed archive start
  // with "package/" in their paths. We'll undo
  // this during extraction.
  const CONTENTS_FOLDER = 'package';
  return {
    src: tgzName,
    dest: `build/node_modules/${packageName}`,
    tar: {
      entries: [CONTENTS_FOLDER],
      map(header) {
        if (header.name.indexOf(CONTENTS_FOLDER + '/') === 0) {
          header.name = header.name.slice(CONTENTS_FOLDER.length + 1);
        }
      },
    },
  };
}

let entryPointsToHasBundle = new Map();
// eslint-disable-next-line no-for-of-loops/no-for-of-loops
for (const bundle of Bundles.bundles) {
  let hasBundle = entryPointsToHasBundle.get(bundle.entry);
  if (!hasBundle) {
    const hasNonFBBundleTypes = bundle.bundleTypes.some(
      type =>
        type !== FB_WWW_DEV && type !== FB_WWW_PROD && type !== FB_WWW_PROFILING
    );
    entryPointsToHasBundle.set(bundle.entry, hasNonFBBundleTypes);
  }
}

function filterOutEntrypoints(name) {
  // Remove entry point files that are not built in this configuration.
  let jsonPath = `build/node_modules/${name}/package.json`;
  let packageJSON = JSON.parse(readFileSync(jsonPath));
  let files = packageJSON.files;
  let exportsJSON = packageJSON.exports;
  let browserJSON = packageJSON.browser;
  if (!Array.isArray(files)) {
    throw new Error('expected all package.json files to contain a files field');
  }
  let changed = false;
  for (let i = 0; i < files.length; i++) {
    let filename = files[i];
    let entry =
      filename === 'index.js'
        ? name
        : name + '/' + filename.replace(/\.js$/, '');
    let hasBundle = entryPointsToHasBundle.get(entry);
    if (hasBundle === undefined) {
      // This entry doesn't exist in the bundles. Check if something similar exists.
      hasBundle =
        entryPointsToHasBundle.get(entry + '.node') ||
        entryPointsToHasBundle.get(entry + '.browser');

      // The .react-server and .rsc suffixes may not have a bundle representation but
      // should infer their bundle status from the non-suffixed entry point.
      if (entry.endsWith('.react-server')) {
        hasBundle = entryPointsToHasBundle.get(
          entry.slice(0, '.react-server'.length * -1)
        );
      } else if (entry.endsWith('.rsc')) {
        hasBundle = entryPointsToHasBundle.get(
          entry.slice(0, '.rsc'.length * -1)
        );
      }
    }
    if (hasBundle === undefined) {
      // This doesn't exist in the bundles. It's an extra file.
    } else if (hasBundle === true) {
      // This is built in this release channel.
    } else {
      // This doesn't have any bundleTypes in this release channel.
      // Let's remove it.
      files.splice(i, 1);
      i--;
      try {
        unlinkSync(`build/node_modules/${name}/${filename}`);
      } catch (err) {
        // If the file doesn't exist we can just move on. Otherwise throw the halt the build
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
      changed = true;
      // Remove it from the exports field too if it exists.
      if (exportsJSON) {
        if (filename === 'index.js') {
          delete exportsJSON['.'];
        } else {
          delete exportsJSON['./' + filename.replace(/\.js$/, '')];
        }
      }
      if (browserJSON) {
        delete browserJSON['./' + filename];
      }
    }

    // We only export the source directory so Jest and Rollup can access them
    // during local development and at build time. The files don't exist in the
    // public builds, so we don't need the export entry, either.
    const sourceWildcardExport = './src/*';
    if (exportsJSON && exportsJSON[sourceWildcardExport]) {
      delete exportsJSON[sourceWildcardExport];
      changed = true;
    }
  }
  if (changed) {
    let newJSON = JSON.stringify(packageJSON, null, '  ');
    writeFileSync(jsonPath, newJSON);
  }
}

async function prepareNpmPackage(name) {
  await Promise.all([
    asyncCopyTo('LICENSE', `build/node_modules/${name}/LICENSE`),
    asyncCopyTo(
      `packages/${name}/package.json`,
      `build/node_modules/${name}/package.json`
    ),
    asyncCopyTo(
      `packages/${name}/README.md`,
      `build/node_modules/${name}/README.md`
    ),
    asyncCopyTo(`packages/${name}/npm`, `build/node_modules/${name}`),
  ]);
  filterOutEntrypoints(name);
  const tgzName = (
    await asyncExecuteCommand(`npm pack build/node_modules/${name}`)
  ).trim();
  await asyncRimRaf(`build/node_modules/${name}`);
  await asyncExtractTar(getTarOptions(tgzName, name));
  unlinkSync(tgzName);
}

async function prepareNpmPackages() {
  if (!existsSync('build/node_modules')) {
    // We didn't build any npm packages.
    return;
  }
  const builtPackageFolders = readdirSync('build/node_modules').filter(
    dir => dir.charAt(0) !== '.'
  );
  await Promise.all(builtPackageFolders.map(prepareNpmPackage));
}

module.exports = {
  copyAllShims,
  getPackageName,
  getBundleOutputPath,
  prepareNpmPackages,
};
