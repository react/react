/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createElement} from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import Bridge from 'react-devtools-shared/src/bridge';
import Store from 'react-devtools-shared/src/devtools/store';
import {getSavedComponentFilters} from 'react-devtools-shared/src/utils';
import {registerDevToolsEventLogger} from 'react-devtools-shared/src/registerDevToolsEventLogger';
import {Server} from 'ws';
import {join} from 'path';
import {readFileSync} from 'fs';
import DevTools from 'react-devtools-shared/src/devtools/views/DevTools';
import {doesFilePathExist, launchEditor} from './editor';
import {
  __DEBUG__,
  LOCAL_STORAGE_DEFAULT_TAB_KEY,
} from 'react-devtools-shared/src/constants';
import {localStorageSetItem} from 'react-devtools-shared/src/storage';

import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type {ReactFunctionLocation, ReactCallSite} from 'shared/ReactTypes';

export type StatusTypes = 'server-connected' | 'devtools-connected' | 'error';
export type StatusListener = (message: string, status: StatusTypes) => void;
export type OnDisconnectedCallback = () => void;

let node: HTMLElement = null as any as HTMLElement;
let nodeWaitingToConnectHTML: string = '';
let projectRoots: Array<string> = [];
let statusListener: StatusListener = (
  message: string,
  status?: StatusTypes,
) => {};
let disconnectedCallback: OnDisconnectedCallback = () => {};

// TODO (Webpack 5) Hopefully we can remove this prop after the Webpack 5 migration.
function hookNamesModuleLoaderFunction() {
  return import(
    /* webpackChunkName: 'parseHookNames' */ 'react-devtools-shared/src/hooks/parseHookNames'
  );
}

function setContentDOMNode(value: HTMLElement): typeof DevtoolsUI {
  node = value;

  // Save so we can restore the exact waiting message between sessions.
  nodeWaitingToConnectHTML = node.innerHTML;

  return DevtoolsUI;
}

function setProjectRoots(value: Array<string>) {
  projectRoots = value;
}

function setStatusListener(value: StatusListener): typeof DevtoolsUI {
  statusListener = value;
  return DevtoolsUI;
}

function setDisconnectedCallback(
  value: OnDisconnectedCallback,
): typeof DevtoolsUI {
  disconnectedCallback = value;
  return DevtoolsUI;
}

let bridge: FrontendBridge | null = null;
let store: Store | null = null;
let root = null;

const log = (...args: Array<mixed>) => console.log('[React DevTools]', ...args);
log.warn = (...args: Array<mixed>) => console.warn('[React DevTools]', ...args);
log.error = (...args: Array<mixed>) =>
  console.error('[React DevTools]', ...args);

function debug(methodName: string, ...args: Array<mixed>) {
  // $FlowFixMe[constant-condition]
  if (__DEBUG__) {
    console.log(
      `%c[core/standalone] %c${methodName}`,
      'color: teal; font-weight: bold;',
      'font-weight: bold;',
      ...args,
    );
  }
}

function safeUnmount() {
  flushSync(() => {
    if (root !== null) {
      root.unmount();
      root = null;
    }
  });
}

function reload() {
  safeUnmount();

  node.innerHTML = '';

  setTimeout(() => {
    root = createRoot(node);
    root.render(
      createElement(DevTools, {
        bridge: bridge as any as FrontendBridge,
        canViewElementSourceFunction,
        hookNamesModuleLoaderFunction,
        showTabBar: true,
        store: store as any as Store,
        warnIfLegacyBackendDetected: true,
        viewElementSourceFunction,
        fetchFileWithCaching,
      }),
    );
  }, 100);
}

const resourceCache: Map<string, string> = new Map();

// As a potential improvement, this should be done from the backend of RDT.
// Browser extension is doing this via exchanging messages
// between devtools_page and dedicated content script for it, see `fetchFileWithCaching.js`.
async function fetchFileWithCaching(url: string) {
  if (resourceCache.has(url)) {
    return Promise.resolve(resourceCache.get(url));
  }

  return fetch(url)
    .then(data => data.text())
    .then(content => {
      resourceCache.set(url, content);

      return content;
    });
}

