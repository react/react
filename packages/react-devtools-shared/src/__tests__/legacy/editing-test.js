/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type Store from 'react-devtools-shared/src/devtools/store';

describe('editing interface', () => {
  let PropTypes;
  let React;
  let ReactDOM;
  let bridge: FrontendBridge;
  let store: Store;

  const act = (callback: Function) => {
    callback();

    jest.runAllTimers(); // Flush Bridge operations
  };

  const flushPendingUpdates = () => {
    jest.runOnlyPendingTimers();
  };

  beforeEach(() => {
    bridge = global.bridge;
    store = global.store;
    store.collapseNodesByDefault = false;

    PropTypes = require('prop-types');

    // Redirect all React/ReactDOM requires to the v15 UMD.
    // We use the UMD because Jest doesn't enable us to mock deep imports (e.g. "react/lib/Something").
    jest.mock('react', () => jest.requireActual('react-15/dist/react.js'));
    jest.mock('react-dom', () =>
      jest.requireActual('react-dom-15/dist/react-dom.js'),
    );

    React = require('react');
    ReactDOM = require('react-dom');
  });

  describe('props', () => {
    let committedProps;
    let id;

    function mountTestApp() {
      class ClassComponent extends React.Component {
        componentDidMount() {
          committedProps = this.props;
        }
        componentDidUpdate() {
          committedProps = this.props;
        }
        render() {
          return null;
        }
      }

      act(() =>
        ReactDOM.render(
          React.createElement(ClassComponent, {
            array: [1, 2, 3],
            object: {nested: 'initial'},
            shallow: 'initial',
          }),
          document.createElement('div'),
        ),
      );

      id = ((store.getElementIDAtIndex(0): any): number);

      expect(committedProps).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        shallow: 'initial',
      });
    }

    // @reactVersion >= 16.0
    it('should have editable values', () => {
      mountTestApp();

      function overrideProps(path, value) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);
        bridge.send('overrideValueAtPath', {
          id,
          path,
          rendererID,
          type: 'props',
          value,
        });
        flushPendingUpdates();
      }

      overrideProps(['shallow'], 'updated');
      expect(committedProps).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        shallow: 'updated',
      });
      overrideProps(['object', 'nested'], 'updated');
      expect(committedProps).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'updated',
        },
        shallow: 'updated',
      });
      overrideProps(['array', 1], 'updated');
      expect(committedProps).toStrictEqual({
        array: [1, 'updated', 3],
        object: {
          nested: 'updated',
        },
        shallow: 'updated',
      });
    });

    // @reactVersion >= 16.0
    it('should have editable paths', () => {
      mountTestApp();

      function renamePath(oldPath, newPath) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);
        bridge.send('renamePath', {
          id,
          oldPath,
          newPath,
          rendererID,
          type: 'props',
        });
        flushPendingUpdates();
      }

      renamePath(['shallow'], ['after']);
      expect(committedProps).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        after: 'initial',
      });
      renamePath(['object', 'nested'], ['object', 'after']);
      expect(committedProps).toStrictEqual({
        array: [1, 2, 3],
        object: {
          after: 'initial',
        },
        after: 'initial',
      });
    });

    // @reactVersion >= 16.0
    it('should enable adding new object properties and array values', async () => {
      await mountTestApp();

      function overrideProps(path, value) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);
        bridge.send('overrideValueAtPath', {
          id,
          path,
          rendererID,
          type: 'props',
          value,
        });
        flushPendingUpdates();
      }

      overrideProps(['new'], 'value');
      expect(committedProps).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        shallow: 'initial',
        new: 'value',
      });

      overrideProps(['object', 'new'], 'value');
      expect(committedProps).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
          new: 'value',
        },
        shallow: 'initial',
        new: 'value',
      });

      overrideProps(['array', 3], 'new value');
      expect(committedProps).toStrictEqual({
        array: [1, 2, 3, 'new value'],
        object: {
          nested: 'initial',
          new: 'value',
        },
        shallow: 'initial',
        new: 'value',
      });
    });

    // @reactVersion >= 16.0
    it('should have deletable keys', () => {
      mountTestApp();

      function deletePath(path) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);
        bridge.send('deletePath', {
          id,
          path,
          rendererID,
          type: 'props',
        });
        flushPendingUpdates();
      }

      deletePath(['shallow']);
      expect(committedProps).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
      });
      deletePath(['object', 'nested']);
      expect(committedProps).toStrictEqual({
        array: [1, 2, 3],
        object: {},
      });
      deletePath(['array', 1]);
      expect(committedProps).toStrictEqual({
        array: [1, 3],
        object: {},
      });
    });
  });

  describe('state', () => {
    let committedState;
    let id;

    function mountTestApp() {
      class ClassComponent extends React.Component {
        state = {
          array: [1, 2, 3],
          object: {
            nested: 'initial',
          },
          shallow: 'initial',
        };
        componentDidMount() {
          committedState = this.state;
        }
        componentDidUpdate() {
          committedState = this.state;
        }
        render() {
          return null;
        }
      }

      act(() =>
        ReactDOM.render(
          React.createElement(ClassComponent, {
            object: {nested: 'initial'},
            shallow: 'initial',
          }),
          document.createElement('div'),
        ),
      );

      id = ((store.getElementIDAtIndex(0): any): number);

      expect(committedState).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        shallow: 'initial',
      });
    }

    // @reactVersion >= 16.0
    it('should have editable values', () => {
      mountTestApp();

      function overrideState(path, value) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);
        bridge.send('overrideValueAtPath', {
          id,
          path,
          rendererID,
          type: 'state',
          value,
        });
        flushPendingUpdates();
      }

      overrideState(['shallow'], 'updated');
      expect(committedState).toStrictEqual({
        array: [1, 2, 3],
        object: {nested: 'initial'},
        shallow: 'updated',
      });

      overrideState(['object', 'nested'], 'updated');
      expect(committedState).toStrictEqual({
        array: [1, 2, 3],
        object: {nested: 'updated'},
        shallow: 'updated',
      });

      overrideState(['array', 1], 'updated');
      expect(committedState).toStrictEqual({
        array: [1, 'updated', 3],
        object: {nested: 'updated'},
        shallow: 'updated',
      });
    });

    // @reactVersion >= 16.0
    it('should have editable paths', () => {
      mountTestApp();

      function renamePath(oldPath, newPath) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);
        bridge.send('renamePath', {
          id,
          oldPath,
          newPath,
          rendererID,
          type: 'state',
        });
        flushPendingUpdates();
      }

      renamePath(['shallow'], ['after']);
      expect(committedState).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        after: 'initial',
      });

      renamePath(['object', 'nested'], ['object', 'after']);
      expect(committedState).toStrictEqual({
        array: [1, 2, 3],
        object: {
          after: 'initial',
        },
        after: 'initial',
      });
    });

    // @reactVersion >= 16.0
    it('should enable adding new object properties and array values', async () => {
      await mountTestApp();

      function overrideState(path, value) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);
        bridge.send('overrideValueAtPath', {
          id,
          path,
          rendererID,
          type: 'state',
          value,
        });
        flushPendingUpdates();
      }

      overrideState(['new'], 'value');
      expect(committedState).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        shallow: 'initial',
        new: 'value',
      });

      overrideState(['object', 'new'], 'value');
      expect(committedState).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
          new: 'value',
        },
        shallow: 'initial',
        new: 'value',
      });

      overrideState(['array', 3], 'new value');
      expect(committedState).toStrictEqual({
        array: [1, 2, 3, 'new value'],
        object: {
          nested: 'initial',
          new: 'value',
        },
        shallow: 'initial',
        new: 'value',
      });
    });

    // @reactVersion >= 16.0
    it('should have deletable keys', () => {
      mountTestApp();

      function deletePath(path) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);
        bridge.send('deletePath', {
          id,
          path,
          rendererID,
          type: 'state',
        });
        flushPendingUpdates();
      }

      deletePath(['shallow']);
      expect(committedState).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
      });

      deletePath(['object', 'nested']);
      expect(committedState).toStrictEqual({
        array: [1, 2, 3],
        object: {},
      });

      deletePath(['array', 1]);
      expect(committedState).toStrictEqual({
        array: [1, 3],
        object: {},
      });
    });
  });

  describe('context', () => {
    let committedContext;
    let id;

    function mountTestApp() {
      class LegacyContextProvider extends React.Component<any> {
        static childContextTypes = {
          array: PropTypes.array,
          object: PropTypes.object,
          shallow: PropTypes.string,
        };
        getChildContext() {
          return {
            array: [1, 2, 3],
            object: {
              nested: 'initial',
            },
            shallow: 'initial',
          };
        }
        render() {
          return this.props.children;
        }
      }

      class ClassComponent extends React.Component<any> {
        static contextTypes = {
          array: PropTypes.array,
          object: PropTypes.object,
          shallow: PropTypes.string,
        };
        componentDidMount() {
          committedContext = this.context;
        }
        componentDidUpdate() {
          committedContext = this.context;
        }
        render() {
          return null;
        }
      }

      act(() =>
        ReactDOM.render(
          React.createElement(
            LegacyContextProvider,
            null,
            React.createElement(ClassComponent),
          ),
          document.createElement('div'),
        ),
      );

      // This test only covers Class components.
      // Function components using legacy context are not editable.

      id = ((store.getElementIDAtIndex(1): any): number);

      expect(committedContext).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        shallow: 'initial',
      });
    }

    // @reactVersion >= 16.0
    it('should have editable values', () => {
      mountTestApp();

      function overrideContext(path, value) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);

        bridge.send('overrideValueAtPath', {
          id,
          path,
          rendererID,
          type: 'context',
          value,
        });
        flushPendingUpdates();
      }

      overrideContext(['shallow'], 'updated');
      expect(committedContext).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        shallow: 'updated',
      });

      overrideContext(['object', 'nested'], 'updated');
      expect(committedContext).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'updated',
        },
        shallow: 'updated',
      });

      overrideContext(['array', 1], 'updated');
      expect(committedContext).toStrictEqual({
        array: [1, 'updated', 3],
        object: {
          nested: 'updated',
        },
        shallow: 'updated',
      });
    });

    // @reactVersion >= 16.0
    it('should have editable paths', () => {
      mountTestApp();

      function renamePath(oldPath, newPath) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);

        bridge.send('renamePath', {
          id,
          oldPath,
          newPath,
          rendererID,
          type: 'context',
        });
        flushPendingUpdates();
      }

      renamePath(['shallow'], ['after']);
      expect(committedContext).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        after: 'initial',
      });

      renamePath(['object', 'nested'], ['object', 'after']);
      expect(committedContext).toStrictEqual({
        array: [1, 2, 3],
        object: {
          after: 'initial',
        },
        after: 'initial',
      });
    });

    // @reactVersion >= 16.0
    it('should enable adding new object properties and array values', async () => {
      await mountTestApp();

      function overrideContext(path, value) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);

        bridge.send('overrideValueAtPath', {
          id,
          path,
          rendererID,
          type: 'context',
          value,
        });
        flushPendingUpdates();
      }

      overrideContext(['new'], 'value');
      expect(committedContext).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
        shallow: 'initial',
        new: 'value',
      });

      overrideContext(['object', 'new'], 'value');
      expect(committedContext).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
          new: 'value',
        },
        shallow: 'initial',
        new: 'value',
      });

      overrideContext(['array', 3], 'new value');
      expect(committedContext).toStrictEqual({
        array: [1, 2, 3, 'new value'],
        object: {
          nested: 'initial',
          new: 'value',
        },
        shallow: 'initial',
        new: 'value',
      });
    });

    // @reactVersion >= 16.0
    it('should have deletable keys', () => {
      mountTestApp();

      function deletePath(path) {
        const rendererID = ((store.getRendererIDForElement(id): any): number);

        bridge.send('deletePath', {
          id,
          path,
          rendererID,
          type: 'context',
        });
        flushPendingUpdates();
      }

      deletePath(['shallow']);
      expect(committedContext).toStrictEqual({
        array: [1, 2, 3],
        object: {
          nested: 'initial',
        },
      });

      deletePath(['object', 'nested']);
      expect(committedContext).toStrictEqual({
        array: [1, 2, 3],
        object: {},
      });

      deletePath(['array', 1]);
      expect(committedContext).toStrictEqual({
        array: [1, 3],
        object: {},
      });
    });
  });
});
