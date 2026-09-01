/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {AliasingEffect, AliasingSignature} from '../Inference/AliasingEffects';
import {assertExhaustive} from '../Utils/utils';
import {
  Effect,
  GeneratedSource,
  Hole,
  makeDeclarationId,
  makeIdentifierId,
  makeInstructionId,
  Place,
  SourceLocation,
  SpreadPattern,
  ValueKind,
  ValueReason,
} from './HIR';
import {
  BuiltInType,
  FunctionType,
  makeType,
  ObjectType,
  PolyType,
  PrimitiveType,
} from './Types';
import {AliasingEffectConfig, AliasingSignatureConfig} from './TypeSchema';

/*
 * This file exports types and defaults for JavaScript object shapes. These are
 * stored and used by a Forget `Environment`. See comments in `Types.ts`,
 * `Globals.ts`, and `Environment.ts` for more details.
 */

const PRIMITIVE_TYPE: PrimitiveType = {
  kind: 'Primitive',
};

let nextAnonId = 0;
/*
 * We currently use strings for anonymous ShapeIds since they are easily
 * debuggable, even though `Symbol()` might be more performant
 */
function createAnonId(): string {
  return `<generated_${nextAnonId++}>`;
}

/*
 * Add a non-hook function to an existing ShapeRegistry.
 *
 * @returns a {@link FunctionType} representing the added function.
 */
export function addFunction(
  registry: ShapeRegistry,
  properties: Iterable<[string, BuiltInType | PolyType]>,
  fn: Omit<FunctionSignature, 'hookKind' | 'aliasing'> & {
    aliasing?: AliasingSignatureConfig | null | undefined;
  },
  id: string | null = null,
  isConstructor: boolean = false,
): FunctionType {
  const shapeId = id ?? createAnonId();
  const aliasing =
    fn.aliasing != null
      ? parseAliasingSignatureConfig(fn.aliasing, '<builtin>', GeneratedSource)
      : null;
  addShape(registry, shapeId, properties, {
    ...fn,
    aliasing,
    hookKind: null,
  });
  return {
    kind: 'Function',
    return: fn.returnType,
    shapeId,
    isConstructor,
  };
}

/*
 * Add a hook to an existing ShapeRegistry.
 *
 * @returns a {@link FunctionType} representing the added hook function.
 */
export function addHook(
  registry: ShapeRegistry,
  fn: Omit<FunctionSignature, 'aliasing'> & {
    hookKind: HookKind;
    aliasing?: AliasingSignatureConfig | null | undefined;
  },
  id: string | null = null,
): FunctionType {
  const shapeId = id ?? createAnonId();
  const aliasing =
    fn.aliasing != null
      ? parseAliasingSignatureConfig(fn.aliasing, '<builtin>', GeneratedSource)
      : null;
  addShape(registry, shapeId, [], {...fn, aliasing});
  return {
    kind: 'Function',
    return: fn.returnType,
    shapeId,
    isConstructor: false,
  };
}

