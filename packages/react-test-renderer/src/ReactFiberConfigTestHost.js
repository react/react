/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';
import type {TransitionTypes} from 'react/src/ReactTransitionType';

import isArray from 'shared/isArray';
import {REACT_CONTEXT_TYPE} from 'shared/ReactSymbols';
import {
  DefaultEventPriority,
  NoEventPriority,
  type EventPriority,
} from 'react-reconciler/src/ReactEventPriorities';
import {enableProfilerTimer} from 'shared/ReactFeatureFlags';

export {default as rendererVersion} from 'shared/ReactVersion'; // TODO: Consider exporting the react-native version.
export const rendererPackageName = 'react-test-renderer';
export const extraDevToolsConfig = null;

export type Type = string;
export type Props = Object;
export type Container = {
  children: Array<Instance | TextInstance>,
  createNodeMock: Function,
  tag: 'CONTAINER',
};
export type Instance = {
  type: string,
  props: Object,
  isHidden: boolean,
  children: Array<Instance | TextInstance>,
  internalInstanceHandle: Object,
  rootContainerInstance: Container,
  tag: 'INSTANCE',
};
export type TextInstance = {
  text: string,
  isHidden: boolean,
  tag: 'TEXT',
};
export type HydratableInstance = Instance | TextInstance;
export type PublicInstance = Instance | TextInstance;
export type HostContext = Object;
export type UpdatePayload = Object;
export type ChildSet = void; // Unused
export type TimeoutHandle = TimeoutID;
export type NoTimeout = -1;
export type EventResponder = any;

export type RendererInspectionConfig = $ReadOnly<{}>;
export type TransitionStatus = mixed;

export * from 'react-reconciler/src/ReactFiberConfigWithNoPersistence';
export * from 'react-reconciler/src/ReactFiberConfigWithNoHydration';
export * from 'react-reconciler/src/ReactFiberConfigWithNoTestSelectors';
export * from 'react-reconciler/src/ReactFiberConfigWithNoMicrotasks';
export * from 'react-reconciler/src/ReactFiberConfigWithNoResources';
export * from 'react-reconciler/src/ReactFiberConfigWithNoSingletons';

const NO_CONTEXT = {};
const nodeToInstanceMap = new WeakMap<any, Instance>();

if (__DEV__) {
  Object.freeze(NO_CONTEXT);
}

export function getPublicInstance(inst: Instance | TextInstance): $FlowFixMe {
  switch (inst.tag) {
    case 'INSTANCE':
      const createNodeMock = inst.rootContainerInstance.createNodeMock;
      const mockNode = createNodeMock({
        type: inst.type,
        props: inst.props,
      });
      if (typeof mockNode === 'object' && mockNode !== null) {
        nodeToInstanceMap.set(mockNode, inst);
      }
      return mockNode;
    default:
      return inst;
  }
}

export function appendChild(
  parentInstance: Instance | Container,
  child: Instance | TextInstance,
): void {
  if (__DEV__) {
    if (!isArray(parentInstance.children)) {
      console.error(
        'An invalid container has been provided. ' +
          'This may indicate that another renderer is being used in addition to the test renderer. ' +
          '(For example, ReactDOM.createPortal inside of a ReactTestRenderer tree.) ' +
          'This is not supported.',
      );
    }
  }
  const index = parentInstance.children.indexOf(child);
  if (index !== -1) {
    parentInstance.children.splice(index, 1);
  }
  parentInstance.children.push(child);
}

export function insertBefore(
  parentInstance: Instance | Container,
  child: Instance | TextInstance,
  beforeChild: Instance | TextInstance,
): void {
  const index = parentInstance.children.indexOf(child);
  if (index !== -1) {
    parentInstance.children.splice(index, 1);
  }
  const beforeIndex = parentInstance.children.indexOf(beforeChild);
  parentInstance.children.splice(beforeIndex, 0, child);
}

export function removeChild(
  parentInstance: Instance | Container,
  child: Instance | TextInstance,
): void {
  const index = parentInstance.children.indexOf(child);
  parentInstance.children.splice(index, 1);
}

export function clearContainer(container: Container): void {
  container.children.splice(0);
}

export function getRootHostContext(
  rootContainerInstance: Container,
): HostContext {
  return NO_CONTEXT;
}

export function getChildHostContext(
  parentHostContext: HostContext,
  type: string,
): HostContext {
  return NO_CONTEXT;
}

export function prepareForCommit(containerInfo: Container): null | Object {
  // noop
  return null;
}

export function resetAfterCommit(containerInfo: Container): void {
  // noop
}

export function createInstance(
  type: string,
  props: Props,
  rootContainerInstance: Container,
  hostContext: Object,
  internalInstanceHandle: Object,
): Instance {
  return {
    type,
    props,
    isHidden: false,
    children: [],
    internalInstanceHandle,
    rootContainerInstance,
    tag: 'INSTANCE',
  };
}

