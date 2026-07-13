import {CompilerError, SourceLocation} from '..';
import {
  Environment,
  GeneratedSource,
  HIRFunction,
  Identifier,
  IdentifierId,
} from '../HIR';
import * as t from '@babel/types';
import * as TypeErrors from './TypeErrors';
import {assertExhaustive} from '../Utils/utils';
import {FlowType} from './FlowTypes';

export const DEBUG = false;

export type Type =
  | {kind: 'Concrete'; type: ConcreteType<Type>; platform: Platform}
  | {kind: 'Variable'; id: VariableId};

export type ResolvedType = {
  kind: 'Concrete';
  type: ConcreteType<ResolvedType>;
  platform: Platform;
};

export type ComponentType<T> = {
  kind: 'Component';
  props: Map<string, T>;
  children: null | T;
};
export type ConcreteType<T> =
  | {kind: 'Enum'}
  | {kind: 'Mixed'}
  | {kind: 'Number'}
  | {kind: 'String'}
  | {kind: 'Boolean'}
  | {kind: 'Void'}
  | {kind: 'Nullable'; type: T}
  | {kind: 'Array'; element: T}
  | {kind: 'Set'; element: T}
  | {kind: 'Map'; key: T; value: T}
  | {
      kind: 'Function';
      typeParameters: null | Array<TypeParameter<T>>;
      params: Array<T>;
      returnType: T;
    }
  | ComponentType<T>
  | {kind: 'Generic'; id: TypeParameterId; bound: T}
  | {
      kind: 'Object';
      id: NominalId;
      members: Map<string, ResolvedType>;
    }
  | {
      kind: 'Tuple';
      id: NominalId;
      members: Array<T>;
    }
  | {kind: 'Structural'; id: LinearId}
  | {kind: 'Union'; members: Array<T>}
  | {kind: 'Instance'; name: string; members: Map<string, ResolvedType>};

export type StructuralValue =
  | {
      kind: 'Function';
      fn: HIRFunction;
    }
  | {
      kind: 'Object';
      members: Map<string, ResolvedType>;
    }
  | {
      kind: 'Array';
      elementType: ResolvedType;
    };

export type Structural = {
  type: StructuralValue;
  consumed: boolean;
};
// TODO: create a kind: "Alias"

// type T<X> = { foo: X}

/**
 *
 * function apply<A, B>(x: A, f: A => B): B { }
 *
 * apply(42, x => String(x));
 *
 * f({foo: 42})
 *
 * f([HOLE]) -----> {foo: 42} with context NominalType
 *
 * $0 = Object {foo: 42}
 * $1 = LoadLocal "f"
 * $2 = Call $1, [$0]
 *
 * ContextMap:
 *   $2 => ??
 *   $1 => [HOLE]($0)
 *   $0 => $1([HOLE])
 */

/*
 *const g = {foo: 42} as NominalType // ok
 *
 *
 *function f(x: NominalType) { ... }
 *f()
 *
 *const y: NominalType = {foo: 42}
 *
 *
 */

/**
 * // Mike: maybe this could be the ideal?
 *type X = nominal('registryNameX', {
 *value: number,
 *});
 *
 * // For now:
 *opaque type X = {   // creates a new nominal type
 *value: number,
 *};
 *
 *type Y = X; // creates a type alias
 *
 *type Z = number; // creates a type alias
 *
 *
 * // (todo: disallowed)
 *type X' = {
 *value: number,
 *}
 */

export type TypeParameter<T> = {
  name: string;
  id: TypeParameterId;
  bound: T;
};

const opaqueLinearId = Symbol();
export type LinearId = number & {
  [opaqueLinearId]: 'LinearId';
};

export function makeLinearId(id: number): LinearId {
  CompilerError.invariant(id >= 0 && Number.isInteger(id), {
    reason: 'Expected LinearId id to be a non-negative integer',
    loc: GeneratedSource,
  });
  return id as LinearId;
}

