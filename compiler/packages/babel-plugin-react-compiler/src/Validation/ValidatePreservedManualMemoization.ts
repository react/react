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
  DeclarationId,
  Effect,
  GeneratedSource,
  Identifier,
  IdentifierId,
  InstructionValue,
  ManualMemoDependency,
  PrunedReactiveScopeBlock,
  ReactiveFunction,
  ReactiveInstruction,
  ReactiveScopeBlock,
  ReactiveScopeDependency,
  ReactiveValue,
  ScopeId,
  SourceLocation,
} from '../HIR';
import {Environment} from '../HIR/Environment';
import {printIdentifier, printManualMemoDependency} from '../HIR/PrintHIR';
import {
  eachInstructionValueLValue,
  eachInstructionValueOperand,
} from '../HIR/visitors';
import {collectMaybeMemoDependencies} from '../Inference/DropManualMemoization';
import {
  ReactiveFunctionVisitor,
  visitReactiveFunction,
} from '../ReactiveScopes/visitors';
import {getOrInsertDefault} from '../Utils/utils';

/**
 * Validates that all explicit manual memoization (useMemo/useCallback) was accurately
 * preserved, and that no originally memoized values became unmemoized in the output.
 *
 * This can occur if a value's mutable range somehow extended to include a hook and
 * was pruned.
 */
export function validatePreservedManualMemoization(fn: ReactiveFunction): void {
  const state = {
    env: fn.env,
    manualMemoState: null,
  };
  visitReactiveFunction(fn, new Visitor(), state);
}

const DEBUG = false;

type ManualMemoBlockState = {
  /**
   * Tracks reassigned temporaries.
   * This is necessary because useMemo calls are usually inlined.
   * Inlining produces a `let` declaration, followed by reassignments
   * to the newly declared variable (one per return statement).
   * Since InferReactiveScopes does not merge scopes across reassigned
   * variables (except in the case of a mutate-after-phi), we need to
   * track reassignments to validate we're retaining manual memo.
   */
  reassignments: Map<DeclarationId, Set<Identifier>>;
  // The source of the original memoization, used when reporting errors
  loc: SourceLocation;

  /**
   * Values produced within manual memoization blocks.
   * We track these to ensure our inferred dependencies are
   * produced before the manual memo block starts
   *
   * As an example:
   * ```js
   * // source
   * const result = useMemo(() => {
   *   return [makeObject(input1), input2],
   * }, [input1, input2]);
   * ```
   * Here, we record inferred dependencies as [input1, input2]
   * but not t0
   * ```js
   * // StartMemoize
   * let t0;
   * if ($[0] != input1) {
   *   t0 = makeObject(input1);
   *   // ...
   * } else { ... }
   *
   * let result;
   * if ($[1] != t0 || $[2] != input2) {
   *   result = [t0, input2];
   * } else { ... }
   * ```
   */
  decls: Set<DeclarationId>;

  /*
   * normalized depslist from useMemo/useCallback
   * callsite in source
   */
  depsFromSource: Array<ManualMemoDependency> | null;
  manualMemoId: number;
};

type VisitorState = {
  env: Environment;
  manualMemoState: ManualMemoBlockState | null;
};

function prettyPrintScopeDependency(val: ReactiveScopeDependency): string {
  let rootStr;
  if (val.identifier.name?.kind === 'named') {
    rootStr = val.identifier.name.value;
  } else {
    rootStr = '[unnamed]';
  }
  return `${rootStr}${val.path.map(v => `${v.optional ? '?.' : '.'}${v.property}`).join('')}`;
}

enum CompareDependencyResult {
  Ok = 0,
  RootDifference = 1,
  PathDifference = 2,
  Subpath = 3,
  RefAccessDifference = 4,
}

function merge(
  a: CompareDependencyResult,
  b: CompareDependencyResult,
): CompareDependencyResult {
  return Math.max(a, b);
}

function getCompareDependencyResultDescription(
  result: CompareDependencyResult,
): string {
  switch (result) {
    case CompareDependencyResult.Ok:
      return 'Dependencies equal';
    case CompareDependencyResult.RootDifference:
    case CompareDependencyResult.PathDifference:
      return 'Inferred different dependency than source';
    case CompareDependencyResult.RefAccessDifference:
      return 'Differences in ref.current access';
    case CompareDependencyResult.Subpath:
      return 'Inferred less specific property than source';
  }
}