function parseAliasingSignatureConfig(
  typeConfig: AliasingSignatureConfig,
  moduleName: string,
  loc: SourceLocation,
): AliasingSignature {
  const lifetimes = new Map<string, Place>();
  function define(temp: string): Place {
    CompilerError.invariant(!lifetimes.has(temp), {
      reason: `Invalid type configuration for module`,
      description: `Expected aliasing signature to have unique names for receiver, params, rest, returns, and temporaries in module '${moduleName}'`,
      loc,
    });
    const place = signatureArgument(lifetimes.size);
    lifetimes.set(temp, place);
    return place;
  }
  function lookup(temp: string): Place {
    const place = lifetimes.get(temp);
    CompilerError.invariant(place != null, {
      reason: `Invalid type configuration for module`,
      description: `Expected aliasing signature effects to reference known names from receiver/params/rest/returns/temporaries, but '${temp}' is not a known name in '${moduleName}'`,
      loc,
    });
    return place;
  }
  const receiver = define(typeConfig.receiver);
  const params = typeConfig.params.map(define);
  const rest = typeConfig.rest != null ? define(typeConfig.rest) : null;
  const returns = define(typeConfig.returns);
  const temporaries = typeConfig.temporaries.map(define);
  const effects = typeConfig.effects.map(
    (effect: AliasingEffectConfig): AliasingEffect => {
      switch (effect.kind) {
        case 'ImmutableCapture':
        case 'CreateFrom':
        case 'Capture':
        case 'Alias':
        case 'Assign': {
          const from = lookup(effect.from);
          const into = lookup(effect.into);
          return {
            kind: effect.kind,
            from,
            into,
          };
        }
        case 'Mutate':
        case 'MutateTransitiveConditionally': {
          const value = lookup(effect.value);
          return {kind: effect.kind, value};
        }
        case 'Create': {
          const into = lookup(effect.into);
          return {
            kind: 'Create',
            into,
            reason: effect.reason,
            value: effect.value,
          };
        }
        case 'Freeze': {
          const value = lookup(effect.value);
          return {
            kind: 'Freeze',
            value,
            reason: effect.reason,
          };
        }
        case 'Impure': {
          const place = lookup(effect.place);
          return {
            kind: 'Impure',
            place,
            error: CompilerError.throwTodo({
              reason: 'Support impure effect declarations',
              loc: GeneratedSource,
            }),
          };
        }
        case 'Apply': {
          const receiver = lookup(effect.receiver);
          const fn = lookup(effect.function);
          const args: Array<Place | SpreadPattern | Hole> = effect.args.map(
            arg => {
              if (typeof arg === 'string') {
                return lookup(arg);
              } else if (arg.kind === 'Spread') {
                return {kind: 'Spread', place: lookup(arg.place)};
              } else {
                return arg;
              }
            },
          );
          const into = lookup(effect.into);
          return {
            kind: 'Apply',
            receiver,
            function: fn,
            mutatesFunction: effect.mutatesFunction,
            args,
            into,
            loc,
            signature: null,
          };
        }
        default: {
          assertExhaustive(
            effect,
            `Unexpected effect kind '${(effect as any).kind}'`,
          );
        }
      }
    },
  );
  return {
    receiver: receiver.identifier.id,
    params: params.map(p => p.identifier.id),
    rest: rest != null ? rest.identifier.id : null,
    returns: returns.identifier.id,
    temporaries,
    effects,
  };
}

/*
 * Add an object to an existing ShapeRegistry.
 *
 * @returns an {@link ObjectType} representing the added object.
 */
export function addObject(
  registry: ShapeRegistry,
  id: string | null,
  properties: Iterable<[string, BuiltInType | PolyType]>,
): ObjectType {
  const shapeId = id ?? createAnonId();
  addShape(registry, shapeId, properties, null);
  return {
    kind: 'Object',
    shapeId,
  };
}

function addShape(
  registry: ShapeRegistry,
  id: string,
  properties: Iterable<[string, BuiltInType | PolyType]>,
  functionType: FunctionSignature | null,
): ObjectShape {
  const shape: ObjectShape = {
    properties: new Map(properties),
    functionType,
  };

  CompilerError.invariant(!registry.has(id), {
    reason: `[ObjectShape] Could not add shape to registry: name ${id} already exists.`,
    loc: GeneratedSource,
  });
  registry.set(id, shape);
  return shape;
}

export type HookKind =
  | 'useContext'
  | 'useState'
  | 'useActionState'
  | 'useReducer'
  | 'useRef'
  | 'useEffect'
  | 'useLayoutEffect'
  | 'useInsertionEffect'
  | 'useMemo'
  | 'useCallback'
  | 'useTransition'
  | 'useImperativeHandle'
  | 'useEffectEvent'
  | 'useOptimistic'
  | 'Custom';

/*
 * Call signature of a function, used for type and effect inference.
 *
 * Note: Param type is not recorded since it currently does not affect inference.
 * Specifically, we currently do not:
 *   - infer types based on their usage in argument position
 *   - handle inference for overloaded / generic functions
 */