const opaqueTypeParameterId = Symbol();
export type TypeParameterId = number & {
  [opaqueTypeParameterId]: 'TypeParameterId';
};

export function makeTypeParameterId(id: number): TypeParameterId {
  CompilerError.invariant(id >= 0 && Number.isInteger(id), {
    reason: 'Expected TypeParameterId to be a non-negative integer',
    loc: GeneratedSource,
  });
  return id as TypeParameterId;
}

const opaqueNominalId = Symbol();
export type NominalId = number & {
  [opaqueNominalId]: 'NominalId';
};

export function makeNominalId(id: number): NominalId {
  return id as NominalId;
}

const opaqueVariableId = Symbol();
export type VariableId = number & {
  [opaqueVariableId]: 'VariableId';
};

export function makeVariableId(id: number): VariableId {
  CompilerError.invariant(id >= 0 && Number.isInteger(id), {
    reason: 'Expected VariableId id to be a non-negative integer',
    loc: GeneratedSource,
  });
  return id as VariableId;
}

export function printConcrete<T>(
  type: ConcreteType<T>,
  printType: (_: T) => string,
): string {
  switch (type.kind) {
    case 'Mixed':
      return 'mixed';
    case 'Number':
      return 'number';
    case 'String':
      return 'string';
    case 'Boolean':
      return 'boolean';
    case 'Void':
      return 'void';
    case 'Nullable':
      return `${printType(type.type)} | void`;
    case 'Array':
      return `Array<${printType(type.element)}>`;
    case 'Set':
      return `Set<${printType(type.element)}>`;
    case 'Map':
      return `Map<${printType(type.key)}, ${printType(type.value)}>`;
    case 'Function': {
      const typeParams = type.typeParameters
        ? `<${type.typeParameters.map(tp => `T${tp}`).join(', ')}>`
        : '';
      const params = type.params.map(printType).join(', ');
      const returnType = printType(type.returnType);
      return `${typeParams}(${params}) => ${returnType}`;
    }
    case 'Component': {
      const params = [...type.props.entries()]
        .map(([k, v]) => `${k}: ${printType(v)}`)
        .join(', ');
      const comma = type.children != null && type.props.size > 0 ? ', ' : '';
      const children =
        type.children != null ? `children: ${printType(type.children)}` : '';
      return `component (${params}${comma}${children})`;
    }
    case 'Generic':
      return `T${type.id}`;
    case 'Object': {
      const name = `Object [${[...type.members.keys()].map(key => JSON.stringify(key)).join(', ')}]`;
      return `${name}`;
    }
    case 'Tuple': {
      const name = `Tuple ${type.members}`;
      return `${name}`;
    }
    case 'Structural': {
      const name = `Structural ${type.id}`;
      return `${name}`;
    }
    case 'Enum': {
      return 'TODO enum printing';
    }
    case 'Union': {
      return type.members.map(printType).join(' | ');
    }
    case 'Instance': {
      return type.name;
    }
    default:
      assertExhaustive(type, `Unknown type: ${JSON.stringify(type)}`);
  }
}

export function printType(type: Type): string {
  switch (type.kind) {
    case 'Concrete':
      return printConcrete(type.type, printType);
    case 'Variable':
      return `$${type.id}`;
    default:
      assertExhaustive(type, `Unknown type: ${JSON.stringify(type)}`);
  }
}

export function printResolved(type: ResolvedType): string {
  return printConcrete(type.type, printResolved);
}

type Platform = 'client' | 'server' | 'shared';

const DUMMY_NOMINAL = makeNominalId(0);

