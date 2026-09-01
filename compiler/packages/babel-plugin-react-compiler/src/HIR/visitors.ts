/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {assertExhaustive} from '../Utils/utils';
import {CompilerError} from '..';
import {
  BasicBlock,
  BlockId,
  Instruction,
  InstructionKind,
  InstructionValue,
  makeInstructionId,
  Pattern,
  Place,
  ReactiveInstruction,
  ReactiveScope,
  ReactiveValue,
  ScopeId,
  SpreadPattern,
  Terminal,
} from './HIR';

export function* eachInstructionLValue(
  instr: ReactiveInstruction,
): Iterable<Place> {
  if (instr.lvalue !== null) {
    yield instr.lvalue;
  }
  yield* eachInstructionValueLValue(instr.value);
}

export function* eachInstructionLValueWithKind(
  instr: ReactiveInstruction,
): Iterable<[Place, InstructionKind]> {
  switch (instr.value.kind) {
    case 'DeclareContext':
    case 'StoreContext':
    case 'DeclareLocal':
    case 'StoreLocal': {
      yield [instr.value.lvalue.place, instr.value.lvalue.kind];
      break;
    }
    case 'Destructure': {
      const kind = instr.value.lvalue.kind;
      for (const place of eachPatternOperand(instr.value.lvalue.pattern)) {
        yield [place, kind];
      }
      break;
    }
    case 'PostfixUpdate':
    case 'PrefixUpdate': {
      yield [instr.value.lvalue, InstructionKind.Reassign];
      break;
    }
  }
}

export function* eachInstructionValueLValue(
  value: ReactiveValue,
): Iterable<Place> {
  switch (value.kind) {
    case 'DeclareContext':
    case 'StoreContext':
    case 'DeclareLocal':
    case 'StoreLocal': {
      yield value.lvalue.place;
      break;
    }
    case 'Destructure': {
      yield* eachPatternOperand(value.lvalue.pattern);
      break;
    }
    case 'PostfixUpdate':
    case 'PrefixUpdate': {
      yield value.lvalue;
      break;
    }
  }
}

