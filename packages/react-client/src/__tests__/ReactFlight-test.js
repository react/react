/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

if (typeof Blob === 'undefined') {
  global.Blob = require('buffer').Blob;
}
if (typeof File === 'undefined' || typeof FormData === 'undefined') {
  global.File = require('undici').File;
  global.FormData = require('undici').FormData;
}

function normalizeCodeLocInfo(str) {
  return (
    str &&
    str.replace(/^ +(?:at|in) ([\S]+)[^\n]*/gm, function (m, name) {
      const dot = name.lastIndexOf('.');
      if (dot !== -1) {
        name = name.slice(dot + 1);
      }
      return '    in ' + name + (/\d/.test(m) ? ' (at **)' : '');
    })
  );
}

function normalizeReactCodeLocInfo(str) {
  const repoRootForRegexp = __REACT_ROOT_PATH_TEST__.replace(/\//g, '\\/');
  const repoFileLocMatch = new RegExp(`${repoRootForRegexp}.+?:\\d+:\\d+`, 'g');
  return str && str.replace(repoFileLocMatch, '**');
}

// If we just use the original Error prototype, Jest will only display the error message if assertions fail.
// But we usually want to also assert on our expando properties or even the stack.
// By hiding the fact from Jest that this is an error, it will show all enumerable properties on mismatch.

function getErrorForJestMatcher(error) {
  return {
    ...error,
    // non-enumerable properties that are still relevant for testing
    message: error.message,
    stack: normalizeReactCodeLocInfo(error.stack),
  };
}

const finalizationRegistries = [];
function FinalizationRegistryMock(callback) {
  this._heldValues = [];
  this._callback = callback;
  finalizationRegistries.push(this);
}
FinalizationRegistryMock.prototype.register = function (target, heldValue) {
  this._heldValues.push(heldValue);
};
global.FinalizationRegistry = FinalizationRegistryMock;

function gc() {
  for (let i = 0; i < finalizationRegistries.length; i++) {
    const registry = finalizationRegistries[i];
    const callback = registry._callback;
    const heldValues = registry._heldValues;
    for (let j = 0; j < heldValues.length; j++) {
      callback(heldValues[j]);
    }
    heldValues.length = 0;
  }
}

let act;
let use;
let startTransition;
let React;
let ReactServer;
let ReactNoop;
let ReactNoopFlightServer;
let ReactNoopFlightClient;
let ErrorBoundary;
let NoErrorExpected;
let Scheduler;
let assertLog;
let assertConsoleErrorDev;
let getDebugInfo;

describe('ReactFlight', () => {
  beforeEach(() => {
    // Mock performance.now for timing tests
    let time = 10;
    const now = jest.fn().mockImplementation(() => {
      return time++;
    });
    Object.defineProperty(performance, 'timeOrigin', {
      value: time,
      configurable: true,
    });
    Object.defineProperty(performance, 'now', {
      value: now,
      configurable: true,
    });

    jest.resetModules();
    jest.mock('react', () => require('react/react.react-server'));
    ReactServer = require('react');
    ReactNoopFlightServer = require('react-noop-renderer/flight-server');
    // This stores the state so we need to preserve it
    const flightModules = require('react-noop-renderer/flight-modules');
    jest.resetModules();
    __unmockReact();
    jest.mock('react-noop-renderer/flight-modules', () => flightModules);
    React = require('react');
    startTransition = React.startTransition;
    use = React.use;
    ReactNoop = require('react-noop-renderer');
    ReactNoopFlightClient = require('react-noop-renderer/flight-client');
    act = require('internal-test-utils').act;
    Scheduler = require('scheduler');
    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;

    getDebugInfo = InternalTestUtils.getDebugInfo.bind(null, {
      useV8Stack: true,
      ignoreRscStreamInfo: true,
    });

    ErrorBoundary = class extends React.Component {
      state = {hasError: false, error: null};
      static getDerivedStateFromError(error) {
        return {
          hasError: true,
          error,
        };
      }
      componentDidCatch(error, errorInfo) {
        expect(error).toBe(this.state.error);
        if (this.props.expectedStack !== undefined) {
          expect(normalizeCodeLocInfo(errorInfo.componentStack)).toBe(
            this.props.expectedStack,
          );
        }
      }
      componentDidMount() {
        expect(this.state.hasError).toBe(true);
        expect(this.state.error).toBeTruthy();
        if (__DEV__) {
          expect(this.state.error.message).toContain(
            this.props.expectedMessage,
          );
          expect(this.state.error.digest).toBe('a dev digest');
          expect(this.state.error.environmentName).toBe(
            this.props.expectedEnviromentName || 'Server',
          );
          if (this.props.expectedErrorStack !== undefined) {
            expect(this.state.error.stack).toContain(
              this.props.expectedErrorStack,
            );
          }
        } else {
          expect(this.state.error.message).toBe(
            'An error occurred in the Server Components render. The specific message is omitted in production' +
              ' builds to avoid leaking sensitive details. A digest property is included on this error instance which' +
              ' may provide additional details about the nature of the error.',
          );
          let expectedDigest = this.props.expectedMessage;
          if (
            expectedDigest.startsWith('{') ||
            expectedDigest.startsWith('<')
          ) {
            expectedDigest = '{}';
          } else if (expectedDigest.startsWith('[')) {
            expectedDigest = '[]';
          }
          expect(this.state.error.digest).toContain(expectedDigest);
          expect(this.state.error.environmentName).toBe(undefined);
          expect(this.state.error.stack).toBe(
            'Error: ' + this.state.error.message,
          );
        }
      }
      render() {
        if (this.state.hasError) {
          return this.state.error.message;
        }
        return this.props.children;
      }
    };

    NoErrorExpected = class extends React.Component {
      state = {hasError: false, error: null};
      static getDerivedStateFromError(error) {
        return {
          hasError: true,
          error,
        };
      }
      componentDidMount() {
        expect(this.state.error).toBe(null);
        expect(this.state.hasError).toBe(false);
      }
      render() {
        if (this.state.hasError) {
          return this.state.error.message;
        }
        return this.props.children;
      }
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function clientReference(value) {
    return Object.defineProperties(
      function () {
        throw new Error('Cannot call a client function from the server.');
      },
      {
        $$typeof: {value: Symbol.for('react.client.reference')},
        value: {value: value},
      },
    );
  }

  it('can render a Server Component', async () => {
    function Bar({text}) {
      return text.toUpperCase();
    }
    function Foo() {
      return {
        bar: (
          <div>
            <Bar text="a" />, <Bar text="b" />
          </div>
        ),
      };
    }
    const transport = ReactNoopFlightServer.render({
      foo: <Foo />,
    });
    const model = await ReactNoopFlightClient.read(transport);
    expect(model).toEqual({
      foo: {
        bar: (
          <div>
            {'A'}
            {', '}
            {'B'}
          </div>
        ),
      },
    });
  });

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('can render a Client Component using a module reference and render there', async () => {
    function UserClient(props) {
      return (
        <span>
          {props.greeting}, {props.name}
        </span>
      );
    }
    const User = clientReference(UserClient);

    function Greeting({firstName, lastName}) {
      return <User greeting="Hello" name={firstName + ' ' + lastName} />;
    }

    const model = {
      greeting: <Greeting firstName="Seb" lastName="Smith" />,
    };

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      const greeting = rootModel.greeting;
      expect(getDebugInfo(greeting)).toEqual(
        __DEV__
          ? [
              {time: 12},
              {
                name: 'Greeting',
                env: 'Server',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {
                  firstName: 'Seb',
                  lastName: 'Smith',
                },
              },
              {time: 13},
            ]
          : undefined,
      );
      ReactNoop.render(greeting);
    });

    expect(ReactNoop).toMatchRenderedOutput(<span>Hello, Seb Smith</span>);
  });

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('can render a shared forwardRef Component', async () => {
    const Greeting = React.forwardRef(function Greeting(
      {firstName, lastName},
      ref,
    ) {
      return (
        <span ref={ref}>
          Hello, {firstName} {lastName}
        </span>
      );
    });

    const root = <Greeting firstName="Seb" lastName="Smith" />;

    const transport = ReactNoopFlightServer.render(root);

    await act(async () => {
      const result = await ReactNoopFlightClient.read(transport);
      expect(getDebugInfo(result)).toEqual(
        __DEV__
          ? [
              {time: 12},
              {
                name: 'Greeting',
                env: 'Server',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {
                  firstName: 'Seb',
                  lastName: 'Smith',
                },
              },
              {time: 13},
            ]
          : undefined,
      );
      ReactNoop.render(result);
    });

    expect(ReactNoop).toMatchRenderedOutput(<span>Hello, Seb Smith</span>);
  });

  it('can render an iterable as an array', async () => {
    function ItemListClient(props) {
      return <span>{props.items}</span>;
    }
    const ItemList = clientReference(ItemListClient);

    function Items() {
      const iterable = {
        [Symbol.iterator]: function* () {
          yield 'A';
          yield 'B';
          yield 'C';
        },
      };
      return <ItemList items={iterable} />;
    }

    const model = <Items />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(<span>ABC</span>);
  });

  it('can render an iterator as a single shot iterator', async () => {
    const iterator = (function* () {
      yield 'A';
      yield 'B';
      yield 'C';
    })();

    const transport = ReactNoopFlightServer.render(iterator);
    const result = await ReactNoopFlightClient.read(transport);

    // The iterator should be the same as itself.
    expect(result[Symbol.iterator]()).toBe(result);

    expect(Array.from(result)).toEqual(['A', 'B', 'C']);
    // We've already consumed this iterator.
    expect(Array.from(result)).toEqual([]);
  });

  it('can render a Generator Server Component as a fragment', async () => {
    function ItemListClient(props) {
      return <span>{props.children}</span>;
    }
    const ItemList = clientReference(ItemListClient);

    function* Items() {
      yield 'A';
      yield 'B';
      yield 'C';
    }

    const model = (
      <ItemList>
        <Items />
      </ItemList>
    );

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(<span>ABC</span>);
  });

  it('can render undefined', async () => {
    function Undefined() {
      return undefined;
    }

    const model = <Undefined />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  // @gate FIXME
  it('should transport undefined object values', async () => {
    function ServerComponent(props) {
      return 'prop' in props
        ? `\`prop\` in props as '${props.prop}'`
        : '`prop` not in props';
    }
    const ClientComponent = clientReference(ServerComponent);

    const model = (
      <>
        <div>
          Server: <ServerComponent prop={undefined} />
        </div>
        <div>
          Client: <ClientComponent prop={undefined} />
        </div>
      </>
    );

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>Server: `prop` in props as 'undefined'</div>
        <div>Client: `prop` in props as 'undefined'</div>
      </>,
    );
  });

  it('can render an empty fragment', async () => {
    function Empty() {
      return <React.Fragment />;
    }

    const model = <Empty />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  it('can transport weird numbers', async () => {
    const nums = [0, -0, Infinity, -Infinity, NaN];
    function ComponentClient({prop}) {
      expect(prop).not.toBe(nums);
      expect(prop).toEqual(nums);
      expect(prop.every((p, i) => Object.is(p, nums[i]))).toBe(true);
      return `prop: ${prop}`;
    }
    const Component = clientReference(ComponentClient);

    const model = <Component prop={nums} />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      // already checked -0 with expects above
      'prop: 0,0,Infinity,-Infinity,NaN',
    );
  });

  it('can transport BigInt', async () => {
    function ComponentClient({prop}) {
      return `prop: ${prop} (${typeof prop})`;
    }
    const Component = clientReference(ComponentClient);

    const model = <Component prop={90071992547409910000n} />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      'prop: 90071992547409910000 (bigint)',
    );
  });

  it('can transport Date', async () => {
    function ComponentClient({prop}) {
      return `prop: ${prop.toISOString()}`;
    }
    const Component = clientReference(ComponentClient);

    const model = <Component prop={new Date(1234567890123)} />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput('prop: 2009-02-13T23:31:30.123Z');
  });

  it('can transport Map', async () => {
    function ComponentClient({prop, selected}) {
      return `
        map: ${prop instanceof Map}
        size: ${prop.size}
        greet: ${prop.get('hi').greet}
        content: ${JSON.stringify(Array.from(prop))}
        selected: ${prop.get(selected)}
      `;
    }
    const Component = clientReference(ComponentClient);

    const objKey = {obj: 'key'};
    const map = new Map([
      ['hi', {greet: 'world'}],
      [objKey, 123],
    ]);
    const model = <Component prop={map} selected={objKey} />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(`
        map: true
        size: 2
        greet: world
        content: [["hi",{"greet":"world"}],[{"obj":"key"},123]]
        selected: 123
      `);
  });

  it('can transport Set', async () => {
    function ComponentClient({prop, selected}) {
      return `
        set: ${prop instanceof Set}
        size: ${prop.size}
        hi: ${prop.has('hi')}
        content: ${JSON.stringify(Array.from(prop))}
        selected: ${prop.has(selected)}
      `;
    }
    const Component = clientReference(ComponentClient);

    const objKey = {obj: 'key'};
    const set = new Set(['hi', objKey]);
    const model = <Component prop={set} selected={objKey} />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(`
        set: true
        size: 2
        hi: true
        content: ["hi",{"obj":"key"}]
        selected: true
      `);
  });

  it('can transport FormData (no blobs)', async () => {
    function ComponentClient({prop}) {
      return `
        formData: ${prop instanceof FormData}
        hi: ${prop.get('hi')}
        multiple: ${prop.getAll('multiple')}
        content: ${JSON.stringify(Array.from(prop))}
      `;
    }
    const Component = clientReference(ComponentClient);

    const formData = new FormData();
    formData.append('hi', 'world');
    formData.append('multiple', 1);
    formData.append('multiple', 2);

    const model = <Component prop={formData} />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(`
        formData: true
        hi: world
        multiple: 1,2
        content: [["hi","world"],["multiple","1"],["multiple","2"]]
      `);
  });

  it('can transport Date as a top-level value', async () => {
    const date = new Date(0);
    const transport = ReactNoopFlightServer.render(date);

    let readValue;
    await act(async () => {
      readValue = await ReactNoopFlightClient.read(transport);
    });

    expect(readValue).toEqual(date);
  });

  it('can transport Error objects as values', async () => {
    class CustomError extends Error {
      constructor(message) {
        super(message);
        this.name = 'Custom';
      }
    }

    function ComponentClient({prop}) {
      return `
        is error: ${prop instanceof Error}
        name: ${prop.name}
        message: ${prop.message}
        stack: ${normalizeCodeLocInfo(prop.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${prop.environmentName}
      `;
    }
    const Component = clientReference(ComponentClient);

    function ServerComponent() {
      const error = new CustomError('hello');
      return <Component prop={error} />;
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    if (__DEV__) {
      expect(ReactNoop).toMatchRenderedOutput(`
        is error: true
        name: Custom
        message: hello
        stack: Custom: hello
    in ServerComponent (at **)
        environmentName: Server
      `);
    } else {
      expect(ReactNoop).toMatchRenderedOutput(`
        is error: true
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
      `);
    }
  });

  it('can transport Error.cause', async () => {
    function renderError(error) {
      if (!(error instanceof Error)) {
        return `${JSON.stringify(error)}`;
      }
      return `
        is error: ${error instanceof Error}
        name: ${error.name}
        message: ${error.message}
        stack: ${normalizeCodeLocInfo(error.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${error.environmentName}
        cause: ${'cause' in error ? renderError(error.cause) : 'no cause'}`;
    }
    function ComponentClient({error}) {
      return renderError(error);
    }
    const Component = clientReference(ComponentClient);

    function ServerComponent() {
      const cause = new TypeError('root cause', {
        cause: {type: 'object cause'},
      });
      const error = new Error('hello', {cause});
      return <Component error={error} />;
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />, {
      onError(x) {
        if (__DEV__) {
          return 'a dev digest';
        }
        return `digest("${x.message}")`;
      },
    });

    await act(() => {
      ReactNoop.render(ReactNoopFlightClient.read(transport));
    });

    if (__DEV__) {
      expect(ReactNoop).toMatchRenderedOutput(`
        is error: true
        name: Error
        message: hello
        stack: Error: hello
    in ServerComponent (at **)
        environmentName: Server
        cause: 
        is error: true
        name: TypeError
        message: root cause
        stack: TypeError: root cause
    in ServerComponent (at **)
        environmentName: Server
        cause: {"type":"object cause"}`);
    } else {
      expect(ReactNoop).toMatchRenderedOutput(`
        is error: true
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
        cause: no cause`);
    }
  });

  it('includes Error.cause in thrown errors', async () => {
    function renderError(error) {
      if (!(error instanceof Error)) {
        return `${JSON.stringify(error)}`;
      }
      return `
        is error: true
        name: ${error.name}
        message: ${error.message}
        stack: ${normalizeCodeLocInfo(error.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${error.environmentName}
        cause: ${'cause' in error ? renderError(error.cause) : 'no cause'}`;
    }

    function ServerComponent() {
      const cause = new TypeError('root cause', {
        cause: {type: 'object cause'},
      });
      const error = new Error('hello', {cause});
      throw error;
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />, {
      onError(x) {
        if (__DEV__) {
          return 'a dev digest';
        }
        return `digest("${x.message}")`;
      },
    });

    let error;
    try {
      await act(() => {
        ReactNoop.render(ReactNoopFlightClient.read(transport));
      });
    } catch (x) {
      error = x;
    }

    if (__DEV__) {
      expect(renderError(error)).toEqual(`
        is error: true
        name: Error
        message: hello
        stack: Error: hello
    in ServerComponent (at **)
        environmentName: Server
        cause: 
        is error: true
        name: TypeError
        message: root cause
        stack: TypeError: root cause
    in ServerComponent (at **)
        environmentName: Server
        cause: {"type":"object cause"}`);
    } else {
      expect(renderError(error)).toEqual(`
        is error: true
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
        cause: no cause`);
    }
  });

  it('can transport AggregateError', async () => {
    function renderError(error) {
      if (!(error instanceof Error)) {
        return `${JSON.stringify(error)}`;
      }
      let result = `
        is error: ${error instanceof AggregateError ? 'AggregateError' : 'Error'}
        name: ${error.name}
        message: ${error.message}
        stack: ${normalizeCodeLocInfo(error.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${error.environmentName}
        cause: ${'cause' in error ? renderError(error.cause) : 'no cause'}`;
      if ('errors' in error) {
        result += `
        errors: [${error.errors.map(e => renderError(e)).join(',\n')}]`;
      }
      return result;
    }
    function ComponentClient({error}) {
      return renderError(error);
    }
    const Component = clientReference(ComponentClient);

    function ServerComponent() {
      const error1 = new TypeError('first error');
      const error2 = new RangeError('second error');
      const error = new AggregateError([error1, error2], 'aggregate');
      return <Component error={error} />;
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />, {
      onError(x) {
        if (__DEV__) {
          return 'a dev digest';
        }
        return `digest("${x.message}")`;
      },
    });

    await act(() => {
      ReactNoop.render(ReactNoopFlightClient.read(transport));
    });

    if (__DEV__) {
      expect(ReactNoop).toMatchRenderedOutput(`
        is error: AggregateError
        name: AggregateError
        message: aggregate
        stack: AggregateError: aggregate
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause
        errors: [
        is error: Error
        name: TypeError
        message: first error
        stack: TypeError: first error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: RangeError
        message: second error
        stack: RangeError: second error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause]`);
    } else {
      expect(ReactNoop).toMatchRenderedOutput(`
        is error: Error
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
        cause: no cause`);
    }
  });

  it('includes AggregateError.errors in thrown errors', async () => {
    function renderError(error) {
      if (!(error instanceof Error)) {
        return `${JSON.stringify(error)}`;
      }
      let result = `
        is error: ${error instanceof AggregateError ? 'AggregateError' : 'Error'}
        name: ${error.name}
        message: ${error.message}
        stack: ${normalizeCodeLocInfo(error.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${error.environmentName}
        cause: ${'cause' in error ? renderError(error.cause) : 'no cause'}`;
      if ('errors' in error) {
        result += `
        errors: [${error.errors.map(e => renderError(e)).join(',\n')}]`;
      }
      return result;
    }

    function ServerComponent() {
      const error1 = new TypeError('first error');
      const error2 = new RangeError('second error');
      const error3 = new Error('third error');
      const error4 = new Error('fourth error');
      const error5 = new Error('fifth error');
      const error6 = new Error('sixth error');
      const error = new AggregateError(
        [error1, error2, error3, error4, error5, error6],
        'aggregate',
      );
      throw error;
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />, {
      onError(x) {
        if (__DEV__) {
          return 'a dev digest';
        }
        return `digest("${x.message}")`;
      },
    });

    let error;
    try {
      await act(() => {
        ReactNoop.render(ReactNoopFlightClient.read(transport));
      });
    } catch (x) {
      error = x;
    }

    if (__DEV__) {
      expect(renderError(error)).toEqual(`
        is error: AggregateError
        name: AggregateError
        message: aggregate
        stack: AggregateError: aggregate
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause
        errors: [
        is error: Error
        name: TypeError
        message: first error
        stack: TypeError: first error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: RangeError
        message: second error
        stack: RangeError: second error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: Error
        message: third error
        stack: Error: third error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: Error
        message: fourth error
        stack: Error: fourth error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: Error
        message: fifth error
        stack: Error: fifth error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: Error
        message: sixth error
        stack: Error: sixth error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause]`);
    } else {
      expect(renderError(error)).toEqual(`
        is error: Error
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
        cause: no cause`);
    }
  });

  it('can transport cyclic objects', async () => {
    function ComponentClient({prop}) {
      expect(prop.obj.obj.obj).toBe(prop.obj.obj);
    }
    const Component = clientReference(ComponentClient);

    const cyclic = {obj: null};
    cyclic.obj = cyclic;
    const model = <Component prop={cyclic} />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });
  });

  it('can transport cyclic arrays', async () => {
    function ComponentClient({prop, obj}) {
      expect(prop[1]).toBe(prop);
      expect(prop[0]).toBe(obj);
    }
    const Component = clientReference(ComponentClient);

    const obj = {};
    const cyclic = [obj];
    cyclic[1] = cyclic;
    const model = <Component prop={cyclic} obj={obj} />;

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });
  });

  it('can render a lazy component as a shared component on the server', async () => {
    function SharedComponent({text}) {
      return (
        <div>
          shared<span>{text}</span>
        </div>
      );
    }

    let load = null;
    const loadSharedComponent = () => {
      return new Promise(res => {
        load = () => res({default: SharedComponent});
      });
    };

    const LazySharedComponent = React.lazy(loadSharedComponent);

    function ServerComponent() {
      return (
        <React.Suspense fallback={'Loading...'}>
          <LazySharedComponent text={'a'} />
        </React.Suspense>
      );
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />);

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      ReactNoop.render(rootModel);
    });
    expect(ReactNoop).toMatchRenderedOutput('Loading...');
    await load();

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      ReactNoop.render(rootModel);
    });
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        shared<span>a</span>
      </div>,
    );
  });

  it('errors on a Lazy element being used in Component position', async () => {
    function SharedComponent({text}) {
      return (
        <div>
          shared<span>{text}</span>
        </div>
      );
    }

    let load = null;

    const LazyElementDisguisedAsComponent = React.lazy(() => {
      return new Promise(res => {
        load = () => res({default: <SharedComponent text={'a'} />});
      });
    });

    function ServerComponent() {
      return (
        <React.Suspense fallback={'Loading...'}>
          <LazyElementDisguisedAsComponent text={'b'} />
        </React.Suspense>
      );
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />);

    await load();

    await expect(async () => {
      await act(async () => {
        const rootModel = await ReactNoopFlightClient.read(transport);
        ReactNoop.render(rootModel);
      });
    }).rejects.toThrow(
      __DEV__
        ? 'Element type is invalid: expected a string (for built-in components) or a class/function ' +
            '(for composite components) but got: <div />. ' +
            'Did you accidentally export a JSX literal instead of a component?'
        : 'Element type is invalid: expected a string (for built-in components) or a class/function ' +
            '(for composite components) but got: object.',
    );
    expect(ReactNoop).toMatchRenderedOutput(null);
  });

  it('can render a lazy element', async () => {
    function SharedComponent({text}) {
      return (
        <div>
          shared<span>{text}</span>
        </div>
      );
    }

    let load = null;

    const lazySharedElement = React.lazy(() => {
      return new Promise(res => {
        load = () => res({default: <SharedComponent text={'a'} />});
      });
    });

    function ServerComponent() {
      return (
        <React.Suspense fallback={'Loading...'}>
          {lazySharedElement}
        </React.Suspense>
      );
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />);

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      ReactNoop.render(rootModel);
    });
    expect(ReactNoop).toMatchRenderedOutput('Loading...');
    await load();

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      ReactNoop.render(rootModel);
    });
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        shared<span>a</span>
      </div>,
    );
  });

  it('errors with lazy value in element position that resolves to Component', async () => {
    function SharedComponent({text}) {
      return (
        <div>
          shared<span>{text}</span>
        </div>
      );
    }

    let load = null;

    const componentDisguisedAsElement = React.lazy(() => {
      return new Promise(res => {
        load = () => res({default: SharedComponent});
      });
    });

    function ServerComponent() {
      return (
        <React.Suspense fallback={'Loading...'}>
          {componentDisguisedAsElement}
        </React.Suspense>
      );
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />);

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      ReactNoop.render(rootModel);
    });
    expect(ReactNoop).toMatchRenderedOutput('Loading...');
    spyOnDevAndProd(console, 'error').mockImplementation(() => {});
    await load();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('can render a lazy module reference', async () => {
    function ClientComponent() {
      return <div>I am client</div>;
    }

    const ClientComponentReference = clientReference(ClientComponent);

    let load = null;
    const loadClientComponentReference = () => {
      return new Promise(res => {
        load = () => res({default: ClientComponentReference});
      });
    };

    const LazyClientComponentReference = React.lazy(
      loadClientComponentReference,
    );

    function ServerComponent() {
      return (
        <React.Suspense fallback={'Loading...'}>
          <LazyClientComponentReference />
        </React.Suspense>
      );
    }

    const transport = ReactNoopFlightServer.render(<ServerComponent />);

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      ReactNoop.render(rootModel);
    });
    expect(ReactNoop).toMatchRenderedOutput('Loading...');
    await load();

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      ReactNoop.render(rootModel);
    });
    expect(ReactNoop).toMatchRenderedOutput(<div>I am client</div>);
  });

  it('should error if a non-serializable value is passed to a host component', async () => {
    function ClientImpl({children}) {
      return children;
    }
    const Client = clientReference(ClientImpl);

    function EventHandlerProp() {
      return (
        <div className="foo" onClick={function () {}}>
          Test
        </div>
      );
    }
    function FunctionProp() {
      return <div>{function fn() {}}</div>;
    }
    function SymbolProp() {
      return <div foo={Symbol('foo')} />;
    }

    const ref = React.createRef();
    function RefProp() {
      return <div ref={ref} />;
    }

    function EventHandlerPropClient() {
      return (
        <Client className="foo" onClick={function () {}}>
          Test
        </Client>
      );
    }
    function FunctionChildrenClient() {
      return <Client>{function Component() {}}</Client>;
    }
    function FunctionPropClient() {
      return <Client foo={() => {}} />;
    }
    function SymbolPropClient() {
      return <Client foo={Symbol('foo')} />;
    }

    function RefPropClient() {
      return <Client ref={ref} />;
    }

    const options = {
      onError(x) {
        return __DEV__ ? 'a dev digest' : `digest("${x.message}")`;
      },
    };
    const event = ReactNoopFlightServer.render(<EventHandlerProp />, options);
    const fn = ReactNoopFlightServer.render(<FunctionProp />, options);
    const symbol = ReactNoopFlightServer.render(<SymbolProp />, options);
    const refs = ReactNoopFlightServer.render(<RefProp />, options);
    const eventClient = ReactNoopFlightServer.render(
      <EventHandlerPropClient />,
      options,
    );
    const fnChildrenClient = ReactNoopFlightServer.render(
      <FunctionChildrenClient />,
      options,
    );
    const fnClient = ReactNoopFlightServer.render(
      <FunctionPropClient />,
      options,
    );
    const symbolClient = ReactNoopFlightServer.render(
      <SymbolPropClient />,
      options,
    );
    const refsClient = ReactNoopFlightServer.render(<RefPropClient />, options);

    function Render({promise}) {
      return use(promise);
    }

    await act(() => {
      startTransition(() => {
        ReactNoop.render(
          <>
            <ErrorBoundary expectedMessage="Event handlers cannot be passed to Client Component props.">
              <Render promise={ReactNoopFlightClient.read(event)} />
            </ErrorBoundary>
            <ErrorBoundary
              expectedMessage={
                __DEV__
                  ? 'Functions are not valid as a child of Client Components. This may happen if you return fn instead of <fn /> from render. Or maybe you meant to call this function rather than return it.'
                  : 'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".'
              }>
              <Render promise={ReactNoopFlightClient.read(fn)} />
            </ErrorBoundary>
            <ErrorBoundary expectedMessage="Only global symbols received from Symbol.for(...) can be passed to Client Components.">
              <Render promise={ReactNoopFlightClient.read(symbol)} />
            </ErrorBoundary>
            <ErrorBoundary expectedMessage="Refs cannot be used in Server Components, nor passed to Client Components.">
              <Render promise={ReactNoopFlightClient.read(refs)} />
            </ErrorBoundary>
            <ErrorBoundary expectedMessage="Event handlers cannot be passed to Client Component props.">
              <Render promise={ReactNoopFlightClient.read(eventClient)} />
            </ErrorBoundary>
            <ErrorBoundary
              expectedMessage={
                __DEV__
                  ? 'Functions are not valid as a child of Client Components. This may happen if you return Component instead of <Component /> from render. Or maybe you meant to call this function rather than return it.'
                  : 'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".'
              }>
              <Render promise={ReactNoopFlightClient.read(fnChildrenClient)} />
            </ErrorBoundary>
            <ErrorBoundary
              expectedMessage={
                'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".'
              }>
              <Render promise={ReactNoopFlightClient.read(fnClient)} />
            </ErrorBoundary>
            <ErrorBoundary expectedMessage="Only global symbols received from Symbol.for(...) can be passed to Client Components.">
              <Render promise={ReactNoopFlightClient.read(symbolClient)} />
            </ErrorBoundary>
            <ErrorBoundary expectedMessage="Refs cannot be used in Server Components, nor passed to Client Components.">
              <Render promise={ReactNoopFlightClient.read(refsClient)} />
            </ErrorBoundary>
          </>,
        );
      });
    });
  });

  it('should emit descriptions of errors in dev', async () => {
    const ClientErrorBoundary = clientReference(ErrorBoundary);

    function Throw({value}) {
      throw value;
    }

    function RenderInlined() {
      const inlinedElement = {
        $$typeof: Symbol.for('react.element'),
        type: () => {},
        key: null,
        ref: null,
        props: {},
        _owner: null,
      };
      return inlinedElement;
    }

    // We wrap in lazy to ensure the errors throws lazily.
    const LazyInlined = React.lazy(async () => ({default: RenderInlined}));

    const testCases = (
      <>
        <ClientErrorBoundary expectedMessage="This is a real Error.">
          <Throw value={new TypeError('This is a real Error.')} />
        </ClientErrorBoundary>
        <ClientErrorBoundary expectedMessage="This is a string error.">
          <Throw value="This is a string error." />
        </ClientErrorBoundary>
        <ClientErrorBoundary expectedMessage="{message: ..., extra: ..., nested: ...}">
          <Throw
            value={{
              message: 'This is a long message',
              extra: 'properties',
              nested: {more: 'prop'},
            }}
          />
        </ClientErrorBoundary>
        <ClientErrorBoundary
          expectedMessage={'{message: "Short", extra: ..., nested: ...}'}>
          <Throw
            value={{
              message: 'Short',
              extra: 'properties',
              nested: {more: 'prop'},
            }}
          />
        </ClientErrorBoundary>
        <ClientErrorBoundary expectedMessage="Symbol(hello)">
          <Throw value={Symbol('hello')} />
        </ClientErrorBoundary>
        <ClientErrorBoundary expectedMessage="123">
          <Throw value={123} />
        </ClientErrorBoundary>
        <ClientErrorBoundary expectedMessage="undefined">
          <Throw value={undefined} />
        </ClientErrorBoundary>
        <ClientErrorBoundary expectedMessage="<div/>">
          <Throw value={<div />} />
        </ClientErrorBoundary>
        <ClientErrorBoundary expectedMessage="function Foo() {}">
          <Throw value={function Foo() {}} />
        </ClientErrorBoundary>
        <ClientErrorBoundary expectedMessage={'["array"]'}>
          <Throw value={['array']} />
        </ClientErrorBoundary>
        <ClientErrorBoundary
          expectedMessage={
            'A React Element from an older version of React was rendered. ' +
            'This is not supported. It can happen if:\n' +
            '- Multiple copies of the "react" package is used.\n' +
            '- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n' +
            '- A compiler tries to "inline" JSX instead of using the runtime.'
          }>
          <LazyInlined />
        </ClientErrorBoundary>
      </>
    );

    const transport = ReactNoopFlightServer.render(testCases, {
      onError(x) {
        if (__DEV__) {
          return 'a dev digest';
        }
        if (x instanceof Error) {
          return `digest("${x.message}")`;
        } else if (Array.isArray(x)) {
          return `digest([])`;
        } else if (typeof x === 'object' && x !== null) {
          return `digest({})`;
        }
        return `digest(${String(x)})`;
      },
    });

    await act(() => {
      startTransition(() => {
        ReactNoop.render(ReactNoopFlightClient.read(transport));
      });
    });
  });

  it('should include server components in error boundary stacks in dev', async () => {
    const ClientErrorBoundary = clientReference(ErrorBoundary);

    function Throw({value}) {
      throw value;
    }

    const expectedStack = __DEV__
      ? '\n    in Throw' +
        '\n    in div' +
        '\n    in ErrorBoundary (at **)' +
        '\n    in App'
      : '\n    in div' + '\n    in ErrorBoundary (at **)';

    function App() {
      return (
        <ClientErrorBoundary
          expectedMessage="This is a real Error."
          expectedStack={expectedStack}>
          <div>
            <Throw value={new TypeError('This is a real Error.')} />
          </div>
        </ClientErrorBoundary>
      );
    }

    const transport = ReactNoopFlightServer.render(<App />, {
      onError(x) {
        if (__DEV__) {
          return 'a dev digest';
        }
        if (x instanceof Error) {
          return `digest("${x.message}")`;
        } else if (Array.isArray(x)) {
          return `digest([])`;
        } else if (typeof x === 'object' && x !== null) {
          return `digest({})`;
        }
        return `digest(${String(x)})`;
      },
    });

    await act(() => {
      startTransition(() => {
        ReactNoop.render(ReactNoopFlightClient.read(transport));
      });
    });
  });

  it('should handle serialization errors in element inside error boundary', async () => {
    const ClientErrorBoundary = clientReference(ErrorBoundary);

    const expectedStack = __DEV__
      ? '\n    in div' + '\n    in ErrorBoundary (at **)' + '\n    in App'
      : '\n    in ErrorBoundary (at **)';

    function App() {
      return (
        <ClientErrorBoundary
          expectedMessage="Event handlers cannot be passed to Client Component props."
          expectedStack={expectedStack}>
          <div onClick={function () {}} />
        </ClientErrorBoundary>
      );
    }

    const transport = ReactNoopFlightServer.render(<App />, {
      onError(x) {
        if (__DEV__) {
          return 'a dev digest';
        }
        if (x instanceof Error) {
          return `digest("${x.message}")`;
        } else if (Array.isArray(x)) {
          return `digest([])`;
        } else if (typeof x === 'object' && x !== null) {
          return `digest({})`;
        }
        return `digest(${String(x)})`;
      },
    });

    await act(() => {
      startTransition(() => {
        ReactNoop.render(ReactNoopFlightClient.read(transport));
      });
    });
  });

  it('should handle exotic stack frames', async () => {
    function ServerComponent() {
      const error = new Error('This is an error');
      const originalStackLines = error.stack.split('\n');
      // Fake a stack
      error.stack = [
        originalStackLines[0],
        // original
        // '    at ServerComponentError (file://~/react/packages/react-client/src/__tests__/ReactFlight-test.js:1166:19)',
        // nested eval (https://github.com/ChromeDevTools/devtools-frontend/blob/831be28facb4e85de5ee8c1acc4d98dfeda7a73b/test/unittests/front_end/panels/console/ErrorStackParser_test.ts#L198)
        '    at eval (eval at testFunction (inspected-page.html:29:11), <anonymous>:1:10)',
        // parens may be added by Webpack when bundle layers are used. They're also valid in directory names.
        '    at ServerComponentError (file://~/(some)(really)(exotic-directory)/ReactFlight-test.js:1166:19)',
        // anon function (https://github.com/ChromeDevTools/devtools-frontend/blob/831be28facb4e85de5ee8c1acc4d98dfeda7a73b/test/unittests/front_end/panels/console/ErrorStackParser_test.ts#L115C9-L115C35)
        '    at file:///testing.js:42:3',
        // async anon function (https://github.com/ChromeDevTools/devtools-frontend/blob/831be28facb4e85de5ee8c1acc4d98dfeda7a73b/test/unittests/front_end/panels/console/ErrorStackParser_test.ts#L130C9-L130C41)
        '    at async file:///testing.js:42:3',
        // third-party RSC frame
        // Ideally this would be a real frame produced by React not a mocked one.
        '    at ThirdParty (about://React/ThirdParty/file:///code/%5Broot%2520of%2520the%2520server%5D.js?42:1:1)',
        // We'll later filter this out based on line/column in `filterStackFrame`.
        '    at ThirdPartyModule (file:///file-with-index-source-map.js:52656:16374)',
        // host component in parent stack
        '    at div (<anonymous>)',
        ...originalStackLines.slice(2),
      ].join('\n');
      throw error;
    }

    const findSourceMapURL = jest.fn(() => null);
    const errors = [];
    class MyErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      componentDidCatch(error, componentInfo) {
        errors.push(error);
      }
      render() {
        if (this.state.error) {
          return null;
        }
        return this.props.children;
      }
    }
    const ClientErrorBoundary = clientReference(MyErrorBoundary);

    function App() {
      return ReactServer.createElement(
        ClientErrorBoundary,
        null,
        ReactServer.createElement(ServerComponent),
      );
    }

    const transport = ReactNoopFlightServer.render(<App />, {
      onError(x) {
        if (__DEV__) {
          return 'a dev digest';
        }
        if (x instanceof Error) {
          return `digest("${x.message}")`;
        } else if (Array.isArray(x)) {
          return `digest([])`;
        } else if (typeof x === 'object' && x !== null) {
          return `digest({})`;
        }
        return `digest(${String(x)})`;
      },
      filterStackFrame(filename, functionName, lineNumber, columnNumber) {
        if (lineNumber === 52656 && columnNumber === 16374) {
          return false;
        }
        if (!filename) {
          // Allow anonymous
          return functionName === 'div';
        }
        return (
          !filename.startsWith('node:') &&
          !filename.includes('node_modules') &&
          // sourceURL from an ES module in `/code/[root of the server].js`
          filename !== 'file:///code/[root%20of%20the%20server].js'
        );
      },
    });

    await act(() => {
      startTransition(() => {
        ReactNoop.render(
          ReactNoopFlightClient.read(transport, {findSourceMapURL}),
        );
      });
    });

    if (__DEV__) {
      expect({
        errors: errors.map(getErrorForJestMatcher),
        findSourceMapURLCalls: findSourceMapURL.mock.calls,
      }).toEqual({
        errors: [
          {
            message: 'This is an error',
            name: 'Error',
            stack: expect.stringContaining(
              'Error: This is an error\n' +
                '    at eval (eval at testFunction (inspected-page.html:29:11),%20%3Canonymous%3E:1:35)\n' +
                '    at ServerComponentError (file://~/(some)(really)(exotic-directory)/ReactFlight-test.js:1166:19)\n' +
                '    at <anonymous> (file:///testing.js:42:3)\n' +
                '    at <anonymous> (file:///testing.js:42:3)\n' +
                '    at div (<anonymous>',
            ),
            digest: 'a dev digest',
            environmentName: 'Server',
          },
        ],
        findSourceMapURLCalls: expect.arrayContaining([
          // TODO: What should we request here? The outer (<anonymous>) or the inner (inspected-page.html)?
          ['inspected-page.html:29:11), <anonymous>', 'Server'],
          [
            'file://~/(some)(really)(exotic-directory)/ReactFlight-test.js',
            'Server',
          ],
          ['file:///testing.js', 'Server'],
          ['', 'Server'],
        ]),
      });
    } else {
      expect(errors.map(getErrorForJestMatcher)).toEqual([
        {
          message:
            'An error occurred in the Server Components render. The specific message is omitted in production' +
            ' builds to avoid leaking sensitive details. A digest property is included on this error instance which' +
            ' may provide additional details about the nature of the error.',
          stack:
            'Error: An error occurred in the Server Components render. The specific message is omitted in production' +
            ' builds to avoid leaking sensitive details. A digest property is included on this error instance which' +
            ' may provide additional details about the nature of the error.',
          digest: 'digest("This is an error")',
        },
      ]);
    }
  });

  it('should include server components in warning stacks', async () => {
    function Component() {
      // Trigger key warning
      return <div>{[<span />]}</div>;
    }
    const ClientComponent = clientReference(Component);

    function Indirection({children}) {
      return children;
    }

    function App() {
      // We use the ReactServer runtime here to get the Server owner.
      return ReactServer.createElement(
        Indirection,
        null,
        ReactServer.createElement(ClientComponent),
      );
    }

    const transport = ReactNoopFlightServer.render(<App />);

    await act(() => {
      startTransition(() => {
        ReactNoop.render(ReactNoopFlightClient.read(transport));
      });
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n' +
        '\n' +
        'Check the render method of `Component`. See https://react.dev/link/warning-keys for more information.\n' +
        '    in span (at **)\n' +
        '    in Component (at **)\n' +
        '    in App (at **)',
    ]);
  });

  it('should trigger the inner most error boundary inside a Client Component', async () => {
    function ServerComponent() {
      throw new Error('This was thrown in the Server Component.');
    }

    function ClientComponent({children}) {
      // This should catch the error thrown by the Server Component, even though it has already happened.
      // We currently need to wrap it in a div because as it's set up right now, a lazy reference will
      // throw during reconciliation which will trigger the parent of the error boundary.
      // This is similar to how these will suspend the parent if it's a direct child of a Suspense boundary.
      // That's a bug.
      return (
        <ErrorBoundary expectedMessage="This was thrown in the Server Component.">
          <div>{children}</div>
        </ErrorBoundary>
      );
    }

    const ClientComponentReference = clientReference(ClientComponent);

    function Server() {
      return (
        <ClientComponentReference>
          <ServerComponent />
        </ClientComponentReference>
      );
    }

    const data = ReactNoopFlightServer.render(<Server />, {
      onError(x) {
        // ignore
      },
    });

    function Client({promise}) {
      return use(promise);
    }

    await act(() => {
      startTransition(() => {
        ReactNoop.render(
          <NoErrorExpected>
            <Client promise={ReactNoopFlightClient.read(data)} />
          </NoErrorExpected>,
        );
      });
    });
  });

  it('should warn in DEV if a toJSON instance is passed to a host component', () => {
    const obj = {
      toJSON() {
        return 123;
      },
    };
    const transport = ReactNoopFlightServer.render(<input value={obj} />);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with toJSON methods are not supported. ' +
        'Convert it manually to a simple value before passing it to props.\n' +
        '  <input value={{toJSON: ...}}>\n' +
        '               ^^^^^^^^^^^^^^^',
    ]);

    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with toJSON methods are not supported. ' +
        'Convert it manually to a simple value before passing it to props.\n' +
        '  <input value={{toJSON: ...}}>\n' +
        '               ^^^^^^^^^^^^^^^\n' +
        '    at  (<anonymous>)',
    ]);
  });

  it('should warn in DEV if a toJSON instance is passed to a host component child', () => {
    class MyError extends Error {
      toJSON() {
        return 123;
      }
    }
    const transport = ReactNoopFlightServer.render(
      <div>Womp womp: {new MyError('spaghetti')}</div>,
    );
    assertConsoleErrorDev([
      'Error objects cannot be rendered as text children. Try formatting it using toString().\n' +
        '  <div>Womp womp: {Error}</div>\n' +
        '                  ^^^^^^^',
    ]);

    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Error objects cannot be rendered as text children. Try formatting it using toString().\n' +
        '  <div>Womp womp: {Error}</div>\n' +
        '                  ^^^^^^^\n' +
        '    at  (<anonymous>)',
    ]);
  });

  it('should warn in DEV if a special object is passed to a host component', () => {
    const transport = ReactNoopFlightServer.render(<input value={Math} />);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Math objects are not supported.\n' +
        '  <input value={Math}>\n' +
        '               ^^^^^^',
    ]);

    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Math objects are not supported.\n' +
        '  <input value={Math}>\n' +
        '               ^^^^^^\n' +
        '    at  (<anonymous>)',
    ]);
  });

  it('should warn in DEV if an object with symbols is passed to a host component', () => {
    const transport = ReactNoopFlightServer.render(
      <input value={{[Symbol.iterator]: {}}} />,
    );
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with symbol properties like Symbol.iterator are not supported.\n' +
        '  <input value={{}}>\n' +
        '               ^^^^',
    ]);

    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with symbol properties like Symbol.iterator are not supported.\n' +
        '  <input value={{}}>\n' +
        '               ^^^^\n' +
        '    at  (<anonymous>)',
    ]);
  });

  it('should warn in DEV if a toJSON instance is passed to a Client Component', () => {
    const obj = {
      toJSON() {
        return 123;
      },
    };
    function ClientImpl({value}) {
      return <div>{value}</div>;
    }
    const Client = clientReference(ClientImpl);
    const transport = ReactNoopFlightServer.render(<Client value={obj} />);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with toJSON methods are not supported. ' +
        'Convert it manually to a simple value before passing it to props.\n' +
        '  <... value={{toJSON: ...}}>\n' +
        '             ^^^^^^^^^^^^^^^',
    ]);

    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with toJSON methods are not supported. ' +
        'Convert it manually to a simple value before passing it to props.\n' +
        '  <... value={{toJSON: ...}}>\n' +
        '             ^^^^^^^^^^^^^^^\n' +
        '    at  (<anonymous>)',
    ]);
  });

  it('should warn in DEV if a toJSON instance is passed to a Client Component child', () => {
    const obj = {
      toJSON() {
        return 123;
      },
    };
    function ClientImpl({children}) {
      return <div>{children}</div>;
    }
    const Client = clientReference(ClientImpl);
    const transport = ReactNoopFlightServer.render(
      <Client>Current date: {obj}</Client>,
    );
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with toJSON methods are not supported. ' +
        'Convert it manually to a simple value before passing it to props.\n' +
        '  <>Current date: {{toJSON: ...}}</>\n' +
        '                  ^^^^^^^^^^^^^^^',
    ]);

    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with toJSON methods are not supported. ' +
        'Convert it manually to a simple value before passing it to props.\n' +
        '  <>Current date: {{toJSON: ...}}</>\n' +
        '                  ^^^^^^^^^^^^^^^\n' +
        '    at  (<anonymous>)',
    ]);
  });

  it('should warn in DEV if a special object is passed to a Client Component', () => {
    function ClientImpl({value}) {
      return <div>{value}</div>;
    }
    const Client = clientReference(ClientImpl);
    const transport = ReactNoopFlightServer.render(<Client value={Math} />);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Math objects are not supported.\n' +
        '  <... value={Math}>\n' +
        '             ^^^^^^',
    ]);

    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Math objects are not supported.\n' +
        '  <... value={Math}>\n' +
        '             ^^^^^^\n' +
        '    at  (<anonymous>)',
    ]);
  });

  it('should warn in DEV if an object with symbols is passed to a Client Component', () => {
    function ClientImpl({value}) {
      return <div>{value}</div>;
    }
    const Client = clientReference(ClientImpl);
    assertConsoleErrorDev([]);
    const transport = ReactNoopFlightServer.render(
      <Client value={{[Symbol.iterator]: {}}} />,
    );
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with symbol properties like Symbol.iterator are not supported.\n' +
        '  <... value={{}}>\n' +
        '             ^^^^',
    ]);

    ReactNoopFlightClient.read(transport);

    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with symbol properties like Symbol.iterator are not supported.\n' +
        '  <... value={{}}>\n' +
        '             ^^^^\n' +
        '    in  (at **)',
    ]);
  });

  it('should warn in DEV if a special object is passed to a nested object in Client Component', () => {
    function ClientImpl({value}) {
      return <div>{value}</div>;
    }
    const Client = clientReference(ClientImpl);
    const transport = ReactNoopFlightServer.render(
      <Client value={{[Symbol.iterator]: {}}} />,
    );
    ReactNoopFlightClient.read(transport);

    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with symbol properties like Symbol.iterator are not supported.\n' +
        '  <... value={{}}>\n' +
        '             ^^^^',
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with symbol properties like Symbol.iterator are not supported.\n' +
        '  <... value={{}}>\n' +
        '             ^^^^\n' +
        '    at  (<anonymous>)',
    ]);
  });

  it('should warn in DEV if a special object is passed to a nested array in Client Component', () => {
    function ClientImpl({value}) {
      return <div>{value}</div>;
    }
    const Client = clientReference(ClientImpl);
    const transport = ReactNoopFlightServer.render(
      <Client value={['looooong string takes up noise', Math, <h1>hi</h1>]} />,
    );
    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Math objects are not supported.\n' +
        '  [..., Math, <h1/>]\n' +
        '        ^^^^',
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Math objects are not supported.\n' +
        '  [..., Math, <h1/>]\n' +
        '        ^^^^\n' +
        '    at  (<anonymous>)',
    ]);
  });

  it('should serialize an own __proto__ property nested among siblings without disturbing them', async () => {
    // `__proto__` here is a real own enumerable data property (not the
    // prototype). It sits between sibling keys and holds an object value, which
    // is the case most likely to regress if the serializer used a plain
    // `obj.__proto__ = value` assignment: that would hit the prototype setter,
    // dropping the key and mutating the holder's prototype instead.
    const value = {a: 1};
    Object.defineProperty(value, '__proto__', {
      value: {nested: true},
      enumerable: true,
      writable: true,
      configurable: true,
    });
    value.b = 2;

    const transport = ReactNoopFlightServer.render(value);
    assertConsoleErrorDev([
      'Expected not to serialize an object with own property `__proto__`. ' +
        'When parsed this property will be omitted.\n' +
        '  {a: 1, __proto__: {nested: true}, b: 2}\n' +
        '                    ^^^^^^^^^^^^^^',
    ]);

    const decoder = new TextDecoder();
    const payload = transport
      .map(chunk => (typeof chunk === 'string' ? chunk : decoder.decode(chunk)))
      .join('');
    // The legacy key is serialized as ordinary data, in source order, with its
    // object value intact and without clobbering its sibling properties.
    expect(payload).toContain('"a":1,"__proto__":{"nested":true},"b":2');

    const model = await ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Expected not to serialize an object with own property `__proto__`. ' +
        'When parsed this property will be omitted.\n' +
        '  {a: 1, __proto__: {nested: true}, b: 2}\n' +
        '                    ^^^^^^^^^^^^^^\n' +
        '    in  (at **)',
    ]);
    // On the client the legacy key is omitted, but its siblings survive intact
    // and the holder's prototype is untouched.
    expect(Object.prototype.hasOwnProperty.call(model, '__proto__')).toBe(
      false,
    );
    expect(Object.getPrototypeOf(model)).toBe(Object.prototype);
    expect(model.a).toBe(1);
    expect(model.b).toBe(2);
  });

  it('should NOT warn in DEV for key getters', () => {
    const transport = ReactNoopFlightServer.render(<div key="a" />);
    ReactNoopFlightClient.read(transport);
  });

  it('should warn in DEV a child is missing keys on server component', () => {
    function NoKey({children}) {
      return ReactServer.createElement('div', {
        key: "this has a key but parent doesn't",
      });
    }
    // While we're on the server we need to have the Server version active to track component stacks.
    jest.resetModules();
    jest.mock('react', () => ReactServer);
    const transport = ReactNoopFlightServer.render(
      ReactServer.createElement(
        'div',
        null,
        Array(6).fill(ReactServer.createElement(NoKey)),
      ),
    );
    jest.resetModules();
    jest.mock('react', () => React);
    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in NoKey (at **)',
      'Each child in a list should have a unique "key" prop. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in NoKey (at **)',
    ]);
  });

  it('should warn in DEV a child is missing keys on a fragment', () => {
    // While we're on the server we need to have the Server version active to track component stacks.
    jest.resetModules();
    jest.mock('react', () => ReactServer);
    const transport = ReactNoopFlightServer.render(
      ReactServer.createElement(
        'div',
        null,
        Array(6).fill(ReactServer.createElement(ReactServer.Fragment)),
      ),
    );
    jest.resetModules();
    jest.mock('react', () => React);
    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in Fragment (at **)',
      'Each child in a list should have a unique "key" prop. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in Fragment (at **)',
    ]);
  });

  it('should warn in DEV a child is missing keys in client component', async () => {
    function ParentClient({children}) {
      return children;
    }

    await act(async () => {
      const Parent = clientReference(ParentClient);
      const transport = ReactNoopFlightServer.render(
        <Parent>{Array(6).fill(<div>no key</div>)}</Parent>,
      );
      ReactNoopFlightClient.read(transport);

      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\n' +
        'Check the top-level render call using <ParentClient>. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in div (at **)',
    ]);
  });

  it('should error if a class instance is passed to a host component', () => {
    class Foo {
      method() {}
    }
    const errors = [];
    ReactNoopFlightServer.render(<input value={new Foo()} />, {
      onError(x) {
        errors.push(x.message);
      },
    });

    expect(errors).toEqual([
      'Only plain objects, and a few built-ins, can be passed to Client Components ' +
        'from Server Components. Classes or null prototypes are not supported.' +
        (__DEV__
          ? '\n' + '  <input value={{}}>\n' + '               ^^^^'
          : '\n' + '  {value: {}}\n' + '          ^^'),
    ]);
  });

  it('should error if useContext is called()', () => {
    function ServerComponent() {
      return ReactServer.useContext();
    }
    const errors = [];
    ReactNoopFlightServer.render(<ServerComponent />, {
      onError(x) {
        errors.push(x.message);
      },
    });
    expect(errors).toEqual(['ReactServer.useContext is not a function']);
  });

  it('should error if a context without a client reference is passed to use()', () => {
    const Context = React.createContext();
    function ServerComponent() {
      return ReactServer.use(Context);
    }
    const errors = [];
    ReactNoopFlightServer.render(<ServerComponent />, {
      onError(x) {
        errors.push(x.message);
      },
    });
    expect(errors).toEqual([
      'Cannot read a Client Context from a Server Component.',
    ]);
  });

  it('should error if a client reference is passed to use()', () => {
    const Context = React.createContext();
    const ClientContext = clientReference(Context);
    function ServerComponent() {
      return ReactServer.use(ClientContext);
    }
    const errors = [];
    ReactNoopFlightServer.render(<ServerComponent />, {
      onError(x) {
        errors.push(x.message);
      },
    });
    expect(errors).toEqual([
      'Cannot read a Client Context from a Server Component.',
    ]);
  });

  describe('Hooks', () => {
    function DivWithId({children}) {
      const id = ReactServer.useId();
      return <div prop={id}>{children}</div>;
    }

    it('should support useId', async () => {
      function App() {
        return (
          <>
            <DivWithId />
            <DivWithId />
          </>
        );
      }

      const transport = ReactNoopFlightServer.render(<App />);
      await act(async () => {
        ReactNoop.render(await ReactNoopFlightClient.read(transport));
      });
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <div prop="_S_1_" />
          <div prop="_S_2_" />
        </>,
      );
    });

    it('accepts an identifier prefix that prefixes generated ids', async () => {
      function App() {
        return (
          <>
            <DivWithId />
            <DivWithId />
          </>
        );
      }

      const transport = ReactNoopFlightServer.render(<App />, {
        identifierPrefix: 'foo',
      });
      await act(async () => {
        ReactNoop.render(await ReactNoopFlightClient.read(transport));
      });
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <div prop="_fooS_1_" />
          <div prop="_fooS_2_" />
        </>,
      );
    });

    it('[TODO] it does not warn if you render a server element passed to a client module reference twice on the client when using useId', async () => {
      // @TODO Today if you render a Server Component with useId and pass it to a Client Component and that Client Component renders the element in two or more
      // places the id used on the server will be duplicated in the client. This is a deviation from the guarantees useId makes for Fizz/Client and is a consequence
      // of the fact that the Server Component is actually rendered on the server and is reduced to a set of host elements before being passed to the Client component
      // so the output passed to the Client has no knowledge of the useId use. In the future we would like to add a DEV warning when this happens. For now
      // we just accept that it is a nuance of useId in Flight
      function App() {
        const id = ReactServer.useId();
        const div = <div prop={id}>{id}</div>;
        return <ClientDoublerModuleRef el={div} />;
      }

      function ClientDoubler({el}) {
        Scheduler.log('ClientDoubler');
        return (
          <>
            {el}
            {el}
          </>
        );
      }

      const ClientDoublerModuleRef = clientReference(ClientDoubler);

      const transport = ReactNoopFlightServer.render(<App />);
      assertLog([]);

      await act(async () => {
        ReactNoop.render(await ReactNoopFlightClient.read(transport));
      });

      assertLog(['ClientDoubler']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <div prop="_S_1_">_S_1_</div>
          <div prop="_S_1_">_S_1_</div>
        </>,
      );
    });
  });

  // @gate enableTaint
  it('errors when a tainted object is serialized', async () => {
    function UserClient({user}) {
      return <span>{user.name}</span>;
    }
    const User = clientReference(UserClient);

    const user = {
      name: 'Seb',
      age: 'rather not say',
    };
    ReactServer.experimental_taintObjectReference(
      "Don't pass the raw user object to the client",
      user,
    );
    const errors = [];
    ReactNoopFlightServer.render(<User user={user} />, {
      onError(x) {
        errors.push(x.message);
      },
    });

    expect(errors).toEqual(["Don't pass the raw user object to the client"]);
  });

  // @gate enableTaint
  it('errors with a specific message when a tainted function is serialized', async () => {
    function UserClient({user}) {
      return <span>{user.name}</span>;
    }
    const User = clientReference(UserClient);

    function change() {}
    ReactServer.experimental_taintObjectReference(
      'A change handler cannot be passed to a client component',
      change,
    );
    const errors = [];
    ReactNoopFlightServer.render(<User onChange={change} />, {
      onError(x) {
        errors.push(x.message);
      },
    });

    expect(errors).toEqual([
      'A change handler cannot be passed to a client component',
    ]);
  });

  // @gate enableTaint
  it('errors when a tainted string is serialized', async () => {
    function UserClient({user}) {
      return <span>{user.name}</span>;
    }
    const User = clientReference(UserClient);

    const process = {
      env: {
        SECRET: '3e971ecc1485fe78625598bf9b6f85db',
      },
    };
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      process,
      process.env.SECRET,
    );

    const errors = [];
    ReactNoopFlightServer.render(<User token={process.env.SECRET} />, {
      onError(x) {
        errors.push(x.message);
      },
    });

    expect(errors).toEqual(['Cannot pass a secret token to the client']);

    // This just ensures the process object is kept alive for the life time of
    // the test since we're simulating a global as an example.
    expect(process.env.SECRET).toBe('3e971ecc1485fe78625598bf9b6f85db');
  });

  // @gate enableTaint
  it('errors when a tainted bigint is serialized', async () => {
    function UserClient({user}) {
      return <span>{user.name}</span>;
    }
    const User = clientReference(UserClient);

    const currentUser = {
      name: 'Seb',
      token: BigInt('0x3e971ecc1485fe78625598bf9b6f85dc'),
    };
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      currentUser,
      currentUser.token,
    );

    function App({user}) {
      return <User token={user.token} />;
    }

    const errors = [];
    ReactNoopFlightServer.render(<App user={currentUser} />, {
      onError(x) {
        errors.push(x.message);
      },
    });

    expect(errors).toEqual(['Cannot pass a secret token to the client']);
  });

  // @gate enableTaint
  it('errors when a tainted binary value is serialized', async () => {
    function UserClient({user}) {
      return <span>{user.name}</span>;
    }
    const User = clientReference(UserClient);

    const currentUser = {
      name: 'Seb',
      token: new Uint32Array([0x3e971ecc, 0x1485fe78, 0x625598bf, 0x9b6f85dd]),
    };
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      currentUser,
      currentUser.token,
    );

    function App({user}) {
      const clone = user.token.slice();
      return <User token={clone} />;
    }

    const errors = [];
    ReactNoopFlightServer.render(<App user={currentUser} />, {
      onError(x) {
        errors.push(x.message);
      },
    });

    expect(errors).toEqual(['Cannot pass a secret token to the client']);
  });

  // @gate enableTaint
  it('does not throw RangeError for large binary values (>65535 bytes)', () => {
    // String.fromCharCode.apply(String, largeArray) throws a RangeError when
    // the array length exceeds the JS engine's call-argument limit (~65535).
    // A Uint32Array of 25000 elements is 100000 bytes, which when viewed as
    // Uint8Array has 100000 elements — well above the limit.
    // This test ensures chunked processing avoids that error.
    const largeToken = new Uint32Array(25000);
    const obj = {secret: largeToken};
    // Should not throw a RangeError.
    expect(() => {
      ReactServer.experimental_taintUniqueValue(
        'Cannot pass a large secret to the client',
        obj,
        obj.secret,
      );
    }).not.toThrow();
  });

  // @gate enableTaint
  it('keep a tainted value tainted until the end of any pending requests', async () => {
    function UserClient({user}) {
      return <span>{user.name}</span>;
    }
    const User = clientReference(UserClient);

    function getUser() {
      const user = {
        name: 'Seb',
        token: '3e971ecc1485fe78625598bf9b6f85db',
      };
      ReactServer.experimental_taintUniqueValue(
        'Cannot pass a secret token to the client',
        user,
        user.token,
      );
      return user;
    }

    function App() {
      const user = getUser();
      const derivedValue = {...user};
      // A garbage collection can happen at any time. Even before the end of
      // this request. This would clean up the user object.
      gc();
      // We should still block the tainted value.
      return <User user={derivedValue} />;
    }

    let errors = [];
    ReactNoopFlightServer.render(<App />, {
      onError(x) {
        errors.push(x.message);
      },
    });

    expect(errors).toEqual(['Cannot pass a secret token to the client']);

    // After the previous requests finishes, the token can be rendered again.

    errors = [];
    ReactNoopFlightServer.render(
      <User user={{token: '3e971ecc1485fe78625598bf9b6f85db'}} />,
      {
        onError(x) {
          errors.push(x.message);
        },
      },
    );

    expect(errors).toEqual([]);
  });

  it('preserves state when keying a server component', async () => {
    function StatefulClient({name}) {
      const [state] = React.useState(name.toLowerCase());
      return state;
    }
    const Stateful = clientReference(StatefulClient);

    function Item({item}) {
      return (
        <div>
          {item}
          <Stateful name={item} />
        </div>
      );
    }

    function Items({items}) {
      return items.map(item => {
        return <Item key={item} item={item} />;
      });
    }

    const transport = ReactNoopFlightServer.render(
      <Items items={['A', 'B', 'C']} />,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>Aa</div>
        <div>Bb</div>
        <div>Cc</div>
      </>,
    );

    const transport2 = ReactNoopFlightServer.render(
      <Items items={['B', 'A', 'D', 'C']} />,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport2));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>Bb</div>
        <div>Aa</div>
        <div>Dd</div>
        <div>Cc</div>
      </>,
    );
  });

  it('does not inherit keys of children inside a server component', async () => {
    function StatefulClient({name, initial}) {
      const [state] = React.useState(initial);
      return state;
    }
    const Stateful = clientReference(StatefulClient);

    function Item({item, initial}) {
      // This key is the key of the single item of this component.
      // It's NOT part of the key of the list the parent component is
      // in.
      return (
        <div key={item}>
          {item}
          <Stateful name={item} initial={initial} />
        </div>
      );
    }

    function IndirectItem({item, initial}) {
      // Even though we render two items with the same child key this key
      // should not conflict, because the key belongs to the parent slot.
      return <Item key="parent" item={item} initial={initial} />;
    }

    // These items don't have their own keys because they're in a fixed set
    const transport = ReactNoopFlightServer.render(
      <>
        <Item item="A" initial={1} />
        <Item item="B" initial={2} />
        <IndirectItem item="C" initial={5} />
        <IndirectItem item="C" initial={6} />
      </>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>A1</div>
        <div>B2</div>
        <div>C5</div>
        <div>C6</div>
      </>,
    );

    // This means that they shouldn't swap state when the properties update
    const transport2 = ReactNoopFlightServer.render(
      <>
        <Item item="B" initial={3} />
        <Item item="A" initial={4} />
        <IndirectItem item="C" initial={7} />
        <IndirectItem item="C" initial={8} />
      </>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport2));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>B3</div>
        <div>A4</div>
        <div>C5</div>
        <div>C6</div>
      </>,
    );
  });

  it('shares state between single return and array return in a parent', async () => {
    function StatefulClient({name, initial}) {
      const [state] = React.useState(initial);
      return state;
    }
    const Stateful = clientReference(StatefulClient);

    function Item({item, initial}) {
      // This key is the key of the single item of this component.
      // It's NOT part of the key of the list the parent component is
      // in.
      return (
        <span key={item}>
          {item}
          <Stateful name={item} initial={initial} />
        </span>
      );
    }

    function Condition({condition}) {
      if (condition) {
        return <Item item="A" initial={1} />;
      }
      // The first item in the fragment is the same as the single item.
      return (
        <>
          <Item item="A" initial={2} />
          <Item item="B" initial={3} />
        </>
      );
    }

    function ConditionPlain({condition}) {
      if (condition) {
        return (
          <span>
            C
            <Stateful name="C" initial={1} />
          </span>
        );
      }
      // The first item in the fragment is the same as the single item.
      return (
        <>
          <span>
            C
            <Stateful name="C" initial={2} />
          </span>
          <span>
            D
            <Stateful name="D" initial={3} />
          </span>
        </>
      );
    }

    const transport = ReactNoopFlightServer.render(
      // This two item wrapper ensures we're already one step inside an array.
      // A single item is not the same as a set when it's nested one level.
      <>
        <div>
          <Condition condition={true} />
        </div>
        <div>
          <ConditionPlain condition={true} />
        </div>
        <div key="keyed">
          <ConditionPlain condition={true} />
        </div>
      </>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>
          <span>A1</span>
        </div>
        <div>
          <span>C1</span>
        </div>
        <div>
          <span>C1</span>
        </div>
      </>,
    );

    const transport2 = ReactNoopFlightServer.render(
      <>
        <div>
          <Condition condition={false} />
        </div>
        <div>
          <ConditionPlain condition={false} />
        </div>
        {null}
        <div key="keyed">
          <ConditionPlain condition={false} />
        </div>
      </>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport2));
    });

    // We're intentionally breaking from the semantics here for efficiency of the protocol.
    // In the case a Server Component inside a fragment is itself implicitly keyed but its
    // return value has a key, then we need a wrapper fragment. This means they can't
    // reconcile. To solve this we would need to add a wrapper fragment to every Server
    // Component just in case it returns a fragment later which is a lot.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>
          <span>A2{/* This should be A1 ideally */}</span>
          <span>B3</span>
        </div>
        <div>
          <span>C1</span>
          <span>D3</span>
        </div>
        <div>
          <span>C1</span>
          <span>D3</span>
        </div>
      </>,
    );
  });

  it('shares state between single return and array return in a set', async () => {
    function StatefulClient({name, initial}) {
      const [state] = React.useState(initial);
      return state;
    }
    const Stateful = clientReference(StatefulClient);

    function Item({item, initial}) {
      // This key is the key of the single item of this component.
      // It's NOT part of the key of the list the parent component is
      // in.
      return (
        <span key={item}>
          {item}
          <Stateful name={item} initial={initial} />
        </span>
      );
    }

    function Condition({condition}) {
      if (condition) {
        return <Item item="A" initial={1} />;
      }
      // The first item in the fragment is the same as the single item.
      return (
        <>
          <Item item="A" initial={2} />
          <Item item="B" initial={3} />
        </>
      );
    }

    function ConditionPlain({condition}) {
      if (condition) {
        return (
          <span>
            C
            <Stateful name="C" initial={1} />
          </span>
        );
      }
      // The first item in the fragment is the same as the single item.
      return (
        <>
          <span>
            C
            <Stateful name="C" initial={2} />
          </span>
          <span>
            D
            <Stateful name="D" initial={3} />
          </span>
        </>
      );
    }

    const transport = ReactNoopFlightServer.render(
      // This two item wrapper ensures we're already one step inside an array.
      // A single item is not the same as a set when it's nested one level.
      <div>
        <Condition condition={true} />
        <ConditionPlain condition={true} />
        <ConditionPlain key="keyed" condition={true} />
      </div>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>A1</span>
        <span>C1</span>
        <span>C1</span>
      </div>,
    );

    const transport2 = ReactNoopFlightServer.render(
      <div>
        <Condition condition={false} />
        <ConditionPlain condition={false} />
        {null}
        <ConditionPlain key="keyed" condition={false} />
      </div>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport2));
    });

    // We're intentionally breaking from the semantics here for efficiency of the protocol.
    // The issue with this test scenario is that when the Server Component is in a set,
    // the next slot can't be conditionally a fragment or single. That would require wrapping
    // in an additional fragment for every single child just in case it every expands to a
    // fragment.
    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>A2{/* Should be A1 */}</span>
        <span>B3</span>
        <span>C2{/* Should be C1 */}</span>
        <span>D3</span>
        <span>C2{/* Should be C1 */}</span>
        <span>D3</span>
      </div>,
    );
  });

  it('preserves state with keys split across async work', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));

    function StatefulClient({name}) {
      const [state] = React.useState(name.toLowerCase());
      return state;
    }
    const Stateful = clientReference(StatefulClient);

    function Item({name}) {
      if (name === 'A') {
        return promise.then(() => (
          <div>
            {name}
            <Stateful name={name} />
          </div>
        ));
      }
      return (
        <div>
          {name}
          <Stateful name={name} />
        </div>
      );
    }

    const transport = ReactNoopFlightServer.render([
      <Item key="a" name="A" />,
      null,
    ]);

    // Create a gap in the stream
    await resolve();

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(<div>Aa</div>);

    const transport2 = ReactNoopFlightServer.render([
      null,
      <Item key="a" name="B" />,
    ]);

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport2));
    });

    expect(ReactNoop).toMatchRenderedOutput(<div>Ba</div>);
  });

  it('shares state when moving keyed Server Components that render fragments', async () => {
    function StatefulClient({name, initial}) {
      const [state] = React.useState(initial);
      return <span>{state}</span>;
    }
    const Stateful = clientReference(StatefulClient);

    function ServerComponent({item, initial}) {
      return [
        <Stateful key="a" initial={'a' + initial} />,
        <Stateful key="b" initial={'b' + initial} />,
      ];
    }

    const transport = ReactNoopFlightServer.render(
      <div>
        <ServerComponent key="A" initial={1} />
        <ServerComponent key="B" initial={2} />
      </div>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>a1</span>
        <span>b1</span>
        <span>a2</span>
        <span>b2</span>
      </div>,
    );

    // We swap the Server Components and the state of each child inside each fragment should move.
    // Really the Fragment itself moves.
    const transport2 = ReactNoopFlightServer.render(
      <div>
        <ServerComponent key="B" initial={4} />
        <ServerComponent key="A" initial={3} />
      </div>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport2));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>a2</span>
        <span>b2</span>
        <span>a1</span>
        <span>b1</span>
      </div>,
    );
  });

  // @gate enableAsyncIterableChildren
  it('shares state when moving keyed Server Components that render async iterables', async () => {
    function StatefulClient({name, initial}) {
      const [state] = React.useState(initial);
      return <span>{state}</span>;
    }
    const Stateful = clientReference(StatefulClient);

    async function* ServerComponent({item, initial}) {
      yield <Stateful key="a" initial={'a' + initial} />;
      yield <Stateful key="b" initial={'b' + initial} />;
    }

    const transport = ReactNoopFlightServer.render(
      <div>
        <ServerComponent key="A" initial={1} />
        <ServerComponent key="B" initial={2} />
      </div>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>a1</span>
        <span>b1</span>
        <span>a2</span>
        <span>b2</span>
      </div>,
    );

    // We swap the Server Components and the state of each child inside each fragment should move.
    // Really the Fragment itself moves.
    const transport2 = ReactNoopFlightServer.render(
      <div>
        <ServerComponent key="B" initial={4} />
        <ServerComponent key="A" initial={3} />
      </div>,
    );

    await act(async () => {
      ReactNoop.render(await ReactNoopFlightClient.read(transport2));
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>a2</span>
        <span>b2</span>
        <span>a1</span>
        <span>b1</span>
      </div>,
    );
  });

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('preserves debug info for server-to-server pass through', async () => {
    function ThirdPartyLazyComponent() {
      return <span>!</span>;
    }

    const lazy = React.lazy(async function myLazy() {
      return {
        default: <ThirdPartyLazyComponent />,
      };
    });

    function ThirdPartyComponent() {
      return <span>stranger</span>;
    }

    function ThirdPartyFragmentComponent() {
      return [<span key="1">Who</span>, ' ', <span key="2">dis?</span>];
    }

    function ServerComponent({transport}) {
      // This is a Server Component that receives other Server Components from a third party.
      const children = ReactNoopFlightClient.read(transport);
      return <div>Hello, {children}</div>;
    }

    const promiseComponent = Promise.resolve(<ThirdPartyComponent />);

    const thirdPartyTransport = ReactNoopFlightServer.render(
      [promiseComponent, lazy, <ThirdPartyFragmentComponent key="3" />],
      {
        environmentName: 'third-party',
      },
    );

    // Wait for the lazy component to initialize
    await 0;

    const transport = ReactNoopFlightServer.render(
      <ServerComponent transport={thirdPartyTransport} />,
    );

    await act(async () => {
      const result = await ReactNoopFlightClient.read(transport);
      expect(getDebugInfo(result)).toEqual(
        __DEV__
          ? [
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 22 : 20},
              {
                name: 'ServerComponent',
                env: 'Server',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {
                  transport: expect.arrayContaining([]),
                },
              },
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 53 : 21},
            ]
          : undefined,
      );

      const thirdPartyChildren = await result.props.children[1];
      // We expect the debug info to be transferred from the inner stream to the outer.
      expect(getDebugInfo(await thirdPartyChildren[0])).toEqual(
        __DEV__
          ? [
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 54 : 22}, // Clamped to the start
              {
                name: 'ThirdPartyComponent',
                env: 'third-party',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {},
              },
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 54 : 22},
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 55 : 23}, // This last one is when the promise resolved into the first party.
            ]
          : undefined,
      );
      expect(getDebugInfo(thirdPartyChildren[1])).toEqual(
        __DEV__
          ? [
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 54 : 22}, // Clamped to the start
              {
                name: 'ThirdPartyLazyComponent',
                env: 'third-party',
                key: null,
                stack: '    in myLazy (at **)\n    in lazyInitializer (at **)',
                props: {},
              },
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 54 : 22},
            ]
          : undefined,
      );
      const fragment = thirdPartyChildren[2];
      expect(getDebugInfo(fragment)).toEqual(
        __DEV__
          ? [
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 54 : 22},
              {
                name: 'ThirdPartyFragmentComponent',
                env: 'third-party',
                key: '3',
                stack: '    in Object.<anonymous> (at **)',
                props: {},
              },
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 54 : 22},
            ]
          : undefined,
      );
      expect(getDebugInfo(fragment.props.children[0])).toEqual(
        __DEV__ ? null : undefined,
      );
      ReactNoop.render(result);
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        Hello, <span>stranger</span>
        <span>!</span>
        <span>Who</span> <span>dis?</span>
      </div>,
    );
  });

  it('preserves debug info for keyed Fragment', async () => {
    function App() {
      return ReactServer.createElement(
        ReactServer.Fragment,
        {key: 'app'},
        ReactServer.createElement('h1', null, 'App'),
        ReactServer.createElement('div', null, 'Child'),
      );
    }

    const transport = ReactNoopFlightServer.render(
      ReactServer.createElement(
        ReactServer.Fragment,
        null,
        ReactServer.createElement('link', {key: 'styles'}),
        ReactServer.createElement(App, null),
      ),
    );

    await act(async () => {
      const root = await ReactNoopFlightClient.read(transport);

      const fragment = root[1];
      expect(getDebugInfo(fragment)).toEqual(
        __DEV__
          ? [
              {time: 12},
              {
                name: 'App',
                env: 'Server',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {},
              },
              {time: 13},
            ]
          : undefined,
      );
      // Making sure debug info doesn't get added multiple times on Fragment children
      expect(getDebugInfo(fragment[0])).toEqual(__DEV__ ? null : undefined);
      const fragmentChild = fragment[0].props.children[0];
      expect(getDebugInfo(fragmentChild)).toEqual(__DEV__ ? null : undefined);

      ReactNoop.render(root);
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <link />
        <h1>App</h1>
        <div>Child</div>
      </>,
    );
  });

  // @gate enableAsyncIterableChildren && enableComponentPerformanceTrack
  it('preserves debug info for server-to-server pass through of async iterables', async () => {
    let resolve;
    const iteratorPromise = new Promise(r => (resolve = r));

    async function* ThirdPartyAsyncIterableComponent({item, initial}) {
      yield <span key="1">Who</span>;
      yield <span key="2">dis?</span>;
      resolve();
    }

    function Keyed({children}) {
      // Keying this should generate a fragment.
      return children;
    }

    function ServerComponent({transport}) {
      // This is a Server Component that receives other Server Components from a third party.
      const children = ReactServer.use(
        ReactNoopFlightClient.read(transport),
      ).root;
      return (
        <div>
          <Keyed key="keyed">{children}</Keyed>
        </div>
      );
    }

    const thirdPartyTransport = ReactNoopFlightServer.render(
      {root: <ThirdPartyAsyncIterableComponent />},
      {
        environmentName: 'third-party',
      },
    );

    // Wait for the iterator to finish
    await iteratorPromise;

    await 0; // One more tick for the return value / closing.

    const transport = ReactNoopFlightServer.render(
      <ServerComponent transport={thirdPartyTransport} />,
    );

    await act(async () => {
      const result = await ReactNoopFlightClient.read(transport);
      expect(getDebugInfo(result)).toEqual(
        __DEV__
          ? [
              {time: 16},
              {
                name: 'ServerComponent',
                env: 'Server',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {
                  transport: expect.arrayContaining([]),
                },
              },
              {time: 31},
            ]
          : undefined,
      );
      const thirdPartyFragment = await result.props.children;
      expect(getDebugInfo(thirdPartyFragment)).toEqual(
        __DEV__
          ? [
              {time: 32},
              {
                name: 'Keyed',
                env: 'Server',
                key: 'keyed',
                stack: '    in ServerComponent (at **)',
                props: {
                  children: {},
                },
              },
              {time: 33},
            ]
          : undefined,
      );
      // We expect the debug info to be transferred from the inner stream to the outer.
      expect(getDebugInfo(thirdPartyFragment.props.children)).toEqual(
        __DEV__
          ? [
              {time: 33}, // Clamp to the start
              {
                name: 'ThirdPartyAsyncIterableComponent',
                env: 'third-party',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {},
              },
              {time: 33},
            ]
          : undefined,
      );

      ReactNoop.render(result);
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>Who</span>
        <span>dis?</span>
      </div>,
    );
  });

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('preserves debug info for server-to-server through use()', async () => {
    function ThirdPartyComponent() {
      return 'hi';
    }

    function ServerComponent({transport}) {
      // This is a Server Component that receives other Server Components from a third party.
      const text = ReactServer.use(ReactNoopFlightClient.read(transport));
      return <div>{text.toUpperCase()}</div>;
    }

    const thirdPartyTransport = ReactNoopFlightServer.render(
      <ThirdPartyComponent />,
      {
        environmentName: 'third-party',
      },
    );

    const transport = ReactNoopFlightServer.render(
      <ServerComponent transport={thirdPartyTransport} />,
    );

    await act(async () => {
      const result = await ReactNoopFlightClient.read(transport);
      expect(getDebugInfo(result)).toEqual(
        __DEV__
          ? [
              {time: 16},
              {
                name: 'ServerComponent',
                env: 'Server',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {
                  transport: expect.arrayContaining([]),
                },
              },
              {time: 16},
              {
                name: 'ThirdPartyComponent',
                env: 'third-party',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {},
              },
              {time: 16},
              {time: gate(flags => flags.enableAsyncDebugInfo) ? 24 : 17},
            ]
          : undefined,
      );
      ReactNoop.render(result);
    });

    expect(ReactNoop).toMatchRenderedOutput(<div>HI</div>);
  });

  it('preserves error stacks passed through server-to-server with source maps', async () => {
    async function ServerComponent({transport}) {
      // This is a Server Component that receives other Server Components from a third party.
      const thirdParty = ReactServer.use(
        ReactNoopFlightClient.read(transport, {
          findSourceMapURL(url) {
            // By giving a source map url we're saying that we can't use the original
            // file as the sourceURL, which gives stack traces a about://React/ prefix.
            return 'source-map://' + url;
          },
        }),
      );
      // This will throw a third-party error inside the first-party server component.
      await thirdParty.model;
      return 'Should never render';
    }

    async function bar() {
      throw new Error('third-party-error');
    }

    async function foo() {
      await bar();
    }

    const rejectedPromise = foo();

    const thirdPartyTransport = ReactNoopFlightServer.render(
      {model: rejectedPromise},
      {
        environmentName: 'third-party',
        onError(x) {
          if (__DEV__) {
            return 'a dev digest';
          }
          return `digest("${x.message}")`;
        },
      },
    );

    let originalError;
    try {
      await rejectedPromise;
    } catch (x) {
      originalError = x;
    }
    expect(originalError.message).toBe('third-party-error');

    const transport = ReactNoopFlightServer.render(
      <ServerComponent transport={thirdPartyTransport} />,
      {
        onError(x) {
          if (__DEV__) {
            return 'a dev digest';
          }
          return x.digest; // passthrough
        },
      },
    );

    await 0;
    await 0;
    await 0;

    const expectedErrorStack = originalError.stack
      // Test only the first rows since there's a lot of noise after that is eliminated.
      .split('\n')
      .slice(0, 4)
      .join('\n')
      .replaceAll(' (/', ' (file:///'); // The eval will end up normalizing these

    let sawReactPrefix = false;
    const environments = [];
    await act(async () => {
      ReactNoop.render(
        <ErrorBoundary
          expectedMessage="third-party-error"
          expectedEnviromentName="third-party"
          expectedErrorStack={expectedErrorStack}>
          {ReactNoopFlightClient.read(transport, {
            findSourceMapURL(url, environmentName) {
              if (url.startsWith('about://React/')) {
                // We don't expect to see any React prefixed URLs here.
                sawReactPrefix = true;
              }
              environments.push(environmentName);
              // My not giving a source map, we should leave it intact.
              return null;
            },
          })}
        </ErrorBoundary>,
      );
    });

    expect(sawReactPrefix).toBe(false);
    if (__DEV__) {
      expect(environments.slice(0, 4)).toEqual([
        'Server',
        'third-party',
        'third-party',
        'third-party',
      ]);
    } else {
      expect(environments).toEqual([]);
    }
  });

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('can change the environment name inside a component', async () => {
    let env = 'A';
    function Component(props) {
      env = 'B';
      return <div>hi</div>;
    }

    const transport = ReactNoopFlightServer.render(
      {
        greeting: <Component />,
      },
      {
        environmentName() {
          return env;
        },
      },
    );

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      const greeting = rootModel.greeting;
      expect(getDebugInfo(greeting)).toEqual(
        __DEV__
          ? [
              {time: 12},
              {
                name: 'Component',
                env: 'A',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {},
              },
              {
                env: 'B',
              },
              {time: 13},
            ]
          : undefined,
      );
      ReactNoop.render(greeting);
    });

    expect(ReactNoop).toMatchRenderedOutput(<div>hi</div>);
  });

  // @gate __DEV__
  it('replays logs, but not onError logs', async () => {
    function foo() {
      return 'hello';
    }

    class MyClass {
      constructor() {
        this.x = 1;
      }
      method() {}
      get y() {
        return this.x + 1;
      }
      get z() {
        return this.x + 5;
      }
    }
    Object.defineProperty(MyClass.prototype, 'y', {enumerable: true});

    Object.defineProperty(MyClass, 'name', {value: 'MyClassName'});

    function ServerComponent() {
      console.log('hi', {
        prop: 123,
        fn: foo,
        map: new Map([['foo', foo]]),
        promise: Promise.resolve('yo'),
        infinitePromise: new Promise(() => {}),
        Class: MyClass,
        instance: new MyClass(),
      });
      throw new Error('err');
    }

    function App() {
      return ReactServer.createElement(ServerComponent);
    }

    let ownerStacks = [];

    // These tests are specifically testing console.log.
    // Assign to `mockConsoleLog` so we can still inspect it when `console.log`
    // is overridden by the test modules. The original function will be restored
    // after this test finishes by `jest.restoreAllMocks()`.
    const mockConsoleLog = spyOnDevAndProd(console, 'log').mockImplementation(
      () => {
        // Uses server React.
        ownerStacks.push(normalizeCodeLocInfo(ReactServer.captureOwnerStack()));
      },
    );

    // Reset the modules so that we get a new overridden console on top of the
    // one installed by expect. This ensures that we still emit console.error
    // calls.
    jest.resetModules();
    jest.mock('react', () => require('react/react.react-server'));
    ReactServer = require('react');
    ReactNoopFlightServer = require('react-noop-renderer/flight-server');
    const transport = ReactNoopFlightServer.render({
      root: ReactServer.createElement(App),
    });
    assertConsoleErrorDev(['Error: err' + '\n    in <stack>']);

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog.mock.calls[0][0]).toBe('hi');
    expect(mockConsoleLog.mock.calls[0][1].prop).toBe(123);
    expect(ownerStacks).toEqual(['\n    in App (at **)']);
    mockConsoleLog.mockClear();
    mockConsoleLog.mockImplementation(() => {
      // Switching to client React.
      ownerStacks.push(normalizeCodeLocInfo(React.captureOwnerStack()));
    });
    ownerStacks = [];

    // Let the Promises resolve.
    await 0;
    await 0;
    await 0;

    // The error should not actually get logged because we're not awaiting the root
    // so it's not thrown but the server log also shouldn't be replayed.
    await ReactNoopFlightClient.read(transport, {close: true});

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog.mock.calls[0][0]).toBe('hi');
    expect(mockConsoleLog.mock.calls[0][1].prop).toBe(123);
    const loggedFn = mockConsoleLog.mock.calls[0][1].fn;
    expect(typeof loggedFn).toBe('function');
    expect(loggedFn).not.toBe(foo);
    expect(loggedFn.toString()).toBe(foo.toString());

    const loggedMap = mockConsoleLog.mock.calls[0][1].map;
    expect(loggedMap instanceof Map).toBe(true);
    const loggedFn2 = loggedMap.get('foo');
    expect(typeof loggedFn2).toBe('function');
    expect(loggedFn2).not.toBe(foo);
    expect(loggedFn2.toString()).toBe(foo.toString());
    expect(loggedFn2).toBe(loggedFn);

    const promise = mockConsoleLog.mock.calls[0][1].promise;
    expect(promise).toBeInstanceOf(Promise);
    expect(await promise).toBe('yo');

    const infinitePromise = mockConsoleLog.mock.calls[0][1].infinitePromise;
    expect(infinitePromise).toBeInstanceOf(Promise);
    let resolved = false;
    infinitePromise.then(
      () => (resolved = true),
      x => {
        console.error(x);
        resolved = true;
      },
    );
    await 0;
    await 0;
    await 0;
    // This should not reject upon aborting the stream.
    expect(resolved).toBe(false);

    const Class = mockConsoleLog.mock.calls[0][1].Class;
    const instance = mockConsoleLog.mock.calls[0][1].instance;
    expect(typeof Class).toBe('function');
    expect(Class.prototype.constructor).toBe(Class);
    expect(Class.name).toBe('MyClassName');
    expect(instance instanceof Class).toBe(true);
    expect(Object.getPrototypeOf(instance)).toBe(Class.prototype);
    expect(instance.x).toBe(1);
    expect(instance.hasOwnProperty('y')).toBe(true);
    expect(instance.y).toBe(2); // Enumerable getter was reified
    expect(instance.hasOwnProperty('z')).toBe(false);
    expect(instance.z).toBe(6); // Not enumerable getter was transferred as part of the toString() of the class
    expect(typeof instance.method).toBe('function'); // Methods are included only if they're part of the toString()

    expect(ownerStacks).toEqual(['\n    in App (at **)']);
  });

  // @gate __DEV__
  it('replays logs with cyclic objects', async () => {
    const cyclic = {cycle: null};
    cyclic.cycle = cyclic;

    function ServerComponent() {
      console.log('hi', {cyclic});
      return null;
    }

    function App() {
      return ReactServer.createElement(ServerComponent);
    }

    // These tests are specifically testing console.log.
    // Assign to `mockConsoleLog` so we can still inspect it when `console.log`
    // is overridden by the test modules. The original function will be restored
    // after this test finishes by `jest.restoreAllMocks()`.
    const mockConsoleLog = spyOnDevAndProd(console, 'log').mockImplementation(
      () => {},
    );

    // Reset the modules so that we get a new overridden console on top of the
    // one installed by expect. This ensures that we still emit console.error
    // calls.
    jest.resetModules();
    jest.mock('react', () => require('react/react.react-server'));
    ReactServer = require('react');
    ReactNoopFlightServer = require('react-noop-renderer/flight-server');
    const transport = ReactNoopFlightServer.render({
      root: ReactServer.createElement(App),
    });

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog.mock.calls[0][0]).toBe('hi');
    expect(mockConsoleLog.mock.calls[0][1].cyclic).toBe(cyclic);
    mockConsoleLog.mockClear();
    mockConsoleLog.mockImplementation(() => {});

    // The error should not actually get logged because we're not awaiting the root
    // so it's not thrown but the server log also shouldn't be replayed.
    await ReactNoopFlightClient.read(transport);

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog.mock.calls[0][0]).toBe('hi');
    const cyclic2 = mockConsoleLog.mock.calls[0][1].cyclic;
    expect(cyclic2).not.toBe(cyclic); // Was serialized and therefore cloned
    expect(cyclic2.cycle).toBe(cyclic2);
  });

  // @gate __DEV__
  it('replays logs with large strings replaced by a placeholder', async () => {
    // This string exceeds the threshold for debug string length. Reconstructing
    // a multi-megabyte string on the client when replaying the log would block
    // the main thread for too long, so we omit it and send a placeholder
    // instead.
    const largeString = 'x'.repeat(1000001);

    function ServerComponent() {
      console.log('large string:', largeString);
      return null;
    }

    function App() {
      return ReactServer.createElement(ServerComponent);
    }

    // These tests are specifically testing console.log.
    // Assign to `mockConsoleLog` so we can still inspect it when `console.log`
    // is overridden by the test modules. The original function will be restored
    // after this test finishes by `jest.restoreAllMocks()`.
    const mockConsoleLog = spyOnDevAndProd(console, 'log').mockImplementation(
      () => {},
    );

    // Reset the modules so that we get a new overridden console on top of the
    // one installed by expect. This ensures that we still emit console.error
    // calls.
    jest.resetModules();
    jest.mock('react', () => require('react/react.react-server'));
    ReactServer = require('react');
    ReactNoopFlightServer = require('react-noop-renderer/flight-server');
    const transport = ReactNoopFlightServer.render({
      root: ReactServer.createElement(App),
    });

    // The server logged the actual string synchronously while rendering.
    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog.mock.calls[0][1]).toBe(largeString);
    mockConsoleLog.mockClear();
    mockConsoleLog.mockImplementation(() => {});

    await ReactNoopFlightClient.read(transport);

    // The replayed log received a placeholder instead of the actual string.
    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog.mock.calls[0][0]).toBe('large string:');
    expect(mockConsoleLog.mock.calls[0][1]).toBe(
      'This string of length 1000001 has been omitted by React to avoid ' +
        'sending too much data from the server.',
    );
  });

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('uses the server component debug info as the element owner in DEV', async () => {
    function Container({children}) {
      return children;
    }

    function Greeting({firstName}) {
      // We can't use JSX here because it'll use the Client React.
      return ReactServer.createElement(
        Container,
        null,
        ReactServer.createElement('span', null, 'Hello, ', firstName),
      );
    }

    const model = {
      greeting: ReactServer.createElement(Greeting, {firstName: 'Seb'}),
    };

    const transport = ReactNoopFlightServer.render(model);

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      const greeting = rootModel.greeting;
      // We've rendered down to the span.
      expect(greeting.type).toBe('span');
      if (__DEV__) {
        const greetInfo = {
          name: 'Greeting',
          env: 'Server',
          key: null,
          stack: '    in Object.<anonymous> (at **)',
          props: {
            firstName: 'Seb',
          },
        };
        expect(getDebugInfo(greeting)).toEqual([
          {time: 12},
          greetInfo,
          {time: 13},
          {
            name: 'Container',
            env: 'Server',
            key: null,
            owner: greetInfo,
            stack: '    in Greeting (at **)',
            props: {
              children: expect.objectContaining({
                type: 'span',
                props: {
                  children: ['Hello, ', 'Seb'],
                },
              }),
            },
          },
          {time: 14},
        ]);
        // The owner that created the span was the outer server component.
        // We expect the debug info to be referentially equal to the owner.
        expect(greeting._owner).toBe(greeting._debugInfo[1]);
      } else {
        expect(greeting._debugInfo).toBe(undefined);
        expect(greeting._owner).toBe(undefined);
      }
      ReactNoop.render(greeting);
    });

    expect(ReactNoop).toMatchRenderedOutput(<span>Hello, Seb</span>);
  });

  // @gate __DEV__
  it('can get the component owner stacks during rendering in dev', () => {
    let stack;

    function Foo() {
      return ReactServer.createElement(Bar, null);
    }
    function Bar() {
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(Baz, null),
      );
    }

    function Baz() {
      stack = ReactServer.captureOwnerStack();
      return ReactServer.createElement('span', null, 'hi');
    }
    ReactNoopFlightServer.render(
      ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(Foo, null),
      ),
    );

    expect(normalizeCodeLocInfo(stack)).toBe(
      '\n    in Bar (at **)' + '\n    in Foo (at **)',
    );
  });

  // @gate __DEV__
  it('can track owner for a flight response created in another render', async () => {
    jest.resetModules();
    jest.mock('react', () => ReactServer);
    // For this to work the Flight Client needs to be the react-server version.
    const ReactNoopFlightClienOnTheServer = require('react-noop-renderer/flight-client');
    jest.resetModules();
    jest.mock('react', () => React);

    let stack;

    function Component() {
      stack = ReactServer.captureOwnerStack();
      return ReactServer.createElement('span', null, 'hi');
    }

    const ClientComponent = clientReference(Component);

    function ThirdPartyComponent() {
      return ReactServer.createElement(ClientComponent);
    }

    // This is rendered outside the render to ensure we don't inherit anything accidental
    // by being in the same environment which would make it seem like it works when it doesn't.
    const thirdPartyTransport = ReactNoopFlightServer.render(
      {children: ReactServer.createElement(ThirdPartyComponent)},
      {
        environmentName: 'third-party',
      },
    );

    async function fetchThirdParty() {
      return ReactNoopFlightClienOnTheServer.read(thirdPartyTransport);
    }

    async function FirstPartyComponent() {
      // This component fetches from a third party
      const thirdParty = await fetchThirdParty();
      return thirdParty.children;
    }
    function App() {
      return ReactServer.createElement(FirstPartyComponent);
    }

    const transport = ReactNoopFlightServer.render(
      ReactServer.createElement(App),
    );

    await act(async () => {
      const root = await ReactNoopFlightClient.read(transport);
      ReactNoop.render(root);
    });

    expect(normalizeCodeLocInfo(stack)).toBe(
      '\n    in ThirdPartyComponent (at **)' +
        '\n    in createResponse (at **)' + // These two internal frames should
        '\n    in read (at **)' + // ideally not be included.
        '\n    in fetchThirdParty (at **)' +
        '\n    in FirstPartyComponent (at **)' +
        '\n    in App (at **)',
    );
  });

  // @gate __DEV__
  it('can get the component owner stacks for onError in dev', async () => {
    const thrownError = new Error('hi');
    let caughtError;
    let ownerStack;

    function Foo() {
      return ReactServer.createElement(Bar, null);
    }
    function Bar() {
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(Baz, null),
      );
    }
    function Baz() {
      throw thrownError;
    }

    ReactNoopFlightServer.render(
      ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(Foo, null),
      ),
      {
        onError(error, errorInfo) {
          caughtError = error;
          ownerStack = ReactServer.captureOwnerStack
            ? ReactServer.captureOwnerStack()
            : null;
        },
      },
    );

    expect(caughtError).toBe(thrownError);
    expect(normalizeCodeLocInfo(ownerStack)).toBe(
      '\n    in Bar (at **)' + '\n    in Foo (at **)',
    );
  });

  it('should include only one component stack in replayed logs (if DevTools or polyfill adds them)', () => {
    class MyError extends Error {
      toJSON() {
        return 123;
      }
    }

    function Foo() {
      return ReactServer.createElement('div', null, [
        'Womp womp: ',
        new MyError('spaghetti'),
      ]);
    }

    function Bar() {
      const array = [];
      // Trigger key warning
      array.push(ReactServer.createElement(Foo));
      return ReactServer.createElement('div', null, array);
    }

    function App() {
      return ReactServer.createElement(Bar);
    }

    // While we're on the server we need to have the Server version active to track component stacks.
    jest.resetModules();
    jest.mock('react', () => ReactServer);
    const transport = ReactNoopFlightServer.render(
      ReactServer.createElement(App),
    );

    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.' +
        ' See https://react.dev/link/warning-keys for more information.\n' +
        '    in Bar (at **)\n' +
        '    in App (at **)',
      'Error objects cannot be rendered as text children. Try formatting it using toString().\n' +
        '  <div>Womp womp: {Error}</div>\n' +
        '                  ^^^^^^^\n' +
        '    in Foo (at **)\n' +
        '    in Bar (at **)\n' +
        '    in App (at **)',
    ]);

    // Replay logs on the client
    jest.resetModules();
    jest.mock('react', () => React);
    ReactNoopFlightClient.read(transport);
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.' +
        ' See https://react.dev/link/warning-keys for more information.\n' +
        '    in Bar (at **)\n' +
        '    in App (at **)',
      'Error objects cannot be rendered as text children. Try formatting it using toString().\n' +
        '  <div>Womp womp: {Error}</div>\n' +
        '                  ^^^^^^^\n' +
        '    in Foo (at **)\n' +
        '    in Bar (at **)\n' +
        '    in App (at **)',
    ]);
  });

  it('can filter out stack frames of a serialized error in dev', async () => {
    async function bar() {
      throw new Error('my-error');
    }

    async function intermediate() {
      await bar();
    }

    async function foo() {
      await intermediate();
    }

    const rejectedPromise = foo();
    const transport = ReactNoopFlightServer.render(
      {model: rejectedPromise},
      {
        onError(x) {
          return `digest("${x.message}")`;
        },
        filterStackFrame(url, functionName, lineNumber, columnNumber) {
          return functionName !== 'intermediate';
        },
      },
    );

    let originalError;
    try {
      await rejectedPromise;
    } catch (x) {
      originalError = x;
    }

    const root = await ReactNoopFlightClient.read(transport);
    let caughtError;
    try {
      await root.model;
    } catch (x) {
      caughtError = x;
    }
    if (__DEV__) {
      expect(caughtError.message).toBe(originalError.message);
      expect(normalizeCodeLocInfo(caughtError.stack)).toContain(
        '\n    in bar (at **)' + '\n    in foo (at **)',
      );
    }
    expect(normalizeCodeLocInfo(originalError.stack)).toContain(
      '\n    in bar (at **)' +
        '\n    in intermediate (at **)' +
        '\n    in foo (at **)',
    );
    expect(caughtError.digest).toBe('digest("my-error")');
  });

  it('can transport function names in stackframes in dev even without eval', async () => {
    function a() {
      return b();
    }
    function b() {
      return c();
    }
    function c() {
      return new Error('boom');
    }

    // eslint-disable-next-line no-eval
    const previousEval = globalThis.eval.bind(globalThis);
    // eslint-disable-next-line no-eval
    globalThis.eval = () => {
      throw new Error('eval is disabled');
    };

    try {
      const transport = ReactNoopFlightServer.render(
        {model: a()},
        {onError: () => 'digest'},
      );

      const root = await ReactNoopFlightClient.read(transport);
      const receivedError = await root.model;

      if (__DEV__) {
        const normalizedErrorStack = normalizeCodeLocInfo(
          receivedError.stack.split('\n').slice(0, 4).join('\n'),
        );

        expect(normalizedErrorStack).toEqual(
          'Error: boom' +
            '\n    in c (at **)' +
            '\n    in b (at **)' +
            '\n    in a (at **)',
        );
        assertConsoleErrorDev([
          'eval() is not supported in this environment. ' +
            'React requires eval() in development mode for various debugging features ' +
            'like reconstructing callstacks from a different environment.\n' +
            'React will never use eval() in production mode',
        ]);
      } else {
        expect(receivedError.message).toEqual(
          'An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.',
        );
        expect(receivedError).not.toHaveProperty('digest');
      }
    } finally {
      // eslint-disable-next-line no-eval
      globalThis.eval = previousEval;
    }
  });

  // @gate __DEV__  && enableComponentPerformanceTrack
  it('can render deep but cut off JSX in debug info', async () => {
    function createDeepJSX(n) {
      if (n <= 0) {
        return null;
      }
      return <div>{createDeepJSX(n - 1)}</div>;
    }

    function ServerComponent(props) {
      return <div>not using props</div>;
    }

    const transport = ReactNoopFlightServer.render({
      root: (
        <ServerComponent>
          {createDeepJSX(100) /* deper than objectLimit */}
        </ServerComponent>
      ),
    });

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      const root = rootModel.root;
      const children = root._debugInfo[1].props.children;
      expect(children.type).toBe('div');
      expect(children.props.children.type).toBe('div');
      ReactNoop.render(root);
    });

    expect(ReactNoop).toMatchRenderedOutput(<div>not using props</div>);
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('can render deep but cut off Map/Set in debug info', async () => {
    function createDeepMap(n) {
      if (n <= 0) {
        return null;
      }
      const map = new Map();
      map.set('key', createDeepMap(n - 1));
      return map;
    }

    function createDeepSet(n) {
      if (n <= 0) {
        return null;
      }
      const set = new Set();
      set.add(createDeepSet(n - 1));
      return set;
    }

    function ServerComponent(props) {
      return <div>not using props</div>;
    }

    const transport = ReactNoopFlightServer.render({
      set: (
        <ServerComponent
          set={createDeepSet(100) /* deper than objectLimit */}
        />
      ),
      map: (
        <ServerComponent
          map={createDeepMap(100) /* deper than objectLimit */}
        />
      ),
    });

    await act(async () => {
      const rootModel = await ReactNoopFlightClient.read(transport);
      const set = rootModel.set._debugInfo[1].props.set;
      const map = rootModel.map._debugInfo[1].props.map;
      expect(set instanceof Set).toBe(true);
      expect(set.size).toBe(1);
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const entry of set) {
        expect(entry instanceof Set).toBe(true);
        break;
      }

      expect(map instanceof Map).toBe(true);
      expect(map.size).toBe(1);
      expect(map.get('key') instanceof Map).toBe(true);

      ReactNoop.render(rootModel.set);
    });

    expect(ReactNoop).toMatchRenderedOutput(<div>not using props</div>);
  });

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('produces correct parent stacks', async () => {
    function Container() {
      return ReactServer.createElement('div', null);
    }
    function ContainerParent() {
      return ReactServer.createElement(Container, null);
    }
    function App() {
      return ReactServer.createElement(
        'main',
        null,
        ReactServer.createElement(ContainerParent, null),
      );
    }

    const transport = ReactNoopFlightServer.render({
      root: ReactServer.createElement(App, null),
    });

    await act(async () => {
      const {root} = await ReactNoopFlightClient.read(transport);

      ReactNoop.render(root);

      expect(root.type).toBe('main');
      if (__DEV__) {
        const div = root.props.children;
        expect(getDebugInfo(div)).toEqual([
          {
            time: 14,
          },
          {
            env: 'Server',
            key: null,
            name: 'ContainerParent',
            owner: {
              env: 'Server',
              key: null,
              name: 'App',
              props: {},
              stack: '    in Object.<anonymous> (at **)',
            },
            props: {},
            stack: '    in App (at **)',
          },
          {
            time: 15,
          },
          {
            env: 'Server',
            key: null,
            name: 'Container',
            owner: {
              env: 'Server',
              key: null,
              name: 'ContainerParent',
              owner: {
                env: 'Server',
                key: null,
                name: 'App',
                props: {},
                stack: '    in Object.<anonymous> (at **)',
              },
              props: {},
              stack: '    in App (at **)',
            },
            props: {},
            stack: '    in ContainerParent (at **)',
          },
          {
            time: 16,
          },
        ]);
        expect(getDebugInfo(root)).toEqual([
          {
            time: 12,
          },
          {
            env: 'Server',
            key: null,
            name: 'App',
            props: {},
            stack: '    in Object.<anonymous> (at **)',
          },
          {
            time: 13,
          },
        ]);
      } else {
        expect(root._debugInfo).toBe(undefined);
        expect(root._owner).toBe(undefined);
      }
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <main>
        <div />
      </main>,
    );
  });

  // @gate enableOptimisticKey
  it('collapses optimistic keys to an optimistic key', async () => {
    function Bar({text}) {
      return <div />;
    }
    function Foo() {
      return <Bar key={ReactServer.optimisticKey} />;
    }
    const transport = ReactNoopFlightServer.render({
      element: <Foo key="Outer Key" />,
    });
    const model = await ReactNoopFlightClient.read(transport);
    expect(model.element.key).toBe(React.optimisticKey);
  });

  it('can use a JSX element exported as a client reference in multiple server components', async () => {
    const ClientReference = clientReference(React.createElement('span'));

    function Foo() {
      return ClientReference;
    }

    function Bar() {
      return ClientReference;
    }

    function App() {
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(Foo),
        ReactServer.createElement(Bar),
      );
    }

    const transport = ReactNoopFlightServer.render(
      ReactServer.createElement(App),
    );

    await act(async () => {
      const result = await ReactNoopFlightClient.read(transport);
      ReactNoop.render(result);

      if (__DEV__) {
        // TODO: Debug info is dropped for frozen elements (client-created JSX
        // exported as a client reference in this case). Ideally we'd clone the
        // element so that each context gets its own mutable copy with correct
        // debug info. When fixed, foo should have Foo's debug info and bar should
        // have Bar's debug info.
        const [foo, bar] = result.props.children;
        expect(getDebugInfo(foo)).toBe(null);
        expect(getDebugInfo(bar)).toBe(null);
      }
    });

    // TODO: With cloning, each context would get its own element copy, so this
    // key warning should go away.
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\n' +
        'Check the top-level render call using <div>. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in span (at **)',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span />
        <span />
      </div>,
    );
  });
});
