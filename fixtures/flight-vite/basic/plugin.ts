import {
  defaultServerConditions,
  EnvironmentModuleNode,
  Rollup,
  RunnableDevEnvironment,
  parseAstAsync,
  type Plugin,
  type ResolvedConfig,
  type ViteDevServer,
  DevEnvironment,
  isCSSRequest,
} from 'vite';
import {createRequestListener} from '@mjackson/node-fetch-server';
import path from 'node:path';
import type {ModuleRunner} from 'vite/module-runner';
import assert from 'node:assert';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {normalizeViteImportAnalysisUrl} from './vite-utils';
import {transformWrapExport} from './transforms/wrap';
import {transformProxyExport} from './transforms/proxy';

// global state for build orchestration and dev runtimes.
// this plugin assumes server code runs on the same node runtime as vite cli process,
// but framework can do differently, for example, to run ssr/rsc environment on Cloudflare worker environment.
let clientReferences: Record<string, string> = {};
let serverReferences: Record<string, string> = {};
let server: ViteDevServer;
let config: ResolvedConfig;
let viteSsrRunner: ModuleRunner;
let viteRscRunner: ModuleRunner;

export default function vitePluginRsc(rscOptions: {
  entries: {
    browser: string;
    rsc: string;
    ssr: string;
  };
}): Plugin[] {
  return [
    {
      //
      // basic environment configuration
      //
      name: 'rsc',
      config() {
        return {
          appType: 'custom',
          environments: {
            client: {
              build: {
                manifest: true,
                outDir: 'dist/client',
                rollupOptions: {
                  input: {index: 'virtual:vite-rsc/browser-entry'},
                },
              },
              optimizeDeps: {
                include: [
                  'react-dom/client',
                  'react-server-dom-vite/client.browser',
                ],
              },
            },
            ssr: {
              build: {
                outDir: 'dist/ssr',
                rollupOptions: {
                  input: {index: rscOptions.entries.ssr},
                },
              },
            },
            rsc: {
              resolve: {
                conditions: ['react-server', ...defaultServerConditions],
                noExternal: ['react', 'react-dom', 'react-server-dom-vite'],
              },
              optimizeDeps: {
                include: [
                  'react',
                  'react/jsx-runtime',
                  'react/jsx-dev-runtime',
                  'react-server-dom-vite/server.edge',
                  'react-server-dom-vite/client.edge',
                ],
              },
              build: {
                outDir: 'dist/rsc',
                rollupOptions: {
                  input: {index: rscOptions.entries.rsc},
                },
              },
            },
          },
          builder: {
            sharedPlugins: true,
            async buildApp(builder) {
              // pre-pass build to scan client/server references.
              // this can reach only environment transitions up-to 3 hops
              // (server -> "use client" -> "use server" -> "use client").
              builder.environments.rsc!.config.build.write = false;
              builder.environments.ssr.config.build.write = false;
              await builder.build(builder.environments.rsc!);
              await builder.build(builder.environments.ssr!);
              builder.environments.rsc!.config.build.write = true;
              builder.environments.ssr.config.build.write = true;

              await builder.build(builder.environments.rsc!);
              await builder.build(builder.environments.client!);
              await builder.build(builder.environments.ssr!);
            },
          },
        };
      },
      configResolved(config_) {
        config = config_;
      },
      configureServer(server_) {
        server = server_;
        viteSsrRunner = (server.environments.ssr as RunnableDevEnvironment)
          .runner;
        viteRscRunner = (server.environments.rsc as RunnableDevEnvironment)
          .runner;
        (globalThis as any).__viteSsrRunner = viteSsrRunner;

        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              const mod = await viteRscRunner.import(rscOptions.entries.rsc);
              createRequestListener(mod.default)(req, res);
            } catch (e) {
              next(e);
            }
          });
        };
      },
      async configurePreviewServer(server) {
        const mod = await import(
          /* @vite-ignore */ path.resolve(`dist/rsc/index.js`)
        );
        const handler = createRequestListener(mod.default);

        // disable compressions since it breaks html streaming
        // https://github.com/vitejs/vite/blob/9f5c59f07aefb1756a37bcb1c0aff24d54288950/packages/vite/src/node/preview.ts#L178
        server.middlewares.use((req, _res, next) => {
          delete req.headers['accept-encoding'];
          next();
        });

        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              handler(req, res);
            } catch (e) {
              next(e);
            }
          });
        };
      },
      async hotUpdate(ctx) {
        if (isCSSRequest(ctx.file)) return;

        const ids = ctx.modules.map(mod => mod.id).filter(v => v !== null);
        if (ids.length === 0) return;

        // Check updates in server module graph other than client references
        // and send it to browser for refetching rsc.
        // Client reference update is handled by browser on its own.
        const cliendIds = new Set(Object.values(clientReferences));
        const isClientReference = ids.some(id => cliendIds.has(id));
        if (!isClientReference) {
          if (this.environment.name === 'rsc') {
            ctx.server.environments.client.hot.send({
              type: 'custom',
              event: 'rsc:update',
              data: {
                file: ctx.file,
              },
            });
          }
        }
      },
    },
    {
      //
      // virtual module to allow rsc environment to access ssr environment
      //
      name: 'rsc:virtual:vite-rsc/import-ssr',
      resolveId(source) {
        if (source === 'virtual:vite-rsc/import-ssr') {
          return {
            id: `\0` + source,
            // externalize `dist/rsc/...` import as relative path in ssr build
            external: this.environment.mode === 'build',
          };
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc/import-ssr') {
          assert(this.environment.mode === 'dev');
          return `export default () => __viteSsrRunner.import(${JSON.stringify(rscOptions.entries.ssr)})`;
        }
      },
      renderChunk(code, chunk) {
        if (code.includes('\0virtual:vite-rsc/import-ssr')) {
          const replacement = path.relative(
            path.join(
              this.environment.config.build.outDir,
              chunk.fileName,
              '..',
            ),
            path.join(config.environments.ssr.build.outDir, 'index.js'),
          );
          code = code.replace('\0virtual:vite-rsc/import-ssr', replacement);
          return {code};
        }
        return;
      },
    },
    createVirtualPlugin('vite-rsc/browser-entry', function () {
      let code = '';
      code += `import "virtual:vite-rsc/rsc-css-browser";\n`;
      if (this.environment.mode === 'dev') {
        // ensure react hmr globas before running user react code
        code += `
					import RefreshRuntime from "/@react-refresh";
					RefreshRuntime.injectIntoGlobalHook(window);
					window.$RefreshReg$ = () => {};
					window.$RefreshSig$ = () => (type) => type;
					window.__vite_plugin_react_preamble_installed__ = true;
					await import(${JSON.stringify(rscOptions.entries.browser)});
				`;
      } else {
        code += `import ${JSON.stringify(rscOptions.entries.browser)};\n`;
      }
      return code;
    }),
    {
      //
      // virtual module to allow ssr/rsc environments to access browser asset urls
      //
      name: 'rsc:virtual:vite-rsc/assets-manifest',
      resolveId(source) {
        if (source === 'virtual:vite-rsc/assets-manifest') {
          return {
            id: `\0` + source,
            external: this.environment.mode === 'build',
          };
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc/assets-manifest') {
          assert(this.environment.name !== 'client');
          const manifest: AssetsManifest = {
            entry: {
              bootstrapModules: [
                assetsURL('@id/__x00__virtual:vite-rsc/browser-entry'),
              ],
              deps: {
                js: [],
                css: [],
              },
            },
            clientReferenceDeps: {},
          };
          return `export default ${JSON.stringify(manifest, null, 2)}`;
        }
      },
      // client build
      generateBundle(_options, bundle) {
        if (this.environment.name === 'client') {
          const assetDeps = collectAssetDeps(bundle);
          const clientReferenceDeps: Record<string, AssetDeps> = {};
          for (const [key, id] of Object.entries(clientReferences)) {
            const deps = assetDeps[id]?.deps ?? {js: [], css: []};
            clientReferenceDeps[key] = {
              js: deps.js.map(href => assetsURL(href)),
              css: deps.css.map(href => assetsURL(href)),
            };
          }
          const entry = assetDeps['\0virtual:vite-rsc/browser-entry']!;
          const manifest: AssetsManifest = {
            entry: {
              bootstrapModules: [assetsURL(entry.chunk.fileName)],
              deps: {
                js: entry.deps.js.map(href => assetsURL(href)),
                css: entry.deps.css.map(href => assetsURL(href)),
              },
            },
            clientReferenceDeps,
          };
          this.emitFile({
            type: 'asset',
            fileName: '__vite_rsc_assets_manifest.js',
            source: `export default ${JSON.stringify(manifest, null, 2)}`,
          });
        }
      },
      // non-client builds can load assets manifest as external
      renderChunk(code, chunk) {
        if (code.includes('\0virtual:vite-rsc/assets-manifest')) {
          assert(this.environment.name !== 'client');
          const replacement = path.relative(
            path.join(
              this.environment.config.build.outDir,
              chunk.fileName,
              '..',
            ),
            path.join(
              config.environments.client!.build.outDir,
              '__vite_rsc_assets_manifest.js',
            ),
          );
          code = code.replace(
            '\0virtual:vite-rsc/assets-manifest',
            replacement,
          );
          return {code};
        }
        return;
      },
    },
    {
      // make `AsyncLocalStorage` available globally for React request context on edge build
      // (e.g. React.cache, ssr preload)
      name: 'inject-async-local-storage',
      async configureServer() {
        const __viteRscAyncHooks = await import('node:async_hooks');
        (globalThis as any).AsyncLocalStorage =
          __viteRscAyncHooks.AsyncLocalStorage;
      },
      banner(chunk) {
        if (
          (this.environment.name === 'ssr' ||
            this.environment.name === 'rsc') &&
          this.environment.mode === 'build' &&
          chunk.isEntry
        ) {
          return `\
						import * as __viteRscAyncHooks from "node:async_hooks";
						globalThis.AsyncLocalStorage = __viteRscAyncHooks.AsyncLocalStorage;
					`;
        }
        return '';
      },
    },
    {
      // inject dynamic import last to avoid Vite adding `?import` query to client references
      // TODO: we should fix https://github.com/vitejs/vite/pull/14866
      name: 'rsc:patch-browser-raw-import',
      transform: {
        order: 'post',
        handler(code) {
          if (code.includes('__vite_rsc_raw_import__')) {
            return code.replace('__vite_rsc_raw_import__', 'import');
          }
        },
      },
    },
    ...vitePluginUseClient({clientReferences}),
    ...vitePluginUseServer({serverReferences}),
    ...vitePluginFindSourceMapURL({endpoint: '/__vite_rsc_source_map'}),
    ...vitePluginRscCss({entries: rscOptions.entries}),
  ];
}

