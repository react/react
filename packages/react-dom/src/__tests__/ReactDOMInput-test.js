/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// Set by `yarn test-fire`.
const {disableInputAttributeSyncing} = require('shared/ReactFeatureFlags');

function emptyFunction() {}

describe('ReactDOMInput', () => {
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let ReactDOMServer;
  let Scheduler;
  let act;
  let assertLog;
  let setUntrackedValue;
  let setUntrackedChecked;
  let container;
  let root;
  let assertConsoleErrorDev;

  function dispatchEventOnNode(node, type) {
    node.dispatchEvent(new Event(type, {bubbles: true, cancelable: true}));
  }

  function isValueDirty(node) {
    // Return the "dirty value flag" as defined in the HTML spec. Cast to text
    // input to sidestep complicated value sanitization behaviors.
    const copy = node.cloneNode();
    copy.type = 'text';
    // If modifying the attribute now doesn't change the value, the value was already detached.
    copy.defaultValue += Math.random();
    return copy.value === node.value;
  }

  function isCheckedDirty(node) {
    // Return the "dirty checked flag" as defined in the HTML spec.
    if (node.checked !== node.defaultChecked) {
      return true;
    }
    const copy = node.cloneNode();
    copy.type = 'checkbox';
    copy.defaultChecked = !copy.defaultChecked;
    return copy.checked === node.checked;
  }

  function getTrackedAndCurrentInputValue(elem: HTMLElement): [mixed, mixed] {
    const tracker = elem._valueTracker;
    if (!tracker) {
      throw new Error('No input tracker');
    }
    return [
      tracker.getValue(),
      elem.nodeName === 'INPUT' &&
      (elem.type === 'checkbox' || elem.type === 'radio')
        ? String(elem.checked)
        : elem.value,
    ];
  }

  function assertInputTrackingIsCurrent(parent) {
    parent.querySelectorAll('input, textarea, select').forEach(input => {
      const [trackedValue, currentValue] =
        getTrackedAndCurrentInputValue(input);
      if (trackedValue !== currentValue) {
        throw new Error(
          `Input ${input.outerHTML} is currently ${currentValue} but tracker thinks it's ${trackedValue}`,
        );
      }
    });
  }

  beforeEach(() => {
    jest.resetModules();

    setUntrackedValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    ).set;
    setUntrackedChecked = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'checked',
    ).set;

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    assertLog = require('internal-test-utils').assertLog;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.restoreAllMocks();
  });

  it('should warn for controlled value of 0 with missing onChange', async () => {
    await act(() => {
      root.render(<input type="text" value={0} />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form ' +
        'field without an `onChange` handler. This will render a read-only ' +
        'field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn for controlled value of "" with missing onChange', async () => {
    await act(() => {
      root.render(<input type="text" value="" />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form ' +
        'field without an `onChange` handler. This will render a read-only ' +
        'field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn for controlled value of "0" with missing onChange', async () => {
    await act(() => {
      root.render(<input type="text" value="0" />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form ' +
        'field without an `onChange` handler. This will render a read-only ' +
        'field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn for controlled value of false with missing onChange', async () => {
    await act(() => {
      root.render(<input type="checkbox" checked={false} />);
    });
    assertConsoleErrorDev([
      'You provided a `checked` prop to a form field without an `onChange` handler. ' +
        'This will render a read-only field. If the field should be mutable use `defaultChecked`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn with checked and no onChange handler with readOnly specified', async () => {
    await act(() => {
      root.render(<input type="checkbox" checked={false} readOnly={true} />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<input type="checkbox" checked={false} readOnly={false} />);
    });
    assertConsoleErrorDev([
      'You provided a `checked` prop to a form field without an `onChange` handler. ' +
        'This will render a read-only field. If the field should be mutable use `defaultChecked`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in input (at **)',
    ]);
  });

  it('should not warn about missing onChange in uncontrolled inputs', async () => {
    await act(() => {
      root.render(<input />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input value={undefined} />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="text" />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="text" value={undefined} />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="checkbox" />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="checkbox" checked={undefined} />);
    });
  });

  it('should not warn with value and onInput handler', async () => {
    await act(() => {
      root.render(<input value="..." onInput={() => {}} />);
    });
  });

  it('should properly control a value even if no event listener exists', async () => {
    await act(() => {
      root.render(<input type="text" value="lion" />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form field without an `onChange` handler. ' +
        'This will render a read-only field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in input (at **)',
    ]);
    const node = container.firstChild;
    expect(isValueDirty(node)).toBe(true);

    setUntrackedValue.call(node, 'giraffe');

    // This must use the native event dispatching. If we simulate, we will
    // bypass the lazy event attachment system so we won't actually test this.
    await act(() => {
      dispatchEventOnNode(node, 'input');
    });

    expect(node.value).toBe('lion');
    expect(isValueDirty(node)).toBe(true);
  });

  it('should control a value in reentrant events', async () => {
    class ControlledInputs extends React.Component {
      state = {value: 'lion'};
      a = null;
      b = null;
      switchedFocus = false;
      change(newValue) {
        this.setState({value: newValue});
        // Calling focus here will blur the text box which causes a native
        // change event. Ideally we shouldn't have to fire this ourselves.
        // Don't remove unless you've verified the fix in #8240 is still covered.
        dispatchEventOnNode(this.a, 'input');
        this.b.focus();
      }
      blur(currentValue) {
        this.switchedFocus = true;
        // currentValue should be 'giraffe' here because we should not have
        // restored it on the target yet.
        this.setState({value: currentValue});
      }
      render() {
        return (
          <div>
            <input
              type="text"
              ref={n => (this.a = n)}
              value={this.state.value}
              onChange={e => this.change(e.target.value)}
              onBlur={e => this.blur(e.target.value)}
            />
            <input type="text" ref={n => (this.b = n)} />
          </div>
        );
      }
    }

    const ref = React.createRef();
    await act(() => {
      root.render(<ControlledInputs ref={ref} />);
    });
    const instance = ref.current;

    // Focus the field so we can later blur it.
    // Don't remove unless you've verified the fix in #8240 is still covered.
    await act(() => {
      instance.a.focus();
    });
    setUntrackedValue.call(instance.a, 'giraffe');
    // This must use the native event dispatching. If we simulate, we will
    // bypass the lazy event attachment system so we won't actually test this.
    await act(() => {
      dispatchEventOnNode(instance.a, 'input');
    });
    await act(() => {
      dispatchEventOnNode(instance.a, 'blur');
    });
    await act(() => {
      dispatchEventOnNode(instance.a, 'focusout');
    });

    expect(instance.a.value).toBe('giraffe');
    expect(instance.switchedFocus).toBe(true);
  });

  it('should control values in reentrant events with different targets', async () => {
    class ControlledInputs extends React.Component {
      state = {value: 'lion'};
      a = null;
      b = null;
      change(newValue) {
        // This click will change the checkbox's value to false. Then it will
        // invoke an inner change event. When we finally, flush, we need to
        // reset the checkbox's value to true since that is its controlled
        // value.
        this.b.click();
      }
      render() {
        return (
          <div>
            <input
              type="text"
              ref={n => (this.a = n)}
              value="lion"
              onChange={e => this.change(e.target.value)}
            />
            <input
              type="checkbox"
              ref={n => (this.b = n)}
              checked={true}
              onChange={() => {}}
            />
          </div>
        );
      }
    }

    const ref = React.createRef();
    await act(() => {
      root.render(<ControlledInputs ref={ref} />);
    });
    const instance = ref.current;

    setUntrackedValue.call(instance.a, 'giraffe');
    // This must use the native event dispatching. If we simulate, we will
    // bypass the lazy event attachment system so we won't actually test this.
    await act(() => {
      dispatchEventOnNode(instance.a, 'input');
    });

    expect(instance.a.value).toBe('lion');
    expect(instance.b.checked).toBe(true);
  });

  describe('switching text inputs between numeric and string numbers', () => {
    it('does change the number 2 to "2.0" with no change handler', async () => {
      await act(() => {
        root.render(<input type="text" value={2} onChange={jest.fn()} />);
      });
      const node = container.firstChild;

      setUntrackedValue.call(node, '2.0');
      dispatchEventOnNode(node, 'input');

      expect(node.value).toBe('2');
      if (disableInputAttributeSyncing) {
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.getAttribute('value')).toBe('2');
      }
    });

    it('does change the string "2" to "2.0" with no change handler', async () => {
      await act(() => {
        root.render(<input type="text" value={'2'} onChange={jest.fn()} />);
      });
      const node = container.firstChild;

      setUntrackedValue.call(node, '2.0');
      dispatchEventOnNode(node, 'input');

      expect(node.value).toBe('2');
      if (disableInputAttributeSyncing) {
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.getAttribute('value')).toBe('2');
      }
    });

    it('changes the number 2 to "2.0" using a change handler', async () => {
      class Stub extends React.Component {
        state = {
          value: 2,
        };
        onChange = event => {
          this.setState({value: event.target.value});
        };
        render() {
          const {value} = this.state;

          return <input type="text" value={value} onChange={this.onChange} />;
        }
      }

      await act(() => {
        root.render(<Stub />);
      });
      const node = container.firstChild;

      setUntrackedValue.call(node, '2.0');
      dispatchEventOnNode(node, 'input');

      expect(node.value).toBe('2.0');
      if (disableInputAttributeSyncing) {
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.getAttribute('value')).toBe('2.0');
      }
    });
  });

  it('does change the string ".98" to "0.98" with no change handler', async () => {
    class Stub extends React.Component {
      state = {
        value: '.98',
      };
      render() {
        return <input type="number" value={this.state.value} />;
      }
    }

    const ref = React.createRef();
    await act(() => {
      root.render(<Stub ref={ref} />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form field without an `onChange` handler. ' +
        'This will render a read-only field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in input (at **)\n' +
        '    in Stub (at **)',
    ]);
    const node = container.firstChild;
    await act(() => {
      ref.current.setState({value: '0.98'});
    });

    expect(node.value).toEqual('0.98');
  });

  it('performs a state change from "" to 0', async () => {
    class Stub extends React.Component {
      state = {
        value: '',
      };
      render() {
        return <input type="number" value={this.state.value} readOnly={true} />;
      }
    }

    const ref = React.createRef();
    await act(() => {
      root.render(<Stub ref={ref} />);
    });
    const node = container.firstChild;
    await act(() => {
      ref.current.setState({value: 0});
    });

    expect(node.value).toEqual('0');
  });

  it('updates the value on radio buttons from "" to 0', async () => {
    await act(() => {
      root.render(<input type="radio" value="" onChange={function () {}} />);
    });
    await act(() => {
      root.render(<input type="radio" value={0} onChange={function () {}} />);
    });
    expect(container.firstChild.value).toBe('0');
    expect(container.firstChild.getAttribute('value')).toBe('0');
  });

  it('updates the value on checkboxes from "" to 0', async () => {
    await act(() => {
      root.render(<input type="checkbox" value="" onChange={function () {}} />);
    });
    await act(() => {
      root.render(
        <input type="checkbox" value={0} onChange={function () {}} />,
      );
    });
    expect(container.firstChild.value).toBe('0');
    expect(container.firstChild.getAttribute('value')).toBe('0');
  });

  it('distinguishes precision for extra zeroes in string number values', async () => {
    class Stub extends React.Component {
      state = {
        value: '3.0000',
      };
      render() {
        return <input type="number" value={this.state.value} />;
      }
    }

    const ref = React.createRef();
    await act(() => {
      root.render(<Stub ref={ref} />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form field without an `onChange` handler. ' +
        'This will render a read-only field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in input (at **)\n' +
        '    in Stub (at **)',
    ]);
    const node = container.firstChild;
    await act(() => {
      ref.current.setState({value: '3'});
    });

    expect(node.value).toEqual('3');
  });

  it('should display `defaultValue` of number 0', async () => {
    await act(() => {
      root.render(<input type="text" defaultValue={0} />);
    });
    const node = container.firstChild;

    expect(node.getAttribute('value')).toBe('0');
    expect(node.value).toBe('0');
  });

  it('only assigns defaultValue if it changes', async () => {
    class Test extends React.Component {
      render() {
        return <input defaultValue="0" />;
      }
    }

    const ref = React.createRef();
    await act(() => {
      root.render(<Test ref={ref} />);
    });
    const node = container.firstChild;

    Object.defineProperty(node, 'defaultValue', {
      get() {
        return '0';
      },
      set(value) {
        throw new Error(
          `defaultValue was assigned ${value}, but it did not change!`,
        );
      },
    });

    await act(() => {
      ref.current.forceUpdate();
    });
  });

  it('should display "true" for `defaultValue` of `true`', async () => {
    const stub = <input type="text" defaultValue={true} />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    expect(node.value).toBe('true');
  });

  it('should display "false" for `defaultValue` of `false`', async () => {
    const stub = <input type="text" defaultValue={false} />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    expect(node.value).toBe('false');
  });

  it('should update `defaultValue` for uncontrolled input', async () => {
    await act(() => {
      root.render(<input type="text" defaultValue="0" />);
    });
    const node = container.firstChild;

    expect(node.value).toBe('0');
    expect(node.defaultValue).toBe('0');
    if (disableInputAttributeSyncing) {
      expect(isValueDirty(node)).toBe(false);
    } else {
      expect(isValueDirty(node)).toBe(true);
    }

    await act(() => {
      root.render(<input type="text" defaultValue="1" />);
    });

    if (disableInputAttributeSyncing) {
      expect(node.value).toBe('1');
      expect(node.defaultValue).toBe('1');
      expect(isValueDirty(node)).toBe(false);
    } else {
      expect(node.value).toBe('0');
      expect(node.defaultValue).toBe('1');
      expect(isValueDirty(node)).toBe(true);
    }
  });

  it('should update `defaultValue` for uncontrolled date/time input', async () => {
    await act(() => {
      root.render(<input type="date" defaultValue="1980-01-01" />);
    });
    const node = container.firstChild;

    expect(node.value).toBe('1980-01-01');
    expect(node.defaultValue).toBe('1980-01-01');

    await act(() => {
      root.render(<input type="date" defaultValue="2000-01-01" />);
    });

    if (disableInputAttributeSyncing) {
      expect(node.value).toBe('2000-01-01');
      expect(node.defaultValue).toBe('2000-01-01');
    } else {
      expect(node.value).toBe('1980-01-01');
      expect(node.defaultValue).toBe('2000-01-01');
    }

    await act(() => {
      root.render(<input type="date" />);
    });
  });

  // Regression test for https://github.com/facebook/react/issues/23299.
  // For controlled date/time-style inputs, React must not keep
  // `node.defaultValue` in sync with `value` on every update. iOS Safari and
  // Chrome use `defaultValue` as the target of the Reset/Clear button; if
  // they stay in sync, pressing Reset becomes a DOM no-op and the synthetic
  // `onChange` is suppressed because the value tracker sees no change.
  it('should not sync defaultValue with value on controlled time inputs', async () => {
    let lastChangeValue = null;
    let changeCount = 0;
    class Stub extends React.Component {
      state = {value: '00:30'};
      handleChange = e => {
        changeCount++;
        lastChangeValue = e.target.value;
        this.setState({value: e.target.value});
      };
      render() {
        return (
          <input
            type="time"
            value={this.state.value}
            onChange={this.handleChange}
          />
        );
      }
    }

    await act(() => {
      root.render(<Stub />);
    });
    const node = container.firstChild;

    // Simulate the user editing the input to "00:31".
    setUntrackedValue.call(node, '00:31');
    await act(() => {
      dispatchEventOnNode(node, 'input');
    });
    expect(changeCount).toBe(1);
    expect(lastChangeValue).toBe('00:31');
    expect(node.value).toBe('00:31');

    // The Reset/Clear button on iOS reverts `node.value` to
    // `node.defaultValue`. For the fix to be meaningful, React must NOT have
    // synced `defaultValue` up to the new "00:31" — it should still be the
    // initial value ("00:30") rendered at mount.
    if (!disableInputAttributeSyncing) {
      expect(node.defaultValue).toBe('00:30');
    }

    // Now simulate iOS dispatching a native `change` event after the Reset
    // operation reverted the value.
    setUntrackedValue.call(node, node.defaultValue);
    await act(() => {
      dispatchEventOnNode(node, 'change');
    });

    expect(changeCount).toBe(2);
    expect(lastChangeValue).toBe('00:30');
  });

  it('should take `defaultValue` when changing to uncontrolled input', async () => {
    await act(() => {
      root.render(<input type="text" value="0" readOnly={true} />);
    });
    const node = container.firstChild;
    expect(node.value).toBe('0');
    expect(isValueDirty(node)).toBe(true);
    await act(() => {
      root.render(<input type="text" defaultValue="1" />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input element for the lifetime of the component. ' +
        'More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
    expect(node.value).toBe('0');
    expect(isValueDirty(node)).toBe(true);
  });

  it('should render defaultValue for SSR', () => {
    const markup = ReactDOMServer.renderToString(
      <input type="text" defaultValue="1" />,
    );
    const div = document.createElement('div');
    div.innerHTML = markup;
    expect(div.firstChild.getAttribute('value')).toBe('1');
    expect(div.firstChild.getAttribute('defaultValue')).toBe(null);
  });

  it('should render bigint defaultValue for SSR', () => {
    const markup = ReactDOMServer.renderToString(
      <input type="text" defaultValue={5n} />,
    );
    const div = document.createElement('div');
    div.innerHTML = markup;
    expect(div.firstChild.getAttribute('value')).toBe('5');
    expect(div.firstChild.getAttribute('defaultValue')).toBe(null);
  });

  it('should render value for SSR', () => {
    const element = <input type="text" value="1" onChange={() => {}} />;
    const markup = ReactDOMServer.renderToString(element);
    const div = document.createElement('div');
    div.innerHTML = markup;
    expect(div.firstChild.getAttribute('value')).toBe('1');
    expect(div.firstChild.getAttribute('defaultValue')).toBe(null);
  });

  it('should render bigint value for SSR', () => {
    const element = <input type="text" value={5n} onChange={() => {}} />;
    const markup = ReactDOMServer.renderToString(element);
    const div = document.createElement('div');
    div.innerHTML = markup;
    expect(div.firstChild.getAttribute('value')).toBe('5');
    expect(div.firstChild.getAttribute('defaultValue')).toBe(null);
  });

  it('should render name attribute if it is supplied', async () => {
    await act(() => {
      root.render(<input type="text" name="name" />);
    });
    const node = container.firstChild;
    expect(node.name).toBe('name');
    expect(container.firstChild.getAttribute('name')).toBe('name');
  });

  it('should render name attribute if it is supplied for SSR', () => {
    const element = <input type="text" name="name" />;
    const markup = ReactDOMServer.renderToString(element);
    const div = document.createElement('div');
    div.innerHTML = markup;
    expect(div.firstChild.getAttribute('name')).toBe('name');
  });

  it('should not render name attribute if it is not supplied', async () => {
    await act(() => {
      root.render(<input type="text" />);
    });
    expect(container.firstChild.getAttribute('name')).toBe(null);
  });

  it('should not render name attribute if it is not supplied for SSR', () => {
    const element = <input type="text" />;
    const markup = ReactDOMServer.renderToString(element);
    const div = document.createElement('div');
    div.innerHTML = markup;
    expect(div.firstChild.getAttribute('name')).toBe(null);
  });

  it('should display "foobar" for `defaultValue` of `objToString`', async () => {
    const objToString = {
      toString: function () {
        return 'foobar';
      },
    };

    const stub = <input type="text" defaultValue={objToString} />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    expect(node.value).toBe('foobar');
  });

  it('should throw for date inputs if `defaultValue` is an object where valueOf() throws', async () => {
    class TemporalLike {
      valueOf() {
        // Throwing here is the behavior of ECMAScript "Temporal" date/time API.
        // See https://tc39.es/proposal-temporal/docs/plaindate.html#valueOf
        throw new TypeError('prod message');
      }
      toString() {
        return '2020-01-01';
      }
    }
    await expect(async () => {
      await act(() => {
        root.render(<input defaultValue={new TemporalLike()} type="date" />);
      });
    }).rejects.toThrowError(new TypeError('prod message'));
    assertConsoleErrorDev([
      'Form field values (value, checked, defaultValue, or defaultChecked props) must be ' +
        'strings, not TemporalLike. This value must be coerced to a string before using it here.\n' +
        '    in input (at **)',
      'Form field values (value, checked, defaultValue, or defaultChecked props) must be ' +
        'strings, not TemporalLike. This value must be coerced to a string before using it here.\n' +
        '    in input (at **)',
    ]);
  });

  it('should throw for text inputs if `defaultValue` is an object where valueOf() throws', async () => {
    class TemporalLike {
      valueOf() {
        // Throwing here is the behavior of ECMAScript "Temporal" date/time API.
        // See https://tc39.es/proposal-temporal/docs/plaindate.html#valueOf
        throw new TypeError('prod message');
      }
      toString() {
        return '2020-01-01';
      }
    }
    await expect(async () => {
      await act(() => {
        root.render(<input defaultValue={new TemporalLike()} type="text" />);
      });
    }).rejects.toThrowError(new TypeError('prod message'));
    assertConsoleErrorDev([
      'Form field values (value, checked, defaultValue, or defaultChecked props) must be ' +
        'strings, not TemporalLike. This value must be coerced to a string before using it here.\n' +
        '    in input (at **)',
      'Form field values (value, checked, defaultValue, or defaultChecked props) must be ' +
        'strings, not TemporalLike. This value must be coerced to a string before using it here.\n' +
        '    in input (at **)',
    ]);
  });

  it('should throw for date inputs if `value` is an object where valueOf() throws', async () => {
    class TemporalLike {
      valueOf() {
        // Throwing here is the behavior of ECMAScript "Temporal" date/time API.
        // See https://tc39.es/proposal-temporal/docs/plaindate.html#valueOf
        throw new TypeError('prod message');
      }
      toString() {
        return '2020-01-01';
      }
    }
    await expect(async () => {
      await act(() => {
        root.render(
          <input value={new TemporalLike()} type="date" onChange={() => {}} />,
        );
      });
    }).rejects.toThrowError(new TypeError('prod message'));
    assertConsoleErrorDev([
      'Form field values (value, checked, defaultValue, or defaultChecked props) must be ' +
        'strings, not TemporalLike. This value must be coerced to a string before using it here.\n' +
        '    in input (at **)',
      'Form field values (value, checked, defaultValue, or defaultChecked props) must be ' +
        'strings, not TemporalLike. This value must be coerced to a string before using it here.\n' +
        '    in input (at **)',
    ]);
  });

  it('should throw for text inputs if `value` is an object where valueOf() throws', async () => {
    class TemporalLike {
      valueOf() {
        // Throwing here is the behavior of ECMAScript "Temporal" date/time API.
        // See https://tc39.es/proposal-temporal/docs/plaindate.html#valueOf
        throw new TypeError('prod message');
      }
      toString() {
        return '2020-01-01';
      }
    }
    await expect(async () => {
      await act(() => {
        root.render(
          <input value={new TemporalLike()} type="text" onChange={() => {}} />,
        );
      });
    }).rejects.toThrowError(new TypeError('prod message'));
    assertConsoleErrorDev([
      'Form field values (value, checked, defaultValue, or defaultChecked props) must be ' +
        'strings, not TemporalLike. This value must be coerced to a string before using it here.\n' +
        '    in input (at **)',
      'Form field values (value, checked, defaultValue, or defaultChecked props) must be ' +
        'strings, not TemporalLike. This value must be coerced to a string before using it here.\n' +
        '    in input (at **)',
    ]);
  });

  it('should display `value` of number 0', async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild;

    expect(node.value).toBe('0');
  });

  it('should display `value` of bigint 5', async () => {
    await act(() => {
      root.render(<input type="text" value={5n} onChange={emptyFunction} />);
    });
    const node = container.firstChild;

    expect(node.value).toBe('5');
  });

  it('should allow setting `value` to `true`', async () => {
    await act(() => {
      root.render(<input type="text" value="yolo" onChange={emptyFunction} />);
    });
    const node = container.firstChild;

    expect(node.value).toBe('yolo');

    await act(() => {
      root.render(<input type="text" value={true} onChange={emptyFunction} />);
    });
    expect(node.value).toEqual('true');
  });

  it('should allow setting `value` to `false`', async () => {
    await act(() => {
      root.render(<input type="text" value="yolo" onChange={emptyFunction} />);
    });
    const node = container.firstChild;

    expect(node.value).toBe('yolo');

    await act(() => {
      root.render(<input type="text" value={false} onChange={emptyFunction} />);
    });
    expect(node.value).toEqual('false');
  });

  it('should allow setting `value` to `objToString`', async () => {
    await act(() => {
      root.render(<input type="text" value="foo" onChange={emptyFunction} />);
    });
    const node = container.firstChild;

    expect(node.value).toBe('foo');

    const objToString = {
      toString: function () {
        return 'foobar';
      },
    };
    await act(() => {
      root.render(
        <input type="text" value={objToString} onChange={emptyFunction} />,
      );
    });
    expect(node.value).toEqual('foobar');
  });

  it('should not incur unnecessary DOM mutations', async () => {
    await act(() => {
      root.render(<input value="a" onChange={() => {}} />);
    });

    const node = container.firstChild;
    let nodeValue = 'a';
    const nodeValueSetter = jest.fn();
    Object.defineProperty(node, 'value', {
      get: function () {
        return nodeValue;
      },
      set: nodeValueSetter.mockImplementation(function (newValue) {
        nodeValue = newValue;
      }),
    });

    await act(() => {
      root.render(<input value="a" onChange={() => {}} />);
    });
    expect(nodeValueSetter).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<input value="b" onChange={() => {}} />);
    });
    expect(nodeValueSetter).toHaveBeenCalledTimes(1);
  });

  it('should not incur unnecessary DOM mutations for numeric type conversion', async () => {
    await act(() => {
      root.render(<input value="0" onChange={() => {}} />);
    });

    const node = container.firstChild;
    let nodeValue = '0';
    const nodeValueSetter = jest.fn();
    Object.defineProperty(node, 'value', {
      get: function () {
        return nodeValue;
      },
      set: nodeValueSetter.mockImplementation(function (newValue) {
        nodeValue = newValue;
      }),
    });

    await act(() => {
      root.render(<input value={0} onChange={() => {}} />);
    });
    expect(nodeValueSetter).toHaveBeenCalledTimes(0);
  });

  it('should not incur unnecessary DOM mutations for the boolean type conversion', async () => {
    await act(() => {
      root.render(<input value="true" onChange={() => {}} />);
    });

    const node = container.firstChild;
    let nodeValue = 'true';
    const nodeValueSetter = jest.fn();
    Object.defineProperty(node, 'value', {
      get: function () {
        return nodeValue;
      },
      set: nodeValueSetter.mockImplementation(function (newValue) {
        nodeValue = newValue;
      }),
    });

    await act(() => {
      root.render(<input value={true} onChange={() => {}} />);
    });
    expect(nodeValueSetter).toHaveBeenCalledTimes(0);
  });

  it('should properly control a value of number `0`', async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild;

    setUntrackedValue.call(node, 'giraffe');
    dispatchEventOnNode(node, 'input');
    expect(node.value).toBe('0');
  });

  it('should properly control 0.0 for a text input', async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild;

    setUntrackedValue.call(node, '0.0');
    await act(() => {
      dispatchEventOnNode(node, 'input');
    });
    expect(node.value).toBe('0');
  });

  it('should properly control 0.0 for a number input', async () => {
    await act(() => {
      root.render(<input type="number" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild;

    setUntrackedValue.call(node, '0.0');
    await act(() => {
      dispatchEventOnNode(node, 'input');
    });

    if (disableInputAttributeSyncing) {
      expect(node.value).toBe('0.0');
      expect(node.hasAttribute('value')).toBe(false);
    } else {
      dispatchEventOnNode(node, 'blur');
      dispatchEventOnNode(node, 'focusout');

      expect(node.value).toBe('0.0');
      expect(node.getAttribute('value')).toBe('0.0');
    }
  });

  it('should properly transition from an empty value to 0', async () => {
    await act(() => {
      root.render(<input type="text" value="" onChange={emptyFunction} />);
    });
    const node = container.firstChild;
    expect(isValueDirty(node)).toBe(false);

    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });

    expect(node.value).toBe('0');
    expect(isValueDirty(node)).toBe(true);

    if (disableInputAttributeSyncing) {
      expect(node.hasAttribute('value')).toBe(false);
    } else {
      expect(node.defaultValue).toBe('0');
    }
  });

  it('should properly transition from 0 to an empty value', async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild;
    expect(isValueDirty(node)).toBe(true);

    await act(() => {
      root.render(<input type="text" value="" onChange={emptyFunction} />);
    });

    expect(node.value).toBe('');
    expect(node.defaultValue).toBe('');
    expect(isValueDirty(node)).toBe(true);
  });

  it('should properly transition a text input from 0 to an empty 0.0', async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    await act(() => {
      root.render(<input type="text" value="0.0" onChange={emptyFunction} />);
    });

    const node = container.firstChild;

    expect(node.value).toBe('0.0');
    if (disableInputAttributeSyncing) {
      expect(node.hasAttribute('value')).toBe(false);
    } else {
      expect(node.defaultValue).toBe('0.0');
    }
  });

  it('should properly transition a number input from "" to 0', async () => {
    await act(() => {
      root.render(<input type="number" value="" onChange={emptyFunction} />);
    });
    await act(() => {
      root.render(<input type="number" value={0} onChange={emptyFunction} />);
    });

    const node = container.firstChild;

    expect(node.value).toBe('0');
    if (disableInputAttributeSyncing) {
      expect(node.hasAttribute('value')).toBe(false);
    } else {
      expect(node.defaultValue).toBe('0');
    }
  });

  it('should properly transition a number input from "" to "0"', async () => {
    await act(() => {
      root.render(<input type="number" value="" onChange={emptyFunction} />);
    });
    await act(() => {
      root.render(<input type="number" value="0" onChange={emptyFunction} />);
    });

    const node = container.firstChild;

    expect(node.value).toBe('0');
    if (disableInputAttributeSyncing) {
      expect(node.hasAttribute('value')).toBe(false);
    } else {
      expect(node.defaultValue).toBe('0');
    }
  });

  it('should have the correct target value', async () => {
    let handled = false;
    const handler = function (event) {
      expect(event.target.nodeName).toBe('INPUT');
      handled = true;
    };
    await act(() => {
      root.render(<input type="text" value={0} onChange={handler} />);
    });
    const node = container.firstChild;

    setUntrackedValue.call(node, 'giraffe');

    await act(() => {
      dispatchEventOnNode(node, 'input');
    });

    expect(handled).toBe(true);
  });

  it('should restore uncontrolled inputs to last defaultValue upon reset', async () => {
    const inputRef = React.createRef();
    await act(() => {
      root.render(
        <form>
          <input defaultValue="default1" ref={inputRef} />
          <input type="reset" />
        </form>,
      );
    });
    expect(inputRef.current.value).toBe('default1');
    if (disableInputAttributeSyncing) {
      expect(isValueDirty(inputRef.current)).toBe(false);
    } else {
      expect(isValueDirty(inputRef.current)).toBe(true);
    }

    setUntrackedValue.call(inputRef.current, 'changed');
    dispatchEventOnNode(inputRef.current, 'input');
    expect(inputRef.current.value).toBe('changed');
    expect(isValueDirty(inputRef.current)).toBe(true);

    await act(() => {
      root.render(
        <form>
          <input defaultValue="default2" ref={inputRef} />
          <input type="reset" />
        </form>,
      );
    });
    expect(inputRef.current.value).toBe('changed');
    expect(isValueDirty(inputRef.current)).toBe(true);

    container.firstChild.reset();
    // Note: I don't know if we want to always support this.
    // But it's current behavior so worth being intentional if we break it.
    // https://github.com/facebook/react/issues/4618
    expect(inputRef.current.value).toBe('default2');
    expect(isValueDirty(inputRef.current)).toBe(false);
  });

  it('should not set a value for submit buttons unnecessarily', async () => {
    const stub = <input type="submit" />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    // The value shouldn't be '', or else the button will have no text; it
    // should have the default "Submit" or "Submit Query" label. Most browsers
    // report this as not having a `value` attribute at all; IE reports it as
    // the actual label that the user sees.
    expect(node.hasAttribute('value')).toBe(false);
  });

  it('should remove the value attribute on submit inputs when value is updated to undefined', async () => {
    const stub = <input type="submit" value="foo" onChange={emptyFunction} />;
    await act(() => {
      root.render(stub);
    });

    // Not really relevant to this particular test, but changing to undefined
    // should nonetheless trigger a warning
    await act(() => {
      root.render(
        <input type="submit" value={undefined} onChange={emptyFunction} />,
      );
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input element for the lifetime of the component. ' +
        'More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);

    const node = container.firstChild;
    expect(node.getAttribute('value')).toBe(null);
  });

  it('should remove the value attribute on reset inputs when value is updated to undefined', async () => {
    const stub = <input type="reset" value="foo" onChange={emptyFunction} />;
    await act(() => {
      root.render(stub);
    });

    // Not really relevant to this particular test, but changing to undefined
    // should nonetheless trigger a warning
    await act(() => {
      root.render(
        <input type="reset" value={undefined} onChange={emptyFunction} />,
      );
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input element for the lifetime of the component. ' +
        'More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);

    const node = container.firstChild;
    expect(node.getAttribute('value')).toBe(null);
  });

  it('should set a value on a submit input', async () => {
    const stub = <input type="submit" value="banana" />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    expect(node.getAttribute('value')).toBe('banana');
  });

  it('should not set an undefined value on a submit input', async () => {
    const stub = <input type="submit" value={undefined} />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    // Note: it shouldn't be an empty string
    // because that would erase the "submit" label.
    expect(node.getAttribute('value')).toBe(null);

    await act(() => {
      root.render(stub);
    });
    expect(node.getAttribute('value')).toBe(null);
  });

  it('should not set an undefined value on a reset input', async () => {
    const stub = <input type="reset" value={undefined} />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    // Note: it shouldn't be an empty string
    // because that would erase the "reset" label.
    expect(node.getAttribute('value')).toBe(null);

    await act(() => {
      root.render(stub);
    });
    expect(node.getAttribute('value')).toBe(null);
  });

  it('should not set a null value on a submit input', async () => {
    const stub = <input type="submit" value={null} />;
    await act(() => {
      root.render(stub);
    });
    assertConsoleErrorDev([
      '`value` prop on `input` should not be null. ' +
        'Consider using an empty string to clear the component or `undefined` for uncontrolled components.\n' +
        '    in input (at **)',
    ]);
    const node = container.firstChild;

    // Note: it shouldn't be an empty string
    // because that would erase the "submit" label.
    expect(node.getAttribute('value')).toBe(null);

    await act(() => {
      root.render(stub);
    });
    expect(node.getAttribute('value')).toBe(null);
  });

  it('should not set a null value on a reset input', async () => {
    const stub = <input type="reset" value={null} />;
    await act(() => {
      root.render(stub);
    });
    assertConsoleErrorDev([
      '`value` prop on `input` should not be null. ' +
        'Consider using an empty string to clear the component or `undefined` for uncontrolled components.\n' +
        '    in input (at **)',
    ]);
    const node = container.firstChild;

    // Note: it shouldn't be an empty string
    // because that would erase the "reset" label.
    expect(node.getAttribute('value')).toBe(null);

    await act(() => {
      root.render(stub);
    });
    expect(node.getAttribute('value')).toBe(null);
  });

  it('should set a value on a reset input', async () => {
    const stub = <input type="reset" value="banana" />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    expect(node.getAttribute('value')).toBe('banana');
  });

  it('should set an empty string value on a submit input', async () => {
    const stub = <input type="submit" value="" />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    expect(node.getAttribute('value')).toBe('');
  });

  it('should set an empty string value on a reset input', async () => {
    const stub = <input type="reset" value="" />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    expect(node.getAttribute('value')).toBe('');
  });

  it('should control radio buttons', async () => {
    class RadioGroup extends React.Component {
      aRef = React.createRef();
      bRef = React.createRef();
      cRef = React.createRef();

      render() {
        return (
          <div>
            <input
              ref={this.aRef}
              type="radio"
              name="fruit"
              checked={true}
              onChange={emptyFunction}
              data-which="a"
            />
            A
            <input
              ref={this.bRef}
              type="radio"
              name="fruit"
              onChange={emptyFunction}
              data-which="b"
            />
            B
            <form>
              <input
                ref={this.cRef}
                type="radio"
                name="fruit"
                defaultChecked={true}
                onChange={emptyFunction}
                data-which="c"
              />
            </form>
          </div>
        );
      }
    }

    const ref = React.createRef();
    await act(() => {
      root.render(<RadioGroup ref={ref} />);
    });
    const stub = ref.current;
    const aNode = stub.aRef.current;
    const bNode = stub.bRef.current;
    const cNode = stub.cRef.current;

    expect(aNode.checked).toBe(true);
    expect(bNode.checked).toBe(false);
    // c is in a separate form and shouldn't be affected at all here
    expect(cNode.checked).toBe(true);

    if (disableInputAttributeSyncing) {
      expect(aNode.hasAttribute('checked')).toBe(false);
      expect(bNode.hasAttribute('checked')).toBe(false);
      expect(cNode.hasAttribute('checked')).toBe(true);
    } else {
      expect(aNode.hasAttribute('checked')).toBe(true);
      expect(bNode.hasAttribute('checked')).toBe(false);
      expect(cNode.hasAttribute('checked')).toBe(true);
    }

    expect(isCheckedDirty(aNode)).toBe(true);
    expect(isCheckedDirty(bNode)).toBe(true);
    expect(isCheckedDirty(cNode)).toBe(true);
    assertInputTrackingIsCurrent(container);

    setUntrackedChecked.call(bNode, true);
    expect(aNode.checked).toBe(false);
    expect(cNode.checked).toBe(true);

    // The original 'checked' attribute should be unchanged
    if (disableInputAttributeSyncing) {
      expect(aNode.hasAttribute('checked')).toBe(false);
      expect(bNode.hasAttribute('checked')).toBe(false);
      expect(cNode.hasAttribute('checked')).toBe(true);
    } else {
      expect(aNode.hasAttribute('checked')).toBe(true);
      expect(bNode.hasAttribute('checked')).toBe(false);
      expect(cNode.hasAttribute('checked')).toBe(true);
    }

    // Now let's run the actual ReactDOMInput change event handler
    await act(() => {
      dispatchEventOnNode(bNode, 'click');
    });

    // The original state should have been restored
    expect(aNode.checked).toBe(true);
    expect(cNode.checked).toBe(true);

    expect(isCheckedDirty(aNode)).toBe(true);
    expect(isCheckedDirty(bNode)).toBe(true);
    expect(isCheckedDirty(cNode)).toBe(true);
    assertInputTrackingIsCurrent(container);
  });

  it('should hydrate controlled radio buttons', async () => {
    function App() {
      const [current, setCurrent] = React.useState('a');
      return (
        <>
          <input
            type="radio"
            name="fruit"
            checked={current === 'a'}
            onChange={() => {
              Scheduler.log('click a');
              setCurrent('a');
            }}
          />
          <input
            type="radio"
            name="fruit"
            checked={current === 'b'}
            onChange={() => {
              Scheduler.log('click b');
              setCurrent('b');
            }}
          />
          <input
            type="radio"
            name="fruit"
            checked={current === 'c'}
            onChange={() => {
              Scheduler.log('click c');
              // Let's say the user can't pick C
            }}
          />
        </>
      );
    }
    const html = ReactDOMServer.renderToString(<App />);
    // Create a fresh container, not attached a root yet
    container.remove();
    container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;
    const [a, b, c] = container.querySelectorAll('input');
    expect(a.checked).toBe(true);
    expect(b.checked).toBe(false);
    expect(c.checked).toBe(false);
    expect(isCheckedDirty(a)).toBe(false);
    expect(isCheckedDirty(b)).toBe(false);
    expect(isCheckedDirty(c)).toBe(false);

    // Click on B before hydrating
    b.checked = true;
    expect(isCheckedDirty(a)).toBe(true);
    expect(isCheckedDirty(b)).toBe(true);
    expect(isCheckedDirty(c)).toBe(false);

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    if (gate(flags => flags.enableHydrationChangeEvent)) {
      // We replayed the click since the value changed before hydration.
      assertLog(['click b']);
    } else {
      assertLog([]);
      // Strangely, we leave `b` checked even though we rendered A with
      // checked={true} and B with checked={false}. Arguably this is a bug.
    }
    expect(a.checked).toBe(false);
    expect(b.checked).toBe(true);
    expect(c.checked).toBe(false);
    expect(isCheckedDirty(a)).toBe(true);
    expect(isCheckedDirty(b)).toBe(true);
    expect(isCheckedDirty(c)).toBe(true);
    assertInputTrackingIsCurrent(container);

    // If we click on C now though...
    await act(async () => {
      setUntrackedChecked.call(c, true);
      dispatchEventOnNode(c, 'click');
    });

    assertLog(['click c']);
    if (gate(flags => flags.enableHydrationChangeEvent)) {
      // then since C's onClick doesn't set state, B becomes rechecked.
      expect(a.checked).toBe(false);
      expect(b.checked).toBe(true);
      expect(c.checked).toBe(false);
    } else {
      // then since C's onClick doesn't set state, A becomes rechecked
      // since in this branch we didn't replay to select B.
      expect(a.checked).toBe(true);
      expect(b.checked).toBe(false);
      expect(c.checked).toBe(false);
    }
    expect(isCheckedDirty(a)).toBe(true);
    expect(isCheckedDirty(b)).toBe(true);
    expect(isCheckedDirty(c)).toBe(true);
    assertInputTrackingIsCurrent(container);

    await act(async () => {
      setUntrackedChecked.call(b, true);
      dispatchEventOnNode(b, 'click');
    });
    if (gate(flags => flags.enableHydrationChangeEvent)) {
      // Since we already had this selected, this doesn't trigger a change again.
      assertLog([]);
    } else {
      // And we can also change to B properly after hydration.
      assertLog(['click b']);
    }
    expect(a.checked).toBe(false);
    expect(b.checked).toBe(true);
    expect(c.checked).toBe(false);
    expect(isCheckedDirty(a)).toBe(true);
    expect(isCheckedDirty(b)).toBe(true);
    expect(isCheckedDirty(c)).toBe(true);
    assertInputTrackingIsCurrent(container);
  });

  it('should hydrate uncontrolled radio buttons', async () => {
    function App() {
      return (
        <>
          <input
            type="radio"
            name="fruit"
            defaultChecked={true}
            onChange={() => Scheduler.log('click a')}
          />
          <input
            type="radio"
            name="fruit"
            defaultChecked={false}
            onChange={() => Scheduler.log('click b')}
          />
          <input
            type="radio"
            name="fruit"
            defaultChecked={false}
            onChange={() => Scheduler.log('click c')}
          />
        </>
      );
    }
    const html = ReactDOMServer.renderToString(<App />);
    // Create a fresh container, not attached a root yet
    container.remove();
    container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;
    const [a, b, c] = container.querySelectorAll('input');
    expect(a.checked).toBe(true);
    expect(b.checked).toBe(false);
    expect(c.checked).toBe(false);
    expect(isCheckedDirty(a)).toBe(false);
    expect(isCheckedDirty(b)).toBe(false);
    expect(isCheckedDirty(c)).toBe(false);

    // Click on B before hydrating
    b.checked = true;
    expect(isCheckedDirty(a)).toBe(true);
    expect(isCheckedDirty(b)).toBe(true);
    expect(isCheckedDirty(c)).toBe(false);

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    if (gate(flags => flags.enableHydrationChangeEvent)) {
      // We replayed the click since the value changed before hydration.
      assertLog(['click b']);
    } else {
      assertLog([]);
    }
    expect(a.checked).toBe(false);
    expect(b.checked).toBe(true);
    expect(c.checked).toBe(false);
    expect(isCheckedDirty(a)).toBe(true);
    expect(isCheckedDirty(b)).toBe(true);
    expect(isCheckedDirty(c)).toBe(true);
    assertInputTrackingIsCurrent(container);

    // Click back to A
    await act(async () => {
      setUntrackedChecked.call(a, true);
      dispatchEventOnNode(a, 'click');
    });

    assertLog(['click a']);
    expect(a.checked).toBe(true);
    expect(b.checked).toBe(false);
    expect(c.checked).toBe(false);
    expect(isCheckedDirty(a)).toBe(true);
    expect(isCheckedDirty(b)).toBe(true);
    expect(isCheckedDirty(c)).toBe(true);
    assertInputTrackingIsCurrent(container);
  });

  it('should check the correct radio when the selected name moves', async () => {
    class App extends React.Component {
      state = {
        updated: false,
      };
      onClick = () => {
        this.setState({updated: !this.state.updated});
      };
      render() {
        const {updated} = this.state;
        const radioName = updated ? 'secondName' : 'firstName';
        return (
          <div>
            <button type="button" onClick={this.onClick} />
            <input
              type="radio"
              name={radioName}
              onChange={emptyFunction}
              checked={updated === true}
            />
            <input
              type="radio"
              name={radioName}
              onChange={emptyFunction}
              checked={updated === false}
            />
          </div>
        );
      }
    }

    await act(() => {
      root.render(<App />);
    });
    const node = container.firstChild;
    const buttonNode = node.childNodes[0];
    const firstRadioNode = node.childNodes[1];
    expect(isCheckedDirty(firstRadioNode)).toBe(true);
    expect(firstRadioNode.checked).toBe(false);
    assertInputTrackingIsCurrent(container);
    await act(() => {
      dispatchEventOnNode(buttonNode, 'click');
    });
    expect(firstRadioNode.checked).toBe(true);
    assertInputTrackingIsCurrent(container);
    await act(() => {
      dispatchEventOnNode(buttonNode, 'click');
    });
    expect(firstRadioNode.checked).toBe(false);
    assertInputTrackingIsCurrent(container);
  });

  it("shouldn't get tricked by changing radio names, part 2", async () => {
    await act(() => {
      root.render(
        <div>
          <input
            type="radio"
            name="a"
            value="1"
            checked={true}
            onChange={() => {}}
          />
          <input
            type="radio"
            name="a"
            value="2"
            checked={false}
            onChange={() => {}}
          />
        </div>,
      );
    });
    const one = container.querySelector('input[name="a"][value="1"]');
    const two = container.querySelector('input[name="a"][value="2"]');
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(false);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);
    assertInputTrackingIsCurrent(container);

    await act(() => {
      root.render(
        <div>
          <input
            type="radio"
            name="a"
            value="1"
            checked={true}
            onChange={() => {}}
          />
          <input
            type="radio"
            name="b"
            value="2"
            checked={true}
            onChange={() => {}}
          />
        </div>,
      );
    });
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(true);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);
    assertInputTrackingIsCurrent(container);
  });

  // @gate !disableLegacyMode
  it('should control radio buttons if the tree updates during render in legacy mode', async () => {
    container.remove();
    container = document.createElement('div');
    document.body.appendChild(container);
    const sharedParent = container;
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');

    sharedParent.appendChild(container1);

    let aNode;
    let bNode;
    class ComponentA extends React.Component {
      state = {changed: false};
      handleChange = () => {
        this.setState({
          changed: true,
        });
      };
      componentDidUpdate() {
        sharedParent.appendChild(container2);
      }
      componentDidMount() {
        ReactDOM.render(<ComponentB />, container2);
      }
      render() {
        return (
          <div>
            <input
              ref={n => (aNode = n)}
              type="radio"
              name="fruit"
              checked={false}
              onChange={this.handleChange}
            />
            A
          </div>
        );
      }
    }

    class ComponentB extends React.Component {
      render() {
        return (
          <div>
            <input
              ref={n => (bNode = n)}
              type="radio"
              name="fruit"
              checked={true}
              onChange={emptyFunction}
            />
            B
          </div>
        );
      }
    }

    ReactDOM.render(<ComponentA />, container1);

    expect(aNode.checked).toBe(false);
    expect(bNode.checked).toBe(true);
    expect(isCheckedDirty(aNode)).toBe(true);
    expect(isCheckedDirty(bNode)).toBe(true);
    assertInputTrackingIsCurrent(container);

    setUntrackedChecked.call(aNode, true);
    // This next line isn't necessary in a proper browser environment, but
    // jsdom doesn't uncheck the others in a group (because they are not yet
    // sharing a parent), which makes this whole test a little less effective.
    setUntrackedChecked.call(bNode, false);

    // Now let's run the actual ReactDOMInput change event handler
    dispatchEventOnNode(aNode, 'click');

    // The original state should have been restored
    expect(aNode.checked).toBe(false);
    expect(bNode.checked).toBe(true);
    expect(isCheckedDirty(aNode)).toBe(true);
    expect(isCheckedDirty(bNode)).toBe(true);
    assertInputTrackingIsCurrent(container);
  });

  it('should control radio buttons if the tree updates during render (case 2; #26876)', async () => {
    let thunk = null;
    function App() {
      const [disabled, setDisabled] = React.useState(false);
      const [value, setValue] = React.useState('one');
      function handleChange(e) {
        setDisabled(true);
        // Pretend this is in a setTimeout or something
        thunk = () => {
          setDisabled(false);
          setValue(e.target.value);
        };
      }
      return (
        <>
          <input
            type="radio"
            name="fruit"
            value="one"
            checked={value === 'one'}
            onChange={handleChange}
            disabled={disabled}
          />
          <input
            type="radio"
            name="fruit"
            value="two"
            checked={value === 'two'}
            onChange={handleChange}
            disabled={disabled}
          />
        </>
      );
    }
    await act(() => {
      root.render(<App />);
    });
    const [one, two] = container.querySelectorAll('input');
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(false);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);
    assertInputTrackingIsCurrent(container);

    // Click two
    setUntrackedChecked.call(two, true);
    await act(() => {
      dispatchEventOnNode(two, 'click');
    });
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(false);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);
    assertInputTrackingIsCurrent(container);

    // After a delay...
    await act(thunk);
    expect(one.checked).toBe(false);
    expect(two.checked).toBe(true);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);
    assertInputTrackingIsCurrent(container);

    // Click back to one
    setUntrackedChecked.call(one, true);
    await act(() => {
      dispatchEventOnNode(one, 'click');
    });
    expect(one.checked).toBe(false);
    expect(two.checked).toBe(true);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);
    assertInputTrackingIsCurrent(container);

    // After a delay...
    await act(thunk);
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(false);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);
    assertInputTrackingIsCurrent(container);
  });

  it('should warn with value and no onChange handler and readOnly specified', async () => {
    await act(() => {
      root.render(<input type="text" value="zoink" readOnly={true} />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<input type="text" value="zoink" readOnly={false} />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form ' +
        'field without an `onChange` handler. This will render a read-only ' +
        'field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in input (at **)',
    ]);
  });

  it('should have a this value of undefined if bind is not used', async () => {
    expect.assertions(1);
    const unboundInputOnChange = function () {
      expect(this).toBe(undefined);
    };

    const stub = <input type="text" onChange={unboundInputOnChange} />;
    await act(() => {
      root.render(stub);
    });
    const node = container.firstChild;

    setUntrackedValue.call(node, 'giraffe');
    await act(() => {
      dispatchEventOnNode(node, 'input');
    });
  });

  it('should update defaultValue to empty string', async () => {
    await act(() => {
      root.render(<input type="text" defaultValue={'foo'} />);
    });
    if (disableInputAttributeSyncing) {
      expect(isValueDirty(container.firstChild)).toBe(false);
    } else {
      expect(isValueDirty(container.firstChild)).toBe(true);
    }
    await act(() => {
      root.render(<input type="text" defaultValue={''} />);
    });
    expect(container.firstChild.defaultValue).toBe('');
    if (disableInputAttributeSyncing) {
      expect(isValueDirty(container.firstChild)).toBe(false);
    } else {
      expect(isValueDirty(container.firstChild)).toBe(true);
    }
  });

  it('should warn if value is null', async () => {
    await act(() => {
      root.render(<input type="text" value={null} />);
    });
    assertConsoleErrorDev([
      '`value` prop on `input` should not be null. ' +
        'Consider using an empty string to clear the component or `undefined` ' +
        'for uncontrolled components.\n' +
        '    in input (at **)',
    ]);
    root.unmount();

    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="text" value={null} />);
    });
  });

  it('should warn if checked and defaultChecked props are specified', async () => {
    await act(() => {
      root.render(
        <input
          type="radio"
          checked={true}
          defaultChecked={true}
          readOnly={true}
        />,
      );
    });
    assertConsoleErrorDev([
      'A component contains an input of type radio with both checked and defaultChecked props. ' +
        'Input elements must be either controlled or uncontrolled ' +
        '(specify either the checked prop, or the defaultChecked prop, but not ' +
        'both). Decide between using a controlled or uncontrolled input ' +
        'element and remove one of these props. More info: ' +
        'https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
    root.unmount();

    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <input
          type="radio"
          checked={true}
          defaultChecked={true}
          readOnly={true}
        />,
      );
    });
  });

  it('should warn if value and defaultValue props are specified', async () => {
    await act(() => {
      root.render(
        <input type="text" value="foo" defaultValue="bar" readOnly={true} />,
      );
    });
    assertConsoleErrorDev([
      'A component contains an input of type text with both value and defaultValue props. ' +
        'Input elements must be either controlled or uncontrolled ' +
        '(specify either the value prop, or the defaultValue prop, but not ' +
        'both). Decide between using a controlled or uncontrolled input ' +
        'element and remove one of these props. More info: ' +
        'https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
    await (() => {
      root.unmount();
    });

    await act(() => {
      root.render(
        <input type="text" value="foo" defaultValue="bar" readOnly={true} />,
      );
    });
  });

  it('should warn if controlled input switches to uncontrolled (value is undefined)', async () => {
    const stub = (
      <input type="text" value="controlled" onChange={emptyFunction} />
    );
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="text" />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if controlled input switches to uncontrolled (value is null)', async () => {
    const stub = (
      <input type="text" value="controlled" onChange={emptyFunction} />
    );
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="text" value={null} />);
    });
    assertConsoleErrorDev([
      '`value` prop on `input` should not be null. ' +
        'Consider using an empty string to clear the component or `undefined` for uncontrolled components.\n' +
        '    in input (at **)',
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if controlled input switches to uncontrolled with defaultValue', async () => {
    const stub = (
      <input type="text" value="controlled" onChange={emptyFunction} />
    );
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="text" defaultValue="uncontrolled" />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if uncontrolled input (value is undefined) switches to controlled', async () => {
    const stub = <input type="text" />;
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="text" value="controlled" />);
    });
    assertConsoleErrorDev([
      'A component is changing an uncontrolled input to be controlled. ' +
        'This is likely caused by the value changing from undefined to ' +
        'a defined value, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if uncontrolled input (value is null) switches to controlled', async () => {
    const stub = <input type="text" value={null} />;
    await act(() => {
      root.render(stub);
    });
    assertConsoleErrorDev([
      '`value` prop on `input` should not be null. ' +
        'Consider using an empty string to clear the component or `undefined` for uncontrolled components.\n' +
        '    in input (at **)',
    ]);
    await act(() => {
      root.render(<input type="text" value="controlled" />);
    });
    assertConsoleErrorDev([
      'A component is changing an uncontrolled input to be controlled. ' +
        'This is likely caused by the value changing from undefined to ' +
        'a defined value, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if controlled checkbox switches to uncontrolled (checked is undefined)', async () => {
    const stub = (
      <input type="checkbox" checked={true} onChange={emptyFunction} />
    );
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="checkbox" />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if controlled checkbox switches to uncontrolled (checked is null)', async () => {
    const stub = (
      <input type="checkbox" checked={true} onChange={emptyFunction} />
    );
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="checkbox" checked={null} />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if controlled checkbox switches to uncontrolled with defaultChecked', async () => {
    const stub = (
      <input type="checkbox" checked={true} onChange={emptyFunction} />
    );
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="checkbox" defaultChecked={true} />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if uncontrolled checkbox (checked is undefined) switches to controlled', async () => {
    const stub = <input type="checkbox" />;
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="checkbox" checked={true} />);
    });
    assertConsoleErrorDev([
      'A component is changing an uncontrolled input to be controlled. ' +
        'This is likely caused by the value changing from undefined to ' +
        'a defined value, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if uncontrolled checkbox (checked is null) switches to controlled', async () => {
    const stub = <input type="checkbox" checked={null} />;
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="checkbox" checked={true} />);
    });
    assertConsoleErrorDev([
      'A component is changing an uncontrolled input to be controlled. ' +
        'This is likely caused by the value changing from undefined to ' +
        'a defined value, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if controlled radio switches to uncontrolled (checked is undefined)', async () => {
    const stub = <input type="radio" checked={true} onChange={emptyFunction} />;
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="radio" />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if controlled radio switches to uncontrolled (checked is null)', async () => {
    const stub = <input type="radio" checked={true} onChange={emptyFunction} />;
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="radio" checked={null} />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if controlled radio switches to uncontrolled with defaultChecked', async () => {
    const stub = <input type="radio" checked={true} onChange={emptyFunction} />;
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="radio" defaultChecked={true} />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if uncontrolled radio (checked is undefined) switches to controlled', async () => {
    const stub = <input type="radio" />;
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="radio" checked={true} />);
    });
    assertConsoleErrorDev([
      'A component is changing an uncontrolled input to be controlled. ' +
        'This is likely caused by the value changing from undefined to ' +
        'a defined value, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should warn if uncontrolled radio (checked is null) switches to controlled', async () => {
    const stub = <input type="radio" checked={null} />;
    await act(() => {
      root.render(stub);
    });
    await act(() => {
      root.render(<input type="radio" checked={true} />);
    });
    assertConsoleErrorDev([
      'A component is changing an uncontrolled input to be controlled. ' +
        'This is likely caused by the value changing from undefined to ' +
        'a defined value, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('should not warn if radio value changes but never becomes controlled', async () => {
    await act(() => {
      root.render(<input type="radio" value="value" />);
    });
    await act(() => {
      root.render(<input type="radio" />);
    });
    await act(() => {
      root.render(<input type="radio" value="value" defaultChecked={true} />);
    });
    await act(() => {
      root.render(<input type="radio" value="value" onChange={() => null} />);
    });
    await act(() => {
      root.render(<input type="radio" />);
    });
  });

  it('should not warn if radio value changes but never becomes uncontrolled', async () => {
    await act(() => {
      root.render(<input type="radio" checked={false} onChange={() => null} />);
    });
    const input = container.querySelector('input');
    expect(isCheckedDirty(input)).toBe(true);
    await act(() => {
      root.render(
        <input
          type="radio"
          value="value"
          defaultChecked={true}
          checked={false}
          onChange={() => null}
        />,
      );
    });
    expect(isCheckedDirty(input)).toBe(true);
    assertInputTrackingIsCurrent(container);
  });

  it('should warn if radio checked false changes to become uncontrolled', async () => {
    await act(() => {
      root.render(
        <input
          type="radio"
          value="value"
          checked={false}
          onChange={() => null}
        />,
      );
    });
    await act(() => {
      root.render(<input type="radio" value="value" />);
    });
    assertConsoleErrorDev([
      'A component is changing a controlled input to be uncontrolled. ' +
        'This is likely caused by the value changing from a defined to ' +
        'undefined, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: https://react.dev/link/controlled-components\n' +
        '    in input (at **)',
    ]);
  });

  it('sets type, step, min, max before value always', async () => {
    const log = [];
    const originalCreateElement = document.createElement;
    spyOnDevAndProd(document, 'createElement').mockImplementation(
      function (type) {
        const el = originalCreateElement.apply(this, arguments);
        let value = '';
        let typeProp = '';

        if (type === 'input') {
          Object.defineProperty(el, 'type', {
            get: function () {
              return typeProp;
            },
            set: function (val) {
              typeProp = String(val);
              log.push('set property type');
            },
          });
          Object.defineProperty(el, 'value', {
            get: function () {
              return value;
            },
            set: function (val) {
              value = String(val);
              log.push('set property value');
            },
          });
          spyOnDevAndProd(el, 'setAttribute').mockImplementation(
            function (name) {
              log.push('set attribute ' + name);
            },
          );
        }
        return el;
      },
    );

    await act(() => {
      root.render(
        <input
          value="0"
          onChange={() => {}}
          type="range"
          min="0"
          max="100"
          step="1"
        />,
      );
    });

    expect(log).toEqual([
      'set attribute min',
      'set attribute max',
      'set attribute step',
      'set property type',
      'set property value',
    ]);
  });

  it('sets value properly with type coming later in props', async () => {
    await act(() => {
      root.render(<input value="hi" type="radio" />);
    });
    expect(container.firstChild.value).toBe('hi');
  });

  it('does not raise a validation warning when it switches types', async () => {
    class Input extends React.Component {
      state = {type: 'number', value: 1000};

      render() {
        const {value, type} = this.state;
        return <input onChange={() => {}} type={type} value={value} />;
      }
    }

    const ref = React.createRef();
    await act(() => {
      root.render(<Input ref={ref} />);
    });
    const node = container.firstChild;

    // If the value is set before the type, a validation warning will raise and
    // the value will not be assigned.
    await act(() => {
      ref.current.setState({type: 'text', value: 'Test'});
    });
    expect(node.value).toEqual('Test');
  });

  it('resets value of date/time input to fix bugs in iOS Safari', async () => {
    function strify(x) {
      return JSON.stringify(x, null, 2);
    }

    const log = [];
    const originalCreateElement = document.createElement;
    spyOnDevAndProd(document, 'createElement').mockImplementation(
      function (type) {
        const el = originalCreateElement.apply(this, arguments);
        const getDefaultValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'defaultValue',
        ).get;
        const setDefaultValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'defaultValue',
        ).set;
        const getValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        ).get;
        const setValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        ).set;
        const getType = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'type',
        ).get;
        const setType = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'type',
        ).set;
        if (type === 'input') {
          Object.defineProperty(el, 'defaultValue', {
            get: function () {
              return getDefaultValue.call(this);
            },
            set: function (val) {
              log.push(`node.defaultValue = ${strify(val)}`);
              setDefaultValue.call(this, val);
            },
          });
          Object.defineProperty(el, 'value', {
            get: function () {
              return getValue.call(this);
            },
            set: function (val) {
              log.push(`node.value = ${strify(val)}`);
              setValue.call(this, val);
            },
          });
          Object.defineProperty(el, 'type', {
            get: function () {
              return getType.call(this);
            },
            set: function (val) {
              log.push(`node.type = ${strify(val)}`);
              setType.call(this, val);
            },
          });
          spyOnDevAndProd(el, 'setAttribute').mockImplementation(
            function (name, val) {
              log.push(`node.setAttribute(${strify(name)}, ${strify(val)})`);
            },
          );
        }
        return el;
      },
    );

    await act(() => {
      root.render(<input type="date" defaultValue="1980-01-01" />);
    });

    if (disableInputAttributeSyncing) {
      expect(log).toEqual([
        'node.type = "date"',
        'node.defaultValue = "1980-01-01"',
        // TODO: it's possible this reintroduces the bug because we don't assign `value` at all.
        // Need to check this on mobile Safari and Chrome.
      ]);
    } else {
      expect(log).toEqual([
        'node.type = "date"',
        // value must be assigned before defaultValue. This fixes an issue where the
        // visually displayed value of date inputs disappears on mobile Safari and Chrome:
        // https://github.com/facebook/react/issues/7233
        'node.value = "1980-01-01"',
        'node.defaultValue = "1980-01-01"',
      ]);
    }
  });

  describe('assigning the value attribute on controlled inputs', function () {
    function getTestInput() {
      return class extends React.Component {
        state = {
          value: this.props.value == null ? '' : this.props.value,
        };
        onChange = event => {
          this.setState({value: event.target.value});
        };
        render() {
          const type = this.props.type;
          const value = this.state.value;

          return <input type={type} value={value} onChange={this.onChange} />;
        }
      };
    }

    it('always sets the attribute when values change on text inputs', async () => {
      const Input = getTestInput();
      await act(() => {
        root.render(<Input type="text" />);
      });
      const node = container.firstChild;
      expect(isValueDirty(node)).toBe(false);

      setUntrackedValue.call(node, '2');
      await act(() => {
        dispatchEventOnNode(node, 'input');
      });

      expect(isValueDirty(node)).toBe(true);
      if (disableInputAttributeSyncing) {
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.getAttribute('value')).toBe('2');
      }
    });

    it('does not set the value attribute on number inputs if focused', async () => {
      const Input = getTestInput();
      await act(() => {
        root.render(<Input type="number" value="1" />);
      });
      const node = container.firstChild;
      expect(isValueDirty(node)).toBe(true);

      node.focus();

      setUntrackedValue.call(node, '2');
      dispatchEventOnNode(node, 'input');

      expect(isValueDirty(node)).toBe(true);
      if (disableInputAttributeSyncing) {
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.getAttribute('value')).toBe('1');
      }
    });

    it('sets the value attribute on number inputs on blur', async () => {
      const Input = getTestInput();
      await act(() => {
        root.render(<Input type="number" value="1" />);
      });
      const node = container.firstChild;
      expect(isValueDirty(node)).toBe(true);

      node.focus();
      setUntrackedValue.call(node, '2');
      dispatchEventOnNode(node, 'input');
      node.blur();

      expect(isValueDirty(node)).toBe(true);
      if (disableInputAttributeSyncing) {
        expect(node.value).toBe('2');
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.value).toBe('2');
        expect(node.getAttribute('value')).toBe('2');
      }
    });

    it('an uncontrolled number input will not update the value attribute on blur', async () => {
      await act(() => {
        root.render(<input type="number" defaultValue="1" />);
      });
      const node = container.firstChild;
      if (disableInputAttributeSyncing) {
        expect(isValueDirty(node)).toBe(false);
      } else {
        expect(isValueDirty(node)).toBe(true);
      }

      node.focus();
      setUntrackedValue.call(node, 4);
      dispatchEventOnNode(node, 'input');
      node.blur();

      expect(isValueDirty(node)).toBe(true);
      expect(node.getAttribute('value')).toBe('1');
    });

    it('an uncontrolled text input will not update the value attribute on blur', async () => {
      await act(() => {
        root.render(<input type="text" defaultValue="1" />);
      });
      const node = container.firstChild;
      if (disableInputAttributeSyncing) {
        expect(isValueDirty(node)).toBe(false);
      } else {
        expect(isValueDirty(node)).toBe(true);
      }

      node.focus();
      setUntrackedValue.call(node, 4);
      dispatchEventOnNode(node, 'input');
      node.blur();

      expect(isValueDirty(node)).toBe(true);
      expect(node.getAttribute('value')).toBe('1');
    });
  });

  describe('setting a controlled input to undefined', () => {
    let input;

    async function renderInputWithStringThenWithUndefined() {
      let setValueToUndefined;
      class Input extends React.Component {
        constructor() {
          super();
          setValueToUndefined = () => this.setState({value: undefined});
        }
        state = {value: 'first'};
        render() {
          return (
            <input
              onChange={e => this.setState({value: e.target.value})}
              value={this.state.value}
            />
          );
        }
      }

      await act(() => {
        root.render(<Input />);
      });
      input = container.firstChild;
      setUntrackedValue.call(input, 'latest');
      dispatchEventOnNode(input, 'input');
      await act(() => {
        setValueToUndefined();
      });
    }

    it('reverts the value attribute to the initial value', async () => {
      await renderInputWithStringThenWithUndefined();
      assertConsoleErrorDev([
        'A component is changing a controlled input to be uncontrolled. ' +
          'This is likely caused by the value changing from a defined to undefined, which should not happen. ' +
          'Decide between using a controlled or uncontrolled input element for the lifetime of the component. ' +
          'More info: https://react.dev/link/controlled-components\n' +
          '    in input (at **)\n' +
          '    in Input (at **)',
      ]);
      if (disableInputAttributeSyncing) {
        expect(input.getAttribute('value')).toBe(null);
      } else {
        expect(input.getAttribute('value')).toBe('latest');
      }
    });

    it('preserves the value property', async () => {
      await renderInputWithStringThenWithUndefined();
      assertConsoleErrorDev([
        'A component is changing a controlled input to be uncontrolled. ' +
          'This is likely caused by the value changing from a defined to undefined, which should not happen. ' +
          'Decide between using a controlled or uncontrolled input element for the lifetime of the component. ' +
          'More info: https://react.dev/link/controlled-components\n' +
          '    in input (at **)\n' +
          '    in Input (at **)',
      ]);
      expect(input.value).toBe('latest');
    });
  });

  describe('setting a controlled input to null', () => {
    let input;

    async function renderInputWithStringThenWithNull() {
      let setValueToNull;
      class Input extends React.Component {
        constructor() {
          super();
          setValueToNull = () => this.setState({value: null});
        }
        state = {value: 'first'};
        render() {
          return (
            <input
              onChange={e => this.setState({value: e.target.value})}
              value={this.state.value}
            />
          );
        }
      }

      await act(() => {
        root.render(<Input />);
      });
      input = container.firstChild;
      setUntrackedValue.call(input, 'latest');
      dispatchEventOnNode(input, 'input');
      await act(() => {
        setValueToNull();
      });
    }

    it('reverts the value attribute to the initial value', async () => {
      await renderInputWithStringThenWithNull();
      assertConsoleErrorDev([
        '`value` prop on `input` should not be null. ' +
          'Consider using an empty string to clear the component ' +
          'or `undefined` for uncontrolled components.\n' +
          '    in input (at **)\n' +
          '    in Input (at **)',
        'A component is changing a controlled input to be uncontrolled. ' +
          'This is likely caused by the value changing from a defined to undefined, which should not happen. ' +
          'Decide between using a controlled or uncontrolled input element for the lifetime of the component. ' +
          'More info: https://react.dev/link/controlled-components\n' +
          '    in input (at **)\n' +
          '    in Input (at **)',
      ]);
      if (disableInputAttributeSyncing) {
        expect(input.getAttribute('value')).toBe(null);
      } else {
        expect(input.getAttribute('value')).toBe('latest');
      }
    });

    it('preserves the value property', async () => {
      await renderInputWithStringThenWithNull();
      assertConsoleErrorDev([
        '`value` prop on `input` should not be null. ' +
          'Consider using an empty string to clear the component ' +
          'or `undefined` for uncontrolled components.\n' +
          '    in input (at **)\n' +
          '    in Input (at **)',
        'A component is changing a controlled input to be uncontrolled. ' +
          'This is likely caused by the value changing from a defined to undefined, which should not happen. ' +
          'Decide between using a controlled or uncontrolled input element for the lifetime of the component. ' +
          'More info: https://react.dev/link/controlled-components\n' +
          '    in input (at **)\n' +
          '    in Input (at **)',
      ]);
      expect(input.value).toBe('latest');
    });
  });

  describe('When given a Symbol value', function () {
    it('treats initial Symbol value as an empty string', async () => {
      await act(() => {
        root.render(<input value={Symbol('foobar')} onChange={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <input> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in input (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
      if (disableInputAttributeSyncing) {
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.getAttribute('value')).toBe('');
      }
    });

    it('treats updated Symbol value as an empty string', async () => {
      await act(() => {
        root.render(<input value="foo" onChange={() => {}} />);
      });
      await act(() => {
        root.render(<input value={Symbol('foobar')} onChange={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <input> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in input (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
      if (disableInputAttributeSyncing) {
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.getAttribute('value')).toBe('');
      }
    });

    it('treats initial Symbol defaultValue as an empty string', async () => {
      await act(() => {
        root.render(<input defaultValue={Symbol('foobar')} />);
      });
      const node = container.firstChild;

      expect(node.value).toBe('');
      expect(node.getAttribute('value')).toBe('');
      // TODO: we should warn here.
    });

    it('treats updated Symbol defaultValue as an empty string', async () => {
      await act(() => {
        root.render(<input defaultValue="foo" />);
      });
      await act(() => {
        root.render(<input defaultValue={Symbol('foobar')} />);
      });
      const node = container.firstChild;

      if (disableInputAttributeSyncing) {
        expect(node.value).toBe('');
      } else {
        expect(node.value).toBe('foo');
      }
      expect(node.getAttribute('value')).toBe('');
      // TODO: we should warn here.
    });
  });

  describe('When given a function value', function () {
    it('treats initial function value as an empty string', async () => {
      await act(() => {
        root.render(<input value={() => {}} onChange={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <input> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in input (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
      if (disableInputAttributeSyncing) {
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.getAttribute('value')).toBe('');
      }
    });

    it('treats updated function value as an empty string', async () => {
      await act(() => {
        root.render(<input value="foo" onChange={() => {}} />);
      });
      await act(() => {
        root.render(<input value={() => {}} onChange={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <input> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in input (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
      if (disableInputAttributeSyncing) {
        expect(node.hasAttribute('value')).toBe(false);
      } else {
        expect(node.getAttribute('value')).toBe('');
      }
    });

    it('treats initial function defaultValue as an empty string', async () => {
      await act(() => {
        root.render(<input defaultValue={() => {}} />);
      });
      const node = container.firstChild;

      expect(node.value).toBe('');
      expect(node.getAttribute('value')).toBe('');
      // TODO: we should warn here.
    });

    it('treats updated function defaultValue as an empty string', async () => {
      await act(() => {
        root.render(<input defaultValue="foo" />);
      });
      await act(() => {
        root.render(<input defaultValue={() => {}} />);
      });
      const node = container.firstChild;

      if (disableInputAttributeSyncing) {
        expect(node.value).toBe('');
        expect(node.getAttribute('value')).toBe('');
      } else {
        expect(node.value).toBe('foo');
        expect(node.getAttribute('value')).toBe('');
      }
      // TODO: we should warn here.
    });
  });

  describe('checked inputs without a value property', function () {
    // In absence of a value, radio and checkboxes report a value of "on".
    // Between 16 and 16.2, we assigned a node's value to it's current
    // value in order to "dettach" it from defaultValue. This had the unfortunate
    // side-effect of assigning value="on" to radio and checkboxes
    it('does not add "on" in absence of value on a checkbox', async () => {
      await act(() => {
        root.render(<input type="checkbox" defaultChecked={true} />);
      });
      const node = container.firstChild;

      expect(node.value).toBe('on');
      expect(node.hasAttribute('value')).toBe(false);
    });

    it('does not add "on" in absence of value on a radio', async () => {
      await act(() => {
        root.render(<input type="radio" defaultChecked={true} />);
      });
      const node = container.firstChild;

      expect(node.value).toBe('on');
      expect(node.hasAttribute('value')).toBe(false);
    });
  });

  it('should remove previous `defaultValue`', async () => {
    await act(() => {
      root.render(<input type="text" defaultValue="0" />);
    });
    const node = container.firstChild;

    expect(node.value).toBe('0');
    expect(node.defaultValue).toBe('0');

    await act(() => {
      root.render(<input type="text" />);
    });
    expect(node.defaultValue).toBe('');
  });

  it('should treat `defaultValue={null}` as missing', async () => {
    await act(() => {
      root.render(<input type="text" defaultValue="0" />);
    });
    const node = container.firstChild;

    expect(node.value).toBe('0');
    expect(node.defaultValue).toBe('0');

    await act(() => {
      root.render(<input type="text" defaultValue={null} />);
    });
    expect(node.defaultValue).toBe('');
  });

  it('should notice input changes when reverting back to original value', async () => {
    const log = [];
    function onChange(e) {
      log.push(e.target.value);
    }
    await act(() => {
      root.render(<input type="text" value="" onChange={onChange} />);
    });
    await act(() => {
      root.render(<input type="text" value="a" onChange={onChange} />);
    });

    const node = container.firstChild;
    setUntrackedValue.call(node, '');
    dispatchEventOnNode(node, 'input');

    expect(log).toEqual(['']);
    expect(node.value).toBe('a');
  });
});