function convertFlowType(flowType: FlowType, loc: string): ResolvedType {
  let nextGenericId = 0;
  function convertFlowTypeImpl(
    flowType: FlowType,
    loc: string,
    genericEnv: Map<string, TypeParameterId>,
    platform: Platform,
    poly: null | Array<TypeParameter<ResolvedType>> = null,
  ): ResolvedType {
    switch (flowType.kind) {
      case 'TypeApp': {
        if (
          flowType.type.kind === 'Def' &&
          flowType.type.def.kind === 'Poly' &&
          flowType.type.def.t_out.kind === 'Def' &&
          flowType.type.def.t_out.def.kind === 'Type' &&
          flowType.type.def.t_out.def.type.kind === 'Opaque' &&
          flowType.type.def.t_out.def.type.opaquetype.opaque_name ===
            'Client' &&
          flowType.targs.length === 1
        ) {
          return convertFlowTypeImpl(
            flowType.targs[0],
            loc,
            genericEnv,
            'client',
          );
        } else if (
          flowType.type.kind === 'Def' &&
          flowType.type.def.kind === 'Poly' &&
          flowType.type.def.t_out.kind === 'Def' &&
          flowType.type.def.t_out.def.kind === 'Type' &&
          flowType.type.def.t_out.def.type.kind === 'Opaque' &&
          flowType.type.def.t_out.def.type.opaquetype.opaque_name ===
            'Server' &&
          flowType.targs.length === 1
        ) {
          return convertFlowTypeImpl(
            flowType.targs[0],
            loc,
            genericEnv,
            'server',
          );
        }
        return Resolved.todo(platform);
      }
      case 'Open':
        return Resolved.mixed(platform);
      case 'Any':
        return Resolved.todo(platform);
      case 'Annot':
        return convertFlowTypeImpl(
          flowType.type,
          loc,
          genericEnv,
          platform,
          poly,
        );
      case 'Opaque': {
        if (
          flowType.opaquetype.opaque_name === 'Client' &&
          flowType.opaquetype.super_t != null
        ) {
          return convertFlowTypeImpl(
            flowType.opaquetype.super_t,
            loc,
            genericEnv,
            'client',
          );
        }
        if (
          flowType.opaquetype.opaque_name === 'Server' &&
          flowType.opaquetype.super_t != null
        ) {
          return convertFlowTypeImpl(
            flowType.opaquetype.super_t,
            loc,
            genericEnv,
            'server',
          );
        }
        const t =
          flowType.opaquetype.underlying_t ?? flowType.opaquetype.super_t;
        if (t != null) {
          return convertFlowTypeImpl(t, loc, genericEnv, platform, poly);
        } else {
          return Resolved.todo(platform);
        }
      }
      case 'Def': {
        switch (flowType.def.kind) {
          case 'EnumValue':
            return convertFlowTypeImpl(
              flowType.def.enum_info.representation_t,
              loc,
              genericEnv,
              platform,
              poly,
            );
          case 'EnumObject':
            return Resolved.enum(platform);
          case 'Empty':
            return Resolved.todo(platform);
          case 'Instance': {
            const members = new Map<string, ResolvedType>();
            for (const key in flowType.def.instance.inst.own_props) {
              const prop = flowType.def.instance.inst.own_props[key];
              if (prop.kind === 'Field') {
                members.set(
                  key,
                  convertFlowTypeImpl(prop.type, loc, genericEnv, platform),
                );
              } else {
                CompilerError.invariant(false, {
                  reason: `Unsupported property kind ${prop.kind}`,
                  loc: GeneratedSource,
                });
              }
            }
            return Resolved.class(
              flowType.def.instance.inst.class_name ?? '[anonymous class]',
              members,
              platform,
            );
          }
          case 'Type':
            return convertFlowTypeImpl(
              flowType.def.type,
              loc,
              genericEnv,
              platform,
              poly,
            );
          case 'NumGeneral':
          case 'SingletonNum':
            return Resolved.number(platform);
          case 'StrGeneral':
          case 'SingletonStr':
            return Resolved.string(platform);
          case 'BoolGeneral':
          case 'SingletonBool':
            return Resolved.boolean(platform);
          case 'Void':
            return Resolved.void(platform);
          case 'Null':
            return Resolved.void(platform);
          case 'Mixed':
            return Resolved.mixed(platform);
          case 'Arr': {
            if (
              flowType.def.arrtype.kind === 'ArrayAT' ||
              flowType.def.arrtype.kind === 'ROArrayAT'
            ) {
              return Resolved.array(
                convertFlowTypeImpl(
                  flowType.def.arrtype.elem_t,
                  loc,
                  genericEnv,
                  platform,
                ),
                platform,
              );
            } else {
              return Resolved.tuple(
                DUMMY_NOMINAL,
                flowType.def.arrtype.elements.map(t =>
                  convertFlowTypeImpl(t.t, loc, genericEnv, platform),
                ),
                platform,
              );
            }
          }
          case 'Obj': {
            const members = new Map<string, ResolvedType>();
            for (const key in flowType.def.objtype.props) {
              const prop = flowType.def.objtype.props[key];
              if (prop.kind === 'Field') {
                members.set(
                  key,
                  convertFlowTypeImpl(prop.type, loc, genericEnv, platform),
                );
              } else {
                CompilerError.invariant(false, {
                  reason: `Unsupported property kind ${prop.kind}`,
                  loc: GeneratedSource,
                });
              }
            }
            return Resolved.object(DUMMY_NOMINAL, members, platform);
          }
          case 'Class': {
            if (flowType.def.type.kind === 'ThisInstance') {
              const members = new Map<string, ResolvedType>();
              for (const key in flowType.def.type.instance.inst.own_props) {
                const prop = flowType.def.type.instance.inst.own_props[key];
                if (prop.kind === 'Field') {
                  members.set(
                    key,
                    convertFlowTypeImpl(prop.type, loc, genericEnv, platform),
                  );
                } else {
                  CompilerError.invariant(false, {
                    reason: `Unsupported property kind ${prop.kind}`,
                    loc: GeneratedSource,
                  });
                }
              }
              return Resolved.class(
                flowType.def.type.instance.inst.class_name ??
                  '[anonymous class]',
                members,
                platform,
              );
            }
            CompilerError.invariant(false, {
              reason: `Unsupported class instance type ${flowType.def.type.kind}`,
              loc: GeneratedSource,
            });
          }
          case 'Fun':
            return Resolved.function(
              poly,
              flowType.def.funtype.params.map(p =>
                convertFlowTypeImpl(p.type, loc, genericEnv, platform),
              ),
              convertFlowTypeImpl(
                flowType.def.funtype.return_t,
                loc,
                genericEnv,
                platform,
              ),
              platform,
            );
          case 'Poly': {
            let newEnv = genericEnv;
            const poly = flowType.def.tparams.map(p => {
              const id = makeTypeParameterId(nextGenericId++);
              const bound = convertFlowTypeImpl(p.bound, loc, newEnv, platform);
              newEnv = new Map(newEnv);
              newEnv.set(p.name, id);
              return {
                name: p.name,
                id,
                bound,
              };
            });
            return convertFlowTypeImpl(
              flowType.def.t_out,
              loc,
              newEnv,
              platform,
              poly,
            );
          }
          case 'ReactAbstractComponent': {
            const props = new Map<string, ResolvedType>();
            let children: ResolvedType | null = null;
            const propsType = convertFlowTypeImpl(
              flowType.def.config,
              loc,
              genericEnv,
              platform,
            );

            if (propsType.type.kind === 'Object') {
              propsType.type.members.forEach((v, k) => {
                if (k === 'children') {
                  children = v;
                } else {
                  props.set(k, v);
                }
              });
            } else {
              CompilerError.invariant(false, {
                reason: `Unsupported component props type ${propsType.type.kind}`,
                loc: GeneratedSource,
              });
            }

            return Resolved.component(props, children, platform);
          }
          case 'Renders':
            return Resolved.todo(platform);
          default:
            TypeErrors.unsupportedTypeAnnotation('Renders', GeneratedSource);
        }
      }
      case 'Generic': {
        const id = genericEnv.get(flowType.name);
        if (id == null) {
          TypeErrors.unsupportedTypeAnnotation(flowType.name, GeneratedSource);
        }
        return Resolved.generic(
          id,
          platform,
          convertFlowTypeImpl(flowType.bound, loc, genericEnv, platform),
        );
      }
      case 'Union': {
        const members = flowType.members.map(t =>
          convertFlowTypeImpl(t, loc, genericEnv, platform),
        );
        if (members.length === 1) {
          return members[0];
        }
        if (
          members[0].type.kind === 'Number' ||
          members[0].type.kind === 'String' ||
          members[0].type.kind === 'Boolean'
        ) {
          const dupes = members.filter(
            t => t.type.kind === members[0].type.kind,
          );
          if (dupes.length === members.length) {
            return members[0];
          }
        }
        if (
          members[0].type.kind === 'Array' &&
          (members[0].type.element.type.kind === 'Number' ||
            members[0].type.element.type.kind === 'String' ||
            members[0].type.element.type.kind === 'Boolean')
        ) {
          const first = members[0].type.element;
          const dupes = members.filter(
            t =>
              t.type.kind === 'Array' &&
              t.type.element.type.kind === first.type.kind,
          );
          if (dupes.length === members.length) {
            return members[0];
          }
        }
        return Resolved.union(members, platform);
      }
      case 'Eval': {
        if (
          flowType.destructor.kind === 'ReactDRO' ||
          flowType.destructor.kind === 'ReactCheckComponentConfig'
        ) {
          return convertFlowTypeImpl(
            flowType.type,
            loc,
            genericEnv,
            platform,
            poly,
          );
        }
        TypeErrors.unsupportedTypeAnnotation(
          `EvalT(${flowType.destructor.kind})`,
          GeneratedSource,
        );
      }
      case 'Optional': {
        return Resolved.union(
          [
            convertFlowTypeImpl(flowType.type, loc, genericEnv, platform),
            Resolved.void(platform),
          ],
          platform,
        );
      }
      default:
        TypeErrors.unsupportedTypeAnnotation(flowType.kind, GeneratedSource);
    }
  }
  return convertFlowTypeImpl(flowType, loc, new Map(), 'shared');
}

