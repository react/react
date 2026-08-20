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
let PropTypes;

let assertConsoleErrorDev;
let waitForAll;
let waitFor;
let waitForThrow;
let assertLog;

describe('ReactIncremental', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    PropTypes = require('prop-types');

    ({
      assertConsoleErrorDev,
      waitForAll,
      waitFor,
      waitForThrow,
      assertLog,
    } = require('internal-test-utils'));
  });

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

  it('should render a simple component', async () => {
    function Bar() {
      return <div>Hello World</div>;
    }

    function Foo() {
      return <Bar isBar={true} />;
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);
  });

  it('should render a simple component, in steps if needed', async () => {
    function Bar() {
      Scheduler.log('Bar');
      return (
        <span>
          <div>Hello World</div>
        </span>
      );
    }

    function Foo() {
      Scheduler.log('Foo');
      return [<Bar key="a" isBar={true} />, <Bar key="b" isBar={true} />];
    }

    React.startTransition(() => {
      ReactNoop.render(<Foo />, () => Scheduler.log('callback'));
    });
    // Do one step of work.
    await waitFor(['Foo']);

    // Do the rest of the work.
    await waitForAll(['Bar', 'Bar', 'callback']);
  });

  it('updates a previous render', async () => {
    function Header() {
      Scheduler.log('Header');
      return <h1>Hi</h1>;
    }

    function Content(props) {
      Scheduler.log('Content');
      return <div>{props.children}</div>;
    }

    function Footer() {
      Scheduler.log('Footer');
      return <footer>Bye</footer>;
    }

    const header = <Header />;
    const footer = <Footer />;

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          {header}
          <Content>{props.text}</Content>
          {footer}
        </div>
      );
    }

    ReactNoop.render(<Foo text="foo" />, () =>
      Scheduler.log('renderCallbackCalled'),
    );
    await waitForAll([
      'Foo',
      'Header',
      'Content',
      'Footer',
      'renderCallbackCalled',
    ]);

    ReactNoop.render(<Foo text="bar" />, () =>
      Scheduler.log('firstRenderCallbackCalled'),
    );
    ReactNoop.render(<Foo text="bar" />, () =>
      Scheduler.log('secondRenderCallbackCalled'),
    );
    // TODO: Test bail out of host components. This is currently unobservable.

    // Since this is an update, it should bail out and reuse the work from
    // Header and Content.
    await waitForAll([
      'Foo',
      'Content',
      'firstRenderCallbackCalled',
      'secondRenderCallbackCalled',
    ]);
  });

  it('can cancel partially rendered work and restart', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return <div>{props.children}</div>;
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          <Bar>{props.text}</Bar>
          <Bar>{props.text}</Bar>
        </div>
      );
    }

    // Init
    ReactNoop.render(<Foo text="foo" />);
    await waitForAll(['Foo', 'Bar', 'Bar']);

    React.startTransition(() => {
      ReactNoop.render(<Foo text="bar" />);
    });
    // Flush part of the work
    await waitFor(['Foo', 'Bar']);

    // This will abort the previous work and restart
    ReactNoop.flushSync(() => ReactNoop.render(null));

    React.startTransition(() => {
      ReactNoop.render(<Foo text="baz" />);
    });

    // Flush part of the new work
    await waitFor(['Foo', 'Bar']);

    // Flush the rest of the work which now includes the low priority
    await waitForAll(['Bar']);
  });

  it('should call callbacks even if updates are aborted', async () => {
    let inst;

    class Foo extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          text: 'foo',
          text2: 'foo',
        };
        inst = this;
      }
      render() {
        return (
          <div>
            <div>{this.state.text}</div>
            <div>{this.state.text2}</div>
          </div>
        );
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);

    React.startTransition(() => {
      inst.setState(
        () => {
          Scheduler.log('setState1');
          return {text: 'bar'};
        },
        () => Scheduler.log('callback1'),
      );
    });

    // Flush part of the work
    await waitFor(['setState1']);

    // This will abort the previous work and restart
    ReactNoop.flushSync(() => ReactNoop.render(<Foo />));
    React.startTransition(() => {
      inst.setState(
        () => {
          Scheduler.log('setState2');
          return {text2: 'baz'};
        },
        () => Scheduler.log('callback2'),
      );
    });

    // Flush the rest of the work which now includes the low priority
    await waitForAll(['setState1', 'setState2', 'callback1', 'callback2']);
    expect(inst.state).toEqual({text: 'bar', text2: 'baz'});
  });

  // @gate enableLegacyHidden
  it('can deprioritize unfinished work and resume it later', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return <div>{props.children}</div>;
    }

    function Middle(props) {
      Scheduler.log('Middle');
      return <span>{props.children}</span>;
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          <Bar>{props.text}</Bar>
          <LegacyHiddenDiv mode="hidden">
            <Middle>{props.text}</Middle>
          </LegacyHiddenDiv>
          <Bar>{props.text}</Bar>
          <LegacyHiddenDiv mode="hidden">
            <Middle>Footer</Middle>
          </LegacyHiddenDiv>
        </div>
      );
    }

    // Init
    ReactNoop.render(<Foo text="foo" />);
    await waitForAll(['Foo', 'Bar', 'Bar', 'Middle', 'Middle']);

    // Render part of the work. This should be enough to flush everything except
    // the middle which has lower priority.
    ReactNoop.render(<Foo text="bar" />);
    await waitFor(['Foo', 'Bar', 'Bar']);
    // Flush only the remaining work
    await waitForAll(['Middle', 'Middle']);
  });

  // @gate enableLegacyHidden
  it('can deprioritize a tree from without dropping work', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return <div>{props.children}</div>;
    }

    function Middle(props) {
      Scheduler.log('Middle');
      return <span>{props.children}</span>;
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          <Bar>{props.text}</Bar>
          <LegacyHiddenDiv mode="hidden">
            <Middle>{props.text}</Middle>
          </LegacyHiddenDiv>
          <Bar>{props.text}</Bar>
          <LegacyHiddenDiv mode="hidden">
            <Middle>Footer</Middle>
          </LegacyHiddenDiv>
        </div>
      );
    }

    // Init
    ReactNoop.flushSync(() => {
      ReactNoop.render(<Foo text="foo" />);
    });
    assertLog(['Foo', 'Bar', 'Bar']);
    await waitForAll(['Middle', 'Middle']);

    // Render the high priority work (everything except the hidden trees).
    ReactNoop.flushSync(() => {
      ReactNoop.render(<Foo text="foo" />);
    });
    assertLog(['Foo', 'Bar', 'Bar']);

    // The hidden content was deprioritized from high to low priority. A low
    // priority callback should have been scheduled. Flush it now.
    await waitForAll(['Middle', 'Middle']);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can resume work in a subtree even when a parent bails out', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return <div>{props.children}</div>;
    }

    function Tester() {
      // This component is just here to ensure that the bail out is
      // in fact in effect in the expected place for this test.
      Scheduler.log('Tester');
      return <div />;
    }

    function Middle(props) {
      Scheduler.log('Middle');
      return <span>{props.children}</span>;
    }

    const middleContent = (
      <aaa>
        <Tester />
        <bbb hidden={true}>
          <ccc>
            <Middle>Hi</Middle>
          </ccc>
        </bbb>
      </aaa>
    );

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          <Bar>{props.text}</Bar>
          {middleContent}
          <Bar>{props.text}</Bar>
        </div>
      );
    }

    // Init
    ReactNoop.render(<Foo text="foo" />);
    ReactNoop.flushDeferredPri(52);

    assertLog(['Foo', 'Bar', 'Tester', 'Bar']);

    // We're now rendering an update that will bail out on updating middle.
    ReactNoop.render(<Foo text="bar" />);
    ReactNoop.flushDeferredPri(45 + 5);

    assertLog(['Foo', 'Bar', 'Bar']);

    // Flush the rest to make sure that the bailout didn't block this work.
    await waitForAll(['Middle']);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can resume work in a bailed subtree within one pass', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return <div>{props.children}</div>;
    }

    class Tester extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        // This component is just here to ensure that the bail out is
        // in fact in effect in the expected place for this test.
        Scheduler.log('Tester');
        return <div />;
      }
    }

    function Middle(props) {
      Scheduler.log('Middle');
      return <span>{props.children}</span>;
    }

    // Should content not just bail out on current, not workInProgress?

    class Content extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        return [
          <Tester key="a" unused={this.props.unused} />,
          <bbb key="b" hidden={true}>
            <ccc>
              <Middle>Hi</Middle>
            </ccc>
          </bbb>,
        ];
      }
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div hidden={props.text === 'bar'}>
          <Bar>{props.text}</Bar>
          <Content unused={props.text} />
          <Bar>{props.text}</Bar>
        </div>
      );
    }

    // Init
    ReactNoop.render(<Foo text="foo" />);
    ReactNoop.flushDeferredPri(52 + 5);

    assertLog(['Foo', 'Bar', 'Tester', 'Bar']);

    // Make a quick update which will create a low pri tree on top of the
    // already low pri tree.
    ReactNoop.render(<Foo text="bar" />);
    ReactNoop.flushDeferredPri(15);

    assertLog(['Foo']);

    // At this point, middle will bail out but it has not yet fully rendered.
    // Since that is the same priority as its parent tree. This should render
    // as a single batch. Therefore, it is correct that Middle should be in the
    // middle. If it occurs after the two "Bar" components then it was flushed
    // after them which is not correct.
    await waitForAll(['Bar', 'Middle', 'Bar']);

    // Let us try this again without fully finishing the first time. This will
    // create a hanging subtree that is reconciling at the normal priority.
    ReactNoop.render(<Foo text="foo" />);
    ReactNoop.flushDeferredPri(40);

    assertLog(['Foo', 'Bar']);

    // This update will create a tree that aborts that work and down-prioritizes
    // it. If the priority levels aren't down-prioritized correctly this may
    // abort rendering of the down-prioritized content.
    ReactNoop.render(<Foo text="bar" />);
    await waitForAll(['Foo', 'Bar', 'Bar']);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can resume mounting a class component', async () => {
    let foo;
    class Parent extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        return <Foo prop={this.props.prop} />;
      }
    }

    class Foo extends React.Component {
      constructor(props) {
        super(props);
        // Test based on a www bug where props was null on resume
        Scheduler.log('Foo constructor: ' + props.prop);
      }
      render() {
        foo = this;
        Scheduler.log('Foo');
        return <Bar />;
      }
    }

    function Bar() {
      Scheduler.log('Bar');
      return <div />;
    }

    ReactNoop.render(<Parent prop="foo" />);
    ReactNoop.flushDeferredPri(20);
    assertLog(['Foo constructor: foo', 'Foo']);

    foo.setState({value: 'bar'});

    await waitForAll(['Foo', 'Bar']);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('reuses the same instance when resuming a class instance', async () => {
    let foo;
    class Parent extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        return <Foo prop={this.props.prop} />;
      }
    }

    let constructorCount = 0;
    class Foo extends React.Component {
      constructor(props) {
        super(props);
        // Test based on a www bug where props was null on resume
        Scheduler.log('constructor: ' + props.prop);
        constructorCount++;
      }
      UNSAFE_componentWillMount() {
        Scheduler.log('componentWillMount: ' + this.props.prop);
      }
      UNSAFE_componentWillReceiveProps() {
        Scheduler.log('componentWillReceiveProps: ' + this.props.prop);
      }
      componentDidMount() {
        Scheduler.log('componentDidMount: ' + this.props.prop);
      }
      UNSAFE_componentWillUpdate() {
        Scheduler.log('componentWillUpdate: ' + this.props.prop);
      }
      componentDidUpdate() {
        Scheduler.log('componentDidUpdate: ' + this.props.prop);
      }
      render() {
        foo = this;
        Scheduler.log('render: ' + this.props.prop);
        return <Bar />;
      }
    }

    function Bar() {
      Scheduler.log('Foo did complete');
      return <div />;
    }

    ReactNoop.render(<Parent prop="foo" />);
    ReactNoop.flushDeferredPri(25);
    assertLog([
      'constructor: foo',
      'componentWillMount: foo',
      'render: foo',
      'Foo did complete',
    ]);

    foo.setState({value: 'bar'});

    await waitForAll([]);
    expect(constructorCount).toEqual(1);
    assertLog([
      'componentWillMount: foo',
      'render: foo',
      'Foo did complete',
      'componentDidMount: foo',
    ]);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can reuse work done after being preempted', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return <div>{props.children}</div>;
    }

    function Middle(props) {
      Scheduler.log('Middle');
      return <span>{props.children}</span>;
    }

    const middleContent = (
      <div>
        <Middle>Hello</Middle>
        <Bar>-</Bar>
        <Middle>World</Middle>
      </div>
    );

    const step0 = (
      <div>
        <Middle>Hi</Middle>
        <Bar>{'Foo'}</Bar>
        <Middle>There</Middle>
      </div>
    );

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          <Bar>{props.text2}</Bar>
          <div hidden={true}>{props.step === 0 ? step0 : middleContent}</div>
        </div>
      );
    }

    // Init
    ReactNoop.render(<Foo text="foo" text2="foo" step={0} />);
    ReactNoop.flushDeferredPri(55 + 25 + 5 + 5);

    // We only finish the higher priority work. So the low pri content
    // has not yet finished mounting.
    assertLog(['Foo', 'Bar', 'Middle', 'Bar']);

    // Interrupt the rendering with a quick update. This should not touch the
    // middle content.
    ReactNoop.render(<Foo text="foo" text2="bar" step={0} />);
    await waitForAll([]);

    // We've now rendered the entire tree but we didn't have to redo the work
    // done by the first Middle and Bar already.
    assertLog(['Foo', 'Bar', 'Middle']);

    // Make a quick update which will schedule low priority work to
    // update the middle content.
    ReactNoop.render(<Foo text="bar" text2="bar" step={1} />);
    ReactNoop.flushDeferredPri(30 + 25 + 5);

    assertLog(['Foo', 'Bar']);

    // The middle content is now pending rendering...
    ReactNoop.flushDeferredPri(30 + 5);
    assertLog(['Middle', 'Bar']);

    // but we'll interrupt it to render some higher priority work.
    // The middle content will bailout so it remains untouched.
    ReactNoop.render(<Foo text="foo" text2="bar" step={1} />);
    ReactNoop.flushDeferredPri(30);

    assertLog(['Foo', 'Bar']);

    // Since we did nothing to the middle subtree during the interruption,
    // we should be able to reuse the reconciliation work that we already did
    // without restarting.
    await waitForAll(['Middle']);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can reuse work that began but did not complete, after being preempted', async () => {
    let child;
    let sibling;

    function GreatGrandchild() {
      Scheduler.log('GreatGrandchild');
      return <div />;
    }

    function Grandchild() {
      Scheduler.log('Grandchild');
      return <GreatGrandchild />;
    }

    class Child extends React.Component {
      state = {step: 0};
      render() {
        child = this;
        Scheduler.log('Child');
        return <Grandchild />;
      }
    }

    class Sibling extends React.Component {
      render() {
        Scheduler.log('Sibling');
        sibling = this;
        return <div />;
      }
    }

    function Parent() {
      Scheduler.log('Parent');
      return [
        // The extra div is necessary because when Parent bails out during the
        // high priority update, its progressedPriority is set to high.
        // So its direct children cannot be reused when we resume at
        // low priority. I think this would be fixed by changing
        // pendingWorkPriority and progressedPriority to be the priority of
        // the children only, not including the fiber itself.
        <div key="a">
          <Child />
        </div>,
        <Sibling key="b" />,
      ];
    }

    ReactNoop.render(<Parent />);
    await waitForAll([]);

    // Begin working on a low priority update to Child, but stop before
    // GreatGrandchild. Child and Grandchild begin but don't complete.
    child.setState({step: 1});
    ReactNoop.flushDeferredPri(30);
    assertLog(['Child', 'Grandchild']);

    // Interrupt the current low pri work with a high pri update elsewhere in
    // the tree.

    ReactNoop.flushSync(() => {
      sibling.setState({});
    });
    assertLog(['Sibling']);

    // Continue the low pri work. The work on Child and GrandChild was memoized
    // so they should not be worked on again.

    await waitForAll([
      // No Child
      // No Grandchild
      'GreatGrandchild',
    ]);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can reuse work if shouldComponentUpdate is false, after being preempted', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return <div>{props.children}</div>;
    }

    class Middle extends React.Component {
      shouldComponentUpdate(nextProps) {
        return this.props.children !== nextProps.children;
      }
      render() {
        Scheduler.log('Middle');
        return <span>{this.props.children}</span>;
      }
    }

    class Content extends React.Component {
      shouldComponentUpdate(nextProps) {
        return this.props.step !== nextProps.step;
      }
      render() {
        Scheduler.log('Content');
        return (
          <div>
            <Middle>{this.props.step === 0 ? 'Hi' : 'Hello'}</Middle>
            <Bar>{this.props.step === 0 ? this.props.text : '-'}</Bar>
            <Middle>{this.props.step === 0 ? 'There' : 'World'}</Middle>
          </div>
        );
      }
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          <Bar>{props.text}</Bar>
          <div hidden={true}>
            <Content step={props.step} text={props.text} />
          </div>
        </div>
      );
    }

    // Init
    ReactNoop.render(<Foo text="foo" step={0} />);
    await waitForAll(['Foo', 'Bar', 'Content', 'Middle', 'Bar', 'Middle']);

    // Make a quick update which will schedule low priority work to
    // update the middle content.
    ReactNoop.render(<Foo text="bar" step={1} />);
    ReactNoop.flushDeferredPri(30 + 5);

    assertLog(['Foo', 'Bar']);

    // The middle content is now pending rendering...
    ReactNoop.flushDeferredPri(30 + 25 + 5);
    assertLog(['Content', 'Middle', 'Bar']); // One more Middle left.

    // but we'll interrupt it to render some higher priority work.
    // The middle content will bailout so it remains untouched.
    ReactNoop.render(<Foo text="foo" step={1} />);
    ReactNoop.flushDeferredPri(30);

    assertLog(['Foo', 'Bar']);

    // Since we did nothing to the middle subtree during the interruption,
    // we should be able to reuse the reconciliation work that we already did
    // without restarting.
    await waitForAll(['Middle']);
  });

  it('memoizes work even if shouldComponentUpdate returns false', async () => {
    class Foo extends React.Component {
      shouldComponentUpdate(nextProps) {
        // this.props is the memoized props. So this should return true for
        // every update except the first one.
        const shouldUpdate = this.props.step !== 1;
        Scheduler.log('shouldComponentUpdate: ' + shouldUpdate);
        return shouldUpdate;
      }
      render() {
        Scheduler.log('render');
        return <div />;
      }
    }

    ReactNoop.render(<Foo step={1} />);
    await waitForAll(['render']);

    ReactNoop.render(<Foo step={2} />);
    await waitForAll(['shouldComponentUpdate: false']);

    ReactNoop.render(<Foo step={3} />);
    await waitForAll([
      // If the memoized props were not updated during last bail out, sCU will
      // keep returning false.
      'shouldComponentUpdate: true',
      'render',
    ]);
  });

  it('can update in the middle of a tree using setState', async () => {
    let instance;
    class Bar extends React.Component {
      constructor() {
        super();
        this.state = {a: 'a'};
        instance = this;
      }
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    function Foo() {
      return (
        <div>
          <Bar />
        </div>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(instance.state).toEqual({a: 'a'});
    instance.setState({b: 'b'});
    await waitForAll([]);
    expect(instance.state).toEqual({a: 'a', b: 'b'});
  });

  it('can queue multiple state updates', async () => {
    let instance;
    class Bar extends React.Component {
      constructor() {
        super();
        this.state = {a: 'a'};
        instance = this;
      }
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    function Foo() {
      return (
        <div>
          <Bar />
        </div>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    // Call setState multiple times before flushing
    instance.setState({b: 'b'});
    instance.setState({c: 'c'});
    instance.setState({d: 'd'});
    await waitForAll([]);
    expect(instance.state).toEqual({a: 'a', b: 'b', c: 'c', d: 'd'});
  });

  it('can use updater form of setState', async () => {
    let instance;
    class Bar extends React.Component {
      constructor() {
        super();
        this.state = {num: 1};
        instance = this;
      }
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    function Foo({multiplier}) {
      return (
        <div>
          <Bar multiplier={multiplier} />
        </div>
      );
    }

    function updater(state, props) {
      return {num: state.num * props.multiplier};
    }

    ReactNoop.render(<Foo multiplier={2} />);
    await waitForAll([]);
    expect(instance.state.num).toEqual(1);
    instance.setState(updater);
    await waitForAll([]);
    expect(instance.state.num).toEqual(2);

    instance.setState(updater);
    ReactNoop.render(<Foo multiplier={3} />);
    await waitForAll([]);
    expect(instance.state.num).toEqual(6);
  });

  it('can call setState inside update callback', async () => {
    let instance;
    class Bar extends React.Component {
      constructor() {
        super();
        this.state = {num: 1};
        instance = this;
      }
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    function Foo({multiplier}) {
      return (
        <div>
          <Bar multiplier={multiplier} />
        </div>
      );
    }

    function updater(state, props) {
      return {num: state.num * props.multiplier};
    }

    function callback() {
      this.setState({called: true});
    }

    ReactNoop.render(<Foo multiplier={2} />);
    await waitForAll([]);
    instance.setState(updater);
    instance.setState(updater, callback);
    await waitForAll([]);
    expect(instance.state.num).toEqual(4);
    expect(instance.state.called).toEqual(true);
  });

  it('can replaceState', async () => {
    let instance;
    class Bar extends React.Component {
      state = {a: 'a'};
      render() {
        instance = this;
        return <div>{this.props.children}</div>;
      }
    }

    function Foo() {
      return (
        <div>
          <Bar />
        </div>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    instance.setState({b: 'b'});
    instance.setState({c: 'c'});
    instance.updater.enqueueReplaceState(instance, {d: 'd'});
    await waitForAll([]);
    expect(instance.state).toEqual({d: 'd'});
  });

  it('can forceUpdate', async () => {
    function Baz() {
      Scheduler.log('Baz');
      return <div />;
    }

    let instance;
    class Bar extends React.Component {
      constructor() {
        super();
        instance = this;
      }
      shouldComponentUpdate() {
        return false;
      }
      render() {
        Scheduler.log('Bar');
        return <Baz />;
      }
    }

    function Foo() {
      Scheduler.log('Foo');
      return (
        <div>
          <Bar />
        </div>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll(['Foo', 'Bar', 'Baz']);
    instance.forceUpdate();
    await waitForAll(['Bar', 'Baz']);
  });

  it('should clear forceUpdate after update is flushed', async () => {
    let a = 0;

    class Foo extends React.PureComponent {
      render() {
        const msg = `A: ${a}, B: ${this.props.b}`;
        Scheduler.log(msg);
        return msg;
      }
    }

    const foo = React.createRef(null);
    ReactNoop.render(<Foo ref={foo} b={0} />);
    await waitForAll(['A: 0, B: 0']);

    a = 1;
    foo.current.forceUpdate();
    await waitForAll(['A: 1, B: 0']);

    ReactNoop.render(<Foo ref={foo} b={0} />);
    await waitForAll([]);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can call sCU while resuming a partly mounted component', () => {
    const instances = new Set();

    class Bar extends React.Component {
      state = {y: 'A'};
      constructor() {
        super();
        instances.add(this);
      }
      shouldComponentUpdate(newProps, newState) {
        return this.props.x !== newProps.x || this.state.y !== newState.y;
      }
      render() {
        Scheduler.log('Bar:' + this.props.x);
        return <span prop={String(this.props.x === this.state.y)} />;
      }
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return [
        <Bar key="a" x="A" />,
        <Bar key="b" x={props.step === 0 ? 'B' : 'B2'} />,
        <Bar key="c" x="C" />,
        <Bar key="d" x="D" />,
      ];
    }

    ReactNoop.render(<Foo step={0} />);
    ReactNoop.flushDeferredPri(40);
    assertLog(['Foo', 'Bar:A', 'Bar:B', 'Bar:C']);

    expect(instances.size).toBe(3);

    ReactNoop.render(<Foo step={1} />);
    ReactNoop.flushDeferredPri(50);
    // A was memoized and reused. B was memoized but couldn't be reused because
    // props differences. C was memoized and reused. D never even started so it
    // needed a new instance.
    assertLog(['Foo', 'Bar:B2', 'Bar:D']);

    // We expect each rerender to correspond to a new instance.
    expect(instances.size).toBe(4);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('gets new props when setting state on a partly updated component', async () => {
    const instances = [];

    class Bar extends React.Component {
      state = {y: 'A'};
      constructor() {
        super();
        instances.push(this);
      }
      performAction() {
        this.setState({
          y: 'B',
        });
      }
      render() {
        Scheduler.log('Bar:' + this.props.x + '-' + this.props.step);
        return <span prop={String(this.props.x === this.state.y)} />;
      }
    }

    function Baz() {
      // This component is used as a sibling to Foo so that we can fully
      // complete Foo, without committing.
      Scheduler.log('Baz');
      return <div />;
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return [
        <Bar key="a" x="A" step={props.step} />,
        <Bar key="b" x="B" step={props.step} />,
      ];
    }

    ReactNoop.render(
      <div>
        <Foo step={0} />
        <Baz />
        <Baz />
      </div>,
    );
    await waitForAll([]);

    // Flush part way through with new props, fully completing the first Bar.
    // However, it doesn't commit yet.
    ReactNoop.render(
      <div>
        <Foo step={1} />
        <Baz />
        <Baz />
      </div>,
    );
    ReactNoop.flushDeferredPri(45);
    assertLog(['Foo', 'Bar:A-1', 'Bar:B-1', 'Baz']);

    // Make an update to the same Bar.
    instances[0].performAction();

    await waitForAll(['Bar:A-1', 'Baz']);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('calls componentWillMount twice if the initial render is aborted', async () => {
    class LifeCycle extends React.Component {
      state = {x: this.props.x};
      UNSAFE_componentWillReceiveProps(nextProps) {
        Scheduler.log(
          'componentWillReceiveProps:' + this.state.x + '-' + nextProps.x,
        );
        this.setState({x: nextProps.x});
      }
      UNSAFE_componentWillMount() {
        Scheduler.log(
          'componentWillMount:' + this.state.x + '-' + this.props.x,
        );
      }
      componentDidMount() {
        Scheduler.log('componentDidMount:' + this.state.x + '-' + this.props.x);
      }
      render() {
        return <span />;
      }
    }

    function Trail() {
      Scheduler.log('Trail');
      return null;
    }

    function App(props) {
      Scheduler.log('App');
      return (
        <div>
          <LifeCycle x={props.x} />
          <Trail />
        </div>
      );
    }

    ReactNoop.render(<App x={0} />);
    ReactNoop.flushDeferredPri(30);

    assertLog(['App', 'componentWillMount:0-0']);

    ReactNoop.render(<App x={1} />);
    await waitForAll([
      'App',
      'componentWillReceiveProps:0-1',
      'componentWillMount:1-1',
      'Trail',
      'componentDidMount:1-1',
    ]);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('uses state set in componentWillMount even if initial render was aborted', async () => {
    class LifeCycle extends React.Component {
      constructor(props) {
        super(props);
        this.state = {x: this.props.x + '(ctor)'};
      }
      UNSAFE_componentWillMount() {
        Scheduler.log('componentWillMount:' + this.state.x);
        this.setState({x: this.props.x + '(willMount)'});
      }
      componentDidMount() {
        Scheduler.log('componentDidMount:' + this.state.x);
      }
      render() {
        Scheduler.log('render:' + this.state.x);
        return <span />;
      }
    }

    function App(props) {
      Scheduler.log('App');
      return <LifeCycle x={props.x} />;
    }

    ReactNoop.render(<App x={0} />);
    ReactNoop.flushDeferredPri(20);

    assertLog(['App', 'componentWillMount:0(ctor)', 'render:0(willMount)']);

    ReactNoop.render(<App x={1} />);
    await waitForAll([
      'App',
      'componentWillMount:0(willMount)',
      'render:1(willMount)',
      'componentDidMount:1(willMount)',
    ]);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('calls componentWill* twice if an update render is aborted', async () => {
    class LifeCycle extends React.Component {
      UNSAFE_componentWillMount() {
        Scheduler.log('componentWillMount:' + this.props.x);
      }
      componentDidMount() {
        Scheduler.log('componentDidMount:' + this.props.x);
      }
      UNSAFE_componentWillReceiveProps(nextProps) {
        Scheduler.log(
          'componentWillReceiveProps:' + this.props.x + '-' + nextProps.x,
        );
      }
      shouldComponentUpdate(nextProps) {
        Scheduler.log(
          'shouldComponentUpdate:' + this.props.x + '-' + nextProps.x,
        );
        return true;
      }
      UNSAFE_componentWillUpdate(nextProps) {
        Scheduler.log(
          'componentWillUpdate:' + this.props.x + '-' + nextProps.x,
        );
      }
      componentDidUpdate(prevProps) {
        Scheduler.log('componentDidUpdate:' + this.props.x + '-' + prevProps.x);
      }
      render() {
        Scheduler.log('render:' + this.props.x);
        return <span />;
      }
    }

    function Sibling() {
      // The sibling is used to confirm that we've completed the first child,
      // but not yet flushed.
      Scheduler.log('Sibling');
      return <span />;
    }

    function App(props) {
      Scheduler.log('App');

      return [<LifeCycle key="a" x={props.x} />, <Sibling key="b" />];
    }

    ReactNoop.render(<App x={0} />);
    await waitForAll([
      'App',
      'componentWillMount:0',
      'render:0',
      'Sibling',
      'componentDidMount:0',
    ]);

    ReactNoop.render(<App x={1} />);
    ReactNoop.flushDeferredPri(30);

    assertLog([
      'App',
      'componentWillReceiveProps:0-1',
      'shouldComponentUpdate:0-1',
      'componentWillUpdate:0-1',
      'render:1',
      'Sibling',
      // no componentDidUpdate
    ]);

    ReactNoop.render(<App x={2} />);
    await waitForAll([
      'App',
      'componentWillReceiveProps:1-2',
      'shouldComponentUpdate:1-2',
      'componentWillUpdate:1-2',
      'render:2',
      'Sibling',
      // When componentDidUpdate finally gets called, it covers both updates.
      'componentDidUpdate:2-0',
    ]);
  });

  it('calls getDerivedStateFromProps even for state-only updates', async () => {
    let instance;

    class LifeCycle extends React.Component {
      state = {};
      static getDerivedStateFromProps(props, prevState) {
        Scheduler.log('getDerivedStateFromProps');
        return {foo: 'foo'};
      }
      changeState() {
        this.setState({foo: 'bar'});
      }
      componentDidUpdate() {
        Scheduler.log('componentDidUpdate');
      }
      render() {
        Scheduler.log('render');
        instance = this;
        return null;
      }
    }

    ReactNoop.render(<LifeCycle />);
    await waitForAll(['getDerivedStateFromProps', 'render']);
    expect(instance.state).toEqual({foo: 'foo'});

    instance.changeState();
    await waitForAll([
      'getDerivedStateFromProps',
      'render',
      'componentDidUpdate',
    ]);
    expect(instance.state).toEqual({foo: 'foo'});
  });

  it('does not call getDerivedStateFromProps if neither state nor props have changed', async () => {
    class Parent extends React.Component {
      state = {parentRenders: 0};
      static getDerivedStateFromProps(props, prevState) {
        Scheduler.log('getDerivedStateFromProps');
        return prevState.parentRenders + 1;
      }
      render() {
        Scheduler.log('Parent');
        return <Child parentRenders={this.state.parentRenders} ref={child} />;
      }
    }

    class Child extends React.Component {
      render() {
        Scheduler.log('Child');
        return this.props.parentRenders;
      }
    }

    const child = React.createRef(null);
    ReactNoop.render(<Parent />);
    await waitForAll(['getDerivedStateFromProps', 'Parent', 'Child']);

    // Schedule an update on the child. The parent should not re-render.
    child.current.setState({});
    await waitForAll(['Child']);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('does not call componentWillReceiveProps for state-only updates', async () => {
    const instances = [];

    class LifeCycle extends React.Component {
      state = {x: 0};
      tick() {
        this.setState({
          x: this.state.x + 1,
        });
      }
      UNSAFE_componentWillMount() {
        instances.push(this);
        Scheduler.log('componentWillMount:' + this.state.x);
      }
      componentDidMount() {
        Scheduler.log('componentDidMount:' + this.state.x);
      }
      UNSAFE_componentWillReceiveProps(nextProps) {
        Scheduler.log('componentWillReceiveProps');
      }
      shouldComponentUpdate(nextProps, nextState) {
        Scheduler.log(
          'shouldComponentUpdate:' + this.state.x + '-' + nextState.x,
        );
        return true;
      }
      UNSAFE_componentWillUpdate(nextProps, nextState) {
        Scheduler.log(
          'componentWillUpdate:' + this.state.x + '-' + nextState.x,
        );
      }
      componentDidUpdate(prevProps, prevState) {
        Scheduler.log('componentDidUpdate:' + this.state.x + '-' + prevState.x);
      }
      render() {
        Scheduler.log('render:' + this.state.x);
        return <span />;
      }
    }

    // This wrap is a bit contrived because we can't pause a completed root and
    // there is currently an issue where a component can't reuse its render
    // output unless it fully completed.
    class Wrap extends React.Component {
      state = {y: 0};
      UNSAFE_componentWillMount() {
        instances.push(this);
      }
      tick() {
        this.setState({
          y: this.state.y + 1,
        });
      }
      render() {
        Scheduler.log('Wrap');
        return <LifeCycle y={this.state.y} />;
      }
    }

    function Sibling() {
      // The sibling is used to confirm that we've completed the first child,
      // but not yet flushed.
      Scheduler.log('Sibling');
      return <span />;
    }

    function App(props) {
      Scheduler.log('App');
      return [<Wrap key="a" />, <Sibling key="b" />];
    }

    ReactNoop.render(<App y={0} />);
    await waitForAll([
      'App',
      'Wrap',
      'componentWillMount:0',
      'render:0',
      'Sibling',
      'componentDidMount:0',
    ]);

    // LifeCycle
    instances[1].tick();

    ReactNoop.flushDeferredPri(25);

    assertLog([
      // no componentWillReceiveProps
      'shouldComponentUpdate:0-1',
      'componentWillUpdate:0-1',
      'render:1',
      // no componentDidUpdate
    ]);

    // LifeCycle
    instances[1].tick();

    await waitForAll([
      // no componentWillReceiveProps
      'shouldComponentUpdate:1-2',
      'componentWillUpdate:1-2',
      'render:2',
      // When componentDidUpdate finally gets called, it covers both updates.
      'componentDidUpdate:2-0',
    ]);

    // Next we will update props of LifeCycle by updating its parent.

    instances[0].tick();

    ReactNoop.flushDeferredPri(30);

    assertLog([
      'Wrap',
      'componentWillReceiveProps',
      'shouldComponentUpdate:2-2',
      'componentWillUpdate:2-2',
      'render:2',
      // no componentDidUpdate
    ]);

    // Next we will update LifeCycle directly but not with new props.
    instances[1].tick();

    await waitForAll([
      // This should not trigger another componentWillReceiveProps because
      // we never got new props.
      'shouldComponentUpdate:2-3',
      'componentWillUpdate:2-3',
      'render:3',
      'componentDidUpdate:3-2',
    ]);

    // TODO: Test that we get the expected values for the same scenario with
    // incomplete parents.
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('skips will/DidUpdate when bailing unless an update was already in progress', async () => {
    class LifeCycle extends React.Component {
      UNSAFE_componentWillMount() {
        Scheduler.log('componentWillMount');
      }
      componentDidMount() {
        Scheduler.log('componentDidMount');
      }
      UNSAFE_componentWillReceiveProps(nextProps) {
        Scheduler.log('componentWillReceiveProps');
      }
      shouldComponentUpdate(nextProps) {
        Scheduler.log('shouldComponentUpdate');
        // Bail
        return this.props.x !== nextProps.x;
      }
      UNSAFE_componentWillUpdate(nextProps) {
        Scheduler.log('componentWillUpdate');
      }
      componentDidUpdate(prevProps) {
        Scheduler.log('componentDidUpdate');
      }
      render() {
        Scheduler.log('render');
        return <span />;
      }
    }

    function Sibling() {
      Scheduler.log('render sibling');
      return <span />;
    }

    function App(props) {
      return [<LifeCycle key="a" x={props.x} />, <Sibling key="b" />];
    }

    ReactNoop.render(<App x={0} />);
    await waitForAll([
      'componentWillMount',
      'render',
      'render sibling',
      'componentDidMount',
    ]);

    // Update to same props
    ReactNoop.render(<App x={0} />);
    await waitForAll([
      'componentWillReceiveProps',
      'shouldComponentUpdate',
      // no componentWillUpdate
      // no render
      'render sibling',
      // no componentDidUpdate
    ]);

    // Begin updating to new props...
    ReactNoop.render(<App x={1} />);
    ReactNoop.flushDeferredPri(30);

    assertLog([
      'componentWillReceiveProps',
      'shouldComponentUpdate',
      'componentWillUpdate',
      'render',
      'render sibling',
      // no componentDidUpdate yet
    ]);

    // ...but we'll interrupt it to rerender the same props.
    ReactNoop.render(<App x={1} />);
    await waitForAll([]);

    // We can bail out this time, but we must call componentDidUpdate.
    assertLog([
      'componentWillReceiveProps',
      'shouldComponentUpdate',
      // no componentWillUpdate
      // no render
      'render sibling',
      'componentDidUpdate',
    ]);
  });

  it('can nest batchedUpdates', async () => {
    let instance;

    class Foo extends React.Component {
      state = {n: 0};
      render() {
        instance = this;
        return <div />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);

    ReactNoop.flushSync(() => {
      ReactNoop.batchedUpdates(() => {
        instance.setState({n: 1}, () => Scheduler.log('setState 1'));
        instance.setState({n: 2}, () => Scheduler.log('setState 2'));
        ReactNoop.batchedUpdates(() => {
          instance.setState({n: 3}, () => Scheduler.log('setState 3'));
          instance.setState({n: 4}, () => Scheduler.log('setState 4'));
          Scheduler.log('end inner batchedUpdates');
        });
        Scheduler.log('end outer batchedUpdates');
      });
    });

    // ReactNoop.flush() not needed because updates are synchronous

    assertLog([
      'end inner batchedUpdates',
      'end outer batchedUpdates',
      'setState 1',
      'setState 2',
      'setState 3',
      'setState 4',
    ]);
    expect(instance.state.n).toEqual(4);
  });

  it('can handle if setState callback throws', async () => {
    let instance;

    class Foo extends React.Component {
      state = {n: 0};
      render() {
        instance = this;
        return <div />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);

    function updater({n}) {
      return {n: n + 1};
    }

    instance.setState(updater, () => Scheduler.log('first callback'));
    instance.setState(updater, () => {
      Scheduler.log('second callback');
      throw new Error('callback error');
    });
    instance.setState(updater, () => Scheduler.log('third callback'));

    await waitForThrow('callback error');

    // The third callback isn't called because the second one throws
    assertLog(['first callback', 'second callback']);
    expect(instance.state.n).toEqual(3);
  });

  // @gate !disableLegacyContext && !disableLegacyContextForFunctionComponents
  it('merges and masks context', async () => {
    class Intl extends React.Component {
      static childContextTypes = {
        locale: PropTypes.string,
      };
      getChildContext() {
        return {
          locale: this.props.locale,
        };
      }
      render() {
        Scheduler.log('Intl ' + JSON.stringify(this.context));
        return this.props.children;
      }
    }

    class Router extends React.Component {
      static childContextTypes = {
        route: PropTypes.string,
      };
      getChildContext() {
        return {
          route: this.props.route,
        };
      }
      render() {
        Scheduler.log('Router ' + JSON.stringify(this.context));
        return this.props.children;
      }
    }

    class ShowLocale extends React.Component {
      static contextTypes = {
        locale: PropTypes.string,
      };
      render() {
        Scheduler.log('ShowLocale ' + JSON.stringify(this.context));
        return this.context.locale;
      }
    }

    class ShowRoute extends React.Component {
      static contextTypes = {
        route: PropTypes.string,
      };
      render() {
        Scheduler.log('ShowRoute ' + JSON.stringify(this.context));
        return this.context.route;
      }
    }

    function ShowBoth(props, context) {
      Scheduler.log('ShowBoth ' + JSON.stringify(context));
      return `${context.route} in ${context.locale}`;
    }
    ShowBoth.contextTypes = {
      locale: PropTypes.string,
      route: PropTypes.string,
    };

    class ShowNeither extends React.Component {
      render() {
        Scheduler.log('ShowNeither ' + JSON.stringify(this.context));
        return null;
      }
    }

    class Indirection extends React.Component {
      render() {
        Scheduler.log('Indirection ' + JSON.stringify(this.context));
        return [
          <ShowLocale key="a" />,
          <ShowRoute key="b" />,
          <ShowNeither key="c" />,
          <Intl key="d" locale="ru">
            <ShowBoth />
          </Intl>,
          <ShowBoth key="e" />,
        ];
      }
    }

    ReactNoop.render(
      <Intl locale="fr">
        <ShowLocale />
        <div>
          <ShowBoth />
        </div>
      </Intl>,
    );
    await waitForAll([
      'Intl {}',
      'ShowLocale {"locale":"fr"}',
      'ShowBoth {"locale":"fr"}',
    ]);
    assertConsoleErrorDev([
      'Intl uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Intl (at **)',
      'ShowLocale uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in ShowLocale (at **)',
      'ShowBoth uses the legacy contextTypes API which will be removed soon. ' +
        'Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in ShowBoth (at **)',
    ]);

    ReactNoop.render(
      <Intl locale="de">
        <ShowLocale />
        <div>
          <ShowBoth />
        </div>
      </Intl>,
    );
    await waitForAll([
      'Intl {}',
      'ShowLocale {"locale":"de"}',
      'ShowBoth {"locale":"de"}',
    ]);
    React.startTransition(() => {
      ReactNoop.render(
        <Intl locale="sv">
          <ShowLocale />
          <div>
            <ShowBoth />
          </div>
        </Intl>,
      );
    });
    await waitFor(['Intl {}']);

    ReactNoop.render(
      <Intl locale="en">
        <ShowLocale />
        <Router route="/about">
          <Indirection />
        </Router>
        <ShowBoth />
      </Intl>,
    );
    await waitForAll([
      'ShowLocale {"locale":"sv"}',
      'ShowBoth {"locale":"sv"}',
      'Intl {}',
      'ShowLocale {"locale":"en"}',
      'Router {}',
      'Indirection {}',
      'ShowLocale {"locale":"en"}',
      'ShowRoute {"route":"/about"}',
      'ShowNeither {}',
      'Intl {}',
      'ShowBoth {"locale":"ru","route":"/about"}',
      'ShowBoth {"locale":"en","route":"/about"}',
      'ShowBoth {"locale":"en"}',
    ]);
    assertConsoleErrorDev([
      'Router uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Router (at **)',
      'ShowRoute uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Indirection (at **)',
    ]);
  });

  // @gate !disableLegacyContext
  it('does not leak own context into context provider', async () => {
    if (gate(flags => flags.disableLegacyContext)) {
      throw new Error('This test infinite loops when context is disabled.');
    }
    class Recurse extends React.Component {
      static contextTypes = {
        n: PropTypes.number,
      };
      static childContextTypes = {
        n: PropTypes.number,
      };
      getChildContext() {
        return {n: (this.context.n || 3) - 1};
      }
      render() {
        Scheduler.log('Recurse ' + JSON.stringify(this.context));
        if (this.context.n === 0) {
          return null;
        }
        return <Recurse />;
      }
    }

    ReactNoop.render(<Recurse />);
    await waitForAll([
      'Recurse {}',
      'Recurse {"n":2}',
      'Recurse {"n":1}',
      'Recurse {"n":0}',
    ]);
    assertConsoleErrorDev([
      'Recurse uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Recurse (at **)',
      'Recurse uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Recurse (at **)',
    ]);
  });

  // @gate enableLegacyHidden && !disableLegacyContext
  it('provides context when reusing work', async () => {
    class Intl extends React.Component {
      static childContextTypes = {
        locale: PropTypes.string,
      };
      getChildContext() {
        return {
          locale: this.props.locale,
        };
      }
      render() {
        Scheduler.log('Intl ' + JSON.stringify(this.context));
        return this.props.children;
      }
    }

    class ShowLocale extends React.Component {
      static contextTypes = {
        locale: PropTypes.string,
      };
      render() {
        Scheduler.log('ShowLocale ' + JSON.stringify(this.context));
        return this.context.locale;
      }
    }

    React.startTransition(() => {
      ReactNoop.render(
        <Intl locale="fr">
          <ShowLocale />
          <LegacyHiddenDiv mode="hidden">
            <ShowLocale />
            <Intl locale="ru">
              <ShowLocale />
            </Intl>
          </LegacyHiddenDiv>
          <ShowLocale />
        </Intl>,
      );
    });

    await waitFor([
      'Intl {}',
      'ShowLocale {"locale":"fr"}',
      'ShowLocale {"locale":"fr"}',
    ]);
    assertConsoleErrorDev([
      'Intl uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Intl (at **)',
      'ShowLocale uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in ShowLocale (at **)',
    ]);

    await waitForAll([
      'ShowLocale {"locale":"fr"}',
      'Intl {}',
      'ShowLocale {"locale":"ru"}',
    ]);
  });

  // @gate !disableLegacyContext && !disableLegacyContextForFunctionComponents
  it('reads context when setState is below the provider', async () => {
    let statefulInst;

    class Intl extends React.Component {
      static childContextTypes = {
        locale: PropTypes.string,
      };
      getChildContext() {
        const childContext = {
          locale: this.props.locale,
        };
        Scheduler.log('Intl:provide ' + JSON.stringify(childContext));
        return childContext;
      }
      render() {
        Scheduler.log('Intl:read ' + JSON.stringify(this.context));
        return this.props.children;
      }
    }

    class ShowLocaleClass extends React.Component {
      static contextTypes = {
        locale: PropTypes.string,
      };
      render() {
        Scheduler.log('ShowLocaleClass:read ' + JSON.stringify(this.context));
        return this.context.locale;
      }
    }

    function ShowLocaleFn(props, context) {
      Scheduler.log('ShowLocaleFn:read ' + JSON.stringify(context));
      return context.locale;
    }
    ShowLocaleFn.contextTypes = {
      locale: PropTypes.string,
    };

    class Stateful extends React.Component {
      state = {x: 0};
      render() {
        statefulInst = this;
        return this.props.children;
      }
    }

    function IndirectionFn(props, context) {
      Scheduler.log('IndirectionFn ' + JSON.stringify(context));
      return props.children;
    }

    class IndirectionClass extends React.Component {
      render() {
        Scheduler.log('IndirectionClass ' + JSON.stringify(this.context));
        return this.props.children;
      }
    }

    ReactNoop.render(
      <Intl locale="fr">
        <IndirectionFn>
          <IndirectionClass>
            <Stateful>
              <ShowLocaleClass />
              <ShowLocaleFn />
            </Stateful>
          </IndirectionClass>
        </IndirectionFn>
      </Intl>,
    );
    await waitForAll([
      'Intl:read {}',
      'Intl:provide {"locale":"fr"}',
      'IndirectionFn {}',
      'IndirectionClass {}',
      'ShowLocaleClass:read {"locale":"fr"}',
      'ShowLocaleFn:read {"locale":"fr"}',
    ]);
    assertConsoleErrorDev([
      'Intl uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Intl (at **)',
      'ShowLocaleClass uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in ShowLocaleClass (at **)',
      'ShowLocaleFn uses the legacy contextTypes API which will be removed soon. ' +
        'Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in ShowLocaleFn (at **)',
    ]);

    statefulInst.setState({x: 1});
    await waitForAll([]);
    // All work has been memoized because setState()
    // happened below the context and could not have affected it.
    assertLog([]);
  });

  // @gate !disableLegacyContext && !disableLegacyContextForFunctionComponents
  it('reads context when setState is above the provider', async () => {
    let statefulInst;

    class Intl extends React.Component {
      static childContextTypes = {
        locale: PropTypes.string,
      };
      getChildContext() {
        const childContext = {
          locale: this.props.locale,
        };
        Scheduler.log('Intl:provide ' + JSON.stringify(childContext));
        return childContext;
      }
      render() {
        Scheduler.log('Intl:read ' + JSON.stringify(this.context));
        return this.props.children;
      }
    }

    class ShowLocaleClass extends React.Component {
      static contextTypes = {
        locale: PropTypes.string,
      };
      render() {
        Scheduler.log('ShowLocaleClass:read ' + JSON.stringify(this.context));
        return this.context.locale;
      }
    }

    function ShowLocaleFn(props, context) {
      Scheduler.log('ShowLocaleFn:read ' + JSON.stringify(context));
      return context.locale;
    }
    ShowLocaleFn.contextTypes = {
      locale: PropTypes.string,
    };

    function IndirectionFn(props, context) {
      Scheduler.log('IndirectionFn ' + JSON.stringify(context));
      return props.children;
    }

    class IndirectionClass extends React.Component {
      render() {
        Scheduler.log('IndirectionClass ' + JSON.stringify(this.context));
        return this.props.children;
      }
    }

    class Stateful extends React.Component {
      state = {locale: 'fr'};
      render() {
        statefulInst = this;
        return <Intl locale={this.state.locale}>{this.props.children}</Intl>;
      }
    }

    ReactNoop.render(
      <Stateful>
        <IndirectionFn>
          <IndirectionClass>
            <ShowLocaleClass />
            <ShowLocaleFn />
          </IndirectionClass>
        </IndirectionFn>
      </Stateful>,
    );
    await waitForAll([
      'Intl:read {}',
      'Intl:provide {"locale":"fr"}',
      'IndirectionFn {}',
      'IndirectionClass {}',
      'ShowLocaleClass:read {"locale":"fr"}',
      'ShowLocaleFn:read {"locale":"fr"}',
    ]);

    assertConsoleErrorDev([
      'Intl uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Stateful (at **)',
      'ShowLocaleClass uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in ShowLocaleClass (at **)',

      'ShowLocaleFn uses the legacy contextTypes API which will be removed soon. ' +
        'Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in ShowLocaleFn (at **)',
    ]);

    statefulInst.setState({locale: 'gr'});
    await waitForAll([
      // Intl is below setState() so it might have been
      // affected by it. Therefore we re-render and recompute
      // its child context.
      'Intl:read {}',
      'Intl:provide {"locale":"gr"}',
      // TODO: it's unfortunate that we can't reuse work on
      // these components even though they don't depend on context.
      'IndirectionFn {}',
      'IndirectionClass {}',
      // These components depend on context:
      'ShowLocaleClass:read {"locale":"gr"}',
      'ShowLocaleFn:read {"locale":"gr"}',
    ]);
  });

  // @gate !disableLegacyContext || !__DEV__
  it('maintains the correct context when providers bail out due to low priority', async () => {
    class Root extends React.Component {
      render() {
        return <Middle {...this.props} />;
      }
    }

    let instance;

    class Middle extends React.Component {
      constructor(props, context) {
        super(props, context);
        instance = this;
      }
      shouldComponentUpdate() {
        // Return false so that our child will get a NoWork priority (and get bailed out)
        return false;
      }
      render() {
        return <Child />;
      }
    }

    // Child must be a context provider to trigger the bug
    class Child extends React.Component {
      static childContextTypes = {};
      getChildContext() {
        return {};
      }
      render() {
        return <div />;
      }
    }

    // Init
    ReactNoop.render(<Root />);
    await waitForAll([]);

    assertConsoleErrorDev([
      'Child uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Middle (at **)\n' +
        '    in Root (at **)',
    ]);

    // Trigger an update in the middle of the tree
    instance.setState({});
    await waitForAll([]);
  });

  // @gate !disableLegacyContext || !__DEV__
  it('maintains the correct context when unwinding due to an error in render', async () => {
    class Root extends React.Component {
      componentDidCatch(error) {
        // If context is pushed/popped correctly,
        // This method will be used to handle the intentionally-thrown Error.
      }
      render() {
        return <ContextProvider depth={1} />;
      }
    }

    let instance;

    class ContextProvider extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {};
        if (props.depth === 1) {
          instance = this;
        }
      }
      static childContextTypes = {};
      getChildContext() {
        return {};
      }
      render() {
        if (this.state.throwError) {
          throw Error();
        }
        return this.props.depth < 4 ? (
          <ContextProvider depth={this.props.depth + 1} />
        ) : (
          <div />
        );
      }
    }

    // Init
    ReactNoop.render(<Root />);
    await waitForAll([]);
    assertConsoleErrorDev([
      'ContextProvider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Root (at **)',
    ]);

    // Trigger an update in the middle of the tree
    // This is necessary to reproduce the error as it currently exists.
    instance.setState({
      throwError: true,
    });
    await waitForAll([]);
    assertConsoleErrorDev([
      'Root: Error boundaries should implement getDerivedStateFromError(). ' +
        'In that method, return a state update to display an error message or fallback UI.\n' +
        '    in Root (at **)',
    ]);
  });

  // @gate !disableLegacyContext || !__DEV__
  it('should not recreate masked context unless inputs have changed', async () => {
    let scuCounter = 0;

    class MyComponent extends React.Component {
      static contextTypes = {};
      componentDidMount(prevProps, prevState) {
        Scheduler.log('componentDidMount');
        this.setState({setStateInCDU: true});
      }
      componentDidUpdate(prevProps, prevState) {
        Scheduler.log('componentDidUpdate');
        if (this.state.setStateInCDU) {
          this.setState({setStateInCDU: false});
        }
      }
      UNSAFE_componentWillReceiveProps(nextProps) {
        Scheduler.log('componentWillReceiveProps');
        this.setState({setStateInCDU: true});
      }
      render() {
        Scheduler.log('render');
        return null;
      }
      shouldComponentUpdate(nextProps, nextState) {
        Scheduler.log('shouldComponentUpdate');
        return scuCounter++ < 5; // Don't let test hang
      }
    }

    ReactNoop.render(<MyComponent />);
    await waitForAll([
      'render',
      'componentDidMount',
      'shouldComponentUpdate',
      'render',
      'componentDidUpdate',
      'shouldComponentUpdate',
      'render',
      'componentDidUpdate',
    ]);

    assertConsoleErrorDev([
      'MyComponent uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in MyComponent (at **)',
    ]);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('should reuse memoized work if pointers are updated before calling lifecycles', async () => {
    const cduNextProps = [];
    const cduPrevProps = [];
    const scuNextProps = [];
    const scuPrevProps = [];
    let renderCounter = 0;

    function SecondChild(props) {
      return <span>{props.children}</span>;
    }

    class FirstChild extends React.Component {
      componentDidUpdate(prevProps, prevState) {
        cduNextProps.push(this.props);
        cduPrevProps.push(prevProps);
      }
      shouldComponentUpdate(nextProps, nextState) {
        scuNextProps.push(nextProps);
        scuPrevProps.push(this.props);
        return this.props.children !== nextProps.children;
      }
      render() {
        renderCounter++;
        return <span>{this.props.children}</span>;
      }
    }

    class Middle extends React.Component {
      render() {
        return (
          <div>
            <FirstChild>{this.props.children}</FirstChild>
            <SecondChild>{this.props.children}</SecondChild>
          </div>
        );
      }
    }

    function Root(props) {
      return (
        <div hidden={true}>
          <Middle {...props} />
        </div>
      );
    }

    // Initial render of the entire tree.
    // Renders: Root, Middle, FirstChild, SecondChild
    ReactNoop.render(<Root>A</Root>);
    await waitForAll([]);

    expect(renderCounter).toBe(1);

    // Schedule low priority work to update children.
    // Give it enough time to partially render.
    // Renders: Root, Middle, FirstChild
    ReactNoop.render(<Root>B</Root>);
    ReactNoop.flushDeferredPri(20 + 30 + 5);

    // At this point our FirstChild component has rendered a second time,
    // But since the render is not completed cDU should not be called yet.
    expect(renderCounter).toBe(2);
    expect(scuPrevProps).toEqual([{children: 'A'}]);
    expect(scuNextProps).toEqual([{children: 'B'}]);
    expect(cduPrevProps).toEqual([]);
    expect(cduNextProps).toEqual([]);

    // Next interrupt the partial render with higher priority work.
    // The in-progress child content will bailout.
    // Renders: Root, Middle, FirstChild, SecondChild
    ReactNoop.render(<Root>B</Root>);
    await waitForAll([]);

    // At this point the higher priority render has completed.
    // Since FirstChild props didn't change, sCU returned false.
    // The previous memoized copy should be used.
    expect(renderCounter).toBe(2);
    expect(scuPrevProps).toEqual([{children: 'A'}, {children: 'B'}]);
    expect(scuNextProps).toEqual([{children: 'B'}, {children: 'B'}]);
    expect(cduPrevProps).toEqual([{children: 'A'}]);
    expect(cduNextProps).toEqual([{children: 'B'}]);
  });

  // @gate !disableLegacyContext
  it('updates descendants with new context values', async () => {
    let instance;

    class TopContextProvider extends React.Component {
      static childContextTypes = {
        count: PropTypes.number,
      };
      constructor() {
        super();
        this.state = {count: 0};
        instance = this;
      }
      getChildContext = () => ({
        count: this.state.count,
      });
      render = () => this.props.children;
      updateCount = () =>
        this.setState(state => ({
          count: state.count + 1,
        }));
    }

    class Middle extends React.Component {
      render = () => this.props.children;
    }

    class Child extends React.Component {
      static contextTypes = {
        count: PropTypes.number,
      };
      render = () => {
        Scheduler.log(`count:${this.context.count}`);
        return null;
      };
    }

    ReactNoop.render(
      <TopContextProvider>
        <Middle>
          <Child />
        </Middle>
      </TopContextProvider>,
    );

    await waitForAll(['count:0']);
    assertConsoleErrorDev([
      'TopContextProvider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in TopContextProvider (at **)',
      'Child uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Child (at **)',
    ]);
    instance.updateCount();
    await waitForAll(['count:1']);
  });

  // @gate !disableLegacyContext
  it('updates descendants with multiple context-providing ancestors with new context values', async () => {
    let instance;

    class TopContextProvider extends React.Component {
      static childContextTypes = {
        count: PropTypes.number,
      };
      constructor() {
        super();
        this.state = {count: 0};
        instance = this;
      }
      getChildContext = () => ({
        count: this.state.count,
      });
      render = () => this.props.children;
      updateCount = () =>
        this.setState(state => ({
          count: state.count + 1,
        }));
    }

    class MiddleContextProvider extends React.Component {
      static childContextTypes = {
        name: PropTypes.string,
      };
      getChildContext = () => ({
        name: 'brian',
      });
      render = () => this.props.children;
    }

    class Child extends React.Component {
      static contextTypes = {
        count: PropTypes.number,
      };
      render = () => {
        Scheduler.log(`count:${this.context.count}`);
        return null;
      };
    }

    ReactNoop.render(
      <TopContextProvider>
        <MiddleContextProvider>
          <Child />
        </MiddleContextProvider>
      </TopContextProvider>,
    );

    await waitForAll(['count:0']);
    assertConsoleErrorDev([
      'TopContextProvider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in TopContextProvider (at **)',
      'MiddleContextProvider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in MiddleContextProvider (at **)',
      'Child uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Child (at **)',
    ]);
    instance.updateCount();
    await waitForAll(['count:1']);
  });

  // @gate !disableLegacyContext
  it('should not update descendants with new context values if shouldComponentUpdate returns false', async () => {
    let instance;

    class TopContextProvider extends React.Component {
      static childContextTypes = {
        count: PropTypes.number,
      };
      constructor() {
        super();
        this.state = {count: 0};
        instance = this;
      }
      getChildContext = () => ({
        count: this.state.count,
      });
      render = () => this.props.children;
      updateCount = () =>
        this.setState(state => ({
          count: state.count + 1,
        }));
    }

    class MiddleScu extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render = () => this.props.children;
    }

    class MiddleContextProvider extends React.Component {
      static childContextTypes = {
        name: PropTypes.string,
      };
      getChildContext = () => ({
        name: 'brian',
      });
      render = () => this.props.children;
    }

    class Child extends React.Component {
      static contextTypes = {
        count: PropTypes.number,
      };
      render = () => {
        Scheduler.log(`count:${this.context.count}`);
        return null;
      };
    }

    ReactNoop.render(
      <TopContextProvider>
        <MiddleScu>
          <MiddleContextProvider>
            <Child />
          </MiddleContextProvider>
        </MiddleScu>
      </TopContextProvider>,
    );

    await waitForAll(['count:0']);
    assertConsoleErrorDev([
      'TopContextProvider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in TopContextProvider (at **)',
      'MiddleContextProvider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in MiddleContextProvider (at **)',
      'Child uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Child (at **)',
    ]);
    instance.updateCount();
    await waitForAll([]);
  });

  // @gate !disableLegacyContext
  it('should update descendants with new context values if setState() is called in the middle of the tree', async () => {
    let middleInstance;
    let topInstance;

    class TopContextProvider extends React.Component {
      static childContextTypes = {
        count: PropTypes.number,
      };
      constructor() {
        super();
        this.state = {count: 0};
        topInstance = this;
      }
      getChildContext = () => ({
        count: this.state.count,
      });
      render = () => this.props.children;
      updateCount = () =>
        this.setState(state => ({
          count: state.count + 1,
        }));
    }

    class MiddleScu extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render = () => this.props.children;
    }

    class MiddleContextProvider extends React.Component {
      static childContextTypes = {
        name: PropTypes.string,
      };
      constructor() {
        super();
        this.state = {name: 'brian'};
        middleInstance = this;
      }
      getChildContext = () => ({
        name: this.state.name,
      });
      updateName = name => {
        this.setState({name});
      };
      render = () => this.props.children;
    }

    class Child extends React.Component {
      static contextTypes = {
        count: PropTypes.number,
        name: PropTypes.string,
      };
      render = () => {
        Scheduler.log(`count:${this.context.count}, name:${this.context.name}`);
        return null;
      };
    }

    ReactNoop.render(
      <TopContextProvider>
        <MiddleScu>
          <MiddleContextProvider>
            <Child />
          </MiddleContextProvider>
        </MiddleScu>
      </TopContextProvider>,
    );

    await waitForAll(['count:0, name:brian']);
    assertConsoleErrorDev([
      'TopContextProvider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in TopContextProvider (at **)',
      'MiddleContextProvider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in MiddleContextProvider (at **)',
      'Child uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Child (at **)',
    ]);
    topInstance.updateCount();
    await waitForAll([]);
    middleInstance.updateName('not brian');
    await waitForAll(['count:1, name:not brian']);
  });

  it('does not interrupt for update at same priority', async () => {
    function Parent(props) {
      Scheduler.log('Parent: ' + props.step);
      return <Child step={props.step} />;
    }

    function Child(props) {
      Scheduler.log('Child: ' + props.step);
      return null;
    }

    React.startTransition(() => {
      ReactNoop.render(<Parent step={1} />);
    });
    await waitFor(['Parent: 1']);

    // Interrupt at same priority
    ReactNoop.render(<Parent step={2} />);

    await waitForAll(['Child: 1', 'Parent: 2', 'Child: 2']);
  });

  it('does not interrupt for update at lower priority', async () => {
    function Parent(props) {
      Scheduler.log('Parent: ' + props.step);
      return <Child step={props.step} />;
    }

    function Child(props) {
      Scheduler.log('Child: ' + props.step);
      return null;
    }

    React.startTransition(() => {
      ReactNoop.render(<Parent step={1} />);
    });
    await waitFor(['Parent: 1']);

    // Interrupt at lower priority
    ReactNoop.expire(2000);
    ReactNoop.render(<Parent step={2} />);

    await waitForAll(['Child: 1', 'Parent: 2', 'Child: 2']);
  });

  it('does interrupt for update at higher priority', async () => {
    function Parent(props) {
      Scheduler.log('Parent: ' + props.step);
      return <Child step={props.step} />;
    }

    function Child(props) {
      Scheduler.log('Child: ' + props.step);
      return null;
    }

    React.startTransition(() => {
      ReactNoop.render(<Parent step={1} />);
    });
    await waitFor(['Parent: 1']);

    // Interrupt at higher priority
    ReactNoop.flushSync(() => ReactNoop.render(<Parent step={2} />));
    assertLog(['Parent: 2', 'Child: 2']);

    await waitForAll([]);
  });

  // We sometimes use Maps with Fibers as keys.
  // @gate !disableLegacyContext || !__DEV__
  it('does not break with a bad Map polyfill', async () => {
    const realMapSet = Map.prototype.set;

    async function triggerCodePathThatUsesFibersAsMapKeys() {
      function Thing() {
        throw new Error('No.');
      }
      // This class uses legacy context, which triggers warnings,
      // the procedures for which use a Map to store fibers.
      class Boundary extends React.Component {
        state = {didError: false};
        componentDidCatch() {
          this.setState({didError: true});
        }
        static contextTypes = {
          color: () => null,
        };
        render() {
          return this.state.didError ? null : <Thing />;
        }
      }
      ReactNoop.render(
        <React.StrictMode>
          <Boundary />
        </React.StrictMode>,
      );
      await waitForAll([]);
      assertConsoleErrorDev([
        'Boundary uses the legacy contextTypes API which will soon be removed. ' +
          'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
          '    in Boundary (at **)',
        'Legacy context API has been detected within a strict-mode tree.\n' +
          '\n' +
          'The old API will be supported in all 16.x releases, but applications using it should migrate to the new version.\n' +
          '\n' +
          'Please update the following components: Boundary\n' +
          '\n' +
          'Learn more about this warning here: https://react.dev/link/legacy-context\n' +
          '    in Boundary (at **)',
      ]);
    }

    // First, verify that this code path normally receives Fibers as keys,
    // and that they're not extensible.
    jest.resetModules();
    let receivedNonExtensibleObjects;
    // eslint-disable-next-line no-extend-native
    Map.prototype.set = function (key) {
      if (typeof key === 'object' && key !== null) {
        if (!Object.isExtensible(key)) {
          receivedNonExtensibleObjects = true;
        }
      }
      return realMapSet.apply(this, arguments);
    };
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    let InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForThrow = InternalTestUtils.waitForThrow;
    assertLog = InternalTestUtils.assertLog;

    try {
      receivedNonExtensibleObjects = false;
      await triggerCodePathThatUsesFibersAsMapKeys();
    } finally {
      // eslint-disable-next-line no-extend-native
      Map.prototype.set = realMapSet;
    }
    // If this fails, find another code path in Fiber
    // that passes Fibers as keys to Maps.
    // Note that we only expect them to be non-extensible
    // in development.
    expect(receivedNonExtensibleObjects).toBe(__DEV__);

    // Next, verify that a Map polyfill that "writes" to keys
    // doesn't cause a failure.
    jest.resetModules();
    // eslint-disable-next-line no-extend-native
    Map.prototype.set = function (key, value) {
      if (typeof key === 'object' && key !== null) {
        // A polyfill could do something like this.
        // It would throw if an object is not extensible.
        key.__internalValueSlot = value;
      }
      return realMapSet.apply(this, arguments);
    };
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForThrow = InternalTestUtils.waitForThrow;
    assertLog = InternalTestUtils.assertLog;

    try {
      await triggerCodePathThatUsesFibersAsMapKeys();
    } finally {
      // eslint-disable-next-line no-extend-native
      Map.prototype.set = realMapSet;
    }
    // If we got this far, our feature detection worked.
    // We knew that Map#set() throws for non-extensible objects,
    // so we didn't set them as non-extensible for that reason.
  });
});
