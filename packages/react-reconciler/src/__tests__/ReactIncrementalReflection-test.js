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
let ReactNoop;
let Scheduler;
let waitFor;
let waitForAll;

describe('ReactIncrementalReflection', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitFor = InternalTestUtils.waitFor;
    waitForAll = InternalTestUtils.waitForAll;
  });

  function div(...children) {
    children = children.map(c =>
      typeof c === 'string' ? {text: c, hidden: false} : c,
    );
    return {type: 'div', children, prop: undefined, hidden: false};
  }

  function span(prop) {
    return {type: 'span', children: [], prop, hidden: false};
  }

  it('finds no node before insertion and correct node before deletion', async () => {
    let classInstance = null;

    function findInstance(inst) {
      // We ignore warnings fired by findInstance because we are testing
      // that the actual behavior still works as expected even though it
      // is deprecated.
      const oldConsoleError = console.error;
      console.error = jest.fn();
      try {
        return ReactNoop.findInstance(inst);
      } finally {
        console.error = oldConsoleError;
      }
    }

    class Component extends React.Component {
      UNSAFE_componentWillMount() {
        classInstance = this;
        Scheduler.log(['componentWillMount', findInstance(this)]);
      }
      componentDidMount() {
        Scheduler.log(['componentDidMount', findInstance(this)]);
      }
      UNSAFE_componentWillUpdate() {
        Scheduler.log(['componentWillUpdate', findInstance(this)]);
      }
      componentDidUpdate() {
        Scheduler.log(['componentDidUpdate', findInstance(this)]);
      }
      componentWillUnmount() {
        Scheduler.log(['componentWillUnmount', findInstance(this)]);
      }
      render() {
        Scheduler.log('render');
        return this.props.step < 2 ? (
          <span ref={ref => (this.span = ref)} />
        ) : this.props.step === 2 ? (
          <div ref={ref => (this.div = ref)} />
        ) : this.props.step === 3 ? null : this.props.step === 4 ? (
          <div ref={ref => (this.span = ref)} />
        ) : null;
      }
    }

    function Sibling() {
      // Sibling is used to assert that we've rendered past the first component.
      Scheduler.log('render sibling');
      return <span />;
    }

    function Foo(props) {
      return [<Component key="a" step={props.step} />, <Sibling key="b" />];
    }

    React.startTransition(() => {
      ReactNoop.render(<Foo step={0} />);
    });
    // Flush past Component but don't complete rendering everything yet.
    await waitFor([['componentWillMount', null], 'render', 'render sibling']);

    expect(classInstance).toBeDefined();
    // The instance has been complete but is still not committed so it should
    // not find any host nodes in it.
    expect(findInstance(classInstance)).toBe(null);

    await waitForAll([['componentDidMount', span()]]);

    const hostSpan = classInstance.span;
    expect(hostSpan).toBeDefined();

    expect(findInstance(classInstance)).toBe(hostSpan);

    // Flush next step which will cause an update but not yet render a new host
    // node.
    ReactNoop.render(<Foo step={1} />);
    await waitForAll([
      ['componentWillUpdate', hostSpan],
      'render',
      'render sibling',
      ['componentDidUpdate', hostSpan],
    ]);

    expect(ReactNoop.findInstance(classInstance)).toBe(hostSpan);

    // The next step will render a new host node but won't get committed yet.
    // We expect this to mutate the original Fiber.
    React.startTransition(() => {
      ReactNoop.render(<Foo step={2} />);
    });
    await waitFor([
      ['componentWillUpdate', hostSpan],
      'render',
      'render sibling',
    ]);

    // This should still be the host span.
    expect(ReactNoop.findInstance(classInstance)).toBe(hostSpan);

    // When we finally flush the tree it will get committed.
    await waitForAll([['componentDidUpdate', div()]]);

    const hostDiv = classInstance.div;
    expect(hostDiv).toBeDefined();
    expect(hostSpan).not.toBe(hostDiv);

    // We should now find the new host node.
    expect(ReactNoop.findInstance(classInstance)).toBe(hostDiv);

    // Render to null but don't commit it yet.
    React.startTransition(() => {
      ReactNoop.render(<Foo step={3} />);
    });
    await waitFor([
      ['componentWillUpdate', hostDiv],
      'render',
      'render sibling',
    ]);

    // This should still be the host div since the deletion is not committed.
    expect(ReactNoop.findInstance(classInstance)).toBe(hostDiv);

    await waitForAll([['componentDidUpdate', null]]);

    // This should still be the host div since the deletion is not committed.
    expect(ReactNoop.findInstance(classInstance)).toBe(null);

    // Render a div again
    ReactNoop.render(<Foo step={4} />);
    await waitForAll([
      ['componentWillUpdate', null],
      'render',
      'render sibling',
      ['componentDidUpdate', div()],
    ]);

    // Unmount the component.
    ReactNoop.render([]);
    await waitForAll([['componentWillUnmount', hostDiv]]);
  });
});