//
// use client / server transforms
//

function vitePluginUseClient({
  clientReferences,
}: {
  clientReferences: Record<string, string>;
}): Plugin[] {
  return [
    {
      name: 'use-client-transform',
      async transform(code, id) {
        if (this.environment.name === 'rsc') {
          if (code.includes('use client')) {
            const ast = await parseAstAsync(code);
            const referenceKey = normalizeReferenceId(id, 'client');
            const result = transformProxyExport(ast, {
              directive: 'use client',
              code,
              runtime: name =>
                `$$register({}, ${JSON.stringify(referenceKey)}, ${JSON.stringify(name)})`,
            });
            if (!result) return;
            clientReferences[referenceKey] = id;
            const {output} = result;
            output.prepend(
              `import { registerClientReference as $$register } from "react-server-dom-vite/server.edge";\n`,
            );
            return {code: output.toString(), map: {mappings: ''}};
          }
        }
      },
    },
    createVirtualPlugin('vite-rsc/client-references', function () {
      if (this.environment.mode === 'dev') {
        return `export default {}`;
      }
      const code = generateDynamicImportCode(clientReferences);
      return {code, map: null};
    }),
  ];
}

function vitePluginUseServer({
  serverReferences,
}: {
  serverReferences: Record<string, string>;
}): Plugin[] {
  return [
    {
      name: 'use-server-transform',
      async transform(code, id) {
        if (code.includes('use server')) {
          const ast = await parseAstAsync(code);
          const referenceKey = normalizeReferenceId(id, 'rsc');
          if (this.environment.name === 'rsc') {
            const result = transformWrapExport(ast, {
              directive: 'use server',
              code,
              runtime: (value, name) =>
                `$$register(${value}, ${JSON.stringify(referenceKey)}, ${JSON.stringify(name)})`,
            });
            if (!result) return;
            const output = result?.output;
            serverReferences[referenceKey] = id;
            output.prepend(
              `import { registerServerReference as $$register } from "react-server-dom-vite/server.edge";\n`,
            );
            return {
              code: output.toString(),
              map: output.generateMap({hires: 'boundary'}),
            };
          } else {
            const result = transformProxyExport(ast, {
              directive: 'use server',
              code,
              runtime: name =>
                `$$register(` +
                `${JSON.stringify(referenceKey + '#' + name)},` +
                `$$callServer, ` +
                `undefined, ` +
                `$$findSourceMapURL, ` +
                `${JSON.stringify(name)})`,
            });
            if (!result) return;
            const output = result.output;
            serverReferences[referenceKey] = id;
            const isBrowser = this.environment.name === 'client';
            output.prepend(
              `import { createServerReference as $$register } from "react-server-dom-vite/client.${isBrowser ? 'browser' : 'edge'}";\n` +
                `import { callServer as $$callServer, findSourceMapURL as $$findSourceMapURL } from "/basic/${isBrowser ? 'browser' : 'ssr'}";\n`,
            );
            return {
              code: output.toString(),
              map: output.generateMap({hires: 'boundary'}),
            };
          }
        }
      },
    },
    createVirtualPlugin('vite-rsc/server-references', function () {
      if (this.environment.mode === 'dev') {
        return `export default {}`;
      }
      const code = generateDynamicImportCode(serverReferences);
      return {code, map: null};
    }),
  ];
}

