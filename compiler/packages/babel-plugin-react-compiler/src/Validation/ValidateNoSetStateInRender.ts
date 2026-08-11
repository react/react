/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  CompilerDiagnostic,
  CompilerError,
  ErrorCategory,
} from '../CompilerError';
import {HIRFunction, IdentifierId, isSetStateType} from '../HIR';
import {computeUnconditionalBlocks} from '../HIR/ComputeUnconditionalBlocks';
import {eachInstructionValueOperand} from '../HIR/visitors';

/**
 * Validates that the given function does not have an infinite update loop
 * caused by unconditionally calling setState during render. This validation
 * is conservative and cannot catch all cases of unconditional setState in
 * render, but avoids false positives. Examples of cases that are caught:
 *
 * ```javascript
 * // Direct call of setState:
 * const [state, setState] = useState(false);
 * setState(true);
 *
 * // Indirect via a function:
 * const [state, setState] = useState(false);
 * const setTrue = () => setState(true);
 * setTrue();
 * ```
 *
 * However, storing setState inside another value and accessing it is not yet
 * validated:
 *
 * ```
 * // false negative, not detected but will cause an infinite render loop
 * const [state, setState] = useState(false);
 * const x = [setState];
 * const y = x.pop();
 * y();
 * ```
 */
export function validateNoSetStateInRender(fn: HIRFunction): void {
  const unconditionalSetStateFunctions: Set<IdentifierId> = new Set();
  const errors = validateNoSetStateInRenderImpl(
    fn,
    unconditionalSetStateFunctions,
  );
  for (const detail of errors.details) {
    fn.env.recordError(detail);
  }
}

function validateNoSetStateInRenderImpl(
  fn: HIRFunction,
  unconditionalSetStateFunctions: Set<IdentifierId>,
): CompilerError {
  const unconditionalBlocks = computeUnconditionalBlocks(fn);
  let activeManualMemoId: number | null = null;
  const errors = new CompilerError();
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      switch (instr.value.kind) {
        case 'LoadLocal': {
          if (
            unconditionalSetStateFunctions.has(instr.value.place.identifier.id)
          ) {
            unconditionalSetStateFunctions.add(instr.lvalue.identifier.id);
          }
          break;
        }
        case 'StoreLocal': {
          if (
            unconditionalSetStateFunctions.has(instr.value.value.identifier.id)
          ) {
            unconditionalSetStateFunctions.add(
              instr.value.lvalue.place.identifier.id,
            );
            unconditionalSetStateFunctions.add(instr.lvalue.identifier.id);
          }
          break;
        }
        case 'ObjectMethod':
        case 'FunctionExpression': {
          if (
            // faster-path to check if the function expression references a setState
            [...eachInstructionValueOperand(instr.value)].some(
              operand =>
                isSetStateType(operand.identifier) ||
                unconditionalSetStateFunctions.has(operand.identifier.id),
            ) &&
            // if yes, does it unconditonally call it?
            validateNoSetStateInRenderImpl(
              instr.value.loweredFunc.func,
              unconditionalSetStateFunctions,
            ).hasAnyErrors()
          ) {
            // This function expression unconditionally calls a setState
            unconditionalSetStateFunctions.add(instr.lvalue.identifier.id);
          }
          break;
        }
        case 'StartMemoize': {
          CompilerError.invariant(activeManualMemoId === null, {
            reason: 'Unexpected nested StartMemoize instructions',
            loc: instr.value.loc,
          });
          activeManualMemoId = instr.value.manualMemoId;
          break;
        }
        case 'FinishMemoize': {
          CompilerError.invariant(
            activeManualMemoId === instr.value.manualMemoId,
            {
              reason:
                'Expected FinishMemoize to align with previous StartMemoize instruction',
              loc: instr.value.loc,
            },
          );
          activeManualMemoId = null;
          break;
        }
        case 'CallExpression': {
          const callee = instr.value.callee;
          if (
            isSetStateType(callee.identifier) ||
            unconditionalSetStateFunctions.has(callee.identifier.id)
          ) {
            if (activeManualMemoId !== null) {
              errors.pushDiagnostic(
                CompilerDiagnostic.create({
                  category: ErrorCategory.RenderSetState,
                  reason:
                    'Calling setState from useMemo may trigger an infinite loop',
                  description:
                    'Each time the memo callback is evaluated it will change state. This can cause a memoization dependency to change, running the memo function again and causing an infinite loop. Instead of setting state in useMemo(), prefer deriving the value during render. (https://react.dev/reference/react/useState)',
                  suggestions: null,
                }).withDetails({
                  kind: 'error',
                  loc: callee.loc,
                  message: 'Found setState() within useMemo()',
                }),
              );
            } else if (unconditionalBlocks.has(block.id)) {
              const enableUseKeyedState = fn.env.config.enableUseKeyedState;
              if (enableUseKeyedState) {
                errors.pushDiagnostic(
                  CompilerDiagnostic.create({
                    category: ErrorCategory.RenderSetState,
                    reason: 'Cannot call setState during render',
                    description:
                      'Calling setState during render may trigger an infinite loop.\n' +
                      '* To reset state when other state/props change, use `const [state, setState] = useKeyedState(initialState, key)` to reset `state` when `key` changes.\n' +
                      '* To derive data from other state/props, compute the derived data during render without using state',
                    suggestions: null,
                  }).withDetails({
                    kind: 'error',
                    loc: callee.loc,
                    message: 'Found setState() in render',
                  }),
                );
              } else {
                errors.pushDiagnostic(
                  CompilerDiagnostic.create({
                    category: ErrorCategory.RenderSetState,
                    reason: 'Cannot call setState during render',
                    description:
                      'Calling setState during render may trigger an infinite loop.\n' +
                      '* To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders\n' +
                      '* To derive data from other state/props, compute the derived data during render without using state',
                    suggestions: null,
                  }).withDetails({
                    kind: 'error',
                    loc: callee.loc,
                    message: 'Found setState() in render',
                  }),
                );
              }
            }
          }
          break;
        }
      }
    }
  }

  return errors;
}
