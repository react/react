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

const ReactFeatureFlags = require('shared/ReactFeatureFlags');
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');
const {format: prettyFormat} = require('pretty-format');
const InternalTestUtils = require('internal-test-utils');
const waitForAll = InternalTestUtils.waitForAll;
const act = InternalTestUtils.act;
const Reconciler = require('react-reconciler/src/ReactFiberReconciler');
const {
  ConcurrentRoot,
  LegacyRoot,
} = require('react-reconciler/src/ReactRootTags');

// Isolate noop renderer
jest.resetModules();
const ReactNoop = require('react-noop-renderer');

// Kind of hacky, but we nullify all the instances to test the tree structure
// with jasmine's deep equality function, and test the instances separate. We
// also delete children props because testing them is more annoying and not
// really important to verify.
function cleanNodeOrArray(node) {
  if (!node) {
    return;
  }
  if (Array.isArray(node)) {
    node.forEach(cleanNodeOrArray);
    return;
  }
  if (node && node.instance) {
    node.instance = null;
  }
  if (node && node.props && node.props.children) {
    const {children, ...props} = node.props;
    node.props = props;
  }
  if (Array.isArray(node.rendered)) {
    node.rendered.forEach(cleanNodeOrArray);
  } else if (typeof node.rendered === 'object') {
    cleanNodeOrArray(node.rendered);
  }
}

