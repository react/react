/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  HIRFunction,
  InstructionId,
  Place,
  PrunedReactiveScopeBlock,
  ReactiveBlock,
  ReactiveFunction,
  ReactiveInstruction,
  ReactiveScopeBlock,
  ReactiveStatement,
  ReactiveTerminal,
  ReactiveTerminalStatement,
  ReactiveValue,
} from '../HIR/HIR';
import {
  eachInstructionLValue,
  eachInstructionValueOperand,
  eachTerminalOperand,
} from '../HIR/visitors';
import {assertExhaustive} from '../Utils/utils';

export function visitReactiveFunction<TState>(
  fn: ReactiveFunction,
  visitor: ReactiveFunctionVisitor<TState>,
  state: TState,
): void {
  visitor.visitBlock(fn.body, state);
}

export class ReactiveFunctionVisitor<TState = void> {
  visitID(_id: InstructionId, _state: TState): void {}
  visitParam(_place: Place, _state: TState): void {}
  visitLValue(_id: InstructionId, _lvalue: Place, _state: TState): void {}
  visitPlace(_id: InstructionId, _place: Place, _state: TState): void {}
  visitReactiveFunctionValue(
    _id: InstructionId,
    _dependencies: Array<Place>,
    _fn: ReactiveFunction,
    _state: TState,
  ): void {}

  visitValue(id: InstructionId, value: ReactiveValue, state: TState): void {
    this.traverseValue(id, value, state);
  }
  traverseValue(id: InstructionId, value: ReactiveValue, state: TState): void {
    switch (value.kind) {
      case 'OptionalExpression': {
        this.visitValue(id, value.value, state);
        break;
      }
      case 'LogicalExpression': {
        this.visitValue(id, value.left, state);
        this.visitValue(id, value.right, state);
        break;
      }
      case 'ConditionalExpression': {
        this.visitValue(id, value.test, state);
        this.visitValue(id, value.consequent, state);
        this.visitValue(id, value.alternate, state);
        break;
      }
      case 'SequenceExpression': {
        for (const instr of value.instructions) {
          this.visitInstruction(instr, state);
        }
        this.visitValue(value.id, value.value, state);
        break;
      }
      default: {
        for (const place of eachInstructionValueOperand(value)) {
          this.visitPlace(id, place, state);
        }
      }
    }
  }

  visitInstruction(instruction: ReactiveInstruction, state: TState): void {
    this.traverseInstruction(instruction, state);
  }
  traverseInstruction(instruction: ReactiveInstruction, state: TState): void {
    this.visitID(instruction.id, state);
    for (const operand of eachInstructionLValue(instruction)) {
      this.visitLValue(instruction.id, operand, state);
    }
    this.visitValue(instruction.id, instruction.value, state);
  }

  visitTerminal(stmt: ReactiveTerminalStatement, state: TState): void {
    this.traverseTerminal(stmt, state);
  }
  traverseTerminal(stmt: ReactiveTerminalStatement, state: TState): void {
    const {terminal} = stmt;
    if (terminal.id !== null) {
      this.visitID(terminal.id, state);
    }
    switch (terminal.kind) {
      case 'break':
      case 'continue': {
        break;
      }
      case 'return': {
        this.visitPlace(terminal.id, terminal.value, state);
        break;
      }
      case 'throw': {
        this.visitPlace(terminal.id, terminal.value, state);
        break;
      }
      case 'for': {
        this.visitValue(terminal.id, terminal.init, state);
        this.visitValue(terminal.id, terminal.test, state);
        this.visitBlock(terminal.loop, state);
        if (terminal.update !== null) {
          this.visitValue(terminal.id, terminal.update, state);
        }
        break;
      }
      case 'for-of': {
        this.visitValue(terminal.id, terminal.init, state);
        this.visitValue(terminal.id, terminal.test, state);
        this.visitBlock(terminal.loop, state);
        break;
      }
      case 'for-in': {
        this.visitValue(terminal.id, terminal.init, state);
        this.visitBlock(terminal.loop, state);
        break;
      }
      case 'do-while': {
        this.visitBlock(terminal.loop, state);
        this.visitValue(terminal.id, terminal.test, state);
        break;
      }
      case 'while': {
        this.visitValue(terminal.id, terminal.test, state);
        this.visitBlock(terminal.loop, state);
        break;
      }
      case 'if': {
        this.visitPlace(terminal.id, terminal.test, state);
        this.visitBlock(terminal.consequent, state);
        if (terminal.alternate !== null) {
          this.visitBlock(terminal.alternate, state);
        }
        break;
      }
      case 'switch': {
        this.visitPlace(terminal.id, terminal.test, state);
        for (const case_ of terminal.cases) {
          if (case_.test !== null) {
            this.visitPlace(terminal.id, case_.test, state);
          }
          if (case_.block !== undefined) {
            this.visitBlock(case_.block, state);
          }
        }
        break;
      }
      case 'label': {
        this.visitBlock(terminal.block, state);
        break;
      }
      case 'try': {
        this.visitBlock(terminal.block, state);
        this.visitBlock(terminal.handler, state);
        break;
      }
      default: {
        assertExhaustive(
          terminal,
          `Unexpected terminal kind \`${(terminal as any).kind}\``,
        );
      }
    }
  }

