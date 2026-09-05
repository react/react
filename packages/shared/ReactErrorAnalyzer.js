/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const ERROR_PATTERNS = [
  {
    pattern: /Cannot read properties of null|Cannot read property .* of null|null is not an object/i,
    suggestion: 'Check if you are trying to access a property on a null object. Ensure the state or prop is initialized before accessing it, or use optional chaining (?.).',
  },
  {
    pattern: /Invalid hook call/i,
    suggestion: 'Hooks can only be called inside of the body of a function component. Ensure you are not calling them inside loops, conditions, or nested functions.',
  },
  {
    pattern: /Objects are not valid as a React child/i,
    suggestion: 'You are trying to render a plain JavaScript object. If you meant to render a collection of children, use an array instead.',
  },
  {
    pattern: /Minified React error/i,
    suggestion: 'Visit the URL in the error message for the full, unminified error details.',
  }
];

export function analyzeError(errorMessage: mixed): string | null {
  let errorStr = '';
  if (typeof errorMessage === 'string') {
    errorStr = errorMessage;
  } else if (errorMessage instanceof Error) {
    errorStr = errorMessage.message;
  } else {
    return null;
  }

  for (let i = 0; i < ERROR_PATTERNS.length; i++) {
    if (ERROR_PATTERNS[i].pattern.test(errorStr)) {
      return ERROR_PATTERNS[i].suggestion;
    }
  }

  return null;
}