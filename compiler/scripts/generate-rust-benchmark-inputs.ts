/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as babel from '@babel/core';
import * as BabelParser from '@babel/parser';
import fs from 'fs';
import path from 'path';
import traverseModule from '@babel/traverse';

import {parseConfigPragmaForTests} from '../packages/babel-plugin-react-compiler/src/Utils/TestUtils';
import {resolveOptions} from '../packages/babel-plugin-react-compiler-rust/src/options';
import {extractScopeInfo} from '../packages/babel-plugin-react-compiler-rust/src/scope';

const REPO_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_FIXTURES_DIR = path.join(
  REPO_ROOT,
  'compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler',
);
const traverse = traverseModule.default ?? traverseModule;
const SNAP_HERMES_PARSER = path.join(
  REPO_ROOT,
  'compiler/packages/snap/node_modules/hermes-parser',
);

const rawArgs = process.argv.slice(2);
const outputIdx = rawArgs.indexOf('--output');
const fixturesIdx = rawArgs.indexOf('--fixtures');
const limitIdx = rawArgs.indexOf('--limit');
const outputDir = readArgValue(outputIdx, '--output');
const fixturesArg = readArgValue(fixturesIdx, '--fixtures');
const limitArg = readArgValue(limitIdx, '--limit');
const fixturesDir =
  fixturesArg == null ? DEFAULT_FIXTURES_DIR : path.resolve(fixturesArg);
const limit = limitArg == null ? 0 : parseInt(limitArg, 10);

if (outputDir == null) {
  console.error(
    'Usage: npx tsx compiler/scripts/generate-rust-benchmark-inputs.ts --output <dir> [--fixtures <dir>] [--limit N]',
  );
  process.exit(1);
}
if (!Number.isInteger(limit) || limit < 0) {
  throw new Error('--limit must be a non-negative integer');
}

type PreparedFixture = {
  fixture: string;
  sizeBytes: number;
  ast: string;
  scope: string;
  options: string;
};

type FailedFixture = {
  fixture: string;
  error: string;
};

function readArgValue(index: number, name: string): string | null {
  if (index < 0) {
    return null;
  }
  const value = rawArgs[index + 1];
  if (value == null || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function discoverFixtures(rootPath: string): Array<string> {
  const results: Array<string> = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        /\.(js|jsx|ts|tsx)$/.test(entry.name) &&
        !entry.name.endsWith('.expect.md')
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(rootPath);
  results.sort();
  return results;
}

function sanitizeJsonSurrogates(json: string): string {
  return json
    .replace(
      /(?<!\\)\\u([dD][89aAbB][0-9a-fA-F]{2})(?!\\u[dD][c-fC-F][0-9a-fA-F]{2})/g,
      (_, hex) => `__SURROGATE_${hex.toUpperCase()}__`,
    )
    .replace(
      /(?<!\\u[dD][89aAbB][0-9a-fA-F]{2})(?<!\\)\\u([dD][c-fC-F][0-9a-fA-F]{2})/g,
      (_, hex) => `__SURROGATE_${hex.toUpperCase()}__`,
    );
}

function sidecarPath(relativeFixture: string, kind: string): string {
  return `${relativeFixture}.${kind}.json`;
}

function writeJson(
  relativePath: string,
  value: unknown,
  sanitize = false,
): void {
  const target = path.join(outputDir!, relativePath);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  const json = JSON.stringify(value);
  fs.writeFileSync(target, sanitize ? sanitizeJsonSurrogates(json) : json);
}

let fixtures = discoverFixtures(fixturesDir);
if (limit > 0) {
  fixtures = fixtures.slice(0, limit);
}
const expectedFixtureCount = fixtures.length;
if (!fs.existsSync(SNAP_HERMES_PARSER)) {
  throw new Error(
    'The snap Hermes parser is not installed; run `yarn install` in compiler/',
  );
}
const hermesParser = require(
  SNAP_HERMES_PARSER,
) as typeof import('hermes-parser');

const prepared: Array<PreparedFixture> = [];
const failures: Array<FailedFixture> = [];

fs.mkdirSync(outputDir, {recursive: true});

for (const fixturePath of fixtures) {
  const relativeFixture = path.relative(fixturesDir, fixturePath);
  const source = fs.readFileSync(fixturePath, 'utf8');
  const firstLine = source.substring(0, source.indexOf('\n'));
  const pragmaOptions = parseConfigPragmaForTests(firstLine, {
    compilationMode: 'all',
  });
  const isFlow = source.includes('@flow');
  const sourceType = source.includes('@script') ? 'script' : 'module';

  let ast: babel.types.File | null = null;
  let scopeInfo: ReturnType<typeof extractScopeInfo> | null = null;
  let options: ReturnType<typeof resolveOptions> | null = null;

  try {
    ast = isFlow
      ? (hermesParser.parse(source, {
          babel: true,
          flow: 'all',
          sourceFilename: fixturePath,
          sourceType,
          enableExperimentalComponentSyntax: true,
          enableExperimentalFlowMatchSyntax: true,
        }) as babel.types.File)
      : BabelParser.parse(source, {
          sourceFilename: fixturePath,
          plugins: ['typescript', 'jsx', 'explicitResourceManagement'],
          sourceType,
        });
    const file = new babel.File({filename: fixturePath}, {code: source, ast});
    options = resolveOptions(
      {
        ...pragmaOptions,
        compilationMode: 'all',
        panicThreshold: 'all_errors',
      },
      file,
      fixturePath,
      ast,
    );
    traverse(ast, {
      Program(program): void {
        scopeInfo = extractScopeInfo(program);
        program.stop();
      },
    });
  } catch (error) {
    failures.push({
      fixture: relativeFixture,
      error: error instanceof Error ? error.message : String(error),
    });
    continue;
  }

  if (ast == null || scopeInfo == null || options == null) {
    failures.push({
      fixture: relativeFixture,
      error: 'Babel did not produce compiler inputs',
    });
    continue;
  }

  const astPath = sidecarPath(relativeFixture, 'ast');
  const scopePath = sidecarPath(relativeFixture, 'scope');
  const optionsPath = sidecarPath(relativeFixture, 'options');

  writeJson(astPath, ast, true);
  writeJson(scopePath, scopeInfo);
  writeJson(optionsPath, {
    ...options,
    __sourceCode: source,
    __profiling: false,
  });

  prepared.push({
    fixture: relativeFixture,
    sizeBytes: Buffer.byteLength(source),
    ast: astPath,
    scope: scopePath,
    options: optionsPath,
  });
}

const totalSourceBytes = prepared.reduce(
  (total, fixture) => total + fixture.sizeBytes,
  0,
);
writeJson('manifest.json', {
  version: 1,
  fixtures: prepared,
  failures,
  totalSourceBytes,
});

console.log(
  `Prepared ${prepared.length}/${fixtures.length} fixtures (${totalSourceBytes} source bytes); ${failures.length} failed`,
);
if (prepared.length !== expectedFixtureCount) {
  process.exitCode = 1;
}