  visitScope(scope: ReactiveScopeBlock, state: TState): void {
    this.traverseScope(scope, state);
  }
  traverseScope(scope: ReactiveScopeBlock, state: TState): void {
    this.visitBlock(scope.instructions, state);
  }

  visitPrunedScope(scopeBlock: PrunedReactiveScopeBlock, state: TState): void {
    this.traversePrunedScope(scopeBlock, state);
  }
  traversePrunedScope(
    scopeBlock: PrunedReactiveScopeBlock,
    state: TState,
  ): void {
    this.visitBlock(scopeBlock.instructions, state);
  }

  visitBlock(block: ReactiveBlock, state: TState): void {
    this.traverseBlock(block, state);
  }
  traverseBlock(block: ReactiveBlock, state: TState): void {
    for (const instr of block) {
      switch (instr.kind) {
        case 'instruction': {
          this.visitInstruction(instr.instruction, state);
          break;
        }
        case 'scope': {
          this.visitScope(instr, state);
          break;
        }
        case 'pruned-scope': {
          this.visitPrunedScope(instr, state);
          break;
        }
        case 'terminal': {
          this.visitTerminal(instr, state);
          break;
        }
        default: {
          assertExhaustive(
            instr,
            `Unexpected instruction kind \`${(instr as any).kind}\``,
          );
        }
      }
    }
  }

  visitHirFunction(fn: HIRFunction, state: TState): void {
    for (const param of fn.params) {
      const place = param.kind === 'Identifier' ? param : param.place;
      this.visitParam(place, state);
    }
    for (const [, block] of fn.body.blocks) {
      for (const instr of block.instructions) {
        this.visitInstruction(instr, state);
        if (
          instr.value.kind === 'FunctionExpression' ||
          instr.value.kind === 'ObjectMethod'
        ) {
          this.visitHirFunction(instr.value.loweredFunc.func, state);
        }
      }
      for (const operand of eachTerminalOperand(block.terminal)) {
        this.visitPlace(block.terminal.id, operand, state);
      }
    }
  }
}

export type TransformedValue =
  | {kind: 'keep'}
  | {kind: 'replace'; value: ReactiveValue};

export type Transformed<T> =
  | {kind: 'remove'}
  | {kind: 'keep'}
  | {kind: 'replace'; value: T}
  | {kind: 'replace-many'; value: Array<T>};

export class ReactiveFunctionTransform<
  TState = void,
