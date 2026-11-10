/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber, FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {
  Container,
  PublicInstance,
  Instance,
  TextInstance,
} from './ReactFiberConfigTestHost';

import * as React from 'react';
import * as Scheduler from 'scheduler/unstable_mock';
import {
  getPublicRootInstance,
  createContainer,
  updateContainer,
  flushSyncFromReconciler,
  injectIntoDevTools,
  batchedUpdates,
  defaultOnUncaughtError,
  defaultOnCaughtError,
  defaultOnRecoverableError,
} from 'react-reconciler/src/ReactFiberReconciler';
import {findCurrentFiberUsingSlowPath} from 'react-reconciler/src/ReactFiberTreeReflection';
import {
  Fragment,
  FunctionComponent,
  ClassComponent,
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostPortal,
  HostText,
  HostRoot,
  ContextConsumer,
  ContextProvider,
  Mode,
  ForwardRef,
  Profiler,
  MemoComponent,
  SimpleMemoComponent,
  IncompleteClassComponent,
  ScopeComponent,
} from 'react-reconciler/src/ReactWorkTags';
import isArray from 'shared/isArray';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import ReactVersion from 'shared/ReactVersion';
import {checkPropStringCoercion} from 'shared/CheckStringCoercion';

import {getPublicInstance} from './ReactFiberConfigTestHost';
import {ConcurrentRoot, LegacyRoot} from 'react-reconciler/src/ReactRootTags';
import {
  enableReactTestRendererWarning,
  disableLegacyMode,
} from 'shared/ReactFeatureFlags';

import noop from 'shared/noop';
import type {WorkTag} from 'react-reconciler/src/ReactWorkTags';

const defaultOnDefaultTransitionIndicator: () => void | (() => void) = noop;

// $FlowFixMe[prop-missing]: This is only in the development export.
// $FlowFixMe[missing-export]
const act = React.act;

// TODO: Remove from public bundle

type TestRendererOptions = {
  createNodeMock: (element: React$Element<any>) => any,
  unstable_isConcurrent: boolean,
  unstable_strictMode: boolean,
  ...
};

type ReactTestRendererJSON = {
  type: string,
  props: {[propName: string]: any, ...},
  children: null | Array<ReactTestRendererNode>,
  $$typeof?: symbol, // Optional because we add it with defineProperty().
};
type ReactTestRendererNode = ReactTestRendererJSON | string;

type FindOptions = {
  // performs a "greedy" search: if a matching node is found, will continue
  // to search within the matching node's children. (default: true)
  deep?: boolean,
};

export type Predicate = (node: ReactTestInstance) => ?boolean;

const defaultTestOptions = {
  createNodeMock: function () {
    return null;
  },
};

function toJSON(inst: Instance | TextInstance): ReactTestRendererNode | null {
  if (inst.isHidden) {
    // Omit timed out children from output entirely. This seems like the least
    // surprising behavior. We could perhaps add a separate API that includes
    // them, if it turns out people need it.
    return null;
  }
  switch (inst.tag) {
    case 'TEXT':
      return inst.text;
    case 'INSTANCE': {
      // We don't include the `children` prop in JSON.
      // Instead, we will include the actual rendered children.
      const {children, ...props} = inst.props;
      let renderedChildren = null;
      if (inst.children && inst.children.length) {
        for (let i = 0; i < inst.children.length; i++) {
          const renderedChild = toJSON(inst.children[i]);
          if (renderedChild !== null) {
            if (renderedChildren === null) {
              renderedChildren = [renderedChild];
            } else {
              renderedChildren.push(renderedChild);
            }
          }
        }
      }
      const json: ReactTestRendererJSON = {
        type: inst.type,
        props: props,
        children: renderedChildren,
      };
      Object.defineProperty(json, '$$typeof', {
        value: Symbol.for('react.test.json'),
      });
      return json;
    }
    default:
      throw new Error(`Unexpected node type in toJSON: ${inst.tag}`);
  }
}

function childrenToTree(node: null | Fiber) {
  if (!node) {
    return null;
  }
  const children = nodeAndSiblingsArray(node);
  if (children.length === 0) {
    return null;
  } else if (children.length === 1) {
    return toTree(children[0]);
  }
  return flatten(children.map(toTree));
}

