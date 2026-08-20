/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {visitReactiveFunction} from '.';
import {InstructionId, Place, ReactiveFunction, ReactiveValue} from '../HIR';
import {ReactiveFunctionVisitor} from './visitors';

/**
 * Returns a set of unique globals (by name) that are referenced transitively within the function.
 */
export function collectReferencedGlobals(fn: ReactiveFunction): Set<string> {
  const identifiers = new Set<string>();
  visitReactiveFunction(fn, new Visitor(), identifiers);
  return identifiers;
}

class Visitor extends ReactiveFunctionVisitor<Set<string>> {
  override visitValue(
    id: InstructionId,
    value: ReactiveValue,
    state: Set<string>,
  ): void {
    this.traverseValue(id, value, state);
    if (value.kind === 'FunctionExpression' || value.kind === 'ObjectMethod') {
      this.visitHirFunction(value.loweredFunc.func, state);
    } else if (value.kind === 'LoadGlobal') {
      state.add(value.binding.name);
    }
  }

  override visitReactiveFunctionValue(
    _id: InstructionId,
    _dependencies: Array<Place>,
    fn: ReactiveFunction,
    state: Set<string>,
  ): void {
    visitReactiveFunction(fn, this, state);
  }
}
