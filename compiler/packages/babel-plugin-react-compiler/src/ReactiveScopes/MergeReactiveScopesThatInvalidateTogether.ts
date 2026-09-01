/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '..';
import {
  DeclarationId,
  GeneratedSource,
  InstructionId,
  InstructionKind,
  Place,
  ReactiveBlock,
  ReactiveFunction,
  ReactiveScope,
  ReactiveScopeBlock,
  ReactiveScopeDependencies,
  ReactiveScopeDependency,
  ReactiveStatement,
  Type,
  areEqualPaths,
  makeInstructionId,
} from '../HIR';
import {
  BuiltInArrayId,
  BuiltInFunctionId,
  BuiltInJsxId,
  BuiltInObjectId,
} from '../HIR/ObjectShape';
import {eachInstructionLValue} from '../HIR/visitors';
import {assertExhaustive, Iterable_some} from '../Utils/utils';
import {printReactiveScopeSummary} from './PrintReactiveFunction';
import {
  ReactiveFunctionTransform,
  ReactiveFunctionVisitor,
  Transformed,
  visitReactiveFunction,
} from './visitors';

/*
 * The primary goal of this pass is to reduce memoization overhead, specifically:
 * - Use fewer memo slots
 * - Reduce the number of comparisons and other memoization-related instructions
 *
 * The algorithm merges in two main cases: consecutive scopes that invalidate together
 * or nested scopes that invalidate together
 *
 * ## Consecutive Scopes
 *
 * The idea is that if two consecutive scopes would always invalidate together,
 * it's more efficient to group the scopes together to save on memoization overhead.
 *
 * This optimization is necessarily somewhat limited. First, we only merge
 * scopes that are in the same (reactive) block, ie we don't merge across
 * control-flow or block-scoping boundaries. Second, we can only merge scopes
 * so long as any intermediate instructions are safe to memoize — specifically,
 * as long as the values created by those instructions are only referenced by
 * the second scope and not elsewhere. This is to avoid changing control-flow
 * and to avoid increasing the number of scope outputs (which defeats the optimization).
 *
 * With that in mind we can apply the optimization in two cases. Given a block with
 * scope A, some safe-to-memoize instructions I, and scope B, we can merge scopes when:
 * - A and B have identical dependencies. This means they will invalidate together, so
 *    by merging the scopes we can avoid duplicate cache slots and duplicate checks of
 *    those dependencies.
 * - The output of A is the input to B. Any invalidation of A will change its output
 *    which invalidates B, so we can similarly merge scopes. Note that this optimization
 *    may not be beneficial if the outupts of A are not guaranteed to change if its input
 *    changes, but in practice this is generally the case.
 *
 * ## Nested Scopes
 *
 * In this case, if an inner scope has the same dependencies as its parent, then we can
 * flatten away the inner scope since it will always invalidate at the same time.
 *
 * Note that PropagateScopeDependencies propagates scope dependencies upwards. This ensures
 * that parent scopes have the union of their own direct dependencies as well as those of
 * their (transitive) children. As a result nested scopes may have the same or fewer
 * dependencies than their parents, but not more dependencies. If they have fewer dependncies,
 * it means that the inner scope does not always invalidate with the parent and we should not
 * flatten. If they inner scope has the exact same dependencies, however, then it's always
 * better to flatten.
 */
export function mergeReactiveScopesThatInvalidateTogether(
  fn: ReactiveFunction,
): void {
  const lastUsageVisitor = new FindLastUsageVisitor();
  visitReactiveFunction(fn, lastUsageVisitor, undefined);
  visitReactiveFunction(fn, new Transform(lastUsageVisitor.lastUsage), null);
}

const DEBUG: boolean = false;
function log(msg: string): void {
  if (DEBUG) {
    console.log(msg);
  }
}

class FindLastUsageVisitor extends ReactiveFunctionVisitor<void> {
  /*
   * TODO LeaveSSA: use IdentifierId for more precise tracking
   * Using DeclarationId is necessary for compatible output but produces suboptimal results
   * in cases where a scope defines a variable, but that version is never read and always
   * overwritten later.
   * see reassignment-separate-scopes.js for example
   */
  lastUsage: Map<DeclarationId, InstructionId> = new Map();

  override visitPlace(id: InstructionId, place: Place, _state: void): void {
    const previousUsage = this.lastUsage.get(place.identifier.declarationId);
    const lastUsage =
      previousUsage !== undefined
        ? makeInstructionId(Math.max(previousUsage, id))
        : id;
    this.lastUsage.set(place.identifier.declarationId, lastUsage);
  }
}

