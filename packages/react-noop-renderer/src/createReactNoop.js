/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * This is a renderer of React that doesn't have a render target output.
 * It is useful to demonstrate the internals of the reconciler in isolation
 * and for testing semantics of reconciliation separate from the host
 * environment.
 */

import type {
  Fiber,
  TransitionTracingCallbacks,
} from 'react-reconciler/src/ReactInternalTypes';
import type {UpdateQueue} from 'react-reconciler/src/ReactFiberClassUpdateQueue';
import type {ReactNodeList} from 'shared/ReactTypes';
import type {RootTag} from 'react-reconciler/src/ReactRootTags';
import type {EventPriority} from 'react-reconciler/src/ReactEventPriorities';
import type {TransitionTypes} from 'react/src/ReactTransitionType';
import typeof * as HostConfig from 'react-reconciler/src/ReactFiberConfig';
import typeof * as ReactFiberConfigWithNoMutation from 'react-reconciler/src/ReactFiberConfigWithNoMutation';
import typeof * as ReactFiberConfigWithNoViewTransition from 'react-reconciler/src/ReactFiberConfigWithNoViewTransition';
import typeof * as ReactFiberConfigWithNoPersistence from 'react-reconciler/src/ReactFiberConfigWithNoPersistence';

import typeof * as ReconcilerAPI from 'react-reconciler/src/ReactFiberReconciler';
import type {
  Container,
  HostContext,
  Instance,
  PublicInstance,
  TextInstance,
} from './ReactFiberConfigNoop';

import * as Scheduler from 'scheduler/unstable_mock';
import {REACT_FRAGMENT_TYPE, REACT_ELEMENT_TYPE} from 'shared/ReactSymbols';
import isArray from 'shared/isArray';
import {checkPropStringCoercion} from 'shared/CheckStringCoercion';
import {
  NoEventPriority,
  DiscreteEventPriority,
  DefaultEventPriority,
  IdleEventPriority,
  ConcurrentRoot,
  LegacyRoot,
} from 'react-reconciler/constants';
import * as DefaultConfig from './ReactFiberConfigNoop';

import {disableLegacyMode} from 'shared/ReactFeatureFlags';

import ReactSharedInternals from 'shared/ReactSharedInternals';
import ReactVersion from 'shared/ReactVersion';

type Props = {
  prop: any,
  hidden: boolean,
  children?: mixed,
  bottom?: null | number,
  left?: null | number,
  right?: null | number,
  top?: null | number,
  src?: string,
  ...
};
type CreateRootOptions = {
  unstable_transitionCallbacks?: TransitionTracingCallbacks,
  onUncaughtError?: (
    error: mixed,
    errorInfo: {+componentStack: ?string},
  ) => void,
  onCaughtError?: (
    error: mixed,
    errorInfo: {
      +componentStack: ?string,
      +errorBoundary?: ?component(...props: any),
    },
  ) => void,
  onDefaultTransitionIndicator?: () => void | (() => void),
  ...
};
type InstanceMeasurement = null;

type SuspenseyCommitSubscription = {
  pendingCount: number,
  commit: null | (() => void),
};

export opaque type SuspendedState = SuspenseyCommitSubscription;

export type TransitionStatus = mixed;

export type FormInstance = Instance;

export type RunningViewTransition = null;

export type ViewTransitionInstance = null | {name: string, ...};

export type GestureTimeline = null;

const NO_CONTEXT = {};
const UPPERCASE_CONTEXT = {};
if (__DEV__) {
  Object.freeze(NO_CONTEXT);
}

