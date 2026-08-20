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
let waitForAll;
let assertConsoleErrorDev;

describe('ReactFragment', () => {
  beforeEach(function () {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
  });

  it('should render a single child via noop renderer', async () => {
    const element = (
      <>
        <span>foo</span>
      </>
    );

    ReactNoop.render(element);
    await waitForAll([]);

    expect(ReactNoop).toMatchRenderedOutput(<span>foo</span>);
  });

  it('should render zero children via noop renderer', async () => {
    const element = <React.Fragment />;

    ReactNoop.render(element);
    await waitForAll([]);

    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  it('should render multiple children via noop renderer', async () => {
    const element = (
      <>
        hello <span>world</span>
      </>
    );

    ReactNoop.render(element);
    await waitForAll([]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        hello <span>world</span>
      </>,
    );
  });

  it('should render an iterable via noop renderer', async () => {
    const element = (
      <>{new Set([<span key="a">hi</span>, <span key="b">bye</span>])}</>
    );

    ReactNoop.render(element);
    await waitForAll([]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>hi</span>
        <span>bye</span>
      </>,
    );
  });

  it('should preserve state of children with 1 level nesting', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <Stateful key="a" />
      ) : (
        <>
          <Stateful key="a" />
          <div key="b">World</div>
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>Hello</div>
        <div>World</div>
      </>,
    );

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful', 'Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should preserve state between top-level fragments', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>
          <Stateful />
        </>
      ) : (
        <>
          <Stateful />
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful', 'Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should preserve state of children nested at same level', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>
          <>
            <>
              <Stateful key="a" />
            </>
          </>
        </>
      ) : (
        <>
          <>
            <>
              <div />
              <Stateful key="a" />
            </>
          </>
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div />
        <div>Hello</div>
      </>,
    );

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful', 'Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should not preserve state in non-top-level fragment nesting', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>
          <>
            <Stateful key="a" />
          </>
        </>
      ) : (
        <>
          <Stateful key="a" />
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should not preserve state of children if nested 2 levels without siblings', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <Stateful key="a" />
      ) : (
        <>
          <>
            <Stateful key="a" />
          </>
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should not preserve state of children if nested 2 levels with siblings', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <Stateful key="a" />
      ) : (
        <>
          <>
            <Stateful key="a" />
          </>
          <div />
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>Hello</div>
        <div />
      </>,
    );

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should preserve state between array nested in fragment and fragment', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>
          <Stateful key="a" />
        </>
      ) : (
        <>{[<Stateful key="a" />]}</>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful', 'Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should preserve state between top level fragment and array', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        [<Stateful key="a" />]
      ) : (
        <>
          <Stateful key="a" />
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful', 'Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should not preserve state between array nested in fragment and double nested fragment', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>{[<Stateful key="a" />]}</>
      ) : (
        <>
          <>
            <Stateful key="a" />
          </>
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should not preserve state between array nested in fragment and double nested array', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>{[<Stateful key="a" />]}</>
      ) : (
        [[<Stateful key="a" />]]
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should preserve state between double nested fragment and double nested array', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>
          <>
            <Stateful key="a" />
          </>
        </>
      ) : (
        [[<Stateful key="a" />]]
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful', 'Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should not preserve state of children when the keys are different', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <React.Fragment key="a">
          <Stateful />
        </React.Fragment>
      ) : (
        <React.Fragment key="b">
          <Stateful />
          <span>World</span>
        </React.Fragment>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>Hello</div>
        <span>World</span>
      </>,
    );

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should not preserve state between unkeyed and keyed fragment', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <React.Fragment key="a">
          <Stateful />
        </React.Fragment>
      ) : (
        <>
          <Stateful />
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should preserve state with reordering in multiple levels', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <div>
          <React.Fragment key="c">
            <span>foo</span>
            <div key="b">
              <Stateful key="a" />
            </div>
          </React.Fragment>
          <span>boop</span>
        </div>
      ) : (
        <div>
          <span>beep</span>
          <React.Fragment key="c">
            <div key="b">
              <Stateful key="a" />
            </div>
            <span>bar</span>
          </React.Fragment>
        </div>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>beep</span>
        <div>
          <div>Hello</div>
        </div>
        <span>bar</span>
      </div>,
    );

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful', 'Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>foo</span>
        <div>
          <div>Hello</div>
        </div>
        <span>boop</span>
      </div>,
    );
  });

  it('should not preserve state when switching to a keyed fragment to an array', async () => {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <div>
          {
            <React.Fragment key="foo">
              <Stateful />
            </React.Fragment>
          }
          <span />
        </div>
      ) : (
        <div>
          {[<Stateful />]}
          <span />
        </div>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n' +
        '\n' +
        'Check the render method of `div`. ' +
        'It was passed a child from Foo. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in Foo (at **)',
    ]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <div>Hello</div>
        <span />
      </div>,
    );

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <div>Hello</div>
        <span />
      </div>,
    );
  });

  it('should not preserve state when switching a nested unkeyed fragment to a passthrough component', async function () {
    const ops = [];

    function Passthrough({children}) {
      return children;
    }

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>
          <>
            <Stateful />
          </>
        </>
      ) : (
        <>
          <Passthrough>
            <Stateful />
          </Passthrough>
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should not preserve state when switching a nested keyed fragment to a passthrough component', async function () {
    const ops = [];

    function Passthrough({children}) {
      return children;
    }

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>
          <React.Fragment key="a">
            <Stateful />
          </React.Fragment>
        </>
      ) : (
        <>
          <Passthrough>
            <Stateful />
          </Passthrough>
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should not preserve state when switching a nested keyed array to a passthrough component', async function () {
    const ops = [];

    function Passthrough({children}) {
      return children;
    }

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition ? (
        <>{[<Stateful key="a" />]}</>
      ) : (
        <>
          <Passthrough>
            <Stateful />
          </Passthrough>
        </>
      );
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual([]);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });

  it('should preserve state when it does not change positions', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    function Foo({condition}) {
      return condition
        ? [
            <span />,
            <>
              <Stateful />
            </>,
          ]
        : [
            <span />,
            <>
              <Stateful />
            </>,
          ];
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n' +
        '\n' +
        'Check the top-level render call using <Foo>. ' +
        'It was passed a child from Foo. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in span (at **)\n' +
        '    in Foo (at **)',
    ]);

    ReactNoop.render(<Foo condition={false} />);
    // The key warning gets deduped because it's in the same component.
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span />
        <div>Hello</div>
      </>,
    );

    ReactNoop.render(<Foo condition={true} />);
    // The key warning gets deduped because it's in the same component.
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful', 'Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span />
        <div>Hello</div>
      </>,
    );
  });

  it('should preserve state of children when adding a fragment wrapped in Lazy', async function () {
    const ops = [];

    class Stateful extends React.Component {
      componentDidUpdate() {
        ops.push('Update Stateful');
      }

      render() {
        return <div>Hello</div>;
      }
    }

    const lazyChild = React.lazy(async () => ({
      default: (
        <>
          <Stateful key="a" />
          <div key="b">World</div>
        </>
      ),
    }));

    function Foo({condition}) {
      return condition ? <Stateful key="a" /> : lazyChild;
    }

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    ReactNoop.render(<Foo condition={false} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>Hello</div>
        <div>World</div>
      </>,
    );

    ReactNoop.render(<Foo condition={true} />);
    await waitForAll([]);

    expect(ops).toEqual(['Update Stateful', 'Update Stateful']);
    expect(ReactNoop).toMatchRenderedOutput(<div>Hello</div>);
  });
});