function compareDeps(
  inferred: ManualMemoDependency,
  source: ManualMemoDependency,
): CompareDependencyResult {
  const rootsEqual =
    (inferred.root.kind === 'Global' &&
      source.root.kind === 'Global' &&
      inferred.root.identifierName === source.root.identifierName) ||
    (inferred.root.kind === 'NamedLocal' &&
      source.root.kind === 'NamedLocal' &&
      inferred.root.value.identifier.id === source.root.value.identifier.id);
  if (!rootsEqual) {
    return CompareDependencyResult.RootDifference;
  }

  let isSubpath = true;
  for (let i = 0; i < Math.min(inferred.path.length, source.path.length); i++) {
    if (inferred.path[i].property !== source.path[i].property) {
      isSubpath = false;
      break;
    } else if (inferred.path[i].optional !== source.path[i].optional) {
      /**
       * The inferred path must be at least as precise as the manual path:
       * if the inferred path is optional, then the source path must have
       * been optional too.
       */
      return CompareDependencyResult.PathDifference;
    }
  }

  if (
    isSubpath &&
    (source.path.length === inferred.path.length ||
      (inferred.path.length >= source.path.length &&
        !inferred.path.some(token => token.property === 'current')))
  ) {
    return CompareDependencyResult.Ok;
  } else {
    if (isSubpath) {
      if (
        source.path.some(token => token.property === 'current') ||
        inferred.path.some(token => token.property === 'current')
      ) {
        return CompareDependencyResult.RefAccessDifference;
      } else {
        return CompareDependencyResult.Subpath;
      }
    } else {
      return CompareDependencyResult.PathDifference;
    }
  }
}

/**
 * Validate that an inferred dependency either matches a source dependency
 * or is produced by earlier instructions in the same manual memoization
 * call.
 * Inferred dependency `rootA.[pathA]` matches a source dependency `rootB.[pathB]`
 * when:
 *   - rootA and rootB are loads from the same named identifier. Note that this
 *     identifier must be also named in source, as DropManualMemoization, which
 *     runs before any renaming passes, only records loads from named variables.
 *   - and one of the following holds:
 *       - pathA and pathB are identifical
 *       - pathB is a subpath of pathA and neither read into a `ref` type*
 *
 * We do not allow for partial matches on ref types because they are not immutable
 * values, e.g.
 * ref_prev === ref_new does not imply ref_prev.current === ref_new.current
 */
function validateInferredDep(
  dep: ReactiveScopeDependency,
  temporaries: Map<IdentifierId, ManualMemoDependency>,
  declsWithinMemoBlock: Set<DeclarationId>,
  validDepsInMemoBlock: Array<ManualMemoDependency>,
  env: Environment,
  memoLocation: SourceLocation,
): void {
  let normalizedDep: ManualMemoDependency;
  const maybeNormalizedRoot = temporaries.get(dep.identifier.id);
  if (maybeNormalizedRoot != null) {
    normalizedDep = {
      root: maybeNormalizedRoot.root,
      path: [...maybeNormalizedRoot.path, ...dep.path],
      loc: maybeNormalizedRoot.loc,
    };
  } else {
    CompilerError.invariant(dep.identifier.name?.kind === 'named', {
      reason:
        'ValidatePreservedManualMemoization: expected scope dependency to be named',
      loc: GeneratedSource,
    });
    normalizedDep = {
      root: {
        kind: 'NamedLocal',
        value: {
          kind: 'Identifier',
          identifier: dep.identifier,
          loc: GeneratedSource,
          effect: Effect.Read,
          reactive: false,
        },
        constant: false,
      },
      path: [...dep.path],
      loc: GeneratedSource,
    };
  }
  for (const decl of declsWithinMemoBlock) {
    if (
      normalizedDep.root.kind === 'NamedLocal' &&
      decl === normalizedDep.root.value.identifier.declarationId
    ) {
      return;
    }
  }
  let errorDiagnostic: CompareDependencyResult | null = null;
  for (const originalDep of validDepsInMemoBlock) {
    const compareResult = compareDeps(normalizedDep, originalDep);
    if (compareResult === CompareDependencyResult.Ok) {
      return;
    } else {
      errorDiagnostic = merge(errorDiagnostic ?? compareResult, compareResult);
    }
  }
  env.recordError(
    CompilerDiagnostic.create({
      category: ErrorCategory.PreserveManualMemo,
      reason: 'Existing memoization could not be preserved',
      description: [
        'React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. ',
        'The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. ',
        DEBUG ||
        // If the dependency is a named variable then we can report it. Otherwise only print in debug mode
        (dep.identifier.name != null && dep.identifier.name.kind === 'named')
          ? `The inferred dependency was \`${prettyPrintScopeDependency(
              dep,
            )}\`, but the source dependencies were [${validDepsInMemoBlock
              .map(dep => printManualMemoDependency(dep, true))
              .join(', ')}]. ${
              errorDiagnostic
                ? getCompareDependencyResultDescription(errorDiagnostic)
                : 'Inferred dependency not present in source'
            }`
          : '',
      ]
        .join('')
        .trim(),
      suggestions: null,
    }).withDetails({
      kind: 'error',
      loc: memoLocation,
      message: 'Could not preserve existing manual memoization',
    }),
  );
}

