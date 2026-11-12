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

let PropTypes;
let React;
let ReactNoop;
let Scheduler;
let act;
let assertLog;
let waitForAll;
let waitFor;
let waitForThrow;
let assertConsoleErrorDev;

describe('ReactIncrementalErrorHandling', () => {
  beforeEach(() => {
    jest.resetModules();
    PropTypes = require('prop-types');
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForThrow = InternalTestUtils.waitForThrow;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function normalizeCodeLocInfo(str) {
    return (
      str &&
      str.replace(/\n +(?:at|in) ([\S]+)[^\n]*/g, function (m, name) {
        return '\n    in ' + name + ' (at **)';
      })
    );
  }

  // Note: This is based on a similar component we use in www. We can delete
  // once the extra div wrapper is no longer necessary.
  function LegacyHiddenDiv({children, mode}) {
    return (
      <div hidden={mode === 'hidden'}>
        <React.unstable_LegacyHidden
          mode={mode === 'hidden' ? 'unstable-defer-without-hiding' : mode}>
          {children}
        </React.unstable_LegacyHidden>
      </div>
    );
  }

  it('recovers from errors asynchronously', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        Scheduler.log('getDerivedStateFromError');
        return {error};
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary (catch)');
          return <ErrorMessage error={this.state.error} />;
        }
        Scheduler.log('ErrorBoundary (try)');
        return this.props.children;
      }
    }

    function ErrorMessage({error}) {
      Scheduler.log('ErrorMessage');
      return <span prop={`Caught an error: ${error.message}`} />;
    }

    function Indirection({children}) {
      Scheduler.log('Indirection');
      return children || null;
    }

    function BadRender({unused}) {
      Scheduler.log('throw');
      throw new Error('oops!');
    }

    React.startTransition(() => {
      ReactNoop.render(
        <>
          <ErrorBoundary>
            <Indirection>
              <Indirection>
                <Indirection>
                  <BadRender />
                </Indirection>
              </Indirection>
            </Indirection>
          </ErrorBoundary>
          <Indirection />
          <Indirection />
        </>,
      );
    });

    // Start rendering asynchronously
    await waitFor([
      'ErrorBoundary (try)',
      'Indirection',
      'Indirection',
      'Indirection',
      // An error is thrown. React keeps rendering asynchronously.
      'throw',

      // Call getDerivedStateFromError and re-render the error boundary, this
      // time rendering an error message.
      'getDerivedStateFromError',
      'ErrorBoundary (catch)',
      'ErrorMessage',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(null);

    // The work loop unwound to the nearest error boundary. Continue rendering
    // asynchronously.
    await waitFor(['Indirection']);

    // Since the error was thrown during an async render, React won't commit the
    // result yet. After render we render the last child, React will attempt to
    // render again, synchronously, just in case that happens to fix the error
    // (i.e. as in the case of a data race). Flush just one more unit of work to
    // demonstrate that this render is synchronous.
    expect(ReactNoop.flushNextYield()).toEqual([
      'Indirection',

      'ErrorBoundary (try)',
      'Indirection',
      'Indirection',
      'Indirection',

      // The error was thrown again. This time, React will actually commit
      // the result.
      'throw',
      'getDerivedStateFromError',
      'ErrorBoundary (catch)',
      'ErrorMessage',
      'Indirection',
      'Indirection',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: oops!" />,
    );
  });

  it('recovers from errors asynchronously (legacy, no getDerivedStateFromError)', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        Scheduler.log('componentDidCatch');
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary (catch)');
          return <ErrorMessage error={this.state.error} />;
        }
        Scheduler.log('ErrorBoundary (try)');
        return this.props.children;
      }
    }

    function ErrorMessage({error}) {
      Scheduler.log('ErrorMessage');
      return <span prop={`Caught an error: ${error.message}`} />;
    }

    function Indirection({children}) {
      Scheduler.log('Indirection');
      return children || null;
    }

    function BadRender({unused}) {
      Scheduler.log('throw');
      throw new Error('oops!');
    }

    React.startTransition(() => {
      ReactNoop.render(
        <>
          <ErrorBoundary>
            <Indirection>
              <Indirection>
                <Indirection>
                  <BadRender />
                </Indirection>
              </Indirection>
            </Indirection>
          </ErrorBoundary>
          <Indirection />
          <Indirection />
        </>,
      );
    });

    // Start rendering asynchronously
    await waitFor([
      'ErrorBoundary (try)',
      'Indirection',
      'Indirection',
      'Indirection',
      // An error is thrown. React keeps rendering asynchronously.
      'throw',
    ]);

    // Still rendering async...
    await waitFor(['Indirection']);

    await waitFor([
      'Indirection',
      // Now that the tree is complete, and there's no remaining work, React
      // reverts to legacy mode to retry one more time before handling the error.

      'ErrorBoundary (try)',
      'Indirection',
      'Indirection',
      'Indirection',

      // The error was thrown again. Now we can handle it.
      'throw',
      'Indirection',
      'Indirection',
      'componentDidCatch',
      'ErrorBoundary (catch)',
      'ErrorMessage',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: oops!" />,
    );
  });

  it("retries at a lower priority if there's additional pending work", async () => {
    function App(props) {
      if (props.isBroken) {
        Scheduler.log('error');
        throw new Error('Oops!');
      }
      Scheduler.log('success');
      return <span prop="Everything is fine." />;
    }

    function onCommit() {
      Scheduler.log('commit');
    }

    React.startTransition(() => {
      ReactNoop.render(<App isBroken={true} />, onCommit);
    });
    await waitFor(['error']);

    React.startTransition(() => {
      // This update is in a separate batch
      ReactNoop.render(<App isBroken={false} />, onCommit);
    });

    // React will try to recover by rendering all the pending updates in a
    // single batch, synchronously. This time it succeeds.
    //
    // This tells Scheduler to render a single unit of work. Because the render
    // to recover from the error is synchronous, this should be enough to
    // finish the rest of the work.
    Scheduler.unstable_flushNumberOfYields(1);
    assertLog([
      'success',
      // Nothing commits until the second update completes.
      'commit',
      'commit',
    ]);
    assertConsoleErrorDev([
      'Error: There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.' +
        '\n    in <stack>',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Everything is fine." />,
    );
  });

  // @gate enableLegacyHidden
  it('does not include offscreen work when retrying after an error', async () => {
    function App(props) {
      if (props.isBroken) {
        Scheduler.log('error');
        throw new Error('Oops!');
      }
      Scheduler.log('success');
      return (
        <>
          Everything is fine
          <LegacyHiddenDiv mode="hidden">
            <div>Offscreen content</div>
          </LegacyHiddenDiv>
        </>
      );
    }

    function onCommit() {
      Scheduler.log('commit');
    }

    React.startTransition(() => {
      ReactNoop.render(<App isBroken={true} />, onCommit);
    });
    await waitFor(['error']);

    expect(ReactNoop).toMatchRenderedOutput(null);

    React.startTransition(() => {
      // This update is in a separate batch
      ReactNoop.render(<App isBroken={false} />, onCommit);
    });

    // React will try to recover by rendering all the pending updates in a
    // single batch, synchronously. This time it succeeds.
    //
    // This tells Scheduler to render a single unit of work. Because the render
    // to recover from the error is synchronous, this should be enough to
    // finish the rest of the work.
    Scheduler.unstable_flushNumberOfYields(1);
    assertLog([
      'success',
      // Nothing commits until the second update completes.
      'commit',
      'commit',
    ]);
    assertConsoleErrorDev([
      'Error: There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.' +
        '\n    in <stack>',
    ]);
    // This should not include the offscreen content
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        Everything is fine
        <div hidden={true} />
      </>,
    );

    // The offscreen content finishes in a subsequent render
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        Everything is fine
        <div hidden={true}>
          <div>Offscreen content</div>
        </div>
      </>,
    );
  });

  it('retries one more time before handling error', async () => {
    function BadRender({unused}) {
      Scheduler.log('BadRender');
      throw new Error('oops');
    }

    function Sibling({unused}) {
      Scheduler.log('Sibling');
      return <span prop="Sibling" />;
    }

    function Parent({unused}) {
      Scheduler.log('Parent');
      return (
        <>
          <BadRender />
          <Sibling />
        </>
      );
    }

    React.startTransition(() => {
      ReactNoop.render(<Parent />, () => Scheduler.log('commit'));
    });

    // Render the bad component asynchronously
    await waitFor(['Parent', 'BadRender']);

    // The work loop unwound to the nearest error boundary. React will try
    // to render one more time, synchronously. Flush just one unit of work to
    // demonstrate that this render is synchronous.
    Scheduler.unstable_flushNumberOfYields(1);
    assertLog(['Parent', 'BadRender', 'commit']);
    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  it('retries one more time if an error occurs during a render that expires midway through the tree', async () => {
    function Oops({unused}) {
      Scheduler.log('Oops');
      throw new Error('Oops');
    }

    function Text({text}) {
      Scheduler.log(text);
      return text;
    }

    function App({unused}) {
      return (
        <>
          <Text text="A" />
          <Text text="B" />
          <Oops />
          <Text text="C" />
          <Text text="D" />
        </>
      );
    }

    React.startTransition(() => {
      ReactNoop.render(<App />);
    });

    // Render part of the tree
    await waitFor(['A', 'B']);

    // Expire the render midway through
    Scheduler.unstable_advanceTime(10000);

    Scheduler.unstable_flushExpired();
    ReactNoop.flushSync();

    assertLog([
      // The render expired, but we shouldn't throw out the partial work.
      // Finish the current level.
      'Oops',

      // Since the error occurred during a partially concurrent render, we should
      // retry one more time, synchronously.
      'A',
      'B',
      'Oops',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  it('calls componentDidCatch multiple times for multiple errors', async () => {
    let id = 0;
    class BadMount extends React.Component {
      componentDidMount() {
        throw new Error(`Error ${++id}`);
      }
      render() {
        Scheduler.log('BadMount');
        return null;
      }
    }

    class ErrorBoundary extends React.Component {
      state = {errorCount: 0};
      componentDidCatch(error) {
        Scheduler.log(`componentDidCatch: ${error.message}`);
        this.setState(state => ({errorCount: state.errorCount + 1}));
      }
      render() {
        if (this.state.errorCount > 0) {
          return <span prop={`Number of errors: ${this.state.errorCount}`} />;
        }
        Scheduler.log('ErrorBoundary');
        return this.props.children;
      }
    }

    ReactNoop.render(
      <ErrorBoundary>
        <BadMount />
        <BadMount />
        <BadMount />
      </ErrorBoundary>,
    );

    await waitForAll([
      'ErrorBoundary',
      'BadMount',
      'BadMount',
      'BadMount',
      'componentDidCatch: Error 1',
      'componentDidCatch: Error 2',
      'componentDidCatch: Error 3',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Number of errors: 3" />,
    );
  });

  it('catches render error in a boundary during full deferred mounting', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          return (
            <span prop={`Caught an error: ${this.state.error.message}.`} />
          );
        }
        return this.props.children;
      }
    }

    function BrokenRender(props) {
      throw new Error('Hello');
    }

    ReactNoop.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
    );
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: Hello." />,
    );
  });

  it('catches render error in a boundary during partial deferred mounting', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        Scheduler.log('ErrorBoundary componentDidCatch');
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary render error');
          return (
            <span prop={`Caught an error: ${this.state.error.message}.`} />
          );
        }
        Scheduler.log('ErrorBoundary render success');
        return this.props.children;
      }
    }

    function BrokenRender({unused}) {
      Scheduler.log('BrokenRender');
      throw new Error('Hello');
    }

    React.startTransition(() => {
      ReactNoop.render(
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });

    await waitFor(['ErrorBoundary render success']);
    expect(ReactNoop).toMatchRenderedOutput(null);

    await waitForAll([
      'BrokenRender',
      // React retries one more time
      'ErrorBoundary render success',

      // Errored again on retry. Now handle it.
      'BrokenRender',
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary render error',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: Hello." />,
    );
  });

  it('catches render error in a boundary during synchronous mounting', () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        Scheduler.log('ErrorBoundary componentDidCatch');
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary render error');
          return (
            <span prop={`Caught an error: ${this.state.error.message}.`} />
          );
        }
        Scheduler.log('ErrorBoundary render success');
        return this.props.children;
      }
    }

    function BrokenRender({unused}) {
      Scheduler.log('BrokenRender');
      throw new Error('Hello');
    }

    ReactNoop.flushSync(() => {
      ReactNoop.render(
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });

    assertLog([
      'ErrorBoundary render success',
      'BrokenRender',

      // React retries one more time
      'ErrorBoundary render success',
      'BrokenRender',

      // Errored again on retry. Now handle it.
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary render error',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: Hello." />,
    );
  });

  it('catches render error in a boundary during batched mounting', () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        Scheduler.log('ErrorBoundary componentDidCatch');
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary render error');
          return (
            <span prop={`Caught an error: ${this.state.error.message}.`} />
          );
        }
        Scheduler.log('ErrorBoundary render success');
        return this.props.children;
      }
    }

    function BrokenRender({unused}) {
      Scheduler.log('BrokenRender');
      throw new Error('Hello');
    }

    ReactNoop.flushSync(() => {
      ReactNoop.render(<ErrorBoundary>Before the storm.</ErrorBoundary>);
      ReactNoop.render(
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });

    assertLog([
      'ErrorBoundary render success',
      'BrokenRender',

      // React retries one more time
      'ErrorBoundary render success',
      'BrokenRender',

      // Errored again on retry. Now handle it.
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary render error',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: Hello." />,
    );
  });

  it('propagates an error from a noop error boundary during full deferred mounting', async () => {
    class RethrowErrorBoundary extends React.Component {
      componentDidCatch(error) {
        Scheduler.log('RethrowErrorBoundary componentDidCatch');
        throw error;
      }
      render() {
        Scheduler.log('RethrowErrorBoundary render');
        return this.props.children;
      }
    }

    function BrokenRender({unused}) {
      Scheduler.log('BrokenRender');
      throw new Error('Hello');
    }

    ReactNoop.render(
      <RethrowErrorBoundary>
        <BrokenRender />
      </RethrowErrorBoundary>,
    );

    await waitForThrow('Hello');
    assertLog([
      'RethrowErrorBoundary render',
      'BrokenRender',

      // React retries one more time
      'RethrowErrorBoundary render',
      'BrokenRender',

      // Errored again on retry. Now handle it.
      'RethrowErrorBoundary componentDidCatch',
    ]);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(null);
  });

  it('propagates an error from a noop error boundary during partial deferred mounting', async () => {
    class RethrowErrorBoundary extends React.Component {
      componentDidCatch(error) {
        Scheduler.log('RethrowErrorBoundary componentDidCatch');
        throw error;
      }
      render() {
        Scheduler.log('RethrowErrorBoundary render');
        return this.props.children;
      }
    }

    function BrokenRender({unused}) {
      Scheduler.log('BrokenRender');
      throw new Error('Hello');
    }

    React.startTransition(() => {
      ReactNoop.render(
        <RethrowErrorBoundary>
          <BrokenRender />
        </RethrowErrorBoundary>,
      );
    });

    await waitFor(['RethrowErrorBoundary render']);

    await waitForThrow('Hello');
    assertLog([
      'BrokenRender',

      // React retries one more time
      'RethrowErrorBoundary render',
      'BrokenRender',

      // Errored again on retry. Now handle it.
      'RethrowErrorBoundary componentDidCatch',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  it('propagates an error from a noop error boundary during synchronous mounting', () => {
    class RethrowErrorBoundary extends React.Component {
      componentDidCatch(error) {
        Scheduler.log('RethrowErrorBoundary componentDidCatch');
        throw error;
      }
      render() {
        Scheduler.log('RethrowErrorBoundary render');
        return this.props.children;
      }
    }

    function BrokenRender({unused}) {
      Scheduler.log('BrokenRender');
      throw new Error('Hello');
    }

    ReactNoop.flushSync(() => {
      ReactNoop.render(
        <RethrowErrorBoundary>
          <BrokenRender />
        </RethrowErrorBoundary>,
      );
    });

    assertLog([
      'RethrowErrorBoundary render',
      'BrokenRender',

      // React retries one more time
      'RethrowErrorBoundary render',
      'BrokenRender',

      // Errored again on retry. Now handle it.
      'RethrowErrorBoundary componentDidCatch',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  it('propagates an error from a noop error boundary during batched mounting', () => {
    class RethrowErrorBoundary extends React.Component {
      componentDidCatch(error) {
        Scheduler.log('RethrowErrorBoundary componentDidCatch');
        throw error;
      }
      render() {
        Scheduler.log('RethrowErrorBoundary render');
        return this.props.children;
      }
    }

    function BrokenRender({unused}) {
      Scheduler.log('BrokenRender');
      throw new Error('Hello');
    }

    ReactNoop.flushSync(() => {
      ReactNoop.render(
        <RethrowErrorBoundary>Before the storm.</RethrowErrorBoundary>,
      );
      ReactNoop.render(
        <RethrowErrorBoundary>
          <BrokenRender />
        </RethrowErrorBoundary>,
      );
    });

    assertLog([
      'RethrowErrorBoundary render',
      'BrokenRender',

      // React retries one more time
      'RethrowErrorBoundary render',
      'BrokenRender',

      // Errored again on retry. Now handle it.
      'RethrowErrorBoundary componentDidCatch',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  it('applies batched updates regardless despite errors in scheduling', async () => {
    ReactNoop.render(<span prop="a:1" />);
    expect(() => {
      ReactNoop.batchedUpdates(() => {
        ReactNoop.render(<span prop="a:2" />);
        ReactNoop.render(<span prop="a:3" />);
        throw new Error('Hello');
      });
    }).toThrow('Hello');
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="a:3" />);
  });

  it('applies nested batched updates despite errors in scheduling', async () => {
    ReactNoop.render(<span prop="a:1" />);
    expect(() => {
      ReactNoop.batchedUpdates(() => {
        ReactNoop.render(<span prop="a:2" />);
        ReactNoop.render(<span prop="a:3" />);
        ReactNoop.batchedUpdates(() => {
          ReactNoop.render(<span prop="a:4" />);
          ReactNoop.render(<span prop="a:5" />);
          throw new Error('Hello');
        });
      });
    }).toThrow('Hello');
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="a:5" />);
  });

  // TODO: Is this a breaking change?
  it('defers additional sync work to a separate event after an error', async () => {
    ReactNoop.render(<span prop="a:1" />);
    expect(() => {
      ReactNoop.flushSync(() => {
        ReactNoop.batchedUpdates(() => {
          ReactNoop.render(<span prop="a:2" />);
          ReactNoop.render(<span prop="a:3" />);
          throw new Error('Hello');
        });
      });
    }).toThrow('Hello');
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="a:3" />);
  });

  it('can schedule updates after uncaught error in render on mount', async () => {
    function BrokenRender({unused}) {
      Scheduler.log('BrokenRender');
      throw new Error('Hello');
    }

    function Foo({unused}) {
      Scheduler.log('Foo');
      return null;
    }

    ReactNoop.render(<BrokenRender />);
    await waitForThrow('Hello');
    ReactNoop.render(<Foo />);
    assertLog([
      'BrokenRender',
      // React retries one more time
      'BrokenRender',
      // Errored again on retry
    ]);
    await waitForAll(['Foo']);
  });

  it('can schedule updates after uncaught error in render on update', async () => {
    function BrokenRender({shouldThrow}) {
      Scheduler.log('BrokenRender');
      if (shouldThrow) {
        throw new Error('Hello');
      }
      return null;
    }

    function Foo({unused}) {
      Scheduler.log('Foo');
      return null;
    }

    ReactNoop.render(<BrokenRender shouldThrow={false} />);
    await waitForAll(['BrokenRender']);

    ReactNoop.render(<BrokenRender shouldThrow={true} />);
    await waitForThrow('Hello');
    assertLog([
      'BrokenRender',
      // React retries one more time
      'BrokenRender',
      // Errored again on retry
    ]);

    ReactNoop.render(<Foo />);
    await waitForAll(['Foo']);
  });

  it('can schedule updates after uncaught error during unmounting', async () => {
    class BrokenComponentWillUnmount extends React.Component {
      render() {
        return <div />;
      }
      componentWillUnmount() {
        throw new Error('Hello');
      }
    }

    function Foo() {
      Scheduler.log('Foo');
      return null;
    }

    ReactNoop.render(<BrokenComponentWillUnmount />);
    await waitForAll([]);

    ReactNoop.render(<div />);
    await waitForThrow('Hello');

    ReactNoop.render(<Foo />);
    await waitForAll(['Foo']);
  });

  it('should not attempt to recover an unmounting error boundary', async () => {
    class Parent extends React.Component {
      componentWillUnmount() {
        Scheduler.log('Parent componentWillUnmount');
      }
      render() {
        return <Boundary />;
      }
    }

    class Boundary extends React.Component {
      componentDidCatch(e) {
        Scheduler.log(`Caught error: ${e.message}`);
      }
      render() {
        return <ThrowsOnUnmount />;
      }
    }

    class ThrowsOnUnmount extends React.Component {
      componentWillUnmount() {
        Scheduler.log('ThrowsOnUnmount componentWillUnmount');
        throw new Error('unmount error');
      }
      render() {
        return null;
      }
    }

    ReactNoop.render(<Parent />);
    await waitForAll([]);

    // Because the error boundary is also unmounting,
    // an error in ThrowsOnUnmount should be rethrown.
    ReactNoop.render(null);
    await waitForThrow('unmount error');
    await assertLog([
      'Parent componentWillUnmount',
      'ThrowsOnUnmount componentWillUnmount',
    ]);

    ReactNoop.render(<Parent />);
  });

  it('can unmount an error boundary before it is handled', async () => {
    let parent;

    class Parent extends React.Component {
      state = {step: 0};
      render() {
        parent = this;
        return this.state.step === 0 ? <Boundary /> : null;
      }
    }

    class Boundary extends React.Component {
      componentDidCatch() {}
      render() {
        return <Child />;
      }
    }

    class Child extends React.Component {
      componentDidUpdate() {
        parent.setState({step: 1});
        throw new Error('update error');
      }
      render() {
        return null;
      }
    }

    ReactNoop.render(<Parent />);
    await waitForAll([]);

    ReactNoop.flushSync(() => {
      ReactNoop.render(<Parent />);
    });
  });

  it('continues work on other roots despite caught errors', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          return (
            <span prop={`Caught an error: ${this.state.error.message}.`} />
          );
        }
        return this.props.children;
      }
    }

    function BrokenRender(props) {
      throw new Error('Hello');
    }

    ReactNoop.renderToRootWithID(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
      'a',
    );
    ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    await waitForAll([]);
    expect(ReactNoop.getChildrenAsJSX('a')).toEqual(
      <span prop="Caught an error: Hello." />,
    );
    await waitForAll([]);
    expect(ReactNoop.getChildrenAsJSX('b')).toEqual(<span prop="b:1" />);
  });

  it('continues work on other roots despite uncaught errors', async () => {
    function BrokenRender(props) {
      throw new Error(props.label);
    }

    ReactNoop.renderToRootWithID(<BrokenRender label="a" />, 'a');
    await waitForThrow('a');
    expect(ReactNoop.getChildrenAsJSX('a')).toEqual(null);

    ReactNoop.renderToRootWithID(<BrokenRender label="a" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
    await waitForThrow('a');

    await waitForAll([]);
    expect(ReactNoop.getChildrenAsJSX('a')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('b')).toEqual(<span prop="b:2" />);

    ReactNoop.renderToRootWithID(<span prop="a:3" />, 'a');
    ReactNoop.renderToRootWithID(<BrokenRender label="b" />, 'b');
    await waitForThrow('b');
    expect(ReactNoop.getChildrenAsJSX('a')).toEqual(<span prop="a:3" />);
    expect(ReactNoop.getChildrenAsJSX('b')).toEqual(null);

    ReactNoop.renderToRootWithID(<span prop="a:4" />, 'a');
    ReactNoop.renderToRootWithID(<BrokenRender label="b" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:4" />, 'c');
    await waitForThrow('b');
    await waitForAll([]);
    expect(ReactNoop.getChildrenAsJSX('a')).toEqual(<span prop="a:4" />);
    expect(ReactNoop.getChildrenAsJSX('b')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('c')).toEqual(<span prop="c:4" />);

    ReactNoop.renderToRootWithID(<span prop="a:5" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:5" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:5" />, 'c');
    ReactNoop.renderToRootWithID(<span prop="d:5" />, 'd');
    ReactNoop.renderToRootWithID(<BrokenRender label="e" />, 'e');
    await waitForThrow('e');
    await waitForAll([]);
    expect(ReactNoop.getChildrenAsJSX('a')).toEqual(<span prop="a:5" />);
    expect(ReactNoop.getChildrenAsJSX('b')).toEqual(<span prop="b:5" />);
    expect(ReactNoop.getChildrenAsJSX('c')).toEqual(<span prop="c:5" />);
    expect(ReactNoop.getChildrenAsJSX('d')).toEqual(<span prop="d:5" />);
    expect(ReactNoop.getChildrenAsJSX('e')).toEqual(null);

    ReactNoop.renderToRootWithID(<BrokenRender label="a" />, 'a');
    await waitForThrow('a');

    ReactNoop.renderToRootWithID(<span prop="b:6" />, 'b');
    ReactNoop.renderToRootWithID(<BrokenRender label="c" />, 'c');
    await waitForThrow('c');

    ReactNoop.renderToRootWithID(<span prop="d:6" />, 'd');
    ReactNoop.renderToRootWithID(<BrokenRender label="e" />, 'e');
    ReactNoop.renderToRootWithID(<span prop="f:6" />, 'f');
    await waitForThrow('e');

    await waitForAll([]);
    expect(ReactNoop.getChildrenAsJSX('a')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('b')).toEqual(<span prop="b:6" />);
    expect(ReactNoop.getChildrenAsJSX('c')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('d')).toEqual(<span prop="d:6" />);
    expect(ReactNoop.getChildrenAsJSX('e')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('f')).toEqual(<span prop="f:6" />);

    ReactNoop.unmountRootWithID('a');
    ReactNoop.unmountRootWithID('b');
    ReactNoop.unmountRootWithID('c');
    ReactNoop.unmountRootWithID('d');
    ReactNoop.unmountRootWithID('e');
    ReactNoop.unmountRootWithID('f');
    await waitForAll([]);
    expect(ReactNoop.getChildrenAsJSX('a')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('b')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('c')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('d')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('e')).toEqual(null);
    expect(ReactNoop.getChildrenAsJSX('f')).toEqual(null);
  });

  // NOTE: When legacy context is removed, it's probably fine to just delete
  // this test. There's plenty of test coverage of stack unwinding in general
  // because it's used for new context, suspense, and many other features.
  // It has to be tested independently for each feature anyway. So although it
  // doesn't look like it, this test is specific to legacy context.
  // @gate !disableLegacyContext && !disableLegacyContextForFunctionComponents
  it('unwinds the context stack correctly on error', async () => {
    class Provider extends React.Component {
      static childContextTypes = {message: PropTypes.string};
      static contextTypes = {message: PropTypes.string};
      getChildContext() {
        return {
          message: (this.context.message || '') + this.props.message,
        };
      }
      render() {
        return this.props.children;
      }
    }

    function Connector(props, context) {
      return <span prop={context.message} />;
    }

    Connector.contextTypes = {
      message: PropTypes.string,
    };

    function BadRender() {
      throw new Error('render error');
    }

    class Boundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        return (
          <Provider message="b">
            <Provider message="c">
              <Provider message="d">
                <Provider message="e">
                  {!this.state.error && <BadRender />}
                </Provider>
              </Provider>
            </Provider>
          </Provider>
        );
      }
    }

    ReactNoop.render(
      <Provider message="a">
        <Boundary />
        <Connector />
      </Provider>,
    );

    await waitForAll([]);
    assertConsoleErrorDev([
      'Provider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Provider (at **)',
      'Provider uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Provider (at **)',
      'Connector uses the legacy contextTypes API which will be removed soon. ' +
        'Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Connector (at **)',
    ]);

    // If the context stack does not unwind, span will get 'abcde'
    expect(ReactNoop).toMatchRenderedOutput(<span prop="a" />);
  });

  it('catches reconciler errors in a boundary during mounting', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          return <span prop={this.state.error.message} />;
        }
        return this.props.children;
      }
    }
    const InvalidType = undefined;
    function BrokenRender(props) {
      return <InvalidType />;
    }

    ReactNoop.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
    );
    await waitForAll([]);

    expect(ReactNoop).toMatchRenderedOutput(
      <span
        prop={
          'Element type is invalid: expected a string (for built-in components) or ' +
          'a class/function (for composite components) but got: undefined.' +
          (__DEV__
            ? " You likely forgot to export your component from the file it's " +
              'defined in, or you might have mixed up default and named imports.' +
              '\n\nCheck the render method of `BrokenRender`.'
            : '')
        }
      />,
    );
  });

  it('catches reconciler errors in a boundary during update', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          return <span prop={this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    const InvalidType = undefined;
    function BrokenRender(props) {
      return props.fail ? <InvalidType /> : <span />;
    }

    ReactNoop.render(
      <ErrorBoundary>
        <BrokenRender fail={false} />
      </ErrorBoundary>,
    );
    await waitForAll([]);

    ReactNoop.render(
      <ErrorBoundary>
        <BrokenRender fail={true} />
      </ErrorBoundary>,
    );
    await waitForAll([]);

    expect(ReactNoop).toMatchRenderedOutput(
      <span
        prop={
          'Element type is invalid: expected a string (for built-in components) or ' +
          'a class/function (for composite components) but got: undefined.' +
          (__DEV__
            ? " You likely forgot to export your component from the file it's " +
              'defined in, or you might have mixed up default and named imports.' +
              '\n\nCheck the render method of `BrokenRender`.'
            : '')
        }
      />,
    );
  });

  it('recovers from uncaught reconciler errors', async () => {
    const InvalidType = undefined;
    ReactNoop.render(<InvalidType />);

    await waitForThrow(
      'Element type is invalid: expected a string (for built-in components) or ' +
        'a class/function (for composite components) but got: undefined.' +
        (__DEV__
          ? " You likely forgot to export your component from the file it's " +
            'defined in, or you might have mixed up default and named imports.'
          : ''),
    );

    ReactNoop.render(<span prop="hi" />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="hi" />);
  });

  it('unmounts components with uncaught errors', async () => {
    let inst;

    class BrokenRenderAndUnmount extends React.Component {
      state = {fail: false};
      componentWillUnmount() {
        Scheduler.log('BrokenRenderAndUnmount componentWillUnmount');
      }
      render() {
        inst = this;
        if (this.state.fail) {
          throw new Error('Hello.');
        }
        return null;
      }
    }

    class Parent extends React.Component {
      componentWillUnmount() {
        Scheduler.log('Parent componentWillUnmount [!]');
        throw new Error('One does not simply unmount me.');
      }
      render() {
        return this.props.children;
      }
    }

    ReactNoop.render(
      <Parent>
        <Parent>
          <BrokenRenderAndUnmount />
        </Parent>
      </Parent>,
    );
    await waitForAll([]);

    let aggregateError;
    try {
      await act(() => {
        ReactNoop.flushSync(() => {
          inst.setState({fail: true});
        });
      });
    } catch (e) {
      aggregateError = e;
    }

    assertLog([
      // Attempt to clean up.
      // Errors in parents shouldn't stop children from unmounting.
      'Parent componentWillUnmount [!]',
      'Parent componentWillUnmount [!]',
      'BrokenRenderAndUnmount componentWillUnmount',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(null);

    // React threw both errors as a single AggregateError
    const errors = aggregateError.errors;
    expect(errors.length).toBe(3);
    expect(errors[0].message).toBe('Hello.');
    expect(errors[1].message).toBe('One does not simply unmount me.');
    expect(errors[2].message).toBe('One does not simply unmount me.');
  });

  it('does not interrupt unmounting if detaching a ref throws', async () => {
    class Bar extends React.Component {
      componentWillUnmount() {
        Scheduler.log('Bar unmount');
      }
      render() {
        return <span prop="Bar" />;
      }
    }

    function barRef(inst) {
      if (inst === null) {
        Scheduler.log('barRef detach');
        throw new Error('Detach error');
      }
      Scheduler.log('barRef attach');
    }

    function Foo(props) {
      return <div>{props.hide ? null : <Bar ref={barRef} />}</div>;
    }

    ReactNoop.render(<Foo />);
    await waitForAll(['barRef attach']);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop="Bar" />
      </div>,
    );

    // Unmount
    ReactNoop.render(<Foo hide={true} />);
    await waitForThrow('Detach error');
    assertLog([
      'barRef detach',
      // Bar should unmount even though its ref threw an error while detaching
      'Bar unmount',
    ]);
    // Because there was an error, entire tree should unmount
    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  it('handles error thrown by host config while working on failed root', async () => {
    ReactNoop.render(<errorInBeginPhase />);
    await waitForThrow('Error in host config.');
  });

  it('handles error thrown by top-level callback', async () => {
    ReactNoop.render(<div />, () => {
      throw new Error('Error!');
    });
    await waitForThrow('Error!');
  });

  it('error boundaries capture non-errors', async () => {
    spyOnProd(console, 'error').mockImplementation(() => {});
    spyOnDev(console, 'error').mockImplementation(() => {});

    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        // Should not be called
        Scheduler.log('componentDidCatch');
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary (catch)');
          return (
            <span
              prop={`Caught an error: ${this.state.error.nonStandardMessage}`}
            />
          );
        }
        Scheduler.log('ErrorBoundary (try)');
        return this.props.children;
      }
    }

    function Indirection({children}) {
      Scheduler.log('Indirection');
      return children;
    }

    const notAnError = {nonStandardMessage: 'oops'};
    function BadRender({unused}) {
      Scheduler.log('BadRender');
      throw notAnError;
    }

    ReactNoop.render(
      <ErrorBoundary>
        <Indirection>
          <BadRender />
        </Indirection>
      </ErrorBoundary>,
    );

    await waitForAll([
      'ErrorBoundary (try)',
      'Indirection',
      'BadRender',

      // React retries one more time
      'ErrorBoundary (try)',
      'Indirection',
      'BadRender',

      // Errored again on retry. Now handle it.
      'componentDidCatch',
      'ErrorBoundary (catch)',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: oops" />,
    );

    if (__DEV__) {
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error.mock.calls[0][1]).toBe(notAnError);
      expect(console.error.mock.calls[0][2]).toContain(
        'The above error occurred in the <BadRender> component',
      );
    } else {
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error.mock.calls[0][0]).toBe(notAnError);
    }
  });

  // TODO: Error boundary does not catch promises

  it('continues working on siblings of a component that throws', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        Scheduler.log('componentDidCatch');
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary (catch)');
          return <ErrorMessage error={this.state.error} />;
        }
        Scheduler.log('ErrorBoundary (try)');
        return this.props.children;
      }
    }

    function ErrorMessage({error}) {
      Scheduler.log('ErrorMessage');
      return <span prop={`Caught an error: ${error.message}`} />;
    }

    function BadRenderSibling({unused}) {
      Scheduler.log('BadRenderSibling');
      return null;
    }

    function BadRender({unused}) {
      Scheduler.log('throw');
      throw new Error('oops!');
    }

    ReactNoop.render(
      <ErrorBoundary>
        <BadRender />
        <BadRenderSibling />
        <BadRenderSibling />
      </ErrorBoundary>,
    );

    await waitForAll([
      'ErrorBoundary (try)',
      'throw',
      // Continue rendering siblings after BadRender throws

      // React retries one more time
      'ErrorBoundary (try)',
      'throw',

      // Errored again on retry. Now handle it.
      'componentDidCatch',
      'ErrorBoundary (catch)',
      'ErrorMessage',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: oops!" />,
    );
  });

  it('calls the correct lifecycles on the error boundary after catching an error (mixed)', async () => {
    // This test seems a bit contrived, but it's based on an actual regression
    // where we checked for the existence of didUpdate instead of didMount, and
    // didMount was not defined.
    function BadRender({unused}) {
      Scheduler.log('throw');
      throw new Error('oops!');
    }

    class Parent extends React.Component {
      state = {error: null, other: false};
      componentDidCatch(error) {
        Scheduler.log('did catch');
        this.setState({error});
      }
      componentDidUpdate() {
        Scheduler.log('did update');
      }
      render() {
        if (this.state.error) {
          Scheduler.log('render error message');
          return <span prop={`Caught an error: ${this.state.error.message}`} />;
        }
        Scheduler.log('render');
        return <BadRender />;
      }
    }

    ReactNoop.render(<Parent step={1} />);
    await waitFor([
      'render',
      'throw',
      'render',
      'throw',
      'did catch',
      'render error message',
      'did update',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: oops!" />,
    );
  });

  it('provides component stack to the error boundary with componentDidCatch', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null, errorInfo: null};
      componentDidCatch(error, errorInfo) {
        this.setState({error, errorInfo});
      }
      render() {
        if (this.state.errorInfo) {
          Scheduler.log('render error message');
          return (
            <span
              prop={`Caught an error:${normalizeCodeLocInfo(
                this.state.errorInfo.componentStack,
              )}.`}
            />
          );
        }
        return this.props.children;
      }
    }

    function BrokenRender(props) {
      throw new Error('Hello');
    }

    ReactNoop.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
    );
    await waitForAll(['render error message']);
    expect(ReactNoop).toMatchRenderedOutput(
      <span
        prop={
          'Caught an error:\n' +
          '    in BrokenRender (at **)\n' +
          '    in ErrorBoundary (at **).'
        }
      />,
    );
  });

  it('does not provide component stack to the error boundary with getDerivedStateFromError', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error, errorInfo) {
        expect(errorInfo).toBeUndefined();
        return {error};
      }
      render() {
        if (this.state.error) {
          return <span prop={`Caught an error: ${this.state.error.message}`} />;
        }
        return this.props.children;
      }
    }

    function BrokenRender(props) {
      throw new Error('Hello');
    }

    ReactNoop.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
    );
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught an error: Hello" />,
    );
  });

  it('provides component stack even if overriding prepareStackTrace', async () => {
    Error.prepareStackTrace = function (error, callsites) {
      const stack = ['An error occurred:', error.message];
      for (let i = 0; i < callsites.length; i++) {
        const callsite = callsites[i];
        stack.push(
          '\t' + callsite.getFunctionName(),
          '\t\tat ' + callsite.getFileName(),
          '\t\ton line ' + callsite.getLineNumber(),
        );
      }

      return stack.join('\n');
    };

    class ErrorBoundary extends React.Component {
      state = {error: null, errorInfo: null};
      componentDidCatch(error, errorInfo) {
        this.setState({error, errorInfo});
      }
      render() {
        if (this.state.errorInfo) {
          Scheduler.log('render error message');
          return (
            <span
              prop={`Caught an error:${normalizeCodeLocInfo(
                this.state.errorInfo.componentStack,
              )}.`}
            />
          );
        }
        return this.props.children;
      }
    }

    function BrokenRender(props) {
      throw new Error('Hello');
    }

    ReactNoop.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
    );
    await waitForAll(['render error message']);
    Error.prepareStackTrace = undefined;

    expect(ReactNoop).toMatchRenderedOutput(
      <span
        prop={
          'Caught an error:\n' +
          '    in BrokenRender (at **)\n' +
          '    in ErrorBoundary (at **).'
        }
      />,
    );
  });

  it('uncaught errors should be discarded if the render is aborted', async () => {
    const root = ReactNoop.createRoot();

    function Oops({unused}) {
      Scheduler.log('Oops');
      throw Error('Oops');
    }

    await act(async () => {
      React.startTransition(() => {
        root.render(<Oops />);
      });

      // Render past the component that throws, then yield.
      await waitFor(['Oops']);
      expect(root).toMatchRenderedOutput(null);
      // Interleaved update. When the root completes, instead of throwing the
      // error, it should try rendering again. This update will cause it to
      // recover gracefully.
      React.startTransition(() => {
        root.render('Everything is fine.');
      });
    });

    // Should finish without throwing.
    assertConsoleErrorDev([
      'Error: There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.' +
        '\n    in <stack>',
    ]);
    expect(root).toMatchRenderedOutput('Everything is fine.');
  });

  it('uncaught errors are discarded if the render is aborted, case 2', async () => {
    const {useState} = React;
    const root = ReactNoop.createRoot();

    let setShouldThrow;
    function Oops() {
      const [shouldThrow, _setShouldThrow] = useState(false);
      setShouldThrow = _setShouldThrow;
      if (shouldThrow) {
        throw Error('Oops');
      }
      return null;
    }

    function AllGood() {
      Scheduler.log('Everything is fine.');
      return 'Everything is fine.';
    }

    await act(() => {
      root.render(<Oops />);
    });

    await act(async () => {
      // Schedule a default pri and a low pri update on the root.
      root.render(<Oops />);
      React.startTransition(() => {
        root.render(<AllGood />);
      });

      // Render through just the default pri update. The low pri update remains on
      // the queue.
      await waitFor(['Everything is fine.']);

      // Schedule a discrete update on a child that triggers an error.
      // The root should capture this error. But since there's still a pending
      // update on the root, the error should be suppressed.
      ReactNoop.discreteUpdates(() => {
        setShouldThrow(true);
      });
    });
    // Should render the final state without throwing the error.
    assertLog(['Everything is fine.']);
    assertConsoleErrorDev([
      'Error: There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.' +
        '\n    in <stack>',
    ]);
    expect(root).toMatchRenderedOutput('Everything is fine.');
  });

  it("does not infinite loop if there's a render phase update in the same render as an error", async () => {
    // Some React features may schedule a render phase update as an
    // implementation detail. When an error is accompanied by a render phase
    // update, we assume that it comes from React internals, because render
    // phase updates triggered from userspace are not allowed (we log a
    // warning). So we keep attempting to recover until no more opaque
    // identifiers need to be upgraded. However, we should give up after some
    // point to prevent an infinite loop in the case where there is (by
    // accident) a render phase triggered from userspace.

    spyOnDev(console, 'error').mockImplementation(() => {});
    spyOnDev(console, 'warn').mockImplementation(() => {});

    let numberOfThrows = 0;

    let setStateInRenderPhase;
    function Child() {
      const [, setState] = React.useState(0);
      setStateInRenderPhase = setState;
      return 'All good';
    }

    function App({shouldThrow}) {
      if (shouldThrow) {
        setStateInRenderPhase();
        numberOfThrows++;
        throw new Error('Oops!');
      }
      return <Child />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App shouldThrow={false} />);
    });
    expect(root).toMatchRenderedOutput('All good');

    let error;
    try {
      await act(() => {
        root.render(<App shouldThrow={true} />);
      });
    } catch (e) {
      error = e;
    }

    expect(error.message).toBe('Oops!');
    expect(numberOfThrows < 100).toBe(true);

    if (__DEV__) {
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error.mock.calls[0][0]).toContain(
        'Cannot update a component (`%s`) while rendering a different component',
      );
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0][1]).toContain(
        'An error occurred in the <App> component',
      );
    }
  });

  if (global.__PERSISTENT__) {
    it('regression test: should fatal if error is thrown at the root', async () => {
      const root = ReactNoop.createRoot();
      root.render('Error when completing root');
      await waitForThrow('Error when completing root');
    });
  }
});
