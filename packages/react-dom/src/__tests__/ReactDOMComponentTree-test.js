/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOMComponentTree', () => {
  let React;
  let ReactDOMClient;
  let act;
  let container;
  let assertConsoleErrorDev;

  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('finds nodes for instances on events', async () => {
    const mouseOverID = 'mouseOverID';
    const clickID = 'clickID';
    let currentTargetID = null;
    // the current target of an event is set to result of getNodeFromInstance
    // when an event is dispatched so we can test behavior by invoking
    // events on elements in the tree and confirming the expected node is
    // set as the current target
    function Component() {
      const handler = e => {
        currentTargetID = e.currentTarget.id;
      };

      return (
        <div id={mouseOverID} onMouseOver={handler}>
          <div id={clickID} onClick={handler} />
        </div>
      );
    }

    function simulateMouseEvent(elem, type) {
      const event = new MouseEvent(type, {
        bubbles: true,
      });
      elem.dispatchEvent(event);
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(currentTargetID).toBe(null);
    simulateMouseEvent(document.getElementById(mouseOverID), 'mouseover');
    expect(currentTargetID).toBe(mouseOverID);
    simulateMouseEvent(document.getElementById(clickID), 'click');
    expect(currentTargetID).toBe(clickID);
  });

  it('finds closest instance for node when an event happens', async () => {
    const nonReactElemID = 'aID';
    const innerHTML = {__html: `<div id="${nonReactElemID}"></div>`};
    const closestInstanceID = 'closestInstance';
    let currentTargetID = null;

    function ClosestInstance() {
      const onClick = e => {
        currentTargetID = e.currentTarget.id;
      };

      return (
        <div
          id={closestInstanceID}
          onClick={onClick}
          dangerouslySetInnerHTML={innerHTML}
        />
      );
    }

    function simulateClick(elem) {
      const event = new MouseEvent('click', {
        bubbles: true,
      });
      elem.dispatchEvent(event);
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <section>
          <ClosestInstance />
        </section>,
      );
    });
    expect(currentTargetID).toBe(null);
    simulateClick(document.getElementById(nonReactElemID));
    expect(currentTargetID).toBe(closestInstanceID);
  });

  it('updates event handlers from fiber props', async () => {
    let action = '';
    let flip;
    const handlerA = () => (action = 'A');
    const handlerB = () => (action = 'B');

    function simulateMouseOver(target) {
      const event = new MouseEvent('mouseover', {
        bubbles: true,
      });
      target.dispatchEvent(event);
    }

    function HandlerFlipper() {
      const [flipVal, setFlipVal] = React.useState(false);
      flip = () => setFlipVal(true);

      return <div id="update" onMouseOver={flipVal ? handlerB : handlerA} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<HandlerFlipper key="1" />);
    });
    const node = container.firstChild;

    await act(() => {
      simulateMouseOver(node);
    });
    expect(action).toEqual('A');
    action = '';

    // Render with the other event handler.
    await act(() => {
      flip();
    });
    await act(() => {
      simulateMouseOver(node);
    });
    expect(action).toEqual('B');
  });

  it('finds a controlled instance from node and gets its current fiber props', async () => {
    let inputRef;
    const inputID = 'inputID';
    const startValue = undefined;
    const finishValue = 'finish';

    function Controlled() {
      const [state, setState] = React.useState(startValue);
      const ref = React.useRef();
      inputRef = ref;
      const onChange = e => setState(e.currentTarget.value);

      return (
        <input
          id={inputID}
          type="text"
          ref={ref}
          value={state}
          onChange={onChange}
        />
      );
    }

    const setUntrackedInputValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    ).set;

    function simulateInput(elem, value) {
      const inputEvent = new Event('input', {
        bubbles: true,
      });
      setUntrackedInputValue.call(elem, value);
      elem.dispatchEvent(inputEvent);
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Controlled />);
    });

    await act(() => {
      simulateInput(inputRef.current, finishValue);
    });
    assertConsoleErrorDev([
      'A component is changing an uncontrolled input to be controlled. ' +
        'This is likely caused by the value changing from undefined to ' +
        'a defined value, which should not happen. ' +
        'Decide between using a controlled or uncontrolled input ' +
        'element for the lifetime of the component. More info: ' +
        'https://react.dev/link/controlled-components\n' +
        '    in input (at **)\n' +
        '    in Controlled (at **)',
    ]);
  });
});
