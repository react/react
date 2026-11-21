/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  HIRFunction,
  IdentifierId,
  InstructionValue,
  isPrimitiveType,
  Place,
} from '../HIR';
import {BuiltInObjectFromEntriesId} from '../HIR/ObjectShape';
import {eachInstructionValueOperand} from '../HIR/visitors';

export function isObjectFromEntries(
  value: InstructionValue,
): value is Extract<InstructionValue, {kind: 'CallExpression' | 'MethodCall'}> {
  const callee =
    value.kind === 'CallExpression'
      ? value.callee
      : value.kind === 'MethodCall'
        ? value.property
        : null;
  return (
    callee?.identifier.type.kind === 'Function' &&
    callee.identifier.type.shapeId === BuiltInObjectFromEntriesId
  );
}

/**
 * Proves that iterating an entries array and coercing its keys cannot mutate it.
 * Track allocation sites through local aliases, then reject every allocation
 * reachable from a potentially mutating use. Unknown aliases, including phis
 * and property loads, deliberately lose the proof. The graph walk is linear in
 * the number of instructions and captured operands.
 */
export function findNonMutatedPrimitiveEntryArrays(
  fn: HIRFunction,
): Set<IdentifierId> {
  let hasFromEntries = false;
  for (const block of fn.body.blocks.values()) {
    if (block.instructions.some(instr => isObjectFromEntries(instr.value))) {
      hasFromEntries = true;
      break;
    }
  }
  if (!hasFromEntries) return new Set();
  const origins = new Map<IdentifierId, IdentifierId>();
  const captures = new Map<IdentifierId, Array<IdentifierId>>();
  const primitiveKeyArrays = new Set<IdentifierId>();
  const entries = new Map<IdentifierId, Array<IdentifierId>>();
  const invalid = new Set<IdentifierId>();
  const pending: Array<IdentifierId> = [];
  function invalidate(place: Place): void {
    const origin = origins.get(place.identifier.id);
    if (origin != null && !invalid.has(origin)) {
      invalid.add(origin);
      pending.push(origin);
    }
  }
  for (const block of fn.body.blocks.values()) {
    for (const {lvalue, value} of block.instructions) {
      const id = lvalue.identifier.id;
      if (value.kind === 'LoadLocal' || value.kind === 'TypeCastExpression') {
        const source = value.kind === 'LoadLocal' ? value.place : value.value;
        const origin = origins.get(source.identifier.id);
        if (origin != null) origins.set(id, origin);
      } else if (value.kind === 'StoreLocal') {
        const origin = origins.get(value.value.identifier.id);
        if (origin != null) {
          origins.set(id, origin);
          origins.set(value.lvalue.place.identifier.id, origin);
        }
      } else if (
        value.kind === 'ArrayExpression' ||
        value.kind === 'ObjectExpression' ||
        isObjectFromEntries(value)
      ) {
        origins.set(id, id);
        const captured: Array<IdentifierId> = [];
        for (const operand of eachInstructionValueOperand(value)) {
          const origin = origins.get(operand.identifier.id);
          if (origin != null) captured.push(origin);
        }
        captures.set(id, captured);
        if (value.kind !== 'ArrayExpression') continue;
        const first = value.elements[0];
        if (first?.kind === 'Identifier' && isPrimitiveType(first.identifier)) {
          primitiveKeyArrays.add(id);
        }
        const elements: Array<IdentifierId> = [];
        let knownEntries = true;
        for (const element of value.elements) {
          const origin =
            element.kind === 'Identifier'
              ? origins.get(element.identifier.id)
              : null;
          if (origin == null || !primitiveKeyArrays.has(origin)) {
            knownEntries = false;
            break;
          }
          elements.push(origin);
        }
        if (knownEntries) entries.set(id, elements);
      }
    }
  }
  for (const block of fn.body.blocks.values()) {
    for (const phi of block.phis) {
      for (const operand of phi.operands.values()) invalidate(operand);
    }
    for (const {value} of block.instructions) {
      switch (value.kind) {
        case 'LoadLocal':
        case 'StoreLocal':
        case 'TypeCastExpression':
        case 'ArrayExpression':
        case 'ObjectExpression':
        case 'JsxExpression':
        case 'JsxFragment': {
          break;
        }
        default: {
          if (isObjectFromEntries(value)) {
            const arg = value.args[0];
            const origin =
              arg?.kind === 'Identifier'
                ? origins.get(arg.identifier.id)
                : null;
            if (origin != null && entries.has(origin)) {
              break;
            }
          }
          for (const operand of eachInstructionValueOperand(value)) {
            invalidate(operand);
          }
        }
      }
    }
  }
  for (let i = 0; i < pending.length; i++) {
    for (const child of captures.get(pending[i]) ?? []) {
      if (!invalid.has(child)) {
        invalid.add(child);
        pending.push(child);
      }
    }
  }
  const safeEntries = new Set<IdentifierId>();
  for (const [id, elements] of entries) {
    if (!invalid.has(id) && elements.every(element => !invalid.has(element))) {
      safeEntries.add(id);
    }
  }
  const result = new Set<IdentifierId>();
  for (const [id, origin] of origins) {
    if (safeEntries.has(origin)) result.add(id);
  }
  return result;
}
