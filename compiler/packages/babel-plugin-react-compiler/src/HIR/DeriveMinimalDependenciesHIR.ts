/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {
  DependencyPathEntry,
  GeneratedSource,
  Identifier,
  PropertyLiteral,
  ReactiveScopeDependency,
  SourceLocation,
} from '../HIR';
import {printIdentifier} from '../HIR/PrintHIR';

/**
 * Simpler fork of DeriveMinimalDependencies, see PropagateScopeDependenciesHIR
 * for detailed explanation.
 */
export class ReactiveScopeDependencyTreeHIR {
  /**
   * Paths from which we can hoist PropertyLoads. If an `identifier`,
   * `identifier.path`, or `identifier?.path` is in this map, it is safe to
   * evaluate (non-optional) PropertyLoads from.
   */
  #hoistableObjects: Map<Identifier, HoistableNode & {reactive: boolean}> =
    new Map();
  #deps: Map<Identifier, DependencyNode & {reactive: boolean}> = new Map();

  /**
   * @param hoistableObjects a set of paths from which we can safely evaluate
   * PropertyLoads. Note that we expect these to not contain duplicates (e.g.
   * both `a?.b` and `a.b`) only because CollectHoistablePropertyLoads merges
   * duplicates when traversing the CFG.
   */
  constructor(hoistableObjects: Iterable<ReactiveScopeDependency>) {
    for (const {path, identifier, reactive, loc} of hoistableObjects) {
      let currNode = ReactiveScopeDependencyTreeHIR.#getOrCreateRoot(
        identifier,
        reactive,
        this.#hoistableObjects,
        path.length > 0 && path[0].optional ? 'Optional' : 'NonNull',
        loc,
      );

      for (let i = 0; i < path.length; i++) {
        const prevAccessType = currNode.properties.get(
          path[i].property,
        )?.accessType;
        const accessType =
          i + 1 < path.length && path[i + 1].optional ? 'Optional' : 'NonNull';
        CompilerError.invariant(
          prevAccessType == null || prevAccessType === accessType,
          {
            reason: 'Conflicting access types',
            loc: GeneratedSource,
          },
        );
        let nextNode = currNode.properties.get(path[i].property);
        if (nextNode == null) {
          nextNode = {
            properties: new Map(),
            accessType,
            loc: path[i].loc,
          };
          currNode.properties.set(path[i].property, nextNode);
        }
        currNode = nextNode;
      }
    }
  }

  static #getOrCreateRoot<T extends string>(
    identifier: Identifier,
    reactive: boolean,
    roots: Map<Identifier, TreeNode<T> & {reactive: boolean}>,
    defaultAccessType: T,
    loc: SourceLocation,
  ): TreeNode<T> {
    // roots can always be accessed unconditionally in JS
    let rootNode = roots.get(identifier);

    if (rootNode === undefined) {
      rootNode = {
        properties: new Map(),
        reactive,
        accessType: defaultAccessType,
        loc,
      };
      roots.set(identifier, rootNode);
    } else {
      CompilerError.invariant(reactive === rootNode.reactive, {
        reason: '[DeriveMinimalDependenciesHIR] Conflicting reactive root flag',
        description: `Identifier ${printIdentifier(identifier)}`,
        loc: GeneratedSource,
      });
    }
    return rootNode;
  }

  /**
   * Join a dependency with `#hoistableObjects` to record the hoistable
   * dependency. This effectively truncates @param dep to its maximal
   * safe-to-evaluate subpath
   */
  addDependency(dep: ReactiveScopeDependency): void {
    const {identifier, reactive, path, loc} = dep;
    let depCursor = ReactiveScopeDependencyTreeHIR.#getOrCreateRoot(
      identifier,
      reactive,
      this.#deps,
      PropertyAccessType.UnconditionalAccess,
      loc,
    );
    /**
     * hoistableCursor is null if depCursor is not an object we can hoist
     * property reads from otherwise, it represents the same node in the
     * hoistable / cfg-informed tree
     */
    let hoistableCursor: HoistableNode | undefined =
      this.#hoistableObjects.get(identifier);

    // All properties read 'on the way' to a dependency are marked as 'access'
    for (const entry of path) {
      let nextHoistableCursor: HoistableNode | undefined;
      let nextDepCursor: DependencyNode;
      if (entry.optional) {
        /**
         * No need to check the access type since we can match both optional or non-optionals
         * in the hoistable
         *  e.g. a?.b<rest> is hoistable if a.b<rest> is hoistable
         */
        if (hoistableCursor != null) {
          nextHoistableCursor = hoistableCursor?.properties.get(entry.property);
        }

        let accessType;
        if (
          hoistableCursor != null &&
          hoistableCursor.accessType === 'NonNull'
        ) {
          /**
           * For an optional chain dep `a?.b`: if the hoistable tree only
           * contains `a`, we can keep either `a?.b` or 'a.b' as a dependency.
           * (note that we currently do the latter for perf)
           */
          accessType = PropertyAccessType.UnconditionalAccess;
        } else {
          /**
           * Given that it's safe to evaluate `depCursor` and optional load
           * never throws, it's also safe to evaluate `depCursor?.entry`
           */
          accessType = PropertyAccessType.OptionalAccess;
        }
        nextDepCursor = makeOrMergeProperty(
          depCursor,
          entry.property,
          accessType,
          entry.loc,
        );
      } else if (
        hoistableCursor != null &&
        hoistableCursor.accessType === 'NonNull'
      ) {
        nextHoistableCursor = hoistableCursor.properties.get(entry.property);
        nextDepCursor = makeOrMergeProperty(
          depCursor,
          entry.property,
          PropertyAccessType.UnconditionalAccess,
          entry.loc,
        );
      } else {
        /**
         * Break to truncate the dependency on its first non-optional entry that PropertyLoads are not hoistable from
         */
        break;
      }
      depCursor = nextDepCursor;
      hoistableCursor = nextHoistableCursor;
    }
    // mark the final node as a dependency
    depCursor.accessType = merge(
      depCursor.accessType,
      PropertyAccessType.OptionalDependency,
    );
  }

  deriveMinimalDependencies(): Set<ReactiveScopeDependency> {
    const results = new Set<ReactiveScopeDependency>();
    for (const [rootId, rootNode] of this.#deps.entries()) {
      collectMinimalDependenciesInSubtree(
        rootNode,
        rootNode.reactive,
        rootId,
        [],
        results,
      );
    }

    return results;
  }

  /*
   * Prints dependency tree to string for debugging.
   * @param includeAccesses
   * @returns string representation of DependencyTree
   */
  printDeps(includeAccesses: boolean): string {
    let res: Array<Array<string>> = [];

    for (const [rootId, rootNode] of this.#deps.entries()) {
      const rootResults = printSubtree(rootNode, includeAccesses).map(
        result => `${printIdentifier(rootId)}.${result}`,
      );
      res.push(rootResults);
    }
    return res.flat().join('\n');
  }

  static debug<T extends string>(roots: Map<Identifier, TreeNode<T>>): string {
    const buf: Array<string> = [`tree() [`];
    for (const [rootId, rootNode] of roots) {
      buf.push(`${printIdentifier(rootId)} (${rootNode.accessType}):`);
      this.#debugImpl(buf, rootNode, 1);
    }
    buf.push(']');
    return buf.length > 2 ? buf.join('\n') : buf.join('');
  }

  static #debugImpl<T extends string>(
    buf: Array<string>,
    node: TreeNode<T>,
    depth: number = 0,
  ): void {
    for (const [property, childNode] of node.properties) {
      buf.push(`${'  '.repeat(depth)}.${property} (${childNode.accessType}):`);
      this.#debugImpl(buf, childNode, depth + 1);
    }
  }
}

