'use strict';

const rollup = require('rollup');
const babel = require('@rollup/plugin-babel').babel;
const closure = require('./plugins/closure-plugin');
const flowRemoveTypes = require('flow-remove-types');
const {dts} = require('rollup-plugin-dts');
const prettier = require('rollup-plugin-prettier');
const replace = require('@rollup/plugin-replace');
const typescript = require('@rollup/plugin-typescript');
const stripBanner = require('rollup-plugin-strip-banner');
const chalk = require('chalk');
const resolve = require('@rollup/plugin-node-resolve').nodeResolve;
const fs = require('fs');
const childProcess = require('child_process');
const argv = require('minimist')(process.argv.slice(2));
const Modules = require('./modules');
const Bundles = require('./bundles');
const Stats = require('./stats');
const Sync = require('./sync');
const sizes = require('./plugins/sizes-plugin');
const useForks = require('./plugins/use-forks-plugin');
const dynamicImports = require('./plugins/dynamic-imports');
const externalRuntime = require('./plugins/external-runtime-plugin');
const Packaging = require('./packaging');
const {asyncRimRaf} = require('./utils');
const codeFrame = require('@babel/code-frame').default;
const Wrappers = require('./wrappers');
const commonjs = require('@rollup/plugin-commonjs');

const RELEASE_CHANNEL = process.env.RELEASE_CHANNEL;

// Default to building in experimental mode. If the release channel is set via
// an environment variable, then check if it's "experimental".
const __EXPERIMENTAL__ =
  typeof RELEASE_CHANNEL === 'string'
    ? RELEASE_CHANNEL === 'experimental'
    : true;

// Errors in promises should be fatal.
let loggedErrors = new Set();
process.on('unhandledRejection', err => {
  if (loggedErrors.has(err)) {
    // No need to print it twice.
    process.exit(1);
  }
  throw err;
});

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

const {getFilename} = Bundles;

function parseRequestedNames(names, toCase) {
  let result = [];
  for (let i = 0; i < names.length; i++) {
    let splitNames = names[i].split(',');
    for (let j = 0; j < splitNames.length; j++) {
      let name = splitNames[j].trim();
      if (!name) {
        continue;
      }
      if (toCase === 'uppercase') {
        name = name.toUpperCase();
      } else if (toCase === 'lowercase') {
        name = name.toLowerCase();
      }
      result.push(name);
    }
  }
  return result;
}
const argvType = Array.isArray(argv.type) ? argv.type : [argv.type];
const requestedBundleTypes = parseRequestedNames(
  argv.type ? argvType : [],
  'uppercase'
);

const names = argv._;
const requestedBundleNames = parseRequestedNames(
  names ? names : [],
  'lowercase'
);
const forcePrettyOutput = argv.pretty;
const isWatchMode = argv.watch;
const syncFBSourcePath = argv['sync-fbsource'];
const syncWWWPath = argv['sync-www'];

// Non-ES2015 stuff applied before closure compiler.
const babelPlugins = [
  // These plugins filter out non-ES2015.
  ['@babel/plugin-proposal-class-properties', {loose: true}],
  'syntax-trailing-function-commas',
  // These use loose mode which avoids embedding a runtime.
  // TODO: Remove object spread from the source. Prefer Object.assign instead.
  [
    '@babel/plugin-proposal-object-rest-spread',
    {loose: true, useBuiltIns: true},
  ],
  ['@babel/plugin-transform-template-literals', {loose: true}],
  // TODO: Remove for...of from the source. It requires a runtime to be embedded.
  '@babel/plugin-transform-for-of',
  // TODO: Remove array spread from the source. Prefer .apply instead.
  ['@babel/plugin-transform-spread', {loose: true, useBuiltIns: true}],
  '@babel/plugin-transform-parameters',
  // TODO: Remove array destructuring from the source. Requires runtime.
  ['@babel/plugin-transform-destructuring', {loose: true, useBuiltIns: true}],
  // Transform Object spread to shared/assign
  require('../babel/transform-object-assign'),
];

