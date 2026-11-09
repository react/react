/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {insertNodesAndExecuteScripts} from '../test-utils/FizzTestUtils';
import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;

let act;
let serverAct;
let container;
let React;
let ReactDOMServer;
let ReactDOMClient;
let Suspense;
let useFormStatus;
let useOptimistic;
let useActionState;
let assertConsoleErrorDev;

describe('ReactDOMFizzForm', () => {
  beforeEach(() => {
    jest.resetModules();
    patchMessageChannel();
    React = require('react');
    ReactDOMServer = require('react-dom/server.browser');
    ReactDOMClient = require('react-dom/client');
    Suspense = React.Suspense;
    useFormStatus = require('react-dom').useFormStatus;
    useOptimistic = require('react').useOptimistic;
    act = require('internal-test-utils').act;
    serverAct = require('internal-test-utils').serverAct;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    container = document.createElement('div');
    document.body.appendChild(container);
    // TODO: Test the old api but it warns so needs warnings to be asserted.
    // if (__VARIANT__) {
    // Remove after API is deleted.
    // useActionState = require('react-dom').useFormState;
    // }
    useActionState = require('react').useActionState;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  function submit(submitter) {
    const form = submitter.form || submitter;
    if (!submitter.form) {
      submitter = undefined;
    }
    const submitEvent = new Event('submit', {bubbles: true, cancelable: true});
    submitEvent.submitter = submitter;
    const returnValue = form.dispatchEvent(submitEvent);
    if (!returnValue) {
      return;
    }
    const action =
      (submitter && submitter.getAttribute('formaction')) || form.action;
    if (!/\s*javascript:/i.test(action)) {
      throw new Error('Navigate to: ' + action);
    }
  }

  async function readIntoContainer(stream) {
    const reader = stream.getReader();
    let result = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      result += Buffer.from(value).toString('utf8');
    }
    const temp = document.createElement('div');
    temp.innerHTML = result;
    insertNodesAndExecuteScripts(temp, container, null);
  }

  it('should allow passing a function to form action during SSR', async () => {
    const ref = React.createRef();
    let foo;

    function action(formData) {
      foo = formData.get('foo');
    }
    function App() {
      return (
        <form action={action} ref={ref}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    submit(ref.current);

    expect(foo).toBe('bar');
  });

  it('should allow passing a function to an input/button formAction', async () => {
    const inputRef = React.createRef();
    const buttonRef = React.createRef();
    let rootActionCalled = false;
    let savedTitle = null;
    let deletedTitle = null;

    function action(formData) {
      rootActionCalled = true;
    }

    function saveItem(formData) {
      savedTitle = formData.get('title');
    }

    function deleteItem(formData) {
      deletedTitle = formData.get('title');
    }

    function App() {
      return (
        <form action={action}>
          <input type="text" name="title" defaultValue="Hello" />
          <input
            type="submit"
            formAction={saveItem}
            value="Save"
            ref={inputRef}
          />
          <button formAction={deleteItem} ref={buttonRef}>
            Delete
          </button>
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe(null);

    submit(inputRef.current);
    expect(savedTitle).toBe('Hello');
    expect(deletedTitle).toBe(null);
    savedTitle = null;

    submit(buttonRef.current);
    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe('Hello');
    deletedTitle = null;

    expect(rootActionCalled).toBe(false);
  });

  it('should warn when passing a function action during SSR and string during hydration', async () => {
    function action(formData) {}
    function App({isClient}) {
      return (
        <form action={isClient ? 'action' : action}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App isClient={true} />);
    });
    assertConsoleErrorDev([
      "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. " +
        "This won't be patched up. This can happen if a SSR-ed Client Component used:\n\n" +
        "- A server/client branch `if (typeof window !== 'undefined')`.\n" +
        "- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.\n" +
        "- Date formatting in a user's locale which doesn't match the server.\n" +
        '- External changing data without sending a snapshot of it along with the HTML.\n' +
        '- Invalid HTML tag nesting.\n\n' +
        'It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.\n\n' +
        'https://react.dev/link/hydration-mismatch\n\n' +
        '  <App isClient={true}>\n' +
        '    <form\n' +
        '+     action="action"\n' +
        '-     action="function"\n' +
        '    >\n' +
        '\n    in form (at **)' +
        '\n    in App (at **)',
    ]);
  });

  it('should ideally warn when passing a string during SSR and function during hydration', async () => {
    function action(formData) {}
    function App({isClient}) {
      return (
        <form action={isClient ? action : 'action'}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    // This should ideally warn because only the client provides a function that doesn't line up.
    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App isClient={true} />);
    });
  });

  it('should reset form fields after you update away from hydrated function', async () => {
    const formRef = React.createRef();
    const inputRef = React.createRef();
    const buttonRef = React.createRef();
    function action(formData) {}
    function App({isUpdate}) {
      return (
        <form
          action={isUpdate ? 'action' : action}
          ref={formRef}
          method={isUpdate ? 'POST' : null}>
          <input
            type="submit"
            formAction={isUpdate ? 'action' : action}
            ref={inputRef}
            formTarget={isUpdate ? 'elsewhere' : null}
          />
          <button
            formAction={isUpdate ? 'action' : action}
            ref={buttonRef}
            formEncType={isUpdate ? 'multipart/form-data' : null}
          />
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    let root;
    await act(async () => {
      root = ReactDOMClient.hydrateRoot(container, <App />);
    });
    await act(async () => {
      root.render(<App isUpdate={true} />);
    });
    expect(formRef.current.getAttribute('action')).toBe('action');
    expect(formRef.current.hasAttribute('encType')).toBe(false);
    expect(formRef.current.getAttribute('method')).toBe('POST');
    expect(formRef.current.hasAttribute('target')).toBe(false);

    expect(inputRef.current.getAttribute('formAction')).toBe('action');
    expect(inputRef.current.hasAttribute('name')).toBe(false);
    expect(inputRef.current.hasAttribute('formEncType')).toBe(false);
    expect(inputRef.current.hasAttribute('formMethod')).toBe(false);
    expect(inputRef.current.getAttribute('formTarget')).toBe('elsewhere');

    expect(buttonRef.current.getAttribute('formAction')).toBe('action');
    expect(buttonRef.current.hasAttribute('name')).toBe(false);
    expect(buttonRef.current.getAttribute('formEncType')).toBe(
      'multipart/form-data',
    );
    expect(buttonRef.current.hasAttribute('formMethod')).toBe(false);
    expect(buttonRef.current.hasAttribute('formTarget')).toBe(false);
  });

  it('should reset form fields after you remove a hydrated function', async () => {
    const formRef = React.createRef();
    const inputRef = React.createRef();
    const buttonRef = React.createRef();
    function action(formData) {}
    function App({isUpdate}) {
      return (
        <form action={isUpdate ? undefined : action} ref={formRef}>
          <input
            type="submit"
            formAction={isUpdate ? undefined : action}
            ref={inputRef}
          />
          <button formAction={isUpdate ? undefined : action} ref={buttonRef} />
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    let root;
    await act(async () => {
      root = ReactDOMClient.hydrateRoot(container, <App />);
    });
    await act(async () => {
      root.render(<App isUpdate={true} />);
    });
    expect(formRef.current.hasAttribute('action')).toBe(false);
    expect(formRef.current.hasAttribute('encType')).toBe(false);
    expect(formRef.current.hasAttribute('method')).toBe(false);
    expect(formRef.current.hasAttribute('target')).toBe(false);

    expect(inputRef.current.hasAttribute('formAction')).toBe(false);
    expect(inputRef.current.hasAttribute('name')).toBe(false);
    expect(inputRef.current.hasAttribute('formEncType')).toBe(false);
    expect(inputRef.current.hasAttribute('formMethod')).toBe(false);
    expect(inputRef.current.hasAttribute('formTarget')).toBe(false);

    expect(buttonRef.current.hasAttribute('formAction')).toBe(false);
    expect(buttonRef.current.hasAttribute('name')).toBe(false);
    expect(buttonRef.current.hasAttribute('formEncType')).toBe(false);
    expect(buttonRef.current.hasAttribute('formMethod')).toBe(false);
    expect(buttonRef.current.hasAttribute('formTarget')).toBe(false);
  });

  it('should restore the form fields even if they were incorrectly set', async () => {
    const formRef = React.createRef();
    const inputRef = React.createRef();
    const buttonRef = React.createRef();
    function action(formData) {}
    function App({isUpdate}) {
      return (
        <form
          action={isUpdate ? 'action' : action}
          ref={formRef}
          method="DELETE">
          <input
            type="submit"
            formAction={isUpdate ? 'action' : action}
            ref={inputRef}
            formTarget="elsewhere"
          />
          <button
            formAction={isUpdate ? 'action' : action}
            ref={buttonRef}
            formEncType="text/plain"
          />
        </form>
      );
    }

    // Specifying the extra form fields are a DEV error, but we expect it
    // to eventually still be patched up after an update.
    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    assertConsoleErrorDev([
      'Cannot specify a encType or method for a form that specifies a function as the action. ' +
        'React provides those automatically. They will get overridden.\n' +
        '    in form (at **)\n' +
        '    in App (at **)',
      'Cannot specify a formTarget for a button that specifies a function as a formAction. ' +
        'The function will always be executed in the same window.\n' +
        '    in input (at **)\n' +
        '    in App (at **)',
    ]);
    let root;
    await act(async () => {
      root = ReactDOMClient.hydrateRoot(container, <App />);
    });
    assertConsoleErrorDev([
      "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. " +
        "This won't be patched up. This can happen if a SSR-ed Client Component used:\n\n" +
        "- A server/client branch `if (typeof window !== 'undefined')`.\n" +
        "- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.\n" +
        "- Date formatting in a user's locale which doesn't match the server.\n" +
        '- External changing data without sending a snapshot of it along with the HTML.\n' +
        '- Invalid HTML tag nesting.\n\n' +
        'It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.\n\n' +
        'https://react.dev/link/hydration-mismatch\n\n' +
        '  <App>\n' +
        '    <form\n' +
        '      action={function action}\n' +
        '      ref={{current:null}}\n' +
        '+     method="DELETE"\n' +
        '-     method={null}\n' +
        '    >\n' +
        '      <input\n' +
        '        type="submit"\n' +
        '        formAction={function action}\n' +
        '        ref={{current:null}}\n' +
        '+       formTarget="elsewhere"\n' +
        '-       formTarget={null}\n' +
        '      >\n' +
        '      <button\n' +
        '        formAction={function action}\n' +
        '        ref={{current:null}}\n' +
        '+       formEncType="text/plain"\n' +
        '-       formEncType={null}\n' +
        '      >\n' +
        '\n    in input (at **)' +
        '\n    in App (at **)',
    ]);
    await act(async () => {
      root.render(<App isUpdate={true} />);
    });
    expect(formRef.current.getAttribute('action')).toBe('action');
    expect(formRef.current.hasAttribute('encType')).toBe(false);
    expect(formRef.current.getAttribute('method')).toBe('DELETE');
    expect(formRef.current.hasAttribute('target')).toBe(false);

    expect(inputRef.current.getAttribute('formAction')).toBe('action');
    expect(inputRef.current.hasAttribute('name')).toBe(false);
    expect(inputRef.current.hasAttribute('formEncType')).toBe(false);
    expect(inputRef.current.hasAttribute('formMethod')).toBe(false);
    expect(inputRef.current.getAttribute('formTarget')).toBe('elsewhere');

    expect(buttonRef.current.getAttribute('formAction')).toBe('action');
    expect(buttonRef.current.hasAttribute('name')).toBe(false);
    expect(buttonRef.current.getAttribute('formEncType')).toBe('text/plain');
    expect(buttonRef.current.hasAttribute('formMethod')).toBe(false);
    expect(buttonRef.current.hasAttribute('formTarget')).toBe(false);
  });

  it('useFormStatus is not pending during server render', async () => {
    function App() {
      const {pending} = useFormStatus();
      return 'Pending: ' + pending;
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    expect(container.textContent).toBe('Pending: false');

    await act(() => ReactDOMClient.hydrateRoot(container, <App />));
    expect(container.textContent).toBe('Pending: false');
  });

  it('should replay a form action after hydration', async () => {
    let foo;
    function action(formData) {
      foo = formData.get('foo');
    }
    function App() {
      return (
        <form action={action}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);

    // Dispatch an event before hydration
    submit(container.getElementsByTagName('form')[0]);

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    // It should've now been replayed
    expect(foo).toBe('bar');
  });

  it('should replay input/button formAction', async () => {
    let rootActionCalled = false;
    let savedTitle = null;
    let deletedTitle = null;

    function action(formData) {
      rootActionCalled = true;
    }

    function saveItem(formData) {
      savedTitle = formData.get('title');
    }

    function deleteItem(formData) {
      deletedTitle = formData.get('title');
    }

    function App() {
      return (
        <form action={action}>
          <input type="text" name="title" defaultValue="Hello" />
          <input type="submit" formAction={saveItem} value="Save" />
          <button formAction={deleteItem}>Delete</button>
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);

    submit(container.getElementsByTagName('input')[1]);
    submit(container.getElementsByTagName('button')[0]);

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    expect(savedTitle).toBe('Hello');
    expect(deletedTitle).toBe('Hello');
    expect(rootActionCalled).toBe(false);
  });

  it('useOptimistic returns passthrough value', async () => {
    function App() {
      const [optimisticState] = useOptimistic('hi');
      return optimisticState;
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    expect(container.textContent).toBe('hi');

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
    expect(container.textContent).toBe('hi');
  });

  it('useActionState returns initial state', async () => {
    async function action(state) {
      return state;
    }

    function App() {
      const [state] = useActionState(action, 0);
      return state;
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    expect(container.textContent).toBe('0');

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
    expect(container.textContent).toBe('0');
  });

  it('can provide a custom action on the server for actions', async () => {
    const ref = React.createRef();
    let foo;

    function action(formData) {
      foo = formData.get('foo');
    }
    action.$$FORM_ACTION = function (identifierPrefix) {
      const extraFields = new FormData();
      extraFields.append(identifierPrefix + 'hello', 'world');
      return {
        action: this.name,
        name: identifierPrefix,
        method: 'POST',
        encType: 'multipart/form-data',
        target: 'self',
        data: extraFields,
      };
    };
    function App() {
      return (
        <form action={action} ref={ref} method={null}>
          <Suspense />
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);

    const form = container.firstChild;
    expect(form.getAttribute('action')).toBe('action');
    expect(form.getAttribute('method')).toBe('POST');
    expect(form.getAttribute('enctype')).toBe('multipart/form-data');
    expect(form.getAttribute('target')).toBe('self');
    const formActionName = form.firstChild.getAttribute('name');
    expect(
      container
        .querySelector('input[name="' + formActionName + 'hello"]')
        .getAttribute('value'),
    ).toBe('world');

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    submit(ref.current);

    expect(foo).toBe('bar');
  });

  it('can provide a custom action on buttons the server for actions', async () => {
    const hiddenRef = React.createRef();
    const inputRef = React.createRef();
    const buttonRef = React.createRef();
    let foo;

    function action(formData) {
      foo = formData.get('foo');
    }
    action.$$FORM_ACTION = function (identifierPrefix) {
      const extraFields = new FormData();
      extraFields.append(identifierPrefix + 'hello', 'world');
      return {
        action: this.name,
        name: identifierPrefix,
        method: 'POST',
        encType: 'multipart/form-data',
        target: 'self',
        data: extraFields,
      };
    };
    function App() {
      return (
        <form>
          <input type="hidden" name="foo" value="bar" ref={hiddenRef} />
          <input
            type="submit"
            formAction={action}
            method={null}
            ref={inputRef}
          />
          <button formAction={action} ref={buttonRef} target={null} />
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);

    const input = container.getElementsByTagName('input')[1];
    const button = container.getElementsByTagName('button')[0];
    expect(input.getAttribute('formaction')).toBe('action');
    expect(input.getAttribute('formmethod')).toBe('POST');
    expect(input.getAttribute('formenctype')).toBe('multipart/form-data');
    expect(input.getAttribute('formtarget')).toBe('self');
    expect(button.getAttribute('formaction')).toBe('action');
    expect(button.getAttribute('formmethod')).toBe('POST');
    expect(button.getAttribute('formenctype')).toBe('multipart/form-data');
    expect(button.getAttribute('formtarget')).toBe('self');
    const inputName = input.getAttribute('name');
    const buttonName = button.getAttribute('name');
    expect(
      container
        .querySelector('input[name="' + inputName + 'hello"]')
        .getAttribute('value'),
    ).toBe('world');
    expect(
      container
        .querySelector('input[name="' + buttonName + 'hello"]')
        .getAttribute('value'),
    ).toBe('world');

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    expect(hiddenRef.current.name).toBe('foo');

    submit(inputRef.current);

    expect(foo).toBe('bar');

    foo = null;

    submit(buttonRef.current);

    expect(foo).toBe('bar');
  });

  it('can hydrate hidden fields in the beginning of a form', async () => {
    const hiddenRef = React.createRef();

    let invoked = false;
    function action(formData) {
      invoked = true;
    }
    action.$$FORM_ACTION = function (identifierPrefix) {
      const extraFields = new FormData();
      extraFields.append(identifierPrefix + 'hello', 'world');
      return {
        action: '',
        name: identifierPrefix,
        method: 'POST',
        encType: 'multipart/form-data',
        data: extraFields,
      };
    };
    function App() {
      return (
        <form action={action}>
          <input type="hidden" name="bar" defaultValue="baz" ref={hiddenRef} />
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);

    const barField = container.querySelector('[name=bar]');

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    expect(hiddenRef.current).toBe(barField);

    expect(hiddenRef.current.name).toBe('bar');
    expect(hiddenRef.current.value).toBe('baz');

    expect(container.querySelectorAll('[name=bar]').length).toBe(1);

    submit(hiddenRef.current.form);

    expect(invoked).toBe(true);
  });
});
