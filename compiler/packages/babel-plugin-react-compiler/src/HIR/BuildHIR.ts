/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {NodePath, Scope} from '@babel/traverse';
import * as t from '@babel/types';
import invariant from 'invariant';
import {
  CompilerDiagnostic,
  CompilerError,
  CompilerErrorDetail,
  CompilerSuggestionOperation,
  ErrorCategory,
} from '../CompilerError';
import {assertExhaustive, hasNode} from '../Utils/utils';
import {Environment} from './Environment';
import {
  ArrayExpression,
  ArrayPattern,
  BlockId,
  BranchTerminal,
  BuiltinTag,
  Case,
  Effect,
  GeneratedSource,
  GotoVariant,
  HIRFunction,
  IfTerminal,
  InstructionKind,
  InstructionValue,
  JsxAttribute,
  LoweredFunction,
  ObjectPattern,
  ObjectProperty,
  ObjectPropertyKey,
  Place,
  PropertyLiteral,
  ReturnTerminal,
  SourceLocation,
  SpreadPattern,
  ThrowTerminal,
  Type,
  makeInstructionId,
  makePropertyLiteral,
  makeType,
  promoteTemporary,
  validateIdentifierName,
} from './HIR';
import HIRBuilder, {Bindings, createTemporaryPlace} from './HIRBuilder';
import {BuiltInArrayId} from './ObjectShape';

/*
 * *******************************************************************************************
 * *******************************************************************************************
 * ************************************* Lowering to HIR *************************************
 * *******************************************************************************************
 * *******************************************************************************************
 */

/*
 * Converts a function into a high-level intermediate form (HIR) which represents
 * the code as a control-flow graph. All normal control-flow is modeled as accurately
 * as possible to allow precise, expression-level memoization. The main exceptions are
 * try/catch statements and exceptions: we currently bail out (skip compilation) for
 * try/catch and do not attempt to model control flow of exceptions, which can occur
 * ~anywhere in JavaScript. The compiler assumes that exceptions will be handled by
 * the runtime, ie by invalidating memoization.
 */
export function lower(
  func: NodePath<t.Function>,
  env: Environment,
  // Bindings captured from the outer function, in case lower() is called recursively (for lambdas)
  bindings: Bindings | null = null,
  capturedRefs: Map<t.Identifier, SourceLocation> = new Map(),
): HIRFunction {
  const builder = new HIRBuilder(env, {
    bindings,
    context: capturedRefs,
  });
  const context: HIRFunction['context'] = [];

  for (const [ref, loc] of capturedRefs ?? []) {
    context.push({
      kind: 'Identifier',
      identifier: builder.resolveBinding(ref),
      effect: Effect.Unknown,
      reactive: false,
      loc,
    });
  }

  let id: string | null = null;
  if (func.isFunctionDeclaration() || func.isFunctionExpression()) {
    const idNode = (
      func as NodePath<t.FunctionDeclaration | t.FunctionExpression>
    ).get('id');
    if (hasNode(idNode)) {
      id = idNode.node.name;
    }
  }
  const params: Array<Place | SpreadPattern> = [];
  func.get('params').forEach(param => {
    if (param.isIdentifier()) {
      const binding = builder.resolveIdentifier(param);
      if (binding.kind !== 'Identifier') {
        builder.recordError(
          CompilerDiagnostic.create({
            category: ErrorCategory.Invariant,
            reason: 'Could not find binding',
            description: `[BuildHIR] Could not find binding for param \`${param.node.name}\``,
          }).withDetails({
            kind: 'error',
            loc: param.node.loc ?? null,
            message: 'Could not find binding',
          }),
        );
        return;
      }
      const place: Place = {
        kind: 'Identifier',
        identifier: binding.identifier,
        effect: Effect.Unknown,
        reactive: false,
        loc: param.node.loc ?? GeneratedSource,
      };
      params.push(place);
    } else if (
      param.isObjectPattern() ||
      param.isArrayPattern() ||
      param.isAssignmentPattern()
    ) {
      const place: Place = {
        kind: 'Identifier',
        identifier: builder.makeTemporary(param.node.loc ?? GeneratedSource),
        effect: Effect.Unknown,
        reactive: false,
        loc: param.node.loc ?? GeneratedSource,
      };
      promoteTemporary(place.identifier);
      params.push(place);
      lowerAssignment(
        builder,
        param.node.loc ?? GeneratedSource,
        InstructionKind.Let,
        param,
        place,
        'Assignment',
      );
    } else if (param.isRestElement()) {
      const place: Place = {
        kind: 'Identifier',
        identifier: builder.makeTemporary(param.node.loc ?? GeneratedSource),
        effect: Effect.Unknown,
        reactive: false,
        loc: param.node.loc ?? GeneratedSource,
      };
      params.push({
        kind: 'Spread',
        place,
      });
      lowerAssignment(
        builder,
        param.node.loc ?? GeneratedSource,
        InstructionKind.Let,
        param.get('argument'),
        place,
        'Assignment',
      );
    } else {
      builder.recordError(
        CompilerDiagnostic.create({
          category: ErrorCategory.Todo,
          reason: `Handle ${param.node.type} parameters`,
          description: `[BuildHIR] Add support for ${param.node.type} parameters`,
        }).withDetails({
          kind: 'error',
          loc: param.node.loc ?? null,
          message: 'Unsupported parameter type',
        }),
      );
    }
  });

  let directives: Array<string> = [];
  const body = func.get('body');
  if (body.isExpression()) {
    const fallthrough = builder.reserve('block');
    const terminal: ReturnTerminal = {
      kind: 'return',
      returnVariant: 'Implicit',
      loc: GeneratedSource,
      value: lowerExpressionToTemporary(builder, body),
      id: makeInstructionId(0),
      effects: null,
    };
    builder.terminateWithContinuation(terminal, fallthrough);
  } else if (body.isBlockStatement()) {
    lowerStatement(builder, body);
    directives = body.get('directives').map(d => d.node.value.value);
  } else {
    builder.recordError(
      CompilerDiagnostic.create({
        category: ErrorCategory.Syntax,
        reason: `Unexpected function body kind`,
        description: `Expected function body to be an expression or a block statement, got \`${body.type}\``,
      }).withDetails({
        kind: 'error',
        loc: body.node.loc ?? null,
        message: 'Expected a block statement or expression',
      }),
    );
  }

  let validatedId: HIRFunction['id'] = null;
  if (id != null) {
    const idResult = validateIdentifierName(id);
    if (idResult.isErr()) {
      for (const detail of idResult.unwrapErr().details) {
        builder.recordError(detail);
      }
    } else {
      validatedId = idResult.unwrap().value;
    }
  }

  builder.terminate(
    {
      kind: 'return',
      returnVariant: 'Void',
      loc: GeneratedSource,
      value: lowerValueToTemporary(builder, {
        kind: 'Primitive',
        value: undefined,
        loc: GeneratedSource,
      }),
      id: makeInstructionId(0),
      effects: null,
    },
    null,
  );

  const hirBody = builder.build();

  return {
    id: validatedId,
    nameHint: null,
    params,
    fnType: bindings == null ? env.fnType : 'Other',
    returnTypeAnnotation: null, // TODO: extract the actual return type node if present
    returns: createTemporaryPlace(env, func.node.loc ?? GeneratedSource),
    body: hirBody,
    context,
    generator: func.node.generator === true,
    async: func.node.async === true,
    loc: func.node.loc ?? GeneratedSource,
    env,
    aliasingEffects: null,
    directives,
  };
}