const babelToES5Plugins = [
  // These plugins transform DEV mode. Closure compiler deals with these in PROD.
  '@babel/plugin-transform-literals',
  '@babel/plugin-transform-arrow-functions',
  '@babel/plugin-transform-block-scoped-functions',
  '@babel/plugin-transform-shorthand-properties',
  ['@babel/plugin-transform-block-scoping', {throwIfClosureRequired: true}],
];

function getBabelConfig(
  updateBabelOptions,
  bundleType,
  packageName,
  isDevelopment,
  bundle
) {
  let options = {
    exclude: '/**/node_modules/**',
    babelrc: false,
    configFile: false,
    presets: [],
    plugins: [...babelPlugins],
    babelHelpers: 'bundled',
    sourcemap: false,
  };
  if (isDevelopment) {
    options.plugins.push(...babelToES5Plugins);
  }
  if (updateBabelOptions) {
    options = updateBabelOptions(options);
  }
  // Controls whether to replace error messages with error codes in production.
  // By default, error messages are replaced in production.
  if (!isDevelopment && bundle.minifyWithProdErrorCodes !== false) {
    options.plugins.push(require('../error-codes/transform-error-messages'));
  }

  return options;
}

let getRollupInteropValue = id => {
  // We're setting Rollup to assume that imports are ES modules unless otherwise specified.
  // However, we also compile ES import syntax to `require()` using Babel.
  // This causes Rollup to turn uses of `import SomeDefaultImport from 'some-module' into
  // references to `SomeDefaultImport.default` due to CJS/ESM interop.
  // Some CJS modules don't have a `.default` export, and the rewritten import is incorrect.
  // Specifying `interop: 'default'` instead will have Rollup use the imported variable as-is,
  // without adding a `.default` to the reference.
  const modulesWithCommonJsExports = [
    'art/core/transform',
    'art/modes/current',
    'art/modes/fast-noSideEffects',
    'art/modes/svg',
    'JSResourceReferenceImpl',
    'error-stack-parser',
    'lru-cache',
    'neo-async',
    'webpack/lib/dependencies/ModuleDependency',
    'webpack/lib/dependencies/NullDependency',
    'webpack/lib/Template',
  ];

  if (modulesWithCommonJsExports.includes(id)) {
    return 'default';
  }

  // For all other modules, handle imports without any import helper utils
  return 'esModule';
};

function getRollupOutputOptions(
  outputPath,
  format,
  globals,
  globalName,
  bundleType
) {
  const isProduction = isProductionBundleType(bundleType);

  return {
    file: outputPath,
    format,
    globals,
    freeze: !isProduction,
    interop: getRollupInteropValue,
    name: globalName,
    sourcemap: false,
    esModule: false,
    exports: 'auto',
  };
}

function getFormat(bundleType) {
  switch (bundleType) {
    case NODE_ES2015:
    case NODE_DEV:
    case NODE_PROD:
    case NODE_PROFILING:
    case BUN_DEV:
    case BUN_PROD:
    case FB_WWW_DEV:
    case FB_WWW_PROD:
    case FB_WWW_PROFILING:
    case RN_OSS_DEV:
    case RN_OSS_PROD:
    case RN_OSS_PROFILING:
    case RN_FB_DEV:
    case RN_FB_PROD:
    case RN_FB_PROFILING:
    case CJS_DTS:
      return `cjs`;
    case ESM_DEV:
    case ESM_PROD:
    case ESM_DTS:
      return `es`;
    case BROWSER_SCRIPT:
      return `iife`;
  }
}

function isProductionBundleType(bundleType) {
  switch (bundleType) {
    case NODE_ES2015:
      return true;
    case ESM_DEV:
    case NODE_DEV:
    case BUN_DEV:
    case FB_WWW_DEV:
    case RN_OSS_DEV:
    case RN_FB_DEV:
      return false;
    case ESM_PROD:
    case NODE_PROD:
    case BUN_PROD:
    case NODE_PROFILING:
    case FB_WWW_PROD:
    case FB_WWW_PROFILING:
    case RN_OSS_PROD:
    case RN_OSS_PROFILING:
    case RN_FB_PROD:
    case RN_FB_PROFILING:
    case BROWSER_SCRIPT:
    case CJS_DTS:
    case ESM_DTS:
      return true;
    default:
      throw new Error(`Unknown type: ${bundleType}`);
  }
}

