/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {
  Effect,
  ValueKind,
  ValueReason,
} from 'babel-plugin-react-compiler/src';
import type {TypeConfig} from 'babel-plugin-react-compiler/src/HIR/TypeSchema';

export function makeSharedRuntimeTypeProvider({
  EffectEnum,
  ValueKindEnum,
  ValueReasonEnum,
}: {
  EffectEnum: typeof Effect;
  ValueKindEnum: typeof ValueKind;
  ValueReasonEnum: typeof ValueReason;
}) {
  return function sharedRuntimeTypeProvider(
    moduleName: string,
  ): TypeConfig | null {
    if (moduleName === 'shared-runtime') {
      return {
        kind: 'object',
        properties: {
          default: {
            kind: 'function',
            calleeEffect: EffectEnum.Read,
            positionalParams: [],
            restParam: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Primitive'},
            returnValueKind: ValueKindEnum.Primitive,
          },
          graphql: {
            kind: 'function',
            calleeEffect: EffectEnum.Read,
            positionalParams: [],
            restParam: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Primitive'},
            returnValueKind: ValueKindEnum.Primitive,
          },
          typedArrayPush: {
            kind: 'function',
            calleeEffect: EffectEnum.Read,
            positionalParams: [EffectEnum.Store, EffectEnum.Capture],
            restParam: EffectEnum.Capture,
            returnType: {kind: 'type', name: 'Primitive'},
            returnValueKind: ValueKindEnum.Primitive,
          },
          typedLog: {
            kind: 'function',
            calleeEffect: EffectEnum.Read,
            positionalParams: [],
            restParam: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Primitive'},
            returnValueKind: ValueKindEnum.Primitive,
          },
          useFreeze: {
            kind: 'hook',
            returnType: {kind: 'type', name: 'Any'},
          },
          useFragment: {
            kind: 'hook',
            returnType: {kind: 'type', name: 'MixedReadonly'},
            noAlias: true,
          },
          useNoAlias: {
            kind: 'hook',
            returnType: {kind: 'type', name: 'Any'},
            returnValueKind: ValueKindEnum.Mutable,
            noAlias: true,
          },
          typedIdentity: {
            kind: 'function',
            positionalParams: [EffectEnum.Read],
            restParam: null,
            calleeEffect: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Any'},
            returnValueKind: ValueKindEnum.Mutable,
            aliasing: {
              receiver: '@receiver',
              params: ['@value'],
              rest: null,
              returns: '@return',
              temporaries: [],
              effects: [{kind: 'Assign', from: '@value', into: '@return'}],
            },
          },
          typedAssign: {
            kind: 'function',
            positionalParams: [EffectEnum.Read],
            restParam: null,
            calleeEffect: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Any'},
            returnValueKind: ValueKindEnum.Mutable,
            aliasing: {
              receiver: '@receiver',
              params: ['@value'],
              rest: null,
              returns: '@return',
              temporaries: [],
              effects: [{kind: 'Assign', from: '@value', into: '@return'}],
            },
          },
          typedAlias: {
            kind: 'function',
            positionalParams: [EffectEnum.Read],
            restParam: null,
            calleeEffect: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Any'},
            returnValueKind: ValueKindEnum.Mutable,
            aliasing: {
              receiver: '@receiver',
              params: ['@value'],
              rest: null,
              returns: '@return',
              temporaries: [],
              effects: [
                {
                  kind: 'Create',
                  into: '@return',
                  value: ValueKindEnum.Mutable,
                  reason: ValueReasonEnum.KnownReturnSignature,
                },
                {kind: 'Alias', from: '@value', into: '@return'},
              ],
            },
          },
          typedCapture: {
            kind: 'function',
            positionalParams: [EffectEnum.Read],
            restParam: null,
            calleeEffect: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Array'},
            returnValueKind: ValueKindEnum.Mutable,
            aliasing: {
              receiver: '@receiver',
              params: ['@value'],
              rest: null,
              returns: '@return',
              temporaries: [],
              effects: [
                {
                  kind: 'Create',
                  into: '@return',
                  value: ValueKindEnum.Mutable,
                  reason: ValueReasonEnum.KnownReturnSignature,
                },
                {kind: 'Capture', from: '@value', into: '@return'},
              ],
            },
          },
          typedCreateFrom: {
            kind: 'function',
            positionalParams: [EffectEnum.Read],
            restParam: null,
            calleeEffect: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Any'},
            returnValueKind: ValueKindEnum.Mutable,
            aliasing: {
              receiver: '@receiver',
              params: ['@value'],
              rest: null,
              returns: '@return',
              temporaries: [],
              effects: [{kind: 'CreateFrom', from: '@value', into: '@return'}],
            },
          },
          typedMutate: {
            kind: 'function',
            positionalParams: [EffectEnum.Read, EffectEnum.Capture],
            restParam: null,
            calleeEffect: EffectEnum.Store,
            returnType: {kind: 'type', name: 'Primitive'},
            returnValueKind: ValueKindEnum.Primitive,
            aliasing: {
              receiver: '@receiver',
              params: ['@object', '@value'],
              rest: null,
              returns: '@return',
              temporaries: [],
              effects: [
                {
                  kind: 'Create',
                  into: '@return',
                  value: ValueKindEnum.Primitive,
                  reason: ValueReasonEnum.KnownReturnSignature,
                },
                {kind: 'Mutate', value: '@object'},
                {kind: 'Capture', from: '@value', into: '@object'},
              ],
            },
          },
          PanResponder: {
            kind: 'object',
            properties: {
              create: {
                kind: 'function',
                positionalParams: [EffectEnum.Freeze],
                restParam: null,
                calleeEffect: EffectEnum.Read,
                returnType: {kind: 'type', name: 'Any'},
                returnValueKind: ValueKindEnum.Frozen,
                aliasing: {
                  receiver: '@receiver',
                  params: ['@config'],
                  rest: null,
                  returns: '@returns',
                  temporaries: [],
                  effects: [
                    {
                      kind: 'Freeze',
                      value: '@config',
                      reason: ValueReasonEnum.KnownReturnSignature,
                    },
                    {
                      kind: 'Create',
                      into: '@returns',
                      value: ValueKindEnum.Frozen,
                      reason: ValueReasonEnum.KnownReturnSignature,
                    },
                    {
                      kind: 'ImmutableCapture',
                      from: '@config',
                      into: '@returns',
                    },
                  ],
                },
              },
            },
          },
        },
      };
    } else if (moduleName === 'ReactCompilerKnownIncompatibleTest') {
      /**
       * Fake module used for testing validation of known incompatible
       * API validation
       */
      return {
        kind: 'object',
        properties: {
          useKnownIncompatible: {
            kind: 'hook',
            positionalParams: [],
            restParam: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Any'},
            knownIncompatible: `useKnownIncompatible is known to be incompatible`,
          },
          useKnownIncompatibleIndirect: {
            kind: 'hook',
            positionalParams: [],
            restParam: EffectEnum.Read,
            returnType: {
              kind: 'object',
              properties: {
                incompatible: {
                  kind: 'function',
                  positionalParams: [],
                  restParam: EffectEnum.Read,
                  calleeEffect: EffectEnum.Read,
                  returnType: {kind: 'type', name: 'Any'},
                  returnValueKind: ValueKindEnum.Mutable,
                  knownIncompatible: `useKnownIncompatibleIndirect returns an incompatible() function that is known incompatible`,
                },
              },
            },
          },
          knownIncompatible: {
            kind: 'function',
            positionalParams: [],
            restParam: EffectEnum.Read,
            calleeEffect: EffectEnum.Read,
            returnType: {kind: 'type', name: 'Any'},
            returnValueKind: ValueKindEnum.Mutable,
            knownIncompatible: `useKnownIncompatible is known to be incompatible`,
          },
        },
      };
    } else if (moduleName === 'ReactCompilerTest') {
      /**
       * Fake module used for testing validation that type providers return hook
       * types for hook names and non-hook types for non-hook names
       */
      return {
        kind: 'object',
        properties: {
          useHookNotTypedAsHook: {
            kind: 'type',
            name: 'Any',
          },
          notAhookTypedAsHook: {
            kind: 'hook',
            returnType: {kind: 'type', name: 'Any'},
          },
        },
      };
    } else if (moduleName === 'useDefaultExportNotTypedAsHook') {
      /**
       * Fake module used for testing validation that type providers return hook
       * types for hook names and non-hook types for non-hook names
       */
      return {
        kind: 'object',
        properties: {
          default: {
            kind: 'type',
            name: 'Any',
          },
        },
      };
    }
    return null;
  };
}