export interface ITypeEnv {
  popGeneric(name: string): void;
  getGeneric(name: string): null | TypeParameter<ResolvedType>;
  pushGeneric(
    name: string,
    binding: {name: string; id: TypeParameterId; bound: ResolvedType},
  ): void;
  getType(id: Identifier): ResolvedType;
  getTypeOrNull(id: Identifier): ResolvedType | null;
  setType(id: Identifier, type: ResolvedType): void;
  nextNominalId(): NominalId;
  nextTypeParameterId(): TypeParameterId;
  moduleEnv: Map<string, ResolvedType>;
  addBinding(bindingIdentifier: t.Identifier, type: ResolvedType): void;
  resolveBinding(bindingIdentifier: t.Identifier): ResolvedType | null;
}

function serializeLoc(location: t.SourceLocation): string {
  return `${location.start.line}:${location.start.column}-${location.end.line}:${location.end.column}`;
}

function buildTypeEnvironment(
  flowOutput: Array<{loc: t.SourceLocation; type: string}>,
): Map<string, string> {
  const result: Map<string, string> = new Map();
  for (const item of flowOutput) {
    const loc: t.SourceLocation = {
      start: {
        line: item.loc.start.line,
        column: item.loc.start.column - 1,
        index: item.loc.start.index,
      },
      end: item.loc.end,
      filename: item.loc.filename,
      identifierName: item.loc.identifierName,
    };

    result.set(serializeLoc(loc), item.type);
  }
  return result;
}

