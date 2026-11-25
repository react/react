/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('standalone', () => {
  let http;
  let net;
  let DevtoolsUI;
  let listenSpy;
  let server: {close(): void} | null = null;

  beforeEach(() => {
    // The server is driven by real socket I/O.
    jest.useRealTimers();

    http = require('http');
    net = require('net');
    // Spy on the base class so that both HTTP and HTTPS servers are covered.
    listenSpy = jest.spyOn(net.Server.prototype, 'listen');

    // The UI is only rendered once a client connects, and it imports CSS
    // that Jest can't parse.
    jest.mock('react-devtools-shared/src/devtools/views/DevTools', () => ({
      __esModule: true,
      default: () => null,
    }));

    DevtoolsUI = require('react-devtools-core/src/standalone').default;
    DevtoolsUI.setContentDOMNode(document.createElement('div'));
  });

  afterEach(() => {
    if (server !== null) {
      server.close();
      server = null;
    }
    listenSpy.mockRestore();
  });

  async function startServer(...args): Promise<{
    address: string,
    family: string,
    port: number,
  }> {
    const listening = new Promise((resolve, reject) => {
      DevtoolsUI.setStatusListener((message, status) => {
        if (status === 'server-connected') {
          resolve();
        } else if (status === 'error') {
          reject(new Error(message));
        }
      });
    });
    server = DevtoolsUI.startServer(...args);
    await listening;

    expect(listenSpy).toHaveBeenCalledTimes(1);
    return listenSpy.mock.contexts[0].address();
  }

  function fetchClientScript(host: string, port: number): Promise<string> {
    return new Promise((resolve, reject) => {
      http
        .get({host, port}, response => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', chunk => {
            body += chunk;
          });
          response.on('end', () => resolve(body));
        })
        .on('error', reject);
    });
  }

  function canConnect(host: string, port: number): Promise<boolean> {
    return new Promise(resolve => {
      const socket = net.connect({host, port});
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
    });
  }

  // https://github.com/react/react/issues/37624
  it('should only listen on the host it was started with', async () => {
    const {address, port} = await startServer(0, '127.0.0.1');

    expect(address).toBe('127.0.0.1');
    expect(await canConnect('127.0.0.1', port)).toBe(true);
    expect(await fetchClientScript('127.0.0.1', port)).toContain(
      "host: '127.0.0.1'",
    );
  });

  it('should only listen on loopback when started with localhost', async () => {
    const {address} = await startServer(0, 'localhost');

    // Depending on the platform, localhost may resolve to either loopback address.
    expect(['127.0.0.1', '::1']).toContain(address);
  });

  it('should listen on all interfaces when no host is provided', async () => {
    const {address, port} = await startServer(0);

    expect(['::', '0.0.0.0']).toContain(address);
    expect(await canConnect('127.0.0.1', port)).toBe(true);
    // Clients are still told to connect to localhost.
    expect(await fetchClientScript('127.0.0.1', port)).toContain(
      "host: 'localhost'",
    );
  });

  it('should tell clients to connect to the client host instead of the listening host', async () => {
    const {address, port} = await startServer(
      0,
      '127.0.0.1',
      undefined,
      undefined,
      undefined,
      {host: 'remote.example.com', port: 443},
    );

    expect(address).toBe('127.0.0.1');
    expect(await fetchClientScript('127.0.0.1', port)).toContain(
      `ReactDevToolsBackend.connectToDevTools({port: 443, host: 'remote.example.com', useHttps: false});`,
    );
  });
});
