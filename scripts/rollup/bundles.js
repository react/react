'use strict';

const RELEASE_CHANNEL = process.env.RELEASE_CHANNEL;

const __EXPERIMENTAL__ =
  typeof RELEASE_CHANNEL === 'string'
    ? RELEASE_CHANNEL === 'experimental'
    : true;

const bundleTypes = {
  NODE_ES2015: 'NODE_ES2015',
  ESM_DEV: 'ESM_DEV',
  ESM_PROD: 'ESM_PROD',
  NODE_DEV: 'NODE_DEV',
  NODE_PROD: 'NODE_PROD',
  NODE_PROFILING: 'NODE_PROFILING',
  BUN_DEV: 'BUN_DEV',
  BUN_PROD: 'BUN_PROD',
  FB_WWW_DEV: 'FB_WWW_DEV',
  FB_WWW_PROD: 'FB_WWW_PROD',
  FB_WWW_PROFILING: 'FB_WWW_PROFILING',
  RN_OSS_DEV: 'RN_OSS_DEV',
  RN_OSS_PROD: 'RN_OSS_PROD',
  RN_OSS_PROFILING: 'RN_OSS_PROFILING',
  RN_FB_DEV: 'RN_FB_DEV',
  RN_FB_PROD: 'RN_FB_PROD',
  RN_FB_PROFILING: 'RN_FB_PROFILING',
  BROWSER_SCRIPT: 'BROWSER_SCRIPT',
  CJS_DTS: 'CJS_DTS',
  ESM_DTS: 'ESM_DTS',
};

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
} = bundleTypes;

const moduleTypes = {
  // React
  ISOMORPHIC: 'ISOMORPHIC',
  // Individual renderers. They bundle the reconciler. (e.g. ReactDOM)
  RENDERER: 'RENDERER',
  // Helper packages that access specific renderer's internals. (e.g. TestUtils)
  RENDERER_UTILS: 'RENDERER_UTILS',
  // Standalone reconciler for third-party renderers.
  RECONCILER: 'RECONCILER',
};

const {ISOMORPHIC, RENDERER, RENDERER_UTILS, RECONCILER} = moduleTypes;

