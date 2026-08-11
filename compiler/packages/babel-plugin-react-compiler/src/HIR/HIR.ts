/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {BindingKind} from '@babel/traverse';
import * as t from '@babel/types';
import {
  CompilerDiagnostic,
  CompilerError,
  ErrorCategory,
} from '../CompilerError';
import {assertExhaustive} from '../Utils/utils';
import {Environment, ReactFunctionType} from './Environment';
import type {HookKind} from './ObjectShape';
import {Type, makeType} from './Types';
import {z} from 'zod/v4';
import type {AliasingEffect} from '../Inference/AliasingEffects';
import {isReservedWord} from '../Utils/Keyword';
import {Err, Ok, Result} from '../Utils/Result';

/*
 * *******************************************************************************************
 * *******************************************************************************************
 * ************************************* Core Data Model *************************************
 * *******************************************************************************************
 * *******************************************************************************************
 */

// AST -> (lowering) -> HIR -> (analysis) -> Reactive Scopes -> (codegen) -> AST

/*
 * A location in a source file, intended to be used for providing diagnostic information and
 * transforming code while preserving source information (ie to emit source maps).
 *
 * `GeneratedSource` indicates that there is no single source location from which the code derives.
 */
export const GeneratedSource = Symbol();
export type SourceLocation = t.SourceLocation | typeof GeneratedSource;

/*
 * A React function defines a computation that takes some set of reactive inputs
 * (props, hook arguments) and return a result (JSX, hook return value). Unlike
 * HIR, the data model is tree-shaped:
 *
 * ReactFunction
 *    ReactiveBlock
 *      ReactiveBlockScope*
 *       Place* (dependencies)
 *       (ReactiveInstruction | ReactiveTerminal)*
 *
 * Where ReactiveTerminal may recursively contain zero or more ReactiveBlocks.
 *
 * Each ReactiveBlockScope describes a set of dependencies as well as the instructions (and terminals)
 * within that scope.
 */
export type ReactiveFunction = {
  loc: SourceLocation;
  id: ValidIdentifierName | null;
  nameHint: string | null;
  params: Array<Place | SpreadPattern>;
  generator: boolean;
  async: boolean;
  body: ReactiveBlock;
  env: Environment;
  directives: Array<string>;
};

export type ReactiveScopeBlock = {
  kind: 'scope';
  scope: ReactiveScope;
  instructions: ReactiveBlock;
};

export type PrunedReactiveScopeBlock = {
  kind: 'pruned-scope';
  scope: ReactiveScope;
  instructions: ReactiveBlock;
};

export type ReactiveBlock = Array<ReactiveStatement>;

export type ReactiveStatement =
  | ReactiveInstructionStatement
  | ReactiveTerminalStatement
  | ReactiveScopeBlock
  | PrunedReactiveScopeBlock;

export type ReactiveInstructionStatement = {
  kind: 'instruction';
  instruction: ReactiveInstruction;
};

export type ReactiveTerminalStatement<
  Tterminal extends ReactiveTerminal = ReactiveTerminal,
> = {
  kind: 'terminal';
  terminal: Tterminal;
  label: {
    id: BlockId;
    implicit: boolean;
  } | null;
};

export type ReactiveInstruction = {
  id: InstructionId;
  lvalue: Place | null;
  value: ReactiveValue;
  effects?: Array<AliasingEffect> | null; // TODO make non-optional
  loc: SourceLocation;
};

export type ReactiveValue =
  | InstructionValue
  | ReactiveLogicalValue
  | ReactiveSequenceValue
  | ReactiveTernaryValue
  | ReactiveOptionalCallValue;

export type ReactiveLogicalValue = {
  kind: 'LogicalExpression';
  operator: t.LogicalExpression['operator'];
  left: ReactiveValue;
  right: ReactiveValue;
  loc: SourceLocation;
};

export type ReactiveTernaryValue = {
  kind: 'ConditionalExpression';
  test: ReactiveValue;
  consequent: ReactiveValue;
  alternate: ReactiveValue;
  loc: SourceLocation;
};

export type ReactiveSequenceValue = {
  kind: 'SequenceExpression';
  instructions: Array<ReactiveInstruction>;
  id: InstructionId;
  value: ReactiveValue;
  loc: SourceLocation;
};

export type ReactiveOptionalCallValue = {
  kind: 'OptionalExpression';
  id: InstructionId;
  value: ReactiveValue;
  optional: boolean;
  loc: SourceLocation;
};

export type ReactiveTerminal =
  | ReactiveBreakTerminal
  | ReactiveContinueTerminal
  | ReactiveReturnTerminal
  | ReactiveThrowTerminal
  | ReactiveSwitchTerminal
  | ReactiveDoWhileTerminal
  | ReactiveWhileTerminal
  | ReactiveForTerminal
  | ReactiveForOfTerminal
  | ReactiveForInTerminal
  | ReactiveIfTerminal
  | ReactiveLabelTerminal
  | ReactiveTryTerminal;

function _staticInvariantReactiveTerminalHasLocation(
  terminal: ReactiveTerminal,
): SourceLocation {
  // If this fails, it is because a variant of ReactiveTerminal is missing a .loc - add it!
  return terminal.loc;
}

function _staticInvariantReactiveTerminalHasInstructionId(
  terminal: ReactiveTerminal,
): InstructionId {
  // If this fails, it is because a variant of ReactiveTerminal is missing a .id - add it!
  return terminal.id;
}