export type FunctionSignature = {
  positionalParams: Array<Effect>;
  restParam: Effect | null;
  returnType: BuiltInType | PolyType;
  returnValueKind: ValueKind;

  /**
   * For functions that return frozen/immutable values, the reason provides a more
   * precise error message for any (invalid) mutations of the value.
   */
  returnValueReason?: ValueReason;

  calleeEffect: Effect;
  hookKind: HookKind | null;
  /*
   * Whether any of the parameters may be aliased by each other or the return
   * value. Defaults to false (parameters may alias). When true, the compiler
   * may choose not to memoize arguments if they do not otherwise escape.
   */
  noAlias?: boolean;

  /**
   * Supported only for methods (no-op when used on functions in CallExpression.callee position).
   *
   * Indicates that the method can only modify its receiver if any of the arguments
   * are mutable or are function expressions which mutate their arguments. This is designed
   * for methods such as Array.prototype.map(), which only mutate the receiver array if they are
   * passed a callback which has mutable side-effects (including mutating its inputs).
   *
   * MethodCalls to such functions will use a different behavior depending on their arguments:
   * - If arguments are all non-mutable, the arguments get the Read effect and the receiver is Capture.
   * - Else uses the effects specified by this signature.
   */
  mutableOnlyIfOperandsAreMutable?: boolean;

  impure?: boolean;
  knownIncompatible?: string | null | undefined;

  canonicalName?: string;

  aliasing?: AliasingSignature | null | undefined;
};

/*
 * Shape of an {@link FunctionType} if {@link ObjectShape.functionType} is present,
 * or {@link ObjectType} otherwise.
 *
 * Constructors (e.g. the global `Array` object) and other functions (e.g. `Math.min`)
 * are both represented by {@link ObjectShape.functionType}.
 */
export type ObjectShape = {
  properties: Map<string, BuiltInType | PolyType>;
  functionType: FunctionSignature | null;
};

/*
 * Every valid ShapeRegistry must contain ObjectShape definitions for
 * {@link BuiltInArrayId} and {@link BuiltInObjectId}, since these are the
 * the inferred types for [] and {}.
 */
export type ShapeRegistry = Map<string, ObjectShape>;
export const BuiltInPropsId = 'BuiltInProps';
export const BuiltInArrayId = 'BuiltInArray';
export const BuiltInSetId = 'BuiltInSet';
export const BuiltInMapId = 'BuiltInMap';
export const BuiltInWeakSetId = 'BuiltInWeakSet';
export const BuiltInWeakMapId = 'BuiltInWeakMap';
export const BuiltInFunctionId = 'BuiltInFunction';
export const BuiltInJsxId = 'BuiltInJsx';
export const BuiltInObjectId = 'BuiltInObject';
export const BuiltInUseStateId = 'BuiltInUseState';
export const BuiltInSetStateId = 'BuiltInSetState';
export const BuiltInUseActionStateId = 'BuiltInUseActionState';
export const BuiltInSetActionStateId = 'BuiltInSetActionState';
export const BuiltInUseRefId = 'BuiltInUseRefId';
export const BuiltInRefValueId = 'BuiltInRefValue';
export const BuiltInMixedReadonlyId = 'BuiltInMixedReadonly';
export const BuiltInUseEffectHookId = 'BuiltInUseEffectHook';
export const BuiltInUseLayoutEffectHookId = 'BuiltInUseLayoutEffectHook';
export const BuiltInUseInsertionEffectHookId = 'BuiltInUseInsertionEffectHook';
export const BuiltInUseOperatorId = 'BuiltInUseOperator';
export const BuiltInUseReducerId = 'BuiltInUseReducer';
export const BuiltInDispatchId = 'BuiltInDispatch';
export const BuiltInUseContextHookId = 'BuiltInUseContextHook';
export const BuiltInUseTransitionId = 'BuiltInUseTransition';
export const BuiltInUseOptimisticId = 'BuiltInUseOptimistic';
export const BuiltInSetOptimisticId = 'BuiltInSetOptimistic';
export const BuiltInStartTransitionId = 'BuiltInStartTransition';
export const BuiltInUseEffectEventId = 'BuiltInUseEffectEvent';
export const BuiltInEffectEventId = 'BuiltInEffectEventFunction';

// See getReanimatedModuleType() in Globals.ts — this is part of supporting Reanimated's ref-like types
export const ReanimatedSharedValueId = 'ReanimatedSharedValueId';

// ShapeRegistry with default definitions for built-ins.
export const BUILTIN_SHAPES: ShapeRegistry = new Map();

// If the `ref` prop exists, it has the ref type
addObject(BUILTIN_SHAPES, BuiltInPropsId, [
  ['ref', {kind: 'Object', shapeId: BuiltInUseRefId}],
]);

