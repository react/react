/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {assertExhaustive} from '../Utils/utils';
import type {
  BasicBlock,
  HIRFunction,
  Identifier,
  Instruction,
  InstructionValue,
  LValue,
  NonLocalBinding,
  ObjectPropertyKey,
  Pattern,
  Phi,
  Place,
  ReactiveScope,
  SourceLocation,
  SpreadPattern,
  Terminal,
} from './HIR';
import type {Type} from './Types';
import type {AliasingEffect} from '../Inference/AliasingEffects';
import type {CompilerDiagnostic, CompilerErrorDetail} from '../CompilerError';
import type {IdentifierId, ScopeId} from './HIR';

export function printDebugHIR(fn: HIRFunction): string {
  const printer = new DebugPrinter();
  printer.formatFunction(fn);

  const outlined = fn.env.getOutlinedFunctions();
  for (let i = 0; i < outlined.length; i++) {
    printer.line('');
    printer.formatFunction(outlined[i].fn);
  }

  printer.line('');
  printer.line('Environment:');
  printer.indent();
  const errors = fn.env.aggregateErrors();
  printer.formatErrors(errors);
  printer.dedent();

  return printer.toString();
}

export class DebugPrinter {
  seenIdentifiers: Set<IdentifierId> = new Set();
  seenScopes: Set<ScopeId> = new Set();
  output: Array<string> = [];
  indentLevel: number = 0;

  line(text: string): void {
    this.output.push('  '.repeat(this.indentLevel) + text);
  }

  indent(): void {
    this.indentLevel++;
  }

  dedent(): void {
    this.indentLevel--;
  }

  toString(): string {
    return this.output.join('\n');
  }

  formatFunction(fn: HIRFunction): void {
    this.indent();
    this.line(`id: ${fn.id !== null ? `"${fn.id}"` : 'null'}`);
    this.line(
      `name_hint: ${fn.nameHint !== null ? `"${fn.nameHint}"` : 'null'}`,
    );
    this.line(`fn_type: ${fn.fnType}`);
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

    this.line('returns:');
    this.indent();
    this.formatPlaceField('value', fn.returns);
    this.dedent();

    this.line('context:');
    this.indent();
    fn.context.forEach((ctx, i) => {
      this.formatPlaceField(`[${i}]`, ctx);
    });
    this.dedent();

    if (fn.aliasingEffects !== null) {
      this.line('aliasingEffects:');
      this.indent();
      fn.aliasingEffects.forEach((effect, i) => {
        this.line(`[${i}] ${this.formatAliasingEffect(effect)}`);
      });
      this.dedent();
    } else {
      this.line('aliasingEffects: null');
    }

    this.line('directives:');
    this.indent();
    fn.directives.forEach((d, i) => {
      this.line(`[${i}] "${d}"`);
    });
    this.dedent();

    this.line(
      `returnTypeAnnotation: ${fn.returnTypeAnnotation !== null ? fn.returnTypeAnnotation.type : 'null'}`,
    );

    this.line('');
    this.line('Blocks:');
    this.indent();
    for (const [blockId, block] of fn.body.blocks) {
      this.formatBlock(blockId, block);
    }
    this.dedent();
    this.dedent();
  }

  formatBlock(blockId: number, block: BasicBlock): void {
    this.line(`bb${blockId} (${block.kind}):`);
    this.indent();

    const preds = [...block.preds];
    this.line(`preds: [${preds.map(p => `bb${p}`).join(', ')}]`);

    this.line('phis:');
    this.indent();
    for (const phi of block.phis) {
      this.formatPhi(phi);
    }
    this.dedent();

    this.line('instructions:');
    this.indent();
    block.instructions.forEach((instr, i) => {
      this.formatInstruction(instr, i);
    });
    this.dedent();

    this.line('terminal:');
    this.indent();
    this.formatTerminal(block.terminal);
    this.dedent();

    this.dedent();
  }

  formatPhi(phi: Phi): void {
    this.line('Phi {');
    this.indent();
    this.formatPlaceField('place', phi.place);
    this.line('operands:');
    this.indent();
    for (const [blockId, place] of phi.operands) {
      this.line(`bb${blockId}:`);
      this.indent();
      this.formatPlaceField('value', place);
      this.dedent();
    }
    this.dedent();
    this.dedent();
    this.line('}');
  }

