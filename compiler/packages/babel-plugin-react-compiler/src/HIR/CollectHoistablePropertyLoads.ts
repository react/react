/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {inRange} from '../ReactiveScopes/InferReactiveScopeVariables';
import {printDependency} from '../ReactiveScopes/PrintReactiveFunction';
import {
  Set_equal,
  Set_filter,
  Set_intersect,
  Set_union,
  getOrInsertDefault,
} from '../Utils/utils';
import {
  BasicBlock,
  BlockId,
  DependencyPathEntry,
  FunctionExpression,
  GeneratedSource,
  getHookKind,
  HIRFunction,
  Identifier,
  IdentifierId,
  InstructionId,
  InstructionValue,
  LoweredFunction,
  PropertyLiteral,
  ReactiveScopeDependency,
  ScopeId,
  SourceLocation,
  TInstruction,
} from './HIR';

const DEBUG_PRINT = false;

/**
 * Helper function for `PropagateScopeDependencies`. Uses control flow graph
 * analysis to determine which `Identifier`s can be assumed to be non-null
 * objects, on a per-block basis.
 *
 * Here is an example:
 * ```js
 * function useFoo(x, y, z) {
 *   // NOT safe to hoist PropertyLoads here
 *   if (...) {
 *     // safe to hoist loads from x
 *     read(x.a);
 *     return;
 *   }
 *   // safe to hoist loads from y, z
 *   read(y.b);
 *   if (...) {
 *     // safe to hoist loads from y, z
 *     read(z.a);
 *   } else {
 *     // safe to hoist loads from y, z
 *     read(z.b);
 *   }
 *   // safe to hoist loads from y, z
 *   return;
 * }
 * ```
 *
 * Note that we currently do NOT account for mutable / declaration range when
 * doing the CFG-based traversal, producing results that are technically
 * incorrect but filtered by PropagateScopeDeps (which only takes dependencies
 * on constructed value -- i.e. a scope's dependencies must have mutable ranges
 * ending earlier than the scope start).
 *
 * Take this example, this function will infer x.foo.bar as non-nullable for
 * bb0, via the intersection of bb1 & bb2 which in turn comes from bb3. This is
 * technically incorrect bb0 is before / during x's mutable range.
 * ```
 *  bb0:
 *    const x = ...;
 *    if cond then bb1 else bb2
 *  bb1:
 *    ...
 *    goto bb3
 *  bb2:
 *    ...
 *    goto bb3:
 *  bb3:
 *    x.foo.bar
 * ```
 *
 * @param fn
 * @param temporaries sidemap of identifier -> baseObject.a.b paths. Does not
 * contain optional chains.
 * @param hoistableFromOptionals sidemap of optionalBlock -> baseObject?.a
 * optional paths for which it's safe to evaluate non-optional loads (see
 * CollectOptionalChainDependencies).
 * @returns
 */
export function collectHoistablePropertyLoads(
  fn: HIRFunction,
  temporaries: ReadonlyMap<IdentifierId, ReactiveScopeDependency>,
  hoistableFromOptionals: ReadonlyMap<BlockId, ReactiveScopeDependency>,
): ReadonlyMap<BlockId, BlockInfo> {
  const registry = new PropertyPathRegistry();
  /**
   * Due to current limitations of mutable range inference, there are edge cases in
   * which we infer known-immutable values (e.g. props or hook params) to have a
   * mutable range and scope.
   * (see `destructure-array-declaration-to-context-var` fixture)
   * We track known immutable identifiers to reduce regressions (as PropagateScopeDeps
   * is being rewritten to HIR).
   */
  const knownImmutableIdentifiers = new Set<IdentifierId>();
  if (fn.fnType === 'Component' || fn.fnType === 'Hook') {
    for (const p of fn.params) {
      if (p.kind === 'Identifier') {
        knownImmutableIdentifiers.add(p.identifier.id);
      }
    }
  }
  return collectHoistablePropertyLoadsImpl(fn, {
    temporaries,
    knownImmutableIdentifiers,
    hoistableFromOptionals,
    registry,
    nestedFnImmutableContext: null,
    assumedInvokedFns: getAssumedInvokedFunctions(fn),
  });
}