export function cloneMutableInstance(
  instance: Instance,
  keepChildren: boolean,
): Instance {
  return {
    type: instance.type,
    props: instance.props,
    isHidden: instance.isHidden,
    children: keepChildren ? instance.children : [],
    internalInstanceHandle: null,
    rootContainerInstance: instance.rootContainerInstance,
    tag: 'INSTANCE',
  };
}

export function appendInitialChild(
  parentInstance: Instance,
  child: Instance | TextInstance,
): void {
  const index = parentInstance.children.indexOf(child);
  if (index !== -1) {
    parentInstance.children.splice(index, 1);
  }
  parentInstance.children.push(child);
}

export function finalizeInitialChildren(
  testElement: Instance,
  type: string,
  props: Props,
  rootContainerInstance: Container,
  hostContext: Object,
): boolean {
  return false;
}

export function shouldSetTextContent(type: string, props: Props): boolean {
  return false;
}

export function createTextInstance(
  text: string,
  rootContainerInstance: Container,
  hostContext: Object,
  internalInstanceHandle: Object,
): TextInstance {
  return {
    text,
    isHidden: false,
    tag: 'TEXT',
  };
}

export function cloneMutableTextInstance(
  textInstance: TextInstance,
): TextInstance {
  return {
    text: textInstance.text,
    isHidden: textInstance.isHidden,
    tag: 'TEXT',
  };
}

let currentUpdatePriority: EventPriority = NoEventPriority;
export function setCurrentUpdatePriority(newPriority: EventPriority): void {
  currentUpdatePriority = newPriority;
}

export function getCurrentUpdatePriority(): EventPriority {
  return currentUpdatePriority;
}

export function resolveUpdatePriority(): EventPriority {
  if (currentUpdatePriority !== NoEventPriority) {
    return currentUpdatePriority;
  }
  return DefaultEventPriority;
}

export function trackSchedulerEvent(): void {}
export function resolveEventType(): null | string {
  return null;
}
export function resolveEventTimeStamp(): number {
  return -1.1;
}
export function shouldAttemptEagerTransition(): boolean {
  return false;
}

export const isPrimaryRenderer = false;
export const warnsIfNotActing = true;

export const scheduleTimeout = setTimeout;
export const cancelTimeout = clearTimeout;

export const noTimeout: -1 = -1;

// -------------------
//     Mutation
// -------------------

export const supportsMutation = true;

export function commitUpdate(
  instance: Instance,
  type: string,
  oldProps: Props,
  newProps: Props,
  internalInstanceHandle: Object,
): void {
  instance.type = type;
  instance.props = newProps;
}

export function commitMount(
  instance: Instance,
  type: string,
  newProps: Props,
  internalInstanceHandle: Object,
): void {
  // noop
}

export function commitTextUpdate(
  textInstance: TextInstance,
  oldText: string,
  newText: string,
): void {
  textInstance.text = newText;
}

export function resetTextContent(testElement: Instance): void {
  // noop
}

export const appendChildToContainer = appendChild;
export const insertInContainerBefore = insertBefore;
export const removeChildFromContainer = removeChild;

export function hideInstance(instance: Instance): void {
  instance.isHidden = true;
}

export function hideTextInstance(textInstance: TextInstance): void {
  textInstance.isHidden = true;
}

export function unhideInstance(instance: Instance, props: Props): void {
  instance.isHidden = false;
}

export function unhideTextInstance(
  textInstance: TextInstance,
  text: string,
): void {
  textInstance.isHidden = false;
}

export function applyViewTransitionName(
  instance: Instance,
  name: string,
  className: ?string,
): void {
  // Noop
}

export function restoreViewTransitionName(
  instance: Instance,
  props: Props,
): void {
  // Noop
}

export function cancelViewTransitionName(
  instance: Instance,
  name: string,
  props: Props,
): void {
  // Noop
}

export function cancelRootViewTransitionName(rootContainer: Container): void {
  // Noop
}

export function restoreRootViewTransitionName(rootContainer: Container): void {
  // Noop
}

export function cloneRootViewTransitionContainer(
  rootContainer: Container,
): Instance {
  return {
    type: 'ROOT',
    props: {},
    isHidden: false,
    children: [],
    internalInstanceHandle: null,
    rootContainerInstance: rootContainer,
    tag: 'INSTANCE',
  };
}

export function removeRootViewTransitionClone(
  rootContainer: Container,
  clone: Instance,
): void {
  // Noop since it was never inserted anywhere.
}

export type InstanceMeasurement = null;

export function measureInstance(instance: Instance): InstanceMeasurement {
  return null;
}

