/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable react-internal/no-production-logging */

const chalk = require('chalk');
const util = require('util');
const shouldIgnoreConsoleError = require('./shouldIgnoreConsoleError');
const shouldIgnoreConsoleWarn = require('./shouldIgnoreConsoleWarn');
import {diff} from 'jest-diff';
import {printReceived} from 'jest-matcher-utils';

// Annoying: need to store the log array on the global or it would
// change reference whenever you call jest.resetModules after patch.
const loggedErrors = (global.__loggedErrors = global.__loggedErrors || []);
const loggedWarns = (global.__loggedWarns = global.__loggedWarns || []);
const loggedLogs = (global.__loggedLogs = global.__loggedLogs || []);

const patchConsoleMethod = (methodName, logged) => {
  const newMethod = function (format, ...args) {
    // Ignore uncaught errors reported by jsdom
    // and React addendums because they're too noisy.
    if (shouldIgnoreConsoleError(format, args)) {
      return;
    }

    // Ignore certain React warnings causing test failures
    if (methodName === 'warn' && shouldIgnoreConsoleWarn(format)) {
      return;
    }

    // Append Component Stacks. Simulates a framework or DevTools appending them.
    if (
      typeof format === 'string' &&
      (methodName === 'error' || methodName === 'warn')
    ) {
      const React = require('react');

      // Ideally we could remove this check, but we have some tests like
      // useSyncExternalStoreShared-test that tests against React 17,
      // which doesn't have the captureOwnerStack method.
      if (React.captureOwnerStack) {
        const stack = React.captureOwnerStack();
        if (stack) {
          format += '%s';
          args.push(stack);
        }
      }
    }

    logged.push([format, ...args]);
  };

  console[methodName] = newMethod;

  return newMethod;
};

let logMethod;
export function patchConsoleMethods({includeLog} = {includeLog: false}) {
  patchConsoleMethod('error', loggedErrors);
  patchConsoleMethod('warn', loggedWarns);

  // Only assert console.log isn't called in CI so you can debug tests in DEV.
  // The matchers will still work in DEV, so you can assert locally.
  if (includeLog) {
    logMethod = patchConsoleMethod('log', loggedLogs);
  }
}

export function resetAllUnexpectedConsoleCalls() {
  loggedErrors.length = 0;
  loggedWarns.length = 0;
  if (logMethod) {
    loggedLogs.length = 0;
  }
}

export function clearLogs() {
  const logs = Array.from(loggedLogs);
  loggedLogs.length = 0;
  return logs;
}

export function clearWarnings() {
  const warnings = Array.from(loggedWarns);
  loggedWarns.length = 0;
  return warnings;
}

export function clearErrors() {
  const errors = Array.from(loggedErrors);
  loggedErrors.length = 0;
  return errors;
}

