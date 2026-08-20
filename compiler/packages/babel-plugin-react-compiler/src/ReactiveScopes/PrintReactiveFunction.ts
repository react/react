/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {
  GeneratedSource,
  PrunedReactiveScopeBlock,
  ReactiveFunction,
  ReactiveScope,
  ReactiveScopeBlock,
  ReactiveScopeDependency,
  ReactiveStatement,
  ReactiveTerminal,
  ReactiveValue,
} from '../HIR/HIR';
import {
  printFunction,
  printIdentifier,
  printInstructionValue,
  printPlace,
  printSourceLocation,
  printType,
} from '../HIR/PrintHIR';
import {assertExhaustive} from '../Utils/utils';

export function printReactiveFunctionWithOutlined(
  fn: ReactiveFunction,
): string {
  const writer = new Writer();
  writeReactiveFunction(fn, writer);
  for (const outlined of fn.env.getOutlinedFunctions()) {
    writer.writeLine('\nfunction ' + printFunction(outlined.fn));
  }
  return writer.complete();
}

export function printReactiveFunction(fn: ReactiveFunction): string {
  const writer = new Writer();
  writeReactiveFunction(fn, writer);
  return writer.complete();
}

function writeReactiveFunction(fn: ReactiveFunction, writer: Writer): void {
  writer.writeLine(`function ${fn.id !== null ? fn.id : '<unknown>'}(`);
  writer.indented(() => {
    for (const param of fn.params) {
      if (param.kind === 'Identifier') {
        writer.writeLine(`${printPlace(param)},`);
      } else {
        writer.writeLine(`...${printPlace(param.place)},`);
      }
    }
  });
  writer.writeLine(') {');
  writeReactiveInstructions(writer, fn.body);
  writer.writeLine('}');
}

export function printReactiveScopeSummary(scope: ReactiveScope): string {
  const items = [];
  // If the scope has a return value it needs a label
  items.push('scope');
  items.push(`@${scope.id}`);
  items.push(`[${scope.range.start}:${scope.range.end}]`);
  items.push(
    `dependencies=[${Array.from(scope.dependencies)
      .map(dep => printDependency(dep))
      .join(', ')}]`,
  );
  items.push(
    `declarations=[${Array.from(scope.declarations)
      .map(([, decl]) =>
        printIdentifier({...decl.identifier, scope: decl.scope}),
      )
      .join(', ')}]`,
  );
  items.push(
    `reassignments=[${Array.from(scope.reassignments).map(reassign =>
      printIdentifier(reassign),
    )}]`,
  );
  if (scope.earlyReturnValue !== null) {
    items.push(
      `earlyReturn={id: ${printIdentifier(
        scope.earlyReturnValue.value,
      )}, label: ${scope.earlyReturnValue.label}}}`,
    );
  }
  return items.join(' ');
}

export function writeReactiveBlock(
  writer: Writer,
  block: ReactiveScopeBlock,
): void {
  writer.writeLine(`${printReactiveScopeSummary(block.scope)} {`);
  writeReactiveInstructions(writer, block.instructions);
  writer.writeLine('}');
}

export function writePrunedScope(
  writer: Writer,
  block: PrunedReactiveScopeBlock,
): void {
  writer.writeLine(`<pruned> ${printReactiveScopeSummary(block.scope)} {`);
  writeReactiveInstructions(writer, block.instructions);
  writer.writeLine('}');
}

export function printDependency(dependency: ReactiveScopeDependency): string {
  const identifier =
    printIdentifier(dependency.identifier) +
    printType(dependency.identifier.type);
  return `${identifier}${dependency.path.map(token => `${token.optional ? '?.' : '.'}${token.property}`).join('')}_${printSourceLocation(dependency.loc)}`;
}

export function printReactiveInstructions(
  instructions: Array<ReactiveStatement>,
): string {
  const writer = new Writer();
  writeReactiveInstructions(writer, instructions);
  return writer.complete();
}

export function writeReactiveInstructions(
  writer: Writer,
  instructions: Array<ReactiveStatement>,
): void {
  writer.indented(() => {
    for (const instr of instructions) {
      writeReactiveInstruction(writer, instr);
    }
  });
}

