/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

// Most of our tests call jest.resetModules in a beforeEach and the
// re-require all the React modules. However, the JSX runtime is injected by
// the compiler, so those bindings don't get updated. This causes warnings
// logged by the JSX runtime to not have a component stack, because component
// stack relies on the the secret internals object that lives on the React
// module, which because of the resetModules call is longer the same one.
//
// To workaround this issue, use a transform that calls require() again before
// every JSX invocation.
//
// Longer term we should migrate all our tests away from using require() and
// resetModules, and use import syntax instead so this kind of thing doesn't
// happen.

module.exports = function replaceJSXImportWithLazy(babel) {
  const {types: t} = babel;

  function getInlineRequire(moduleName) {
    return t.callExpression(t.identifier('require'), [
      t.stringLiteral(moduleName),
    ]);
  }

  return {
    visitor: {
      CallExpression: function (path, pass) {
        let callee = path.node.callee;
        if (callee.type === 'SequenceExpression') {
          callee = callee.expressions[callee.expressions.length - 1];
        }
        if (callee.type === 'Identifier') {
          // Sometimes we seem to hit this before the imports are transformed
          // into requires and so we hit this case.
          switch (callee.name) {
            case '_jsxDEV':
              path.node.callee = t.memberExpression(
                getInlineRequire('react/jsx-dev-runtime'),
                t.identifier('jsxDEV')
              );
              return;
            case '_jsx':
              path.node.callee = t.memberExpression(
                getInlineRequire('react/jsx-runtime'),
                t.identifier('jsx')
              );
              return;
            case '_jsxs':
              path.node.callee = t.memberExpression(
                getInlineRequire('react/jsx-runtime'),
                t.identifier('jsxs')
              );
              return;
          }
          return;
        }
        if (callee.type !== 'MemberExpression') {
          return;
        }
        if (callee.property.type !== 'Identifier') {
          // Needs to be jsx, jsxs, jsxDEV.
          return;
        }
        if (callee.object.type !== 'Identifier') {
          // Needs to be _reactJsxDevRuntime or _reactJsxRuntime.
          return;
        }
        // Replace the cached identifier with a new require call.
        // Relying on the identifier name is a little flaky. Should ideally pick
        // this from the import. For some reason it sometimes has the react prefix
        // and other times it doesn't.
        switch (callee.object.name) {
          case '_reactJsxDevRuntime':
          case '_jsxDevRuntime':
            callee.object = getInlineRequire('react/jsx-dev-runtime');
            return;
          case '_reactJsxRuntime':
          case '_jsxRuntime':
            callee.object = getInlineRequire('react/jsx-runtime');
            return;
        }
      },
    },
  };
};