export function collectHoistablePropertyLoadsInInnerFn(
  fnInstr: TInstruction<FunctionExpression>,
  temporaries: ReadonlyMap<IdentifierId, ReactiveScopeDependency>,
  hoistableFromOptionals: ReadonlyMap<BlockId, ReactiveScopeDependency>,
): ReadonlyMap<BlockId, BlockInfo> {
  const fn = fnInstr.value.loweredFunc.func;
  const initialContext: CollectHoistablePropertyLoadsContext = {
    temporaries,
    knownImmutableIdentifiers: new Set(),
    hoistableFromOptionals,
    registry: new PropertyPathRegistry(),
    nestedFnImmutableContext: null,
    assumedInvokedFns: getAssumedInvokedFunctions(fn),
  };
  const nestedFnImmutableContext = new Set(
    fn.context
      .filter(place =>
        isImmutableAtInstr(place.identifier, fnInstr.id, initialContext),
      )
      .map(place => place.identifier.id),
  );
  initialContext.nestedFnImmutableContext = nestedFnImmutableContext;
  return collectHoistablePropertyLoadsImpl(fn, initialContext);
}

type CollectHoistablePropertyLoadsContext = {
  temporaries: ReadonlyMap<IdentifierId, ReactiveScopeDependency>;
  knownImmutableIdentifiers: ReadonlySet<IdentifierId>;
  hoistableFromOptionals: ReadonlyMap<BlockId, ReactiveScopeDependency>;
  registry: PropertyPathRegistry;
  /**
   * (For nested / inner function declarations)
   * Context variables (i.e. captured from an outer scope) that are immutable.
   * Note that this technically could be merged into `knownImmutableIdentifiers`,
   * but are currently kept separate for readability.
   */
  nestedFnImmutableContext: ReadonlySet<IdentifierId> | null;
  /**
   * Functions which are assumed to be eventually called (as opposed to ones which might
   * not be called, e.g. the 0th argument of Array.map)
   */
  assumedInvokedFns: ReadonlySet<LoweredFunction>;
};
function collectHoistablePropertyLoadsImpl(
  fn: HIRFunction,
  context: CollectHoistablePropertyLoadsContext,
): ReadonlyMap<BlockId, BlockInfo> {
  const nodes = collectNonNullsInBlocks(fn, context);
  propagateNonNull(fn, nodes, context.registry);

  if (DEBUG_PRINT) {
    console.log('(printing hoistable nodes in blocks)');
    for (const [blockId, node] of nodes) {
      console.log(
        `bb${blockId}: ${[...node.assumedNonNullObjects].map(n => printDependency(n.fullPath)).join(' ')}`,
      );
    }
  }

  return nodes;
}

export function keyByScopeId<T>(
  fn: HIRFunction,
  source: ReadonlyMap<BlockId, T>,
): ReadonlyMap<ScopeId, T> {
  const keyedByScopeId = new Map<ScopeId, T>();
  for (const [_, block] of fn.body.blocks) {
    if (block.terminal.kind === 'scope') {
      keyedByScopeId.set(
        block.terminal.scope.id,
        source.get(block.terminal.block)!,
      );
    }
  }
  return keyedByScopeId;
}

export type BlockInfo = {
  block: BasicBlock;
  assumedNonNullObjects: ReadonlySet<PropertyPathNode>;
};

/**
 * PropertyLoadRegistry data structure to dedupe property loads (e.g. a.b.c)
 * and make computing sets intersections simpler.
 */
