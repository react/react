/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('Store (legacy)', () => {
  let React;
  let ReactDOM;
  let store;
  const act = (callback: Function) => {
    callback();
    jest.runAllTimers(); // Flush Bridge operations
  };
  beforeEach(() => {
    store = global.store;

    // Redirect all React/ReactDOM requires to the v15 UMD.
    // We use the UMD because Jest doesn't enable us to mock deep imports (e.g. "react/lib/Something").
    jest.mock('react', () => jest.requireActual('react-15/dist/react.js'));
    jest.mock('react-dom', () =>
      jest.requireActual('react-dom-15/dist/react-dom.js'),
    );
    React = require('react');
    ReactDOM = require('react-dom');
  });
  it('should not allow a root node to be collapsed', () => {
    const Component = () => React.createElement('div', null, 'Hi');
    act(() =>
      ReactDOM.render(
        React.createElement(Component, {
          count: 4,
        }),
        document.createElement('div'),
      ),
    );
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Component>
            <div>
    `);
    expect(store.roots).toHaveLength(1);
    const rootID = store.roots[0];
    expect(() => store.toggleIsCollapsed(rootID, true)).toThrow(
      'Root nodes cannot be collapsed',
    );
  });
  describe('collapseNodesByDefault:false', () => {
    beforeEach(() => {
      store.collapseNodesByDefault = false;
    });
    it('should support mount and update operations', () => {
      const Grandparent = ({count}) =>
        React.createElement(
          'div',
          null,
          React.createElement(Parent, {
            count: count,
          }),
          React.createElement(Parent, {
            count: count,
          }),
        );
      const Parent = ({count}) =>
        React.createElement(
          'div',
          null,
          new Array(count).fill(true).map((_, index) =>
            React.createElement(Child, {
              key: index,
            }),
          ),
        );
      const Child = () => React.createElement('div', null, 'Hi!');
      const container = document.createElement('div');
      act(() =>
        ReactDOM.render(
          React.createElement(Grandparent, {
            count: 4,
          }),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child key="0">
                      <div>
                  ▾ <Child key="1">
                      <div>
                  ▾ <Child key="2">
                      <div>
                  ▾ <Child key="3">
                      <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child key="0">
                      <div>
                  ▾ <Child key="1">
                      <div>
                  ▾ <Child key="2">
                      <div>
                  ▾ <Child key="3">
                      <div>
      `);
      act(() =>
        ReactDOM.render(
          React.createElement(Grandparent, {
            count: 2,
          }),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child key="0">
                      <div>
                  ▾ <Child key="1">
                      <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child key="0">
                      <div>
                  ▾ <Child key="1">
                      <div>
      `);
      act(() => ReactDOM.unmountComponentAtNode(container));
      expect(store).toMatchInlineSnapshot(``);
    });
    it('should support mount and update operations for multiple roots', () => {
      const Parent = ({count}) =>
        React.createElement(
          'div',
          null,
          new Array(count).fill(true).map((_, index) =>
            React.createElement(Child, {
              key: index,
            }),
          ),
        );
      const Child = () => React.createElement('div', null, 'Hi!');
      const containerA = document.createElement('div');
      const containerB = document.createElement('div');
      act(() => {
        ReactDOM.render(
          React.createElement(Parent, {
            key: 'A',
            count: 3,
          }),
          containerA,
        );
        ReactDOM.render(
          React.createElement(Parent, {
            key: 'B',
            count: 2,
          }),
          containerB,
        );
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Parent key="A">
            ▾ <div>
              ▾ <Child key="0">
                  <div>
              ▾ <Child key="1">
                  <div>
              ▾ <Child key="2">
                  <div>
        [root]
          ▾ <Parent key="B">
            ▾ <div>
              ▾ <Child key="0">
                  <div>
              ▾ <Child key="1">
                  <div>
      `);
      act(() => {
        ReactDOM.render(
          React.createElement(Parent, {
            key: 'A',
            count: 4,
          }),
          containerA,
        );
        ReactDOM.render(
          React.createElement(Parent, {
            key: 'B',
            count: 1,
          }),
          containerB,
        );
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Parent key="A">
            ▾ <div>
              ▾ <Child key="0">
                  <div>
              ▾ <Child key="1">
                  <div>
              ▾ <Child key="2">
                  <div>
              ▾ <Child key="3">
                  <div>
        [root]
          ▾ <Parent key="B">
            ▾ <div>
              ▾ <Child key="0">
                  <div>
      `);
      act(() => ReactDOM.unmountComponentAtNode(containerB));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Parent key="A">
            ▾ <div>
              ▾ <Child key="0">
                  <div>
              ▾ <Child key="1">
                  <div>
              ▾ <Child key="2">
                  <div>
              ▾ <Child key="3">
                  <div>
      `);
      act(() => ReactDOM.unmountComponentAtNode(containerA));
      expect(store).toMatchInlineSnapshot(``);
    });
    it('should not filter DOM nodes from the store tree', () => {
      const Grandparent = ({flip}) =>
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            null,
            React.createElement(Parent, {
              flip: flip,
            }),
          ),
          React.createElement(Parent, {
            flip: flip,
          }),
          React.createElement(Nothing, null),
        );
      const Parent = ({flip}) =>
        React.createElement(
          'div',
          null,
          flip ? 'foo' : null,
          React.createElement(Child, null),
          flip && [null, 'hello', 42],
          flip ? 'bar' : 'baz',
        );
      const Child = () => React.createElement('div', null, 'Hi!');
      const Nothing = () => null;
      const container = document.createElement('div');
      act(() =>
        ReactDOM.render(
          React.createElement(Grandparent, {
            count: 4,
            flip: false,
          }),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▾ <div>
                ▾ <Parent>
                  ▾ <div>
                    ▾ <Child>
                        <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child>
                      <div>
                <Nothing>
      `);
      act(() =>
        ReactDOM.render(
          React.createElement(Grandparent, {
            count: 4,
            flip: true,
          }),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▾ <div>
                ▾ <Parent>
                  ▾ <div>
                    ▾ <Child>
                        <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child>
                      <div>
                <Nothing>
      `);
      act(() => ReactDOM.unmountComponentAtNode(container));
      expect(store).toMatchInlineSnapshot(``);
    });
    it('should support collapsing parts of the tree', () => {
      const Grandparent = ({count}) =>
        React.createElement(
          'div',
          null,
          React.createElement(Parent, {
            count: count,
          }),
          React.createElement(Parent, {
            count: count,
          }),
        );
      const Parent = ({count}) =>
        React.createElement(
          'div',
          null,
          new Array(count).fill(true).map((_, index) =>
            React.createElement(Child, {
              key: index,
            }),
          ),
        );
      const Child = () => React.createElement('div', null, 'Hi!');
      act(() =>
        ReactDOM.render(
          React.createElement(Grandparent, {
            count: 2,
          }),
          document.createElement('div'),
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child key="0">
                      <div>
                  ▾ <Child key="1">
                      <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child key="0">
                      <div>
                  ▾ <Child key="1">
                      <div>
      `);
      const grandparentID = store.getElementIDAtIndex(0);
      const parentOneID = store.getElementIDAtIndex(2);
      const parentTwoID = store.getElementIDAtIndex(8);
      act(() => store.toggleIsCollapsed(parentOneID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▸ <Parent>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child key="0">
                      <div>
                  ▾ <Child key="1">
                      <div>
      `);
      act(() => store.toggleIsCollapsed(parentTwoID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▸ <Parent>
              ▸ <Parent>
      `);
      act(() => store.toggleIsCollapsed(parentOneID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child key="0">
                      <div>
                  ▾ <Child key="1">
                      <div>
              ▸ <Parent>
      `);
      act(() => store.toggleIsCollapsed(grandparentID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Grandparent>
      `);
      act(() => store.toggleIsCollapsed(grandparentID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▾ <Parent>
                ▾ <div>
                  ▾ <Child key="0">
                      <div>
                  ▾ <Child key="1">
                      <div>
              ▸ <Parent>
      `);
    });
    it('should support adding and removing children', () => {
      const Root = ({children}) => React.createElement('div', null, children);
      const Component = () => React.createElement('div', null);
      const container = document.createElement('div');
      act(() =>
        ReactDOM.render(
          React.createElement(
            Root,
            null,
            React.createElement(Component, {
              key: 'a',
            }),
          ),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <div>
              ▾ <Component key="a">
                  <div>
      `);
      act(() =>
        ReactDOM.render(
          React.createElement(
            Root,
            null,
            React.createElement(Component, {
              key: 'a',
            }),
            React.createElement(Component, {
              key: 'b',
            }),
          ),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <div>
              ▾ <Component key="a">
                  <div>
              ▾ <Component key="b">
                  <div>
      `);
      act(() =>
        ReactDOM.render(
          React.createElement(
            Root,
            null,
            React.createElement(Component, {
              key: 'b',
            }),
          ),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <div>
              ▾ <Component key="b">
                  <div>
      `);
    });
    it('should support reordering of children', () => {
      const Root = ({children}) => React.createElement('div', null, children);
      const Component = () => React.createElement('div', null);
      const Foo = () =>
        React.createElement('div', null, [
          React.createElement(Component, {
            key: '0',
          }),
        ]);
      const Bar = () =>
        React.createElement('div', null, [
          React.createElement(Component, {
            key: '0',
          }),
          React.createElement(Component, {
            key: '1',
          }),
        ]);
      const foo = React.createElement(Foo, {
        key: 'foo',
      });
      const bar = React.createElement(Bar, {
        key: 'bar',
      });
      const container = document.createElement('div');
      act(() =>
        ReactDOM.render(React.createElement(Root, null, [foo, bar]), container),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <div>
              ▾ <Foo key="foo">
                ▾ <div>
                  ▾ <Component key="0">
                      <div>
              ▾ <Bar key="bar">
                ▾ <div>
                  ▾ <Component key="0">
                      <div>
                  ▾ <Component key="1">
                      <div>
      `);
      act(() =>
        ReactDOM.render(React.createElement(Root, null, [bar, foo]), container),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <div>
              ▾ <Bar key="bar">
                ▾ <div>
                  ▾ <Component key="0">
                      <div>
                  ▾ <Component key="1">
                      <div>
              ▾ <Foo key="foo">
                ▾ <div>
                  ▾ <Component key="0">
                      <div>
      `);
      act(() => store.toggleIsCollapsed(store.getElementIDAtIndex(0), true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Root>
      `);
      act(() => store.toggleIsCollapsed(store.getElementIDAtIndex(0), false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <div>
              ▾ <Bar key="bar">
                ▾ <div>
                  ▾ <Component key="0">
                      <div>
                  ▾ <Component key="1">
                      <div>
              ▾ <Foo key="foo">
                ▾ <div>
                  ▾ <Component key="0">
                      <div>
      `);
    });
  });
  describe('collapseNodesByDefault:true', () => {
    beforeEach(() => {
      store.collapseNodesByDefault = true;
    });
    it('should support mount and update operations', () => {
      const Parent = ({count}) =>
        React.createElement(
          'div',
          null,
          new Array(count).fill(true).map((_, index) =>
            React.createElement(Child, {
              key: index,
            }),
          ),
        );
      const Child = () => React.createElement('div', null, 'Hi!');
      const container = document.createElement('div');
      act(() =>
        ReactDOM.render(
          React.createElement(
            'div',
            null,
            React.createElement(Parent, {
              count: 1,
            }),
            React.createElement(Parent, {
              count: 3,
            }),
          ),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <div>
      `);
      act(() =>
        ReactDOM.render(
          React.createElement(
            'div',
            null,
            React.createElement(Parent, {
              count: 2,
            }),
            React.createElement(Parent, {
              count: 1,
            }),
          ),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <div>
      `);
      act(() => ReactDOM.unmountComponentAtNode(container));
      expect(store).toMatchInlineSnapshot(``);
    });
    it('should support mount and update operations for multiple roots', () => {
      const Parent = ({count}) =>
        React.createElement(
          'div',
          null,
          new Array(count).fill(true).map((_, index) =>
            React.createElement(Child, {
              key: index,
            }),
          ),
        );
      const Child = () => React.createElement('div', null, 'Hi!');
      const containerA = document.createElement('div');
      const containerB = document.createElement('div');
      act(() => {
        ReactDOM.render(
          React.createElement(Parent, {
            key: 'A',
            count: 3,
          }),
          containerA,
        );
        ReactDOM.render(
          React.createElement(Parent, {
            key: 'B',
            count: 2,
          }),
          containerB,
        );
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent key="A">
        [root]
          ▸ <Parent key="B">
      `);
      act(() => {
        ReactDOM.render(
          React.createElement(Parent, {
            key: 'A',
            count: 4,
          }),
          containerA,
        );
        ReactDOM.render(
          React.createElement(Parent, {
            key: 'B',
            count: 1,
          }),
          containerB,
        );
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent key="A">
        [root]
          ▸ <Parent key="B">
      `);
      act(() => ReactDOM.unmountComponentAtNode(containerB));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent key="A">
      `);
      act(() => ReactDOM.unmountComponentAtNode(containerA));
      expect(store).toMatchInlineSnapshot(``);
    });
    it('should not filter DOM nodes from the store tree', () => {
      const Grandparent = ({flip}) =>
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            null,
            React.createElement(Parent, {
              flip: flip,
            }),
          ),
          React.createElement(Parent, {
            flip: flip,
          }),
          React.createElement(Nothing, null),
        );
      const Parent = ({flip}) =>
        React.createElement(
          'div',
          null,
          flip ? 'foo' : null,
          React.createElement(Child, null),
          flip && [null, 'hello', 42],
          flip ? 'bar' : 'baz',
        );
      const Child = () => React.createElement('div', null, 'Hi!');
      const Nothing = () => null;
      const container = document.createElement('div');
      act(() =>
        ReactDOM.render(
          React.createElement(Grandparent, {
            count: 4,
            flip: false,
          }),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Grandparent>
      `);
      act(() => store.toggleIsCollapsed(store.getElementIDAtIndex(0), false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▸ <div>
      `);
      act(() => store.toggleIsCollapsed(store.getElementIDAtIndex(1), false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▸ <div>
              ▸ <Parent>
                <Nothing>
      `);
      act(() =>
        ReactDOM.render(
          React.createElement(Grandparent, {
            count: 4,
            flip: true,
          }),
          container,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▸ <div>
              ▸ <Parent>
                <Nothing>
      `);
      act(() => ReactDOM.unmountComponentAtNode(container));
      expect(store).toMatchInlineSnapshot(``);
    });
    it('should support expanding parts of the tree', () => {
      const Grandparent = ({count}) =>
        React.createElement(
          'div',
          null,
          React.createElement(Parent, {
            count: count,
          }),
          React.createElement(Parent, {
            count: count,
          }),
        );
      const Parent = ({count}) =>
        React.createElement(
          'div',
          null,
          new Array(count).fill(true).map((_, index) =>
            React.createElement(Child, {
              key: index,
            }),
          ),
        );
      const Child = () => React.createElement('div', null, 'Hi!');
      act(() =>
        ReactDOM.render(
          React.createElement(Grandparent, {
            count: 2,
          }),
          document.createElement('div'),
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Grandparent>
      `);
      const grandparentID = store.getElementIDAtIndex(0);
      act(() => store.toggleIsCollapsed(grandparentID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▸ <div>
      `);
      const parentDivID = store.getElementIDAtIndex(1);
      act(() => store.toggleIsCollapsed(parentDivID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▸ <Parent>
              ▸ <Parent>
      `);
      const parentOneID = store.getElementIDAtIndex(2);
      const parentTwoID = store.getElementIDAtIndex(3);
      act(() => store.toggleIsCollapsed(parentOneID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▾ <Parent>
                ▸ <div>
              ▸ <Parent>
      `);
      act(() => store.toggleIsCollapsed(parentTwoID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▾ <Parent>
                ▸ <div>
              ▾ <Parent>
                ▸ <div>
      `);
      act(() => store.toggleIsCollapsed(parentOneID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▸ <Parent>
              ▾ <Parent>
                ▸ <div>
      `);
      act(() => store.toggleIsCollapsed(parentTwoID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <div>
              ▸ <Parent>
              ▸ <Parent>
      `);
      act(() => store.toggleIsCollapsed(grandparentID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Grandparent>
      `);
    });

    it('should support reordering of children', () => {
      const Root = ({children}) => React.createElement('div', null, children);
      const Component = () => React.createElement('div', null);
      const Foo = () =>
        React.createElement('div', null, [
          React.createElement(Component, {
            key: '0',
          }),
        ]);
      const Bar = () =>
        React.createElement('div', null, [
          React.createElement(Component, {
            key: '0',
          }),
          React.createElement(Component, {
            key: '1',
          }),
        ]);
      const foo = React.createElement(Foo, {
        key: 'foo',
      });
      const bar = React.createElement(Bar, {
        key: 'bar',
      });
      const container = document.createElement('div');
      act(() =>
        ReactDOM.render(React.createElement(Root, null, [foo, bar]), container),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Root>
      `);
      act(() =>
        ReactDOM.render(React.createElement(Root, null, [bar, foo]), container),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Root>
      `);
      act(() => store.toggleIsCollapsed(store.getElementIDAtIndex(0), false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▸ <div>
      `);
      act(() => store.toggleIsCollapsed(store.getElementIDAtIndex(1), false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <div>
              ▸ <Bar key="bar">
              ▸ <Foo key="foo">
      `);
      act(() => {
        store.toggleIsCollapsed(store.getElementIDAtIndex(3), false);
        store.toggleIsCollapsed(store.getElementIDAtIndex(2), false);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <div>
              ▾ <Bar key="bar">
                ▸ <div>
              ▾ <Foo key="foo">
                ▸ <div>
      `);
      act(() => store.toggleIsCollapsed(store.getElementIDAtIndex(0), true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Root>
      `);
    });
  });
  describe('StrictMode compliance', () => {
    it('should mark all elements as strict mode compliant', () => {
      const App = () => null;
      const container = document.createElement('div');
      act(() => ReactDOM.render(React.createElement(App, null), container));
      expect(store.getElementAtIndex(0).isStrictModeNonCompliant).toBe(false);
    });
  });
});