const bundles = [
  /******* Isomorphic *******/
  {
    bundleTypes: [
      NODE_DEV,
      NODE_PROD,
      FB_WWW_DEV,
      FB_WWW_PROD,
      FB_WWW_PROFILING,
      RN_FB_DEV,
      RN_FB_PROD,
      RN_FB_PROFILING,
    ],
    moduleType: ISOMORPHIC,
    entry: 'react',
    global: 'React',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: true,
    externals: ['ReactNativeInternalFeatureFlags'],
  },

  /******* Isomorphic Shared Subset *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'react/src/ReactServer.js',
    name: 'react.react-server',
    condition: 'react-server',
    global: 'React',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: [],
  },

  /******* React JSX Runtime *******/
  {
    bundleTypes: [
      NODE_DEV,
      NODE_PROD,
      NODE_PROFILING,
      // TODO: use on WWW.
      RN_FB_DEV,
      RN_FB_PROD,
      RN_FB_PROFILING,
    ],
    moduleType: ISOMORPHIC,
    entry: 'react/jsx-runtime',
    global: 'JSXRuntime',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'ReactNativeInternalFeatureFlags'],
  },

  /******* Compiler Runtime *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD, NODE_PROFILING],
    moduleType: ISOMORPHIC,
    entry: 'react/compiler-runtime',
    global: 'CompilerRuntime',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React JSX Runtime React Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'react/src/jsx/ReactJSXServer.js',
    name: 'react-jsx-runtime.react-server',
    condition: 'react-server',
    global: 'JSXRuntime',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'ReactNativeInternalFeatureFlags'],
  },

  /******* React JSX DEV Runtime *******/
  {
    bundleTypes: [
      NODE_DEV,
      NODE_PROD,
      NODE_PROFILING,
      FB_WWW_DEV,
      FB_WWW_PROD,
      FB_WWW_PROFILING,
      RN_FB_DEV,
      RN_FB_PROD,
      RN_FB_PROFILING,
    ],
    moduleType: ISOMORPHIC,
    entry: 'react/jsx-dev-runtime',
    global: 'JSXDEVRuntime',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'ReactNativeInternalFeatureFlags'],
  },

  /******* React JSX DEV Runtime React Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'react/src/jsx/ReactJSXServer.js',
    name: 'react-jsx-dev-runtime.react-server',
    condition: 'react-server',
    global: 'JSXDEVRuntime',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'ReactNativeInternalFeatureFlags'],
  },

  /******* React DOM *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-dom',
    global: 'ReactDOM',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: true,
    externals: ['react'],
  },

  /******* React DOM Client *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-dom/client',
    global: 'ReactDOM',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: true,
    externals: ['react', 'react-dom'],
  },

  /******* React DOM Profiling (Client) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROFILING],
    moduleType: RENDERER,
    entry: 'react-dom/profiling',
    global: 'ReactDOM',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: true,
    externals: ['react', 'react-dom'],
  },

  /******* React DOM (www) *******/
  {
    bundleTypes: [FB_WWW_DEV, FB_WWW_PROD, FB_WWW_PROFILING],
    moduleType: RENDERER,
    entry: 'react-dom/src/ReactDOMFB.js',
    global: 'ReactDOM',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: true,
    externals: ['react'],
  },

  /******* React DOM (fbsource) *******/
  {
    bundleTypes: [RN_FB_DEV, RN_FB_PROD, RN_FB_PROFILING],
    moduleType: RENDERER,
    entry: 'react-dom',
    global: 'ReactDOM',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'ReactNativeInternalFeatureFlags'],
  },

  /******* React DOM Client (fbsource) *******/
  {
    bundleTypes: [RN_FB_DEV, RN_FB_PROD, RN_FB_PROFILING],
    moduleType: RENDERER,
    entry: 'react-dom/client',
    global: 'ReactDOMClient',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom', 'ReactNativeInternalFeatureFlags'],
  },

  /******* React DOM Profiling (fbsource) *******/
  {
    bundleTypes: [RN_FB_DEV, RN_FB_PROD, RN_FB_PROFILING],
    moduleType: RENDERER,
    entry: 'react-dom/profiling',
    global: 'ReactDOMProfiling',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: true,
    externals: ['react', 'react-dom', 'ReactNativeInternalFeatureFlags'],
  },

  /******* React DOM Test Utils (fbsource) *******/
  {
    moduleType: RENDERER_UTILS,
    bundleTypes: [RN_FB_DEV, RN_FB_PROD, RN_FB_PROFILING],
    entry: 'react-dom/test-utils',
    global: 'ReactDOMTestUtils',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom', 'ReactNativeInternalFeatureFlags'],
  },

  /******* React DOM React Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-dom/src/ReactDOMReactServer.js',
    name: 'react-dom.react-server',
    condition: 'react-server',
    global: 'ReactDOM',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* Test Utils *******/
  {
    moduleType: RENDERER_UTILS,
    bundleTypes: [NODE_DEV, NODE_PROD],
    entry: 'react-dom/test-utils',
    global: 'ReactTestUtils',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },

  /******* React DOM - Testing *******/
  {
    moduleType: RENDERER,
    bundleTypes: __EXPERIMENTAL__ ? [NODE_DEV, NODE_PROD] : [],
    entry: 'react-dom/unstable_testing',
    global: 'ReactDOMTesting',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },

  /******* React DOM - www - Testing *******/
  {
    moduleType: RENDERER,
    bundleTypes: [FB_WWW_DEV, FB_WWW_PROD],
    entry: 'react-dom/src/ReactDOMTestingFB.js',
    global: 'ReactDOMTesting',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React DOM Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD, FB_WWW_DEV, FB_WWW_PROD],
    moduleType: RENDERER,
    entry: 'react-dom/src/server/ReactDOMLegacyServerBrowser.js',
    name: 'react-dom-server-legacy.browser',
    global: 'ReactDOMServer',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
    babel: opts =>
      Object.assign({}, opts, {
        plugins: opts.plugins.concat([
          [require.resolve('@babel/plugin-transform-classes'), {loose: true}],
        ]),
      }),
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-dom/src/server/ReactDOMLegacyServerNode.js',
    name: 'react-dom-server-legacy.node',
    externals: ['react', 'stream', 'react-dom'],
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    babel: opts =>
      Object.assign({}, opts, {
        plugins: opts.plugins.concat([
          [require.resolve('@babel/plugin-transform-classes'), {loose: true}],
        ]),
      }),
  },

  /******* React DOM Fizz Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-dom/src/server/react-dom-server.browser.js',
    name: 'react-dom-server.browser',
    global: 'ReactDOMServer',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-dom/src/server/react-dom-server.node.js',
    name: 'react-dom-server.node',
    global: 'ReactDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [
      'react',
      'react-dom',
      'async_hooks',
      'crypto',
      'stream',
      'util',
    ],
  },
  {
    bundleTypes: __EXPERIMENTAL__ ? [FB_WWW_DEV, FB_WWW_PROD] : [],
    moduleType: RENDERER,
    entry: 'react-server-dom-fb/src/ReactDOMServerFB.js',
    global: 'ReactDOMServerStreaming',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },

  /******* React DOM Fizz Server Edge *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-dom/src/server/react-dom-server.edge.js',
    name: 'react-dom-server.edge', // 'node_modules/react/*.js',

    global: 'ReactDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },

  /******* React DOM Fizz Server Bun *******/
  {
    bundleTypes: [BUN_DEV, BUN_PROD],
    moduleType: RENDERER,
    entry: 'react-dom/src/server/react-dom-server.bun.js',
    name: 'react-dom-server.bun', // 'node_modules/react/*.js',

    global: 'ReactDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom', 'crypto', 'stream', 'util'],
  },

  /******* React DOM Fizz Server External Runtime *******/
  {
    bundleTypes: __EXPERIMENTAL__ ? [BROWSER_SCRIPT] : [],
    moduleType: RENDERER,
    entry: 'react-dom/unstable_server-external-runtime',
    outputPath: 'unstable_server-external-runtime.js',
    global: 'ReactDOMServerExternalRuntime',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: [],
  },

  /******* React HTML RSC *******/
  {
    bundleTypes: __EXPERIMENTAL__ ? [NODE_DEV, NODE_PROD] : [],
    moduleType: RENDERER,
    entry: 'react-markup/src/ReactMarkupServer.js',
    name: 'react-markup.react-server',
    condition: 'react-server',
    global: 'ReactMarkup',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React HTML Client *******/
  {
    bundleTypes: __EXPERIMENTAL__ ? [NODE_DEV, NODE_PROD] : [],
    moduleType: RENDERER,
    entry: 'react-markup/src/ReactMarkupClient.js',
    name: 'react-markup',
    global: 'ReactMarkup',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React Server DOM Webpack Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry:
      'react-server-dom-webpack/src/server/react-flight-dom-server.browser',
    name: 'react-server-dom-webpack-server.browser',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-webpack/src/server/react-flight-dom-server.node',
    name: 'react-server-dom-webpack-server.node',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [
      'react',
      'react-dom',
      'async_hooks',
      'crypto',
      'stream',
      'util',
    ],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-webpack/src/server/react-flight-dom-server.edge',
    name: 'react-server-dom-webpack-server.edge',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React Server DOM Webpack Client *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry:
      'react-server-dom-webpack/src/client/react-flight-dom-client.browser',
    name: 'react-server-dom-webpack-client.browser',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-webpack/src/client/react-flight-dom-client.node',
    name: 'react-server-dom-webpack-client.node',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom', 'util', 'crypto'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-webpack/src/client/react-flight-dom-client.edge',
    name: 'react-server-dom-webpack-client.edge',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },

  /******* React Server DOM Webpack Plugin *******/
  {
    bundleTypes: [NODE_ES2015],
    moduleType: RENDERER_UTILS,
    entry: 'react-server-dom-webpack/plugin',
    global: 'ReactServerWebpackPlugin',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['fs', 'path', 'url', 'neo-async'],
  },

  /******* React Server DOM Webpack Node.js Loader *******/
  {
    bundleTypes: [ESM_PROD],
    moduleType: RENDERER_UTILS,
    entry: 'react-server-dom-webpack/node-loader',
    condition: 'react-server',
    global: 'ReactServerWebpackNodeLoader',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['acorn'],
  },

  /******* React Server DOM Webpack Node.js CommonJS Loader *******/
  {
    bundleTypes: [NODE_ES2015],
    moduleType: RENDERER_UTILS,
    entry: 'react-server-dom-webpack/src/ReactFlightWebpackNodeRegister',
    name: 'react-server-dom-webpack-node-register',
    condition: 'react-server',
    global: 'ReactFlightWebpackNodeRegister',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['url', 'module', 'react-server-dom-webpack/server'],
  },

  /******* React Server DOM Turbopack Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry:
      'react-server-dom-turbopack/src/server/react-flight-dom-server.browser',
    name: 'react-server-dom-turbopack-server.browser',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-turbopack/src/server/react-flight-dom-server.node',
    name: 'react-server-dom-turbopack-server.node',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [
      'react',
      'react-dom',
      'async_hooks',
      'crypto',
      'stream',
      'util',
    ],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-turbopack/src/server/react-flight-dom-server.edge',
    name: 'react-server-dom-turbopack-server.edge',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React Server DOM Turbopack Client *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry:
      'react-server-dom-turbopack/src/client/react-flight-dom-client.browser',
    name: 'react-server-dom-turbopack-client.browser',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-turbopack/src/client/react-flight-dom-client.node',
    name: 'react-server-dom-turbopack-client.node',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom', 'util'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-turbopack/src/client/react-flight-dom-client.edge',
    name: 'react-server-dom-turbopack-client.edge',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },

  /******* React Server DOM Parcel Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-parcel/src/server/react-flight-dom-server.browser',
    name: 'react-server-dom-parcel-server.browser',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-parcel/src/server/react-flight-dom-server.node',
    name: 'react-server-dom-parcel-server.node',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [
      'react',
      'react-dom',
      'async_hooks',
      'crypto',
      'stream',
      'util',
    ],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-parcel/src/server/react-flight-dom-server.edge',
    name: 'react-server-dom-parcel-server.edge',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },

  /******* React Server DOM Parcel Client *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-parcel/src/client/react-flight-dom-client.browser',
    name: 'react-server-dom-parcel-client.browser',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-parcel/src/client/react-flight-dom-client.node',
    name: 'react-server-dom-parcel-client.node',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom', 'util'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-parcel/src/client/react-flight-dom-client.edge',
    name: 'react-server-dom-parcel-client.edge',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },

  /******* React Server DOM ESM Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-esm/src/server/react-flight-dom-server.node',
    name: 'react-server-dom-esm-server.node',
    condition: 'react-server',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [
      'react',
      'react-dom',
      'async_hooks',
      'crypto',
      'stream',
      'util',
    ],
  },

  /******* React Server DOM ESM Client *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD, ESM_DEV, ESM_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-esm/client.browser',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-esm/client.node',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom', 'util'],
  },

  /******* React Server DOM ESM Node.js Loader *******/
  {
    bundleTypes: [ESM_PROD],
    moduleType: RENDERER_UTILS,
    entry: 'react-server-dom-esm/node-loader',
    condition: 'react-server',
    global: 'ReactServerESMNodeLoader',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['acorn'],
  },

  /******* React Flight Server FB Server *******/
  {
    bundleTypes: [FB_WWW_DEV, FB_WWW_PROD],
    moduleType: RENDERER,
    entry: 'react-flight-server-fb/src/server/react-flight-dom-server.node',
    global: 'ReactFlightServer',
    condition: 'react-server',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom', 'stream'],
  },

  /******* React Flight Client FB *******/
  {
    bundleTypes: [FB_WWW_DEV, FB_WWW_PROD],
    moduleType: RENDERER,
    entry: 'react-flight-server-fb/client.browser',
    global: 'ReactFlightClient',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom'],
  },

  /******* React Server DOM Unbundled Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-unbundled/src/server/react-flight-dom-server.node',
    name: 'react-server-dom-unbundled-server.node',
    condition: 'react-server',
    global: 'ReactServerDOMServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [
      'react',
      'react-dom',
      'async_hooks',
      'crypto',
      'stream',
      'util',
    ],
  },

  /******* React Server DOM Unbundled Client *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-server-dom-unbundled/src/client/react-flight-dom-client.node',
    name: 'react-server-dom-unbundled-client.node',
    global: 'ReactServerDOMClient',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'react-dom', 'util', 'crypto'],
  },

  /******* React Server DOM Unbundled Node.js Loader *******/
  {
    bundleTypes: [ESM_PROD],
    moduleType: RENDERER_UTILS,
    entry: 'react-server-dom-unbundled/node-loader',
    condition: 'react-server',
    global: 'ReactServerUnbundledNodeLoader',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['acorn'],
  },

  /******* React Server DOM Unbundled Node.js CommonJS Loader *******/
  {
    bundleTypes: [NODE_ES2015],
    moduleType: RENDERER_UTILS,
    entry: 'react-server-dom-unbundled/src/ReactFlightUnbundledNodeRegister',
    name: 'react-server-dom-unbundled-node-register',
    condition: 'react-server',
    global: 'ReactFlightUnbundledNodeRegister',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['url', 'module', 'react-server-dom-unbundled/server'],
  },

  /******* React Suspense Test Utils *******/
  {
    bundleTypes: [NODE_ES2015],
    moduleType: RENDERER_UTILS,
    entry: 'react-suspense-test-utils',
    global: 'ReactSuspenseTestUtils',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React ART *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD, FB_WWW_DEV, FB_WWW_PROD],
    moduleType: RENDERER,
    entry: 'react-art',
    global: 'ReactART',
    externals: ['react'],
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: true,
    babel: opts =>
      Object.assign({}, opts, {
        // Include JSX
        presets: opts.presets.concat([
          require.resolve('@babel/preset-react'),
          require.resolve('@babel/preset-flow'),
        ]),
        plugins: opts.plugins.concat([
          [require.resolve('@babel/plugin-transform-classes'), {loose: true}],
        ]),
      }),
  },

  /******* React Native Fabric *******/
  {
    bundleTypes: __EXPERIMENTAL__
      ? []
      : [RN_FB_DEV, RN_FB_PROD, RN_FB_PROFILING],
    moduleType: RENDERER,
    entry: 'react-native-renderer/fabric',
    global: 'ReactFabric',
    externals: ['react-native', 'ReactNativeInternalFeatureFlags'],
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: true,
    babel: opts =>
      Object.assign({}, opts, {
        plugins: opts.plugins.concat([
          [require.resolve('@babel/plugin-transform-classes'), {loose: true}],
        ]),
      }),
  },
  {
    bundleTypes: [RN_OSS_DEV, RN_OSS_PROD, RN_OSS_PROFILING],
    moduleType: RENDERER,
    entry: 'react-native-renderer/fabric',
    global: 'ReactFabric',
    // ReactNativeInternalFeatureFlags temporary until we land enableRemoveConsolePatches.
    // Needs to be done before the next RN OSS release.
    externals: ['react-native', 'ReactNativeInternalFeatureFlags'],
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: true,
    babel: opts =>
      Object.assign({}, opts, {
        plugins: opts.plugins.concat([
          [require.resolve('@babel/plugin-transform-classes'), {loose: true}],
        ]),
      }),
  },

  /******* React Test Renderer *******/
  {
    bundleTypes: [
      FB_WWW_DEV,
      NODE_DEV,
      NODE_PROD,
      RN_FB_DEV,
      RN_FB_PROD,
      RN_FB_PROFILING,
    ],
    moduleType: RENDERER,
    entry: 'react-test-renderer',
    global: 'ReactTestRenderer',
    externals: [
      'react',
      'scheduler',
      'scheduler/unstable_mock',
      'ReactNativeInternalFeatureFlags',
    ],
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    babel: opts =>
      Object.assign({}, opts, {
        plugins: opts.plugins.concat([
          [require.resolve('@babel/plugin-transform-classes'), {loose: true}],
        ]),
      }),
  },

  /******* React Noop Renderer (used for tests) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-noop-renderer',
    global: 'ReactNoopRenderer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'scheduler', 'scheduler/unstable_mock', 'expect'],
  },

  /******* React Noop Persistent Renderer (used for tests) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-noop-renderer/persistent',
    global: 'ReactNoopRendererPersistent',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'scheduler', 'expect'],
  },

  /******* React Noop Server Renderer (used for tests) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-noop-renderer/server',
    global: 'ReactNoopRendererServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'scheduler', 'expect'],
  },

  /******* React Noop Flight Server (used for tests) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-noop-renderer/flight-server',
    condition: 'react-server',
    global: 'ReactNoopFlightServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [
      'react',
      'scheduler',
      'expect',
      'react-noop-renderer/flight-modules',
    ],
  },

  /******* React Noop Flight Client (used for tests) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RENDERER,
    entry: 'react-noop-renderer/flight-client',
    global: 'ReactNoopFlightClient',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [
      'react',
      'scheduler',
      'expect',
      'react-noop-renderer/flight-modules',
    ],
  },

  /******* React Reconciler *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD, NODE_PROFILING, FB_WWW_DEV, FB_WWW_PROD],
    moduleType: RECONCILER,
    entry: 'react-reconciler',
    global: 'ReactReconciler',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RECONCILER,
    entry: 'react-server',
    global: 'ReactServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React Flight Server *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RECONCILER,
    entry: 'react-server/flight',
    condition: 'react-server',
    global: 'ReactFlightServer',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* React Flight Client *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: RECONCILER,
    entry: 'react-client/flight',
    global: 'ReactFlightClient',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['react'],
  },

  /******* Reconciler Reflection *******/
  {
    moduleType: RENDERER_UTILS,
    bundleTypes: [NODE_DEV, NODE_PROD],
    entry: 'react-reconciler/reflection',
    global: 'ReactFiberTreeReflection',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: [],
  },

  /******* Reconciler Constants *******/
  {
    moduleType: RENDERER_UTILS,
    bundleTypes: [NODE_DEV, NODE_PROD, FB_WWW_DEV, FB_WWW_PROD],
    entry: 'react-reconciler/constants',
    global: 'ReactReconcilerConstants',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: [],
  },

  /******* React Is *******/
  {
    bundleTypes: [
      NODE_DEV,
      NODE_PROD,
      FB_WWW_DEV,
      FB_WWW_PROD,
      RN_FB_DEV,
      RN_FB_PROD,
      RN_FB_PROFILING,
    ],
    moduleType: ISOMORPHIC,
    entry: 'react-is',
    global: 'ReactIs',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: ['ReactNativeInternalFeatureFlags'],
  },

  /******* React Debug Tools *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'react-debug-tools',
    global: 'ReactDebugTools',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [],
  },

  /******* React Cache (experimental, old) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD, FB_WWW_DEV, FB_WWW_PROD],
    moduleType: ISOMORPHIC,
    entry: 'react-cache',
    global: 'ReactCacheOld',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'scheduler'],
  },

  /******* Hook for managing subscriptions safely *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'use-subscription',
    global: 'useSubscription',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: true,
    externals: ['react'],
  },

  /******* useSyncExternalStore *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'use-sync-external-store',
    global: 'useSyncExternalStore',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: true,
    externals: ['react'],
  },

  /******* useSyncExternalStore (shim) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'use-sync-external-store/shim',
    global: 'useSyncExternalStore',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: true,
    externals: ['react'],
  },

  /******* useSyncExternalStore (shim, native) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'use-sync-external-store/shim/index.native',
    global: 'useSyncExternalStore',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: true,
    externals: ['react'],
  },

  /******* useSyncExternalStoreWithSelector *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'use-sync-external-store/with-selector',
    global: 'useSyncExternalStoreWithSelector',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: true,
    externals: ['react'],
  },

  /******* useSyncExternalStoreWithSelector (shim) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'use-sync-external-store/shim/with-selector',
    global: 'useSyncExternalStoreWithSelector',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: true,
    externals: ['react', 'use-sync-external-store/shim'],
  },

  /******* React Scheduler (experimental) *******/
  {
    bundleTypes: [
      NODE_DEV,
      NODE_PROD,
      FB_WWW_DEV,
      FB_WWW_PROD,
      FB_WWW_PROFILING,
      RN_FB_DEV,
      RN_FB_PROD,
      RN_FB_PROFILING,
    ],
    moduleType: ISOMORPHIC,
    entry: 'scheduler',
    global: 'Scheduler',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: true,
    externals: ['ReactNativeInternalFeatureFlags'],
  },

  /******* React Scheduler Mock (experimental) *******/
  {
    bundleTypes: [
      NODE_DEV,
      NODE_PROD,
      FB_WWW_DEV,
      FB_WWW_PROD,
      RN_FB_DEV,
      RN_FB_PROD,
    ],
    moduleType: ISOMORPHIC,
    entry: 'scheduler/unstable_mock',
    global: 'SchedulerMock',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['ReactNativeInternalFeatureFlags'],
  },

  /******* React Scheduler Native *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'scheduler/index.native',
    global: 'SchedulerNative',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['ReactNativeInternalFeatureFlags'],
  },

  /******* React Scheduler Post Task (experimental) *******/
  {
    bundleTypes: [
      NODE_DEV,
      NODE_PROD,
      FB_WWW_DEV,
      FB_WWW_PROD,
      FB_WWW_PROFILING,
    ],
    moduleType: ISOMORPHIC,
    entry: 'scheduler/unstable_post_task',
    global: 'SchedulerPostTask',
    minifyWithProdErrorCodes: true,
    wrapWithModuleBoundaries: false,
    externals: [],
  },

  /******* Jest React (experimental) *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'jest-react',
    global: 'JestReact',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: ['react', 'scheduler', 'scheduler/unstable_mock'],
  },

  /******* ESLint Plugin for Hooks *******/
  {
    // TODO: we're building this from typescript source now, but there's really
    // no reason to have both dev and prod for this package.  It's
    // currently required in order for the package to be copied over correctly.
    // So, it would be worth improving that flow.
    name: 'eslint-plugin-react-hooks',
    bundleTypes: [NODE_DEV, NODE_PROD, FB_WWW_DEV, CJS_DTS],
    moduleType: ISOMORPHIC,
    entry: 'eslint-plugin-react-hooks/src/index.ts',
    global: 'ESLintPluginReactHooks',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    // This is a Node.js build tool (ESLint plugin), not a www runtime bundle.
    // Use process.env.NODE_ENV guard instead of __DEV__ for the dev wrapper.
    wrapWithNodeDevGuard: true,
    preferBuiltins: true,
    externals: [
      '@babel/core',
      'hermes-parser',
      'zod',
      'zod/v4',
      'zod-validation-error',
      'zod-validation-error/v4',
      'crypto',
      'util',
    ],
    tsconfig: './packages/eslint-plugin-react-hooks/tsconfig.json',
    prebuild: `mkdir -p ./compiler/packages/babel-plugin-react-compiler/dist && echo "module.exports = require('../src/index.ts');" > ./compiler/packages/babel-plugin-react-compiler/dist/index.js`,
  },

  /******* React Fresh *******/
  {
    bundleTypes: [NODE_DEV, NODE_PROD],
    moduleType: ISOMORPHIC,
    entry: 'react-refresh/babel',
    global: 'ReactFreshBabelPlugin',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [],
  },
  {
    bundleTypes: [NODE_DEV, NODE_PROD, FB_WWW_DEV],
    moduleType: ISOMORPHIC,
    entry: 'react-refresh/runtime',
    global: 'ReactFreshRuntime',
    minifyWithProdErrorCodes: false,
    wrapWithModuleBoundaries: false,
    externals: [],
  },
];