type RootNode = {
  properties: Map<PropertyLiteral, PropertyPathNode>;
  optionalProperties: Map<PropertyLiteral, PropertyPathNode>;
  parent: null;
  // Recorded to make later computations simpler
  fullPath: ReactiveScopeDependency;
  hasOptional: boolean;
  root: IdentifierId;
};

type PropertyPathNode =
  | {
      properties: Map<PropertyLiteral, PropertyPathNode>;
      optionalProperties: Map<PropertyLiteral, PropertyPathNode>;
      parent: PropertyPathNode;
      fullPath: ReactiveScopeDependency;
      hasOptional: boolean;
    }
  | RootNode;

class PropertyPathRegistry {
  roots: Map<IdentifierId, RootNode> = new Map();

  getOrCreateIdentifier(
    identifier: Identifier,
    reactive: boolean,
    loc: SourceLocation,
  ): PropertyPathNode {
    /**
     * Reads from a statically scoped variable are always safe in JS,
     * with the exception of TDZ (not addressed by this pass).
     */
    let rootNode = this.roots.get(identifier.id);

    if (rootNode === undefined) {
      rootNode = {
        root: identifier.id,
        properties: new Map(),
        optionalProperties: new Map(),
        fullPath: {
          identifier,
          reactive,
          path: [],
          loc,
        },
        hasOptional: false,
        parent: null,
      };
      this.roots.set(identifier.id, rootNode);
    } else {
      CompilerError.invariant(reactive === rootNode.fullPath.reactive, {
        reason:
          '[HoistablePropertyLoads] Found inconsistencies in `reactive` flag when deduping identifier reads within the same scope',
        loc: identifier.loc,
      });
    }
    return rootNode;
  }

  static getOrCreatePropertyEntry(
    parent: PropertyPathNode,
    entry: DependencyPathEntry,
  ): PropertyPathNode {
    const map = entry.optional ? parent.optionalProperties : parent.properties;
    let child = map.get(entry.property);
    if (child == null) {
      child = {
        properties: new Map(),
        optionalProperties: new Map(),
        parent: parent,
        fullPath: {
          identifier: parent.fullPath.identifier,
          reactive: parent.fullPath.reactive,
          path: parent.fullPath.path.concat(entry),
          loc: entry.loc,
        },
        hasOptional: parent.hasOptional || entry.optional,
      };
      map.set(entry.property, child);
    }
    return child;
  }

  getOrCreateProperty(n: ReactiveScopeDependency): PropertyPathNode {
    /**
     * We add ReactiveScopeDependencies according to instruction ordering,
     * so all subpaths of a PropertyLoad should already exist
     * (e.g. a.b is added before a.b.c),
     */
    let currNode = this.getOrCreateIdentifier(n.identifier, n.reactive, n.loc);
    if (n.path.length === 0) {
      return currNode;
    }
    for (let i = 0; i < n.path.length - 1; i++) {
      currNode = PropertyPathRegistry.getOrCreatePropertyEntry(
        currNode,
        n.path[i],
      );
    }

    return PropertyPathRegistry.getOrCreatePropertyEntry(
      currNode,
      n.path.at(-1)!,
    );
  }
}

function getMaybeNonNullInInstruction(
  value: InstructionValue,
  context: CollectHoistablePropertyLoadsContext,
): PropertyPathNode | null {
  let path: ReactiveScopeDependency | null = null;
  if (value.kind === 'PropertyLoad') {
    path = context.temporaries.get(value.object.identifier.id) ?? {
      identifier: value.object.identifier,
      reactive: value.object.reactive,
      path: [],
      loc: value.loc,
    };
  } else if (value.kind === 'Destructure') {
    path = context.temporaries.get(value.value.identifier.id) ?? null;
  } else if (value.kind === 'ComputedLoad') {
    path = context.temporaries.get(value.object.identifier.id) ?? null;
  }
  return path != null ? context.registry.getOrCreateProperty(path) : null;
}

