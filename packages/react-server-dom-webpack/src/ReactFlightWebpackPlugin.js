/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ImportManifestEntry} from './shared/ReactFlightImportMetadata';

import {join} from 'path';
import {pathToFileURL} from 'url';
import asyncLib from 'neo-async';
import * as acorn from 'acorn-loose';

import ModuleDependency from 'webpack/lib/dependencies/ModuleDependency';
import NullDependency from 'webpack/lib/dependencies/NullDependency';
import Template from 'webpack/lib/Template';
import {
  sources,
  WebpackError,
  Compilation,
  AsyncDependenciesBlock,
} from 'webpack';

import isArray from 'shared/isArray';

class ClientReferenceDependency extends ModuleDependency {
  constructor(request: mixed) {
    super(request);
  }

  get type(): string {
    return 'client-reference';
  }
}

// This is the module that will be used to anchor all client references to.
// I.e. it will have all the client files as async deps from this point on.
// We use the Flight client implementation because you can't get to these
// without the client runtime so it's the first time in the loading sequence
// you might want them.
const clientImportName = 'react-server-dom-webpack/client';
const clientFileName = require.resolve('../client.browser.js');

type ClientReferenceSearchPath = {
  directory: string,
  recursive?: boolean,
  include: RegExp,
  exclude?: RegExp,
};

type ClientReferencePath = string | ClientReferenceSearchPath;

type Options = {
  isServer: boolean,
  clientReferences?: ClientReferencePath | $ReadOnlyArray<ClientReferencePath>,
  chunkName?: string,
  clientManifestFilename?: string,
  serverConsumerManifestFilename?: string,
};

const PLUGIN_NAME = 'React Server Plugin';

export default class ReactFlightWebpackPlugin {
  clientReferences: $ReadOnlyArray<ClientReferencePath>;
  chunkName: string;
  clientManifestFilename: string;
  serverConsumerManifestFilename: string;

  constructor(options: Options) {
    if (!options || typeof options.isServer !== 'boolean') {
      throw new Error(
        PLUGIN_NAME + ': You must specify the isServer option as a boolean.',
      );
    }
    if (options.isServer) {
      throw new Error('TODO: Implement the server compiler.');
    }
    if (!options.clientReferences) {
      this.clientReferences = [
        {
          directory: '.',
          recursive: true,
          include: /\.(js|ts|jsx|tsx)$/,
        },
      ];
    } else if (
      typeof options.clientReferences === 'string' ||
      !isArray(options.clientReferences)
    ) {
      this.clientReferences = [options.clientReferences as $FlowFixMe];
    } else {
      // $FlowFixMe[incompatible-type] found when upgrading Flow
      this.clientReferences = options.clientReferences;
    }
    if (typeof options.chunkName === 'string') {
      this.chunkName = options.chunkName;
      if (!/\[(index|request)\]/.test(this.chunkName)) {
        this.chunkName += '[index]';
      }
    } else {
      this.chunkName = 'client[index]';
    }
    this.clientManifestFilename =
      options.clientManifestFilename || 'react-client-manifest.json';
    this.serverConsumerManifestFilename =
      options.serverConsumerManifestFilename || 'react-ssr-manifest.json';
  }

