'use strict';

module.exports = {
  env: {
    commonjs: true,
    browser: true,
  },
  globals: {
    // ES6
    BigInt: 'readonly',
    Map: 'readonly',
    Set: 'readonly',
    Symbol: 'readonly',
    Proxy: 'readonly',
    WeakMap: 'readonly',
    WeakSet: 'readonly',
    WeakRef: 'readonly',

    Int8Array: 'readonly',
    Uint8Array: 'readonly',
    Uint8ClampedArray: 'readonly',
    Int16Array: 'readonly',
    Uint16Array: 'readonly',
    Int32Array: 'readonly',
    Uint32Array: 'readonly',
    Float32Array: 'readonly',
    Float64Array: 'readonly',
    BigInt64Array: 'readonly',
    BigUint64Array: 'readonly',
    DataView: 'readonly',
    ArrayBuffer: 'readonly',

    Reflect: 'readonly',
    globalThis: 'readonly',

    FinalizationRegistry: 'readonly',

    ScrollTimeline: 'readonly',
    navigation: 'readonly',

    // Vendor specific
    MSApp: 'readonly',
    __REACT_DEVTOOLS_GLOBAL_HOOK__: 'readonly',
    // FB
    __DEV__: 'readonly',
    // Node.js Server Rendering
    process: 'readonly',
    setImmediate: 'readonly',
    Buffer: 'readonly',
    // Trusted Types
    trustedTypes: 'readonly',

    // Scheduler profiling
    TaskController: 'readonly',
    reportError: 'readonly',
    AggregateError: 'readonly',

    // Flight
    Promise: 'readonly',

    // Temp
    AsyncLocalStorage: 'readonly',
    async_hooks: 'readonly',

    // jest
    jest: 'readonly',

    // act
    IS_REACT_ACT_ENVIRONMENT: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 5,
    sourceType: 'script',
  },
  rules: {
    'no-undef': 'error',
    'no-shadow-restricted-names': 'error',
    'no-restricted-syntax': [
      'error',
      // TODO: Can be removed once we upgrade GCC to a version without `optimizeArgumentsArray` optimization.
      {
        selector: 'Identifier[name=/^JSCompiler_OptimizeArgumentsArray_/]',
        message:
          'Google Closure Compiler optimized `arguments` access. ' +
          'This affects function arity. ' +
          'Create a reference to `arguments` to avoid this optimization',
      },
    ],
  },

  // These plugins aren't used, but eslint complains if an eslint-ignore comment
  // references unused plugins. An alternate approach could be to strip
  // eslint-ignore comments as part of the build.
  plugins: ['ft-flow', 'jest', 'no-for-of-loops', 'react', 'react-internal'],
};