// Helper to lower a statement
function lowerStatement(
  builder: HIRBuilder,
  stmtPath: NodePath<t.Statement>,
  label: string | null = null,
): void {
  const stmtNode = stmtPath.node;
  switch (stmtNode.type) {
    case 'ThrowStatement': {
      const stmt = stmtPath as NodePath<t.ThrowStatement>;
      const value = lowerExpressionToTemporary(builder, stmt.get('argument'));
      const handler = builder.resolveThrowHandler();
      if (handler != null) {
        /*
         * NOTE: we could support this, but a `throw` inside try/catch is using exceptions
         * for control-flow and is generally considered an anti-pattern. we can likely
         * just not support this pattern, unless it really becomes necessary for some reason.
         */
        builder.recordError(
          new CompilerErrorDetail({
            reason:
              '(BuildHIR::lowerStatement) Support ThrowStatement inside of try/catch',
            category: ErrorCategory.Todo,
            loc: stmt.node.loc ?? null,
            suggestions: null,
          }),
        );
      }
      const terminal: ThrowTerminal = {
        kind: 'throw',
        value,
        id: makeInstructionId(0),
        loc: stmt.node.loc ?? GeneratedSource,
      };
      builder.terminate(terminal, 'block');
      return;
    }
    case 'ReturnStatement': {
      const stmt = stmtPath as NodePath<t.ReturnStatement>;
      const argument = stmt.get('argument');
      let value;
      if (argument.node === null) {
        value = lowerValueToTemporary(builder, {
          kind: 'Primitive',
          value: undefined,
          loc: GeneratedSource,
        });
      } else {
        value = lowerExpressionToTemporary(
          builder,
          argument as NodePath<t.Expression>,
        );
      }
      const terminal: ReturnTerminal = {
        kind: 'return',
        returnVariant: 'Explicit',
        loc: stmt.node.loc ?? GeneratedSource,
        value,
        id: makeInstructionId(0),
        effects: null,
      };
      builder.terminate(terminal, 'block');
      return;
    }
    case 'IfStatement': {
      const stmt = stmtPath as NodePath<t.IfStatement>;
      //  Block for code following the if
      const continuationBlock = builder.reserve('block');
      //  Block for the consequent (if the test is truthy)
      const consequentBlock = builder.enter('block', _blockId => {
        const consequent = stmt.get('consequent');
        lowerStatement(builder, consequent);
        return {
          kind: 'goto',
          block: continuationBlock.id,
          variant: GotoVariant.Break,
          id: makeInstructionId(0),
          loc: consequent.node.loc ?? GeneratedSource,
        };
      });
      //  Block for the alternate (if the test is not truthy)
      let alternateBlock: BlockId;
      const alternate = stmt.get('alternate');
      if (hasNode(alternate)) {
        alternateBlock = builder.enter('block', _blockId => {
          lowerStatement(builder, alternate);
          return {
            kind: 'goto',
            block: continuationBlock.id,
            variant: GotoVariant.Break,
            id: makeInstructionId(0),
            loc: alternate.node?.loc ?? GeneratedSource,
          };
        });
      } else {
        //  If there is no else clause, use the continuation directly
        alternateBlock = continuationBlock.id;
      }
      const test = lowerExpressionToTemporary(builder, stmt.get('test'));
      const terminal: IfTerminal = {
        kind: 'if',
        test,
        consequent: consequentBlock,
        alternate: alternateBlock,
        fallthrough: continuationBlock.id,
        id: makeInstructionId(0),
        loc: stmt.node.loc ?? GeneratedSource,
      };
      builder.terminateWithContinuation(terminal, continuationBlock);
      return;
    }
    case 'BlockStatement': {
      const stmt = stmtPath as NodePath<t.BlockStatement>;
      const statements = stmt.get('body');
      /**
       * Hoistable identifier bindings defined for this precise block
       * scope (excluding bindings from parent or child block scopes).
       */
      const hoistableIdentifiers: Set<t.Identifier> = new Set();

      for (const [, binding] of Object.entries(stmt.scope.bindings)) {
        // refs to params are always valid / never need to be hoisted
        if (binding.kind !== 'param') {
          hoistableIdentifiers.add(binding.identifier);
        }
      }

      for (const s of statements) {
        const willHoist = new Set<NodePath<t.Identifier>>();
        /*
         * If we see a hoistable identifier before its declaration, it should be hoisted just
         * before the statement that references it.
         */
        let fnDepth = s.isFunctionDeclaration() ? 1 : 0;
        const withFunctionContext = {
          enter: (): void => {
            fnDepth++;
          },
          exit: (): void => {
            fnDepth--;
          },
        };
        s.traverse({
          FunctionExpression: withFunctionContext,
          FunctionDeclaration: withFunctionContext,
          ArrowFunctionExpression: withFunctionContext,
          ObjectMethod: withFunctionContext,
          Identifier(id: NodePath<t.Identifier>) {
            const id2 = id;
            if (
              !id2.isReferencedIdentifier() &&
              // isReferencedIdentifier is broken and returns false for reassignments
              id.parent.type !== 'AssignmentExpression'
            ) {
              return;
            }
            const binding = id.scope.getBinding(id.node.name);
            /**
             * We can only hoist an identifier decl if
             * 1. the reference occurs within an inner function
             * or
             * 2. the declaration itself is hoistable
             */
            if (
              binding != null &&
              hoistableIdentifiers.has(binding.identifier) &&
              (fnDepth > 0 || binding.kind === 'hoisted')
            ) {
              willHoist.add(id);
            }
          },
        });
        /*
         * After visiting the declaration, hoisting is no longer required
         */
        s.traverse({
          Identifier(path: NodePath<t.Identifier>) {
            if (hoistableIdentifiers.has(path.node)) {
              hoistableIdentifiers.delete(path.node);
            }
          },
        });

        // Hoist declarations that need it to the earliest point where they are needed
        for (const id of willHoist) {
          const binding = stmt.scope.getBinding(id.node.name);
          CompilerError.invariant(binding != null, {
            reason: 'Expected to find binding for hoisted identifier',
            description: `Could not find a binding for ${id.node.name}`,
            loc: id.node.loc ?? GeneratedSource,
          });
          if (builder.environment.isHoistedIdentifier(binding.identifier)) {
            // Already hoisted
            continue;
          }

          let kind:
            | InstructionKind.Let
            | InstructionKind.HoistedConst
            | InstructionKind.HoistedLet
            | InstructionKind.HoistedFunction;
          if (binding.kind === 'const' || binding.kind === 'var') {
            kind = InstructionKind.HoistedConst;
          } else if (binding.kind === 'let') {
            kind = InstructionKind.HoistedLet;
          } else if (binding.path.isFunctionDeclaration()) {
            kind = InstructionKind.HoistedFunction;
          } else if (!binding.path.isVariableDeclarator()) {
            builder.recordError(
              new CompilerErrorDetail({
                category: ErrorCategory.Todo,
                reason: 'Unsupported declaration type for hoisting',
                description: `variable "${binding.identifier.name}" declared with ${binding.path.type}`,
                suggestions: null,
                loc: id.parentPath.node.loc ?? GeneratedSource,
              }),
            );
            continue;
          } else {
            builder.recordError(
              new CompilerErrorDetail({
                category: ErrorCategory.Todo,
                reason: 'Handle non-const declarations for hoisting',
                description: `variable "${binding.identifier.name}" declared with ${binding.kind}`,
                suggestions: null,
                loc: id.parentPath.node.loc ?? GeneratedSource,
              }),
            );
            continue;
          }

          const identifier = builder.resolveIdentifier(id);
          CompilerError.invariant(identifier.kind === 'Identifier', {
            reason:
              'Expected hoisted binding to be a local identifier, not a global',
            loc: id.node.loc ?? GeneratedSource,
          });
          const place: Place = {
            effect: Effect.Unknown,
            identifier: identifier.identifier,
            kind: 'Identifier',
            reactive: false,
            loc: id.node.loc ?? GeneratedSource,
          };
          lowerValueToTemporary(builder, {
            kind: 'DeclareContext',
            lvalue: {
              kind,
              place,
            },
            loc: id.node.loc ?? GeneratedSource,
          });
          builder.environment.addHoistedIdentifier(binding.identifier);
        }
        lowerStatement(builder, s);
      }

      return;
    }
    case 'BreakStatement': {
      const stmt = stmtPath as NodePath<t.BreakStatement>;
      const block = builder.lookupBreak(stmt.node.label?.name ?? null);
      builder.terminate(
        {
          kind: 'goto',
          block,
          variant: GotoVariant.Break,
          id: makeInstructionId(0),
          loc: stmt.node.loc ?? GeneratedSource,
        },
        'block',
      );
      return;
    }
    case 'ContinueStatement': {
      const stmt = stmtPath as NodePath<t.ContinueStatement>;
      const block = builder.lookupContinue(stmt.node.label?.name ?? null);
      builder.terminate(
        {
          kind: 'goto',
          block,
          variant: GotoVariant.Continue,
          id: makeInstructionId(0),
          loc: stmt.node.loc ?? GeneratedSource,
        },
        'block',
      );
      return;
    }
    case 'ForStatement': {
      const stmt = stmtPath as NodePath<t.ForStatement>;

      const testBlock = builder.reserve('loop');
      //  Block for code following the loop
      const continuationBlock = builder.reserve('block');

      const initBlock = builder.enter('loop', _blockId => {
        const init = stmt.get('init');
        if (init.node == null) {
          /*
           * No init expression (e.g., `for (; ...)`), add a placeholder to avoid
           * invariant about empty blocks
           */
          lowerValueToTemporary(builder, {
            kind: 'Primitive',
            value: undefined,
            loc: stmt.node.loc ?? GeneratedSource,
          });
          return {
            kind: 'goto',
            block: testBlock.id,
            variant: GotoVariant.Break,
            id: makeInstructionId(0),
            loc: stmt.node.loc ?? GeneratedSource,
          };
        }
        if (!init.isVariableDeclaration()) {
          builder.recordError(
            new CompilerErrorDetail({
              reason:
                '(BuildHIR::lowerStatement) Handle non-variable initialization in ForStatement',
              category: ErrorCategory.Todo,
              loc: stmt.node.loc ?? null,
              suggestions: null,
            }),
          );
          // Lower the init expression as best-effort and continue
          if (init.isExpression()) {
            lowerExpressionToTemporary(builder, init as NodePath<t.Expression>);
          }
          return {
            kind: 'goto',
            block: testBlock.id,
            variant: GotoVariant.Break,
            id: makeInstructionId(0),
            loc: init.node?.loc ?? GeneratedSource,
          };
        }
        lowerStatement(builder, init);
        return {
          kind: 'goto',
          block: testBlock.id,
          variant: GotoVariant.Break,
          id: makeInstructionId(0),
          loc: init.node.loc ?? GeneratedSource,
        };
      });

      let updateBlock: BlockId | null = null;
      const update = stmt.get('update');
      if (hasNode(update)) {
        updateBlock = builder.enter('loop', _blockId => {
          lowerExpressionToTemporary(builder, update);
          return {
            kind: 'goto',
            block: testBlock.id,
            variant: GotoVariant.Break,
            id: makeInstructionId(0),
            loc: update.node?.loc ?? GeneratedSource,
          };
        });
      }

      const bodyBlock = builder.enter('block', _blockId => {
        return builder.loop(
          label,
          updateBlock ?? testBlock.id,
          continuationBlock.id,
          () => {
            const body = stmt.get('body');
            lowerStatement(builder, body);
            return {
              kind: 'goto',
              block: updateBlock ?? testBlock.id,
              variant: GotoVariant.Continue,
              id: makeInstructionId(0),
              loc: body.node.loc ?? GeneratedSource,
            };
          },
        );
      });

      builder.terminateWithContinuation(
        {
          kind: 'for',
          loc: stmtNode.loc ?? GeneratedSource,
          init: initBlock,
          test: testBlock.id,
          update: updateBlock,
          loop: bodyBlock,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
        },
        testBlock,
      );

      const test = stmt.get('test');
      if (test.node == null) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerStatement) Handle empty test in ForStatement`,
            category: ErrorCategory.Todo,
            loc: stmt.node.loc ?? null,
            suggestions: null,
          }),
        );
        // Treat `for(;;)` as `while(true)` to keep the builder state consistent
        builder.terminateWithContinuation(
          {
            kind: 'branch',
            test: lowerValueToTemporary(builder, {
              kind: 'Primitive',
              value: true,
              loc: stmt.node.loc ?? GeneratedSource,
            }),
            consequent: bodyBlock,
            alternate: continuationBlock.id,
            fallthrough: continuationBlock.id,
            id: makeInstructionId(0),
            loc: stmt.node.loc ?? GeneratedSource,
          },
          continuationBlock,
        );
      } else {
        builder.terminateWithContinuation(
          {
            kind: 'branch',
            test: lowerExpressionToTemporary(
              builder,
              test as NodePath<t.Expression>,
            ),
            consequent: bodyBlock,
            alternate: continuationBlock.id,
            fallthrough: continuationBlock.id,
            id: makeInstructionId(0),
            loc: stmt.node.loc ?? GeneratedSource,
          },
          continuationBlock,
        );
      }
      return;
    }
    case 'WhileStatement': {
      const stmt = stmtPath as NodePath<t.WhileStatement>;
      //  Block used to evaluate whether to (re)enter or exit the loop
      const conditionalBlock = builder.reserve('loop');
      //  Block for code following the loop
      const continuationBlock = builder.reserve('block');
      //  Loop body
      const loopBlock = builder.enter('block', _blockId => {
        return builder.loop(
          label,
          conditionalBlock.id,
          continuationBlock.id,
          () => {
            const body = stmt.get('body');
            lowerStatement(builder, body);
            return {
              kind: 'goto',
              block: conditionalBlock.id,
              variant: GotoVariant.Continue,
              id: makeInstructionId(0),
              loc: body.node.loc ?? GeneratedSource,
            };
          },
        );
      });
      /*
       * The code leading up to the loop must jump to the conditional block,
       * to evaluate whether to enter the loop or bypass to the continuation.
       */
      const loc = stmt.node.loc ?? GeneratedSource;
      builder.terminateWithContinuation(
        {
          kind: 'while',
          loc,
          test: conditionalBlock.id,
          loop: loopBlock,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
        },
        conditionalBlock,
      );
      const test = lowerExpressionToTemporary(builder, stmt.get('test'));
      const terminal: BranchTerminal = {
        kind: 'branch',
        test,
        consequent: loopBlock,
        alternate: continuationBlock.id,
        fallthrough: conditionalBlock.id,
        id: makeInstructionId(0),
        loc: stmt.node.loc ?? GeneratedSource,
      };
      //  Complete the conditional and continue with code after the loop
      builder.terminateWithContinuation(terminal, continuationBlock);
      return;
    }
    case 'LabeledStatement': {
      const stmt = stmtPath as NodePath<t.LabeledStatement>;
      const label = stmt.node.label.name;
      const body = stmt.get('body');
      switch (body.node.type) {
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'ForStatement':
        case 'WhileStatement':
        case 'DoWhileStatement': {
          /*
           * labeled loops are special because of continue, so push the label
           * down
           */
          lowerStatement(builder, stmt.get('body'), label);
          break;
        }
        default: {
          /*
           * All other statements create a continuation block to allow `break`,
           * explicitly *don't* pass the label down
           */
          const continuationBlock = builder.reserve('block');
          const block = builder.enter('block', () => {
            const body = stmt.get('body');
            builder.label(label, continuationBlock.id, () => {
              lowerStatement(builder, body);
            });
            return {
              kind: 'goto',
              block: continuationBlock.id,
              variant: GotoVariant.Break,
              id: makeInstructionId(0),
              loc: body.node.loc ?? GeneratedSource,
            };
          });
          builder.terminateWithContinuation(
            {
              kind: 'label',
              block,
              fallthrough: continuationBlock.id,
              id: makeInstructionId(0),
              loc: stmt.node.loc ?? GeneratedSource,
            },
            continuationBlock,
          );
        }
      }
      return;
    }
    case 'SwitchStatement': {
      const stmt = stmtPath as NodePath<t.SwitchStatement>;
      //  Block following the switch
      const continuationBlock = builder.reserve('block');
      /*
       * The goto target for any cases that fallthrough, which initially starts
       * as the continuation block and is then updated as we iterate through cases
       * in reverse order.
       */
      let fallthrough = continuationBlock.id;
      /*
       * Iterate through cases in reverse order, so that previous blocks can fallthrough
       * to successors
       */
      const cases: Array<Case> = [];
      let hasDefault = false;
      for (let ii = stmt.get('cases').length - 1; ii >= 0; ii--) {
        const case_: NodePath<t.SwitchCase> = stmt.get('cases')[ii];
        const testExpr = case_.get('test');
        if (testExpr.node == null) {
          if (hasDefault) {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `Expected at most one \`default\` branch in a switch statement, this code should have failed to parse`,
                category: ErrorCategory.Syntax,
                loc: case_.node.loc ?? null,
                suggestions: null,
              }),
            );
            break;
          }
          hasDefault = true;
        }
        const block = builder.enter('block', _blockId => {
          return builder.switch(label, continuationBlock.id, () => {
            case_
              .get('consequent')
              .forEach(consequent => lowerStatement(builder, consequent));
            /*
             * always generate a fallthrough to the next block, this may be dead code
             * if there was an explicit break, but if so it will be pruned later.
             */
            return {
              kind: 'goto',
              block: fallthrough,
              variant: GotoVariant.Break,
              id: makeInstructionId(0),
              loc: case_.node.loc ?? GeneratedSource,
            };
          });
        });
        let test: Place | null = null;
        if (hasNode(testExpr)) {
          test = lowerReorderableExpression(builder, testExpr);
        }
        cases.push({
          test,
          block,
        });
        fallthrough = block;
      }
      /*
       * it doesn't matter for our analysis purposes, but reverse the order of the cases
       * back to the original to make it match the original code/intent.
       */
      cases.reverse();
      /*
       * If there wasn't an explicit default case, generate one to model the fact that execution
       * could bypass any of the other cases and jump directly to the continuation.
       */
      if (!hasDefault) {
        cases.push({test: null, block: continuationBlock.id});
      }

      const test = lowerExpressionToTemporary(
        builder,
        stmt.get('discriminant'),
      );
      builder.terminateWithContinuation(
        {
          kind: 'switch',
          test,
          cases,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
          loc: stmt.node.loc ?? GeneratedSource,
        },
        continuationBlock,
      );
      return;
    }
    case 'VariableDeclaration': {
      const stmt = stmtPath as NodePath<t.VariableDeclaration>;
      const nodeKind: t.VariableDeclaration['kind'] = stmt.node.kind;
      if (nodeKind === 'var') {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerStatement) Handle ${nodeKind} kinds in VariableDeclaration`,
            category: ErrorCategory.Todo,
            loc: stmt.node.loc ?? null,
            suggestions: null,
          }),
        );
        // Treat `var` as `let` so references to the variable don't break
      }
      const kind =
        nodeKind === 'let' || nodeKind === 'var'
          ? InstructionKind.Let
          : InstructionKind.Const;
      for (const declaration of stmt.get('declarations')) {
        const id = declaration.get('id');
        const init = declaration.get('init');
        if (hasNode(init)) {
          const value = lowerExpressionToTemporary(builder, init);
          lowerAssignment(
            builder,
            stmt.node.loc ?? GeneratedSource,
            kind,
            id,
            value,
            id.isObjectPattern() || id.isArrayPattern()
              ? 'Destructure'
              : 'Assignment',
          );
        } else if (id.isIdentifier()) {
          const binding = builder.resolveIdentifier(id);
          if (binding.kind !== 'Identifier') {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerAssignment) Could not find binding for declaration.`,
                category: ErrorCategory.Invariant,
                loc: id.node.loc ?? null,
                suggestions: null,
              }),
            );
          } else {
            const place: Place = {
              effect: Effect.Unknown,
              identifier: binding.identifier,
              kind: 'Identifier',
              reactive: false,
              loc: id.node.loc ?? GeneratedSource,
            };
            if (builder.isContextIdentifier(id)) {
              if (kind === InstructionKind.Const) {
                const declRangeStart = declaration.parentPath.node.start!;
                builder.recordError(
                  new CompilerErrorDetail({
                    reason: `Expect \`const\` declaration not to be reassigned`,
                    category: ErrorCategory.Syntax,
                    loc: id.node.loc ?? null,
                    suggestions: [
                      {
                        description: 'Change to a `let` declaration',
                        op: CompilerSuggestionOperation.Replace,
                        range: [declRangeStart, declRangeStart + 5], // "const".length
                        text: 'let',
                      },
                    ],
                  }),
                );
              }
              lowerValueToTemporary(builder, {
                kind: 'DeclareContext',
                lvalue: {
                  kind: InstructionKind.Let,
                  place,
                },
                loc: id.node.loc ?? GeneratedSource,
              });
            } else {
              const typeAnnotation = id.get('typeAnnotation');
              let type: t.FlowType | t.TSType | null;
              if (typeAnnotation.isTSTypeAnnotation()) {
                const typePath = typeAnnotation.get('typeAnnotation');
                type = typePath.node;
              } else if (typeAnnotation.isTypeAnnotation()) {
                const typePath = typeAnnotation.get('typeAnnotation');
                type = typePath.node;
              } else {
                type = null;
              }
              lowerValueToTemporary(builder, {
                kind: 'DeclareLocal',
                lvalue: {
                  kind,
                  place,
                },
                type,
                loc: id.node.loc ?? GeneratedSource,
              });
            }
          }
        } else {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `Expected variable declaration to be an identifier if no initializer was provided`,
              description: `Got a \`${id.type}\``,
              category: ErrorCategory.Syntax,
              loc: stmt.node.loc ?? null,
              suggestions: null,
            }),
          );
        }
      }
      return;
    }
    case 'ExpressionStatement': {
      const stmt = stmtPath as NodePath<t.ExpressionStatement>;
      const expression = stmt.get('expression');
      lowerExpressionToTemporary(builder, expression);
      return;
    }
    case 'DoWhileStatement': {
      const stmt = stmtPath as NodePath<t.DoWhileStatement>;
      //  Block used to evaluate whether to (re)enter or exit the loop
      const conditionalBlock = builder.reserve('loop');
      //  Block for code following the loop
      const continuationBlock = builder.reserve('block');
      //  Loop body, executed at least once uncondtionally prior to exit
      const loopBlock = builder.enter('block', _loopBlockId => {
        return builder.loop(
          label,
          conditionalBlock.id,
          continuationBlock.id,
          () => {
            const body = stmt.get('body');
            lowerStatement(builder, body);
            return {
              kind: 'goto',
              block: conditionalBlock.id,
              variant: GotoVariant.Continue,
              id: makeInstructionId(0),
              loc: body.node.loc ?? GeneratedSource,
            };
          },
        );
      });
      /*
       * Jump to the conditional block to evaluate whether to (re)enter the loop or exit to the
       * continuation block.
       */
      const loc = stmt.node.loc ?? GeneratedSource;
      builder.terminateWithContinuation(
        {
          kind: 'do-while',
          loc,
          test: conditionalBlock.id,
          loop: loopBlock,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
        },
        conditionalBlock,
      );
      /*
       * The conditional block is empty and exists solely as conditional for
       * (re)entering or exiting the loop
       */
      const test = lowerExpressionToTemporary(builder, stmt.get('test'));
      const terminal: BranchTerminal = {
        kind: 'branch',
        test,
        consequent: loopBlock,
        alternate: continuationBlock.id,
        fallthrough: conditionalBlock.id,
        id: makeInstructionId(0),
        loc,
      };
      //  Complete the conditional and continue with code after the loop
      builder.terminateWithContinuation(terminal, continuationBlock);
      return;
    }
    case 'FunctionDeclaration': {
      const stmt = stmtPath as NodePath<t.FunctionDeclaration>;
      stmt.skip();
      CompilerError.invariant(stmt.get('id').type === 'Identifier', {
        reason: 'function declarations must have a name',
        loc: stmt.node.loc ?? GeneratedSource,
      });
      const id = stmt.get('id') as NodePath<t.Identifier>;

      const fn = lowerValueToTemporary(
        builder,
        lowerFunctionToValue(builder, stmt),
      );
      lowerAssignment(
        builder,
        stmt.node.loc ?? GeneratedSource,
        InstructionKind.Function,
        id,
        fn,
        'Assignment',
      );

      return;
    }
    case 'ForOfStatement': {
      const stmt = stmtPath as NodePath<t.ForOfStatement>;
      const continuationBlock = builder.reserve('block');
      const initBlock = builder.reserve('loop');
      const testBlock = builder.reserve('loop');

      if (stmt.node.await) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerStatement) Handle for-await loops`,
            category: ErrorCategory.Todo,
            loc: stmt.node.loc ?? null,
            suggestions: null,
          }),
        );
        return;
      }

      const loopBlock = builder.enter('block', _blockId => {
        return builder.loop(label, initBlock.id, continuationBlock.id, () => {
          const body = stmt.get('body');
          lowerStatement(builder, body);
          return {
            kind: 'goto',
            block: initBlock.id,
            variant: GotoVariant.Continue,
            id: makeInstructionId(0),
            loc: body.node.loc ?? GeneratedSource,
          };
        });
      });

      const loc = stmt.node.loc ?? GeneratedSource;
      const value = lowerExpressionToTemporary(builder, stmt.get('right'));
      builder.terminateWithContinuation(
        {
          kind: 'for-of',
          loc,
          init: initBlock.id,
          test: testBlock.id,
          loop: loopBlock,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
        },
        initBlock,
      );

      /*
       * The init of a ForOf statement is compound over a left (VariableDeclaration | LVal) and
       * right (Expression), so we synthesize a new InstrValue and assignment (potentially multiple
       * instructions when we handle other syntax like Patterns)
       */
      const iterator = lowerValueToTemporary(builder, {
        kind: 'GetIterator',
        loc: value.loc,
        collection: {...value},
      });
      builder.terminateWithContinuation(
        {
          id: makeInstructionId(0),
          kind: 'goto',
          block: testBlock.id,
          variant: GotoVariant.Break,
          loc: stmt.node.loc ?? GeneratedSource,
        },
        testBlock,
      );

      const left = stmt.get('left');
      const leftLoc = left.node.loc ?? GeneratedSource;
      let test: Place;
      const advanceIterator = lowerValueToTemporary(builder, {
        kind: 'IteratorNext',
        loc: leftLoc,
        iterator: {...iterator},
        collection: {...value},
      });
      if (left.isVariableDeclaration()) {
        const declarations = left.get('declarations');
        CompilerError.invariant(declarations.length === 1, {
          reason: `Expected only one declaration in the init of a ForOfStatement, got ${declarations.length}`,
          loc: left.node.loc ?? GeneratedSource,
        });
        const id = declarations[0].get('id');
        const assign = lowerAssignment(
          builder,
          leftLoc,
          InstructionKind.Let,
          id,
          advanceIterator,
          'Assignment',
        );
        test = lowerValueToTemporary(builder, assign);
      } else {
        CompilerError.invariant(left.isLVal(), {
          reason: 'Expected ForOf init to be a variable declaration or lval',
          loc: leftLoc,
        });
        const assign = lowerAssignment(
          builder,
          leftLoc,
          InstructionKind.Reassign,
          left,
          advanceIterator,
          'Assignment',
        );
        test = lowerValueToTemporary(builder, assign);
      }
      builder.terminateWithContinuation(
        {
          id: makeInstructionId(0),
          kind: 'branch',
          test,
          consequent: loopBlock,
          alternate: continuationBlock.id,
          loc: stmt.node.loc ?? GeneratedSource,
          fallthrough: continuationBlock.id,
        },
        continuationBlock,
      );
      return;
    }
    case 'ForInStatement': {
      const stmt = stmtPath as NodePath<t.ForInStatement>;
      const continuationBlock = builder.reserve('block');
      const initBlock = builder.reserve('loop');

      const loopBlock = builder.enter('block', _blockId => {
        return builder.loop(label, initBlock.id, continuationBlock.id, () => {
          const body = stmt.get('body');
          lowerStatement(builder, body);
          return {
            kind: 'goto',
            block: initBlock.id,
            variant: GotoVariant.Continue,
            id: makeInstructionId(0),
            loc: body.node.loc ?? GeneratedSource,
          };
        });
      });

      const loc = stmt.node.loc ?? GeneratedSource;
      const value = lowerExpressionToTemporary(builder, stmt.get('right'));
      builder.terminateWithContinuation(
        {
          kind: 'for-in',
          loc,
          init: initBlock.id,
          loop: loopBlock,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
        },
        initBlock,
      );

      /*
       * The init of a ForIn statement is compound over a left (VariableDeclaration | LVal) and
       * right (Expression), so we synthesize a new InstrValue and assignment (potentially multiple
       * instructions when we handle other syntax like Patterns)
       */
      const left = stmt.get('left');
      const leftLoc = left.node.loc ?? GeneratedSource;
      let test: Place;
      const nextPropertyTemp = lowerValueToTemporary(builder, {
        kind: 'NextPropertyOf',
        loc: leftLoc,
        value,
      });
      if (left.isVariableDeclaration()) {
        const declarations = left.get('declarations');
        CompilerError.invariant(declarations.length === 1, {
          reason: `Expected only one declaration in the init of a ForInStatement, got ${declarations.length}`,
          loc: left.node.loc ?? GeneratedSource,
        });
        const id = declarations[0].get('id');
        const assign = lowerAssignment(
          builder,
          leftLoc,
          InstructionKind.Let,
          id,
          nextPropertyTemp,
          'Assignment',
        );
        test = lowerValueToTemporary(builder, assign);
      } else {
        CompilerError.invariant(left.isLVal(), {
          reason: 'Expected ForIn init to be a variable declaration or lval',
          loc: leftLoc,
        });
        const assign = lowerAssignment(
          builder,
          leftLoc,
          InstructionKind.Reassign,
          left,
          nextPropertyTemp,
          'Assignment',
        );
        test = lowerValueToTemporary(builder, assign);
      }
      builder.terminateWithContinuation(
        {
          id: makeInstructionId(0),
          kind: 'branch',
          test,
          consequent: loopBlock,
          alternate: continuationBlock.id,
          fallthrough: continuationBlock.id,
          loc: stmt.node.loc ?? GeneratedSource,
        },
        continuationBlock,
      );
      return;
    }
    case 'DebuggerStatement': {
      const stmt = stmtPath as NodePath<t.DebuggerStatement>;
      const loc = stmt.node.loc ?? GeneratedSource;
      builder.push({
        id: makeInstructionId(0),
        lvalue: buildTemporaryPlace(builder, loc),
        value: {
          kind: 'Debugger',
          loc,
        },
        effects: null,
        loc,
      });
      return;
    }
    case 'EmptyStatement': {
      return;
    }
    case 'TryStatement': {
      const stmt = stmtPath as NodePath<t.TryStatement>;
      const continuationBlock = builder.reserve('block');

      const handlerPath = stmt.get('handler');
      if (!hasNode(handlerPath)) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerStatement) Handle TryStatement without a catch clause`,
            category: ErrorCategory.Todo,
            loc: stmt.node.loc ?? null,
            suggestions: null,
          }),
        );
        return;
      }
      if (hasNode(stmt.get('finalizer'))) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerStatement) Handle TryStatement with a finalizer ('finally') clause`,
            category: ErrorCategory.Todo,
            loc: stmt.node.loc ?? null,
            suggestions: null,
          }),
        );
      }

      const handlerBindingPath = handlerPath.get('param');
      let handlerBinding: {
        place: Place;
        path: NodePath<t.Identifier | t.ArrayPattern | t.ObjectPattern>;
      } | null = null;
      if (hasNode(handlerBindingPath)) {
        const place: Place = {
          kind: 'Identifier',
          identifier: builder.makeTemporary(
            handlerBindingPath.node.loc ?? GeneratedSource,
          ),
          effect: Effect.Unknown,
          reactive: false,
          loc: handlerBindingPath.node.loc ?? GeneratedSource,
        };
        promoteTemporary(place.identifier);
        lowerValueToTemporary(builder, {
          kind: 'DeclareLocal',
          lvalue: {
            kind: InstructionKind.Catch,
            place: {...place},
          },
          type: null,
          loc: handlerBindingPath.node.loc ?? GeneratedSource,
        });

        handlerBinding = {
          path: handlerBindingPath,
          place,
        };
      }

      const handler = builder.enter('catch', _blockId => {
        if (handlerBinding !== null) {
          lowerAssignment(
            builder,
            handlerBinding.path.node.loc ?? GeneratedSource,
            InstructionKind.Catch,
            handlerBinding.path,
            {...handlerBinding.place},
            'Assignment',
          );
        }
        lowerStatement(builder, handlerPath.get('body'));
        return {
          kind: 'goto',
          block: continuationBlock.id,
          variant: GotoVariant.Break,
          id: makeInstructionId(0),
          loc: handlerPath.node.loc ?? GeneratedSource,
        };
      });

      const block = builder.enter('block', _blockId => {
        const block = stmt.get('block');
        builder.enterTryCatch(handler, () => {
          lowerStatement(builder, block);
        });
        return {
          kind: 'goto',
          block: continuationBlock.id,
          variant: GotoVariant.Try,
          id: makeInstructionId(0),
          loc: block.node.loc ?? GeneratedSource,
        };
      });

      builder.terminateWithContinuation(
        {
          kind: 'try',
          block,
          handlerBinding:
            handlerBinding !== null ? {...handlerBinding.place} : null,
          handler,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
          loc: stmt.node.loc ?? GeneratedSource,
        },
        continuationBlock,
      );

      return;
    }
    case 'WithStatement': {
      builder.recordError(
        new CompilerErrorDetail({
          reason: `JavaScript 'with' syntax is not supported`,
          description: `'with' syntax is considered deprecated and removed from JavaScript standards, consider alternatives`,
          category: ErrorCategory.UnsupportedSyntax,
          loc: stmtPath.node.loc ?? null,
          suggestions: null,
        }),
      );
      lowerValueToTemporary(builder, {
        kind: 'UnsupportedNode',
        loc: stmtPath.node.loc ?? GeneratedSource,
        node: stmtPath.node,
      });
      return;
    }
    case 'ClassDeclaration': {
      /**
       * In theory we could support inline class declarations, but this is rare enough in practice
       * and complex enough to support that we don't anticipate supporting anytime soon. Developers
       * are encouraged to lift classes out of component/hook declarations.
       */
      builder.recordError(
        new CompilerErrorDetail({
          reason: 'Inline `class` declarations are not supported',
          description: `Move class declarations outside of components/hooks`,
          category: ErrorCategory.UnsupportedSyntax,
          loc: stmtPath.node.loc ?? null,
          suggestions: null,
        }),
      );
      lowerValueToTemporary(builder, {
        kind: 'UnsupportedNode',
        loc: stmtPath.node.loc ?? GeneratedSource,
        node: stmtPath.node,
      });
      return;
    }
    case 'EnumDeclaration':
    case 'TSEnumDeclaration': {
      lowerValueToTemporary(builder, {
        kind: 'UnsupportedNode',
        loc: stmtPath.node.loc ?? GeneratedSource,
        node: stmtPath.node,
      });
      return;
    }
    case 'ExportAllDeclaration':
    case 'ExportDefaultDeclaration':
    case 'ExportNamedDeclaration':
    case 'ImportDeclaration':
    case 'TSExportAssignment':
    case 'TSImportEqualsDeclaration': {
      builder.recordError(
        new CompilerErrorDetail({
          reason:
            'JavaScript `import` and `export` statements may only appear at the top level of a module',
          category: ErrorCategory.Syntax,
          loc: stmtPath.node.loc ?? null,
          suggestions: null,
        }),
      );
      lowerValueToTemporary(builder, {
        kind: 'UnsupportedNode',
        loc: stmtPath.node.loc ?? GeneratedSource,
        node: stmtPath.node,
      });
      return;
    }
    case 'TSNamespaceExportDeclaration': {
      builder.recordError(
        new CompilerErrorDetail({
          reason:
            'TypeScript `namespace` statements may only appear at the top level of a module',
          category: ErrorCategory.Syntax,
          loc: stmtPath.node.loc ?? null,
          suggestions: null,
        }),
      );
      lowerValueToTemporary(builder, {
        kind: 'UnsupportedNode',
        loc: stmtPath.node.loc ?? GeneratedSource,
        node: stmtPath.node,
      });
      return;
    }
    case 'DeclareClass':
    case 'DeclareExportAllDeclaration':
    case 'DeclareExportDeclaration':
    case 'DeclareFunction':
    case 'DeclareInterface':
    case 'DeclareModule':
    case 'DeclareModuleExports':
    case 'DeclareOpaqueType':
    case 'DeclareTypeAlias':
    case 'DeclareVariable':
    case 'InterfaceDeclaration':
    case 'OpaqueType':
    case 'TSDeclareFunction':
    case 'TSInterfaceDeclaration':
    case 'TSModuleDeclaration':
    case 'TSTypeAliasDeclaration':
    case 'TypeAlias': {
      // We do not preserve type annotations/syntax through transformation
      return;
    }
    default: {
      return assertExhaustive(
        stmtNode,
        `Unsupported statement kind '${
          (stmtNode as any as NodePath<t.Statement>).type
        }'`,
      );
    }
  }
}

