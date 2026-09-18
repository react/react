/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const acorn = require('acorn-loose');

const url = require('url');

const Module = require('module');

module.exports = function register() {
  const Server: any = require('react-server-dom-webpack/server');
  const registerServerReference = Server.registerServerReference;
  const createClientModuleProxy = Server.createClientModuleProxy;

  // $FlowFixMe[prop-missing] found when upgrading Flow
  const originalCompile = Module.prototype._compile;

  // $FlowFixMe[prop-missing] found when upgrading Flow
  Module.prototype._compile = function (
    this: any,
    content: string,
    filename: string,
  ): void {
    // Do a quick check for the exact string. If it doesn't exist, don't
    // bother parsing.
    if (
      content.indexOf('use client') === -1 &&
      content.indexOf('use server') === -1
    ) {
      return originalCompile.apply(this, arguments);
    }

    let body;
    try {
      body = acorn.parse(content, {
        ecmaVersion: '2024',
        sourceType: 'source',
      }).body;
    } catch (x) {
      console['error']('Error parsing %s %s', url, x.message);
      return originalCompile.apply(this, arguments);
    }

    let useClient = false;
    let useServer = false;
    for (let i = 0; i < body.length; i++) {
      const node = body[i];
      if (node.type !== 'ExpressionStatement' || !node.directive) {
        break;
      }
      if (node.directive === 'use client') {
        useClient = true;
      }
      if (node.directive === 'use server') {
        useServer = true;
      }
    }

    if (!useClient && !useServer) {
      return originalCompile.apply(this, arguments);
    }

    if (useClient && useServer) {
      throw new Error(
        'Cannot have both "use client" and "use server" directives in the same file.',
      );
    }

    if (useClient) {
      const moduleId: string = url.pathToFileURL(filename).href as any;
      this.exports = createClientModuleProxy(moduleId);
    }

    if (useServer) {
      originalCompile.apply(this, arguments);

      const moduleId: string = url.pathToFileURL(filename).href as any;

      const exports = this.exports;

      // This module is imported server to server, but opts in to exposing functions by
      // reference. If there are any functions in the export.
      if (typeof exports === 'function') {
        // The module exports a function directly,
        registerServerReference(
          exports as any,
          moduleId,
          // Represents the whole Module object instead of a particular import.
          null,
        );
      } else {
        const keys = Object.keys(exports);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = exports[keys[i]];
          if (typeof value === 'function') {
            registerServerReference(value as any, moduleId, key);
          }
        }
      }
    }
  };
};
