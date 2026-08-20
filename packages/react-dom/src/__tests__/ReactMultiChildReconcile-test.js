/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const React = require('react');
const ReactDOMClient = require('react-dom/client');
const act = require('internal-test-utils').act;

const stripEmptyValues = function (obj) {
  const ret = {};
  for (const name in obj) {
    if (!obj.hasOwnProperty(name)) {
      continue;
    }
    if (obj[name] !== null && obj[name] !== undefined) {
      ret[name] = obj[name];
    }
  }
  return ret;
};

let idCounter = 123;

/**
 * Contains internal static internal state in order to test that updates to
 * existing children won't reinitialize components, when moving children -
 * reusing existing DOM/memory resources.
 */
class StatusDisplay extends React.Component {
  state = {internalState: idCounter++};

  getStatus() {
    return this.props.status;
  }

  getInternalState() {
    return this.state.internalState;
  }

  componentDidMount() {
    this.props.onFlush();
  }

  componentDidUpdate() {
    this.props.onFlush();
  }

  render() {
    return <div>{this.props.contentKey}</div>;
  }
}

/**
 * Displays friends statuses.
 */
class FriendsStatusDisplay extends React.Component {
  displays = {};

  /**
   * Gets the order directly from each rendered child's `index` field.
   * Refs are not maintained in the rendered order, and neither is
   * `this._renderedChildren` (surprisingly).
   */
  getOriginalKeys() {
    const originalKeys = [];
    for (const key in this.props.usernameToStatus) {
      if (this.props.usernameToStatus[key]) {
        originalKeys.push(key);
      }
    }
    return originalKeys;
  }

  /**
   * Retrieves the rendered children in a nice format for comparing to the input
   * `this.props.usernameToStatus`.
   */
  getStatusDisplays() {
    const res = {};
    const originalKeys = this.getOriginalKeys();
    for (let i = 0; i < originalKeys.length; i++) {
      const key = originalKeys[i];
      res[key] = this.displays[key];
    }
    return res;
  }

  /**
   * Verifies that by the time a child is flushed, the refs that appeared
   * earlier have already been resolved.
   * TODO: This assumption will likely break with incremental reconciler
   * but our internal layer API depends on this assumption. We need to change
   * it to be more declarative before making ref resolution indeterministic.
   */
  verifyPreviousRefsResolved(flushedKey) {
    const originalKeys = this.getOriginalKeys();
    for (let i = 0; i < originalKeys.length; i++) {
      const key = originalKeys[i];
      if (key === flushedKey) {
        // We are only interested in children up to the current key.
        return;
      }
      expect(this.displays[key]).toBeTruthy();
    }
  }

  render() {
    const children = [];
    for (const key in this.props.usernameToStatus) {
      const status = this.props.usernameToStatus[key];
      children.push(
        !status ? null : (
          <StatusDisplay
            key={key}
            ref={current => {
              this.displays[key] = current;
            }}
            contentKey={key}
            onFlush={this.verifyPreviousRefsResolved.bind(this, key)}
            status={status}
          />
        ),
      );
    }
    const childrenToRender = this.props.prepareChildren(children);
    return <div>{childrenToRender}</div>;
  }
}

function getInternalStateByUserName(statusDisplays) {
  return Object.keys(statusDisplays).reduce((acc, key) => {
    acc[key] = statusDisplays[key].getInternalState();
    return acc;
  }, {});
}

/**
 * Verifies that the rendered `StatusDisplay` instances match the `props` that
 * were responsible for allocating them. Checks the content of the user's status
 * message as well as the order of them.
 */
function verifyStatuses(statusDisplays, props) {
  const nonEmptyStatusDisplays = stripEmptyValues(statusDisplays);
  const nonEmptyStatusProps = stripEmptyValues(props.usernameToStatus);
  let username;
  expect(Object.keys(nonEmptyStatusDisplays).length).toEqual(
    Object.keys(nonEmptyStatusProps).length,
  );
  for (username in nonEmptyStatusDisplays) {
    if (!nonEmptyStatusDisplays.hasOwnProperty(username)) {
      continue;
    }
    expect(nonEmptyStatusDisplays[username].getStatus()).toEqual(
      nonEmptyStatusProps[username],
    );
  }

  // now go the other way to make sure we got them all.
  for (username in nonEmptyStatusProps) {
    if (!nonEmptyStatusProps.hasOwnProperty(username)) {
      continue;
    }
    expect(nonEmptyStatusDisplays[username].getStatus()).toEqual(
      nonEmptyStatusProps[username],
    );
  }

  expect(Object.keys(nonEmptyStatusDisplays)).toEqual(
    Object.keys(nonEmptyStatusProps),
  );
}