function lowerObjectMethod(
  builder: HIRBuilder,
  property: NodePath<t.ObjectMethod>,
): InstructionValue {
  const loc = property.node.loc ?? GeneratedSource;
  const loweredFunc = lowerFunction(builder, property);

  return {
    kind: 'ObjectMethod',
    loc,
    loweredFunc,
  };
}

function lowerObjectPropertyKey(
  builder: HIRBuilder,
  property: NodePath<t.ObjectProperty | t.ObjectMethod>,
): ObjectPropertyKey | null {
  const key = property.get('key');
  if (key.isStringLiteral()) {
    return {
      kind: 'string',
      name: key.node.value,
    };
  } else if (property.node.computed && key.isExpression()) {
    const place = lowerExpressionToTemporary(builder, key);
    return {
      kind: 'computed',
      name: place,
    };
  } else if (key.isIdentifier()) {
    return {
      kind: 'identifier',
      name: key.node.name,
    };
  } else if (key.isNumericLiteral()) {
    return {
      kind: 'identifier',
      name: String(key.node.value),
    };
  }

  builder.recordError(
    new CompilerErrorDetail({
      reason: `(BuildHIR::lowerExpression) Expected Identifier, got ${key.type} key in ObjectExpression`,
      category: ErrorCategory.Todo,
      loc: key.node.loc ?? null,
      suggestions: null,
    }),
  );
  return null;
}