function hashString(v: string) {
  return createHash('sha256').update(v).digest().toString('hex').slice(0, 12);
}

function normalizeReferenceId(id: string, name: 'client' | 'rsc') {
  // build
  if (config.command === 'build') {
    return hashString(path.relative(config.root, id));
  }

  // dev
  // align with how Vite import analysis would rewrite id
  const environment = server.environments[name]!;
  return normalizeViteImportAnalysisUrl(environment, id);
}

function createVirtualPlugin(name: string, load: Plugin['load']) {
  name = 'virtual:' + name;
  return {
    name: `rsc:virtual-${name}`,
    resolveId(source, _importer, _options) {
      return source === name ? '\0' + name : undefined;
    },
    load(id, options) {
      if (id === '\0' + name) {
        return (load as Function).apply(this, [id, options]);
      }
    },
  } satisfies Plugin;
}

function generateDynamicImportCode(map: Record<string, string>) {
  let code = Object.entries(map)
    .map(
      ([key, id]) =>
        `${JSON.stringify(key)}: () => import(${JSON.stringify(id)}),`,
    )
    .join('\n');
  return `export default {${code}};\n`;
}

//
// collect client reference dependency chunk for modulepreload
//

export type AssetsManifest = {
  entry: {bootstrapModules: string[]; deps: AssetDeps};
  clientReferenceDeps: Record<string, AssetDeps>;
};