function writeReactiveInstruction(
  writer: Writer,
  instr: ReactiveStatement,
): void {
  switch (instr.kind) {
    case 'instruction': {
      const {instruction} = instr;
      const id = `[${instruction.id}]`;

      if (instruction.lvalue !== null) {
        writer.write(`${id} ${printPlace(instruction.lvalue)} = `);
        writeReactiveValue(writer, instruction.value);
        writer.newline();
      } else {
        writer.write(`${id} `);
        writeReactiveValue(writer, instruction.value);
        writer.newline();
      }
      break;
    }
    case 'scope': {
      writeReactiveBlock(writer, instr);
      break;
    }
    case 'pruned-scope': {
      writePrunedScope(writer, instr);
      break;
    }
    case 'terminal': {
      if (instr.label !== null) {
        writer.write(`bb${instr.label.id}: `);
      }
      writeTerminal(writer, instr.terminal);
      break;
    }
    default: {
      assertExhaustive(
        instr,
        `Unexpected terminal kind \`${(instr as any).kind}\``,
      );
    }
  }
}

export function printReactiveValue(value: ReactiveValue): string {
  const writer = new Writer();
  writeReactiveValue(writer, value);
  return writer.complete();
}

function writeReactiveValue(writer: Writer, value: ReactiveValue): void {
  switch (value.kind) {
    case 'ConditionalExpression': {
      writer.writeLine(`Ternary `);
      writer.indented(() => {
        writeReactiveValue(writer, value.test);
        writer.writeLine(`? `);
        writer.indented(() => {
          writeReactiveValue(writer, value.consequent);
        });
        writer.writeLine(`: `);
        writer.indented(() => {
          writeReactiveValue(writer, value.alternate);
        });
      });
      writer.newline();
      break;
    }
    case 'LogicalExpression': {
      writer.writeLine(`Logical`);
      writer.indented(() => {
        writeReactiveValue(writer, value.left);
        writer.write(`${value.operator} `);
        writeReactiveValue(writer, value.right);
      });
      writer.newline();
      break;
    }
    case 'SequenceExpression': {
      writer.writeLine(`Sequence`);
      writer.indented(() => {
        writer.indented(() => {
          value.instructions.forEach(instr =>
            writeReactiveInstruction(writer, {
              kind: 'instruction',
              instruction: instr,
            }),
          );
          writer.write(`[${value.id}] `);
          writeReactiveValue(writer, value.value);
        });
      });
      writer.newline();
      break;
    }
    case 'OptionalExpression': {
      writer.append(`OptionalExpression optional=${value.optional}`);
      writer.newline();
      writer.indented(() => {
        writeReactiveValue(writer, value.value);
      });
      writer.newline();
      break;
    }
    default: {
      const printed = printInstructionValue(value);
      const lines = printed.split('\n');
      if (lines.length === 1) {
        writer.writeLine(printed);
      } else {
        writer.indented(() => {
          for (const line of lines) {
            writer.writeLine(line);
          }
        });
      }
    }
  }
}

export function printReactiveTerminal(terminal: ReactiveTerminal): string {
  const writer = new Writer();
  writeTerminal(writer, terminal);
  return writer.complete();
}