function isProfilingBundleType(bundleType) {
  switch (bundleType) {
    case NODE_ES2015:
    case FB_WWW_DEV:
    case FB_WWW_PROD:
    case NODE_DEV:
    case NODE_PROD:
    case BUN_DEV:
    case BUN_PROD:
    case RN_FB_DEV:
    case RN_FB_PROD:
    case RN_OSS_DEV:
    case RN_OSS_PROD:
    case ESM_DEV:
    case ESM_PROD:
    case BROWSER_SCRIPT:
    case CJS_DTS:
    case ESM_DTS:
      return false;
    case FB_WWW_PROFILING:
    case NODE_PROFILING:
    case RN_FB_PROFILING:
    case RN_OSS_PROFILING:
      return true;
    default:
      throw new Error(`Unknown type: ${bundleType}`);
  }
}

function getBundleTypeFlags(bundleType) {
  const isFBWWWBundle =
    bundleType === FB_WWW_DEV ||
    bundleType === FB_WWW_PROD ||
    bundleType === FB_WWW_PROFILING;
  const isRNBundle =
    bundleType === RN_OSS_DEV ||
    bundleType === RN_OSS_PROD ||
    bundleType === RN_OSS_PROFILING ||
    bundleType === RN_FB_DEV ||
    bundleType === RN_FB_PROD ||
    bundleType === RN_FB_PROFILING;

  const isFBRNBundle =
    bundleType === RN_FB_DEV ||
    bundleType === RN_FB_PROD ||
    bundleType === RN_FB_PROFILING;

  const shouldStayReadable = isFBWWWBundle || isRNBundle || forcePrettyOutput;

  return {
    isFBWWWBundle,
    isRNBundle,
    isFBRNBundle,
    shouldStayReadable,
  };
}

function forbidFBJSImports() {
  return {
    name: 'forbidFBJSImports',
    resolveId(importee, importer) {
      if (/^fbjs\//.test(importee)) {
        throw new Error(
          `Don't import ${importee} (found in ${importer}). ` +
            `Use the utilities in packages/shared/ instead.`
        );
      }
    },
  };
}