/*
 * Enum representing the access type of single property on a parent object.
 * We distinguish on two independent axes:
 * Optional / Unconditional:
 *    - whether this property is an optional load (within an optional chain)
 * Access / Dependency:
 *    - Access: this property is read on the path of a dependency. We do not
 *      need to track change variables for accessed properties. Tracking accesses
 *      helps Forget do more granular dependency tracking.
 *    - Dependency: this property is read as a dependency and we must track changes
 *      to it for correctness.
 *    ```javascript
 *    // props.a is a dependency here and must be tracked
 *    deps: {props.a, props.a.b} ---> minimalDeps: {props.a}
 *    // props.a is just an access here and does not need to be tracked
 *    deps: {props.a.b} ---> minimalDeps: {props.a.b}
 *    ```
 */
enum PropertyAccessType {
  OptionalAccess = 'OptionalAccess',
  UnconditionalAccess = 'UnconditionalAccess',
  OptionalDependency = 'OptionalDependency',
  UnconditionalDependency = 'UnconditionalDependency',
}

function isOptional(access: PropertyAccessType): boolean {
  return (
    access === PropertyAccessType.OptionalAccess ||
    access === PropertyAccessType.OptionalDependency
  );
}
function isDependency(access: PropertyAccessType): boolean {
  return (
    access === PropertyAccessType.OptionalDependency ||
    access === PropertyAccessType.UnconditionalDependency
  );
}