/* Built-in array shape */
addObject(BUILTIN_SHAPES, BuiltInArrayId, [
  [
    'indexOf',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'includes',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'pop',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'at',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'concat',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Capture,
      returnType: {
        kind: 'Object',
        shapeId: BuiltInArrayId,
      },
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  ['length', PRIMITIVE_TYPE],
  [
    'push',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Capture,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Primitive,
      aliasing: {
        receiver: '@receiver',
        params: [],
        rest: '@rest',
        returns: '@returns',
        temporaries: [],
        effects: [
          // Push directly mutates the array itself
          {kind: 'Mutate', value: '@receiver'},
          // The arguments are captured into the array
          {
            kind: 'Capture',
            from: '@rest',
            into: '@receiver',
          },
          // Returns the new length, a primitive
          {
            kind: 'Create',
            into: '@returns',
            value: ValueKind.Primitive,
            reason: ValueReason.KnownReturnSignature,
          },
        ],
      },
    }),
  ],
  [
    'slice',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {
        kind: 'Object',
        shapeId: BuiltInArrayId,
      },
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'map',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Object', shapeId: BuiltInArrayId},
      /*
       * callee is ConditionallyMutate because items of the array
       * flow into the lambda and may be mutated there, even though
       * the array object itself is not modified
       */
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Mutable,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
      aliasing: {
        receiver: '@receiver',
        params: ['@callback'],
        rest: null,
        returns: '@returns',
        temporaries: [
          // Temporary representing captured items of the receiver
          '@item',
          // Temporary representing the result of the callback
          '@callbackReturn',
          /*
           * Undefined `this` arg to the callback. Note the signature does not
           * support passing an explicit thisArg second param
           */
          '@thisArg',
        ],
        effects: [
          // Map creates a new mutable array
          {
            kind: 'Create',
            into: '@returns',
            value: ValueKind.Mutable,
            reason: ValueReason.KnownReturnSignature,
          },
          // The first arg to the callback is an item extracted from the receiver array
          {
            kind: 'CreateFrom',
            from: '@receiver',
            into: '@item',
          },
          // The undefined this for the callback
          {
            kind: 'Create',
            into: '@thisArg',
            value: ValueKind.Primitive,
            reason: ValueReason.KnownReturnSignature,
          },
          // calls the callback, returning the result into a temporary
          {
            kind: 'Apply',
            receiver: '@thisArg',
            args: ['@item', {kind: 'Hole'}, '@receiver'],
            function: '@callback',
            into: '@callbackReturn',
            mutatesFunction: false,
          },
          // captures the result of the callback into the return array
          {
            kind: 'Capture',
            from: '@callbackReturn',
            into: '@returns',
          },
        ],
      },
    }),
  ],
  [
    'flatMap',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Object', shapeId: BuiltInArrayId},
      /*
       * callee is ConditionallyMutate because items of the array
       * flow into the lambda and may be mutated there, even though
       * the array object itself is not modified
       */
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Mutable,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'filter',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Object', shapeId: BuiltInArrayId},
      /*
       * callee is ConditionallyMutate because items of the array
       * flow into the lambda and may be mutated there, even though
       * the array object itself is not modified
       */
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Mutable,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'every',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Primitive'},
      /*
       * callee is ConditionallyMutate because items of the array
       * flow into the lambda and may be mutated there, even though
       * the array object itself is not modified
       */
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Primitive,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'some',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Primitive'},
      /*
       * callee is ConditionallyMutate because items of the array
       * flow into the lambda and may be mutated there, even though
       * the array object itself is not modified
       */
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Primitive,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'find',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Mutable,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'findIndex',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Primitive'},
      /*
       * callee is ConditionallyMutate because items of the array
       * flow into the lambda and may be mutated there, even though
       * the array object itself is not modified
       */
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Primitive,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'join',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  // TODO: rest of Array properties
]);