function canViewElementSourceFunction(
  _source: ReactFunctionLocation | ReactCallSite,
  symbolicatedSource: ReactFunctionLocation | ReactCallSite | null,
): boolean {
  if (symbolicatedSource == null) {
    return false;
  }
  const [, sourceURL, ,] = symbolicatedSource;

  return doesFilePathExist(sourceURL, projectRoots);
}

function viewElementSourceFunction(
  _source: ReactFunctionLocation | ReactCallSite,
  symbolicatedSource: ReactFunctionLocation | ReactCallSite | null,
): void {
  if (symbolicatedSource == null) {
    return;
  }

  const [, sourceURL, line] = symbolicatedSource;
  launchEditor(sourceURL, line, projectRoots);
}

function onDisconnected() {
  safeUnmount();

  node.innerHTML = nodeWaitingToConnectHTML;

  disconnectedCallback();
}

function showErrorMessage(headerText: string, contentText: string) {
  const box = document.createElement('div');
  box.className = 'box';

  const header = document.createElement('div');
  header.className = 'box-header';
  header.textContent = headerText;
  box.appendChild(header);

  const content = document.createElement('div');
  content.className = 'box-content';
  content.textContent = contentText;
  box.appendChild(content);

  node.textContent = '';
  node.appendChild(box);
}

function onError({code, message}: $FlowFixMe) {
  safeUnmount();

  if (code === 'EADDRINUSE') {
    showErrorMessage(
      'Another instance of DevTools is running.',
      'Only one copy of DevTools can be used at a time.',
    );
  } else {
    showErrorMessage('Unknown error', String(message));
  }
}

function openProfiler() {
  // Mocked up bridge and store to allow the DevTools to be rendered
  bridge = new Bridge({listen: () => () => {}, send: () => {}});
  store = new Store(bridge, {});

  // Ensure the Profiler tab is shown initially.
  localStorageSetItem(
    LOCAL_STORAGE_DEFAULT_TAB_KEY,
    JSON.stringify('profiler'),
  );

  reload();
}

function initialize(socket: WebSocket) {
  const listeners = [];
  socket.onmessage = event => {
    let data;
    try {
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);

        // $FlowFixMe[constant-condition]
        if (__DEBUG__) {
          debug('WebSocket.onmessage', data);
        }
      } else {
        throw Error();
      }
    } catch (e) {
      log.error('Failed to parse JSON', event.data);
      return;
    }
    listeners.forEach(fn => {
      try {
        fn(data);
      } catch (error) {
        log.error('Error calling listener', data);
        throw error;
      }
    });
  };

  bridge = new Bridge({
    listen(fn) {
      listeners.push(fn);
      return () => {
        const index = listeners.indexOf(fn);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      };
    },
    send(event: string, payload: mixed, transferable?: $ReadOnlyArray<mixed>) {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({event, payload}));
      }
    },
  });
  (bridge as any as FrontendBridge).addListener('shutdown', () => {
    socket.close();
  });

  // $FlowFixMe[incompatible-type] found when upgrading Flow
  store = new Store(bridge, {
    checkBridgeProtocolCompatibility: true,
    supportsTraceUpdates: true,
    supportsClickToInspect: true,
  });

  log('Connected');
  statusListener('DevTools initialized.', 'devtools-connected');
  reload();
}

let startServerTimeoutID: TimeoutID | null = null;

function connectToSocket(socket: WebSocket): {close(): void} {
  socket.onerror = err => {
    onDisconnected();
    log.error('Error with websocket connection', err);
  };
  socket.onclose = () => {
    onDisconnected();
    log('Connection to RN closed');
  };
  initialize(socket);

  return {
    close: function () {
      onDisconnected();
    },
  };
}

type ServerOptions = {
  key?: string,
  cert?: string,
};

