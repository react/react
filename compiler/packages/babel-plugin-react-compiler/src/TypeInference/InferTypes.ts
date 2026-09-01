/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from '@babel/types';
import {CompilerError} from '../CompilerError';
import {Environment} from '../HIR';
import {
  GeneratedSource,
  HIRFunction,
  Identifier,
  IdentifierId,
  Instruction,
  InstructionKind,
  makePropertyLiteral,
  makeType,
  PropType,
  Type,
  typeEquals,
  TypeId,
  TypeVar,
} from '../HIR/HIR';
import {
  BuiltInArrayId,
  BuiltInFunctionId,
  BuiltInJsxId,
  BuiltInMixedReadonlyId,
  BuiltInObjectId,
  BuiltInPropsId,
  BuiltInRefValueId,
  BuiltInSetStateId,
  BuiltInUseRefId,
} from '../HIR/ObjectShape';
import {eachInstructionLValue, eachInstructionOperand} from '../HIR/visitors';
import {assertExhaustive} from '../Utils/utils';

function isPrimitiveBinaryOp(op: t.BinaryExpression['operator']): boolean {
  switch (op) {
    case '+':
    case '-':
    case '/':
    case '%':
    case '*':
    case '**':
    case '&':
    case '|':
    case '>>':
    case '<<':
    case '^':
    case '>':
    case '<':
    case '>=':
    case '<=':
    case '|>':
      return true;
    default:
      return false;
  }
}

export function inferTypes(func: HIRFunction): void {
  const unifier = new Unifier(func.env);
  for (const e of generate(func)) {
    unifier.unify(e.left, e.right);
  }
  apply(func, unifier);
}

function apply(func: HIRFunction, unifier: Unifier): void {
  for (const [_, block] of func.body.blocks) {
    for (const phi of block.phis) {
      phi.place.identifier.type = unifier.get(phi.place.identifier.type);
    }
    for (const instr of block.instructions) {
      for (const operand of eachInstructionLValue(instr)) {
        operand.identifier.type = unifier.get(operand.identifier.type);
      }
      for (const place of eachInstructionOperand(instr)) {
        place.identifier.type = unifier.get(place.identifier.type);
      }
      const {lvalue, value} = instr;
      lvalue.identifier.type = unifier.get(lvalue.identifier.type);

      if (
        value.kind === 'FunctionExpression' ||
        value.kind === 'ObjectMethod'
      ) {
        apply(value.loweredFunc.func, unifier);
      }
    }
  }
  const returns = func.returns.identifier;
  returns.type = unifier.get(returns.type);
}

type TypeEquation = {
  left: Type;
  right: Type;
};

function equation(left: Type, right: Type): TypeEquation {
  return {
    left,
    right,
  };
}

function* generate(
  func: HIRFunction,
): Generator<TypeEquation, void, undefined> {
  if (func.fnType === 'Component') {
    const [props, ref] = func.params;
    if (props && props.kind === 'Identifier') {
      yield equation(props.identifier.type, {
        kind: 'Object',
        shapeId: BuiltInPropsId,
      });
    }
    if (ref && ref.kind === 'Identifier') {
      yield equation(ref.identifier.type, {
        kind: 'Object',
        shapeId: BuiltInUseRefId,
      });
    }
  }

  const names = new Map();
  const returnTypes: Array<Type> = [];
  for (const [_, block] of func.body.blocks) {
    for (const phi of block.phis) {
      yield equation(phi.place.identifier.type, {
        kind: 'Phi',
        operands: [...phi.operands.values()].map(id => id.identifier.type),
      });
    }

    for (const instr of block.instructions) {
      yield* generateInstructionTypes(func.env, names, instr);
    }
    const terminal = block.terminal;
    if (terminal.kind === 'return') {
      returnTypes.push(terminal.value.identifier.type);
    }
  }
  if (returnTypes.length > 1) {
    yield equation(func.returns.identifier.type, {
      kind: 'Phi',
      operands: returnTypes,
    });
  } else if (returnTypes.length === 1) {
    yield equation(func.returns.identifier.type, returnTypes[0]!);
  }
}

function setName(
  names: Map<IdentifierId, string>,
  id: IdentifierId,
  name: Identifier,
): void {
  if (name.name?.kind === 'named') {
    names.set(id, name.name.value);
  }
}

