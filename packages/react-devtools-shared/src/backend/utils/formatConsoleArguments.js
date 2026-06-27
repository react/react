/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Do not add / import anything to this file.
// This function could be used from multiple places, including hook.

// Skips CSS and object arguments, inlines other in the first argument as a template string
export default function formatConsoleArguments(
  maybeMessage: any,
  ...inputArgs: $ReadOnlyArray<any>
): $ReadOnlyArray<any> {
  if (inputArgs.length === 0 || typeof maybeMessage !== 'string') {
    return [maybeMessage, ...inputArgs];
  }

  const args = inputArgs.slice();

  let template = '';
  let argumentsPointer = 0;
  for (let i = 0; i < maybeMessage.length; ++i) {
    const currentChar = maybeMessage[i];
    if (currentChar !== '%') {
      template += currentChar;
      continue;
    }

    const nextChar = maybeMessage[i + 1];
    ++i;

    // Only keep CSS and objects, inline other arguments
    switch (nextChar) {
      case 'c':
      case 'O':
      case 'o': {
        ++argumentsPointer;
        template += `%${nextChar}`;

        break;
      }
      case 'd':
      case 'i': {
        const [arg] = args.splice(argumentsPointer, 1);
        template += parseInt(arg, 10).toString();

        break;
      }
      case 'f': {
        const [arg] = args.splice(argumentsPointer, 1);
        template += parseFloat(arg).toString();

        break;
      }
      case 's': {
        const [arg] = args.splice(argumentsPointer, 1);
        template += String(arg);

        break;
      }

      default:
        if (nextChar === undefined) {
          // A trailing '%' with no following character. Keep it as a literal
          // '%' rather than emitting the string 'undefined'.
          template += '%';
        } else {
          template += `%${nextChar}`;
        }
    }
  }

  return [template, ...args];
}