function getPlugins(
  entry,
  updateBabelOptions,
  filename,
  packageName,
  bundleType,
  globalName,
  moduleType,
  pureExternalModules,
  bundle
) {
  // Short-circuit if we're only building a .d.ts bundle
  if (bundleType === CJS_DTS || bundleType === ESM_DTS) {
    return [dts({tsconfig: bundle.tsconfig})];
  }
  try {
    const forks = Modules.getForks(bundleType, entry, moduleType, bundle);
    const isProduction = isProductionBundleType(bundleType);
    const isProfiling = isProfilingBundleType(bundleType);

    const needsMinifiedByClosure =
      bundle.skipClosureCompiler !== true &&
      bundleType !== ESM_PROD &&
      bundleType !== ESM_DEV &&
      // TODO(@poteto) figure out ICE in closure compiler for eslint-plugin-react-hooks (ts)
      bundle.tsconfig == null;

    return [
      // Keep dynamic imports as externals
      dynamicImports(),
      bundle.tsconfig != null ? typescript({tsconfig: bundle.tsconfig}) : false,
      {
        name: 'rollup-plugin-flow-remove-types',
        transform(code, id) {
          if (bundle.tsconfig != null && !id.endsWith('.js')) {
            return null;
          }
          const transformed = flowRemoveTypes(code);
          return {
            code: transformed.toString(),
            map: null,
          };
        },
      },
      // See https://github.com/rollup/plugins/issues/1425
      bundle.tsconfig != null ? commonjs({strictRequires: true}) : false,
      // Shim any modules that need forking in this environment.
      useForks(forks),
      // Ensure we don't try to bundle any fbjs modules.
      forbidFBJSImports(),
      // Use Node resolution mechanism.
      resolve({
        // `external` rollup config takes care of marking builtins as externals
        preferBuiltins: false,
      }),
      // Remove license headers from individual modules
      stripBanner({
        exclude: 'node_modules/**/*',
      }),
      // Compile to ES2015.
      babel(
        getBabelConfig(
          updateBabelOptions,
          bundleType,
          packageName,
          !isProduction,
          bundle
        )
      ),
      // Remove 'use strict' from individual source files. We skip eslint-plugin-react-hooks because
      // it bundles compiler-type code that may examine "use strict" used outside of a directive
      // context, e.g. as a StringLiteral.
      bundle.name !== 'eslint-plugin-react-hooks'
        ? {
            name: "remove 'use strict'",
            transform(source) {
              return source.replace(/['"]use strict["']/g, '');
            },
          }
        : false,
      // Turn __DEV__ and process.env checks into constants.
      replace({
        preventAssignment: true,
        values: {
          __DEV__: isProduction ? 'false' : 'true',
          __PROFILE__: isProfiling || !isProduction ? 'true' : 'false',
          'process.env.NODE_ENV': isProduction
            ? "'production'"
            : "'development'",
          __EXPERIMENTAL__,
        },
      }),
      // For the external runtime we turn global identifiers into local.
      entry.includes('server-external-runtime') && externalRuntime(),
      {
        name: 'top-level-definitions',
        renderChunk(source) {
          return Wrappers.wrapWithTopLevelDefinitions(
            source,
            bundleType,
            globalName,
            filename,
            moduleType,
            bundle.wrapWithModuleBoundaries,
            bundle.wrapWithNodeDevGuard
          );
        },
      },
      // For production builds, compile with Closure. We do this even for the
      // "non-minified" production builds because Closure is much better at
      // minification than what most applications use. During this step, we do
      // preserve the original symbol names, though, so the resulting code is
      // relatively readable.
      //
      // For the minified builds, the names will be mangled later.
      //
      // We don't bother with sourcemaps at this step. The sourcemaps we publish
      // are only for whitespace and symbol renaming; they don't map back to
      // before Closure was applied.
      needsMinifiedByClosure &&
        closure({
          compilation_level: 'SIMPLE',
          language_in: 'ECMASCRIPT_2020',
          language_out:
            bundleType === NODE_ES2015
              ? 'ECMASCRIPT_2020'
              : bundleType === BROWSER_SCRIPT
                ? 'ECMASCRIPT5'
                : 'ECMASCRIPT5_STRICT',
          emit_use_strict:
            bundleType !== BROWSER_SCRIPT &&
            bundleType !== ESM_PROD &&
            bundleType !== ESM_DEV,
          env: 'CUSTOM',
          warning_level: 'QUIET',
          source_map_include_content: true,
          use_types_for_optimization: false,
          process_common_js_modules: false,
          rewrite_polyfills: false,
          inject_libraries: false,
          allow_dynamic_import: true,

          // Don't let it create global variables in the browser.
          // https://github.com/facebook/react/issues/10909
          assume_function_wrapper: true,

          // Don't rename symbols (variable names, functions, etc). We leave
          // this up to the application to handle, if they want. Otherwise gzip
          // takes care of it.
          renaming: false,
        }),
      needsMinifiedByClosure &&
        // Add the whitespace back
        prettier({
          parser: 'flow',
          singleQuote: false,
          trailingComma: 'none',
          bracketSpacing: true,
        }),
      {
        name: 'license-and-signature-header',
        renderChunk(source) {
          return Wrappers.wrapWithLicenseHeader(
            source,
            bundleType,
            globalName,
            filename,
            moduleType
          );
        },
      },
      // Record bundle size.
      sizes({
        getSize: (size, gzip) => {
          const currentSizes = Stats.currentBuildResults.bundleSizes;
          const recordIndex = currentSizes.findIndex(
            record =>
              record.filename === filename && record.bundleType === bundleType
          );
          const index = recordIndex !== -1 ? recordIndex : currentSizes.length;
          currentSizes[index] = {
            filename,
            bundleType,
            packageName,
            size,
            gzip,
          };
        },
      }),
    ].filter(Boolean);
  } catch (error) {
    console.error(
      chalk.red(`There was an error preparing plugins for entry "${entry}"`)
    );
    throw error;
  }
}