class Visitor extends ReactiveFunctionVisitor<VisitorState> {
  /**
   * Records all completed scopes (regardless of transitive memoization
   * of scope dependencies)
   *
   * Both @scopes and @prunedScopes are live sets. We rely on iterating
   * the reactive-ir in evaluation order, as they are used to determine
   * whether scope dependencies / declarations have completed mutation.
   */
  scopes: Set<ScopeId> = new Set();
  prunedScopes: Set<ScopeId> = new Set();
  temporaries: Map<IdentifierId, ManualMemoDependency> = new Map();

  /**
   * Recursively visit values and instructions to collect declarations
   * and property loads.
   * @returns a @{ManualMemoDependency} representing the variable +
   * property reads represented by @value
   */
  recordDepsInValue(value: ReactiveValue, state: VisitorState): void {
    switch (value.kind) {
      case 'SequenceExpression': {
        for (const instr of value.instructions) {
          this.visitInstruction(instr, state);
        }
        this.recordDepsInValue(value.value, state);
        break;
      }
      case 'OptionalExpression': {
        this.recordDepsInValue(value.value, state);
        break;
      }
      case 'ConditionalExpression': {
        this.recordDepsInValue(value.test, state);
        this.recordDepsInValue(value.consequent, state);
        this.recordDepsInValue(value.alternate, state);
        break;
      }
      case 'LogicalExpression': {
        this.recordDepsInValue(value.left, state);
        this.recordDepsInValue(value.right, state);
        break;
      }
      default: {
        collectMaybeMemoDependencies(value, this.temporaries, false);
        if (
          value.kind === 'StoreLocal' ||
          value.kind === 'StoreContext' ||
          value.kind === 'Destructure'
        ) {
          for (const storeTarget of eachInstructionValueLValue(value)) {
            state.manualMemoState?.decls.add(
              storeTarget.identifier.declarationId,
            );
            if (storeTarget.identifier.name?.kind === 'named') {
              this.temporaries.set(storeTarget.identifier.id, {
                root: {
                  kind: 'NamedLocal',
                  value: storeTarget,
                  constant: false,
                },
                path: [],
                loc: storeTarget.loc,
              });
            }
          }
        }
        break;
      }
    }
  }

  recordTemporaries(instr: ReactiveInstruction, state: VisitorState): void {
    const temporaries = this.temporaries;
    const {lvalue, value} = instr;
    const lvalId = lvalue?.identifier.id;
    if (lvalId != null && temporaries.has(lvalId)) {
      return;
    }
    const isNamedLocal = lvalue?.identifier.name?.kind === 'named';
    if (lvalue !== null && isNamedLocal && state.manualMemoState != null) {
      state.manualMemoState.decls.add(lvalue.identifier.declarationId);
    }

    this.recordDepsInValue(value, state);
    if (lvalue != null) {
      temporaries.set(lvalue.identifier.id, {
        root: {
          kind: 'NamedLocal',
          value: {...lvalue},
          constant: false,
        },
        path: [],
        loc: lvalue.loc,
      });
    }
  }

  override visitScope(
    scopeBlock: ReactiveScopeBlock,
    state: VisitorState,
  ): void {
    this.traverseScope(scopeBlock, state);

    if (
      state.manualMemoState != null &&
      state.manualMemoState.depsFromSource != null
    ) {
      for (const dep of scopeBlock.scope.dependencies) {
        validateInferredDep(
          dep,
          this.temporaries,
          state.manualMemoState.decls,
          state.manualMemoState.depsFromSource,
          state.env,
          state.manualMemoState.loc,
        );
      }
    }

    this.scopes.add(scopeBlock.scope.id);
    for (const id of scopeBlock.scope.merged) {
      this.scopes.add(id);
    }
  }

  override visitPrunedScope(
    scopeBlock: PrunedReactiveScopeBlock,
    state: VisitorState,
  ): void {
    this.traversePrunedScope(scopeBlock, state);
    this.prunedScopes.add(scopeBlock.scope.id);
  }

