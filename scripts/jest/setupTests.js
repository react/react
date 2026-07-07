'use strict';

const {getTestFlags} = require('./TestFlags');
const {
  assertConsoleLogsCleared,
  resetAllUnexpectedConsoleCalls,
  patchConsoleMethods,
} = require('internal-test-utils/consoleMock');
const path = require('path');

if (process.env.REACT_CLASS_EQUIVALENCE_TEST) {
  // Inside the class equivalence tester, we have a custom environment, let's
  // require that instead.
  require('./spec-equivalence-reporter/setupTests.js');
} else {
  const errorMap = require('../error-codes/codes.json');

  // By default, jest.spyOn also calls the spied method.
  const spyOn = jest.spyOn;
  const noop = jest.fn;

  // Can be used to normalize paths in stackframes
  global.__REACT_ROOT_PATH_TEST__ = path.resolve(__dirname, '../..');

  // Spying on console methods in production builds can mask errors.
  // This is why we added an explicit spyOnDev() helper.
  // It's too easy to accidentally use the more familiar spyOn() helper though,
  // So we disable it entirely.
  // Spying on both dev and prod will require using both spyOnDev() and spyOnProd().
  global.spyOn = function () {
    throw new Error(
      'Do not use spyOn(). ' +
        'It can accidentally hide unexpected errors in production builds. ' +
        'Use spyOnDev(), spyOnProd(), or spyOnDevAndProd() instead.'
    );
  };

  if (process.env.NODE_ENV === 'production') {
    global.spyOnDev = noop;
    global.spyOnProd = spyOn;
    global.spyOnDevAndProd = spyOn;
  } else {
    global.spyOnDev = spyOn;
    global.spyOnProd = noop;
    global.spyOnDevAndProd = spyOn;
  }

  expect.extend({
    ...require('./matchers/reactTestMatchers'),
    ...require('./matchers/toThrow'),
  });

  // We have a Babel transform that inserts guards against infinite loops.
  // If a loop runs for too many iterations, we throw an error and set this
  // global variable. The global lets us detect an infinite loop even if
  // the actual error object ends up being caught and ignored. An infinite
  // loop must always fail the test!
  beforeEach(() => {
    global.infiniteLoopError = null;
  });
  afterEach(() => {
    const error = global.infiniteLoopError;
    global.infiniteLoopError = null;
    if (error) {
      throw error;
    }
  });

  // Patch the console to assert that all console error/warn/log calls assert.
  patchConsoleMethods({includeLog: !!process.env.CI});
  beforeEach(resetAllUnexpectedConsoleCalls);
  afterEach(assertConsoleLogsCleared);

  // TODO: enable this check so we don't forget to reset spyOnX mocks.
  // afterEach(() => {
  //   if (
  //       console[methodName] !== mockMethod &&
  //       !jest.isMockFunction(console[methodName])
  //   ) {
  //     throw new Error(
  //       `Test did not tear down console.${methodName} mock properly.`
  //     );
  //   }
  // });

  if (process.env.NODE_ENV === 'production') {
    // In production, we strip error messages and turn them into codes.
    // This decodes them back so that the test assertions on them work.
    // 1. `ErrorProxy` decodes error messages at Error construction time and
    //    also proxies error instances with `proxyErrorInstance`.
    // 2. `proxyErrorInstance` decodes error messages when the `message`
    //    property is changed.
    const decodeErrorMessage = function (message) {
      if (!message) {
        return message;
      }
      const re = /react.dev\/errors\/(\d+)?\??([^\s]*)/;
      let matches = message.match(re);
      if (!matches || matches.length !== 3) {
        // Some tests use React 17, when the URL was different.
        const re17 = /error-decoder.html\?invariant=(\d+)([^\s]*)/;
        matches = message.match(re17);
        if (!matches || matches.length !== 3) {
          return message;
        }
      }
      const code = parseInt(matches[1], 10);
      const args = matches[2]
        .split('&')
        .filter(s => s.startsWith('args[]='))
        .map(s => s.slice('args[]='.length))
        .map(decodeURIComponent);
      const format = errorMap[code];
      let argIndex = 0;
      return format.replace(/%s/g, () => args[argIndex++]);
    };
    const OriginalError = global.Error;
    // Cache Reflect methods so the proxies keep working even if a test
    // temporarily deletes or overrides them (e.g. to exercise no-Reflect
    // fallback paths in the React source).
    const ReflectApply = Reflect.apply;
    const ReflectConstruct = Reflect.construct;
    const ReflectGet = Reflect.get;
    const ReflectSet = Reflect.set;
    // V8's Error.captureStackTrace (used in Jest) fails if the error object is
    // a Proxy, so we need to pass it the unproxied instance.
    const originalErrorInstances = new WeakMap();
    const captureStackTrace = function (error, ...args) {
      return OriginalError.captureStackTrace.call(
        this,
        originalErrorInstances.get(error) ||
          // Sometimes this wrapper receives an already-unproxied instance.
          error,
        ...args
      );
    };
    const proxyErrorInstance = error => {
      const proxy = new Proxy(error, {
        set(target, key, value, receiver) {
          if (key === 'message') {
            return ReflectSet(target, key, decodeErrorMessage(value), receiver);
          }
          return ReflectSet(target, key, value, receiver);
        },
        get(target, key, receiver) {
          if (key === 'stack') {
            // https://github.com/nodejs/node/issues/60862
            return ReflectGet(target, key);
          }
          return ReflectGet(target, key, receiver);
        },
      });
      originalErrorInstances.set(proxy, error);
      return proxy;
    };
    const ErrorProxy = new Proxy(OriginalError, {
      apply(target, thisArg, argumentsList) {
        const error = ReflectApply(target, thisArg, argumentsList);
        error.message = decodeErrorMessage(error.message);
        return proxyErrorInstance(error);
      },
      construct(target, argumentsList, newTarget) {
        const error = ReflectConstruct(target, argumentsList, newTarget);
        error.message = decodeErrorMessage(error.message);
        return proxyErrorInstance(error);
      },
      get(target, key, receiver) {
        if (key === 'captureStackTrace') {
          return captureStackTrace;
        }
        return ReflectGet(target, key, receiver);
      },
    });
    ErrorProxy.OriginalError = OriginalError;
    global.Error = ErrorProxy;
  }

  const expectTestToFail = async (callback, errorToThrowIfTestSucceeds) => {
    if (callback.length > 0) {
      throw Error(
        'Gated test helpers do not support the `done` callback. Return a ' +
          'promise instead.'
      );
    }

    // Install a global error event handler. We treat global error events as
    // test failures, same as Jest's default behavior.
    //
    // Becaused we installed our own error event handler, Jest will not report a
    // test failure. Conceptually it's as if we wrapped the entire test event in
    // a try-catch.
    let didError = false;
    const errorEventHandler = () => {
      didError = true;
    };
    // eslint-disable-next-line no-restricted-globals
    if (typeof addEventListener === 'function') {
      // eslint-disable-next-line no-restricted-globals
      addEventListener('error', errorEventHandler);
    }

    try {
      const maybePromise = callback();
      if (
        maybePromise !== undefined &&
        maybePromise !== null &&
        typeof maybePromise.then === 'function'
      ) {
        await maybePromise;
      }
      // Flush unexpected console calls inside the test itself, instead of in
      // `afterEach` like we normally do. `afterEach` is too late because if it
      // throws, we won't have captured it.
      assertConsoleLogsCleared();
    } catch (testError) {
      didError = true;
    }
    resetAllUnexpectedConsoleCalls();
    // eslint-disable-next-line no-restricted-globals
    if (typeof removeEventListener === 'function') {
      // eslint-disable-next-line no-restricted-globals
      removeEventListener('error', errorEventHandler);
    }

    if (!didError) {
      // The test did not error like we expected it to. Report this to Jest as
      // a failure.
      throw errorToThrowIfTestSucceeds;
    }
  };

  const coerceGateConditionToFunction = gateFnOrString => {
    return typeof gateFnOrString === 'string'
      ? // `gate('foo')` is treated as equivalent to `gate(flags => flags.foo)`
        flags => flags[gateFnOrString]
      : // Assume this is already a function
        gateFnOrString;
  };

  const gatedErrorMessage = 'Gated test was expected to fail, but it passed.';
  global._test_gate = (gateFnOrString, testName, callback, timeoutMS) => {
    const gateFn = coerceGateConditionToFunction(gateFnOrString);
    let shouldPass;
    try {
      const flags = getTestFlags();
      shouldPass = gateFn(flags);
    } catch (e) {
      test(
        testName,
        () => {
          throw e;
        },
        timeoutMS
      );
      return;
    }
    if (shouldPass) {
      test(testName, callback, timeoutMS);
    } else {
      const error = new Error(gatedErrorMessage);
      Error.captureStackTrace(error, global._test_gate);
      test(`[GATED, SHOULD FAIL] ${testName}`, () =>
        expectTestToFail(callback, error, timeoutMS));
    }
  };
  global._test_gate_focus = (gateFnOrString, testName, callback, timeoutMS) => {
    const gateFn = coerceGateConditionToFunction(gateFnOrString);
    let shouldPass;
    try {
      const flags = getTestFlags();
      shouldPass = gateFn(flags);
    } catch (e) {
      test.only(
        testName,
        () => {
          throw e;
        },
        timeoutMS
      );
      return;
    }
    if (shouldPass) {
      test.only(testName, callback, timeoutMS);
    } else {
      const error = new Error(gatedErrorMessage);
      Error.captureStackTrace(error, global._test_gate_focus);
      test.only(
        `[GATED, SHOULD FAIL] ${testName}`,
        () => expectTestToFail(callback, error),
        timeoutMS
      );
    }
  };

  // Dynamic version of @gate pragma
  global.gate = gateFnOrString => {
    const gateFn = coerceGateConditionToFunction(gateFnOrString);
    const flags = getTestFlags();
    return gateFn(flags);
  };

  // We augment JSDOM to produce a document that has a loading readyState by default
  // and can be changed. We mock it here globally so we don't have to import our special
  // mock in every file.
  jest.mock('jsdom', () => {
    return require('internal-test-utils/ReactJSDOM.js');
  });
}

// We mock createHook so that we can automatically clean it up.
let installedHook = null;
jest.mock('async_hooks', () => {
  const actual = jest.requireActual('async_hooks');
  return {
    ...actual,
    createHook(config) {
      if (installedHook) {
        installedHook.disable();
      }
      return (installedHook = actual.createHook(config));
    },
  };
});

// Ensure async hooks are disabled after each test to prevent cross-test pollution.
// This is needed because test files that load the Node server (with async debug hooks)
// can pollute test files that load the Edge server (which doesn't create new hooks
// to trigger the cleanup in the mock above).
afterEach(() => {
  if (installedHook) {
    installedHook.disable();
    installedHook = null;
  }
});