/* Built-in Object shape */
addObject(BUILTIN_SHAPES, BuiltInObjectId, [
  [
    'toString',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  /*
   * TODO:
   * hasOwnProperty, isPrototypeOf, propertyIsEnumerable, toLocaleString, valueOf
   */
]);

/* Built-in Set shape */
addObject(BUILTIN_SHAPES, BuiltInSetId, [
  [
    /**
     * add(value)
     * Parameters
     *   value: the value of the element to add to the Set object.
     * Returns the Set object with added value.
     */
    'add',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Capture],
      restParam: null,
      returnType: {kind: 'Object', shapeId: BuiltInSetId},
      calleeEffect: Effect.Store,
      // returnValueKind is technically dependent on the ValueKind of the set itself
      returnValueKind: ValueKind.Mutable,
      aliasing: {
        receiver: '@receiver',
        params: [],
        rest: '@rest',
        returns: '@returns',
        temporaries: [],
        effects: [
          // Set.add returns the receiver Set
          {
            kind: 'Assign',
            from: '@receiver',
            into: '@returns',
          },
          // Set.add mutates the set itself
          {
            kind: 'Mutate',
            value: '@receiver',
          },
          // Captures the rest params into the set
          {
            kind: 'Capture',
            from: '@rest',
            into: '@receiver',
          },
        ],
      },
    }),
  ],
  [
    /**
     * clear()
     * Parameters none
     * Returns undefined
     */
    'clear',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    /**
     * setInstance.delete(value)
     * Returns true if value was already in Set; otherwise false.
     */
    'delete',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'has',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  ['size', PRIMITIVE_TYPE],
  [
    /**
     * difference(other)
     * Parameters
     *   other: A Set object, or set-like object.
     * Returns a new Set object containing elements in this set but not in the other set.
     */
    'difference',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Capture],
      restParam: null,
      returnType: {kind: 'Object', shapeId: BuiltInSetId},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    /**
     * union(other)
     * Parameters
     *   other: A Set object, or set-like object.
     * Returns a new Set object containing elements in either this set or the other set.
     */
    'union',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Capture],
      restParam: null,
      returnType: {kind: 'Object', shapeId: BuiltInSetId},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    /**
     * symmetricalDifference(other)
     * Parameters
     *   other: A Set object, or set-like object.
     * A new Set object containing elements which are in either this set or the other set, but not in both.
     */
    'symmetricalDifference',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Capture],
      restParam: null,
      returnType: {kind: 'Object', shapeId: BuiltInSetId},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    /**
     * isSubsetOf(other)
     * Parameters
     *   other: A Set object, or set-like object.
     * Returns true if all elements in this set are also in the other set, and false otherwise.
     */
    'isSubsetOf',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    /**
     * isSupersetOf(other)
     * Parameters
     *  other: A Set object, or set-like object.
     * Returns true if all elements in the other set are also in this set, and false otherwise.
     */
    'isSupersetOf',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    /**
     * forEach(callbackFn)
     * forEach(callbackFn, thisArg)
     */
    'forEach',
    addFunction(BUILTIN_SHAPES, [], {
      /**
       * see Array.map explanation for why arguments are marked `ConditionallyMutate`
       */
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Primitive,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  /**
   * Iterators
   */
  [
    'entries',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'keys',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'values',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
]);
addObject(BUILTIN_SHAPES, BuiltInMapId, [
  [
    /**
     * clear()
     * Parameters none
     * Returns undefined
     */
    'clear',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'delete',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'get',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'has',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    /**
     * Params
     *   key: the key of the element to add to the Map object. The key may be
     *   any JavaScript type (any primitive value or any type of JavaScript
     *   object).
     *   value: the value of the element to add to the Map object.
     * Returns the Map object.
     */
    'set',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Capture, Effect.Capture],
      restParam: null,
      returnType: {kind: 'Object', shapeId: BuiltInMapId},
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  ['size', PRIMITIVE_TYPE],
  [
    'forEach',
    addFunction(BUILTIN_SHAPES, [], {
      /**
       * see Array.map explanation for why arguments are marked `ConditionallyMutate`
       */
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Primitive,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  /**
   * Iterators
   */
  [
    'entries',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'keys',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'values',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
]);

addObject(BUILTIN_SHAPES, BuiltInWeakSetId, [
  [
    /**
     * add(value)
     * Parameters
     *   value: the value of the element to add to the Set object.
     * Returns the Set object with added value.
     */
    'add',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Capture],
      restParam: null,
      returnType: {kind: 'Object', shapeId: BuiltInWeakSetId},
      calleeEffect: Effect.Store,
      // returnValueKind is technically dependent on the ValueKind of the set itself
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    /**
     * setInstance.delete(value)
     * Returns true if value was already in Set; otherwise false.
     */
    'delete',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'has',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
]);

addObject(BUILTIN_SHAPES, BuiltInWeakMapId, [
  [
    'delete',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'get',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: {kind: 'Poly'},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'has',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    /**
     * Params
     *   key: the key of the element to add to the Map object. The key may be
     *   any JavaScript type (any primitive value or any type of JavaScript
     *   object).
     *   value: the value of the element to add to the Map object.
     * Returns the Map object.
     */
    'set',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Capture, Effect.Capture],
      restParam: null,
      returnType: {kind: 'Object', shapeId: BuiltInWeakMapId},
      calleeEffect: Effect.Store,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
]);

addObject(BUILTIN_SHAPES, BuiltInUseStateId, [
  ['0', {kind: 'Poly'}],
  [
    '1',
    addFunction(
      BUILTIN_SHAPES,
      [],
      {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: PRIMITIVE_TYPE,
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Primitive,
      },
      BuiltInSetStateId,
    ),
  ],
]);

addObject(BUILTIN_SHAPES, BuiltInUseTransitionId, [
  ['0', {kind: 'Primitive'}],
  [
    '1',
    addFunction(
      BUILTIN_SHAPES,
      [],
      {
        positionalParams: [],
        restParam: null,
        returnType: PRIMITIVE_TYPE,
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Primitive,
      },
      BuiltInStartTransitionId,
    ),
  ],
]);

addObject(BUILTIN_SHAPES, BuiltInUseOptimisticId, [
  ['0', {kind: 'Poly'}],
  [
    '1',
    addFunction(
      BUILTIN_SHAPES,
      [],
      {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: PRIMITIVE_TYPE,
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Primitive,
      },
      BuiltInSetOptimisticId,
    ),
  ],
]);

addObject(BUILTIN_SHAPES, BuiltInUseActionStateId, [
  ['0', {kind: 'Poly'}],
  [
    '1',
    addFunction(
      BUILTIN_SHAPES,
      [],
      {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: PRIMITIVE_TYPE,
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Primitive,
      },
      BuiltInSetActionStateId,
    ),
  ],
]);

addObject(BUILTIN_SHAPES, BuiltInUseReducerId, [
  ['0', {kind: 'Poly'}],
  [
    '1',
    addFunction(
      BUILTIN_SHAPES,
      [],
      {
        positionalParams: [],
        restParam: Effect.Freeze,
        returnType: PRIMITIVE_TYPE,
        calleeEffect: Effect.Read,
        returnValueKind: ValueKind.Primitive,
      },
      BuiltInDispatchId,
    ),
  ],
]);

addObject(BUILTIN_SHAPES, BuiltInUseRefId, [
  ['current', {kind: 'Object', shapeId: BuiltInRefValueId}],
]);

addObject(BUILTIN_SHAPES, BuiltInRefValueId, [
  ['*', {kind: 'Object', shapeId: BuiltInRefValueId}],
]);

addObject(BUILTIN_SHAPES, ReanimatedSharedValueId, []);

addFunction(
  BUILTIN_SHAPES,
  [],
  {
    positionalParams: [],
    restParam: Effect.ConditionallyMutate,
    returnType: {kind: 'Poly'},
    calleeEffect: Effect.ConditionallyMutate,
    returnValueKind: ValueKind.Mutable,
  },
  BuiltInEffectEventId,
);

/**
 * MixedReadOnly =
 *   | primitive
 *   | simple objects (Record<string, MixedReadOnly>)
 *   | Array<MixedReadOnly>
 *
 * APIs such as Relay — but also Flux and other data stores — often return a
 * union of types with some interesting properties in terms of analysis.
 *
 * Given this constraint, if data came from Relay, then we should be able to
 * infer things like `data.items.map(): Array`. That may seem like a leap at
 * first but remember, we assume you're not patching builtins. Thus the only way
 * data.items.map can exist and be a function, given the above set of data types
 * and builtin JS methods, is if `data.items` was an Array, and `data.items.map`
 * is therefore calling Array.prototype.map. Then we know that function returns
 * an Array as well. This relies on the fact that map() is being called, so if
 * data.items was some other type it would error at runtime - so it's sound.
 *
 * Note that this shape is currently only used for hook return values, which
 * means that it's safe to type aliasing method-call return kinds as `Frozen`.
 *
 * Also note that all newly created arrays from method-calls (e.g. `.map`)
 * have the appropriate mutable `BuiltInArray` shape
 */
addObject(BUILTIN_SHAPES, BuiltInMixedReadonlyId, [
  [
    'toString',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'indexOf',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'includes',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  [
    'at',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [Effect.Read],
      restParam: null,
      returnType: {kind: 'Object', shapeId: BuiltInMixedReadonlyId},
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Frozen,
    }),
  ],
  [
    'map',
    addFunction(BUILTIN_SHAPES, [], {
      /**
       * Note `map`'s arguments are annotated as Effect.ConditionallyMutate as
       * calling `<array>.map(fn)` might invoke `fn`, which means replaying its
       * effects.
       *
       * (Note that Effect.Read / Effect.Capture on a function type means
       * potential data dependency or aliasing respectively.)
       */
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Object', shapeId: BuiltInArrayId},
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Mutable,
      noAlias: true,
    }),
  ],
  [
    'flatMap',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Object', shapeId: BuiltInArrayId},
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Mutable,
      noAlias: true,
    }),
  ],
  [
    'filter',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Object', shapeId: BuiltInArrayId},
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Mutable,
      noAlias: true,
    }),
  ],
  [
    'concat',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Capture,
      returnType: {
        kind: 'Object',
        shapeId: BuiltInArrayId,
      },
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'slice',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: {
        kind: 'Object',
        shapeId: BuiltInArrayId,
      },
      calleeEffect: Effect.Capture,
      returnValueKind: ValueKind.Mutable,
    }),
  ],
  [
    'every',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Primitive,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'some',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Primitive,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'find',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Object', shapeId: BuiltInMixedReadonlyId},
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Frozen,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'findIndex',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.ConditionallyMutate,
      returnType: {kind: 'Primitive'},
      calleeEffect: Effect.ConditionallyMutate,
      returnValueKind: ValueKind.Primitive,
      noAlias: true,
      mutableOnlyIfOperandsAreMutable: true,
    }),
  ],
  [
    'join',
    addFunction(BUILTIN_SHAPES, [], {
      positionalParams: [],
      restParam: Effect.Read,
      returnType: PRIMITIVE_TYPE,
      calleeEffect: Effect.Read,
      returnValueKind: ValueKind.Primitive,
    }),
  ],
  ['*', {kind: 'Object', shapeId: BuiltInMixedReadonlyId}],
]);

