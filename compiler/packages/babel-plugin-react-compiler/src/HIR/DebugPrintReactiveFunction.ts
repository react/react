/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {assertExhaustive} from '../Utils/utils';
import type {
  ReactiveBlock,
  ReactiveFunction,
  ReactiveInstruction,
  ReactiveStatement,
  ReactiveTerminal,
  ReactiveValue,
  ReactiveScopeBlock,
  PrunedReactiveScopeBlock,
} from './HIR';
import {DebugPrinter} from './DebugPrintHIR';

export function printDebugReactiveFunction(fn: ReactiveFunction): string {
  const printer = new ReactiveDebugPrinter();
  printer.formatReactiveFunction(fn);

  const outlined = fn.env.getOutlinedFunctions();
  for (let i = 0; i < outlined.length; i++) {
    const outlinedFn = outlined[i].fn;
    /*
     * Only print outlined functions that have been converted to reactive form
     * (have an array body, not a HIR body with blocks)
     */
    if (Array.isArray(outlinedFn.body)) {
      printer.line('');
      printer.formatReactiveFunction(outlinedFn as unknown as ReactiveFunction);
    }
  }

  printer.line('');
  printer.line('Environment:');
  printer.indent();
  const errors = fn.env.aggregateErrors();
  printer.formatErrors(errors);
  printer.dedent();

  return printer.toString();
}

class ReactiveDebugPrinter extends DebugPrinter {
  formatReactiveFunction(fn: ReactiveFunction): void {
    this.indent();
    this.line(`id: ${fn.id !== null ? `"${fn.id}"` : 'null'}`);
    this.line(
      `name_hint: ${fn.nameHint !== null ? `"${fn.nameHint}"` : 'null'}`,
    );
    this.line(`generator: ${fn.generator}`);
    this.line(`is_async: ${fn.async}`);
    this.line(`loc: ${this.formatLoc(fn.loc)}`);

    this.line('params:');
    this.indent();
    fn.params.forEach((param, i) => {
      if (param.kind === 'Identifier') {
        this.formatPlaceField(`[${i}]`, param);
      } else {
        this.line(`[${i}] Spread:`);
        this.indent();
        this.formatPlaceField('place', param.place);
        this.dedent();
      }
    });
    this.dedent();

    this.line('directives:');
    this.indent();
    fn.directives.forEach((d, i) => {
      this.line(`[${i}] "${d}"`);
    });
    this.dedent();

    this.line('');
    this.line('Body:');
    this.indent();
    this.formatReactiveBlock(fn.body);
    this.dedent();
    this.dedent();
  }

  formatReactiveBlock(block: ReactiveBlock): void {
    for (const stmt of block) {
      this.formatReactiveStatement(stmt);
    }
  }

  formatReactiveStatement(stmt: ReactiveStatement): void {
    switch (stmt.kind) {
      case 'instruction': {
        this.formatReactiveInstruction(stmt.instruction);
        break;
      }
      case 'scope': {
        this.formatReactiveScopeBlock(stmt);
        break;
      }
      case 'pruned-scope': {
        this.formatPrunedReactiveScopeBlock(stmt);
        break;
      }
      case 'terminal': {
        this.line('ReactiveTerminalStatement {');
        this.indent();
        if (stmt.label !== null) {
          this.line(
            `label: { id: bb${stmt.label.id}, implicit: ${stmt.label.implicit} }`,
          );
        } else {
          this.line('label: null');
        }
        this.line('terminal:');
        this.indent();
        this.formatReactiveTerminal(stmt.terminal);
        this.dedent();
        this.dedent();
        this.line('}');
        break;
      }
      default: {
        assertExhaustive(
          stmt,
          `Unexpected reactive statement kind \`${(stmt as any).kind}\``,
        );
      }
    }
  }

