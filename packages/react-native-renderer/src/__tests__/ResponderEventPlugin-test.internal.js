/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// This test is a hot mess. It heavily uses internals and relies on DOM even
// though the responder plugin is only used in React Native. Sadness ensues.
// The coverage is valuable though, so we will keep it for now.
const {HostComponent} = require('react-reconciler/src/ReactWorkTags');

let EventBatching;
let EventPluginUtils;
let ResponderEventPlugin;

const touch = function (nodeHandle, i) {
  return {target: nodeHandle, identifier: i};
};

function injectComponentTree(ComponentTree) {
  EventPluginUtils.setComponentTree(
    ComponentTree.getFiberCurrentPropsFromNode,
    ComponentTree.getInstanceFromNode,
    ComponentTree.getNodeFromInstance,
  );
}

/**
 * @param {NodeHandle} nodeHandle @see NodeHandle. Handle of target.
 * @param {Array<Touch>} touches All active touches.
 * @param {Array<Touch>} changedTouches Only the touches that have changed.
 * @return {TouchEvent} Model of a touch event that is compliant with responder
 * system plugin.
 */
const touchEvent = function (nodeHandle, touches, changedTouches) {
  return {
    target: nodeHandle,
    changedTouches: changedTouches,
    touches: touches,
  };
};

const subsequence = function (arr, indices) {
  const ret = [];
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    ret.push(arr[index]);
  }
  return ret;
};

const antiSubsequence = function (arr, indices) {
  const ret = [];
  for (let i = 0; i < arr.length; i++) {
    if (indices.indexOf(i) === -1) {
      ret.push(arr[i]);
    }
  }
  return ret;
};

/**
 * Helper for creating touch test config data.
 * @param allTouchHandles
 */
const _touchConfig = function (
  topType,
  targetNodeHandle,
  allTouchHandles,
  changedIndices,
  eventTarget,
) {
  const allTouchObjects = allTouchHandles.map(touch);
  const changedTouchObjects = subsequence(allTouchObjects, changedIndices);
  const activeTouchObjects =
    topType === 'topTouchStart'
      ? allTouchObjects
      : topType === 'topTouchMove'
        ? allTouchObjects
        : topType === 'topTouchEnd'
          ? antiSubsequence(allTouchObjects, changedIndices)
          : topType === 'topTouchCancel'
            ? antiSubsequence(allTouchObjects, changedIndices)
            : null;

  return {
    nativeEvent: touchEvent(
      targetNodeHandle,
      activeTouchObjects,
      changedTouchObjects,
    ),
    topLevelType: topType,
    targetInst: getInstanceFromNode(targetNodeHandle),
  };
};

/**
 * Creates test data for touch events using environment agnostic "node
 * handles".
 *
 * @param {NodeHandle} nodeHandle Environment agnostic handle to DOM node.
 * @param {Array<NodeHandle>} allTouchHandles Encoding of all "touches" in the
 * form of a mapping from integer (touch `identifier`) to touch target. This is
 * encoded in array form. Because of this, it is possible for two separate
 * touches (meaning two separate indices) to have the same touch target ID -
 * this corresponds to real world cases where two separate unique touches have
 * the same target. These touches don't just represent all active touches,
 * rather it also includes any touches that are not active, but are in the
 * process of being removed.
 * @param {Array<NodeHandle>} changedIndices Indices of `allTouchHandles` that
 * have changed.
 * @return {object} Config data used by test cases for extracting responder
 * events.
 */
const startConfig = function (nodeHandle, allTouchHandles, changedIndices) {
  return _touchConfig(
    'topTouchStart',
    nodeHandle,
    allTouchHandles,
    changedIndices,
    nodeHandle,
  );
};

/**
 * @see `startConfig`
 */
const moveConfig = function (nodeHandle, allTouchHandles, changedIndices) {
  return _touchConfig(
    'topTouchMove',
    nodeHandle,
    allTouchHandles,
    changedIndices,
    nodeHandle,
  );
};

/**
 * @see `startConfig`
 */
const endConfig = function (nodeHandle, allTouchHandles, changedIndices) {
  return _touchConfig(
    'topTouchEnd',
    nodeHandle,
    allTouchHandles,
    changedIndices,
    nodeHandle,
  );
};