  formatInstruction(instr: Instruction, index: number): void {
    this.line(`[${index}] Instruction {`);
    this.indent();
    this.line(`id: ${instr.id}`);
    this.formatPlaceField('lvalue', instr.lvalue);
    this.line('value:');
    this.indent();
    this.formatInstructionValue(instr.value);
    this.dedent();
    if (instr.effects !== null) {
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

  formatInstructionValue(instrValue: InstructionValue): void {
    switch (instrValue.kind) {
      case 'ArrayExpression': {
        this.line(`ArrayExpression {`);
        this.indent();
        this.line('elements:');
        this.indent();
        instrValue.elements.forEach((element, i) => {
          if (element.kind === 'Identifier') {
            this.formatPlaceField(`[${i}]`, element);
          } else if (element.kind === 'Hole') {
            this.line(`[${i}] Hole`);
          } else {
            this.line(`[${i}] Spread:`);
            this.indent();
            this.formatPlaceField('place', element.place);
            this.dedent();
          }
        });
        this.dedent();
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'ObjectExpression': {
        this.line('ObjectExpression {');
        this.indent();
        this.line('properties:');
        this.indent();
        instrValue.properties.forEach((prop, i) => {
          if (prop.kind === 'ObjectProperty') {
            this.line(`[${i}] ObjectProperty {`);
            this.indent();
            this.line(`key: ${this.formatObjectPropertyKey(prop.key)}`);
            this.line(`type: "${prop.type}"`);
            this.formatPlaceField('place', prop.place);
            this.dedent();
            this.line('}');
          } else {
            this.line(`[${i}] Spread:`);
            this.indent();
            this.formatPlaceField('place', prop.place);
            this.dedent();
          }
        });
        this.dedent();
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'UnaryExpression': {
        this.line(`UnaryExpression {`);
        this.indent();
        this.line(`operator: "${instrValue.operator}"`);
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'BinaryExpression': {
        this.line('BinaryExpression {');
        this.indent();
        this.line(`operator: "${instrValue.operator}"`);
        this.formatPlaceField('left', instrValue.left);
        this.formatPlaceField('right', instrValue.right);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'NewExpression': {
        this.line('NewExpression {');
        this.indent();
        this.formatPlaceField('callee', instrValue.callee);
        this.line('args:');
        this.indent();
        instrValue.args.forEach((arg, i) => {
          this.formatArgument(arg, i);
        });
        this.dedent();
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'CallExpression': {
        this.line('CallExpression {');
        this.indent();
        this.formatPlaceField('callee', instrValue.callee);
        this.line('args:');
        this.indent();
        instrValue.args.forEach((arg, i) => {
          this.formatArgument(arg, i);
        });
        this.dedent();
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'MethodCall': {
        this.line('MethodCall {');
        this.indent();
        this.formatPlaceField('receiver', instrValue.receiver);
        this.formatPlaceField('property', instrValue.property);
        this.line('args:');
        this.indent();
        instrValue.args.forEach((arg, i) => {
          this.formatArgument(arg, i);
        });
        this.dedent();
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'JSXText': {
        this.line(
          `JSXText { value: ${JSON.stringify(instrValue.value)}, loc: ${this.formatLoc(instrValue.loc)} }`,
        );
        break;
      }
      case 'Primitive': {
        /*
         * JSON.stringify maps non-finite numbers to "null", which both loses
         * information and diverges from the Rust debug printer (NaN/Infinity).
         */
        const val =
          instrValue.value === undefined
            ? 'undefined'
            : typeof instrValue.value === 'number' &&
                !Number.isFinite(instrValue.value)
              ? String(instrValue.value)
              : JSON.stringify(instrValue.value);
        this.line(
          `Primitive { value: ${val}, loc: ${this.formatLoc(instrValue.loc)} }`,
        );
        break;
      }
      case 'TypeCastExpression': {
        this.line('TypeCastExpression {');
        this.indent();
        this.formatPlaceField('value', instrValue.value);
        this.line(`type: ${this.formatType(instrValue.type)}`);
        this.line(`typeAnnotation: ${instrValue.typeAnnotation.type}`);
        this.line(`typeAnnotationKind: "${instrValue.typeAnnotationKind}"`);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'JsxExpression': {
        this.line('JsxExpression {');
        this.indent();
        if (instrValue.tag.kind === 'Identifier') {
          this.formatPlaceField('tag', instrValue.tag);
        } else {
          this.line(`tag: BuiltinTag("${instrValue.tag.name}")`);
        }
        this.line('props:');
        this.indent();
        instrValue.props.forEach((prop, i) => {
          if (prop.kind === 'JsxAttribute') {
            this.line(`[${i}] JsxAttribute {`);
            this.indent();
            this.line(`name: "${prop.name}"`);
            this.formatPlaceField('place', prop.place);
            this.dedent();
            this.line('}');
          } else {
            this.line(`[${i}] JsxSpreadAttribute:`);
            this.indent();
            this.formatPlaceField('argument', prop.argument);
            this.dedent();
          }
        });
        this.dedent();
        if (instrValue.children !== null) {
          this.line('children:');
          this.indent();
          instrValue.children.forEach((child, i) => {
            this.formatPlaceField(`[${i}]`, child);
          });
          this.dedent();
        } else {
          this.line('children: null');
        }
        this.line(`openingLoc: ${this.formatLoc(instrValue.openingLoc)}`);
        this.line(`closingLoc: ${this.formatLoc(instrValue.closingLoc)}`);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'JsxFragment': {
        this.line('JsxFragment {');
        this.indent();
        this.line('children:');
        this.indent();
        instrValue.children.forEach((child, i) => {
          this.formatPlaceField(`[${i}]`, child);
        });
        this.dedent();
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'UnsupportedNode': {
        this.line(
          `UnsupportedNode { type: "${instrValue.node.type}", loc: ${this.formatLoc(instrValue.loc)} }`,
        );
        break;
      }
      case 'LoadLocal': {
        this.line('LoadLocal {');
        this.indent();
        this.formatPlaceField('place', instrValue.place);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'DeclareLocal': {
        this.line('DeclareLocal {');
        this.indent();
        this.formatLValue('lvalue', instrValue.lvalue);
        this.line(
          `type: ${instrValue.type !== null ? instrValue.type.type : 'null'}`,
        );
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'DeclareContext': {
        this.line('DeclareContext {');
        this.indent();
        this.line('lvalue:');
        this.indent();
        this.line(`kind: ${instrValue.lvalue.kind}`);
        this.formatPlaceField('place', instrValue.lvalue.place);
        this.dedent();
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'StoreLocal': {
        this.line('StoreLocal {');
        this.indent();
        this.formatLValue('lvalue', instrValue.lvalue);
        this.formatPlaceField('value', instrValue.value);
        this.line(
          `type: ${instrValue.type !== null ? instrValue.type.type : 'null'}`,
        );
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'LoadContext': {
        this.line('LoadContext {');
        this.indent();
        this.formatPlaceField('place', instrValue.place);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'StoreContext': {
        this.line('StoreContext {');
        this.indent();
        this.line('lvalue:');
        this.indent();
        this.line(`kind: ${instrValue.lvalue.kind}`);
        this.formatPlaceField('place', instrValue.lvalue.place);
        this.dedent();
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'Destructure': {
        this.line('Destructure {');
        this.indent();
        this.line('lvalue:');
        this.indent();
        this.line(`kind: ${instrValue.lvalue.kind}`);
        this.formatPattern(instrValue.lvalue.pattern);
        this.dedent();
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'PropertyLoad': {
        this.line('PropertyLoad {');
        this.indent();
        this.formatPlaceField('object', instrValue.object);
        this.line(`property: "${instrValue.property}"`);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'PropertyStore': {
        this.line('PropertyStore {');
        this.indent();
        this.formatPlaceField('object', instrValue.object);
        this.line(`property: "${instrValue.property}"`);
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'PropertyDelete': {
        this.line('PropertyDelete {');
        this.indent();
        this.formatPlaceField('object', instrValue.object);
        this.line(`property: "${instrValue.property}"`);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'ComputedLoad': {
        this.line('ComputedLoad {');
        this.indent();
        this.formatPlaceField('object', instrValue.object);
        this.formatPlaceField('property', instrValue.property);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'ComputedStore': {
        this.line('ComputedStore {');
        this.indent();
        this.formatPlaceField('object', instrValue.object);
        this.formatPlaceField('property', instrValue.property);
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'ComputedDelete': {
        this.line('ComputedDelete {');
        this.indent();
        this.formatPlaceField('object', instrValue.object);
        this.formatPlaceField('property', instrValue.property);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'LoadGlobal': {
        this.line('LoadGlobal {');
        this.indent();
        this.line(`binding: ${this.formatNonLocalBinding(instrValue.binding)}`);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'StoreGlobal': {
        this.line('StoreGlobal {');
        this.indent();
        this.line(`name: "${instrValue.name}"`);
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'ObjectMethod':
      case 'FunctionExpression': {
        const kind = instrValue.kind;
        this.line(`${kind} {`);
        this.indent();
        if (instrValue.kind === 'FunctionExpression') {
          this.line(
            `name: ${instrValue.name !== null ? `"${instrValue.name}"` : 'null'}`,
          );
          this.line(
            `nameHint: ${instrValue.nameHint !== null ? `"${instrValue.nameHint}"` : 'null'}`,
          );
          this.line(`type: "${instrValue.type}"`);
        }
        this.line(`loweredFunc:`);
        this.formatFunction(instrValue.loweredFunc.func);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'TaggedTemplateExpression': {
        this.line('TaggedTemplateExpression {');
        this.indent();
        this.formatPlaceField('tag', instrValue.tag);
        this.line(`raw: ${JSON.stringify(instrValue.value.raw)}`);
        this.line(
          `cooked: ${instrValue.value.cooked !== undefined ? JSON.stringify(instrValue.value.cooked) : 'undefined'}`,
        );
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'TemplateLiteral': {
        this.line('TemplateLiteral {');
        this.indent();
        this.line('subexprs:');
        this.indent();
        instrValue.subexprs.forEach((sub, i) => {
          this.formatPlaceField(`[${i}]`, sub);
        });
        this.dedent();
        this.line('quasis:');
        this.indent();
        instrValue.quasis.forEach((q, i) => {
          this.line(
            `[${i}] { raw: ${JSON.stringify(q.raw)}, cooked: ${q.cooked !== undefined ? JSON.stringify(q.cooked) : 'undefined'} }`,
          );
        });
        this.dedent();
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'RegExpLiteral': {
        this.line(
          `RegExpLiteral { pattern: "${instrValue.pattern}", flags: "${instrValue.flags}", loc: ${this.formatLoc(instrValue.loc)} }`,
        );
        break;
      }
      case 'MetaProperty': {
        this.line(
          `MetaProperty { meta: "${instrValue.meta}", property: "${instrValue.property}", loc: ${this.formatLoc(instrValue.loc)} }`,
        );
        break;
      }
      case 'Await': {
        this.line('Await {');
        this.indent();
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'GetIterator': {
        this.line('GetIterator {');
        this.indent();
        this.formatPlaceField('collection', instrValue.collection);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'IteratorNext': {
        this.line('IteratorNext {');
        this.indent();
        this.formatPlaceField('iterator', instrValue.iterator);
        this.formatPlaceField('collection', instrValue.collection);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'NextPropertyOf': {
        this.line('NextPropertyOf {');
        this.indent();
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'Debugger': {
        this.line(`Debugger { loc: ${this.formatLoc(instrValue.loc)} }`);
        break;
      }
      case 'PostfixUpdate': {
        this.line('PostfixUpdate {');
        this.indent();
        this.formatPlaceField('lvalue', instrValue.lvalue);
        this.line(`operation: "${instrValue.operation}"`);
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'PrefixUpdate': {
        this.line('PrefixUpdate {');
        this.indent();
        this.formatPlaceField('lvalue', instrValue.lvalue);
        this.line(`operation: "${instrValue.operation}"`);
        this.formatPlaceField('value', instrValue.value);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'StartMemoize': {
        this.line('StartMemoize {');
        this.indent();
        this.line(`manualMemoId: ${instrValue.manualMemoId}`);
        if (instrValue.deps !== null) {
          this.line('deps:');
          this.indent();
          instrValue.deps.forEach((dep, i) => {
            const rootStr =
              dep.root.kind === 'Global'
                ? `Global("${dep.root.identifierName}")`
                : `NamedLocal(${dep.root.value.identifier.id}, constant=${dep.root.constant})`;
            const pathStr = dep.path
              .map(p => `${p.optional ? '?.' : '.'}${p.property}`)
              .join('');
            this.line(`[${i}] ${rootStr}${pathStr}`);
          });
          this.dedent();
        } else {
          this.line('deps: null');
        }
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'FinishMemoize': {
        this.line('FinishMemoize {');
        this.indent();
        this.line(`manualMemoId: ${instrValue.manualMemoId}`);
        this.formatPlaceField('decl', instrValue.decl);
        this.line(`pruned: ${instrValue.pruned === true}`);
        this.line(`loc: ${this.formatLoc(instrValue.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      default: {
        assertExhaustive(
          instrValue,
          `Unexpected instruction kind '${(instrValue as any).kind}'`,
        );
      }
    }
  }

  formatTerminal(terminal: Terminal): void {
    switch (terminal.kind) {
      case 'if': {
        this.line('If {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.formatPlaceField('test', terminal.test);
        this.line(`consequent: bb${terminal.consequent}`);
        this.line(`alternate: bb${terminal.alternate}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'branch': {
        this.line('Branch {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.formatPlaceField('test', terminal.test);
        this.line(`consequent: bb${terminal.consequent}`);
        this.line(`alternate: bb${terminal.alternate}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'logical': {
        this.line('Logical {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`operator: "${terminal.operator}"`);
        this.line(`test: bb${terminal.test}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'ternary': {
        this.line('Ternary {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`test: bb${terminal.test}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'optional': {
        this.line('Optional {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`optional: ${terminal.optional}`);
        this.line(`test: bb${terminal.test}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'throw': {
        this.line('Throw {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.formatPlaceField('value', terminal.value);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'return': {
        this.line('Return {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`returnVariant: ${terminal.returnVariant}`);
        this.formatPlaceField('value', terminal.value);
        if (terminal.effects !== null) {
          this.line('effects:');
          this.indent();
          terminal.effects.forEach((effect, i) => {
            this.line(`[${i}] ${this.formatAliasingEffect(effect)}`);
          });
          this.dedent();
        } else {
          this.line('effects: null');
        }
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'goto': {
        this.line('Goto {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`block: bb${terminal.block}`);
        this.line(`variant: ${terminal.variant}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'switch': {
        this.line('Switch {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.formatPlaceField('test', terminal.test);
        this.line('cases:');
        this.indent();
        terminal.cases.forEach((case_, i) => {
          if (case_.test !== null) {
            this.line(`[${i}] Case {`);
            this.indent();
            this.formatPlaceField('test', case_.test);
            this.line(`block: bb${case_.block}`);
            this.dedent();
            this.line('}');
          } else {
            this.line(`[${i}] Default { block: bb${case_.block} }`);
          }
        });
        this.dedent();
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'do-while': {
        this.line('DoWhile {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`loop: bb${terminal.loop}`);
        this.line(`test: bb${terminal.test}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'while': {
        this.line('While {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`test: bb${terminal.test}`);
        this.line(`loop: bb${terminal.loop}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'for': {
        this.line('For {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`init: bb${terminal.init}`);
        this.line(`test: bb${terminal.test}`);
        this.line(
          `update: ${terminal.update !== null ? `bb${terminal.update}` : 'null'}`,
        );
        this.line(`loop: bb${terminal.loop}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'for-of': {
        this.line('ForOf {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`init: bb${terminal.init}`);
        this.line(`test: bb${terminal.test}`);
        this.line(`loop: bb${terminal.loop}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'for-in': {
        this.line('ForIn {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`init: bb${terminal.init}`);
        this.line(`loop: bb${terminal.loop}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'label': {
        this.line('Label {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`block: bb${terminal.block}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'sequence': {
        this.line('Sequence {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`block: bb${terminal.block}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'unreachable': {
        this.line(
          `Unreachable { id: ${terminal.id}, loc: ${this.formatLoc(terminal.loc)} }`,
        );
        break;
      }
      case 'unsupported': {
        this.line(
          `Unsupported { id: ${terminal.id}, loc: ${this.formatLoc(terminal.loc)} }`,
        );
        break;
      }
      case 'maybe-throw': {
        this.line('MaybeThrow {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`continuation: bb${terminal.continuation}`);
        this.line(
          `handler: ${terminal.handler !== null ? `bb${terminal.handler}` : 'null'}`,
        );
        if (terminal.effects !== null) {
          this.line('effects:');
          this.indent();
          terminal.effects.forEach((effect, i) => {
            this.line(`[${i}] ${this.formatAliasingEffect(effect)}`);
          });
          this.dedent();
        } else {
          this.line('effects: null');
        }
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'scope': {
        this.line('Scope {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.formatScopeField('scope', terminal.scope);
        this.line(`block: bb${terminal.block}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'pruned-scope': {
        this.line('PrunedScope {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.formatScopeField('scope', terminal.scope);
        this.line(`block: bb${terminal.block}`);
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'try': {
        this.line('Try {');
        this.indent();
        this.line(`id: ${terminal.id}`);
        this.line(`block: bb${terminal.block}`);
        this.line(`handler: bb${terminal.handler}`);
        if (terminal.handlerBinding !== null) {
          this.formatPlaceField('handlerBinding', terminal.handlerBinding);
        } else {
          this.line('handlerBinding: null');
        }
        this.line(`fallthrough: bb${terminal.fallthrough}`);
        this.line(`loc: ${this.formatLoc(terminal.loc)}`);
        this.dedent();
        this.line('}');
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

  /**
   * Print a Place as a named field. If the identifier is first-seen, expands to multiple lines.
   * If abbreviated, stays on one line.
   */
  formatPlaceField(fieldName: string, place: Place): void {
    const isSeen = this.seenIdentifiers.has(place.identifier.id);
    if (isSeen) {
      this.line(
        `${fieldName}: Place { identifier: Identifier(${place.identifier.id}), effect: ${place.effect}, reactive: ${place.reactive}, loc: ${this.formatLoc(place.loc)} }`,
      );
    } else {
      this.line(`${fieldName}: Place {`);
      this.indent();
      this.line('identifier:');
      this.indent();
      this.formatIdentifier(place.identifier);
      this.dedent();
      this.line(`effect: ${place.effect}`);
      this.line(`reactive: ${place.reactive}`);
      this.line(`loc: ${this.formatLoc(place.loc)}`);
      this.dedent();
      this.line('}');
    }
  }

  formatIdentifier(id: Identifier): void {
    this.seenIdentifiers.add(id.id);
    this.line('Identifier {');
    this.indent();
    this.line(`id: ${id.id}`);
    this.line(`declarationId: ${id.declarationId}`);
    if (id.name !== null) {
      this.line(`name: { kind: "${id.name.kind}", value: "${id.name.value}" }`);
    } else {
      this.line('name: null');
    }
    this.line(
      `mutableRange: [${id.mutableRange.start}:${id.mutableRange.end}]`,
    );
    if (id.scope !== null) {
      this.formatScopeField('scope', id.scope);
    } else {
      this.line('scope: null');
    }
    this.line(`type: ${this.formatType(id.type)}`);
    this.line(`loc: ${this.formatLoc(id.loc)}`);
    this.dedent();
    this.line('}');
  }

  formatScopeField(fieldName: string, scope: ReactiveScope): void {
    const isSeen = this.seenScopes.has(scope.id);
    if (isSeen) {
      this.line(`${fieldName}: Scope(${scope.id})`);
    } else {
      this.seenScopes.add(scope.id);
      this.line(`${fieldName}: Scope {`);
      this.indent();
      this.line(`id: ${scope.id}`);
      this.line(`range: [${scope.range.start}:${scope.range.end}]`);
      this.line('dependencies:');
      this.indent();
      let depIndex = 0;
      for (const dep of scope.dependencies) {
        const pathStr = dep.path
          .map(p => `${p.optional ? '?.' : '.'}${p.property}`)
          .join('');
        this.line(
          `[${depIndex}] { identifier: ${dep.identifier.id}, reactive: ${dep.reactive}, path: "${pathStr}" }`,
        );
        depIndex++;
      }
      this.dedent();
      this.line('declarations:');
      this.indent();
      for (const [identId, decl] of scope.declarations) {
        this.line(
          `${identId}: { identifier: ${decl.identifier.id}, scope: ${decl.scope.id} }`,
        );
      }
      this.dedent();
      this.line('reassignments:');
      this.indent();
      for (const ident of scope.reassignments) {
        this.line(`${ident.id}`);
      }
      this.dedent();
      if (scope.earlyReturnValue !== null) {
        this.line('earlyReturnValue:');
        this.indent();
        this.line(`value: ${scope.earlyReturnValue.value.id}`);
        this.line(`loc: ${this.formatLoc(scope.earlyReturnValue.loc)}`);
        this.line(`label: bb${scope.earlyReturnValue.label}`);
        this.dedent();
      } else {
        this.line('earlyReturnValue: null');
      }
      this.line(`merged: [${[...scope.merged].join(', ')}]`);
      this.line(`loc: ${this.formatLoc(scope.loc)}`);
      this.dedent();
      this.line('}');
    }
  }

  formatType(type: Type): string {
    switch (type.kind) {
      case 'Primitive':
        return 'Primitive';
      case 'Function':
        return `Function { shapeId: ${type.shapeId !== null ? `"${type.shapeId}"` : 'null'}, return: ${this.formatType(type.return)}, isConstructor: ${type.isConstructor} }`;
      case 'Object':
        return `Object { shapeId: ${type.shapeId !== null ? `"${type.shapeId}"` : 'null'} }`;
      case 'Type':
        return `Type(${type.id})`;
      case 'Poly':
        return 'Poly';
      case 'Phi':
        return `Phi { operands: [${type.operands.map(op => this.formatType(op)).join(', ')}] }`;
      case 'Property':
        return `Property { objectType: ${this.formatType(type.objectType)}, objectName: "${type.objectName}", propertyName: ${type.propertyName.kind === 'literal' ? `"${type.propertyName.value}"` : `computed(${this.formatType(type.propertyName.value)})`} }`;
      case 'ObjectMethod':
        return 'ObjectMethod';
      default:
        assertExhaustive(type, `Unexpected type kind '${(type as any).kind}'`);
    }
  }

  formatLoc(loc: SourceLocation): string {
    if (typeof loc === 'symbol') {
      return 'generated';
    }
    return `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}`;
  }

  formatAliasingEffect(effect: AliasingEffect): string {
    switch (effect.kind) {
      case 'Assign':
        return `Assign { into: ${effect.into.identifier.id}, from: ${effect.from.identifier.id} }`;
      case 'Alias':
        return `Alias { into: ${effect.into.identifier.id}, from: ${effect.from.identifier.id} }`;
      case 'MaybeAlias':
        return `MaybeAlias { into: ${effect.into.identifier.id}, from: ${effect.from.identifier.id} }`;
      case 'Capture':
        return `Capture { into: ${effect.into.identifier.id}, from: ${effect.from.identifier.id} }`;
      case 'ImmutableCapture':
        return `ImmutableCapture { into: ${effect.into.identifier.id}, from: ${effect.from.identifier.id} }`;
      case 'Create':
        return `Create { into: ${effect.into.identifier.id}, value: ${effect.value}, reason: ${effect.reason} }`;
      case 'CreateFrom':
        return `CreateFrom { into: ${effect.into.identifier.id}, from: ${effect.from.identifier.id} }`;
      case 'CreateFunction': {
        const captures = effect.captures.map(c => c.identifier.id).join(', ');
        return `CreateFunction { into: ${effect.into.identifier.id}, captures: [${captures}] }`;
      }
      case 'Apply': {
        const args = effect.args
          .map(arg => {
            if (arg.kind === 'Identifier') {
              return String(arg.identifier.id);
            } else if (arg.kind === 'Hole') {
              return 'Hole';
            }
            return `...${arg.place.identifier.id}`;
          })
          .join(', ');
        return `Apply { into: ${effect.into.identifier.id}, receiver: ${effect.receiver.identifier.id}, function: ${effect.function.identifier.id}, mutatesFunction: ${effect.mutatesFunction}, args: [${args}], loc: ${this.formatLoc(effect.loc)} }`;
      }
      case 'Freeze':
        return `Freeze { value: ${effect.value.identifier.id}, reason: ${effect.reason} }`;
      case 'Mutate':
        return `Mutate { value: ${effect.value.identifier.id}${effect.reason?.kind === 'AssignCurrentProperty' ? ', reason: AssignCurrentProperty' : ''} }`;
      case 'MutateConditionally':
        return `MutateConditionally { value: ${effect.value.identifier.id} }`;
      case 'MutateTransitive':
        return `MutateTransitive { value: ${effect.value.identifier.id} }`;
      case 'MutateTransitiveConditionally':
        return `MutateTransitiveConditionally { value: ${effect.value.identifier.id} }`;
      case 'MutateFrozen':
        return `MutateFrozen { place: ${effect.place.identifier.id}, reason: ${JSON.stringify(effect.error.reason)} }`;
      case 'MutateGlobal':
        return `MutateGlobal { place: ${effect.place.identifier.id}, reason: ${JSON.stringify(effect.error.reason)} }`;
      case 'Impure':
        return `Impure { place: ${effect.place.identifier.id}, reason: ${JSON.stringify(effect.error.reason)} }`;
      case 'Render':
        return `Render { place: ${effect.place.identifier.id} }`;
      default:
        assertExhaustive(
          effect,
          `Unexpected effect kind '${(effect as any).kind}'`,
        );
    }
  }

  formatLValue(fieldName: string, lvalue: LValue): void {
    this.line(`${fieldName}:`);
    this.indent();
    this.line(`kind: ${lvalue.kind}`);
    this.formatPlaceField('place', lvalue.place);
    this.dedent();
  }

  formatPattern(pattern: Pattern): void {
    switch (pattern.kind) {
      case 'ArrayPattern': {
        this.line('pattern: ArrayPattern {');
        this.indent();
        this.line('items:');
        this.indent();
        pattern.items.forEach((item, i) => {
          if (item.kind === 'Hole') {
            this.line(`[${i}] Hole`);
          } else if (item.kind === 'Identifier') {
            this.formatPlaceField(`[${i}]`, item);
          } else {
            this.line(`[${i}] Spread:`);
            this.indent();
            this.formatPlaceField('place', item.place);
            this.dedent();
          }
        });
        this.dedent();
        this.line(`loc: ${this.formatLoc(pattern.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      case 'ObjectPattern': {
        this.line('pattern: ObjectPattern {');
        this.indent();
        this.line('properties:');
        this.indent();
        pattern.properties.forEach((prop, i) => {
          if (prop.kind === 'ObjectProperty') {
            this.line(`[${i}] ObjectProperty {`);
            this.indent();
            this.line(`key: ${this.formatObjectPropertyKey(prop.key)}`);
            this.line(`type: "${prop.type}"`);
            this.formatPlaceField('place', prop.place);
            this.dedent();
            this.line('}');
          } else {
            this.line(`[${i}] Spread:`);
            this.indent();
            this.formatPlaceField('place', prop.place);
            this.dedent();
          }
        });
        this.dedent();
        this.line(`loc: ${this.formatLoc(pattern.loc)}`);
        this.dedent();
        this.line('}');
        break;
      }
      default:
        assertExhaustive(
          pattern,
          `Unexpected pattern kind '${(pattern as any).kind}'`,
        );
    }
  }

  formatObjectPropertyKey(key: ObjectPropertyKey): string {
    switch (key.kind) {
      case 'identifier':
        return `Identifier("${key.name}")`;
      case 'string':
        return `String("${key.name}")`;
      case 'computed':
        return `Computed(${key.name.identifier.id})`;
      case 'number':
        return `Number(${key.name})`;
    }
  }

  formatNonLocalBinding(binding: NonLocalBinding): string {
    switch (binding.kind) {
      case 'Global':
        return `Global { name: "${binding.name}" }`;
      case 'ModuleLocal':
        return `ModuleLocal { name: "${binding.name}" }`;
      case 'ImportDefault':
        return `ImportDefault { name: "${binding.name}", module: "${binding.module}" }`;
      case 'ImportNamespace':
        return `ImportNamespace { name: "${binding.name}", module: "${binding.module}" }`;
      case 'ImportSpecifier':
        return `ImportSpecifier { name: "${binding.name}", module: "${binding.module}", imported: "${binding.imported}" }`;
      default:
        assertExhaustive(
          binding,
          `Unexpected binding kind '${(binding as any).kind}'`,
        );
    }
  }

  formatErrors(errors: {
    details: Array<CompilerErrorDetail | CompilerDiagnostic>;
  }): void {
    if (errors.details.length === 0) {
      this.line('Errors: []');
      return;
    }
    this.line('Errors:');
    this.indent();
    errors.details.forEach((detail, i) => {
      this.line(`[${i}] {`);
      this.indent();
      this.line(`severity: ${detail.severity}`);
      this.line(`reason: ${JSON.stringify(detail.reason)}`);
      this.line(
        `description: ${detail.description !== null && detail.description !== undefined ? JSON.stringify(detail.description) : 'null'}`,
      );
      this.line(`category: ${detail.category}`);
      const loc = detail.primaryLocation();
      this.line(`loc: ${loc !== null ? this.formatLoc(loc) : 'null'}`);
      this.dedent();
      this.line('}');
    });
    this.dedent();
  }

  private formatArgument(arg: Place | SpreadPattern, index: number): void {
    if (arg.kind === 'Identifier') {
      this.formatPlaceField(`[${index}]`, arg);
    } else {
      this.line(`[${index}] Spread:`);
      this.indent();
      this.formatPlaceField('place', arg.place);
      this.dedent();
    }
  }
}
