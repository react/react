/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {insertNodesAndExecuteScripts} from 'react-dom/src/test-utils/FizzTestUtils';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Polyfill stream methods on JSDOM.
global.Blob.prototype.stream = function () {
  const impl = Object.getOwnPropertySymbols(this)[0];
  const buffer = this[impl]._buffer;
  return new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(buffer));
      c.close();
    },
  });
};

global.Blob.prototype.text = async function () {
  const impl = Object.getOwnPropertySymbols(this)[0];
  return this[impl]._buffer.toString('utf8');
};

// Don't wait before processing work on the server.
// TODO: we can replace this with FlightServer.act().
global.setTimeout = cb => cb();

let container;
let clientExports;
let serverExports;
let webpackMap;
let webpackServerMap;
let React;
let ReactDOMServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let ReactDOMClient;
let useActionState;
let act;
let assertConsoleErrorDev;

describe('ReactFlightDOMForm', () => {
  beforeEach(() => {
    jest.resetModules();
    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.edge'),
    );
    ReactServerDOMServer = require('react-server-dom-webpack/server.edge');
    const WebpackMock = require('./utils/WebpackMock');
    clientExports = WebpackMock.clientExports;
    serverExports = WebpackMock.serverExports;
    webpackMap = WebpackMock.webpackMap;
    webpackServerMap = WebpackMock.webpackServerMap;
    __unmockReact();
    jest.resetModules();
    React = require('react');
    ReactServerDOMClient = require('react-server-dom-webpack/client.edge');
    ReactDOMServer = require('react-dom/server.edge');
    ReactDOMClient = require('react-dom/client');
    act = React.act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    // TODO: Test the old api but it warns so needs warnings to be asserted.
    // if (__VARIANT__) {
    // Remove after API is deleted.
    // useActionState = require('react-dom').useFormState;
    // }
    useActionState = require('react').useActionState;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  async function POST(formData) {
    const boundAction = await ReactServerDOMServer.decodeAction(
      formData,
      webpackServerMap,
    );
    const returnValue = boundAction();
    const formState = await ReactServerDOMServer.decodeFormState(
      await returnValue,
      formData,
      webpackServerMap,
    );
    return {returnValue, formState};
  }

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
      const method = (submitter && submitter.formMethod) || form.method;
      const encType = (submitter && submitter.formEnctype) || form.enctype;
      if (method === 'post' && encType === 'multipart/form-data') {
        const formData = new FormData(form, submitter);
        return POST(formData);
      }
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

  it('can submit a passed server action without hydrating it', async () => {
    let foo = null;

    const serverAction = serverExports(function action(formData) {
      foo = formData.get('foo');
      return 'hello';
    });
    function App() {
      return (
        <form action={serverAction}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }
    const rscStream = ReactServerDOMServer.renderToReadableStream(<App />);
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    const form = container.firstChild;

    expect(foo).toBe(null);

    const {returnValue} = await submit(form);

    expect(returnValue).toBe('hello');
    expect(foo).toBe('bar');
  });

  it('can submit an imported server action without hydrating it', async () => {
    let foo = null;

    const ServerModule = serverExports(function action(formData) {
      foo = formData.get('foo');
      return 'hi';
    });
    const serverAction = ReactServerDOMClient.createServerReference(
      ServerModule.$$id,
    );
    function App() {
      return (
        <form action={serverAction}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }

    const ssrStream = await ReactDOMServer.renderToReadableStream(<App />);
    await readIntoContainer(ssrStream);

    const form = container.firstChild;

    expect(foo).toBe(null);

    const {returnValue} = await submit(form);

    expect(returnValue).toBe('hi');

    expect(foo).toBe('bar');
  });

  it('can submit a complex closure server action without hydrating it', async () => {
    let foo = null;

    const serverAction = serverExports(function action(bound, formData) {
      foo = formData.get('foo') + bound.complex;
      return 'hello';
    });
    function App() {
      return (
        <form action={serverAction.bind(null, {complex: 'object'})}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }
    const rscStream = ReactServerDOMServer.renderToReadableStream(<App />);
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    const form = container.firstChild;

    expect(foo).toBe(null);

    const {returnValue} = await submit(form);

    expect(returnValue).toBe('hello');
    expect(foo).toBe('barobject');
  });

  it('can submit a multiple complex closure server action without hydrating it', async () => {
    let foo = null;

    const serverAction = serverExports(function action(bound, formData) {
      foo = formData.get('foo') + bound.complex;
      return 'hello' + bound.complex;
    });
    function App() {
      return (
        <form action={serverAction.bind(null, {complex: 'a'})}>
          <input type="text" name="foo" defaultValue="bar" />
          <button formAction={serverAction.bind(null, {complex: 'b'})} />
          <button formAction={serverAction.bind(null, {complex: 'c'})} />
          <input
            type="submit"
            formAction={serverAction.bind(null, {complex: 'd'})}
          />
        </form>
      );
    }
    const rscStream = ReactServerDOMServer.renderToReadableStream(<App />);
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    const form = container.firstChild;

    expect(foo).toBe(null);

    const {returnValue} = await submit(form.getElementsByTagName('button')[1]);

    expect(returnValue).toBe('helloc');
    expect(foo).toBe('barc');
  });

  it('can bind an imported server action on the client without hydrating it', async () => {
    let foo = null;

    const ServerModule = serverExports(function action(bound, formData) {
      foo = formData.get('foo') + bound.complex;
      return 'hello';
    });
    const serverAction = ReactServerDOMClient.createServerReference(
      ServerModule.$$id,
    );
    function Client() {
      return (
        <form action={serverAction.bind(null, {complex: 'object'})}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }

    const ssrStream = await ReactDOMServer.renderToReadableStream(<Client />);
    await readIntoContainer(ssrStream);

    const form = container.firstChild;

    expect(foo).toBe(null);

    const {returnValue} = await submit(form);

    expect(returnValue).toBe('hello');
    expect(foo).toBe('barobject');
  });

  it('can bind a server action on the client without hydrating it', async () => {
    let foo = null;

    const serverAction = serverExports(function action(bound, formData) {
      foo = formData.get('foo') + bound.complex;
      return 'hello';
    });

    function Client({action}) {
      return (
        <form action={action.bind(null, {complex: 'object'})}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>
      );
    }
    const ClientRef = await clientExports(Client);

    const rscStream = ReactServerDOMServer.renderToReadableStream(
      <ClientRef action={serverAction} />,
      webpackMap,
    );
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    const form = container.firstChild;

    expect(foo).toBe(null);

    const {returnValue} = await submit(form);

    expect(returnValue).toBe('hello');
    expect(foo).toBe('barobject');
  });

  it("useActionState's dispatch binds the initial state to the provided action", async () => {
    const serverAction = serverExports(
      async function action(prevState, formData) {
        return {
          count:
            prevState.count + parseInt(formData.get('incrementAmount'), 10),
        };
      },
    );

    const initialState = {count: 1};
    function Client({action}) {
      const [state, dispatch, isPending] = useActionState(action, initialState);
      return (
        <form action={dispatch}>
          <span>{isPending ? 'Pending...' : ''}</span>
          <span>Count: {state.count}</span>
          <input type="text" name="incrementAmount" defaultValue="5" />
        </form>
      );
    }

    const ClientRef = await clientExports(Client);

    const rscStream = ReactServerDOMServer.renderToReadableStream(
      <ClientRef action={serverAction} />,
      webpackMap,
    );
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    const form = container.getElementsByTagName('form')[0];
    const pendingSpan = container.getElementsByTagName('span')[0];
    const stateSpan = container.getElementsByTagName('span')[1];
    expect(pendingSpan.textContent).toBe('');
    expect(stateSpan.textContent).toBe('Count: 1');

    const {returnValue} = await submit(form);
    expect(await returnValue).toEqual({count: 6});
  });

  it('useActionState can reuse state during MPA form submission', async () => {
    const serverAction = serverExports(
      async function action(prevState, formData) {
        return prevState + 1;
      },
    );

    function Form({action}) {
      const [count, dispatch, isPending] = useActionState(action, 1);
      return (
        <form action={dispatch}>
          {isPending ? 'Pending...' : ''}
          {count}
        </form>
      );
    }

    function Client({action}) {
      return (
        <div>
          <Form action={action} />
          <Form action={action} />
          <Form action={action} />
        </div>
      );
    }

    const ClientRef = await clientExports(Client);

    const rscStream = ReactServerDOMServer.renderToReadableStream(
      <ClientRef action={serverAction} />,
      webpackMap,
    );
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    expect(container.textContent).toBe('111');

    // There are three identical forms. We're going to submit the second one.
    const form = container.getElementsByTagName('form')[1];
    const {formState} = await submit(form);

    // Simulate an MPA form submission by resetting the container and
    // rendering again.
    container.innerHTML = '';

    const postbackRscStream = ReactServerDOMServer.renderToReadableStream(
      <ClientRef action={serverAction} />,
      webpackMap,
    );
    const postbackResponse = ReactServerDOMClient.createFromReadableStream(
      postbackRscStream,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );
    const postbackSsrStream = await ReactDOMServer.renderToReadableStream(
      postbackResponse,
      {formState: formState},
    );
    await readIntoContainer(postbackSsrStream);

    // Only the second form's state should have been updated.
    expect(container.textContent).toBe('121');

    // Test that it hydrates correctly
    if (__DEV__) {
      // TODO: Can't use our internal act() util that works in production
      // because it works by overriding the timer APIs, which this test module
      // also does. Remove dev condition once FlightServer.act() is available.
      await act(() => {
        ReactDOMClient.hydrateRoot(container, postbackResponse, {
          formState: formState,
        });
      });
      expect(container.textContent).toBe('121');
    }
  });

  it(
    'useActionState preserves state if arity is the same, but different ' +
      'arguments are bound (i.e. inline closure)',
    async () => {
      const serverAction = serverExports(
        async function action(stepSize, prevState, formData) {
          return prevState + stepSize;
        },
      );

      function Form({action}) {
        const [count, dispatch, isPending] = useActionState(action, 1);
        return (
          <form action={dispatch}>
            {isPending ? 'Pending...' : ''}
            {count}
          </form>
        );
      }

      function Client({action}) {
        return (
          <div>
            <Form action={action} />
            <Form action={action} />
            <Form action={action} />
          </div>
        );
      }

      const ClientRef = await clientExports(Client);

      const rscStream = ReactServerDOMServer.renderToReadableStream(
        // Note: `.bind` is the same as an inline closure with 'use server'
        <ClientRef action={serverAction.bind(null, 1)} />,
        webpackMap,
      );
      const response = ReactServerDOMClient.createFromReadableStream(
        rscStream,
        {
          serverConsumerManifest: {
            moduleMap: null,
            moduleLoading: null,
          },
        },
      );
      const ssrStream = await ReactDOMServer.renderToReadableStream(response);
      await readIntoContainer(ssrStream);

      expect(container.textContent).toBe('111');

      // There are three identical forms. We're going to submit the second one.
      const form = container.getElementsByTagName('form')[1];
      const {formState} = await submit(form);

      // Simulate an MPA form submission by resetting the container and
      // rendering again.
      container.innerHTML = '';

      // On the next page, the same server action is rendered again, but with
      // a different bound stepSize argument. We should treat this as the same
      // action signature.
      const postbackRscStream = ReactServerDOMServer.renderToReadableStream(
        // Note: `.bind` is the same as an inline closure with 'use server'
        <ClientRef action={serverAction.bind(null, 5)} />,
        webpackMap,
      );
      const postbackResponse = ReactServerDOMClient.createFromReadableStream(
        postbackRscStream,
        {
          serverConsumerManifest: {
            moduleMap: null,
            moduleLoading: null,
          },
        },
      );
      const postbackSsrStream = await ReactDOMServer.renderToReadableStream(
        postbackResponse,
        {formState: formState},
      );
      await readIntoContainer(postbackSsrStream);

      // The state should have been preserved because the action signatures are
      // the same. (Note that the amount increased by 1, because that was the
      // value of stepSize at the time the form was submitted)
      expect(container.textContent).toBe('121');

      // Now submit the form again. This time, the state should increase by 5
      // because the stepSize argument has changed.
      const form2 = container.getElementsByTagName('form')[1];
      const {formState: formState2} = await submit(form2);

      container.innerHTML = '';

      const postbackRscStream2 = ReactServerDOMServer.renderToReadableStream(
        // Note: `.bind` is the same as an inline closure with 'use server'
        <ClientRef action={serverAction.bind(null, 5)} />,
        webpackMap,
      );
      const postbackResponse2 = ReactServerDOMClient.createFromReadableStream(
        postbackRscStream2,
        {
          serverConsumerManifest: {
            moduleMap: null,
            moduleLoading: null,
          },
        },
      );
      const postbackSsrStream2 = await ReactDOMServer.renderToReadableStream(
        postbackResponse2,
        {formState: formState2},
      );
      await readIntoContainer(postbackSsrStream2);

      expect(container.textContent).toBe('171');
    },
  );

  it('useActionState does not reuse state if action signatures are different', async () => {
    // This is the same as the previous test, except instead of using bind to
    // configure the server action (i.e. a closure), it swaps the action.
    const increaseBy1 = serverExports(
      async function action(prevState, formData) {
        return prevState + 1;
      },
    );

    const increaseBy5 = serverExports(
      async function action(prevState, formData) {
        return prevState + 5;
      },
    );

    function Form({action}) {
      const [count, dispatch, isPending] = useActionState(action, 1);
      return (
        <form action={dispatch}>
          {isPending ? 'Pending...' : ''}
          {count}
        </form>
      );
    }

    function Client({action}) {
      return (
        <div>
          <Form action={action} />
          <Form action={action} />
          <Form action={action} />
        </div>
      );
    }

    const ClientRef = await clientExports(Client);

    const rscStream = ReactServerDOMServer.renderToReadableStream(
      <ClientRef action={increaseBy1} />,
      webpackMap,
    );
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    expect(container.textContent).toBe('111');

    // There are three identical forms. We're going to submit the second one.
    const form = container.getElementsByTagName('form')[1];
    const {formState} = await submit(form);

    // Simulate an MPA form submission by resetting the container and
    // rendering again.
    container.innerHTML = '';

    // On the next page, a different server action is rendered. It should not
    // reuse the state from the previous page.
    const postbackRscStream = ReactServerDOMServer.renderToReadableStream(
      <ClientRef action={increaseBy5} />,
      webpackMap,
    );
    const postbackResponse = ReactServerDOMClient.createFromReadableStream(
      postbackRscStream,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );
    const postbackSsrStream = await ReactDOMServer.renderToReadableStream(
      postbackResponse,
      {formState: formState},
    );
    await readIntoContainer(postbackSsrStream);

    // The state should not have been preserved because the action signatures
    // are not the same.
    expect(container.textContent).toBe('111');
  });

  it('when permalink is provided, useActionState compares that instead of the keypath', async () => {
    const serverAction = serverExports(
      async function action(prevState, formData) {
        return prevState + 1;
      },
    );

    function Form({action, permalink}) {
      const [count, dispatch, isPending] = useActionState(action, 1, permalink);
      return (
        <form action={dispatch}>
          {isPending ? 'Pending...' : ''}
          {count}
        </form>
      );
    }

    function Page1({action, permalink}) {
      return <Form action={action} permalink={permalink} />;
    }

    function Page2({action, permalink}) {
      return <Form action={action} permalink={permalink} />;
    }

    const Page1Ref = await clientExports(Page1);
    const Page2Ref = await clientExports(Page2);

    const rscStream = ReactServerDOMServer.renderToReadableStream(
      <Page1Ref action={serverAction} permalink="/permalink" />,
      webpackMap,
    );
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    expect(container.textContent).toBe('1');

    // Submit the form
    const form = container.getElementsByTagName('form')[0];
    const {formState} = await submit(form);

    // Simulate an MPA form submission by resetting the container and
    // rendering again.
    container.innerHTML = '';

    // On the next page, the same server action is rendered again, but in
    // a different component tree. However, because a permalink option was
    // passed, the state should be preserved.
    const postbackRscStream = ReactServerDOMServer.renderToReadableStream(
      <Page2Ref action={serverAction} permalink="/permalink" />,
      webpackMap,
    );
    const postbackResponse = ReactServerDOMClient.createFromReadableStream(
      postbackRscStream,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );
    const postbackSsrStream = await ReactDOMServer.renderToReadableStream(
      postbackResponse,
      {formState: formState},
    );
    await readIntoContainer(postbackSsrStream);

    expect(container.textContent).toBe('2');

    // Now submit the form again. This time, the permalink will be different, so
    // the state is not preserved.
    const form2 = container.getElementsByTagName('form')[0];
    const {formState: formState2} = await submit(form2);

    container.innerHTML = '';

    const postbackRscStream2 = ReactServerDOMServer.renderToReadableStream(
      <Page1Ref action={serverAction} permalink="/some-other-permalink" />,
      webpackMap,
    );
    const postbackResponse2 = ReactServerDOMClient.createFromReadableStream(
      postbackRscStream2,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );
    const postbackSsrStream2 = await ReactDOMServer.renderToReadableStream(
      postbackResponse2,
      {formState: formState2},
    );
    await readIntoContainer(postbackSsrStream2);

    // The state was reset because the permalink didn't match
    expect(container.textContent).toBe('1');
  });

  it('useActionState can change the action URL with the `permalink` argument', async () => {
    const serverAction = serverExports(function action(prevState) {
      return {state: prevState.count + 1};
    });

    const initialState = {count: 1};
    function Client({action}) {
      const [state, dispatch, isPending] = useActionState(
        action,
        initialState,
        '/permalink',
      );
      return (
        <form action={dispatch}>
          <span>{isPending ? 'Pending...' : ''}</span>
          <span>Count: {state.count}</span>
        </form>
      );
    }

    const ClientRef = await clientExports(Client);

    const rscStream = ReactServerDOMServer.renderToReadableStream(
      <ClientRef action={serverAction} />,
      webpackMap,
    );
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    const form = container.getElementsByTagName('form')[0];
    const pendingSpan = container.getElementsByTagName('span')[0];
    const stateSpan = container.getElementsByTagName('span')[1];
    expect(pendingSpan.textContent).toBe('');
    expect(stateSpan.textContent).toBe('Count: 1');

    expect(form.action).toBe('http://localhost/permalink');
  });

  it('useActionState `permalink` is coerced to string', async () => {
    const serverAction = serverExports(function action(prevState) {
      return {state: prevState.count + 1};
    });

    class Permalink {
      toString() {
        return '/permalink';
      }
    }

    const permalink = new Permalink();

    const initialState = {count: 1};
    function Client({action}) {
      const [state, dispatch, isPending] = useActionState(
        action,
        initialState,
        permalink,
      );
      return (
        <form action={dispatch}>
          <span>{isPending ? 'Pending...' : ''}</span>
          <span>Count: {state.count}</span>
        </form>
      );
    }

    const ClientRef = await clientExports(Client);

    const rscStream = ReactServerDOMServer.renderToReadableStream(
      <ClientRef action={serverAction} />,
      webpackMap,
    );
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    const form = container.getElementsByTagName('form')[0];
    const pendingSpan = container.getElementsByTagName('span')[0];
    const stateSpan = container.getElementsByTagName('span')[1];
    expect(pendingSpan.textContent).toBe('');
    expect(stateSpan.textContent).toBe('Count: 1');

    expect(form.action).toBe('http://localhost/permalink');
  });

  it('useActionState can return JSX state during MPA form submission', async () => {
    const serverAction = serverExports(
      async function action(prevState, formData) {
        return <div>error message</div>;
      },
    );

    function Form({action}) {
      const [errorMsg, dispatch] = useActionState(action, null);
      return <form action={dispatch}>{errorMsg}</form>;
    }

    const FormRef = await clientExports(Form);

    const rscStream = ReactServerDOMServer.renderToReadableStream(
      <FormRef action={serverAction} />,
      webpackMap,
    );
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    const form1 = container.getElementsByTagName('form')[0];
    expect(form1.textContent).toBe('');

    async function submitTheForm() {
      const form = container.getElementsByTagName('form')[0];
      const {formState} = await submit(form);

      // Simulate an MPA form submission by resetting the container and
      // rendering again.
      container.innerHTML = '';

      const postbackRscStream = ReactServerDOMServer.renderToReadableStream(
        <FormRef action={serverAction} />,
        webpackMap,
      );
      const postbackResponse = ReactServerDOMClient.createFromReadableStream(
        postbackRscStream,
        {
          serverConsumerManifest: {
            moduleMap: null,
            moduleLoading: null,
          },
        },
      );
      const postbackSsrStream = await ReactDOMServer.renderToReadableStream(
        postbackResponse,
        {formState: formState},
      );
      await readIntoContainer(postbackSsrStream);
    }

    await submitTheForm();
    assertConsoleErrorDev([
      'Failed to serialize an action for progressive enhancement:\n' +
        'Error: React Element cannot be passed to Server Functions from the Client without a temporary reference set. Pass a TemporaryReferenceSet to the options.\n' +
        '  [<div/>]\n' +
        '   ^^^^^^' +
        '\n    in <stack>',
    ]);

    // The error message was returned as JSX.
    const form2 = container.getElementsByTagName('form')[0];
    expect(form2.textContent).toBe('error message');
    expect(form2.firstChild.tagName).toBe('DIV');
  });

  it('useActionState can return binary state during MPA form submission', async () => {
    const serverAction = serverExports(
      async function action(prevState, formData) {
        return new Blob([new Uint8Array([104, 105])]);
      },
    );

    let blob;

    function Form({action}) {
      const [errorMsg, dispatch] = useActionState(action, null);
      let text;
      if (errorMsg) {
        blob = errorMsg;
        text = React.use(blob.text());
      }
      return <form action={dispatch}>{text}</form>;
    }

    const FormRef = await clientExports(Form);

    const rscStream = ReactServerDOMServer.renderToReadableStream(
      <FormRef action={serverAction} />,
      webpackMap,
    );
    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const ssrStream = await ReactDOMServer.renderToReadableStream(response);
    await readIntoContainer(ssrStream);

    const form1 = container.getElementsByTagName('form')[0];
    expect(form1.textContent).toBe('');

    async function submitTheForm() {
      const form = container.getElementsByTagName('form')[0];
      const {formState} = await submit(form);

      // Simulate an MPA form submission by resetting the container and
      // rendering again.
      container.innerHTML = '';

      const postbackRscStream = ReactServerDOMServer.renderToReadableStream(
        {formState, root: <FormRef action={serverAction} />},
        webpackMap,
      );
      const postbackResponse =
        await ReactServerDOMClient.createFromReadableStream(postbackRscStream, {
          serverConsumerManifest: {
            moduleMap: null,
            moduleLoading: null,
          },
        });
      const postbackSsrStream = await ReactDOMServer.renderToReadableStream(
        postbackResponse.root,
        {formState: postbackResponse.formState},
      );
      await readIntoContainer(postbackSsrStream);
    }

    await submitTheForm();
    assertConsoleErrorDev([
      'Failed to serialize an action for progressive enhancement:\n' +
        'Error: File/Blob fields are not yet supported in progressive forms. Will fallback to client hydration.' +
        '\n    in <stack>',
    ]);

    expect(blob instanceof Blob).toBe(true);
    expect(blob.size).toBe(2);

    const form2 = container.getElementsByTagName('form')[0];
    expect(form2.textContent).toBe('hi');
  });
});