function lowerExpression(
  builder: HIRBuilder,
  exprPath: NodePath<t.Expression>,
): InstructionValue {
  const exprNode = exprPath.node;
  const exprLoc = exprNode.loc ?? GeneratedSource;
  switch (exprNode.type) {
    case 'Identifier': {
      const expr = exprPath as NodePath<t.Identifier>;
      const place = lowerIdentifier(builder, expr);
      return {
        kind: getLoadKind(builder, expr),
        place,
        loc: exprLoc,
      };
    }
    case 'NullLiteral': {
      return {
        kind: 'Primitive',
        value: null,
        loc: exprLoc,
      };
    }
    case 'BooleanLiteral':
    case 'NumericLiteral':
    case 'StringLiteral': {
      const expr = exprPath as NodePath<
        t.StringLiteral | t.BooleanLiteral | t.NumericLiteral
      >;
      const value = expr.node.value;
      return {
        kind: 'Primitive',
        value,
        loc: exprLoc,
      };
    }
    case 'ObjectExpression': {
      const expr = exprPath as NodePath<t.ObjectExpression>;
      const propertyPaths = expr.get('properties');
      const properties: Array<ObjectProperty | SpreadPattern> = [];
      for (const propertyPath of propertyPaths) {
        if (propertyPath.isObjectProperty()) {
          const loweredKey = lowerObjectPropertyKey(builder, propertyPath);
          if (!loweredKey) {
            continue;
          }
          const valuePath = propertyPath.get('value');
          if (!valuePath.isExpression()) {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerExpression) Handle ${valuePath.type} values in ObjectExpression`,
                category: ErrorCategory.Todo,
                loc: valuePath.node.loc ?? null,
                suggestions: null,
              }),
            );
            continue;
          }
          const value = lowerExpressionToTemporary(builder, valuePath);
          properties.push({
            kind: 'ObjectProperty',
            type: 'property',
            place: value,
            key: loweredKey,
          });
        } else if (propertyPath.isSpreadElement()) {
          const place = lowerExpressionToTemporary(
            builder,
            propertyPath.get('argument'),
          );
          properties.push({
            kind: 'Spread',
            place,
          });
        } else if (propertyPath.isObjectMethod()) {
          if (propertyPath.node.kind !== 'method') {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerExpression) Handle ${propertyPath.node.kind} functions in ObjectExpression`,
                category: ErrorCategory.Todo,
                loc: propertyPath.node.loc ?? null,
                suggestions: null,
              }),
            );
            continue;
          }
          const method = lowerObjectMethod(builder, propertyPath);
          const place = lowerValueToTemporary(builder, method);
          const loweredKey = lowerObjectPropertyKey(builder, propertyPath);
          if (!loweredKey) {
            continue;
          }
          properties.push({
            kind: 'ObjectProperty',
            type: 'method',
            place,
            key: loweredKey,
          });
        } else {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `(BuildHIR::lowerExpression) Handle ${propertyPath.type} properties in ObjectExpression`,
              category: ErrorCategory.Todo,
              loc: propertyPath.node.loc ?? null,
              suggestions: null,
            }),
          );
          continue;
        }
      }
      return {
        kind: 'ObjectExpression',
        properties,
        loc: exprLoc,
      };
    }
    case 'ArrayExpression': {
      const expr = exprPath as NodePath<t.ArrayExpression>;
      let elements: ArrayExpression['elements'] = [];
      for (const element of expr.get('elements')) {
        if (element.node == null) {
          elements.push({
            kind: 'Hole',
          });
          continue;
        } else if (element.isExpression()) {
          elements.push(lowerExpressionToTemporary(builder, element));
        } else if (element.isSpreadElement()) {
          const place = lowerExpressionToTemporary(
            builder,
            element.get('argument'),
          );
          elements.push({kind: 'Spread', place});
        } else {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `(BuildHIR::lowerExpression) Handle ${element.type} elements in ArrayExpression`,
              category: ErrorCategory.Todo,
              loc: element.node.loc ?? null,
              suggestions: null,
            }),
          );
          continue;
        }
      }
      return {
        kind: 'ArrayExpression',
        elements,
        loc: exprLoc,
      };
    }
    case 'NewExpression': {
      const expr = exprPath as NodePath<t.NewExpression>;
      const calleePath = expr.get('callee');
      if (!calleePath.isExpression()) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `Expected an expression as the \`new\` expression receiver (v8 intrinsics are not supported)`,
            description: `Got a \`${calleePath.node.type}\``,
            category: ErrorCategory.Syntax,
            loc: calleePath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }
      const callee = lowerExpressionToTemporary(builder, calleePath);
      const args = lowerArguments(builder, expr.get('arguments'));

      return {
        kind: 'NewExpression',
        callee,
        args,
        loc: exprLoc,
      };
    }
    case 'OptionalCallExpression': {
      const expr = exprPath as NodePath<t.OptionalCallExpression>;
      return lowerOptionalCallExpression(builder, expr, null);
    }
    case 'CallExpression': {
      const expr = exprPath as NodePath<t.CallExpression>;
      const calleePath = expr.get('callee');
      if (!calleePath.isExpression()) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `Expected Expression, got ${calleePath.type} in CallExpression (v8 intrinsics not supported). This error is likely caused by a bug in React Compiler. Please file an issue`,
            category: ErrorCategory.Todo,
            loc: calleePath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }
      if (calleePath.isMemberExpression()) {
        const memberExpr = lowerMemberExpression(builder, calleePath);
        const propertyPlace = lowerValueToTemporary(builder, memberExpr.value);
        const args = lowerArguments(builder, expr.get('arguments'));
        return {
          kind: 'MethodCall',
          receiver: memberExpr.object,
          property: {...propertyPlace},
          args,
          loc: exprLoc,
        };
      } else {
        const callee = lowerExpressionToTemporary(builder, calleePath);
        const args = lowerArguments(builder, expr.get('arguments'));
        return {
          kind: 'CallExpression',
          callee,
          args,
          loc: exprLoc,
        };
      }
    }
    case 'BinaryExpression': {
      const expr = exprPath as NodePath<t.BinaryExpression>;
      const leftPath = expr.get('left');
      if (!leftPath.isExpression()) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerExpression) Expected Expression, got ${leftPath.type} lval in BinaryExpression`,
            category: ErrorCategory.Todo,
            loc: leftPath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }
      const left = lowerExpressionToTemporary(builder, leftPath);
      const right = lowerExpressionToTemporary(builder, expr.get('right'));
      const operator = expr.node.operator;
      if (operator === '|>') {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerExpression) Pipe operator not supported`,
            category: ErrorCategory.Todo,
            loc: leftPath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }
      return {
        kind: 'BinaryExpression',
        operator,
        left,
        right,
        loc: exprLoc,
      };
    }
    case 'SequenceExpression': {
      const expr = exprPath as NodePath<t.SequenceExpression>;
      const exprLoc = expr.node.loc ?? GeneratedSource;

      const continuationBlock = builder.reserve(builder.currentBlockKind());
      const place = buildTemporaryPlace(builder, exprLoc);

      const sequenceBlock = builder.enter('sequence', _ => {
        let last: Place | null = null;
        for (const item of expr.get('expressions')) {
          last = lowerExpressionToTemporary(builder, item);
        }
        if (last === null) {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `Expected sequence expression to have at least one expression`,
              category: ErrorCategory.Syntax,
              loc: expr.node.loc ?? null,
              suggestions: null,
            }),
          );
        } else {
          lowerValueToTemporary(builder, {
            kind: 'StoreLocal',
            lvalue: {kind: InstructionKind.Const, place: {...place}},
            value: last,
            type: null,
            loc: exprLoc,
          });
        }
        return {
          kind: 'goto',
          id: makeInstructionId(0),
          block: continuationBlock.id,
          loc: exprLoc,
          variant: GotoVariant.Break,
        };
      });

      builder.terminateWithContinuation(
        {
          kind: 'sequence',
          block: sequenceBlock,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
          loc: exprLoc,
        },
        continuationBlock,
      );
      return {kind: 'LoadLocal', place, loc: place.loc};
    }
    case 'ConditionalExpression': {
      const expr = exprPath as NodePath<t.ConditionalExpression>;
      const exprLoc = expr.node.loc ?? GeneratedSource;

      //  Block for code following the if
      const continuationBlock = builder.reserve(builder.currentBlockKind());
      const testBlock = builder.reserve('value');
      const place = buildTemporaryPlace(builder, exprLoc);

      //  Block for the consequent (if the test is truthy)
      const consequentBlock = builder.enter('value', _blockId => {
        const consequentPath = expr.get('consequent');
        const consequent = lowerExpressionToTemporary(builder, consequentPath);
        lowerValueToTemporary(builder, {
          kind: 'StoreLocal',
          lvalue: {kind: InstructionKind.Const, place: {...place}},
          value: consequent,
          type: null,
          loc: exprLoc,
        });
        return {
          kind: 'goto',
          block: continuationBlock.id,
          variant: GotoVariant.Break,
          id: makeInstructionId(0),
          loc: consequentPath.node.loc ?? GeneratedSource,
        };
      });
      //  Block for the alternate (if the test is not truthy)
      const alternateBlock = builder.enter('value', _blockId => {
        const alternatePath = expr.get('alternate');
        const alternate = lowerExpressionToTemporary(builder, alternatePath);
        lowerValueToTemporary(builder, {
          kind: 'StoreLocal',
          lvalue: {kind: InstructionKind.Const, place: {...place}},
          value: alternate,
          type: null,
          loc: exprLoc,
        });
        return {
          kind: 'goto',
          block: continuationBlock.id,
          variant: GotoVariant.Break,
          id: makeInstructionId(0),
          loc: alternatePath.node.loc ?? GeneratedSource,
        };
      });

      builder.terminateWithContinuation(
        {
          kind: 'ternary',
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
          test: testBlock.id,
          loc: exprLoc,
        },
        testBlock,
      );
      const testPlace = lowerExpressionToTemporary(builder, expr.get('test'));
      builder.terminateWithContinuation(
        {
          kind: 'branch',
          test: {...testPlace},
          consequent: consequentBlock,
          alternate: alternateBlock,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
          loc: exprLoc,
        },
        continuationBlock,
      );
      return {kind: 'LoadLocal', place, loc: place.loc};
    }
    case 'LogicalExpression': {
      const expr = exprPath as NodePath<t.LogicalExpression>;
      const exprLoc = expr.node.loc ?? GeneratedSource;
      const continuationBlock = builder.reserve(builder.currentBlockKind());
      const testBlock = builder.reserve('value');
      const place = buildTemporaryPlace(builder, exprLoc);
      const leftPlace = buildTemporaryPlace(
        builder,
        expr.get('left').node.loc ?? GeneratedSource,
      );
      const consequent = builder.enter('value', () => {
        lowerValueToTemporary(builder, {
          kind: 'StoreLocal',
          lvalue: {kind: InstructionKind.Const, place: {...place}},
          value: {...leftPlace},
          type: null,
          loc: leftPlace.loc,
        });
        return {
          kind: 'goto',
          block: continuationBlock.id,
          variant: GotoVariant.Break,
          id: makeInstructionId(0),
          loc: leftPlace.loc,
        };
      });
      const alternate = builder.enter('value', () => {
        const right = lowerExpressionToTemporary(builder, expr.get('right'));
        lowerValueToTemporary(builder, {
          kind: 'StoreLocal',
          lvalue: {kind: InstructionKind.Const, place: {...place}},
          value: {...right},
          type: null,
          loc: right.loc,
        });
        return {
          kind: 'goto',
          block: continuationBlock.id,
          variant: GotoVariant.Break,
          id: makeInstructionId(0),
          loc: right.loc,
        };
      });
      builder.terminateWithContinuation(
        {
          kind: 'logical',
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
          test: testBlock.id,
          operator: expr.node.operator,
          loc: exprLoc,
        },
        testBlock,
      );
      const leftValue = lowerExpressionToTemporary(builder, expr.get('left'));
      builder.push({
        id: makeInstructionId(0),
        lvalue: {...leftPlace},
        value: {
          kind: 'LoadLocal',
          place: leftValue,
          loc: exprLoc,
        },
        effects: null,
        loc: exprLoc,
      });
      builder.terminateWithContinuation(
        {
          kind: 'branch',
          test: {...leftPlace},
          consequent,
          alternate,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
          loc: exprLoc,
        },
        continuationBlock,
      );
      return {kind: 'LoadLocal', place, loc: place.loc};
    }
    case 'AssignmentExpression': {
      const expr = exprPath as NodePath<t.AssignmentExpression>;
      const operator = expr.node.operator;

      if (operator === '=') {
        const left = expr.get('left');
        if (left.isLVal()) {
          return lowerAssignment(
            builder,
            left.node.loc ?? GeneratedSource,
            InstructionKind.Reassign,
            left,
            lowerExpressionToTemporary(builder, expr.get('right')),
            left.isArrayPattern() || left.isObjectPattern()
              ? 'Destructure'
              : 'Assignment',
          );
        } else {
          /**
           * OptionalMemberExpressions as the left side of an AssignmentExpression are Stage 1 and
           * not supported by React Compiler yet.
           */
          builder.recordError(
            new CompilerErrorDetail({
              reason: `(BuildHIR::lowerExpression) Unsupported syntax on the left side of an AssignmentExpression`,
              description: `Expected an LVal, got: ${left.type}`,
              category: ErrorCategory.Todo,
              loc: left.node.loc ?? null,
              suggestions: null,
            }),
          );
          return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
        }
      }

      const operators: {
        [key: string]: Exclude<t.BinaryExpression['operator'], '|>'>;
      } = {
        '+=': '+',
        '-=': '-',
        '/=': '/',
        '%=': '%',
        '*=': '*',
        '**=': '**',
        '&=': '&',
        '|=': '|',
        '>>=': '>>',
        '>>>=': '>>>',
        '<<=': '<<',
        '^=': '^',
      };
      const binaryOperator = operators[operator];
      if (binaryOperator == null) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerExpression) Handle ${operator} operators in AssignmentExpression`,
            category: ErrorCategory.Todo,
            loc: expr.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }
      const left = expr.get('left');
      const leftNode = left.node;
      switch (leftNode.type) {
        case 'Identifier': {
          const leftExpr = left as NodePath<t.Identifier>;
          const leftPlace = lowerExpressionToTemporary(builder, leftExpr);
          const right = lowerExpressionToTemporary(builder, expr.get('right'));
          const binaryPlace = lowerValueToTemporary(builder, {
            kind: 'BinaryExpression',
            operator: binaryOperator,
            left: leftPlace,
            right,
            loc: exprLoc,
          });
          const binding = builder.resolveIdentifier(leftExpr);
          if (binding.kind === 'Identifier') {
            const identifier = lowerIdentifier(builder, leftExpr);
            const kind = getStoreKind(builder, leftExpr);
            if (kind === 'StoreLocal') {
              lowerValueToTemporary(builder, {
                kind: 'StoreLocal',
                lvalue: {
                  place: {...identifier},
                  kind: InstructionKind.Reassign,
                },
                value: {...binaryPlace},
                type: null,
                loc: exprLoc,
              });
              return {kind: 'LoadLocal', place: identifier, loc: exprLoc};
            } else {
              lowerValueToTemporary(builder, {
                kind: 'StoreContext',
                lvalue: {
                  place: {...identifier},
                  kind: InstructionKind.Reassign,
                },
                value: {...binaryPlace},
                loc: exprLoc,
              });
              return {kind: 'LoadContext', place: identifier, loc: exprLoc};
            }
          } else {
            const temporary = lowerValueToTemporary(builder, {
              kind: 'StoreGlobal',
              name: leftExpr.node.name,
              value: {...binaryPlace},
              loc: exprLoc,
            });
            return {kind: 'LoadLocal', place: temporary, loc: temporary.loc};
          }
        }
        case 'MemberExpression': {
          // a.b.c += <right>
          const leftExpr = left as NodePath<t.MemberExpression>;
          const {object, property, value} = lowerMemberExpression(
            builder,
            leftExpr,
          );

          // Store the previous value to a temporary
          const previousValuePlace = lowerValueToTemporary(builder, value);
          // Store the new value to a temporary
          const newValuePlace = lowerValueToTemporary(builder, {
            kind: 'BinaryExpression',
            operator: binaryOperator,
            left: {...previousValuePlace},
            right: lowerExpressionToTemporary(builder, expr.get('right')),
            loc: leftExpr.node.loc ?? GeneratedSource,
          });

          // Save the result back to the property
          if (typeof property === 'string' || typeof property === 'number') {
            return {
              kind: 'PropertyStore',
              object: {...object},
              property: makePropertyLiteral(property),
              value: {...newValuePlace},
              loc: leftExpr.node.loc ?? GeneratedSource,
            };
          } else {
            return {
              kind: 'ComputedStore',
              object: {...object},
              property: {...property},
              value: {...newValuePlace},
              loc: leftExpr.node.loc ?? GeneratedSource,
            };
          }
        }
        default: {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `(BuildHIR::lowerExpression) Expected Identifier or MemberExpression, got ${expr.type} lval in AssignmentExpression`,
              category: ErrorCategory.Todo,
              loc: expr.node.loc ?? null,
              suggestions: null,
            }),
          );
          return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
        }
      }
    }
    case 'OptionalMemberExpression': {
      const expr = exprPath as NodePath<t.OptionalMemberExpression>;
      const {value} = lowerOptionalMemberExpression(builder, expr, null);
      return {kind: 'LoadLocal', place: value, loc: value.loc};
    }
    case 'MemberExpression': {
      const expr = exprPath as NodePath<
        t.MemberExpression | t.OptionalMemberExpression
      >;
      const {value} = lowerMemberExpression(builder, expr);
      const place = lowerValueToTemporary(builder, value);
      return {kind: 'LoadLocal', place, loc: place.loc};
    }
    case 'JSXElement': {
      const expr = exprPath as NodePath<t.JSXElement>;
      const opening = expr.get('openingElement');
      const openingLoc = opening.node.loc ?? GeneratedSource;
      const tag = lowerJsxElementName(builder, opening.get('name'));
      const props: Array<JsxAttribute> = [];
      for (const attribute of opening.get('attributes')) {
        if (attribute.isJSXSpreadAttribute()) {
          const argument = lowerExpressionToTemporary(
            builder,
            attribute.get('argument'),
          );
          props.push({kind: 'JsxSpreadAttribute', argument});
          continue;
        }
        if (!attribute.isJSXAttribute()) {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `(BuildHIR::lowerExpression) Handle ${attribute.type} attributes in JSXElement`,
              category: ErrorCategory.Todo,
              loc: attribute.node.loc ?? null,
              suggestions: null,
            }),
          );
          continue;
        }
        const namePath = attribute.get('name');
        let propName;
        if (namePath.isJSXIdentifier()) {
          propName = namePath.node.name;
          if (propName.indexOf(':') !== -1) {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerExpression) Unexpected colon in attribute name \`${propName}\``,
                category: ErrorCategory.Todo,
                loc: namePath.node.loc ?? null,
                suggestions: null,
              }),
            );
          }
        } else {
          CompilerError.invariant(namePath.isJSXNamespacedName(), {
            reason: 'Refinement',
            loc: namePath.node.loc ?? GeneratedSource,
          });
          const namespace = namePath.node.namespace.name;
          const name = namePath.node.name.name;
          propName = `${namespace}:${name}`;
        }
        const valueExpr = attribute.get('value');
        let value;
        if (valueExpr.isJSXElement() || valueExpr.isStringLiteral()) {
          value = lowerExpressionToTemporary(builder, valueExpr);
        } else if (valueExpr.type == null) {
          value = lowerValueToTemporary(builder, {
            kind: 'Primitive',
            value: true,
            loc: attribute.node.loc ?? GeneratedSource,
          });
        } else {
          if (!valueExpr.isJSXExpressionContainer()) {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerExpression) Handle ${valueExpr.type} attribute values in JSXElement`,
                category: ErrorCategory.Todo,
                loc: valueExpr.node?.loc ?? null,
                suggestions: null,
              }),
            );
            continue;
          }
          const expression = valueExpr.get('expression');
          if (!expression.isExpression()) {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerExpression) Handle ${expression.type} expressions in JSXExpressionContainer within JSXElement`,
                category: ErrorCategory.Todo,
                loc: valueExpr.node.loc ?? null,
                suggestions: null,
              }),
            );
            continue;
          }
          value = lowerExpressionToTemporary(builder, expression);
        }
        props.push({kind: 'JsxAttribute', name: propName, place: value});
      }

      const isFbt =
        tag.kind === 'BuiltinTag' && (tag.name === 'fbt' || tag.name === 'fbs');
      if (isFbt) {
        const tagName = tag.name;
        const openingIdentifier = opening.get('name');
        const tagIdentifier = openingIdentifier.isJSXIdentifier()
          ? builder.resolveIdentifier(openingIdentifier)
          : null;
        if (tagIdentifier != null) {
          // This is already checked in builder.resolveIdentifier
          CompilerError.invariant(tagIdentifier.kind !== 'Identifier', {
            reason: `<${tagName}> tags should be module-level imports`,
            loc: openingIdentifier.node.loc ?? GeneratedSource,
          });
        }
        // see `error.todo-multiple-fbt-plural` fixture for explanation
        const fbtLocations = {
          enum: new Array<SourceLocation>(),
          plural: new Array<SourceLocation>(),
          pronoun: new Array<SourceLocation>(),
        };
        expr.traverse({
          JSXClosingElement(path) {
            path.skip();
          },
          JSXNamespacedName(path) {
            if (path.node.namespace.name === tagName) {
              switch (path.node.name.name) {
                case 'enum':
                  fbtLocations.enum.push(path.node.loc ?? GeneratedSource);
                  break;
                case 'plural':
                  fbtLocations.plural.push(path.node.loc ?? GeneratedSource);
                  break;
                case 'pronoun':
                  fbtLocations.pronoun.push(path.node.loc ?? GeneratedSource);
                  break;
              }
            }
          },
        });
        for (const [name, locations] of Object.entries(fbtLocations)) {
          if (locations.length > 1) {
            builder.recordError(
              new CompilerDiagnostic({
                category: ErrorCategory.Todo,
                reason: 'Support duplicate fbt tags',
                description: `Support \`<${tagName}>\` tags with multiple \`<${tagName}:${name}>\` values`,
                details: locations.map(loc => {
                  return {
                    kind: 'error' as const,
                    message: `Multiple \`<${tagName}:${name}>\` tags found`,
                    loc,
                  };
                }),
              }),
            );
          }
        }
      }

      /**
       * Increment fbt counter before traversing into children, as whitespace
       * in jsx text is handled differently for fbt subtrees.
       */
      isFbt && builder.fbtDepth++;
      const children: Array<Place> = expr
        .get('children')
        .map(child => lowerJsxElement(builder, child))
        .filter(notNull);
      isFbt && builder.fbtDepth--;

      return {
        kind: 'JsxExpression',
        tag,
        props,
        children: children.length === 0 ? null : children,
        loc: exprLoc,
        openingLoc: openingLoc,
        closingLoc: expr.get('closingElement').node?.loc ?? GeneratedSource,
      };
    }
    case 'JSXFragment': {
      const expr = exprPath as NodePath<t.JSXFragment>;
      const children: Array<Place> = expr
        .get('children')
        .map(child => lowerJsxElement(builder, child))
        .filter(notNull);
      return {
        kind: 'JsxFragment',
        children,
        loc: exprLoc,
      };
    }
    case 'ArrowFunctionExpression':
    case 'FunctionExpression': {
      const expr = exprPath as NodePath<
        t.FunctionExpression | t.ArrowFunctionExpression
      >;
      return lowerFunctionToValue(builder, expr);
    }
    case 'TaggedTemplateExpression': {
      const expr = exprPath as NodePath<t.TaggedTemplateExpression>;
      if (expr.get('quasi').get('expressions').length !== 0) {
        builder.recordError(
          new CompilerErrorDetail({
            reason:
              '(BuildHIR::lowerExpression) Handle tagged template with interpolations',
            category: ErrorCategory.Todo,
            loc: exprPath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }
      CompilerError.invariant(expr.get('quasi').get('quasis').length == 1, {
        reason:
          "there should be only one quasi as we don't support interpolations yet",
        loc: expr.node.loc ?? GeneratedSource,
      });
      const value = expr.get('quasi').get('quasis').at(0)!.node.value;
      if (value.raw !== value.cooked) {
        builder.recordError(
          new CompilerErrorDetail({
            reason:
              '(BuildHIR::lowerExpression) Handle tagged template where cooked value is different from raw value',
            category: ErrorCategory.Todo,
            loc: exprPath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }

      return {
        kind: 'TaggedTemplateExpression',
        tag: lowerExpressionToTemporary(builder, expr.get('tag')),
        value,
        loc: exprLoc,
      };
    }
    case 'TemplateLiteral': {
      const expr = exprPath as NodePath<t.TemplateLiteral>;
      const subexprs = expr.get('expressions');
      const quasis = expr.get('quasis');

      if (subexprs.length !== quasis.length - 1) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `Unexpected quasi and subexpression lengths in template literal`,
            category: ErrorCategory.Syntax,
            loc: exprPath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }

      if (subexprs.some(e => !e.isExpression())) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerAssignment) Handle TSType in TemplateLiteral.`,
            category: ErrorCategory.Todo,
            loc: exprPath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }

      const subexprPlaces = subexprs.map(e =>
        lowerExpressionToTemporary(builder, e as NodePath<t.Expression>),
      );

      return {
        kind: 'TemplateLiteral',
        subexprs: subexprPlaces,
        quasis: expr.get('quasis').map(q => q.node.value),
        loc: exprLoc,
      };
    }
    case 'UnaryExpression': {
      let expr = exprPath as NodePath<t.UnaryExpression>;
      if (expr.node.operator === 'delete') {
        const argument = expr.get('argument');
        if (argument.isMemberExpression()) {
          const {object, property} = lowerMemberExpression(builder, argument);
          if (typeof property === 'string' || typeof property === 'number') {
            return {
              kind: 'PropertyDelete',
              object,
              property: makePropertyLiteral(property),
              loc: exprLoc,
            };
          } else {
            return {
              kind: 'ComputedDelete',
              object,
              property,
              loc: exprLoc,
            };
          }
        } else {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `Only object properties can be deleted`,
              category: ErrorCategory.Syntax,
              loc: expr.node.loc ?? null,
              suggestions: [
                {
                  description: 'Remove this line',
                  range: [expr.node.start!, expr.node.end!],
                  op: CompilerSuggestionOperation.Remove,
                },
              ],
            }),
          );
          return {kind: 'UnsupportedNode', node: expr.node, loc: exprLoc};
        }
      } else if (expr.node.operator === 'throw') {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `Throw expressions are not supported`,
            category: ErrorCategory.Syntax,
            loc: expr.node.loc ?? null,
            suggestions: [
              {
                description: 'Remove this line',
                range: [expr.node.start!, expr.node.end!],
                op: CompilerSuggestionOperation.Remove,
              },
            ],
          }),
        );
        return {kind: 'UnsupportedNode', node: expr.node, loc: exprLoc};
      } else {
        return {
          kind: 'UnaryExpression',
          operator: expr.node.operator,
          value: lowerExpressionToTemporary(builder, expr.get('argument')),
          loc: exprLoc,
        };
      }
    }
    case 'AwaitExpression': {
      let expr = exprPath as NodePath<t.AwaitExpression>;
      return {
        kind: 'Await',
        value: lowerExpressionToTemporary(builder, expr.get('argument')),
        loc: exprLoc,
      };
    }
    case 'TypeCastExpression': {
      let expr = exprPath as NodePath<t.TypeCastExpression>;
      const typeAnnotation = expr.get('typeAnnotation').get('typeAnnotation');
      return {
        kind: 'TypeCastExpression',
        value: lowerExpressionToTemporary(builder, expr.get('expression')),
        typeAnnotation: typeAnnotation.node,
        typeAnnotationKind: 'cast',
        type: lowerType(typeAnnotation.node),
        loc: exprLoc,
      };
    }
    case 'TSSatisfiesExpression': {
      let expr = exprPath as NodePath<t.TSSatisfiesExpression>;
      const typeAnnotation = expr.get('typeAnnotation');
      return {
        kind: 'TypeCastExpression',
        value: lowerExpressionToTemporary(builder, expr.get('expression')),
        typeAnnotation: typeAnnotation.node,
        typeAnnotationKind: 'satisfies',
        type: lowerType(typeAnnotation.node),
        loc: exprLoc,
      };
    }
    case 'TSAsExpression': {
      let expr = exprPath as NodePath<t.TSAsExpression>;
      const typeAnnotation = expr.get('typeAnnotation');
      return {
        kind: 'TypeCastExpression',
        value: lowerExpressionToTemporary(builder, expr.get('expression')),
        typeAnnotation: typeAnnotation.node,
        typeAnnotationKind: 'as',
        type: lowerType(typeAnnotation.node),
        loc: exprLoc,
      };
    }
    case 'UpdateExpression': {
      let expr = exprPath as NodePath<t.UpdateExpression>;
      const argument = expr.get('argument');
      if (argument.isMemberExpression()) {
        const binaryOperator = expr.node.operator === '++' ? '+' : '-';
        const leftExpr = argument as NodePath<t.MemberExpression>;
        const {object, property, value} = lowerMemberExpression(
          builder,
          leftExpr,
        );

        // Store the previous value to a temporary
        const previousValuePlace = lowerValueToTemporary(builder, value);
        // Store the new value to a temporary
        const updatedValue = lowerValueToTemporary(builder, {
          kind: 'BinaryExpression',
          operator: binaryOperator,
          left: {...previousValuePlace},
          right: lowerValueToTemporary(builder, {
            kind: 'Primitive',
            value: 1,
            loc: GeneratedSource,
          }),
          loc: leftExpr.node.loc ?? GeneratedSource,
        });

        // Save the result back to the property
        let newValuePlace;
        if (typeof property === 'string' || typeof property === 'number') {
          newValuePlace = lowerValueToTemporary(builder, {
            kind: 'PropertyStore',
            object: {...object},
            property: makePropertyLiteral(property),
            value: {...updatedValue},
            loc: leftExpr.node.loc ?? GeneratedSource,
          });
        } else {
          newValuePlace = lowerValueToTemporary(builder, {
            kind: 'ComputedStore',
            object: {...object},
            property: {...property},
            value: {...updatedValue},
            loc: leftExpr.node.loc ?? GeneratedSource,
          });
        }

        return {
          kind: 'LoadLocal',
          place: expr.node.prefix
            ? {...newValuePlace}
            : {...previousValuePlace},
          loc: exprLoc,
        };
      }
      if (!argument.isIdentifier()) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerExpression) Handle UpdateExpression with ${argument.type} argument`,
            category: ErrorCategory.Todo,
            loc: exprPath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      } else if (builder.isContextIdentifier(argument)) {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerExpression) Handle UpdateExpression to variables captured within lambdas.`,
            category: ErrorCategory.Todo,
            loc: exprPath.node.loc ?? null,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }
      const lvalue = lowerIdentifierForAssignment(
        builder,
        argument.node.loc ?? GeneratedSource,
        InstructionKind.Reassign,
        argument,
      );
      if (lvalue === null) {
        /*
         * lowerIdentifierForAssignment should have already reported an error if it returned null,
         * we check here just in case
         */
        if (!builder.environment.hasErrors()) {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `(BuildHIR::lowerExpression) Found an invalid UpdateExpression without a previously reported error`,
              category: ErrorCategory.Invariant,
              loc: exprLoc,
              suggestions: null,
            }),
          );
        }
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      } else if (lvalue.kind === 'Global') {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `(BuildHIR::lowerExpression) Support UpdateExpression where argument is a global`,
            category: ErrorCategory.Todo,
            loc: exprLoc,
            suggestions: null,
          }),
        );
        return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
      }
      const value = lowerIdentifier(builder, argument);
      if (expr.node.prefix) {
        return {
          kind: 'PrefixUpdate',
          lvalue,
          operation: expr.node.operator,
          value,
          loc: exprLoc,
        };
      } else {
        return {
          kind: 'PostfixUpdate',
          lvalue,
          operation: expr.node.operator,
          value,
          loc: exprLoc,
        };
      }
    }
    case 'RegExpLiteral': {
      let expr = exprPath as NodePath<t.RegExpLiteral>;
      return {
        kind: 'RegExpLiteral',
        pattern: expr.node.pattern,
        flags: expr.node.flags,
        loc: expr.node.loc ?? GeneratedSource,
      };
    }
    case 'TSInstantiationExpression':
    case 'TSNonNullExpression': {
      let expr = exprPath as NodePath<t.TSNonNullExpression>;
      return lowerExpression(builder, expr.get('expression'));
    }
    case 'MetaProperty': {
      let expr = exprPath as NodePath<t.MetaProperty>;
      if (
        expr.node.meta.name === 'import' &&
        expr.node.property.name === 'meta'
      ) {
        return {
          kind: 'MetaProperty',
          meta: expr.node.meta.name,
          property: expr.node.property.name,
          loc: expr.node.loc ?? GeneratedSource,
        };
      }

      builder.recordError(
        new CompilerErrorDetail({
          reason: `(BuildHIR::lowerExpression) Handle MetaProperty expressions other than import.meta`,
          category: ErrorCategory.Todo,
          loc: exprPath.node.loc ?? null,
          suggestions: null,
        }),
      );
      return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
    }
    default: {
      builder.recordError(
        new CompilerErrorDetail({
          reason: `(BuildHIR::lowerExpression) Handle ${exprPath.type} expressions`,
          category: ErrorCategory.Todo,
          loc: exprPath.node.loc ?? null,
          suggestions: null,
        }),
      );
      return {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc};
    }
  }
}

function lowerOptionalMemberExpression(
  builder: HIRBuilder,
  expr: NodePath<t.OptionalMemberExpression>,
  parentAlternate: BlockId | null,
): {object: Place; value: Place} {
  const optional = expr.node.optional;
  const loc = expr.node.loc ?? GeneratedSource;
  const place = buildTemporaryPlace(builder, loc);
  const continuationBlock = builder.reserve(builder.currentBlockKind());
  const consequent = builder.reserve('value');

  /*
   * block to evaluate if the callee is null/undefined, this sets the result of the call to undefined.
   * note that we only create an alternate when first entering an optional subtree of the ast: if this
   * is a child of an optional node, we use the alterate created by the parent.
   */
  const alternate =
    parentAlternate !== null
      ? parentAlternate
      : builder.enter('value', () => {
          const temp = lowerValueToTemporary(builder, {
            kind: 'Primitive',
            value: undefined,
            loc,
          });
          lowerValueToTemporary(builder, {
            kind: 'StoreLocal',
            lvalue: {kind: InstructionKind.Const, place: {...place}},
            value: {...temp},
            type: null,
            loc,
          });
          return {
            kind: 'goto',
            variant: GotoVariant.Break,
            block: continuationBlock.id,
            id: makeInstructionId(0),
            loc,
          };
        });

  let object: Place | null = null;
  const testBlock = builder.enter('value', () => {
    const objectPath = expr.get('object');
    if (objectPath.isOptionalMemberExpression()) {
      const {value} = lowerOptionalMemberExpression(
        builder,
        objectPath,
        alternate,
      );
      object = value;
    } else if (objectPath.isOptionalCallExpression()) {
      const value = lowerOptionalCallExpression(builder, objectPath, alternate);
      object = lowerValueToTemporary(builder, value);
    } else {
      object = lowerExpressionToTemporary(builder, objectPath);
    }
    return {
      kind: 'branch',
      test: {...object},
      consequent: consequent.id,
      alternate,
      fallthrough: continuationBlock.id,
      id: makeInstructionId(0),
      loc,
    };
  });
  CompilerError.invariant(object !== null, {
    reason: 'Satisfy type checker',
    loc: GeneratedSource,
  });

  /*
   * block to evaluate if the callee is non-null/undefined. arguments are lowered in this block to preserve
   * the semantic of conditional evaluation depending on the callee
   */
  builder.enterReserved(consequent, () => {
    const {value} = lowerMemberExpression(builder, expr, object);
    const temp = lowerValueToTemporary(builder, value);
    lowerValueToTemporary(builder, {
      kind: 'StoreLocal',
      lvalue: {kind: InstructionKind.Const, place: {...place}},
      value: {...temp},
      type: null,
      loc,
    });
    return {
      kind: 'goto',
      variant: GotoVariant.Break,
      block: continuationBlock.id,
      id: makeInstructionId(0),
      loc,
    };
  });

  builder.terminateWithContinuation(
    {
      kind: 'optional',
      optional,
      test: testBlock,
      fallthrough: continuationBlock.id,
      id: makeInstructionId(0),
      loc,
    },
    continuationBlock,
  );

  return {object, value: place};
}

function lowerOptionalCallExpression(
  builder: HIRBuilder,
  expr: NodePath<t.OptionalCallExpression>,
  parentAlternate: BlockId | null,
): InstructionValue {
  const optional = expr.node.optional;
  const calleePath = expr.get('callee');
  const loc = expr.node.loc ?? GeneratedSource;
  const place = buildTemporaryPlace(builder, loc);
  const continuationBlock = builder.reserve(builder.currentBlockKind());
  const consequent = builder.reserve('value');

  /*
   * block to evaluate if the callee is null/undefined, this sets the result of the call to undefined.
   * note that we only create an alternate when first entering an optional subtree of the ast: if this
   * is a child of an optional node, we use the alterate created by the parent.
   */
  const alternate =
    parentAlternate !== null
      ? parentAlternate
      : builder.enter('value', () => {
          const temp = lowerValueToTemporary(builder, {
            kind: 'Primitive',
            value: undefined,
            loc,
          });
          lowerValueToTemporary(builder, {
            kind: 'StoreLocal',
            lvalue: {kind: InstructionKind.Const, place: {...place}},
            value: {...temp},
            type: null,
            loc,
          });
          return {
            kind: 'goto',
            variant: GotoVariant.Break,
            block: continuationBlock.id,
            id: makeInstructionId(0),
            loc,
          };
        });

  /*
   * Lower the callee within the test block to represent the fact that the code for the callee is
   * scoped within the optional
   */
  let callee:
    | {kind: 'CallExpression'; callee: Place}
    | {kind: 'MethodCall'; receiver: Place; property: Place};
  const testBlock = builder.enter('value', () => {
    if (calleePath.isOptionalCallExpression()) {
      // Recursively call lowerOptionalCallExpression to thread down the alternate block
      const value = lowerOptionalCallExpression(builder, calleePath, alternate);
      const valuePlace = lowerValueToTemporary(builder, value);
      callee = {
        kind: 'CallExpression',
        callee: valuePlace,
      };
    } else if (calleePath.isOptionalMemberExpression()) {
      const {object, value} = lowerOptionalMemberExpression(
        builder,
        calleePath,
        alternate,
      );
      callee = {
        kind: 'MethodCall',
        receiver: object,
        property: value,
      };
    } else if (calleePath.isMemberExpression()) {
      const memberExpr = lowerMemberExpression(builder, calleePath);
      const propertyPlace = lowerValueToTemporary(builder, memberExpr.value);
      callee = {
        kind: 'MethodCall',
        receiver: memberExpr.object,
        property: propertyPlace,
      };
    } else {
      callee = {
        kind: 'CallExpression',
        callee: lowerExpressionToTemporary(builder, calleePath),
      };
    }
    const testPlace =
      callee.kind === 'CallExpression' ? callee.callee : callee.property;
    return {
      kind: 'branch',
      test: {...testPlace},
      consequent: consequent.id,
      alternate,
      fallthrough: continuationBlock.id,
      id: makeInstructionId(0),
      loc,
    };
  });

  /*
   * block to evaluate if the callee is non-null/undefined. arguments are lowered in this block to preserve
   * the semantic of conditional evaluation depending on the callee
   */
  builder.enterReserved(consequent, () => {
    const args = lowerArguments(builder, expr.get('arguments'));
    const temp = buildTemporaryPlace(builder, loc);
    if (callee.kind === 'CallExpression') {
      builder.push({
        id: makeInstructionId(0),
        lvalue: {...temp},
        value: {
          kind: 'CallExpression',
          callee: {...callee.callee},
          args,
          loc,
        },
        effects: null,
        loc,
      });
    } else {
      builder.push({
        id: makeInstructionId(0),
        lvalue: {...temp},
        value: {
          kind: 'MethodCall',
          receiver: {...callee.receiver},
          property: {...callee.property},
          args,
          loc,
        },
        effects: null,
        loc,
      });
    }
    lowerValueToTemporary(builder, {
      kind: 'StoreLocal',
      lvalue: {kind: InstructionKind.Const, place: {...place}},
      value: {...temp},
      type: null,
      loc,
    });
    return {
      kind: 'goto',
      variant: GotoVariant.Break,
      block: continuationBlock.id,
      id: makeInstructionId(0),
      loc,
    };
  });

  builder.terminateWithContinuation(
    {
      kind: 'optional',
      optional,
      test: testBlock,
      fallthrough: continuationBlock.id,
      id: makeInstructionId(0),
      loc,
    },
    continuationBlock,
  );

  return {kind: 'LoadLocal', place, loc: place.loc};
}

/*
 * There are a few places where we do not preserve original evaluation ordering and/or control flow, such as
 * switch case test values and default values in destructuring (assignment patterns). In these cases we allow
 * simple expressions whose evaluation cannot be observed:
 *  - primitives
 *  - arrays/objects whose values are also safely reorderable.
 */
function lowerReorderableExpression(
  builder: HIRBuilder,
  expr: NodePath<t.Expression>,
): Place {
  if (!isReorderableExpression(builder, expr, true)) {
    builder.recordError(
      new CompilerErrorDetail({
        reason: `(BuildHIR::node.lowerReorderableExpression) Expression type \`${expr.type}\` cannot be safely reordered`,
        category: ErrorCategory.Todo,
        loc: expr.node.loc ?? null,
        suggestions: null,
      }),
    );
  }
  return lowerExpressionToTemporary(builder, expr);
}

