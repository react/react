/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerDiagnostic, CompilerError, SourceLocation} from '..';
import {ErrorCategory} from '../CompilerError';
import {
  CallExpression,
  Effect,
  Environment,
  FinishMemoize,
  FunctionExpression,
  HIRFunction,
  IdentifierId,
  Instruction,
  InstructionId,
  InstructionValue,
  LoadGlobal,
  LoadLocal,
  ManualMemoDependency,
  MethodCall,
  Place,
  PropertyLoad,
  SpreadPattern,
  StartMemoize,
  TInstruction,
  getHookKindForType,
  makeInstructionId,
} from '../HIR';
import {createTemporaryPlace, markInstructionIds} from '../HIR/HIRBuilder';

type ManualMemoCallee = {
  kind: 'useMemo' | 'useCallback';
  loadInstr: TInstruction<LoadGlobal> | TInstruction<PropertyLoad>;
};

type IdentifierSidemap = {
  functions: Map<IdentifierId, TInstruction<FunctionExpression>>;
  manualMemos: Map<IdentifierId, ManualMemoCallee>;
  react: Set<IdentifierId>;
  maybeDepsLists: Map<IdentifierId, {loc: SourceLocation; deps: Array<Place>}>;
  maybeDeps: Map<IdentifierId, ManualMemoDependency>;
  optionals: Set<IdentifierId>;
};

/**
 * Collect loads from named variables and property reads from @value
 * into `maybeDeps`
 * Returns the variable + property reads represented by @instr
 */
export function collectMaybeMemoDependencies(
  value: InstructionValue,
  maybeDeps: Map<IdentifierId, ManualMemoDependency>,
  optional: boolean,
): ManualMemoDependency | null {
  switch (value.kind) {
    case 'LoadGlobal': {
      return {
        root: {
          kind: 'Global',
          identifierName: value.binding.name,
        },
        path: [],
        loc: value.loc,
      };
    }
    case 'PropertyLoad': {
      const object = maybeDeps.get(value.object.identifier.id);
      if (object != null) {
        return {
          root: object.root,
          // TODO: determine if the access is optional
          path: [
            ...object.path,
            {property: value.property, optional, loc: value.loc},
          ],
          loc: value.loc,
        };
      }
      break;
    }

    case 'LoadLocal':
    case 'LoadContext': {
      const source = maybeDeps.get(value.place.identifier.id);
      if (source != null) {
        return source;
      } else if (
        value.place.identifier.name != null &&
        value.place.identifier.name.kind === 'named'
      ) {
        return {
          root: {
            kind: 'NamedLocal',
            value: {...value.place},
            constant: false,
          },
          path: [],
          loc: value.place.loc,
        };
      }
      break;
    }
    case 'StoreLocal': {
      /*
       * Value blocks rely on StoreLocal to populate their return value.
       * We need to track these as optional property chains are valid in
       * source depslists
       */
      const lvalue = value.lvalue.place.identifier;
      const rvalue = value.value.identifier.id;
      const aliased = maybeDeps.get(rvalue);
      if (aliased != null && lvalue.name?.kind !== 'named') {
        maybeDeps.set(lvalue.id, aliased);
        return aliased;
      }
      break;
    }
  }
  return null;
}

function collectTemporaries(
  instr: Instruction,
  env: Environment,
  sidemap: IdentifierSidemap,
): void {
  const {value, lvalue} = instr;
  switch (value.kind) {
    case 'FunctionExpression': {
      sidemap.functions.set(
        instr.lvalue.identifier.id,
        instr as TInstruction<FunctionExpression>,
      );
      break;
    }
    case 'LoadGlobal': {
      const global = env.getGlobalDeclaration(value.binding, value.loc);
      const hookKind = global !== null ? getHookKindForType(env, global) : null;
      const lvalId = instr.lvalue.identifier.id;
      if (hookKind === 'useMemo' || hookKind === 'useCallback') {
        sidemap.manualMemos.set(lvalId, {
          kind: hookKind,
          loadInstr: instr as TInstruction<LoadGlobal>,
        });
      } else if (value.binding.name === 'React') {
        sidemap.react.add(lvalId);
      }
      break;
    }
    case 'PropertyLoad': {
      if (sidemap.react.has(value.object.identifier.id)) {
        const property = value.property;
        if (property === 'useMemo' || property === 'useCallback') {
          sidemap.manualMemos.set(instr.lvalue.identifier.id, {
            kind: property as 'useMemo' | 'useCallback',
            loadInstr: instr as TInstruction<PropertyLoad>,
          });
        }
      }
      break;
    }
    case 'ArrayExpression': {
      if (value.elements.every(e => e.kind === 'Identifier')) {
        sidemap.maybeDepsLists.set(instr.lvalue.identifier.id, {
          loc: value.loc,
          deps: value.elements as Array<Place>,
        });
      }
      break;
    }
  }
  const maybeDep = collectMaybeMemoDependencies(
    value,
    sidemap.maybeDeps,
    sidemap.optionals.has(lvalue.identifier.id),
  );
  // We don't expect named lvalues during this pass (unlike ValidatePreservingManualMemo)
  if (maybeDep != null) {
    sidemap.maybeDeps.set(lvalue.identifier.id, maybeDep);
  }
}

