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
let act;
let waitForAll;
let waitFor;
let assertLog;
let waitForPaint;

describe('ReactIncrementalScheduling', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    assertLog = InternalTestUtils.assertLog;
    waitForPaint = InternalTestUtils.waitForPaint;
  });

  it('schedules and flushes deferred work', async () => {
    ReactNoop.render(<span prop="1" />);
    expect(ReactNoop).toMatchRenderedOutput(null);

    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="1" />);
  });

  it('searches for work on other roots once the current root completes', async () => {
    ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:1" />, 'c');

    await waitForAll([]);

    expect(ReactNoop.getChildrenAsJSX('a')).toEqual(<span prop="a:1" />);
    expect(ReactNoop.getChildrenAsJSX('b')).toEqual(<span prop="b:1" />);
    expect(ReactNoop.getChildrenAsJSX('c')).toEqual(<span prop="c:1" />);
  });

  it('schedules top-level updates in order of priority', async () => {
    // Initial render.
    ReactNoop.render(<span prop={1} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop={1} />);

    ReactNoop.batchedUpdates(() => {
      ReactNoop.render(<span prop={5} />);
      ReactNoop.flushSync(() => {
        ReactNoop.render(<span prop={2} />);
        ReactNoop.render(<span prop={3} />);
        ReactNoop.render(<span prop={4} />);
      });
    });
    // The sync updates flush first.
    expect(ReactNoop).toMatchRenderedOutput(<span prop={4} />);

    // The terminal value should be the last update that was scheduled,
    // regardless of priority. In this case, that's the last sync update.
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop={4} />);
  });

  it('schedules top-level updates with same priority in order of insertion', async () => {
    // Initial render.
    ReactNoop.render(<span prop={1} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop={1} />);

    ReactNoop.render(<span prop={2} />);
    ReactNoop.render(<span prop={3} />);
    ReactNoop.render(<span prop={4} />);
    ReactNoop.render(<span prop={5} />);

    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop={5} />);
  });

  it('works on deferred roots in the order they were scheduled', async () => {
    const {useEffect} = React;
    function Text({text}) {
      useEffect(() => {
        Scheduler.log(text);
      }, [text]);
      return text;
    }

    await act(() => {
      ReactNoop.renderToRootWithID(<Text text="a:1" />, 'a');
      ReactNoop.renderToRootWithID(<Text text="b:1" />, 'b');
      ReactNoop.renderToRootWithID(<Text text="c:1" />, 'c');
    });
    assertLog(['a:1', 'b:1', 'c:1']);

    expect(ReactNoop.getChildrenAsJSX('a')).toEqual('a:1');
    expect(ReactNoop.getChildrenAsJSX('b')).toEqual('b:1');
    expect(ReactNoop.getChildrenAsJSX('c')).toEqual('c:1');

    // Schedule deferred work in the reverse order
    await act(async () => {
      React.startTransition(() => {
        ReactNoop.renderToRootWithID(<Text text="c:2" />, 'c');
        ReactNoop.renderToRootWithID(<Text text="b:2" />, 'b');
      });
      // Ensure it starts in the order it was scheduled
      await waitFor(['c:2']);

      expect(ReactNoop.getChildrenAsJSX('a')).toEqual('a:1');
      expect(ReactNoop.getChildrenAsJSX('b')).toEqual('b:1');
      expect(ReactNoop.getChildrenAsJSX('c')).toEqual('c:2');
      // Schedule last bit of work, it will get processed the last

      React.startTransition(() => {
        ReactNoop.renderToRootWithID(<Text text="a:2" />, 'a');
      });

      // Keep performing work in the order it was scheduled
      await waitFor(['b:2']);
      expect(ReactNoop.getChildrenAsJSX('a')).toEqual('a:1');
      expect(ReactNoop.getChildrenAsJSX('b')).toEqual('b:2');
      expect(ReactNoop.getChildrenAsJSX('c')).toEqual('c:2');

      await waitFor(['a:2']);
      expect(ReactNoop.getChildrenAsJSX('a')).toEqual('a:2');
      expect(ReactNoop.getChildrenAsJSX('b')).toEqual('b:2');
      expect(ReactNoop.getChildrenAsJSX('c')).toEqual('c:2');
    });
  });

  it('schedules sync updates when inside componentDidMount/Update', async () => {
    let instance;

    class Foo extends React.Component {
      state = {tick: 0};

      componentDidMount() {
        Scheduler.log(
          'componentDidMount (before setState): ' + this.state.tick,
        );
        this.setState({tick: 1});
        // We're in a batch. Update hasn't flushed yet.
        Scheduler.log('componentDidMount (after setState): ' + this.state.tick);
      }

      componentDidUpdate() {
        Scheduler.log('componentDidUpdate: ' + this.state.tick);
        if (this.state.tick === 2) {
          Scheduler.log(
            'componentDidUpdate (before setState): ' + this.state.tick,
          );
          this.setState({tick: 3});
          Scheduler.log(
            'componentDidUpdate (after setState): ' + this.state.tick,
          );
          // We're in a batch. Update hasn't flushed yet.
        }
      }

      render() {
        Scheduler.log('render: ' + this.state.tick);
        instance = this;
        return <span prop={this.state.tick} />;
      }
    }

    React.startTransition(() => {
      ReactNoop.render(<Foo />);
    });
    // Render without committing
    await waitFor(['render: 0']);

    // Do one more unit of work to commit
    expect(ReactNoop.flushNextYield()).toEqual([
      'componentDidMount (before setState): 0',
      'componentDidMount (after setState): 0',
      // If the setState inside componentDidMount were deferred, there would be
      // no more ops. Because it has Task priority, we get these ops, too:
      'render: 1',
      'componentDidUpdate: 1',
    ]);

    React.startTransition(() => {
      instance.setState({tick: 2});
    });
    await waitFor(['render: 2']);
    expect(ReactNoop.flushNextYield()).toEqual([
      'componentDidUpdate: 2',
      'componentDidUpdate (before setState): 2',
      'componentDidUpdate (after setState): 2',
      // If the setState inside componentDidUpdate were deferred, there would be
      // no more ops. Because it has Task priority, we get these ops, too:
      'render: 3',
      'componentDidUpdate: 3',
    ]);
  });

  it('can opt-in to async scheduling inside componentDidMount/Update', async () => {
    let instance;
    class Foo extends React.Component {
      state = {tick: 0};

      componentDidMount() {
        React.startTransition(() => {
          Scheduler.log(
            'componentDidMount (before setState): ' + this.state.tick,
          );
          this.setState({tick: 1});
          Scheduler.log(
            'componentDidMount (after setState): ' + this.state.tick,
          );
        });
      }

      componentDidUpdate() {
        React.startTransition(() => {
          Scheduler.log('componentDidUpdate: ' + this.state.tick);
          if (this.state.tick === 2) {
            Scheduler.log(
              'componentDidUpdate (before setState): ' + this.state.tick,
            );
            this.setState({tick: 3});
            Scheduler.log(
              'componentDidUpdate (after setState): ' + this.state.tick,
            );
          }
        });
      }

      render() {
        Scheduler.log('render: ' + this.state.tick);
        instance = this;
        return <span prop={this.state.tick} />;
      }
    }

    ReactNoop.flushSync(() => {
      ReactNoop.render(<Foo />);
    });
    // The cDM update should not have flushed yet because it has async priority.
    assertLog([
      'render: 0',
      'componentDidMount (before setState): 0',
      'componentDidMount (after setState): 0',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop={0} />);

    // Now flush the cDM update.
    await waitForAll(['render: 1', 'componentDidUpdate: 1']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop={1} />);

    React.startTransition(() => {
      instance.setState({tick: 2});
    });

    await waitForPaint([
      'render: 2',
      'componentDidUpdate: 2',
      'componentDidUpdate (before setState): 2',
      'componentDidUpdate (after setState): 2',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop={2} />);

    // Now flush the cDU update.
    await waitForAll(['render: 3', 'componentDidUpdate: 3']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop={3} />);
  });

  it('performs Task work even after time runs out', async () => {
    class Foo extends React.Component {
      state = {step: 1};
      componentDidMount() {
        this.setState({step: 2}, () => {
          this.setState({step: 3}, () => {
            this.setState({step: 4}, () => {
              this.setState({step: 5});
            });
          });
        });
      }
      render() {
        Scheduler.log('Foo');
        return <span prop={this.state.step} />;
      }
    }
    React.startTransition(() => {
      ReactNoop.render(<Foo />);
    });

    // This should be just enough to complete all the work, but not enough to
    // commit it.
    await waitFor(['Foo']);
    expect(ReactNoop).toMatchRenderedOutput(null);

    // Do one more unit of work.
    ReactNoop.flushNextYield();
    // The updates should all be flushed with Task priority
    expect(ReactNoop).toMatchRenderedOutput(<span prop={5} />);
  });
});
