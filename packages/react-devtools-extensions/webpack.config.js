'use strict';

const {resolve, isAbsolute, relative} = require('path');
const Webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const {GITHUB_URL, getVersionString} = require('./utils');
const {resolveFeatureFlags} = require('react-devtools-shared/buildUtils');
const SourceMapIgnoreListPlugin = require('react-devtools-shared/SourceMapIgnoreListPlugin');
const {StatsWriterPlugin} = require('webpack-stats-plugin');

const NODE_ENV = process.env.NODE_ENV;
if (!NODE_ENV) {
  console.error('NODE_ENV not set');
  process.exit(1);
}

const builtModulesDir = resolve(
  __dirname,
  '..',
  '..',
  'build',
  'oss-experimental',
);

const __DEV__ = NODE_ENV === 'development';

const DEVTOOLS_VERSION = getVersionString(process.env.DEVTOOLS_VERSION);

const EDITOR_URL = process.env.EDITOR_URL || null;
const LOGGING_URL = process.env.LOGGING_URL || null;

const IS_CHROME = process.env.IS_CHROME === 'true';
const IS_FIREFOX = process.env.IS_FIREFOX === 'true';
const IS_EDGE = process.env.IS_EDGE === 'true';
const IS_INTERNAL_VERSION = process.env.FEATURE_FLAG_TARGET === 'extension-fb';

const featureFlagTarget = process.env.FEATURE_FLAG_TARGET || 'extension-oss';

let statsFileName = `webpack-stats.${featureFlagTarget}.${__DEV__ ? 'development' : 'production'}`;
if (IS_CHROME) {
  statsFileName += `.chrome`;
}
if (IS_FIREFOX) {
  statsFileName += `.firefox`;
}
if (IS_EDGE) {
  statsFileName += `.edge`;
}
statsFileName += '.json';

const babelOptions = {
  configFile: resolve(
    __dirname,
    '..',
    'react-devtools-shared',
    'babel.config.js',
  ),
};

