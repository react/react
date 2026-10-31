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
        !referencesUnboundModuleLocal(value.loweredFunc.func)
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
 * Returns true if `fn` contains a `LoadGlobal(ModuleLocal)` whose name does
 * not actually resolve at module/program scope.
 *
 * This guards against an upstream misclassification: when the outermost
 * function being compiled is itself nested inside another function (e.g. a
 * factory or HOC, as in `infer` compilation mode), `HIRBuilder` resolves
 * identifiers relative to `parentFunction.scope.parent`, which is the
 * enclosing function's scope rather than the program scope. As a result,
 * references to the enclosing function's locals are tagged as `ModuleLocal`
 * and surface here as `LoadGlobal` instructions with `context.length === 0`,
 * making the function look outlineable. Hoisting it to module scope would
 * leave the referenced name undefined at runtime.
 *
 * A proper fix lives in `HIRBuilder`/`BuildHIR` — classifying the binding
 * correctly and threading factory-scope variables through the capture
 * machinery so they appear in `fn.context`. That is a substantially larger
 * change that affects how nested functions are lowered in general; this pass
 * keeps the function inline as a targeted, conservative workaround.
 */
function referencesUnboundModuleLocal(fn: HIRFunction): boolean {
  const programScope = fn.env.parentFunction.scope.getProgramParent();
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const {value} = instr;
      if (
        value.kind === 'LoadGlobal' &&
        value.binding.kind === 'ModuleLocal' &&
        programScope.getBinding(value.binding.name) == null
      ) {
        return true;
      }
    }
  }
  return false;
}