export type AssetDeps = {
  js: string[];
  css: string[];
};

function collectAssetDeps(bundle: Rollup.OutputBundle) {
  const map: Record<string, {chunk: Rollup.OutputChunk; deps: AssetDeps}> = {};
  for (const chunk of Object.values(bundle)) {
    if (chunk.type === 'chunk' && chunk.facadeModuleId) {
      map[chunk.facadeModuleId] = {
        chunk,
        deps: collectAssetDepsInner(chunk.fileName, bundle),
      };
    }
  }
  return map;
}

function collectAssetDepsInner(
  fileName: string,
  bundle: Rollup.OutputBundle,
): AssetDeps {
  const visited = new Set<string>();
  const css: string[] = [];

  function recurse(k: string) {
    if (visited.has(k)) return;
    visited.add(k);
    const v = bundle[k];
    assert(v);
    if (v.type === 'chunk') {
      css.push(...(v.viteMetadata?.importedCss ?? []));
      for (const k2 of v.imports) {
        recurse(k2);
      }
    }
  }

  recurse(fileName);
  return {
    js: [...visited],
    css: [...new Set(css)],
  };
}

//
// findSourceMapURL support
// https://github.com/facebook/react/pull/29708
// https://github.com/facebook/react/pull/30741
//

function vitePluginFindSourceMapURL({endpoint}: {endpoint: string}): Plugin[] {
  return [
    {
      name: 'rsc:findSourceMapURL',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url!, `http://localhost`);
          if (url.pathname === endpoint) {
            let filename = url.searchParams.get('filename')!;
            let environmentName = url.searchParams.get('environmentName')!;
            try {
              const map = await findSourceMapURL(
                server,
                filename,
                environmentName,
              );
              res.setHeader('content-type', 'application/json');
              if (!map) res.statusCode = 404;
              res.end(JSON.stringify(map ?? {}));
            } catch (e) {
              next(e);
            }
            return;
          }
          next();
        });
      },
    },
  ];
}

