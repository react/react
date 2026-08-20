/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOMEventListener', () => {
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let ReactDOMServer;
  let act;
  let simulateEventDispatch;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
    simulateEventDispatch =
      require('internal-test-utils').simulateEventDispatch;
  });

  describe('Propagation', () => {
    it('should propagate events one level down', async () => {
      const mouseOut = jest.fn();
      const onMouseOut = event => mouseOut(event.currentTarget);

      const childContainer = document.createElement('div');
      const parentContainer = document.createElement('div');

      const childRoot = ReactDOMClient.createRoot(childContainer);
      const parentRoot = ReactDOMClient.createRoot(parentContainer);

      await act(() => {
        childRoot.render(<div onMouseOut={onMouseOut}>Child</div>);
        parentRoot.render(<div onMouseOut={onMouseOut}>Parent</div>);
      });
      const parentNode = parentContainer.firstChild;
      const childNode = childContainer.firstChild;

      parentNode.appendChild(childContainer);
      document.body.appendChild(parentContainer);

      try {
        const nativeEvent = document.createEvent('Event');
        nativeEvent.initEvent('mouseout', true, true);
        childNode.dispatchEvent(nativeEvent);

        expect(mouseOut).toHaveBeenCalledTimes(2);
        expect(mouseOut).toHaveBeenNthCalledWith(1, childNode);
        expect(mouseOut).toHaveBeenNthCalledWith(2, parentNode);
      } finally {
        document.body.removeChild(parentContainer);
      }
    });

    it('should propagate events two levels down', async () => {
      const mouseOut = jest.fn();
      const onMouseOut = event => mouseOut(event.currentTarget);

      const childContainer = document.createElement('div');
      const parentContainer = document.createElement('div');
      const grandParentContainer = document.createElement('div');

      const childRoot = ReactDOMClient.createRoot(childContainer);
      const parentRoot = ReactDOMClient.createRoot(parentContainer);
      const grandParentRoot = ReactDOMClient.createRoot(grandParentContainer);

      await act(() => {
        childRoot.render(<div onMouseOut={onMouseOut}>Child</div>);
        parentRoot.render(<div onMouseOut={onMouseOut}>Parent</div>);
        grandParentRoot.render(<div onMouseOut={onMouseOut}>Grandparent</div>);
      });
      const childNode = childContainer.firstChild;
      const parentNode = parentContainer.firstChild;
      const grandParentNode = grandParentContainer.firstChild;

      parentNode.appendChild(childContainer);
      grandParentNode.appendChild(parentContainer);

      document.body.appendChild(grandParentContainer);

      try {
        const nativeEvent = document.createEvent('Event');
        nativeEvent.initEvent('mouseout', true, true);
        childNode.dispatchEvent(nativeEvent);

        expect(mouseOut).toHaveBeenCalledTimes(3);
        expect(mouseOut).toHaveBeenNthCalledWith(1, childNode);
        expect(mouseOut).toHaveBeenNthCalledWith(2, parentNode);
        expect(mouseOut).toHaveBeenNthCalledWith(3, grandParentNode);
      } finally {
        document.body.removeChild(grandParentContainer);
      }
    });

    // Regression test for https://github.com/facebook/react/issues/1105
    it('should not get confused by disappearing elements', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      try {
        class MyComponent extends React.Component {
          state = {clicked: false};
          handleClick = () => {
            this.setState({clicked: true});
          };
          componentDidMount() {
            expect(
              ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.findDOMNode(
                this,
              ),
            ).toBe(container.firstChild);
          }
          componentDidUpdate() {
            expect(
              ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.findDOMNode(
                this,
              ),
            ).toBe(container.firstChild);
          }
          render() {
            if (this.state.clicked) {
              return <span>clicked!</span>;
            } else {
              return (
                <button onClick={this.handleClick}>not yet clicked</button>
              );
            }
          }
        }
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<MyComponent />);
        });
        await act(() => {
          container.firstChild.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
            }),
          );
        });
        expect(container.firstChild.textContent).toBe('clicked!');
      } finally {
        document.body.removeChild(container);
      }
    });

    it('should batch between handlers from different roots (discrete)', async () => {
      const mock = jest.fn();

      const childContainer = document.createElement('div');
      const parentContainer = document.createElement('main');

      const childRoot = ReactDOMClient.createRoot(childContainer);
      const parentRoot = ReactDOMClient.createRoot(parentContainer);
      let childSetState;

      function Parent() {
        // eslint-disable-next-line no-unused-vars
        const [state, _] = React.useState('Parent');
        const handleClick = () => {
          childSetState(2);
          mock(childContainer.firstChild.textContent);
        };
        return <section onClick={handleClick}>{state}</section>;
      }

      function Child() {
        const [state, setState] = React.useState('Child');
        childSetState = setState;
        const handleClick = () => {
          setState(1);
          mock(childContainer.firstChild.textContent);
        };
        return <span onClick={handleClick}>{state}</span>;
      }

      await act(() => {
        childRoot.render(<Child />);
        parentRoot.render(<Parent />);
      });

      const childNode = childContainer.firstChild;
      const parentNode = parentContainer.firstChild;

      parentNode.appendChild(childContainer);
      document.body.appendChild(parentContainer);

      try {
        await act(async () => {
          await simulateEventDispatch(childNode, 'click');
        });

        // Child and parent should both call from event handlers.
        expect(mock).toHaveBeenCalledTimes(2);
        // The first call schedules a render of '1' into the 'Child'.
        // However, we're batching so it isn't flushed yet.
        expect(mock.mock.calls[0][0]).toBe('Child');
        // As we have two roots, it means we have two event listeners.
        // This also means we enter the event batching phase twice,
        // flushing the child to be 1.

        // We don't have any good way of knowing if another event will
        // occur because another event handler might invoke
        // stopPropagation() along the way. After discussions internally
        // with Sebastian, it seems that for now over-flushing should
        // be fine, especially as the new event system is a breaking
        // change anyway. We can maybe revisit this later as part of
        // the work to refine this in the scheduler (maybe by leveraging
        // isInputPending?).
        //
        // Since this is a discrete event, the previous update is already done.
        expect(mock.mock.calls[1][0]).toBe('1');

        // And by the time we leave the handler, the second update is flushed.
        expect(childNode.textContent).toBe('2');
      } finally {
        document.body.removeChild(parentContainer);
      }
    });

    it('should batch between handlers from different roots (continuous)', async () => {
      const mock = jest.fn();

      const childContainer = document.createElement('div');
      const parentContainer = document.createElement('main');

      const childRoot = ReactDOMClient.createRoot(childContainer);
      const parentRoot = ReactDOMClient.createRoot(parentContainer);
      let childSetState;

      function Parent() {
        // eslint-disable-next-line no-unused-vars
        const [state, _] = React.useState('Parent');
        const handleMouseOut = () => {
          childSetState(2);
          mock(childContainer.firstChild.textContent);
        };
        return <section onMouseOut={handleMouseOut}>{state}</section>;
      }

      function Child() {
        const [state, setState] = React.useState('Child');
        childSetState = setState;
        const handleMouseOut = () => {
          setState(1);
          mock(childContainer.firstChild.textContent);
        };
        return <span onMouseOut={handleMouseOut}>{state}</span>;
      }

      await act(() => {
        childRoot.render(<Child />);
        parentRoot.render(<Parent />);
      });

      const childNode = childContainer.firstChild;
      const parentNode = parentContainer.firstChild;

      parentNode.appendChild(childContainer);
      document.body.appendChild(parentContainer);

      try {
        await act(async () => {
          await simulateEventDispatch(childNode, 'mouseout');
        });

        // Child and parent should both call from event handlers.
        expect(mock).toHaveBeenCalledTimes(2);
        // The first call schedules a render of '1' into the 'Child'.
        // However, we're batching, so it isn't flushed yet.
        expect(mock.mock.calls[0][0]).toBe('Child');
        // As we have two roots, it means we have two event listeners.
        // This also means we enter the event batching phase twice.
        // But since this is a continuous event, we still haven't flushed.
        expect(mock.mock.calls[1][0]).toBe('Child');

        // The batched update is applied after the events.
        expect(childNode.textContent).toBe('2');
      } finally {
        document.body.removeChild(parentContainer);
      }
    });
  });

  it('should not fire duplicate events for a React DOM tree', async () => {
    const mouseOut = jest.fn();
    const onMouseOut = event => mouseOut(event.target);

    const innerRef = React.createRef();
    class Wrapper extends React.Component {
      render() {
        return (
          <div>
            <div onMouseOut={onMouseOut} id="outer">
              <div ref={innerRef}>Inner</div>
            </div>
          </div>
        );
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Wrapper />);
    });

    document.body.appendChild(container);

    try {
      const nativeEvent = document.createEvent('Event');
      nativeEvent.initEvent('mouseout', true, true);
      await act(() => {
        innerRef.current.dispatchEvent(nativeEvent);
      });

      expect(mouseOut).toBeCalledWith(innerRef.current);
    } finally {
      document.body.removeChild(container);
    }
  });

  // Regression test for https://github.com/facebook/react/pull/12877
  it('should not fire form events twice', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const formRef = React.createRef();
    const inputRef = React.createRef();

    const handleInvalid = jest.fn();
    const handleReset = jest.fn();
    const handleSubmit = jest.fn();

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <form ref={formRef} onReset={handleReset} onSubmit={handleSubmit}>
          <input ref={inputRef} onInvalid={handleInvalid} />
        </form>,
      );
    });

    await act(() => {
      inputRef.current.dispatchEvent(
        new Event('invalid', {
          // https://developer.mozilla.org/en-US/docs/Web/Events/invalid
          bubbles: false,
        }),
      );
    });
    expect(handleInvalid).toHaveBeenCalledTimes(1);

    await act(() => {
      formRef.current.dispatchEvent(
        new Event('reset', {
          // https://developer.mozilla.org/en-US/docs/Web/Events/reset
          bubbles: true,
        }),
      );
    });
    expect(handleReset).toHaveBeenCalledTimes(1);

    await act(() => {
      formRef.current.dispatchEvent(
        new Event('submit', {
          // https://developer.mozilla.org/en-US/docs/Web/Events/submit
          bubbles: true,
        }),
      );
    });
    expect(handleSubmit).toHaveBeenCalledTimes(1);

    await act(() => {
      formRef.current.dispatchEvent(
        new Event('submit', {
          // Might happen on older browsers.
          bubbles: true,
        }),
      );
    });
    expect(handleSubmit).toHaveBeenCalledTimes(2); // It already fired in this test.

    document.body.removeChild(container);
  });

  // This tests an implementation detail that submit/reset events are listened to
  // at the document level, which is necessary for event replaying to work.
  // They bubble in all modern browsers.
  it('should not receive submit events if native, interim DOM handler prevents it', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    try {
      const formRef = React.createRef();
      const interimRef = React.createRef();

      const handleSubmit = jest.fn();
      const handleReset = jest.fn();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div ref={interimRef}>
            <form ref={formRef} onSubmit={handleSubmit} onReset={handleReset} />
          </div>,
        );
      });

      interimRef.current.onsubmit = nativeEvent =>
        nativeEvent.stopPropagation();
      interimRef.current.onreset = nativeEvent => nativeEvent.stopPropagation();

      await act(() => {
        formRef.current.dispatchEvent(
          new Event('submit', {
            // https://developer.mozilla.org/en-US/docs/Web/Events/submit
            bubbles: true,
          }),
        );

        formRef.current.dispatchEvent(
          new Event('reset', {
            // https://developer.mozilla.org/en-US/docs/Web/Events/reset
            bubbles: true,
          }),
        );
      });

      expect(handleSubmit).not.toHaveBeenCalled();
      expect(handleReset).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should dispatch loadstart only for media elements', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    try {
      const imgRef = React.createRef();
      const videoRef = React.createRef();

      const handleImgLoadStart = jest.fn();
      const handleVideoLoadStart = jest.fn();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <img ref={imgRef} onLoadStart={handleImgLoadStart} />
            <video ref={videoRef} onLoadStart={handleVideoLoadStart} />
          </div>,
        );
      });

      await act(() => {
        // Note for debugging: loadstart currently doesn't fire in Chrome.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=458851
        imgRef.current.dispatchEvent(
          new ProgressEvent('loadstart', {
            bubbles: false,
          }),
        );
      });
      expect(handleImgLoadStart).toHaveBeenCalledTimes(0);

      await act(() => {
        videoRef.current.dispatchEvent(
          new ProgressEvent('loadstart', {
            bubbles: false,
          }),
        );
      });
      expect(handleVideoLoadStart).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should not attempt to listen to unnecessary events on the top level', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const videoRef = React.createRef();
    // We'll test this event alone.
    const handleVideoPlay = jest.fn();
    const handleVideoPlayDelegated = jest.fn();
    const mediaEvents = {
      onAbort() {},
      onCanPlay() {},
      onCanPlayThrough() {},
      onDurationChange() {},
      onEmptied() {},
      onEncrypted() {},
      onEnded() {},
      onError() {},
      onLoadedData() {},
      onLoadedMetadata() {},
      onLoadStart() {},
      onPause() {},
      onPlay() {},
      onPlaying() {},
      onProgress() {},
      onRateChange() {},
      onResize() {},
      onSeeked() {},
      onSeeking() {},
      onStalled() {},
      onSuspend() {},
      onTimeUpdate() {},
      onVolumeChange() {},
      onWaiting() {},
    };

    const originalDocAddEventListener = document.addEventListener;
    const originalRootAddEventListener = container.addEventListener;
    document.addEventListener = function (type) {
      switch (type) {
        case 'selectionchange':
          break;
        default:
          throw new Error(
            `Did not expect to add a document-level listener for the "${type}" event.`,
          );
      }
    };
    container.addEventListener = function (type, fn, options) {
      if (options && (options === true || options.capture)) {
        return;
      }
      switch (type) {
        case 'abort':
        case 'canplay':
        case 'canplaythrough':
        case 'durationchange':
        case 'emptied':
        case 'encrypted':
        case 'ended':
        case 'error':
        case 'loadeddata':
        case 'loadedmetadata':
        case 'loadstart':
        case 'pause':
        case 'play':
        case 'playing':
        case 'progress':
        case 'ratechange':
        case 'resize':
        case 'seeked':
        case 'seeking':
        case 'stalled':
        case 'suspend':
        case 'timeupdate':
        case 'volumechange':
        case 'waiting':
          throw new Error(
            `Did not expect to add a root-level listener for the "${type}" event.`,
          );
        default:
          break;
      }
    };

    try {
      // We expect that mounting this tree will
      // *not* attach handlers for any top-level events.
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onPlay={handleVideoPlayDelegated}>
            <video ref={videoRef} {...mediaEvents} onPlay={handleVideoPlay} />
            <audio {...mediaEvents}>
              <source {...mediaEvents} />
            </audio>
          </div>,
        );
      });
      await act(() => {
        // Also verify dispatching one of them works
        videoRef.current.dispatchEvent(
          new Event('play', {
            bubbles: false,
          }),
        );
      });
      expect(handleVideoPlay).toHaveBeenCalledTimes(1);
      // Unlike browsers, we delegate media events.
      // (This doesn't make a lot of sense but it would be a breaking change not to.)
      expect(handleVideoPlayDelegated).toHaveBeenCalledTimes(1);
    } finally {
      document.addEventListener = originalDocAddEventListener;
      container.addEventListener = originalRootAddEventListener;
      document.body.removeChild(container);
    }
  });

  it('should dispatch load for embed elements', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    try {
      const ref = React.createRef();
      const handleLoad = jest.fn();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <embed ref={ref} onLoad={handleLoad} />
          </div>,
        );
      });
      await act(() => {
        ref.current.dispatchEvent(
          new ProgressEvent('load', {
            bubbles: false,
          }),
        );
      });

      expect(handleLoad).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(container);
    }
  });

  // Unlike browsers, we delegate media events.
  // (This doesn't make a lot of sense but it would be a breaking change not to.)
  it('should delegate media events even without a direct listener', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const handleVideoPlayDelegated = jest.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onPlay={handleVideoPlayDelegated}>
            {/* Intentionally no handler on the target: */}
            <video ref={ref} />
          </div>,
        );
      });

      await act(() => {
        ref.current.dispatchEvent(
          new Event('play', {
            bubbles: false,
          }),
        );
      });
      // Regression test: ensure React tree delegation still works
      // even if the actual DOM element did not have a handler.
      expect(handleVideoPlayDelegated).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should delegate dialog events even without a direct listener', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const onCancel = jest.fn();
    const onClose = jest.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onCancel={onCancel} onClose={onClose}>
            {/* Intentionally no handler on the target: */}
            <dialog ref={ref} />
          </div>,
        );
      });
      await act(() => {
        ref.current.dispatchEvent(
          new Event('close', {
            bubbles: false,
          }),
        );
        ref.current.dispatchEvent(
          new Event('cancel', {
            bubbles: false,
          }),
        );
      });
      // Regression test: ensure React tree delegation still works
      // even if the actual DOM element did not have a handler.
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should bubble non-native bubbling toggle events', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const onToggle = jest.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onToggle={onToggle}>
            <details ref={ref} onToggle={onToggle} />
          </div>,
        );
      });
      await act(() => {
        ref.current.dispatchEvent(
          new Event('toggle', {
            bubbles: false,
          }),
        );
      });
      expect(onToggle).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should bubble non-native bubbling cancel/close events', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const onCancel = jest.fn();
    const onClose = jest.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onCancel={onCancel} onClose={onClose}>
            <dialog ref={ref} onCancel={onCancel} onClose={onClose} />
          </div>,
        );
      });
      await act(() => {
        ref.current.dispatchEvent(
          new Event('cancel', {
            bubbles: false,
          }),
        );
        ref.current.dispatchEvent(
          new Event('close', {
            bubbles: false,
          }),
        );
      });
      expect(onCancel).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should bubble non-native bubbling media events events', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const onPlay = jest.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onPlay={onPlay}>
            <video ref={ref} onPlay={onPlay} />
          </div>,
        );
      });
      await act(() => {
        ref.current.dispatchEvent(
          new Event('play', {
            bubbles: false,
          }),
        );
      });
      expect(onPlay).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should bubble non-native bubbling invalid events', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const onInvalid = jest.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <form onInvalid={onInvalid}>
            <input ref={ref} onInvalid={onInvalid} />
          </form>,
        );
      });

      await act(() => {
        ref.current.dispatchEvent(
          new Event('invalid', {
            bubbles: false,
          }),
        );
      });
      expect(onInvalid).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should handle non-bubbling capture events correctly', async () => {
    const container = document.createElement('div');
    const innerRef = React.createRef();
    const outerRef = React.createRef();
    const onPlayCapture = jest.fn(e => log.push(e.currentTarget));
    const log = [];
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div ref={outerRef} onPlayCapture={onPlayCapture}>
            <div onPlayCapture={onPlayCapture}>
              <div ref={innerRef} onPlayCapture={onPlayCapture} />
            </div>
          </div>,
        );
      });
      await act(() => {
        innerRef.current.dispatchEvent(
          new Event('play', {
            bubbles: false,
          }),
        );
      });
      expect(onPlayCapture).toHaveBeenCalledTimes(3);
      expect(log).toEqual([
        outerRef.current,
        outerRef.current.firstChild,
        innerRef.current,
      ]);
      await act(() => {
        outerRef.current.dispatchEvent(
          new Event('play', {
            bubbles: false,
          }),
        );
      });
      expect(onPlayCapture).toHaveBeenCalledTimes(4);
      expect(log).toEqual([
        outerRef.current,
        outerRef.current.firstChild,
        innerRef.current,
        outerRef.current,
      ]);
    } finally {
      document.body.removeChild(container);
    }
  });

  // We're moving towards aligning more closely with the browser.
  // Currently we emulate bubbling for all non-bubbling events except scroll.
  // We may expand this list in the future, removing emulated bubbling altogether.
  it('should not emulate bubbling of scroll events', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const log = [];
    const onScroll = jest.fn(e =>
      log.push(['onScroll', 'bubble', e.currentTarget.className]),
    );
    const onScrollCapture = jest.fn(e =>
      log.push(['onScroll', 'capture', e.currentTarget.className]),
    );
    const onScrollEnd = jest.fn(e =>
      log.push(['onScrollEnd', 'bubble', e.currentTarget.className]),
    );
    const onScrollEndCapture = jest.fn(e =>
      log.push(['onScrollEnd', 'capture', e.currentTarget.className]),
    );
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div
            className="grand"
            onScroll={onScroll}
            onScrollCapture={onScrollCapture}
            onScrollEnd={onScrollEnd}
            onScrollEndCapture={onScrollEndCapture}>
            <div
              className="parent"
              onScroll={onScroll}
              onScrollCapture={onScrollCapture}
              onScrollEnd={onScrollEnd}
              onScrollEndCapture={onScrollEndCapture}>
              <div
                className="child"
                onScroll={onScroll}
                onScrollCapture={onScrollCapture}
                onScrollEnd={onScrollEnd}
                onScrollEndCapture={onScrollEndCapture}
                ref={ref}
              />
            </div>
          </div>,
        );
      });

      await act(() => {
        ref.current.dispatchEvent(
          new Event('scroll', {
            bubbles: false,
          }),
        );
        ref.current.dispatchEvent(
          new Event('scrollend', {
            bubbles: false,
          }),
        );
      });
      expect(log).toEqual([
        ['onScroll', 'capture', 'grand'],
        ['onScroll', 'capture', 'parent'],
        ['onScroll', 'capture', 'child'],
        ['onScroll', 'bubble', 'child'],
        ['onScrollEnd', 'capture', 'grand'],
        ['onScrollEnd', 'capture', 'parent'],
        ['onScrollEnd', 'capture', 'child'],
        ['onScrollEnd', 'bubble', 'child'],
      ]);
    } finally {
      document.body.removeChild(container);
    }
  });

  // We're moving towards aligning more closely with the browser.
  // Currently we emulate bubbling for all non-bubbling events except scroll.
  // We may expand this list in the future, removing emulated bubbling altogether.
  it('should not emulate bubbling of scroll events (no own handler)', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const log = [];
    const onScroll = jest.fn(e =>
      log.push(['onScroll', 'bubble', e.currentTarget.className]),
    );
    const onScrollCapture = jest.fn(e =>
      log.push(['onScroll', 'capture', e.currentTarget.className]),
    );
    const onScrollEnd = jest.fn(e =>
      log.push(['onScrollEnd', 'bubble', e.currentTarget.className]),
    );
    const onScrollEndCapture = jest.fn(e =>
      log.push(['onScrollEnd', 'capture', e.currentTarget.className]),
    );
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div
            className="grand"
            onScroll={onScroll}
            onScrollCapture={onScrollCapture}
            onScrollEnd={onScrollEnd}
            onScrollEndCapture={onScrollEndCapture}>
            <div
              className="parent"
              onScroll={onScroll}
              onScrollCapture={onScrollCapture}
              onScrollEnd={onScrollEnd}
              onScrollEndCapture={onScrollEndCapture}>
              {/* Intentionally no handler on the child: */}
              <div className="child" ref={ref} />
            </div>
          </div>,
        );
      });
      await act(() => {
        ref.current.dispatchEvent(
          new Event('scroll', {
            bubbles: false,
          }),
        );
        ref.current.dispatchEvent(
          new Event('scrollend', {
            bubbles: false,
          }),
        );
      });
      expect(log).toEqual([
        ['onScroll', 'capture', 'grand'],
        ['onScroll', 'capture', 'parent'],
        ['onScrollEnd', 'capture', 'grand'],
        ['onScrollEnd', 'capture', 'parent'],
      ]);
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should subscribe to scroll during updates', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const log = [];
    const onScroll = jest.fn(e =>
      log.push(['onScroll', 'bubble', e.currentTarget.className]),
    );
    const onScrollCapture = jest.fn(e =>
      log.push(['onScroll', 'capture', e.currentTarget.className]),
    );
    const onScrollEnd = jest.fn(e =>
      log.push(['onScrollEnd', 'bubble', e.currentTarget.className]),
    );
    const onScrollEndCapture = jest.fn(e =>
      log.push(['onScrollEnd', 'capture', e.currentTarget.className]),
    );
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <div>
              <div />
            </div>
          </div>,
        );
      });

      await act(() => {
        // Update to attach.
        root.render(
          <div
            className="grand"
            onScroll={e => onScroll(e)}
            onScrollCapture={e => onScrollCapture(e)}
            onScrollEnd={e => onScrollEnd(e)}
            onScrollEndCapture={e => onScrollEndCapture(e)}>
            <div
              className="parent"
              onScroll={e => onScroll(e)}
              onScrollCapture={e => onScrollCapture(e)}
              onScrollEnd={e => onScrollEnd(e)}
              onScrollEndCapture={e => onScrollEndCapture(e)}>
              <div
                className="child"
                onScroll={e => onScroll(e)}
                onScrollCapture={e => onScrollCapture(e)}
                onScrollEnd={e => onScrollEnd(e)}
                onScrollEndCapture={e => onScrollEndCapture(e)}
                ref={ref}
              />
            </div>
          </div>,
        );
      });

      await act(() => {
        ref.current.dispatchEvent(
          new Event('scroll', {
            bubbles: false,
          }),
        );
        ref.current.dispatchEvent(
          new Event('scrollend', {
            bubbles: false,
          }),
        );
      });
      expect(log).toEqual([
        ['onScroll', 'capture', 'grand'],
        ['onScroll', 'capture', 'parent'],
        ['onScroll', 'capture', 'child'],
        ['onScroll', 'bubble', 'child'],
        ['onScrollEnd', 'capture', 'grand'],
        ['onScrollEnd', 'capture', 'parent'],
        ['onScrollEnd', 'capture', 'child'],
        ['onScrollEnd', 'bubble', 'child'],
      ]);

      // Update to verify deduplication.
      log.length = 0;
      await act(() => {
        root.render(
          <div
            className="grand"
            // Note: these are intentionally inline functions so that
            // we hit the reattachment codepath instead of bailing out.
            onScroll={e => onScroll(e)}
            onScrollCapture={e => onScrollCapture(e)}
            onScrollEnd={e => onScrollEnd(e)}
            onScrollEndCapture={e => onScrollEndCapture(e)}>
            <div
              className="parent"
              onScroll={e => onScroll(e)}
              onScrollCapture={e => onScrollCapture(e)}
              onScrollEnd={e => onScrollEnd(e)}
              onScrollEndCapture={e => onScrollEndCapture(e)}>
              <div
                className="child"
                onScroll={e => onScroll(e)}
                onScrollCapture={e => onScrollCapture(e)}
                onScrollEnd={e => onScrollEnd(e)}
                onScrollEndCapture={e => onScrollEndCapture(e)}
                ref={ref}
              />
            </div>
          </div>,
        );
      });
      await act(() => {
        ref.current.dispatchEvent(
          new Event('scroll', {
            bubbles: false,
          }),
        );
        ref.current.dispatchEvent(
          new Event('scrollend', {
            bubbles: false,
          }),
        );
      });
      expect(log).toEqual([
        ['onScroll', 'capture', 'grand'],
        ['onScroll', 'capture', 'parent'],
        ['onScroll', 'capture', 'child'],
        ['onScroll', 'bubble', 'child'],
        ['onScrollEnd', 'capture', 'grand'],
        ['onScrollEnd', 'capture', 'parent'],
        ['onScrollEnd', 'capture', 'child'],
        ['onScrollEnd', 'bubble', 'child'],
      ]);

      // Update to detach.
      log.length = 0;
      await act(() => {
        root.render(
          <div>
            <div>
              <div ref={ref} />
            </div>
          </div>,
        );
      });
      await act(() => {
        ref.current.dispatchEvent(
          new Event('scroll', {
            bubbles: false,
          }),
        );
        ref.current.dispatchEvent(
          new Event('scrollend', {
            bubbles: false,
          }),
        );
      });
      expect(log).toEqual([]);
    } finally {
      document.body.removeChild(container);
    }
  });

  // Regression test.
  it('should subscribe to scroll during hydration', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();
    const log = [];
    const onScroll = jest.fn(e =>
      log.push(['onScroll', 'bubble', e.currentTarget.className]),
    );
    const onScrollCapture = jest.fn(e =>
      log.push(['onScroll', 'capture', e.currentTarget.className]),
    );
    const onScrollEnd = jest.fn(e =>
      log.push(['onScrollEnd', 'bubble', e.currentTarget.className]),
    );
    const onScrollEndCapture = jest.fn(e =>
      log.push(['onScrollEnd', 'capture', e.currentTarget.className]),
    );

    const tree = (
      <div
        className="grand"
        onScroll={onScroll}
        onScrollCapture={onScrollCapture}
        onScrollEnd={onScrollEnd}
        onScrollEndCapture={onScrollEndCapture}>
        <div
          className="parent"
          onScroll={onScroll}
          onScrollCapture={onScrollCapture}
          onScrollEnd={onScrollEnd}
          onScrollEndCapture={onScrollEndCapture}>
          <div
            className="child"
            onScroll={onScroll}
            onScrollCapture={onScrollCapture}
            onScrollEnd={onScrollEnd}
            onScrollEndCapture={onScrollEndCapture}
            ref={ref}
          />
        </div>
      </div>
    );
    document.body.appendChild(container);
    try {
      container.innerHTML = ReactDOMServer.renderToString(tree);
      let root;
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, tree);
      });
      await act(() => {
        ref.current.dispatchEvent(
          new Event('scroll', {
            bubbles: false,
          }),
        );
        ref.current.dispatchEvent(
          new Event('scrollend', {
            bubbles: false,
          }),
        );
      });
      expect(log).toEqual([
        ['onScroll', 'capture', 'grand'],
        ['onScroll', 'capture', 'parent'],
        ['onScroll', 'capture', 'child'],
        ['onScroll', 'bubble', 'child'],
        ['onScrollEnd', 'capture', 'grand'],
        ['onScrollEnd', 'capture', 'parent'],
        ['onScrollEnd', 'capture', 'child'],
        ['onScrollEnd', 'bubble', 'child'],
      ]);

      log.length = 0;
      await act(() => {
        root.render(
          <div>
            <div>
              <div ref={ref} />
            </div>
          </div>,
        );
      });
      await act(() => {
        ref.current.dispatchEvent(
          new Event('scroll', {
            bubbles: false,
          }),
        );
        ref.current.dispatchEvent(
          new Event('scrollend', {
            bubbles: false,
          }),
        );
      });
      expect(log).toEqual([]);
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should not subscribe to selectionchange twice', async () => {
    const log = [];

    const originalDocAddEventListener = document.addEventListener;
    document.addEventListener = function (type, fn, options) {
      switch (type) {
        case 'selectionchange':
          log.push(options);
          break;
        default:
          throw new Error(
            `Did not expect to add a document-level listener for the "${type}" event.`,
          );
      }
    };
    try {
      const rootOne = ReactDOMClient.createRoot(document.createElement('div'));
      const rootTwo = ReactDOMClient.createRoot(document.createElement('div'));

      await act(() => {
        rootOne.render(<input />);
        rootTwo.render(<input />);
      });
    } finally {
      document.addEventListener = originalDocAddEventListener;
    }

    expect(log).toEqual([false]);
  });
});
