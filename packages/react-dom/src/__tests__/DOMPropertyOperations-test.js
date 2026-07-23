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

describe('DOMPropertyOperations', () => {
  let React;
  let ReactDOMClient;
  let act;
  let assertConsoleErrorDev;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
  });

  // Sets a value in a way that React doesn't see,
  // so that a subsequent "change" event will trigger the event handler.
  const setUntrackedValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  ).set;
  const setUntrackedChecked = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'checked',
  ).set;

  describe('setValueForProperty', () => {
    it('should set values as properties by default', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div title="Tip!" />);
      });
      expect(container.firstChild.title).toBe('Tip!');
    });

    it('should set values as attributes if necessary', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div role="#" />);
      });
      expect(container.firstChild.getAttribute('role')).toBe('#');
      expect(container.firstChild.role).toBeUndefined();
    });

    it('should set values as namespace attributes if necessary', async () => {
      const container = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<image xlinkHref="about:blank" />);
      });
      expect(
        container.firstChild.getAttributeNS(
          'http://www.w3.org/1999/xlink',
          'href',
        ),
      ).toBe('about:blank');
    });

    it('should set values as boolean properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div disabled="disabled" />);
      });
      expect(container.firstChild.getAttribute('disabled')).toBe('');
      await act(() => {
        root.render(<div disabled={true} />);
      });
      expect(container.firstChild.getAttribute('disabled')).toBe('');
      await act(() => {
        root.render(<div disabled={false} />);
      });
      expect(container.firstChild.getAttribute('disabled')).toBe(null);
      await act(() => {
        root.render(<div disabled={true} />);
      });
      await act(() => {
        root.render(<div disabled={null} />);
      });
      expect(container.firstChild.getAttribute('disabled')).toBe(null);
      await act(() => {
        root.render(<div disabled={true} />);
      });
      await act(() => {
        root.render(<div disabled={undefined} />);
      });
      expect(container.firstChild.getAttribute('disabled')).toBe(null);
    });

    it('should convert attribute values to string first', async () => {
      // Browsers default to this behavior, but some test environments do not.
      // This ensures that we have consistent behavior.
      const obj = {
        toString: function () {
          return 'css-class';
        },
      };

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div className={obj} />);
      });
      expect(container.firstChild.getAttribute('class')).toBe('css-class');
    });

    it('should not remove empty attributes for special input properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input value="" onChange={() => {}} />);
      });
      if (disableInputAttributeSyncing) {
        expect(container.firstChild.hasAttribute('value')).toBe(false);
      } else {
        expect(container.firstChild.getAttribute('value')).toBe('');
      }
      expect(container.firstChild.value).toBe('');
    });

    it('should not remove empty attributes for special option properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select>
            <option value="">empty</option>
            <option>filled</option>
          </select>,
        );
      });
      // Regression test for https://github.com/facebook/react/issues/6219
      expect(container.firstChild.firstChild.value).toBe('');
      expect(container.firstChild.lastChild.value).toBe('filled');
    });

    it('should remove for falsey boolean properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div allowFullScreen={false} />);
      });
      expect(container.firstChild.hasAttribute('allowFullScreen')).toBe(false);
    });

    it('should set credentialless boolean attribute on iframes', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<iframe credentialless={true} />);
      });
      expect(container.firstChild.getAttribute('credentialless')).toBe('');
      await act(() => {
        root.render(<iframe credentialless={false} />);
      });
      expect(container.firstChild.hasAttribute('credentialless')).toBe(false);
    });

    it('should set credentialless attribute when passed a string and warn', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<iframe credentialless="true" />);
      });
      assertConsoleErrorDev([
        'Received the string `true` for the boolean attribute `credentialless`. ' +
          'Although this works, it will not work as expected if you pass the string "false". ' +
          'Did you mean credentialless={true}?\n' +
          '    in iframe (at **)',
      ]);
      expect(container.firstChild.getAttribute('credentialless')).toBe('');
    });

    it('should remove when setting custom attr to null', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div data-foo="bar" />);
      });
      expect(container.firstChild.hasAttribute('data-foo')).toBe(true);
      await act(() => {
        root.render(<div data-foo={null} />);
      });
      expect(container.firstChild.hasAttribute('data-foo')).toBe(false);
    });

    it('should set className to empty string instead of null', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div className="selected" />);
      });
      expect(container.firstChild.className).toBe('selected');
      await act(() => {
        root.render(<div className={null} />);
      });
      // className should be '', not 'null' or null (which becomes 'null' in
      // some browsers)
      expect(container.firstChild.className).toBe('');
      expect(container.firstChild.getAttribute('class')).toBe(null);
    });

    it('should remove property properly for boolean properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div hidden={true} />);
      });
      expect(container.firstChild.hasAttribute('hidden')).toBe(true);
      await act(() => {
        root.render(<div hidden={false} />);
      });
      expect(container.firstChild.hasAttribute('hidden')).toBe(false);
    });

    it('should preserve hidden until-found attribute values', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div hidden="until-found" />);
      });
      expect(container.firstChild.getAttribute('hidden')).toBe('until-found');
      await act(() => {
        root.render(<div hidden={false} />);
      });
      expect(container.firstChild.hasAttribute('hidden')).toBe(false);
    });

    it('should always assign the value attribute for non-inputs', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<progress />);
      });
      spyOnDevAndProd(container.firstChild, 'setAttribute');
      await act(() => {
        root.render(<progress value={30} />);
      });
      await act(() => {
        root.render(<progress value="30" />);
      });
      expect(container.firstChild.setAttribute).toHaveBeenCalledTimes(2);
    });

    it('should return the progress to intermediate state on null value', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<progress value={30} />);
      });
      await act(() => {
        root.render(<progress value={null} />);
      });
      // Ensure we move progress back to an indeterminate state.
      // Regression test for https://github.com/facebook/react/issues/6119
      expect(container.firstChild.hasAttribute('value')).toBe(false);
    });

    it('custom element custom events lowercase', async () => {
      const oncustomevent = jest.fn();
      function Test() {
        return <my-custom-element oncustomevent={oncustomevent} />;
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });
      container
        .querySelector('my-custom-element')
        .dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
    });

    it('custom element custom events uppercase', async () => {
      const oncustomevent = jest.fn();
      function Test() {
        return <my-custom-element onCustomevent={oncustomevent} />;
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });
      container
        .querySelector('my-custom-element')
        .dispatchEvent(new Event('Customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
    });

    it('custom element custom event with dash in name', async () => {
      const oncustomevent = jest.fn();
      function Test() {
        return <my-custom-element oncustom-event={oncustomevent} />;
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });
      container
        .querySelector('my-custom-element')
        .dispatchEvent(new Event('custom-event'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
    });

    it('custom element remove event handler', async () => {
      const oncustomevent = jest.fn();
      function Test(props) {
        return <my-custom-element oncustomevent={props.handler} />;
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test handler={oncustomevent} />);
      });
      const customElement = container.querySelector('my-custom-element');
      customElement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<Test handler={false} />);
      });
      // Make sure that the second render didn't create a new element. We want
      // to make sure removeEventListener actually gets called on the same element.
      expect(customElement).toBe(customElement);
      customElement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<Test handler={oncustomevent} />);
      });
      customElement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(2);

      const oncustomevent2 = jest.fn();
      await act(() => {
        root.render(<Test handler={oncustomevent2} />);
      });
      customElement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(2);
      expect(oncustomevent2).toHaveBeenCalledTimes(1);
    });

    it('custom elements shouldnt have non-functions for on* attributes treated as event listeners', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <my-custom-element
            onstring={'hello'}
            onobj={{hello: 'world'}}
            onarray={['one', 'two']}
            ontrue={true}
            onfalse={false}
          />,
        );
      });
      const customElement = container.querySelector('my-custom-element');
      expect(customElement.getAttribute('onstring')).toBe('hello');
      expect(customElement.getAttribute('onobj')).toBe('[object Object]');
      expect(customElement.getAttribute('onarray')).toBe('one,two');
      expect(customElement.getAttribute('ontrue')).toBe('');
      expect(customElement.getAttribute('onfalse')).toBe(null);

      // Dispatch the corresponding event names to make sure that nothing crashes.
      customElement.dispatchEvent(new Event('string'));
      customElement.dispatchEvent(new Event('obj'));
      customElement.dispatchEvent(new Event('array'));
      customElement.dispatchEvent(new Event('true'));
      customElement.dispatchEvent(new Event('false'));
    });

    it('custom elements should still have onClick treated like regular elements', async () => {
      let syntheticClickEvent = null;
      const syntheticEventHandler = jest.fn(
        event => (syntheticClickEvent = event),
      );
      let nativeClickEvent = null;
      const nativeEventHandler = jest.fn(event => (nativeClickEvent = event));
      function Test() {
        return <my-custom-element onClick={syntheticEventHandler} />;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });

      const customElement = container.querySelector('my-custom-element');
      customElement.onclick = nativeEventHandler;
      container.querySelector('my-custom-element').click();

      expect(nativeEventHandler).toHaveBeenCalledTimes(1);
      expect(syntheticEventHandler).toHaveBeenCalledTimes(1);
      expect(syntheticClickEvent.nativeEvent).toBe(nativeClickEvent);
    });

    it('custom elements should have working onChange event listeners', async () => {
      let reactChangeEvent = null;
      const eventHandler = jest.fn(event => (reactChangeEvent = event));
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element onChange={eventHandler} />);
      });
      const customElement = container.querySelector('my-custom-element');
      let expectedHandlerCallCount = 0;

      const changeEvent = new Event('change', {bubbles: true});
      customElement.dispatchEvent(changeEvent);
      expectedHandlerCallCount++;
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
      expect(reactChangeEvent.nativeEvent).toBe(changeEvent);

      // Also make sure that removing and re-adding the event listener works
      await act(() => {
        root.render(<my-custom-element />);
      });
      customElement.dispatchEvent(new Event('change', {bubbles: true}));
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
      await act(() => {
        root.render(<my-custom-element onChange={eventHandler} />);
      });
      customElement.dispatchEvent(new Event('change', {bubbles: true}));
      expectedHandlerCallCount++;
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
    });

    it('custom elements should have working onInput event listeners', async () => {
      let reactInputEvent = null;
      const eventHandler = jest.fn(event => (reactInputEvent = event));
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element onInput={eventHandler} />);
      });
      const customElement = container.querySelector('my-custom-element');
      let expectedHandlerCallCount = 0;

      const inputEvent = new Event('input', {bubbles: true});
      customElement.dispatchEvent(inputEvent);
      expectedHandlerCallCount++;
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
      expect(reactInputEvent.nativeEvent).toBe(inputEvent);

      // Also make sure that removing and re-adding the event listener works
      await act(() => {
        root.render(<my-custom-element />);
      });
      customElement.dispatchEvent(new Event('input', {bubbles: true}));
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
      await act(() => {
        root.render(<my-custom-element onInput={eventHandler} />);
      });
      customElement.dispatchEvent(new Event('input', {bubbles: true}));
      expectedHandlerCallCount++;
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
    });

    it('custom elements should have separate onInput and onChange handling', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const inputEventHandler = jest.fn();
      const changeEventHandler = jest.fn();
      await act(() => {
        root.render(
          <my-custom-element
            onInput={inputEventHandler}
            onChange={changeEventHandler}
          />,
        );
      });
      const customElement = container.querySelector('my-custom-element');

      customElement.dispatchEvent(new Event('input', {bubbles: true}));
      expect(inputEventHandler).toHaveBeenCalledTimes(1);
      expect(changeEventHandler).toHaveBeenCalledTimes(0);

      customElement.dispatchEvent(new Event('change', {bubbles: true}));
      expect(inputEventHandler).toHaveBeenCalledTimes(1);
      expect(changeEventHandler).toHaveBeenCalledTimes(1);
    });

    it('custom elements should be able to remove and re-add custom event listeners', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const eventHandler = jest.fn();
      await act(() => {
        root.render(<my-custom-element oncustomevent={eventHandler} />);
      });

      const customElement = container.querySelector('my-custom-element');
      customElement.dispatchEvent(new Event('customevent'));
      expect(eventHandler).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<my-custom-element />);
      });
      customElement.dispatchEvent(new Event('customevent'));
      expect(eventHandler).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<my-custom-element oncustomevent={eventHandler} />);
      });
      customElement.dispatchEvent(new Event('customevent'));
      expect(eventHandler).toHaveBeenCalledTimes(2);
    });

    it('<input is=...> should have the same onChange/onInput/onClick behavior as <input>', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const regularOnInputHandler = jest.fn();
      const regularOnChangeHandler = jest.fn();
      const regularOnClickHandler = jest.fn();
      const customOnInputHandler = jest.fn();
      const customOnChangeHandler = jest.fn();
      const customOnClickHandler = jest.fn();
      function clearMocks() {
        regularOnInputHandler.mockClear();
        regularOnChangeHandler.mockClear();
        regularOnClickHandler.mockClear();
        customOnInputHandler.mockClear();
        customOnChangeHandler.mockClear();
        customOnClickHandler.mockClear();
      }
      await act(() => {
        root.render(
          <div>
            <input
              onInput={regularOnInputHandler}
              onChange={regularOnChangeHandler}
              onClick={regularOnClickHandler}
            />
            <input
              is="my-custom-element"
              onInput={customOnInputHandler}
              onChange={customOnChangeHandler}
              onClick={customOnClickHandler}
            />
          </div>,
        );
      });

      const regularInput = container.querySelector(
        'input:not([is=my-custom-element])',
      );
      const customInput = container.querySelector(
        'input[is=my-custom-element]',
      );
      expect(regularInput).not.toBe(customInput);

      // Typing should trigger onInput and onChange for both kinds of inputs.
      clearMocks();
      setUntrackedValue.call(regularInput, 'hello');
      regularInput.dispatchEvent(new Event('input', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(1);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      setUntrackedValue.call(customInput, 'hello');
      customInput.dispatchEvent(new Event('input', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(1);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);

      // The native change event itself does not produce extra React events.
      clearMocks();
      regularInput.dispatchEvent(new Event('change', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      customInput.dispatchEvent(new Event('change', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);

      // The click event is handled by both inputs.
      clearMocks();
      regularInput.dispatchEvent(new Event('click', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(1);
      customInput.dispatchEvent(new Event('click', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(1);

      // Typing again should trigger onInput and onChange for both kinds of inputs.
      clearMocks();
      setUntrackedValue.call(regularInput, 'goodbye');
      regularInput.dispatchEvent(new Event('input', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(1);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      setUntrackedValue.call(customInput, 'goodbye');
      customInput.dispatchEvent(new Event('input', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(1);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);
    });

    it('<input type=radio is=...> should have the same onChange/onInput/onClick behavior as <input type=radio>', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const regularOnInputHandler = jest.fn();
      const regularOnChangeHandler = jest.fn();
      const regularOnClickHandler = jest.fn();
      const customOnInputHandler = jest.fn();
      const customOnChangeHandler = jest.fn();
      const customOnClickHandler = jest.fn();
      function clearMocks() {
        regularOnInputHandler.mockClear();
        regularOnChangeHandler.mockClear();
        regularOnClickHandler.mockClear();
        customOnInputHandler.mockClear();
        customOnChangeHandler.mockClear();
        customOnClickHandler.mockClear();
      }
      await act(() => {
        root.render(
          <div>
            <input
              type="radio"
              onInput={regularOnInputHandler}
              onChange={regularOnChangeHandler}
              onClick={regularOnClickHandler}
            />
            <input
              is="my-custom-element"
              type="radio"
              onInput={customOnInputHandler}
              onChange={customOnChangeHandler}
              onClick={customOnClickHandler}
            />
          </div>,
        );
      });

      const regularInput = container.querySelector(
        'input:not([is=my-custom-element])',
      );
      const customInput = container.querySelector(
        'input[is=my-custom-element]',
      );
      expect(regularInput).not.toBe(customInput);

      // Clicking should trigger onClick and onChange on both inputs.
      clearMocks();
      setUntrackedChecked.call(regularInput, true);
      regularInput.dispatchEvent(new Event('click', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(1);
      setUntrackedChecked.call(customInput, true);
      customInput.dispatchEvent(new Event('click', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(1);

      // The native input event only produces a React onInput event.
      clearMocks();
      regularInput.dispatchEvent(new Event('input', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(1);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      customInput.dispatchEvent(new Event('input', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(1);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);

      // Clicking again should trigger onClick and onChange on both inputs.
      clearMocks();
      setUntrackedChecked.call(regularInput, false);
      regularInput.dispatchEvent(new Event('click', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(1);
      setUntrackedChecked.call(customInput, false);
      customInput.dispatchEvent(new Event('click', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(1);
    });

    it('<select is=...> should have the same onChange/onInput/onClick behavior as <select>', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const regularOnInputHandler = jest.fn();
      const regularOnChangeHandler = jest.fn();
      const regularOnClickHandler = jest.fn();
      const customOnInputHandler = jest.fn();
      const customOnChangeHandler = jest.fn();
      const customOnClickHandler = jest.fn();
      function clearMocks() {
        regularOnInputHandler.mockClear();
        regularOnChangeHandler.mockClear();
        regularOnClickHandler.mockClear();
        customOnInputHandler.mockClear();
        customOnChangeHandler.mockClear();
        customOnClickHandler.mockClear();
      }
      await act(() => {
        root.render(
          <div>
            <select
              onInput={regularOnInputHandler}
              onChange={regularOnChangeHandler}
              onClick={regularOnClickHandler}
            />
            <select
              is="my-custom-element"
              onInput={customOnInputHandler}
              onChange={customOnChangeHandler}
              onClick={customOnClickHandler}
            />
          </div>,
        );
      });

      const regularSelect = container.querySelector(
        'select:not([is=my-custom-element])',
      );
      const customSelect = container.querySelector(
        'select[is=my-custom-element]',
      );
      expect(regularSelect).not.toBe(customSelect);

      // Clicking should only trigger onClick on both inputs.
      clearMocks();
      regularSelect.dispatchEvent(new Event('click', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(1);
      customSelect.dispatchEvent(new Event('click', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(1);

      // Native input event should only trigger onInput on both inputs.
      clearMocks();
      regularSelect.dispatchEvent(new Event('input', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(1);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      customSelect.dispatchEvent(new Event('input', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(1);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);

      // Native change event should trigger onChange.
      clearMocks();
      regularSelect.dispatchEvent(new Event('change', {bubbles: true}));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      customSelect.dispatchEvent(new Event('change', {bubbles: true}));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);
    });

    it('onChange/onInput/onClick on div with various types of children', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = jest.fn();
      const onInputHandler = jest.fn();
      const onClickHandler = jest.fn();
      function clearMocks() {
        onChangeHandler.mockClear();
        onInputHandler.mockClear();
        onClickHandler.mockClear();
      }
      await act(() => {
        root.render(
          <div
            onChange={onChangeHandler}
            onInput={onInputHandler}
            onClick={onClickHandler}>
            <my-custom-element />
            <input />
            <input is="my-custom-element" />
          </div>,
        );
      });
      const customElement = container.querySelector('my-custom-element');
      const regularInput = container.querySelector(
        'input:not([is="my-custom-element"])',
      );
      const customInput = container.querySelector(
        'input[is="my-custom-element"]',
      );
      expect(regularInput).not.toBe(customInput);

      // Custom element has no special logic for input/change.
      clearMocks();
      customElement.dispatchEvent(new Event('input', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(0);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      customElement.dispatchEvent(new Event('change', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      customElement.dispatchEvent(new Event('click', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(1);

      // Regular input treats browser input as onChange.
      clearMocks();
      setUntrackedValue.call(regularInput, 'hello');
      regularInput.dispatchEvent(new Event('input', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      regularInput.dispatchEvent(new Event('change', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      regularInput.dispatchEvent(new Event('click', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(1);

      // Custom input treats browser input as onChange.
      clearMocks();
      setUntrackedValue.call(customInput, 'hello');
      customInput.dispatchEvent(new Event('input', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      customInput.dispatchEvent(new Event('change', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      customInput.dispatchEvent(new Event('click', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(1);
    });

    it('custom element onChange/onInput/onClick with event target input child', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = jest.fn();
      const onInputHandler = jest.fn();
      const onClickHandler = jest.fn();
      await act(() => {
        root.render(
          <my-custom-element
            onChange={onChangeHandler}
            onInput={onInputHandler}
            onClick={onClickHandler}>
            <input />
          </my-custom-element>,
        );
      });

      const input = container.querySelector('input');
      setUntrackedValue.call(input, 'hello');
      input.dispatchEvent(new Event('input', {bubbles: true}));
      // Simulated onChange from the child's input event
      // bubbles to the parent custom element.
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      // Consequently, the native change event is ignored.
      input.dispatchEvent(new Event('change', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      input.dispatchEvent(new Event('click', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(1);
    });

    it('custom element onChange/onInput/onClick with event target div child', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = jest.fn();
      const onInputHandler = jest.fn();
      const onClickHandler = jest.fn();
      await act(() => {
        root.render(
          <my-custom-element
            onChange={onChangeHandler}
            onInput={onInputHandler}
            onClick={onClickHandler}>
            <div />
          </my-custom-element>,
        );
      });

      const div = container.querySelector('div');
      div.dispatchEvent(new Event('input', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(0);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);

      div.dispatchEvent(new Event('change', {bubbles: true}));
      // React always ignores change event invoked on non-custom and non-input targets.
      // So change event emitted on a div does not propagate upwards.
      expect(onChangeHandler).toBeCalledTimes(0);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);

      div.dispatchEvent(new Event('click', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(0);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(1);
    });

    it('div onChange/onInput/onClick with event target div child', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = jest.fn();
      const onInputHandler = jest.fn();
      const onClickHandler = jest.fn();
      await act(() => {
        root.render(
          <div
            onChange={onChangeHandler}
            onInput={onInputHandler}
            onClick={onClickHandler}>
            <div />
          </div>,
        );
      });

      const div = container.querySelector('div > div');
      div.dispatchEvent(new Event('input', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(0);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);

      div.dispatchEvent(new Event('change', {bubbles: true}));
      // React always ignores change event invoked on non-custom and non-input targets.
      // So change event emitted on a div does not propagate upwards.
      expect(onChangeHandler).toBeCalledTimes(0);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);

      div.dispatchEvent(new Event('click', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(0);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(1);
    });

    it('custom element onChange/onInput/onClick with event target custom element child', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = jest.fn();
      const onInputHandler = jest.fn();
      const onClickHandler = jest.fn();
      await act(() => {
        root.render(
          <my-custom-element
            onChange={onChangeHandler}
            onInput={onInputHandler}
            onClick={onClickHandler}>
            <other-custom-element />
          </my-custom-element>,
        );
      });

      const customChild = container.querySelector('other-custom-element');
      customChild.dispatchEvent(new Event('input', {bubbles: true}));
      // There is no simulated onChange, only raw onInput is dispatched.
      expect(onChangeHandler).toBeCalledTimes(0);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      // The native change event propagates to the parent as onChange.
      customChild.dispatchEvent(new Event('change', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(0);
      customChild.dispatchEvent(new Event('click', {bubbles: true}));
      expect(onChangeHandler).toBeCalledTimes(1);
      expect(onInputHandler).toBeCalledTimes(1);
      expect(onClickHandler).toBeCalledTimes(1);
    });

    it('custom elements should allow custom events with capture event listeners', async () => {
      const oncustomeventCapture = jest.fn();
      const oncustomevent = jest.fn();
      function Test() {
        return (
          <my-custom-element
            oncustomeventCapture={oncustomeventCapture}
            oncustomevent={oncustomevent}>
            <div />
          </my-custom-element>
        );
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });
      container
        .querySelector('my-custom-element > div')
        .dispatchEvent(new Event('customevent', {bubbles: false}));
      expect(oncustomeventCapture).toHaveBeenCalledTimes(1);
      expect(oncustomevent).toHaveBeenCalledTimes(0);
    });

    it('innerHTML should not work on custom elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element innerHTML="foo" />);
      });
      const customElement = container.querySelector('my-custom-element');
      expect(customElement.getAttribute('innerHTML')).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);

      // Render again to verify the update codepath doesn't accidentally let
      // something through.
      await act(() => {
        root.render(<my-custom-element innerHTML="bar" />);
      });
      expect(customElement.getAttribute('innerHTML')).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);
    });

    it('innerText should not work on custom elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element innerText="foo" />);
      });
      const customElement = container.querySelector('my-custom-element');
      expect(customElement.getAttribute('innerText')).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);

      // Render again to verify the update codepath doesn't accidentally let
      // something through.
      await act(() => {
        root.render(<my-custom-element innerText="bar" />);
      });
      expect(customElement.getAttribute('innerText')).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);
    });

    it('textContent should not work on custom elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element textContent="foo" />);
      });
      const customElement = container.querySelector('my-custom-element');
      expect(customElement.getAttribute('textContent')).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);

      // Render again to verify the update codepath doesn't accidentally let
      // something through.
      await act(() => {
        root.render(<my-custom-element textContent="bar" />);
      });
      expect(customElement.getAttribute('textContent')).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);
    });

    it('values should not be converted to booleans when assigning into custom elements', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element />);
      });
      const customElement = container.querySelector('my-custom-element');
      customElement.foo = null;

      // true => string
      await act(() => {
        root.render(<my-custom-element foo={true} />);
      });
      expect(customElement.foo).toBe(true);
      await act(() => {
        root.render(<my-custom-element foo="bar" />);
      });
      expect(customElement.foo).toBe('bar');

      // false => string
      await act(() => {
        root.render(<my-custom-element foo={false} />);
      });
      expect(customElement.foo).toBe(false);
      await act(() => {
        root.render(<my-custom-element foo="bar" />);
      });
      expect(customElement.foo).toBe('bar');

      // true => null
      await act(() => {
        root.render(<my-custom-element foo={true} />);
      });
      expect(customElement.foo).toBe(true);
      await act(() => {
        root.render(<my-custom-element foo={null} />);
      });
      expect(customElement.foo).toBe(null);

      // false => null
      await act(() => {
        root.render(<my-custom-element foo={false} />);
      });
      expect(customElement.foo).toBe(false);
      await act(() => {
        root.render(<my-custom-element foo={null} />);
      });
      expect(customElement.foo).toBe(null);
    });

    it('boolean props should not be stringified in attributes', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element foo={true} />);
      });
      const customElement = container.querySelector('my-custom-element');

      expect(customElement.getAttribute('foo')).toBe('');

      // true => false
      await act(() => {
        root.render(<my-custom-element foo={false} />);
      });

      expect(customElement.getAttribute('foo')).toBe(null);
    });

    it('custom element custom event handlers assign multiple types', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const oncustomevent = jest.fn();

      // First render with string
      await act(() => {
        root.render(<my-custom-element oncustomevent={'foo'} />);
      });
      const customelement = container.querySelector('my-custom-element');
      customelement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(0);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute('oncustomevent')).toBe('foo');

      // string => event listener
      await act(() => {
        root.render(<my-custom-element oncustomevent={oncustomevent} />);
      });
      customelement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute('oncustomevent')).toBe(null);

      // event listener => string
      await act(() => {
        root.render(<my-custom-element oncustomevent={'foo'} />);
      });
      customelement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute('oncustomevent')).toBe('foo');

      // string => nothing
      await act(() => {
        root.render(<my-custom-element />);
      });
      customelement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute('oncustomevent')).toBe(null);

      // nothing => event listener
      await act(() => {
        root.render(<my-custom-element oncustomevent={oncustomevent} />);
      });
      customelement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(2);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute('oncustomevent')).toBe(null);
    });

    it('custom element custom event handlers assign multiple types with setter', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const oncustomevent = jest.fn();

      // First render with nothing
      await act(() => {
        root.render(<my-custom-element />);
      });
      const customelement = container.querySelector('my-custom-element');
      // Install a setter to activate the `in` heuristic
      Object.defineProperty(customelement, 'oncustomevent', {
        set: function (x) {
          this._oncustomevent = x;
        },
        get: function () {
          return this._oncustomevent;
        },
      });
      expect(customelement.oncustomevent).toBe(undefined);

      // nothing => event listener
      await act(() => {
        root.render(<my-custom-element oncustomevent={oncustomevent} />);
      });
      customelement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe(null);
      expect(customelement.getAttribute('oncustomevent')).toBe(null);

      // event listener => string
      await act(() => {
        root.render(<my-custom-element oncustomevent={'foo'} />);
      });
      customelement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe('foo');
      expect(customelement.getAttribute('oncustomevent')).toBe(null);

      // string => event listener
      await act(() => {
        root.render(<my-custom-element oncustomevent={oncustomevent} />);
      });
      customelement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(2);
      expect(customelement.oncustomevent).toBe(null);
      expect(customelement.getAttribute('oncustomevent')).toBe(null);

      // event listener => nothing
      await act(() => {
        root.render(<my-custom-element />);
      });
      customelement.dispatchEvent(new Event('customevent'));
      expect(oncustomevent).toHaveBeenCalledTimes(2);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute('oncustomevent')).toBe(null);
    });

    it('assigning to a custom element property should not remove attributes', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element foo="one" />);
      });
      const customElement = container.querySelector('my-custom-element');
      expect(customElement.getAttribute('foo')).toBe('one');

      // Install a setter to activate the `in` heuristic
      Object.defineProperty(customElement, 'foo', {
        set: function (x) {
          this._foo = x;
        },
        get: function () {
          return this._foo;
        },
      });
      await act(() => {
        root.render(<my-custom-element foo="two" />);
      });
      expect(customElement.foo).toBe('two');
      expect(customElement.getAttribute('foo')).toBe('one');
    });

    it('custom element properties should accept functions', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element />);
      });
      const customElement = container.querySelector('my-custom-element');

      // Install a setter to activate the `in` heuristic
      Object.defineProperty(customElement, 'foo', {
        set: function (x) {
          this._foo = x;
        },
        get: function () {
          return this._foo;
        },
      });
      function myFunction() {
        return 'this is myFunction';
      }
      await act(() => {
        root.render(<my-custom-element foo={myFunction} />);
      });
      expect(customElement.foo).toBe(myFunction);

      // Also remove and re-add the property for good measure
      await act(() => {
        root.render(<my-custom-element />);
      });
      expect(customElement.foo).toBe(undefined);
      await act(() => {
        root.render(<my-custom-element foo={myFunction} />);
      });
      expect(customElement.foo).toBe(myFunction);
    });

    it('switching between null and undefined should update a property', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element foo={undefined} />);
      });
      const customElement = container.querySelector('my-custom-element');
      customElement.foo = undefined;

      await act(() => {
        root.render(<my-custom-element foo={null} />);
      });
      expect(customElement.foo).toBe(null);

      await act(() => {
        root.render(<my-custom-element foo={undefined} />);
      });
      expect(customElement.foo).toBe(undefined);
    });

    it('warns when using popoverTarget={HTMLElement}', async () => {
      const popoverTarget = document.createElement('div');
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <button key="one" popoverTarget={popoverTarget}>
            Toggle popover
          </button>,
        );
      });

      assertConsoleErrorDev([
        'The `popoverTarget` prop expects the ID of an Element as a string. Received HTMLDivElement {} instead.\n' +
          '    in button (at **)',
      ]);

      // Dedupe warning
      await act(() => {
        root.render(
          <button key="two" popoverTarget={popoverTarget}>
            Toggle popover
          </button>,
        );
      });
    });
  });

  describe('deleteValueForProperty', () => {
    it('should remove attributes for normal properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div title="foo" />);
      });
      expect(container.firstChild.getAttribute('title')).toBe('foo');
      await act(() => {
        root.render(<div />);
      });
      expect(container.firstChild.getAttribute('title')).toBe(null);
    });

    it('should not remove attributes for special properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <input type="text" value="foo" onChange={function () {}} />,
        );
      });
      if (disableInputAttributeSyncing) {
        expect(container.firstChild.hasAttribute('value')).toBe(false);
      } else {
        expect(container.firstChild.getAttribute('value')).toBe('foo');
      }
      expect(container.firstChild.value).toBe('foo');
      await act(() => {
        root.render(<input type="text" onChange={function () {}} />);
      });
      assertConsoleErrorDev([
        'A component is changing a controlled input to be uncontrolled. ' +
          'This is likely caused by the value changing from a defined to undefined, ' +
          'which should not happen. Decide between using a controlled or uncontrolled ' +
          'input element for the lifetime of the component. ' +
          'More info: https://react.dev/link/controlled-components\n' +
          '    in input (at **)',
      ]);
      if (disableInputAttributeSyncing) {
        expect(container.firstChild.hasAttribute('value')).toBe(false);
      } else {
        expect(container.firstChild.getAttribute('value')).toBe('foo');
      }
      expect(container.firstChild.value).toBe('foo');
    });

    it('should not remove attributes for custom component tag', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-icon size="5px" />);
      });
      expect(container.firstChild.getAttribute('size')).toBe('5px');
    });

    it('custom elements should remove by setting undefined to restore defaults', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<my-custom-element />);
      });
      const customElement = container.querySelector('my-custom-element');

      // Non-setter but existing property to active the `in` heuristic
      customElement.raw = 1;

      // Install a setter to activate the `in` heuristic
      Object.defineProperty(customElement, 'object', {
        set: function (value = null) {
          this._object = value;
        },
        get: function () {
          return this._object;
        },
      });

      Object.defineProperty(customElement, 'string', {
        set: function (value = '') {
          this._string = value;
        },
        get: function () {
          return this._string;
        },
      });

      const obj = {};
      await act(() => {
        root.render(<my-custom-element raw={2} object={obj} string="hi" />);
      });
      expect(customElement.raw).toBe(2);
      expect(customElement.object).toBe(obj);
      expect(customElement.string).toBe('hi');

      // Removing the properties should reset to defaults by passing undefined
      await act(() => {
        root.render(<my-custom-element />);
      });
      expect(customElement.raw).toBe(undefined);
      expect(customElement.object).toBe(null);
      expect(customElement.string).toBe('');
    });
  });
});