  apply(compiler: any) {
    const _this = this;
    let resolvedClientReferences;
    let clientFileNameFound = false;

    // Find all client files on the file system
    compiler.hooks.beforeCompile.tapAsync(
      PLUGIN_NAME,
      ({contextModuleFactory}, callback) => {
        const contextResolver = compiler.resolverFactory.get('context', {});
        const normalResolver = compiler.resolverFactory.get('normal');

        _this.resolveAllClientFiles(
          compiler.context,
          contextResolver,
          normalResolver,
          compiler.inputFileSystem,
          contextModuleFactory,
          function (err, resolvedClientRefs) {
            if (err) {
              callback(err);
              return;
            }

            resolvedClientReferences = resolvedClientRefs;
            callback();
          },
        );
      },
    );

    compiler.hooks.thisCompilation.tap(
      PLUGIN_NAME,
      (compilation, {normalModuleFactory}) => {
        compilation.dependencyFactories.set(
          ClientReferenceDependency,
          normalModuleFactory,
        );
        compilation.dependencyTemplates.set(
          ClientReferenceDependency,
          new NullDependency.Template(),
        );

        // $FlowFixMe[missing-local-annot]
        const handler = parser => {
          // We need to add all client references as dependency of something in the graph so
          // Webpack knows which entries need to know about the relevant chunks and include the
          // map in their runtime. The things that actually resolves the dependency is the Flight
          // client runtime. So we add them as a dependency of the Flight client runtime.
          // Anything that imports the runtime will be made aware of these chunks.
          parser.hooks.program.tap(PLUGIN_NAME, () => {
            const module = parser.state.module;

            if (module.resource !== clientFileName) {
              return;
            }

            clientFileNameFound = true;

            if (resolvedClientReferences) {
              // $FlowFixMe[incompatible-use] found when upgrading Flow
              for (let i = 0; i < resolvedClientReferences.length; i++) {
                // $FlowFixMe[incompatible-use] found when upgrading Flow
                const dep = resolvedClientReferences[i];

                const chunkName = _this.chunkName
                  .replace(/\[index\]/g, '' + i)
                  .replace(/\[request\]/g, Template.toPath(dep.userRequest));

                const block = new AsyncDependenciesBlock(
                  {
                    name: chunkName,
                  },
                  null,
                  dep.request,
                );

                block.addDependency(dep);
                module.addBlock(block);
              }
            }
          });
        };

        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap('HarmonyModulesPlugin', handler);

        normalModuleFactory.hooks.parser
          .for('javascript/esm')
          .tap('HarmonyModulesPlugin', handler);

        normalModuleFactory.hooks.parser
          .for('javascript/dynamic')
          .tap('HarmonyModulesPlugin', handler);
      },
    );

    compiler.hooks.make.tap(PLUGIN_NAME, compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        function () {
          if (clientFileNameFound === false) {
            compilation.warnings.push(
              new WebpackError(
                `Client runtime at ${clientImportName} was not found. React Server Components module map file ${_this.clientManifestFilename} was not created.`,
              ),
            );
            return;
          }

          const configuredCrossOriginLoading =
            compilation.outputOptions.crossOriginLoading;
          const crossOriginMode =
            typeof configuredCrossOriginLoading === 'string'
              ? configuredCrossOriginLoading === 'use-credentials'
                ? configuredCrossOriginLoading
                : 'anonymous'
              : null;

          const resolvedClientFiles = new Set(
            (resolvedClientReferences || []).map(ref => ref.request),
          );

          const clientManifest: {
            [string]: ImportManifestEntry,
          } = {};
          type ServerConsumerModuleMap = {
            [string]: {
              [string]: {specifier: string, name: string},
            },
          };
          const moduleMap: ServerConsumerModuleMap = {};
          const ssrBundleConfig: {
            moduleLoading: {
              prefix: string,
              crossOrigin: string | null,
            },
            moduleMap: ServerConsumerModuleMap,
          } = {
            moduleLoading: {
              prefix: compilation.outputOptions.publicPath || '',
              crossOrigin: crossOriginMode,
            },
            moduleMap,
          };

          // We figure out which files are always loaded by any initial chunk (entrypoint).
          // We use this to filter out chunks that Flight will never need to load
          const emptySet: Set<string> = new Set();
          const runtimeChunkFiles: Set<string> = emptySet;
          compilation.entrypoints.forEach(entrypoint => {
            const runtimeChunk = entrypoint.getRuntimeChunk();
            if (runtimeChunk) {
              runtimeChunk.files.forEach(runtimeFile => {
                runtimeChunkFiles.add(runtimeFile);
              });
            }
          });

          compilation.chunkGroups.forEach(function (chunkGroup) {
            const chunks: Array<string> = [];
            chunkGroup.chunks.forEach(function (c) {
              // eslint-disable-next-line no-for-of-loops/no-for-of-loops
              for (const file of c.files) {
                if (!(file.endsWith('.js') || file.endsWith('.mjs'))) {
                  return;
                }
                if (
                  file.endsWith('.hot-update.js') ||
                  file.endsWith('.hot-update.mjs')
                )
                  return;
                chunks.push(c.id, file);
                break;
              }
            });

            // $FlowFixMe[missing-local-annot]
            function recordModule(id: $FlowFixMe, module) {
              // TODO: Hook into deps instead of the target module.
              // That way we know by the type of dep whether to include.
              // It also resolves conflicts when the same module is in multiple chunks.
              if (!resolvedClientFiles.has(module.resource)) {
                return;
              }

              const href = pathToFileURL(module.resource).href;

              if (href !== undefined) {
                const ssrExports: {
                  [string]: {specifier: string, name: string},
                } = {};

                clientManifest[href] = {
                  id,
                  chunks,
                  name: '*',
                };
                ssrExports['*'] = {
                  specifier: href,
                  name: '*',
                };

                // TODO: If this module ends up split into multiple modules, then
                // we should encode each the chunks needed for the specific export.
                // When the module isn't split, it doesn't matter and we can just
                // encode the id of the whole module. This code doesn't currently
                // deal with module splitting so is likely broken from ESM anyway.
                /*
                clientManifest[href + '#'] = {
                  id,
                  chunks,
                  name: '',
                };
                ssrExports[''] = {
                  specifier: href,
                  name: '',
                };

                const moduleProvidedExports = compilation.moduleGraph
                  .getExportsInfo(module)
                  .getProvidedExports();

                if (Array.isArray(moduleProvidedExports)) {
                  moduleProvidedExports.forEach(function (name) {
                    clientManifest[href + '#' + name] = {
                      id,
                      chunks,
                      name: name,
                    };
                    ssrExports[name] = {
                      specifier: href,
                      name: name,
                    };
                  });
                }
                */

                moduleMap[id] = ssrExports;
              }
            }

            chunkGroup.chunks.forEach(function (chunk) {
              const chunkModules =
                compilation.chunkGraph.getChunkModulesIterable(chunk);

              Array.from(chunkModules).forEach(function (module) {
                const moduleId = compilation.chunkGraph.getModuleId(module);

                recordModule(moduleId, module);
                // If this is a concatenation, register each child to the parent ID.
                if (module.modules) {
                  module.modules.forEach(concatenatedMod => {
                    recordModule(moduleId, concatenatedMod);
                  });
                }
              });
            });
          });

          const clientOutput = JSON.stringify(clientManifest, null, 2);
          compilation.emitAsset(
            _this.clientManifestFilename,
            new sources.RawSource(clientOutput, false),
          );
          const ssrOutput = JSON.stringify(ssrBundleConfig, null, 2);
          compilation.emitAsset(
            _this.serverConsumerManifestFilename,
            new sources.RawSource(ssrOutput, false),
          );
        },
      );
    });
  }

  // This attempts to replicate the dynamic file path resolution used for other wildcard
  // resolution in Webpack is using.
  resolveAllClientFiles(
    context: string,
    contextResolver: any,
    normalResolver: any,
    fs: any,
    contextModuleFactory: any,
    callback: (
      err: null | Error,
      result?: $ReadOnlyArray<ClientReferenceDependency>,
    ) => void,
  ) {
    function hasUseClientDirective(source: string): boolean {
      if (source.indexOf('use client') === -1) {
        return false;
      }
      let body;
      try {
        body = acorn.parse(source, {
          ecmaVersion: '2024',
          sourceType: 'module',
        }).body;
      } catch (x) {
        return false;
      }
      for (let i = 0; i < body.length; i++) {
        const node = body[i];
        if (node.type !== 'ExpressionStatement' || !node.directive) {
          break;
        }
        if (node.directive === 'use client') {
          return true;
        }
      }
      return false;
    }

    asyncLib.map(
      this.clientReferences,
      (
        clientReferencePath: string | ClientReferenceSearchPath,
        cb: (
          err: null | Error,
          result?: $ReadOnlyArray<ClientReferenceDependency>,
        ) => void,
      ): void => {
        if (typeof clientReferencePath === 'string') {
          cb(null, [new ClientReferenceDependency(clientReferencePath)]);
          return;
        }
        const clientReferenceSearch: ClientReferenceSearchPath =
          clientReferencePath;
        contextResolver.resolve(
          {},
          context,
          clientReferencePath.directory,
          {},
          (err, resolvedDirectory) => {
            if (err) return cb(err);
            const options = {
              resource: resolvedDirectory,
              resourceQuery: '',
              recursive:
                clientReferenceSearch.recursive === undefined
                  ? true
                  : clientReferenceSearch.recursive,
              regExp: clientReferenceSearch.include,
              include: undefined,
              exclude: clientReferenceSearch.exclude,
            };
            contextModuleFactory.resolveDependencies(
              fs,
              options,
              (err2: null | Error, deps: Array<any /*ModuleDependency*/>) => {
                if (err2) return cb(err2);

                const clientRefDeps = deps.map(dep => {
                  // use userRequest instead of request. request always end with undefined which is wrong
                  const request = join(resolvedDirectory, dep.userRequest);
                  const clientRefDep = new ClientReferenceDependency(request);
                  clientRefDep.userRequest = dep.userRequest;
                  return clientRefDep;
                });

                asyncLib.filter(
                  clientRefDeps,
                  (
                    clientRefDep: ClientReferenceDependency,
                    filterCb: (err: null | Error, truthValue: boolean) => void,
                  ) => {
                    normalResolver.resolve(
                      {},
                      context,
                      clientRefDep.request,
                      {},
                      (err3: null | Error, resolvedPath: mixed) => {
                        if (err3 || typeof resolvedPath !== 'string') {
                          return filterCb(null, false);
                        }
                        fs.readFile(
                          resolvedPath,
                          'utf-8',
                          (err4: null | Error, content: string) => {
                            if (err4 || typeof content !== 'string') {
                              return filterCb(null, false);
                            }
                            const useClient = hasUseClientDirective(content);
                            filterCb(null, useClient);
                          },
                        );
                      },
                    );
                  },
                  cb,
                );
              },
            );
          },
        );
      },
      (
        err: null | Error,
        result: $ReadOnlyArray<$ReadOnlyArray<ClientReferenceDependency>>,
      ): void => {
        if (err) return callback(err);
        const flat: Array<any> = [];
        for (let i = 0; i < result.length; i++) {
          // $FlowFixMe[method-unbinding]
          flat.push.apply(flat, result[i]);
        }
        callback(null, flat);
      },
    );
  }
}