function isImmutableAtInstr(
  identifier: Identifier,
  instr: InstructionId,
  context: CollectHoistablePropertyLoadsContext,
): boolean {
  if (context.nestedFnImmutableContext != null) {
    /**
     * Comparing instructions ids across inner-outer function bodies is not valid, as they are numbered
     */
    return context.nestedFnImmutableContext.has(identifier.id);
  } else {
    /**
     * Since this runs *after* buildReactiveScopeTerminals, identifier mutable ranges
     * are not valid with respect to current instruction id numbering.
     * We use attached reactive scope ranges as a proxy for mutable range, but this
     * is an overestimate as (1) scope ranges merge and align to form valid program
     * blocks and (2) passes like MemoizeFbtAndMacroOperands may assign scopes to
     * non-mutable identifiers.
     *
     * See comment in exported function for why we track known immutable identifiers.
     */
    const mutableAtInstr =
      identifier.mutableRange.end > identifier.mutableRange.start + 1 &&
      identifier.scope != null &&
      inRange(
        {
          id: instr,
        },
        identifier.scope.range,
      );
    return (
      !mutableAtInstr || context.knownImmutableIdentifiers.has(identifier.id)
    );
  }
}

function collectNonNullsInBlocks(
  fn: HIRFunction,
  context: CollectHoistablePropertyLoadsContext,
): ReadonlyMap<BlockId, BlockInfo> {
  /**
   * Known non-null objects such as functional component props can be safely
   * read from any block.
   */
  const knownNonNullIdentifiers = new Set<PropertyPathNode>();
  if (
    fn.fnType === 'Component' &&
    fn.params.length > 0 &&
    fn.params[0].kind === 'Identifier'
  ) {
    const identifier = fn.params[0].identifier;
    knownNonNullIdentifiers.add(
      context.registry.getOrCreateIdentifier(
        identifier,
        true,
        fn.params[0].loc,
      ),
    );
  }
  const nodes = new Map<
    BlockId,
    {
      block: BasicBlock;
      assumedNonNullObjects: Set<PropertyPathNode>;
    }
  >();
  for (const [_, block] of fn.body.blocks) {
    const assumedNonNullObjects = new Set<PropertyPathNode>(
      knownNonNullIdentifiers,
    );

    const maybeOptionalChain = context.hoistableFromOptionals.get(block.id);
    if (maybeOptionalChain != null) {
      assumedNonNullObjects.add(
        context.registry.getOrCreateProperty(maybeOptionalChain),
      );
    }
    for (const instr of block.instructions) {
      const maybeNonNull = getMaybeNonNullInInstruction(instr.value, context);
      if (
        maybeNonNull != null &&
        isImmutableAtInstr(maybeNonNull.fullPath.identifier, instr.id, context)
      ) {
        assumedNonNullObjects.add(maybeNonNull);
      }
      if (instr.value.kind === 'FunctionExpression') {
        const innerFn = instr.value.loweredFunc;
        if (context.assumedInvokedFns.has(innerFn)) {
          const innerHoistableMap = collectHoistablePropertyLoadsImpl(
            innerFn.func,
            {
              ...context,
              nestedFnImmutableContext:
                context.nestedFnImmutableContext ??
                new Set(
                  innerFn.func.context
                    .filter(place =>
                      isImmutableAtInstr(place.identifier, instr.id, context),
                    )
                    .map(place => place.identifier.id),
                ),
            },
          );
          const innerHoistables = assertNonNull(
            innerHoistableMap.get(innerFn.func.body.entry),
          );
          for (const entry of innerHoistables.assumedNonNullObjects) {
            assumedNonNullObjects.add(entry);
          }
        }
      } else if (
        fn.env.config.enablePreserveExistingMemoizationGuarantees &&
        instr.value.kind === 'StartMemoize' &&
        instr.value.deps != null
      ) {
        for (const dep of instr.value.deps) {
          if (dep.root.kind === 'NamedLocal') {
            if (
              !isImmutableAtInstr(dep.root.value.identifier, instr.id, context)
            ) {
              continue;
            }
            for (let i = 0; i < dep.path.length; i++) {
              const pathEntry = dep.path[i]!;
              if (pathEntry.optional) {
                break;
              }
              const depNode = context.registry.getOrCreateProperty({
                identifier: dep.root.value.identifier,
                path: dep.path.slice(0, i),
                reactive: dep.root.value.reactive,
                loc: dep.loc,
              });
              assumedNonNullObjects.add(depNode);
            }
          }
        }
      }
    }

    nodes.set(block.id, {
      block,
      assumedNonNullObjects,
    });
  }
  return nodes;
}

