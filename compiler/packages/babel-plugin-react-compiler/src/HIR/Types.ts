/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {GeneratedSource, PropertyLiteral} from './HIR';

export type BuiltInType = PrimitiveType | FunctionType | ObjectType;

export type Type =
  | BuiltInType
  | PhiType
  | TypeVar
  | PolyType
  | PropType
  | ObjectMethod;
export type PrimitiveType = {kind: 'Primitive'};

/*
 * An {@link FunctionType} or {@link ObjectType} (also a JS object) may be associated with an
 * inferred "object shape", i.e. a known property (key -> Type) map. This is
 * subtly different from JS language semantics - `shape` represents both
 * OwnPropertyDescriptors and properties present in the prototype chain.
 *
 * {@link ObjectShape.functionType} is always present on the shape of a {@link FunctionType},
 * and it represents the call signature of the function. Note that Forget thinks of a
 * {@link FunctionType} as any "callable object" (not to be confused with objects that
 *   extend the global `Function`.)
 *
 * If `shapeId` is present, it is a key into the ShapeRegistry used to infer this
 * FunctionType or ObjectType instance (i.e. from an Environment).
 */

export type FunctionType = {
  kind: 'Function';
  shapeId: string | null;
  return: Type;
  isConstructor: boolean;
};

export type ObjectType = {
  kind: 'Object';
  shapeId: string | null;
};

export type TypeVar = {
  kind: 'Type';
  id: TypeId;
};
export type PolyType = {
  kind: 'Poly';
};
export type PhiType = {
  kind: 'Phi';
  operands: Array<Type>;
};
export type PropType = {
  kind: 'Property';
  objectType: Type;
  objectName: string;
  propertyName:
    | {
        kind: 'literal';
        value: PropertyLiteral;
      }
    | {
        kind: 'computed';
        value: Type;
      };
};

export type ObjectMethod = {
  kind: 'ObjectMethod';
};

/*
 * Simulated opaque type for TypeId to prevent using normal numbers as ids
 * accidentally.
 */
const opaqueTypeId = Symbol();
export type TypeId = number & {[opaqueTypeId]: 'IdentifierId'};

export function makeTypeId(id: number): TypeId {
  CompilerError.invariant(id >= 0 && Number.isInteger(id), {
    reason: 'Expected instruction id to be a non-negative integer',
    loc: GeneratedSource,
  });
  return id as TypeId;
}

let typeCounter = 0;
export function makeType(): TypeVar {
  return {
    kind: 'Type',
    id: makeTypeId(typeCounter++),
  };
}

/**
 * Duplicates the given type, copying types that are exact while creating fresh
 * type identifiers for any abstract types.
 */
export function duplicateType(type: Type): Type {
  switch (type.kind) {
    case 'Function': {
      return {
        kind: 'Function',
        return: duplicateType(type.return),
        shapeId: type.shapeId,
        isConstructor: type.isConstructor,
      };
    }
    case 'Object': {
      return {kind: 'Object', shapeId: type.shapeId};
    }
    case 'ObjectMethod': {
      return {kind: 'ObjectMethod'};
    }
    case 'Phi': {
      return {
        kind: 'Phi',
        operands: type.operands.map(operand => duplicateType(operand)),
      };
    }
    case 'Poly': {
      return {kind: 'Poly'};
    }
    case 'Primitive': {
      return {kind: 'Primitive'};
    }
    case 'Property': {
      return {
        kind: 'Property',
        objectType: duplicateType(type.objectType),
        objectName: type.objectName,
        propertyName: type.propertyName,
      };
    }
    case 'Type': {
      return makeType();
    }
  }
}

export function typeEquals(tA: Type, tB: Type): boolean {
  if (tA.kind !== tB.kind) return false;
  return (
    typeVarEquals(tA, tB) ||
    funcTypeEquals(tA, tB) ||
    objectTypeEquals(tA, tB) ||
    primitiveTypeEquals(tA, tB) ||
    polyTypeEquals(tA, tB) ||
    phiTypeEquals(tA, tB) ||
    propTypeEquals(tA, tB) ||
    objectMethodTypeEquals(tA, tB)
  );
}

function typeVarEquals(tA: Type, tB: Type): boolean {
  if (tA.kind === 'Type' && tB.kind === 'Type') {
    return tA.id === tB.id;
  }
  return false;
}

function typeKindCheck(tA: Type, tb: Type, type: string): boolean {
  return tA.kind === type && tb.kind === type;
}

function objectMethodTypeEquals(tA: Type, tB: Type): boolean {
  return typeKindCheck(tA, tB, 'ObjectMethod');
}

function propTypeEquals(tA: Type, tB: Type): boolean {
  if (tA.kind === 'Property' && tB.kind === 'Property') {
    if (!typeEquals(tA.objectType, tB.objectType)) {
      return false;
    }

    return (
      tA.propertyName === tB.propertyName && tA.objectName === tB.objectName
    );
  }

  return false;
}

function primitiveTypeEquals(tA: Type, tB: Type): boolean {
  return typeKindCheck(tA, tB, 'Primitive');
}

function polyTypeEquals(tA: Type, tB: Type): boolean {
  return typeKindCheck(tA, tB, 'Poly');
}

function objectTypeEquals(tA: Type, tB: Type): boolean {
  if (tA.kind === 'Object' && tB.kind == 'Object') {
    return tA.shapeId === tB.shapeId;
  }

  return false;
}

function funcTypeEquals(tA: Type, tB: Type): boolean {
  if (tA.kind !== 'Function' || tB.kind !== 'Function') {
    return false;
  }
  return typeEquals(tA.return, tB.return);
}

function phiTypeEquals(tA: Type, tB: Type): boolean {
  if (tA.kind === 'Phi' && tB.kind === 'Phi') {
    if (tA.operands.length !== tB.operands.length) {
      return false;
    }

    let operands = new Set(tA.operands);
    for (let i = 0; i < tB.operands.length; i++) {
      if (!operands.has(tB.operands[i])) {
        return false;
      }
    }
  }

  return false;
}
