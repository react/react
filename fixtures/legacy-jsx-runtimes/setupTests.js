'use strict';

// This is mostly copypasta from toWarnDev.js matchers
// that we use in the main repo Jest configuration.

const expect = global.expect;

const {diff: jestDiff} = require('jest-diff');
const util = require('util');

function shouldIgnoreConsoleError(format, args) {
  if (process.env.NODE_ENV !== 'production') {
    if (typeof format === 'string') {
      if (format.indexOf('Error: Uncaught [') === 0) {
        // This looks like an uncaught error from invokeGuardedCallback() wrapper
        // in development that is reported by jsdom. Ignore because it's noisy.
        return true;
      }
      if (format.indexOf('The above error occurred') === 0) {
        // This looks like an error addendum from ReactFiberErrorLogger.
        // Ignore it too.
        return true;
      }
    }
  } else {
    if (
      format != null &&
      typeof format.message === 'string' &&
      typeof format.stack === 'string' &&
      args.length === 0
    ) {
      // In production, ReactFiberErrorLogger logs error objects directly.
      // They are noisy too so we'll try to ignore them.
      return true;
    }
  }
  // Looks legit
  return false;
}

function normalizeCodeLocInfo(str) {
  if (typeof str !== 'string') {
    return str;
  }
  // This special case exists only for the special source location in
  // ReactElementValidator. That will go away if we remove source locations.
  str = str.replace(/Check your code at .+?:\d+/g, 'Check your code at **');
  // V8 format:
  //  at Component (/path/filename.js:123:45)
  // React format:
  //    in Component (at filename.js:123)
  return str.replace(/\n +(?:at|in) ([\S]+)[^\n]*/g, function (m, name) {
    return '\n    in ' + name + ' (at **)';
  });
}