/**
 * Test config for events that aren't negotiation related, but rather result of
 * a negotiation.
 *
 * Returns object of the form:
 *
 *     {
 *       responderReject: {
 *         // Whatever "readableIDToID" was passed in.
 *         grandParent: {order: NA, assertEvent: null, returnVal: blah},
 *         ...
 *         child: {order: NA, assertEvent: null, returnVal: blah},
 *       }
 *       responderGrant: {
 *         grandParent: {order: NA, assertEvent: null, returnVal: blah},
 *         ...
 *         child: {order: NA, assertEvent: null, returnVal: blah}
 *       }
 *       ...
 *     }
 *
 * After this is created, a test case would configure specific event orderings
 * and optional assertions. Anything left with an `order` of `NA` will be
 * required to never be invoked (the test runner will make sure it throws if
 * ever invoked).
 *
 */
const NA = -1;
const oneEventLoopTestConfig = function (readableIDToID) {
  const ret = {
    // Negotiation
    scrollShouldSetResponder: {bubbled: {}, captured: {}},
    startShouldSetResponder: {bubbled: {}, captured: {}},
    moveShouldSetResponder: {bubbled: {}, captured: {}},
    responderTerminationRequest: {},

    // Non-negotiation
    responderReject: {}, // These do not bubble capture.
    responderGrant: {},
    responderStart: {},
    responderMove: {},
    responderTerminate: {},
    responderEnd: {},
    responderRelease: {},
  };
  for (const eventName in ret) {
    for (const readableNodeName in readableIDToID) {
      if (ret[eventName].bubbled) {
        // Two phase
        ret[eventName].bubbled[readableNodeName] = {
          order: NA,
          assertEvent: null,
          returnVal: undefined,
        };
        ret[eventName].captured[readableNodeName] = {
          order: NA,
          assertEvent: null,
          returnVal: undefined,
        };
      } else {
        ret[eventName][readableNodeName] = {
          order: NA,
          assertEvent: null,
          returnVal: undefined,
        };
      }
    }
  }
  return ret;
};

/**
 * @param {object} eventTestConfig
 * @param {object} readableIDToID
 */
const registerTestHandlers = function (eventTestConfig, readableIDToID) {
  const runs = {dispatchCount: 0};
  const neverFire = function (readableID, registrationName) {
    runs.dispatchCount++;
    expect('').toBe(
      'Event type: ' +
        registrationName +
        '\nShould never occur on:' +
        readableID +
        '\nFor event test config:\n' +
        JSON.stringify(eventTestConfig) +
        '\n',
    );
  };

  const registerOneEventType = function (
    registrationName,
    eventTypeTestConfig,
  ) {
    for (const readableID in eventTypeTestConfig) {
      const nodeConfig = eventTypeTestConfig[readableID];
      const id = readableIDToID[readableID];
      const handler =
        nodeConfig.order === NA
          ? neverFire.bind(null, readableID, registrationName)
          : // We partially apply readableID and nodeConfig, as they change in the
            // parent closure across iterations.
            function (rID, config, e) {
              expect(
                rID +
                  '->' +
                  registrationName +
                  ' index:' +
                  runs.dispatchCount++,
              ).toBe(rID + '->' + registrationName + ' index:' + config.order);
              if (config.assertEvent) {
                config.assertEvent(e);
              }
              return config.returnVal;
            }.bind(null, readableID, nodeConfig);
      putListener(getInstanceFromNode(id), registrationName, handler);
    }
  };
  for (const eventName in eventTestConfig) {
    const oneEventTypeTestConfig = eventTestConfig[eventName];
    const hasTwoPhase = !!oneEventTypeTestConfig.bubbled;
    if (hasTwoPhase) {
      registerOneEventType(
        ResponderEventPlugin.eventTypes[eventName].phasedRegistrationNames
          .bubbled,
        oneEventTypeTestConfig.bubbled,
      );
      registerOneEventType(
        ResponderEventPlugin.eventTypes[eventName].phasedRegistrationNames
          .captured,
        oneEventTypeTestConfig.captured,
      );
    } else {
      registerOneEventType(
        ResponderEventPlugin.eventTypes[eventName].registrationName,
        oneEventTypeTestConfig,
      );
    }
  }
  return runs;
};

