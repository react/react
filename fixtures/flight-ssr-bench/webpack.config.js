'use strict';

const path = require('path');

module.exports = {
  name: 'rsc',
  target: 'node',
  entry: './src/entry-rsc.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'rsc-bundle.js',
    library: {type: 'commonjs2'},
    clean: true,
  },
  resolve: {
    // This is the key: react-server condition makes `react` resolve to the
    // server variant that supports async components, server references, etc.
    conditionNames: ['react-server', 'node', 'require'],
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        // Custom loader that replaces 'use client' modules with client
        // reference proxies. Must run before babel.
        enforce: 'pre',
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: path.resolve(__dirname, 'rsc-client-ref-loader.js'),
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: require.resolve('babel-loader'),
        options: {
          presets: [['@babel/preset-react', {runtime: 'automatic'}]],
        },
      },
    ],
  },
  // Production mode but no minification — we want optimized code paths
  // but readable profiles and a fair comparison between approaches.
  mode: 'production',
  optimization: {minimize: false},
};