export function* eachInstructionOperand(instr: Instruction): Iterable<Place> {
  yield* eachInstructionValueOperand(instr.value);
}
export function* eachInstructionValueOperand(
  instrValue: InstructionValue,
): Iterable<Place> {
  switch (instrValue.kind) {
    case 'NewExpression':
    case 'CallExpression': {
      yield instrValue.callee;
      yield* eachCallArgument(instrValue.args);
      break;
    }
    case 'BinaryExpression': {
      yield instrValue.left;
      yield instrValue.right;
      break;
    }
    case 'MethodCall': {
      yield instrValue.receiver;
      yield instrValue.property;
      yield* eachCallArgument(instrValue.args);
      break;
    }
    case 'DeclareContext':
    case 'DeclareLocal': {
      break;
    }
    case 'LoadLocal':
    case 'LoadContext': {
      yield instrValue.place;
      break;
    }
    case 'StoreLocal': {
      yield instrValue.value;
      break;
    }
    case 'StoreContext': {
      yield instrValue.lvalue.place;
      yield instrValue.value;
      break;
    }
    case 'StoreGlobal': {
      yield instrValue.value;
      break;
    }
    case 'Destructure': {
      yield instrValue.value;
      break;
    }
    case 'PropertyLoad': {
      yield instrValue.object;
      break;
    }
    case 'PropertyDelete': {
      yield instrValue.object;
      break;
    }
    case 'PropertyStore': {
      yield instrValue.object;
      yield instrValue.value;
      break;
    }
    case 'ComputedLoad': {
      yield instrValue.object;
      yield instrValue.property;
      break;
    }
    case 'ComputedDelete': {
      yield instrValue.object;
      yield instrValue.property;
      break;
    }
    case 'ComputedStore': {
      yield instrValue.object;
      yield instrValue.property;
      yield instrValue.value;
      break;
    }
    case 'UnaryExpression': {
      yield instrValue.value;
      break;
    }
    case 'JsxExpression': {
      if (instrValue.tag.kind === 'Identifier') {
        yield instrValue.tag;
      }
      for (const attribute of instrValue.props) {
        switch (attribute.kind) {
          case 'JsxAttribute': {
            yield attribute.place;
            break;
          }
          case 'JsxSpreadAttribute': {
            yield attribute.argument;
            break;
          }
          default: {
            assertExhaustive(
              attribute,
              `Unexpected attribute kind \`${(attribute as any).kind}\``,
            );
          }
        }
      }
      if (instrValue.children) {
        yield* instrValue.children;
      }
      break;
    }
    case 'JsxFragment': {
      yield* instrValue.children;
      break;
    }
    case 'ObjectExpression': {
      for (const property of instrValue.properties) {
        if (
          property.kind === 'ObjectProperty' &&
          property.key.kind === 'computed'
        ) {
          yield property.key.name;
        }
        yield property.place;
      }
      break;
    }
    case 'ArrayExpression': {
      for (const element of instrValue.elements) {
        if (element.kind === 'Identifier') {
          yield element;
        } else if (element.kind === 'Spread') {
          yield element.place;
        }
      }
      break;
    }
    case 'ObjectMethod':
    case 'FunctionExpression': {
      yield* instrValue.loweredFunc.func.context;
      break;
    }
    case 'TaggedTemplateExpression': {
      yield instrValue.tag;
      break;
    }
    case 'TypeCastExpression': {
      yield instrValue.value;
      break;
    }
    case 'TemplateLiteral': {
      yield* instrValue.subexprs;
      break;
    }
    case 'Await': {
      yield instrValue.value;
      break;
    }
    case 'GetIterator': {
      yield instrValue.collection;
      break;
    }
    case 'IteratorNext': {
      yield instrValue.iterator;
      yield instrValue.collection;
      break;
    }
    case 'NextPropertyOf': {
      yield instrValue.value;
      break;
    }
    case 'PostfixUpdate':
    case 'PrefixUpdate': {
      yield instrValue.value;
      break;
    }
    case 'StartMemoize': {
      if (instrValue.deps != null) {
        for (const dep of instrValue.deps) {
          if (dep.root.kind === 'NamedLocal') {
            yield dep.root.value;
          }
        }
      }
      break;
    }
    case 'FinishMemoize': {
      yield instrValue.decl;
      break;
    }
    case 'Debugger':
    case 'RegExpLiteral':
    case 'MetaProperty':
    case 'LoadGlobal':
    case 'UnsupportedNode':
    case 'Primitive':
    case 'JSXText': {
      break;
    }
    default: {
      assertExhaustive(
        instrValue,
        `Unexpected instruction kind \`${(instrValue as any).kind}\``,
      );
    }
  }
}

export function* eachCallArgument(
  args: Array<Place | SpreadPattern>,
): Iterable<Place> {
  for (const arg of args) {
    if (arg.kind === 'Identifier') {
      yield arg;
    } else {
      yield arg.place;
    }
  }
}

export function doesPatternContainSpreadElement(pattern: Pattern): boolean {
  switch (pattern.kind) {
    case 'ArrayPattern': {
      for (const item of pattern.items) {
        if (item.kind === 'Spread') {
          return true;
        }
      }
      break;
    }
    case 'ObjectPattern': {
      for (const property of pattern.properties) {
        if (property.kind === 'Spread') {
          return true;
        }
      }
      break;
    }
    default: {
      assertExhaustive(
        pattern,
        `Unexpected pattern kind \`${(pattern as any).kind}\``,
      );
    }
  }
  return false;
}

export function* eachPatternOperand(pattern: Pattern): Iterable<Place> {
  switch (pattern.kind) {
    case 'ArrayPattern': {
      for (const item of pattern.items) {
        if (item.kind === 'Identifier') {
          yield item;
        } else if (item.kind === 'Spread') {
          yield item.place;
        } else if (item.kind === 'Hole') {
          continue;
        } else {
          assertExhaustive(
            item,
            `Unexpected item kind \`${(item as any).kind}\``,
          );
        }
      }
      break;
    }
    case 'ObjectPattern': {
      for (const property of pattern.properties) {
        if (property.kind === 'ObjectProperty') {
          yield property.place;
        } else if (property.kind === 'Spread') {
          yield property.place;
        } else {
          assertExhaustive(
            property,
            `Unexpected item kind \`${(property as any).kind}\``,
          );
        }
      }
      break;
    }
    default: {
      assertExhaustive(
        pattern,
        `Unexpected pattern kind \`${(pattern as any).kind}\``,
      );
    }
  }
}

