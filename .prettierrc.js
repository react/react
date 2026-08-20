'use strict';

const {esNextPaths} = require('./scripts/shared/pathsByLanguageVersion');

module.exports = {
  bracketSpacing: false,
  singleQuote: true,
  bracketSameLine: true,
  trailingComma: 'es5',
  printWidth: 80,
  plugins: ['prettier-plugin-hermes-parser'],
  parser: 'hermes',
  arrowParens: 'avoid',
  overrides: [
    {
      files: ['*.code-workspace'],
      options: {
        parser: 'json-stringify',
      },
    },
    {
      files: esNextPaths,
      options: {
        trailingComma: 'all',
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        trailingComma: 'all',
        parser: 'typescript',
      },
    },
    {
      // Flow `match` syntax fixtures: prettier's built-in Flow parser cannot
      // parse the experimental syntax, hermes-parser can.
      files: [
        'compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler/match-*',
      ],
      options: {
        parser: 'hermes',
        plugins: ['prettier-plugin-hermes-parser'],
      },
    },
  ],
};