// $FlowFixMe[missing-local-annot]
function nodeAndSiblingsArray(nodeWithSibling) {
  const array = [];
  let node = nodeWithSibling;
  while (node != null) {
    array.push(node);
    node = node.sibling;
  }
  return array;
}

// $FlowFixMe[missing-local-annot]
function flatten(arr) {
  const result = [];
  const stack = [{i: 0, array: arr}];
  while (stack.length) {
    const n = stack.pop();
    // $FlowFixMe[incompatible-use]
    while (n.i < n.array.length) {
      // $FlowFixMe[incompatible-use]
      const el = n.array[n.i];
      // $FlowFixMe[incompatible-use]
      n.i += 1;
      if (isArray(el)) {
        // $FlowFixMe[incompatible-type]
        stack.push(n);
        stack.push({i: 0, array: el});
        break;
      }
      result.push(el);
    }
  }
  return result;
}

function toTree(node: null | Fiber): $FlowFixMe {
  if (node == null) {
    return null;
  }
  switch (node.tag) {
    case HostRoot:
      return childrenToTree(node.child);
    case HostPortal:
      return childrenToTree(node.child);
    case ClassComponent:
      return {
        nodeType: 'component',
        type: node.type,
        props: {...node.memoizedProps},
        instance: node.stateNode,
        rendered: childrenToTree(node.child),
      };
    case FunctionComponent:
    case SimpleMemoComponent:
      return {
        nodeType: 'component',
        type: node.type,
        props: {...node.memoizedProps},
        instance: null,
        rendered: childrenToTree(node.child),
      };
    case HostHoistable:
    case HostSingleton:
    case HostComponent: {
      return {
        nodeType: 'host',
        type: node.type,
        props: {...node.memoizedProps},
        instance: null, // TODO: use createNodeMock here somehow?
        rendered: flatten(nodeAndSiblingsArray(node.child).map(toTree)),
      };
    }
    case HostText:
      return node.stateNode.text;
    case Fragment:
    case ContextProvider:
    case ContextConsumer:
    case Mode:
    case Profiler:
    case ForwardRef:
    case MemoComponent:
    case IncompleteClassComponent:
    case ScopeComponent:
      return childrenToTree(node.child);
    default:
      throw new Error(
        `toTree() does not yet know how to handle nodes with tag=${node.tag}`,
      );
  }
}

const validWrapperTypes: Set<WorkTag> = new Set([
  FunctionComponent,
  ClassComponent,
  HostComponent,
  ForwardRef,
  MemoComponent,
  SimpleMemoComponent,
  // Normally skipped, but used when there's more than one root child.
  HostRoot,
]);