function shouldSkipBundle(bundle, bundleType) {
  const shouldSkipBundleType = bundle.bundleTypes.indexOf(bundleType) === -1;
  if (shouldSkipBundleType) {
    return true;
  }
  if (requestedBundleTypes.length > 0) {
    const hasRequestedBundleType = requestedBundleTypes.some(requestedType =>
      bundleType.includes(requestedType)
    );
    if (!hasRequestedBundleType) {
      return true;
    }
  }
  if (requestedBundleNames.length > 0) {
    // If the name ends with `something/index` we only match if the
    // entry ends in something. Such as `react-dom/index` only matches
    // `react-dom` but not `react-dom/server`. Everything else is fuzzy
    // search.
    const entryLowerCase = bundle.entry.toLowerCase() + '/index.js';
    const isAskingForDifferentNames = requestedBundleNames.every(
      requestedName => {
        const matchEntry = entryLowerCase.indexOf(requestedName) !== -1;
        if (!bundle.name) {
          return !matchEntry;
        }
        const matchName =
          bundle.name.toLowerCase().indexOf(requestedName) !== -1;
        return !matchEntry && !matchName;
      }
    );
    if (isAskingForDifferentNames) {
      return true;
    }
  }
  return false;
}

function resolveEntryFork(resolvedEntry, isFBBundle, isDev) {
  // Pick which entry point fork to use:
  // .modern.fb.js
  // .classic.fb.js
  // .fb.js
  // .stable.js
  // .experimental.js
  // .js
  // or any of those plus .development.js

  if (isFBBundle) {
    const resolvedFBEntry = resolvedEntry.replace(
      '.js',
      __EXPERIMENTAL__ ? '.modern.fb.js' : '.classic.fb.js'
    );
    const devFBEntry = resolvedFBEntry.replace('.js', '.development.js');
    if (isDev && fs.existsSync(devFBEntry)) {
      return devFBEntry;
    }
    if (fs.existsSync(resolvedFBEntry)) {
      return resolvedFBEntry;
    }
    const resolvedGenericFBEntry = resolvedEntry.replace('.js', '.fb.js');
    const devGenericFBEntry = resolvedGenericFBEntry.replace(
      '.js',
      '.development.js'
    );
    if (isDev && fs.existsSync(devGenericFBEntry)) {
      return devGenericFBEntry;
    }
    if (fs.existsSync(resolvedGenericFBEntry)) {
      return resolvedGenericFBEntry;
    }
    // Even if it's a FB bundle we fallthrough to pick stable or experimental if we don't have an FB fork.
  }
  const resolvedForkedEntry = resolvedEntry.replace(
    '.js',
    __EXPERIMENTAL__ ? '.experimental.js' : '.stable.js'
  );
  const devForkedEntry = resolvedForkedEntry.replace('.js', '.development.js');
  if (isDev && fs.existsSync(devForkedEntry)) {
    return devForkedEntry;
  }
  if (fs.existsSync(resolvedForkedEntry)) {
    return resolvedForkedEntry;
  }
  // Just use the plain .js one.
  return resolvedEntry;
}

