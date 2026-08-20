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
let Scheduler;
let act;
let waitForAll;
let waitForDiscrete;
let assertLog;

const setUntrackedChecked = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'checked',
).set;

const setUntrackedValue = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value',
).set;

const setUntrackedTextareaValue = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  'value',
).set;

describe('ChangeEventPlugin', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();
    // TODO pull this into helper method, reduce repetition.
    // mock the browser APIs which are used in schedule:
    // - calling 'window.postMessage' should actually fire postmessage handlers
    const originalAddEventListener = global.addEventListener;
    let postMessageCallback;
    global.addEventListener = function (eventName, callback, useCapture) {
      if (eventName === 'message') {
        postMessageCallback = callback;
      } else {
        originalAddEventListener(eventName, callback, useCapture);
      }
    };
    global.postMessage = function (messageKey, targetOrigin) {
      const postMessageEvent = {source: window, data: messageKey};
      if (postMessageCallback) {
        postMessageCallback(postMessageEvent);
      }
    };
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitForDiscrete = InternalTestUtils.waitForDiscrete;
    assertLog = InternalTestUtils.assertLog;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  // We try to avoid firing "duplicate" React change events.
  // However, to tell which events are "duplicates" and should be ignored,
  // we are tracking the "current" input value, and only respect events
  // that occur after it changes. In most of these tests, we verify that we
  // keep track of the "current" value and only fire events when it changes.
  // See https://github.com/facebook/react/pull/5746.

  it('should consider initial text value to be current', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="text" onChange={cb} defaultValue="foo" />);
    });

    const node = container.firstChild;
    node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    node.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));

    // There should be no React change events because the value stayed the same.
    expect(called).toBe(0);
  });

  it('should consider initial text value to be current (capture)', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <input type="text" onChangeCapture={cb} defaultValue="foo" />,
      );
    });

    const node = container.firstChild;
    node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    node.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));

    // There should be no React change events because the value stayed the same.
    expect(called).toBe(0);
  });

  it('should not invoke a change event for textarea same value', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea onChange={cb} defaultValue="initial" />);
    });

    const node = container.firstChild;
    node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    node.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));
    // There should be no React change events because the value stayed the same.
    expect(called).toBe(0);
  });

  it('should not invoke a change event for textarea same value (capture)', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea onChangeCapture={cb} defaultValue="initial" />);
    });

    const node = container.firstChild;
    node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    node.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));
    // There should be no React change events because the value stayed the same.
    expect(called).toBe(0);
  });

  it('should consider initial checkbox checked=true to be current', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <input type="checkbox" onChange={cb} defaultChecked={true} />,
      );
    });

    const node = container.firstChild;

    // Secretly, set `checked` to false, so that dispatching the `click` will
    // make it `true` again. Thus, at the time of the event, React should not
    // consider it a change from the initial `true` value.
    setUntrackedChecked.call(node, false);
    node.dispatchEvent(
      new MouseEvent('click', {bubbles: true, cancelable: true}),
    );
    // There should be no React change events because the value stayed the same.
    expect(called).toBe(0);
  });

  it('should consider initial checkbox checked=false to be current', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <input type="checkbox" onChange={cb} defaultChecked={false} />,
      );
    });

    const node = container.firstChild;

    // Secretly, set `checked` to true, so that dispatching the `click` will
    // make it `false` again. Thus, at the time of the event, React should not
    // consider it a change from the initial `false` value.
    setUntrackedChecked.call(node, true);
    node.dispatchEvent(
      new MouseEvent('click', {bubbles: true, cancelable: true}),
    );
    // There should be no React change events because the value stayed the same.
    expect(called).toBe(0);
  });

  it('should fire change for checkbox input', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="checkbox" onChange={cb} />);
    });

    const node = container.firstChild;

    expect(node.checked).toBe(false);
    node.dispatchEvent(
      new MouseEvent('click', {bubbles: true, cancelable: true}),
    );
    // Note: unlike with text input events, dispatching `click` actually
    // toggles the checkbox and updates its `checked` value.
    expect(node.checked).toBe(true);
    expect(called).toBe(1);

    expect(node.checked).toBe(true);
    node.dispatchEvent(
      new MouseEvent('click', {bubbles: true, cancelable: true}),
    );
    expect(node.checked).toBe(false);
    expect(called).toBe(2);
  });

  it('should not fire change setting the value programmatically', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="text" defaultValue="foo" onChange={cb} />);
    });

    const input = container.firstChild;

    // Set it programmatically.
    input.value = 'bar';
    // Even if a DOM input event fires, React sees that the real input value now
    // ('bar') is the same as the "current" one we already recorded.
    input.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    expect(input.value).toBe('bar');
    // In this case we don't expect to get a React event.
    expect(called).toBe(0);

    // However, we can simulate user typing by calling the underlying setter.
    setUntrackedValue.call(input, 'foo');
    // Now, when the event fires, the real input value ('foo') differs from the
    // "current" one we previously recorded ('bar').
    input.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    expect(input.value).toBe('foo');
    // In this case React should fire an event for it.
    expect(called).toBe(1);

    // Verify again that extra events without real changes are ignored.
    input.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    expect(called).toBe(1);
  });

  it('should not distinguish equal string and number values', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="text" defaultValue="42" onChange={cb} />);
    });

    const input = container.firstChild;

    // When we set `value` as a property, React updates the "current" value
    // that it tracks internally. The "current" value is later used to determine
    // whether a change event is a duplicate or not.
    // Even though we set value to a number, we still shouldn't get a change
    // event because as a string, it's equal to the initial value ('42').
    input.value = 42;
    input.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    expect(input.value).toBe('42');
    expect(called).toBe(0);
  });

  // See a similar input test above for a detailed description of why.
  it('should not fire change when setting checked programmatically', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <input type="checkbox" onChange={cb} defaultChecked={false} />,
      );
    });

    const input = container.firstChild;

    // Set the value, updating the "current" value that React tracks to true.
    input.checked = true;
    // Under the hood, uncheck the box so that the click will "check" it again.
    setUntrackedChecked.call(input, false);
    input.click();
    expect(input.checked).toBe(true);
    // We don't expect a React event because at the time of the click, the real
    // checked value (true) was the same as the last recorded "current" value
    // (also true).
    expect(called).toBe(0);

    // However, simulating a normal click should fire a React event because the
    // real value (false) would have changed from the last tracked value (true).
    input.click();
    expect(called).toBe(1);
  });

  it('should unmount', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input />);
    });

    const input = container.firstChild;

    await act(() => {
      root.unmount();
    });
  });

  it('should only fire change for checked radio button once', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="radio" onChange={cb} />);
    });

    const input = container.firstChild;

    setUntrackedChecked.call(input, true);
    input.dispatchEvent(new Event('click', {bubbles: true, cancelable: true}));
    input.dispatchEvent(new Event('click', {bubbles: true, cancelable: true}));
    expect(called).toBe(1);
  });

  it('should track radio button cousins in a group', async () => {
    let called1 = 0;
    let called2 = 0;

    function cb1(e) {
      called1++;
      expect(e.type).toBe('change');
    }

    function cb2(e) {
      called2++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <input type="radio" name="group" onChange={cb1} />
          <input type="radio" name="group" onChange={cb2} />
        </div>,
      );
    });

    const div = container.firstChild;
    const option1 = div.childNodes[0];
    const option2 = div.childNodes[1];

    // Select first option.
    option1.click();
    expect(called1).toBe(1);
    expect(called2).toBe(0);

    // Select second option.
    option2.click();
    expect(called1).toBe(1);
    expect(called2).toBe(1);

    // Select the first option.
    // It should receive the React change event again.
    option1.click();
    expect(called1).toBe(2);
    expect(called2).toBe(1);
  });

  it('should deduplicate input value change events', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const inputTypes = ['text', 'number', 'range'];
    while (inputTypes.length) {
      const type = inputTypes.pop();
      called = 0;
      let root = ReactDOMClient.createRoot(container);
      let ref = {current: null};
      await act(() => {
        root.render(<input ref={ref} type={type} onChange={cb} />);
      });
      let input = ref.current;
      await act(() => {
        // Should be ignored (no change):
        input.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
        setUntrackedValue.call(input, '42');
        input.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
        // Should be ignored (no change):
        input.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
      });
      expect(called).toBe(1);
      root.unmount();

      called = 0;
      root = ReactDOMClient.createRoot(container);
      ref = {current: null};
      await act(() => {
        root.render(<input ref={ref} type={type} onChange={cb} />);
      });
      input = ref.current;
      await act(() => {
        // Should be ignored (no change):
        input.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
        setUntrackedValue.call(input, '42');
        input.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
        // Should be ignored (no change):
        input.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
      });
      expect(called).toBe(1);
      root.unmount();

      called = 0;
      root = ReactDOMClient.createRoot(container);
      ref = {current: null};
      await act(() => {
        root.render(<input ref={ref} type={type} onChange={cb} />);
      });
      input = ref.current;
      await act(() => {
        // Should be ignored (no change):
        input.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
        setUntrackedValue.call(input, '42');
        input.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
        // Should be ignored (no change):
        input.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
      });
      expect(called).toBe(1);
      root.unmount();
    }
  });

  it('should listen for both change and input events when supported', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="range" onChange={cb} />);
    });

    const input = container.firstChild;

    setUntrackedValue.call(input, 10);
    input.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));

    setUntrackedValue.call(input, 20);
    input.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));

    expect(called).toBe(2);
  });

  it('should only fire events when the value changes for range inputs', async () => {
    let called = 0;

    function cb(e) {
      called++;
      expect(e.type).toBe('change');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="range" onChange={cb} />);
    });

    const input = container.firstChild;
    setUntrackedValue.call(input, '40');
    input.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    input.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));

    setUntrackedValue.call(input, 'foo');
    input.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    input.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));

    expect(called).toBe(2);
  });

  it('does not crash for nodes with custom value property', async () => {
    let originalCreateElement;
    // https://github.com/facebook/react/issues/10196
    try {
      originalCreateElement = document.createElement;
      document.createElement = function () {
        const node = originalCreateElement.apply(this, arguments);
        Object.defineProperty(node, 'value', {
          get() {},
          set() {},
        });
        return node;
      };
      const div = document.createElement('div');
      const root = ReactDOMClient.createRoot(div);
      // Mount
      await act(() => {
        root.render(<input type="text" />);
      });
      const node = div.firstChild;
      // Update
      await act(() => {
        root.render(<input type="text" />);
      });

      // Change
      node.dispatchEvent(
        new Event('change', {bubbles: true, cancelable: true}),
      );
      // Unmount
      await act(() => {
        root.unmount();
      });
    } finally {
      document.createElement = originalCreateElement;
    }
  });

  describe('concurrent mode', () => {
    it('text input', async () => {
      const root = ReactDOMClient.createRoot(container);
      let input;

      class ControlledInput extends React.Component {
        state = {value: 'initial'};
        onChange = event => this.setState({value: event.target.value});
        render() {
          Scheduler.log(`render: ${this.state.value}`);
          const controlledValue =
            this.state.value === 'changed' ? 'changed [!]' : this.state.value;
          return (
            <input
              ref={el => (input = el)}
              type="text"
              value={controlledValue}
              onChange={this.onChange}
            />
          );
        }
      }

      // Initial mount. Test that this is async.
      root.render(<ControlledInput />);
      // Should not have flushed yet.
      assertLog([]);
      expect(input).toBe(undefined);
      // Flush callbacks.
      await waitForAll(['render: initial']);
      expect(input.value).toBe('initial');

      // Trigger a change event.
      setUntrackedValue.call(input, 'changed');
      input.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      // Change should synchronously flush
      assertLog(['render: changed']);
      // Value should be the controlled value, not the original one
      expect(input.value).toBe('changed [!]');
    });

    it('checkbox input', async () => {
      const root = ReactDOMClient.createRoot(container);
      let input;

      class ControlledInput extends React.Component {
        state = {checked: false};
        onChange = event => {
          this.setState({checked: event.target.checked});
        };
        render() {
          Scheduler.log(`render: ${this.state.checked}`);
          const controlledValue = this.props.reverse
            ? !this.state.checked
            : this.state.checked;
          return (
            <input
              ref={el => (input = el)}
              type="checkbox"
              checked={controlledValue}
              onChange={this.onChange}
            />
          );
        }
      }

      // Initial mount. Test that this is async.
      root.render(<ControlledInput reverse={false} />);
      // Should not have flushed yet.
      assertLog([]);
      expect(input).toBe(undefined);
      // Flush callbacks.
      await waitForAll(['render: false']);
      expect(input.checked).toBe(false);

      // Trigger a change event.
      input.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );
      // Change should synchronously flush
      assertLog(['render: true']);
      expect(input.checked).toBe(true);

      // Now let's make sure we're using the controlled value.
      root.render(<ControlledInput reverse={true} />);
      await waitForAll(['render: true']);

      // Trigger another change event.
      input.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );
      // Change should synchronously flush
      assertLog(['render: true']);
      expect(input.checked).toBe(false);
    });

    it('textarea', async () => {
      const root = ReactDOMClient.createRoot(container);
      let textarea;

      class ControlledTextarea extends React.Component {
        state = {value: 'initial'};
        onChange = event => this.setState({value: event.target.value});
        render() {
          Scheduler.log(`render: ${this.state.value}`);
          const controlledValue =
            this.state.value === 'changed' ? 'changed [!]' : this.state.value;
          return (
            <textarea
              ref={el => (textarea = el)}
              type="text"
              value={controlledValue}
              onChange={this.onChange}
            />
          );
        }
      }

      // Initial mount. Test that this is async.
      root.render(<ControlledTextarea />);
      // Should not have flushed yet.
      assertLog([]);
      expect(textarea).toBe(undefined);
      // Flush callbacks.
      await waitForAll(['render: initial']);
      expect(textarea.value).toBe('initial');

      // Trigger a change event.
      setUntrackedTextareaValue.call(textarea, 'changed');
      textarea.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      // Change should synchronously flush
      assertLog(['render: changed']);
      // Value should be the controlled value, not the original one
      expect(textarea.value).toBe('changed [!]');
    });

    it('parent of input', async () => {
      const root = ReactDOMClient.createRoot(container);
      let input;

      class ControlledInput extends React.Component {
        state = {value: 'initial'};
        onChange = event => this.setState({value: event.target.value});
        render() {
          Scheduler.log(`render: ${this.state.value}`);
          const controlledValue =
            this.state.value === 'changed' ? 'changed [!]' : this.state.value;
          return (
            <div onChange={this.onChange}>
              <input
                ref={el => (input = el)}
                type="text"
                value={controlledValue}
                onChange={() => {
                  // Does nothing. Parent handler is responsible for updating.
                }}
              />
            </div>
          );
        }
      }

      // Initial mount. Test that this is async.
      root.render(<ControlledInput />);
      // Should not have flushed yet.
      assertLog([]);
      expect(input).toBe(undefined);
      // Flush callbacks.
      await waitForAll(['render: initial']);
      expect(input.value).toBe('initial');

      // Trigger a change event.
      setUntrackedValue.call(input, 'changed');
      input.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      // Change should synchronously flush
      assertLog(['render: changed']);
      // Value should be the controlled value, not the original one
      expect(input.value).toBe('changed [!]');
    });

    it('is sync for non-input events', async () => {
      const root = ReactDOMClient.createRoot(container);
      let input;

      class ControlledInput extends React.Component {
        state = {value: 'initial'};
        onChange = event => this.setState({value: event.target.value});
        reset = () => {
          this.setState({value: ''});
        };
        render() {
          Scheduler.log(`render: ${this.state.value}`);
          const controlledValue =
            this.state.value === 'changed' ? 'changed [!]' : this.state.value;
          return (
            <input
              ref={el => (input = el)}
              type="text"
              value={controlledValue}
              onChange={this.onChange}
              onClick={this.reset}
            />
          );
        }
      }

      // Initial mount. Test that this is async.
      root.render(<ControlledInput />);
      // Should not have flushed yet.
      assertLog([]);
      expect(input).toBe(undefined);
      // Flush callbacks.
      await waitForAll(['render: initial']);
      expect(input.value).toBe('initial');

      // Trigger a click event
      input.dispatchEvent(
        new Event('click', {bubbles: true, cancelable: true}),
      );

      // Flush microtask queue.
      await waitForDiscrete(['render: ']);
      expect(input.value).toBe('');
    });

    it('mouse enter/leave should be user-blocking but not discrete', async () => {
      const {useState} = React;

      const root = ReactDOMClient.createRoot(container);

      const target = React.createRef(null);
      function Foo() {
        const [isHover, setHover] = useState(false);
        return (
          <div
            ref={target}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}>
            {isHover ? 'hovered' : 'not hovered'}
          </div>
        );
      }

      await act(() => {
        root.render(<Foo />);
      });
      expect(container.textContent).toEqual('not hovered');

      await act(() => {
        const mouseOverEvent = document.createEvent('MouseEvents');
        mouseOverEvent.initEvent('mouseover', true, true);
        target.current.dispatchEvent(mouseOverEvent);

        // Flush discrete updates
        ReactDOM.flushSync();
        // Since mouse enter/leave is not discrete, should not have updated yet
        expect(container.textContent).toEqual('not hovered');
      });
      expect(container.textContent).toEqual('hovered');
    });
  });
});
