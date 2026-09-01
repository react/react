import {GeneratedSource} from '../HIR';
import {assertExhaustive} from '../Utils/utils';
import {unsupportedLanguageFeature} from './TypeErrors';
import {
  ConcreteType,
  ResolvedType,
  TypeParameter,
  TypeParameterId,
  DEBUG,
  printConcrete,
  printType,
} from './Types';

export function substitute(
  type: ConcreteType<ResolvedType>,
  typeParameters: Array<TypeParameter<ResolvedType>>,
  typeArguments: Array<ResolvedType>,
): ResolvedType {
  const substMap = new Map<TypeParameterId, ResolvedType>();
  for (let i = 0; i < typeParameters.length; i++) {
    // TODO: Length checks to make sure type params match up with args
    const typeParameter = typeParameters[i];
    const typeArgument = typeArguments[i];
    substMap.set(typeParameter.id, typeArgument);
  }
  const substitutionFunction = (t: ResolvedType): ResolvedType => {
    // TODO: We really want a stateful mapper or visitor here so that we can model nested polymorphic types
    if (t.type.kind === 'Generic' && substMap.has(t.type.id)) {
      const substitutedType = substMap.get(t.type.id)!;
      return substitutedType;
    }

    return {
      kind: 'Concrete',
      type: mapType(substitutionFunction, t.type),
      platform: t.platform,
    };
  };

  const substituted = mapType(substitutionFunction, type);

  if (DEBUG) {
    let substs = '';
    for (let i = 0; i < typeParameters.length; i++) {
      const typeParameter = typeParameters[i];
      const typeArgument = typeArguments[i];
      substs += `[${typeParameter.name}${typeParameter.id} := ${printType(typeArgument)}]`;
    }
    console.log(
      `${printConcrete(type, printType)}${substs} = ${printConcrete(substituted, printType)}`,
    );
  }

  return {kind: 'Concrete', type: substituted, platform: /* TODO */ 'shared'};
}

export function mapType<T, U>(
  f: (t: T) => U,
  type: ConcreteType<T>,
): ConcreteType<U> {
  switch (type.kind) {
    case 'Mixed':
    case 'Number':
    case 'String':
    case 'Boolean':
    case 'Void':
      return type;

    case 'Nullable':
      return {
        kind: 'Nullable',
        type: f(type.type),
      };

    case 'Array':
      return {
        kind: 'Array',
        element: f(type.element),
      };

    case 'Set':
      return {
        kind: 'Set',
        element: f(type.element),
      };

    case 'Map':
      return {
        kind: 'Map',
        key: f(type.key),
        value: f(type.value),
      };

    case 'Function':
      return {
        kind: 'Function',
        typeParameters:
          type.typeParameters?.map(param => ({
            id: param.id,
            name: param.name,
            bound: f(param.bound),
          })) ?? null,
        params: type.params.map(f),
        returnType: f(type.returnType),
      };

    case 'Component': {
      return {
        kind: 'Component',
        children: type.children != null ? f(type.children) : null,
        props: new Map([...type.props.entries()].map(([k, v]) => [k, f(v)])),
      };
    }

    case 'Generic':
      return {
        kind: 'Generic',
        id: type.id,
        bound: f(type.bound),
      };

    case 'Object':
      return type;

    case 'Tuple':
      return {
        kind: 'Tuple',
        id: type.id,
        members: type.members.map(f),
      };

    case 'Structural':
      return type;

    case 'Enum':
    case 'Union':
    case 'Instance':
      unsupportedLanguageFeature(type.kind, GeneratedSource);

    default:
      assertExhaustive(type, 'Unknown type kind');
  }
}