  override visitInstruction(
    instruction: ReactiveInstruction,
    state: VisitorState,
  ): void {
    /**
     * We don't invoke traverseInstructions because `recordDepsInValue`
     * recursively visits ReactiveValues and instructions
     */
    this.recordTemporaries(instruction, state);
    const value = instruction.value;
    // Track reassignments from inlining of manual memo
    if (
      value.kind === 'StoreLocal' &&
      value.lvalue.kind === 'Reassign' &&
      state.manualMemoState != null
    ) {
      // Complex cases of inlining end up with a temporary that is reassigned
      const ids = getOrInsertDefault(
        state.manualMemoState.reassignments,
        value.lvalue.place.identifier.declarationId,
        new Set(),
      );
      ids.add(value.value.identifier);
    }
    if (
      value.kind === 'LoadLocal' &&
      value.place.identifier.scope != null &&
      instruction.lvalue != null &&
      instruction.lvalue.identifier.scope == null &&
      state.manualMemoState != null
    ) {
      // Simpler cases of inlining assign to the original IIFE lvalue
      const ids = getOrInsertDefault(
        state.manualMemoState.reassignments,
        instruction.lvalue.identifier.declarationId,
        new Set(),
      );
      ids.add(value.place.identifier);
    }
    if (value.kind === 'StartMemoize') {
      CompilerError.invariant(state.manualMemoState == null, {
        reason: 'Unexpected nested StartMemoize instructions',
        description: `Bad manual memoization ids: ${state.manualMemoState?.manualMemoId}, ${value.manualMemoId}`,
        loc: value.loc,
      });

      if (value.hasInvalidDeps === true) {
        /*
         * ValidateExhaustiveDependencies already reported an error for this
         * memo block, skip validation to avoid duplicate errors
         */
        return;
      }

      let depsFromSource: Array<ManualMemoDependency> | null = null;
      if (value.deps != null) {
        depsFromSource = value.deps;
      }

      state.manualMemoState = {
        loc: instruction.loc,
        decls: new Set(),
        depsFromSource,
        manualMemoId: value.manualMemoId,
        reassignments: new Map(),
      };

      /**
       * We check that each scope dependency is either:
       * (1) Not scoped
       *     Checking `identifier.scope == null` is a proxy for whether the dep
       *     is a primitive, global, or other guaranteed non-allocating value.
       *     Non-allocating values do not need memoization.
       *     Note that this is a conservative estimate as some primitive-typed
       *     variables do receive scopes.
       * (2) Scoped (a maybe newly-allocated value with a mutable range)
       *     Here, we check that the dependency's scope has completed before
       *     the manual useMemo as a proxy for mutable-range checking. This
       *     validates that there are no potential rule-of-react violations
       *     in source.
       *     Note that scope range is an overly conservative proxy as we merge
       *     overlapping ranges.
       *     See fixture `error.false-positive-useMemo-overlap-scopes`
       */
      for (const {identifier, loc} of eachInstructionValueOperand(
        value as InstructionValue,
      )) {
        if (
          identifier.scope != null &&
          !this.scopes.has(identifier.scope.id) &&
          !this.prunedScopes.has(identifier.scope.id)
        ) {
          state.env.recordError(
            CompilerDiagnostic.create({
              category: ErrorCategory.PreserveManualMemo,
              reason: 'Existing memoization could not be preserved',
              description: [
                'React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. ',
                'This dependency may be mutated later, which could cause the value to change unexpectedly',
              ].join(''),
            }).withDetails({
              kind: 'error',
              loc,
              message: 'This dependency may be modified later',
            }),
          );
        }
      }
    }
    if (value.kind === 'FinishMemoize') {
      if (state.manualMemoState == null) {
        // StartMemoize had invalid deps, skip validation
        return;
      }
      CompilerError.invariant(
        state.manualMemoState.manualMemoId === value.manualMemoId,
        {
          reason: 'Unexpected mismatch between StartMemoize and FinishMemoize',
          description: `Encountered StartMemoize id=${state.manualMemoState.manualMemoId} followed by FinishMemoize id=${value.manualMemoId}`,
          loc: value.loc,
        },
      );
      const reassignments = state.manualMemoState.reassignments;
      state.manualMemoState = null;
      if (!value.pruned) {
        for (const {identifier, loc} of eachInstructionValueOperand(
          value as InstructionValue,
        )) {
          let decls;
          if (identifier.scope == null) {
            /**
             * If the manual memo was a useMemo that got inlined, iterate through
             * all reassignments to the iife temporary to ensure they're memoized.
             */
            decls = reassignments.get(identifier.declarationId) ?? [identifier];
          } else {
            decls = [identifier];
          }

          for (const identifier of decls) {
            if (isUnmemoized(identifier, this.scopes)) {
              state.env.recordError(
                CompilerDiagnostic.create({
                  category: ErrorCategory.PreserveManualMemo,
                  reason: 'Existing memoization could not be preserved',
                  description: [
                    'React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output',
                    DEBUG
                      ? `${printIdentifier(identifier)} was not memoized.`
                      : '',
                  ]
                    .join('')
                    .trim(),
                }).withDetails({
                  kind: 'error',
                  loc,
                  message: 'Could not preserve existing memoization',
                }),
              );
            }
          }
        }
      }
    }
  }
}

function isUnmemoized(operand: Identifier, scopes: Set<ScopeId>): boolean {
  return operand.scope != null && !scopes.has(operand.scope.id);
}
