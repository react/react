/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {HIRFunction, IdentifierId} from '../HIR';

export function outlineFunctions(
  fn: HIRFunction,
  fbtOperands: Set<IdentifierId>,
): void {
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const {value, lvalue} = instr;

      if (
        value.kind === 'FunctionExpression' ||
        value.kind === 'ObjectMethod'
      ) {
        // Recurse in case there are inner functions which can be outlined
        outlineFunctions(value.loweredFunc.func, fbtOperands);
      }
      if (
        value.kind === 'FunctionExpression' &&
        value.loweredFunc.func.context.length === 0 &&
        // TODO: handle outlining named functions
        value.loweredFunc.func.id === null &&
        !fbtOperands.has(lvalue.identifier.id) &&
        !referencesNonModuleScopeBindings(value.loweredFunc.func)
      ) {
        const loweredFunc = value.loweredFunc.func;

        const id = fn.env.generateGloballyUniqueIdentifierName(
          loweredFunc.id ?? loweredFunc.nameHint,
        );
        loweredFunc.id = id.value;

        fn.env.outlineFunction(loweredFunc, null);
        instr.value = {
          kind: 'LoadGlobal',
          binding: {
            kind: 'Global',
            name: id.value,
          },
          loc: value.loc,
        };
      }
    }
  }
}

/**
 * Returns true if `fn` (or a function nested within it) references a binding
 * that would not be in scope at module level, in which case the function
 * cannot be outlined.
 *
 * When the function being compiled is itself nested inside another,
 * non-compiled function (eg a factory in `infer` compilation mode), HIRBuilder
 * classifies references to the enclosing function's locals as ModuleLocal:
 * it only distinguishes bindings inside the compiled function from bindings
 * above it, not module-scope bindings from enclosing-function locals (see
 * `resolveIdentifier`). Such variables don't appear in `context`, so the
 * function looks outlineable, but hoisting it to module scope would move the
 * reference out of the enclosing function's scope and throw a ReferenceError
 * at runtime. The same applies to StoreGlobal, which records reassignments
 * of any non-local name.
 *
 * Re-resolving the name against the scope enclosing the compiled function —
 * the same scope HIRBuilder resolved against — tells us which case we're in.
 * Names that don't resolve to any binding (ambient globals and references to
 * already-outlined functions) are fine: they mean the same thing at module
 * scope.
 */
function referencesNonModuleScopeBindings(fn: HIRFunction): boolean {
  const enclosingScope = fn.env.parentFunction.scope.parent;
  const moduleScope = fn.env.parentFunction.scope.getProgramParent();
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const {value} = instr;
      let name: string | null = null;
      if (value.kind === 'LoadGlobal' && value.binding.kind === 'ModuleLocal') {
        name = value.binding.name;
      } else if (value.kind === 'StoreGlobal') {
        name = value.name;
      } else if (
        (value.kind === 'FunctionExpression' ||
          value.kind === 'ObjectMethod') &&
        referencesNonModuleScopeBindings(value.loweredFunc.func)
      ) {
        return true;
      }
      if (name !== null) {
        const binding = enclosingScope.getBinding(name);
        if (binding != null && binding.scope !== moduleScope) {
          return true;
        }
      }
    }
  }
  return false;
}
