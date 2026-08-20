/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('forwardRef', () => {
  let React;
  let ReactNoop;
  let Scheduler;
  let waitForAll;

  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
  });

  it('should work without a ref to be forwarded', async () => {
    class Child extends React.Component {
      render() {
        Scheduler.log(this.props.value);
        return null;
      }
    }

    function Wrapper(props) {
      return <Child {...props} ref={props.forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    ReactNoop.render(<RefForwardingComponent value={123} />);
    await waitForAll([123]);
  });

  it('should forward a ref for a single child', async () => {
    class Child extends React.Component {
      render() {
        Scheduler.log(this.props.value);
        return null;
      }
    }

    function Wrapper(props) {
      return <Child {...props} ref={props.forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    const ref = React.createRef();

    ReactNoop.render(<RefForwardingComponent ref={ref} value={123} />);
    await waitForAll([123]);
    expect(ref.current instanceof Child).toBe(true);
  });

  it('should forward a ref for multiple children', async () => {
    class Child extends React.Component {
      render() {
        Scheduler.log(this.props.value);
        return null;
      }
    }

    function Wrapper(props) {
      return <Child {...props} ref={props.forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    const ref = React.createRef();

    ReactNoop.render(
      <div>
        <div />
        <RefForwardingComponent ref={ref} value={123} />
        <div />
      </div>,
    );
    await waitForAll([123]);
    expect(ref.current instanceof Child).toBe(true);
  });

  it('should maintain child instance and ref through updates', async () => {
    class Child extends React.Component {
      constructor(props) {
        super(props);
      }
      render() {
        Scheduler.log(this.props.value);
        return null;
      }
    }

    function Wrapper(props) {
      return <Child {...props} ref={props.forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    let setRefCount = 0;
    let ref;

    const setRef = r => {
      setRefCount++;
      ref = r;
    };

    ReactNoop.render(<RefForwardingComponent ref={setRef} value={123} />);
    await waitForAll([123]);
    expect(ref instanceof Child).toBe(true);
    expect(setRefCount).toBe(1);
    ReactNoop.render(<RefForwardingComponent ref={setRef} value={456} />);
    await waitForAll([456]);
    expect(ref instanceof Child).toBe(true);
    expect(setRefCount).toBe(1);
  });

  it('should not break lifecycle error handling', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        Scheduler.log('ErrorBoundary.componentDidCatch');
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary.render: catch');
          return null;
        }
        Scheduler.log('ErrorBoundary.render: try');
        return this.props.children;
      }
    }

    class BadRender extends React.Component {
      render() {
        Scheduler.log('BadRender throw');
        throw new Error('oops!');
      }
    }

    function Wrapper(props) {
      const forwardedRef = props.forwardedRef;
      Scheduler.log('Wrapper');
      return <BadRender {...props} ref={forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    const ref = React.createRef();

    ReactNoop.render(
      <ErrorBoundary>
        <RefForwardingComponent ref={ref} />
      </ErrorBoundary>,
    );
    await waitForAll([
      'ErrorBoundary.render: try',
      'Wrapper',
      'BadRender throw',

      // React retries one more time
      'ErrorBoundary.render: try',
      'Wrapper',
      'BadRender throw',

      // Errored again on retry. Now handle it.
      'ErrorBoundary.componentDidCatch',
      'ErrorBoundary.render: catch',
    ]);
    expect(ref.current).toBe(null);
  });

  it('should not re-run the render callback on a deep setState', async () => {
    let inst;

    class Inner extends React.Component {
      render() {
        Scheduler.log('Inner');
        inst = this;
        return <div ref={this.props.forwardedRef} />;
      }
    }

    function Middle(props) {
      Scheduler.log('Middle');
      return <Inner {...props} />;
    }

    const Forward = React.forwardRef((props, ref) => {
      Scheduler.log('Forward');
      return <Middle {...props} forwardedRef={ref} />;
    });

    function App() {
      Scheduler.log('App');
      return <Forward />;
    }

    ReactNoop.render(<App />);
    await waitForAll(['App', 'Forward', 'Middle', 'Inner']);

    inst.setState({});
    await waitForAll(['Inner']);
  });
});