addObject(BUILTIN_SHAPES, BuiltInJsxId, []);
addObject(BUILTIN_SHAPES, BuiltInFunctionId, []);

export const DefaultMutatingHook = addHook(
  BUILTIN_SHAPES,
  {
    positionalParams: [],
    restParam: Effect.ConditionallyMutate,
    returnType: {kind: 'Poly'},
    calleeEffect: Effect.Read,
    hookKind: 'Custom',
    returnValueKind: ValueKind.Mutable,
  },
  'DefaultMutatingHook',
);

export const DefaultNonmutatingHook = addHook(
  BUILTIN_SHAPES,
  {
    positionalParams: [],
    restParam: Effect.Freeze,
    returnType: {kind: 'Poly'},
    calleeEffect: Effect.Read,
    hookKind: 'Custom',
    returnValueKind: ValueKind.Frozen,
    aliasing: {
      receiver: '@receiver',
      params: [],
      rest: '@rest',
      returns: '@returns',
      temporaries: [],
      effects: [
        // Freeze the arguments
        {
          kind: 'Freeze',
          value: '@rest',
          reason: ValueReason.HookCaptured,
        },
        // Returns a frozen value
        {
          kind: 'Create',
          into: '@returns',
          value: ValueKind.Frozen,
          reason: ValueReason.HookReturn,
        },
        // May alias any arguments into the return
        {
          kind: 'Alias',
          from: '@rest',
          into: '@returns',
        },
      ],
    },
  },
  'DefaultNonmutatingHook',
);

export function signatureArgument(id: number): Place {
  const place: Place = {
    kind: 'Identifier',
    effect: Effect.Unknown,
    loc: GeneratedSource,
    reactive: false,
    identifier: {
      declarationId: makeDeclarationId(id),
      id: makeIdentifierId(id),
      loc: GeneratedSource,
      mutableRange: {start: makeInstructionId(0), end: makeInstructionId(0)},
      name: null,
      scope: null,
      type: makeType(),
    },
  };
  return place;
}
