/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const {COMMENT_NODE} = require('react-dom-bindings/src/client/HTMLNodeType');

let React;
let ReactDOM;
let ReactDOMClient;
let waitForAll;
let assertConsoleErrorDev;

describe('ReactMount', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
  });

  describe('unmountComponentAtNode', () => {
    // @gate !disableLegacyMode
    it('throws when given a non-node', () => {
      const nodeArray = document.getElementsByTagName('div');
      expect(() => {
        ReactDOM.unmountComponentAtNode(nodeArray);
      }).toThrowError('Target container is not a DOM element.');
    });

    // @gate !disableLegacyMode
    it('returns false on non-React containers', () => {
      const d = document.createElement('div');
      d.innerHTML = '<b>hellooo</b>';
      expect(ReactDOM.unmountComponentAtNode(d)).toBe(false);
      expect(d.textContent).toBe('hellooo');
    });

    // @gate !disableLegacyMode
    it('returns true on React containers', () => {
      const d = document.createElement('div');
      ReactDOM.render(<b>hellooo</b>, d);
      expect(d.textContent).toBe('hellooo');
      expect(ReactDOM.unmountComponentAtNode(d)).toBe(true);
      expect(d.textContent).toBe('');
    });
  });

  // @gate !disableLegacyMode
  it('warns when given a factory', () => {
    class Component extends React.Component {
      render() {
        return <div />;
      }
    }

    const container = document.createElement('div');
    ReactDOM.render(Component, container);
    assertConsoleErrorDev([
      'Functions are not valid as a React child. ' +
        'This may happen if you return Component instead of <Component /> from render. ' +
        'Or maybe you meant to call this function rather than return it.\n' +
        '  root.render(Component)',
    ]);
  });

  // @gate !disableLegacyMode
  it('should render different components in same root', () => {
    const container = document.createElement('container');
    document.body.appendChild(container);

    ReactDOM.render(<div />, container);
    expect(container.firstChild.nodeName).toBe('DIV');

    ReactDOM.render(<span />, container);
    expect(container.firstChild.nodeName).toBe('SPAN');
  });

  // @gate !disableLegacyMode
  it('should unmount and remount if the key changes', () => {
    const container = document.createElement('container');

    const mockMount = jest.fn();
    const mockUnmount = jest.fn();

    class Component extends React.Component {
      componentDidMount = mockMount;
      componentWillUnmount = mockUnmount;
      render() {
        return <span>{this.props.text}</span>;
      }
    }

    expect(mockMount).toHaveBeenCalledTimes(0);
    expect(mockUnmount).toHaveBeenCalledTimes(0);

    ReactDOM.render(<Component text="orange" key="A" />, container);
    expect(container.firstChild.innerHTML).toBe('orange');
    expect(mockMount).toHaveBeenCalledTimes(1);
    expect(mockUnmount).toHaveBeenCalledTimes(0);

    // If we change the key, the component is unmounted and remounted
    ReactDOM.render(<Component text="green" key="B" />, container);
    expect(container.firstChild.innerHTML).toBe('green');
    expect(mockMount).toHaveBeenCalledTimes(2);
    expect(mockUnmount).toHaveBeenCalledTimes(1);

    // But if we don't change the key, the component instance is reused
    ReactDOM.render(<Component text="blue" key="B" />, container);
    expect(container.firstChild.innerHTML).toBe('blue');
    expect(mockMount).toHaveBeenCalledTimes(2);
    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });

  // @gate !disableLegacyMode
  it('should reuse markup if rendering to the same target twice', () => {
    const container = document.createElement('container');
    const instance1 = ReactDOM.render(<div />, container);
    const instance2 = ReactDOM.render(<div />, container);

    expect(instance1 === instance2).toBe(true);
  });

  // @gate !disableLegacyMode
  it('should not warn if mounting into non-empty node', () => {
    const container = document.createElement('container');
    container.innerHTML = '<div></div>';

    ReactDOM.render(<div />, container);
  });

  // @gate !disableLegacyMode
  it('should warn when mounting into document.body', () => {
    const iFrame = document.createElement('iframe');
    document.body.appendChild(iFrame);

    // HostSingletons make the warning for document.body unecessary
    ReactDOM.render(<div />, iFrame.contentDocument.body);
  });

  // @gate !disableLegacyMode
  it('should warn if render removes React-rendered children', () => {
    const container = document.createElement('container');

    class Component extends React.Component {
      render() {
        return (
          <div>
            <div />
          </div>
        );
      }
    }

    ReactDOM.render(<Component />, container);

    // Test that blasting away children throws a warning
    const rootNode = container.firstChild;

    ReactDOM.render(<span />, rootNode);
    assertConsoleErrorDev([
      'Replacing React-rendered children with a new ' +
        'root component. If you intended to update the children of this node, ' +
        'you should instead have the existing children update their state and ' +
        'render the new components instead of calling ReactDOM.render.',
    ]);
  });

  // @gate !disableLegacyMode
  it('should warn if the unmounted node was rendered by another copy of React', () => {
    jest.resetModules();
    const ReactDOMOther = require('react-dom');
    const container = document.createElement('div');

    class Component extends React.Component {
      render() {
        return (
          <div>
            <div />
          </div>
        );
      }
    }

    ReactDOM.render(<Component />, container);
    // Make sure ReactDOM and ReactDOMOther are different copies
    expect(ReactDOM).not.toEqual(ReactDOMOther);

    ReactDOMOther.unmountComponentAtNode(container);
    assertConsoleErrorDev([
      "unmountComponentAtNode(): The node you're attempting to unmount " +
        'was rendered by another copy of React.',
    ]);

    // Don't throw a warning if the correct React copy unmounts the node
    ReactDOM.unmountComponentAtNode(container);
  });

  // @gate !disableLegacyMode
  it('passes the correct callback context', () => {
    const container = document.createElement('div');
    let calls = 0;

    ReactDOM.render(<div />, container, function () {
      expect(this.nodeName).toBe('DIV');
      calls++;
    });

    // Update, no type change
    ReactDOM.render(<div />, container, function () {
      expect(this.nodeName).toBe('DIV');
      calls++;
    });

    // Update, type change
    ReactDOM.render(<span />, container, function () {
      expect(this.nodeName).toBe('SPAN');
      calls++;
    });

    // Batched update, no type change
    ReactDOM.unstable_batchedUpdates(function () {
      ReactDOM.render(<span />, container, function () {
        expect(this.nodeName).toBe('SPAN');
        calls++;
      });
    });

    // Batched update, type change
    ReactDOM.unstable_batchedUpdates(function () {
      ReactDOM.render(<article />, container, function () {
        expect(this.nodeName).toBe('ARTICLE');
        calls++;
      });
    });

    expect(calls).toBe(5);
  });

  // @gate !disableLegacyMode && classic
  it('initial mount of legacy root is sync inside batchedUpdates, as if it were wrapped in flushSync', () => {
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');

    class Foo extends React.Component {
      state = {active: false};
      componentDidMount() {
        this.setState({active: true});
      }
      render() {
        return (
          <div>{this.props.children + (this.state.active ? '!' : '')}</div>
        );
      }
    }

    ReactDOM.render(<div>1</div>, container1);

    ReactDOM.unstable_batchedUpdates(() => {
      // Update. Does not flush yet.
      ReactDOM.render(<div>2</div>, container1);
      expect(container1.textContent).toEqual('1');

      // Initial mount on another root. Should flush immediately.
      ReactDOM.render(<Foo>a</Foo>, container2);
      // The earlier update also flushed, since flushSync flushes all pending
      // sync work across all roots.
      expect(container1.textContent).toEqual('2');
      // Layout updates are also flushed synchronously
      expect(container2.textContent).toEqual('a!');
    });
    expect(container1.textContent).toEqual('2');
    expect(container2.textContent).toEqual('a!');
  });

  describe('mount point is a comment node', () => {
    let containerDiv;
    let mountPoint;

    beforeEach(() => {
      containerDiv = document.createElement('div');
      containerDiv.innerHTML = 'A<!-- react-mount-point-unstable -->B';
      mountPoint = containerDiv.childNodes[1];
      expect(mountPoint.nodeType).toBe(COMMENT_NODE);
    });

    // @gate !disableLegacyMode
    it('renders at a comment node', () => {
      function Char(props) {
        return props.children;
      }
      function list(chars) {
        return chars.split('').map(c => <Char key={c}>{c}</Char>);
      }

      ReactDOM.render(list('aeiou'), mountPoint);
      expect(containerDiv.innerHTML).toBe(
        'Aaeiou<!-- react-mount-point-unstable -->B',
      );

      ReactDOM.render(list('yea'), mountPoint);
      expect(containerDiv.innerHTML).toBe(
        'Ayea<!-- react-mount-point-unstable -->B',
      );

      ReactDOM.render(list(''), mountPoint);
      expect(containerDiv.innerHTML).toBe(
        'A<!-- react-mount-point-unstable -->B',
      );
    });
  });

  // @gate !disableLegacyMode
  it('clears existing children with legacy API', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<div>a</div><div>b</div>';
    ReactDOM.render(
      <div>
        <span>c</span>
        <span>d</span>
      </div>,
      container,
    );
    expect(container.textContent).toEqual('cd');
    ReactDOM.render(
      <div>
        <span>d</span>
        <span>c</span>
      </div>,
      container,
    );
    await waitForAll([]);
    expect(container.textContent).toEqual('dc');
  });

  // @gate !disableLegacyMode
  it('warns when rendering with legacy API into createRoot() container', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    root.render(<div>Hi</div>);
    await waitForAll([]);
    expect(container.textContent).toEqual('Hi');
    ReactDOM.render(<div>Bye</div>, container);
    assertConsoleErrorDev([
      // We care about this warning:
      'You are calling ReactDOM.render() on a container that was previously ' +
        'passed to ReactDOMClient.createRoot(). This is not supported. ' +
        'Did you mean to call root.render(element)?',
      // This is more of a symptom but restructuring the code to avoid it isn't worth it:
      'Replacing React-rendered children with a new root component. ' +
        'If you intended to update the children of this node, ' +
        'you should instead have the existing children update their state ' +
        'and render the new components instead of calling ReactDOM.render.',
    ]);
    await waitForAll([]);
    // This works now but we could disallow it:
    expect(container.textContent).toEqual('Bye');
  });

  // @gate !disableLegacyMode
  it('warns when unmounting with legacy API (no previous content)', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    root.render(<div>Hi</div>);
    await waitForAll([]);
    expect(container.textContent).toEqual('Hi');
    const unmounted = ReactDOM.unmountComponentAtNode(container);
    assertConsoleErrorDev([
      // We care about this warning:
      'You are calling ReactDOM.unmountComponentAtNode() on a container that was previously ' +
        'passed to ReactDOMClient.createRoot(). This is not supported. Did you mean to call root.unmount()?',
      // This is more of a symptom but restructuring the code to avoid it isn't worth it:
      'unmountComponentAtNode(): ' +
        "The node you're attempting to unmount was rendered by React and is not a top-level container. " +
        'Instead, have the parent component update its state and rerender in order to remove this component.',
    ]);
    expect(unmounted).toBe(false);
    await waitForAll([]);
    expect(container.textContent).toEqual('Hi');
    root.unmount();
    await waitForAll([]);
    expect(container.textContent).toEqual('');
  });

  // @gate !disableLegacyMode
  it('warns when unmounting with legacy API (has previous content)', async () => {
    const container = document.createElement('div');
    // Currently createRoot().render() doesn't clear this.
    container.appendChild(document.createElement('div'));
    // The rest is the same as test above.
    const root = ReactDOMClient.createRoot(container);
    root.render(<div>Hi</div>);
    await waitForAll([]);
    expect(container.textContent).toEqual('Hi');
    const unmounted = ReactDOM.unmountComponentAtNode(container);
    assertConsoleErrorDev([
      'You are calling ReactDOM.unmountComponentAtNode() on a container ' +
        'that was previously passed to ReactDOMClient.createRoot(). ' +
        'This is not supported. Did you mean to call root.unmount()?',
      // This is more of a symptom but restructuring the code to avoid it isn't worth it:
      'unmountComponentAtNode(): ' +
        "The node you're attempting to unmount was rendered by React and is not a top-level container. " +
        'Instead, have the parent component update its state and rerender in order to remove this component.',
    ]);
    expect(unmounted).toBe(false);
    await waitForAll([]);
    expect(container.textContent).toEqual('Hi');
    root.unmount();
    await waitForAll([]);
    expect(container.textContent).toEqual('');
  });

  // @gate !disableLegacyMode
  it('warns when passing legacy container to createRoot()', () => {
    const container = document.createElement('div');
    ReactDOM.render(<div>Hi</div>, container);
    ReactDOMClient.createRoot(container);
    assertConsoleErrorDev([
      'You are calling ReactDOMClient.createRoot() on a container that was previously ' +
        'passed to ReactDOM.render(). This is not supported.',
    ]);
  });
});
