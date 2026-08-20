const {resolve} = require('path');
const Webpack = require('webpack');
const {
  GITHUB_URL,
  getVersionString,
} = require('react-devtools-extensions/utils');
const {resolveFeatureFlags} = require('react-devtools-shared/buildUtils');

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

const DEVTOOLS_VERSION = getVersionString();

const EDITOR_URL = process.env.EDITOR_URL || null;
const LOGGING_URL = process.env.LOGGING_URL || null;

const featureFlagTarget =
  process.env.FEATURE_FLAG_TARGET || 'core/standalone-oss';

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
  devtool: __DEV__ ? 'eval-cheap-module-source-map' : 'source-map',
  target: 'electron-main',
  entry: {
    standalone: './src/standalone.js',
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
    library: {
      type: 'commonjs2',
    },
  },
  externals: {
    bufferutil: 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate',
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
  node: {
    // Don't replace __dirname!
    // This would break the standalone DevTools ability to load the backend.
    // see https://github.com/facebook/react-devtools/issues/1269
    __dirname: false,

    global: false,
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
      __TEST__: NODE_ENV === 'test',
      __IS_NATIVE__: true,
      __IS_FIREFOX__: false,
      __IS_CHROME__: false,
      __IS_EDGE__: false,
      'process.env.DEVTOOLS_PACKAGE': `"react-devtools-core"`,
      'process.env.DEVTOOLS_VERSION': `"${DEVTOOLS_VERSION}"`,
      'process.env.EDITOR_URL': EDITOR_URL != null ? `"${EDITOR_URL}"` : null,
      'process.env.GITHUB_URL': `"${GITHUB_URL}"`,
      'process.env.LOGGING_URL': `"${LOGGING_URL}"`,
      'process.env.NODE_ENV': `"${NODE_ENV}"`,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: [
          {
            loader: 'workerize-loader',
            options: {
              // Workers would have to be exposed on a public path in order to outline them.
              inline: true,
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
              // WARNING It's important that we disable CSS source maps for production builds.
              // This causes style-loader to insert styles via a <style> tag rather than URL.createObjectURL,
              // which in turn avoids a nasty Electron/Chromium bug that breaks DevTools in Nuclide.
              // (Calls to URL.createObjectURL seem to crash the webview process.)
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
