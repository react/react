/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Effect, ValueKind, ValueReason} from './HIR';
import {
  BUILTIN_SHAPES,
  BuiltInArrayId,
  BuiltInMapId,
  BuiltInMixedReadonlyId,
  BuiltInObjectId,
  BuiltInSetId,
  BuiltInUseActionStateId,
  BuiltInUseContextHookId,
  BuiltInUseEffectEventId,
  BuiltInUseEffectHookId,
  BuiltInUseInsertionEffectHookId,
  BuiltInUseLayoutEffectHookId,
  BuiltInUseOperatorId,
  BuiltInUseOptimisticId,
  BuiltInUseReducerId,
  BuiltInUseRefId,
  BuiltInUseStateId,
  BuiltInUseTransitionId,
  BuiltInWeakMapId,
  BuiltInWeakSetId,
  BuiltInEffectEventId,
  ReanimatedSharedValueId,
  ShapeRegistry,
  addFunction,
  addHook,
  addObject,
} from './ObjectShape';
import {BuiltInType, ObjectType, PolyType} from './Types';
import {TypeConfig} from './TypeSchema';
import {assertExhaustive} from '../Utils/utils';
import {isHookName} from './Environment';
import {CompilerError, SourceLocation} from '..';

/*
 * This file exports types and defaults for JavaScript global objects.
 * A Forget `Environment` stores the GlobalRegistry and ShapeRegistry
 * used for the current project. These ultimately help Forget refine
 * its inference of types (i.e. Object vs Primitive) and effects
 * (i.e. read vs mutate) in source programs.
 */

// ShapeRegistry with default definitions for builtins and global objects.
export const DEFAULT_SHAPES: ShapeRegistry = new Map(BUILTIN_SHAPES);

// Hack until we add ObjectShapes for all globals
const UNTYPED_GLOBALS: Set<string> = new Set([
  'Object',
  'Function',
  'RegExp',
  'Date',
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'EvalError',
  'DataView',
  'Float32Array',
  'Float64Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'WeakMap',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'ArrayBuffer',
  'JSON',
  'console',
  'eval',
]);

