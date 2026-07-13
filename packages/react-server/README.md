# react-server

This is an experimental package for creating custom React streaming server renderers.

**Its API is not as stable as that of React, React Native, or React DOM, and does not follow the common versioning scheme.**

**Use it at your own risk.**

## Usage

`react-server` is a package implementing various Server Rendering capabilities. The two implementation are codenamed `Fizz` and `Flight`.

`Fizz` is a renderer for Server Side Rendering React. The same code that runs in the client (browser or native) is run on the server to produce an initial view to send to the client before it has to download and run React and all the user code to produce that view on the client.

`Flight` is a renderer for React Server Components. These are components that never run on a client. The output of a React Server Component render can be a React tree that can run on the client or be SSR'd using `Fizz`.

## `Fizz` Usage

This part of the Readme is not fully developed yet

## `Flight` Usage

To use `react-server` for React Server Components you must set up an implementation package alongside `react-client`. Use an existing implementation such as `react-server-dom-webpack` as a guide.

You might implement a render function like

```js
import {
  createRequest,
  startWork,
  startFlowing,
  stopFlowing,
  abort,
} from 'react-server/src/ReactFlightServer'

function render(
  model: ReactClientValue,
  clientManifest: ClientManifest,
  options?: Options,
): ReadableStream {
  const request = createRequest(
    model,
    clientManifest,
    options ? options.onError : undefined,
    options ? options.identifierPrefix : undefined,
    options ? options.temporaryReferences : undefined,
    __DEV__ && options ? options.environmentName : undefined,
    __DEV__ && options ? options.filterStackFrame : undefined,
  );
  const stream = new ReadableStream(
    {
      type: 'bytes',
      start: (controller): ?Promise<void> => {
        startWork(request);
      },
      pull: (controller): ?Promise<void> => {
        startFlowing(request, controller);
      },
      cancel: (reason): ?Promise<void> => {
        stopFlowing(request);
        abort(request, reason);
      },
    },
    {highWaterMark: 0},
  );
  return stream;
}

```

### `Flight` Rendering

`react-server` implements the React Server Components rendering implementation. React Server Components is in essence a general purpose serialization and deserialization capability with support for some built-in React primitives such as Suspense and Lazy.

The renderable type is a superset of `structuredClone()`. In addition to all the cloneable types `react-server` can render Symbols, Promises, Iterators and Iterables, async Iterators and Iterables.

Here are some examples of what can be rendered
```js
// primitives
createResponse(123, ...)

// objects and Arrays
createResponse({ messages: ['hello', 'react'] }, ...)

// Maps, Sets, and more
createResponse({ m: Map(['k', 'v'])}, ...)
```

Additionally React built ins can be rendered including Function Components

Function Component are called and the return value can be any renderable type. Since `react-server` supports Promises, Function Components can be async functions.

Here are some examples of what can be rendered
```js

async function App({ children }) {
  return children
}

createResponse(<App ><Children /></App>, ...)
```

Finally, There are two types of references in `react-server` that can be rendered

#### Client References
When a React Server Component framework bundles an application and encounters a `"use client"` directive it must resister exported members with `"registerClientReference"` which will encode the necessary information for `Flight` to interpret the export as a reference to be loaded on the client rather than a direct dependency on the Server module graph.

When rendering a client reference `Flight` will encode necessary information in the serialized output to describe how to load the code which represents the client module.

While it is common for client references to be components they can be any value.


```js
'use client'

export function alert(message) {
  alert(message)
}
```

```js
'use client'

export function ClientComp({ onClick, message }) {
  return <button onClick={onClick}>Alert</button>
}
```

```js

// client references don't have to just be components, anything can be 
// a reference, in this case we're importing a function that will be
// passed to the ClientComp component
import { alert } from '...'
import { ClientComp } from '...'

async function App({ children }) {
  return children
}

createResponse(
  <App >
    <ClientComp onClick={alert} message={"hello world"} />
  </App>,
...)
```

#### Server References
Similarly When a React Server Component framework bundles an application and encounters a `"use server"` directive in a file or in a function body, including closures, it must implement that function as as a server entrypoint that can be called from the client. To make `Flight` aware that a function is a Server Reference the function should be registered with `registerServerReference()`.

```js

async function logOnServer(message) {
  "use server"
  console.log(message)
}

async function App({ children }) {
  // logOnServer can be used in a Server Component
  logOnServer('used from server')
  return children
}

createResponse(
  <App >
    <ClientComp onClick={logOnServer} message={"used from client"} />
  </App>,
...)
```