function getName(names: Map<IdentifierId, string>, id: IdentifierId): string {
  return names.get(id) ?? '';
}

function* generateInstructionTypes(
  env: Environment,
  names: Map<IdentifierId, string>,
  instr: Instruction,
): Generator<TypeEquation, void, undefined> {
  const {lvalue, value} = instr;
  const left = lvalue.identifier.type;

  switch (value.kind) {
    case 'TemplateLiteral':
    case 'JSXText':
    case 'Primitive': {
      yield equation(left, {kind: 'Primitive'});
      break;
    }

    case 'UnaryExpression': {
      yield equation(left, {kind: 'Primitive'});
      break;
    }

    case 'LoadLocal': {
      setName(names, lvalue.identifier.id, value.place.identifier);
      yield equation(left, value.place.identifier.type);
      break;
    }

    // We intentionally do not infer types for most context variables
    case 'DeclareContext':
    case 'LoadContext': {
      break;
    }
    case 'StoreContext': {
      /**
       * The caveat is StoreContext const, where we know the value is
       * assigned once such that everywhere the value is accessed, it
       * must have the same type from the rvalue.
       *
       * A concrete example where this is useful is `const ref = useRef()`
       * where the ref is referenced before its declaration in a function
       * expression, causing it to be converted to a const context variable.
       */
      if (value.lvalue.kind === InstructionKind.Const) {
        yield equation(
          value.lvalue.place.identifier.type,
          value.value.identifier.type,
        );
      }
      break;
    }

    case 'StoreLocal': {
      yield equation(left, value.value.identifier.type);
      yield equation(
        value.lvalue.place.identifier.type,
        value.value.identifier.type,
      );
      break;
    }

    case 'StoreGlobal': {
      yield equation(left, value.value.identifier.type);
      break;
    }

    case 'BinaryExpression': {
      if (isPrimitiveBinaryOp(value.operator)) {
        yield equation(value.left.identifier.type, {kind: 'Primitive'});
        yield equation(value.right.identifier.type, {kind: 'Primitive'});
      }
      yield equation(left, {kind: 'Primitive'});
      break;
    }

    case 'PostfixUpdate':
    case 'PrefixUpdate': {
      yield equation(value.value.identifier.type, {kind: 'Primitive'});
      yield equation(value.lvalue.identifier.type, {kind: 'Primitive'});
      yield equation(left, {kind: 'Primitive'});
      break;
    }

    case 'LoadGlobal': {
      const globalType = env.getGlobalDeclaration(value.binding, value.loc);
      if (globalType) {
        yield equation(left, globalType);
      }
      break;
    }

    case 'CallExpression': {
      const returnType = makeType();
      /*
       * TODO: callee could be a hook or a function, so this type equation isn't correct.
       * We should change Hook to a subtype of Function or change unifier logic.
       * (see https://github.com/facebook/react-forget/pull/1427)
       */
      let shapeId: string | null = null;
      if (env.config.enableTreatSetIdentifiersAsStateSetters) {
        const name = getName(names, value.callee.identifier.id);
        if (name.startsWith('set')) {
          shapeId = BuiltInSetStateId;
        }
      }
      yield equation(value.callee.identifier.type, {
        kind: 'Function',
        shapeId,
        return: returnType,
        isConstructor: false,
      });
      yield equation(left, returnType);
      break;
    }

    case 'TaggedTemplateExpression': {
      const returnType = makeType();
      /*
       * TODO: callee could be a hook or a function, so this type equation isn't correct.
       * We should change Hook to a subtype of Function or change unifier logic.
       * (see https://github.com/facebook/react-forget/pull/1427)
       */
      yield equation(value.tag.identifier.type, {
        kind: 'Function',
        shapeId: null,
        return: returnType,
        isConstructor: false,
      });
      yield equation(left, returnType);
      break;
    }

    case 'ObjectExpression': {
      for (const property of value.properties) {
        if (
          property.kind === 'ObjectProperty' &&
          property.key.kind === 'computed'
        ) {
          yield equation(property.key.name.identifier.type, {
            kind: 'Primitive',
          });
        }
      }
      yield equation(left, {kind: 'Object', shapeId: BuiltInObjectId});
      break;
    }

    case 'ArrayExpression': {
      yield equation(left, {kind: 'Object', shapeId: BuiltInArrayId});
      break;
    }

    case 'PropertyLoad': {
      yield equation(left, {
        kind: 'Property',
        objectType: value.object.identifier.type,
        objectName: getName(names, value.object.identifier.id),
        propertyName: {
          kind: 'literal',
          value: value.property,
        },
      });
      break;
    }

    case 'ComputedLoad': {
      yield equation(left, {
        kind: 'Property',
        objectType: value.object.identifier.type,
        objectName: getName(names, value.object.identifier.id),
        propertyName: {
          kind: 'computed',
          value: value.property.identifier.type,
        },
      });
      break;
    }
    case 'MethodCall': {
      const returnType = makeType();
      yield equation(value.property.identifier.type, {
        kind: 'Function',
        return: returnType,
        shapeId: null,
        isConstructor: false,
      });

      yield equation(left, returnType);
      break;
    }

    case 'Destructure': {
      const pattern = value.lvalue.pattern;
      if (pattern.kind === 'ArrayPattern') {
        for (let i = 0; i < pattern.items.length; i++) {
          const item = pattern.items[i];
          if (item.kind === 'Identifier') {
            // To simulate tuples we use properties with `String(<index>)`, eg "0".
            const propertyName = String(i);
            yield equation(item.identifier.type, {
              kind: 'Property',
              objectType: value.value.identifier.type,
              objectName: getName(names, value.value.identifier.id),
              propertyName: {
                kind: 'literal',
                value: makePropertyLiteral(propertyName),
              },
            });
          } else if (item.kind === 'Spread') {
            // Array pattern spread always creates an array
            yield equation(item.place.identifier.type, {
              kind: 'Object',
              shapeId: BuiltInArrayId,
            });
          } else {
            continue;
          }
        }
      } else {
        for (const property of pattern.properties) {
          if (property.kind === 'ObjectProperty') {
            if (
              property.key.kind === 'identifier' ||
              property.key.kind === 'string'
            ) {
              yield equation(property.place.identifier.type, {
                kind: 'Property',
                objectType: value.value.identifier.type,
                objectName: getName(names, value.value.identifier.id),
                propertyName: {
                  kind: 'literal',
                  value: makePropertyLiteral(property.key.name),
                },
              });
            }
          }
        }
      }
      break;
    }

    case 'TypeCastExpression': {
      yield equation(left, value.value.identifier.type);
      break;
    }

    case 'PropertyDelete':
    case 'ComputedDelete': {
      yield equation(left, {kind: 'Primitive'});
      break;
    }

    case 'FunctionExpression': {
      yield* generate(value.loweredFunc.func);
      yield equation(left, {
        kind: 'Function',
        shapeId: BuiltInFunctionId,
        return: value.loweredFunc.func.returns.identifier.type,
        isConstructor: false,
      });
      break;
    }

    case 'NextPropertyOf': {
      yield equation(left, {kind: 'Primitive'});
      break;
    }

    case 'ObjectMethod': {
      yield* generate(value.loweredFunc.func);
      yield equation(left, {kind: 'ObjectMethod'});
      break;
    }

    case 'JsxExpression':
    case 'JsxFragment': {
      if (env.config.enableTreatRefLikeIdentifiersAsRefs) {
        if (value.kind === 'JsxExpression') {
          for (const prop of value.props) {
            if (prop.kind === 'JsxAttribute' && prop.name === 'ref') {
              yield equation(prop.place.identifier.type, {
                kind: 'Object',
                shapeId: BuiltInUseRefId,
              });
            }
          }
        }
      }
      yield equation(left, {kind: 'Object', shapeId: BuiltInJsxId});
      break;
    }
    case 'NewExpression': {
      const returnType = makeType();
      yield equation(value.callee.identifier.type, {
        kind: 'Function',
        return: returnType,
        shapeId: null,
        isConstructor: true,
      });

      yield equation(left, returnType);
      break;
    }
    case 'PropertyStore': {
      /**
       * Infer types based on assignments to known object properties
       * This is important for refs, where assignment to `<maybeRef>.current`
       * can help us infer that an object itself is a ref
       */
      yield equation(
        /**
         * Our property type declarations are best-effort and we haven't tested
         * using them to drive inference of rvalues from lvalues. We want to emit
         * a Property type in order to infer refs from `.current` accesses, but
         * stay conservative by not otherwise inferring anything about rvalues.
         * So we use a dummy type here.
         *
         * TODO: consider using the rvalue type here
         */
        makeType(),
        // unify() only handles properties in the second position
        {
          kind: 'Property',
          objectType: value.object.identifier.type,
          objectName: getName(names, value.object.identifier.id),
          propertyName: {
            kind: 'literal',
            value: value.property,
          },
        },
      );
      break;
    }
    case 'DeclareLocal':
    case 'RegExpLiteral':
    case 'MetaProperty':
    case 'ComputedStore':
    case 'Await':
    case 'GetIterator':
    case 'IteratorNext':
    case 'UnsupportedNode':
    case 'Debugger':
    case 'FinishMemoize':
    case 'StartMemoize': {
      break;
    }
    default:
      assertExhaustive(
        value,
        `Unhandled instruction value kind: ${(value as any).kind}`,
      );
  }
}