type LoggerOptions = {
  surface?: ?string,
};

type ClientOptions = {
  host?: string,
  port?: number,
  useHttps?: boolean,
};

function startServer(
  port: number = 8097,
  host: string = 'localhost',
  httpsOptions?: ServerOptions,
  loggerOptions?: LoggerOptions,
  path?: string,
  clientOptions?: ClientOptions,
): {close(): void} {
  registerDevToolsEventLogger(loggerOptions?.surface ?? 'standalone');

  const useHttps = !!httpsOptions;
  const httpServer = useHttps
    ? require('https').createServer(httpsOptions)
    : require('http').createServer();
  const server = new Server({server: httpServer, maxPayload: 1e9});
  let connected: WebSocket | null = null;
  server.on('connection', (socket: WebSocket) => {
    if (connected !== null) {
      connected.close();
      log.warn(
        'Only one connection allowed at a time.',
        'Closing the previous connection',
      );
    }
    connected = socket;
    socket.onerror = error => {
      connected = null;
      onDisconnected();
      log.error('Error with websocket connection', error);
    };
    socket.onclose = () => {
      connected = null;
      onDisconnected();
      log('Connection to RN closed');
    };
    initialize(socket);
  });

  server.on('error', (event: $FlowFixMe) => {
    onError(event);
    log.error('Failed to start the DevTools server', event);
    startServerTimeoutID = setTimeout(
      () =>
        startServer(
          port,
          host,
          httpsOptions,
          loggerOptions,
          path,
          clientOptions,
        ),
      1000,
    );
  });

  httpServer.on('request', (request: $FlowFixMe, response: $FlowFixMe) => {
    // Serve a file that immediately sets up the connection.
    const backendFile = readFileSync(join(__dirname, 'backend.js'));

    // The renderer interface doesn't read saved component filters directly,
    // because they are generally stored in localStorage within the context of the extension.
    // Because of this it relies on the extension to pass filters, so include them wth the response here.
    // This will ensure that saved filters are shared across different web pages.
    const componentFiltersString = JSON.stringify(getSavedComponentFilters());

    // Client overrides: when connecting through a reverse proxy, the client
    // may need to connect to a different host/port/protocol than the server.
    const clientHost = clientOptions?.host ?? host;
    const clientPort = clientOptions?.port ?? port;
    const clientUseHttps = clientOptions?.useHttps ?? useHttps;

    response.end(
      backendFile.toString() +
        '\n;' +
        `var ReactDevToolsBackend = typeof ReactDevToolsBackend !== "undefined" ? ReactDevToolsBackend : require("ReactDevToolsBackend");\n` +
        `ReactDevToolsBackend.initialize(undefined, undefined, undefined, ${componentFiltersString});` +
        '\n' +
        `ReactDevToolsBackend.connectToDevTools({port: ${clientPort}, host: '${clientHost}', useHttps: ${
          clientUseHttps ? 'true' : 'false'
        }${path != null ? `, path: '${path}'` : ''}});
        `,
    );
  });

  httpServer.on('error', (event: $FlowFixMe) => {
    onError(event);
    statusListener('Failed to start the server.', 'error');
    startServerTimeoutID = setTimeout(
      () =>
        startServer(
          port,
          host,
          httpsOptions,
          loggerOptions,
          path,
          clientOptions,
        ),
      1000,
    );
  });

  httpServer.listen(port, () => {
    statusListener(
      'The server is listening on the port ' + port + '.',
      'server-connected',
    );
  });

  return {
    close: function () {
      connected = null;
      onDisconnected();
      if (startServerTimeoutID !== null) {
        clearTimeout(startServerTimeoutID);
      }
      server.close();
      httpServer.close();
    },
  };
}

const DevtoolsUI = {
  connectToSocket,
  setContentDOMNode,
  setProjectRoots,
  setStatusListener,
  setDisconnectedCallback,
  startServer,
  openProfiler,
};

export default DevtoolsUI;