### `Flight` Prerendering

When rendering with `react-server` there are two broad contexts when this might happen. Realtime when responding to a user request and ahead of time when prerendering a page that can later be used more than once.

While the core rendering implementation is the same in both cases there are subtle differences we can adopt that take advantage of the context. For instance while rendering in response to a real user request we want to stream eagerly if the consumer is requesting information. This allows us to stream content to the consumer as it becomes available but might have implications for the stability of the serialized format. When prerendering we assume there is not urgency to producing a partial result as quickly as possible so we can alter the internal implementation take advantage of this. To implement a prerender API use `createPrerenderRequest` in place of `createRequest`.

One key semantic change prerendering has with rendering is how errors are handled. When rendering an error is embedded into the output and must be handled by the consumer such as an SSR render or on the client. However with prerendering there is an expectation that if the prerender errors then the entire prerender will be discarded or it will be used but the consumer will attempt to recover that error by asking for a dynamic render. This is analogous to how errors during SSR aren't immediately handled they are actually encoded as requests for client recovery. The error only is observed if the retry on the client actually fails. To account for this prerenders simply omit parts of the model that errored. you can use the `onError` argument in `createPrerenderRequest` to observe if an error occurred and users of your `prerender` implementation can choose whether to abandon the prerender or implement dynamic recovery when an error occurs.

Existing implementations only return the stream containing the output of the prerender once it has completed. In the future we may introduce a `resume` API similar to the one that exists for `Fizz`. In anticipation of such an API it is expected that implementations of `prerender` return the type `Promise<{ prelude: <Host Appropriate Stream Type> }>`

```js
function prerender(
  model: ReactClientValue,
  clientManifest: ClientManifest,
  options?: Options,
): Promise<StaticResult> {
  return new Promise((resolve, reject) => {
    const onFatalError = reject;
    function onAllReady() {
      const stream = new ReadableStream(
        {
          type: 'bytes',
          start: (controller): ?Promise<void> => {
            startWork(request);
          },
          pull: (controller): ?Promise<void> => {
            startFlowing(request, controller);
          },
          cancel: (reason): ?Promise<void> => {
            stopFlowing(request);
            abort(request, reason);
          },
        },
        // $FlowFixMe[prop-missing] size() methods are not allowed on byte streams.
        {highWaterMark: 0},
      );
      resolve({prelude: stream});
    }
    const request = createPrerenderRequest(
      model,
      clientManifest,
      onAllReady,
      onFatalError,
      options ? options.onError : undefined,
      options ? options.identifierPrefix : undefined,
      options ? options.temporaryReferences : undefined,
      __DEV__ && options ? options.environmentName : undefined,
      __DEV__ && options ? options.filterStackFrame : undefined,
    );
    startWork(request);
  });
}
```

## `Flight` Reference (Incomplete)

### `createRequest(model, bundlerConfig, ...options): Request`

The signature of this method changes as we evolve the project so this Readme will omit the specific signature but generally this function will produce a Request that represents the rendering of some React application (the model) along with implementation specific bundler configuration. Typically this configuration will tell the `Flight` implementation how to encode Client References in the serialized output

The `RequestInstance` represents the render.

Rendering does not actually begin until you call `startWork`

### `createPrerenderRequest(model, bundlerConfig, ...options): Request`

This is similar to `createRequest` but it alters some internal semantics for how errors and aborts are treated. It returns the same type as `createRequest`.

### `startWork(request: Request): void`

When passed a request this will initiate the actual render. It will continue until it completes

### `startFlowing(request: Request, destination: Destination): void`

a destination is whatever the implementation wants to use for storing the output of the render. In existing implementations it is either a Node stream or a Web stream. When you call `startFlowing` the request will write to the destination continuously whenever more chunks are unblocked, say after an async function has resolved and there is something new to serialize. You can implement streaming backpressure using `stopFlowing()`

### `stopFlowing(request: Request): void`

If you need to pause or permanently end the writing of any additional serialized output for this request you can call `stopFlowing(request)`. You may start flowing again after you've stopped. This is how you would implement backpressure support for streams for instance. It's important to note that stopping flowing is not going to stop rendering. If you want rendering to stop you must `abort` the request.

### `abort(request: Request): void`

If you want to stop rendering you can abort the request with `abort(request)`. This will cause all incomplete work to be abandoned. If the request was created with `createRequest` the abort will encode errors into any unfinished slots in the serialization. If the request was created with `createPrerenderRequest` the abort will omit anything in the places that are unfinished leaving the serialized model in an incomplete state.
