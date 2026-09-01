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
import {
  FunctionExpression,
  HIRFunction,
  IdentifierId,
  SourceLocation,
} from '../HIR';
import {Environment} from '../HIR/Environment';
import {
  eachInstructionValueOperand,
  eachTerminalOperand,
} from '../HIR/visitors';

export function validateUseMemo(fn: HIRFunction): void {
  const voidMemoErrors = new CompilerError();
  const useMemos = new Set<IdentifierId>();
  const react = new Set<IdentifierId>();
  const functions = new Map<IdentifierId, FunctionExpression>();
  const unusedUseMemos = new Map<IdentifierId, SourceLocation>();
  for (const [, block] of fn.body.blocks) {
    for (const {lvalue, value} of block.instructions) {
      if (unusedUseMemos.size !== 0) {
        /**
         * Most of the time useMemo results are referenced immediately. Don't bother
         * scanning instruction operands for useMemos unless there is an as-yet-unused
         * useMemo.
         */
        for (const operand of eachInstructionValueOperand(value)) {
          unusedUseMemos.delete(operand.identifier.id);
        }
      }
      switch (value.kind) {
        case 'LoadGlobal': {
          if (value.binding.name === 'useMemo') {
            useMemos.add(lvalue.identifier.id);
          } else if (value.binding.name === 'React') {
            react.add(lvalue.identifier.id);
          }
          break;
        }
        case 'PropertyLoad': {
          if (react.has(value.object.identifier.id)) {
            if (value.property === 'useMemo') {
              useMemos.add(lvalue.identifier.id);
            }
          }
          break;
        }
        case 'FunctionExpression': {
          functions.set(lvalue.identifier.id, value);
          break;
        }
        case 'MethodCall':
        case 'CallExpression': {
          // Is the function being called useMemo, with at least 1 argument?
          const callee =
            value.kind === 'CallExpression' ? value.callee : value.property;
          const isUseMemo = useMemos.has(callee.identifier.id);
          if (!isUseMemo || value.args.length === 0) {
            continue;
          }

          /*
           * If yes get the first argument and if it refers to a locally defined function
           * expression, validate the function
           */
          const [arg] = value.args;
          if (arg.kind !== 'Identifier') {
            continue;
          }
          const body = functions.get(arg.identifier.id);
          if (body === undefined) {
            continue;
          }

          if (body.loweredFunc.func.params.length > 0) {
            const firstParam = body.loweredFunc.func.params[0];
            const loc =
              firstParam.kind === 'Identifier'
                ? firstParam.loc
                : firstParam.place.loc;
            fn.env.recordError(
              CompilerDiagnostic.create({
                category: ErrorCategory.UseMemo,
                reason: 'useMemo() callbacks may not accept parameters',
                description:
                  'useMemo() callbacks are called by React to cache calculations across re-renders. They should not take parameters. Instead, directly reference the props, state, or local variables needed for the computation',
                suggestions: null,
              }).withDetails({
                kind: 'error',
                loc,
                message: 'Callbacks with parameters are not supported',
              }),
            );
          }

          if (body.loweredFunc.func.async || body.loweredFunc.func.generator) {
            fn.env.recordError(
              CompilerDiagnostic.create({
                category: ErrorCategory.UseMemo,
                reason:
                  'useMemo() callbacks may not be async or generator functions',
                description:
                  'useMemo() callbacks are called once and must synchronously return a value',
                suggestions: null,
              }).withDetails({
                kind: 'error',
                loc: body.loc,
                message: 'Async and generator functions are not supported',
              }),
            );
          }

          validateNoContextVariableAssignment(body.loweredFunc.func, fn.env);

          if (fn.env.config.validateNoVoidUseMemo) {
            if (!hasNonVoidReturn(body.loweredFunc.func)) {
              voidMemoErrors.pushDiagnostic(
                CompilerDiagnostic.create({
                  category: ErrorCategory.VoidUseMemo,
                  reason: 'useMemo() callbacks must return a value',
                  description: `This useMemo() callback doesn't return a value. useMemo() is for computing and caching values, not for arbitrary side effects`,
                  suggestions: null,
                }).withDetails({
                  kind: 'error',
                  loc: body.loc,
                  message: 'useMemo() callbacks must return a value',
                }),
              );
            } else {
              unusedUseMemos.set(lvalue.identifier.id, callee.loc);
            }
          }
          break;
        }
      }
    }
    if (unusedUseMemos.size !== 0) {
      for (const operand of eachTerminalOperand(block.terminal)) {
        unusedUseMemos.delete(operand.identifier.id);
      }
    }
  }
  if (unusedUseMemos.size !== 0) {
    /**
     * Basic check for unused memos, where the result of the call is never referenced. This runs
     * before DCE so it's more of an AST-level check that something, _anything_, cares about the value.
     *
     * This is easy to defeat with e.g. `const _ = useMemo(...)` but it at least gives us something to teach.
     * Even a DCE-based version could be bypassed with `noop(useMemo(...))`.
     */
    for (const loc of unusedUseMemos.values()) {
      voidMemoErrors.pushDiagnostic(
        CompilerDiagnostic.create({
          category: ErrorCategory.VoidUseMemo,
          reason: 'useMemo() result is unused',
          description: `This useMemo() value is unused. useMemo() is for computing and caching values, not for arbitrary side effects`,
          suggestions: null,
        }).withDetails({
          kind: 'error',
          loc,
          message: 'useMemo() result is unused',
        }),
      );
    }
  }
  fn.env.logErrors(voidMemoErrors.asResult());
}

function validateNoContextVariableAssignment(
  fn: HIRFunction,
  env: Environment,
): void {
  const context = new Set(fn.context.map(place => place.identifier.id));
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const value = instr.value;
      switch (value.kind) {
        case 'StoreContext': {
          if (context.has(value.lvalue.place.identifier.id)) {
            env.recordError(
              CompilerDiagnostic.create({
                category: ErrorCategory.UseMemo,
                reason:
                  'useMemo() callbacks may not reassign variables declared outside of the callback',
                description:
                  'useMemo() callbacks must be pure functions and cannot reassign variables defined outside of the callback function',
                suggestions: null,
              }).withDetails({
                kind: 'error',
                loc: value.lvalue.place.loc,
                message: 'Cannot reassign variable',
              }),
            );
          }
          break;
        }
      }
    }
  }
}

function hasNonVoidReturn(func: HIRFunction): boolean {
  for (const [, block] of func.body.blocks) {
    if (block.terminal.kind === 'return') {
      if (
        block.terminal.returnVariant === 'Explicit' ||
        block.terminal.returnVariant === 'Implicit'
      ) {
        return true;
      }
    }
  }
  return false;
}