function propagateNonNull(
  fn: HIRFunction,
  nodes: ReadonlyMap<BlockId, BlockInfo>,
  registry: PropertyPathRegistry,
): void {
  const blockSuccessors = new Map<BlockId, Set<BlockId>>();
  const terminalPreds = new Set<BlockId>();

  for (const [blockId, block] of fn.body.blocks) {
    for (const pred of block.preds) {
      getOrInsertDefault(blockSuccessors, pred, new Set()).add(blockId);
    }
    if (block.terminal.kind === 'throw' || block.terminal.kind === 'return') {
      terminalPreds.add(blockId);
    }
  }

  /**
   * In the context of a control flow graph, the identifiers that a block
   * can assume are non-null can be calculated from the following:
   * X = Union(Intersect(X_neighbors), X)
   */
  function recursivelyPropagateNonNull(
    nodeId: BlockId,
    direction: 'forward' | 'backward',
    traversalState: Map<BlockId, 'active' | 'done'>,
  ): boolean {
    /**
     * Avoid re-visiting computed or currently active nodes, which can
     * occur when the control flow graph has backedges.
     */
    if (traversalState.has(nodeId)) {
      return false;
    }
    traversalState.set(nodeId, 'active');

    const node = nodes.get(nodeId);
    if (node == null) {
      CompilerError.invariant(false, {
        reason: `Bad node ${nodeId}, kind: ${direction}`,
        loc: GeneratedSource,
      });
    }
    const neighbors = Array.from(
      direction === 'backward'
        ? (blockSuccessors.get(nodeId) ?? [])
        : node.block.preds,
    );

    let changed = false;
    for (const pred of neighbors) {
      if (!traversalState.has(pred)) {
        const neighborChanged = recursivelyPropagateNonNull(
          pred,
          direction,
          traversalState,
        );
        changed ||= neighborChanged;
      }
    }
    /**
     * Note that a predecessor / successor can only be active (status != 'done')
     * if it is a self-loop or other transitive cycle. Active neighbors can be
     * filtered out (i.e. not included in the intersection)
     * Example: self loop.
     *    X = Union(Intersect(X, ...X_other_neighbors), X)
     *
     * Example: transitive cycle through node Y, for some Y that is a
     * predecessor / successor of X.
     *    X = Union(
     *          Intersect(
     *            Union(Intersect(X, ...Y_other_neighbors), Y),
     *            ...X_neighbors
     *          ),
     *          X
     *        )
     *
     * Non-active neighbors with no recorded results can occur due to backedges.
     * it's not safe to assume they can be filtered out (e.g. not included in
     * the intersection)
     */
    const neighborAccesses = Set_intersect(
      Array.from(neighbors)
        .filter(n => traversalState.get(n) === 'done')
        .map(n => assertNonNull(nodes.get(n)).assumedNonNullObjects),
    );

    const prevObjects = assertNonNull(nodes.get(nodeId)).assumedNonNullObjects;
    const mergedObjects = Set_union(prevObjects, neighborAccesses);
    reduceMaybeOptionalChains(mergedObjects, registry);

    assertNonNull(nodes.get(nodeId)).assumedNonNullObjects = mergedObjects;
    traversalState.set(nodeId, 'done');
    /**
     * Note that it's not sufficient to compare set sizes since
     * reduceMaybeOptionalChains may replace optional-chain loads with
     * unconditional loads. This could in turn change `assumedNonNullObjects` of
     * downstream blocks and backedges.
     */
    changed ||= !Set_equal(prevObjects, mergedObjects);
    return changed;
  }
  const traversalState = new Map<BlockId, 'done' | 'active'>();
  const reversedBlocks = [...fn.body.blocks];
  reversedBlocks.reverse();

  let changed;
  let i = 0;
  do {
    CompilerError.invariant(i++ < 100, {
      reason:
        '[CollectHoistablePropertyLoads] fixed point iteration did not terminate after 100 loops',
      loc: GeneratedSource,
    });

    changed = false;
    for (const [blockId] of fn.body.blocks) {
      const forwardChanged = recursivelyPropagateNonNull(
        blockId,
        'forward',
        traversalState,
      );
      changed ||= forwardChanged;
    }
    traversalState.clear();
    for (const [blockId] of reversedBlocks) {
      const backwardChanged = recursivelyPropagateNonNull(
        blockId,
        'backward',
        traversalState,
      );
      changed ||= backwardChanged;
    }
    traversalState.clear();
  } while (changed);
}