function createReactNoop(
  reconciler: (hostConfig: HostConfig) => ReconcilerAPI,
  useMutation: boolean,
): any {
  let instanceCounter = 0;
  let hostUpdateCounter = 0;
  let hostCloneCounter = 0;

  function appendChildToContainerOrInstance(
    parentInstance: Container | Instance,
    child: Instance | TextInstance,
  ): void {
    const prevParent = child.parent;

    if (
      prevParent !== -1 &&
      prevParent !==
        // $FlowFixMe[prop-missing]
        // $FlowFixMe[incompatible-type]
        (parentInstance as Instance).id
    ) {
      throw new Error('Reparenting is not allowed');
    }

    child.parent =
      // $FlowFixMe[prop-missing]
      // $FlowFixMe[incompatible-type]
      (parentInstance as Instance).id;
    const index = parentInstance.children.indexOf(child);
    if (index !== -1) {
      parentInstance.children.splice(index, 1);
    }
    parentInstance.children.push(child);
  }

  function appendChildToContainer(
    parentInstance: Container,
    child: Instance | TextInstance,
  ): void {
    if (typeof parentInstance.rootID !== 'string') {
      // Some calls to this aren't typesafe.
      // This helps surface mistakes in tests.
      throw new Error(
        'appendChildToContainer() first argument is not a container.',
      );
    }
    appendChildToContainerOrInstance(parentInstance, child);
  }

  function appendChild(
    parentInstance: Instance,
    child: Instance | TextInstance,
  ): void {
    if (typeof (parentInstance as any).rootID === 'string') {
      // Some calls to this aren't typesafe.
      // This helps surface mistakes in tests.
      throw new Error('appendChild() first argument is not an instance.');
    }
    appendChildToContainerOrInstance(parentInstance, child);
  }

  function insertInContainerOrInstanceBefore(
    parentInstance: Container | Instance,
    child: Instance | TextInstance,
    beforeChild: Instance | TextInstance,
  ): void {
    const index = parentInstance.children.indexOf(child);
    if (index !== -1) {
      parentInstance.children.splice(index, 1);
    }
    const beforeIndex = parentInstance.children.indexOf(beforeChild);
    if (beforeIndex === -1) {
      throw new Error('This child does not exist.');
    }
    parentInstance.children.splice(beforeIndex, 0, child);
  }

  function insertInContainerBefore(
    parentInstance: Container,
    child: Instance | TextInstance,
    beforeChild: Instance | TextInstance,
  ) {
    if (typeof parentInstance.rootID !== 'string') {
      // Some calls to this aren't typesafe.
      // This helps surface mistakes in tests.
      throw new Error(
        'insertInContainerBefore() first argument is not a container.',
      );
    }
    insertInContainerOrInstanceBefore(parentInstance, child, beforeChild);
  }

  function insertBefore(
    parentInstance: Instance,
    child: Instance | TextInstance,
    beforeChild: Instance | TextInstance,
  ) {
    if (typeof (parentInstance as any).rootID === 'string') {
      // Some calls to this aren't typesafe.
      // This helps surface mistakes in tests.
      throw new Error('insertBefore() first argument is not an instance.');
    }
    insertInContainerOrInstanceBefore(parentInstance, child, beforeChild);
  }

  function clearContainer(container: Container): void {
    container.children.splice(0);
  }

  function removeChildFromContainerOrInstance(
    parentInstance: Container | Instance,
    child: Instance | TextInstance,
  ): void {
    const index = parentInstance.children.indexOf(child);
    if (index === -1) {
      throw new Error('This child does not exist.');
    }
    parentInstance.children.splice(index, 1);
  }

  function removeChildFromContainer(
    parentInstance: Container,
    child: Instance | TextInstance,
  ): void {
    if (typeof parentInstance.rootID !== 'string') {
      // Some calls to this aren't typesafe.
      // This helps surface mistakes in tests.
      throw new Error(
        'removeChildFromContainer() first argument is not a container.',
      );
    }
    removeChildFromContainerOrInstance(parentInstance, child);
  }

  function removeChild(
    parentInstance: Instance,
    child: Instance | TextInstance,
  ): void {
    if (typeof (parentInstance as any).rootID === 'string') {
      // Some calls to this aren't typesafe.
      // This helps surface mistakes in tests.
      throw new Error('removeChild() first argument is not an instance.');
    }
    removeChildFromContainerOrInstance(parentInstance, child);
  }

  function cloneInstance(
    instance: Instance,
    type: string,
    oldProps: Props,
    newProps: Props,
    keepChildren: boolean,
    children: ?$ReadOnlyArray<Instance>,
  ): Instance {
    if (__DEV__) {
      checkPropStringCoercion(newProps.children, 'children');
    }
    const clone: Instance = {
      id: instance.id,
      type: type,
      parent: instance.parent,
      children: keepChildren
        ? instance.children
        : // $FlowFixMe[incompatible-type] We're not typing immutable instances.
          (children ?? []),
      text: shouldSetTextContent(type, newProps)
        ? computeText((newProps.children as any) + '', instance.context)
        : null,
      prop: newProps.prop,
      hidden: !!newProps.hidden,
      context: instance.context,
    };

    if (type === 'suspensey-thing' && typeof newProps.src === 'string') {
      // $FlowFixMe[prop-missing]
      clone.src = newProps.src;
    }

    Object.defineProperty(clone, 'id', {
      value: clone.id,
      enumerable: false,
    });
    Object.defineProperty(clone, 'parent', {
      value: clone.parent,
      enumerable: false,
    });
    Object.defineProperty(clone, 'text', {
      value: clone.text,
      enumerable: false,
    });
    Object.defineProperty(clone, 'context', {
      value: clone.context,
      enumerable: false,
    });
    hostCloneCounter++;
    return clone;
  }

  function shouldSetTextContent(type: string, props: Props): boolean {
    if (type === 'errorInBeginPhase') {
      throw new Error('Error in host config.');
    }
    return (
      typeof props.children === 'string' ||
      typeof props.children === 'number' ||
      typeof props.children === 'bigint'
    );
  }

  function computeText(rawText: string, hostContext: HostContext) {
    return hostContext === UPPERCASE_CONTEXT ? rawText.toUpperCase() : rawText;
  }

  type SuspenseyThingRecord = {
    status: 'pending' | 'fulfilled',
    subscriptions: Array<SuspenseyCommitSubscription> | null,
  };

  let suspenseyThingCache: Map<string, SuspenseyThingRecord> | null = null;

  function startSuspendingCommit(): SuspendedState {
    // Represents a subscription for all the suspensey things that block a
    // particular commit. Once they've all loaded, the commit phase can proceed.
    return {
      pendingCount: 0,
      commit: null,
    };
  }

  function suspendInstance(
    state: SuspendedState,
    instance: Instance,
    type: string,
    props: Props,
  ): void {
    const src = props.src;
    if (type === 'suspensey-thing' && typeof src === 'string') {
      // Attach a listener to the suspensey thing and create a subscription
      // object that uses reference counting to track when all the suspensey
      // things have loaded.
      // $FlowFixMe[incompatible-use] Still not nullable
      const record = suspenseyThingCache.get(src);
      if (record === undefined) {
        throw new Error('Could not find record for key.');
      }
      if (record.status === 'fulfilled') {
        // Already loaded.
      } else if (record.status === 'pending') {
        state.pendingCount++;
        // Stash the subscription on the record. In `resolveSuspenseyThing`,
        // we'll use this fire the commit once all the things have loaded.
        if (record.subscriptions === null) {
          record.subscriptions = [];
        }
        record.subscriptions.push(state);
      }
    } else {
      throw new Error(
        'Did not expect this host component to be visited when suspending ' +
          'the commit. Did you check the SuspendCommit flag?',
      );
    }
  }

  function waitForCommitToBeReady(
    state: SuspendedState,
    timeoutOffset: number,
  ): ((commit: () => void) => () => void) | null {
    if (state.pendingCount > 0) {
      return (commit: () => void) => {
        state.commit = commit;
        const cancelCommit = () => {
          state.commit = null;
        };
        return cancelCommit;
      };
    }
    return null;
  }

  const sharedHostConfig: HostConfig = {
    rendererVersion: ReactVersion,
    rendererPackageName: 'react-noop',

    ...DefaultConfig,

    extraDevToolsConfig: null,

    getRootHostContext() {
      return NO_CONTEXT;
    },

    getChildHostContext(parentHostContext: HostContext, type: string) {
      if (type === 'offscreen') {
        return parentHostContext;
      }
      if (type === 'uppercase') {
        return UPPERCASE_CONTEXT;
      }
      return NO_CONTEXT;
    },

    getPublicInstance(instance: Instance): PublicInstance {
      return instance as any;
    },

    HostTransitionContext: null,

    createInstance(
      type: string,
      props: Props,
      rootContainerInstance: Container,
      hostContext: HostContext,
      internalInstanceHandle: Object,
    ): Instance {
      if (type === 'errorInCompletePhase') {
        throw new Error('Error in host config.');
      }
      if (__DEV__) {
        // The `if` statement here prevents auto-disabling of the safe coercion
        // ESLint rule, so we must manually disable it below.
        if (shouldSetTextContent(type, props)) {
          checkPropStringCoercion(props.children, 'children');
        }
      }
      const inst: Instance = {
        id: instanceCounter++,
        type: type,
        children: [],
        parent: -1,
        text: shouldSetTextContent(type, props)
          ? // eslint-disable-next-line react-internal/safe-string-coercion
            computeText((props.children as any) + '', hostContext)
          : null,
        prop: props.prop,
        hidden: !!props.hidden,
        context: hostContext,
      };

      if (type === 'suspensey-thing' && typeof props.src === 'string') {
        // $FlowFixMe[prop-missing]
        inst.src = props.src;
      }

      // Hide from unit tests
      Object.defineProperty(inst, 'id', {value: inst.id, enumerable: false});
      Object.defineProperty(inst, 'parent', {
        value: inst.parent,
        enumerable: false,
      });
      Object.defineProperty(inst, 'text', {
        value: inst.text,
        enumerable: false,
      });
      Object.defineProperty(inst, 'context', {
        value: inst.context,
        enumerable: false,
      });
      // $FlowFixMe[prop-missing]
      Object.defineProperty(inst, 'fiber', {
        value: internalInstanceHandle,
        enumerable: false,
      });
      // $FlowFixMe[incompatible-return]
      return inst;
    },

    appendInitialChild(
      parentInstance: Instance,
      child: Instance | TextInstance,
    ): void {
      const prevParent = child.parent;
      if (prevParent !== -1 && prevParent !== parentInstance.id) {
        throw new Error('Reparenting is not allowed');
      }
      child.parent = parentInstance.id;
      parentInstance.children.push(child);
    },

    finalizeInitialChildren(
      domElement: Instance,
      type: string,
      props: Props,
    ): boolean {
      return false;
    },

    shouldSetTextContent,

    createTextInstance(
      text: string,
      rootContainerInstance: Container,
      hostContext: Object,
      internalInstanceHandle: Object,
    ): TextInstance {
      if (hostContext === UPPERCASE_CONTEXT) {
        text = text.toUpperCase();
      }
      const inst = {
        text: text,
        id: instanceCounter++,
        parent: -1,
        hidden: false,
        context: hostContext,
      };
      // Hide from unit tests
      Object.defineProperty(inst, 'id', {value: inst.id, enumerable: false});
      Object.defineProperty(inst, 'parent', {
        value: inst.parent,
        enumerable: false,
      });
      Object.defineProperty(inst, 'context', {
        value: inst.context,
        enumerable: false,
      });
      return inst;
    },

    createFragmentInstance(fragmentFiber: mixed) {
      return null;
    },

    updateFragmentInstanceFiber(fragmentFiber: mixed, fragmentInstance: mixed) {
      // Noop
    },

    commitNewChildToFragmentInstance(child: mixed, fragmentInstance: mixed) {
      // Noop
    },

    deleteChildFromFragmentInstance(child: mixed, fragmentInstance: mixed) {
      // Noop
    },

    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,

    supportsMicrotasks: true,
    scheduleMicrotask:
      typeof queueMicrotask === 'function'
        ? queueMicrotask
        : typeof Promise !== 'undefined'
          ? (callback: () => void) =>
              Promise.resolve(null)
                .then(callback)
                .catch(error => {
                  setTimeout(() => {
                    throw error;
                  });
                })
          : setTimeout,

    prepareForCommit(): null | Object {
      return null;
    },

    resetAfterCommit(): void {},

    setCurrentUpdatePriority,
    getCurrentUpdatePriority,

    resolveUpdatePriority() {
      if (currentUpdatePriority !== NoEventPriority) {
        return currentUpdatePriority;
      }
      return currentEventPriority;
    },

    trackSchedulerEvent(): void {},

    resolveEventType(): null | string {
      return null;
    },

    resolveEventTimeStamp(): number {
      return -1.1;
    },

    shouldAttemptEagerTransition(): boolean {
      return false;
    },

    isPrimaryRenderer: true,
    warnsIfNotActing: true,

    getInstanceFromNode() {
      throw new Error('Not yet implemented.');
    },

    beforeActiveInstanceBlur() {
      // NO-OP
    },

    afterActiveInstanceBlur() {
      // NO-OP
    },

    preparePortalMount() {
      // NO-OP
    },

    detachDeletedInstance() {},

    requestPostPaintCallback(callback: (time: number) => void) {
      const endTime = Scheduler.unstable_now();
      callback(endTime);
    },

    maySuspendCommit(type: string, props: Props): boolean {
      // Asks whether it's possible for this combination of type and props
      // to ever need to suspend. This is different from asking whether it's
      // currently ready because even if it's ready now, it might get purged
      // from the cache later.
      return type === 'suspensey-thing' && typeof props.src === 'string';
    },

    maySuspendCommitOnUpdate(
      type: string,
      oldProps: Props,
      newProps: Props,
    ): boolean {
      // Asks whether it's possible for this combination of type and props
      // to ever need to suspend. This is different from asking whether it's
      // currently ready because even if it's ready now, it might get purged
      // from the cache later.
      return (
        type === 'suspensey-thing' &&
        typeof newProps.src === 'string' &&
        newProps.src !== oldProps.src
      );
    },

    maySuspendCommitInSyncRender(type: string, props: Props): boolean {
      return true;
    },

    preloadInstance(instance: Instance, type: string, props: Props): boolean {
      if (type !== 'suspensey-thing' || typeof props.src !== 'string') {
        throw new Error('Attempted to preload unexpected instance: ' + type);
      }
      const src = props.src;

      // In addition to preloading an instance, this method asks whether the
      // instance is ready to be committed. If it's not, React may yield to the
      // main thread and ask again. It's possible a load event will fire in
      // between, in which case we can avoid showing a fallback.
      if (suspenseyThingCache === null) {
        suspenseyThingCache = new Map();
      }
      const record = suspenseyThingCache.get(src);
      if (record === undefined) {
        const newRecord: SuspenseyThingRecord = {
          status: 'pending',
          subscriptions: null,
        };
        // $FlowFixMe[incompatible-use] Still not nullable
        suspenseyThingCache.set(src, newRecord);
        // $FlowFixMe[prop-missing]
        const onLoadStart = props.onLoadStart;
        if (typeof onLoadStart === 'function') {
          onLoadStart();
        }
        return false;
      } else {
        return record.status === 'fulfilled';
      }
    },

    startSuspendingCommit,
    suspendInstance,

    suspendOnActiveViewTransition(
      state: SuspendedState,
      container: Container,
    ): void {
      // Not implemented
    },

    waitForCommitToBeReady,

    getSuspendedCommitReason(
      state: SuspendedState,
      rootContainer: Container,
    ): null | string {
      return null;
    },

    NotPendingTransition: null as TransitionStatus,

    resetFormInstance(form: Instance) {},

    bindToConsole(methodName: $FlowFixMe, args: Array<any>, badgeName: string) {
      // $FlowFixMe[incompatible-type]
      return Function.prototype.bind.apply(
        // eslint-disable-next-line react-internal/no-production-logging
        console[methodName],
        [console].concat(args),
      );
    },
  };

  const mutationHostConfig: Pick<
    HostConfig,
    | $Keys<ReactFiberConfigWithNoMutation>
    | $Keys<ReactFiberConfigWithNoViewTransition>,
  > = {
    supportsMutation: true,

    cloneMutableInstance() {
      // required for enableGestureTransition
      throw new Error('Not yet implemented.');
    },

    cloneMutableTextInstance() {
      // required for enableGestureTransition
      throw new Error('Not yet implemented.');
    },

    commitMount(instance: Instance, type: string, newProps: Props): void {
      // Noop
    },

    commitUpdate(
      instance: Instance,
      type: string,
      oldProps: Props,
      newProps: Props,
    ): void {
      // $FlowFixMe[invalid-compare]
      if (oldProps === null) {
        throw new Error('Should have old props');
      }
      hostUpdateCounter++;
      instance.prop = newProps.prop;
      instance.hidden = !!newProps.hidden;

      if (type === 'suspensey-thing' && typeof newProps.src === 'string') {
        // $FlowFixMe[prop-missing]
        instance.src = newProps.src;
      }

      if (shouldSetTextContent(type, newProps)) {
        if (__DEV__) {
          checkPropStringCoercion(newProps.children, 'children');
        }
        instance.text = computeText(
          (newProps.children as any) + '',
          instance.context,
        );
      }
    },

    commitTextUpdate(
      textInstance: TextInstance,
      oldText: string,
      newText: string,
    ): void {
      hostUpdateCounter++;
      textInstance.text = computeText(newText, textInstance.context);
    },

    appendChild,
    appendChildToContainer,
    insertBefore,
    insertInContainerBefore,
    removeChild,
    removeChildFromContainer,
    clearContainer,

    hideInstance(instance: Instance): void {
      instance.hidden = true;
    },

    hideTextInstance(textInstance: TextInstance): void {
      textInstance.hidden = true;
    },

    unhideInstance(instance: Instance, props: Props): void {
      if (!props.hidden) {
        instance.hidden = false;
      }
    },

    unhideTextInstance(textInstance: TextInstance, text: string): void {
      textInstance.hidden = false;
    },

    applyViewTransitionName(
      instance: Instance,
      name: string,
      className: ?string,
    ): void {},

    restoreViewTransitionName(instance: Instance, props: Props): void {},

    cancelViewTransitionName(
      instance: Instance,
      name: string,
      props: Props,
    ): void {},

    cancelRootViewTransitionName(rootContainer: Container): void {},

    restoreRootViewTransitionName(rootContainer: Container): void {},

    cloneRootViewTransitionContainer(rootContainer: Container): Instance {
      throw new Error('Not yet implemented.');
    },

    removeRootViewTransitionClone(
      rootContainer: Container,
      clone: Instance,
    ): void {
      throw new Error('Not implemented.');
    },

    measureInstance(instance: Instance): InstanceMeasurement {
      return null;
    },

    measureClonedInstance(instance: Instance): InstanceMeasurement {
      return null;
    },

    wasInstanceInViewport(measurement: InstanceMeasurement): boolean {
      return true;
    },

    hasInstanceChanged(
      oldMeasurement: InstanceMeasurement,
      newMeasurement: InstanceMeasurement,
    ): boolean {
      return false;
    },

    hasInstanceAffectedParent(
      oldMeasurement: InstanceMeasurement,
      newMeasurement: InstanceMeasurement,
    ): boolean {
      return false;
    },

    startViewTransition(
      rootContainer: Container,
      transitionTypes: null | TransitionTypes,
      mutationCallback: () => void,
      layoutCallback: () => void,
      afterMutationCallback: () => void,
      spawnedWorkCallback: () => void,
      passiveCallback: () => mixed,
      errorCallback: mixed => void,
      blockedCallback: string => void, // Profiling-only
      finishedAnimation: () => void, // Profiling-only
    ): null | RunningViewTransition {
      mutationCallback();
      layoutCallback();
      // Skip afterMutationCallback(). We don't need it since we're not animating.
      spawnedWorkCallback();
      // Skip passiveCallback(). Spawned work will schedule a task.
      return null;
    },

    startGestureTransition(
      rootContainer: Container,
      timeline: GestureTimeline,
      rangeStart: number,
      rangeEnd: number,
      transitionTypes: null | TransitionTypes,
      mutationCallback: () => void,
      animateCallback: () => void,
      errorCallback: mixed => void,
    ): null | RunningViewTransition {
      mutationCallback();
      animateCallback();
      return null;
    },

    stopViewTransition(transition: RunningViewTransition) {},

    addViewTransitionFinishedListener(
      transition: RunningViewTransition,
      callback: () => void,
    ) {
      callback();
    },

    createViewTransitionInstance(name: string): ViewTransitionInstance {
      return null;
    },

    getCurrentGestureOffset(provider: GestureTimeline): number {
      return 0;
    },

    resetTextContent(instance: Instance): void {
      instance.text = null;
    },
  };

  const persistenceHostConfig: Pick<
    HostConfig,
    $Keys<ReactFiberConfigWithNoPersistence>,
  > = {
    supportsPersistence: true,

    cloneInstance,

    createContainerChildSet(): Array<Instance | TextInstance> {
      return [];
    },

    appendChildToContainerChildSet(
      childSet: Array<Instance | TextInstance>,
      child: Instance | TextInstance,
    ): void {
      childSet.push(child);
    },

    finalizeContainerChildren(
      container: Container,
      newChildren: Array<Instance | TextInstance>,
    ): void {
      container.pendingChildren = newChildren;
      if (
        newChildren.length === 1 &&
        newChildren[0].text === 'Error when completing root'
      ) {
        // Trigger an error for testing purposes
        throw Error('Error when completing root');
      }
    },

    replaceContainerChildren(
      container: Container,
      newChildren: Array<Instance | TextInstance>,
    ): void {
      container.children = newChildren;
    },

    cloneHiddenInstance(
      instance: Instance,
      type: string,
      props: Props,
    ): Instance {
      const clone = cloneInstance(instance, type, props, props, true, null);
      clone.hidden = true;
      return clone;
    },

    cloneHiddenTextInstance(
      instance: TextInstance,
      text: string,
    ): TextInstance {
      const clone = {
        text: instance.text,
        id: instance.id,
        parent: instance.parent,
        hidden: true,
        context: instance.context,
      };
      // Hide from unit tests
      Object.defineProperty(clone, 'id', {
        value: clone.id,
        enumerable: false,
      });
      Object.defineProperty(clone, 'parent', {
        value: clone.parent,
        enumerable: false,
      });
      Object.defineProperty(clone, 'context', {
        value: clone.context,
        enumerable: false,
      });
      return clone;
    },
  };

  const hostConfig: HostConfig = useMutation
    ? {...sharedHostConfig, ...mutationHostConfig}
    : {...sharedHostConfig, ...persistenceHostConfig};

  const NoopRenderer = reconciler(hostConfig);

  const rootContainers = new Map<string, Container>();
  const roots = new Map<string, Object>();
  const DEFAULT_ROOT_ID = '<default>';

  let currentUpdatePriority = NoEventPriority;
  function setCurrentUpdatePriority(newPriority: EventPriority): void {
    currentUpdatePriority = newPriority;
  }

  function getCurrentUpdatePriority(): EventPriority {
    return currentUpdatePriority;
  }

  let currentEventPriority = DefaultEventPriority;

  function createJSXElementForTestComparison(type: mixed, props: mixed) {
    if (__DEV__) {
      const element = {
        type: type,
        $$typeof: REACT_ELEMENT_TYPE,
        key: null,
        props: props,
        // $FlowFixMe[constant-condition]
        _owner: null,
        // $FlowFixMe[constant-condition]
        _store: __DEV__ ? {} : undefined,
      };
      // $FlowFixMe[prop-missing]
      Object.defineProperty(element, 'ref', {
        enumerable: false,
        value: null,
      });
      return element;
    } else {
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type: type,
        key: null,
        ref: null,
        props: props,
      };
    }
  }

  function childToJSX(
    child: null | Instance | TextInstance | Array<Instance | TextInstance>,
    text: ?string,
  ): mixed {
    if (text !== null) {
      return text;
    }
    if (child === null) {
      return null;
    }
    if (typeof child === 'string') {
      return child;
    }
    if (isArray(child)) {
      if (child.length === 0) {
        return null;
      }
      if (child.length === 1) {
        return childToJSX(child[0], null);
      }
      const children = child.map(c => childToJSX(c, null));
      if (
        children.every(
          c =>
            typeof c === 'string' ||
            typeof c === 'number' ||
            typeof c === 'bigint',
        )
      ) {
        return children.join('');
      }
      return children;
    }
    if (isArray(child.children)) {
      // This is an instance.
      const instance: Instance = child as any;
      const children = childToJSX(instance.children, instance.text);
      const props = {prop: instance.prop} as any;
      if (instance.hidden) {
        props.hidden = true;
      }
      // $FlowFixMe[prop-missing]
      if (instance.src) {
        props.src = instance.src;
      }
      if (children !== null) {
        props.children = children;
      }
      return createJSXElementForTestComparison(instance.type, props);
    }
    // This is a text instance
    const textInstance: TextInstance = child as any;
    if (textInstance.hidden) {
      return '';
    }
    return textInstance.text;
  }

  function getChildren(root: ?(Container | Instance)) {
    if (root) {
      return root.children;
    } else {
      return null;
    }
  }

  function getPendingChildren(root: ?(Container | Instance)) {
    if (root) {
      return root.children;
    } else {
      return null;
    }
  }

  function getChildrenAsJSX(root: ?(Container | Instance)) {
    const children = childToJSX(getChildren(root), null);
    if (children === null) {
      return null;
    }
    if (isArray(children)) {
      return createJSXElementForTestComparison(REACT_FRAGMENT_TYPE, {children});
    }
    return children;
  }

  function getPendingChildrenAsJSX(root: ?(Container | Instance)) {
    const children = childToJSX(getChildren(root), null);
    if (children === null) {
      return null;
    }
    if (isArray(children)) {
      return createJSXElementForTestComparison(REACT_FRAGMENT_TYPE, {children});
    }
    return children;
  }

  function flushSync<R>(fn: () => R): ?R {
    if (__DEV__) {
      if (NoopRenderer.isAlreadyRendering()) {
        console.error(
          'flushSync was called from inside a lifecycle method. React cannot ' +
            'flush when React is already rendering. Consider moving this call to ' +
            'a scheduler task or micro task.',
        );
      }
    }
    if (disableLegacyMode) {
      const previousTransition = ReactSharedInternals.T;
      const preivousEventPriority = currentEventPriority;
      try {
        // $FlowFixMe[constant-condition]
        ReactSharedInternals.T = null;
        currentEventPriority = DiscreteEventPriority;
        // $FlowFixMe[constant-condition]
        if (fn) {
          return fn();
        } else {
          return undefined;
        }
      } finally {
        ReactSharedInternals.T = previousTransition;
        currentEventPriority = preivousEventPriority;
        NoopRenderer.flushSyncWork();
      }
    } else {
      return NoopRenderer.flushSyncFromReconciler(fn);
    }
  }

  function onRecoverableError(error: mixed): void {
    // eslint-disable-next-line react-internal/warning-args, react-internal/no-production-logging -- renderer is only used for testing.
    console.error(error);
  }
  function onDefaultTransitionIndicator(): void | (() => void) {}

  // $FlowFixMe[recursive-definition]
  // $FlowFixMe[definition-cycle]
  let idCounter = 0;

  // $FlowFixMe[definition-cycle]
  // $FlowFixMe[recursive-definition]
  const ReactNoop = {
    _Scheduler: Scheduler,

    getChildren(rootID: string = DEFAULT_ROOT_ID) {
      throw new Error(
        'No longer supported due to bad performance when used with `expect()`. ' +
          'Use `ReactNoop.getChildrenAsJSX()` instead or, if you really need to, `dangerouslyGetChildren` after you carefully considered the warning in its JSDOC.',
      );
    },

    getPendingChildren(rootID: string = DEFAULT_ROOT_ID) {
      throw new Error(
        'No longer supported due to bad performance when used with `expect()`. ' +
          'Use `ReactNoop.getPendingChildrenAsJSX()` instead or, if you really need to, `dangerouslyGetPendingChildren` after you carefully considered the warning in its JSDOC.',
      );
    },

    /**
     * Prefer using `getChildrenAsJSX`.
     * Using the returned children in `.toEqual` has very poor performance on mismatch due to deep equality checking of fiber structures.
     * Make sure you deeply remove enumerable properties before passing it to `.toEqual`, or, better, use `getChildrenAsJSX` or `toMatchRenderedOutput`.
     */
    dangerouslyGetChildren(rootID: string = DEFAULT_ROOT_ID) {
      const container = rootContainers.get(rootID);
      return getChildren(container);
    },

    /**
     * Prefer using `getPendingChildrenAsJSX`.
     * Using the returned children in `.toEqual` has very poor performance on mismatch due to deep equality checking of fiber structures.
     * Make sure you deeply remove enumerable properties before passing it to `.toEqual`, or, better, use `getChildrenAsJSX` or `toMatchRenderedOutput`.
     */
    dangerouslyGetPendingChildren(rootID: string = DEFAULT_ROOT_ID) {
      const container = rootContainers.get(rootID);
      return getPendingChildren(container);
    },

    getOrCreateRootContainer(
      rootID: string = DEFAULT_ROOT_ID,
      tag: RootTag,
    ): Container {
      let root = roots.get(rootID);
      if (!root) {
        const container: Container = {
          rootID: rootID,
          pendingChildren: [],
          children: [],
        };
        // $FlowFixMe[incompatible-call]
        rootContainers.set(rootID, container);
        root = NoopRenderer.createContainer(
          // $FlowFixMe[incompatible-call] -- Discovered when typechecking noop-renderer
          container,
          // $FlowFixMe[incompatible-type]
          tag,
          null,
          // $FlowFixMe[incompatible-type] -- Discovered when typechecking noop-renderer
          null,
          false,
          '',
          NoopRenderer.defaultOnUncaughtError,
          NoopRenderer.defaultOnCaughtError,
          onRecoverableError,
          onDefaultTransitionIndicator,
          null,
        );
        roots.set(rootID, root);
      }
      return root.current.stateNode.containerInfo;
    },

    // TODO: Replace ReactNoop.render with createRoot + root.render
    createRoot(options?: CreateRootOptions) {
      const container: Container = {
        rootID: '' + idCounter++,
        pendingChildren: [],
        children: [],
      };
      const fiberRoot = NoopRenderer.createContainer(
        // $FlowFixMe[incompatible-call]
        container,
        // $FlowFixMe[incompatible-type]
        ConcurrentRoot,
        null,
        // $FlowFixMe[incompatible-type]
        null,
        false,
        '',
        options && options.onUncaughtError
          ? options.onUncaughtError
          : NoopRenderer.defaultOnUncaughtError,
        options && options.onCaughtError
          ? options.onCaughtError
          : NoopRenderer.defaultOnCaughtError,
        onRecoverableError,
        options && options.onDefaultTransitionIndicator
          ? options.onDefaultTransitionIndicator
          : onDefaultTransitionIndicator,
        options && options.unstable_transitionCallbacks
          ? options.unstable_transitionCallbacks
          : null,
      );
      return {
        _Scheduler: Scheduler,
        render(children: ReactNodeList) {
          NoopRenderer.updateContainer(children, fiberRoot, null, null);
        },
        getChildren() {
          return getChildren(container);
        },
        getChildrenAsJSX() {
          return getChildrenAsJSX(container);
        },
      };
    },

    createLegacyRoot() {
      if (disableLegacyMode) {
        throw new Error('createLegacyRoot: Unsupported Legacy Mode API.');
      }

      const container: Container = {
        rootID: '' + idCounter++,
        pendingChildren: [],
        children: [],
      };
      const fiberRoot = NoopRenderer.createContainer(
        // $FlowFixMe[incompatible-call] -- TODO: Discovered when typechecking noop-renderer
        container,
        LegacyRoot,
        null,
        false,
        null,
        '',
        NoopRenderer.defaultOnUncaughtError,
        NoopRenderer.defaultOnCaughtError,
        onRecoverableError,
        onDefaultTransitionIndicator,
        null,
      );
      return {
        _Scheduler: Scheduler,
        render(children: ReactNodeList) {
          NoopRenderer.updateContainer(children, fiberRoot, null, null);
        },
        getChildren() {
          return getChildren(container);
        },
        getChildrenAsJSX() {
          return getChildrenAsJSX(container);
        },
        legacy: true,
      };
    },

    getChildrenAsJSX(rootID: string = DEFAULT_ROOT_ID) {
      const container = rootContainers.get(rootID);
      return getChildrenAsJSX(container);
    },

    getPendingChildrenAsJSX(rootID: string = DEFAULT_ROOT_ID) {
      const container = rootContainers.get(rootID);
      return getPendingChildrenAsJSX(container);
    },

    getSuspenseyThingStatus(src: string): string | null {
      if (suspenseyThingCache === null) {
        return null;
      } else {
        const record = suspenseyThingCache.get(src);
        // $FlowFixMe[prop-missing]
        return record === undefined ? null : record.status;
      }
    },

    resolveSuspenseyThing(key: string): void {
      if (suspenseyThingCache === null) {
        suspenseyThingCache = new Map();
      }
      const record = suspenseyThingCache.get(key);
      if (record === undefined) {
        const newRecord: SuspenseyThingRecord = {
          status: 'fulfilled',
          subscriptions: null,
        };
        // $FlowFixMe[incompatible-use] still non-nullable
        suspenseyThingCache.set(key, newRecord);
      } else {
        if (record.status === 'pending') {
          record.status = 'fulfilled';
          const subscriptions = record.subscriptions;
          if (subscriptions !== null) {
            record.subscriptions = null;
            for (let i = 0; i < subscriptions.length; i++) {
              const subscription = subscriptions[i];
              subscription.pendingCount--;
              if (subscription.pendingCount === 0) {
                const commit = subscription.commit;
                subscription.commit = null;
                if (commit === null) {
                  throw new Error(
                    'Expected commit to be a function. This is a bug in React.',
                  );
                }
                commit();
              }
            }
          }
        }
      }
    },

    resetSuspenseyThingCache() {
      suspenseyThingCache = null;
    },

    createPortal(
      children: ReactNodeList,
      container: Container,
      key: ?string = null,
    ) {
      return NoopRenderer.createPortal(children, container, null, key);
    },

    // Shortcut for testing a single root
    render(element: React$Element<any>, callback: ?Function): void {
      ReactNoop.renderToRootWithID(element, DEFAULT_ROOT_ID, callback);
    },

    renderLegacySyncRoot(element: React$Element<any>, callback: ?Function) {
      if (disableLegacyMode) {
        throw new Error('createLegacyRoot: Unsupported Legacy Mode API.');
      }
      // $FlowFixMe[incompatible-type]
      const rootID = DEFAULT_ROOT_ID;
      const container = ReactNoop.getOrCreateRootContainer(rootID, LegacyRoot);
      const root = roots.get(container.rootID);
      // $FlowFixMe[incompatible-type]
      NoopRenderer.updateContainer(element, root, null, callback);
    },

    renderToRootWithID(
      element: React$Element<any>,
      rootID: string,
      callback: ?Function,
    ) {
      const container = ReactNoop.getOrCreateRootContainer(
        rootID,
        // $FlowFixMe[incompatible-type]
        ConcurrentRoot,
      );
      const root = roots.get(container.rootID);
      // $FlowFixMe[incompatible-type]
      NoopRenderer.updateContainer(element, root, null, callback);
    },

    unmountRootWithID(rootID: string) {
      const root = roots.get(rootID);
      if (root) {
        NoopRenderer.updateContainer(null, root, null, () => {
          roots.delete(rootID);
          rootContainers.delete(rootID);
        });
      }
    },

    findInstance(
      componentOrElement: Element | ?component(...props: any),
    ): null | Instance | TextInstance {
      if (componentOrElement == null) {
        return null;
      }
      // Unsound duck typing.
      const component = componentOrElement as any;
      if (typeof component.id === 'number') {
        return component;
      }
      if (__DEV__) {
        return NoopRenderer.findHostInstanceWithWarning(
          component,
          'findInstance',
        );
      }
      return NoopRenderer.findHostInstance(component);
    },

    flushNextYield(): Array<mixed> {
      Scheduler.unstable_flushNumberOfYields(1);
      return Scheduler.unstable_clearLog();
    },

    startTrackingHostCounters(): void {
      hostUpdateCounter = 0;
      hostCloneCounter = 0;
    },

    stopTrackingHostCounters():
      | {
          hostUpdateCounter: number,
        }
      | {
          hostCloneCounter: number,
        } {
      const result = useMutation
        ? {
            hostUpdateCounter,
          }
        : {
            hostCloneCounter,
          };
      hostUpdateCounter = 0;
      hostCloneCounter = 0;

      return result;
    },

    expire: Scheduler.unstable_advanceTime,

    flushExpired(): Array<mixed> {
      return Scheduler.unstable_flushExpired();
    },

    unstable_runWithPriority: function runWithPriority<T>(
      priority: EventPriority,
      fn: () => T,
    ): T {
      const previousPriority = getCurrentUpdatePriority();
      try {
        setCurrentUpdatePriority(priority);
        return fn();
      } finally {
        setCurrentUpdatePriority(previousPriority);
      }
    },

    batchedUpdates: NoopRenderer.batchedUpdates,

    deferredUpdates: NoopRenderer.deferredUpdates,

    discreteUpdates: NoopRenderer.discreteUpdates,

    idleUpdates<T>(fn: () => T): void {
      const prevEventPriority = currentEventPriority;
      currentEventPriority = IdleEventPriority;
      try {
        fn();
      } finally {
        currentEventPriority = prevEventPriority;
      }
    },

    flushSync,
    flushPassiveEffects: NoopRenderer.flushPassiveEffects,

    // Logs the current state of the tree.
    dumpTree(rootID: string = DEFAULT_ROOT_ID) {
      const root = roots.get(rootID);
      const rootContainer = rootContainers.get(rootID);
      if (!root || !rootContainer) {
        // eslint-disable-next-line react-internal/no-production-logging
        console.log('Nothing rendered yet.');
        return;
      }

      const bufferedLog: string[] = [];
      function log(...args: string[]) {
        bufferedLog.push(...args, '\n');
      }

      function logHostInstances(
        children: Array<Instance | TextInstance>,
        depth: number,
      ) {
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          const indent = '  '.repeat(depth);
          if (typeof child.text === 'string') {
            log(indent + '- ' + child.text);
          } else {
            // $FlowFixMe[unsafe-addition]
            log(indent + '- ' + child.type + '#' + child.id);

            // $FlowFixMe[incompatible-type]
            logHostInstances(
              // $FlowFixMe[incompatible-type]
              child.children,
              depth + 1,
            );
          }
        }
      }
      function logContainer(container: Container, depth: number) {
        log('  '.repeat(depth) + '- [root#' + container.rootID + ']');
        logHostInstances(container.children, depth + 1);
      }

      function logUpdateQueue(updateQueue: UpdateQueue<mixed>, depth: number) {
        log('  '.repeat(depth + 1) + 'QUEUED UPDATES');
        const first = updateQueue.firstBaseUpdate;
        const update = first;
        if (update !== null) {
          do {
            // $FlowFixMe[unsafe-addition]
            // $FlowFixMe[prop-missing]
            log(
              '  '.repeat(depth + 1) + '~',
              // $FlowFixMe[invalid-compare]
              // $FlowFixMe[prop-missing]
              // $FlowFixMe[unsafe-addition]
              '[' + update.expirationTime + ']',
            );
            // $FlowFixMe[invalid-compare]
          } while (update !== null);
        }

        const lastPending = updateQueue.shared.pending;
        if (lastPending !== null) {
          const firstPending = lastPending.next;
          const pendingUpdate = firstPending;
          if (pendingUpdate !== null) {
            // $FlowFixMe[unsafe-addition]
            // $FlowFixMe[prop-missing]
            do {
              log(
                // $FlowFixMe[invalid-compare]
                '  '.repeat(depth + 1) + '~',
                // $FlowFixMe[prop-missing]
                // $FlowFixMe[unsafe-addition]
                '[' + pendingUpdate.expirationTime + ']',
              );
              // $FlowFixMe[invalid-compare]
            } while (pendingUpdate !== null && pendingUpdate !== firstPending);
          }
        }
      }

      function logFiber(fiber: Fiber, depth: number) {
        log(
          '  '.repeat(depth) +
            '- ' +
            // need to explicitly coerce Symbol to a string
            (fiber.type ? fiber.type.name || fiber.type.toString() : '[root]'),
          // $FlowFixMe[unsafe-addition]
          '[' +
            // $FlowFixMe[prop-missing]
            fiber.childExpirationTime +
            (fiber.pendingProps ? '*' : '') +
            // $FlowFixMe[incompatible-type]
            ']',
        );
        if (fiber.updateQueue) {
          logUpdateQueue(
            // $FlowFixMe[incompatible-type]
            fiber.updateQueue,
            depth,
          );
        }
        // const childInProgress = fiber.progressedChild;
        // if (childInProgress && childInProgress !== fiber.child) {
        //   log(
        //     '  '.repeat(depth + 1) + 'IN PROGRESS: ' + fiber.pendingWorkPriority,
        //   );
        //   logFiber(childInProgress, depth + 1);
        //   if (fiber.child) {
        //     log('  '.repeat(depth + 1) + 'CURRENT');
        //   }
        // } else if (fiber.child && fiber.updateQueue) {
        //   log('  '.repeat(depth + 1) + 'CHILDREN');
        // }
        if (fiber.child) {
          logFiber(fiber.child, depth + 1);
        }
        if (fiber.sibling) {
          logFiber(fiber.sibling, depth);
        }
      }

      log('HOST INSTANCES:');
      logContainer(rootContainer, 0);
      log('FIBERS:');
      logFiber(root.current, 0);

      // eslint-disable-next-line react-internal/no-production-logging
      console.log(...bufferedLog);
    },

    getRoot(rootID: string = DEFAULT_ROOT_ID) {
      return roots.get(rootID);
    },
  };

  return ReactNoop;
}

export default createReactNoop;