describe('ReactTestRenderer', () => {
  beforeEach(() => {
    jest.resetModules();
    ReactFeatureFlags.enableReactTestRendererWarning = false;
  });

  // @gate __DEV__
  it('should warn if enableReactTestRendererWarning is enabled', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    ReactFeatureFlags.enableReactTestRendererWarning = true;
    ReactTestRenderer.create(<div />);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toContain(
      'react-test-renderer is deprecated. See https://react.dev/warnings/react-test-renderer',
    );
    console.error.mockRestore();
  });

  it('should not warn if enableReactTestRendererWarning is enabled but the RN global is set', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;
    ReactFeatureFlags.enableReactTestRendererWarning = true;
    ReactTestRenderer.create(<div />);
    expect(console.error).toHaveBeenCalledTimes(0);
    console.error.mockRestore();
  });

  describe('root tags', () => {
    let createContainerSpy;
    beforeEach(() => {
      global.IS_REACT_NATIVE_TEST_ENVIRONMENT = false;
      createContainerSpy = jest.spyOn(Reconciler, 'createContainer');
    });

    function expectTag(tag) {
      expect(createContainerSpy).toHaveBeenCalledWith(
        expect.anything(),
        tag,
        null,
        expect.anything(),
        false,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        null,
      );
    }

    // @gate disableLegacyMode
    it('should render using concurrent root if disableLegacyMode', () => {
      ReactTestRenderer.create(<div />);
      expectTag(ConcurrentRoot);
    });

    // @gate !disableLegacyMode
    it('should default to legacy root if not disableLegacyMode', () => {
      ReactTestRenderer.create(<div />);
      expectTag(LegacyRoot);
    });

    it('should allow unstable_isConcurrent if not disableLegacyMode', async () => {
      ReactTestRenderer.create(<div />, {
        unstable_isConcurrent: true,
      });
      ReactTestRenderer.create(<div />);
      expectTag(ConcurrentRoot);
    });

    it('should render legacy root when RN test environment', async () => {
      global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;
      ReactTestRenderer.create(<div />);
      expectTag(LegacyRoot);
    });
  });

  it('renders a simple component', async () => {
    function Link() {
      return <a role="link" />;
    }
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Link />);
    });
    expect(renderer.toJSON()).toEqual({
      type: 'a',
      props: {role: 'link'},
      children: null,
    });
  });

  it('renders a top-level empty component', async () => {
    function Empty() {
      return null;
    }
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Empty />);
    });
    expect(renderer.toJSON()).toEqual(null);
  });

  it('exposes a type flag', async () => {
    function Link() {
      return <a role="link" />;
    }
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Link />);
    });
    const object = renderer.toJSON();
    expect(object.$$typeof).toBe(Symbol.for('react.test.json'));

    // $$typeof should not be enumerable.
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        expect(key).not.toBe('$$typeof');
      }
    }
  });

  it('can render a composite component', async () => {
    class Component extends React.Component {
      render() {
        return (
          <div className="purple">
            <Child />
          </div>
        );
      }
    }

    const Child = () => {
      return <moo />;
    };

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Component />);
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {className: 'purple'},
      children: [{type: 'moo', props: {}, children: null}],
    });
  });

  it('renders some basics with an update', async () => {
    let renders = 0;

    class Component extends React.Component {
      state = {x: 3};

      render() {
        renders++;
        return (
          <div className="purple">
            {this.state.x}
            <Child />
            <Null />
          </div>
        );
      }

      componentDidMount() {
        this.setState({x: 7});
      }
    }

    const Child = () => {
      renders++;
      return <moo />;
    };

    const Null = () => {
      renders++;
      return null;
    };

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Component />);
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {className: 'purple'},
      children: ['7', {type: 'moo', props: {}, children: null}],
    });
    expect(renders).toBe(6);
  });

  it('exposes the instance', async () => {
    class Mouse extends React.Component {
      constructor() {
        super();
        this.state = {mouse: 'mouse'};
      }
      handleMoose() {
        this.setState({mouse: 'moose'});
      }
      render() {
        return <div>{this.state.mouse}</div>;
      }
    }
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Mouse />);
    });

    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: ['mouse'],
    });

    const mouse = renderer.getInstance();
    await act(() => {
      mouse.handleMoose();
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      children: ['moose'],
      props: {},
    });
  });

  it('updates types', async () => {
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<div>mouse</div>);
    });

    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: ['mouse'],
    });
    await act(() => {
      renderer.update(<span>mice</span>);
    });
    expect(renderer.toJSON()).toEqual({
      type: 'span',
      props: {},
      children: ['mice'],
    });
  });

  it('updates children', async () => {
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(
        <div>
          <span key="a">A</span>
          <span key="b">B</span>
          <span key="c">C</span>
        </div>,
      );
    });

    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: [
        {type: 'span', props: {}, children: ['A']},
        {type: 'span', props: {}, children: ['B']},
        {type: 'span', props: {}, children: ['C']},
      ],
    });

    await act(() => {
      renderer.update(
        <div>
          <span key="d">D</span>
          <span key="c">C</span>
          <span key="b">B</span>
        </div>,
      );
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: [
        {type: 'span', props: {}, children: ['D']},
        {type: 'span', props: {}, children: ['C']},
        {type: 'span', props: {}, children: ['B']},
      ],
    });
  });

  it('does the full lifecycle', async () => {
    const log = [];
    class Log extends React.Component {
      render() {
        log.push('render ' + this.props.name);
        return <div />;
      }
      componentDidMount() {
        log.push('mount ' + this.props.name);
      }
      componentWillUnmount() {
        log.push('unmount ' + this.props.name);
      }
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Log key="foo" name="Foo" />);
    });
    await act(() => {
      renderer.update(<Log key="bar" name="Bar" />);
    });
    await act(() => {
      renderer.unmount();
    });

    expect(log).toEqual([
      'render Foo',
      'mount Foo',
      'render Bar',
      'unmount Foo',
      'mount Bar',
      'unmount Bar',
    ]);
  });

  it('gives a ref to native components', async () => {
    const log = [];
    await act(() => {
      ReactTestRenderer.create(<div ref={r => log.push(r)} />);
    });
    expect(log).toEqual([null]);
  });

  it('allows an optional createNodeMock function', async () => {
    const mockDivInstance = {appendChild: () => {}};
    const mockInputInstance = {focus: () => {}};
    const mockListItemInstance = {click: () => {}};
    const mockAnchorInstance = {hover: () => {}};
    const log = [];
    class Foo extends React.Component {
      barRef = React.createRef();
      componentDidMount() {
        log.push(this.barRef.current);
      }
      render() {
        return <a ref={this.barRef}>Hello, world</a>;
      }
    }
    function createNodeMock(element) {
      switch (element.type) {
        case 'div':
          return mockDivInstance;
        case 'input':
          return mockInputInstance;
        case 'li':
          return mockListItemInstance;
        case 'a':
          return mockAnchorInstance;
        default:
          return {};
      }
    }
    await act(() => {
      ReactTestRenderer.create(<div ref={r => log.push(r)} />, {
        createNodeMock,
      });
    });
    await act(() => {
      ReactTestRenderer.create(<input ref={r => log.push(r)} />, {
        createNodeMock,
      });
    });
    await act(() => {
      ReactTestRenderer.create(
        <div>
          <span>
            <ul>
              <li ref={r => log.push(r)} />
            </ul>
            <ul>
              <li ref={r => log.push(r)} />
              <li ref={r => log.push(r)} />
            </ul>
          </span>
        </div>,
        {createNodeMock, foobar: true},
      );
    });
    await act(() => {
      ReactTestRenderer.create(<Foo />, {createNodeMock});
    });
    await act(() => {
      ReactTestRenderer.create(<div ref={r => log.push(r)} />);
    });
    await act(() => {
      ReactTestRenderer.create(<div ref={r => log.push(r)} />, {});
    });
    expect(log).toEqual([
      mockDivInstance,
      mockInputInstance,
      mockListItemInstance,
      mockListItemInstance,
      mockListItemInstance,
      mockAnchorInstance,
      null,
      null,
    ]);
  });

  it('supports unmounting when using refs', () => {
    class Foo extends React.Component {
      render() {
        return <div ref={React.createRef()} />;
      }
    }
    const inst = ReactTestRenderer.create(<Foo />, {
      createNodeMock: () => 'foo',
    });
    expect(() => inst.unmount()).not.toThrow();
  });

  it('supports unmounting inner instances', async () => {
    let count = 0;
    class Foo extends React.Component {
      componentWillUnmount() {
        count++;
      }
      render() {
        return <div />;
      }
    }
    let inst;
    await act(() => {
      inst = ReactTestRenderer.create(
        <div>
          <Foo />
        </div>,
        {
          createNodeMock: () => 'foo',
        },
      );
    });
    await act(() => {
      inst.unmount();
    });
    expect(count).toEqual(1);
  });

  it('supports updates when using refs', async () => {
    const log = [];
    const createNodeMock = element => {
      log.push(element.type);
      return element.type;
    };
    class Foo extends React.Component {
      render() {
        return this.props.useDiv ? (
          <div ref={React.createRef()} />
        ) : (
          <span ref={React.createRef()} />
        );
      }
    }
    let inst;
    await act(() => {
      inst = ReactTestRenderer.create(<Foo useDiv={true} />, {
        createNodeMock,
      });
    });
    await act(() => {
      inst.update(<Foo useDiv={false} />);
    });
    expect(log).toEqual(['div', 'span']);
  });

  it('supports error boundaries', async () => {
    const log = [];
    class Angry extends React.Component {
      render() {
        log.push('Angry render');
        throw new Error('Please, do not render me.');
      }

      componentDidMount() {
        log.push('Angry componentDidMount');
      }
      componentWillUnmount() {
        log.push('Angry componentWillUnmount');
      }
    }

    class Boundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = {error: false};
      }
      render() {
        log.push('Boundary render');
        if (!this.state.error) {
          return (
            <div>
              <button onClick={this.onClick}>ClickMe</button>
              <Angry />
            </div>
          );
        } else {
          return <div>Happy Birthday!</div>;
        }
      }
      componentDidMount() {
        log.push('Boundary componentDidMount');
      }
      componentWillUnmount() {
        log.push('Boundary componentWillUnmount');
      }
      onClick() {
        /* do nothing */
      }
      componentDidCatch() {
        log.push('Boundary componentDidCatch');
        this.setState({error: true});
      }
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Boundary />, {
        unstable_isConcurrent: true,
      });
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: ['Happy Birthday!'],
    });
    expect(log).toEqual([
      'Boundary render',
      'Angry render',
      'Boundary render',
      'Angry render',
      'Boundary componentDidMount',
      'Boundary componentDidCatch',
      'Boundary render',
    ]);
  });

  it('can update text nodes', async () => {
    class Component extends React.Component {
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Component>Hi</Component>);
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      children: ['Hi'],
      props: {},
    });
    await act(() => {
      renderer.update(<Component>{['Hi', 'Bye']}</Component>);
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      children: ['Hi', 'Bye'],
      props: {},
    });
    await act(() => {
      renderer.update(<Component>Bye</Component>);
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      children: ['Bye'],
      props: {},
    });
    await act(() => {
      renderer.update(<Component>{42}</Component>);
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      children: ['42'],
      props: {},
    });
    await act(() => {
      renderer.update(
        <Component>
          <div />
        </Component>,
      );
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      children: [
        {
          type: 'div',
          children: null,
          props: {},
        },
      ],
      props: {},
    });
  });

  it('toTree() renders simple components returning host components', async () => {
    const Qoo = () => <span className="Qoo">Hello World!</span>;

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Qoo />);
    });
    const tree = renderer.toTree();

    cleanNodeOrArray(tree);

    expect(prettyFormat(tree)).toEqual(
      prettyFormat({
        nodeType: 'component',
        type: Qoo,
        props: {},
        instance: null,
        rendered: {
          nodeType: 'host',
          type: 'span',
          props: {className: 'Qoo'},
          instance: null,
          rendered: ['Hello World!'],
        },
      }),
    );
  });

  it('toTree() handles nested Fragments', async () => {
    const Foo = () => (
      <>
        <>foo</>
      </>
    );
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Foo />);
    });
    const tree = renderer.toTree();

    cleanNodeOrArray(tree);

    expect(prettyFormat(tree)).toEqual(
      prettyFormat({
        nodeType: 'component',
        type: Foo,
        instance: null,
        props: {},
        rendered: 'foo',
      }),
    );
  });

  it('toTree() handles null rendering components', async () => {
    class Foo extends React.Component {
      render() {
        return null;
      }
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Foo />);
    });
    const tree = renderer.toTree();

    expect(tree.instance).toBeInstanceOf(Foo);

    cleanNodeOrArray(tree);

    expect(tree).toEqual({
      type: Foo,
      nodeType: 'component',
      props: {},
      instance: null,
      rendered: null,
    });
  });

  it('toTree() handles simple components that return arrays', async () => {
    const Foo = ({children}) => children;

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(
        <Foo>
          <div>One</div>
          <div>Two</div>
        </Foo>,
      );
    });

    const tree = renderer.toTree();

    cleanNodeOrArray(tree);

    expect(prettyFormat(tree)).toEqual(
      prettyFormat({
        type: Foo,
        nodeType: 'component',
        props: {},
        instance: null,
        rendered: [
          {
            instance: null,
            nodeType: 'host',
            props: {},
            rendered: ['One'],
            type: 'div',
          },
          {
            instance: null,
            nodeType: 'host',
            props: {},
            rendered: ['Two'],
            type: 'div',
          },
        ],
      }),
    );
  });

  it('toTree() handles complicated tree of arrays', async () => {
    class Foo extends React.Component {
      render() {
        return this.props.children;
      }
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(
        <div>
          <Foo>
            <div>One</div>
            <div>Two</div>
            <Foo>
              <div>Three</div>
            </Foo>
          </Foo>
          <div>Four</div>
        </div>,
      );
    });

    const tree = renderer.toTree();

    cleanNodeOrArray(tree);

    expect(prettyFormat(tree)).toEqual(
      prettyFormat({
        type: 'div',
        instance: null,
        nodeType: 'host',
        props: {},
        rendered: [
          {
            type: Foo,
            nodeType: 'component',
            props: {},
            instance: null,
            rendered: [
              {
                type: 'div',
                nodeType: 'host',
                props: {},
                instance: null,
                rendered: ['One'],
              },
              {
                type: 'div',
                nodeType: 'host',
                props: {},
                instance: null,
                rendered: ['Two'],
              },
              {
                type: Foo,
                nodeType: 'component',
                props: {},
                instance: null,
                rendered: {
                  type: 'div',
                  nodeType: 'host',
                  props: {},
                  instance: null,
                  rendered: ['Three'],
                },
              },
            ],
          },
          {
            type: 'div',
            nodeType: 'host',
            props: {},
            instance: null,
            rendered: ['Four'],
          },
        ],
      }),
    );
  });

  it('toTree() handles complicated tree of fragments', async () => {
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(
        <>
          <>
            <div>One</div>
            <div>Two</div>
            <>
              <div>Three</div>
            </>
          </>
          <div>Four</div>
        </>,
      );
    });

    const tree = renderer.toTree();

    cleanNodeOrArray(tree);

    expect(prettyFormat(tree)).toEqual(
      prettyFormat([
        {
          type: 'div',
          nodeType: 'host',
          props: {},
          instance: null,
          rendered: ['One'],
        },
        {
          type: 'div',
          nodeType: 'host',
          props: {},
          instance: null,
          rendered: ['Two'],
        },
        {
          type: 'div',
          nodeType: 'host',
          props: {},
          instance: null,
          rendered: ['Three'],
        },
        {
          type: 'div',
          nodeType: 'host',
          props: {},
          instance: null,
          rendered: ['Four'],
        },
      ]),
    );
  });

  it('root instance and createNodeMock ref return the same value', async () => {
    const createNodeMock = ref => ({node: ref});
    let refInst = null;
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(
        <div ref={ref => (refInst = ref)} />,
        {createNodeMock},
      );
    });

    const root = renderer.getInstance();
    expect(root).toEqual(refInst);
  });

  it('toTree() renders complicated trees of composites and hosts', async () => {
    // SFC returning host. no children props.
    const Qoo = () => <span className="Qoo">Hello World!</span>;

    // SFC returning host. passes through children.
    const Foo = ({className, children}) => (
      <div className={'Foo ' + className}>
        <span className="Foo2">Literal</span>
        {children}
      </div>
    );

    // class composite returning composite. passes through children.
    class Bar extends React.Component {
      render() {
        const {special, children} = this.props;
        return <Foo className={special ? 'special' : 'normal'}>{children}</Foo>;
      }
    }

    // class composite return composite. no children props.
    class Bam extends React.Component {
      render() {
        return (
          <Bar special={true}>
            <Qoo />
          </Bar>
        );
      }
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Bam />);
    });

    const tree = renderer.toTree();

    // we test for the presence of instances before nulling them out
    expect(tree.instance).toBeInstanceOf(Bam);
    expect(tree.rendered.instance).toBeInstanceOf(Bar);

    cleanNodeOrArray(tree);

    expect(prettyFormat(tree)).toEqual(
      prettyFormat({
        type: Bam,
        nodeType: 'component',
        props: {},
        instance: null,
        rendered: {
          type: Bar,
          nodeType: 'component',
          props: {special: true},
          instance: null,
          rendered: {
            type: Foo,
            nodeType: 'component',
            props: {className: 'special'},
            instance: null,
            rendered: {
              type: 'div',
              nodeType: 'host',
              props: {className: 'Foo special'},
              instance: null,
              rendered: [
                {
                  type: 'span',
                  nodeType: 'host',
                  props: {className: 'Foo2'},
                  instance: null,
                  rendered: ['Literal'],
                },
                {
                  type: Qoo,
                  nodeType: 'component',
                  props: {},
                  instance: null,
                  rendered: {
                    type: 'span',
                    nodeType: 'host',
                    props: {className: 'Qoo'},
                    instance: null,
                    rendered: ['Hello World!'],
                  },
                },
              ],
            },
          },
        },
      }),
    );
  });

  it('can update text nodes when rendered as root', async () => {
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(['Hello', 'world']);
    });
    expect(renderer.toJSON()).toEqual(['Hello', 'world']);
    await act(() => {
      renderer.update(42);
    });
    expect(renderer.toJSON()).toEqual('42');
    await act(() => {
      renderer.update([42, 'world']);
    });
    expect(renderer.toJSON()).toEqual(['42', 'world']);
  });

  it('can render and update root fragments', async () => {
    const Component = props => props.children;

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create([
        <Component key="a">Hi</Component>,
        <Component key="b">Bye</Component>,
      ]);
    });

    expect(renderer.toJSON()).toEqual(['Hi', 'Bye']);
    await act(() => {
      renderer.update(<div />);
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      children: null,
      props: {},
    });
    await act(() => {
      renderer.update([<div key="a">goodbye</div>, 'world']);
    });
    expect(renderer.toJSON()).toEqual([
      {
        type: 'div',
        children: ['goodbye'],
        props: {},
      },
      'world',
    ]);
  });

  it('supports context providers and consumers', async () => {
    const {Consumer, Provider} = React.createContext('a');

    function Child(props) {
      return props.value;
    }

    function App() {
      return (
        <Provider value="b">
          <Consumer>{value => <Child value={value} />}</Consumer>
        </Provider>
      );
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    const child = renderer.root.findByType(Child);
    expect(child.children).toEqual(['b']);
    expect(prettyFormat(renderer.toTree())).toEqual(
      prettyFormat({
        instance: null,
        nodeType: 'component',
        props: {},
        rendered: {
          instance: null,
          nodeType: 'component',
          props: {
            value: 'b',
          },
          rendered: 'b',
          type: Child,
        },
        type: App,
      }),
    );
  });

  it('supports modes', async () => {
    function Child(props) {
      return props.value;
    }

    function App(props) {
      return (
        <React.StrictMode>
          <Child value={props.value} />
        </React.StrictMode>
      );
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<App value="a" />);
    });
    const child = renderer.root.findByType(Child);
    expect(child.children).toEqual(['a']);
    expect(prettyFormat(renderer.toTree())).toEqual(
      prettyFormat({
        instance: null,
        nodeType: 'component',
        props: {
          value: 'a',
        },
        rendered: {
          instance: null,
          nodeType: 'component',
          props: {
            value: 'a',
          },
          rendered: 'a',
          type: Child,
        },
        type: App,
      }),
    );
  });

  it('supports forwardRef', async () => {
    const InnerRefed = React.forwardRef((props, ref) => (
      <div>
        <span ref={ref} />
      </div>
    ));

    let refFn;

    class App extends React.Component {
      render() {
        refFn = inst => {
          this.ref = inst;
        };
        return <InnerRefed ref={refFn} />;
      }
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    const tree = renderer.toTree();
    cleanNodeOrArray(tree);

    expect(prettyFormat(tree)).toEqual(
      prettyFormat({
        instance: null,
        nodeType: 'component',
        props: {},
        rendered: {
          instance: null,
          nodeType: 'host',
          props: {},
          rendered: [
            {
              instance: null,
              nodeType: 'host',
              props: {
                ref: refFn,
              },
              rendered: [],
              type: 'span',
            },
          ],
          type: 'div',
        },
        type: App,
      }),
    );
  });

  it('can concurrently render context with a "primary" renderer', async () => {
    const Context = React.createContext(null);
    const Indirection = React.Fragment;
    const App = () => (
      <Context.Provider value={null}>
        <Indirection>
          <Context.Consumer>{() => null}</Context.Consumer>
        </Indirection>
      </Context.Provider>
    );
    ReactNoop.render(<App />);
    await waitForAll([]);
    await act(() => {
      ReactTestRenderer.create(<App />);
    });
  });

  it('calling findByType() with an invalid component will fall back to "Unknown" for component name', async () => {
    const App = () => null;
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    const NonComponent = {};

    expect(() => {
      renderer.root.findByType(NonComponent);
    }).toThrowError(`No instances found with node type: "Unknown"`);
  });
});