function makeManualMemoizationMarkers(
  fnExpr: Place,
  env: Environment,
  depsList: Array<ManualMemoDependency> | null,
  depsLoc: SourceLocation | null,
  memoDecl: Place,
  manualMemoId: number,
): [TInstruction<StartMemoize>, TInstruction<FinishMemoize>] {
  return [
    {
      id: makeInstructionId(0),
      lvalue: createTemporaryPlace(env, fnExpr.loc),
      value: {
        kind: 'StartMemoize',
        manualMemoId,
        /*
         * Use deps list from source instead of inferred deps
         * as dependencies
         */
        deps: depsList,
        depsLoc,
        loc: fnExpr.loc,
      },
      effects: null,
      loc: fnExpr.loc,
    },
    {
      id: makeInstructionId(0),
      lvalue: createTemporaryPlace(env, fnExpr.loc),
      value: {
        kind: 'FinishMemoize',
        manualMemoId,
        decl: {...memoDecl},
        loc: fnExpr.loc,
      },
      effects: null,
      loc: fnExpr.loc,
    },
  ];
}

function getManualMemoizationReplacement(
  fn: Place,
  loc: SourceLocation,
  kind: 'useMemo' | 'useCallback',
): LoadLocal | CallExpression {
  if (kind === 'useMemo') {
    /*
     * Replace the hook callee with the fn arg.
     *
     * before:
     *   $1 = LoadGlobal useMemo       // load the useMemo global
     *   $2 = FunctionExpression ...   // memo function
     *   $3 = ArrayExpression [ ... ]  // deps array
     *   $4 = Call $1 ($2, $3 )        // invoke useMemo w fn and deps
     *
     * after:
     *   $1 = LoadGlobal useMemo       // load the useMemo global (dead code)
     *   $2 = FunctionExpression ...   // memo function
     *   $3 = ArrayExpression [ ... ]  // deps array (dead code)
     *   $4 = Call $2 ()               // invoke the memo function itself
     *
     * Note that a later pass (InlineImmediatelyInvokedFunctionExpressions) will
     * inline the useMemo callback along with any other immediately invoked IIFEs.
     */
    return {
      kind: 'CallExpression',
      callee: fn,
      /*
       * Drop the args, including the deps array which DCE will remove
       * later.
       */
      args: [],
      loc,
    };
  } else {
    /*
     * Instead of a Call, just alias the callback directly.
     *
     * before:
     *   $1 = LoadGlobal useCallback
     *   $2 = FunctionExpression ...   // the callback being memoized
     *   $3 = ArrayExpression ...      // deps array
     *   $4 = Call $1 ( $2, $3 )       // invoke useCallback
     *
     * after:
     *   $1 = LoadGlobal useCallback   // dead code
     *   $2 = FunctionExpression ...   // the callback being memoized
     *   $3 = ArrayExpression ...      // deps array (dead code)
     *   $4 = LoadLocal $2             // reference the function
     */
    return {
      kind: 'LoadLocal',
      place: {
        kind: 'Identifier',
        identifier: fn.identifier,
        effect: Effect.Unknown,
        reactive: false,
        loc,
      },
      loc,
    };
  }
}