/**
 * For all statusDisplays that existed in the previous iteration of the
 * sequence, verify that the state has been preserved. `StatusDisplay` contains
 * a unique number that allows us to track internal state across ordering
 * movements.
 */
function verifyStatesPreserved(lastInternalStates, statusDisplays) {
  let key;
  for (key in statusDisplays) {
    if (!statusDisplays.hasOwnProperty(key)) {
      continue;
    }
    if (lastInternalStates[key]) {
      expect(lastInternalStates[key]).toEqual(
        statusDisplays[key].getInternalState(),
      );
    }
  }
}

/**
 * Verifies that the internal representation of a set of `renderedChildren`
 * accurately reflects what is in the DOM.
 */
function verifyDomOrderingAccurate(outerContainer, statusDisplays) {
  const containerNode = outerContainer.firstChild;
  const statusDisplayNodes = containerNode.childNodes;
  const orderedDomKeys = [];
  for (let i = 0; i < statusDisplayNodes.length; i++) {
    const contentKey = statusDisplayNodes[i].textContent;
    orderedDomKeys.push(contentKey);
  }

  const orderedLogicalKeys = [];
  let username;
  for (username in statusDisplays) {
    if (!statusDisplays.hasOwnProperty(username)) {
      continue;
    }
    const statusDisplay = statusDisplays[username];
    orderedLogicalKeys.push(statusDisplay.props.contentKey);
  }
  expect(orderedDomKeys).toEqual(orderedLogicalKeys);
}

async function testPropsSequenceWithPreparedChildren(
  sequence,
  prepareChildren,
) {
  const container = document.createElement('div');
  const root = ReactDOMClient.createRoot(container);
  let parentInstance;
  await act(() => {
    root.render(
      <FriendsStatusDisplay
        {...sequence[0]}
        prepareChildren={prepareChildren}
        ref={current => {
          if (parentInstance === undefined) {
            parentInstance = current;
          }
        }}
      />,
    );
  });
  let statusDisplays = parentInstance.getStatusDisplays();
  let lastInternalStates = getInternalStateByUserName(statusDisplays);
  verifyStatuses(statusDisplays, sequence[0]);

  for (let i = 1; i < sequence.length; i++) {
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...sequence[i]}
          prepareChildren={prepareChildren}
        />,
      );
    });

    statusDisplays = parentInstance.getStatusDisplays();
    verifyStatuses(statusDisplays, sequence[i]);
    verifyStatesPreserved(lastInternalStates, statusDisplays);
    verifyDomOrderingAccurate(container, statusDisplays);

    lastInternalStates = getInternalStateByUserName(statusDisplays);
  }
}

function prepareChildrenArray(childrenArray) {
  return childrenArray;
}

function prepareChildrenLegacyIterable(childrenArray) {
  return {
    '@@iterator': function* () {
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const child of childrenArray) {
        yield child;
      }
    },
  };
}

function prepareChildrenModernIterable(childrenArray) {
  return {
    [Symbol.iterator]: function* () {
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const child of childrenArray) {
        yield child;
      }
    },
  };
}

async function testPropsSequence(sequence) {
  await testPropsSequenceWithPreparedChildren(sequence, prepareChildrenArray);
  await testPropsSequenceWithPreparedChildren(
    sequence,
    prepareChildrenLegacyIterable,
  );
  await testPropsSequenceWithPreparedChildren(
    sequence,
    prepareChildrenModernIterable,
  );
}

