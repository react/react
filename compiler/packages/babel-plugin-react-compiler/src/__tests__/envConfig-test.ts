/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Effect, validateEnvironmentConfig} from '..';
import {ValueKind} from '../HIR';

describe('parseConfigPragma()', () => {
  it('passing null throws', () => {
    expect(() => validateEnvironmentConfig(null as any)).toThrow();
  });

  // tests that the error message remains useful
  it('passing incorrect value throws', () => {
    expect(() => {
      validateEnvironmentConfig({
        validateHooksUsage: 1,
      } as any);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Error: Could not validate environment config. Update React Compiler config to fix the error. Validation error: Invalid input: expected boolean, received number at "validateHooksUsage"."`,
    );
  });

  it('can parse stringy enums', () => {
    const stringyHook = {
      effectKind: 'freeze',
      valueKind: 'frozen',
    };
    const env = {
      customHooks: new Map([['useFoo', stringyHook]]),
    };
    const validatedEnv = validateEnvironmentConfig(env as any);
    const validatedHook = validatedEnv.customHooks.get('useFoo');
    expect(validatedHook?.effectKind).toBe(Effect.Freeze);
    expect(validatedHook?.valueKind).toBe(ValueKind.Frozen);
  });
});