function extractManualMemoizationArgs(
  instr: TInstruction<CallExpression> | TInstruction<MethodCall>,
  kind: 'useCallback' | 'useMemo',
  sidemap: IdentifierSidemap,
  env: Environment,
): {
  fnPlace: Place;
  depsList: Array<ManualMemoDependency> | null;
  depsLoc: SourceLocation | null;
} | null {
  const [fnPlace, depsListPlace] = instr.value.args as Array<
    Place | SpreadPattern | undefined
  >;
  if (fnPlace == null || fnPlace.kind !== 'Identifier') {
    env.recordError(
      CompilerDiagnostic.create({
        category: ErrorCategory.UseMemo,
        reason: `Expected a callback function to be passed to ${kind}`,
        description:
          kind === 'useCallback'
            ? 'The first argument to useCallback() must be a function to cache'
            : 'The first argument to useMemo() must be a function that calculates a result to cache',
        suggestions: null,
      }).withDetails({
        kind: 'error',
        loc: instr.value.loc,
        message:
          kind === 'useCallback'
            ? `Expected a callback function`
            : `Expected a memoization function`,
      }),
    );
    return null;
  }
  if (depsListPlace == null) {
    return {
      fnPlace,
      depsList: null,
      depsLoc: null,
    };
  }
  const maybeDepsList =
    depsListPlace.kind === 'Identifier'
      ? sidemap.maybeDepsLists.get(depsListPlace.identifier.id)
      : null;
  if (maybeDepsList == null) {
    env.recordError(
      CompilerDiagnostic.create({
        category: ErrorCategory.UseMemo,
        reason: `Expected the dependency list for ${kind} to be an array literal`,
        description: `Expected the dependency list for ${kind} to be an array literal`,
        suggestions: null,
      }).withDetails({
        kind: 'error',
        loc:
          depsListPlace?.kind === 'Identifier' ? depsListPlace.loc : instr.loc,
        message: `Expected the dependency list for ${kind} to be an array literal`,
      }),
    );
    return null;
  }
  const depsList: Array<ManualMemoDependency> = [];
  for (const dep of maybeDepsList.deps) {
    const maybeDep = sidemap.maybeDeps.get(dep.identifier.id);
    if (maybeDep == null) {
      env.recordError(
        CompilerDiagnostic.create({
          category: ErrorCategory.UseMemo,
          reason: `Expected the dependency list to be an array of simple expressions (e.g. \`x\`, \`x.y.z\`, \`x?.y?.z\`)`,
          description: `Expected the dependency list to be an array of simple expressions (e.g. \`x\`, \`x.y.z\`, \`x?.y?.z\`)`,
          suggestions: null,
        }).withDetails({
          kind: 'error',
          loc: dep.loc,
          message: `Expected the dependency list to be an array of simple expressions (e.g. \`x\`, \`x.y.z\`, \`x?.y?.z\`)`,
        }),
      );
    } else {
      depsList.push(maybeDep);
    }
  }
  return {
    fnPlace,
    depsList,
    depsLoc: maybeDepsList.loc,
  };
}

/*
 * Removes manual memoization using the `useMemo` and `useCallback` APIs. This pass is designed
 * to compose with InlineImmediatelyInvokedFunctionExpressions, and needs to run prior to entering
 * SSA form (alternatively we could refactor and re-EnterSSA after inlining). Therefore it cannot
 * rely on type inference to find useMemo/useCallback invocations, and instead does basic tracking
 * of globals and property loads to find both direct calls as well as usage via the React namespace,
 * eg `React.useMemo()`.
 *
 * This pass also validates that useMemo callbacks return a value (not void), ensuring that useMemo
 * is only used for memoizing values and not for running arbitrary side effects.
 */
