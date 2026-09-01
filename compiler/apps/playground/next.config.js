/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');

const nextConfig = {
  experimental: {
    reactCompiler: true,
    viewTransition: true,
  },
  reactStrictMode: true,
  webpack: (config, options) => {
    // Load *.d.ts files as strings using https://webpack.js.org/guides/asset-modules/#source-assets.
    config.module.rules.push({
      test: /\.d\.ts/,
      type: 'asset/source',
    });

    // Monaco Editor
    if (!options.isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['typescript', 'javascript'],
          filename: 'static/[name].worker.js',
        })
      );
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      'react-compiler-runtime': path.resolve(
        __dirname,
        '../../packages/react-compiler-runtime'
      ),
    };
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
    };

    return config;
  },

  transpilePackages: ['monaco-editor'],
};

module.exports = nextConfig;
