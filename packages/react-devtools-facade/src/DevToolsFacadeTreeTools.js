/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {extractLocationFromComponentStack} from 'react-devtools-shared/src/backend/utils/parseStackTrace';
import {
  getOwnerStackByFiberInDev,
  getSourceLocationByFiber,
} from 'react-devtools-shared/src/backend/fiber/DevToolsFiberComponentStack';
import {getDispatcherRef} from 'react-devtools-shared/src/backend/shared/DevToolsReactDispatcher';
import {inspectHooksOfFiberWithoutDefaultDispatcher} from 'react-debug-tools';

import type {Fiber, FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {WorkTagMap} from 'react-devtools-shared/src/backend/types';
import type {HooksTree, HooksNode} from 'react-debug-tools/src/ReactDebugHooks';
import type {RendererInternals} from './DevToolsFacade';

// Tools return plain JavaScript values with the types below. Serialization
// (to TOON, JSON, etc.) is the integrator's responsibility.

// Returned by any tool when the requested component/root cannot be resolved.
export type ToolError = {error: string};

// A single component in a tree snapshot. firstChild/nextSibling reference other
// nodes by their uid, forming an adjacency list the integrator can rebuild.
export type TreeNode = {
  uid: string,
  type: string,
  name: string,
  key: string | null,
  firstChild: string | null,
  nextSibling: string | null,
};

// One inspected hook. value is normalized (serialization-safe); subHooks holds
// the hooks called by a custom hook, recursively.
export type HookNode = {
  id: number | null,
  name: string,
  value: mixed,
  subHooks: Array<HookNode>,
};

export type NodeInfo = {
  uid: string,
  type: string,
  name: string,
  key?: string,
  props?: {[string]: mixed},
  hooks?: Array<HookNode>,
};

export type SourceLocation = {
  name: string,
  fileName: string,
  line: number,
  column: number,
};

export type ComponentSource = {source: SourceLocation | null};

export type OwnersStack = {stack: string};

export type OwnerEntry = {uid: string, name: string, type: string};

export type FindComponentsResult = {
  page: number,
  pageSize: number,
  totalCount: number,
  totalPages: number,
  results: Array<TreeNode>,
};

export type TreeTools = {
  getComponentTree: (
    depth?: number,
    rootUid?: string,
  ) => Array<TreeNode> | ToolError,
  getComponentByUid: (uid: string) => NodeInfo | ToolError,
  findComponents: (
    name: string,
    rootUid?: string,
    page?: number,
    pageSize?: number,
  ) => FindComponentsResult | ToolError,
  getComponentSource: (uid: string) => ComponentSource | ToolError,
  getOwnersStack: (uid: string) => OwnersStack | ToolError,
  getOwnersBranch: (uid: string) => Array<OwnerEntry> | ToolError,
  // Shared with the profiler tools so component uids are consistent across all
  // tools. Maps a fiber to its stable uid (assigning one on first encounter).
  getUid: (fiber: Fiber) => string,
};

/**
 * Map a fiber work tag number to a human-readable type string.
 * Every tag maps to a descriptive string; unknown tags return 'unknown'.
 */
export function getTypeTag(workTagMap: WorkTagMap, tag: number): string {
  const {
    FunctionComponent,
    IncompleteFunctionComponent,
    ClassComponent,
    IncompleteClassComponent,
    HostComponent,
    HostHoistable,
    HostSingleton,
    HostRoot,
    ForwardRef,
    MemoComponent,
    SimpleMemoComponent,
    ContextConsumer,
    ContextProvider,
    SuspenseComponent,
    SuspenseListComponent,
    LazyComponent,
    Profiler,
    HostPortal,
    ActivityComponent,
    ViewTransitionComponent,
    CacheComponent,
    ScopeComponent,
    OffscreenComponent,
    LegacyHiddenComponent,
    Throw,
    HostText,
    Fragment,
    DehydratedSuspenseComponent,
    Mode,
  } = workTagMap;

  switch (tag) {
    case FunctionComponent:
    case IncompleteFunctionComponent:
      return 'function';
    case ClassComponent:
    case IncompleteClassComponent:
      return 'class';
    case HostComponent:
    case HostHoistable:
    case HostSingleton:
      return 'host';
    case HostRoot:
      return 'root';
    case ForwardRef:
      return 'forwardRef';
    case MemoComponent:
    case SimpleMemoComponent:
      return 'memo';
    case ContextConsumer:
    case ContextProvider:
      return 'context';
    case SuspenseComponent:
      return 'suspense';
    case SuspenseListComponent:
      return 'suspenseList';
    case LazyComponent:
      return 'lazy';
    case Profiler:
      return 'profiler';
    case HostPortal:
      return 'portal';
    case ActivityComponent:
      return 'activity';
    case ViewTransitionComponent:
      return 'viewTransition';
    case CacheComponent:
      return 'cache';
    case ScopeComponent:
      return 'scope';
    case OffscreenComponent:
    case LegacyHiddenComponent:
      return 'offscreen';
    case Throw:
      return 'throw';
    case HostText:
      return 'text';
    case Fragment:
      return 'fragment';
    case Mode:
      return 'mode';
    case DehydratedSuspenseComponent:
      return 'dehydrated';
    default:
      return 'unknown';
  }
}

const MAX_NORMALIZE_DEPTH = 3;

// Normalize a value to a plain, serialization-safe shape. Tracks seen objects
// to break circular references and limits depth to avoid stack overflow on
// deeply nested structures. Functions/symbols/elements become descriptive
// strings so the result can be safely serialized downstream.
function normalizeValue(val: mixed, seen?: Set<mixed>, depth?: number): mixed {
  if (val === undefined) return null;
  if (typeof val === 'function')
    return val.name ? '[fn ' + val.name + ']' : '[fn]';
  if (typeof val === 'symbol') return '[symbol]';
  if (typeof val === 'object' && val !== null) {
    if ((val as any).$$typeof != null) return '[React element]';
    const currentDepth = depth || 0;
    if (currentDepth >= MAX_NORMALIZE_DEPTH) return '[max depth]';
    const currentSeen = seen || new Set();
    if (currentSeen.has(val)) return '[circular]';
    currentSeen.add(val);
    if (Array.isArray(val)) {
      const mapped = val.map((v: mixed) =>
        normalizeValue(v, currentSeen, currentDepth + 1),
      );
      currentSeen.delete(val);
      return mapped;
    }
    const result: {[string]: mixed} = {};
    const keys = Object.keys(val);
    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = normalizeValue(
        (val as any)[keys[i]],
        currentSeen,
        currentDepth + 1,
      );
    }
    currentSeen.delete(val);
    return result;
  }
  return val;
}