function isReorderableExpression(
  builder: HIRBuilder,
  expr: NodePath<t.Expression>,
  allowLocalIdentifiers: boolean,
): boolean {
  switch (expr.node.type) {
    case 'Identifier': {
      const binding = builder.resolveIdentifier(expr as NodePath<t.Identifier>);
      if (binding.kind === 'Identifier') {
        return allowLocalIdentifiers;
      } else {
        // global, definitely safe
        return true;
      }
    }
    case 'TSInstantiationExpression': {
      const innerExpr = (expr as NodePath<t.TSInstantiationExpression>).get(
        'expression',
      ) as NodePath<t.Expression>;
      return isReorderableExpression(builder, innerExpr, allowLocalIdentifiers);
    }
    case 'RegExpLiteral':
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'NullLiteral':
    case 'BooleanLiteral':
    case 'BigIntLiteral': {
      return true;
    }
    case 'UnaryExpression': {
      const unary = expr as NodePath<t.UnaryExpression>;
      switch (expr.node.operator) {
        case '!':
        case '+':
        case '-': {
          return isReorderableExpression(
            builder,
            unary.get('argument'),
            allowLocalIdentifiers,
          );
        }
        default: {
          return false;
        }
      }
    }
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'TypeCastExpression': {
      return isReorderableExpression(
        builder,
        (expr as NodePath<t.TypeCastExpression>).get('expression'),
        allowLocalIdentifiers,
      );
    }
    case 'LogicalExpression': {
      const logical = expr as NodePath<t.LogicalExpression>;
      return (
        isReorderableExpression(
          builder,
          logical.get('left'),
          allowLocalIdentifiers,
        ) &&
        isReorderableExpression(
          builder,
          logical.get('right'),
          allowLocalIdentifiers,
        )
      );
    }
    case 'ConditionalExpression': {
      const conditional = expr as NodePath<t.ConditionalExpression>;
      return (
        isReorderableExpression(
          builder,
          conditional.get('test'),
          allowLocalIdentifiers,
        ) &&
        isReorderableExpression(
          builder,
          conditional.get('consequent'),
          allowLocalIdentifiers,
        ) &&
        isReorderableExpression(
          builder,
          conditional.get('alternate'),
          allowLocalIdentifiers,
        )
      );
    }
    case 'ArrayExpression': {
      return (expr as NodePath<t.ArrayExpression>)
        .get('elements')
        .every(
          element =>
            element.isExpression() &&
            isReorderableExpression(builder, element, allowLocalIdentifiers),
        );
    }
    case 'ObjectExpression': {
      return (expr as NodePath<t.ObjectExpression>)
        .get('properties')
        .every(property => {
          if (!property.isObjectProperty() || property.node.computed) {
            return false;
          }
          const value = property.get('value');
          return (
            value.isExpression() &&
            isReorderableExpression(builder, value, allowLocalIdentifiers)
          );
        });
    }
    case 'MemberExpression': {
      /*
       * A common pattern is switch statements where the case test values are properties of a global,
       * eg `case ProductOptions.Option: { ... }`
       * We therefore allow expressions where the innermost object is a global identifier, and reject
       * all other member expressions (for now).
       */
      const test = expr as NodePath<t.MemberExpression>;
      let innerObject: NodePath<t.Expression> = test;
      while (innerObject.isMemberExpression()) {
        innerObject = innerObject.get('object');
      }
      if (
        innerObject.isIdentifier() &&
        builder.resolveIdentifier(innerObject).kind !== 'Identifier'
      ) {
        // This is a property/computed load from a global, that's safe to reorder
        return true;
      } else {
        return false;
      }
    }
    case 'ArrowFunctionExpression': {
      const fn = expr as NodePath<t.ArrowFunctionExpression>;
      const body = fn.get('body');
      if (body.node.type === 'BlockStatement') {
        return body.node.body.length === 0;
      } else {
        // For TypeScript
        invariant(body.isExpression(), 'Expected an expression');
        return isReorderableExpression(
          builder,
          body,
          /* disallow local identifiers in the body */ false,
        );
      }
    }
    case 'CallExpression': {
      const call = expr as NodePath<t.CallExpression>;
      const callee = call.get('callee');
      return (
        callee.isExpression() &&
        isReorderableExpression(builder, callee, allowLocalIdentifiers) &&
        call
          .get('arguments')
          .every(
            arg =>
              arg.isExpression() &&
              isReorderableExpression(builder, arg, allowLocalIdentifiers),
          )
      );
    }
    case 'NewExpression': {
      const newExpr = expr as NodePath<t.NewExpression>;
      const callee = newExpr.get('callee');
      return (
        callee.isExpression() &&
        isReorderableExpression(builder, callee, allowLocalIdentifiers) &&
        newExpr
          .get('arguments')
          .every(
            arg =>
              arg.isExpression() &&
              isReorderableExpression(builder, arg, allowLocalIdentifiers),
          )
      );
    }
    default: {
      return false;
    }
  }
}