function getChildren(parent: Fiber) {
  const children = [];
  const startingNode = parent;
  let node: Fiber = startingNode;
  if (node.child === null) {
    return children;
  }
  node.child.return = node;
  node = node.child;
  outer: while (true) {
    let descend = false;
    if (validWrapperTypes.has(node.tag)) {
      children.push(wrapFiber(node));
    } else if (node.tag === HostText) {
      if (__DEV__) {
        checkPropStringCoercion(node.memoizedProps, 'memoizedProps');
      }
      children.push('' + node.memoizedProps);
    } else {
      descend = true;
    }
    if (descend && node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    while (node.sibling === null) {
      if (node.return === startingNode) {
        break outer;
      }
      node = node.return as any;
    }
    (node.sibling as any).return = node.return;
    node = node.sibling as any;
  }
  return children;
}

class ReactTestInstance {
  _fiber: Fiber;

  _currentFiber(): Fiber {
    // Throws if this component has been unmounted.
    const fiber = findCurrentFiberUsingSlowPath(this._fiber);

    if (fiber === null) {
      throw new Error(
        "Can't read from currently-mounting component. This error is likely " +
          'caused by a bug in React. Please file an issue.',
      );
    }

    return fiber;
  }

  constructor(fiber: Fiber) {
    if (!validWrapperTypes.has(fiber.tag)) {
      throw new Error(
        `Unexpected object passed to ReactTestInstance constructor (tag: ${fiber.tag}). ` +
          'This is probably a bug in React.',
      );
    }

    this._fiber = fiber;
  }

  get instance(): $FlowFixMe {
    const tag = this._fiber.tag;
    if (
      tag === HostComponent ||
      tag === HostHoistable ||
      tag === HostSingleton
    ) {
      return getPublicInstance(this._fiber.stateNode);
    } else {
      return this._fiber.stateNode;
    }
  }

  get type(): any {
    return this._fiber.type;
  }

  get props(): Object {
    return this._currentFiber().memoizedProps;
  }

  get parent(): ?ReactTestInstance {
    let parent = this._fiber.return;
    while (parent !== null) {
      if (validWrapperTypes.has(parent.tag)) {
        if (parent.tag === HostRoot) {
          // Special case: we only "materialize" instances for roots
          // if they have more than a single child. So we'll check that now.
          if (getChildren(parent).length < 2) {
            return null;
          }
        }
        return wrapFiber(parent);
      }
      parent = parent.return;
    }
    return null;
  }

  get children(): Array<ReactTestInstance | string> {
    return getChildren(this._currentFiber());
  }

  // Custom search functions
  find(predicate: Predicate): ReactTestInstance {
    return expectOne(
      this.findAll(predicate, {deep: false}),
      `matching custom predicate: ${predicate.toString()}`,
    );
  }

  findByType(type: any): ReactTestInstance {
    return expectOne(
      this.findAllByType(type, {deep: false}),
      `with node type: "${getComponentNameFromType(type) || 'Unknown'}"`,
    );
  }

  findByProps(props: Object): ReactTestInstance {
    return expectOne(
      this.findAllByProps(props, {deep: false}),
      `with props: ${JSON.stringify(props)}`,
    );
  }

  findAll(
    predicate: Predicate,
    options: ?FindOptions = null,
  ): Array<ReactTestInstance> {
    return findAll(this, predicate, options);
  }

  findAllByType(
    type: any,
    options: ?FindOptions = null,
  ): Array<ReactTestInstance> {
    return findAll(this, node => node.type === type, options);
  }

  findAllByProps(
    props: Object,
    options: ?FindOptions = null,
  ): Array<ReactTestInstance> {
    return findAll(
      this,
      node => node.props && propsMatch(node.props, props),
      options,
    );
  }
}

function findAll(
  root: ReactTestInstance,
  predicate: Predicate,
  options: ?FindOptions,
): Array<ReactTestInstance> {
  const deep = options ? options.deep : true;
  const results = [];

  if (predicate(root)) {
    results.push(root);
    if (!deep) {
      return results;
    }
  }

  root.children.forEach(child => {
    if (typeof child === 'string') {
      return;
    }
    results.push(...findAll(child, predicate, options));
  });

  return results;
}

function expectOne(
  all: Array<ReactTestInstance>,
  message: string,
): ReactTestInstance {
  if (all.length === 1) {
    return all[0];
  }

  const prefix =
    all.length === 0
      ? 'No instances found '
      : `Expected 1 but found ${all.length} instances `;

  throw new Error(prefix + message);
}

function propsMatch(props: Object, filter: Object): boolean {
  for (const key in filter) {
    if (props[key] !== filter[key]) {
      return false;
    }
  }
  return true;
}

function create(
  element: React$Element<any>,
  options: TestRendererOptions,
): {
  _Scheduler: typeof Scheduler,
  root: void,
  toJSON(): Array<ReactTestRendererNode> | ReactTestRendererNode | null,
  toTree(): mixed,
  update(newElement: React$Element<any>): any,
  unmount(): void,
  getInstance(): component(...props: any) | PublicInstance | null,
  unstable_flushSync: typeof flushSyncFromReconciler,
} {
  if (__DEV__) {
    if (
      enableReactTestRendererWarning === true &&
      global.IS_REACT_NATIVE_TEST_ENVIRONMENT !== true
    ) {
      console.error(
        'react-test-renderer is deprecated. See https://react.dev/warnings/react-test-renderer',
      );
    }
  }

  let createNodeMock = defaultTestOptions.createNodeMock;
  const isConcurrentOnly =
    disableLegacyMode === true &&
    global.IS_REACT_NATIVE_TEST_ENVIRONMENT !== true;
  let isConcurrent = isConcurrentOnly;
  let isStrictMode = false;
  // $FlowFixMe[invalid-compare]
  if (typeof options === 'object' && options !== null) {
    if (typeof options.createNodeMock === 'function') {
      // $FlowFixMe[incompatible-type] found when upgrading Flow
      createNodeMock = options.createNodeMock;
    }
    if (isConcurrentOnly === false) {
      isConcurrent = options.unstable_isConcurrent;
    }
    if (options.unstable_strictMode === true) {
      isStrictMode = true;
    }
  }
  let container: Container = {
    children: [] as Array<Instance | TextInstance>,
    createNodeMock,
    tag: 'CONTAINER',
  };
  let root: FiberRoot | null = createContainer(
    container,
    isConcurrent ? ConcurrentRoot : LegacyRoot,
    null,
    isStrictMode,
    '',
    defaultOnUncaughtError,
    defaultOnCaughtError,
    defaultOnRecoverableError,
    defaultOnDefaultTransitionIndicator,
    null,
  );

  if (root == null) {
    throw new Error('something went wrong');
  }

  // $FlowFixMe[incompatible-type]
  updateContainer(element, root, null, null);

  const entry = {
    _Scheduler: Scheduler,

    root: undefined, // makes flow happy
    // we define a 'getter' for 'root' below using 'Object.defineProperty'
    toJSON(): Array<ReactTestRendererNode> | ReactTestRendererNode | null {
      if (root == null || root.current == null || container == null) {
        return null;
      }
      if (container.children.length === 0) {
        return null;
      }
      if (container.children.length === 1) {
        return toJSON(container.children[0]);
      }
      if (
        container.children.length === 2 &&
        container.children[0].isHidden === true &&
        container.children[1].isHidden === false
      ) {
        // Omit timed out children from output entirely, including the fact that we
        // temporarily wrap fallback and timed out children in an array.
        return toJSON(container.children[1]);
      }
      let renderedChildren = null;
      if (container.children && container.children.length) {
        for (let i = 0; i < container.children.length; i++) {
          const renderedChild = toJSON(container.children[i]);
          if (renderedChild !== null) {
            if (renderedChildren === null) {
              renderedChildren = [renderedChild];
            } else {
              renderedChildren.push(renderedChild);
            }
          }
        }
      }
      return renderedChildren;
    },
    toTree() {
      if (root == null || root.current == null) {
        return null;
      }
      return toTree(root.current);
    },
    update(newElement: React$Element<any>): number | void {
      if (root == null || root.current == null) {
        return;
      }
      // $FlowFixMe[incompatible-type]
      updateContainer(newElement, root, null, null);
    },
    unmount() {
      if (root == null || root.current == null) {
        return;
      }
      updateContainer(null, root, null, null);
      // $FlowFixMe[incompatible-type] found when upgrading Flow
      container = null;
      root = null;
    },
    getInstance() {
      if (root == null || root.current == null) {
        return null;
      }
      return getPublicRootInstance(root);
    },

    unstable_flushSync: flushSyncFromReconciler,
  };

  Object.defineProperty(entry, 'root', {
    configurable: true,
    enumerable: true,
    get: function () {
      if (root === null) {
        throw new Error("Can't access .root on unmounted test renderer");
      }
      const children = getChildren(root.current);
      if (children.length === 0) {
        throw new Error("Can't access .root on unmounted test renderer");
      } else if (children.length === 1) {
        // Normally, we skip the root and just give you the child.
        return children[0];
      } else {
        // However, we give you the root if there's more than one root child.
        // We could make this the behavior for all cases but it would be a breaking change.
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        return wrapFiber(root.current);
      }
    },
  } as Object);

  return entry;
}

const fiberToWrapper = new WeakMap<Fiber, ReactTestInstance>();
function wrapFiber(fiber: Fiber): ReactTestInstance {
  let wrapper = fiberToWrapper.get(fiber);
  if (wrapper === undefined && fiber.alternate !== null) {
    wrapper = fiberToWrapper.get(fiber.alternate);
  }
  if (wrapper === undefined) {
    wrapper = new ReactTestInstance(fiber);
    fiberToWrapper.set(fiber, wrapper);
  }
  return wrapper;
}

// Enable ReactTestRenderer to be used to test DevTools integration.
injectIntoDevTools();

export {
  Scheduler as _Scheduler,
  create,
  batchedUpdates as unstable_batchedUpdates,
  act,
  ReactVersion as version,
};
