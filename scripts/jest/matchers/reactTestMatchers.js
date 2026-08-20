'use strict';

const JestReact = require('jest-react');
const {assertConsoleLogsCleared} = require('internal-test-utils/consoleMock');
// TODO: Move to ReactInternalTestUtils

function captureAssertion(fn) {
  // Trick to use a Jest matcher inside another Jest matcher. `fn` contains an
  // assertion; if it throws, we capture the error and return it, so the stack
  // trace presented to the user points to the original assertion in the
  // test file.
  try {
    fn();
  } catch (error) {
    return {
      pass: false,
      message: () => error.message,
    };
  }
  return {pass: true};
}

function assertYieldsWereCleared(Scheduler, caller) {
  const actualYields = Scheduler.unstable_clearLog();
  if (actualYields.length !== 0) {
    const error = Error(
      'The event log is not empty. Call assertLog(...) first.'
    );
    Error.captureStackTrace(error, caller);
    throw error;
  }
  assertConsoleLogsCleared();
}

function toMatchRenderedOutput(ReactNoop, expectedJSX) {
  if (typeof ReactNoop.getChildrenAsJSX === 'function') {
    const Scheduler = ReactNoop._Scheduler;
    assertYieldsWereCleared(Scheduler, toMatchRenderedOutput);
    return captureAssertion(() => {
      expect(ReactNoop.getChildrenAsJSX()).toEqual(expectedJSX);
    });
  }
  return JestReact.unstable_toMatchRenderedOutput(ReactNoop, expectedJSX);
}

module.exports = {
  toMatchRenderedOutput,
};