function lowerArguments(
  builder: HIRBuilder,
  expr: Array<
    NodePath<
      | t.Expression
      | t.SpreadElement
      | t.JSXNamespacedName
      | t.ArgumentPlaceholder
    >
  >,
): Array<Place | SpreadPattern> {
  let args: Array<Place | SpreadPattern> = [];
  for (const argPath of expr) {
    if (argPath.isSpreadElement()) {
      args.push({
        kind: 'Spread',
        place: lowerExpressionToTemporary(builder, argPath.get('argument')),
      });
    } else if (argPath.isExpression()) {
      args.push(lowerExpressionToTemporary(builder, argPath));
    } else {
      builder.recordError(
        new CompilerErrorDetail({
          reason: `(BuildHIR::lowerExpression) Handle ${argPath.type} arguments in CallExpression`,
          category: ErrorCategory.Todo,
          loc: argPath.node.loc ?? null,
          suggestions: null,
        }),
      );
    }
  }
  return args;
}

type LoweredMemberExpression = {
  object: Place;
  property: Place | string | number;
  value: InstructionValue;
};
function lowerMemberExpression(
  builder: HIRBuilder,
  expr: NodePath<t.MemberExpression | t.OptionalMemberExpression>,
  loweredObject: Place | null = null,
): LoweredMemberExpression {
  const exprNode = expr.node;
  const exprLoc = exprNode.loc ?? GeneratedSource;
  const objectNode = expr.get('object');
  const propertyNode = expr.get('property');
  const object =
    loweredObject ?? lowerExpressionToTemporary(builder, objectNode);

  if (!expr.node.computed || expr.node.property.type === 'NumericLiteral') {
    let property: PropertyLiteral;
    if (propertyNode.isIdentifier()) {
      property = makePropertyLiteral(propertyNode.node.name);
    } else if (propertyNode.isNumericLiteral()) {
      property = makePropertyLiteral(propertyNode.node.value);
    } else {
      builder.recordError(
        new CompilerErrorDetail({
          reason: `(BuildHIR::lowerMemberExpression) Handle ${propertyNode.type} property`,
          category: ErrorCategory.Todo,
          loc: propertyNode.node.loc ?? null,
          suggestions: null,
        }),
      );
      return {
        object,
        property: propertyNode.toString(),
        value: {kind: 'UnsupportedNode', node: exprNode, loc: exprLoc},
      };
    }
    const value: InstructionValue = {
      kind: 'PropertyLoad',
      object: {...object},
      property,
      loc: exprLoc,
    };
    return {object, property, value};
  } else {
    if (!propertyNode.isExpression()) {
      builder.recordError(
        new CompilerErrorDetail({
          reason: `(BuildHIR::lowerMemberExpression) Expected Expression, got ${propertyNode.type} property`,
          category: ErrorCategory.Todo,
          loc: propertyNode.node.loc ?? null,
          suggestions: null,
        }),
      );
      return {
        object,
        property: propertyNode.toString(),
        value: {
          kind: 'UnsupportedNode',
          node: exprNode,
          loc: exprLoc,
        },
      };
    }
    const property = lowerExpressionToTemporary(builder, propertyNode);
    const value: InstructionValue = {
      kind: 'ComputedLoad',
      object: {...object},
      property: {...property},
      loc: exprLoc,
    };
    return {object, property, value};
  }
}

function lowerJsxElementName(
  builder: HIRBuilder,
  exprPath: NodePath<
    t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
  >,
): Place | BuiltinTag {
  const exprNode = exprPath.node;
  const exprLoc = exprNode.loc ?? GeneratedSource;
  if (exprPath.isJSXIdentifier()) {
    const tag: string = exprPath.node.name;
    if (tag.match(/^[A-Z]/)) {
      const kind = getLoadKind(builder, exprPath);
      return lowerValueToTemporary(builder, {
        kind: kind,
        place: lowerIdentifier(builder, exprPath),
        loc: exprLoc,
      });
    } else {
      return {
        kind: 'BuiltinTag',
        name: tag,
        loc: exprLoc,
      };
    }
  } else if (exprPath.isJSXMemberExpression()) {
    return lowerJsxMemberExpression(builder, exprPath);
  } else if (exprPath.isJSXNamespacedName()) {
    const namespace = exprPath.node.namespace.name;
    const name = exprPath.node.name.name;
    const tag = `${namespace}:${name}`;
    if (namespace.indexOf(':') !== -1 || name.indexOf(':') !== -1) {
      builder.recordError(
        new CompilerErrorDetail({
          reason: `Expected JSXNamespacedName to have no colons in the namespace or name`,
          description: `Got \`${namespace}\` : \`${name}\``,
          category: ErrorCategory.Syntax,
          loc: exprPath.node.loc ?? null,
          suggestions: null,
        }),
      );
    }
    const place = lowerValueToTemporary(builder, {
      kind: 'Primitive',
      value: tag,
      loc: exprLoc,
    });
    return place;
  } else {
    builder.recordError(
      new CompilerErrorDetail({
        reason: `(BuildHIR::lowerJsxElementName) Handle ${exprPath.type} tags`,
        category: ErrorCategory.Todo,
        loc: exprPath.node.loc ?? null,
        suggestions: null,
      }),
    );
    return lowerValueToTemporary(builder, {
      kind: 'UnsupportedNode',
      node: exprNode,
      loc: exprLoc,
    });
  }
}

