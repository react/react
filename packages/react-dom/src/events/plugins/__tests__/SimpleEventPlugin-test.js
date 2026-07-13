/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// polyfill missing JSDOM support
class ToggleEvent extends Event {
  constructor(type, eventInit) {
    super(type, eventInit);
    this.newState = eventInit.newState;
    this.oldState = eventInit.oldState;
  }
}

describe('SimpleEventPlugin', function () {
  let React;
  let ReactDOMClient;
  let Scheduler;
  let act;

  let onClick;
  let container;
  let assertLog;
  let waitForAll;

  async function expectClickThru(element) {
    await act(() => {
      element.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  }

  function expectNoClickThru(element) {
    element.click();
    expect(onClick).toHaveBeenCalledTimes(0);
  }

  async function mounted(element) {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(element);
    });
    element = container.firstChild;
    return element;
  }

  beforeEach(function () {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    waitForAll = InternalTestUtils.waitForAll;
    act = InternalTestUtils.act;

    onClick = jest.fn();
  });

  afterEach(() => {
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it('A non-interactive tags click when disabled', async function () {
    const element = <div onClick={onClick} />;
    await expectClickThru(await mounted(element));
  });

  it('A non-interactive tags clicks bubble when disabled', async function () {
    const element = await mounted(
      <div onClick={onClick}>
        <div />
      </div>,
    );
    const child = element.firstChild;
    child.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not register a click when clicking a child of a disabled element', async function () {
    const element = await mounted(
      <button onClick={onClick} disabled={true}>
        <span />
      </button>,
    );
    const child = element.querySelector('span');

    child.click();
    expect(onClick).toHaveBeenCalledTimes(0);
  });

  it('triggers click events for children of disabled elements', async function () {
    const element = await mounted(
      <button disabled={true}>
        <span onClick={onClick} />
      </button>,
    );
    const child = element.querySelector('span');

    child.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('triggers parent captured click events when target is a child of a disabled elements', async function () {
    const element = await mounted(
      <div onClickCapture={onClick}>
        <button disabled={true}>
          <span />
        </button>
      </div>,
    );
    const child = element.querySelector('span');

    child.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('triggers captured click events for children of disabled elements', async function () {
    const element = await mounted(
      <button disabled={true}>
        <span onClickCapture={onClick} />
      </button>,
    );
    const child = element.querySelector('span');

    child.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe.each(['button', 'input', 'select', 'textarea'])(
    '%s',
    function (tagName) {
      it('should forward clicks when it starts out not disabled', async () => {
        const element = React.createElement(tagName, {
          onClick: onClick,
        });

        await expectClickThru(await mounted(element));
      });

      it('should not forward clicks when it starts out disabled', async () => {
        const element = React.createElement(tagName, {
          onClick: onClick,
          disabled: true,
        });

        await expectNoClickThru(await mounted(element));
      });

      it('should forward clicks when it becomes not disabled', async () => {
        container = document.createElement('div');
        document.body.appendChild(container);
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            React.createElement(tagName, {onClick: onClick, disabled: true}),
          );
        });
        await act(() => {
          root.render(React.createElement(tagName, {onClick: onClick}));
        });
        const element = container.firstChild;
        await expectClickThru(element);
      });

      it('should not forward clicks when it becomes disabled', async () => {
        container = document.createElement('div');
        document.body.appendChild(container);
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(React.createElement(tagName, {onClick: onClick}));
        });
        await act(() => {
          root.render(
            React.createElement(tagName, {onClick: onClick, disabled: true}),
          );
        });
        const element = container.firstChild;
        expectNoClickThru(element);
      });

      it('should work correctly if the listener is changed', async () => {
        container = document.createElement('div');
        document.body.appendChild(container);
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            React.createElement(tagName, {onClick: onClick, disabled: true}),
          );
        });
        await act(() => {
          root.render(
            React.createElement(tagName, {onClick: onClick, disabled: false}),
          );
        });
        const element = container.firstChild;
        await expectClickThru(element);
      });
    },
  );

  it('batches updates that occur as a result of a nested event dispatch', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    let button;
    class Button extends React.Component {
      state = {count: 0};
      increment = () =>
        this.setState(state => ({
          count: state.count + 1,
        }));
      componentDidUpdate() {
        Scheduler.log(`didUpdate - Count: ${this.state.count}`);
      }
      render() {
        return (
          <button
            ref={el => (button = el)}
            onFocus={this.increment}
            onClick={() => {
              // The focus call synchronously dispatches a nested event. All of
              // the updates in this handler should be batched together.
              this.increment();
              button.focus();
              this.increment();
            }}>
            Count: {this.state.count}
          </button>
        );
      }
    }

    function click() {
      button.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Button />);
    });

    expect(button.textContent).toEqual('Count: 0');
    assertLog([]);

    await act(() => {
      click();
    });
    // There should be exactly one update.
    assertLog(['didUpdate - Count: 3']);
    expect(button.textContent).toEqual('Count: 3');
  });

  describe('interactive events, in concurrent mode', () => {
    beforeEach(() => {
      jest.resetModules();

      React = require('react');
      ReactDOMClient = require('react-dom/client');
      Scheduler = require('scheduler');

      const InternalTestUtils = require('internal-test-utils');
      assertLog = InternalTestUtils.assertLog;
      waitForAll = InternalTestUtils.waitForAll;

      act = require('internal-test-utils').act;
    });

    it('flushes pending interactive work before exiting event handler', async () => {
      container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      document.body.appendChild(container);

      let button;
      class Button extends React.Component {
        state = {disabled: false};
        onClick = () => {
          // Perform some side-effect
          Scheduler.log('Side-effect');
          // Disable the button
          this.setState({disabled: true});
        };
        render() {
          Scheduler.log(
            `render button: ${this.state.disabled ? 'disabled' : 'enabled'}`,
          );
          return (
            <button
              ref={el => (button = el)}
              // Handler is removed after the first click
              onClick={this.state.disabled ? null : this.onClick}
            />
          );
        }
      }

      // Initial mount
      root.render(<Button />);
      // Should not have flushed yet because it's async
      assertLog([]);
      expect(button).toBe(undefined);
      // Flush async work
      await waitForAll(['render button: enabled']);

      function click() {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(event, 'timeStamp', {
          value: 0,
        });
        button.dispatchEvent(event);
      }

      // Click the button to trigger the side-effect
      await act(() => click());
      assertLog([
        // The handler fired
        'Side-effect',
        // The component re-rendered synchronously, even in concurrent mode.
        'render button: disabled',
      ]);

      // Click the button again
      click();
      assertLog([
        // The event handler was removed from the button, so there's no effect.
      ]);

      // The handler should not fire again no matter how many times we
      // click the handler.
      click();
      click();
      click();
      click();
      click();
      await waitForAll([]);
    });

    // NOTE: This test was written for the old behavior of discrete updates,
    // where they would be async, but flushed early if another discrete update
    // was dispatched.
    it('end result of many interactive updates is deterministic', async () => {
      container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      document.body.appendChild(container);

      let button;
      class Button extends React.Component {
        state = {count: 0};
        render() {
          return (
            <button
              ref={el => (button = el)}
              onClick={() =>
                // Intentionally not using the updater form here
                this.setState({count: this.state.count + 1})
              }>
              Count: {this.state.count}
            </button>
          );
        }
      }

      // Initial mount
      root.render(<Button />);
      // Should not have flushed yet because it's async
      expect(button).toBe(undefined);
      // Flush async work
      await waitForAll([]);
      expect(button.textContent).toEqual('Count: 0');

      function click() {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(event, 'timeStamp', {
          value: 0,
        });
        button.dispatchEvent(event);
      }

      // Click the button a single time
      await act(() => click());
      // The counter should update synchronously, even in concurrent mode.
      expect(button.textContent).toEqual('Count: 1');

      // Click the button many more times
      await act(() => click());
      await act(() => click());
      await act(() => click());
      await act(() => click());
      await act(() => click());
      await act(() => click());

      // Flush the remaining work
      await waitForAll([]);
      // The counter should equal the total number of clicks
      expect(button.textContent).toEqual('Count: 7');
    });
  });

  describe('iOS bubbling click fix', function () {
    // See http://www.quirksmode.org/blog/archives/2010/09/click_event_del.html

    it('does not add a local click to interactive elements', async function () {
      container = document.createElement('div');

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<button onClick={onClick} />);
      });

      const node = container.firstChild;

      node.dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(0);
    });

    it('adds a local click listener to non-interactive elements', async function () {
      container = document.createElement('div');

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div onClick={onClick} />);
      });

      const node = container.firstChild;

      await act(() => {
        node.dispatchEvent(new MouseEvent('click'));
      });

      expect(onClick).toHaveBeenCalledTimes(0);
    });

    it('registers passive handlers for events affected by the intervention', async () => {
      container = document.createElement('div');

      const passiveEvents = [];
      const nativeAddEventListener = container.addEventListener;
      container.addEventListener = function (type, fn, options) {
        if (options !== null && typeof options === 'object') {
          if (options.passive) {
            passiveEvents.push(type);
          }
        }
        return nativeAddEventListener.apply(this, arguments);
      };

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div />);
      });

      expect(passiveEvents).toEqual([
        'touchstart',
        'touchstart',
        'touchmove',
        'touchmove',
        'wheel',
        'wheel',
      ]);
    });

    it('dispatches synthetic toggle events when the Popover API is used', async () => {
      container = document.createElement('div');

      const onToggle = jest.fn();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <>
            <button popoverTarget="popover">Toggle popover</button>
            <div id="popover" popover="" onToggle={onToggle}>
              popover content
            </div>
          </>,
        );
      });

      const target = container.querySelector('#popover');
      target.dispatchEvent(
        new ToggleEvent('toggle', {
          bubbles: false,
          cancelable: true,
          oldState: 'closed',
          newState: 'open',
        }),
      );

      expect(onToggle).toHaveBeenCalledTimes(1);
      let event = onToggle.mock.calls[0][0];
      expect(event).toEqual(
        expect.objectContaining({
          oldState: 'closed',
          newState: 'open',
        }),
      );

      target.dispatchEvent(
        new ToggleEvent('toggle', {
          bubbles: false,
          cancelable: true,
          oldState: 'open',
          newState: 'closed',
        }),
      );

      expect(onToggle).toHaveBeenCalledTimes(2);
      event = onToggle.mock.calls[1][0];
      expect(event).toEqual(
        expect.objectContaining({
          oldState: 'open',
          newState: 'closed',
        }),
      );
    });

    it('dispatches synthetic toggle events when <details> is used', async () => {
      // This test just replays browser behavior.
      // The real test would be if browsers dispatch ToggleEvent on <details>.
      // This case only exists because MDN claims <details> doesn't receive ToggleEvent.
      // However, Chrome dispatches ToggleEvent on <details> and the spec confirms that behavior: https://html.spec.whatwg.org/multipage/indices.html#event-toggle

      container = document.createElement('div');

      const onToggle = jest.fn();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <details id="details" onToggle={onToggle}>
            <summary>Summary</summary>
            Details
          </details>,
        );
      });

      const target = container.querySelector('#details');
      target.dispatchEvent(
        new ToggleEvent('toggle', {
          bubbles: false,
          cancelable: true,
          oldState: 'closed',
          newState: 'open',
        }),
      );

      expect(onToggle).toHaveBeenCalledTimes(1);
      let event = onToggle.mock.calls[0][0];
      expect(event).toEqual(
        expect.objectContaining({
          oldState: 'closed',
          newState: 'open',
        }),
      );

      target.dispatchEvent(
        new ToggleEvent('toggle', {
          bubbles: false,
          cancelable: true,
          oldState: 'open',
          newState: 'closed',
        }),
      );

      expect(onToggle).toHaveBeenCalledTimes(2);
      event = onToggle.mock.calls[1][0];
      expect(event).toEqual(
        expect.objectContaining({
          oldState: 'open',
          newState: 'closed',
        }),
      );
    });
  });

  it('includes the submitter in submit events', async function () {
    container = document.createElement('div');

    const onSubmit = jest.fn(event => {
      event.preventDefault();
    });
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <form onSubmit={onSubmit}>
          <button type="submit" id="submitter">
            Submit
          </button>
        </form>,
      );
    });

    const submitter = container.querySelector('#submitter');
    const submitEvent = new SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
      submitter: submitter,
    });
    await act(() => {
      submitter.dispatchEvent(submitEvent);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const event = onSubmit.mock.calls[0][0];
    expect(event.submitter).toBe(submitter);
  });
});