const run = function (config, hierarchyConfig, nativeEventConfig) {
  let max = NA;
  const searchForMax = function (nodeConfig) {
    for (const readableID in nodeConfig) {
      const order = nodeConfig[readableID].order;
      max = order > max ? order : max;
    }
  };
  for (const eventName in config) {
    const eventConfig = config[eventName];
    if (eventConfig.bubbled) {
      searchForMax(eventConfig.bubbled);
      searchForMax(eventConfig.captured);
    } else {
      searchForMax(eventConfig);
    }
  }

  // Register the handlers
  const runData = registerTestHandlers(config, hierarchyConfig);

  // Trigger the event
  const extractedEvents = ResponderEventPlugin.extractEvents(
    nativeEventConfig.topLevelType,
    nativeEventConfig.targetInst,
    nativeEventConfig.nativeEvent,
    nativeEventConfig.target,
    0,
  );

  // At this point the negotiation events have been dispatched as part of the
  // extraction process, but not the side effectful events. Below, we dispatch
  // side effectful events.
  EventBatching.runEventsInBatch(extractedEvents);

  // Ensure that every event that declared an `order`, was actually dispatched.
  expect('number of events dispatched:' + runData.dispatchCount).toBe(
    'number of events dispatched:' + (max + 1),
  ); // +1 for extra ++
};

const GRANDPARENT_HOST_NODE = {};
const PARENT_HOST_NODE = {};
const CHILD_HOST_NODE = {};
const CHILD_HOST_NODE2 = {};

// These intentionally look like Fibers. ReactTreeTraversal depends on their field names.
// TODO: we could test this with regular DOM nodes (and real fibers) instead.
const GRANDPARENT_INST = {
  return: null,
  tag: HostComponent,
  stateNode: GRANDPARENT_HOST_NODE,
  memoizedProps: {},
};
const PARENT_INST = {
  return: GRANDPARENT_INST,
  tag: HostComponent,
  stateNode: PARENT_HOST_NODE,
  memoizedProps: {},
};
const CHILD_INST = {
  return: PARENT_INST,
  tag: HostComponent,
  stateNode: CHILD_HOST_NODE,
  memoizedProps: {},
};
const CHILD_INST2 = {
  return: PARENT_INST,
  tag: HostComponent,
  stateNode: CHILD_HOST_NODE2,
  memoizedProps: {},
};

GRANDPARENT_HOST_NODE.testInstance = GRANDPARENT_INST;
PARENT_HOST_NODE.testInstance = PARENT_INST;
CHILD_HOST_NODE.testInstance = CHILD_INST;
CHILD_HOST_NODE2.testInstance = CHILD_INST2;

const three = {
  grandParent: GRANDPARENT_HOST_NODE,
  parent: PARENT_HOST_NODE,
  child: CHILD_HOST_NODE,
};

const siblings = {
  parent: PARENT_HOST_NODE,
  childOne: CHILD_HOST_NODE,
  childTwo: CHILD_HOST_NODE2,
};

function getInstanceFromNode(node) {
  return node.testInstance;
}

function getNodeFromInstance(inst) {
  return inst.stateNode;
}

function getFiberCurrentPropsFromNode(node) {
  return node.testInstance.memoizedProps;
}

function putListener(instance, registrationName, handler) {
  instance.memoizedProps[registrationName] = handler;
}

function deleteAllListeners(instance) {
  instance.memoizedProps = {};
}

