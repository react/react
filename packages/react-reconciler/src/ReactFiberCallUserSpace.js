/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';
import type {LazyComponent} from 'react/src/ReactLazy';
import type {Effect} from './ReactFiberHooks';
import type {CapturedValue} from './ReactCapturedValue';

import {isRendering, setIsRendering} from './ReactCurrentFiber';
import {captureCommitPhaseError} from './ReactFiberWorkLoop';

// These indirections exists so we can exclude its stack frame in DEV (and anything below it).
// TODO: Consider marking the whole bundle instead of these boundaries.

const callComponent = {
  react_stack_bottom_frame: function <Props, Arg, R>(
    Component: (p: Props, arg: Arg) => R,
    props: Props,
    secondArg: Arg,
  ): R {
    const wasRendering = isRendering;
    setIsRendering(true);
    try {
      const result = Component(props, secondArg);
      return result;
    } finally {
      setIsRendering(wasRendering);
    }
  },
};

export const callComponentInDEV: <Props, Arg, R>(
  Component: (p: Props, arg: Arg) => R,
  props: Props,
  secondArg: Arg,
) => R = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callComponent.react_stack_bottom_frame.bind(callComponent) as any)
  : (null as any);

interface ClassInstance<R> {
  render(): R;
  componentDidMount(): void;
  componentDidUpdate(
    prevProps: Object,
    prevState: Object,
    snaphot: Object,
  ): void;
  componentDidCatch(error: mixed, errorInfo: {componentStack: string}): void;
  componentWillUnmount(): void;
}

const callRender = {
  react_stack_bottom_frame: function <R>(instance: ClassInstance<R>): R {
    const wasRendering = isRendering;
    setIsRendering(true);
    try {
      const result = instance.render();
      return result;
    } finally {
      setIsRendering(wasRendering);
    }
  },
};

export const callRenderInDEV: <R>(instance: ClassInstance<R>) => R => R =
  __DEV__
    ? // We use this technique to trick minifiers to preserve the function name.
      (callRender.react_stack_bottom_frame.bind(callRender) as any)
    : (null as any);

const callComponentDidMount = {
  react_stack_bottom_frame: function (
    finishedWork: Fiber,
    instance: ClassInstance<any>,
  ): void {
    try {
      instance.componentDidMount();
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  },
};

export const callComponentDidMountInDEV: (
  finishedWork: Fiber,
  instance: ClassInstance<any>,
) => void = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callComponentDidMount.react_stack_bottom_frame.bind(
      callComponentDidMount,
    ) as any)
  : (null as any);

const callComponentDidUpdate = {
  react_stack_bottom_frame: function (
    finishedWork: Fiber,
    instance: ClassInstance<any>,
    prevProps: Object,
    prevState: Object,
    snapshot: Object,
  ): void {
    try {
      instance.componentDidUpdate(prevProps, prevState, snapshot);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  },
};

export const callComponentDidUpdateInDEV: (
  finishedWork: Fiber,
  instance: ClassInstance<any>,
  prevProps: Object,
  prevState: Object,
  snaphot: Object,
) => void = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callComponentDidUpdate.react_stack_bottom_frame.bind(
      callComponentDidUpdate,
    ) as any)
  : (null as any);

const callComponentDidCatch = {
  react_stack_bottom_frame: function (
    instance: ClassInstance<any>,
    errorInfo: CapturedValue<mixed>,
  ): void {
    const error = errorInfo.value;
    const stack = errorInfo.stack;
    instance.componentDidCatch(error, {
      componentStack: stack !== null ? stack : '',
    });
  },
};

export const callComponentDidCatchInDEV: (
  instance: ClassInstance<any>,
  errorInfo: CapturedValue<mixed>,
) => void = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callComponentDidCatch.react_stack_bottom_frame.bind(
      callComponentDidCatch,
    ) as any)
  : (null as any);

const callComponentWillUnmount = {
  react_stack_bottom_frame: function (
    current: Fiber,
    nearestMountedAncestor: Fiber | null,
    instance: ClassInstance<any>,
  ): void {
    try {
      instance.componentWillUnmount();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  },
};

export const callComponentWillUnmountInDEV: (
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
  instance: ClassInstance<any>,
) => void = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callComponentWillUnmount.react_stack_bottom_frame.bind(
      callComponentWillUnmount,
    ) as any)
  : (null as any);

const callCreate = {
  react_stack_bottom_frame: function (
    effect: Effect,
  ): (() => void) | {...} | void | null {
    const create = effect.create;
    const inst = effect.inst;
    const destroy = create();
    inst.destroy = destroy;
    return destroy;
  },
};

export const callCreateInDEV: (effect: Effect) => (() => void) | void = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callCreate.react_stack_bottom_frame.bind(callCreate) as any)
  : (null as any);

const callDestroy = {
  react_stack_bottom_frame: function (
    current: Fiber,
    nearestMountedAncestor: Fiber | null,
    destroy: () => void,
  ): void {
    try {
      destroy();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  },
};

export const callDestroyInDEV: (
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
  destroy: (() => void) | (({...}) => void),
) => void = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callDestroy.react_stack_bottom_frame.bind(callDestroy) as any)
  : (null as any);

const callLazyInit = {
  react_stack_bottom_frame: function (lazy: LazyComponent<any, any>): any {
    const payload = lazy._payload;
    const init = lazy._init;
    return init(payload);
  },
};

export const callLazyInitInDEV: (lazy: LazyComponent<any, any>) => any = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callLazyInit.react_stack_bottom_frame.bind(callLazyInit) as any)
  : (null as any);