export type ReactiveTerminalTargetKind = 'implicit' | 'labeled' | 'unlabeled';
export type ReactiveBreakTerminal = {
  kind: 'break';
  target: BlockId;
  id: InstructionId;
  targetKind: ReactiveTerminalTargetKind;
  loc: SourceLocation;
};
export type ReactiveContinueTerminal = {
  kind: 'continue';
  target: BlockId;
  id: InstructionId;
  targetKind: ReactiveTerminalTargetKind;
  loc: SourceLocation;
};
export type ReactiveReturnTerminal = {
  kind: 'return';
  value: Place;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveThrowTerminal = {
  kind: 'throw';
  value: Place;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveSwitchTerminal = {
  kind: 'switch';
  test: Place;
  cases: Array<{
    test: Place | null;
    block: ReactiveBlock | void;
  }>;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveDoWhileTerminal = {
  kind: 'do-while';
  loop: ReactiveBlock;
  test: ReactiveValue;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveWhileTerminal = {
  kind: 'while';
  test: ReactiveValue;
  loop: ReactiveBlock;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveForTerminal = {
  kind: 'for';
  init: ReactiveValue;
  test: ReactiveValue;
  update: ReactiveValue | null;
  loop: ReactiveBlock;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveForOfTerminal = {
  kind: 'for-of';
  init: ReactiveValue;
  test: ReactiveValue;
  loop: ReactiveBlock;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveForInTerminal = {
  kind: 'for-in';
  init: ReactiveValue;
  loop: ReactiveBlock;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveIfTerminal = {
  kind: 'if';
  test: Place;
  consequent: ReactiveBlock;
  alternate: ReactiveBlock | null;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveLabelTerminal = {
  kind: 'label';
  block: ReactiveBlock;
  id: InstructionId;
  loc: SourceLocation;
};
export type ReactiveTryTerminal = {
  kind: 'try';
  block: ReactiveBlock;
  handlerBinding: Place | null;
  handler: ReactiveBlock;
  id: InstructionId;
  loc: SourceLocation;
};

// A function lowered to HIR form, ie where its body is lowered to an HIR control-flow graph
export type HIRFunction = {
  loc: SourceLocation;
  id: ValidIdentifierName | null;
  nameHint: string | null;
  fnType: ReactFunctionType;
  env: Environment;
  params: Array<Place | SpreadPattern>;
  returnTypeAnnotation: t.FlowType | t.TSType | null;
  returns: Place;
  context: Array<Place>;
  body: HIR;
  generator: boolean;
  async: boolean;
  directives: Array<string>;
  aliasingEffects: Array<AliasingEffect> | null;
};

/*
 * Each reactive scope may have its own control-flow, so the instructions form
 * a control-flow graph. The graph comprises a set of basic blocks which reference
 * each other via terminal statements, as well as a reference to the entry block.
 */
export type HIR = {
  entry: BlockId;

  /*
   * Basic blocks are stored as a map to aid certain operations that need to
   * lookup blocks by their id. However, the order of the items in the map is
   * reverse postorder, that is, barring cycles, predecessors appear before
   * successors. This is designed to facilitate forward data flow analysis.
   */
  blocks: Map<BlockId, BasicBlock>;
};

/*
 * Each basic block within an instruction graph contains zero or more instructions
 * followed by a terminal node. Note that basic blocks always execute consecutively,
 * there can be no branching within a block other than for an exception. Exceptions
 * can occur pervasively and React runtime is responsible for resetting state when
 * an exception occurs, therefore the block model only represents explicit throw
 * statements and not implicit exceptions which may occur.
 */
export type BlockKind = 'block' | 'value' | 'loop' | 'sequence' | 'catch';

/**
 * Returns true for "block" and "catch" block kinds which correspond to statements
 * in the source, including BlockStatement, CatchStatement.
 *
 * Inverse of isExpressionBlockKind()
 */
export function isStatementBlockKind(kind: BlockKind): boolean {
  return kind === 'block' || kind === 'catch';
}

/**
 * Returns true for "value", "loop", and "sequence" block kinds which correspond to
 * expressions in the source, such as ConditionalExpression, LogicalExpression, loop
 * initializer/test/updaters, etc
 *
 * Inverse of isStatementBlockKind()
 */
export function isExpressionBlockKind(kind: BlockKind): boolean {
  return !isStatementBlockKind(kind);
}

export type BasicBlock = {
  kind: BlockKind;
  id: BlockId;
  instructions: Array<Instruction>;
  terminal: Terminal;
  preds: Set<BlockId>;
  phis: Set<Phi>;
};
export type TBasicBlock<T extends Terminal> = BasicBlock & {terminal: T};

/*
 * Terminal nodes generally represent statements that affect control flow, such as
 * for-of, if-else, return, etc.
 */
export type Terminal =
  | UnsupportedTerminal
  | UnreachableTerminal
  | ThrowTerminal
  | ReturnTerminal
  | GotoTerminal
  | IfTerminal
  | BranchTerminal
  | SwitchTerminal
  | ForTerminal
  | ForOfTerminal
  | ForInTerminal
  | DoWhileTerminal
  | WhileTerminal
  | LogicalTerminal
  | TernaryTerminal
  | OptionalTerminal
  | LabelTerminal
  | SequenceTerminal
  | MaybeThrowTerminal
  | TryTerminal
  | ReactiveScopeTerminal
  | PrunedScopeTerminal;

export type TerminalWithFallthrough = Terminal & {fallthrough: BlockId};

function _staticInvariantTerminalHasLocation(
  terminal: Terminal,
): SourceLocation {
  // If this fails, it is because a variant of Terminal is missing a .loc - add it!
  return terminal.loc;
}

function _staticInvariantTerminalHasInstructionId(
  terminal: Terminal,
): InstructionId {
  // If this fails, it is because a variant of Terminal is missing a .id - add it!
  return terminal.id;
}

function _staticInvariantTerminalHasFallthrough(
  terminal: Terminal,
): BlockId | never | undefined {
  // If this fails, it is because a variant of Terminal is missing a fallthrough annotation
  return terminal.fallthrough;
}

/*
 * Terminal nodes allowed for a value block
 * A terminal that couldn't be lowered correctly.
 */
export type UnsupportedTerminal = {
  kind: 'unsupported';
  id: InstructionId;
  loc: SourceLocation;
  fallthrough?: never;
};

/**
 * Terminal for an unreachable block.
 * Unreachable blocks are emitted when all control flow paths of a if/switch/try block diverge
 * before reaching the fallthrough.
 */
export type UnreachableTerminal = {
  kind: 'unreachable';
  id: InstructionId;
  loc: SourceLocation;
  fallthrough?: never;
};

export type ThrowTerminal = {
  kind: 'throw';
  value: Place;
  id: InstructionId;
  loc: SourceLocation;
  fallthrough?: never;
};
export type Case = {test: Place | null; block: BlockId};

export type ReturnVariant = 'Void' | 'Implicit' | 'Explicit';
export type ReturnTerminal = {
  kind: 'return';
  /**
   * Void:
   *   () => { ... }
   *   function() { ... }
   * Implicit (ArrowFunctionExpression only):
   *   () => foo
   * Explicit:
   *   () => { return ... }
   *   function () { return ... }
   */
  returnVariant: ReturnVariant;
  loc: SourceLocation;
  value: Place;
  id: InstructionId;
  fallthrough?: never;
  effects: Array<AliasingEffect> | null;
};

export type GotoTerminal = {
  kind: 'goto';
  block: BlockId;
  variant: GotoVariant;
  id: InstructionId;
  loc: SourceLocation;
  fallthrough?: never;
};

export enum GotoVariant {
  Break = 'Break',
  Continue = 'Continue',
  Try = 'Try',
}

export type IfTerminal = {
  kind: 'if';
  test: Place;
  consequent: BlockId;
  alternate: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
  loc: SourceLocation;
};

export type BranchTerminal = {
  kind: 'branch';
  test: Place;
  consequent: BlockId;
  alternate: BlockId;
  id: InstructionId;
  loc: SourceLocation;
  fallthrough: BlockId;
};

export type SwitchTerminal = {
  kind: 'switch';
  test: Place;
  cases: Array<Case>;
  fallthrough: BlockId;
  id: InstructionId;
  loc: SourceLocation;
};

export type DoWhileTerminal = {
  kind: 'do-while';
  loop: BlockId;
  test: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
  loc: SourceLocation;
};

export type WhileTerminal = {
  kind: 'while';
  loc: SourceLocation;
  test: BlockId;
  loop: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
};

export type ForTerminal = {
  kind: 'for';
  loc: SourceLocation;
  init: BlockId;
  test: BlockId;
  update: BlockId | null;
  loop: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
};

export type ForOfTerminal = {
  kind: 'for-of';
  loc: SourceLocation;
  init: BlockId;
  test: BlockId;
  loop: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
};

export type ForInTerminal = {
  kind: 'for-in';
  loc: SourceLocation;
  init: BlockId;
  loop: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
};

export type LogicalTerminal = {
  kind: 'logical';
  operator: t.LogicalExpression['operator'];
  test: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
  loc: SourceLocation;
};

export type TernaryTerminal = {
  kind: 'ternary';
  test: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
  loc: SourceLocation;
};

export type LabelTerminal = {
  kind: 'label';
  block: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
  loc: SourceLocation;
};

export type OptionalTerminal = {
  kind: 'optional';
  /*
   * Specifies whether this node was optional. If false, it means that the original
   * node was part of an optional chain but this specific item was non-optional.
   * For example, in `a?.b.c?.()`, the `.b` access is non-optional but appears within
   * an optional chain.
   */
  optional: boolean;
  test: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
  loc: SourceLocation;
};

export type SequenceTerminal = {
  kind: 'sequence';
  block: BlockId;
  fallthrough: BlockId;
  id: InstructionId;
  loc: SourceLocation;
};

export type TryTerminal = {
  kind: 'try';
  block: BlockId;
  handlerBinding: Place | null;
  handler: BlockId;
  // TODO: support `finally`
  fallthrough: BlockId;
  id: InstructionId;
  loc: SourceLocation;
};

export type MaybeThrowTerminal = {
  kind: 'maybe-throw';
  continuation: BlockId;
  handler: BlockId | null;
  id: InstructionId;
  loc: SourceLocation;
  fallthrough?: never;
  effects: Array<AliasingEffect> | null;
};

export type ReactiveScopeTerminal = {
  kind: 'scope';
  fallthrough: BlockId;
  block: BlockId;
  scope: ReactiveScope;
  id: InstructionId;
  loc: SourceLocation;
};

export type PrunedScopeTerminal = {
  kind: 'pruned-scope';
  fallthrough: BlockId;
  block: BlockId;
  scope: ReactiveScope;
  id: InstructionId;
  loc: SourceLocation;
};

/*
 * Instructions generally represent expressions but with all nesting flattened away,
 * such that all operands to each instruction are either primitive values OR are
 * references to a place, which may be a temporary that holds the results of a
 * previous instruction. So `foo(bar(a))` would decompose into two instructions,
 * one to store `tmp0 = bar(a)`, one for `foo(tmp0)`.
 *
 * Instructions generally store their value into a Place, though some instructions
 * may not produce a value that is necessary to track (for example, class definitions)
 * or may occur only for side-effects (many expression statements).
 */
export type Instruction = {
  id: InstructionId;
  lvalue: Place;
  value: InstructionValue;
  loc: SourceLocation;
  effects: Array<AliasingEffect> | null;
};

export type TInstruction<T extends InstructionValue> = {
  id: InstructionId;
  lvalue: Place;
  value: T;
  effects: Array<AliasingEffect> | null;
  loc: SourceLocation;
};

export type LValue = {
  place: Place;
  kind: InstructionKind;
};

export type LValuePattern = {
  pattern: Pattern;
  kind: InstructionKind;
};

export type ArrayExpression = {
  kind: 'ArrayExpression';
  elements: Array<Place | SpreadPattern | Hole>;
  loc: SourceLocation;
};

export type Pattern = ArrayPattern | ObjectPattern;

export type Hole = {
  kind: 'Hole';
};

export type SpreadPattern = {
  kind: 'Spread';
  place: Place;
};

export type ArrayPattern = {
  kind: 'ArrayPattern';
  items: Array<Place | SpreadPattern | Hole>;
  loc: SourceLocation;
};

export type ObjectPattern = {
  kind: 'ObjectPattern';
  properties: Array<ObjectProperty | SpreadPattern>;
  loc: SourceLocation;
};

export type ObjectPropertyKey =
  | {
      kind: 'string';
      name: string;
    }
  | {
      kind: 'identifier';
      name: string;
    }
  | {
      kind: 'computed';
      name: Place;
    }
  | {
      kind: 'number';
      name: number;
    };

export type ObjectProperty = {
  kind: 'ObjectProperty';
  key: ObjectPropertyKey;
  type: 'property' | 'method';
  place: Place;
};

export type LoweredFunction = {
  func: HIRFunction;
};

export type ObjectMethod = {
  kind: 'ObjectMethod';
  loc: SourceLocation;
  loweredFunc: LoweredFunction;
};

export enum InstructionKind {
  // const declaration
  Const = 'Const',
  // let declaration
  Let = 'Let',
  // assing a new value to a let binding
  Reassign = 'Reassign',
  // catch clause binding
  Catch = 'Catch',

  // hoisted const declarations
  HoistedConst = 'HoistedConst',

  // hoisted const declarations
  HoistedLet = 'HoistedLet',

  HoistedFunction = 'HoistedFunction',
  Function = 'Function',
}

export function convertHoistedLValueKind(
  kind: InstructionKind,
): InstructionKind | null {
  switch (kind) {
    case InstructionKind.HoistedLet:
      return InstructionKind.Let;
    case InstructionKind.HoistedConst:
      return InstructionKind.Const;
    case InstructionKind.HoistedFunction:
      return InstructionKind.Function;
    case InstructionKind.Let:
    case InstructionKind.Const:
    case InstructionKind.Function:
    case InstructionKind.Reassign:
    case InstructionKind.Catch:
      return null;
    default:
      assertExhaustive(kind, 'Unexpected lvalue kind');
  }
}

function _staticInvariantInstructionValueHasLocation(
  value: InstructionValue,
): SourceLocation {
  // If this fails, it is because a variant of InstructionValue is missing a .loc - add it!
  return value.loc;
}

export type Phi = {
  kind: 'Phi';
  place: Place;
  operands: Map<BlockId, Place>;
};

/**
 * Valid ManualMemoDependencies are always of the form
 * `sourceDeclaredVariable.a.b?.c`, since this is documented
 * and enforced by the `react-hooks/exhaustive-deps` rule.
 *
 * `root` must either reference a ValidatedIdentifier or a global
 * variable.
 */
export type ManualMemoDependency = {
  root:
    | {
        kind: 'NamedLocal';
        value: Place;
        constant: boolean;
      }
    | {kind: 'Global'; identifierName: string};
  path: DependencyPath;
  loc: SourceLocation;
};

export type StartMemoize = {
  kind: 'StartMemoize';
  // Start/FinishMemoize markers should have matching ids
  manualMemoId: number;
  /**
   * deps-list from source code, or null if one was not provided
   * (e.g. useMemo without a second arg)
   */
  deps: Array<ManualMemoDependency> | null;
  /**
   * The source location of the dependencies argument. Used for
   * emitting diagnostics with a suggested replacement
   */
  depsLoc: SourceLocation | null;
  hasInvalidDeps?: true;
  loc: SourceLocation;
};
export type FinishMemoize = {
  kind: 'FinishMemoize';
  // Start/FinishMemoize markers should have matching ids
  manualMemoId: number;
  decl: Place;
  pruned?: true;
  loc: SourceLocation;
};

/*
 * Forget currently does not handle MethodCall correctly in
 * all cases. Specifically, we do not bind the receiver and method property
 * before calling to args. Until we add a SequenceExpression to inline all
 * instructions generated when lowering args, we have a limited representation
 * with some constraints.
 *
 * Forget currently makes these assumptions (checked in codegen):
 *   - {@link MethodCall.property} is a temporary produced by a PropertyLoad or ComputedLoad
 *     on {@link MethodCall.receiver}
 *   - {@link MethodCall.property} remains an rval (i.e. never promoted to a
 *     named identifier). We currently rely on this for codegen.
 *
 * Type inference does not currently guarantee that {@link MethodCall.property}
 * is a FunctionType.
 */
export type MethodCall = {
  kind: 'MethodCall';
  receiver: Place;
  property: Place;
  args: Array<Place | SpreadPattern>;
  loc: SourceLocation;
};

export type CallExpression = {
  kind: 'CallExpression';
  callee: Place;
  args: Array<Place | SpreadPattern>;
  loc: SourceLocation;
  typeArguments?: Array<t.FlowType>;
};

export type NewExpression = {
  kind: 'NewExpression';
  callee: Place;
  args: Array<Place | SpreadPattern>;
  loc: SourceLocation;
};

export type LoadLocal = {
  kind: 'LoadLocal';
  place: Place;
  loc: SourceLocation;
};
export type LoadContext = {
  kind: 'LoadContext';
  place: Place;
  loc: SourceLocation;
};

/*
 * The value of a given instruction. Note that values are not recursive: complex
 * values such as objects or arrays are always defined by instructions to define
 * their operands (saving to a temporary), then passing those temporaries as
 * the operands to the final instruction (ObjectExpression, ArrayExpression, etc).
 *
 * Operands are therefore always a Place.
 */

export type InstructionValue =
  | LoadLocal
  | LoadContext
  | {
      kind: 'DeclareLocal';
      lvalue: LValue;
      type: t.FlowType | t.TSType | null;
      loc: SourceLocation;
    }
  | {
      kind: 'DeclareContext';
      lvalue: {
        kind:
          | InstructionKind.Let
          | InstructionKind.HoistedConst
          | InstructionKind.HoistedLet
          | InstructionKind.HoistedFunction;
        place: Place;
      };
      loc: SourceLocation;
    }
  | StoreLocal
  | {
      kind: 'StoreContext';
      /**
       * StoreContext kinds:
       * Reassign: context variable reassignment in source
       * Const:    const declaration + assignment in source
       *           ('const' context vars are ones whose declarations are hoisted)
       * Let:      let declaration + assignment in source
       * Function: function declaration in source (similar to `const`)
       */
      lvalue: {
        kind:
          | InstructionKind.Reassign
          | InstructionKind.Const
          | InstructionKind.Let
          | InstructionKind.Function;
        place: Place;
      };
      value: Place;
      loc: SourceLocation;
    }
  | Destructure
  | {
      kind: 'Primitive';
      value: number | boolean | string | null | undefined;
      loc: SourceLocation;
    }
  | JSXText
  | {
      kind: 'BinaryExpression';
      operator: Exclude<t.BinaryExpression['operator'], '|>'>;
      left: Place;
      right: Place;
      loc: SourceLocation;
    }
  | NewExpression
  | CallExpression
  | MethodCall
  | {
      kind: 'UnaryExpression';
      operator: Exclude<t.UnaryExpression['operator'], 'throw' | 'delete'>;
      value: Place;
      loc: SourceLocation;
    }
  | ({
      kind: 'TypeCastExpression';
      value: Place;
      type: Type;
      loc: SourceLocation;
    } & (
      | {
          typeAnnotation: t.FlowType;
          typeAnnotationKind: 'cast';
        }
      | {
          typeAnnotation: t.TSType;
          typeAnnotationKind: 'as' | 'satisfies';
        }
    ))
  | JsxExpression
  | {
      kind: 'ObjectExpression';
      properties: Array<ObjectProperty | SpreadPattern>;
      loc: SourceLocation;
    }
  | ObjectMethod
  | ArrayExpression
  | {kind: 'JsxFragment'; children: Array<Place>; loc: SourceLocation}
  | {
      kind: 'RegExpLiteral';
      pattern: string;
      flags: string;
      loc: SourceLocation;
    }
  | {
      kind: 'MetaProperty';
      meta: string;
      property: string;
      loc: SourceLocation;
    }

  // store `object.property = value`
  | {
      kind: 'PropertyStore';
      object: Place;
      property: PropertyLiteral;
      value: Place;
      loc: SourceLocation;
    }
  // load `object.property`
  | PropertyLoad
  // `delete object.property`
  | {
      kind: 'PropertyDelete';
      object: Place;
      property: PropertyLiteral;
      loc: SourceLocation;
    }

  // store `object[index] = value` - like PropertyStore but with a dynamic property
  | {
      kind: 'ComputedStore';
      object: Place;
      property: Place;
      value: Place;
      loc: SourceLocation;
    }
  // load `object[index]` - like PropertyLoad but with a dynamic property
  | {
      kind: 'ComputedLoad';
      object: Place;
      property: Place;
      loc: SourceLocation;
    }
  // `delete object[property]`
  | {
      kind: 'ComputedDelete';
      object: Place;
      property: Place;
      loc: SourceLocation;
    }
  | LoadGlobal
  | StoreGlobal
  | FunctionExpression
  | {
      kind: 'TaggedTemplateExpression';
      tag: Place;
      value: {raw: string; cooked?: string};
      loc: SourceLocation;
    }
  | {
      kind: 'TemplateLiteral';
      subexprs: Array<Place>;
      quasis: Array<{raw: string; cooked?: string}>;
      loc: SourceLocation;
    }
  | {
      kind: 'Await';
      value: Place;
      loc: SourceLocation;
    }
  | {
      kind: 'GetIterator';
      collection: Place; // the collection
      loc: SourceLocation;
    }
  | {
      kind: 'IteratorNext';
      iterator: Place; // the iterator created with GetIterator
      collection: Place; // the collection being iterated over (which may be an iterable or iterator)
      loc: SourceLocation;
    }
  | {
      kind: 'NextPropertyOf';
      value: Place; // the collection
      loc: SourceLocation;
    }
  /*
   * Models a prefix update expression such as --x or ++y
   * This instructions increments or decrements the <lvalue>
   * but evaluates to the value of <value> prior to the update.
   */
  | {
      kind: 'PrefixUpdate';
      lvalue: Place;
      operation: t.UpdateExpression['operator'];
      value: Place;
      loc: SourceLocation;
    }
  /*
   * Models a postfix update expression such as x-- or y++
   * This instructions increments or decrements the <lvalue>
   * and evaluates to the value after the update
   */
  | {
      kind: 'PostfixUpdate';
      lvalue: Place;
      operation: t.UpdateExpression['operator'];
      value: Place;
      loc: SourceLocation;
    }
  // `debugger` statement
  | {kind: 'Debugger'; loc: SourceLocation}
  /*
   * Represents semantic information from useMemo/useCallback that the developer
   * has indicated a particular value should be memoized. This value is ignored
   * unless the TODO flag is enabled.
   *
   * NOTE: the Memoize instruction is intended for side-effects only, and is pruned
   * during codegen. It can't be pruned during DCE because we need to preserve the
   * instruction so it can be visible in InferReferenceEffects.
   */
  | StartMemoize
  | FinishMemoize
  /*
   * Catch-all for statements such as type imports, nested class declarations, etc
   * which are not directly represented, but included for completeness and to allow
   * passing through in codegen.
   */
  | {
      kind: 'UnsupportedNode';
      node: t.Node;
      loc: SourceLocation;
    };

export type JsxExpression = {
  kind: 'JsxExpression';
  tag: Place | BuiltinTag;
  props: Array<JsxAttribute>;
  children: Array<Place> | null; // null === no children
  loc: SourceLocation;
  openingLoc: SourceLocation;
  closingLoc: SourceLocation;
};

export type JsxAttribute =
  | {kind: 'JsxSpreadAttribute'; argument: Place}
  | {kind: 'JsxAttribute'; name: string; place: Place};

export type FunctionExpression = {
  kind: 'FunctionExpression';
  name: ValidIdentifierName | null;
  nameHint: string | null;
  loweredFunc: LoweredFunction;
  type:
    | 'ArrowFunctionExpression'
    | 'FunctionExpression'
    | 'FunctionDeclaration';
  loc: SourceLocation;
};

export type Destructure = {
  kind: 'Destructure';
  lvalue: LValuePattern;
  value: Place;
  loc: SourceLocation;
};

/*
 * A place where data may be read from / written to:
 * - a variable (identifier)
 * - a path into an identifier
 */
export type Place = {
  kind: 'Identifier';
  identifier: Identifier;
  effect: Effect;
  reactive: boolean;
  loc: SourceLocation;
};

// A primitive value with a specific (constant) value.
export type Primitive = {
  kind: 'Primitive';
  value: number | boolean | string | null | undefined;
  loc: SourceLocation;
};

export type JSXText = {kind: 'JSXText'; value: string; loc: SourceLocation};

export type StoreLocal = {
  kind: 'StoreLocal';
  lvalue: LValue;
  value: Place;
  type: t.FlowType | t.TSType | null;
  loc: SourceLocation;
};
export type PropertyLoad = {
  kind: 'PropertyLoad';
  object: Place;
  property: PropertyLiteral;
  loc: SourceLocation;
};

export type LoadGlobal = {
  kind: 'LoadGlobal';
  binding: NonLocalBinding;
  loc: SourceLocation;
};

export type StoreGlobal = {
  kind: 'StoreGlobal';
  name: string;
  value: Place;
  loc: SourceLocation;
};

export type BuiltinTag = {
  kind: 'BuiltinTag';
  name: string;
  loc: SourceLocation;
};

/*
 * Range in which an identifier is mutable. Start and End refer to Instruction.id.
 *
 * Start is inclusive, End is exclusive (ie, end is the "first" instruction for which
 * the value is not mutable).
 */
export type MutableRange = {
  start: InstructionId;
  end: InstructionId;
};

export type VariableBinding =
  // let, const, etc declared within the current component/hook
  | {kind: 'Identifier'; identifier: Identifier; bindingKind: BindingKind}
  // bindings declard outside the current component/hook
  | NonLocalBinding;

// `import {bar as baz} from 'foo'`: name=baz, module=foo, imported=bar
export type NonLocalImportSpecifier = {
  kind: 'ImportSpecifier';
  name: string;
  module: string;
  imported: string;
};

export type NonLocalBinding =
  // `import Foo from 'foo'`: name=Foo, module=foo
  | {kind: 'ImportDefault'; name: string; module: string}
  // `import * as Foo from 'foo'`: name=Foo, module=foo
  | {kind: 'ImportNamespace'; name: string; module: string}
  // `import {bar as baz} from 'foo'`
  | NonLocalImportSpecifier
  // let, const, function, etc declared in the module but outside the current component/hook
  | {kind: 'ModuleLocal'; name: string}
  // an unresolved binding
  | {kind: 'Global'; name: string};

// Represents a user-defined variable (has a name) or a temporary variable (no name).
export type Identifier = {
  /**
   * After EnterSSA, `id` uniquely identifies an SSA instance of a variable.
   * Before EnterSSA, `id` matches `declarationId`.
   */
  id: IdentifierId;

  /**
   * Uniquely identifies a given variable in the original program. If a value is
   * reassigned in the original program each reassigned value will have a distinct
   * `id` (after EnterSSA), but they will still have the same `declarationId`.
   */
  declarationId: DeclarationId;

  // null for temporaries. name is primarily used for debugging.
  name: IdentifierName | null;
  // The range for which this variable is mutable
  mutableRange: MutableRange;
  /*
   * The ID of the reactive scope which will compute this value. Multiple
   * variables may have the same scope id.
   */
  scope: ReactiveScope | null;
  type: Type;
  loc: SourceLocation;
};

export type IdentifierName = ValidatedIdentifier | PromotedIdentifier;
export type ValidatedIdentifier = {kind: 'named'; value: ValidIdentifierName};
export type PromotedIdentifier = {kind: 'promoted'; value: string};

/**
 * Simulated opaque type for identifier names to ensure values can only be created
 * through the below helpers.
 */
const opaqueValidIdentifierName = Symbol();
export type ValidIdentifierName = string & {
  [opaqueValidIdentifierName]: 'ValidIdentifierName';
};

export function makeTemporaryIdentifier(
  id: IdentifierId,
  loc: SourceLocation,
): Identifier {
  return {
    id,
    name: null,
    declarationId: makeDeclarationId(id),
    mutableRange: {start: makeInstructionId(0), end: makeInstructionId(0)},
    scope: null,
    type: makeType(),
    loc,
  };
}

export function forkTemporaryIdentifier(
  id: IdentifierId,
  source: Identifier,
): Identifier {
  return {
    ...source,
    mutableRange: {start: makeInstructionId(0), end: makeInstructionId(0)},
    id,
  };
}

export function validateIdentifierName(
  name: string,
): Result<ValidatedIdentifier, CompilerError> {
  if (isReservedWord(name)) {
    const error = new CompilerError();
    error.pushDiagnostic(
      CompilerDiagnostic.create({
        category: ErrorCategory.Syntax,
        reason: 'Expected a non-reserved identifier name',
        description: `\`${name}\` is a reserved word in JavaScript and cannot be used as an identifier name`,
        suggestions: null,
      }).withDetails({
        kind: 'error',
        loc: GeneratedSource,
        message: 'reserved word',
      }),
    );
    return Err(error);
  } else if (!t.isValidIdentifier(name)) {
    const error = new CompilerError();
    error.pushDiagnostic(
      CompilerDiagnostic.create({
        category: ErrorCategory.Syntax,
        reason: `Expected a valid identifier name`,
        description: `\`${name}\` is not a valid JavaScript identifier`,
        suggestions: null,
      }).withDetails({
        kind: 'error',
        loc: GeneratedSource,
        message: 'reserved word',
      }),
    );
  }
  return Ok({
    kind: 'named',
    value: name as ValidIdentifierName,
  });
}

/**
 * Creates a valid identifier name. This should *not* be used for synthesizing
 * identifier names: only call this method for identifier names that appear in the
 * original source code.
 */
export function makeIdentifierName(name: string): ValidatedIdentifier {
  return validateIdentifierName(name).unwrap();
}

/**
 * Given an unnamed identifier, promote it to a named identifier.
 *
 * Note: this uses the identifier's DeclarationId to ensure that all
 * instances of the same declaration will have the same name.
 */
export function promoteTemporary(identifier: Identifier): void {
  CompilerError.invariant(identifier.name === null, {
    reason: `Expected a temporary (unnamed) identifier`,
    description: `Identifier already has a name, \`${identifier.name}\``,
    loc: GeneratedSource,
  });
  identifier.name = {
    kind: 'promoted',
    value: `#t${identifier.declarationId}`,
  };
}

export function isPromotedTemporary(name: string): boolean {
  return name.startsWith('#t');
}

/**
 * Given an unnamed identifier, promote it to a named identifier, distinguishing
 * it as a value that needs to be capitalized since it appears in JSX element tag position
 *
 * Note: this uses the identifier's DeclarationId to ensure that all
 * instances of the same declaration will have the same name.
 */
export function promoteTemporaryJsxTag(identifier: Identifier): void {
  CompilerError.invariant(identifier.name === null, {
    reason: `Expected a temporary (unnamed) identifier`,
    description: `Identifier already has a name, \`${identifier.name}\``,
    loc: GeneratedSource,
  });
  identifier.name = {
    kind: 'promoted',
    value: `#T${identifier.declarationId}`,
  };
}

export function isPromotedJsxTemporary(name: string): boolean {
  return name.startsWith('#T');
}

export type AbstractValue = {
  kind: ValueKind;
  reason: ReadonlySet<ValueReason>;
  context: ReadonlySet<Place>;
};

/**
 * The reason for the kind of a value.
 */
export enum ValueReason {
  /**
   * Defined outside the React function.
   */
  Global = 'global',

  /**
   * Used in a JSX expression.
   */
  JsxCaptured = 'jsx-captured',

  /**
   * Argument to a hook
   */
  HookCaptured = 'hook-captured',

  /**
   * Return value of a hook
   */
  HookReturn = 'hook-return',

  /**
   * Passed to an effect
   */
  Effect = 'effect',

  /**
   * Return value of a function with known frozen return value, e.g. `useState`.
   */
  KnownReturnSignature = 'known-return-signature',

  /**
   * A value returned from `useContext`
   */
  Context = 'context',

  /**
   * A value returned from `useState`
   */
  State = 'state',

  /**
   * A value returned from `useReducer`
   */
  ReducerState = 'reducer-state',

  /**
   * Props of a component or arguments of a hook.
   */
  ReactiveFunctionArgument = 'reactive-function-argument',

  Other = 'other',
}

/*
 * Distinguish between different kinds of values relevant to inference purposes:
 * see the main docblock for the module for details.
 */
export enum ValueKind {
  MaybeFrozen = 'maybefrozen',
  Frozen = 'frozen',
  Primitive = 'primitive',
  Global = 'global',
  Mutable = 'mutable',
  Context = 'context',
}

export const ValueKindSchema = z.enum([
  ValueKind.MaybeFrozen,
  ValueKind.Frozen,
  ValueKind.Primitive,
  ValueKind.Global,
  ValueKind.Mutable,
  ValueKind.Context,
]);

export const ValueReasonSchema = z.enum([
  ValueReason.Context,
  ValueReason.Effect,
  ValueReason.Global,
  ValueReason.HookCaptured,
  ValueReason.HookReturn,
  ValueReason.JsxCaptured,
  ValueReason.KnownReturnSignature,
  ValueReason.Other,
  ValueReason.ReactiveFunctionArgument,
  ValueReason.ReducerState,
  ValueReason.State,
]);

// The effect with which a value is modified.
export enum Effect {
  // Default value: not allowed after lifetime inference
  Unknown = '<unknown>',
  // This reference freezes the value (corresponds to a place where codegen should emit a freeze instruction)
  Freeze = 'freeze',
  // This reference reads the value
  Read = 'read',
  // This reference reads and stores the value
  Capture = 'capture',
  ConditionallyMutateIterator = 'mutate-iterator?',
  /*
   * This reference *may* write to (mutate) the value. This covers two similar cases:
   * - The compiler is being conservative and assuming that a value *may* be mutated
   * - The effect is polymorphic: mutable values may be mutated, non-mutable values
   *   will not be mutated.
   * In both cases, we conservatively assume that mutable values will be mutated.
   * But we do not error if the value is known to be immutable.
   */
  ConditionallyMutate = 'mutate?',

  /*
   * This reference *does* write to (mutate) the value. It is an error (invalid input)
   * if an immutable value flows into a location with this effect.
   */
  Mutate = 'mutate',
  // This reference may alias to (mutate) the value
  Store = 'store',
}
export const EffectSchema = z.enum([
  Effect.Read,
  Effect.Mutate,
  Effect.ConditionallyMutate,
  Effect.ConditionallyMutateIterator,
  Effect.Capture,
  Effect.Store,
  Effect.Freeze,
]);

export function isMutableEffect(
  effect: Effect,
  location: SourceLocation,
): boolean {
  switch (effect) {
    case Effect.Capture:
    case Effect.Store:
    case Effect.ConditionallyMutate:
    case Effect.ConditionallyMutateIterator:
    case Effect.Mutate: {
      return true;
    }

    case Effect.Unknown: {
      CompilerError.invariant(false, {
        reason: 'Unexpected unknown effect',
        loc: location,
      });
    }
    case Effect.Read:
    case Effect.Freeze: {
      return false;
    }
    default: {
      assertExhaustive(effect, `Unexpected effect \`${effect}\``);
    }
  }
}

export type ReactiveScope = {
  id: ScopeId;
  range: MutableRange;

  /**
   * The inputs to this reactive scope
   */
  dependencies: ReactiveScopeDependencies;

  /**
   * The set of values produced by this scope. This may be empty
   * for scopes that produce reassignments only.
   */
  declarations: Map<IdentifierId, ReactiveScopeDeclaration>;

  /**
   * A mutable range may sometimes include a reassignment of some variable.
   * This is the set of identifiers which are reassigned by this scope.
   */
  reassignments: Set<Identifier>;

  /**
   * Reactive scopes may contain a return statement, which needs to be replayed
   * whenever the inputs to the scope have not changed since the previous execution.
   * If the reactive scope has an early return, this variable stores the temporary
   * identifier to which the return value will be assigned. See PropagateEarlyReturns
   * for more about how early returns in reactive scopes are compiled and represented.
   *
   * This value is null for scopes that do not contain early returns.
   */
  earlyReturnValue: {
    value: Identifier;
    loc: SourceLocation;
    label: BlockId;
  } | null;

  /*
   * Some passes may merge scopes together. The merged set contains the
   * ids of scopes that were merged into this one, for passes that need
   * to track which scopes are still present (in some form) vs scopes that
   * no longer exist due to being pruned.
   */
  merged: Set<ScopeId>;

  loc: SourceLocation;
};

export type ReactiveScopeDependencies = Set<ReactiveScopeDependency>;

export type ReactiveScopeDeclaration = {
  identifier: Identifier;
  scope: ReactiveScope; // the scope in which the variable was originally declared
};

const opaquePropertyLiteral = Symbol();
export type PropertyLiteral = (string | number) & {
  [opaquePropertyLiteral]: 'PropertyLiteral';
};
export function makePropertyLiteral(value: string | number): PropertyLiteral {
  return value as PropertyLiteral;
}
export type DependencyPathEntry = {
  property: PropertyLiteral;
  optional: boolean;
  loc: SourceLocation;
};
export type DependencyPath = Array<DependencyPathEntry>;
export type ReactiveScopeDependency = {
  identifier: Identifier;
  /**
   * Reflects whether the base identifier is reactive. Note that some reactive
   * objects may have non-reactive properties, but we do not currently track
   * this.
   *
   * ```js
   * // Technically, result[0] is reactive and result[1] is not.
   * // Currently, both dependencies would be marked as reactive.
   * const result = useState();
   * ```
   */
  reactive: boolean;
  path: DependencyPath;
  loc: SourceLocation;
};

export function areEqualPaths(a: DependencyPath, b: DependencyPath): boolean {
  return (
    a.length === b.length &&
    a.every(
      (item, ix) =>
        item.property === b[ix].property && item.optional === b[ix].optional,
    )
  );
}
export function isSubPath(
  subpath: DependencyPath,
  path: DependencyPath,
): boolean {
  return (
    subpath.length <= path.length &&
    subpath.every(
      (item, ix) =>
        item.property === path[ix].property &&
        item.optional === path[ix].optional,
    )
  );
}
export function isSubPathIgnoringOptionals(
  subpath: DependencyPath,
  path: DependencyPath,
): boolean {
  return (
    subpath.length <= path.length &&
    subpath.every((item, ix) => item.property === path[ix].property)
  );
}

export function getPlaceScope(
  id: InstructionId,
  place: Place,
): ReactiveScope | null {
  const scope = place.identifier.scope;
  if (scope !== null && isScopeActive(scope, id)) {
    return scope;
  }
  return null;
}

function isScopeActive(scope: ReactiveScope, id: InstructionId): boolean {
  return id >= scope.range.start && id < scope.range.end;
}

/*
 * Simulated opaque type for BlockIds to prevent using normal numbers as block ids
 * accidentally.
 */
const opaqueBlockId = Symbol();
export type BlockId = number & {[opaqueBlockId]: 'BlockId'};

export function makeBlockId(id: number): BlockId {
  CompilerError.invariant(id >= 0 && Number.isInteger(id), {
    reason: 'Expected block id to be a non-negative integer',
    loc: GeneratedSource,
  });
  return id as BlockId;
}

/*
 * Simulated opaque type for ScopeIds to prevent using normal numbers as scope ids
 * accidentally.
 */
const opaqueScopeId = Symbol();
export type ScopeId = number & {[opaqueScopeId]: 'ScopeId'};

export function makeScopeId(id: number): ScopeId {
  CompilerError.invariant(id >= 0 && Number.isInteger(id), {
    reason: 'Expected block id to be a non-negative integer',
    loc: GeneratedSource,
  });
  return id as ScopeId;
}

/*
 * Simulated opaque type for IdentifierId to prevent using normal numbers as ids
 * accidentally.
 */
const opaqueIdentifierId = Symbol();
export type IdentifierId = number & {[opaqueIdentifierId]: 'IdentifierId'};

export function makeIdentifierId(id: number): IdentifierId {
  CompilerError.invariant(id >= 0 && Number.isInteger(id), {
    reason: 'Expected identifier id to be a non-negative integer',
    loc: GeneratedSource,
  });
  return id as IdentifierId;
}

/*
 * Simulated opaque type for IdentifierId to prevent using normal numbers as ids
 * accidentally.
 */
const opageDeclarationId = Symbol();
export type DeclarationId = number & {[opageDeclarationId]: 'DeclarationId'};

export function makeDeclarationId(id: number): DeclarationId {
  CompilerError.invariant(id >= 0 && Number.isInteger(id), {
    reason: 'Expected declaration id to be a non-negative integer',
    loc: GeneratedSource,
  });
  return id as DeclarationId;
}

/*
 * Simulated opaque type for InstructionId to prevent using normal numbers as ids
 * accidentally.
 */
const opaqueInstructionId = Symbol();
export type InstructionId = number & {[opaqueInstructionId]: 'IdentifierId'};

export function makeInstructionId(id: number): InstructionId {
  CompilerError.invariant(id >= 0 && Number.isInteger(id), {
    reason: 'Expected instruction id to be a non-negative integer',
    loc: GeneratedSource,
  });
  return id as InstructionId;
}

export function isObjectMethodType(id: Identifier): boolean {
  return id.type.kind == 'ObjectMethod';
}

export function isObjectType(id: Identifier): boolean {
  return id.type.kind === 'Object';
}

export function isPrimitiveType(id: Identifier): boolean {
  return id.type.kind === 'Primitive';
}

export function isPlainObjectType(id: Identifier): boolean {
  return id.type.kind === 'Object' && id.type.shapeId === 'BuiltInObject';
}

export function isArrayType(id: Identifier): boolean {
  return id.type.kind === 'Object' && id.type.shapeId === 'BuiltInArray';
}

export function isMapType(id: Identifier): boolean {
  return id.type.kind === 'Object' && id.type.shapeId === 'BuiltInMap';
}

export function isSetType(id: Identifier): boolean {
  return id.type.kind === 'Object' && id.type.shapeId === 'BuiltInSet';
}

export function isPropsType(id: Identifier): boolean {
  return id.type.kind === 'Object' && id.type.shapeId === 'BuiltInProps';
}

export function isRefValueType(id: Identifier): boolean {
  return id.type.kind === 'Object' && id.type.shapeId === 'BuiltInRefValue';
}

export function isUseRefType(id: Identifier): boolean {
  return id.type.kind === 'Object' && id.type.shapeId === 'BuiltInUseRefId';
}

export function isUseStateType(id: Identifier): boolean {
  return id.type.kind === 'Object' && id.type.shapeId === 'BuiltInUseState';
}

export function isJsxType(type: Type): boolean {
  return type.kind === 'Object' && type.shapeId === 'BuiltInJsx';
}

export function isRefOrRefValue(id: Identifier): boolean {
  return isUseRefType(id) || isRefValueType(id);
}

/*
 * Returns true if the type is a Ref or a custom user type that acts like a ref when it
 * shouldn't. For now the only other case of this is Reanimated's shared values.
 */
export function isRefOrRefLikeMutableType(type: Type): boolean {
  return (
    type.kind === 'Object' &&
    (type.shapeId === 'BuiltInUseRefId' ||
      type.shapeId == 'ReanimatedSharedValueId')
  );
}

export function isSetStateType(id: Identifier): boolean {
  return id.type.kind === 'Function' && id.type.shapeId === 'BuiltInSetState';
}

export function isUseActionStateType(id: Identifier): boolean {
  return (
    id.type.kind === 'Object' && id.type.shapeId === 'BuiltInUseActionState'
  );
}

export function isStartTransitionType(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' && id.type.shapeId === 'BuiltInStartTransition'
  );
}

export function isUseOptimisticType(id: Identifier): boolean {
  return (
    id.type.kind === 'Object' && id.type.shapeId === 'BuiltInUseOptimistic'
  );
}

export function isSetOptimisticType(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' && id.type.shapeId === 'BuiltInSetOptimistic'
  );
}

export function isSetActionStateType(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' && id.type.shapeId === 'BuiltInSetActionState'
  );
}

export function isUseReducerType(id: Identifier): boolean {
  return id.type.kind === 'Function' && id.type.shapeId === 'BuiltInUseReducer';
}

export function isDispatcherType(id: Identifier): boolean {
  return id.type.kind === 'Function' && id.type.shapeId === 'BuiltInDispatch';
}

export function isEffectEventFunctionType(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' &&
    id.type.shapeId === 'BuiltInEffectEventFunction'
  );
}

export function isStableType(id: Identifier): boolean {
  return (
    isSetStateType(id) ||
    isSetActionStateType(id) ||
    isDispatcherType(id) ||
    isUseRefType(id) ||
    isStartTransitionType(id) ||
    isSetOptimisticType(id)
  );
}

export function isStableTypeContainer(id: Identifier): boolean {
  const type_ = id.type;
  if (type_.kind !== 'Object') {
    return false;
  }
  return (
    isUseStateType(id) || // setState
    isUseActionStateType(id) || // setActionState
    isUseReducerType(id) || // dispatcher
    isUseOptimisticType(id) || // setOptimistic
    type_.shapeId === 'BuiltInUseTransition' // startTransition
  );
}

export function evaluatesToStableTypeOrContainer(
  env: Environment,
  {value}: Instruction,
): boolean {
  if (value.kind === 'CallExpression' || value.kind === 'MethodCall') {
    const callee =
      value.kind === 'CallExpression' ? value.callee : value.property;

    const calleeHookKind = getHookKind(env, callee.identifier);
    switch (calleeHookKind) {
      case 'useState':
      case 'useReducer':
      case 'useActionState':
      case 'useRef':
      case 'useTransition':
      case 'useOptimistic':
        return true;
    }
  }
  return false;
}

export function isUseEffectHookType(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' && id.type.shapeId === 'BuiltInUseEffectHook'
  );
}
export function isUseLayoutEffectHookType(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' &&
    id.type.shapeId === 'BuiltInUseLayoutEffectHook'
  );
}
export function isUseInsertionEffectHookType(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' &&
    id.type.shapeId === 'BuiltInUseInsertionEffectHook'
  );
}
export function isUseEffectEventType(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' && id.type.shapeId === 'BuiltInUseEffectEvent'
  );
}

export function isUseContextHookType(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' && id.type.shapeId === 'BuiltInUseContextHook'
  );
}

export function getHookKind(env: Environment, id: Identifier): HookKind | null {
  return getHookKindForType(env, id.type);
}

export function isUseOperator(id: Identifier): boolean {
  return (
    id.type.kind === 'Function' && id.type.shapeId === 'BuiltInUseOperator'
  );
}

export function getHookKindForType(
  env: Environment,
  type: Type,
): HookKind | null {
  if (type.kind === 'Function') {
    const signature = env.getFunctionSignature(type);
    return signature?.hookKind ?? null;
  }
  return null;
}

export * from './Types';
