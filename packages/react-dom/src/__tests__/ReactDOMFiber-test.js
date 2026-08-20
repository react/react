/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOM;
let PropTypes;
let ReactDOMClient;
let Scheduler;

let act;
let assertConsoleErrorDev;
let assertLog;
let root;
let JSDOM;

describe('ReactDOMFiber', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();

    // JSDOM needs to be setup with a TextEncoder and TextDecoder when used standalone
    // https://github.com/jsdom/jsdom/issues/2524
    (() => {
      const {TextEncoder, TextDecoder} = require('util');
      global.TextEncoder = TextEncoder;
      global.TextDecoder = TextDecoder;
      JSDOM = require('jsdom').JSDOM;
    })();

    React = require('react');
    ReactDOM = require('react-dom');
    PropTypes = require('prop-types');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    ({assertConsoleErrorDev, assertLog} = require('internal-test-utils'));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
    jest.restoreAllMocks();
  });

  it('should render strings as children', async () => {
    const Box = ({value}) => <div>{value}</div>;
    await act(async () => {
      root.render(<Box value="foo" />);
    });
    expect(container.textContent).toEqual('foo');
  });

  it('should render numbers as children', async () => {
    const Box = ({value}) => <div>{value}</div>;

    await act(async () => {
      root.render(<Box value={10} />);
    });

    expect(container.textContent).toEqual('10');
  });

  it('should render bigints as children', async () => {
    const Box = ({value}) => <div>{value}</div>;

    await act(async () => {
      root.render(<Box value={10n} />);
    });

    expect(container.textContent).toEqual('10');
  });

  it('should call an effect after mount/update (replacing render callback pattern)', async () => {
    function Component() {
      React.useEffect(() => {
        Scheduler.log('Callback');
      });
      return <div>Foo</div>;
    }

    // mounting phase
    await act(async () => {
      root.render(<Component />);
    });
    assertLog(['Callback']);

    // updating phase
    await act(async () => {
      root.render(<Component />);
    });
    assertLog(['Callback']);
  });

  it('should call an effect when the same element is re-rendered (replacing render callback pattern)', async () => {
    function Component({prop}) {
      React.useEffect(() => {
        Scheduler.log('Callback');
      });
      return <div>{prop}</div>;
    }

    // mounting phase
    await act(async () => {
      root.render(<Component prop="Foo" />);
    });
    assertLog(['Callback']);

    // updating phase
    await act(async () => {
      root.render(<Component prop="Bar" />);
    });
    assertLog(['Callback']);
  });

  it('should render a component returning strings directly from render', async () => {
    const Text = ({value}) => value;

    await act(async () => {
      root.render(<Text value="foo" />);
    });

    expect(container.textContent).toEqual('foo');
  });

  it('should render a component returning numbers directly from render', async () => {
    const Text = ({value}) => value;
    await act(async () => {
      root.render(<Text value={10} />);
    });

    expect(container.textContent).toEqual('10');
  });

  it('renders an empty fragment', async () => {
    const Div = () => <div />;
    const EmptyFragment = () => <></>;
    const NonEmptyFragment = () => (
      <>
        <Div />
      </>
    );

    await act(async () => {
      root.render(<EmptyFragment />);
    });
    expect(container.firstChild).toBe(null);

    await act(async () => {
      root.render(<NonEmptyFragment />);
    });
    expect(container.firstChild.tagName).toBe('DIV');

    await act(async () => {
      root.render(<EmptyFragment />);
    });
    expect(container.firstChild).toBe(null);

    await act(async () => {
      root.render(<Div />);
    });
    expect(container.firstChild.tagName).toBe('DIV');

    await act(async () => {
      root.render(<EmptyFragment />);
    });
    expect(container.firstChild).toBe(null);
  });

  let svgEls, htmlEls, mathEls;
  const expectSVG = {ref: el => svgEls.push(el)};
  const expectHTML = {ref: el => htmlEls.push(el)};
  const expectMath = {ref: el => mathEls.push(el)};

  const usePortal = function (tree) {
    return ReactDOM.createPortal(tree, document.createElement('div'));
  };

  const assertNamespacesMatch = async function (tree) {
    const testContainer = document.createElement('div');
    svgEls = [];
    htmlEls = [];
    mathEls = [];

    const testRoot = ReactDOMClient.createRoot(testContainer);
    await act(async () => {
      testRoot.render(tree);
    });
    svgEls.forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });
    htmlEls.forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    });
    mathEls.forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
    });

    testRoot.unmount();
    expect(testContainer.innerHTML).toBe('');
  };

  it('should render one portal', async () => {
    const portalContainer = document.createElement('div');

    await act(() => {
      root.render(
        <div>{ReactDOM.createPortal(<div>portal</div>, portalContainer)}</div>,
      );
    });
    expect(portalContainer.innerHTML).toBe('<div>portal</div>');
    expect(container.innerHTML).toBe('<div></div>');

    root.unmount();
    expect(portalContainer.innerHTML).toBe('');
    expect(container.innerHTML).toBe('');
  });

  it('should render many portals', async () => {
    const portalContainer1 = document.createElement('div');
    const portalContainer2 = document.createElement('div');

    class Child extends React.Component {
      componentDidMount() {
        Scheduler.log(`${this.props.name} componentDidMount`);
      }
      componentDidUpdate() {
        Scheduler.log(`${this.props.name} componentDidUpdate`);
      }
      componentWillUnmount() {
        Scheduler.log(`${this.props.name} componentWillUnmount`);
      }
      render() {
        return <div>{this.props.name}</div>;
      }
    }

    class Parent extends React.Component {
      componentDidMount() {
        Scheduler.log(`Parent:${this.props.step} componentDidMount`);
      }
      componentDidUpdate() {
        Scheduler.log(`Parent:${this.props.step} componentDidUpdate`);
      }
      componentWillUnmount() {
        Scheduler.log(`Parent:${this.props.step} componentWillUnmount`);
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

    await act(() => {
      root.render(<Parent step="a" />);
    });
    expect(portalContainer1.innerHTML).toBe('<div>portal1[0]:a</div>');
    expect(portalContainer2.innerHTML).toBe(
      '<div>portal2[0]:a</div><div>portal2[1]:a</div>',
    );
    expect(container.innerHTML).toBe(
      '<div>normal[0]:a</div><div>normal[1]:a</div>',
    );
    assertLog([
      'normal[0]:a componentDidMount',
      'portal1[0]:a componentDidMount',
      'normal[1]:a componentDidMount',
      'portal2[0]:a componentDidMount',
      'portal2[1]:a componentDidMount',
      'Parent:a componentDidMount',
    ]);

    await act(() => {
      root.render(<Parent step="b" />);
    });
    expect(portalContainer1.innerHTML).toBe('<div>portal1[0]:b</div>');
    expect(portalContainer2.innerHTML).toBe(
      '<div>portal2[0]:b</div><div>portal2[1]:b</div>',
    );
    expect(container.innerHTML).toBe(
      '<div>normal[0]:b</div><div>normal[1]:b</div>',
    );
    assertLog([
      'normal[0]:b componentDidUpdate',
      'portal1[0]:b componentDidUpdate',
      'normal[1]:b componentDidUpdate',
      'portal2[0]:b componentDidUpdate',
      'portal2[1]:b componentDidUpdate',
      'Parent:b componentDidUpdate',
    ]);

    root.unmount();
    expect(portalContainer1.innerHTML).toBe('');
    expect(portalContainer2.innerHTML).toBe('');
    expect(container.innerHTML).toBe('');
    assertLog([
      'Parent:b componentWillUnmount',
      'normal[0]:b componentWillUnmount',
      'portal1[0]:b componentWillUnmount',
      'normal[1]:b componentWillUnmount',
      'portal2[0]:b componentWillUnmount',
      'portal2[1]:b componentWillUnmount',
    ]);
  });

  it('should render nested portals', async () => {
    const portalContainer1 = document.createElement('div');
    const portalContainer2 = document.createElement('div');
    const portalContainer3 = document.createElement('div');

    await act(() => {
      root.render([
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
      ]);
    });
    expect(portalContainer1.innerHTML).toBe(
      '<div>portal1[0]</div><div>portal1[1]</div>',
    );
    expect(portalContainer2.innerHTML).toBe('<div>portal2[0]</div>');
    expect(portalContainer3.innerHTML).toBe('<div>portal3[0]</div>');
    expect(container.innerHTML).toBe(
      '<div>normal[0]</div><div>normal[1]</div>',
    );

    root.unmount();
    expect(portalContainer1.innerHTML).toBe('');
    expect(portalContainer2.innerHTML).toBe('');
    expect(portalContainer3.innerHTML).toBe('');
    expect(container.innerHTML).toBe('');
  });

  it('should reconcile portal children', async () => {
    const portalContainer = document.createElement('div');

    await act(() => {
      root.render(
        <div>
          {ReactDOM.createPortal(<div>portal:1</div>, portalContainer)}
        </div>,
      );
    });
    expect(portalContainer.innerHTML).toBe('<div>portal:1</div>');
    expect(container.innerHTML).toBe('<div></div>');

    await act(() => {
      root.render(
        <div>
          {ReactDOM.createPortal(<div>portal:2</div>, portalContainer)}
        </div>,
      );
    });
    expect(portalContainer.innerHTML).toBe('<div>portal:2</div>');
    expect(container.innerHTML).toBe('<div></div>');

    await act(() => {
      root.render(
        <div>{ReactDOM.createPortal(<p>portal:3</p>, portalContainer)}</div>,
      );
    });
    expect(portalContainer.innerHTML).toBe('<p>portal:3</p>');
    expect(container.innerHTML).toBe('<div></div>');

    await act(() => {
      root.render(
        <div>{ReactDOM.createPortal(['Hi', 'Bye'], portalContainer)}</div>,
      );
    });
    expect(portalContainer.innerHTML).toBe('HiBye');
    expect(container.innerHTML).toBe('<div></div>');

    await act(() => {
      root.render(
        <div>{ReactDOM.createPortal(['Bye', 'Hi'], portalContainer)}</div>,
      );
    });
    expect(portalContainer.innerHTML).toBe('ByeHi');
    expect(container.innerHTML).toBe('<div></div>');

    await act(() => {
      root.render(<div>{ReactDOM.createPortal(null, portalContainer)}</div>);
    });
    expect(portalContainer.innerHTML).toBe('');
    expect(container.innerHTML).toBe('<div></div>');
  });

  it('should unmount empty portal component wherever it appears', async () => {
    const portalContainer = document.createElement('div');
    let instance;
    class Wrapper extends React.Component {
      constructor(props) {
        super(props);
        instance = this;
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

    await act(() => {
      root.render(<Wrapper />);
    });
    expect(container.innerHTML).toBe(
      '<div><div>child</div><div>parent</div></div>',
    );
    await act(() => {
      instance.setState({show: false});
    });
    expect(instance.state.show).toBe(false);
    expect(container.innerHTML).toBe('<div><div>parent</div></div>');
  });

  it('should keep track of namespace across portals (simple)', async () => {
    await assertNamespacesMatch(
      <svg {...expectSVG}>
        <image {...expectSVG} />
        {usePortal(<div {...expectHTML} />)}
        <image {...expectSVG} />
      </svg>,
    );
    await assertNamespacesMatch(
      <math {...expectMath}>
        <mi {...expectMath} />
        {usePortal(<div {...expectHTML} />)}
        <mi {...expectMath} />
      </math>,
    );
    await assertNamespacesMatch(
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

  it('should keep track of namespace across portals (medium)', async () => {
    await assertNamespacesMatch(
      <svg {...expectSVG}>
        <image {...expectSVG} />
        {usePortal(<div {...expectHTML} />)}
        <image {...expectSVG} />
        {usePortal(<div {...expectHTML} />)}
        <image {...expectSVG} />
      </svg>,
    );
    await assertNamespacesMatch(
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
    await assertNamespacesMatch(
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
    await assertNamespacesMatch(
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
    await assertNamespacesMatch(
      <svg {...expectSVG}>
        <svg {...expectSVG}>
          {usePortal(<div {...expectHTML} />)}
          <image {...expectSVG} />
        </svg>
        <image {...expectSVG} />
      </svg>,
    );
  });

  it('should keep track of namespace across portals (complex)', async () => {
    await assertNamespacesMatch(
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
    await assertNamespacesMatch(
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
    await assertNamespacesMatch(
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

  it('should unwind namespaces on uncaught errors', async () => {
    function BrokenRender() {
      throw new Error('Hello');
    }

    await expect(async () => {
      await assertNamespacesMatch(
        <svg {...expectSVG}>
          <BrokenRender />
        </svg>,
      );
    }).rejects.toThrow('Hello');
    await assertNamespacesMatch(<div {...expectHTML} />);
  });

  it('should unwind namespaces on caught errors', async () => {
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

    await assertNamespacesMatch(
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
    await assertNamespacesMatch(<div {...expectHTML} />);
  });

  it('should unwind namespaces on caught errors in a portal', async () => {
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

    await assertNamespacesMatch(
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
  it('should pass portal context when rendering subtree elsewhere', async () => {
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

    await act(async () => {
      root.render(<Parent />);
    });
    assertConsoleErrorDev([
      'Parent uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
      'Component uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
    ]);
    expect(container.innerHTML).toBe('');
    expect(portalContainer.innerHTML).toBe('<div>bar</div>');
  });

  it('should bubble events from the portal to the parent', async () => {
    const portalContainer = document.createElement('div');
    document.body.appendChild(portalContainer);
    try {
      let portal = null;

      await act(() => {
        root.render(
          <div onClick={() => Scheduler.log('parent clicked')}>
            {ReactDOM.createPortal(
              <div
                onClick={() => Scheduler.log('portal clicked')}
                ref={n => (portal = n)}>
                portal
              </div>,
              portalContainer,
            )}
          </div>,
        );
      });

      expect(portal.tagName).toBe('DIV');

      await act(() => {
        portal.click();
      });

      assertLog(['portal clicked', 'parent clicked']);
    } finally {
      document.body.removeChild(portalContainer);
    }
  });

  it('should not onMouseLeave when staying in the portal', async () => {
    const portalContainer = document.createElement('div');
    document.body.appendChild(portalContainer);

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
      await act(() => {
        root.render(
          <div>
            <div
              onMouseEnter={() => Scheduler.log('enter parent')}
              onMouseLeave={() => Scheduler.log('leave parent')}>
              <div ref={n => (firstTarget = n)} />
              {ReactDOM.createPortal(
                <div
                  onMouseEnter={() => Scheduler.log('enter portal')}
                  onMouseLeave={() => Scheduler.log('leave portal')}
                  ref={n => (secondTarget = n)}>
                  portal
                </div>,
                portalContainer,
              )}
            </div>
            <div ref={n => (thirdTarget = n)} />
          </div>,
        );
      });
      await act(() => {
        simulateMouseMove(null, firstTarget);
      });
      assertLog(['enter parent']);

      await act(() => {
        simulateMouseMove(firstTarget, secondTarget);
      });
      assertLog([
        // Parent did not invoke leave because we're still inside the portal.
        'enter portal',
      ]);

      await act(() => {
        simulateMouseMove(secondTarget, thirdTarget);
      });
      assertLog([
        'leave portal',
        'leave parent', // Only when we leave the portal does onMouseLeave fire.
      ]);
    } finally {
      document.body.removeChild(portalContainer);
    }
  });

  // Regression test for https://github.com/facebook/react/issues/19562
  it('does not fire mouseEnter twice when relatedTarget is the root node', async () => {
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

    await act(() => {
      root.render(
        <div
          ref={n => (target = n)}
          onMouseEnter={() => Scheduler.log('enter')}
          onMouseLeave={() => Scheduler.log('leave')}
        />,
      );
    });

    await act(() => {
      simulateMouseMove(null, container);
    });
    assertLog([]);

    await act(() => {
      simulateMouseMove(container, target);
    });
    assertLog(['enter']);

    await act(() => {
      simulateMouseMove(target, container);
    });
    assertLog(['leave']);

    await act(() => {
      simulateMouseMove(container, null);
    });
    assertLog([]);
  });

  it('listens to events that do not exist in the Portal subtree', async () => {
    const onClick = jest.fn();

    const ref = React.createRef();
    await act(() => {
      root.render(
        <div onClick={onClick}>
          {ReactDOM.createPortal(
            <button ref={ref}>click</button>,
            document.body,
          )}
        </div>,
      );
    });
    const event = new MouseEvent('click', {
      bubbles: true,
    });
    await act(() => {
      ref.current.dispatchEvent(event);
    });

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

  it('should warn for non-functional event listeners', () => {
    class Example extends React.Component {
      render() {
        return <div onClick="woops" />;
      }
    }
    ReactDOM.flushSync(() => {
      root.render(<Example />);
    });
    assertConsoleErrorDev([
      'Expected `onClick` listener to be a function, instead got a value of `string` type.\n' +
        '    in div (at **)\n' +
        '    in Example (at **)',
    ]);
  });

  it('should warn with a special message for `false` event listeners', () => {
    class Example extends React.Component {
      render() {
        return <div onClick={false} />;
      }
    }
    ReactDOM.flushSync(() => {
      root.render(<Example />);
    });
    assertConsoleErrorDev([
      'Expected `onClick` listener to be a function, instead got `false`.\n\n' +
        'If you used to conditionally omit it with onClick={condition && value}, ' +
        'pass onClick={condition ? value : undefined} instead.\n' +
        '    in div (at **)\n' +
        '    in Example (at **)',
    ]);
  });

  it('should not update event handlers until commit', async () => {
    const handlerA = () => Scheduler.log('A');
    const handlerB = () => Scheduler.log('B');

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
    await act(() => {
      root.render([<Example key="a" ref={n => (inst = n)} />]);
    });
    const node = container.firstChild;
    expect(node.tagName).toEqual('DIV');

    await act(() => {
      click();
    });

    assertLog(['A']);

    // Render with the other event handler.
    await act(() => {
      inst.flip();
    });

    await act(() => {
      click();
    });

    assertLog(['B']);

    // Rerender without changing any props.
    await act(() => {
      inst.tick();
    });

    await act(() => {
      click();
    });

    assertLog(['B']);

    // Render a flip back to the A handler. The second component invokes the
    // click handler during render to simulate a click during an aborted
    // render. I use this hack because at current time we don't have a way to
    // test aborted ReactDOM renders.
    await act(() => {
      root.render([<Example key="a" forceA={true} />, <Click key="b" />]);
    });

    // Because the new click handler has not yet committed, we should still
    // invoke B.
    assertLog(['B']);

    // Any click that happens after commit, should invoke A.
    await act(() => {
      click();
    });
    assertLog(['A']);
  });

  it('should not crash encountering low-priority tree', async () => {
    await act(() => {
      root.render(
        <div hidden={true}>
          <div />
        </div>,
      );
    });

    expect(container.innerHTML).toBe('<div hidden=""><div></div></div>');
  });

  it('should not warn when rendering into an empty container', async () => {
    await act(() => {
      root.render(<div>foo</div>);
    });
    expect(container.innerHTML).toBe('<div>foo</div>');
    await act(() => {
      root.render(null);
    });
    expect(container.innerHTML).toBe('');
    await act(() => {
      root.render(<div>bar</div>);
    });
    expect(container.innerHTML).toBe('<div>bar</div>');
  });

  it('should warn when replacing a container which was manually updated outside of React', async () => {
    // when not messing with the DOM outside of React
    await act(() => {
      root.render(<div key="1">foo</div>);
    });
    expect(container.innerHTML).toBe('<div>foo</div>');

    await act(() => {
      root.render(<div key="1">bar</div>);
    });
    expect(container.innerHTML).toBe('<div>bar</div>');

    // then we mess with the DOM before an update
    // we know this will error - that is expected right now
    // It's an error of type 'NotFoundError' with no message
    container.innerHTML = '<div>MEOW.</div>';

    await expect(async () => {
      await act(() => {
        ReactDOM.flushSync(() => {
          root.render(<div key="2">baz</div>);
        });
      });
    }).rejects.toThrow('The node to be removed is not a child of this node');
  });

  it('should not warn when doing an update to a container manually updated outside of React', async () => {
    // when not messing with the DOM outside of React
    await act(() => {
      root.render(<div>foo</div>);
    });
    expect(container.innerHTML).toBe('<div>foo</div>');

    await act(() => {
      root.render(<div>bar</div>);
    });
    expect(container.innerHTML).toBe('<div>bar</div>');

    // then we mess with the DOM before an update
    container.innerHTML = '<div>MEOW.</div>';

    await act(() => {
      root.render(<div>baz</div>);
    });
    // TODO: why not, and no error?
    expect(container.innerHTML).toBe('<div>MEOW.</div>');
  });

  it('should not warn when doing an update to a container manually cleared outside of React', async () => {
    // when not messing with the DOM outside of React
    await act(() => {
      root.render(<div>foo</div>);
    });
    expect(container.innerHTML).toBe('<div>foo</div>');

    await act(() => {
      root.render(<div>bar</div>);
    });
    expect(container.innerHTML).toBe('<div>bar</div>');

    // then we mess with the DOM before an update
    container.innerHTML = '';

    await act(() => {
      root.render(<div>baz</div>);
    });
    // TODO: why not, and no error?
    expect(container.innerHTML).toBe('');
  });

  it('should render a text component with a text DOM node on the same document as the container', async () => {
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

    const iFrameRoot = ReactDOMClient.createRoot(iframeContainer);
    await act(() => {
      iFrameRoot.render(textContent);
    });

    expect(textNode.textContent).toBe(textContent);
    expect(actualDocument).not.toBe(document);
    expect(actualDocument).toBe(iframeDocument);
    expect(iframeContainer.appendChild).toHaveBeenCalledTimes(1);
  });

  it('should mount into a document fragment', async () => {
    const fragment = document.createDocumentFragment();
    const fragmentRoot = ReactDOMClient.createRoot(fragment);
    await act(() => {
      fragmentRoot.render(<div>foo</div>);
    });
    expect(container.innerHTML).toBe('');
    container.appendChild(fragment);
    expect(container.innerHTML).toBe('<div>foo</div>');
  });

  // Regression test for https://github.com/facebook/react/issues/12643#issuecomment-413727104
  it('should not diff memoized host components', async () => {
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

    await act(() => {
      root.render(<Parent />);
    });
    await act(() => {
      inputRef.current.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
        }),
      );
    });
    expect(didCallOnChange).toBe(true);
  });

  it('should restore selection in the correct window', async () => {
    // creating new JSDOM instance to get a second window as window.open is not implemented
    // https://github.com/jsdom/jsdom/blob/c53efc81e75f38a0558fbf3ed75d30b78b4c4898/lib/jsdom/browser/Window.js#L987
    const {window: newWindow} = new JSDOM('');
    // creating a new container since the default cleanup expects the existing container to be in the document
    const newContainer = newWindow.document.createElement('div');
    newWindow.document.body.appendChild(newContainer);
    root = ReactDOMClient.createRoot(newContainer);

    const Test = () => {
      const [reverse, setReverse] = React.useState(false);
      const [items] = React.useState(() => ['a', 'b', 'c']);
      const onClick = () => {
        setReverse(true);
      };

      // shuffle the items so that the react commit needs to restore focus
      // to the correct element after commit
      const itemsToRender = reverse ? items.reverse() : items;

      return (
        <div>
          {itemsToRender.map(item => (
            <button onClick={onClick} key={item} id={item}>
              {item}
            </button>
          ))}
        </div>
      );
    };

    await act(() => {
      root.render(<Test />);
    });

    newWindow.document.getElementById('a').focus();
    await act(() => {
      newWindow.document.getElementById('a').click();
    });

    expect(newWindow.document.activeElement).not.toBe(newWindow.document.body);
    expect(newWindow.document.activeElement.innerHTML).toBe('a');
  });
});
