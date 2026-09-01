/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  BlockId,
  Environment,
  getHookKind,
  HIRFunction,
  Identifier,
  IdentifierId,
  Instruction,
  InstructionKind,
  InstructionValue,
  ObjectPattern,
} from '../HIR';
import {
  eachInstructionValueOperand,
  eachPatternOperand,
  eachTerminalOperand,
} from '../HIR/visitors';
import {assertExhaustive, retainWhere} from '../Utils/utils';

/*
 * Implements dead-code elimination, eliminating instructions whose values are unused.
 *
 * Note that unreachable blocks are already pruned during HIR construction.
 */
export function deadCodeElimination(fn: HIRFunction): void {
  /**
   * Phase 1: Find/mark all referenced identifiers
   * Usages may be visited AFTER declarations if there are circular phi / data dependencies
   * between blocks, so we wait to sweep until after fixed point iteration is complete
   */
  const state = findReferencedIdentifiers(fn);

  /**
   * Phase 2: Prune / sweep unreferenced identifiers and instructions
   * as possible (subject to HIR structural constraints)
   */
  for (const [, block] of fn.body.blocks) {
    for (const phi of block.phis) {
      if (!state.isIdOrNameUsed(phi.place.identifier)) {
        block.phis.delete(phi);
      }
    }
    retainWhere(block.instructions, instr =>
      state.isIdOrNameUsed(instr.lvalue.identifier),
    );
    // Rewrite retained instructions
    for (let i = 0; i < block.instructions.length; i++) {
      const isBlockValue =
        block.kind !== 'block' && i === block.instructions.length - 1;
      if (!isBlockValue) {
        rewriteInstruction(block.instructions[i], state);
      }
    }
  }

  /**
   * Constant propagation and DCE may have deleted or rewritten instructions
   * that reference context variables.
   */
  retainWhere(fn.context, contextVar =>
    state.isIdOrNameUsed(contextVar.identifier),
  );
}

class State {
  env: Environment;
  named: Set<string> = new Set();
  identifiers: Set<IdentifierId> = new Set();

  constructor(env: Environment) {
    this.env = env;
  }

  // Mark the identifier as being referenced (not dead code)
  reference(identifier: Identifier): void {
    this.identifiers.add(identifier.id);
    if (identifier.name !== null) {
      this.named.add(identifier.name.value);
    }
  }

  /*
   * Check if any version of the given identifier is used somewhere.
   * This checks both for usage of this specific identifer id (ssa id)
   * and (for named identifiers) for any usages of that identifier name.
   */
  isIdOrNameUsed(identifier: Identifier): boolean {
    return (
      this.identifiers.has(identifier.id) ||
      (identifier.name !== null && this.named.has(identifier.name.value))
    );
  }

  /*
   * Like `used()`, but only checks for usages of this specific identifier id
   * (ssa id).
   */
  isIdUsed(identifier: Identifier): boolean {
    return this.identifiers.has(identifier.id);
  }

  get count(): number {
    return this.identifiers.size;
  }
}

function findReferencedIdentifiers(fn: HIRFunction): State {
  /*
   * If there are no back-edges the algorithm can terminate after a single iteration
   * of the blocks
   */
  const hasLoop = hasBackEdge(fn);
  const reversedBlocks = [...fn.body.blocks.values()].reverse();

  const state = new State(fn.env);
  let size = state.count;
  do {
    size = state.count;

    /*
     * Iterate blocks in postorder (successors before predecessors, excepting loops)
     * to visit usages before declarations
     */
    for (const block of reversedBlocks) {
      for (const operand of eachTerminalOperand(block.terminal)) {
        state.reference(operand.identifier);
      }

      for (let i = block.instructions.length - 1; i >= 0; i--) {
        const instr = block.instructions[i]!;
        const isBlockValue =
          block.kind !== 'block' && i === block.instructions.length - 1;

        if (isBlockValue) {
          /**
           * The last instr of a value block is never eligible for pruning,
           * as that's the block's value. Pessimistically consider all operands
           * as used to avoid rewriting the last instruction
           */
          state.reference(instr.lvalue.identifier);
          for (const place of eachInstructionValueOperand(instr.value)) {
            state.reference(place.identifier);
          }
        } else if (
          state.isIdOrNameUsed(instr.lvalue.identifier) ||
          !pruneableValue(instr.value, state)
        ) {
          state.reference(instr.lvalue.identifier);

          if (instr.value.kind === 'StoreLocal') {
            /*
             * If this is a Let/Const declaration, mark the initializer as referenced
             * only if the ssa'ed lval is also referenced
             */
            if (
              instr.value.lvalue.kind === InstructionKind.Reassign ||
              state.isIdUsed(instr.value.lvalue.place.identifier)
            ) {
              state.reference(instr.value.value.identifier);
            }
          } else {
            for (const operand of eachInstructionValueOperand(instr.value)) {
              state.reference(operand.identifier);
            }
          }
        }
      }
      for (const phi of block.phis) {
        if (state.isIdOrNameUsed(phi.place.identifier)) {
          for (const [_pred, operand] of phi.operands) {
            state.reference(operand.identifier);
          }
        }
      }
    }
  } while (state.count > size && hasLoop);
  return state;
}