function merge(
  access1: PropertyAccessType,
  access2: PropertyAccessType,
): PropertyAccessType {
  const resultIsUnconditional = !(isOptional(access1) && isOptional(access2));
  const resultIsDependency = isDependency(access1) || isDependency(access2);

  /*
   * Straightforward merge.
   * This can be represented as bitwise OR, but is written out for readability
   *
   * Observe that `UnconditionalAccess | ConditionalDependency` produces an
   * unconditionally accessed conditional dependency. We currently use these
   * as we use unconditional dependencies. (i.e. to codegen change variables)
   */
  if (resultIsUnconditional) {
    if (resultIsDependency) {
      return PropertyAccessType.UnconditionalDependency;
    } else {
      return PropertyAccessType.UnconditionalAccess;
    }
  } else {
    // result is optional
    if (resultIsDependency) {
      return PropertyAccessType.OptionalDependency;
    } else {
      return PropertyAccessType.OptionalAccess;
    }
  }
}

type TreeNode<T extends string> = {
  properties: Map<PropertyLiteral, TreeNode<T>>;
  accessType: T;
  loc: SourceLocation;
};
type HoistableNode = TreeNode<'Optional' | 'NonNull'>;
type DependencyNode = TreeNode<PropertyAccessType>;

/**
 * Recursively calculates minimal dependencies in a subtree.
 * @param node DependencyNode representing a dependency subtree.
 * @returns a minimal list of dependencies in this subtree.
 */
function collectMinimalDependenciesInSubtree(
  node: DependencyNode,
  reactive: boolean,
  rootIdentifier: Identifier,
  path: Array<DependencyPathEntry>,
  results: Set<ReactiveScopeDependency>,
): void {
  if (isDependency(node.accessType)) {
    results.add({identifier: rootIdentifier, reactive, path, loc: node.loc});
  } else {
    for (const [childName, childNode] of node.properties) {
      collectMinimalDependenciesInSubtree(
        childNode,
        reactive,
        rootIdentifier,
        [
          ...path,
          {
            property: childName,
            optional: isOptional(childNode.accessType),
            loc: childNode.loc,
          },
        ],
        results,
      );
    }
  }
}

function printSubtree(
  node: DependencyNode,
  includeAccesses: boolean,
): Array<string> {
  const results: Array<string> = [];
  for (const [propertyName, propertyNode] of node.properties) {
    if (includeAccesses || isDependency(propertyNode.accessType)) {
      results.push(`${propertyName} (${propertyNode.accessType})`);
    }
    const propertyResults = printSubtree(propertyNode, includeAccesses);
    results.push(...propertyResults.map(result => `${propertyName}.${result}`));
  }
  return results;
}

function makeOrMergeProperty(
  node: DependencyNode,
  property: PropertyLiteral,
  accessType: PropertyAccessType,
  loc: SourceLocation,
): DependencyNode {
  let child = node.properties.get(property);
  if (child == null) {
    child = {
      properties: new Map(),
      accessType,
      loc,
    };
    node.properties.set(property, child);
  } else {
    child.accessType = merge(child.accessType, accessType);
  }
  return child;
}