export function dropManualMemoization(func: HIRFunction): void {
  const isValidationEnabled =
    func.env.config.validatePreserveExistingMemoizationGuarantees ||
    func.env.config.validateNoSetStateInRender ||
    func.env.config.enablePreserveExistingMemoizationGuarantees;
  const optionals = findOptionalPlaces(func);
  const sidemap: IdentifierSidemap = {
    functions: new Map(),
    manualMemos: new Map(),
    react: new Set(),
    maybeDeps: new Map(),
    maybeDepsLists: new Map(),
    optionals,
  };
  let nextManualMemoId = 0;

  /**
   * Phase 1:
   * - Overwrite manual memoization from
   *   CallExpression callee="useMemo/Callback", args=[fnArg, depslist])
   *   to either
   *   CallExpression callee=fnArg
   *   LoadLocal fnArg
   * - (if validation is enabled) collect manual memoization markers
   */
  const queuedInserts: Map<
    InstructionId,
    TInstruction<StartMemoize> | TInstruction<FinishMemoize>
  > = new Map();
  for (const [_, block] of func.body.blocks) {
    for (let i = 0; i < block.instructions.length; i++) {
      const instr = block.instructions[i]!;
      if (
        instr.value.kind === 'CallExpression' ||
        instr.value.kind === 'MethodCall'
      ) {
        const id =
          instr.value.kind === 'CallExpression'
            ? instr.value.callee.identifier.id
            : instr.value.property.identifier.id;

        const manualMemo = sidemap.manualMemos.get(id);
        if (manualMemo != null) {
          const memoDetails = extractManualMemoizationArgs(
            instr as TInstruction<CallExpression> | TInstruction<MethodCall>,
            manualMemo.kind,
            sidemap,
            func.env,
          );

          if (memoDetails == null) {
            continue;
          }
          const {fnPlace, depsList, depsLoc} = memoDetails;

          instr.value = getManualMemoizationReplacement(
            fnPlace,
            instr.value.loc,
            manualMemo.kind,
          );
          if (isValidationEnabled) {
            /**
             * Explicitly bail out when we encounter manual memoization
             * without inline instructions, as our current validation
             * assumes that source depslists closely match inferred deps
             * due to the `exhaustive-deps` lint rule (which only provides
             * diagnostics for inline memo functions)
             * ```js
             * useMemo(opaqueFn, [dep1, dep2]);
             * ```
             * While we could handle this by diffing reactive scope deps
             * of the opaque arg against the source depslist, this pattern
             * is rare and likely sketchy.
             */
            if (!sidemap.functions.has(fnPlace.identifier.id)) {
              func.env.recordError(
                CompilerDiagnostic.create({
                  category: ErrorCategory.UseMemo,
                  reason: `Expected the first argument to be an inline function expression`,
                  description: `Expected the first argument to be an inline function expression`,
                  suggestions: [],
                }).withDetails({
                  kind: 'error',
                  loc: fnPlace.loc,
                  message: `Expected the first argument to be an inline function expression`,
                }),
              );
              continue;
            }
            const memoDecl: Place =
              manualMemo.kind === 'useMemo'
                ? instr.lvalue
                : {
                    kind: 'Identifier',
                    identifier: fnPlace.identifier,
                    effect: Effect.Unknown,
                    reactive: false,
                    loc: fnPlace.loc,
                  };

            const [startMarker, finishMarker] = makeManualMemoizationMarkers(
              fnPlace,
              func.env,
              depsList,
              depsLoc,
              memoDecl,
              nextManualMemoId++,
            );

            /**
             * Insert StartMarker right after the `useMemo`/`useCallback` load to
             * ensure all temporaries created when lowering the inline fn expression
             * are included.
             * e.g.
             * ```
             * 0: LoadGlobal useMemo
             * 1: StartMarker deps=[var]
             * 2: t0 = LoadContext [var]
             * 3: function deps=t0
             * ...
             * ```
             */
            queuedInserts.set(manualMemo.loadInstr.id, startMarker);
            queuedInserts.set(instr.id, finishMarker);
          }
        }
      } else {
        collectTemporaries(instr, func.env, sidemap);
      }
    }
  }

  /**
   * Phase 2: Insert manual memoization markers as needed
   */
  if (queuedInserts.size > 0) {
    let hasChanges = false;
    for (const [_, block] of func.body.blocks) {
      let nextInstructions: Array<Instruction> | null = null;
      for (let i = 0; i < block.instructions.length; i++) {
        const instr = block.instructions[i];
        const insertInstr = queuedInserts.get(instr.id);
        if (insertInstr != null) {
          nextInstructions = nextInstructions ?? block.instructions.slice(0, i);
          nextInstructions.push(instr);
          nextInstructions.push(insertInstr);
        } else if (nextInstructions != null) {
          nextInstructions.push(instr);
        }
      }
      if (nextInstructions !== null) {
        block.instructions = nextInstructions;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      markInstructionIds(func.body);
    }
  }
}

function findOptionalPlaces(fn: HIRFunction): Set<IdentifierId> {
  const optionals = new Set<IdentifierId>();
  for (const [, block] of fn.body.blocks) {
    if (block.terminal.kind === 'optional' && block.terminal.optional) {
      const optionalTerminal = block.terminal;
      let testBlock = fn.body.blocks.get(block.terminal.test)!;
      loop: while (true) {
        const terminal = testBlock.terminal;
        switch (terminal.kind) {
          case 'branch': {
            if (terminal.fallthrough === optionalTerminal.fallthrough) {
              // found it
              const consequent = fn.body.blocks.get(terminal.consequent)!;
              const last = consequent.instructions.at(-1);
              if (last !== undefined && last.value.kind === 'StoreLocal') {
                optionals.add(last.value.value.identifier.id);
              }
              break loop;
            } else {
              testBlock = fn.body.blocks.get(terminal.fallthrough)!;
            }
            break;
          }
          case 'optional':
          case 'logical':
          case 'sequence':
          case 'ternary': {
            testBlock = fn.body.blocks.get(terminal.fallthrough)!;
            break;
          }
          case 'maybe-throw': {
            testBlock = fn.body.blocks.get(terminal.continuation)!;
            break;
          }
          default: {
            CompilerError.invariant(false, {
              reason: `Unexpected terminal in optional`,
              message: `Unexpected ${terminal.kind} in optional`,
              loc: terminal.loc,
            });
          }
        }
      }
    }
  }
  return optionals;
}
