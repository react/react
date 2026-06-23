/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// libdefs cannot actually import. These are supposed to be the types imported
// from 'react-native-renderer/src/ReactNativeTypes'
type __MeasureOnSuccessCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
  pageX: number,
  pageY: number,
) => void;
type __MeasureInWindowOnSuccessCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
) => void;
type __MeasureLayoutOnSuccessCallback = (
  left: number,
  top: number,
  width: number,
  height: number,
) => void;
type __ReactNativeBaseComponentViewConfig = any;
type __ViewConfigGetter = any;
type __ViewConfig = any;
type __AttributeConfiguration = any;

// libdefs cannot actually import. This is supposed to be the type imported
// from 'react-native-renderer/src/legacy-events/TopLevelEventTypes';
type __RNTopLevelEventType = any;

// libdefs cannot actually import. This is supposed to be the type imported
// from 'react-reconciler/src/ReactCapturedValue'
type __CapturedError = any;

type RawEventEmitterEvent = $ReadOnly<{
  eventName: string,
  // We expect, but do not/cannot require, that nativeEvent is an object
  // with the properties: key, elementType (string), type (string), tag (numeric),
  // and a stateNode of the native element/Fiber the event was emitted to.
  nativeEvent: {[string]: mixed, ...},
}>;

declare opaque type __PublicInstance;
declare opaque type __PublicTextInstance;
declare opaque type __PublicRootInstance;

declare module 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface' {
  declare export function deepFreezeAndThrowOnMutationInDev<T>(obj: T): T;
  declare export const ReactFiberErrorDialog: {
    showErrorDialog: (error: __CapturedError) => boolean,
    ...
  };
  declare export const ReactNativeViewConfigRegistry: {
    customBubblingEventTypes: Object,
    customDirectEventTypes: Object,

    register: (name: string, callback: __ViewConfigGetter) => string,
    get: (name: string) => __ReactNativeBaseComponentViewConfig,
    ...
  };
  declare export const RawEventEmitter: {
    emit: (channel: string, event: RawEventEmitterEvent) => string,
    ...
  };
  declare export type PublicInstance = __PublicInstance;
  declare export type PublicTextInstance = __PublicTextInstance;
  declare export type PublicRootInstance = __PublicRootInstance;
  declare export type MeasureOnSuccessCallback = __MeasureOnSuccessCallback;
  declare export type MeasureInWindowOnSuccessCallback =
    __MeasureInWindowOnSuccessCallback;
  declare export type MeasureLayoutOnSuccessCallback =
    __MeasureLayoutOnSuccessCallback;
  declare export function getNodeFromPublicInstance(
    publicInstance: PublicInstance,
  ): Object;
  declare export function getNativeTagFromPublicInstance(
    publicInstance: PublicInstance,
  ): number;
  declare export function createPublicInstance(
    tag: number,
    viewConfig: __ViewConfig,
    internalInstanceHandle: mixed,
    publicRootInstance: PublicRootInstance | null,
  ): PublicInstance;
  declare export function createPublicRootInstance(
    rootTag: number,
  ): PublicRootInstance;
  declare export function createPublicTextInstance(
    internalInstanceHandle: mixed,
  ): PublicTextInstance;
  declare export function getInternalInstanceHandleFromPublicInstance(
    publicInstance: PublicInstance,
  ): ?Object;
  declare export function dispatchNativeEvent(
    target: EventTarget,
    type: string,
    eventData: {[string]: mixed},
  ): void;
  declare export function createAttributePayload(
    props: Object,
    validAttributes: __AttributeConfiguration,
  ): null | Object;
  declare export function diffAttributePayloads(
    prevProps: Object,
    nextProps: Object,
    validAttributes: __AttributeConfiguration,
  ): null | Object;
}

declare module 'react-native/Libraries/ReactPrivate/ReactNativePrivateInitializeCore' {
}

declare module 'react-native' {
  declare export type HostInstance = __PublicInstance;
  declare export type PublicTextInstance = __PublicTextInstance;
  declare export type PublicRootInstance = __PublicRootInstance;
  declare export type MeasureOnSuccessCallback = __MeasureOnSuccessCallback;
}

// eslint-disable-next-line no-unused-vars
declare const RN$enableMicrotasksInReact: boolean;

// eslint-disable-next-line no-unused-vars
declare const RN$isNativeEventTargetEventDispatchingEnabled:
  | (() => boolean)
  | void;

// This is needed for a short term solution.
// See https://github.com/facebook/react/pull/15490 for more info
// eslint-disable-next-line no-unused-vars
declare const nativeFabricUIManager: {
  createNode: (
    reactTag: number,
    viewName: string,
    rootTag: number,
    props: ?Object,
    eventTarget: Object,
  ) => Object,
  cloneNode: (node: Object) => Object,
  cloneNodeWithNewChildren: (
    node: Object,
    children?: $ReadOnlyArray<Object>,
  ) => Object,
  cloneNodeWithNewProps: (node: Object, newProps: ?Object) => Object,
  cloneNodeWithNewChildrenAndProps: (
    node: Object,
    newPropsOrChildren: ?Object | $ReadOnlyArray<Object>,
    newProps?: ?Object,
  ) => Object,
  appendChild: (node: Object, childNode: Object) => void,

  createChildSet: () => Object,
  appendChildToSet: (childSet: Object, childNode: Object) => void,
  completeRoot: (rootTag: number, childSet: Object) => void,
  registerEventHandler: (
    callback: (
      eventTarget: null | Object,
      type: __RNTopLevelEventType,
      payload: Object,
    ) => void,
  ) => void,
  setNativeProps: (node: Object, nativeProps: Object) => Object,
  dispatchCommand: (node: Object, command: string, args: Array<any>) => void,
  sendAccessibilityEvent: (node: Object, eventTypeName: string) => void,

  measure: (node: Object, callback: __MeasureOnSuccessCallback) => void,
  measureInWindow: (
    node: Object,
    callback: __MeasureInWindowOnSuccessCallback,
  ) => void,
  measureLayout: (
    node: Object,
    relativeNode: Object,
    onFail: () => void,
    onSuccess: __MeasureLayoutOnSuccessCallback,
  ) => void,
  getBoundingClientRect: (
    node: Object,
  ) => [
    /* x:*/ number,
    /* y:*/ number,
    /* width:*/ number,
    /* height:*/ number,
  ],
  findNodeAtPoint: (
    node: Object,
    locationX: number,
    locationY: number,
    callback: (Object) => void,
  ) => void,
  setIsJSResponder: (
    node: Object,
    isJsResponder: boolean,
    blockNativeResponder: boolean,
  ) => void,
  unstable_DefaultEventPriority: number,
  unstable_DiscreteEventPriority: number,
  unstable_ContinuousEventPriority: number,
  unstable_IdleEventPriority: number,
  unstable_getCurrentEventPriority: () => number,
  applyViewTransitionName: (
    node: Object,
    name: string,
    className: ?string,
  ) => void,
  createViewTransitionInstance: (name: string, tag: number) => void,
  startViewTransition: (mutationCallback: () => void) => {
    finished: Promise<void>,
    ready: Promise<void>,
  },
  startViewTransitionReadyFinished: () => void,
  suspendOnActiveViewTransition: () => void,
  ...
};