function lowerJsxMemberExpression(
  builder: HIRBuilder,
  exprPath: NodePath<t.JSXMemberExpression>,
): Place {
  const loc = exprPath.node.loc ?? GeneratedSource;
  const object = exprPath.get('object');
  let objectPlace: Place;
  if (object.isJSXMemberExpression()) {
    objectPlace = lowerJsxMemberExpression(builder, object);
  } else {
    CompilerError.invariant(object.isJSXIdentifier(), {
      reason: `TypeScript refinement fail: expected 'JsxIdentifier', got \`${object.node.type}\``,
      loc: object.node.loc ?? GeneratedSource,
    });

    const kind = getLoadKind(builder, object);
    objectPlace = lowerValueToTemporary(builder, {
      kind: kind,
      place: lowerIdentifier(builder, object),
      loc: exprPath.node.loc ?? GeneratedSource,
    });
  }
  const property = exprPath.get('property').node.name;
  return lowerValueToTemporary(builder, {
    kind: 'PropertyLoad',
    object: objectPlace,
    property: makePropertyLiteral(property),
    loc,
  });
}

function lowerJsxElement(
  builder: HIRBuilder,
  exprPath: NodePath<
    | t.JSXText
    | t.JSXExpressionContainer
    | t.JSXSpreadChild
    | t.JSXElement
    | t.JSXFragment
  >,
): Place | null {
  const exprNode = exprPath.node;
  const exprLoc = exprNode.loc ?? GeneratedSource;
  if (exprPath.isJSXElement() || exprPath.isJSXFragment()) {
    return lowerExpressionToTemporary(builder, exprPath);
  } else if (exprPath.isJSXExpressionContainer()) {
    const expression = exprPath.get('expression');
    if (expression.isJSXEmptyExpression()) {
      return null;
    } else {
      CompilerError.invariant(expression.isExpression(), {
        reason: `(BuildHIR::lowerJsxElement) Expected Expression but found ${expression.type}!`,
        loc: expression.node.loc ?? GeneratedSource,
      });
      return lowerExpressionToTemporary(builder, expression);
    }
  } else if (exprPath.isJSXText()) {
    let text: string | null;
    if (builder.fbtDepth > 0) {
      /*
       * FBT whitespace normalization differs from standard JSX.
       * https://github.com/facebook/fbt/blob/0b4e0d13c30bffd0daa2a75715d606e3587b4e40/packages/babel-plugin-fbt/src/FbtUtil.js#L76-L87
       * Since the fbt transform runs after, let's just preserve all
       * whitespace in FBT subtrees as is.
       */
      text = exprPath.node.value;
    } else {
      text = trimJsxText(exprPath.node.value);
    }

    if (text === null) {
      return null;
    }
    const place = lowerValueToTemporary(builder, {
      kind: 'JSXText',
      value: text,
      loc: exprLoc,
    });
    return place;
  } else {
    builder.recordError(
      new CompilerErrorDetail({
        reason: `(BuildHIR::lowerJsxElement) Unhandled JsxElement, got: ${exprPath.type}`,
        category: ErrorCategory.Todo,
        loc: exprPath.node.loc ?? null,
        suggestions: null,
      }),
    );
    const place = lowerValueToTemporary(builder, {
      kind: 'UnsupportedNode',
      node: exprNode,
      loc: exprLoc,
    });
    return place;
  }
}

/*
 * Trims whitespace according to the JSX spec:
 * > JSX removes whitespace at the beginning and ending of a line.
 * > It also removes blank lines. New lines adjacent to tags are removed;
 * > new lines that occur in the middle of string literals are condensed
 * > into a single space.
 *
 * From https://legacy.reactjs.org/docs/jsx-in-depth.html#string-literals-1
 *
 * Implementation adapted from Babel:
 * https://github.com/babel/babel/blob/54d30f206057be64b496d2da1ec8c49d244ba4e4/packages/babel-types/src/utils/react/cleanJSXElementLiteralChild.ts#L5
 */
function trimJsxText(original: string): string | null {
  const lines = original.split(/\r\n|\n|\r/);

  let lastNonEmptyLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/[^ \t]/)) {
      lastNonEmptyLine = i;
    }
  }

  let str = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const isFirstLine = i === 0;
    const isLastLine = i === lines.length - 1;
    const isLastNonEmptyLine = i === lastNonEmptyLine;

    // replace rendered whitespace tabs with spaces
    let trimmedLine = line.replace(/\t/g, ' ');

    // trim whitespace touching a newline
    if (!isFirstLine) {
      trimmedLine = trimmedLine.replace(/^[ ]+/, '');
    }

    // trim whitespace touching an endline
    if (!isLastLine) {
      trimmedLine = trimmedLine.replace(/[ ]+$/, '');
    }

    if (trimmedLine) {
      if (!isLastNonEmptyLine) {
        trimmedLine += ' ';
      }

      str += trimmedLine;
    }
  }

  if (str.length !== 0) {
    return str;
  } else {
    return null;
  }
}

function lowerFunctionToValue(
  builder: HIRBuilder,
  expr: NodePath<
    t.FunctionExpression | t.ArrowFunctionExpression | t.FunctionDeclaration
  >,
): InstructionValue {
  const exprNode = expr.node;
  const exprLoc = exprNode.loc ?? GeneratedSource;
  const loweredFunc = lowerFunction(builder, expr);
  return {
    kind: 'FunctionExpression',
    name: loweredFunc.func.id,
    nameHint: null,
    type: expr.node.type,
    loc: exprLoc,
    loweredFunc,
  };
}

function lowerFunction(
  builder: HIRBuilder,
  expr: NodePath<
    | t.FunctionExpression
    | t.ArrowFunctionExpression
    | t.FunctionDeclaration
    | t.ObjectMethod
  >,
): LoweredFunction {
  const componentScope: Scope = builder.environment.parentFunction.scope;
  const capturedContext = gatherCapturedContext(expr, componentScope);

  /*
   * TODO(gsn): In the future, we could only pass in the context identifiers
   * that are actually used by this function and it's nested functions, rather
   * than all context identifiers.
   *
   * This isn't a problem in practice because use Babel's scope analysis to
   * identify the correct references.
   */
  const loweredFunc = lower(
    expr,
    builder.environment,
    builder.bindings,
    new Map([...builder.context, ...capturedContext]),
  );
  return {
    func: loweredFunc,
  };
}

function lowerExpressionToTemporary(
  builder: HIRBuilder,
  exprPath: NodePath<t.Expression>,
): Place {
  const value = lowerExpression(builder, exprPath);
  return lowerValueToTemporary(builder, value);
}

export function lowerValueToTemporary(
  builder: HIRBuilder,
  value: InstructionValue,
): Place {
  if (value.kind === 'LoadLocal' && value.place.identifier.name === null) {
    return value.place;
  }
  const place: Place = buildTemporaryPlace(builder, value.loc);
  builder.push({
    id: makeInstructionId(0),
    lvalue: {...place},
    value: value,
    effects: null,
    loc: value.loc,
  });
  return place;
}

function lowerIdentifier(
  builder: HIRBuilder,
  exprPath: NodePath<t.Identifier | t.JSXIdentifier>,
): Place {
  const exprNode = exprPath.node;
  const exprLoc = exprNode.loc ?? GeneratedSource;
  const binding = builder.resolveIdentifier(exprPath);
  switch (binding.kind) {
    case 'Identifier': {
      const place: Place = {
        kind: 'Identifier',
        identifier: binding.identifier,
        effect: Effect.Unknown,
        reactive: false,
        loc: exprLoc,
      };
      return place;
    }
    default: {
      if (binding.kind === 'Global' && binding.name === 'eval') {
        builder.recordError(
          new CompilerErrorDetail({
            reason: `The 'eval' function is not supported`,
            description:
              'Eval is an anti-pattern in JavaScript, and the code executed cannot be evaluated by React Compiler',
            category: ErrorCategory.UnsupportedSyntax,
            loc: exprPath.node.loc ?? null,
            suggestions: null,
          }),
        );
      }
      return lowerValueToTemporary(builder, {
        kind: 'LoadGlobal',
        binding,
        loc: exprLoc,
      });
    }
  }
}

// Creates a temporary Identifier and Place referencing that identifier.
function buildTemporaryPlace(builder: HIRBuilder, loc: SourceLocation): Place {
  const place: Place = {
    kind: 'Identifier',
    identifier: builder.makeTemporary(loc),
    effect: Effect.Unknown,
    reactive: false,
    loc,
  };
  return place;
}

function getStoreKind(
  builder: HIRBuilder,
  identifier: NodePath<t.Identifier>,
): 'StoreLocal' | 'StoreContext' {
  const isContext = builder.isContextIdentifier(identifier);
  return isContext ? 'StoreContext' : 'StoreLocal';
}

function getLoadKind(
  builder: HIRBuilder,
  identifier: NodePath<t.Identifier | t.JSXIdentifier>,
): 'LoadLocal' | 'LoadContext' {
  const isContext = builder.isContextIdentifier(identifier);
  return isContext ? 'LoadContext' : 'LoadLocal';
}

function lowerIdentifierForAssignment(
  builder: HIRBuilder,
  loc: SourceLocation,
  kind: InstructionKind,
  path: NodePath<t.Identifier>,
): Place | {kind: 'Global'; name: string} | null {
  const binding = builder.resolveIdentifier(path);
  if (binding.kind !== 'Identifier') {
    if (kind === InstructionKind.Reassign) {
      return {kind: 'Global', name: path.node.name};
    } else {
      // Else its an internal error bc we couldn't find the binding
      builder.recordError(
        new CompilerErrorDetail({
          reason: `(BuildHIR::lowerAssignment) Could not find binding for declaration.`,
          category: ErrorCategory.Invariant,
          loc: path.node.loc ?? null,
          suggestions: null,
        }),
      );
      return null;
    }
  } else if (
    binding.bindingKind === 'const' &&
    kind === InstructionKind.Reassign
  ) {
    builder.recordError(
      new CompilerErrorDetail({
        reason: `Cannot reassign a \`const\` variable`,
        category: ErrorCategory.Syntax,
        loc: path.node.loc ?? null,
        description:
          binding.identifier.name != null
            ? `\`${binding.identifier.name.value}\` is declared as const`
            : null,
      }),
    );
    return null;
  }

  const place: Place = {
    kind: 'Identifier',
    identifier: binding.identifier,
    effect: Effect.Unknown,
    reactive: false,
    loc,
  };
  return place;
}