const TYPED_GLOBALS: Array<[string, BuiltInType]> = [
  [
    'Object',
    addObject(DEFAULT_SHAPES, 'Object', [
      [
        'keys',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [Effect.Read],
          restParam: null,
          returnType: {kind: 'Object', shapeId: BuiltInArrayId},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable,
        }),
      ],
      [
        /**
         * Object.fromEntries(iterable)
         * iterable: An iterable, such as an Array or Map, containing a list of
         *           objects. Each object should have two properties.
         * Returns a new object whose properties are given by the entries of the
         * iterable.
         */
        'fromEntries',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [Effect.ConditionallyMutate],
          restParam: null,
          returnType: {kind: 'Object', shapeId: BuiltInObjectId},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable,
        }),
      ],
      [
        'entries',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [Effect.Capture],
          restParam: null,
          returnType: {kind: 'Object', shapeId: BuiltInArrayId},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable,
          aliasing: {
            receiver: '@receiver',
            params: ['@object'],
            rest: null,
            returns: '@returns',
            temporaries: [],
            effects: [
              {
                kind: 'Create',
                into: '@returns',
                reason: ValueReason.KnownReturnSignature,
                value: ValueKind.Mutable,
              },
              // Object values are captured into the return
              {
                kind: 'Capture',
                from: '@object',
                into: '@returns',
              },
            ],
          },
        }),
      ],
      [
        'keys',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [Effect.Read],
          restParam: null,
          returnType: {kind: 'Object', shapeId: BuiltInArrayId},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable,
          aliasing: {
            receiver: '@receiver',
            params: ['@object'],
            rest: null,
            returns: '@returns',
            temporaries: [],
            effects: [
              {
                kind: 'Create',
                into: '@returns',
                reason: ValueReason.KnownReturnSignature,
                value: ValueKind.Mutable,
              },
              // Only keys are captured, and keys are immutable
              {
                kind: 'ImmutableCapture',
                from: '@object',
                into: '@returns',
              },
            ],
          },
        }),
      ],
      [
        'values',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [Effect.Capture],
          restParam: null,
          returnType: {kind: 'Object', shapeId: BuiltInArrayId},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable,
          aliasing: {
            receiver: '@receiver',
            params: ['@object'],
            rest: null,
            returns: '@returns',
            temporaries: [],
            effects: [
              {
                kind: 'Create',
                into: '@returns',
                reason: ValueReason.KnownReturnSignature,
                value: ValueKind.Mutable,
              },
              // Object values are captured into the return
              {
                kind: 'Capture',
                from: '@object',
                into: '@returns',
              },
            ],
          },
        }),
      ],
    ]),
  ],
  [
    'Array',
    addObject(DEFAULT_SHAPES, 'Array', [
      [
        'isArray',
        // Array.isArray(value)
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [Effect.Read],
          restParam: null,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      /*
       * https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.from
       * Array.from(arrayLike, optionalFn, optionalThis)
       * Note that the Effect of `arrayLike` is polymorphic i.e.
       *  - Effect.read if
       *     - it does not have an @iterator property and is array-like
       *       (i.e. has a length property)
       *    - it is an iterable object whose iterator does not mutate itself
       *  - Effect.mutate if it is a self-mutative iterator (e.g. a generator
       *    function)
       */
      [
        'from',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [
            Effect.ConditionallyMutateIterator,
            Effect.ConditionallyMutate,
            Effect.ConditionallyMutate,
          ],
          restParam: Effect.Read,
          returnType: {kind: 'Object', shapeId: BuiltInArrayId},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable,
        }),
      ],
      [
        'of',
        // Array.of(element0, ..., elementN)
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Object', shapeId: BuiltInArrayId},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable,
        }),
      ],
    ]),
  ],
  [
    'performance',
    addObject(DEFAULT_SHAPES, 'performance', [
      // Static methods (TODO)
      [
        'now',
        // Date.now()
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Poly'}, // TODO: could be Primitive, but that would change existing compilation
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable, // same here
          impure: true,
          canonicalName: 'performance.now',
        }),
      ],
    ]),
  ],
  [
    'Date',
    addObject(DEFAULT_SHAPES, 'Date', [
      // Static methods (TODO)
      [
        'now',
        // Date.now()
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Poly'}, // TODO: could be Primitive, but that would change existing compilation
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable, // same here
          impure: true,
          canonicalName: 'Date.now',
        }),
      ],
    ]),
  ],
  [
    'Math',
    addObject(DEFAULT_SHAPES, 'Math', [
      // Static properties (TODO)
      ['PI', {kind: 'Primitive'}],
      // Static methods (TODO)
      [
        'max',
        // Math.max(value0, ..., valueN)
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'min',
        // Math.min(value0, ..., valueN)
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'trunc',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'ceil',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'floor',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'pow',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'random',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Poly'}, // TODO: could be Primitive, but that would change existing compilation
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable, // same here
          impure: true,
          canonicalName: 'Math.random',
        }),
      ],
    ]),
  ],
  ['Infinity', {kind: 'Primitive'}],
  ['NaN', {kind: 'Primitive'}],
  [
    'console',
    addObject(DEFAULT_SHAPES, 'console', [
      [
        'error',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'info',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'log',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'table',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'trace',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
      [
        'warn',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Read,
          returnType: {kind: 'Primitive'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Primitive,
        }),
      ],
    ]),
  ],
  [
    'Boolean',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'Number',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'String',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'parseInt',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'parseFloat',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'isNaN',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'isFinite',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'encodeURI',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'encodeURIComponent',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'decodeURI',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'decodeURIComponent',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'Map',
    addFunction(
      DEFAULT_SHAPES,
      [],
      {
        positionalParams: [Effect.ConditionallyMutateIterator],
        restParam: null,
        returnType: {kind: 'Object', shapeId: BuiltInMapId},
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Mutable,
      },
      null,
      true,
    ),
  ],
  [
    'Set',
    addFunction(
      DEFAULT_SHAPES,
      [],
      {
        positionalParams: [Effect.ConditionallyMutateIterator],
        restParam: null,
        returnType: {kind: 'Object', shapeId: BuiltInSetId},
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Mutable,
      },
      null,
      true,
    ),
  ],
  [
    'WeakMap',
    addFunction(
      DEFAULT_SHAPES,
      [],
      {
        positionalParams: [Effect.ConditionallyMutateIterator],
        restParam: null,
        returnType: {kind: 'Object', shapeId: BuiltInWeakMapId},
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Mutable,
      },
      null,
      true,
    ),
  ],
  [
    'WeakSet',
    addFunction(
      DEFAULT_SHAPES,
      [],
      {
        positionalParams: [Effect.ConditionallyMutateIterator],
        restParam: null,
        returnType: {kind: 'Object', shapeId: BuiltInWeakSetId},
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Mutable,
      },
      null,
      true,
    ),
  ],
  // TODO: rest of Global objects
];

