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
let ReactTestRenderer;
let Scheduler;
let waitForAll;
let waitFor;

describe('ReactTestRendererAsync', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactTestRenderer = require('react-test-renderer');
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
  });

  it('flushAll flushes all work', async () => {
    function Foo(props) {
      return props.children;
    }
    const renderer = ReactTestRenderer.create(<Foo>Hi</Foo>, {
      unstable_isConcurrent: true,
    });

    // Before flushing, nothing has mounted.
    expect(renderer.toJSON()).toEqual(null);

    // Flush initial mount.
    await waitForAll([]);
    expect(renderer.toJSON()).toEqual('Hi');

    // Update
    renderer.update(<Foo>Bye</Foo>);
    // Not yet updated.
    expect(renderer.toJSON()).toEqual('Hi');
    // Flush update.
    await waitForAll([]);
    expect(renderer.toJSON()).toEqual('Bye');
  });

  it('flushAll returns array of yielded values', async () => {
    function Child(props) {
      Scheduler.log(props.children);
      return props.children;
    }
    function Parent(props) {
      return (
        <>
          <Child>{'A:' + props.step}</Child>
          <Child>{'B:' + props.step}</Child>
          <Child>{'C:' + props.step}</Child>
        </>
      );
    }
    const renderer = ReactTestRenderer.create(<Parent step={1} />, {
      unstable_isConcurrent: true,
    });

    await waitForAll(['A:1', 'B:1', 'C:1']);
    expect(renderer.toJSON()).toEqual(['A:1', 'B:1', 'C:1']);

    renderer.update(<Parent step={2} />);
    await waitForAll(['A:2', 'B:2', 'C:2']);
    expect(renderer.toJSON()).toEqual(['A:2', 'B:2', 'C:2']);
  });

  it('flushThrough flushes until the expected values is yielded', async () => {
    function Child(props) {
      Scheduler.log(props.children);
      return props.children;
    }
    function Parent(props) {
      return (
        <>
          <Child>{'A:' + props.step}</Child>
          <Child>{'B:' + props.step}</Child>
          <Child>{'C:' + props.step}</Child>
        </>
      );
    }

    let renderer;
    React.startTransition(() => {
      renderer = ReactTestRenderer.create(<Parent step={1} />, {
        unstable_isConcurrent: true,
      });
    });

    // Flush the first two siblings
    await waitFor(['A:1', 'B:1']);
    // Did not commit yet.
    expect(renderer.toJSON()).toEqual(null);

    // Flush the remaining work
    await waitForAll(['C:1']);
    expect(renderer.toJSON()).toEqual(['A:1', 'B:1', 'C:1']);
  });

  it('supports high priority interruptions', async () => {
    function Child(props) {
      Scheduler.log(props.children);
      return props.children;
    }

    class Example extends React.Component {
      componentDidMount() {
        expect(this.props.step).toEqual(2);
      }
      componentDidUpdate() {
        throw Error('Unexpected update');
      }
      render() {
        return (
          <>
            <Child>{'A:' + this.props.step}</Child>
            <Child>{'B:' + this.props.step}</Child>
          </>
        );
      }
    }

    let renderer;
    React.startTransition(() => {
      renderer = ReactTestRenderer.create(<Example step={1} />, {
        unstable_isConcurrent: true,
      });
    });

    // Flush the some of the changes, but don't commit
    await waitFor(['A:1']);
    expect(renderer.toJSON()).toEqual(null);

    // Interrupt with higher priority properties
    renderer.unstable_flushSync(() => {
      renderer.update(<Example step={2} />);
    });

    // Only the higher priority properties have been committed
    expect(renderer.toJSON()).toEqual(['A:2', 'B:2']);
  });
});