  formatReactiveInstruction(instr: ReactiveInstruction): void {
    this.line('ReactiveInstruction {');
    this.indent();
    this.line(`id: ${instr.id}`);
    if (instr.lvalue !== null) {
      this.formatPlaceField('lvalue', instr.lvalue);
    } else {
      this.line('lvalue: null');
    }
    this.line('value:');
    this.indent();
    this.formatReactiveValue(instr.value);
    this.dedent();
    if (instr.effects != null) {
      this.line('effects:');
      this.indent();
      instr.effects.forEach((effect, i) => {
        this.line(`[${i}] ${this.formatAliasingEffect(effect)}`);
      });
      this.dedent();
    } else {
      this.line('effects: null');
    }
    this.line(`loc: ${this.formatLoc(instr.loc)}`);
    this.dedent();
    this.line('}');
  }

  formatReactiveScopeBlock(block: ReactiveScopeBlock): void {
    this.line('ReactiveScopeBlock {');
    this.indent();
    this.formatScopeField('scope', block.scope);
    this.line('instructions:');
    this.indent();
    this.formatReactiveBlock(block.instructions);
    this.dedent();
    this.dedent();
    this.line('}');
  }

  formatPrunedReactiveScopeBlock(block: PrunedReactiveScopeBlock): void {
    this.line('PrunedReactiveScopeBlock {');
    this.indent();
    this.formatScopeField('scope', block.scope);
    this.line('instructions:');
    this.indent();
    this.formatReactiveBlock(block.instructions);
    this.dedent();
    this.dedent();
    this.line('}');
  }