function rewriteInstruction(instr: Instruction, state: State): void {
  if (instr.value.kind === 'Destructure') {
    // Remove unused lvalues
    switch (instr.value.lvalue.pattern.kind) {
      case 'ArrayPattern': {
        /*
         * For arrays, we can prune items prior to the end by replacing
         * them with a hole. Items at the end can simply be dropped.
         */
        let lastEntryIndex = 0;
        const items = instr.value.lvalue.pattern.items;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'Identifier') {
            if (!state.isIdOrNameUsed(item.identifier)) {
              items[i] = {kind: 'Hole'};
            } else {
              lastEntryIndex = i;
            }
          } else if (item.kind === 'Spread') {
            if (!state.isIdOrNameUsed(item.place.identifier)) {
              items[i] = {kind: 'Hole'};
            } else {
              lastEntryIndex = i;
            }
          }
        }
        items.length = lastEntryIndex + 1;
        break;
      }
      case 'ObjectPattern': {
        /*
         * For objects we can prune any unused properties so long as there is no used rest element
         * (`const {x, ...y} = z`). If a rest element exists and is used, then nothing can be pruned
         * because it would change the set of properties which are copied into the rest value.
         * In the `const {x, ...y} = z` example, removing the `x` property would mean that `y` now
         * has an `x` property, changing the semantics.
         */
        let nextProperties: ObjectPattern['properties'] | null = null;
        for (const property of instr.value.lvalue.pattern.properties) {
          if (property.kind === 'ObjectProperty') {
            if (state.isIdOrNameUsed(property.place.identifier)) {
              nextProperties ??= [];
              nextProperties.push(property);
            }
          } else {
            if (state.isIdOrNameUsed(property.place.identifier)) {
              nextProperties = null;
              break;
            }
          }
        }
        if (nextProperties !== null) {
          instr.value.lvalue.pattern.properties = nextProperties;
        }
        break;
      }
      default: {
        assertExhaustive(
          instr.value.lvalue.pattern,
          `Unexpected pattern kind '${
            (instr.value.lvalue.pattern as any).kind
          }'`,
        );
      }
    }
  } else if (instr.value.kind === 'StoreLocal') {
    if (
      instr.value.lvalue.kind !== InstructionKind.Reassign &&
      !state.isIdUsed(instr.value.lvalue.place.identifier)
    ) {
      /*
       * This is a const/let declaration where the variable is accessed later,
       * but where the value is always overwritten before being read. Ie the
       * initializer value is never read. We rewrite to a DeclareLocal so
       * that the initializer value can be DCE'd
       */
      instr.value = {
        kind: 'DeclareLocal',
        lvalue: instr.value.lvalue,
        type: instr.value.type,
        loc: instr.value.loc,
      };
    }
  }
}

/*
 * Returns true if it is safe to prune an instruction with the given value.
 * Functions which may have side-
 */
