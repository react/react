'use strict';

const {resolve} = require('path');
const Webpack = require('webpack');

const NODE_ENV = process.env.NODE_ENV || 'development';
const __DEV__ = NODE_ENV === 'development';
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8080);
const isE2E = process.env.E2E === 'true' || process.env.CI === 'true';

// React and the DevTools backend dependencies the facade pulls in are resolved
// from the monorepo build output — the same approach react-devtools-shell uses,
// so the fixture runs against React from source rather than a CDN copy. Run
// `yarn build-for-devtools` from the repo root first to populate this folder.
const builtModulesDir = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'build',
  'oss-experimental'
);

const sharedDir = resolve(__dirname, '..', '..', '..', 'react-devtools-shared');

module.exports = {
  mode: __DEV__ ? 'development' : 'production',
  devtool: __DEV__ ? 'cheap-source-map' : 'source-map',
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    publicPath: '/dist/',
  },
  node: {
    global: false,
  },
  resolve: {
    alias: {
      react: resolve(builtModulesDir, 'react'),
      'react-debug-tools': resolve(builtModulesDir, 'react-debug-tools'),
      'react-devtools-feature-flags': resolve(
        sharedDir,
        'src',
        'config',
        'DevToolsFeatureFlags.default'
      ),
      'react-dom/client': resolve(builtModulesDir, 'react-dom/client'),
      'react-dom': resolve(builtModulesDir, 'react-dom'),
      'react-is': resolve(builtModulesDir, 'react-is'),
      scheduler: resolve(builtModulesDir, 'scheduler'),
    },
  },
  optimization: {
    minimize: false,
  },
  plugins: [
    new Webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new Webpack.DefinePlugin({
      __DEV__,
      __EXPERIMENTAL__: true,
      __EXTENSION__: false,
      __PROFILE__: false,
      __TEST__: false,
      __IS_CHROME__: false,
      __IS_FIREFOX__: false,
      __IS_EDGE__: false,
      __IS_NATIVE__: false,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: {
          configFile: resolve(sharedDir, 'babel.config.js'),
        },
      },
    ],
  },
  devServer: {
    hot: true,
    host: HOST,
    open: !isE2E,
    port: PORT,
    static: {
      directory: __dirname,
      publicPath: '/',
    },
  },
};
