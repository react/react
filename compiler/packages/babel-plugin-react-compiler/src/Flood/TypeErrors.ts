import {CompilerError, SourceLocation} from '..';
import {
  ConcreteType,
  printConcrete,
  printType,
  StructuralValue,
  Type,
  VariableId,
} from './Types';

export function unsupportedLanguageFeature(
  desc: string,
  loc: SourceLocation,
): never {
  CompilerError.throwInvalidJS({
    reason: `Typedchecker does not currently support language feature: ${desc}`,
    loc,
  });
}

export type UnificationError =
  | {
      kind: 'TypeUnification';
      left: ConcreteType<Type>;
      right: ConcreteType<Type>;
    }
  | {
      kind: 'StructuralUnification';
      left: StructuralValue;
      right: ConcreteType<Type>;
    };

function printUnificationError(err: UnificationError): string {
  if (err.kind === 'TypeUnification') {
    return `${printConcrete(err.left, printType)} is incompatible with ${printConcrete(err.right, printType)}`;
  } else {
    return `structural ${err.left.kind} is incompatible with ${printConcrete(err.right, printType)}`;
  }
}

export function raiseUnificationErrors(
  errs: null | Array<UnificationError>,
  loc: SourceLocation,
): void {
  if (errs != null) {
    if (errs.length === 0) {
      CompilerError.invariant(false, {
        reason: 'Should not have array of zero errors',
        loc,
      });
    } else if (errs.length === 1) {
      CompilerError.throwInvalidJS({
        reason: `Unable to unify types because ${printUnificationError(errs[0])}`,
        loc,
      });
    } else {
      const messages = errs
        .map(err => `\t* ${printUnificationError(err)}`)
        .join('\n');
      CompilerError.throwInvalidJS({
        reason: `Unable to unify types because:\n${messages}`,
        loc,
      });
    }
  }
}

export function unresolvableTypeVariable(
  id: VariableId,
  loc: SourceLocation,
): never {
  CompilerError.throwInvalidJS({
    reason: `Unable to resolve free variable ${id} to a concrete type`,
    loc,
  });
}

export function cannotAddVoid(explicit: boolean, loc: SourceLocation): never {
  if (explicit) {
    CompilerError.throwInvalidJS({
      reason: `Undefined is not a valid operand of \`+\``,
      loc,
    });
  } else {
    CompilerError.throwInvalidJS({
      reason: `Value may be undefined, which is not a valid operand of \`+\``,
      loc,
    });
  }
}

export function unsupportedTypeAnnotation(
  desc: string,
  loc: SourceLocation,
): never {
  CompilerError.throwInvalidJS({
    reason: `Typedchecker does not currently support type annotation: ${desc}`,
    loc,
  });
}

export function checkTypeArgumentArity(
  desc: string,
  expected: number,
  actual: number,
  loc: SourceLocation,
): void {
  if (expected !== actual) {
    CompilerError.throwInvalidJS({
      reason: `Expected ${desc} to have ${expected} type parameters, got ${actual}`,
      loc,
    });
  }
}

export function notAFunction(desc: string, loc: SourceLocation): void {
  CompilerError.throwInvalidJS({
    reason: `Cannot call ${desc} because it is not a function`,
    loc,
  });
}

export function notAPolymorphicFunction(
  desc: string,
  loc: SourceLocation,
): void {
  CompilerError.throwInvalidJS({
    reason: `Cannot call ${desc} with type arguments because it is not a polymorphic function`,
    loc,
  });
}
