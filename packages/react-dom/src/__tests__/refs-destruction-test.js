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
let TestComponent;
let act;
let theInnerDivRef;
let theInnerClassComponentRef;

describe('refs-destruction', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    class ClassComponent extends React.Component {
      render() {
        return null;
      }
    }

    TestComponent = class extends React.Component {
      constructor(props) {
        super(props);
        theInnerDivRef = React.createRef();
        theInnerClassComponentRef = React.createRef();
      }

      render() {
        if (this.props.destroy) {
          return <div />;
        } else if (this.props.removeRef) {
          return (
            <div>
              <div />
              <ClassComponent />
            </div>
          );
        } else {
          return (
            <div>
              <div ref={theInnerDivRef} />
              <ClassComponent ref={theInnerClassComponentRef} />
            </div>
          );
        }
      }
    };
  });

  afterEach(() => {
    theInnerClassComponentRef = null;
    theInnerDivRef = null;
  });

  it('should remove refs when destroying the parent', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<TestComponent />);
    });

    expect(theInnerDivRef.current).toBeInstanceOf(Element);
    expect(theInnerClassComponentRef.current).toBeTruthy();

    root.unmount();

    expect(theInnerDivRef.current).toBe(null);
    expect(theInnerClassComponentRef.current).toBe(null);
  });

  it('should remove refs when destroying the child', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<TestComponent />);
    });

    expect(theInnerDivRef.current).toBeInstanceOf(Element);
    expect(theInnerClassComponentRef.current).toBeTruthy();

    await act(async () => {
      root.render(<TestComponent destroy={true} />);
    });

    expect(theInnerDivRef.current).toBe(null);
    expect(theInnerClassComponentRef.current).toBe(null);
  });

  it('should remove refs when removing the child ref attribute', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<TestComponent />);
    });

    expect(theInnerDivRef.current).toBeInstanceOf(Element);
    expect(theInnerClassComponentRef.current).toBeTruthy();

    await act(async () => {
      root.render(<TestComponent removeRef={true} />);
    });

    expect(theInnerDivRef.current).toBe(null);
    expect(theInnerClassComponentRef.current).toBe(null);
  });

  it('should not error when destroying child with ref asynchronously', async () => {
    let nestedRoot;
    class Modal extends React.Component {
      componentDidMount() {
        this.div = document.createElement('div');
        nestedRoot = ReactDOMClient.createRoot(this.div);
        document.body.appendChild(this.div);
        this.componentDidUpdate();
      }

      componentDidUpdate() {
        setTimeout(() => {
          ReactDOM.flushSync(() => {
            nestedRoot.render(<div>{this.props.children}</div>);
          });
        }, 0);
      }

      componentWillUnmount() {
        const self = this;
        // some async animation
        setTimeout(function () {
          expect(function () {
            nestedRoot.unmount();
          }).not.toThrow();
          document.body.removeChild(self.div);
        }, 0);
      }

      render() {
        return null;
      }
    }

    class AppModal extends React.Component {
      render() {
        return (
          <Modal>
            <a ref={React.createRef()} />
          </Modal>
        );
      }
    }

    class App extends React.Component {
      render() {
        return this.props.hidden ? null : <AppModal onClose={this.close} />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
    });
    await act(async () => {
      root.render(<App hidden={true} />);
    });
  });
});