export function diff<R, T>(
  a: ConcreteType<T>,
  b: ConcreteType<T>,
  onChild: (a: T, b: T) => R,
  onChildMismatch: (child: R, cur: R) => R,
  onMismatch: (a: ConcreteType<T>, b: ConcreteType<T>, cur: R) => R,
  init: R,
): R {
  let errors = init;

  // Check if kinds match
  if (a.kind !== b.kind) {
    errors = onMismatch(a, b, errors);
    return errors;
  }

  // Based on kind, check other properties
  switch (a.kind) {
    case 'Mixed':
    case 'Number':
    case 'String':
    case 'Boolean':
    case 'Void':
      // Simple types, no further checks needed
      break;

    case 'Nullable':
      // Check the nested type
      errors = onChildMismatch(onChild(a.type, (b as typeof a).type), errors);
      break;

    case 'Array':
    case 'Set':
      // Check the element type
      errors = onChildMismatch(
        onChild(a.element, (b as typeof a).element),
        errors,
      );
      break;

    case 'Map':
      // Check both key and value types
      errors = onChildMismatch(onChild(a.key, (b as typeof a).key), errors);
      errors = onChildMismatch(onChild(a.value, (b as typeof a).value), errors);
      break;

    case 'Function': {
      const bFunc = b as typeof a;

      // Check type parameters
      if ((a.typeParameters == null) !== (bFunc.typeParameters == null)) {
        errors = onMismatch(a, b, errors);
      }

      if (a.typeParameters != null && bFunc.typeParameters != null) {
        if (a.typeParameters.length !== bFunc.typeParameters.length) {
          errors = onMismatch(a, b, errors);
        }

        // Type parameters are just numbers, so we can compare them directly
        for (let i = 0; i < a.typeParameters.length; i++) {
          if (a.typeParameters[i] !== bFunc.typeParameters[i]) {
            errors = onMismatch(a, b, errors);
          }
        }
      }

      // Check parameters
      if (a.params.length !== bFunc.params.length) {
        errors = onMismatch(a, b, errors);
      }

      for (let i = 0; i < a.params.length; i++) {
        errors = onChildMismatch(onChild(a.params[i], bFunc.params[i]), errors);
      }

      // Check return type
      errors = onChildMismatch(onChild(a.returnType, bFunc.returnType), errors);
      break;
    }

    case 'Component': {
      const bComp = b as typeof a;

      // Check children
      if (a.children !== bComp.children) {
        errors = onMismatch(a, b, errors);
      }

      // Check props
      if (a.props.size !== bComp.props.size) {
        errors = onMismatch(a, b, errors);
      }

      for (const [k, v] of a.props) {
        const bProp = bComp.props.get(k);
        if (bProp == null) {
          errors = onMismatch(a, b, errors);
        } else {
          errors = onChildMismatch(onChild(v, bProp), errors);
        }
      }

      break;
    }

    case 'Generic': {
      // Check that the type parameter IDs match
      if (a.id !== (b as typeof a).id) {
        errors = onMismatch(a, b, errors);
      }
      break;
    }
    case 'Structural': {
      const bStruct = b as typeof a;

      // Check that the structural IDs match
      if (a.id !== bStruct.id) {
        errors = onMismatch(a, b, errors);
      }
      break;
    }
    case 'Object': {
      const bNom = b as typeof a;

      // Check that the nominal IDs match
      if (a.id !== bNom.id) {
        errors = onMismatch(a, b, errors);
      }
      break;
    }

    case 'Tuple': {
      const bTuple = b as typeof a;

      // Check that the tuple IDs match
      if (a.id !== bTuple.id) {
        errors = onMismatch(a, b, errors);
      }
      for (let i = 0; i < a.members.length; i++) {
        errors = onChildMismatch(
          onChild(a.members[i], bTuple.members[i]),
          errors,
        );
      }

      break;
    }

    case 'Enum':
    case 'Instance':
    case 'Union': {
      unsupportedLanguageFeature(a.kind, GeneratedSource);
    }

    default:
      assertExhaustive(a, 'Unknown type kind');
  }

  return errors;
}

export function filterOptional(t: ResolvedType): ResolvedType {
  if (t.kind === 'Concrete' && t.type.kind === 'Nullable') {
    return t.type.type;
  }
  return t;
}