> extends ReactiveFunctionVisitor<TState> {
  override traverseBlock(block: ReactiveBlock, state: TState): void {
    let nextBlock: ReactiveBlock | null = null;
    for (let i = 0; i < block.length; i++) {
      const instr = block[i]!;
      let transformed: Transformed<ReactiveStatement>;
      switch (instr.kind) {
        case 'instruction': {
          transformed = this.transformInstruction(instr.instruction, state);
          break;
        }
        case 'scope': {
          transformed = this.transformScope(instr, state);
          break;
        }
        case 'pruned-scope': {
          transformed = this.transformPrunedScope(instr, state);
          break;
        }
        case 'terminal': {
          transformed = this.transformTerminal(instr, state);
          break;
        }
        default: {
          assertExhaustive(
            instr,
            `Unexpected instruction kind \`${(instr as any).kind}\``,
          );
        }
      }
      switch (transformed.kind) {
        case 'keep': {
          if (nextBlock !== null) {
            nextBlock.push(instr);
          }
          break;
        }
        case 'remove': {
          if (nextBlock === null) {
            nextBlock = block.slice(0, i);
          }
          break;
        }
        case 'replace': {
          nextBlock ??= block.slice(0, i);
          nextBlock.push(transformed.value);
          break;
        }
        case 'replace-many': {
          nextBlock ??= block.slice(0, i);
          nextBlock.push(...transformed.value);
          break;
        }
      }
    }
    if (nextBlock !== null) {
      block.length = 0;
      block.push(...nextBlock);
    }
  }

  transformInstruction(
    instruction: ReactiveInstruction,
    state: TState,
  ): Transformed<ReactiveStatement> {
    this.visitInstruction(instruction, state);
    return {kind: 'keep'};
  }

  transformTerminal(
    stmt: ReactiveTerminalStatement,
    state: TState,
  ): Transformed<ReactiveStatement> {
    this.visitTerminal(stmt, state);
    return {kind: 'keep'};
  }

  transformScope(
    scope: ReactiveScopeBlock,
    state: TState,
  ): Transformed<ReactiveStatement> {
    this.visitScope(scope, state);
    return {kind: 'keep'};
  }

  transformPrunedScope(
    scope: PrunedReactiveScopeBlock,
    state: TState,
  ): Transformed<ReactiveStatement> {
    this.visitPrunedScope(scope, state);
    return {kind: 'keep'};
  }

  transformValue(
    id: InstructionId,
    value: ReactiveValue,
    state: TState,
  ): TransformedValue {
    this.visitValue(id, value, state);
    return {kind: 'keep'};
  }

  transformReactiveFunctionValue(
    id: InstructionId,
    dependencies: Array<Place>,
    fn: ReactiveFunction,
    state: TState,
  ): {kind: 'keep'} | {kind: 'replace'; value: ReactiveFunction} {
    this.visitReactiveFunctionValue(id, dependencies, fn, state);
    return {kind: 'keep'};
  }

  override traverseValue(
    id: InstructionId,
    value: ReactiveValue,
    state: TState,
  ): void {
    switch (value.kind) {
      case 'OptionalExpression': {
        const nextValue = this.transformValue(id, value.value, state);
        if (nextValue.kind === 'replace') {
          value.value = nextValue.value;
        }
        break;
      }
      case 'LogicalExpression': {
        const left = this.transformValue(id, value.left, state);
        if (left.kind === 'replace') {
          value.left = left.value;
        }
        const right = this.transformValue(id, value.right, state);
        if (right.kind === 'replace') {
          value.right = right.value;
        }
        break;
      }
      case 'ConditionalExpression': {
        const test = this.transformValue(id, value.test, state);
        if (test.kind === 'replace') {
          value.test = test.value;
        }
        const consequent = this.transformValue(id, value.consequent, state);
        if (consequent.kind === 'replace') {
          value.consequent = consequent.value;
        }
        const alternate = this.transformValue(id, value.alternate, state);
        if (alternate.kind === 'replace') {
          value.alternate = alternate.value;
        }
        break;
      }
      case 'SequenceExpression': {
        for (const instr of value.instructions) {
          this.visitInstruction(instr, state);
        }
        const nextValue = this.transformValue(value.id, value.value, state);
        if (nextValue.kind === 'replace') {
          value.value = nextValue.value;
        }
        break;
      }
      default: {
        for (const place of eachInstructionValueOperand(value)) {
          this.visitPlace(id, place, state);
        }
      }
    }
  }

  override traverseInstruction(
    instruction: ReactiveInstruction,
    state: TState,
  ): void {
    this.visitID(instruction.id, state);
    for (const operand of eachInstructionLValue(instruction)) {
      this.visitLValue(instruction.id, operand, state);
    }
    const nextValue = this.transformValue(
      instruction.id,
      instruction.value,
      state,
    );
    if (nextValue.kind === 'replace') {
      instruction.value = nextValue.value;
    }
  }

  override traverseTerminal(
    stmt: ReactiveTerminalStatement,
    state: TState,
  ): void {
    const {terminal} = stmt;
    if (terminal.id !== null) {
      this.visitID(terminal.id, state);
    }
    switch (terminal.kind) {
      case 'break':
      case 'continue': {
        break;
      }
      case 'return': {
        this.visitPlace(terminal.id, terminal.value, state);
        break;
      }
      case 'throw': {
        this.visitPlace(terminal.id, terminal.value, state);
        break;
      }
      case 'for': {
        const init = this.transformValue(terminal.id, terminal.init, state);
        if (init.kind === 'replace') {
          terminal.init = init.value;
        }
        const test = this.transformValue(terminal.id, terminal.test, state);
        if (test.kind === 'replace') {
          terminal.test = test.value;
        }
        if (terminal.update !== null) {
          const update = this.transformValue(
            terminal.id,
            terminal.update,
            state,
          );
          if (update.kind === 'replace') {
            terminal.update = update.value;
          }
        }
        this.visitBlock(terminal.loop, state);
        break;
      }
      case 'for-of': {
        const init = this.transformValue(terminal.id, terminal.init, state);
        if (init.kind === 'replace') {
          terminal.init = init.value;
        }
        const test = this.transformValue(terminal.id, terminal.test, state);
        if (test.kind === 'replace') {
          terminal.test = test.value;
        }
        this.visitBlock(terminal.loop, state);
        break;
      }
      case 'for-in': {
        const init = this.transformValue(terminal.id, terminal.init, state);
        if (init.kind === 'replace') {
          terminal.init = init.value;
        }
        this.visitBlock(terminal.loop, state);
        break;
      }
      case 'do-while': {
        this.visitBlock(terminal.loop, state);
        const test = this.transformValue(terminal.id, terminal.test, state);
        if (test.kind === 'replace') {
          terminal.test = test.value;
        }
        break;
      }
      case 'while': {
        const test = this.transformValue(terminal.id, terminal.test, state);
        if (test.kind === 'replace') {
          terminal.test = test.value;
        }
        this.visitBlock(terminal.loop, state);
        break;
      }
      case 'if': {
        this.visitPlace(terminal.id, terminal.test, state);
        this.visitBlock(terminal.consequent, state);
        if (terminal.alternate !== null) {
          this.visitBlock(terminal.alternate, state);
        }
        break;
      }
      case 'switch': {
        this.visitPlace(terminal.id, terminal.test, state);
        for (const case_ of terminal.cases) {
          if (case_.test !== null) {
            this.visitPlace(terminal.id, case_.test, state);
          }
          if (case_.block !== undefined) {
            this.visitBlock(case_.block, state);
          }
        }
        break;
      }
      case 'label': {
        this.visitBlock(terminal.block, state);
        break;
      }
      case 'try': {
        this.visitBlock(terminal.block, state);
        if (terminal.handlerBinding !== null) {
          this.visitPlace(terminal.id, terminal.handlerBinding, state);
        }
        this.visitBlock(terminal.handler, state);
        break;
      }
      default: {
        assertExhaustive(
          terminal,
          `Unexpected terminal kind \`${(terminal as any).kind}\``,
        );
      }
    }
  }
}