export function measureClonedInstance(instance: Instance): InstanceMeasurement {
  return null;
}

export function wasInstanceInViewport(
  measurement: InstanceMeasurement,
): boolean {
  return true;
}

export function hasInstanceChanged(
  oldMeasurement: InstanceMeasurement,
  newMeasurement: InstanceMeasurement,
): boolean {
  return false;
}

export function hasInstanceAffectedParent(
  oldMeasurement: InstanceMeasurement,
  newMeasurement: InstanceMeasurement,
): boolean {
  return false;
}

export function startViewTransition(
  suspendedState: null | SuspendedState,
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
}

export type RunningViewTransition = null;

export function startGestureTransition(
  suspendedState: null | SuspendedState,
  rootContainer: Container,
  timeline: GestureTimeline,
  rangeStart: number,
  rangeEnd: number,
  transitionTypes: null | TransitionTypes,
  mutationCallback: () => void,
  animateCallback: () => void,
  errorCallback: mixed => void,
  finishedAnimation: () => void, // Profiling-only
): null | RunningViewTransition {
  mutationCallback();
  animateCallback();
  if (enableProfilerTimer) {
    finishedAnimation();
  }
  return null;
}

export function stopViewTransition(transition: RunningViewTransition) {}

export function addViewTransitionFinishedListener(
  transition: RunningViewTransition,
  callback: () => void,
) {
  callback();
}

export type ViewTransitionInstance = null | {name: string, ...};

export function createViewTransitionInstance(
  name: string,
): ViewTransitionInstance {
  return null;
}

export type FragmentInstanceType = null;

export function createFragmentInstance(
  fragmentFiber: Object,
): FragmentInstanceType {
  return null;
}

export function updateFragmentInstanceFiber(
  fragmentFiber: Object,
  instance: FragmentInstanceType,
): void {
  // Noop
}

export function commitNewChildToFragmentInstance(
  child: Instance,
  fragmentInstance: FragmentInstanceType,
): void {
  // noop
}

export function deleteChildFromFragmentInstance(
  child: Instance,
  fragmentInstance: FragmentInstanceType,
): void {
  // Noop
}

export function getInstanceFromNode(mockNode: Object): Object | null {
  const instance = nodeToInstanceMap.get(mockNode);
  if (instance !== undefined) {
    return instance.internalInstanceHandle;
  }
  return null;
}

export type GestureTimeline = null;

export function getCurrentGestureOffset(provider: GestureTimeline): number {
  return 0;
}

export function beforeActiveInstanceBlur(internalInstanceHandle: Object) {
  // noop
}

export function afterActiveInstanceBlur() {
  // noop
}

export function preparePortalMount(portalInstance: Instance): void {
  // noop
}

export function prepareScopeUpdate(scopeInstance: Object, inst: Object): void {
  nodeToInstanceMap.set(scopeInstance, inst);
}

export function getInstanceFromScope(scopeInstance: Object): null | Object {
  return nodeToInstanceMap.get(scopeInstance) || null;
}

export function detachDeletedInstance(node: Instance): void {
  // noop
}

export function logRecoverableError(error: mixed): void {
  // noop
}

export function requestPostPaintCallback(callback: (time: number) => void) {
  // noop
}

export function maySuspendCommit(type: Type, props: Props): boolean {
  return false;
}

export function maySuspendCommitOnUpdate(
  type: Type,
  oldProps: Props,
  newProps: Props,
): boolean {
  return false;
}

export function maySuspendCommitInSyncRender(
  type: Type,
  props: Props,
): boolean {
  return false;
}

export function preloadInstance(
  instance: Instance,
  type: Type,
  props: Props,
): boolean {
  // Return true to indicate it's already loaded
  return true;
}

export opaque type SuspendedState = null;

export function startSuspendingCommit(): SuspendedState {
  return null;
}

export function suspendInstance(
  state: SuspendedState,
  instance: Instance,
  type: Type,
  props: Props,
): void {}

export function suspendOnActiveViewTransition(
  state: SuspendedState,
  container: Container,
): void {}

export function waitForCommitToBeReady(
  state: SuspendedState,
  timeoutOffset: number,
): null {
  return null;
}

export function getSuspendedCommitReason(
  state: SuspendedState,
  rootContainer: Container,
): null | string {
  return null;
}

export const NotPendingTransition: TransitionStatus = null;
export const HostTransitionContext: ReactContext<TransitionStatus> = {
  $$typeof: REACT_CONTEXT_TYPE,
  Provider: null as any,
  Consumer: null as any,
  _currentValue: NotPendingTransition,
  _currentValue2: NotPendingTransition,
  _threadCount: 0,
};

export type FormInstance = Instance;
export function resetFormInstance(form: Instance): void {}
