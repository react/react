/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const PropTypes = require('prop-types');
let act;
let assertConsoleErrorDev;
describe('ReactDOMLegacyFiber', () => {
  let container;

  beforeEach(() => {
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
    jest.restoreAllMocks();
  });

  // @gate !disableLegacyMode
  it('should render strings as children', () => {
    const Box = ({value}) => <div>{value}</div>;

    ReactDOM.render(<Box value="foo" />, container);
    expect(container.textContent).toEqual('foo');
  });

  // @gate !disableLegacyMode
  it('should render numbers as children', () => {
    const Box = ({value}) => <div>{value}</div>;

    ReactDOM.render(<Box value={10} />, container);

    expect(container.textContent).toEqual('10');
  });

  // @gate !disableLegacyMode
  it('should be called a callback argument', () => {
    // mounting phase
    let called = false;
    ReactDOM.render(<div>Foo</div>, container, () => (called = true));
    expect(called).toEqual(true);

    // updating phase
    called = false;
    ReactDOM.render(<div>Foo</div>, container, () => (called = true));
    expect(called).toEqual(true);
  });

  // @gate !disableLegacyMode
  it('should call a callback argument when the same element is re-rendered', () => {
    class Foo extends React.Component {
      render() {
        return <div>Foo</div>;
      }
    }
    const element = <Foo />;

    // mounting phase
    let called = false;
    ReactDOM.render(element, container, () => (called = true));
    expect(called).toEqual(true);

    // updating phase
    called = false;
    ReactDOM.unstable_batchedUpdates(() => {
      ReactDOM.render(element, container, () => (called = true));
    });
    expect(called).toEqual(true);
  });

  // @gate !disableLegacyMode
  it('should render a component returning strings directly from render', () => {
    const Text = ({value}) => value;

    ReactDOM.render(<Text value="foo" />, container);
    expect(container.textContent).toEqual('foo');
  });

  // @gate !disableLegacyMode
  it('should render a component returning numbers directly from render', () => {
    const Text = ({value}) => value;

    ReactDOM.render(<Text value={10} />, container);

    expect(container.textContent).toEqual('10');
  });

  // @gate !disableLegacyMode
  it('finds the DOM Text node of a string child', () => {
    class Text extends React.Component {
      render() {
        return this.props.value;
      }
    }

    let instance = null;
    ReactDOM.render(
      <Text value="foo" ref={ref => (instance = ref)} />,
      container,
    );

    const textNode =
      ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.findDOMNode(
        instance,
      );
    expect(textNode).toBe(container.firstChild);
    expect(textNode.nodeType).toBe(3);
    expect(textNode.nodeValue).toBe('foo');
  });

  // @gate !disableLegacyMode
  it('finds the first child when a component returns a fragment', () => {
    class Fragment extends React.Component {
      render() {
        return [<div key="a" />, <span key="b" />];
      }
    }

    let instance = null;
    ReactDOM.render(<Fragment ref={ref => (instance = ref)} />, container);

    expect(container.childNodes.length).toBe(2);

    const firstNode =
      ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.findDOMNode(
        instance,
      );
    expect(firstNode).toBe(container.firstChild);
    expect(firstNode.tagName).toBe('DIV');
  });

  // @gate !disableLegacyMode
  it('finds the first child even when fragment is nested', () => {
    class Wrapper extends React.Component {
      render() {
        return this.props.children;
      }
    }

    class Fragment extends React.Component {
      render() {
        return [
          <Wrapper key="a">
            <div />
          </Wrapper>,
          <span key="b" />,
        ];
      }
    }

    let instance = null;
    ReactDOM.render(<Fragment ref={ref => (instance = ref)} />, container);

    expect(container.childNodes.length).toBe(2);

    const firstNode =
      ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.findDOMNode(
        instance,
      );
    expect(firstNode).toBe(container.firstChild);
    expect(firstNode.tagName).toBe('DIV');
  });

  // @gate !disableLegacyMode
  it('finds the first child even when first child renders null', () => {
    class NullComponent extends React.Component {
      render() {
        return null;
      }
    }

    class Fragment extends React.Component {
      render() {
        return [<NullComponent key="a" />, <div key="b" />, <span key="c" />];
      }
    }

    let instance = null;
    ReactDOM.render(<Fragment ref={ref => (instance = ref)} />, container);

    expect(container.childNodes.length).toBe(2);

    const firstNode =
      ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.findDOMNode(
        instance,
      );
    expect(firstNode).toBe(container.firstChild);
    expect(firstNode.tagName).toBe('DIV');
  });

  // @gate !disableLegacyMode
  it('renders an empty fragment', () => {
    const Div = () => <div />;
    const EmptyFragment = () => <></>;
    const NonEmptyFragment = () => (
      <>
        <Div />
      </>
    );

    ReactDOM.render(<EmptyFragment />, container);
    expect(container.firstChild).toBe(null);

    ReactDOM.render(<NonEmptyFragment />, container);
    expect(container.firstChild.tagName).toBe('DIV');

    ReactDOM.render(<EmptyFragment />, container);
    expect(container.firstChild).toBe(null);

    ReactDOM.render(<Div />, container);
    expect(container.firstChild.tagName).toBe('DIV');

    ReactDOM.render(<EmptyFragment />, container);
    expect(container.firstChild).toBe(null);
  });

  let svgEls, htmlEls, mathEls;
  const expectSVG = {ref: el => svgEls.push(el)};
  const expectHTML = {ref: el => htmlEls.push(el)};
  const expectMath = {ref: el => mathEls.push(el)};

  const usePortal = function (tree) {
    return ReactDOM.createPortal(tree, document.createElement('div'));
  };

  const assertNamespacesMatch = function (tree) {
    const testContainer = document.createElement('div');
    svgEls = [];
    htmlEls = [];
    mathEls = [];

    ReactDOM.render(tree, testContainer);
    svgEls.forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });
    htmlEls.forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    });
    mathEls.forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
    });

    ReactDOM.unmountComponentAtNode(testContainer);
    expect(testContainer.innerHTML).toBe('');
  };

  // @gate !disableLegacyMode
  it('should render one portal', () => {
    const portalContainer = document.createElement('div');

    ReactDOM.render(
      <div>{ReactDOM.createPortal(<div>portal</div>, portalContainer)}</div>,
      container,
    );
    expect(portalContainer.innerHTML).toBe('<div>portal</div>');
    expect(container.innerHTML).toBe('<div></div>');

    ReactDOM.unmountComponentAtNode(container);
    expect(portalContainer.innerHTML).toBe('');
    expect(container.innerHTML).toBe('');
  });

  // @gate !disableLegacyMode
  it('should render many portals', () => {
    const portalContainer1 = document.createElement('div');
    const portalContainer2 = document.createElement('div');

    const ops = [];
    class Child extends React.Component {
      componentDidMount() {
        ops.push(`${this.props.name} componentDidMount`);
      }
      componentDidUpdate() {
        ops.push(`${this.props.name} componentDidUpdate`);
      }
      componentWillUnmount() {
        ops.push(`${this.props.name} componentWillUnmount`);
      }
      render() {
        return <div>{this.props.name}</div>;
      }
    }

    class Parent extends React.Component {
      componentDidMount() {
        ops.push(`Parent:${this.props.step} componentDidMount`);
      }
      componentDidUpdate() {
        ops.push(`Parent:${this.props.step} componentDidUpdate`);
      }
      componentWillUnmount() {
        ops.push(`Parent:${this.props.step} componentWillUnmount`);
      }
      render() {
        const {step} = this.props;
        return [
          <Child key="a" name={`normal[0]:${step}`} />,
          ReactDOM.createPortal(
            <Child key="b" name={`portal1[0]:${step}`} />,
            portalContainer1,
          ),
          <Child key="c" name={`normal[1]:${step}`} />,
          ReactDOM.createPortal(
            [
              <Child key="d" name={`portal2[0]:${step}`} />,
              <Child key="e" name={`portal2[1]:${step}`} />,
            ],
            portalContainer2,
          ),
        ];
      }
    }

    ReactDOM.render(<Parent step="a" />, container);
    expect(portalContainer1.innerHTML).toBe('<div>portal1[0]:a</div>');
    expect(portalContainer2.innerHTML).toBe(
      '<div>portal2[0]:a</div><div>portal2[1]:a</div>',
    );
    expect(container.innerHTML).toBe(
      '<div>normal[0]:a</div><div>normal[1]:a</div>',
    );
    expect(ops).toEqual([
      'normal[0]:a componentDidMount',
      'portal1[0]:a componentDidMount',
      'normal[1]:a componentDidMount',
      'portal2[0]:a componentDidMount',
      'portal2[1]:a componentDidMount',
      'Parent:a componentDidMount',
    ]);

    ops.length = 0;
    ReactDOM.render(<Parent step="b" />, container);
    expect(portalContainer1.innerHTML).toBe('<div>portal1[0]:b</div>');
    expect(portalContainer2.innerHTML).toBe(
      '<div>portal2[0]:b</div><div>portal2[1]:b</div>',
    );
    expect(container.innerHTML).toBe(
      '<div>normal[0]:b</div><div>normal[1]:b</div>',
    );
    expect(ops).toEqual([
      'normal[0]:b componentDidUpdate',
      'portal1[0]:b componentDidUpdate',
      'normal[1]:b componentDidUpdate',
      'portal2[0]:b componentDidUpdate',
      'portal2[1]:b componentDidUpdate',
      'Parent:b componentDidUpdate',
    ]);

    ops.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(portalContainer1.innerHTML).toBe('');
    expect(portalContainer2.innerHTML).toBe('');
    expect(container.innerHTML).toBe('');
    expect(ops).toEqual([
      'Parent:b componentWillUnmount',
      'normal[0]:b componentWillUnmount',
      'portal1[0]:b componentWillUnmount',
      'normal[1]:b componentWillUnmount',
      'portal2[0]:b componentWillUnmount',
      'portal2[1]:b componentWillUnmount',
    ]);
  });

  // @gate !disableLegacyMode
  it('should render nested portals', () => {
    const portalContainer1 = document.createElement('div');
    const portalContainer2 = document.createElement('div');
    const portalContainer3 = document.createElement('div');

    ReactDOM.render(
      [
        <div key="a">normal[0]</div>,
        ReactDOM.createPortal(
          [
            <div key="b">portal1[0]</div>,
            ReactDOM.createPortal(
              <div key="c">portal2[0]</div>,
              portalContainer2,
            ),
            ReactDOM.createPortal(
              <div key="d">portal3[0]</div>,
              portalContainer3,
            ),
            <div key="e">portal1[1]</div>,
          ],
          portalContainer1,
        ),
        <div key="f">normal[1]</div>,
      ],
      container,
    );
    expect(portalContainer1.innerHTML).toBe(
      '<div>portal1[0]</div><div>portal1[1]</div>',
    );
    expect(portalContainer2.innerHTML).toBe('<div>portal2[0]</div>');
    expect(portalContainer3.innerHTML).toBe('<div>portal3[0]</div>');
    expect(container.innerHTML).toBe(
      '<div>normal[0]</div><div>normal[1]</div>',
    );

    ReactDOM.unmountComponentAtNode(container);
    expect(portalContainer1.innerHTML).toBe('');
    expect(portalContainer2.innerHTML).toBe('');
    expect(portalContainer3.innerHTML).toBe('');
    expect(container.innerHTML).toBe('');
  });

  // @gate !disableLegacyMode
  it('should reconcile portal children', () => {
    const portalContainer = document.createElement('div');

    ReactDOM.render(
      <div>{ReactDOM.createPortal(<div>portal:1</div>, portalContainer)}</div>,
      container,
    );
    expect(portalContainer.innerHTML).toBe('<div>portal:1</div>');
    expect(container.innerHTML).toBe('<div></div>');

    ReactDOM.render(
      <div>{ReactDOM.createPortal(<div>portal:2</div>, portalContainer)}</div>,
      container,
    );
    expect(portalContainer.innerHTML).toBe('<div>portal:2</div>');
    expect(container.innerHTML).toBe('<div></div>');

    ReactDOM.render(
      <div>{ReactDOM.createPortal(<p>portal:3</p>, portalContainer)}</div>,
      container,
    );
    expect(portalContainer.innerHTML).toBe('<p>portal:3</p>');
    expect(container.innerHTML).toBe('<div></div>');

    ReactDOM.render(
      <div>{ReactDOM.createPortal(['Hi', 'Bye'], portalContainer)}</div>,
      container,
    );
    expect(portalContainer.innerHTML).toBe('HiBye');
    expect(container.innerHTML).toBe('<div></div>');

    ReactDOM.render(
      <div>{ReactDOM.createPortal(['Bye', 'Hi'], portalContainer)}</div>,
      container,
    );
    expect(portalContainer.innerHTML).toBe('ByeHi');
    expect(container.innerHTML).toBe('<div></div>');

    ReactDOM.render(
      <div>{ReactDOM.createPortal(null, portalContainer)}</div>,
      container,
    );
    expect(portalContainer.innerHTML).toBe('');
    expect(container.innerHTML).toBe('<div></div>');
  });

  // @gate !disableLegacyMode
  it('should unmount empty portal component wherever it appears', () => {
    const portalContainer = document.createElement('div');

    class Wrapper extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          show: true,
        };
      }
      render() {
        return (
          <div>
            {this.state.show && (
              <>
                {ReactDOM.createPortal(null, portalContainer)}
                <div>child</div>
              </>
            )}
            <div>parent</div>
          </div>
        );
      }
    }

    const instance = ReactDOM.render(<Wrapper />, container);
    expect(container.innerHTML).toBe(
      '<div><div>child</div><div>parent</div></div>',
    );
    instance.setState({show: false});
    expect(instance.state.show).toBe(false);
    expect(container.innerHTML).toBe('<div><div>parent</div></div>');
  });

  // @gate !disableLegacyMode
  it('should keep track of namespace across portals (simple)', () => {
    assertNamespacesMatch(
      <svg {...expectSVG}>
        <image {...expectSVG} />
        {usePortal(<div {...expectHTML} />)}
        <image {...expectSVG} />
      </svg>,
    );
    assertNamespacesMatch(
      <math {...expectMath}>
        <mi {...expectMath} />
        {usePortal(<div {...expectHTML} />)}
        <mi {...expectMath} />
      </math>,
    );
    assertNamespacesMatch(
      <div {...expectHTML}>
        <p {...expectHTML} />
        {usePortal(
          <svg {...expectSVG}>
            <image {...expectSVG} />
          </svg>,
        )}
        <p {...expectHTML} />
      </div>,
    );
  });

  // @gate !disableLegacyMode
  it('should keep track of namespace across portals (medium)', () => {
    assertNamespacesMatch(
      <svg {...expectSVG}>
        <image {...expectSVG} />
        {usePortal(<div {...expectHTML} />)}
        <image {...expectSVG} />
        {usePortal(<div {...expectHTML} />)}
        <image {...expectSVG} />
      </svg>,
    );
    assertNamespacesMatch(
      <div {...expectHTML}>
        <math {...expectMath}>
          <mi {...expectMath} />
          {usePortal(
            <svg {...expectSVG}>
              <image {...expectSVG} />
            </svg>,
          )}
        </math>
        <p {...expectHTML} />
      </div>,
    );
    assertNamespacesMatch(
      <math {...expectMath}>
        <mi {...expectMath} />
        {usePortal(
          <svg {...expectSVG}>
            <image {...expectSVG} />
            <foreignObject {...expectSVG}>
              <p {...expectHTML} />
              <math {...expectMath}>
                <mi {...expectMath} />
              </math>
              <p {...expectHTML} />
            </foreignObject>
            <image {...expectSVG} />
          </svg>,
        )}
        <mi {...expectMath} />
      </math>,
    );
    assertNamespacesMatch(
      <div {...expectHTML}>
        {usePortal(
          <svg {...expectSVG}>
            {usePortal(<div {...expectHTML} />)}
            <image {...expectSVG} />
          </svg>,
        )}
        <p {...expectHTML} />
      </div>,
    );
    assertNamespacesMatch(
      <svg {...expectSVG}>
        <svg {...expectSVG}>
          {usePortal(<div {...expectHTML} />)}
          <image {...expectSVG} />
        </svg>
        <image {...expectSVG} />
      </svg>,
    );
  });

  // @gate !disableLegacyMode
  it('should keep track of namespace across portals (complex)', () => {
    assertNamespacesMatch(
      <div {...expectHTML}>
        {usePortal(
          <svg {...expectSVG}>
            <image {...expectSVG} />
          </svg>,
        )}
        <p {...expectHTML} />
        <svg {...expectSVG}>
          <image {...expectSVG} />
        </svg>
        <svg {...expectSVG}>
          <svg {...expectSVG}>
            <image {...expectSVG} />
          </svg>
          <image {...expectSVG} />
        </svg>
        <p {...expectHTML} />
      </div>,
    );
    assertNamespacesMatch(
      <div {...expectHTML}>
        <svg {...expectSVG}>
          <svg {...expectSVG}>
            <image {...expectSVG} />
            {usePortal(
              <svg {...expectSVG}>
                <image {...expectSVG} />
                <svg {...expectSVG}>
                  <image {...expectSVG} />
                </svg>
                <image {...expectSVG} />
              </svg>,
            )}
            <image {...expectSVG} />
            <foreignObject {...expectSVG}>
              <p {...expectHTML} />
              {usePortal(<p {...expectHTML} />)}
              <p {...expectHTML} />
            </foreignObject>
          </svg>
          <image {...expectSVG} />
        </svg>
        <p {...expectHTML} />
      </div>,
    );
    assertNamespacesMatch(
      <div {...expectHTML}>
        <svg {...expectSVG}>
          <foreignObject {...expectSVG}>
            <p {...expectHTML} />
            {usePortal(
              <svg {...expectSVG}>
                <image {...expectSVG} />
                <svg {...expectSVG}>
                  <image {...expectSVG} />
                  <foreignObject {...expectSVG}>
                    <p {...expectHTML} />
                  </foreignObject>
                  {usePortal(<p {...expectHTML} />)}
                </svg>
                <image {...expectSVG} />
              </svg>,
            )}
            <p {...expectHTML} />
          </foreignObject>
          <image {...expectSVG} />
        </svg>
        <p {...expectHTML} />
      </div>,
    );
  });

  // @gate !disableLegacyMode
  it('should unwind namespaces on uncaught errors', async () => {
    function BrokenRender() {
      throw new Error('Hello');
    }

    await expect(async () => {
      await act(() => {
        assertNamespacesMatch(
          <svg {...expectSVG}>
            <BrokenRender />
          </svg>,
        );
      });
    }).rejects.toThrow('Hello');
    assertNamespacesMatch(<div {...expectHTML} />);
  });

  // @gate !disableLegacyMode
  it('should unwind namespaces on caught errors', () => {
    function BrokenRender() {
      throw new Error('Hello');
    }

    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          return <p {...expectHTML} />;
        }
        return this.props.children;
      }
    }

    assertNamespacesMatch(
      <svg {...expectSVG}>
        <foreignObject {...expectSVG}>
          <ErrorBoundary>
            <math {...expectMath}>
              <BrokenRender />
            </math>
          </ErrorBoundary>
        </foreignObject>
        <image {...expectSVG} />
      </svg>,
    );
    assertNamespacesMatch(<div {...expectHTML} />);
  });

  // @gate !disableLegacyMode
  it('should unwind namespaces on caught errors in a portal', () => {
    function BrokenRender() {
      throw new Error('Hello');
    }

    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          return <image {...expectSVG} />;
        }
        return this.props.children;
      }
    }

    assertNamespacesMatch(
      <svg {...expectSVG}>
        <ErrorBoundary>
          {usePortal(
            <div {...expectHTML}>
              <math {...expectMath}>
                <BrokenRender />)
              </math>
            </div>,
          )}
        </ErrorBoundary>
        {usePortal(<div {...expectHTML} />)}
      </svg>,
    );
  });

  // @gate !disableLegacyContext
  // @gate !disableLegacyMode
  it('should pass portal context when rendering subtree elsewhere', () => {
    const portalContainer = document.createElement('div');

    class Component extends React.Component {
      static contextTypes = {
        foo: PropTypes.string.isRequired,
      };

      render() {
        return <div>{this.context.foo}</div>;
      }
    }

    class Parent extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string.isRequired,
      };

      getChildContext() {
        return {
          foo: 'bar',
        };
      }

      render() {
        return ReactDOM.createPortal(<Component />, portalContainer);
      }
    }

    ReactDOM.render(<Parent />, container);
    assertConsoleErrorDev([
      'Parent uses the legacy childContextTypes API which will soon be removed. Use React.createContext() instead.',
      'Component uses the legacy contextTypes API which will soon be removed. Use React.createContext() with static contextType instead.',
    ]);
    expect(container.innerHTML).toBe('');
    expect(portalContainer.innerHTML).toBe('<div>bar</div>');
  });

  // @gate !disableLegacyContext
  // @gate !disableLegacyMode
  it('should update portal context if it changes due to setState', () => {
    const portalContainer = document.createElement('div');

    class Component extends React.Component {
      static contextTypes = {
        foo: PropTypes.string.isRequired,
        getFoo: PropTypes.func.isRequired,
      };

      render() {
        return <div>{this.context.foo + '-' + this.context.getFoo()}</div>;
      }
    }

    class Parent extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string.isRequired,
        getFoo: PropTypes.func.isRequired,
      };

      state = {
        bar: 'initial',
      };

      getChildContext() {
        return {
          foo: this.state.bar,
          getFoo: () => this.state.bar,
        };
      }

      render() {
        return ReactDOM.createPortal(<Component />, portalContainer);
      }
    }

    const instance = ReactDOM.render(<Parent />, container);
    assertConsoleErrorDev([
      'Parent uses the legacy childContextTypes API which will soon be removed. Use React.createContext() instead.',
      'Component uses the legacy contextTypes API which will soon be removed. Use React.createContext() with static contextType instead.',
    ]);
    expect(portalContainer.innerHTML).toBe('<div>initial-initial</div>');
    expect(container.innerHTML).toBe('');
    instance.setState({bar: 'changed'});
    expect(portalContainer.innerHTML).toBe('<div>changed-changed</div>');
    expect(container.innerHTML).toBe('');
  });

  // @gate !disableLegacyContext
  // @gate !disableLegacyMode
  it('should update portal context if it changes due to re-render', () => {
    const portalContainer = document.createElement('div');

    class Component extends React.Component {
      static contextTypes = {
        foo: PropTypes.string.isRequired,
        getFoo: PropTypes.func.isRequired,
      };

      render() {
        return <div>{this.context.foo + '-' + this.context.getFoo()}</div>;
      }
    }

    class Parent extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string.isRequired,
        getFoo: PropTypes.func.isRequired,
      };

      getChildContext() {
        return {
          foo: this.props.bar,
          getFoo: () => this.props.bar,
        };
      }

      render() {
        return ReactDOM.createPortal(<Component />, portalContainer);
      }
    }

    ReactDOM.render(<Parent bar="initial" />, container);
    assertConsoleErrorDev([
      'Parent uses the legacy childContextTypes API which will soon be removed. Use React.createContext() instead.',
      'Component uses the legacy contextTypes API which will soon be removed. Use React.createContext() with static contextType instead.',
    ]);
    expect(portalContainer.innerHTML).toBe('<div>initial-initial</div>');
    expect(container.innerHTML).toBe('');
    ReactDOM.render(<Parent bar="changed" />, container);
    expect(portalContainer.innerHTML).toBe('<div>changed-changed</div>');
    expect(container.innerHTML).toBe('');
  });

  // @gate !disableLegacyMode
  it('findDOMNode should find dom element after expanding a fragment', () => {
    class MyNode extends React.Component {
      render() {
        return !this.props.flag
          ? [<div key="a" />]
          : [<span key="b" />, <div key="a" />];
      }
    }

    const myNodeA = ReactDOM.render(<MyNode />, container);
    const a =
      ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.findDOMNode(
        myNodeA,
      );
    expect(a.tagName).toBe('DIV');

    const myNodeB = ReactDOM.render(<MyNode flag={true} />, container);
    expect(myNodeA === myNodeB).toBe(true);

    const b =
      ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.findDOMNode(
        myNodeB,
      );
    expect(b.tagName).toBe('SPAN');
  });

  // @gate !disableLegacyMode
  it('should bubble events from the portal to the parent', () => {
    const portalContainer = document.createElement('div');
    document.body.appendChild(portalContainer);
    try {
      const ops = [];
      let portal = null;

      ReactDOM.render(
        <div onClick={() => ops.push('parent clicked')}>
          {ReactDOM.createPortal(
            <div
              onClick={() => ops.push('portal clicked')}
              ref={n => (portal = n)}>
              portal
            </div>,
            portalContainer,
          )}
        </div>,
        container,
      );

      expect(portal.tagName).toBe('DIV');

      portal.click();

      expect(ops).toEqual(['portal clicked', 'parent clicked']);
    } finally {
      document.body.removeChild(portalContainer);
    }
  });

  // @gate !disableLegacyMode
  it('should not onMouseLeave when staying in the portal', () => {
    const portalContainer = document.createElement('div');
    document.body.appendChild(portalContainer);

    let ops = [];
    let firstTarget = null;
    let secondTarget = null;
    let thirdTarget = null;

    function simulateMouseMove(from, to) {
      if (from) {
        from.dispatchEvent(
          new MouseEvent('mouseout', {
            bubbles: true,
            cancelable: true,
            relatedTarget: to,
          }),
        );
      }
      if (to) {
        to.dispatchEvent(
          new MouseEvent('mouseover', {
            bubbles: true,
            cancelable: true,
            relatedTarget: from,
          }),
        );
      }
    }

    try {
      ReactDOM.render(
        <div>
          <div
            onMouseEnter={() => ops.push('enter parent')}
            onMouseLeave={() => ops.push('leave parent')}>
            <div ref={n => (firstTarget = n)} />
            {ReactDOM.createPortal(
              <div
                onMouseEnter={() => ops.push('enter portal')}
                onMouseLeave={() => ops.push('leave portal')}
                ref={n => (secondTarget = n)}>
                portal
              </div>,
              portalContainer,
            )}
          </div>
          <div ref={n => (thirdTarget = n)} />
        </div>,
        container,
      );

      simulateMouseMove(null, firstTarget);
      expect(ops).toEqual(['enter parent']);

      ops = [];

      simulateMouseMove(firstTarget, secondTarget);
      expect(ops).toEqual([
        // Parent did not invoke leave because we're still inside the portal.
        'enter portal',
      ]);

      ops = [];

      simulateMouseMove(secondTarget, thirdTarget);
      expect(ops).toEqual([
        'leave portal',
        'leave parent', // Only when we leave the portal does onMouseLeave fire.
      ]);
    } finally {
      document.body.removeChild(portalContainer);
    }
  });

  // Regression test for https://github.com/facebook/react/issues/19562
  // @gate !disableLegacyMode
  it('does not fire mouseEnter twice when relatedTarget is the root node', () => {
    let ops = [];
    let target = null;

    function simulateMouseMove(from, to) {
      if (from) {
        from.dispatchEvent(
          new MouseEvent('mouseout', {
            bubbles: true,
            cancelable: true,
            relatedTarget: to,
          }),
        );
      }
      if (to) {
        to.dispatchEvent(
          new MouseEvent('mouseover', {
            bubbles: true,
            cancelable: true,
            relatedTarget: from,
          }),
        );
      }
    }

    ReactDOM.render(
      <div
        ref={n => (target = n)}
        onMouseEnter={() => ops.push('enter')}
        onMouseLeave={() => ops.push('leave')}
      />,
      container,
    );

    simulateMouseMove(null, container);
    expect(ops).toEqual([]);

    ops = [];
    simulateMouseMove(container, target);
    expect(ops).toEqual(['enter']);

    ops = [];
    simulateMouseMove(target, container);
    expect(ops).toEqual(['leave']);

    ops = [];
    simulateMouseMove(container, null);
    expect(ops).toEqual([]);
  });

  // @gate !disableLegacyMode
  it('listens to events that do not exist in the Portal subtree', () => {
    const onClick = jest.fn();

    const ref = React.createRef();
    ReactDOM.render(
      <div onClick={onClick}>
        {ReactDOM.createPortal(<button ref={ref}>click</button>, document.body)}
      </div>,
      container,
    );
    const event = new MouseEvent('click', {
      bubbles: true,
    });
    ref.current.dispatchEvent(event);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should throw on bad createPortal argument', () => {
    expect(() => {
      ReactDOM.createPortal(<div>portal</div>, null);
    }).toThrow('Target container is not a DOM element.');
    expect(() => {
      ReactDOM.createPortal(<div>portal</div>, document.createTextNode('hi'));
    }).toThrow('Target container is not a DOM element.');
  });

  // @gate !disableLegacyMode
  it('should warn for non-functional event listeners', () => {
    class Example extends React.Component {
      render() {
        return <div onClick="woops" />;
      }
    }
    ReactDOM.render(<Example />, container);
    assertConsoleErrorDev([
      'Expected `onClick` listener to be a function, instead got a value of `string` type.\n' +
        '    in div (at **)\n' +
        '    in Example (at **)',
    ]);
  });

  // @gate !disableLegacyMode
  it('should warn with a special message for `false` event listeners', () => {
    class Example extends React.Component {
      render() {
        return <div onClick={false} />;
      }
    }
    ReactDOM.render(<Example />, container);
    assertConsoleErrorDev([
      'Expected `onClick` listener to be a function, instead got `false`.\n\n' +
        'If you used to conditionally omit it with onClick={condition && value}, ' +
        'pass onClick={condition ? value : undefined} instead.\n' +
        '    in div (at **)\n' +
        '    in Example (at **)',
    ]);
  });

  // @gate !disableLegacyMode
  it('should not update event handlers until commit', () => {
    spyOnDev(console, 'error');

    let ops = [];
    const handlerA = () => ops.push('A');
    const handlerB = () => ops.push('B');

    function click() {
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'timeStamp', {
        value: 0,
      });
      node.dispatchEvent(event);
    }

    class Example extends React.Component {
      state = {flip: false, count: 0};
      flip() {
        this.setState({flip: true, count: this.state.count + 1});
      }
      tick() {
        this.setState({count: this.state.count + 1});
      }
      render() {
        const useB = !this.props.forceA && this.state.flip;
        return <div onClick={useB ? handlerB : handlerA} />;
      }
    }

    class Click extends React.Component {
      constructor() {
        super();
        node.click();
      }
      render() {
        return null;
      }
    }

    let inst;
    ReactDOM.render([<Example key="a" ref={n => (inst = n)} />], container);
    const node = container.firstChild;
    expect(node.tagName).toEqual('DIV');

    click();

    expect(ops).toEqual(['A']);
    ops = [];

    // Render with the other event handler.
    inst.flip();

    click();

    expect(ops).toEqual(['B']);
    ops = [];

    // Rerender without changing any props.
    inst.tick();

    click();

    expect(ops).toEqual(['B']);
    ops = [];

    // Render a flip back to the A handler. The second component invokes the
    // click handler during render to simulate a click during an aborted
    // render. I use this hack because at current time we don't have a way to
    // test aborted ReactDOM renders.
    ReactDOM.render(
      [<Example key="a" forceA={true} />, <Click key="b" />],
      container,
    );

    // Because the new click handler has not yet committed, we should still
    // invoke B.
    expect(ops).toEqual(['B']);
    ops = [];

    // Any click that happens after commit, should invoke A.
    click();
    expect(ops).toEqual(['A']);

    if (__DEV__) {
      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.error.mock.calls[0][0]).toMatch(
        'ReactDOM.render has not been supported since React 18',
      );
      expect(console.error.mock.calls[1][0]).toMatch(
        'ReactDOM.render has not been supported since React 18',
      );
    }
  });

  // @gate !disableLegacyMode
  it('should not crash encountering low-priority tree', () => {
    ReactDOM.render(
      <div hidden={true}>
        <div />
      </div>,
      container,
    );
  });

  // @gate !disableLegacyMode
  it('should not warn when rendering into an empty container', () => {
    ReactDOM.render(<div>foo</div>, container);
    expect(container.innerHTML).toBe('<div>foo</div>');
    ReactDOM.render(null, container);
    expect(container.innerHTML).toBe('');
    ReactDOM.render(<div>bar</div>, container);
    expect(container.innerHTML).toBe('<div>bar</div>');
  });

  // @gate !disableLegacyMode
  it('should warn when replacing a container which was manually updated outside of React', async () => {
    // when not messing with the DOM outside of React
    ReactDOM.render(<div key="1">foo</div>, container);
    ReactDOM.render(<div key="1">bar</div>, container);
    expect(container.innerHTML).toBe('<div>bar</div>');
    // then we mess with the DOM before an update
    // we know this will error - that is expected right now
    // It's an error of type 'NotFoundError' with no message
    container.innerHTML = '<div>MEOW.</div>';

    await expect(async () => {
      await act(() => {
        ReactDOM.render(<div key="2">baz</div>, container);
      });
    }).rejects.toThrow('The node to be removed is not a child of this node.');
    assertConsoleErrorDev([
      '' +
        'It looks like the React-rendered content of this container was ' +
        'removed without using React. This is not supported and will ' +
        'cause errors. Instead, call ReactDOM.unmountComponentAtNode ' +
        'to empty a container.',
    ]);
  });

  // @gate !disableLegacyMode
  it('should warn when doing an update to a container manually updated outside of React', () => {
    // when not messing with the DOM outside of React
    ReactDOM.render(<div>foo</div>, container);
    ReactDOM.render(<div>bar</div>, container);
    expect(container.innerHTML).toBe('<div>bar</div>');
    // then we mess with the DOM before an update
    container.innerHTML = '<div>MEOW.</div>';
    ReactDOM.render(<div>baz</div>, container);
    assertConsoleErrorDev([
      '' +
        'It looks like the React-rendered content of this container was ' +
        'removed without using React. This is not supported and will ' +
        'cause errors. Instead, call ReactDOM.unmountComponentAtNode ' +
        'to empty a container.',
    ]);
  });

  // @gate !disableLegacyMode
  it('should warn when doing an update to a container manually cleared outside of React', () => {
    // when not messing with the DOM outside of React
    ReactDOM.render(<div>foo</div>, container);
    ReactDOM.render(<div>bar</div>, container);
    expect(container.innerHTML).toBe('<div>bar</div>');
    // then we mess with the DOM before an update
    container.innerHTML = '';
    ReactDOM.render(<div>baz</div>, container);
    assertConsoleErrorDev([
      '' +
        'It looks like the React-rendered content of this container was ' +
        'removed without using React. This is not supported and will ' +
        'cause errors. Instead, call ReactDOM.unmountComponentAtNode ' +
        'to empty a container.',
    ]);
  });

  // @gate !disableLegacyMode
  it('should render a text component with a text DOM node on the same document as the container', () => {
    // 1. Create a new document through the use of iframe
    // 2. Set up the spy to make asserts when a text component
    //    is rendered inside the iframe container
    const textContent = 'Hello world';
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const iframeDocument = iframe.contentDocument;
    iframeDocument.write(
      '<!DOCTYPE html><html><head></head><body><div></div></body></html>',
    );
    iframeDocument.close();
    const iframeContainer = iframeDocument.body.firstChild;

    let actualDocument;
    let textNode;

    spyOnDevAndProd(iframeContainer, 'appendChild').mockImplementation(node => {
      actualDocument = node.ownerDocument;
      textNode = node;
    });

    ReactDOM.render(textContent, iframeContainer);

    expect(textNode.textContent).toBe(textContent);
    expect(actualDocument).not.toBe(document);
    expect(actualDocument).toBe(iframeDocument);
    expect(iframeContainer.appendChild).toHaveBeenCalledTimes(1);
  });

  // @gate !disableLegacyMode
  it('should mount into a document fragment', () => {
    const fragment = document.createDocumentFragment();
    ReactDOM.render(<div>foo</div>, fragment);
    expect(container.innerHTML).toBe('');
    container.appendChild(fragment);
    expect(container.innerHTML).toBe('<div>foo</div>');
  });

  // Regression test for https://github.com/facebook/react/issues/12643#issuecomment-413727104
  // @gate !disableLegacyMode
  it('should not diff memoized host components', () => {
    const inputRef = React.createRef();
    let didCallOnChange = false;

    class Child extends React.Component {
      state = {};
      componentDidMount() {
        document.addEventListener('click', this.update, true);
      }
      componentWillUnmount() {
        document.removeEventListener('click', this.update, true);
      }
      update = () => {
        // We're testing that this setState()
        // doesn't cause React to commit updates
        // to the input outside (which would itself
        // prevent the parent's onChange parent handler
        // from firing).
        this.setState({});
        // Note that onChange was always broken when there was an
        // earlier setState() in a manual document capture phase
        // listener *in the same component*. But that's very rare.
        // Here we're testing that a *child* component doesn't break
        // the parent if this happens.
      };
      render() {
        return <div />;
      }
    }

    class Parent extends React.Component {
      handleChange = val => {
        didCallOnChange = true;
      };
      render() {
        return (
          <div>
            <Child />
            <input
              ref={inputRef}
              type="checkbox"
              checked={true}
              onChange={this.handleChange}
            />
          </div>
        );
      }
    }

    ReactDOM.render(<Parent />, container);
    inputRef.current.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
      }),
    );
    expect(didCallOnChange).toBe(true);
  });

  // @gate !disableLegacyMode
  it('unmounted legacy roots should never clear newer root content from a container', () => {
    const ref = React.createRef();

    function OldApp() {
      const hideOnFocus = () => {
        // This app unmounts itself inside of a focus event.
        ReactDOM.unmountComponentAtNode(container);
      };

      return (
        <button onFocus={hideOnFocus} ref={ref}>
          old
        </button>
      );
    }

    function NewApp() {
      return <button ref={ref}>new</button>;
    }

    ReactDOM.render(<OldApp />, container);
    ref.current.focus();

    ReactDOM.render(<NewApp />, container);

    // Calling focus again will flush previously scheduled discrete work for the old root-
    // but this should not clear out the newly mounted app.
    ref.current.focus();

    expect(container.textContent).toBe('new');
  });
});