export function* eachPatternItem(
  pattern: Pattern,
): Iterable<Place | SpreadPattern> {
  switch (pattern.kind) {
    case 'ArrayPattern': {
      for (const item of pattern.items) {
        if (item.kind === 'Identifier') {
          yield item;
        } else if (item.kind === 'Spread') {
          yield item;
        } else if (item.kind === 'Hole') {
          continue;
        } else {
          assertExhaustive(
            item,
            `Unexpected item kind \`${(item as any).kind}\``,
          );
        }
      }
      break;
    }
    case 'ObjectPattern': {
      for (const property of pattern.properties) {
        if (property.kind === 'ObjectProperty') {
          yield property.place;
        } else if (property.kind === 'Spread') {
          yield property;
        } else {
          assertExhaustive(
            property,
            `Unexpected item kind \`${(property as any).kind}\``,
          );
        }
      }
      break;
    }
    default: {
      assertExhaustive(
        pattern,
        `Unexpected pattern kind \`${(pattern as any).kind}\``,
      );
    }
  }
}

export function mapInstructionLValues(
  instr: Instruction,
  fn: (place: Place) => Place,
): void {
  switch (instr.value.kind) {
    case 'DeclareLocal':
    case 'StoreLocal': {
      const lvalue = instr.value.lvalue;
      lvalue.place = fn(lvalue.place);
      break;
    }
    case 'Destructure': {
      mapPatternOperands(instr.value.lvalue.pattern, fn);
      break;
    }
    case 'PostfixUpdate':
    case 'PrefixUpdate': {
      instr.value.lvalue = fn(instr.value.lvalue);
      break;
    }
  }
  if (instr.lvalue !== null) {
    instr.lvalue = fn(instr.lvalue);
  }
}

export function mapInstructionOperands(
  instr: Instruction,
  fn: (place: Place) => Place,
): void {
  mapInstructionValueOperands(instr.value, fn);
}