/*
 * TODO(mofeiZ): We currently only store rest param effects for hooks.
 * now that FeatureFlag `enableTreatHooksAsFunctions` is removed we can
 * use positional params too (?)
 */
const REACT_APIS: Array<[string, BuiltInType]> = [
  [
    'useContext',
    addHook(
      DEFAULT_SHAPES,
      {
        positionalParams: [],
        restParam: Effect.Read,
        returnType: {kind: 'Poly'},
        calleeEffect: Effect.Read,
        hookKind: 'useContext',
        returnValueKind: ValueKind.Frozen,
        returnValueReason: ValueReason.Context,
      },
      BuiltInUseContextHookId,
    ),
  ],
  [
    'useState',
    addHook(DEFAULT_SHAPES, {
      positionalParams: [],
      restParam: Effect.Freeze,
      returnType: {kind: 'Object', shapeId: BuiltInUseStateId},
      calleeEffect: Effect.Read,
      hookKind: 'useState',
      returnValueKind: ValueKind.Frozen,
      returnValueReason: ValueReason.State,
    }),
  ],
  [
    'useActionState',
    addHook(DEFAULT_SHAPES, {
      positionalParams: [],
      restParam: Effect.Freeze,
      returnType: {kind: 'Object', shapeId: BuiltInUseActionStateId},
      calleeEffect: Effect.Read,
      hookKind: 'useActionState',
      returnValueKind: ValueKind.Frozen,
      returnValueReason: ValueReason.State,
    }),
  ],
  [
    'useReducer',
    addHook(DEFAULT_SHAPES, {
      positionalParams: [],
      restParam: Effect.Freeze,
      returnType: {kind: 'Object', shapeId: BuiltInUseReducerId},
      calleeEffect: Effect.Read,
      hookKind: 'useReducer',
      returnValueKind: ValueKind.Frozen,
      returnValueReason: ValueReason.ReducerState,
    }),
  ],
  [
    'useRef',
    addHook(DEFAULT_SHAPES, {
      positionalParams: [],
      restParam: Effect.Capture,
      returnType: {kind: 'Object', shapeId: BuiltInUseRefId},
      calleeEffect: Effect.Read,
      hookKind: 'useRef',
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'useImperativeHandle',
    addHook(DEFAULT_SHAPES, {
      positionalParams: [],
      restParam: Effect.Freeze,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      hookKind: 'useImperativeHandle',
      returnValueKind: ValueKind.Frozen,
    }),
  ],
  [
    'useMemo',
    addHook(DEFAULT_SHAPES, {
      positionalParams: [],
      restParam: Effect.Freeze,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Read,
      hookKind: 'useMemo',
      returnValueKind: ValueKind.Frozen,
    }),
  ],
  [
    'useCallback',
    addHook(DEFAULT_SHAPES, {
      positionalParams: [],
      restParam: Effect.Freeze,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Read,
      hookKind: 'useCallback',
      returnValueKind: ValueKind.Frozen,
    }),
  ],
  [
    'useEffect',
    addHook(
      DEFAULT_SHAPES,
      {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: {kind: 'Primitive'},
        calleeEffect: Effect.Read,
        hookKind: 'useEffect',
        returnValueKind: ValueKind.Frozen,
        aliasing: {
          receiver: '@receiver',
          params: [],
          rest: '@rest',
          returns: '@returns',
          temporaries: ['@effect'],
          effects: [
            // Freezes the function and deps
            {
              kind: 'Freeze',
              value: '@rest',
              reason: ValueReason.Effect,
            },
            // Internally creates an effect object that captures the function and deps
            {
              kind: 'Create',
              into: '@effect',
              value: ValueKind.Frozen,
              reason: ValueReason.KnownReturnSignature,
            },
            // The effect stores the function and dependencies
            {
              kind: 'Capture',
              from: '@rest',
              into: '@effect',
            },
            // Returns undefined
            {
              kind: 'Create',
              into: '@returns',
              value: ValueKind.Primitive,
              reason: ValueReason.KnownReturnSignature,
            },
          ],
        },
      },
      BuiltInUseEffectHookId,
    ),
  ],
  [
    'useLayoutEffect',
    addHook(
      DEFAULT_SHAPES,
      {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: {kind: 'Poly'},
        calleeEffect: Effect.Read,
        hookKind: 'useLayoutEffect',
        returnValueKind: ValueKind.Frozen,
      },
      BuiltInUseLayoutEffectHookId,
    ),
  ],
  [
    'useInsertionEffect',
    addHook(
      DEFAULT_SHAPES,
      {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: {kind: 'Poly'},
        calleeEffect: Effect.Read,
        hookKind: 'useInsertionEffect',
        returnValueKind: ValueKind.Frozen,
      },
      BuiltInUseInsertionEffectHookId,
    ),
  ],
  [
    'useTransition',
    addHook(DEFAULT_SHAPES, {
      positionalParams: [],
      restParam: null,
      returnType: {kind: 'Object', shapeId: BuiltInUseTransitionId},
      calleeEffect: Effect.Read,
      hookKind: 'useTransition',
      returnValueKind: ValueKind.Frozen,
    }),
  ],
  [
    'useOptimistic',
    addHook(DEFAULT_SHAPES, {
      positionalParams: [],
      restParam: Effect.Freeze,
      returnType: {kind: 'Object', shapeId: BuiltInUseOptimisticId},
      calleeEffect: Effect.Read,
      hookKind: 'useOptimistic',
      returnValueKind: ValueKind.Frozen,
      returnValueReason: ValueReason.State,
    }),
  ],
  [
    'use',
    addFunction(
      DEFAULT_SHAPES,
      [],
      {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: {kind: 'Poly'},
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Frozen,
      },
      BuiltInUseOperatorId,
    ),
  ],
  [
    'useEffectEvent',
    addHook(
      DEFAULT_SHAPES,
      {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: {
          kind: 'Function',
          return: {kind: 'Poly'},
          shapeId: BuiltInEffectEventId,
          isConstructor: false,
        },
        calleeEffect: Effect.Read,
        hookKind: 'useEffectEvent',
        // Frozen because it should not mutate any locally-bound values
        returnValueKind: ValueKind.Frozen,
      },
      BuiltInUseEffectEventId,
    ),
  ],
];

TYPED_GLOBALS.push(
  [
    'React',
    addObject(DEFAULT_SHAPES, null, [
      ...REACT_APIS,
      [
        'createElement',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Freeze,
          returnType: {kind: 'Poly'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Frozen,
        }),
      ],
      [
        'cloneElement',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Freeze,
          returnType: {kind: 'Poly'},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Frozen,
        }),
      ],
      [
        'createRef',
        addFunction(DEFAULT_SHAPES, [], {
          positionalParams: [],
          restParam: Effect.Capture, // createRef takes no paramters
          returnType: {kind: 'Object', shapeId: BuiltInUseRefId},
          calleeEffect: Effect.Read,
          returnValueKind: ValueKind.Mutable,
        }),
      ],
    ]),
  ],
  [
    '_jsx',
    addFunction(DEFAULT_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Freeze,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Frozen,
    }),
  ],
);

