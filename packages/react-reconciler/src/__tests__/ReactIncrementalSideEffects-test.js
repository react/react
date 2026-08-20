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
let waitForAll;
let waitFor;
let waitForPaint;

describe('ReactIncrementalSideEffects', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForPaint = InternalTestUtils.waitForPaint;
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

  it('can update child nodes of a host instance', async () => {
    function Bar(props) {
      return <span>{props.text}</span>;
    }

    function Foo(props) {
      return (
        <div>
          <Bar text={props.text} />
          {props.text === 'World' ? <Bar text={props.text} /> : null}
        </div>
      );
    }

    ReactNoop.render(<Foo text="Hello" />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>Hello</span>
      </div>,
    );

    ReactNoop.render(<Foo text="World" />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>World</span>
        <span>World</span>
      </div>,
    );
  });

  it('can update child nodes of a fragment', async function () {
    function Bar(props) {
      return <span>{props.text}</span>;
    }

    function Foo(props) {
      return (
        <div>
          <Bar text={props.text} />
          {props.text === 'World'
            ? [<Bar key="a" text={props.text} />, <div key="b" />]
            : props.text === 'Hi'
              ? [<div key="b" />, <Bar key="a" text={props.text} />]
              : null}
          <span prop="test" />
        </div>
      );
    }

    ReactNoop.render(<Foo text="Hello" />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>Hello</span>
        <span prop="test" />
      </div>,
    );

    ReactNoop.render(<Foo text="World" />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>World</span>
        <span>World</span>
        <div />
        <span prop="test" />
      </div>,
    );

    ReactNoop.render(<Foo text="Hi" />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>Hi</span>
        <div />
        <span>Hi</span>
        <span prop="test" />
      </div>,
    );
  });

  it('can update child nodes rendering into text nodes', async function () {
    function Bar(props) {
      return props.text;
    }

    function Foo(props) {
      return (
        <div>
          <Bar text={props.text} />
          {props.text === 'World'
            ? [<Bar key="a" text={props.text} />, '!']
            : null}
        </div>
      );
    }

    ReactNoop.render(<Foo text="Hello" />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo text="World" />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>WorldWorld!</div>);
  });

  it('can deletes children either components, host or text', async function () {
    function Bar(props) {
      return <span prop={props.children} />;
    }

    function Foo(props) {
      return (
        <div>
          {props.show
            ? [<div key="a" />, <Bar key="b">Hello</Bar>, 'World']
            : []}
        </div>
      );
    }

    ReactNoop.render(<Foo show={true} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <div />
        <span prop="Hello" />
        World
      </div>,
    );

    ReactNoop.render(<Foo show={false} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div />);
  });

  it('can delete a child that changes type - implicit keys', async function () {
    let unmounted = false;

    class ClassComponent extends React.Component {
      componentWillUnmount() {
        unmounted = true;
      }
      render() {
        return <span prop="Class" />;
      }
    }

    function FunctionComponent(props) {
      return <span prop="Function" />;
    }

    function Foo(props) {
      return (
        <div>
          {props.useClass ? (
            <ClassComponent />
          ) : props.useFunction ? (
            <FunctionComponent />
          ) : props.useText ? (
            'Text'
          ) : null}
          Trail
        </div>
      );
    }

    ReactNoop.render(<Foo useClass={true} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop="Class" />
        Trail
      </div>,
    );

    expect(unmounted).toBe(false);

    ReactNoop.render(<Foo useFunction={true} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop="Function" />
        Trail
      </div>,
    );

    expect(unmounted).toBe(true);

    ReactNoop.render(<Foo useText={true} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>TextTrail</div>);

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Trail</div>);
  });

  it('can delete a child that changes type - explicit keys', async function () {
    let unmounted = false;

    class ClassComponent extends React.Component {
      componentWillUnmount() {
        unmounted = true;
      }
      render() {
        return <span prop="Class" />;
      }
    }

    function FunctionComponent(props) {
      return <span prop="Function" />;
    }

    function Foo(props) {
      return (
        <div>
          {props.useClass ? (
            <ClassComponent key="a" />
          ) : props.useFunction ? (
            <FunctionComponent key="a" />
          ) : null}
          Trail
        </div>
      );
    }

    ReactNoop.render(<Foo useClass={true} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop="Class" />
        Trail
      </div>,
    );

    expect(unmounted).toBe(false);

    ReactNoop.render(<Foo useFunction={true} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop="Function" />
        Trail
      </div>,
    );

    expect(unmounted).toBe(true);

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Trail</div>);
  });

  it('can delete a child when it unmounts inside a portal', async () => {
    function Bar(props) {
      return <span prop={props.children} />;
    }

    const portalContainer =
      ReactNoop.getOrCreateRootContainer('portalContainer');
    function Foo(props) {
      return ReactNoop.createPortal(
        props.show ? [<div key="a" />, <Bar key="b">Hello</Bar>, 'World'] : [],
        portalContainer,
        null,
      );
    }

    ReactNoop.render(
      <div>
        <Foo show={true} />
      </div>,
    );
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div />);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(
      <>
        <div />
        <span prop="Hello" />
        World
      </>,
    );

    ReactNoop.render(
      <div>
        <Foo show={false} />
      </div>,
    );
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div />);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(null);

    ReactNoop.render(
      <div>
        <Foo show={true} />
      </div>,
    );
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div />);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(
      <>
        <div />
        <span prop="Hello" />
        World
      </>,
    );

    ReactNoop.render(null);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(null);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(null);

    ReactNoop.render(<Foo show={false} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(null);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(null);

    ReactNoop.render(<Foo show={true} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(null);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(
      <>
        <div />
        <span prop="Hello" />
        World
      </>,
    );

    ReactNoop.render(null);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(null);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(null);
  });

  it('can delete a child when it unmounts with a portal', async () => {
    function Bar(props) {
      return <span prop={props.children} />;
    }

    const portalContainer =
      ReactNoop.getOrCreateRootContainer('portalContainer');
    function Foo(props) {
      return ReactNoop.createPortal(
        [<div key="a" />, <Bar key="b">Hello</Bar>, 'World'],
        portalContainer,
        null,
      );
    }

    ReactNoop.render(
      <div>
        <Foo />
      </div>,
    );
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<div />);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(
      <>
        <div />
        <span prop="Hello" />
        World
      </>,
    );

    ReactNoop.render(null);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(null);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(null);

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(null);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(
      <>
        <div />
        <span prop="Hello" />
        World
      </>,
    );

    ReactNoop.render(null);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(null);
    expect(ReactNoop.getChildrenAsJSX('portalContainer')).toEqual(null);
  });

  it('does not update child nodes if a flush is aborted', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return <span prop={props.text} />;
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          <div>
            <Bar text={props.text} />
            {props.text === 'Hello' ? <Bar text={props.text} /> : null}
          </div>
          <Bar text="Yo" />
        </div>
      );
    }

    ReactNoop.render(<Foo text="Hello" />);
    await waitForAll(['Foo', 'Bar', 'Bar', 'Bar']);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <div>
          <span prop="Hello" />
          <span prop="Hello" />
        </div>
        <span prop="Yo" />
      </div>,
    );

    React.startTransition(() => {
      ReactNoop.render(<Foo text="World" />);
    });

    // Flush some of the work without committing
    await waitFor(['Foo', 'Bar']);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <div>
          <span prop="Hello" />
          <span prop="Hello" />
        </div>
        <span prop="Yo" />
      </div>,
    );
  });

  // @gate enableLegacyHidden
  it('preserves a previously rendered node when deprioritized', async () => {
    function Middle(props) {
      Scheduler.log('Middle');
      return <span prop={props.children} />;
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          <LegacyHiddenDiv mode="hidden">
            <Middle>{props.text}</Middle>
          </LegacyHiddenDiv>
        </div>
      );
    }

    ReactNoop.render(<Foo text="foo" />);
    await waitForAll(['Foo', 'Middle']);

    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div>
        <div hidden={true}>
          <span prop="foo" />
        </div>
      </div>,
    );

    ReactNoop.render(<Foo text="bar" />, () => Scheduler.log('commit'));
    await waitFor(['Foo', 'commit']);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div>
        <div hidden={true}>
          <span prop="foo" />
        </div>
      </div>,
    );

    await waitForAll(['Middle']);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div>
        <div hidden={true}>
          <span prop="bar" />
        </div>
      </div>,
    );
  });

  // @gate enableLegacyHidden
  it('can reuse side-effects after being preempted', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return <span prop={props.children} />;
    }

    const middleContent = (
      <div>
        <Bar>Hello</Bar>
        <Bar>World</Bar>
      </div>
    );

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <LegacyHiddenDiv mode="hidden">
          {props.step === 0 ? (
            <div>
              <Bar>Hi</Bar>
              <Bar>{props.text}</Bar>
            </div>
          ) : (
            middleContent
          )}
        </LegacyHiddenDiv>
      );
    }

    // Init
    ReactNoop.render(<Foo text="foo" step={0} />);
    await waitForAll(['Foo', 'Bar', 'Bar']);

    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div hidden={true}>
        <div>
          <span prop="Hi" />
          <span prop="foo" />
        </div>
      </div>,
    );

    // Make a quick update which will schedule low priority work to
    // update the middle content.
    ReactNoop.render(<Foo text="bar" step={1} />, () =>
      Scheduler.log('commit'),
    );
    await waitFor(['Foo', 'commit', 'Bar']);

    // The tree remains unchanged.
    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div hidden={true}>
        <div>
          <span prop="Hi" />
          <span prop="foo" />
        </div>
      </div>,
    );

    // The first Bar has already completed its update but we'll interrupt it to
    // render some higher priority work. The middle content will bailout so
    // it remains untouched which means that it should reuse it next time.
    ReactNoop.render(<Foo text="foo" step={1} />);
    await waitForAll(['Foo', 'Bar', 'Bar']);

    // Since we did nothing to the middle subtree during the interruption,
    // we should be able to reuse the reconciliation work that we already did
    // without restarting. The side-effects should still be replayed.

    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div hidden={true}>
        <div>
          <span prop="Hello" />
          <span prop="World" />
        </div>
      </div>,
    );
  });

  // @gate enableLegacyHidden
  it('can reuse side-effects after being preempted, if shouldComponentUpdate is false', async () => {
    class Bar extends React.Component {
      shouldComponentUpdate(nextProps) {
        return this.props.children !== nextProps.children;
      }
      render() {
        Scheduler.log('Bar');
        return <span prop={this.props.children} />;
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
            <Bar>{this.props.step === 0 ? 'Hi' : 'Hello'}</Bar>
            <Bar>{this.props.step === 0 ? this.props.text : 'World'}</Bar>
          </div>
        );
      }
    }

    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <LegacyHiddenDiv mode="hidden">
          <Content step={props.step} text={props.text} />
        </LegacyHiddenDiv>
      );
    }

    // Init
    ReactNoop.render(<Foo text="foo" step={0} />);
    await waitForAll(['Foo', 'Content', 'Bar', 'Bar']);

    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div hidden={true}>
        <div>
          <span prop="Hi" />
          <span prop="foo" />
        </div>
      </div>,
    );

    // Make a quick update which will schedule low priority work to
    // update the middle content.
    ReactNoop.render(<Foo text="bar" step={1} />);
    await waitFor(['Foo', 'Content', 'Bar']);

    // The tree remains unchanged.
    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div hidden={true}>
        <div>
          <span prop="Hi" />
          <span prop="foo" />
        </div>
      </div>,
    );

    // The first Bar has already completed its update but we'll interrupt it to
    // render some higher priority work. The middle content will bailout so
    // it remains untouched which means that it should reuse it next time.
    ReactNoop.render(<Foo text="foo" step={1} />);
    await waitForAll(['Foo', 'Content', 'Bar', 'Bar']);

    // Since we did nothing to the middle subtree during the interruption,
    // we should be able to reuse the reconciliation work that we already did
    // without restarting. The side-effects should still be replayed.

    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div hidden={true}>
        <div>
          <span prop="Hello" />
          <span prop="World" />
        </div>
      </div>,
    );
  });

  it('can update a completed tree before it has a chance to commit', async () => {
    function Foo(props) {
      Scheduler.log('Foo ' + props.step);
      return <span prop={props.step} />;
    }
    React.startTransition(() => {
      ReactNoop.render(<Foo step={1} />);
    });
    // This should be just enough to complete the tree without committing it
    await waitFor(['Foo 1']);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(null);
    // To confirm, perform one more unit of work. The tree should now
    // be flushed.
    await waitForPaint([]);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(<span prop={1} />);

    React.startTransition(() => {
      ReactNoop.render(<Foo step={2} />);
    });
    // This should be just enough to complete the tree without committing it
    await waitFor(['Foo 2']);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(<span prop={1} />);
    // This time, before we commit the tree, we update the root component with
    // new props

    React.startTransition(() => {
      ReactNoop.render(<Foo step={3} />);
    });
    expect(ReactNoop.getChildrenAsJSX()).toEqual(<span prop={1} />);
    // Now let's commit. We already had a commit that was pending, which will
    // render 2.
    await waitForPaint([]);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(<span prop={2} />);
    // If we flush the rest of the work, we should get another commit that
    // renders 3. If it renders 2 again, that means an update was dropped.
    await waitForAll(['Foo 3']);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(<span prop={3} />);
  });

  // @gate enableLegacyHidden
  it('updates a child even though the old props is empty', async () => {
    function Foo(props) {
      return (
        <LegacyHiddenDiv mode="hidden">
          <span prop={1} />
        </LegacyHiddenDiv>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div hidden={true}>
        <span prop={1} />
      </div>,
    );
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can defer side-effects and resume them later on', async () => {
    class Bar extends React.Component {
      shouldComponentUpdate(nextProps) {
        return this.props.idx !== nextProps.idx;
      }
      render() {
        return <span prop={this.props.idx} />;
      }
    }
    function Foo(props) {
      return (
        <div>
          <span prop={props.tick} />
          <div hidden={true}>
            <Bar idx={props.idx} />
            <Bar idx={props.idx + 1} />
          </div>
        </div>
      );
    }
    ReactNoop.render(<Foo tick={0} idx={0} />);
    ReactNoop.flushDeferredPri(40 + 25);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop={0} />
        <div />
      </div>,
    );
    ReactNoop.render(<Foo tick={1} idx={0} />);
    ReactNoop.flushDeferredPri(35 + 25);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop={1} />
        <div>{/*still not rendered yet*/}</div>
      </div>,
    );
    ReactNoop.flushDeferredPri(30 + 25);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop={1} />
        <div>
          {/* Now we had enough time to finish the spans. */}
          <span prop={0} />
          <span prop={1} />
        </div>
        ,
      </div>,
    );
    const innerSpanA =
      ReactNoop.dangerouslyGetChildren()[0].children[1].children[1];
    ReactNoop.render(<Foo tick={2} idx={1} />);
    ReactNoop.flushDeferredPri(30 + 25);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop={2} />
        <div>
          {/* Still same old numbers. */}
          <span prop={0} />
          <span prop={1} />
        </div>
      </div>,
    );
    ReactNoop.render(<Foo tick={3} idx={1} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop={3} />
        <div>
          {/* New numbers. */}
          <span prop={1} />
          <span prop={2} />
        </div>
      </div>,
    );

    const innerSpanB =
      ReactNoop.dangerouslyGetChildren()[0].children[1].children[1];
    // This should have been an update to an existing instance, not recreation.
    // We verify that by ensuring that the child instance was the same as
    // before.
    expect(innerSpanA).toBe(innerSpanB);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can defer side-effects and reuse them later - complex', async function () {
    let ops = [];

    class Bar extends React.Component {
      shouldComponentUpdate(nextProps) {
        return this.props.idx !== nextProps.idx;
      }
      render() {
        ops.push('Bar');
        return <span prop={this.props.idx} />;
      }
    }
    class Baz extends React.Component {
      shouldComponentUpdate(nextProps) {
        return this.props.idx !== nextProps.idx;
      }
      render() {
        ops.push('Baz');
        return [
          <Bar key="a" idx={this.props.idx} />,
          <Bar key="b" idx={this.props.idx} />,
        ];
      }
    }
    function Foo(props) {
      ops.push('Foo');
      return (
        <div>
          <span prop={props.tick} />
          <div hidden={true}>
            <Baz idx={props.idx} />
            <Baz idx={props.idx} />
            <Baz idx={props.idx} />
          </div>
        </div>
      );
    }
    ReactNoop.render(<Foo tick={0} idx={0} />);
    ReactNoop.flushDeferredPri(65 + 5);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop={0} />
        {/*the spans are down-prioritized and not rendered yet*/}
        <div />
      </div>,
    );

    expect(ops).toEqual(['Foo', 'Baz', 'Bar']);
    ops = [];

    ReactNoop.render(<Foo tick={1} idx={0} />);
    ReactNoop.flushDeferredPri(70);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop={1} />
        {/*still not rendered yet*/}
        <div />
      </div>,
    );

    expect(ops).toEqual(['Foo']);
    ops = [];

    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput([
      <div>
        <span prop={1} />,
        <div>
          {/* Now we had enough time to finish the spans. */}
          <span prop={0} />,
          <span prop={0} />,
          <span prop={0} />,
          <span prop={0} />,
          <span prop={0} />,
          <span prop={0} />,
        </div>
      </div>,
    ]);

    expect(ops).toEqual(['Bar', 'Baz', 'Bar', 'Bar', 'Baz', 'Bar', 'Bar']);
    ops = [];

    // Now we're going to update the index but we'll only let it finish half
    // way through.
    ReactNoop.render(<Foo tick={2} idx={1} />);
    ReactNoop.flushDeferredPri(95);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop={2} />,
        <div>
          {/* Still same old numbers. */}
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
        </div>
      </div>,
    );

    // We let it finish half way through. That means we'll have one fully
    // completed Baz, one half-way completed Baz and one fully incomplete Baz.
    expect(ops).toEqual(['Foo', 'Baz', 'Bar', 'Bar', 'Baz', 'Bar']);
    ops = [];

    // We'll update again, without letting the new index update yet. Only half
    // way through.
    ReactNoop.render(<Foo tick={3} idx={1} />);
    ReactNoop.flushDeferredPri(50);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span prop={3} />
        <div>
          {/* Old numbers. */}
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
        </div>
      </div>,
    );

    expect(ops).toEqual(['Foo']);
    ops = [];

    // We should now be able to reuse some of the work we've already done
    // and replay those side-effects.
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput([
      <div>
        <span prop={3} />,
        <div>
          {/* New numbers. */}
          <span prop={1} />
          <span prop={1} />
          <span prop={1} />
          <span prop={1} />
          <span prop={1} />
          <span prop={1} />
        </div>
      </div>,
    ]);

    expect(ops).toEqual(['Bar', 'Baz', 'Bar', 'Bar']);
  });

  // @gate enableLegacyHidden
  it('deprioritizes setStates that happens within a deprioritized tree', async () => {
    const barInstances = [];

    class Bar extends React.Component {
      constructor() {
        super();
        this.state = {active: false};
      }
      activate() {
        this.setState({active: true});
      }
      render() {
        barInstances.push(this);
        Scheduler.log('Bar');
        return <span prop={this.state.active ? 'X' : this.props.idx} />;
      }
    }
    function Foo(props) {
      Scheduler.log('Foo');
      return (
        <div>
          <span prop={props.tick} />
          <LegacyHiddenDiv mode="hidden">
            <Bar idx={props.idx} />
            <Bar idx={props.idx} />
            <Bar idx={props.idx} />
          </LegacyHiddenDiv>
        </div>
      );
    }
    ReactNoop.render(<Foo tick={0} idx={0} />);
    await waitForAll(['Foo', 'Bar', 'Bar', 'Bar']);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div>
        <span prop={0} />
        <div hidden={true}>
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
        </div>
      </div>,
    );

    ReactNoop.render(<Foo tick={1} idx={1} />);
    await waitFor(['Foo', 'Bar', 'Bar']);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div>
        {/* Updated */}
        <span prop={1} />
        <div hidden={true}>
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
        </div>
      </div>,
    );

    barInstances[0].activate();

    // This should not be enough time to render the content of all the hidden
    // items. Including the set state since that is deprioritized.
    // ReactNoop.flushDeferredPri(35);
    await waitFor(['Bar']);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div>
        {/* Updated */}
        <span prop={1} />
        <div hidden={true}>
          {/* Still not updated */}
          <span prop={0} />
          <span prop={0} />
          <span prop={0} />
        </div>
      </div>,
    );

    // However, once we render fully, we will have enough time to finish it all
    // at once.
    await waitForAll(['Bar', 'Bar']);
    expect(ReactNoop.getChildrenAsJSX()).toEqual(
      <div>
        <span prop={1} />
        <div hidden={true}>
          {/* Now we had enough time to finish the spans. */}
          <span prop="X" />
          <span prop={1} />
          <span prop={1} />
        </div>
      </div>,
    );
  });
  // TODO: Test that side-effects are not cut off when a work in progress node
  // moves to "current" without flushing due to having lower priority. Does this
  // even happen? Maybe a child doesn't get processed because it is lower prio?

  it('calls callback after update is flushed', async () => {
    let instance;
    class Foo extends React.Component {
      constructor() {
        super();
        instance = this;
        this.state = {text: 'foo'};
      }
      render() {
        return <span prop={this.state.text} />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="foo" />);
    let called = false;
    instance.setState({text: 'bar'}, () => {
      expect(ReactNoop).toMatchRenderedOutput(<span prop="bar" />);
      called = true;
    });
    await waitForAll([]);
    expect(called).toBe(true);
  });

  it('calls setState callback even if component bails out', async () => {
    let instance;
    class Foo extends React.Component {
      constructor() {
        super();
        instance = this;
        this.state = {text: 'foo'};
      }
      shouldComponentUpdate(nextProps, nextState) {
        return this.state.text !== nextState.text;
      }
      render() {
        return <span prop={this.state.text} />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="foo" />);
    let called = false;
    instance.setState({}, () => {
      called = true;
    });
    await waitForAll([]);
    expect(called).toBe(true);
  });

  // TODO: Test that callbacks are not lost if an update is preempted.

  it('calls componentWillUnmount after a deletion, even if nested', async () => {
    const ops = [];

    class Bar extends React.Component {
      componentWillUnmount() {
        ops.push(this.props.name);
      }
      render() {
        return <span />;
      }
    }

    class Wrapper extends React.Component {
      componentWillUnmount() {
        ops.push('Wrapper');
      }
      render() {
        return <Bar name={this.props.name} />;
      }
    }

    function Foo(props) {
      return (
        <div>
          {props.show
            ? [
                <Bar key="a" name="A" />,
                <Wrapper key="b" name="B" />,
                <div key="cd">
                  <Bar name="C" />
                  <Wrapper name="D" />,
                </div>,
                [<Bar key="e" name="E" />, <Bar key="f" name="F" />],
              ]
            : []}
          <div>{props.show ? <Bar key="g" name="G" /> : null}</div>
          <Bar name="this should not unmount" />
        </div>
      );
    }

    ReactNoop.render(<Foo show={true} />);
    await waitForAll([]);
    expect(ops).toEqual([]);

    ReactNoop.render(<Foo show={false} />);
    await waitForAll([]);
    expect(ops).toEqual([
      'A',
      'Wrapper',
      'B',
      'C',
      'Wrapper',
      'D',
      'E',
      'F',
      'G',
    ]);
  });

  it('calls componentDidMount/Update after insertion/update', async () => {
    let ops = [];

    class Bar extends React.Component {
      componentDidMount() {
        ops.push('mount:' + this.props.name);
      }
      componentDidUpdate() {
        ops.push('update:' + this.props.name);
      }
      render() {
        return <span />;
      }
    }

    class Wrapper extends React.Component {
      componentDidMount() {
        ops.push('mount:wrapper-' + this.props.name);
      }
      componentDidUpdate() {
        ops.push('update:wrapper-' + this.props.name);
      }
      render() {
        return <Bar name={this.props.name} />;
      }
    }

    function Foo(props) {
      return (
        <div>
          <Bar key="a" name="A" />
          <Wrapper key="b" name="B" />
          <div key="cd">
            <Bar name="C" />
            <Wrapper name="D" />
          </div>
          {[<Bar key="e" name="E" />, <Bar key="f" name="F" />]}
          <div>
            <Bar key="g" name="G" />
          </div>
        </div>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(ops).toEqual([
      'mount:A',
      'mount:B',
      'mount:wrapper-B',
      'mount:C',
      'mount:D',
      'mount:wrapper-D',
      'mount:E',
      'mount:F',
      'mount:G',
    ]);

    ops = [];

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(ops).toEqual([
      'update:A',
      'update:B',
      'update:wrapper-B',
      'update:C',
      'update:D',
      'update:wrapper-D',
      'update:E',
      'update:F',
      'update:G',
    ]);
  });

  it('invokes ref callbacks after insertion/update/unmount', async () => {
    let classInstance = null;

    let ops = [];

    class ClassComponent extends React.Component {
      render() {
        classInstance = this;
        return <span />;
      }
    }

    function FunctionComponent(props) {
      return <span />;
    }

    function Foo(props) {
      return props.show ? (
        <div>
          <ClassComponent ref={n => ops.push(n)} />
          <FunctionComponent ref={n => ops.push(n)} />
          <div ref={n => ops.push(n)} />
        </div>
      ) : null;
    }

    ReactNoop.render(<Foo show={true} />);

    await waitForAll([]);

    expect(ops).toEqual([
      classInstance,
      // no call for function components
      {type: 'div', children: [], prop: undefined, hidden: false},
    ]);

    ops = [];

    // Refs that switch function instances get reinvoked
    ReactNoop.render(<Foo show={true} />);
    await waitForAll([]);
    expect(ops).toEqual([
      // detach all refs that switched handlers first.
      null,
      null,
      // reattach as a separate phase
      classInstance,
      {type: 'div', children: [], prop: undefined, hidden: false},
    ]);

    ops = [];

    ReactNoop.render(<Foo show={false} />);
    await waitForAll([]);
    expect(ops).toEqual([
      // unmount
      null,
      null,
    ]);
  });

  // TODO: Test that mounts, updates, refs, unmounts and deletions happen in the
  // expected way for aborted and resumed render life-cycles.
});
