/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let React;
let act;
let ReactFiberReconciler;
let ConcurrentRoot;
let DefaultEventPriority;
let NoEventPriority;

describe('ReactFiberHostContext', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    act = React.act;
    ReactFiberReconciler = require('react-reconciler');
    ConcurrentRoot =
      require('react-reconciler/src/ReactRootTags').ConcurrentRoot;
    DefaultEventPriority =
      require('react-reconciler/src/ReactEventPriorities').DefaultEventPriority;
    NoEventPriority =
      require('react-reconciler/src/ReactEventPriorities').NoEventPriority;
  });

  global.IS_REACT_ACT_ENVIRONMENT = true;

  // @gate __DEV__
  it('should send the context to prepareForCommit and resetAfterCommit', () => {
    const rootContext = {};
    const childContext = {};
    let updatePriority: typeof DefaultEventPriority = NoEventPriority;
    const Renderer = ReactFiberReconciler({
      prepareForCommit: function (hostContext) {
        expect(hostContext).toBe(rootContext);
        return null;
      },
      resetAfterCommit: function (hostContext) {
        expect(hostContext).toBe(rootContext);
      },
      getRootHostContext: function () {
        return rootContext;
      },
      getChildHostContext: function () {
        return childContext;
      },
      shouldSetTextContent: function () {
        return false;
      },
      createInstance: function () {
        return null;
      },
      finalizeInitialChildren: function () {
        return null;
      },
      appendInitialChild: function () {
        return null;
      },
      now: function () {
        return 0;
      },
      appendChildToContainer: function () {
        return null;
      },
      clearContainer: function () {},
      setCurrentUpdatePriority: function (newPriority: any) {
        updatePriority = newPriority;
      },
      getCurrentUpdatePriority: function () {
        return updatePriority;
      },
      resolveUpdatePriority: function () {
        if (updatePriority !== NoEventPriority) {
          return updatePriority;
        }
        return DefaultEventPriority;
      },
      trackSchedulerEvent: function () {},
      resolveEventType: function () {
        return null;
      },
      resolveEventTimeStamp: function () {
        return -1.1;
      },
      shouldAttemptEagerTransition() {
        return false;
      },
      requestPostPaintCallback: function () {},
      maySuspendCommit(type, props) {
        return false;
      },
      maySuspendCommitOnUpdate(type, oldProps, newProps) {
        return false;
      },
      maySuspendCommitInSyncRender(type, props) {
        return false;
      },
      preloadInstance(instance, type, props) {
        return true;
      },
      startSuspendingCommit() {
        return null;
      },
      suspendInstance(state, instance, type, props) {},
      suspendOnActiveViewTransition(state, container) {},
      waitForCommitToBeReady(state, timeoutOffset) {
        return null;
      },
      getSuspendedCommitReason(state, rootContainer) {
        return null;
      },
      supportsMutation: true,
    });

    const container = Renderer.createContainer(
      rootContext,
      ConcurrentRoot,
      null,
      false,
      null,
      '',
      () => {},
      () => {},
      () => {},
      null,
    );
    act(() => {
      Renderer.updateContainer(
        <a>
          <b />
        </a>,
        container,
        /* parentComponent: */ null,
        /* callback: */ null,
      );
    });
  });
});