// Normalize props for output: skip children, normalize values.
function normalizeProps(props: mixed): {[string]: mixed} | null {
  if (props == null || typeof props !== 'object') return null;
  const result: {[string]: mixed} = {};
  const keys = Object.keys(props);
  let hasProps = false;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === 'children') continue;
    result[key] = normalizeValue((props as any)[key]);
    hasProps = true;
  }
  return hasProps ? result : null;
}

// Normalize an inspected hooks tree into a serialization-safe shape.
function normalizeHooks(hooks: HooksTree): Array<HookNode> {
  return hooks.map((hook: HooksNode) => ({
    id: hook.id,
    name: hook.name,
    value: normalizeValue(hook.value),
    subHooks: normalizeHooks(hook.subHooks),
  }));
}

export function createTreeTools(
  fiberRoots: Map<number, Set<FiberRoot>>,
  rendererInternals: Map<number, RendererInternals>,
): TreeTools {
  function getTypeTagForFiber(
    internals: RendererInternals,
    fiber: Fiber,
  ): string {
    return getTypeTag(internals.ReactTypeOfWork, fiber.tag);
  }

  function getDisplayName(internals: RendererInternals, fiber: Fiber): string {
    return internals.getDisplayNameForFiber(fiber) || 'Unknown';
  }

  // Persistent uid state — survives across calls so the same fiber
  // always maps to the same uid, even after React re-renders (which
  // swap fiber objects via double-buffering / alternates).
  const fiberToUid: WeakMap<Fiber, string> = new WeakMap();
  let nextId: number = 0;

  function getUid(fiber: Fiber): string {
    let uid = fiberToUid.get(fiber);
    if (uid != null) return uid;
    const alt = fiber.alternate;
    if (alt != null) {
      uid = fiberToUid.get(alt);
      if (uid != null) {
        fiberToUid.set(fiber, uid);
        return uid;
      }
    }
    uid = 'r' + nextId++;
    fiberToUid.set(fiber, uid);
    return uid;
  }

  // Collect direct children of a fiber via the child/sibling linked list.
  function collectChildren(fiber: Fiber): Array<Fiber> {
    const result: Array<Fiber> = [];
    let child = fiber.child;
    while (child !== null) {
      result.push(child);
      child = child.sibling;
    }
    return result;
  }

  function collectNodes(
    internals: RendererInternals,
    fiber: Fiber,
    maxDepth: number,
    currentDepth: number,
    nodes: Array<TreeNode>,
  ): void {
    const children = currentDepth < maxDepth ? collectChildren(fiber) : [];
    const firstChild = children.length > 0 ? getUid(children[0]) : null;
    nodes.push({
      uid: getUid(fiber),
      type: getTypeTagForFiber(internals, fiber),
      name: getDisplayName(internals, fiber),
      key: fiber.key != null ? String(fiber.key) : null,
      firstChild,
      nextSibling: null,
    });
    for (let i = 0; i < children.length; i++) {
      collectNodes(internals, children[i], maxDepth, currentDepth + 1, nodes);
      if (i < children.length - 1) {
        const childUid = getUid(children[i]);
        for (let j = nodes.length - 1; j >= 0; j--) {
          if (nodes[j].uid === childUid) {
            nodes[j].nextSibling = getUid(children[i + 1]);
            break;
          }
        }
      }
    }
  }

  function findByUid(fiber: Fiber, targetUid: string): Fiber | null {
    if (getUid(fiber) === targetUid) return fiber;
    const children = collectChildren(fiber);
    for (let i = 0; i < children.length; i++) {
      const found = findByUid(children[i], targetUid);
      if (found != null) return found;
    }
    return null;
  }

  // Find a fiber by uid across all mounted roots.
  // Returns the fiber and its renderer's internals, or an error.
  function findFiberByUid(
    uid: string,
  ):
    | {fiber: Fiber, internals: RendererInternals, error: null}
    | {fiber: null, internals: null, error: string} {
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const [rendererID, roots] of fiberRoots) {
      const internals = rendererInternals.get(rendererID);
      if (internals == null) {
        return {
          fiber: null,
          internals: null,
          error: 'Missing internals for renderer ' + rendererID,
        };
      }
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const root of roots) {
        const fiber = findByUid(root.current, uid);
        if (fiber != null) return {fiber, internals, error: null};
      }
    }
    return {
      fiber: null,
      internals: null,
      error: 'Component not found: "' + uid + '"',
    };
  }

  /**
   * Returns a snapshot of the component tree as an array of nodes. Each node
   * includes: uid, type, name, key, firstChild, nextSibling (the last two
   * reference other nodes by uid).
   *
   * @param depth - Maximum tree depth to traverse (default 20).
   * @param rootUid - If provided, snapshot starts from this component.
   */
  function getComponentTree(
    depth?: number = 20,
    rootUid?: string,
  ): Array<TreeNode> | ToolError {
    if (rootUid != null) {
      const result = findFiberByUid(rootUid);
      if (result.error != null) {
        return {error: result.error};
      }
      const nodes: Array<TreeNode> = [];
      collectNodes(result.internals, result.fiber, depth, 0, nodes);
      return nodes;
    }

    const nodes: Array<TreeNode> = [];
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const [rendererID, roots] of fiberRoots) {
      const internals = rendererInternals.get(rendererID);
      if (internals == null) {
        return {error: 'Missing internals for renderer ' + rendererID};
      }
      roots.forEach(root => {
        collectNodes(internals, root.current, depth, 0, nodes);
      });
    }
    if (nodes.length === 0) {
      return {error: 'No mounted React roots found'};
    }
    return nodes;
  }

  /**
   * Returns detailed info about a single component by its uid: type, name,
   * key, props (excluding children), and — for function components — the
   * inspected hooks tree. Values are normalized to a serialization-safe shape.
   *
   * Inspecting hooks re-renders the component's render function (effects are
   * not run); failures are tolerated and simply omit `hooks`.
   *
   * @param uid - The component uid (e.g. "r5").
   */
  function getComponentByUid(uid: string): NodeInfo | ToolError {
    const result = findFiberByUid(uid);
    if (result.error != null) {
      return {error: result.error};
    }
    const {fiber, internals} = result;
    const info: NodeInfo = {
      uid: getUid(fiber),
      type: getTypeTagForFiber(internals, fiber),
      name: getDisplayName(internals, fiber),
    };
    if (fiber.key != null) {
      info.key = String(fiber.key);
    }
    const props = normalizeProps(fiber.memoizedProps);
    if (props != null) {
      info.props = props;
    }
    // Hooks are only inspectable for function components, forwardRef, and
    // simple-memo components. inspectHooksOfFiberWithoutDefaultDispatcher
    // re-renders the component (using the renderer's injected dispatcher, never
    // React's shared internals), so guard by tag and tolerate failures (e.g. a
    // component that throws).
    const {FunctionComponent, SimpleMemoComponent, ForwardRef} =
      internals.ReactTypeOfWork;
    if (
      fiber.tag === FunctionComponent ||
      fiber.tag === SimpleMemoComponent ||
      fiber.tag === ForwardRef
    ) {
      try {
        const hooksTree = inspectHooksOfFiberWithoutDefaultDispatcher(
          fiber,
          getDispatcherRef(internals),
        );
        info.hooks = normalizeHooks(hooksTree);
      } catch {
        // Hook inspection failed; omit hooks rather than failing the call.
      }
    }
    return info;
  }

  function collectMatches(
    internals: RendererInternals,
    fiber: Fiber,
    query: string,
    matches: Array<Fiber>,
  ): void {
    const displayName = internals.getDisplayNameForFiber(fiber);
    if (
      displayName != null &&
      displayName.toLowerCase().indexOf(query) !== -1
    ) {
      matches.push(fiber);
    }
    let child = fiber.child;
    while (child !== null) {
      collectMatches(internals, child, query, matches);
      child = child.sibling;
    }
  }

  type FiberMatch = {fiber: Fiber, internals: RendererInternals};

  /**
   * Searches for components by name (case-insensitive substring match).
   * Returns a paginated result with matching components.
   *
   * @param name - Search query to match against component display names.
   * @param rootUid - If provided, limits search to this component's subtree.
   * @param page - Page number (default 1, clamped to valid range).
   * @param pageSize - Results per page (default 10).
   */
  function findComponents(
    name: string,
    rootUid?: string,
    page?: number = 1,
    pageSize?: number = 10,
  ): FindComponentsResult | ToolError {
    const query = name.toLowerCase();
    const allMatches: Array<FiberMatch> = [];

    if (rootUid != null) {
      const found = findFiberByUid(rootUid);
      if (found.error != null) {
        return {error: found.error};
      }
      const fibers: Array<Fiber> = [];
      collectMatches(found.internals, found.fiber, query, fibers);
      for (let i = 0; i < fibers.length; i++) {
        allMatches.push({fiber: fibers[i], internals: found.internals});
      }
    } else {
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const [rendererID, roots] of fiberRoots) {
        const internals = rendererInternals.get(rendererID);
        if (internals == null) {
          return {error: 'Missing internals for renderer ' + rendererID};
        }
        roots.forEach(root => {
          const fibers: Array<Fiber> = [];
          collectMatches(internals, root.current, query, fibers);
          for (let i = 0; i < fibers.length; i++) {
            allMatches.push({fiber: fibers[i], internals});
          }
        });
      }
    }

    const totalCount = allMatches.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    const startIdx = (clampedPage - 1) * pageSize;
    const pageMatches = allMatches.slice(startIdx, startIdx + pageSize);

    const rows: Array<TreeNode> = [];
    for (let i = 0; i < pageMatches.length; i++) {
      const {fiber, internals} = pageMatches[i];
      const children = collectChildren(fiber);
      rows.push({
        uid: getUid(fiber),
        type: getTypeTagForFiber(internals, fiber),
        name: getDisplayName(internals, fiber),
        key: fiber.key != null ? String(fiber.key) : null,
        firstChild: children.length > 0 ? getUid(children[0]) : null,
        nextSibling: null,
      });
    }

    return {
      page: clampedPage,
      pageSize,
      totalCount,
      totalPages,
      results: rows,
    };
  }

  /**
   * Returns the definition location of a component — where the component
   * function or class is defined in source code. Uses the same "throwing
   * trick" as React DevTools to capture a stack frame from within the
   * component's function body.
   *
   * Returns {source: {name, fileName, line, column}} or {source: null} if the
   * location cannot be determined (e.g. host components, production builds).
   *
   * @param uid - The component uid (e.g. "r5").
   */
  function getComponentSource(uid: string): ComponentSource | ToolError {
    const result = findFiberByUid(uid);
    if (result.error != null) {
      return {error: result.error};
    }
    const {fiber, internals} = result;
    const stackFrame = getSourceLocationByFiber(
      internals.ReactTypeOfWork,
      fiber,
      internals.currentDispatcherRef,
    );
    if (stackFrame == null) {
      return {source: null};
    }
    const location = extractLocationFromComponentStack(stackFrame);
    if (location == null) {
      return {source: null};
    }
    const [name, fileName, line, column] = location;
    return {source: {name, fileName, line, column}};
  }

  /**
   * Returns the raw owner stack trace string — the chain of JSX creation
   * locations from this component up to the root. Each line is a stack frame
   * showing where <Component /> was written in the owner's code. The stack can
   * be passed to source map tools for symbolication.
   *
   * Returns {stack: string}. DEV-only — in production, the stack will be empty.
   *
   * @param uid - The component uid (e.g. "r5").
   */
  function getOwnersStack(uid: string): OwnersStack | ToolError {
    const result = findFiberByUid(uid);
    if (result.error != null) {
      return {error: result.error};
    }
    const {fiber, internals} = result;
    const stackString = getOwnerStackByFiberInDev(
      internals.ReactTypeOfWork,
      fiber,
      internals.currentDispatcherRef,
    );
    return {stack: stackString};
  }

  /**
   * Returns the structured list of owner components — which components rendered
   * this component, ordered from immediate owner to root ancestor. Each entry
   * includes a uid for cross-referencing with other tools (e.g.
   * getComponentByUid, getComponentSource, getComponentTree).
   *
   * Returns an array of {uid, name, type}, or an empty array if the component
   * has no owner (root component). DEV-only — in production, _debugOwner is not
   * available.
   *
   * @param uid - The component uid (e.g. "r5").
   */
  function getOwnersBranch(uid: string): Array<OwnerEntry> | ToolError {
    const result = findFiberByUid(uid);
    if (result.error != null) {
      return {error: result.error};
    }
    const {fiber, internals} = result;

    const owners: Array<OwnerEntry> = [];
    // Walk the JSX-creation owner chain from this component up to the root,
    // collecting only Fiber owners (client components). A Fiber's _debugOwner
    // points to the next owner — itself a Fiber (client) or a
    // ReactComponentInfo (server component); the latter continues the chain
    // via its .owner field.
    let owner: mixed = fiber._debugOwner;
    while (owner != null) {
      const node: any = owner;
      if (typeof node.tag === 'number') {
        owners.push({
          uid: getUid(node),
          name: getDisplayName(internals, node),
          type: getTypeTagForFiber(internals, node),
        });
        owner = node._debugOwner;
      } else {
        // Server component (ReactComponentInfo): continue via its .owner.
        owner = node.owner;
      }
    }
    return owners;
  }

  return {
    getComponentTree,
    getComponentByUid,
    findComponents,
    getComponentSource,
    getOwnersStack,
    getOwnersBranch,
    getUid,
  };
}