async function createBundle(bundle, bundleType) {
  const filename = getFilename(bundle, bundleType);
  const logKey =
    chalk.white.bold(filename) + chalk.dim(` (${bundleType.toLowerCase()})`);
  const format = getFormat(bundleType);
  const packageName = Packaging.getPackageName(bundle.entry);

  const {isFBWWWBundle, isFBRNBundle} = getBundleTypeFlags(bundleType);

  const resolvedEntry = resolveEntryFork(
    require.resolve(bundle.entry),
    isFBWWWBundle || isFBRNBundle,
    !isProductionBundleType(bundleType)
  );

  const peerGlobals = Modules.getPeerGlobals(bundle.externals, bundleType);
  let externals = Object.keys(peerGlobals);

  const deps = Modules.getDependencies(bundleType, bundle.entry);
  externals = externals.concat(deps);

  const importSideEffects = Modules.getImportSideEffects();
  const pureExternalModules = Object.keys(importSideEffects).filter(
    module => !importSideEffects[module]
  );

  const rollupConfig = {
    input: resolvedEntry,
    treeshake: {
      moduleSideEffects: (id, external) =>
        !(external && pureExternalModules.includes(id)),
      propertyReadSideEffects: false,
    },
    external(id) {
      const containsThisModule = pkg => id === pkg || id.startsWith(pkg + '/');
      const isProvidedByDependency = externals.some(containsThisModule);
      if (isProvidedByDependency) {
        if (id.indexOf('/src/') !== -1) {
          throw Error(
            'You are trying to import ' +
              id +
              ' but ' +
              externals.find(containsThisModule) +
              ' is one of npm dependencies, ' +
              'so it will not contain that source file. You probably want ' +
              'to create a new bundle entry point for it instead.'
          );
        }
        return true;
      }
      return !!peerGlobals[id];
    },
    onwarn: handleRollupWarning,
    plugins: getPlugins(
      bundle.entry,
      bundle.babel,
      filename,
      packageName,
      bundleType,
      bundle.global,
      bundle.moduleType,
      pureExternalModules,
      bundle
    ),
    output: {
      externalLiveBindings: false,
      freeze: false,
      interop: getRollupInteropValue,
      esModule: false,
    },
  };
  const mainOutputPath = Packaging.getBundleOutputPath(
    bundle,
    bundleType,
    filename,
    packageName
  );

  const rollupOutputOptions = getRollupOutputOptions(
    mainOutputPath,
    format,
    peerGlobals,
    bundle.global,
    bundleType
  );

  if (isWatchMode) {
    rollupConfig.output = [rollupOutputOptions];
    const watcher = rollup.watch(rollupConfig);
    watcher.on('event', async event => {
      switch (event.code) {
        case 'BUNDLE_START':
          console.log(`${chalk.bgYellow.black(' BUILDING ')} ${logKey}`);
          break;
        case 'BUNDLE_END':
          console.log(`${chalk.bgGreen.black(' COMPLETE ')} ${logKey}\n`);
          break;
        case 'ERROR':
        case 'FATAL':
          console.log(`${chalk.bgRed.black(' OH NOES! ')} ${logKey}\n`);
          handleRollupError(event.error);
          break;
      }
    });
  } else {
    console.log(`${chalk.bgYellow.black(' BUILDING ')} ${logKey}`);
    try {
      const result = await rollup.rollup(rollupConfig);
      await result.write(rollupOutputOptions);
    } catch (error) {
      console.log(`${chalk.bgRed.black(' OH NOES! ')} ${logKey}\n`);
      handleRollupError(error);
      throw error;
    }
    console.log(`${chalk.bgGreen.black(' COMPLETE ')} ${logKey}\n`);
  }
}

function handleRollupWarning(warning) {
  if (warning.code === 'UNUSED_EXTERNAL_IMPORT') {
    const match = warning.message.match(/external module "([^"]+)"/);
    if (!match || typeof match[1] !== 'string') {
      throw new Error(
        'Could not parse a Rollup warning. ' + 'Fix this method.'
      );
    }
    const importSideEffects = Modules.getImportSideEffects();
    const externalModule = match[1];
    if (typeof importSideEffects[externalModule] !== 'boolean') {
      throw new Error(
        'An external module "' +
          externalModule +
          '" is used in a DEV-only code path ' +
          'but we do not know if it is safe to omit an unused require() to it in production. ' +
          'Please add it to the `importSideEffects` list in `scripts/rollup/modules.js`.'
      );
    }
    // Don't warn. We will remove side effectless require() in a later pass.
    return;
  }

  if (warning.code === 'CIRCULAR_DEPENDENCY') {
    // Ignored
  } else if (typeof warning.code === 'string') {
    // This is a warning coming from Rollup itself.
    // These tend to be important (e.g. clashes in namespaced exports)
    // so we'll fail the build on any of them.
    console.error();
    console.error(warning.message || warning);
    console.error();
    process.exit(1);
  } else {
    // The warning is from one of the plugins.
    // Maybe it's not important, so just print it.
    console.warn(warning.message || warning);
  }
}