let lastFlowSource: string | null = null;
let lastFlowResult: any = null;

export class FlowTypeEnv implements ITypeEnv {
  moduleEnv: Map<string, ResolvedType> = new Map();
  #nextNominalId: number = 0;
  #nextTypeParameterId: number = 0;

  #types: Map<IdentifierId, ResolvedType> = new Map();
  #bindings: Map<t.Identifier, ResolvedType> = new Map();
  #generics: Array<[string, TypeParameter<ResolvedType>]> = [];
  #flowTypes: Map<string, ResolvedType> = new Map();

  init(env: Environment, source: string): void {
    // TODO: use flow-js only for web environments (e.g. playground)
    CompilerError.invariant(env.config.flowTypeProvider != null, {
      reason: 'Expected flowDumpTypes to be defined in environment config',
      loc: GeneratedSource,
    });
    let stdout: any;
    if (source === lastFlowSource) {
      stdout = lastFlowResult;
    } else {
      lastFlowSource = source;
      lastFlowResult = env.config.flowTypeProvider(source);
      stdout = lastFlowResult;
    }
    const flowTypes = buildTypeEnvironment(stdout);
    const resolvedFlowTypes = new Map<string, ResolvedType>();
    for (const [loc, type] of flowTypes) {
      if (typeof loc === 'symbol') continue;
      resolvedFlowTypes.set(loc, convertFlowType(JSON.parse(type), loc));
    }
    // =console.log(resolvedFlowTypes);
    this.#flowTypes = resolvedFlowTypes;
  }