module.exports = {
  mode: __DEV__ ? 'development' : 'production',
  devtool: false,
  entry: {
    backend: './src/backend.js',
    background: './src/background/index.js',
    backendManager: './src/contentScripts/backendManager.js',
    fallbackEvalContext: './src/contentScripts/fallbackEvalContext.js',
    fileFetcher: './src/contentScripts/fileFetcher.js',
    main: './src/main/index.js',
    panel: './src/panel.js',
    proxy: './src/contentScripts/proxy.js',
    prepareInjection: './src/contentScripts/prepareInjection.js',
    installHook: './src/contentScripts/installHook.js',
    hookSettingsInjector: './src/contentScripts/hookSettingsInjector.js',
  },
  output: {
    path: __dirname + '/build',
    publicPath: '/build/',
    filename: chunkData => {
      switch (chunkData.chunk.name) {
        case 'backend':
          return 'react_devtools_backend_compact.js';
        default:
          return '[name].js';
      }
    },
    chunkFilename: '[name].chunk.js',
  },
  node: {
    global: false,
  },
  resolve: {
    alias: {
      react: resolve(builtModulesDir, 'react'),
      'react-debug-tools': resolve(builtModulesDir, 'react-debug-tools'),
      'react-devtools-feature-flags': resolveFeatureFlags(featureFlagTarget),
      'react-dom/client': resolve(builtModulesDir, 'react-dom/client'),
      'react-dom': resolve(builtModulesDir, 'react-dom'),
      'react-is': resolve(builtModulesDir, 'react-is'),
      scheduler: resolve(builtModulesDir, 'scheduler'),
    },
  },
  optimization: {
    minimize: !__DEV__,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            unused: true,
            dead_code: true,
          },
          mangle: {
            keep_fnames: true,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
  plugins: [
    new Webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new Webpack.DefinePlugin({
      __DEV__,
      __EXPERIMENTAL__: true,
      __EXTENSION__: true,
      __PROFILE__: false,
      __TEST__: NODE_ENV === 'test',
      __IS_CHROME__: IS_CHROME,
      __IS_FIREFOX__: IS_FIREFOX,
      __IS_EDGE__: IS_EDGE,
      __IS_NATIVE__: false,
      __IS_INTERNAL_VERSION__: IS_INTERNAL_VERSION,
      'process.env.DEVTOOLS_PACKAGE': `"react-devtools-extensions"`,
      'process.env.DEVTOOLS_VERSION': `"${DEVTOOLS_VERSION}"`,
      'process.env.EDITOR_URL': EDITOR_URL != null ? `"${EDITOR_URL}"` : null,
      'process.env.GITHUB_URL': `"${GITHUB_URL}"`,
      'process.env.LOGGING_URL': `"${LOGGING_URL}"`,
      'process.env.NODE_ENV': `"${NODE_ENV}"`,
    }),
    new Webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      include: ['installHook.js', 'react_devtools_backend_compact.js'],
      noSources: !__DEV__,
      // https://github.com/webpack/webpack/issues/3603#issuecomment-1743147144
      moduleFilenameTemplate(info) {
        const {absoluteResourcePath, namespace, resourcePath} = info;

        if (isAbsolute(absoluteResourcePath)) {
          return relative(__dirname + '/build', absoluteResourcePath);
        }

        // Mimic Webpack's default behavior:
        return `webpack://${namespace}/${resourcePath}`;
      },
    }),
    new SourceMapIgnoreListPlugin({
      shouldIgnoreSource: (assetName, _source) => {
        if (__DEV__) {
          // Don't ignore list anything in DEV build for debugging purposes
          return false;
        }

        const contentScriptNamesToIgnoreList = [
          'react_devtools_backend_compact',
          // This is where we override console
          'installHook',
        ];

        return contentScriptNamesToIgnoreList.some(ignoreListName =>
          assetName.startsWith(ignoreListName),
        );
      },
    }),
    {
      apply(compiler) {
        if (__DEV__) {
          return;
        }

        const {RawSource} = compiler.webpack.sources;
        compiler.hooks.compilation.tap(
          'CustomContentForHookScriptPlugin',
          compilation => {
            compilation.hooks.processAssets.tap(
              {
                name: 'CustomContentForHookScriptPlugin',
                stage: Webpack.Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING,
                additionalAssets: true,
              },
              assets => {
                // eslint-disable-next-line no-for-of-loops/no-for-of-loops
                for (const [name, asset] of Object.entries(assets)) {
                  if (name !== 'installHook.js.map') {
                    continue;
                  }

                  const mapContent = asset.source().toString();
                  if (!mapContent) {
                    continue;
                  }

                  const map = JSON.parse(mapContent);
                  map.sourcesContent = map.sources.map(sourceName => {
                    if (!sourceName.endsWith('/hook.js')) {
                      return null;
                    }

                    return (
                      '/*\n' +
                      ' * This script is from React DevTools.\n' +
                      " * You're likely here because you thought it sent an error or warning to the console.\n" +
                      ' * React DevTools patches the console to support features like appending component stacks, \n' +
                      ' * so this file appears as a source. However, the console call actually came from another script.\n' +
                      " * To remove this script from stack traces, open your browser's DevTools (to enable source mapping) before these console calls happen.\n" +
                      ' */'
                    );
                  });

                  compilation.updateAsset(
                    name,
                    new RawSource(JSON.stringify(map)),
                  );
                }
              },
            );
          },
        );
      },
    },
    new StatsWriterPlugin({
      stats: 'verbose',
      filename: statsFileName,
    }),
  ],
  module: {
    defaultRules: [
      {
        type: 'javascript/auto',
        resolve: {},
      },
      {
        test: /\.json$/i,
        type: 'json',
      },
    ],

    rules: [
      {
        test: /\.worker\.js$/,
        use: [
          {
            loader: 'workerize-loader',
            options: {
              inline: false,
              name: '[name]',
            },
          },
          {
            loader: 'babel-loader',
            options: babelOptions,
          },
        ],
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: babelOptions,
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              sourceMap: __DEV__,
              modules: true,
              localIdentName: '[local]___[hash:base64:5]',
            },
          },
        ],
      },
    ],
  },
};