async function findSourceMapURL(
  server: ViteDevServer,
  filename: string,
  environmentName: string,
): Promise<object | undefined> {
  // this is likely server external (i.e. outside of Vite processing)
  if (filename.startsWith('file://')) {
    filename = fileURLToPath(filename);
    if (fs.existsSync(filename)) {
      // line-by-line identity source map
      const content = fs.readFileSync(filename, 'utf-8');
      return {
        version: 3,
        sources: [filename],
        sourcesContent: [content],
        mappings: 'AAAA' + ';AACA'.repeat(content.split('\n').length),
      };
    }
    return;
  }

  // server component stack, replace log, `registerServerReference`, etc...
  let mod: EnvironmentModuleNode | undefined;
  let map:
    | NonNullable<EnvironmentModuleNode['transformResult']>['map']
    | undefined;
  if (environmentName === 'Server') {
    mod = server.environments.rsc!.moduleGraph.getModuleById(filename);
    // React extracts stacktrace via resetting `prepareStackTrace` on the server
    // and let browser devtools handle the mapping.
    // https://github.com/facebook/react/blob/4a36d3eab7d9bbbfae62699989aa95e5a0297c16/packages/react-server/src/ReactFlightStackConfigV8.js#L15-L20
    // This means it has additional +2 line offset due to Vite's module runner
    // function wrapper. We need to correct it just like Vite handles it internally.
    // https://github.com/vitejs/vite/blob/d94e7b25564abb81ab7b921d4cd44d0f0d22fec4/packages/vite/src/shared/utils.ts#L58-L69
    // https://github.com/vitejs/vite/blob/d94e7b25564abb81ab7b921d4cd44d0f0d22fec4/packages/vite/src/node/ssr/fetchModule.ts#L142-L146
    map = mod?.transformResult?.map;
    if (map && map.mappings) {
      map = {...map, mappings: (';;' + map.mappings) as any};
    }
  }

  const base = server.config.base.slice(0, -1);

  // `createServerReference(... findSourceMapURL ...)` called on browser
  if (environmentName === 'Client') {
    try {
      const url = new URL(filename).pathname.slice(base.length);
      mod = server.environments.client.moduleGraph.urlToModuleMap.get(url);
      map = mod?.transformResult?.map;
    } catch (e) {}
  }

  if (mod && map) {
    // fix sources to match Vite's module url on browser
    return {...map, sources: [base + mod.url]};
  }
}

//
// css support
// - code split for each client reference
// - single bundle for rsc environment
//

