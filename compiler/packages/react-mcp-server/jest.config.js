/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/__tests__/**/*-test.ts'],
  // The package tsconfig sets `noEmit: true` and `module: Node16`. Both
  // prevent ts-jest from emitting code that jest's runtime can load, so
  // we override them here. `commonjs` + `esModuleInterop` matches the
  // tsup CJS output that the MCP server ships to users.
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          noEmit: false,
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'es2022',
          rootDir: '.',
          esModuleInterop: true,
          jsx: 'react-jsxdev',
          lib: ['ES2022'],
          strict: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/'],
};