function lowerAssignment(
  builder: HIRBuilder,
  loc: SourceLocation,
  kind: InstructionKind,
  lvaluePath: NodePath<t.LVal>,
  value: Place,
  assignmentKind: 'Destructure' | 'Assignment',
): InstructionValue {
  const lvalueNode = lvaluePath.node;
  switch (lvalueNode.type) {
    case 'Identifier': {
      const lvalue = lvaluePath as NodePath<t.Identifier>;
      const place = lowerIdentifierForAssignment(builder, loc, kind, lvalue);
      if (place === null) {
        return {
          kind: 'UnsupportedNode',
          loc: lvalue.node.loc ?? GeneratedSource,
          node: lvalue.node,
        };
      } else if (place.kind === 'Global') {
        const temporary = lowerValueToTemporary(builder, {
          kind: 'StoreGlobal',
          name: place.name,
          value,
          loc,
        });
        return {kind: 'LoadLocal', place: temporary, loc: temporary.loc};
      }
      const isHoistedIdentifier = builder.environment.isHoistedIdentifier(
        lvalue.node,
      );

      let temporary;
      if (builder.isContextIdentifier(lvalue)) {
        if (kind === InstructionKind.Const && !isHoistedIdentifier) {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `Expected \`const\` declaration not to be reassigned`,
              category: ErrorCategory.Syntax,
              loc: lvalue.node.loc ?? null,
              suggestions: null,
            }),
          );
        }

        if (
          kind !== InstructionKind.Const &&
          kind !== InstructionKind.Reassign &&
          kind !== InstructionKind.Let &&
          kind !== InstructionKind.Function
        ) {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `Unexpected context variable kind`,
              category: ErrorCategory.Syntax,
              loc: lvalue.node.loc ?? null,
              suggestions: null,
            }),
          );
          temporary = lowerValueToTemporary(builder, {
            kind: 'UnsupportedNode',
            node: lvalueNode,
            loc: lvalueNode.loc ?? GeneratedSource,
          });
        } else {
          temporary = lowerValueToTemporary(builder, {
            kind: 'StoreContext',
            lvalue: {place: {...place}, kind},
            value,
            loc,
          });
        }
      } else {
        const typeAnnotation = lvalue.get('typeAnnotation');
        let type: t.FlowType | t.TSType | null;
        if (typeAnnotation.isTSTypeAnnotation()) {
          const typePath = typeAnnotation.get('typeAnnotation');
          type = typePath.node;
        } else if (typeAnnotation.isTypeAnnotation()) {
          const typePath = typeAnnotation.get('typeAnnotation');
          type = typePath.node;
        } else {
          type = null;
        }
        temporary = lowerValueToTemporary(builder, {
          kind: 'StoreLocal',
          lvalue: {place: {...place}, kind},
          value,
          type,
          loc,
        });
      }
      return {kind: 'LoadLocal', place: temporary, loc: temporary.loc};
    }
    case 'MemberExpression': {
      // This can only occur because of a coding error, parsers enforce this condition
      CompilerError.invariant(kind === InstructionKind.Reassign, {
        reason: 'MemberExpression may only appear in an assignment expression',
        loc: lvaluePath.node.loc ?? GeneratedSource,
      });
      const lvalue = lvaluePath as NodePath<t.MemberExpression>;
      const property = lvalue.get('property');
      const object = lowerExpressionToTemporary(builder, lvalue.get('object'));
      if (!lvalue.node.computed || lvalue.get('property').isNumericLiteral()) {
        let temporary;
        if (property.isIdentifier()) {
          temporary = lowerValueToTemporary(builder, {
            kind: 'PropertyStore',
            object,
            property: makePropertyLiteral(property.node.name),
            value,
            loc,
          });
        } else if (property.isNumericLiteral()) {
          temporary = lowerValueToTemporary(builder, {
            kind: 'PropertyStore',
            object,
            property: makePropertyLiteral(property.node.value),
            value,
            loc,
          });
        } else {
          builder.recordError(
            new CompilerErrorDetail({
              reason: `(BuildHIR::lowerAssignment) Handle ${property.type} properties in MemberExpression`,
              category: ErrorCategory.Todo,
              loc: property.node.loc ?? null,
              suggestions: null,
            }),
          );
          return {kind: 'UnsupportedNode', node: lvalueNode, loc};
        }
        return {kind: 'LoadLocal', place: temporary, loc: temporary.loc};
      } else {
        if (!property.isExpression()) {
          builder.recordError(
            new CompilerErrorDetail({
              reason:
                '(BuildHIR::lowerAssignment) Expected private name to appear as a non-computed property',
              category: ErrorCategory.Todo,
              loc: property.node.loc ?? null,
              suggestions: null,
            }),
          );
          return {kind: 'UnsupportedNode', node: lvalueNode, loc};
        }
        const propertyPlace = lowerExpressionToTemporary(builder, property);
        const temporary = lowerValueToTemporary(builder, {
          kind: 'ComputedStore',
          object,
          property: propertyPlace,
          value,
          loc,
        });
        return {kind: 'LoadLocal', place: temporary, loc: temporary.loc};
      }
    }
    case 'ArrayPattern': {
      const lvalue = lvaluePath as NodePath<t.ArrayPattern>;
      const elements = lvalue.get('elements');
      const items: ArrayPattern['items'] = [];
      const followups: Array<{place: Place; path: NodePath<t.LVal>}> = [];
      /*
       * A given destructuring statement must contain all declarations or all
       * reassignments. This is enforced by the parser, but we rewrite nested
       * destructuring into assignment to a temporary. Therefore, if we see
       * any reassignments that are nested destructuring we fall back to
       * using temporaries for all variables, and emitting the actual reassignments
       * in follow-up statements
       */
      const forceTemporaries =
        kind === InstructionKind.Reassign &&
        (elements.some(element => !element.isIdentifier()) ||
          elements.some(
            element =>
              element.isIdentifier() &&
              (getStoreKind(builder, element) !== 'StoreLocal' ||
                builder.resolveIdentifier(element).kind !== 'Identifier'),
          ));
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element.node == null) {
          items.push({
            kind: 'Hole',
          });
          continue;
        }
        if (element.isRestElement()) {
          const argument = element.get('argument');
          if (
            argument.isIdentifier() &&
            !forceTemporaries &&
            (assignmentKind === 'Assignment' ||
              getStoreKind(builder, argument) === 'StoreLocal')
          ) {
            const identifier = lowerIdentifierForAssignment(
              builder,
              element.node.loc ?? GeneratedSource,
              kind,
              argument,
            );
            if (identifier === null) {
              continue;
            } else if (identifier.kind === 'Global') {
              builder.recordError(
                new CompilerErrorDetail({
                  category: ErrorCategory.Todo,
                  reason:
                    'Expected reassignment of globals to enable forceTemporaries',
                  loc: element.node.loc ?? GeneratedSource,
                }),
              );
              continue;
            }
            items.push({
              kind: 'Spread',
              place: identifier,
            });
          } else {
            const temp = buildTemporaryPlace(
              builder,
              element.node.loc ?? GeneratedSource,
            );
            promoteTemporary(temp.identifier);
            items.push({
              kind: 'Spread',
              place: {...temp},
            });
            followups.push({place: temp, path: argument as NodePath<t.LVal>}); // TODO remove type cast
          }
        } else if (
          element.isIdentifier() &&
          !forceTemporaries &&
          (assignmentKind === 'Assignment' ||
            getStoreKind(builder, element) === 'StoreLocal')
        ) {
          const identifier = lowerIdentifierForAssignment(
            builder,
            element.node.loc ?? GeneratedSource,
            kind,
            element,
          );
          if (identifier === null) {
            continue;
          } else if (identifier.kind === 'Global') {
            builder.recordError(
              new CompilerErrorDetail({
                category: ErrorCategory.Todo,
                reason:
                  'Expected reassignment of globals to enable forceTemporaries',
                loc: element.node.loc ?? GeneratedSource,
              }),
            );
            continue;
          }
          items.push(identifier);
        } else {
          const temp = buildTemporaryPlace(
            builder,
            element.node.loc ?? GeneratedSource,
          );
          promoteTemporary(temp.identifier);
          items.push({...temp});
          followups.push({place: temp, path: element as NodePath<t.LVal>}); // TODO remove type cast
        }
      }
      const temporary = lowerValueToTemporary(builder, {
        kind: 'Destructure',
        lvalue: {
          kind,
          pattern: {
            kind: 'ArrayPattern',
            items,
            loc: lvalue.node.loc ?? GeneratedSource,
          },
        },
        value,
        loc,
      });
      for (const {place, path} of followups) {
        lowerAssignment(
          builder,
          path.node.loc ?? loc,
          kind,
          path,
          place,
          assignmentKind,
        );
      }
      return {kind: 'LoadLocal', place: temporary, loc: value.loc};
    }
    case 'ObjectPattern': {
      const lvalue = lvaluePath as NodePath<t.ObjectPattern>;
      const propertiesPaths = lvalue.get('properties');
      const properties: ObjectPattern['properties'] = [];
      const followups: Array<{place: Place; path: NodePath<t.LVal>}> = [];
      /*
       * A given destructuring statement must contain all declarations or all
       * reassignments. This is enforced by the parser, but we rewrite nested
       * destructuring into assignment to a temporary. Therefore, if we see
       * any reassignments that are nested destructuring we fall back to
       * using temporaries for all variables, and emitting the actual reassignments
       * in follow-up statements
       */
      const forceTemporaries =
        kind === InstructionKind.Reassign &&
        propertiesPaths.some(
          property =>
            property.isRestElement() ||
            (property.isObjectProperty() &&
              (!property.get('value').isIdentifier() ||
                builder.resolveIdentifier(
                  property.get('value') as NodePath<t.Identifier>,
                ).kind !== 'Identifier')),
        );
      for (let i = 0; i < propertiesPaths.length; i++) {
        const property = propertiesPaths[i];
        if (property.isRestElement()) {
          const argument = property.get('argument');
          if (!argument.isIdentifier()) {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerAssignment) Handle ${argument.node.type} rest element in ObjectPattern`,
                category: ErrorCategory.Todo,
                loc: argument.node.loc ?? null,
                suggestions: null,
              }),
            );
            continue;
          }
          if (
            forceTemporaries ||
            getStoreKind(builder, argument) === 'StoreContext'
          ) {
            const temp = buildTemporaryPlace(
              builder,
              property.node.loc ?? GeneratedSource,
            );
            promoteTemporary(temp.identifier);
            properties.push({
              kind: 'Spread',
              place: {...temp},
            });
            followups.push({place: temp, path: argument as NodePath<t.LVal>}); // TODO remove type cast
          } else {
            const identifier = lowerIdentifierForAssignment(
              builder,
              property.node.loc ?? GeneratedSource,
              kind,
              argument,
            );
            if (identifier === null) {
              continue;
            } else if (identifier.kind === 'Global') {
              builder.recordError(
                new CompilerErrorDetail({
                  category: ErrorCategory.Todo,
                  reason:
                    'Expected reassignment of globals to enable forceTemporaries',
                  loc: property.node.loc ?? GeneratedSource,
                }),
              );
              continue;
            }
            properties.push({
              kind: 'Spread',
              place: identifier,
            });
          }
        } else {
          // TODO: this should always be true given the if/else
          if (!property.isObjectProperty()) {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerAssignment) Handle ${property.type} properties in ObjectPattern`,
                category: ErrorCategory.Todo,
                loc: property.node.loc ?? null,
                suggestions: null,
              }),
            );
            continue;
          }
          if (property.node.computed) {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerAssignment) Handle computed properties in ObjectPattern`,
                category: ErrorCategory.Todo,
                loc: property.node.loc ?? null,
                suggestions: null,
              }),
            );
            continue;
          }
          const loweredKey = lowerObjectPropertyKey(builder, property);
          if (!loweredKey) {
            continue;
          }
          const element = property.get('value');
          if (!element.isLVal()) {
            builder.recordError(
              new CompilerErrorDetail({
                reason: `(BuildHIR::lowerAssignment) Expected object property value to be an LVal, got: ${element.type}`,
                category: ErrorCategory.Todo,
                loc: element.node.loc ?? null,
                suggestions: null,
              }),
            );
            continue;
          }
          if (
            element.isIdentifier() &&
            !forceTemporaries &&
            (assignmentKind === 'Assignment' ||
              getStoreKind(builder, element) === 'StoreLocal')
          ) {
            const identifier = lowerIdentifierForAssignment(
              builder,
              element.node.loc ?? GeneratedSource,
              kind,
              element,
            );
            if (identifier === null) {
              continue;
            } else if (identifier.kind === 'Global') {
              builder.recordError(
                new CompilerErrorDetail({
                  category: ErrorCategory.Todo,
                  reason:
                    'Expected reassignment of globals to enable forceTemporaries',
                  loc: element.node.loc ?? GeneratedSource,
                }),
              );
              continue;
            }
            properties.push({
              kind: 'ObjectProperty',
              type: 'property',
              place: identifier,
              key: loweredKey,
            });
          } else {
            const temp = buildTemporaryPlace(
              builder,
              element.node.loc ?? GeneratedSource,
            );
            promoteTemporary(temp.identifier);
            properties.push({
              kind: 'ObjectProperty',
              type: 'property',
              place: {...temp},
              key: loweredKey,
            });
            followups.push({place: temp, path: element as NodePath<t.LVal>}); // TODO remove type cast
          }
        }
      }
      const temporary = lowerValueToTemporary(builder, {
        kind: 'Destructure',
        lvalue: {
          kind,
          pattern: {
            kind: 'ObjectPattern',
            properties,
            loc: lvalue.node.loc ?? GeneratedSource,
          },
        },
        value,
        loc,
      });
      for (const {place, path} of followups) {
        lowerAssignment(
          builder,
          path.node.loc ?? loc,
          kind,
          path,
          place,
          assignmentKind,
        );
      }
      return {kind: 'LoadLocal', place: temporary, loc: value.loc};
    }
    case 'AssignmentPattern': {
      const lvalue = lvaluePath as NodePath<t.AssignmentPattern>;
      const loc = lvalue.node.loc ?? GeneratedSource;
      const temp = buildTemporaryPlace(builder, loc);

      const testBlock = builder.reserve('value');
      const continuationBlock = builder.reserve(builder.currentBlockKind());

      const consequent = builder.enter('value', () => {
        /*
         * Because we reorder evaluation, we restrict the allowed default values to those where
         * evaluation order is unobservable
         */
        const defaultValue = lowerReorderableExpression(
          builder,
          lvalue.get('right'),
        );
        lowerValueToTemporary(builder, {
          kind: 'StoreLocal',
          lvalue: {kind: InstructionKind.Const, place: {...temp}},
          value: {...defaultValue},
          type: null,
          loc,
        });
        return {
          kind: 'goto',
          variant: GotoVariant.Break,
          block: continuationBlock.id,
          id: makeInstructionId(0),
          loc,
        };
      });

      const alternate = builder.enter('value', () => {
        lowerValueToTemporary(builder, {
          kind: 'StoreLocal',
          lvalue: {kind: InstructionKind.Const, place: {...temp}},
          value: {...value},
          type: null,
          loc,
        });
        return {
          kind: 'goto',
          variant: GotoVariant.Break,
          block: continuationBlock.id,
          id: makeInstructionId(0),
          loc,
        };
      });
      builder.terminateWithContinuation(
        {
          kind: 'ternary',
          test: testBlock.id,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
          loc,
        },
        testBlock,
      );
      const undef = lowerValueToTemporary(builder, {
        kind: 'Primitive',
        value: undefined,
        loc,
      });
      const test = lowerValueToTemporary(builder, {
        kind: 'BinaryExpression',
        left: {...value},
        operator: '===',
        right: {...undef},
        loc,
      });
      builder.terminateWithContinuation(
        {
          kind: 'branch',
          test: {...test},
          consequent,
          alternate,
          fallthrough: continuationBlock.id,
          id: makeInstructionId(0),
          loc,
        },
        continuationBlock,
      );

      return lowerAssignment(
        builder,
        loc,
        kind,
        lvalue.get('left'),
        temp,
        assignmentKind,
      );
    }
    default: {
      builder.recordError(
        new CompilerErrorDetail({
          reason: `(BuildHIR::lowerAssignment) Handle ${lvaluePath.type} assignments`,
          category: ErrorCategory.Todo,
          loc: lvaluePath.node.loc ?? null,
          suggestions: null,
        }),
      );
      return {kind: 'UnsupportedNode', node: lvalueNode, loc};
    }
  }
}

function captureScopes({from, to}: {from: Scope; to: Scope}): Set<Scope> {
  let scopes: Set<Scope> = new Set();
  while (from) {
    scopes.add(from);

    if (from === to) {
      break;
    }

    from = from.parent;
  }
  return scopes;
}

/**
 * Returns a mapping of "context" identifiers — references to free variables that
 * will become part of the function expression's `context` array — along with the
 * source location of their first reference within the function.
 */
function gatherCapturedContext(
  fn: NodePath<
    | t.FunctionExpression
    | t.ArrowFunctionExpression
    | t.FunctionDeclaration
    | t.ObjectMethod
  >,
  componentScope: Scope,
): Map<t.Identifier, SourceLocation> {
  const capturedIds = new Map<t.Identifier, SourceLocation>();

  /*
   * Capture all the scopes from the parent of this function up to and including
   * the component scope.
   */
  const pureScopes: Set<Scope> = captureScopes({
    from: fn.scope.parent,
    to: componentScope,
  });

  function handleMaybeDependency(
    path: NodePath<t.Identifier> | NodePath<t.JSXOpeningElement>,
  ): void {
    // Base context variable to depend on
    let baseIdentifier: NodePath<t.Identifier> | NodePath<t.JSXIdentifier>;
    if (path.isJSXOpeningElement()) {
      const name = path.get('name');
      if (!(name.isJSXMemberExpression() || name.isJSXIdentifier())) {
        // TODO: should JSX namespaced names be handled here as well?
        return;
      }
      let current: NodePath<t.JSXMemberExpression | t.JSXIdentifier> = name;
      while (current.isJSXMemberExpression()) {
        current = current.get('object');
      }
      invariant(
        current.isJSXIdentifier(),
        'Invalid logic in gatherCapturedDeps',
      );
      baseIdentifier = current;
    } else {
      baseIdentifier = path;
    }

    /*
     * Skip dependency path, as we already tried to recursively add it (+ all subexpressions)
     * as a dependency.
     */
    path.skip();

    // Add the base identifier binding as a dependency.
    const binding = baseIdentifier.scope.getBinding(baseIdentifier.node.name);
    if (
      binding !== undefined &&
      pureScopes.has(binding.scope) &&
      !capturedIds.has(binding.identifier)
    ) {
      capturedIds.set(
        binding.identifier,
        path.node.loc ?? binding.identifier.loc ?? GeneratedSource,
      );
    }
  }

  fn.traverse({
    TypeAnnotation(path) {
      path.skip();
    },
    TSTypeAnnotation(path) {
      path.skip();
    },
    TypeAlias(path) {
      path.skip();
    },
    TSTypeAliasDeclaration(path) {
      path.skip();
    },
    Expression(path) {
      if (path.isAssignmentExpression()) {
        /*
         * Babel has a bug where it doesn't visit the LHS of an
         * AssignmentExpression if it's an Identifier. Work around it by explicitly
         * visiting it.
         */
        const left = path.get('left');
        if (left.isIdentifier()) {
          handleMaybeDependency(left);
        }
        return;
      } else if (path.isJSXElement()) {
        handleMaybeDependency(path.get('openingElement'));
      } else if (path.isIdentifier()) {
        handleMaybeDependency(path);
      }
    },
  });

  return capturedIds;
}

function notNull<T>(value: T | null): value is T {
  return value !== null;
}

export function lowerType(node: t.FlowType | t.TSType): Type {
  switch (node.type) {
    case 'GenericTypeAnnotation': {
      const id = node.id;
      if (id.type === 'Identifier' && id.name === 'Array') {
        return {kind: 'Object', shapeId: BuiltInArrayId};
      }
      return makeType();
    }
    case 'TSTypeReference': {
      const typeName = node.typeName;
      if (typeName.type === 'Identifier' && typeName.name === 'Array') {
        return {kind: 'Object', shapeId: BuiltInArrayId};
      }
      return makeType();
    }
    case 'ArrayTypeAnnotation':
    case 'TSArrayType': {
      return {kind: 'Object', shapeId: BuiltInArrayId};
    }
    case 'BooleanLiteralTypeAnnotation':
    case 'BooleanTypeAnnotation':
    case 'NullLiteralTypeAnnotation':
    case 'NumberLiteralTypeAnnotation':
    case 'NumberTypeAnnotation':
    case 'StringLiteralTypeAnnotation':
    case 'StringTypeAnnotation':
    case 'TSBooleanKeyword':
    case 'TSNullKeyword':
    case 'TSNumberKeyword':
    case 'TSStringKeyword':
    case 'TSSymbolKeyword':
    case 'TSUndefinedKeyword':
    case 'TSVoidKeyword':
    case 'VoidTypeAnnotation': {
      return {kind: 'Primitive'};
    }
    default: {
      return makeType();
    }
  }
}