export function assertNonNull<T extends NonNullable<U>, U>(
  value: T | null | undefined,
  source?: string,
): T {
  CompilerError.invariant(value != null, {
    reason: 'Unexpected null',
    description: source != null ? `(from ${source})` : null,
    loc: GeneratedSource,
  });
  return value;
}

/**
 * Any two optional chains with different operations . vs ?. but the same set of
 * property strings paths de-duplicates.
 *
 * Intuitively: given <base>?.b, we know <base> to be either hoistable or not.
 * If unconditional reads from <base> are hoistable, we can replace all
 * <base>?.PROPERTY_STRING subpaths with <base>.PROPERTY_STRING
 */
function reduceMaybeOptionalChains(
  nodes: Set<PropertyPathNode>,
  registry: PropertyPathRegistry,
): void {
  let optionalChainNodes = Set_filter(nodes, n => n.hasOptional);
  if (optionalChainNodes.size === 0) {
    return;
  }
  let changed: boolean;
  do {
    changed = false;

    for (const original of optionalChainNodes) {
      let {
        identifier,
        path: origPath,
        reactive,
        loc: origLoc,
      } = original.fullPath;
      let currNode: PropertyPathNode = registry.getOrCreateIdentifier(
        identifier,
        reactive,
        origLoc,
      );
      for (let i = 0; i < origPath.length; i++) {
        const entry = origPath[i];
        // If the base is known to be non-null, replace with a non-optional load
        const nextEntry: DependencyPathEntry =
          entry.optional && nodes.has(currNode)
            ? {property: entry.property, optional: false, loc: entry.loc}
            : entry;
        currNode = PropertyPathRegistry.getOrCreatePropertyEntry(
          currNode,
          nextEntry,
        );
      }
      if (currNode !== original) {
        changed = true;
        optionalChainNodes.delete(original);
        optionalChainNodes.add(currNode);
        nodes.delete(original);
        nodes.add(currNode);
      }
    }
  } while (changed);
}