function writeTerminal(writer: Writer, terminal: ReactiveTerminal): void {
  switch (terminal.kind) {
    case 'break': {
      const id = terminal.id !== null ? `[${terminal.id}]` : [];
      writer.writeLine(
        `${id} break bb${terminal.target} (${terminal.targetKind})`,
      );

      break;
    }
    case 'continue': {
      const id = `[${terminal.id}]`;
      writer.writeLine(
        `${id} continue bb${terminal.target} (${terminal.targetKind})`,
      );
      break;
    }
    case 'do-while': {
      writer.writeLine(`[${terminal.id}] do-while {`);
      writeReactiveInstructions(writer, terminal.loop);
      writer.writeLine('} (');
      writer.indented(() => {
        writeReactiveValue(writer, terminal.test);
      });
      writer.writeLine(')');
      break;
    }
    case 'while': {
      writer.writeLine(`[${terminal.id}] while (`);
      writer.indented(() => {
        writeReactiveValue(writer, terminal.test);
      });
      writer.writeLine(') {');
      writeReactiveInstructions(writer, terminal.loop);
      writer.writeLine('}');
      break;
    }
    case 'if': {
      const {test, consequent, alternate} = terminal;
      writer.writeLine(`[${terminal.id}] if (${printPlace(test)}) {`);
      writeReactiveInstructions(writer, consequent);
      if (alternate !== null) {
        writer.writeLine('} else {');
        writeReactiveInstructions(writer, alternate);
      }
      writer.writeLine('}');
      break;
    }
    case 'switch': {
      writer.writeLine(
        `[${terminal.id}] switch (${printPlace(terminal.test)}) {`,
      );
      writer.indented(() => {
        for (const case_ of terminal.cases) {
          let prefix =
            case_.test !== null ? `case ${printPlace(case_.test)}` : 'default';
          writer.writeLine(`${prefix}: {`);
          writer.indented(() => {
            const block = case_.block;
            CompilerError.invariant(block != null, {
              reason: 'Expected case to have a block',
              loc: case_.test?.loc ?? GeneratedSource,
            });
            writeReactiveInstructions(writer, block);
          });
          writer.writeLine('}');
        }
      });
      writer.writeLine('}');
      break;
    }
    case 'for': {
      writer.writeLine(`[${terminal.id}] for (`);
      writer.indented(() => {
        writeReactiveValue(writer, terminal.init);
        writer.writeLine(';');
        writeReactiveValue(writer, terminal.test);
        writer.writeLine(';');
        if (terminal.update !== null) {
          writeReactiveValue(writer, terminal.update);
        }
      });
      writer.writeLine(') {');
      writeReactiveInstructions(writer, terminal.loop);
      writer.writeLine('}');
      break;
    }
    case 'for-of': {
      writer.writeLine(`[${terminal.id}] for-of (`);
      writer.indented(() => {
        writeReactiveValue(writer, terminal.init);
        writer.writeLine(';');
        writeReactiveValue(writer, terminal.test);
      });
      writer.writeLine(') {');
      writeReactiveInstructions(writer, terminal.loop);
      writer.writeLine('}');
      break;
    }
    case 'for-in': {
      writer.writeLine(`[${terminal.id}] for-in (`);
      writer.indented(() => {
        writeReactiveValue(writer, terminal.init);
      });
      writer.writeLine(') {');
      writeReactiveInstructions(writer, terminal.loop);
      writer.writeLine('}');
      break;
    }
    case 'throw': {
      writer.writeLine(`[${terminal.id}] throw ${printPlace(terminal.value)}`);
      break;
    }
    case 'return': {
      writer.writeLine(`[${terminal.id}] return ${printPlace(terminal.value)}`);
      break;
    }
    case 'label': {
      writer.writeLine('{');
      writeReactiveInstructions(writer, terminal.block);
      writer.writeLine('}');
      break;
    }
    case 'try': {
      writer.writeLine(`[${terminal.id}] try {`);
      writeReactiveInstructions(writer, terminal.block);
      writer.write(`} catch `);
      if (terminal.handlerBinding !== null) {
        writer.writeLine(`(${printPlace(terminal.handlerBinding)}) {`);
      } else {
        writer.writeLine(`{`);
      }
      writeReactiveInstructions(writer, terminal.handler);
      writer.writeLine('}');
      break;
    }
    default:
      assertExhaustive(
        terminal,
        `Unhandled terminal kind \`${(terminal as any).kind}\``,
      );
  }
}

export class Writer {
  #out: Array<string> = [];
  #line: string;
  #depth: number;

  constructor({depth}: {depth: number} = {depth: 0}) {
    this.#depth = Math.max(depth, 0);
    this.#line = '';
  }

  complete(): string {
    const line = this.#line.trimEnd();
    if (line.length > 0) {
      this.#out.push(line);
    }
    return this.#out.join('\n');
  }

  append(s: string): void {
    this.write(s);
  }

  newline(): void {
    const line = this.#line.trimEnd();
    if (line.length > 0) {
      this.#out.push(line);
    }
    this.#line = '';
  }

  write(s: string): void {
    if (this.#line.length === 0 && this.#depth > 0) {
      // indent before writing
      this.#line = '  '.repeat(this.#depth);
    }
    this.#line += s;
  }

  writeLine(s: string): void {
    this.write(s);
    this.newline();
  }

  indented(f: () => void): void {
    this.#depth++;
    f();
    this.#depth--;
  }
}