  setType(identifier: Identifier, type: ResolvedType): void {
    if (
      typeof identifier.loc !== 'symbol' &&
      this.#flowTypes.has(serializeLoc(identifier.loc))
    ) {
      return;
    }
    this.#types.set(identifier.id, type);
  }

  getType(identifier: Identifier): ResolvedType {
    const result = this.getTypeOrNull(identifier);
    if (result == null) {
      throw new Error(
        `Type not found for ${identifier.id}, ${typeof identifier.loc === 'symbol' ? 'generated loc' : serializeLoc(identifier.loc)}`,
      );
    }
    return result;
  }

  getTypeOrNull(identifier: Identifier): ResolvedType | null {
    const result = this.#types.get(identifier.id) ?? null;
    if (result == null && typeof identifier.loc !== 'symbol') {
      const flowType = this.#flowTypes.get(serializeLoc(identifier.loc));
      return flowType ?? null;
    }
    return result;
  }

  getTypeByLoc(loc: SourceLocation): ResolvedType | null {
    if (typeof loc === 'symbol') {
      return null;
    }
    const flowType = this.#flowTypes.get(serializeLoc(loc));
    return flowType ?? null;
  }

  nextNominalId(): NominalId {
    return makeNominalId(this.#nextNominalId++);
  }

  nextTypeParameterId(): TypeParameterId {
    return makeTypeParameterId(this.#nextTypeParameterId++);
  }

  addBinding(bindingIdentifier: t.Identifier, type: ResolvedType): void {
    this.#bindings.set(bindingIdentifier, type);
  }

  resolveBinding(bindingIdentifier: t.Identifier): ResolvedType | null {
    return this.#bindings.get(bindingIdentifier) ?? null;
  }

  pushGeneric(name: string, generic: TypeParameter<ResolvedType>): void {
    this.#generics.unshift([name, generic]);
  }

  popGeneric(name: string): void {
    for (let i = 0; i < this.#generics.length; i++) {
      if (this.#generics[i][0] === name) {
        this.#generics.splice(i, 1);
        return;
      }
    }
  }

  /**
   * Look up bound polymorphic types
   * @param name
   * @returns
   */
  getGeneric(name: string): null | TypeParameter<ResolvedType> {
    for (const [eltName, param] of this.#generics) {
      if (name === eltName) {
        return param;
      }
    }
    return null;
  }
}
const Primitives = {
  number(platform: Platform): Type & ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Number'}, platform};
  },
  string(platform: Platform): Type & ResolvedType {
    return {kind: 'Concrete', type: {kind: 'String'}, platform};
  },
  boolean(platform: Platform): Type & ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Boolean'}, platform};
  },
  void(platform: Platform): Type & ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Void'}, platform};
  },
  mixed(platform: Platform): Type & ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Mixed'}, platform};
  },
  enum(platform: Platform): Type & ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Enum'}, platform};
  },
  todo(platform: Platform): Type & ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Mixed'}, platform};
  },
};