type Substitution = Map<TypeId, Type>;
class Unifier {
  substitutions: Substitution = new Map();
  env: Environment;

  constructor(env: Environment) {
    this.env = env;
  }

  unify(tA: Type, tB: Type): void {
    if (tB.kind === 'Property') {
      if (
        this.env.config.enableTreatRefLikeIdentifiersAsRefs &&
        isRefLikeName(tB)
      ) {
        this.unify(tB.objectType, {
          kind: 'Object',
          shapeId: BuiltInUseRefId,
        });
        this.unify(tA, {
          kind: 'Object',
          shapeId: BuiltInRefValueId,
        });
        return;
      }
      const objectType = this.get(tB.objectType);
      const propertyType =
        tB.propertyName.kind === 'literal'
          ? this.env.getPropertyType(objectType, tB.propertyName.value)
          : this.env.getFallthroughPropertyType(
              objectType,
              tB.propertyName.value,
            );
      if (propertyType !== null) {
        this.unify(tA, propertyType);
      }
      /*
       * We do not error if tB is not a known object or function (even if it
       * is a primitive), since JS implicit conversion to objects
       */
      return;
    }

    if (typeEquals(tA, tB)) {
      return;
    }

    if (tA.kind === 'Type') {
      this.bindVariableTo(tA, tB);
      return;
    }

    if (tB.kind === 'Type') {
      this.bindVariableTo(tB, tA);
      return;
    }

    if (
      tB.kind === 'Function' &&
      tA.kind === 'Function' &&
      tA.isConstructor === tB.isConstructor
    ) {
      this.unify(tA.return, tB.return);
      return;
    }
  }

