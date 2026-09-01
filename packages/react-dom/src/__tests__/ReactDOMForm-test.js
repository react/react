/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

global.IS_REACT_ACT_ENVIRONMENT = true;

// Our current version of JSDOM doesn't implement the event dispatching
// so we polyfill it.
const NativeFormData = global.FormData;
const FormDataPolyfill = function FormData(form, submitter) {
  const formData = new NativeFormData(form, submitter);
  const formDataEvent = new Event('formdata', {
    bubbles: true,
    cancelable: false,
  });
  formDataEvent.formData = formData;
  form.dispatchEvent(formDataEvent);
  return formData;
};
NativeFormData.prototype.constructor = FormDataPolyfill;
global.FormData = FormDataPolyfill;

describe('ReactDOMForm', () => {
  let act;
  let container;
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let Scheduler;
  let assertLog;
  let assertConsoleErrorDev;
  let waitForThrow;
  let useState;
  let Suspense;
  let startTransition;
  let useTransition;
  let use;
  let textCache;
  let useFormStatus;
  let useActionState;
  let requestFormReset;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertLog = require('internal-test-utils').assertLog;
    waitForThrow = require('internal-test-utils').waitForThrow;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    useState = React.useState;
    Suspense = React.Suspense;
    startTransition = React.startTransition;
    useTransition = React.useTransition;
    use = React.use;
    useFormStatus = ReactDOM.useFormStatus;
    requestFormReset = ReactDOM.requestFormReset;
    container = document.createElement('div');
    document.body.appendChild(container);

    textCache = new Map();

    if (__VARIANT__) {
      const originalConsoleError = console.error;
      console.error = (error, ...args) => {
        if (
          typeof error !== 'string' ||
          error.indexOf('ReactDOM.useFormState has been renamed') === -1
        ) {
          originalConsoleError(error, ...args);
        }
      };
      // Remove after API is deleted.
      useActionState = ReactDOM.useFormState;
    } else {
      useActionState = React.useActionState;
    }
  });

  function resolveText(text) {
    const record = textCache.get(text);
    if (record === undefined) {
      const newRecord = {
        status: 'resolved',
        value: text,
      };
      textCache.set(text, newRecord);
    } else if (record.status === 'pending') {
      const thenable = record.value;
      record.status = 'resolved';
      record.value = text;
      thenable.pings.forEach(t => t(text));
    }
  }

  function readText(text) {
    const record = textCache.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          Scheduler.log(`Suspend! [${text}]`);
          throw record.value;
        case 'rejected':
          throw record.value;
        case 'resolved':
          return record.value;
      }
    } else {
      Scheduler.log(`Suspend! [${text}]`);
      const thenable = {
        pings: [],
        then(resolve) {
          if (newRecord.status === 'pending') {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve(newRecord.value));
          }
        },
      };

      const newRecord = {
        status: 'pending',
        value: thenable,
      };
      textCache.set(text, newRecord);

      throw thenable;
    }
  }

  function getText(text) {
    const record = textCache.get(text);
    if (record === undefined) {
      const thenable = {
        pings: [],
        then(resolve) {
          if (newRecord.status === 'pending') {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve(newRecord.value));
          }
        },
      };
      const newRecord = {
        status: 'pending',
        value: thenable,
      };
      textCache.set(text, newRecord);
      return thenable;
    } else {
      switch (record.status) {
        case 'pending':
          return record.value;
        case 'rejected':
          return Promise.reject(record.value);
        case 'resolved':
          return Promise.resolve(record.value);
      }
    }
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function AsyncText({text}) {
    readText(text);
    Scheduler.log(text);
    return text;
  }

  afterEach(() => {
    document.body.removeChild(container);
  });

  async function submit(submitter) {
    await act(() => {
      const form = submitter.form || submitter;
      if (!submitter.form) {
        submitter = undefined;
      }
      const submitEvent = new Event('submit', {
        bubbles: true,
        cancelable: true,
      });
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
    });
  }

  it('should allow passing a function to form action', async () => {
    const ref = React.createRef();
    let foo;

    function action(formData) {
      foo = formData.get('foo');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form action={action} ref={ref}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>,
      );
    });

    await submit(ref.current);

    expect(foo).toBe('bar');

    // Try updating the action

    function action2(formData) {
      foo = formData.get('foo') + '2';
    }

    await act(async () => {
      root.render(
        <form action={action2} ref={ref}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>,
      );
    });

    await submit(ref.current);

    expect(foo).toBe('bar2');
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

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
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
        </form>,
      );
    });

    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe(null);

    await submit(inputRef.current);
    expect(savedTitle).toBe('Hello');
    expect(deletedTitle).toBe(null);
    savedTitle = null;

    await submit(buttonRef.current);
    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe('Hello');
    deletedTitle = null;

    // Try updating the actions

    function saveItem2(formData) {
      savedTitle = formData.get('title') + '2';
    }

    function deleteItem2(formData) {
      deletedTitle = formData.get('title') + '2';
    }

    await act(async () => {
      root.render(
        <form action={action}>
          <input type="text" name="title" defaultValue="Hello" />
          <input
            type="submit"
            formAction={saveItem2}
            value="Save"
            ref={inputRef}
          />
          <button formAction={deleteItem2} ref={buttonRef}>
            Delete
          </button>
        </form>,
      );
    });

    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe(null);

    await submit(inputRef.current);
    expect(savedTitle).toBe('Hello2');
    expect(deletedTitle).toBe(null);
    savedTitle = null;

    await submit(buttonRef.current);
    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe('Hello2');

    expect(rootActionCalled).toBe(false);
  });

  it('should allow preventing default to block the action', async () => {
    const ref = React.createRef();
    let actionCalled = false;

    function action(formData) {
      actionCalled = true;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form action={action} ref={ref} onSubmit={e => e.preventDefault()}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>,
      );
    });

    await submit(ref.current);

    expect(actionCalled).toBe(false);
  });

  it('should submit the inner of nested forms', async () => {
    const ref = React.createRef();
    let data;

    function outerAction(formData) {
      data = formData.get('data') + 'outer';
    }
    function innerAction(formData) {
      data = formData.get('data') + 'inner';
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      // This isn't valid HTML but just in case.
      root.render(
        <form action={outerAction}>
          <input type="text" name="data" defaultValue="outer" />
          <form action={innerAction} ref={ref}>
            <input type="text" name="data" defaultValue="inner" />
          </form>
        </form>,
      );
    });
    assertConsoleErrorDev([
      'In HTML, <form> cannot be a descendant of <form>.\n' +
        'This will cause a hydration error.\n' +
        '\n' +
        '> <form action={function outerAction}>\n' +
        '    <input>\n' +
        '>   <form action={function innerAction} ref={{current:null}}>\n' +
        '\n    in form (at **)',
    ]);

    await submit(ref.current);

    expect(data).toBe('innerinner');
  });

  it('should submit once if one root is nested inside the other', async () => {
    const ref = React.createRef();
    let outerCalled = 0;
    let innerCalled = 0;
    let bubbledSubmit = false;

    function outerAction(formData) {
      outerCalled++;
    }

    function innerAction(formData) {
      innerCalled++;
    }

    const innerContainerRef = React.createRef();
    const outerRoot = ReactDOMClient.createRoot(container);
    await act(async () => {
      outerRoot.render(
        // Nesting forms isn't valid HTML but just in case.
        <div onSubmit={() => (bubbledSubmit = true)}>
          <form action={outerAction}>
            <div ref={innerContainerRef} />
          </form>
        </div>,
      );
    });

    const innerRoot = ReactDOMClient.createRoot(innerContainerRef.current);
    await act(async () => {
      innerRoot.render(
        <form action={innerAction} ref={ref}>
          <input type="text" name="data" defaultValue="inner" />
        </form>,
      );
    });

    await submit(ref.current);

    expect(bubbledSubmit).toBe(true);
    expect(outerCalled).toBe(0);
    expect(innerCalled).toBe(1);
  });

  it('should submit once if a portal is nested inside its own root', async () => {
    const ref = React.createRef();
    let outerCalled = 0;
    let innerCalled = 0;
    let bubbledSubmit = false;

    function outerAction(formData) {
      outerCalled++;
    }

    function innerAction(formData) {
      innerCalled++;
    }

    const innerContainer = document.createElement('div');
    const innerContainerRef = React.createRef();
    const outerRoot = ReactDOMClient.createRoot(container);
    await act(async () => {
      outerRoot.render(
        // Nesting forms isn't valid HTML but just in case.
        <div onSubmit={() => (bubbledSubmit = true)}>
          <form action={outerAction}>
            <div ref={innerContainerRef} />
            {ReactDOM.createPortal(
              <form action={innerAction} ref={ref}>
                <input type="text" name="data" defaultValue="inner" />
              </form>,
              innerContainer,
            )}
          </form>
        </div>,
      );
    });

    innerContainerRef.current.appendChild(innerContainer);

    await submit(ref.current);

    expect(bubbledSubmit).toBe(true);
    expect(outerCalled).toBe(0);
    expect(innerCalled).toBe(1);
  });

  it('can read the clicked button in the formdata event', async () => {
    const inputRef = React.createRef();
    const buttonRef = React.createRef();
    const outsideButtonRef = React.createRef();
    const imageButtonRef = React.createRef();
    let button;
    let buttonX;
    let buttonY;
    let title;

    function action(formData) {
      button = formData.get('button');
      buttonX = formData.get('button.x');
      buttonY = formData.get('button.y');
      title = formData.get('title');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <>
          <form action={action}>
            <input type="text" name="title" defaultValue="hello" />
            <input type="submit" name="button" value="save" />
            <input type="submit" name="button" value="delete" ref={inputRef} />
            <button name="button" value="edit" ref={buttonRef}>
              Edit
            </button>
            <input
              type="image"
              name="button"
              href="/some/image.png"
              ref={imageButtonRef}
            />
          </form>
          <form id="form" action={action}>
            <input type="text" name="title" defaultValue="hello" />
          </form>
          <button
            form="form"
            name="button"
            value="outside"
            ref={outsideButtonRef}>
            Button outside form
          </button>
          ,
        </>,
      );
    });

    container.addEventListener('formdata', e => {
      // Process in the formdata event somehow
      if (e.formData.get('button') === 'delete') {
        e.formData.delete('title');
      }
    });

    await submit(inputRef.current);

    expect(button).toBe('delete');
    expect(title).toBe(null);

    await submit(buttonRef.current);

    expect(button).toBe('edit');
    expect(title).toBe('hello');

    await submit(outsideButtonRef.current);

    expect(button).toBe('outside');
    expect(title).toBe('hello');

    await submit(imageButtonRef.current);

    expect(button).toBe(null);
    expect(buttonX).toBe('0');
    expect(buttonY).toBe('0');
    expect(title).toBe('hello');
  });

  it('excludes the submitter name when the submitter is a function action', async () => {
    const inputRef = React.createRef();
    const buttonRef = React.createRef();
    let button;

    function action(formData) {
      // A function action cannot control the name since it might be controlled by the server
      // so we need to make sure it doesn't get into the FormData.
      button = formData.get('button');
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form>
          <input
            type="submit"
            name="button"
            value="delete"
            ref={inputRef}
            formAction={action}
          />
          <button
            name="button"
            value="edit"
            ref={buttonRef}
            formAction={action}>
            Edit
          </button>
        </form>,
      );
    });
    assertConsoleErrorDev([
      'Cannot specify a "name" prop for a button that specifies a function as a formAction. ' +
        'React needs it to encode which action should be invoked. ' +
        'It will get overridden.\n' +
        '    in input (at **)',
    ]);

    await submit(inputRef.current);

    expect(button).toBe(null);

    await submit(buttonRef.current);

    expect(button).toBe(null);

    // Ensure that the type field got correctly restored
    expect(inputRef.current.getAttribute('type')).toBe('submit');
    expect(buttonRef.current.getAttribute('type')).toBe(null);
  });

  it('allows a non-function formaction to override a function one', async () => {
    const ref = React.createRef();
    let actionCalled = false;

    function action(formData) {
      actionCalled = true;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form action={action}>
          <input
            type="submit"
            formAction="http://example.com/submit"
            ref={ref}
          />
        </form>,
      );
    });

    let nav;
    try {
      await submit(ref.current);
    } catch (x) {
      nav = x.message;
    }
    expect(nav).toBe('Navigate to: http://example.com/submit');
    expect(actionCalled).toBe(false);
  });

  it('allows a non-react html formaction to be invoked', async () => {
    let actionCalled = false;

    function action(formData) {
      actionCalled = true;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form
          action={action}
          dangerouslySetInnerHTML={{
            __html: `
            <input
              type="submit"
              formAction="http://example.com/submit"
            />
          `,
          }}
        />,
      );
    });

    const node = container.getElementsByTagName('input')[0];
    let nav;
    try {
      await submit(node);
    } catch (x) {
      nav = x.message;
    }
    expect(nav).toBe('Navigate to: http://example.com/submit');
    expect(actionCalled).toBe(false);
  });

  it('form actions are transitions', async () => {
    const formRef = React.createRef();

    function Status() {
      const {pending} = useFormStatus();
      return pending ? <Text text="Pending..." /> : null;
    }

    function App() {
      const [state, setState] = useState('Initial');
      return (
        <form action={() => setState('Updated')} ref={formRef}>
          <Status />
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={state} />
          </Suspense>
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await resolveText('Initial');
    await act(() => root.render(<App />));
    assertLog(['Initial']);
    expect(container.textContent).toBe('Initial');

    // This should suspend because form actions are implicitly wrapped
    // in startTransition.
    await submit(formRef.current);
    assertLog(['Pending...', 'Suspend! [Updated]', 'Loading...']);
    expect(container.textContent).toBe('Pending...Initial');

    await act(() => resolveText('Updated'));
    assertLog(['Updated']);
    expect(container.textContent).toBe('Updated');
  });

  it('multiple form actions', async () => {
    const formRef = React.createRef();

    function Status() {
      const {pending} = useFormStatus();
      return pending ? <Text text="Pending..." /> : null;
    }

    function App() {
      const [state, setState] = useState(0);
      return (
        <form action={() => setState(n => n + 1)} ref={formRef}>
          <Status />
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={'Count: ' + state} />
          </Suspense>
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await resolveText('Count: 0');
    await act(() => root.render(<App />));
    assertLog(['Count: 0']);
    expect(container.textContent).toBe('Count: 0');

    // Update
    await submit(formRef.current);
    assertLog(['Pending...', 'Suspend! [Count: 1]', 'Loading...']);
    expect(container.textContent).toBe('Pending...Count: 0');

    await act(() => resolveText('Count: 1'));
    assertLog(['Count: 1']);
    expect(container.textContent).toBe('Count: 1');

    // Update again
    await submit(formRef.current);
    assertLog(['Pending...', 'Suspend! [Count: 2]', 'Loading...']);
    expect(container.textContent).toBe('Pending...Count: 1');

    await act(() => resolveText('Count: 2'));
    assertLog(['Count: 2']);
    expect(container.textContent).toBe('Count: 2');
  });

  it('form actions can be asynchronous', async () => {
    const formRef = React.createRef();

    function Status() {
      const {pending} = useFormStatus();
      return pending ? <Text text="Pending..." /> : null;
    }

    function App() {
      const [state, setState] = useState('Initial');
      return (
        <form
          action={async () => {
            Scheduler.log('Async action started');
            await getText('Wait');
            startTransition(() => setState('Updated'));
          }}
          ref={formRef}>
          <Status />
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={state} />
          </Suspense>
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await resolveText('Initial');
    await act(() => root.render(<App />));
    assertLog(['Initial']);
    expect(container.textContent).toBe('Initial');

    await submit(formRef.current);
    assertLog(['Async action started', 'Pending...']);

    await act(() => resolveText('Wait'));
    assertLog(['Suspend! [Updated]', 'Loading...']);
    expect(container.textContent).toBe('Pending...Initial');

    await act(() => resolveText('Updated'));
    assertLog(['Updated']);
    expect(container.textContent).toBe('Updated');
  });

  it('sync errors in form actions can be captured by an error boundary', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    const formRef = React.createRef();

    function App() {
      return (
        <ErrorBoundary>
          <form
            action={() => {
              throw new Error('Oh no!');
            }}
            ref={formRef}>
            <Text text="Everything is fine" />
          </form>
        </ErrorBoundary>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(['Everything is fine']);
    expect(container.textContent).toBe('Everything is fine');

    await submit(formRef.current);
    assertLog(['Oh no!', 'Oh no!']);
    expect(container.textContent).toBe('Oh no!');
  });

  it('async errors in form actions can be captured by an error boundary', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    const formRef = React.createRef();

    function App() {
      return (
        <ErrorBoundary>
          <form
            action={async () => {
              Scheduler.log('Async action started');
              await getText('Wait');
              throw new Error('Oh no!');
            }}
            ref={formRef}>
            <Text text="Everything is fine" />
          </form>
        </ErrorBoundary>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(['Everything is fine']);
    expect(container.textContent).toBe('Everything is fine');

    await submit(formRef.current);
    assertLog(['Async action started']);
    expect(container.textContent).toBe('Everything is fine');

    await act(() => resolveText('Wait'));
    assertLog(['Oh no!', 'Oh no!']);
    expect(container.textContent).toBe('Oh no!');
  });

  it('useFormStatus reads the status of a pending form action', async () => {
    const formRef = React.createRef();

    function Status() {
      const {pending, data, action, method} = useFormStatus();
      if (!pending) {
        return <Text text="No pending action" />;
      } else {
        const foo = data.get('foo');
        return (
          <Text
            text={`Pending action ${action.name}: foo is ${foo}, method is ${method}`}
          />
        );
      }
    }

    async function myAction() {
      Scheduler.log('Async action started');
      await getText('Wait');
      Scheduler.log('Async action finished');
    }

    function App() {
      return (
        <form action={myAction} ref={formRef}>
          <input type="text" name="foo" defaultValue="bar" />
          <Status />
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(['No pending action']);
    expect(container.textContent).toBe('No pending action');

    await submit(formRef.current);
    assertLog([
      'Async action started',
      'Pending action myAction: foo is bar, method is get',
    ]);
    expect(container.textContent).toBe(
      'Pending action myAction: foo is bar, method is get',
    );

    await act(() => resolveText('Wait'));
    assertLog(['Async action finished', 'No pending action']);
  });

  it('should error if submitting a form manually', async () => {
    const ref = React.createRef();

    let error = null;
    let result = null;

    function emulateForceSubmit(submitter) {
      const form = submitter.form || submitter;
      const action =
        (submitter && submitter.getAttribute('formaction')) || form.action;
      try {
        if (!/\s*javascript:/i.test(action)) {
          throw new Error('Navigate to: ' + action);
        } else {
          // eslint-disable-next-line no-new-func
          result = Function(action.slice(11))();
        }
      } catch (x) {
        error = x;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form
          action={() => {}}
          ref={ref}
          onSubmit={e => {
            e.preventDefault();
            emulateForceSubmit(e.target);
          }}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>,
      );
    });

    // This submits the form, which gets blocked and then resubmitted. It's a somewhat
    // common idiom but we don't support this pattern unless it uses requestSubmit().
    await submit(ref.current);
    expect(result).toBe(null);
    expect(error.message).toContain(
      'A React form was unexpectedly submitted. If you called form.submit()',
    );
  });

  it('useActionState updates state asynchronously and queues multiple actions', async () => {
    let actionCounter = 0;
    async function action(state, type) {
      actionCounter++;

      Scheduler.log(`Async action started [${actionCounter}]`);
      await getText(`Wait [${actionCounter}]`);

      switch (type) {
        case 'increment':
          return state + 1;
        case 'decrement':
          return state - 1;
        default:
          return state;
      }
    }

    let dispatch;
    function App() {
      const [state, _dispatch, isPending] = useActionState(action, 0);
      dispatch = _dispatch;
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(['0']);
    expect(container.textContent).toBe('0');

    await act(() => startTransition(() => dispatch('increment')));
    assertLog(['Async action started [1]', 'Pending 0']);
    expect(container.textContent).toBe('Pending 0');

    // Dispatch a few more actions. None of these will start until the previous
    // one finishes.
    await act(() => startTransition(() => dispatch('increment')));
    await act(() => startTransition(() => dispatch('decrement')));
    await act(() => startTransition(() => dispatch('increment')));
    assertLog([]);

    // Each action starts as soon as the previous one finishes.
    // NOTE: React does not render in between these actions because they all
    // update the same queue, which means they get entangled together. This is
    // intentional behavior.
    await act(() => resolveText('Wait [1]'));
    assertLog(['Async action started [2]']);
    await act(() => resolveText('Wait [2]'));
    assertLog(['Async action started [3]']);
    await act(() => resolveText('Wait [3]'));
    assertLog(['Async action started [4]']);
    await act(() => resolveText('Wait [4]'));

    // Finally the last action finishes and we can render the result.
    assertLog(['2']);
    expect(container.textContent).toBe('2');
  });

  it('useActionState supports inline actions', async () => {
    let increment;
    function App({stepSize}) {
      const [state, dispatch, isPending] = useActionState(async prevState => {
        return prevState + stepSize;
      }, 0);
      increment = dispatch;
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    // Initial render
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App stepSize={1} />));
    assertLog(['0']);

    // Perform an action. This will increase the state by 1, as defined by the
    // stepSize prop.
    await act(() => startTransition(() => increment()));
    assertLog(['Pending 0', '1']);

    // Now increase the stepSize prop to 10. Subsequent steps will increase
    // by this amount.
    await act(() => root.render(<App stepSize={10} />));
    assertLog(['1']);

    // Increment again. The state should increase by 10.
    await act(() => startTransition(() => increment()));
    assertLog(['Pending 1', '11']);
  });

  it('useActionState: dispatch throws if called during render', async () => {
    function App() {
      const [state, dispatch, isPending] = useActionState(async () => {}, 0);
      dispatch();
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
      await waitForThrow('Cannot update action state while rendering.');
    });
  });

  it('useActionState: queues multiple actions and runs them in order', async () => {
    let action;
    function App() {
      const [state, dispatch, isPending] = useActionState(
        async (s, a) => await getText(a),
        'A',
      );
      action = dispatch;
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(['A']);

    await act(() => startTransition(() => action('B')));
    // The first dispatch will update the pending state.
    assertLog(['Pending A']);
    await act(() => startTransition(() => action('C')));
    await act(() => startTransition(() => action('D')));
    assertLog([]);

    await act(() => resolveText('B'));
    await act(() => resolveText('C'));
    await act(() => resolveText('D'));

    assertLog(['D']);
    expect(container.textContent).toBe('D');
  });

  it(
    'useActionState: when calling a queued action, uses the implementation ' +
      'that was current at the time it was dispatched, not the most recent one',
    async () => {
      let action;
      function App({throwIfActionIsDispatched}) {
        const [state, dispatch, isPending] = useActionState(async (s, a) => {
          if (throwIfActionIsDispatched) {
            throw new Error('Oops!');
          }
          return await getText(a);
        }, 'Initial');
        action = dispatch;
        return <Text text={state + (isPending ? ' (pending)' : '')} />;
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<App throwIfActionIsDispatched={false} />));
      assertLog(['Initial']);

      // Dispatch two actions. The first one is async, so it forces the second
      // one into an async queue.
      await act(() => startTransition(() => action('First action')));
      assertLog(['Initial (pending)']);
      // This action won't run until the first one finishes.
      await act(() => startTransition(() => action('Second action')));

      // While the first action is still pending, update a prop. This causes the
      // inline action implementation to change, but it should not affect the
      // behavior of the action that is already queued.
      await act(() => root.render(<App throwIfActionIsDispatched={true} />));
      assertLog(['Initial (pending)']);

      // Finish both of the actions.
      await act(() => resolveText('First action'));
      await act(() => resolveText('Second action'));
      assertLog(['Second action']);

      // Confirm that if we dispatch yet another action, it uses the updated
      // action implementation.
      await expect(
        act(() => startTransition(() => action('Third action'))),
      ).rejects.toThrow('Oops!');
    },
  );

  it('useActionState: works if action is sync', async () => {
    let increment;
    function App({stepSize}) {
      const [state, dispatch, isPending] = useActionState(prevState => {
        return prevState + stepSize;
      }, 0);
      increment = dispatch;
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    // Initial render
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App stepSize={1} />));
    assertLog(['0']);

    // Perform an action. This will increase the state by 1, as defined by the
    // stepSize prop.
    await act(() => startTransition(() => increment()));
    assertLog(['Pending 0', '1']);

    // Now increase the stepSize prop to 10. Subsequent steps will increase
    // by this amount.
    await act(() => root.render(<App stepSize={10} />));
    assertLog(['1']);

    // Increment again. The state should increase by 10.
    await act(() => startTransition(() => increment()));
    assertLog(['Pending 1', '11']);
  });

  it('useActionState: can mix sync and async actions', async () => {
    let action;
    function App() {
      const [state, dispatch, isPending] = useActionState((s, a) => a, 'A');
      action = dispatch;
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(['A']);

    await act(() => startTransition(() => action(getText('B'))));
    // The first dispatch will update the pending state.
    assertLog(['Pending A']);
    await act(() => startTransition(() => action('C')));
    await act(() => startTransition(() => action(getText('D'))));
    await act(() => startTransition(() => action('E')));
    assertLog([]);

    await act(() => resolveText('B'));
    await act(() => resolveText('D'));
    assertLog(['E']);
    expect(container.textContent).toBe('E');
  });

  it('useActionState: error handling (sync action)', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={'Caught an error: ' + this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    let action;
    function App() {
      const [state, dispatch, isPending] = useActionState((s, a) => {
        if (a.endsWith('!')) {
          throw new Error(a);
        }
        return a;
      }, 'A');
      action = dispatch;
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      ),
    );
    assertLog(['A']);

    await act(() => startTransition(() => action('Oops!')));
    assertLog([
      // Action begins, error has not thrown yet.
      'Pending A',
      // Now the action runs and throws.
      'Caught an error: Oops!',
      'Caught an error: Oops!',
    ]);
    expect(container.textContent).toBe('Caught an error: Oops!');
  });

  it('useActionState: error handling (async action)', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={'Caught an error: ' + this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    let action;
    function App() {
      const [state, dispatch, isPending] = useActionState(async (s, a) => {
        const text = await getText(a);
        if (text.endsWith('!')) {
          throw new Error(text);
        }
        return text;
      }, 'A');
      action = dispatch;
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      ),
    );
    assertLog(['A']);

    await act(() => startTransition(() => action('Oops!')));
    // The first dispatch will update the pending state.
    assertLog(['Pending A']);
    await act(() => resolveText('Oops!'));
    assertLog(['Caught an error: Oops!', 'Caught an error: Oops!']);
    expect(container.textContent).toBe('Caught an error: Oops!');
  });

  it('useActionState: when an action errors, subsequent actions are canceled', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={'Caught an error: ' + this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    let action;
    function App() {
      const [state, dispatch, isPending] = useActionState(async (s, a) => {
        Scheduler.log('Start action: ' + a);
        const text = await getText(a);
        if (text.endsWith('!')) {
          throw new Error(text);
        }
        return text;
      }, 'A');
      action = dispatch;
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      ),
    );
    assertLog(['A']);

    await act(() => startTransition(() => action('Oops!')));
    assertLog(['Start action: Oops!', 'Pending A']);

    // Queue up another action after the one will error.
    await act(() => startTransition(() => action('Should never run')));
    assertLog([]);

    // The first dispatch will update the pending state.
    await act(() => resolveText('Oops!'));
    assertLog(['Caught an error: Oops!', 'Caught an error: Oops!']);
    expect(container.textContent).toBe('Caught an error: Oops!');

    // Attempt to dispatch another action. This should not run either.
    await act(() =>
      startTransition(() => action('This also should never run')),
    );
    assertLog([]);
    expect(container.textContent).toBe('Caught an error: Oops!');
  });

  it('useActionState works in StrictMode', async () => {
    let actionCounter = 0;
    async function action(state, type) {
      actionCounter++;

      Scheduler.log(`Async action started [${actionCounter}]`);
      await getText(`Wait [${actionCounter}]`);

      switch (type) {
        case 'increment':
          return state + 1;
        case 'decrement':
          return state - 1;
        default:
          return state;
      }
    }

    let dispatch;
    function App() {
      const [state, _dispatch, isPending] = useActionState(action, 0);
      dispatch = _dispatch;
      const pending = isPending ? 'Pending ' : '';
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );
    assertLog(['0']);
    expect(container.textContent).toBe('0');

    await act(() => startTransition(() => dispatch('increment')));
    assertLog(['Async action started [1]', 'Pending 0']);
    expect(container.textContent).toBe('Pending 0');

    await act(() => resolveText('Wait [1]'));
    assertLog(['1']);
    expect(container.textContent).toBe('1');
  });

  it('useActionState does not wrap action in a transition unless dispatch is in a transition', async () => {
    let dispatch;
    function App() {
      const [state, _dispatch] = useActionState(() => {
        return state + 1;
      }, 0);
      dispatch = _dispatch;
      return <AsyncText text={'Count: ' + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <Suspense fallback={<Text text="Loading..." />}>
          <App />
        </Suspense>,
      ),
    );
    assertLog([
      'Suspend! [Count: 0]',
      'Loading...',
      // pre-warming
      'Suspend! [Count: 0]',
    ]);
    await act(() => resolveText('Count: 0'));
    assertLog(['Count: 0']);

    // Dispatch outside of a transition. This will trigger a loading state.
    await act(() => dispatch());
    assertLog([
      'Suspend! [Count: 1]',
      'Loading...',
      // pre-warming
      'Suspend! [Count: 1]',
    ]);
    expect(container.textContent).toBe('Loading...');

    await act(() => resolveText('Count: 1'));
    assertLog(['Count: 1']);
    expect(container.textContent).toBe('Count: 1');

    // Now dispatch inside of a transition. This one does not trigger a
    // loading state.
    await act(() => startTransition(() => dispatch()));
    assertLog(['Count: 1', 'Suspend! [Count: 2]', 'Loading...']);
    expect(container.textContent).toBe('Count: 1');

    await act(() => resolveText('Count: 2'));
    assertLog(['Count: 2']);
    expect(container.textContent).toBe('Count: 2');
  });

  it('useActionState warns if async action is dispatched outside of a transition', async () => {
    let dispatch;
    function App() {
      const [state, _dispatch] = useActionState(async () => {
        return state + 1;
      }, 0);
      dispatch = _dispatch;
      return <AsyncText text={'Count: ' + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog([
      'Suspend! [Count: 0]',
      // pre-warming
      'Suspend! [Count: 0]',
    ]);
    await act(() => resolveText('Count: 0'));
    assertLog(['Count: 0']);

    // Dispatch outside of a transition.
    await act(() => dispatch());
    assertConsoleErrorDev([
      'An async function with useActionState was called outside of a transition. ' +
        'This is likely not what you intended (for example, isPending will not update ' +
        'correctly). Either call the returned function inside startTransition, or pass it ' +
        'to an `action` or `formAction` prop.',
    ]);
    assertLog([
      'Suspend! [Count: 1]',
      // pre-warming
      'Suspend! [Count: 1]',
    ]);
    expect(container.textContent).toBe('Count: 0');
  });

  it('uncontrolled form inputs are reset after the action completes', async () => {
    const formRef = React.createRef();
    const inputRef = React.createRef();
    const divRef = React.createRef();

    function App({promiseForUsername}) {
      // Make this suspensey to simulate RSC streaming.
      const username = use(promiseForUsername);

      return (
        <form
          ref={formRef}
          action={async formData => {
            const rawUsername = formData.get('username');
            const normalizedUsername = rawUsername.trim().toLowerCase();

            Scheduler.log(`Async action started`);
            await getText('Wait');

            // Update the app with new data. This is analagous to re-rendering
            // from the root with a new RSC payload.
            startTransition(() => {
              root.render(
                <App promiseForUsername={getText(normalizedUsername)} />,
              );
            });
          }}>
          <input
            ref={inputRef}
            text="text"
            name="username"
            defaultValue={username}
          />
          <div ref={divRef}>
            <Text text={'Current username: ' + username} />
          </div>
        </form>
      );
    }

    // Initial render
    const root = ReactDOMClient.createRoot(container);
    const promiseForInitialUsername = getText('(empty)');
    await resolveText('(empty)');
    await act(() =>
      root.render(<App promiseForUsername={promiseForInitialUsername} />),
    );
    assertLog(['Current username: (empty)']);
    expect(divRef.current.textContent).toEqual('Current username: (empty)');

    // Dirty the uncontrolled input
    inputRef.current.value = '  AcdLite  ';

    // Submit the form. This will trigger an async action.
    await submit(formRef.current);
    assertLog(['Async action started']);
    expect(inputRef.current.value).toBe('  AcdLite  ');

    // Finish the async action. This will trigger a re-render from the root with
    // new data from the "server", which suspends.
    //
    // The form should not reset yet because we need to update `defaultValue`
    // first. So we wait for the render to complete.
    await act(() => resolveText('Wait'));
    assertLog([]);
    // The DOM input is still dirty.
    expect(inputRef.current.value).toBe('  AcdLite  ');
    // The React tree is suspended.
    expect(divRef.current.textContent).toEqual('Current username: (empty)');

    // Unsuspend and finish rendering. Now the form should be reset.
    await act(() => resolveText('acdlite'));
    assertLog(['Current username: acdlite']);
    // The form was reset to the new value from the server.
    expect(inputRef.current.value).toBe('acdlite');
    expect(divRef.current.textContent).toEqual('Current username: acdlite');
  });

  it('should fire onReset on automatic form reset', async () => {
    const formRef = React.createRef();
    const inputRef = React.createRef();

    let setValue;
    const defaultValue = 0;
    function App({promiseForUsername}) {
      const [value, _setValue] = useState(defaultValue);
      setValue = _setValue;

      return (
        <form
          ref={formRef}
          action={async formData => {
            Scheduler.log(`Async action started`);
            await getText('Wait');
          }}
          onReset={() => {
            setValue(defaultValue);
          }}>
          <input
            ref={inputRef}
            text="text"
            name="amount"
            value={value}
            onChange={event => setValue(event.currentTarget.value)}
          />
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));

    // Dirty the controlled input
    await act(() => setValue('3'));
    expect(inputRef.current.value).toEqual('3');

    // Submit the form. This will trigger an async action.
    await submit(formRef.current);
    assertLog(['Async action started']);

    // We haven't reset yet.
    expect(inputRef.current.value).toEqual('3');

    // Action completes. onReset has been fired and values reset manually.
    await act(() => resolveText('Wait'));
    assertLog([]);
    expect(inputRef.current.value).toEqual('0');
  });

  it('requestFormReset schedules a form reset after transition completes', async () => {
    // This is the same as the previous test, except the form is updated with
    // a userspace action instead of a built-in form action.

    const formRef = React.createRef();
    const inputRef = React.createRef();
    const divRef = React.createRef();

    function App({promiseForUsername}) {
      // Make this suspensey to simulate RSC streaming.
      const username = use(promiseForUsername);

      return (
        <form ref={formRef}>
          <input
            ref={inputRef}
            text="text"
            name="username"
            defaultValue={username}
          />
          <div ref={divRef}>
            <Text text={'Current username: ' + username} />
          </div>
        </form>
      );
    }

    // Initial render
    const root = ReactDOMClient.createRoot(container);
    const promiseForInitialUsername = getText('(empty)');
    await resolveText('(empty)');
    await act(() =>
      root.render(<App promiseForUsername={promiseForInitialUsername} />),
    );
    assertLog(['Current username: (empty)']);
    expect(divRef.current.textContent).toEqual('Current username: (empty)');

    // Dirty the uncontrolled input
    inputRef.current.value = '  AcdLite  ';

    // This is a userspace action. It does not trigger a real form submission.
    // The practical use case is implementing a custom action prop using
    // onSubmit without losing the built-in form resetting behavior.
    await act(() => {
      startTransition(async () => {
        const form = formRef.current;
        const formData = new FormData(form);
        requestFormReset(form);

        const rawUsername = formData.get('username');
        const normalizedUsername = rawUsername.trim().toLowerCase();

        Scheduler.log(`Async action started`);
        await getText('Wait');

        // Update the app with new data. This is analagous to re-rendering
        // from the root with a new RSC payload.
        startTransition(() => {
          root.render(<App promiseForUsername={getText(normalizedUsername)} />);
        });
      });
    });
    assertLog(['Async action started']);
    expect(inputRef.current.value).toBe('  AcdLite  ');

    // Finish the async action. This will trigger a re-render from the root with
    // new data from the "server", which suspends.
    //
    // The form should not reset yet because we need to update `defaultValue`
    // first. So we wait for the render to complete.
    await act(() => resolveText('Wait'));
    assertLog([]);
    // The DOM input is still dirty.
    expect(inputRef.current.value).toBe('  AcdLite  ');
    // The React tree is suspended.
    expect(divRef.current.textContent).toEqual('Current username: (empty)');

    // Unsuspend and finish rendering. Now the form should be reset.
    await act(() => resolveText('acdlite'));
    assertLog(['Current username: acdlite']);
    // The form was reset to the new value from the server.
    expect(inputRef.current.value).toBe('acdlite');
    expect(divRef.current.textContent).toEqual('Current username: acdlite');
  });

  it('parallel form submissions do not throw', async () => {
    const formRef = React.createRef();
    let resolve = null;
    function App() {
      async function submitForm() {
        Scheduler.log('Action');
        if (!resolve) {
          await new Promise(res => {
            resolve = res;
          });
        }
      }
      return <form ref={formRef} action={submitForm} />;
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));

    // Start first form submission
    await act(async () => {
      formRef.current.requestSubmit();
    });
    assertLog(['Action']);

    // Submit form again while first form action is still pending
    await act(async () => {
      formRef.current.requestSubmit();
      resolve(); // Resolve the promise to allow the first form action to complete
    });
    assertLog(['Action']);
  });

  it(
    'requestFormReset works with inputs that are not descendants ' +
      'of the form element',
    async () => {
      // This is the same as the previous test, except the input is not a child
      // of the form; it's linked with <input form="myform" />

      const formRef = React.createRef();
      const inputRef = React.createRef();
      const divRef = React.createRef();

      function App({promiseForUsername}) {
        // Make this suspensey to simulate RSC streaming.
        const username = use(promiseForUsername);

        return (
          <>
            <form id="myform" ref={formRef} />
            <input
              form="myform"
              ref={inputRef}
              text="text"
              name="username"
              defaultValue={username}
            />
            <div ref={divRef}>
              <Text text={'Current username: ' + username} />
            </div>
          </>
        );
      }

      // Initial render
      const root = ReactDOMClient.createRoot(container);
      const promiseForInitialUsername = getText('(empty)');
      await resolveText('(empty)');
      await act(() =>
        root.render(<App promiseForUsername={promiseForInitialUsername} />),
      );
      assertLog(['Current username: (empty)']);
      expect(divRef.current.textContent).toEqual('Current username: (empty)');

      // Dirty the uncontrolled input
      inputRef.current.value = '  AcdLite  ';

      // This is a userspace action. It does not trigger a real form submission.
      // The practical use case is implementing a custom action prop using
      // onSubmit without losing the built-in form resetting behavior.
      await act(() => {
        startTransition(async () => {
          const form = formRef.current;
          const formData = new FormData(form);
          requestFormReset(form);

          const rawUsername = formData.get('username');
          const normalizedUsername = rawUsername.trim().toLowerCase();

          Scheduler.log(`Async action started`);
          await getText('Wait');

          // Update the app with new data. This is analagous to re-rendering
          // from the root with a new RSC payload.
          startTransition(() => {
            root.render(
              <App promiseForUsername={getText(normalizedUsername)} />,
            );
          });
        });
      });
      assertLog(['Async action started']);
      expect(inputRef.current.value).toBe('  AcdLite  ');

      // Finish the async action. This will trigger a re-render from the root with
      // new data from the "server", which suspends.
      //
      // The form should not reset yet because we need to update `defaultValue`
      // first. So we wait for the render to complete.
      await act(() => resolveText('Wait'));
      assertLog([]);
      // The DOM input is still dirty.
      expect(inputRef.current.value).toBe('  AcdLite  ');
      // The React tree is suspended.
      expect(divRef.current.textContent).toEqual('Current username: (empty)');

      // Unsuspend and finish rendering. Now the form should be reset.
      await act(() => resolveText('acdlite'));
      assertLog(['Current username: acdlite']);
      // The form was reset to the new value from the server.
      expect(inputRef.current.value).toBe('acdlite');
      expect(divRef.current.textContent).toEqual('Current username: acdlite');
    },
  );

  it('reset multiple forms in the same transition', async () => {
    const formRefA = React.createRef();
    const formRefB = React.createRef();

    function App({promiseForA, promiseForB}) {
      // Make these suspensey to simulate RSC streaming.
      const a = use(promiseForA);
      const b = use(promiseForB);
      return (
        <>
          <form ref={formRefA}>
            <input type="text" name="inputName" defaultValue={a} />
          </form>
          <form ref={formRefB}>
            <input type="text" name="inputName" defaultValue={b} />
          </form>
        </>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    const initialPromiseForA = getText('A1');
    const initialPromiseForB = getText('B1');
    await resolveText('A1');
    await resolveText('B1');
    await act(() =>
      root.render(
        <App
          promiseForA={initialPromiseForA}
          promiseForB={initialPromiseForB}
        />,
      ),
    );

    // Dirty the uncontrolled inputs
    formRefA.current.elements.inputName.value = '       A2       ';
    formRefB.current.elements.inputName.value = '       B2       ';

    // Trigger an async action that updates and reset both forms.
    await act(() => {
      startTransition(async () => {
        const currentA = formRefA.current.elements.inputName.value;
        const currentB = formRefB.current.elements.inputName.value;

        requestFormReset(formRefA.current);
        requestFormReset(formRefB.current);

        Scheduler.log('Async action started');
        await getText('Wait');

        // Pretend the server did something with the data.
        const normalizedA = currentA.trim();
        const normalizedB = currentB.trim();

        // Update the app with new data. This is analagous to re-rendering
        // from the root with a new RSC payload.
        startTransition(() => {
          root.render(
            <App
              promiseForA={getText(normalizedA)}
              promiseForB={getText(normalizedB)}
            />,
          );
        });
      });
    });
    assertLog(['Async action started']);

    // Finish the async action. This will trigger a re-render from the root with
    // new data from the "server", which suspends.
    //
    // The forms should not reset yet because we need to update `defaultValue`
    // first. So we wait for the render to complete.
    await act(() => resolveText('Wait'));

    // The DOM inputs are still dirty.
    expect(formRefA.current.elements.inputName.value).toBe('       A2       ');
    expect(formRefB.current.elements.inputName.value).toBe('       B2       ');

    // Unsuspend and finish rendering. Now the forms should be reset.
    await act(() => {
      resolveText('A2');
      resolveText('B2');
    });
    // The forms were reset to the new value from the server.
    expect(formRefA.current.elements.inputName.value).toBe('A2');
    expect(formRefB.current.elements.inputName.value).toBe('B2');
  });

  it('requestFormReset throws if the form is not managed by React', async () => {
    container.innerHTML = `
      <form id="myform">
        <input id="input" type="text" name="greeting" />
      </form>
    `;

    const form = document.getElementById('myform');
    const input = document.getElementById('input');

    input.value = 'Hi!!!!!!!!!!!!!';

    expect(() => requestFormReset(form)).toThrow('Invalid form element.');
    // The form was not reset.
    expect(input.value).toBe('Hi!!!!!!!!!!!!!');

    // Just confirming a regular form reset works fine.
    form.reset();
    expect(input.value).toBe('');
  });

  it('requestFormReset throws on a non-form DOM element', async () => {
    const root = ReactDOMClient.createRoot(container);
    const ref = React.createRef();
    await act(() => root.render(<div ref={ref}>Hi</div>));
    const div = ref.current;
    expect(div.textContent).toBe('Hi');

    expect(() => requestFormReset(div)).toThrow('Invalid form element.');
  });

  it('warns if requestFormReset is called outside of a transition', async () => {
    const formRef = React.createRef();
    const inputRef = React.createRef();

    function App() {
      return (
        <form ref={formRef}>
          <input ref={inputRef} type="text" defaultValue="Initial" />
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));

    // Dirty the uncontrolled input
    inputRef.current.value = '  Updated  ';

    // Trigger an async action that updates and reset both forms.
    await act(() => {
      startTransition(async () => {
        Scheduler.log('Action started');
        await getText('Wait 1');
        Scheduler.log('Request form reset');

        // This happens after an `await`, and is not wrapped in startTransition,
        // so it will be scheduled synchronously instead of with the transition.
        // This is almost certainly a mistake, so we log a warning in dev.
        requestFormReset(formRef.current);

        await getText('Wait 2');
        Scheduler.log('Action finished');
      });
    });
    assertLog(['Action started']);
    expect(inputRef.current.value).toBe('  Updated  ');

    // This triggers a synchronous requestFormReset, and a warning
    await act(() => resolveText('Wait 1'));
    assertConsoleErrorDev([
      'requestFormReset was called outside a transition or action. ' +
        'To fix, move to an action, or wrap with startTransition.',
    ]);
    assertLog(['Request form reset']);

    // The form was reset even though the action didn't finish.
    expect(inputRef.current.value).toBe('Initial');
  });

  it("regression: submitter's formAction prop is coerced correctly before checking if it exists", async () => {
    function App({submitterAction}) {
      return (
        <form action={() => Scheduler.log('Form action')}>
          <button ref={buttonRef} type="submit" formAction={submitterAction} />
        </form>
      );
    }

    const buttonRef = React.createRef();
    const root = ReactDOMClient.createRoot(container);

    await act(() =>
      root.render(
        <App submitterAction={() => Scheduler.log('Button action')} />,
      ),
    );
    await submit(buttonRef.current);
    assertLog(['Button action']);

    // When there's no button action, the form action should fire
    await act(() => root.render(<App submitterAction={null} />));
    await submit(buttonRef.current);
    assertLog(['Form action']);

    // Symbols are coerced to null, so this should fire the form action
    await act(() => root.render(<App submitterAction={Symbol()} />));
    assertConsoleErrorDev([
      'Invalid value for prop `formAction` on <button> tag. ' +
        'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
        'For details, see https://react.dev/link/attribute-behavior \n' +
        '    in button (at **)\n' +
        '    in App (at **)',
    ]);
    await submit(buttonRef.current);
    assertLog(['Form action']);

    // Booleans are coerced to null, so this should fire the form action
    await act(() => root.render(<App submitterAction={true} />));
    await submit(buttonRef.current);
    assertLog(['Form action']);

    // A string on the submitter should prevent the form action from firing
    // and trigger the native behavior
    await act(() => root.render(<App submitterAction="https://react.dev/" />));
    await expect(submit(buttonRef.current)).rejects.toThrow(
      'Navigate to: https://react.dev/',
    );
  });

  it(
    'useFormStatus is activated if startTransition is called ' +
      'inside preventDefault-ed submit event',
    async () => {
      function Output({value}) {
        const {pending} = useFormStatus();
        return <Text text={pending ? `${value} (pending...)` : value} />;
      }

      function App({value}) {
        const [, startFormTransition] = useTransition();

        function onSubmit(event) {
          event.preventDefault();
          startFormTransition(async () => {
            const updatedValue = event.target.elements.search.value;
            Scheduler.log('Action started');
            await getText('Wait');
            Scheduler.log('Action finished');
            startTransition(() => root.render(<App value={updatedValue} />));
          });
        }
        return (
          <form ref={formRef} onSubmit={onSubmit}>
            <input
              ref={inputRef}
              type="text"
              name="search"
              defaultValue={value}
            />
            <div ref={outputRef}>
              <Output value={value} />
            </div>
          </form>
        );
      }

      const formRef = React.createRef();
      const inputRef = React.createRef();
      const outputRef = React.createRef();
      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<App value="Initial" />));
      assertLog(['Initial']);

      // Update the input to something different
      inputRef.current.value = 'Updated';

      // Submit the form.
      await submit(formRef.current);
      // The form switches into a pending state.
      assertLog(['Action started', 'Initial (pending...)']);
      expect(outputRef.current.textContent).toBe('Initial (pending...)');

      // While the submission is still pending, update the input again so we
      // can check whether the form is reset after the action finishes.
      inputRef.current.value = 'Updated again after submission';

      // Resolve the async action
      await act(() => resolveText('Wait'));
      assertLog(['Action finished', 'Updated']);
      expect(outputRef.current.textContent).toBe('Updated');

      // Confirm that the form was not automatically reset (should call
      // requestFormReset(formRef.current) to opt into this behavior)
      expect(inputRef.current.value).toBe('Updated again after submission');
    },
  );

  it('useFormStatus is not activated if startTransition is not called', async () => {
    function Output({value}) {
      const {pending} = useFormStatus();

      return (
        <Text
          text={
            pending
              ? 'Should be unreachable! This test should never activate the pending state.'
              : value
          }
        />
      );
    }

    function App({value}) {
      async function onSubmit(event) {
        event.preventDefault();
        const updatedValue = event.target.elements.search.value;
        Scheduler.log('Async event handler started');
        await getText('Wait');
        Scheduler.log('Async event handler finished');
        startTransition(() => root.render(<App value={updatedValue} />));
      }
      return (
        <form ref={formRef} onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="text"
            name="search"
            defaultValue={value}
          />
          <div ref={outputRef}>
            <Output value={value} />
          </div>
        </form>
      );
    }

    const formRef = React.createRef();
    const inputRef = React.createRef();
    const outputRef = React.createRef();
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App value="Initial" />));
    assertLog(['Initial']);

    // Update the input to something different
    inputRef.current.value = 'Updated';

    // Submit the form.
    await submit(formRef.current);
    // Unlike the previous test, which uses startTransition to manually dispatch
    // an action, this test uses a regular event handler, so useFormStatus is
    // not activated.
    assertLog(['Async event handler started']);
    expect(outputRef.current.textContent).toBe('Initial');

    // While the submission is still pending, update the input again so we
    // can check whether the form is reset after the action finishes.
    inputRef.current.value = 'Updated again after submission';

    // Resolve the async action
    await act(() => resolveText('Wait'));
    assertLog(['Async event handler finished', 'Updated']);
    expect(outputRef.current.textContent).toBe('Updated');

    // Confirm that the form was not automatically reset (should call
    // requestFormReset(formRef.current) to opt into this behavior)
    expect(inputRef.current.value).toBe('Updated again after submission');
  });

  it('useFormStatus is not activated if event is not preventDefault-ed', async () => {
    function Output({value}) {
      const {pending} = useFormStatus();
      return <Text text={pending ? `${value} (pending...)` : value} />;
    }

    function App({value}) {
      const [, startFormTransition] = useTransition();

      function onSubmit(event) {
        // This event is not preventDefault-ed, so the default form submission
        // happens, and useFormStatus is not activated.
        startFormTransition(async () => {
          const updatedValue = event.target.elements.search.value;
          Scheduler.log('Action started');
          await getText('Wait');
          Scheduler.log('Action finished');
          startTransition(() => root.render(<App value={updatedValue} />));
        });
      }
      return (
        <form ref={formRef} onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="text"
            name="search"
            defaultValue={value}
          />
          <div ref={outputRef}>
            <Output value={value} />
          </div>
        </form>
      );
    }

    const formRef = React.createRef();
    const inputRef = React.createRef();
    const outputRef = React.createRef();
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App value="Initial" />));
    assertLog(['Initial']);

    // Update the input to something different
    inputRef.current.value = 'Updated';

    // Submitting the form should trigger the default navigation behavior
    await expect(submit(formRef.current)).rejects.toThrow(
      'Navigate to: http://localhost/',
    );

    // The useFormStatus hook was not activated
    assertLog(['Action started', 'Initial']);
    expect(outputRef.current.textContent).toBe('Initial');
  });

  it('useFormStatus coerces the value of the "action" prop', async () => {
    function Status() {
      const {pending, action} = useFormStatus();

      if (pending) {
        Scheduler.log(action);
        return 'Pending';
      } else {
        return 'Not pending';
      }
    }

    function Form({action}) {
      const [, startFormTransition] = useTransition();

      function onSubmit(event) {
        event.preventDefault();
        // Schedule an empty action for no other purpose than to trigger the
        // pending state.
        startFormTransition(async () => {});
      }
      return (
        <form ref={formRef} action={action} onSubmit={onSubmit}>
          <Status />
        </form>
      );
    }

    const formRef = React.createRef();
    const root = ReactDOMClient.createRoot(container);

    // Symbols are coerced to null
    await act(() => root.render(<Form action={Symbol()} />));
    assertConsoleErrorDev([
      'Invalid value for prop `action` on <form> tag. ' +
        'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
        'For details, see https://react.dev/link/attribute-behavior \n' +
        '    in form (at **)\n' +
        '    in Form (at **)',
    ]);
    await submit(formRef.current);
    assertLog([null]);

    // Booleans are coerced to null
    await act(() => root.render(<Form action={true} />));
    await submit(formRef.current);
    assertLog([null]);

    // Strings are passed through
    await act(() => root.render(<Form action="https://react.dev" />));
    await submit(formRef.current);
    assertLog(['https://react.dev']);

    // Functions are passed through
    const actionFn = () => {};
    await act(() => root.render(<Form action={actionFn} />));
    await submit(formRef.current);
    assertLog([actionFn]);

    // Everything else is toString-ed, unless trusted types are enabled.
    class MyAction {
      toString() {
        return 'stringified action';
      }
    }
    const instance = new MyAction();

    await act(() => root.render(<Form action={instance} />));
    await submit(formRef.current);
    assertLog(
      gate('enableTrustedTypesIntegration')
        ? [instance]
        : ['stringified action'],
    );
  });

  it('form actions should retain status when nested state changes', async () => {
    const formRef = React.createRef();

    let rerenderUnrelatedStatus;
    function UnrelatedStatus() {
      const {pending} = useFormStatus();
      const [counter, setCounter] = useState(0);
      rerenderUnrelatedStatus = () => setCounter(n => n + 1);
      Scheduler.log(`[unrelated form] pending: ${pending}, state: ${counter}`);
    }

    let rerenderTargetStatus;
    function TargetStatus() {
      const {pending} = useFormStatus();
      const [counter, setCounter] = useState(0);
      Scheduler.log(`[target form] pending: ${pending}, state: ${counter}`);
      rerenderTargetStatus = () => setCounter(n => n + 1);
    }

    function App() {
      async function action() {
        return new Promise(resolve => {
          // never resolves
        });
      }

      return (
        <>
          <form action={action} ref={formRef}>
            <input type="submit" />
            <TargetStatus />
          </form>
          <form>
            <UnrelatedStatus />
          </form>
        </>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));

    assertLog([
      '[target form] pending: false, state: 0',
      '[unrelated form] pending: false, state: 0',
    ]);

    await submit(formRef.current);

    assertLog(['[target form] pending: true, state: 0']);

    await act(() => rerenderTargetStatus());

    assertLog(['[target form] pending: true, state: 1']);

    await act(() => rerenderUnrelatedStatus());

    assertLog(['[unrelated form] pending: false, state: 1']);
  });
});