function handleRollupError(error) {
  loggedErrors.add(error);
  if (!error.code) {
    console.error(error);
    return;
  }
  console.error(
    `\x1b[31m-- ${error.code}${error.plugin ? ` (${error.plugin})` : ''} --`
  );
  console.error(error.stack);
  if (error.loc && error.loc.file) {
    const {file, line, column} = error.loc;
    // This looks like an error from Rollup, e.g. missing export.
    // We'll use the accurate line numbers provided by Rollup but
    // use Babel code frame because it looks nicer.
    const rawLines = fs.readFileSync(file, 'utf-8');
    // column + 1 is required due to rollup counting column start position from 0
    // whereas babel-code-frame counts from 1
    const frame = codeFrame(rawLines, line, column + 1, {
      highlightCode: true,
    });
    console.error(frame);
  } else if (error.codeFrame) {
    // This looks like an error from a plugin (e.g. Babel).
    // In this case we'll resort to displaying the provided code frame
    // because we can't be sure the reported location is accurate.
    console.error(error.codeFrame);
  }
}

function runShellCommand(command) {
  console.log(chalk.dim('Running: ') + chalk.cyan(command));
  childProcess.execSync(command, {stdio: 'inherit', shell: true});
}

async function buildEverything() {
  if (!argv['unsafe-partial']) {
    await asyncRimRaf('build');
  }

  // Run them serially for better console output
  // and to avoid any potential race conditions.

  let bundles = [];
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const bundle of Bundles.bundles) {
    bundles.push(
      [bundle, NODE_ES2015],
      [bundle, ESM_DEV],
      [bundle, ESM_PROD],
      [bundle, NODE_DEV],
      [bundle, NODE_PROD],
      [bundle, NODE_PROFILING],
      [bundle, BUN_DEV],
      [bundle, BUN_PROD],
      [bundle, FB_WWW_DEV],
      [bundle, FB_WWW_PROD],
      [bundle, FB_WWW_PROFILING],
      [bundle, RN_OSS_DEV],
      [bundle, RN_OSS_PROD],
      [bundle, RN_OSS_PROFILING],
      [bundle, RN_FB_DEV],
      [bundle, RN_FB_PROD],
      [bundle, RN_FB_PROFILING],
      [bundle, BROWSER_SCRIPT],
      [bundle, CJS_DTS],
      [bundle, ESM_DTS]
    );
  }

  bundles = bundles.filter(([bundle, bundleType]) => {
    return !shouldSkipBundle(bundle, bundleType);
  });

  if (process.env.CI_TOTAL && process.env.CI_INDEX) {
    const nodeTotal = parseInt(process.env.CI_TOTAL, 10);
    const nodeIndex = parseInt(process.env.CI_INDEX, 10);
    bundles = bundles.filter((_, i) => i % nodeTotal === nodeIndex);
  }

  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const [bundle, bundleType] of bundles) {
    if (bundle.prebuild) {
      runShellCommand(bundle.prebuild);
    }
    await createBundle(bundle, bundleType);
  }

  await Packaging.copyAllShims();
  await Packaging.prepareNpmPackages();

  if (syncFBSourcePath) {
    await Sync.syncReactNative(syncFBSourcePath);
  } else if (syncWWWPath) {
    await Sync.syncReactDom('build/facebook-www', syncWWWPath);
  }

  console.log(Stats.printResults());
  if (!forcePrettyOutput) {
    Stats.saveResults();
  }
}

buildEverything();
