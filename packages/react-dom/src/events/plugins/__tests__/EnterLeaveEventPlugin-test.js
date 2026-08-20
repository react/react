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
let ReactDOMClient;
let act;

describe('EnterLeaveEventPlugin', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    // The container has to be attached for events to fire.
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('should set onMouseLeave relatedTarget properly in iframe', async () => {
    const iframe = document.createElement('iframe');
    container.appendChild(iframe);
    const iframeDocument = iframe.contentDocument;
    iframeDocument.write(
      '<!DOCTYPE html><html><head></head><body><div></div></body></html>',
    );
    iframeDocument.close();

    const leaveEvents = [];
    const root = ReactDOMClient.createRoot(
      iframeDocument.body.getElementsByTagName('div')[0],
    );
    await act(() => {
      root.render(
        <div
          onMouseLeave={e => {
            e.persist();
            leaveEvents.push(e);
          }}
        />,
      );
    });
    const node = iframeDocument.body.getElementsByTagName('div')[0].firstChild;
    await act(() => {
      node.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          cancelable: true,
          relatedTarget: iframe.contentWindow,
        }),
      );
    });

    expect(leaveEvents.length).toBe(1);
    expect(leaveEvents[0].target).toBe(node);
    expect(leaveEvents[0].relatedTarget).toBe(iframe.contentWindow);
  });

  it('should set onMouseEnter relatedTarget properly in iframe', async () => {
    const iframe = document.createElement('iframe');
    container.appendChild(iframe);
    const iframeDocument = iframe.contentDocument;
    iframeDocument.write(
      '<!DOCTYPE html><html><head></head><body><div></div></body></html>',
    );
    iframeDocument.close();

    const enterEvents = [];
    const root = ReactDOMClient.createRoot(
      iframeDocument.body.getElementsByTagName('div')[0],
    );
    await act(() => {
      root.render(
        <div
          onMouseEnter={e => {
            e.persist();
            enterEvents.push(e);
          }}
        />,
      );
    });
    const node = iframeDocument.body.getElementsByTagName('div')[0].firstChild;
    await act(() => {
      node.dispatchEvent(
        new MouseEvent('mouseover', {
          bubbles: true,
          cancelable: true,
          relatedTarget: null,
        }),
      );
    });

    expect(enterEvents.length).toBe(1);
    expect(enterEvents[0].target).toBe(node);
    expect(enterEvents[0].relatedTarget).toBe(iframe.contentWindow);
  });

  // Regression test for https://github.com/facebook/react/issues/10906.
  it('should find the common parent after updates', async () => {
    let parentEnterCalls = 0;
    let childEnterCalls = 0;
    let parent = null;

    class Parent extends React.Component {
      render() {
        return (
          <div
            onMouseEnter={() => parentEnterCalls++}
            ref={node => (parent = node)}>
            {this.props.showChild && (
              <div onMouseEnter={() => childEnterCalls++} />
            )}
          </div>
        );
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
    await act(() => {
      root.render(<Parent showChild={true} />);
    });

    // Enter from parent into the child.
    await act(() => {
      parent.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          cancelable: true,
          relatedTarget: parent.firstChild,
        }),
      );
    });

    // Entering a child should fire on the child, not on the parent.
    expect(childEnterCalls).toBe(1);
    expect(parentEnterCalls).toBe(0);
  });

  // Test for https://github.com/facebook/react/issues/16763.
  // @gate !disableLegacyMode
  it('should call mouseEnter once from sibling rendered inside a rendered component in legacy roots', async () => {
    const mockFn = jest.fn();

    class Parent extends React.Component {
      constructor(props) {
        super(props);
        this.parentEl = React.createRef();
      }

      componentDidMount() {
        ReactDOM.render(<MouseEnterDetect />, this.parentEl.current);
      }

      render() {
        return <div ref={this.parentEl} />;
      }
    }

    class MouseEnterDetect extends React.Component {
      constructor(props) {
        super(props);
        this.firstEl = React.createRef();
        this.siblingEl = React.createRef();
      }

      componentDidMount() {
        this.siblingEl.current.dispatchEvent(
          new MouseEvent('mouseout', {
            bubbles: true,
            cancelable: true,
            relatedTarget: this.firstEl.current,
          }),
        );
      }

      render() {
        return (
          <React.Fragment>
            <div ref={this.firstEl} onMouseEnter={mockFn} />
            <div ref={this.siblingEl} />
          </React.Fragment>
        );
      }
    }

    await act(() => {
      ReactDOM.render(<Parent />, container);
    });
    expect(mockFn.mock.calls.length).toBe(1);
  });

  // @gate !disableLegacyMode
  it('should call mouseEnter when pressing a non tracked React node in legacy root', async () => {
    const mockFn = jest.fn();

    class Parent extends React.Component {
      constructor(props) {
        super(props);
        this.parentEl = React.createRef();
      }

      componentDidMount() {
        ReactDOM.render(<MouseEnterDetect />, this.parentEl.current);
      }

      render() {
        return <div ref={this.parentEl} />;
      }
    }

    class MouseEnterDetect extends React.Component {
      constructor(props) {
        super(props);
        this.divRef = React.createRef();
        this.siblingEl = React.createRef();
      }

      componentDidMount() {
        const attachedNode = document.createElement('div');
        this.divRef.current.appendChild(attachedNode);
        attachedNode.dispatchEvent(
          new MouseEvent('mouseout', {
            bubbles: true,
            cancelable: true,
            relatedTarget: this.siblingEl.current,
          }),
        );
      }

      render() {
        return (
          <div ref={this.divRef}>
            <div ref={this.siblingEl} onMouseEnter={mockFn} />
          </div>
        );
      }
    }

    await act(() => {
      ReactDOM.render(<Parent />, container);
    });
    expect(mockFn.mock.calls.length).toBe(1);
  });

  it('should work with portals outside of the root that has onMouseLeave', async () => {
    const divRef = React.createRef();
    const onMouseLeave = jest.fn();

    function Component() {
      return (
        <div onMouseLeave={onMouseLeave}>
          {ReactDOM.createPortal(<div ref={divRef} />, document.body)}
        </div>
      );
    }

    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component />);
    });

    // Leave from the portal div
    await act(() => {
      divRef.current.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          cancelable: true,
          relatedTarget: document.body,
        }),
      );
    });

    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });

  it('should work with portals that have onMouseEnter outside of the root', async () => {
    const divRef = React.createRef();
    const otherDivRef = React.createRef();
    const onMouseEnter = jest.fn();

    function Component() {
      return (
        <div ref={divRef}>
          {ReactDOM.createPortal(
            <div ref={otherDivRef} onMouseEnter={onMouseEnter} />,
            document.body,
          )}
        </div>
      );
    }

    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component />);
    });

    // Leave from the portal div
    divRef.current.dispatchEvent(
      new MouseEvent('mouseout', {
        bubbles: true,
        cancelable: true,
        relatedTarget: otherDivRef.current,
      }),
    );

    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });
});