  formatReactiveValue(value: ReactiveValue): void {
    switch (value.kind) {
      case 'LogicalExpression': {
        this.line('LogicalExpression {');
        this.indent();
        this.line(`operator: "${value.operator}"`);
        this.line('left:');
        this.indent();
        this.formatReactiveValue(value.left);
        this.dedent();
        this.line('right:');
        this.indent();
        this.formatReactiveValue(value.right);
        this.dedent();
        this.line(`loc: ${this.formatLoc(value.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'ConditionalExpression': {
        this.line('ConditionalExpression {');
        this.indent();
        this.line('test:');
        this.indent();
        this.formatReactiveValue(value.test);
        this.dedent();
        this.line('consequent:');
        this.indent();
        this.formatReactiveValue(value.consequent);
        this.dedent();
        this.line('alternate:');
        this.indent();
        this.formatReactiveValue(value.alternate);
        this.dedent();
        this.line(`loc: ${this.formatLoc(value.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'SequenceExpression': {
        this.line('SequenceExpression {');
        this.indent();
        this.line('instructions:');
        this.indent();
        value.instructions.forEach((instr, i) => {
          this.line(`[${i}]:`);
          this.indent();
          this.formatReactiveInstruction(instr);
          this.dedent();
        });
        this.dedent();
        this.line(`id: ${value.id}`);
        this.line('value:');
        this.indent();
        this.formatReactiveValue(value.value);
        this.dedent();
        this.line(`loc: ${this.formatLoc(value.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'OptionalExpression': {
        this.line('OptionalExpression {');
        this.indent();
        this.line(`id: ${value.id}`);
        this.line('value:');
        this.indent();
        this.formatReactiveValue(value.value);
        this.dedent();
        this.line(`optional: ${value.optional}`);
        this.line(`loc: ${this.formatLoc(value.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      default: {
        // Base InstructionValue kinds - delegate to existing formatter
        this.formatInstructionValue(value);
        break;
      }
    }
  }

  formatReactiveTerminal(terminal: ReactiveTerminal): void {
    switch (terminal.kind) {
      case 'break': {
        this.line('Break {');
        this.indent();
        this.line(`target: bb${terminal.target}`);
        this.line(`id: ${terminal.id}`);
        this.line(`targetKind: "${terminal.targetKind}"`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'continue': {
        this.line('Continue {');
        this.indent();
        this.line(`target: bb${terminal.target}`);
        this.line(`id: ${terminal.id}`);
        this.line(`targetKind: "${terminal.targetKind}"`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'return': {
        this.line('Return {');
        this.indent();
        this.formatPlaceField('value', terminal.value);
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'throw': {
        this.line('Throw {');
        this.indent();
        this.formatPlaceField('value', terminal.value);
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'switch': {
        this.line('Switch {');
        this.indent();
        this.formatPlaceField('test', terminal.test);
        this.line('cases:');
        this.indent();
        terminal.cases.forEach((case_, i) => {
          this.line(`[${i}] {`);
          this.indent();
          if (case_.test !== null) {
            this.formatPlaceField('test', case_.test);
          } else {
            this.line('test: null');
          }
          if (case_.block !== undefined) {
            this.line('block:');
            this.indent();
            this.formatReactiveBlock(case_.block);
            this.dedent();
          } else {
            this.line('block: undefined');
          }
          this.dedent();
          this.line('}');
        });
        this.dedent();
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'do-while': {
        this.line('DoWhile {');
        this.indent();
        this.line('loop:');
        this.indent();
        this.formatReactiveBlock(terminal.loop);
        this.dedent();
        this.line('test:');
        this.indent();
        this.formatReactiveValue(terminal.test);
        this.dedent();
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'while': {
        this.line('While {');
        this.indent();
        this.line('test:');
        this.indent();
        this.formatReactiveValue(terminal.test);
        this.dedent();
        this.line('loop:');
        this.indent();
        this.formatReactiveBlock(terminal.loop);
        this.dedent();
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'for': {
        this.line('For {');
        this.indent();
        this.line('init:');
        this.indent();
        this.formatReactiveValue(terminal.init);
        this.dedent();
        this.line('test:');
        this.indent();
        this.formatReactiveValue(terminal.test);
        this.dedent();
        if (terminal.update !== null) {
          this.line('update:');
          this.indent();
          this.formatReactiveValue(terminal.update);
          this.dedent();
        } else {
          this.line('update: null');
        }
        this.line('loop:');
        this.indent();
        this.formatReactiveBlock(terminal.loop);
        this.dedent();
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'for-of': {
        this.line('ForOf {');
        this.indent();
        this.line('init:');
        this.indent();
        this.formatReactiveValue(terminal.init);
        this.dedent();
        this.line('test:');
        this.indent();
        this.formatReactiveValue(terminal.test);
        this.dedent();
        this.line('loop:');
        this.indent();
        this.formatReactiveBlock(terminal.loop);
        this.dedent();
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'for-in': {
        this.line('ForIn {');
        this.indent();
        this.line('init:');
        this.indent();
        this.formatReactiveValue(terminal.init);
        this.dedent();
        this.line('loop:');
        this.indent();
        this.formatReactiveBlock(terminal.loop);
        this.dedent();
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'if': {
        this.line('If {');
        this.indent();
        this.formatPlaceField('test', terminal.test);
        this.line('consequent:');
        this.indent();
        this.formatReactiveBlock(terminal.consequent);
        this.dedent();
        if (terminal.alternate !== null) {
          this.line('alternate:');
          this.indent();
          this.formatReactiveBlock(terminal.alternate);
          this.dedent();
        } else {
          this.line('alternate: null');
        }
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'label': {
        this.line('Label {');
        this.indent();
        this.line('block:');
        this.indent();
        this.formatReactiveBlock(terminal.block);
        this.dedent();
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'try': {
        this.line('Try {');
        this.indent();
        this.line('block:');
        this.indent();
        this.formatReactiveBlock(terminal.block);
        this.dedent();
        if (terminal.handlerBinding !== null) {
          this.formatPlaceField('handlerBinding', terminal.handlerBinding);
        } else {
          this.line('handlerBinding: null');
        }
        this.line('handler:');
        this.indent();
        this.formatReactiveBlock(terminal.handler);
        this.dedent();
        this.line(`id: ${terminal.id}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      default: {
        assertExhaustive(
          terminal,
          `Unexpected reactive terminal kind \`${(terminal as any).kind}\``,
        );
      }
    }
  }
}
