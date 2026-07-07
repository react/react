/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const babel = require('@babel/register');
const {transformSync} = require('@babel/core');
const Module = require('module');
const path = require('path');
const fs = require('fs');
babel({
  plugins: [
    'babel-plugin-syntax-hermes-parser',
    '@babel/plugin-transform-modules-commonjs',
  ],
});

const yargs = require('yargs');
const argv = yargs
  .parserConfiguration({
    // Important: This option tells yargs to move all other options not
    // specified here into the `_` key. We use this to send all of the
    // Jest options that we don't use through to Jest (like --watch).
    'unknown-options-as-args': true,
  })
  .wrap(yargs.terminalWidth())
  .options({
    csv: {
      alias: 'c',
      describe: 'output cvs.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    diff: {
      alias: 'd',
      describe: 'output diff of two or more flags.',
      requiresArg: false,
      type: 'array',
      choices: [
        'www',
        'www-modern',
        'rn',
        'rn-fb',
        'rn-next',
        'canary',
        'next',
        'experimental',
        null,
      ],
      default: null,
    },
    sort: {
      alias: 's',
      describe: 'sort diff by one or more flags.',
      requiresArg: false,
      type: 'string',
      default: 'flag',
      choices: [
        'flag',
        'www',
        'www-modern',
        'rn',
        'rn-fb',
        'rn-next',
        'canary',
        'next',
        'experimental',
      ],
    },
    cleanup: {
      describe: 'output flags by cleanup category.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
  }).argv;

// Load ReactFeatureFlags with __NEXT_MAJOR__ replaced with 'next'.
// We need to do string replace, since the __NEXT_MAJOR__ is assigned to __EXPERIMENTAL__.
function getReactFeatureFlagsMajor() {
  const virtualName = 'ReactFeatureFlagsMajor.js';
  const file = fs.readFileSync(
    path.join(__dirname, '../../packages/shared/ReactFeatureFlags.js'),
    'utf8'
  );
  const fileContent = transformSync(
    file.replace(
      'const __NEXT_MAJOR__ = __EXPERIMENTAL__;',
      'const __NEXT_MAJOR__ = "next";'
    ),
    {
      plugins: [
        'babel-plugin-syntax-hermes-parser',
        '@babel/plugin-transform-modules-commonjs',
      ],
    }
  ).code;

  const parent = module.parent;
  const m = new Module(virtualName, parent);
  m.filename = virtualName;

  m._compile(fileContent, virtualName);

  return m.exports;
}

// Load RN ReactFeatureFlags with __NEXT_RN_MAJOR__ replaced with 'next'.
// We need to do string replace, since the __NEXT_RN_MAJOR__ is assigned to false.
function getReactNativeFeatureFlagsMajor() {
  const virtualName = 'ReactNativeFeatureFlagsMajor.js';
  const file = fs.readFileSync(
    path.join(
      __dirname,
      '../../packages/shared/forks/ReactFeatureFlags.native-oss.js'
    ),
    'utf8'
  );
  const fileContent = transformSync(
    file
      .replace(
        'const __NEXT_RN_MAJOR__ = true;',
        'const __NEXT_RN_MAJOR__ = "next";'
      )
      .replace(
        'const __TODO_NEXT_RN_MAJOR__ = false;',
        'const __TODO_NEXT_RN_MAJOR__ = "next-todo";'
      ),
    {
      plugins: [
        'babel-plugin-syntax-hermes-parser',
        '@babel/plugin-transform-modules-commonjs',
      ],
    }
  ).code;

  const parent = module.parent;
  const m = new Module(virtualName, parent);
  m.filename = virtualName;

  m._compile(fileContent, virtualName);

  return m.exports;
}

// The RN and www Feature flag files import files that don't exist.
// Mock the imports with the dynamic flag values.
function mockDynamicallyFeatureFlags() {
  // Mock the ReactNativeInternalFeatureFlags and ReactFeatureFlags modules
  const DynamicFeatureFlagsWWW = require('../../packages/shared/forks/ReactFeatureFlags.www-dynamic.js');
  const DynamicFeatureFlagsNative = require('../../packages/shared/forks/ReactFeatureFlags.native-fb-dynamic.js');

  const originalLoad = Module._load;

  Module._load = function (request, parent) {
    if (request === 'ReactNativeInternalFeatureFlags') {
      return DynamicFeatureFlagsNative;
    } else if (request === 'ReactFeatureFlags') {
      return DynamicFeatureFlagsWWW;
    }

    return originalLoad.apply(this, arguments);
  };
}
// Set the globals to string values to output them to the table.
global.__VARIANT__ = 'gk';
global.__PROFILE__ = 'profile';
global.__DEV__ = 'dev';
global.__EXPERIMENTAL__ = 'experimental';

// Load all the feature flag files.
mockDynamicallyFeatureFlags();
const ReactFeatureFlags = require('../../packages/shared/ReactFeatureFlags.js');
const ReactFeatureFlagsWWW = require('../../packages/shared/forks/ReactFeatureFlags.www.js');
const ReactFeatureFlagsNativeFB = require('../../packages/shared/forks/ReactFeatureFlags.native-fb.js');
const ReactFeatureFlagsMajor = getReactFeatureFlagsMajor();
const ReactNativeFeatureFlagsMajor = getReactNativeFeatureFlagsMajor();

const allFlagsUniqueFlags = Array.from(
  new Set([
    ...Object.keys(ReactFeatureFlags),
    ...Object.keys(ReactFeatureFlagsWWW),
    ...Object.keys(ReactFeatureFlagsNativeFB),
  ])
).sort();

// These functions are the rules for what each value means in each channel.
function getNextMajorFlagValue(flag) {
  const value = ReactFeatureFlagsMajor[flag];
  if (value === true || value === 'next') {
    return '✅';
  } else if (value === false || value === null || value === 'experimental') {
    return '❌';
  } else if (value === 'profile') {
    return '📊';
  } else if (value === 'dev') {
    return '💻';
  } else if (typeof value === 'number' || typeof value === 'string') {
    return value;
  } else {
    throw new Error(`Unexpected OSS Stable value ${value} for flag ${flag}`);
  }
}

function getOSSCanaryFlagValue(flag) {
  const value = ReactFeatureFlags[flag];
  if (value === true) {
    return '✅';
  } else if (
    value === false ||
    value === null ||
    value === 'experimental' ||
    value === 'next'
  ) {
    return '❌';
  } else if (value === 'profile') {
    return '📊';
  } else if (value === 'dev') {
    return '💻';
  } else if (typeof value === 'number' || typeof value === 'string') {
    return value;
  } else {
    throw new Error(`Unexpected OSS Canary value ${value} for flag ${flag}`);
  }
}

function getOSSExperimentalFlagValue(flag) {
  const value = ReactFeatureFlags[flag];
  if (value === true || value === 'experimental') {
    return '✅';
  } else if (value === false || value === null || value === 'next') {
    return '❌';
  } else if (value === 'profile') {
    return '📊';
  } else if (value === 'dev') {
    return '💻';
  } else if (typeof value === 'number' || typeof value === 'string') {
    return value;
  } else {
    throw new Error(
      `Unexpected OSS Experimental value ${value} for flag ${flag}`
    );
  }
}

function getWWWModernFlagValue(flag) {
  const value = ReactFeatureFlagsWWW[flag];
  if (value === true || value === 'experimental') {
    return '✅';
  } else if (value === false || value === null || value === 'next') {
    return '❌';
  } else if (value === 'profile') {
    return '📊';
  } else if (value === 'dev') {
    return '💻';
  } else if (value === 'gk') {
    return '🧪';
  } else if (typeof value === 'number' || typeof value === 'string') {
    return value;
  } else {
    throw new Error(`Unexpected WWW Modern value ${value} for flag ${flag}`);
  }
}

function getWWWClassicFlagValue(flag) {
  const value = ReactFeatureFlagsWWW[flag];
  if (value === true) {
    return '✅';
  } else if (
    value === false ||
    value === null ||
    value === 'experimental' ||
    value === 'next'
  ) {
    return '❌';
  } else if (value === 'profile') {
    return '📊';
  } else if (value === 'dev') {
    return '💻';
  } else if (value === 'gk') {
    return '🧪';
  } else if (typeof value === 'number' || typeof value === 'string') {
    return value;
  } else {
    throw new Error(`Unexpected WWW Classic value ${value} for flag ${flag}`);
  }
}

function getRNNextMajorFlagValue(flag) {
  const value = ReactNativeFeatureFlagsMajor[flag];
  if (value === true || value === 'next') {
    return '✅';
  } else if (value === 'next-todo') {
    return '📋';
  } else if (value === false || value === null || value === 'experimental') {
    return '❌';
  } else if (value === 'profile') {
    return '📊';
  } else if (value === 'dev') {
    return '💻';
  } else if (value === 'gk') {
    return '🧪';
  } else if (typeof value === 'number' || typeof value === 'string') {
    return value;
  } else {
    throw new Error(`Unexpected RN OSS value ${value} for flag ${flag}`);
  }
}

function getRNOSSFlagValue(flag) {
  const value = ReactNativeFeatureFlagsMajor[flag];
  if (value === true) {
    return '✅';
  } else if (
    value === false ||
    value === null ||
    value === 'experimental' ||
    value === 'next' ||
    value === 'next-todo'
  ) {
    return '❌';
  } else if (value === 'profile') {
    return '📊';
  } else if (value === 'dev') {
    return '💻';
  } else if (value === 'gk') {
    return '🧪';
  } else if (typeof value === 'number' || typeof value === 'string') {
    return value;
  } else {
    throw new Error(`Unexpected RN OSS value ${value} for flag ${flag}`);
  }
}

function getRNFBFlagValue(flag) {
  const value = ReactFeatureFlagsNativeFB[flag];
  if (value === true) {
    return '✅';
  } else if (
    value === false ||
    value === null ||
    value === 'experimental' ||
    value === 'next'
  ) {
    return '❌';
  } else if (value === 'profile') {
    return '📊';
  } else if (value === 'dev') {
    return '💻';
  } else if (value === 'gk') {
    return '🧪';
  } else if (typeof value === 'number' || typeof value === 'string') {
    return value;
  } else {
    throw new Error(`Unexpected RN FB value ${value} for flag ${flag}`);
  }
}

function argToHeader(arg) {
  switch (arg) {
    case 'www':
      return 'WWW Classic';
    case 'www-modern':
      return 'WWW Modern';
    case 'rn':
      return 'RN OSS';
    case 'rn-fb':
      return 'RN FB';
    case 'rn-next':
      return 'RN Next Major';
    case 'canary':
      return 'OSS Canary';
    case 'next':
      return 'OSS Next Major';
    case 'experimental':
      return 'OSS Experimental';
    default:
      return arg;
  }
}

const FLAG_CONFIG = {
  'OSS Next Major': getNextMajorFlagValue,
  'OSS Canary': getOSSCanaryFlagValue,
  'OSS Experimental': getOSSExperimentalFlagValue,
  'WWW Classic': getWWWClassicFlagValue,
  'WWW Modern': getWWWModernFlagValue,
  'RN FB': getRNFBFlagValue,
  'RN OSS': getRNOSSFlagValue,
  'RN Next Major': getRNNextMajorFlagValue,
};

const FLAG_COLUMNS = Object.keys(FLAG_CONFIG);

const INTERNAL_VARIANTS = ['WWW Classic', 'WWW Modern', 'RN FB'];
const OSS_VARIANTS = [
  'OSS Next Major',
  'OSS Canary',
  'OSS Experimental',
  'RN OSS',
  'RN Next Major',
];

// Build the table with the value for each flag.
function buildTable(filterFn) {
  const isDiff = argv.diff != null && argv.diff.length > 1;
  const table = {};
  const filteredFlags = filterFn
    ? allFlagsUniqueFlags.filter(filterFn)
    : allFlagsUniqueFlags;
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const flag of filteredFlags) {
    const values = FLAG_COLUMNS.reduce((acc, key) => {
      acc[key] = FLAG_CONFIG[key](flag);
      return acc;
    }, {});

    if (!isDiff) {
      table[flag] = values;
      continue;
    }

    const subset = argv.diff.map(argToHeader).reduce((acc, key) => {
      if (key in values) {
        acc[key] = values[key];
      }
      return acc;
    }, {});

    if (new Set(Object.values(subset)).size !== 1) {
      table[flag] = subset;
    }
  }

  // Sort the table
  let sorted = table;
  if (isDiff || argv.sort) {
    const sortChannel = argToHeader(isDiff ? argv.diff[0] : argv.sort);
    const sortBy =
      sortChannel === 'flag'
        ? ([flagA], [flagB]) => {
            return flagA.localeCompare(flagB);
          }
        : ([, rowA], [, rowB]) => {
            return rowB[sortChannel]
              .toString()
              .localeCompare(rowA[sortChannel]);
          };
    sorted = Object.fromEntries(Object.entries(table).sort(sortBy));
  }

  return sorted;
}