describe('ReactMultiChildReconcile', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should reset internal state if removed then readded in an array', async () => {
    // Test basics.
    const props = {
      usernameToStatus: {
        jcw: 'jcwStatus',
      },
    };

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let parentInstance;
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...props}
          prepareChildren={prepareChildrenArray}
          ref={current => {
            if (parentInstance === undefined) {
              parentInstance = current;
            }
          }}
        />,
      );
    });
    let statusDisplays = parentInstance.getStatusDisplays();
    const startingInternalState = statusDisplays.jcw.getInternalState();

    // Now remove the child.
    await act(() => {
      root.render(
        <FriendsStatusDisplay prepareChildren={prepareChildrenArray} />,
      );
    });

    statusDisplays = parentInstance.getStatusDisplays();
    expect(statusDisplays.jcw).toBeFalsy();

    // Now reset the props that cause there to be a child
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...props}
          prepareChildren={prepareChildrenArray}
        />,
      );
    });

    statusDisplays = parentInstance.getStatusDisplays();
    expect(statusDisplays.jcw).toBeTruthy();
    expect(statusDisplays.jcw.getInternalState()).not.toBe(
      startingInternalState,
    );
  });

  it('should reset internal state if removed then readded in a legacy iterable', async () => {
    // Test basics.
    const props = {
      usernameToStatus: {
        jcw: 'jcwStatus',
      },
    };

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let parentInstance;
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...props}
          prepareChildren={prepareChildrenLegacyIterable}
          ref={current => {
            if (parentInstance === undefined) {
              parentInstance = current;
            }
          }}
        />,
      );
    });

    let statusDisplays = parentInstance.getStatusDisplays();
    const startingInternalState = statusDisplays.jcw.getInternalState();

    // Now remove the child.
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          prepareChildren={prepareChildrenLegacyIterable}
        />,
      );
    });

    statusDisplays = parentInstance.getStatusDisplays();
    expect(statusDisplays.jcw).toBeFalsy();

    // Now reset the props that cause there to be a child
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...props}
          prepareChildren={prepareChildrenLegacyIterable}
        />,
      );
    });

    statusDisplays = parentInstance.getStatusDisplays();
    expect(statusDisplays.jcw).toBeTruthy();
    expect(statusDisplays.jcw.getInternalState()).not.toBe(
      startingInternalState,
    );
  });

  it('should reset internal state if removed then readded in a modern iterable', async () => {
    // Test basics.
    const props = {
      usernameToStatus: {
        jcw: 'jcwStatus',
      },
    };

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let parentInstance;
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...props}
          prepareChildren={prepareChildrenModernIterable}
          ref={current => {
            if (parentInstance === undefined) {
              parentInstance = current;
            }
          }}
        />,
      );
    });

    let statusDisplays = parentInstance.getStatusDisplays();
    const startingInternalState = statusDisplays.jcw.getInternalState();

    // Now remove the child.
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          prepareChildren={prepareChildrenModernIterable}
        />,
      );
    });

    statusDisplays = parentInstance.getStatusDisplays();
    expect(statusDisplays.jcw).toBeFalsy();

    // Now reset the props that cause there to be a child
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...props}
          prepareChildren={prepareChildrenModernIterable}
        />,
      );
    });

    statusDisplays = parentInstance.getStatusDisplays();
    expect(statusDisplays.jcw).toBeTruthy();
    expect(statusDisplays.jcw.getInternalState()).not.toBe(
      startingInternalState,
    );
  });

  it('should create unique identity', async () => {
    // Test basics.
    const usernameToStatus = {
      jcw: 'jcwStatus',
      awalke: 'awalkeStatus',
      bob: 'bobStatus',
    };

    await testPropsSequence([{usernameToStatus: usernameToStatus}]);
  });

  it('should preserve order if children order has not changed', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: 'jcwstatus2',
          jordanjcw: 'jordanjcwstatus2',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should transition from zero to one children correctly', async () => {
    const PROPS_SEQUENCE = [
      {usernameToStatus: {}},
      {
        usernameToStatus: {
          first: 'firstStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should transition from one to zero children correctly', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          first: 'firstStatus',
        },
      },
      {usernameToStatus: {}},
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should transition from one child to null children', async () => {
    await testPropsSequence([
      {
        usernameToStatus: {
          first: 'firstStatus',
        },
      },
      {},
    ]);
  });

  it('should transition from null children to one child', async () => {
    await testPropsSequence([
      {},
      {
        usernameToStatus: {
          first: 'firstStatus',
        },
      },
    ]);
  });

  it('should transition from zero children to null children', async () => {
    await testPropsSequence([
      {
        usernameToStatus: {},
      },
      {},
    ]);
  });

  it('should transition from null children to zero children', async () => {
    await testPropsSequence([
      {},
      {
        usernameToStatus: {},
      },
    ]);
  });

  /**
   * `FriendsStatusDisplay` renders nulls as empty children (it's a convention
   * of `FriendsStatusDisplay`, nothing related to React or these test cases.
   */
  it('should remove nulled out children at the beginning', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: null,
          jordanjcw: 'jordanjcwstatus2',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should remove nulled out children at the end', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: 'jcwstatus2',
          jordanjcw: null,
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should reverse the order of two children', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
        },
      },
      {
        usernameToStatus: {
          userTwo: 'userTwoStatus',
          userOne: 'userOneStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should reverse the order of more than two children', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
          userThree: 'userThreeStatus',
        },
      },
      {
        usernameToStatus: {
          userThree: 'userThreeStatus',
          userTwo: 'userTwoStatus',
          userOne: 'userOneStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should cycle order correctly', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
          userThree: 'userThreeStatus',
          userFour: 'userFourStatus',
        },
      },
      {
        usernameToStatus: {
          userTwo: 'userTwoStatus',
          userThree: 'userThreeStatus',
          userFour: 'userFourStatus',
          userOne: 'userOneStatus',
        },
      },
      {
        usernameToStatus: {
          userThree: 'userThreeStatus',
          userFour: 'userFourStatus',
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
        },
      },
      {
        usernameToStatus: {
          userFour: 'userFourStatus',
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
          userThree: 'userThreeStatus',
        },
      },
      {
        usernameToStatus: {
          // Full circle!
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
          userThree: 'userThreeStatus',
          userFour: 'userFourStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should cycle order correctly in the other direction', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
          userThree: 'userThreeStatus',
          userFour: 'userFourStatus',
        },
      },
      {
        usernameToStatus: {
          userFour: 'userFourStatus',
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
          userThree: 'userThreeStatus',
        },
      },
      {
        usernameToStatus: {
          userThree: 'userThreeStatus',
          userFour: 'userFourStatus',
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
        },
      },
      {
        usernameToStatus: {
          userTwo: 'userTwoStatus',
          userThree: 'userThreeStatus',
          userFour: 'userFourStatus',
          userOne: 'userOneStatus',
        },
      },
      {
        usernameToStatus: {
          // Full circle!
          userOne: 'userOneStatus',
          userTwo: 'userTwoStatus',
          userThree: 'userThreeStatus',
          userFour: 'userFourStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should remove nulled out children and ignore new null children', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jordanjcw: 'jordanjcwstatus2',
          jcw: null,
          another: null,
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should remove nulled out children and reorder remaining', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
          john: 'johnStatus', // john will go away
          joe: 'joeStatus',
        },
      },
      {
        usernameToStatus: {
          jordanjcw: 'jordanjcwStatus',
          joe: 'joeStatus',
          jcw: 'jcwStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should append children to the end', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
          jordanjcwnew: 'jordanjcwnewStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should append multiple children to the end', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
          jordanjcwnew: 'jordanjcwnewStatus',
          jordanjcwnew2: 'jordanjcwnewStatus2',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should prepend children to the beginning', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          newUsername: 'newUsernameStatus',
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should prepend multiple children to the beginning', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          newNewUsername: 'newNewUsernameStatus',
          newUsername: 'newUsernameStatus',
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should not prepend an empty child to the beginning', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          emptyUsername: null,
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should not append an empty child to the end', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
          emptyUsername: null,
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should not insert empty children in the middle', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: 'jcwstatus2',
          skipOverMe: null,
          skipOverMeToo: null,
          definitelySkipOverMe: null,
          jordanjcw: 'jordanjcwstatus2',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should insert one new child in the middle', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: 'jcwstatus2',
          insertThis: 'insertThisStatus',
          jordanjcw: 'jordanjcwstatus2',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should insert multiple new truthy children in the middle', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: 'jcwstatus2',
          insertThis: 'insertThisStatus',
          insertThisToo: 'insertThisTooStatus',
          definitelyInsertThisToo: 'definitelyInsertThisTooStatus',
          jordanjcw: 'jordanjcwstatus2',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it('should insert non-empty children in middle where nulls were', async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: 'jcwStatus',
          insertThis: null,
          insertThisToo: null,
          definitelyInsertThisToo: null,
          jordanjcw: 'jordanjcwStatus',
        },
      },
      {
        usernameToStatus: {
          jcw: 'jcwstatus2',
          insertThis: 'insertThisStatus',
          insertThisToo: 'insertThisTooStatus',
          definitelyInsertThisToo: 'definitelyInsertThisTooStatus',
          jordanjcw: 'jordanjcwstatus2',
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });
});