  bindVariableTo(v: TypeVar, type: Type): void {
    if (type.kind === 'Poly') {
      //  Ignore PolyType, since we don't support polymorphic types correctly.
      return;
    }

    if (this.substitutions.has(v.id)) {
      this.unify(this.substitutions.get(v.id)!, type);
      return;
    }

    if (type.kind === 'Type' && this.substitutions.has(type.id)) {
      this.unify(v, this.substitutions.get(type.id)!);
      return;
    }

    if (type.kind === 'Phi') {
      CompilerError.invariant(type.operands.length > 0, {
        reason: 'there should be at least one operand',
        loc: GeneratedSource,
      });

      let candidateType: Type | null = null;
      for (const operand of type.operands) {
        const resolved = this.get(operand);
        if (candidateType === null) {
          candidateType = resolved;
        } else if (!typeEquals(resolved, candidateType)) {
          const unionType = tryUnionTypes(resolved, candidateType);
          if (unionType === null) {
            candidateType = null;
            break;
          } else {
            candidateType = unionType;
          }
        } // else same type, continue
      }

      if (candidateType !== null) {
        this.unify(v, candidateType);
        return;
      }
    }

    if (this.occursCheck(v, type)) {
      const resolvedType = this.tryResolveType(v, type);
      if (resolvedType !== null) {
        this.substitutions.set(v.id, resolvedType);
        return;
      }
      throw new Error('cycle detected');
    }

    this.substitutions.set(v.id, type);
  }