function pruneableValue(value: InstructionValue, state: State): boolean {
  switch (value.kind) {
    case 'DeclareLocal': {
      // Declarations are pruneable only if the named variable is never read later
      return !state.isIdOrNameUsed(value.lvalue.place.identifier);
    }
    case 'StoreLocal': {
      if (value.lvalue.kind === InstructionKind.Reassign) {
        // Reassignments can be pruned if the specific instance being assigned is never read
        return !state.isIdUsed(value.lvalue.place.identifier);
      }
      // Declarations are pruneable only if the named variable is never read later
      return !state.isIdOrNameUsed(value.lvalue.place.identifier);
    }
    case 'Destructure': {
      let isIdOrNameUsed = false;
      let isIdUsed = false;
      for (const place of eachPatternOperand(value.lvalue.pattern)) {
        if (state.isIdUsed(place.identifier)) {
          isIdOrNameUsed = true;
          isIdUsed = true;
        } else if (state.isIdOrNameUsed(place.identifier)) {
          isIdOrNameUsed = true;
        }
      }
      if (value.lvalue.kind === InstructionKind.Reassign) {
        // Reassignments can be pruned if the specific instance being assigned is never read
        return !isIdUsed;
      } else {
        // Otherwise pruneable only if none of the identifiers are read from later
        return !isIdOrNameUsed;
      }
    }
    case 'PostfixUpdate':
    case 'PrefixUpdate': {
      // Updates are pruneable if the specific instance instance being assigned is never read
      return !state.isIdUsed(value.lvalue.identifier);
    }
    case 'Debugger': {
      // explicitly retain debugger statements to not break debugging workflows
      return false;
    }
    case 'CallExpression':
    case 'MethodCall': {
      if (state.env.outputMode === 'ssr') {
        const calleee =
          value.kind === 'CallExpression' ? value.callee : value.property;
        const hookKind = getHookKind(state.env, calleee.identifier);
        switch (hookKind) {
          case 'useState':
          case 'useReducer':
          case 'useRef': {
            // unused refs can be removed
            return true;
          }
        }
      }
      return false;
    }
    case 'Await':
    case 'ComputedDelete':
    case 'ComputedStore':
    case 'PropertyDelete':
    case 'PropertyStore':
    case 'StoreGlobal': {
      /*
       * Mutating instructions are not safe to prune.
       * TODO: we could be more precise and make this conditional on whether
       * any arguments are actually modified
       */
      return false;
    }
    case 'NewExpression':
    case 'UnsupportedNode':
    case 'TaggedTemplateExpression': {
      // Potentially safe to prune, since they should just be creating new values
      return false;
    }
    case 'GetIterator':
    case 'NextPropertyOf':
    case 'IteratorNext': {
      /*
       * Technically a IteratorNext/NextPropertyOf will never be unused because it's
       * always used later by another StoreLocal or Destructure instruction, but conceptually
       * we can't prune
       */
      return false;
    }
    case 'LoadContext':
    case 'DeclareContext':
    case 'StoreContext': {
      return false;
    }
    case 'StartMemoize':
    case 'FinishMemoize': {
      /**
       * This instruction is used by the @enablePreserveExistingMemoizationGuarantees feature
       * to preserve information about memoization semantics in the original code. We can't
       * DCE without losing the memoization guarantees.
       */
      return false;
    }
    case 'RegExpLiteral':
    case 'MetaProperty':
    case 'LoadGlobal':
    case 'ArrayExpression':
    case 'BinaryExpression':
    case 'ComputedLoad':
    case 'ObjectMethod':
    case 'FunctionExpression':
    case 'LoadLocal':
    case 'JsxExpression':
    case 'JsxFragment':
    case 'JSXText':
    case 'ObjectExpression':
    case 'Primitive':
    case 'PropertyLoad':
    case 'TemplateLiteral':
    case 'TypeCastExpression':
    case 'UnaryExpression': {
      // Definitely safe to prune since they are read-only
      return true;
    }
    default: {
      assertExhaustive(
        value,
        `Unexepcted value kind \`${(value as any).kind}\``,
      );
    }
  }
}

export function hasBackEdge(fn: HIRFunction): boolean {
  return findBlocksWithBackEdges(fn).size > 0;
}

export function findBlocksWithBackEdges(fn: HIRFunction): Set<BlockId> {
  const visited = new Set<BlockId>();
  const blocks = new Set<BlockId>();
  for (const [blockId, block] of fn.body.blocks) {
    for (const predId of block.preds) {
      if (!visited.has(predId)) {
        blocks.add(blockId);
      }
    }
    visited.add(blockId);
  }
  return blocks;
}
