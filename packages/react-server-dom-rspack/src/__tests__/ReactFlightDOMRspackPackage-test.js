/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const {mkdtempSync, mkdirSync, rmSync, symlinkSync} = require('fs');
const {tmpdir} = require('os');
const {join} = require('path');
const {spawnSync} = require('child_process');
const {exports: resolveExports} = require('resolve.exports');

const packageName = 'react-server-dom-rspack';
const releaseDirectory =
  process.env.RELEASE_CHANNEL === 'stable' ? 'oss-stable' : 'oss-experimental';
const packageDirectory = join(
  process.cwd(),
  'build',
  releaseDirectory,
  packageName,
);
let consumerDirectory;

function getConsumerDirectory() {
  if (consumerDirectory === undefined) {
    consumerDirectory = mkdtempSync(join(tmpdir(), 'react-rsdr-package-'));
    const nodeModulesDirectory = join(consumerDirectory, 'node_modules');
    mkdirSync(nodeModulesDirectory);
    ['react', 'react-dom', packageName].forEach(dependency => {
      symlinkSync(
        join(packageDirectory, '..', dependency),
        join(nodeModulesDirectory, dependency),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    });
  }
  return consumerDirectory;
}

function runNode(specifier, nodeEnv, conditions, source, expectation) {
  const conditionArguments = conditions.map(
    condition => `--conditions=${condition}`,
  );
  const result = spawnSync(
    process.execPath,
    [
      '--preserve-symlinks',
      ...conditionArguments,
      '-e',
      source,
      specifier,
      JSON.stringify(expectation),
    ],
    {
      cwd: getConsumerDirectory(),
      encoding: 'utf8',
      env: {...process.env, NODE_ENV: nodeEnv},
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Failed to load ${specifier} in ${nodeEnv}:\n${
        result.stderr || result.stdout
      }`,
    );
  }
}

const requireExport = `
  global.__webpack_require__ = id => require(id);
  global.__webpack_require__.u = id => String(id);
  global.__webpack_chunk_load__ = () => Promise.resolve();
  global.__rspack_rsc_manifest__ = {
    clientManifest: {},
    serverConsumerModuleMap: {},
    serverManifest: {},
    moduleLoading: null,
    entryJsFiles: [],
    entryCssFiles: {},
  };
  const exported = require(process.argv[1]);
  const expectation = JSON.parse(process.argv[2]);
  if (expectation.packageName !== undefined) {
    if (exported.name !== expectation.packageName) {
      throw new Error('Expected package metadata for ' + expectation.packageName + '.');
    }
  }
  for (const name of expectation.functions) {
    if (typeof exported[name] !== 'function') {
      throw new Error('Expected ' + process.argv[1] + ' to export function ' + name + '.');
    }
  }
  for (const name of expectation.missingFunctions || []) {
    if (exported[name] !== undefined) {
      throw new Error('Expected ' + process.argv[1] + ' not to export ' + name + '.');
    }
  }
  process.exit(0);
`;

const requireUnexportedSubpath = `
  try {
    require(process.argv[1]);
  } catch (error) {
    if (error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
      process.exit(0);
    }
    throw error;
  }
  throw new Error('Expected the package subpath to be private.');
`;

const requireGuardedSubpath = `
  const expectation = JSON.parse(process.argv[2]);
  try {
    require(process.argv[1]);
  } catch (error) {
    if (error.message.includes(expectation.errorMessage)) {
      process.exit(0);
    }
    throw error;
  }
  throw new Error('Expected the package subpath to require react-server.');
`;

function getPackedFileNames() {
  const isWindows = process.platform === 'win32';
  const executable = isWindows ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = isWindows
    ? ['/d', '/s', '/c', 'npm.cmd pack --dry-run --ignore-scripts --json']
    : ['pack', '--dry-run', '--ignore-scripts', '--json'];
  const result = spawnSync(executable, args, {
    cwd: packageDirectory,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `Failed to inspect the npm package:\n${result.stderr || result.stdout}`,
    );
  }
  return JSON.parse(result.stdout)[0].files.map(file => file.path);
}

describe('react-server-dom-rspack npm package', () => {
  afterAll(() => {
    if (consumerDirectory !== undefined) {
      rmSync(consumerDirectory, {recursive: true, force: true});
    }
  });

  const itBuilt = process.env.IS_BUILD ? it : it.skip;

  itBuilt(
    'loads every supported public entry point from the assembled release',
    () => {
      const clientEntryPoints = [
        {
          specifier: `${packageName}/client`,
          functions: ['createFromNodeStream', 'encodeReply'],
        },
        {
          specifier: `${packageName}/client.browser`,
          functions: ['createFromFetch', 'encodeReply', 'setServerCallback'],
        },
        {
          specifier: `${packageName}/client.edge`,
          functions: ['createFromFetch', 'encodeReply'],
        },
        {
          specifier: `${packageName}/client.node`,
          functions: ['createFromNodeStream', 'encodeReply'],
        },
        {
          specifier: `${packageName}/package.json`,
          packageName,
          functions: [],
        },
      ];
      const serverEntryPoints = [
        {
          specifier: `${packageName}/server`,
          functions: [
            'decodeAction',
            'decodeReplyFromBusboy',
            'loadServerAction',
          ],
        },
        {
          specifier: `${packageName}/server.browser`,
          functions: ['decodeAction', 'loadServerAction'],
        },
        {
          specifier: `${packageName}/server.edge`,
          functions: [
            'decodeAction',
            'decodeReplyFromAsyncIterable',
            'loadServerAction',
          ],
        },
        {
          specifier: `${packageName}/server.node`,
          functions: [
            'decodeAction',
            'decodeReplyFromBusboy',
            'loadServerAction',
          ],
        },
        {
          specifier: `${packageName}/static`,
          functions: ['prerender', 'prerenderToNodeStream'],
        },
        {
          specifier: `${packageName}/static.browser`,
          functions: ['prerender'],
        },
        {
          specifier: `${packageName}/static.edge`,
          functions: ['prerender'],
        },
        {
          specifier: `${packageName}/static.node`,
          functions: ['prerender', 'prerenderToNodeStream'],
        },
      ];

      ['development', 'production'].forEach(nodeEnv => {
        clientEntryPoints.forEach(entryPoint => {
          runNode(entryPoint.specifier, nodeEnv, [], requireExport, entryPoint);
        });
        serverEntryPoints.forEach(entryPoint => {
          runNode(
            entryPoint.specifier,
            nodeEnv,
            ['react-server'],
            requireExport,
            entryPoint,
          );
        });
      });
    },
  );

  itBuilt('guides package-root consumers to the client entry point', () => {
    runNode(packageName, 'development', [], requireGuardedSubpath, {
      errorMessage: `Use ${packageName}/client instead.`,
    });
  });

  [`${packageName}/server`, `${packageName}/static`].forEach(specifier => {
    itBuilt(`guards ${specifier} outside react-server`, () => {
      runNode(specifier, 'development', [], requireGuardedSubpath, {
        errorMessage: 'outside a react-server environment',
      });
    });
  });

  [`${packageName}/plugin`, `${packageName}/node-register`].forEach(
    specifier => {
      itBuilt(`does not expose ${specifier}`, () => {
        runNode(
          specifier,
          'development',
          ['react-server'],
          requireUnexportedSubpath,
          {},
        );
      });
    },
  );

  itBuilt('excludes unsupported integration files from the npm package', () => {
    const packedFileNames = getPackedFileNames();
    expect(packedFileNames).toEqual(
      expect.arrayContaining([
        'client.browser.js',
        'server.node.js',
        'static.edge.js',
        'cjs/react-server-dom-rspack-client.browser.development.js',
        'cjs/react-server-dom-rspack-server.node.production.js',
      ]),
    );
    [
      'plugin.js',
      'node-register.js',
      'esm/package.json',
      'client.node.unbundled.js',
      'server.node.unbundled.js',
      'static.node.unbundled.js',
    ].forEach(fileName => {
      expect(packedFileNames).not.toContain(fileName);
    });
  });

  itBuilt('resolves every conditional export to its intended runtime', () => {
    const packageManifest = require(join(packageDirectory, 'package.json'));
    const resolve = (subpath, conditions) =>
      resolveExports(packageManifest, subpath, {
        conditions,
        unsafe: true,
      });

    expect(resolve('./client', ['workerd'])).toEqual(['./client.edge.js']);
    expect(resolve('./client', ['deno'])).toEqual(['./client.edge.js']);
    expect(resolve('./client', ['worker'])).toEqual(['./client.edge.js']);
    expect(resolve('./client', ['node'])).toEqual(['./client.node.js']);
    expect(resolve('./client', ['edge-light'])).toEqual(['./client.edge.js']);
    expect(resolve('./client', ['browser'])).toEqual(['./client.browser.js']);
    expect(resolve('./client', [])).toEqual(['./client.browser.js']);

    const resolveServer = (subpath, condition) =>
      resolve(subpath, ['react-server', condition]);
    expect(resolveServer('./server', 'workerd')).toEqual(['./server.edge.js']);
    expect(resolveServer('./server', 'deno')).toEqual(['./server.browser.js']);
    expect(resolveServer('./server', 'node')).toEqual(['./server.node.js']);
    expect(resolveServer('./server', 'edge-light')).toEqual([
      './server.edge.js',
    ]);
    expect(resolveServer('./server', 'browser')).toEqual([
      './server.browser.js',
    ]);

    expect(resolveServer('./static', 'workerd')).toEqual(['./static.edge.js']);
    expect(resolveServer('./static', 'deno')).toEqual(['./static.browser.js']);
    expect(resolveServer('./static', 'node')).toEqual(['./static.node.js']);
    expect(resolveServer('./static', 'edge-light')).toEqual([
      './static.edge.js',
    ]);
    expect(resolveServer('./static', 'browser')).toEqual([
      './static.browser.js',
    ]);
  });
});