export type Global = BuiltInType | PolyType;
export type GlobalRegistry = Map<string, Global>;
export const DEFAULT_GLOBALS: GlobalRegistry = new Map(REACT_APIS);

// Hack until we add ObjectShapes for all globals
for (const name of UNTYPED_GLOBALS) {
  DEFAULT_GLOBALS.set(name, {
    kind: 'Poly',
  });
}

for (const [name, type_] of TYPED_GLOBALS) {
  DEFAULT_GLOBALS.set(name, type_);
}

// Recursive global types
DEFAULT_GLOBALS.set(
  'globalThis',
  addObject(DEFAULT_SHAPES, 'globalThis', TYPED_GLOBALS),
);
DEFAULT_GLOBALS.set(
  'global',
  addObject(DEFAULT_SHAPES, 'global', TYPED_GLOBALS),
);

export function installTypeConfig(
  globals: GlobalRegistry,
  shapes: ShapeRegistry,
  typeConfig: TypeConfig,
  moduleName: string,
  loc: SourceLocation,
): Global {
  switch (typeConfig.kind) {
    case 'type': {
      switch (typeConfig.name) {
        case 'Array': {
          return {kind: 'Object', shapeId: BuiltInArrayId};
        }
        case 'MixedReadonly': {
          return {kind: 'Object', shapeId: BuiltInMixedReadonlyId};
        }
        case 'Primitive': {
          return {kind: 'Primitive'};
        }
        case 'Ref': {
          return {kind: 'Object', shapeId: BuiltInUseRefId};
        }
        case 'Any': {
          return {kind: 'Poly'};
        }
        default: {
          assertExhaustive(
            typeConfig.name,
            `Unexpected type '${(typeConfig as any).name}'`,
          );
        }
      }
    }
    case 'function': {
      return addFunction(shapes, [], {
        positionalParams: typeConfig.positionalParams,
        restParam: typeConfig.restParam,
        calleeEffect: typeConfig.calleeEffect,
        returnType: installTypeConfig(
          globals,
          shapes,
          typeConfig.returnType,
          moduleName,
          loc,
        ),
        returnValueKind: typeConfig.returnValueKind,
        noAlias: typeConfig.noAlias === true,
        mutableOnlyIfOperandsAreMutable:
          typeConfig.mutableOnlyIfOperandsAreMutable === true,
        aliasing: typeConfig.aliasing,
        knownIncompatible: typeConfig.knownIncompatible ?? null,
      });
    }
    case 'hook': {
      return addHook(shapes, {
        hookKind: 'Custom',
        positionalParams: typeConfig.positionalParams ?? [],
        restParam: typeConfig.restParam ?? Effect.Freeze,
        calleeEffect: Effect.Read,
        returnType: installTypeConfig(
          globals,
          shapes,
          typeConfig.returnType,
          moduleName,
          loc,
        ),
        returnValueKind: typeConfig.returnValueKind ?? ValueKind.Frozen,
        noAlias: typeConfig.noAlias === true,
        aliasing: typeConfig.aliasing,
        knownIncompatible: typeConfig.knownIncompatible ?? null,
      });
    }
    case 'object': {
      return addObject(
        shapes,
        null,
        Object.entries(typeConfig.properties ?? {}).map(([key, value]) => {
          const type = installTypeConfig(
            globals,
            shapes,
            value,
            moduleName,
            loc,
          );
          const expectHook = isHookName(key);
          let isHook = false;
          if (type.kind === 'Function' && type.shapeId !== null) {
            const functionType = shapes.get(type.shapeId);
            if (functionType?.functionType?.hookKind !== null) {
              isHook = true;
            }
          }
          if (expectHook !== isHook) {
            CompilerError.throwInvalidConfig({
              reason: `Invalid type configuration for module`,
              description: `Expected type for object property '${key}' from module '${moduleName}' ${expectHook ? 'to be a hook' : 'not to be a hook'} based on the property name`,
              loc,
            });
          }
          return [key, type];
        }),
      );
    }
    default: {
      assertExhaustive(
        typeConfig,
        `Unexpected type kind '${(typeConfig as any).kind}'`,
      );
    }
  }
}