// Based on deep-freeze by substack (public domain)
function deepFreeze(o) {
  Object.freeze(o);
  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (
      o[prop] !== null &&
      (typeof o[prop] === 'object' || typeof o[prop] === 'function') &&
      !Object.isFrozen(o[prop])
    ) {
      deepFreeze(o[prop]);
    }
  });
  return o;
}

// Don't accidentally mutate config as part of the build
deepFreeze(bundles);
deepFreeze(bundleTypes);
deepFreeze(moduleTypes);

function getFilename(bundle, bundleType) {
  let name = bundle.name || bundle.entry;
  const globalName = bundle.global;
  // we do this to replace / to -, for react-dom/server
  name = name.replace('/index.', '.').replace('/', '-');
  switch (bundleType) {
    case NODE_ES2015:
      return `${name}.js`;
    case BUN_DEV:
      return `${name}.development.js`;
    case BUN_PROD:
      return `${name}.production.js`;
    case ESM_DEV:
      return `${name}.development.js`;
    case ESM_PROD:
      return `${name}.production.js`;
    case NODE_DEV:
      return `${name}.development.js`;
    case NODE_PROD:
      return `${name}.production.js`;
    case NODE_PROFILING:
      return `${name}.profiling.js`;
    case FB_WWW_DEV:
    case RN_OSS_DEV:
    case RN_FB_DEV:
      return `${globalName}-dev.js`;
    case FB_WWW_PROD:
    case RN_OSS_PROD:
    case RN_FB_PROD:
      return `${globalName}-prod.js`;
    case FB_WWW_PROFILING:
    case RN_FB_PROFILING:
    case RN_OSS_PROFILING:
      return `${globalName}-profiling.js`;
    case BROWSER_SCRIPT:
      return `${name}.js`;
    case CJS_DTS:
    case ESM_DTS:
      return `${name}.d.ts`;
  }
}

let activeBundles = bundles;
if (process.env.BUNDLES_FILTER != null) {
  activeBundles = activeBundles.filter(
    bundle => bundle.name === process.env.BUNDLES_FILTER
  );
  if (activeBundles.length === 0) {
    throw new Error(
      `No bundles matched for BUNDLES_FILTER=${process.env.BUNDLES_FILTER}`
    );
  }
}

module.exports = {
  bundleTypes,
  moduleTypes,
  bundles: activeBundles,
  getFilename,
};