function getAssumedInvokedFunctions(
  fn: HIRFunction,
  temporaries: Map<
    IdentifierId,
    {fn: LoweredFunction; mayInvoke: Set<LoweredFunction>}
  > = new Map(),
): ReadonlySet<LoweredFunction> {
  const hoistableFunctions = new Set<LoweredFunction>();
  /**
   * Step 1: Conservatively collect identifier to function expression mappings
   */
  for (const block of fn.body.blocks.values()) {
    for (const {lvalue, value} of block.instructions) {
      /**
       * Conservatively only match function expressions which can have guaranteed ssa.
       * ObjectMethods and ObjectProperties do not.
       */
      if (value.kind === 'FunctionExpression') {
        temporaries.set(lvalue.identifier.id, {
          fn: value.loweredFunc,
          mayInvoke: new Set(),
        });
      } else if (value.kind === 'StoreLocal') {
        const lvalue = value.lvalue.place.identifier;
        const maybeLoweredFunc = temporaries.get(value.value.identifier.id);
        if (maybeLoweredFunc != null) {
          temporaries.set(lvalue.id, maybeLoweredFunc);
        }
      } else if (value.kind === 'LoadLocal') {
        const maybeLoweredFunc = temporaries.get(value.place.identifier.id);
        if (maybeLoweredFunc != null) {
          temporaries.set(lvalue.identifier.id, maybeLoweredFunc);
        }
      }
    }
  }
  /**
   * Step 2: Forward pass to do analysis of assumed function calls. Note that
   * this is conservative and does not count indirect references through
   * containers (e.g. `return {cb: () => {...}})`).
   */
  for (const block of fn.body.blocks.values()) {
    for (const {lvalue, value} of block.instructions) {
      if (value.kind === 'CallExpression') {
        const callee = value.callee;
        const maybeHook = getHookKind(fn.env, callee.identifier);
        const maybeLoweredFunc = temporaries.get(callee.identifier.id);
        if (maybeLoweredFunc != null) {
          // Direct calls
          hoistableFunctions.add(maybeLoweredFunc.fn);
        } else if (maybeHook != null) {
          /**
           * Assume arguments to all hooks are safe to invoke
           */
          for (const arg of value.args) {
            if (arg.kind === 'Identifier') {
              const maybeLoweredFunc = temporaries.get(arg.identifier.id);
              if (maybeLoweredFunc != null) {
                hoistableFunctions.add(maybeLoweredFunc.fn);
              }
            }
          }
        }
      } else if (value.kind === 'JsxExpression') {
        /**
         * Assume JSX attributes and children are safe to invoke
         */
        for (const attr of value.props) {
          if (attr.kind === 'JsxSpreadAttribute') {
            continue;
          }
          const maybeLoweredFunc = temporaries.get(attr.place.identifier.id);
          if (maybeLoweredFunc != null) {
            hoistableFunctions.add(maybeLoweredFunc.fn);
          }
        }
        for (const child of value.children ?? []) {
          const maybeLoweredFunc = temporaries.get(child.identifier.id);
          if (maybeLoweredFunc != null) {
            hoistableFunctions.add(maybeLoweredFunc.fn);
          }
        }
      } else if (value.kind === 'FunctionExpression') {
        /**
         * Recursively traverse into other function expressions which may invoke
         * or pass already declared functions to react (e.g. as JSXAttributes).
         *
         * If lambda A calls lambda B, we assume lambda B is safe to invoke if
         * lambda A is -- even if lambda B is conditionally called. (see
         * `conditional-call-chain` fixture for example).
         */
        const loweredFunc = value.loweredFunc.func;
        const lambdasCalled = getAssumedInvokedFunctions(
          loweredFunc,
          temporaries,
        );
        const maybeLoweredFunc = temporaries.get(lvalue.identifier.id);
        if (maybeLoweredFunc != null) {
          for (const called of lambdasCalled) {
            maybeLoweredFunc.mayInvoke.add(called);
          }
        }
      }
    }
    if (block.terminal.kind === 'return') {
      /**
       * Assume directly returned functions are safe to call
       */
      const maybeLoweredFunc = temporaries.get(
        block.terminal.value.identifier.id,
      );
      if (maybeLoweredFunc != null) {
        hoistableFunctions.add(maybeLoweredFunc.fn);
      }
    }
  }

  for (const [_, {fn, mayInvoke}] of temporaries) {
    if (hoistableFunctions.has(fn)) {
      for (const called of mayInvoke) {
        hoistableFunctions.add(called);
      }
    }
  }
  return hoistableFunctions;
}