describe('ResponderEventPlugin', () => {
  beforeEach(() => {
    jest.resetModules();

    EventBatching = require('react-native-renderer/src/legacy-events/EventBatching');
    EventPluginUtils = require('react-native-renderer/src/legacy-events/EventPluginUtils');
    ResponderEventPlugin =
      require('react-native-renderer/src/legacy-events/ResponderEventPlugin').default;

    deleteAllListeners(GRANDPARENT_INST);
    deleteAllListeners(PARENT_INST);
    deleteAllListeners(CHILD_INST);
    deleteAllListeners(CHILD_INST2);

    injectComponentTree({
      getInstanceFromNode,
      getNodeFromInstance,
      getFiberCurrentPropsFromNode,
    });
  });

  it('should do nothing when no one wants to respond', () => {
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.child = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.child = {order: 3, returnVal: false};
    config.startShouldSetResponder.bubbled.parent = {
      order: 4,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.grandParent = {
      order: 5,
      returnVal: false,
    };
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);

    // Now no handlers should be called on `touchEnd`.
    config = oneEventLoopTestConfig(three);
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  /**
   * Simple Start Granting
   * --------------------
   */

  it('should grant responder grandParent while capturing', () => {
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: true,
    };
    config.responderGrant.grandParent = {order: 1};
    config.responderStart.grandParent = {order: 2};
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.grandParent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.grandParent = {order: 0};
    config.responderRelease.grandParent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder parent while capturing', () => {
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: true,
    };
    config.responderGrant.parent = {order: 2};
    config.responderStart.parent = {order: 3};
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.parent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.parent = {order: 0};
    config.responderRelease.parent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder child while capturing', () => {
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.child = {order: 2, returnVal: true};
    config.responderGrant.child = {order: 3};
    config.responderStart.child = {order: 4};
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.child = {order: 0};
    config.responderRelease.child = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder child while bubbling', () => {
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.child = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.child = {order: 3, returnVal: true};
    config.responderGrant.child = {order: 4};
    config.responderStart.child = {order: 5};
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.child = {order: 0};
    config.responderRelease.child = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder parent while bubbling', () => {
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.child = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.child = {order: 3, returnVal: false};
    config.startShouldSetResponder.bubbled.parent = {order: 4, returnVal: true};
    config.responderGrant.parent = {order: 5};
    config.responderStart.parent = {order: 6};
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.parent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.parent = {order: 0};
    config.responderRelease.parent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder grandParent while bubbling', () => {
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.child = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.child = {order: 3, returnVal: false};
    config.startShouldSetResponder.bubbled.parent = {
      order: 4,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.grandParent = {
      order: 5,
      returnVal: true,
    };
    config.responderGrant.grandParent = {order: 6};
    config.responderStart.grandParent = {order: 7};
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.grandParent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.grandParent = {order: 0};
    config.responderRelease.grandParent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  /**
   * Simple Move Granting
   * --------------------
   */

  it('should grant responder grandParent while capturing move', () => {
    let config = oneEventLoopTestConfig(three);

    config.startShouldSetResponder.captured.grandParent = {order: 0};
    config.startShouldSetResponder.captured.parent = {order: 1};
    config.startShouldSetResponder.captured.child = {order: 2};
    config.startShouldSetResponder.bubbled.child = {order: 3};
    config.startShouldSetResponder.bubbled.parent = {order: 4};
    config.startShouldSetResponder.bubbled.grandParent = {order: 5};
    run(config, three, startConfig(three.child, [three.child], [0]));

    config = oneEventLoopTestConfig(three);
    config.moveShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: true,
    };
    config.responderGrant.grandParent = {order: 1};
    config.responderMove.grandParent = {order: 2};
    run(config, three, moveConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.grandParent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.grandParent = {order: 0};
    config.responderRelease.grandParent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder parent while capturing move', () => {
    let config = oneEventLoopTestConfig(three);

    config.startShouldSetResponder.captured.grandParent = {order: 0};
    config.startShouldSetResponder.captured.parent = {order: 1};
    config.startShouldSetResponder.captured.child = {order: 2};
    config.startShouldSetResponder.bubbled.child = {order: 3};
    config.startShouldSetResponder.bubbled.parent = {order: 4};
    config.startShouldSetResponder.bubbled.grandParent = {order: 5};
    run(config, three, startConfig(three.child, [three.child], [0]));

    config = oneEventLoopTestConfig(three);
    config.moveShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.parent = {order: 1, returnVal: true};
    config.responderGrant.parent = {order: 2};
    config.responderMove.parent = {order: 3};
    run(config, three, moveConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.parent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.parent = {order: 0};
    config.responderRelease.parent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder child while capturing move', () => {
    let config = oneEventLoopTestConfig(three);

    config.startShouldSetResponder.captured.grandParent = {order: 0};
    config.startShouldSetResponder.captured.parent = {order: 1};
    config.startShouldSetResponder.captured.child = {order: 2};
    config.startShouldSetResponder.bubbled.child = {order: 3};
    config.startShouldSetResponder.bubbled.parent = {order: 4};
    config.startShouldSetResponder.bubbled.grandParent = {order: 5};
    run(config, three, startConfig(three.child, [three.child], [0]));

    config = oneEventLoopTestConfig(three);
    config.moveShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.child = {order: 2, returnVal: true};
    config.responderGrant.child = {order: 3};
    config.responderMove.child = {order: 4};
    run(config, three, moveConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.child = {order: 0};
    config.responderRelease.child = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder child while bubbling move', () => {
    let config = oneEventLoopTestConfig(three);

    config.startShouldSetResponder.captured.grandParent = {order: 0};
    config.startShouldSetResponder.captured.parent = {order: 1};
    config.startShouldSetResponder.captured.child = {order: 2};
    config.startShouldSetResponder.bubbled.child = {order: 3};
    config.startShouldSetResponder.bubbled.parent = {order: 4};
    config.startShouldSetResponder.bubbled.grandParent = {order: 5};
    run(config, three, startConfig(three.child, [three.child], [0]));

    config = oneEventLoopTestConfig(three);
    config.moveShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.child = {order: 2, returnVal: false};
    config.moveShouldSetResponder.bubbled.child = {order: 3, returnVal: true};
    config.responderGrant.child = {order: 4};
    config.responderMove.child = {order: 5};
    run(config, three, moveConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.child = {order: 0};
    config.responderRelease.child = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder parent while bubbling move', () => {
    let config = oneEventLoopTestConfig(three);

    config.startShouldSetResponder.captured.grandParent = {order: 0};
    config.startShouldSetResponder.captured.parent = {order: 1};
    config.startShouldSetResponder.captured.child = {order: 2};
    config.startShouldSetResponder.bubbled.child = {order: 3};
    config.startShouldSetResponder.bubbled.parent = {order: 4};
    config.startShouldSetResponder.bubbled.grandParent = {order: 5};
    run(config, three, startConfig(three.child, [three.child], [0]));

    config = oneEventLoopTestConfig(three);
    config.moveShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.child = {order: 2, returnVal: false};
    config.moveShouldSetResponder.bubbled.child = {order: 3, returnVal: false};
    config.moveShouldSetResponder.bubbled.parent = {order: 4, returnVal: true};
    config.responderGrant.parent = {order: 5};
    config.responderMove.parent = {order: 6};
    run(config, three, moveConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.parent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.parent = {order: 0};
    config.responderRelease.parent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should grant responder grandParent while bubbling move', () => {
    let config = oneEventLoopTestConfig(three);

    config.startShouldSetResponder.captured.grandParent = {order: 0};
    config.startShouldSetResponder.captured.parent = {order: 1};
    config.startShouldSetResponder.captured.child = {order: 2};
    config.startShouldSetResponder.bubbled.child = {order: 3};
    config.startShouldSetResponder.bubbled.parent = {order: 4};
    config.startShouldSetResponder.bubbled.grandParent = {order: 5};
    run(config, three, startConfig(three.child, [three.child], [0]));

    config = oneEventLoopTestConfig(three);
    config.moveShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.child = {order: 2, returnVal: false};
    config.moveShouldSetResponder.bubbled.child = {order: 3, returnVal: false};
    config.moveShouldSetResponder.bubbled.parent = {order: 4, returnVal: false};
    config.moveShouldSetResponder.bubbled.grandParent = {
      order: 5,
      returnVal: true,
    };
    config.responderGrant.grandParent = {order: 6};
    config.responderMove.grandParent = {order: 7};
    run(config, three, moveConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.grandParent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.grandParent = {order: 0};
    config.responderRelease.grandParent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  /**
   * Common ancestor tests
   * ---------------------
   */

  it('should bubble negotiation to first common ancestor of responder', () => {
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: true,
    };
    config.responderGrant.parent = {order: 2};
    config.responderStart.parent = {order: 3};
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.parent),
    );

    // While `parent` is still responder, we create new handlers that verify
    // the ordering of propagation, restarting the count at `0`.
    config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };

    config.startShouldSetResponder.bubbled.grandParent = {
      order: 1,
      returnVal: false,
    };
    config.responderStart.parent = {order: 2};
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.parent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.parent = {order: 0};
    config.responderRelease.parent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it('should bubble negotiation to first common ancestor of responder then transfer', () => {
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: true,
    };
    config.responderGrant.parent = {order: 2};
    config.responderStart.parent = {order: 3};
    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.parent),
    );

    config = oneEventLoopTestConfig(three);

    // Parent is responder, and responder is transferred by a second touch start
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: true,
    };
    config.responderGrant.grandParent = {order: 1};
    config.responderTerminationRequest.parent = {order: 2, returnVal: true};
    config.responderTerminate.parent = {order: 3};
    config.responderStart.grandParent = {order: 4};
    run(
      config,
      three,
      startConfig(three.child, [three.child, three.child], [1]),
    );
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.grandParent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.grandParent = {order: 0};
    // one remains\ /one ended \
    run(config, three, endConfig(three.child, [three.child, three.child], [1]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.grandParent),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.grandParent = {order: 0};
    config.responderRelease.grandParent = {order: 1};
    run(config, three, endConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  /**
   * If nothing is responder, then the negotiation should propagate directly to
   * the deepest target in the second touch.
   */
  it('should negotiate with deepest target on second touch if nothing is responder', () => {
    // Initially nothing wants to become the responder
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.parent = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.grandParent = {
      order: 3,
      returnVal: false,
    };

    run(config, three, startConfig(three.parent, [three.parent], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(null);

    config = oneEventLoopTestConfig(three);

    // Now child wants to become responder. Negotiation should bubble as deep
    // as the target is because we don't find first common ancestor (with
    // current responder) because there is no current responder.
    // (Even if this is the second active touch).
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.child = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.child = {order: 3, returnVal: true};
    config.responderGrant.child = {order: 4};
    config.responderStart.child = {order: 5};
    //                                     /  Two active touches  \  /one of them new\
    run(
      config,
      three,
      startConfig(three.child, [three.parent, three.child], [1]),
    );
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    // Now we remove the original first touch, keeping the second touch that
    // started within the current responder (child). Nothing changes because
    // there's still touches that started inside of the current responder.
    config = oneEventLoopTestConfig(three);
    config.responderEnd.child = {order: 0};
    //                                      / one ended\  /one remains \
    run(
      config,
      three,
      endConfig(three.child, [three.parent, three.child], [0]),
    );
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    // Okay, now let's add back that first touch (nothing should change) and
    // then we'll try peeling back the touches in the opposite order to make
    // sure that first removing the second touch instantly causes responder to
    // be released.
    config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.parent = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.grandParent = {
      order: 3,
      returnVal: false,
    };
    // Interesting: child still gets moves even though touch target is parent!
    // Current responder gets a `responderStart` for any touch while responder.
    config.responderStart.child = {order: 4};
    //                                           /  Two active touches  \  /one of them new\
    run(
      config,
      three,
      startConfig(three.parent, [three.child, three.parent], [1]),
    );
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    // Now, move that new touch that had no effect, and did not start within
    // the current responder.
    config = oneEventLoopTestConfig(three);
    config.moveShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.moveShouldSetResponder.bubbled.parent = {order: 2, returnVal: false};
    config.moveShouldSetResponder.bubbled.grandParent = {
      order: 3,
      returnVal: false,
    };
    // Interesting: child still gets moves even though touch target is parent!
    // Current responder gets a `responderMove` for any touch while responder.
    config.responderMove.child = {order: 4};
    //                                     /  Two active touches  \  /one of them moved\
    run(
      config,
      three,
      moveConfig(three.parent, [three.child, three.parent], [1]),
    );
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.child = {order: 0};
    config.responderRelease.child = {order: 1};
    //                                        /child end \ /parent remain\
    run(
      config,
      three,
      endConfig(three.child, [three.child, three.parent], [0]),
    );
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  /**
   * If nothing is responder, then the negotiation should propagate directly to
   * the deepest target in the second touch.
   */
  it('should negotiate until first common ancestor when there are siblings', () => {
    // Initially nothing wants to become the responder
    let config = oneEventLoopTestConfig(siblings);
    config.startShouldSetResponder.captured.parent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.childOne = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.childOne = {
      order: 2,
      returnVal: true,
    };
    config.responderGrant.childOne = {order: 3};
    config.responderStart.childOne = {order: 4};

    run(
      config,
      siblings,
      startConfig(siblings.childOne, [siblings.childOne], [0]),
    );
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(siblings.childOne),
    );

    // If the touch target is the sibling item, the negotiation should only
    // propagate to first common ancestor of current responder and sibling (so
    // the parent).
    config = oneEventLoopTestConfig(siblings);
    config.startShouldSetResponder.captured.parent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.parent = {
      order: 1,
      returnVal: false,
    };
    config.responderStart.childOne = {order: 2};

    const touchConfig = startConfig(
      siblings.childTwo,
      [siblings.childOne, siblings.childTwo],
      [1],
    );
    run(config, siblings, touchConfig);
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(siblings.childOne),
    );

    // move childOne
    config = oneEventLoopTestConfig(siblings);
    config.moveShouldSetResponder.captured.parent = {
      order: 0,
      returnVal: false,
    };
    config.moveShouldSetResponder.bubbled.parent = {order: 1, returnVal: false};
    config.responderMove.childOne = {order: 2};
    run(
      config,
      siblings,
      moveConfig(
        siblings.childOne,
        [siblings.childOne, siblings.childTwo],
        [0],
      ),
    );
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(siblings.childOne),
    );

    // move childTwo: Only negotiates to `parent`.
    config = oneEventLoopTestConfig(siblings);
    config.moveShouldSetResponder.captured.parent = {
      order: 0,
      returnVal: false,
    };
    config.moveShouldSetResponder.bubbled.parent = {order: 1, returnVal: false};
    config.responderMove.childOne = {order: 2};
    run(
      config,
      siblings,
      moveConfig(
        siblings.childTwo,
        [siblings.childOne, siblings.childTwo],
        [1],
      ),
    );
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(siblings.childOne),
    );
  });

  it('should notify of being rejected. responderStart/Move happens on current responder', () => {
    // Initially nothing wants to become the responder
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.child = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.child = {order: 3, returnVal: true};
    config.responderGrant.child = {order: 4};
    config.responderStart.child = {order: 5};

    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    // Suppose parent wants to become responder on move, and is rejected
    config = oneEventLoopTestConfig(three);
    config.moveShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.moveShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.moveShouldSetResponder.bubbled.parent = {order: 2, returnVal: true};
    config.responderGrant.parent = {order: 3};
    config.responderTerminationRequest.child = {order: 4, returnVal: false};
    config.responderReject.parent = {order: 5};
    // The start/move should occur on the original responder if new one is rejected
    config.responderMove.child = {order: 6};

    let touchConfig = moveConfig(three.child, [three.child], [0]);
    run(config, three, touchConfig);
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.parent = {order: 2, returnVal: true};
    config.responderGrant.parent = {order: 3};
    config.responderTerminationRequest.child = {order: 4, returnVal: false};
    config.responderReject.parent = {order: 5};
    // The start/move should occur on the original responder if new one is rejected
    config.responderStart.child = {order: 6};

    touchConfig = startConfig(three.child, [three.child, three.child], [1]);
    run(config, three, touchConfig);
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );
  });

  it('should negotiate scroll', () => {
    // Initially nothing wants to become the responder
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.child = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.child = {order: 3, returnVal: true};
    config.responderGrant.child = {order: 4};
    config.responderStart.child = {order: 5};

    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    // If the touch target is the sibling item, the negotiation should only
    // propagate to first common ancestor of current responder and sibling (so
    // the parent).
    config = oneEventLoopTestConfig(three);
    config.scrollShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.scrollShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.scrollShouldSetResponder.bubbled.parent = {
      order: 2,
      returnVal: true,
    };
    config.responderGrant.parent = {order: 3};
    config.responderTerminationRequest.child = {order: 4, returnVal: false};
    config.responderReject.parent = {order: 5};

    run(config, three, {
      topLevelType: 'topScroll',
      targetInst: getInstanceFromNode(three.parent),
      nativeEvent: {},
    });
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    // Now lets let the scroll take control this time.
    config = oneEventLoopTestConfig(three);
    config.scrollShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.scrollShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.scrollShouldSetResponder.bubbled.parent = {
      order: 2,
      returnVal: true,
    };
    config.responderGrant.parent = {order: 3};
    config.responderTerminationRequest.child = {order: 4, returnVal: true};
    config.responderTerminate.child = {order: 5};

    run(config, three, {
      topLevelType: 'topScroll',
      targetInst: getInstanceFromNode(three.parent),
      nativeEvent: {},
    });
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.parent),
    );
  });

  it('should cancel correctly', () => {
    // Initially our child becomes responder
    let config = oneEventLoopTestConfig(three);
    config.startShouldSetResponder.captured.grandParent = {
      order: 0,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.parent = {
      order: 1,
      returnVal: false,
    };
    config.startShouldSetResponder.captured.child = {
      order: 2,
      returnVal: false,
    };
    config.startShouldSetResponder.bubbled.child = {order: 3, returnVal: true};
    config.responderGrant.child = {order: 4};
    config.responderStart.child = {order: 5};

    run(config, three, startConfig(three.child, [three.child], [0]));
    expect(ResponderEventPlugin._getResponder()).toBe(
      getInstanceFromNode(three.child),
    );

    config = oneEventLoopTestConfig(three);
    config.responderEnd.child = {order: 0};
    config.responderTerminate.child = {order: 1};

    const nativeEvent = _touchConfig(
      'topTouchCancel',
      three.child,
      [three.child],
      [0],
    );
    run(config, three, nativeEvent);
    expect(ResponderEventPlugin._getResponder()).toBe(null);
  });

  it(
    'should determine the first common ancestor correctly',
    async () => {
      // This test was moved here from the ReactTreeTraversal test since only the
      // ResponderEventPlugin uses `getLowestCommonAncestor`
      const React = require('react');
      const ReactDOMClient = require('react-dom/client');
      const act = require('internal-test-utils').act;
      const getLowestCommonAncestor =
        require('react-native-renderer/src/legacy-events/ResponderEventPlugin').getLowestCommonAncestor;
      // This works by accident and will likely break in the future.
      const ReactDOMComponentTree = require('react-dom-bindings/src/client/ReactDOMComponentTree');

      class ChildComponent extends React.Component {
        divRef = React.createRef();
        div1Ref = React.createRef();
        div2Ref = React.createRef();

        render() {
          return (
            <div ref={this.divRef} id={this.props.id + '__DIV'}>
              <div ref={this.div1Ref} id={this.props.id + '__DIV_1'} />
              <div ref={this.div2Ref} id={this.props.id + '__DIV_2'} />
            </div>
          );
        }
      }

      class ParentComponent extends React.Component {
        pRef = React.createRef();
        p_P1Ref = React.createRef();
        p_P1_C1Ref = React.createRef();
        p_P1_C2Ref = React.createRef();
        p_OneOffRef = React.createRef();

        render() {
          return (
            <div ref={this.pRef} id="P">
              <div ref={this.p_P1Ref} id="P_P1">
                <ChildComponent ref={this.p_P1_C1Ref} id="P_P1_C1" />
                <ChildComponent ref={this.p_P1_C2Ref} id="P_P1_C2" />
              </div>
              <div ref={this.p_OneOffRef} id="P_OneOff" />
            </div>
          );
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      let parent;
      await act(() => {
        root.render(<ParentComponent ref={current => (parent = current)} />);
      });

      const ancestors = [
        // Common ancestor with self is self.
        {
          one: parent.p_P1_C1Ref.current.div1Ref.current,
          two: parent.p_P1_C1Ref.current.div1Ref.current,
          com: parent.p_P1_C1Ref.current.div1Ref.current,
        },
        // Common ancestor with self is self - even if topmost DOM.
        {
          one: parent.pRef.current,
          two: parent.pRef.current,
          com: parent.pRef.current,
        },
        // Siblings
        {
          one: parent.p_P1_C1Ref.current.div1Ref.current,
          two: parent.p_P1_C1Ref.current.div2Ref.current,
          com: parent.p_P1_C1Ref.current.divRef.current,
        },
        // Common ancestor with parent is the parent.
        {
          one: parent.p_P1_C1Ref.current.div1Ref.current,
          two: parent.p_P1_C1Ref.current.divRef.current,
          com: parent.p_P1_C1Ref.current.divRef.current,
        },
        // Common ancestor with grandparent is the grandparent.
        {
          one: parent.p_P1_C1Ref.current.div1Ref.current,
          two: parent.p_P1Ref.current,
          com: parent.p_P1Ref.current,
        },
        // Grandparent across subcomponent boundaries.
        {
          one: parent.p_P1_C1Ref.current.div1Ref.current,
          two: parent.p_P1_C2Ref.current.div1Ref.current,
          com: parent.p_P1Ref.current,
        },
        // Something deep with something one-off.
        {
          one: parent.p_P1_C1Ref.current.div1Ref.current,
          two: parent.p_OneOffRef.current,
          com: parent.pRef.current,
        },
      ];
      let i;
      for (i = 0; i < ancestors.length; i++) {
        const plan = ancestors[i];
        const firstCommon = getLowestCommonAncestor(
          ReactDOMComponentTree.getInstanceFromNode(plan.one),
          ReactDOMComponentTree.getInstanceFromNode(plan.two),
        );
        expect(firstCommon).toBe(
          ReactDOMComponentTree.getInstanceFromNode(plan.com),
        );
      }
    },
    // TODO: this is a long running test, we should speed it up.
    60 * 1000,
  );
});