const createMatcherFor = (consoleMethod, matcherName) =>
  function matcher(callback, expectedMessages, options = {}) {
    if (process.env.NODE_ENV !== 'production') {
      // Warn about incorrect usage of matcher.
      if (typeof expectedMessages === 'string') {
        expectedMessages = [expectedMessages];
      } else if (!Array.isArray(expectedMessages)) {
        throw Error(
          `${matcherName}() requires a parameter of type string or an array of strings ` +
            `but was given ${typeof expectedMessages}.`
        );
      }
      if (
        options != null &&
        (typeof options !== 'object' || Array.isArray(options))
      ) {
        throw new Error(
          `${matcherName}() second argument, when present, should be an object. ` +
            'Did you forget to wrap the messages into an array?'
        );
      }
      if (arguments.length > 3) {
        // `matcher` comes from Jest, so it's more than 2 in practice
        throw new Error(
          `${matcherName}() received more than two arguments. ` +
            'Did you forget to wrap the messages into an array?'
        );
      }

      const withoutStack = options.withoutStack;
      const logAllErrors = options.logAllErrors;
      const warningsWithoutComponentStack = [];
      const warningsWithComponentStack = [];
      const unexpectedWarnings = [];

      let lastWarningWithMismatchingFormat = null;
      let lastWarningWithExtraComponentStack = null;

      // Catch errors thrown by the callback,
      // But only rethrow them if all test expectations have been satisfied.
      // Otherwise an Error in the callback can mask a failed expectation,
      // and result in a test that passes when it shouldn't.
      let caughtError;

      const isLikelyAComponentStack = message =>
        typeof message === 'string' &&
        (message.includes('\n    in ') || message.includes('\n    at '));

      const consoleSpy = (format, ...args) => {
        // Ignore uncaught errors reported by jsdom
        // and React addendums because they're too noisy.
        if (
          !logAllErrors &&
          consoleMethod === 'error' &&
          shouldIgnoreConsoleError(format, args)
        ) {
          return;
        }

        const message = util.format(format, ...args);
        const normalizedMessage = normalizeCodeLocInfo(message);

        // Remember if the number of %s interpolations
        // doesn't match the number of arguments.
        // We'll fail the test if it happens.
        let argIndex = 0;
        format.replace(/%s/g, () => argIndex++);
        if (argIndex !== args.length) {
          lastWarningWithMismatchingFormat = {
            format,
            args,
            expectedArgCount: argIndex,
          };
        }

        // Protect against accidentally passing a component stack
        // to warning() which already injects the component stack.
        if (
          args.length >= 2 &&
          isLikelyAComponentStack(args[args.length - 1]) &&
          isLikelyAComponentStack(args[args.length - 2])
        ) {
          lastWarningWithExtraComponentStack = {
            format,
          };
        }

        for (let index = 0; index < expectedMessages.length; index++) {
          const expectedMessage = expectedMessages[index];
          if (
            normalizedMessage === expectedMessage ||
            normalizedMessage.includes(expectedMessage)
          ) {
            if (isLikelyAComponentStack(normalizedMessage)) {
              warningsWithComponentStack.push(normalizedMessage);
            } else {
              warningsWithoutComponentStack.push(normalizedMessage);
            }
            expectedMessages.splice(index, 1);
            return;
          }
        }

        let errorMessage;
        if (expectedMessages.length === 0) {
          errorMessage =
            'Unexpected warning recorded: ' +
            this.utils.printReceived(normalizedMessage);
        } else if (expectedMessages.length === 1) {
          errorMessage =
            'Unexpected warning recorded: ' +
            jestDiff(expectedMessages[0], normalizedMessage);
        } else {
          errorMessage =
            'Unexpected warning recorded: ' +
            jestDiff(expectedMessages, [normalizedMessage]);
        }

        // Record the call stack for unexpected warnings.
        // We don't throw an Error here though,
        // Because it might be suppressed by ReactFiberScheduler.
        unexpectedWarnings.push(new Error(errorMessage));
      };

      // TODO Decide whether we need to support nested toWarn* expectations.
      // If we don't need it, add a check here to see if this is already our spy,
      // And throw an error.
      const originalMethod = console[consoleMethod];

      // Avoid using Jest's built-in spy since it can't be removed.
      console[consoleMethod] = consoleSpy;

      try {
        callback();
      } catch (error) {
        caughtError = error;
      } finally {
        // Restore the unspied method so that unexpected errors fail tests.
        console[consoleMethod] = originalMethod;

        // Any unexpected Errors thrown by the callback should fail the test.
        // This should take precedence since unexpected errors could block warnings.
        if (caughtError) {
          throw caughtError;
        }

        // Any unexpected warnings should be treated as a failure.
        if (unexpectedWarnings.length > 0) {
          return {
            message: () => unexpectedWarnings[0].stack,
            pass: false,
          };
        }

        // Any remaining messages indicate a failed expectations.
        if (expectedMessages.length > 0) {
          return {
            message: () =>
              `Expected warning was not recorded:\n  ${this.utils.printReceived(
                expectedMessages[0]
              )}`,
            pass: false,
          };
        }

        if (typeof withoutStack === 'number') {
          // We're expecting a particular number of warnings without stacks.
          if (withoutStack !== warningsWithoutComponentStack.length) {
            return {
              message: () =>
                `Expected ${withoutStack} warnings without a component stack but received ${warningsWithoutComponentStack.length}:\n` +
                warningsWithoutComponentStack.map(warning =>
                  this.utils.printReceived(warning)
                ),
              pass: false,
            };
          }
        } else if (withoutStack === true) {
          // We're expecting that all warnings won't have the stack.
          // If some warnings have it, it's an error.
          if (warningsWithComponentStack.length > 0) {
            return {
              message: () =>
                `Received warning unexpectedly includes a component stack:\n  ${this.utils.printReceived(
                  warningsWithComponentStack[0]
                )}\nIf this warning intentionally includes the component stack, remove ` +
                `{withoutStack: true} from the ${matcherName}() call. If you have a mix of ` +
                `warnings with and without stack in one ${matcherName}() call, pass ` +
                `{withoutStack: N} where N is the number of warnings without stacks.`,
              pass: false,
            };
          }
        } else if (withoutStack === false || withoutStack === undefined) {
          // We're expecting that all warnings *do* have the stack (default).
          // If some warnings don't have it, it's an error.
          if (warningsWithoutComponentStack.length > 0) {
            return {
              message: () =>
                `Received warning unexpectedly does not include a component stack:\n  ${this.utils.printReceived(
                  warningsWithoutComponentStack[0]
                )}\nIf this warning intentionally omits the component stack, add ` +
                `{withoutStack: true} to the ${matcherName} call.`,
              pass: false,
            };
          }
        } else {
          throw Error(
            `The second argument for ${matcherName}(), when specified, must be an object. It may have a ` +
              `property called "withoutStack" whose value may be undefined, boolean, or a number. ` +
              `Instead received ${typeof withoutStack}.`
          );
        }

        if (lastWarningWithMismatchingFormat !== null) {
          return {
            message: () =>
              `Received ${
                lastWarningWithMismatchingFormat.args.length
              } arguments for a message with ${
                lastWarningWithMismatchingFormat.expectedArgCount
              } placeholders:\n  ${this.utils.printReceived(
                lastWarningWithMismatchingFormat.format
              )}`,
            pass: false,
          };
        }

        if (lastWarningWithExtraComponentStack !== null) {
          return {
            message: () =>
              `Received more than one component stack for a warning:\n  ${this.utils.printReceived(
                lastWarningWithExtraComponentStack.format
              )}\nDid you accidentally pass a stack to warning() as the last argument? ` +
              `Don't forget warning() already injects the component stack automatically.`,
            pass: false,
          };
        }

        return {pass: true};
      }
    } else {
      // Any uncaught errors or warnings should fail tests in production mode.
      callback();

      return {pass: true};
    }
  };

expect.extend({
  toWarnDev: createMatcherFor('warn', 'toWarnDev'),
  toErrorDev: createMatcherFor('error', 'toErrorDev'),
});