function formatTable(tableData) {
  // left align the flag names.
  const maxLength = Math.max(
    ...Object.keys(tableData).map(item => item.length)
  );
  const padded = {};
  Object.keys(tableData).forEach(key => {
    const newKey = key.padEnd(maxLength, ' ');
    padded[newKey] = tableData[key];
  });

  return padded;
}

if (argv.csv) {
  const table = buildTable();
  const csvRows = [
    `Flag name, ${FLAG_COLUMNS.join(', ')}`,
    ...Object.keys(table).map(flag => {
      const row = table[flag];
      return `${flag}, ${FLAG_COLUMNS.map(col => row[col]).join(', ')}`;
    }),
  ];
  fs.writeFile('./flags.csv', csvRows.join('\n'), function (err) {
    if (err) {
      return console.log(err);
    }
    console.log('The file was saved to ./flags.csv');
  });
}

if (argv.cleanup) {
  const allPassingFlags = [];
  const allFailingFlags = [];
  const needsShippedExperimentFlags = [];
  const earlyExperimentationFlags = [];
  const internalOnlyFlags = [];

  const diffedFlagColumns =
    argv.diff[0] != null ? argv.diff.map(argToHeader) : FLAG_COLUMNS;

  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const flag of allFlagsUniqueFlags) {
    const values = diffedFlagColumns.reduce((acc, key) => {
      acc[key] = FLAG_CONFIG[key](flag);
      return acc;
    }, {});

    const uniqueValues = new Set(Object.values(values));

    if (
      uniqueValues.size === 1 &&
      (uniqueValues.has('✅') ||
        typeof uniqueValues.values().next().value === 'number')
    ) {
      allPassingFlags.push(flag);
    }

    if (uniqueValues.size === 1 && uniqueValues.has('❌')) {
      allFailingFlags.push(flag);
    }

    const internalVariantValues = INTERNAL_VARIANTS.filter(value =>
      diffedFlagColumns.includes(value)
    ).map(v => values[v]);
    const ossVariantValues = OSS_VARIANTS.filter(value =>
      diffedFlagColumns.includes(value)
    ).map(v => values[v]);

    if (
      internalVariantValues.some(v => v === '✅') &&
      ossVariantValues.every(v => v === '❌')
    ) {
      internalOnlyFlags.push(flag);
    }

    if (
      internalVariantValues.some(v => v === '🧪') &&
      (ossVariantValues.every(v => v === '❌') ||
        (ossVariantValues.some(v => v === '❌') &&
          values['OSS Experimental'] === '✅'))
    ) {
      earlyExperimentationFlags.push(flag);
    }

    if (
      internalVariantValues.some(v => v === '🧪' || v === '❌') &&
      ossVariantValues.every(v => v === '✅')
    ) {
      needsShippedExperimentFlags.push(flag);
    }
  }

  if (allPassingFlags.length > 0) {
    console.log('ALL VARIANTS PASS (✅)');
    console.table(
      formatTable(buildTable(flag => allPassingFlags.includes(flag)))
    );
  }

  if (allFailingFlags.length > 0) {
    console.log('ALL VARIANTS FAIL (❌)');
    console.table(
      formatTable(buildTable(flag => allFailingFlags.includes(flag)))
    );
  }

  if (internalOnlyFlags.length > 0) {
    console.log('INTERNAL ONLY (✅)');
    console.table(
      formatTable(buildTable(flag => internalOnlyFlags.includes(flag)))
    );
  }

  if (earlyExperimentationFlags.length > 0) {
    console.log('WAITING ON RESULTS (🧪)');
    console.table(
      formatTable(buildTable(flag => earlyExperimentationFlags.includes(flag)))
    );
  }

  if (needsShippedExperimentFlags.length > 0) {
    console.log('WAITING ON ROLLOUT (🧪)');
    console.table(
      formatTable(
        buildTable(flag => needsShippedExperimentFlags.includes(flag))
      )
    );
  }
} else {
  console.table(formatTable(buildTable()));
}

console.log(`
Legend:
  ✅ On
  ❌ Off
  💻 DEV
  📋 TODO
  📊 Profiling
  🧪 Experiment
`);