class Transform extends ReactiveFunctionTransform<ReactiveScopeDependencies | null> {
  lastUsage: Map<DeclarationId, InstructionId>;
  temporaries: Map<DeclarationId, DeclarationId> = new Map();

  constructor(lastUsage: Map<DeclarationId, InstructionId>) {
    super();
    this.lastUsage = lastUsage;
  }

  override transformScope(
    scopeBlock: ReactiveScopeBlock,
    state: ReactiveScopeDependencies | null,
  ): Transformed<ReactiveStatement> {
    this.visitScope(scopeBlock, scopeBlock.scope.dependencies);
    if (
      state !== null &&
      areEqualDependencies(state, scopeBlock.scope.dependencies)
    ) {
      return {kind: 'replace-many', value: scopeBlock.instructions};
    } else {
      return {kind: 'keep'};
    }
  }

  override visitBlock(
    block: ReactiveBlock,
    state: ReactiveScopeDependencies | null,
  ): void {
    // Pass 1: visit nested blocks to potentially merge their scopes
    this.traverseBlock(block, state);

    // Pass 2: identify scopes for merging
    type MergedScope = {
      block: ReactiveScopeBlock;
      from: number;
      to: number;
      lvalues: Set<DeclarationId>;
    };
    let current: MergedScope | null = null;
    const merged: Array<MergedScope> = [];
    function reset(): void {
      CompilerError.invariant(current !== null, {
        reason:
          'MergeConsecutiveScopes: expected current scope to be non-null if reset()',
        loc: GeneratedSource,
      });
      if (current.to > current.from + 1) {
        merged.push(current);
      }
      current = null;
    }
    for (let i = 0; i < block.length; i++) {
      const instr = block[i]!;
      switch (instr.kind) {
        case 'terminal': {
          // For now we don't merge across terminals
          if (current !== null) {
            log(
              `Reset scope @${current.block.scope.id} from terminal [${instr.terminal.id}]`,
            );
            reset();
          }
          break;
        }
        case 'pruned-scope': {
          // For now we don't merge across pruned scopes
          if (current !== null) {
            log(
              `Reset scope @${current.block.scope.id} from pruned scope @${instr.scope.id}`,
            );
            reset();
          }
          break;
        }
        case 'instruction': {
          switch (instr.instruction.value.kind) {
            case 'BinaryExpression':
            case 'ComputedLoad':
            case 'JSXText':
            case 'LoadGlobal':
            case 'LoadLocal':
            case 'Primitive':
            case 'PropertyLoad':
            case 'TemplateLiteral':
            case 'UnaryExpression': {
              /*
               * We can merge two scopes if there are intervening instructions, but:
               * - Only if the instructions are simple and it's okay to make them
               *   execute conditionally (hence allowing a conservative subset of value kinds)
               * - The values produced are used at or before the next scope. If they are used
               *   later and we move them into the scope, then they wouldn't be accessible to
               *   subsequent code wo expanding the set of declarations, which we want to avoid
               */
              if (current !== null && instr.instruction.lvalue !== null) {
                current.lvalues.add(
                  instr.instruction.lvalue.identifier.declarationId,
                );
                if (instr.instruction.value.kind === 'LoadLocal') {
                  this.temporaries.set(
                    instr.instruction.lvalue.identifier.declarationId,
                    instr.instruction.value.place.identifier.declarationId,
                  );
                }
              }
              break;
            }
            case 'StoreLocal': {
              /**
               * It's safe to have intervening StoreLocal instructions _if_ they are const
               * and the last usage of the variable is at or before the next scope. This is
               * similar to the case above for simple instructions.
               *
               * Reassignments are *not* safe to merge since they are a side-effect that we
               * don't want to make conditional.
               */
              if (current !== null) {
                if (
                  instr.instruction.value.lvalue.kind === InstructionKind.Const
                ) {
                  for (const lvalue of eachInstructionLValue(
                    instr.instruction,
                  )) {
                    current.lvalues.add(lvalue.identifier.declarationId);
                  }
                  this.temporaries.set(
                    instr.instruction.value.lvalue.place.identifier
                      .declarationId,
                    this.temporaries.get(
                      instr.instruction.value.value.identifier.declarationId,
                    ) ?? instr.instruction.value.value.identifier.declarationId,
                  );
                } else {
                  log(
                    `Reset scope @${current.block.scope.id} from StoreLocal in [${instr.instruction.id}]`,
                  );
                  reset();
                }
              }
              break;
            }
            default: {
              // Other instructions are known to prevent merging, so we reset the scope if present
              if (current !== null) {
                log(
                  `Reset scope @${current.block.scope.id} from instruction [${instr.instruction.id}]`,
                );
                reset();
              }
            }
          }
          break;
        }
        case 'scope': {
          if (
            current !== null &&
            canMergeScopes(current.block, instr, this.temporaries) &&
            areLValuesLastUsedByScope(
              instr.scope,
              current.lvalues,
              this.lastUsage,
            )
          ) {
            // The current and next scopes can merge!
            log(
              `Can merge scope @${current.block.scope.id} with @${instr.scope.id}`,
            );
            // Update the merged scope's range
            current.block.scope.range.end = makeInstructionId(
              Math.max(current.block.scope.range.end, instr.scope.range.end),
            );
            // Add declarations
            for (const [key, value] of instr.scope.declarations) {
              current.block.scope.declarations.set(key, value);
            }
            /*
             * Then prune declarations - this removes declarations from the earlier
             * scope that are last-used at or before the newly merged subsequent scope
             */
            updateScopeDeclarations(current.block.scope, this.lastUsage);
            current.to = i + 1;
            /*
             * We already checked that intermediate values were used at-or-before the merged
             * scoped, so we can reset
             */
            current.lvalues.clear();

            if (!scopeIsEligibleForMerging(instr)) {
              /*
               * The subsequent scope that we just merged isn't guaranteed to invalidate if its
               * inputs change, so it is not a candidate for future merging
               */
              log(
                `  but scope @${instr.scope.id} doesnt guaranteed invalidate so it cannot merge further`,
              );
              reset();
            }
          } else {
            // No previous scope, or the scope cannot merge
            if (current !== null) {
              // Reset if necessary
              log(
                `Reset scope @${current.block.scope.id}, not mergeable with subsequent scope @${instr.scope.id}`,
              );
              reset();
            }
            // Only set a new merge candidate if the scope is guaranteed to invalidate on changes
            if (scopeIsEligibleForMerging(instr)) {
              current = {
                block: instr,
                from: i,
                to: i + 1,
                lvalues: new Set(),
              };
            } else {
              log(
                `scope @${instr.scope.id} doesnt guaranteed invalidate so it cannot merge further`,
              );
            }
          }
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
    if (current !== null) {
      reset();
    }
    if (merged.length) {
      log(`merged ${merged.length} scopes:`);
      for (const entry of merged) {
        log(
          printReactiveScopeSummary(entry.block.scope) +
            ` from=${entry.from} to=${entry.to}`,
        );
      }
    }

    // Pass 3: optional: if scopes can be merged, merge them and update the block
    if (merged.length === 0) {
      // Nothing merged, nothing to do!
      return;
    }
    const nextInstructions = [];
    let index = 0;
    for (const entry of merged) {
      if (index < entry.from) {
        nextInstructions.push(...block.slice(index, entry.from));
        index = entry.from;
      }
      const mergedScope = block[entry.from]!;
      CompilerError.invariant(mergedScope.kind === 'scope', {
        reason:
          'MergeConsecutiveScopes: Expected scope starting index to be a scope',
        loc: GeneratedSource,
      });
      nextInstructions.push(mergedScope);
      index++;
      while (index < entry.to) {
        const instr = block[index++]!;
        if (instr.kind === 'scope') {
          mergedScope.instructions.push(...instr.instructions);
          mergedScope.scope.merged.add(instr.scope.id);
        } else {
          mergedScope.instructions.push(instr);
        }
      }
    }
    while (index < block.length) {
      nextInstructions.push(block[index++]!);
    }
    block.length = 0;
    block.push(...nextInstructions);
  }
}

/*
 * Updates @param scope's declarations to remove any declarations that are not
 * used after the scope, based on the scope's updated range post-merging.
 */
function updateScopeDeclarations(
  scope: ReactiveScope,
  lastUsage: Map<DeclarationId, InstructionId>,
): void {
  for (const [id, decl] of scope.declarations) {
    const lastUsedAt = lastUsage.get(decl.identifier.declarationId)!;
    if (lastUsedAt < scope.range.end) {
      scope.declarations.delete(id);
    }
  }
}

/*
 * Returns whether the given @param scope is the last usage of all
 * the given @param lvalues. Returns false if any of the lvalues
 * are used again after the scope.
 */
function areLValuesLastUsedByScope(
  scope: ReactiveScope,
  lvalues: Set<DeclarationId>,
  lastUsage: Map<DeclarationId, InstructionId>,
): boolean {
  for (const lvalue of lvalues) {
    const lastUsedAt = lastUsage.get(lvalue)!;
    if (lastUsedAt >= scope.range.end) {
      log(`  lvalue ${lvalue} used after scope @${scope.id}, cannot merge`);
      return false;
    }
  }
  return true;
}

function canMergeScopes(
  current: ReactiveScopeBlock,
  next: ReactiveScopeBlock,
  temporaries: Map<DeclarationId, DeclarationId>,
): boolean {
  // Don't merge scopes with reassignments
  if (
    current.scope.reassignments.size !== 0 ||
    next.scope.reassignments.size !== 0
  ) {
    log(`  cannot merge, has reassignments`);
    return false;
  }
  // Merge scopes whose dependencies are identical
  if (
    areEqualDependencies(current.scope.dependencies, next.scope.dependencies)
  ) {
    log(`  canMergeScopes: dependencies are equal`);
    return true;
  }
  /*
   * Merge scopes where the outputs of the previous scope are the inputs
   * of the subsequent scope. Note that the output of a scope is not
   * guaranteed to change when its inputs change, for example `foo(x)`
   * may not change when `x` changes, for example `foo(x) { return x < 10}`
   * will not change as x changes from 0 -> 1.
   * Therefore we check that the outputs of the previous scope are of a type
   * that is guaranteed to invalidate with its inputs, and only merge in this case.
   */
  if (
    areEqualDependencies(
      new Set(
        [...current.scope.declarations.values()].map(declaration => ({
          identifier: declaration.identifier,
          reactive: true,
          path: [],
          loc: GeneratedSource,
        })),
      ),
      next.scope.dependencies,
    ) ||
    (next.scope.dependencies.size !== 0 &&
      [...next.scope.dependencies].every(
        dep =>
          dep.path.length === 0 &&
          isAlwaysInvalidatingType(dep.identifier.type) &&
          Iterable_some(
            current.scope.declarations.values(),
            decl =>
              decl.identifier.declarationId === dep.identifier.declarationId ||
              decl.identifier.declarationId ===
                temporaries.get(dep.identifier.declarationId),
          ),
      ))
  ) {
    log(`  outputs of prev are input to current`);
    return true;
  }
  log(`  cannot merge scopes:`);
  log(
    `  ${printReactiveScopeSummary(current.scope)} ${[...current.scope.declarations.values()].map(decl => decl.identifier.declarationId)}`,
  );
  log(
    `  ${printReactiveScopeSummary(next.scope)} ${[...next.scope.dependencies].map(dep => `${dep.identifier.declarationId} ${temporaries.get(dep.identifier.declarationId) ?? dep.identifier.declarationId}`)}`,
  );
  return false;
}

export function isAlwaysInvalidatingType(type: Type): boolean {
  switch (type.kind) {
    case 'Object': {
      switch (type.shapeId) {
        case BuiltInArrayId:
        case BuiltInObjectId:
        case BuiltInFunctionId:
        case BuiltInJsxId: {
          return true;
        }
      }
      break;
    }
    case 'Function': {
      return true;
    }
  }
  return false;
}

function areEqualDependencies(
  a: Set<ReactiveScopeDependency>,
  b: Set<ReactiveScopeDependency>,
): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const aValue of a) {
    let found = false;
    for (const bValue of b) {
      if (
        aValue.identifier.declarationId === bValue.identifier.declarationId &&
        areEqualPaths(aValue.path, bValue.path)
      ) {
        found = true;
        break;
      }
    }
    if (!found) {
      return false;
    }
  }
  return true;
}

/**
 * Is this scope eligible for merging with subsequent scopes? In general this
 * is only true if the scope's output values are guaranteed to change when its
 * input changes. When the output may not change, it's better to avoid merging
 * with subsequent scopes so that they can compare the input and avoid updating
 * when there are no changes.
 *
 * A special-case is if the scope has no dependencies, then its output will
 * *never* change and it's also eligible for merging.
 */
function scopeIsEligibleForMerging(scopeBlock: ReactiveScopeBlock): boolean {
  if (scopeBlock.scope.dependencies.size === 0) {
    /*
     * Regardless of the type of value produced, if the scope has no dependencies
     * then its value will never change.
     */
    return true;
  }
  return [...scopeBlock.scope.declarations].some(([, decl]) =>
    isAlwaysInvalidatingType(decl.identifier.type),
  );
}