export function vitePluginRscCss({
  entries,
}: {
  entries: {rsc: string};
}): Plugin[] {
  function collectCss(environment: DevEnvironment, entryId: string) {
    const visited = new Set<string>();
    const cssIds = new Set<string>();

    function recurse(id: string) {
      if (visited.has(id)) {
        return;
      }
      visited.add(id);
      const mod = environment.moduleGraph.getModuleById(id);
      for (const next of mod?.importedModules ?? []) {
        if (next.id) {
          if (isCSSRequest(next.id)) {
            cssIds.add(next.id);
          } else {
            recurse(next.id);
          }
        }
      }
    }

    recurse(entryId);

    const hrefs = [...cssIds].map(id =>
      normalizeViteImportAnalysisUrl(server.environments.client, id),
    );
    return {ids: [...cssIds], hrefs};
  }

  async function collectCssByUrl(
    environment: DevEnvironment,
    entryUrl: string,
  ) {
    const entryMod = await environment.moduleGraph.getModuleByUrl(entryUrl);
    return collectCss(environment, entryMod!.id!);
  }

  function invalidateModule(environment: DevEnvironment, id: string) {
    const mod = environment.moduleGraph.getModuleById(id);
    if (mod) {
      environment.moduleGraph.invalidateModule(mod);
    }
  }

  // collect during rsc build and pass it to browser build.
  const rscCssIdsBuild = new Set<string>();

  return [
    {
      name: 'rsc:css',
      hotUpdate(ctx) {
        if (this.environment.name === 'rsc' && ctx.modules.length > 0) {
          // simple virtual invalidation to ensure fresh css list
          invalidateModule(
            server.environments.ssr,
            '\0virtual:vite-rsc/css/rsc',
          );
          invalidateModule(
            server.environments.client,
            '\0virtual:vite-rsc/rsc-css-browser',
          );
        }
      },
      transform(_code, id) {
        if (
          this.environment.mode === 'build' &&
          this.environment.name === 'rsc'
        ) {
          if (isCSSRequest(id)) {
            rscCssIdsBuild.add(id);
          }
        }
      },
    },
    createVirtualPlugin('vite-rsc/rsc-css', async function () {
      assert(this.environment.name === 'rsc');
      if (this.environment.mode === 'build') {
        // during build, css are injected through AssetsManifest.entry.deps.css
        return `export default []`;
      }
      const result = await collectCssByUrl(
        server.environments.rsc!,
        entries.rsc,
      );
      const hrefs = result.hrefs.map(href => assetsURL(href.slice(1)));
      return `export default ${JSON.stringify(hrefs, null, 2)}`;
    }),
    createVirtualPlugin('vite-rsc/rsc-css-browser', async function () {
      assert(this.environment.name === 'client');
      let ids: string[];
      if (this.environment.mode === 'build') {
        ids = [...rscCssIdsBuild];
      } else {
        const collected = await collectCssByUrl(
          server.environments.rsc!,
          entries.rsc,
        );
        ids = collected.ids;
      }
      ids = ids.map(id => id.replace(/^\0/, ''));
      return ids.map(id => `import ${JSON.stringify(id)};\n`).join('');
    }),
    {
      name: 'rsc:css/dev-ssr-virtual',
      resolveId(source) {
        if (source.startsWith('virtual:vite-rsc/css/dev-ssr/')) {
          return '\0' + source;
        }
      },
      async load(id) {
        if (id.startsWith('\0virtual:vite-rsc/css/dev-ssr/')) {
          id = id.slice('\0virtual:vite-rsc/css/dev-ssr/'.length);
          const mod =
            await server.environments.ssr.moduleGraph.getModuleByUrl(id);
          if (!mod?.id || !mod?.file) {
            return `export default []`;
          }
          const result = collectCss(server.environments.ssr, mod.id);
          // invalidate virtual module on file change to reflect added/deleted css import
          this.addWatchFile(mod.file);
          const hrefs = result.hrefs.map(href => assetsURL(href.slice(1)));
          return `export default ${JSON.stringify(hrefs)}`;
        }
      },
    },
  ];
}

// // https://github.com/vitejs/vite/blob/2a7473cfed96237711cda9f736465c84d442ddef/packages/vite/src/node/plugins/importAnalysisBuild.ts#L222-L230
function assetsURL(url: string) {
  return config.base + url;
}