export function mapInstructionValueOperands(
  instrValue: InstructionValue,
  fn: (place: Place) => Place,
): void {
  switch (instrValue.kind) {
    case 'BinaryExpression': {
      instrValue.left = fn(instrValue.left);
      instrValue.right = fn(instrValue.right);
      break;
    }
    case 'PropertyLoad': {
      instrValue.object = fn(instrValue.object);
      break;
    }
    case 'PropertyDelete': {
      instrValue.object = fn(instrValue.object);
      break;
    }
    case 'PropertyStore': {
      instrValue.object = fn(instrValue.object);
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'ComputedLoad': {
      instrValue.object = fn(instrValue.object);
      instrValue.property = fn(instrValue.property);
      break;
    }
    case 'ComputedDelete': {
      instrValue.object = fn(instrValue.object);
      instrValue.property = fn(instrValue.property);
      break;
    }
    case 'ComputedStore': {
      instrValue.object = fn(instrValue.object);
      instrValue.property = fn(instrValue.property);
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'DeclareContext':
    case 'DeclareLocal': {
      break;
    }
    case 'LoadLocal':
    case 'LoadContext': {
      instrValue.place = fn(instrValue.place);
      break;
    }
    case 'StoreLocal': {
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'StoreContext': {
      instrValue.lvalue.place = fn(instrValue.lvalue.place);
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'StoreGlobal': {
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'Destructure': {
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'NewExpression':
    case 'CallExpression': {
      instrValue.callee = fn(instrValue.callee);
      instrValue.args = mapCallArguments(instrValue.args, fn);
      break;
    }
    case 'MethodCall': {
      instrValue.receiver = fn(instrValue.receiver);
      instrValue.property = fn(instrValue.property);
      instrValue.args = mapCallArguments(instrValue.args, fn);
      break;
    }
    case 'UnaryExpression': {
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'JsxExpression': {
      if (instrValue.tag.kind === 'Identifier') {
        instrValue.tag = fn(instrValue.tag);
      }
      for (const attribute of instrValue.props) {
        switch (attribute.kind) {
          case 'JsxAttribute': {
            attribute.place = fn(attribute.place);
            break;
          }
          case 'JsxSpreadAttribute': {
            attribute.argument = fn(attribute.argument);
            break;
          }
          default: {
            assertExhaustive(
              attribute,
              `Unexpected attribute kind \`${(attribute as any).kind}\``,
            );
          }
        }
      }
      if (instrValue.children) {
        instrValue.children = instrValue.children.map(p => fn(p));
      }
      break;
    }
    case 'ObjectExpression': {
      for (const property of instrValue.properties) {
        if (
          property.kind === 'ObjectProperty' &&
          property.key.kind === 'computed'
        ) {
          property.key.name = fn(property.key.name);
        }
        property.place = fn(property.place);
      }
      break;
    }
    case 'ArrayExpression': {
      instrValue.elements = instrValue.elements.map(element => {
        if (element.kind === 'Identifier') {
          return fn(element);
        } else if (element.kind === 'Spread') {
          element.place = fn(element.place);
          return element;
        } else {
          return element;
        }
      });
      break;
    }
    case 'JsxFragment': {
      instrValue.children = instrValue.children.map(e => fn(e));
      break;
    }
    case 'ObjectMethod':
    case 'FunctionExpression': {
      instrValue.loweredFunc.func.context =
        instrValue.loweredFunc.func.context.map(d => fn(d));

      break;
    }
    case 'TaggedTemplateExpression': {
      instrValue.tag = fn(instrValue.tag);
      break;
    }
    case 'TypeCastExpression': {
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'TemplateLiteral': {
      instrValue.subexprs = instrValue.subexprs.map(fn);
      break;
    }
    case 'Await': {
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'GetIterator': {
      instrValue.collection = fn(instrValue.collection);
      break;
    }
    case 'IteratorNext': {
      instrValue.iterator = fn(instrValue.iterator);
      instrValue.collection = fn(instrValue.collection);
      break;
    }
    case 'NextPropertyOf': {
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'PostfixUpdate':
    case 'PrefixUpdate': {
      instrValue.value = fn(instrValue.value);
      break;
    }
    case 'StartMemoize': {
      if (instrValue.deps != null) {
        for (const dep of instrValue.deps) {
          if (dep.root.kind === 'NamedLocal') {
            dep.root.value = fn(dep.root.value);
          }
        }
      }
      break;
    }
    case 'FinishMemoize': {
      instrValue.decl = fn(instrValue.decl);
      break;
    }
    case 'Debugger':
    case 'RegExpLiteral':
    case 'MetaProperty':
    case 'LoadGlobal':
    case 'UnsupportedNode':
    case 'Primitive':
    case 'JSXText': {
      break;
    }
    default: {
      assertExhaustive(instrValue, 'Unexpected instruction kind');
    }
  }
}

export function mapCallArguments(
  args: Array<Place | SpreadPattern>,
  fn: (place: Place) => Place,
): Array<Place | SpreadPattern> {
  return args.map(arg => {
    if (arg.kind === 'Identifier') {
      return fn(arg);
    } else {
      arg.place = fn(arg.place);
      return arg;
    }
  });
}

export function mapPatternOperands(
  pattern: Pattern,
  fn: (place: Place) => Place,
): void {
  switch (pattern.kind) {
    case 'ArrayPattern': {
      pattern.items = pattern.items.map(item => {
        if (item.kind === 'Identifier') {
          return fn(item);
        } else if (item.kind === 'Spread') {
          item.place = fn(item.place);
          return item;
        } else {
          return item;
        }
      });
      break;
    }
    case 'ObjectPattern': {
      for (const property of pattern.properties) {
        property.place = fn(property.place);
      }
      break;
    }
    default: {
      assertExhaustive(
        pattern,
        `Unexpected pattern kind \`${(pattern as any).kind}\``,
      );
    }
  }
}

// Maps a terminal node's block assignments using the provided function.
export function mapTerminalSuccessors(
  terminal: Terminal,
  fn: (block: BlockId) => BlockId,
): Terminal {
  switch (terminal.kind) {
    case 'goto': {
      const target = fn(terminal.block);
      return {
        kind: 'goto',
        block: target,
        variant: terminal.variant,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'if': {
      const consequent = fn(terminal.consequent);
      const alternate = fn(terminal.alternate);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'if',
        test: terminal.test,
        consequent,
        alternate,
        fallthrough,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'branch': {
      const consequent = fn(terminal.consequent);
      const alternate = fn(terminal.alternate);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'branch',
        test: terminal.test,
        consequent,
        alternate,
        fallthrough,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'switch': {
      const cases = terminal.cases.map(case_ => {
        const target = fn(case_.block);
        return {
          test: case_.test,
          block: target,
        };
      });
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'switch',
        test: terminal.test,
        cases,
        fallthrough,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'logical': {
      const test = fn(terminal.test);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'logical',
        test,
        fallthrough,
        operator: terminal.operator,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'ternary': {
      const test = fn(terminal.test);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'ternary',
        test,
        fallthrough,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'optional': {
      const test = fn(terminal.test);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'optional',
        optional: terminal.optional,
        test,
        fallthrough,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'return': {
      return {
        kind: 'return',
        returnVariant: terminal.returnVariant,
        loc: terminal.loc,
        value: terminal.value,
        id: makeInstructionId(0),
        effects: terminal.effects,
      };
    }
    case 'throw': {
      return terminal;
    }
    case 'do-while': {
      const loop = fn(terminal.loop);
      const test = fn(terminal.test);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'do-while',
        loc: terminal.loc,
        test,
        loop,
        fallthrough,
        id: makeInstructionId(0),
      };
    }
    case 'while': {
      const test = fn(terminal.test);
      const loop = fn(terminal.loop);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'while',
        loc: terminal.loc,
        test,
        loop,
        fallthrough,
        id: makeInstructionId(0),
      };
    }
    case 'for': {
      const init = fn(terminal.init);
      const test = fn(terminal.test);
      const update = terminal.update !== null ? fn(terminal.update) : null;
      const loop = fn(terminal.loop);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'for',
        loc: terminal.loc,
        init,
        test,
        update,
        loop,
        fallthrough,
        id: makeInstructionId(0),
      };
    }
    case 'for-of': {
      const init = fn(terminal.init);
      const loop = fn(terminal.loop);
      const test = fn(terminal.test);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'for-of',
        loc: terminal.loc,
        init,
        test,
        loop,
        fallthrough,
        id: makeInstructionId(0),
      };
    }
    case 'for-in': {
      const init = fn(terminal.init);
      const loop = fn(terminal.loop);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'for-in',
        loc: terminal.loc,
        init,
        loop,
        fallthrough,
        id: makeInstructionId(0),
      };
    }
    case 'label': {
      const block = fn(terminal.block);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'label',
        block,
        fallthrough,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'sequence': {
      const block = fn(terminal.block);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'sequence',
        block,
        fallthrough,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'maybe-throw': {
      const continuation = fn(terminal.continuation);
      const handler = terminal.handler !== null ? fn(terminal.handler) : null;
      return {
        kind: 'maybe-throw',
        continuation,
        handler,
        id: makeInstructionId(0),
        loc: terminal.loc,
        effects: terminal.effects,
      };
    }
    case 'try': {
      const block = fn(terminal.block);
      const handler = fn(terminal.handler);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: 'try',
        block,
        handlerBinding: terminal.handlerBinding,
        handler,
        fallthrough,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'scope':
    case 'pruned-scope': {
      const block = fn(terminal.block);
      const fallthrough = fn(terminal.fallthrough);
      return {
        kind: terminal.kind,
        scope: terminal.scope,
        block,
        fallthrough,
        id: makeInstructionId(0),
        loc: terminal.loc,
      };
    }
    case 'unreachable':
    case 'unsupported': {
      return terminal;
    }
    default: {
      assertExhaustive(
        terminal,
        `Unexpected terminal kind \`${(terminal as any as Terminal).kind}\``,
      );
    }
  }
}

export function terminalHasFallthrough<
  T extends Terminal,
  U extends T & {fallthrough: BlockId},
>(terminal: T): terminal is U {
  switch (terminal.kind) {
    case 'maybe-throw':
    case 'goto':
    case 'return':
    case 'throw':
    case 'unreachable':
    case 'unsupported': {
      const _: undefined = terminal.fallthrough;
      return false;
    }
    case 'branch':
    case 'try':
    case 'do-while':
    case 'for-of':
    case 'for-in':
    case 'for':
    case 'if':
    case 'label':
    case 'logical':
    case 'optional':
    case 'sequence':
    case 'switch':
    case 'ternary':
    case 'while':
    case 'scope':
    case 'pruned-scope': {
      const _: BlockId = terminal.fallthrough;
      return true;
    }
    default: {
      assertExhaustive(
        terminal,
        `Unexpected terminal kind \`${(terminal as any).kind}\``,
      );
    }
  }
}

/*
 * Helper to get a terminal's fallthrough. The main reason to extract this as a helper
 * function is to ensure that we use an exhaustive switch to ensure that we add new terminal
 * variants as appropriate.
 */
export function terminalFallthrough(terminal: Terminal): BlockId | null {
  if (terminalHasFallthrough(terminal)) {
    return terminal.fallthrough;
  } else {
    return null;
  }
}

/*
 * Iterates over the successor block ids of the provided terminal. The function is called
 * specifically for the successors that define the standard control flow, and not
 * pseduo-successors such as fallthroughs.
 */
export function* eachTerminalSuccessor(terminal: Terminal): Iterable<BlockId> {
  switch (terminal.kind) {
    case 'goto': {
      yield terminal.block;
      break;
    }
    case 'if': {
      yield terminal.consequent;
      yield terminal.alternate;
      break;
    }
    case 'branch': {
      yield terminal.consequent;
      yield terminal.alternate;
      break;
    }
    case 'switch': {
      for (const case_ of terminal.cases) {
        yield case_.block;
      }
      break;
    }
    case 'optional':
    case 'ternary':
    case 'logical': {
      yield terminal.test;
      break;
    }
    case 'return': {
      break;
    }
    case 'throw': {
      break;
    }
    case 'do-while': {
      yield terminal.loop;
      break;
    }
    case 'while': {
      yield terminal.test;
      break;
    }
    case 'for': {
      yield terminal.init;
      break;
    }
    case 'for-of': {
      yield terminal.init;
      break;
    }
    case 'for-in': {
      yield terminal.init;
      break;
    }
    case 'label': {
      yield terminal.block;
      break;
    }
    case 'sequence': {
      yield terminal.block;
      break;
    }
    case 'maybe-throw': {
      yield terminal.continuation;
      if (terminal.handler !== null) {
        yield terminal.handler;
      }
      break;
    }
    case 'try': {
      yield terminal.block;
      break;
    }
    case 'scope':
    case 'pruned-scope': {
      yield terminal.block;
      break;
    }
    case 'unreachable':
    case 'unsupported':
      break;
    default: {
      assertExhaustive(
        terminal,
        `Unexpected terminal kind \`${(terminal as any as Terminal).kind}\``,
      );
    }
  }
}

export function mapTerminalOperands(
  terminal: Terminal,
  fn: (place: Place) => Place,
): void {
  switch (terminal.kind) {
    case 'if': {
      terminal.test = fn(terminal.test);
      break;
    }
    case 'branch': {
      terminal.test = fn(terminal.test);
      break;
    }
    case 'switch': {
      terminal.test = fn(terminal.test);
      for (const case_ of terminal.cases) {
        if (case_.test === null) {
          continue;
        }
        case_.test = fn(case_.test);
      }
      break;
    }
    case 'return':
    case 'throw': {
      terminal.value = fn(terminal.value);
      break;
    }
    case 'try': {
      if (terminal.handlerBinding !== null) {
        terminal.handlerBinding = fn(terminal.handlerBinding);
      } else {
        terminal.handlerBinding = null;
      }
      break;
    }
    case 'maybe-throw':
    case 'sequence':
    case 'label':
    case 'optional':
    case 'ternary':
    case 'logical':
    case 'do-while':
    case 'while':
    case 'for':
    case 'for-of':
    case 'for-in':
    case 'goto':
    case 'unreachable':
    case 'unsupported':
    case 'scope':
    case 'pruned-scope': {
      // no-op
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

export function* eachTerminalOperand(terminal: Terminal): Iterable<Place> {
  switch (terminal.kind) {
    case 'if': {
      yield terminal.test;
      break;
    }
    case 'branch': {
      yield terminal.test;
      break;
    }
    case 'switch': {
      yield terminal.test;
      for (const case_ of terminal.cases) {
        if (case_.test === null) {
          continue;
        }
        yield case_.test;
      }
      break;
    }
    case 'return':
    case 'throw': {
      yield terminal.value;
      break;
    }
    case 'try': {
      if (terminal.handlerBinding !== null) {
        yield terminal.handlerBinding;
      }
      break;
    }
    case 'maybe-throw':
    case 'sequence':
    case 'label':
    case 'optional':
    case 'ternary':
    case 'logical':
    case 'do-while':
    case 'while':
    case 'for':
    case 'for-of':
    case 'for-in':
    case 'goto':
    case 'unreachable':
    case 'unsupported':
    case 'scope':
    case 'pruned-scope': {
      // no-op
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
 * Helper class for traversing scope blocks in HIR-form.
 */
export class ScopeBlockTraversal {
  // Live stack of active scopes
  #activeScopes: Array<ScopeId> = [];
  blockInfos: Map<
    BlockId,
    | {
        kind: 'end';
        scope: ReactiveScope;
        pruned: boolean;
      }
    | {
        kind: 'begin';
        scope: ReactiveScope;
        pruned: boolean;
        fallthrough: BlockId;
      }
  > = new Map();

  recordScopes(block: BasicBlock): void {
    const blockInfo = this.blockInfos.get(block.id);
    if (blockInfo?.kind === 'begin') {
      this.#activeScopes.push(blockInfo.scope.id);
    } else if (blockInfo?.kind === 'end') {
      const top = this.#activeScopes.at(-1);
      CompilerError.invariant(blockInfo.scope.id === top, {
        reason:
          'Expected traversed block fallthrough to match top-most active scope',
        loc: block.instructions[0]?.loc ?? block.terminal.loc,
      });
      this.#activeScopes.pop();
    }

    if (
      block.terminal.kind === 'scope' ||
      block.terminal.kind === 'pruned-scope'
    ) {
      CompilerError.invariant(
        !this.blockInfos.has(block.terminal.block) &&
          !this.blockInfos.has(block.terminal.fallthrough),
        {
          reason: 'Expected unique scope blocks and fallthroughs',
          loc: block.terminal.loc,
        },
      );
      this.blockInfos.set(block.terminal.block, {
        kind: 'begin',
        scope: block.terminal.scope,
        pruned: block.terminal.kind === 'pruned-scope',
        fallthrough: block.terminal.fallthrough,
      });
      this.blockInfos.set(block.terminal.fallthrough, {
        kind: 'end',
        scope: block.terminal.scope,
        pruned: block.terminal.kind === 'pruned-scope',
      });
    }
  }

  /**
   * @returns if the given scope is currently 'active', i.e. if the scope start
   * block but not the scope fallthrough has been recorded.
   */
  isScopeActive(scopeId: ScopeId): boolean {
    return this.#activeScopes.indexOf(scopeId) !== -1;
  }

  /**
   * The current, innermost active scope.
   */
  get currentScope(): ScopeId | null {
    return this.#activeScopes.at(-1) ?? null;
  }
}
