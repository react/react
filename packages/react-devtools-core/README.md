# `react-devtools-core`

This package provides low-level APIs to support renderers like [React Native](https://github.com/facebook/react-native). If you're looking for the standalone React DevTools UI, **we suggest using [`react-devtools`](https://github.com/facebook/react/tree/main/packages/react-devtools) instead of using this package directly**.

This package provides two entrypoints: labeled "backend" and "standalone" (frontend). Both APIs are described below.

# Backend API

Backend APIs are embedded in _development_ builds of renderers like [React Native](https://github.com/facebook/react-native) in order to connect to the React DevTools UI.

### Example

If you are building a non-browser-based React renderer, you can use the backend API like so:

```js
if (process.env.NODE_ENV !== 'production') {
  const { initialize, connectToDevTools } = require("react-devtools-core");

  initialize(settings);
  // Must be called before packages like react or react-native are imported
  connectToDevTools({...config});
}
```

> **NOTE** that this API (`connectToDevTools`) must be (1) run in the same context as React and (2) must be called before React packages are imported (e.g. `react`, `react-dom`, `react-native`).

### `initialize` arguments
| Argument                  | Description |
|---------------------------|-------------|
| `settings`                | Optional. If not specified, or received as null, then default settings are used. Can be plain object or a Promise that resolves with the [plain settings object](#Settings). If Promise rejects, the console will not be patched and some console features from React DevTools will not work. |
| `shouldStartProfilingNow` | Optional. Whether to start profiling immediately after installing the hook. Defaults to `false`. |
| `profilingSettings`       | Optional. Profiling settings used when `shouldStartProfilingNow` is `true`. Defaults to `{ recordChangeDescriptions: false, recordTimeline: false }`. |
| `componentFilters`        | Optional. Array or Promise that resolves to an array of component filters to apply before DevTools connects. Defaults to the built-in host component filter. See [Component filters](#component-filters) for the full spec. |

#### `Settings`
| Spec                                                                                                                                                                           | Default value                                                                                                                                                        |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| <pre>{<br>  appendComponentStack: boolean,<br>  breakOnConsoleErrors: boolean,<br>  showInlineWarningsAndErrors: boolean,<br>  hideConsoleLogsInStrictMode: boolean,<br>  disableSecondConsoleLogDimmingInStrictMode: boolean<br>}</pre> | <pre>{<br>  appendComponentStack: true,<br>  breakOnConsoleErrors: false,<br>  showInlineWarningsAndErrors: true,<br>  hideConsoleLogsInStrictMode: false,<br>  disableSecondConsoleLogDimmingInStrictMode: false<br>}</pre> |

#### Component filters
Each filter object must include `type` and `isEnabled`. Some filters also require `value` or `isValid`.

| Type | Required fields | Description |
|------|-----------------|-------------|
| `ComponentFilterElementType` (`1`) | `type`, `isEnabled`, `value: ElementType` | Hides elements of the given element type. DevTools defaults to hiding host components. |
| `ComponentFilterDisplayName` (`2`) | `type`, `isEnabled`, `isValid`, `value: string` | Hides components whose display name matches the provided RegExp string. |
| `ComponentFilterLocation` (`3`) | `type`, `isEnabled`, `isValid`, `value: string` | Hides components whose source location matches the provided RegExp string. |
| `ComponentFilterHOC` (`4`) | `type`, `isEnabled`, `isValid` | Hides higher-order components. |
| `ComponentFilterEnvironmentName` (`5`) | `type`, `isEnabled`, `isValid`, `value: string` | Hides components whose environment name matches the provided string. |
| `ComponentFilterActivitySlice` (`6`) | `type`, `isEnabled`, `isValid`, `activityID`, `rendererID` | Filters activity slices; usually managed by DevTools rather than user code. |

### `connectToDevTools` options
| Prop                   | Default       | Description                                                                                                               |
|------------------------|---------------|---------------------------------------------------------------------------------------------------------------------------|
| `host`                 | `"localhost"` | Socket connection to frontend should use this host.                                                                       |
| `isAppActive`          |               | (Optional) function that returns true/false, telling DevTools when it's ready to connect to React.                        |
| `path`                 | `""`          | Path appended to the WebSocket URI (e.g. `"/__react_devtools__/"`). Useful when proxying through a reverse proxy on a subpath. A leading `/` is added automatically if missing. |
| `port`                 | `8097`        | Socket connection to frontend should use this port.                                                                       |
| `resolveRNStyle`       |               | (Optional) function that accepts a key (number) and returns a style (object); used by React Native.                       |
| `retryConnectionDelay` | `200`         | Delay (ms) to wait between retrying a failed Websocket connection                                                         |
| `useHttps`             | `false`       | Socket connection to frontend should use secure protocol (wss).                                                           |
| `websocket`            |               | Custom `WebSocket` connection to frontend; overrides `host` and `port` settings.                                          |
| `onSettingsUpdated`    |               | A callback that will be called when the user updates the settings in the UI. You can use it for persisting user settings. |                                                                                         |


### `connectWithCustomMessagingProtocol` options
| Prop                | Description                                                                                                                                                    |
|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `onSubscribe`       | Function, which receives listener (function, with a single argument) as an argument. Called when backend subscribes to messages from the other end (frontend). |
| `onUnsubscribe`     | Function, which receives listener (function) as an argument. Called when backend unsubscribes to messages from the other end (frontend).                       |
| `onMessage`         | Function, which receives 2 arguments: event (string) and payload (any). Called when backend emits a message, which should be sent to the frontend.             |
| `onSettingsUpdated` | A callback that will be called when the user updates the settings in the UI. You can use it for persisting user settings.                                      |

Unlike `connectToDevTools`, `connectWithCustomMessagingProtocol` returns a callback, which can be used for unsubscribing the backend from the global DevTools hook.

# Frontend API

Frontend APIs can be used to render the DevTools UI into a DOM node. One example of this is [`react-devtools`](https://github.com/facebook/react/tree/main/packages/react-devtools) which wraps DevTools in an Electron app.

### Example
```js
import DevtoolsUI from "react-devtools-core/standalone";

// See the full list of API methods in documentation below.
const { setContentDOMNode, startServer } = DevtoolsUI;

// Render DevTools UI into a DOM element.
setContentDOMNode(document.getElementById("container"));

// Start socket server used to communicate between backend and frontend.
startServer(
  // Port defaults to 8097
  1234,

  // Host defaults to "localhost"
  "example.devserver.com",

  // Optional config for secure socket (WSS).
  {
    key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
    cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
  }
);
```

### Exported methods
The `default` export is an object defining the methods described below.

These methods support chaining for convenience. For example:
```js
const DevtoolsUI = require("react-devtools-core/standalone");
DevtoolsUI.setContentDOMNode(element).startServer();
```

#### `connectToSocket(socket: WebSocket)`
> This is an advanced config function that is typically not used.

Custom `WebSocket` connection to use for communication between DevTools frontend and backend. Calling this method automatically initializes the DevTools UI (similar to calling `startServer()`).

#### `openProfiler()`
Automatically select the "Profiler" tab in the DevTools UI.

#### `setContentDOMNode(element: HTMLElement)`
Set the DOM element DevTools UI should be rendered into on initialization.

#### `setDisconnectedCallback(callback: Function)`
_Optional_ callback to be notified when DevTools `WebSocket` closes (or errors).

#### `setProjectRoots(roots: Array<string>)`
_Optional_ set of root directories for source files. These roots can be used to open an inspected component's source code using an IDE.

#### `setStatusListener(callback: Function)`
_Optional_ callback to be notified of socket server events (e.g. initialized, errored, connected).

This callback receives two parameters:
```js
function onStatus(
  message: string,
  status: 'server-connected' | 'devtools-connected' | 'error'
): void {
  // ...
}
```

#### `startServer(port?, host?, httpsOptions?, loggerOptions?, path?, clientOptions?)`
Start a socket server (used to communicate between backend and frontend) and renders the DevTools UI.

This method accepts the following parameters:
| Name | Default | Description |
|---|---|---|
| `port` | `8097` | Port the local server listens on. |
| `host` | `"localhost"` | Host the local server binds to. |
| `httpsOptions` | | _Optional_ object defining `key` and `cert` strings. |
| `loggerOptions` | | _Optional_ object defining a `surface` string (to be included with DevTools logging events). |
| `path` | | _Optional_ path to append to the WebSocket URI served to connecting clients (e.g. `"/__react_devtools__/"`). Also set via the `REACT_DEVTOOLS_PATH` env var in the Electron app. |
| `clientOptions` | | _Optional_ object with client-facing overrides (see below). |

##### `clientOptions`

When connecting through a reverse proxy, the client may need to connect to a different host, port, or protocol than the local server. Use `clientOptions` to override what appears in the `connectToDevTools()` script served to clients. Any field not set falls back to the corresponding server value.

| Field | Default | Description |
|---|---|---|
| `host` | server `host` | Host the client connects to. |
| `port` | server `port` | Port the client connects to. |
| `useHttps` | server `useHttps` | Whether the client should use `wss://`. |

These can also be set via environment variables in the Electron app:

| Env Var | Description |
|---|---|
| `REACT_DEVTOOLS_CLIENT_HOST` | Overrides the host in the served client script. |
| `REACT_DEVTOOLS_CLIENT_PORT` | Overrides the port in the served client script. |
| `REACT_DEVTOOLS_CLIENT_USE_HTTPS` | Set to `"true"` to make the served client script use `wss://`. |

##### Reverse proxy example

Run DevTools locally on the default port, but tell clients to connect through a remote proxy:
```sh
REACT_DEVTOOLS_CLIENT_HOST=remote.example.com \
REACT_DEVTOOLS_CLIENT_PORT=443 \
REACT_DEVTOOLS_CLIENT_USE_HTTPS=true \
REACT_DEVTOOLS_PATH=/__react_devtools__/ \
react-devtools
```
The server listens on `localhost:8097`. The served script tells clients:
```js
connectToDevTools({host: 'remote.example.com', port: 443, useHttps: true, path: '/__react_devtools__/'})
```

# Development

Watch for changes made to the backend entry point and rebuild:
```sh
yarn start:backend
```

Watch for changes made to the standalone UI entry point and rebuild:
```sh
yarn start:standalone
```

Run the standalone UI using `yarn start` in the [`react-devtools`](https://github.com/facebook/react/tree/main/packages/react-devtools).