export function* eachReactiveValueOperand(
  instrValue: ReactiveValue,
): Iterable<Place> {
  switch (instrValue.kind) {
    case 'OptionalExpression': {
      yield* eachReactiveValueOperand(instrValue.value);
      break;
    }
    case 'LogicalExpression': {
      yield* eachReactiveValueOperand(instrValue.left);
      yield* eachReactiveValueOperand(instrValue.right);
      break;
    }
    case 'SequenceExpression': {
      for (const instr of instrValue.instructions) {
        yield* eachReactiveValueOperand(instr.value);
      }
      yield* eachReactiveValueOperand(instrValue.value);
      break;
    }
    case 'ConditionalExpression': {
      yield* eachReactiveValueOperand(instrValue.test);
      yield* eachReactiveValueOperand(instrValue.consequent);
      yield* eachReactiveValueOperand(instrValue.alternate);
      break;
    }
    default: {
      yield* eachInstructionValueOperand(instrValue);
    }
  }
}

export function mapTerminalBlocks(
  terminal: ReactiveTerminal,
  fn: (block: ReactiveBlock) => ReactiveBlock,
): void {
  switch (terminal.kind) {
    case 'break':
    case 'continue':
    case 'return':
    case 'throw': {
      break;
    }
    case 'for': {
      terminal.loop = fn(terminal.loop);
      break;
    }
    case 'for-of': {
      terminal.loop = fn(terminal.loop);
      break;
    }
    case 'for-in': {
      terminal.loop = fn(terminal.loop);
      break;
    }
    case 'do-while':
    case 'while': {
      terminal.loop = fn(terminal.loop);
      break;
    }
    case 'if': {
      terminal.consequent = fn(terminal.consequent);
      if (terminal.alternate !== null) {
        terminal.alternate = fn(terminal.alternate);
      }
      break;
    }
    case 'switch': {
      for (const case_ of terminal.cases) {
        if (case_.block !== undefined) {
          case_.block = fn(case_.block);
        }
      }
      break;
    }
    case 'label': {
      terminal.block = fn(terminal.block);
      break;
    }
    case 'try': {
      terminal.block = fn(terminal.block);
      terminal.handler = fn(terminal.handler);
      break;
    }
    default: {
      assertExhaustive(
        terminal,
        `Unexpected terminal kind \`${(terminal as any).kind}\``,
      );
    }
  }
}