export function getReanimatedModuleType(registry: ShapeRegistry): ObjectType {
  // hooks that freeze args and return frozen value
  const frozenHooks = [
    'useFrameCallback',
    'useAnimatedStyle',
    'useAnimatedProps',
    'useAnimatedScrollHandler',
    'useAnimatedReaction',
    'useWorkletCallback',
  ];
  const reanimatedType: Array<[string, BuiltInType]> = [];
  for (const hook of frozenHooks) {
    reanimatedType.push([
      hook,
      addHook(registry, {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: {kind: 'Poly'},
        returnValueKind: ValueKind.Frozen,
        noAlias: true,
        calleeEffect: Effect.Read,
        hookKind: 'Custom',
      }),
    ]);
  }

  /**
   * hooks that return a mutable value. ideally these should be modelled as a
   * ref, but this works for now.
   */
  const mutableHooks = ['useSharedValue', 'useDerivedValue'];
  for (const hook of mutableHooks) {
    reanimatedType.push([
      hook,
      addHook(registry, {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: {kind: 'Object', shapeId: ReanimatedSharedValueId},
        returnValueKind: ValueKind.Mutable,
        noAlias: true,
        calleeEffect: Effect.Read,
        hookKind: 'Custom',
      }),
    ]);
  }

  // functions that return mutable value
  const funcs = [
    'withTiming',
    'withSpring',
    'createAnimatedPropAdapter',
    'withDecay',
    'withRepeat',
    'runOnUI',
    'executeOnUIRuntimeSync',
  ];
  for (const fn of funcs) {
    reanimatedType.push([
      fn,
      addFunction(registry, [], {
        positionalParams: [],
        restParam: Effect.Read,
        returnType: {kind: 'Poly'},
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Mutable,
        noAlias: true,
      }),
    ]);
  }

  return addObject(registry, null, reanimatedType);
}
