/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerErrorDetail, EnvironmentConfig} from '..';
import {ErrorCategory} from '../CompilerError';
import {HIRFunction, IdentifierId} from '../HIR';
import {DEFAULT_GLOBALS} from '../HIR/Globals';

export function validateNoCapitalizedCalls(fn: HIRFunction): void {
  const envConfig: EnvironmentConfig = fn.env.config;
  const ALLOW_LIST = new Set([
    ...DEFAULT_GLOBALS.keys(),
    ...(envConfig.validateNoCapitalizedCalls ?? []),
  ]);
  const isAllowed = (name: string): boolean => {
    return ALLOW_LIST.has(name);
  };

  const capitalLoadGlobals = new Map<IdentifierId, string>();
  const capitalizedProperties = new Map<IdentifierId, string>();
  const reason =
    'Capitalized functions are reserved for components, which must be invoked with JSX. If this is a component, render it with JSX. Otherwise, ensure that it has no hook calls and rename it to begin with a lowercase letter. Alternatively, if you know for a fact that this function is not a component, you can allowlist it via the compiler config';
  for (const [, block] of fn.body.blocks) {
    for (const {lvalue, value} of block.instructions) {
      switch (value.kind) {
        case 'LoadGlobal': {
          if (
            value.binding.name != '' &&
            /^[A-Z]/.test(value.binding.name) &&
            // We don't want to flag CONSTANTS()
            !(value.binding.name.toUpperCase() === value.binding.name) &&
            !isAllowed(value.binding.name)
          ) {
            capitalLoadGlobals.set(lvalue.identifier.id, value.binding.name);
          }

          break;
        }
        case 'CallExpression': {
          const calleeIdentifier = value.callee.identifier.id;
          const calleeName = capitalLoadGlobals.get(calleeIdentifier);
          if (calleeName != null) {
            fn.env.recordError(
              new CompilerErrorDetail({
                category: ErrorCategory.CapitalizedCalls,
                reason,
                description: `${calleeName} may be a component`,
                loc: value.loc,
                suggestions: null,
              }),
            );
            continue;
          }
          break;
        }
        case 'PropertyLoad': {
          // Start conservative and disallow all capitalized method calls
          if (
            typeof value.property === 'string' &&
            /^[A-Z]/.test(value.property)
          ) {
            capitalizedProperties.set(lvalue.identifier.id, value.property);
          }
          break;
        }
        case 'MethodCall': {
          const propertyIdentifier = value.property.identifier.id;
          const propertyName = capitalizedProperties.get(propertyIdentifier);
          if (propertyName != null) {
            fn.env.recordError(
              new CompilerErrorDetail({
                category: ErrorCategory.CapitalizedCalls,
                reason,
                description: `${propertyName} may be a component`,
                loc: value.loc,
                suggestions: null,
              }),
            );
          }
          break;
        }
      }
    }
  }
}