  tryResolveType(v: TypeVar, type: Type): Type | null {
    switch (type.kind) {
      case 'Phi': {
        /**
         * Resolve the type of the phi by recursively removing `v` as an operand.
         * For example we can end up with types like this:
         *
         * v = Phi [
         *   T1
         *   T2
         *   Phi [
         *     T3
         *     Phi [
         *       T4
         *       v <-- cycle!
         *     ]
         *   ]
         * ]
         *
         * By recursively removing `v`, we end up with:
         *
         * v = Phi [
         *   T1
         *   T2
         *   Phi [
         *     T3
         *     Phi [
         *       T4
         *     ]
         *   ]
         * ]
         *
         * Which avoids the cycle
         */
        const operands = [];
        for (const operand of type.operands) {
          if (operand.kind === 'Type' && operand.id === v.id) {
            continue;
          }
          const resolved = this.tryResolveType(v, operand);
          if (resolved === null) {
            return null;
          }
          operands.push(resolved);
        }
        return {kind: 'Phi', operands};
      }
      case 'Type': {
        const substitution = this.get(type);
        if (substitution !== type) {
          const resolved = this.tryResolveType(v, substitution);
          if (resolved !== null) {
            this.substitutions.set(type.id, resolved);
          }
          return resolved;
        }
        return type;
      }
      case 'Property': {
        const objectType = this.tryResolveType(v, this.get(type.objectType));
        if (objectType === null) {
          return null;
        }
        return {
          kind: 'Property',
          objectName: type.objectName,
          objectType,
          propertyName: type.propertyName,
        };
      }
      case 'Function': {
        const returnType = this.tryResolveType(v, this.get(type.return));
        if (returnType === null) {
          return null;
        }
        return {
          kind: 'Function',
          return: returnType,
          shapeId: type.shapeId,
          isConstructor: type.isConstructor,
        };
      }
      case 'ObjectMethod':
      case 'Object':
      case 'Primitive':
      case 'Poly': {
        return type;
      }
      default: {
        assertExhaustive(type, `Unexpected type kind '${(type as any).kind}'`);
      }
    }
  }

  occursCheck(v: TypeVar, type: Type): boolean {
    if (typeEquals(v, type)) return true;

    if (type.kind === 'Type' && this.substitutions.has(type.id)) {
      return this.occursCheck(v, this.substitutions.get(type.id)!);
    }

    if (type.kind === 'Phi') {
      return type.operands.some(o => this.occursCheck(v, o));
    }

    if (type.kind === 'Function') {
      return this.occursCheck(v, type.return);
    }

    return false;
  }

  get(type: Type): Type {
    if (type.kind === 'Type') {
      if (this.substitutions.has(type.id)) {
        return this.get(this.substitutions.get(type.id)!);
      }
    }

    if (type.kind === 'Phi') {
      return {kind: 'Phi', operands: type.operands.map(o => this.get(o))};
    }

    if (type.kind === 'Function') {
      return {
        kind: 'Function',
        isConstructor: type.isConstructor,
        shapeId: type.shapeId,
        return: this.get(type.return),
      };
    }

    return type;
  }
}

const RefLikeNameRE = /^(?:[a-zA-Z$_][a-zA-Z$_0-9]*)Ref$|^ref$/;

function isRefLikeName(t: PropType): boolean {
  return (
    t.propertyName.kind === 'literal' &&
    RefLikeNameRE.test(t.objectName) &&
    t.propertyName.value === 'current'
  );
}

function tryUnionTypes(ty1: Type, ty2: Type): Type | null {
  let readonlyType: Type;
  let otherType: Type;
  if (ty1.kind === 'Object' && ty1.shapeId === BuiltInMixedReadonlyId) {
    readonlyType = ty1;
    otherType = ty2;
  } else if (ty2.kind === 'Object' && ty2.shapeId === BuiltInMixedReadonlyId) {
    readonlyType = ty2;
    otherType = ty1;
  } else {
    return null;
  }
  if (otherType.kind === 'Primitive') {
    /**
     * Union(Primitive | MixedReadonly) = MixedReadonly
     *
     * For example, `data ?? null` could return `data`, the fact that RHS
     * is a primitive doesn't guarantee the result is a primitive.
     */
    return readonlyType;
  } else if (
    otherType.kind === 'Object' &&
    otherType.shapeId === BuiltInArrayId
  ) {
    /**
     * Union(Array | MixedReadonly) = Array
     *
     * In practice this pattern means the result is always an array. Given
     * that this behavior requires opting-in to the mixedreadonly type
     * (via moduleTypeProvider) this seems like a reasonable heuristic.
     */
    return otherType;
  }
  return null;
}