export const Resolved = {
  ...Primitives,
  nullable(type: ResolvedType, platform: Platform): ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Nullable', type}, platform};
  },
  array(element: ResolvedType, platform: Platform): ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Array', element}, platform};
  },
  set(element: ResolvedType, platform: Platform): ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Set', element}, platform};
  },
  map(
    key: ResolvedType,
    value: ResolvedType,
    platform: Platform,
  ): ResolvedType {
    return {kind: 'Concrete', type: {kind: 'Map', key, value}, platform};
  },
  function(
    typeParameters: null | Array<TypeParameter<ResolvedType>>,
    params: Array<ResolvedType>,
    returnType: ResolvedType,
    platform: Platform,
  ): ResolvedType {
    return {
      kind: 'Concrete',
      type: {kind: 'Function', typeParameters, params, returnType},
      platform,
    };
  },
  component(
    props: Map<string, ResolvedType>,
    children: ResolvedType | null,
    platform: Platform,
  ): ResolvedType {
    return {
      kind: 'Concrete',
      type: {kind: 'Component', props, children},
      platform,
    };
  },
  object(
    id: NominalId,
    members: Map<string, ResolvedType>,
    platform: Platform,
  ): ResolvedType {
    return {
      kind: 'Concrete',
      type: {
        kind: 'Object',
        id,
        members,
      },
      platform,
    };
  },
  class(
    name: string,
    members: Map<string, ResolvedType>,
    platform: Platform,
  ): ResolvedType {
    return {
      kind: 'Concrete',
      type: {
        kind: 'Instance',
        name,
        members,
      },
      platform,
    };
  },
  tuple(
    id: NominalId,
    members: Array<ResolvedType>,
    platform: Platform,
  ): ResolvedType {
    return {
      kind: 'Concrete',
      type: {
        kind: 'Tuple',
        id,
        members,
      },
      platform,
    };
  },
  generic(
    id: TypeParameterId,
    platform: Platform,
    bound = Primitives.mixed(platform),
  ): ResolvedType {
    return {
      kind: 'Concrete',
      type: {
        kind: 'Generic',
        id,
        bound,
      },
      platform,
    };
  },
  union(members: Array<ResolvedType>, platform: Platform): ResolvedType {
    return {
      kind: 'Concrete',
      type: {
        kind: 'Union',
        members,
      },
      platform,
    };
  },
};

/*
 * export const Types = {
 *   ...Primitives,
 *   variable(env: TypeEnv): Type {
 *     return env.nextTypeVariable();
 *   },
 *   nullable(type: Type): Type {
 *     return {kind: 'Concrete', type: {kind: 'Nullable', type}};
 *   },
 *   array(element: Type): Type {
 *     return {kind: 'Concrete', type: {kind: 'Array', element}};
 *   },
 *   set(element: Type): Type {
 *     return {kind: 'Concrete', type: {kind: 'Set', element}};
 *   },
 *   map(key: Type, value: Type): Type {
 *     return {kind: 'Concrete', type: {kind: 'Map', key, value}};
 *   },
 *   function(
 *     typeParameters: null | Array<TypeParameter<Type>>,
 *     params: Array<Type>,
 *     returnType: Type,
 *   ): Type {
 *     return {
 *       kind: 'Concrete',
 *       type: {kind: 'Function', typeParameters, params, returnType},
 *     };
 *   },
 *   component(
 *     props: Map<string, ResolvedType>,
 *     children: Type | null,
 *   ): Type {
 *     return {
 *       kind: 'Concrete',
 *       type: {kind: 'Component', props, children},
 *     };
 *   },
 *   object(id: NominalId, members: Map<string, ResolvedType>): Type {
 *     return {
 *       kind: 'Concrete',
 *       type: {
 *         kind: 'Object',
 *         id,
 *         members,
 *       },
 *     };
 *   },
 * };
 */