export function assertConsoleLogsCleared() {
  const logs = clearLogs();
  const warnings = clearWarnings();
  const errors = clearErrors();

  if (logs.length > 0 || errors.length > 0 || warnings.length > 0) {
    let message = `${chalk.dim('asserConsoleLogsCleared')}(${chalk.red(
      'expected',
    )})\n`;

    if (logs.length > 0) {
      message += `\nconsole.log was called without assertConsoleLogDev:\n${diff(
        '',
        logs.join('\n'),
        {
          omitAnnotationLines: true,
        },
      )}\n`;
    }

    if (warnings.length > 0) {
      message += `\nconsole.warn was called without assertConsoleWarnDev:\n${diff(
        '',
        warnings.map(normalizeComponentStack).join('\n'),
        {
          omitAnnotationLines: true,
        },
      )}\n`;
    }
    if (errors.length > 0) {
      message += `\nconsole.error was called without assertConsoleErrorDev:\n${diff(
        '',
        errors.map(normalizeComponentStack).join('\n'),
        {
          omitAnnotationLines: true,
        },
      )}\n`;
    }

    message += `\nYou must call one of the assertConsoleDev helpers between each act call.`;

    const error = Error(message);
    Error.captureStackTrace(error, assertConsoleLogsCleared);
    throw error;
  }
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
  return str.replace(/\n +(?:at|in) ([^(\[\n]+)[^\n]*/g, function (m, name) {
    name = name.trim();
    if (name.endsWith('.render')) {
      // Class components will have the `render` method as part of their stack trace.
      // We strip that out in our normalization to make it look more like component stacks.
      name = name.slice(0, name.length - 7);
    }
    name = name.replace(/.*\/([^\/]+):\d+:\d+/, '**/$1:**:**');
    return '\n    in ' + name + ' (at **)';
  });
}

// Expands environment placeholders like [Server] into ANSI escape sequences.
// This allows test assertions to use a cleaner syntax like "[Server] Error:"
// instead of the full escape sequence "\u001b[0m\u001b[7m Server \u001b[0mError:"
function expandEnvironmentPlaceholders(str) {
  if (typeof str !== 'string') {
    return str;
  }
  // [Environment] -> ANSI escape sequence for environment badge
  // The format is: reset + inverse + " Environment " + reset
  return str.replace(
    /^\[(\w+)] /g,
    (match, env) => '\u001b[0m\u001b[7m ' + env + ' \u001b[0m',
  );
}

// The error stack placeholder that can be used in expected messages
const ERROR_STACK_PLACEHOLDER = '\n    in <stack>';
// A marker used to protect the placeholder during normalization
const ERROR_STACK_PLACEHOLDER_MARKER = '\n    in <__STACK_PLACEHOLDER__>';

// Normalizes expected messages, handling special placeholders
function normalizeExpectedMessage(str) {
  if (typeof str !== 'string') {
    return str;
  }
  // Protect the error stack placeholder from normalization
  // (normalizeCodeLocInfo would add "(at **)" to it)
  const hasStackPlaceholder = str.includes(ERROR_STACK_PLACEHOLDER);
  let result = str;
  if (hasStackPlaceholder) {
    result = result.replace(
      ERROR_STACK_PLACEHOLDER,
      ERROR_STACK_PLACEHOLDER_MARKER,
    );
  }
  result = normalizeCodeLocInfo(result);
  result = expandEnvironmentPlaceholders(result);
  if (hasStackPlaceholder) {
    // Restore the placeholder (remove the "(at **)" that was added)
    result = result.replace(
      ERROR_STACK_PLACEHOLDER_MARKER + ' (at **)',
      ERROR_STACK_PLACEHOLDER,
    );
  }
  return result;
}

function normalizeComponentStack(entry) {
  if (
    typeof entry[0] === 'string' &&
    entry[0].endsWith('%s') &&
    isLikelyAComponentStack(entry[entry.length - 1])
  ) {
    const clone = entry.slice(0);
    clone[clone.length - 1] = normalizeCodeLocInfo(entry[entry.length - 1]);
    return clone;
  }
  return entry;
}

const isLikelyAComponentStack = message =>
  typeof message === 'string' &&
  (message.indexOf('<component stack>') > -1 ||
    message.includes('\n    in ') ||
    message.includes('\n    at '));

// Error stack traces start with "*Error:" and contain "at" frames with file paths
// Component stacks contain "in ComponentName" patterns
// This helps validate that \n    in <stack> is used correctly
const isLikelyAnErrorStackTrace = message =>
  typeof message === 'string' &&
  message.includes('Error:') &&
  // Has "at" frames typical of error stacks (with file:line:col)
  /\n\s+at .+\(.*:\d+:\d+\)/.test(message);

export function createLogAssertion(
  consoleMethod,
  matcherName,
  clearObservedErrors,
) {
  function logName() {
    switch (consoleMethod) {
      case 'log':
        return 'log';
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
    }
  }

  return function assertConsoleLog(expectedMessages, options = {}) {
    if (__DEV__) {
      // eslint-disable-next-line no-inner-declarations
      function throwFormattedError(message) {
        const error = new Error(
          `${chalk.dim(matcherName)}(${chalk.red(
            'expected',
          )})\n\n${message.trim()}`,
        );
        Error.captureStackTrace(error, assertConsoleLog);
        throw error;
      }

      // Warn about incorrect usage first arg.
      if (!Array.isArray(expectedMessages)) {
        throwFormattedError(
          `Expected messages should be an array of strings ` +
            `but was given type "${typeof expectedMessages}".`,
        );
      }

      // Warn about incorrect usage second arg.
      if (options != null) {
        if (typeof options !== 'object' || Array.isArray(options)) {
          throwFormattedError(
            `The second argument should be an object. ` +
              'Did you forget to wrap the messages into an array?',
          );
        }
      }

      const observedLogs = clearObservedErrors();
      const receivedLogs = [];
      const missingExpectedLogs = Array.from(expectedMessages);

      const unexpectedLogs = [];
      const unexpectedMissingErrorStack = [];
      const unexpectedIncludingErrorStack = [];
      const logsMismatchingFormat = [];
      const logsWithExtraComponentStack = [];
      const stackTracePlaceholderMisuses = [];

      // Loop over all the observed logs to determine:
      //   - Which expected logs are missing
      //   - Which received logs are unexpected
      //   - Which logs have a component stack
      //   - Which logs have the wrong format
      //   - Which logs have extra stacks
      for (let index = 0; index < observedLogs.length; index++) {
        const log = observedLogs[index];
        const [format, ...args] = log;
        const message = util.format(format, ...args);

        // Ignore uncaught errors reported by jsdom
        // and React addendums because they're too noisy.
        if (shouldIgnoreConsoleError(format, args)) {
          return;
        }

        let expectedMessage;
        const expectedMessageOrArray = expectedMessages[index];
        if (typeof expectedMessageOrArray === 'string') {
          expectedMessage = normalizeExpectedMessage(expectedMessageOrArray);
        } else if (expectedMessageOrArray != null) {
          throwFormattedError(
            `The expected message for ${matcherName}() must be a string. ` +
              `Instead received ${JSON.stringify(expectedMessageOrArray)}.`,
          );
        }

        const normalizedMessage = normalizeCodeLocInfo(message);
        receivedLogs.push(normalizedMessage);

        // Check the number of %s interpolations.
        // We'll fail the test if they mismatch.
        let argIndex = 0;
        // console.* could have been called with a non-string e.g. `console.error(new Error())`
        // eslint-disable-next-line react-internal/safe-string-coercion
        String(format).replace(/%s|%c|%o/g, () => argIndex++);
        if (argIndex !== args.length) {
          if (format.includes('%c%s')) {
            // We intentionally use mismatching formatting when printing badging because we don't know
            // the best default to use for different types because the default varies by platform.
          } else {
            logsMismatchingFormat.push({
              format,
              args,
              expectedArgCount: argIndex,
            });
          }
        }

        // Check for extra component stacks
        if (
          args.length >= 2 &&
          isLikelyAComponentStack(args[args.length - 1]) &&
          isLikelyAComponentStack(args[args.length - 2])
        ) {
          logsWithExtraComponentStack.push({
            format,
          });
        }

        // Main logic to check if log is expected, with the component stack.
        // Check for exact match OR if the message matches with a component stack appended
        let matchesExpectedMessage = false;
        let expectsErrorStack = false;
        const hasErrorStack = isLikelyAnErrorStackTrace(message);

        if (typeof expectedMessage === 'string') {
          if (normalizedMessage === expectedMessage) {
            matchesExpectedMessage = true;
          } else if (expectedMessage.includes('\n    in <stack>')) {
            expectsErrorStack = true;
            // \n    in <stack> is ONLY for JavaScript Error stack traces (e.g., "Error: message\n  at fn (file.js:1:2)")
            // NOT for React component stacks (e.g., "\n    in ComponentName (at **)").
            // Validate that the actual message looks like an error stack trace.
            if (!hasErrorStack) {
              // The actual message doesn't look like an error stack trace.
              // This is likely a misuse - someone used \n    in <stack> for a component stack.
              stackTracePlaceholderMisuses.push({
                expected: expectedMessage,
                received: normalizedMessage,
              });
            }

            const expectedMessageWithoutStack = expectedMessage.replace(
              '\n    in <stack>',
              '',
            );
            if (normalizedMessage.startsWith(expectedMessageWithoutStack)) {
              // Remove the stack trace
              const remainder = normalizedMessage.slice(
                expectedMessageWithoutStack.length,
              );

              // After normalization, both error stacks and component stacks look like
              // component stacks (at frames are converted to "in ... (at **)" format).
              // So we check isLikelyAComponentStack for matching purposes.
              if (isLikelyAComponentStack(remainder)) {
                const messageWithoutStack = normalizedMessage.replace(
                  remainder,
                  '',
                );
                if (messageWithoutStack === expectedMessageWithoutStack) {
                  matchesExpectedMessage = true;
                }
              } else if (remainder === '') {
                // \n    in <stack> was expected but there's no stack at all
                matchesExpectedMessage = true;
              }
            } else if (normalizedMessage === expectedMessageWithoutStack) {
              // \n    in <stack> was expected but actual has no stack at all (exact match without stack)
              matchesExpectedMessage = true;
            }
          } else if (
            hasErrorStack &&
            !expectedMessage.includes('\n    in <stack>') &&
            normalizedMessage.startsWith(expectedMessage)
          ) {
            matchesExpectedMessage = true;
          }
        }

        if (matchesExpectedMessage) {
          // Check for unexpected/missing error stacks
          if (hasErrorStack && !expectsErrorStack) {
            // Error stack is present but \n    in <stack> was not in the expected message
            unexpectedIncludingErrorStack.push(normalizedMessage);
          } else if (
            expectsErrorStack &&
            !hasErrorStack &&
            !isLikelyAComponentStack(normalizedMessage)
          ) {
            // \n    in <stack> was expected but the actual message doesn't have any stack at all
            // (if it has a component stack, stackTracePlaceholderMisuses already handles it)
            unexpectedMissingErrorStack.push(normalizedMessage);
          }

          // Found expected log, remove it from missing.
          missingExpectedLogs.splice(0, 1);
        } else {
          unexpectedLogs.push(normalizedMessage);
        }
      }

      // Helper for pretty printing diffs consistently.
      // We inline multi-line logs for better diff printing.
      // eslint-disable-next-line no-inner-declarations
      function printDiff() {
        return `${diff(
          expectedMessages
            .map(message => message.replace('\n', ' '))
            .join('\n'),
          receivedLogs.map(message => message.replace('\n', ' ')).join('\n'),
          {
            aAnnotation: `Expected ${logName()}s`,
            bAnnotation: `Received ${logName()}s`,
          },
        )}`;
      }

      // Wrong %s formatting is a failure.
      // This is a common mistake when creating new warnings.
      if (logsMismatchingFormat.length > 0) {
        throwFormattedError(
          logsMismatchingFormat
            .map(
              item =>
                `Received ${item.args.length} arguments for a message with ${
                  item.expectedArgCount
                } placeholders:\n  ${printReceived(item.format)}`,
            )
            .join('\n\n'),
        );
      }

      // Any unexpected warnings should be treated as a failure.
      if (unexpectedLogs.length > 0) {
        throwFormattedError(
          `Unexpected ${logName()}(s) recorded.\n\n${printDiff()}`,
        );
      }

      // Any remaining messages indicate a failed expectations.
      if (missingExpectedLogs.length > 0) {
        throwFormattedError(
          `Expected ${logName()} was not recorded.\n\n${printDiff()}`,
        );
      }

      // Any logs that include an error stack trace but \n    in <stack> wasn't expected.
      if (unexpectedIncludingErrorStack.length > 0) {
        throwFormattedError(
          `${unexpectedIncludingErrorStack
            .map(
              stack =>
                `Unexpected error stack trace for:\n  ${printReceived(stack)}`,
            )
            .join(
              '\n\n',
            )}\n\nIf this ${logName()} should include an error stack trace, add \\n    in <stack> to your expected message ` +
            `(e.g., "Error: message\\n    in <stack>").`,
        );
      }

      // Any logs that are missing an error stack trace when \n    in <stack> was expected.
      if (unexpectedMissingErrorStack.length > 0) {
        throwFormattedError(
          `${unexpectedMissingErrorStack
            .map(
              stack =>
                `Missing error stack trace for:\n  ${printReceived(stack)}`,
            )
            .join(
              '\n\n',
            )}\n\nThe expected message uses \\n    in <stack> but the actual ${logName()} doesn't include an error stack trace.` +
            `\nIf this ${logName()} should not have an error stack trace, remove \\n    in <stack> from your expected message.`,
        );
      }

      // Duplicate component stacks is a failure.
      // This used to be a common mistake when creating new warnings,
      // but might not be an issue anymore.
      if (logsWithExtraComponentStack.length > 0) {
        throwFormattedError(
          logsWithExtraComponentStack
            .map(
              item =>
                `Received more than one component stack for a warning:\n  ${printReceived(
                  item.format,
                )}`,
            )
            .join('\n\n'),
        );
      }

      // Using \n    in <stack> for component stacks is a misuse.
      // \n    in <stack> should only be used for JavaScript Error stack traces,
      // not for React component stacks.
      if (stackTracePlaceholderMisuses.length > 0) {
        throwFormattedError(
          `${stackTracePlaceholderMisuses
            .map(
              item =>
                `Incorrect use of \\n    in <stack> placeholder. The placeholder is for JavaScript Error ` +
                `stack traces (messages starting with "Error:"), not for React component stacks.\n\n` +
                `Expected: ${printReceived(item.expected)}\n` +
                `Received: ${printReceived(item.received)}\n\n` +
                `If this ${logName()} has a component stack, include the full component stack in your expected message ` +
                `(e.g., "Warning message\\n    in ComponentName (at **)").`,
            )
            .join('\n\n')}`,
        );
      }
    }
  };
}
