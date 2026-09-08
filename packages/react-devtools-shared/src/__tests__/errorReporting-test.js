/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getVersionedRenderImplementation} from './utils';

jest.mock('react-devtools-feature-flags', () => ({
  ...jest.requireActual('react-devtools-feature-flags'),
  enableLogger: true,
}));

describe('error reporting', () => {
  let React;
  let act;

  beforeEach(() => {
    React = require('react');
    act = require('./utils').act;
  });

  const {getContainer, render, unmount} = getVersionedRenderImplementation();

  it('reports a Store error before the frontend mounts', () => {
    const {registerEventLogger} = require('react-devtools-shared/src/Logger');
    const {
      subscribeToStoreErrors,
    } = require('react-devtools-shared/src/devtools/storeErrorLogger');
    const eventLogger = jest.fn();
    const unregisterEventLogger = registerEventLogger(eventLogger);
    const unsubscribeFromStoreErrors = subscribeToStoreErrors(
      global.store,
      global.bridge,
    );
    const error = new Error('Initial render error');

    try {
      expect(() => global.store._throwAndEmitError(error)).toThrow(error);
      expect(eventLogger).toHaveBeenCalledTimes(1);
      expect(eventLogger).toHaveBeenCalledWith({
        event_name: 'error',
        error_message: error.message,
        error_stack: error.stack,
        error_component_stack: null,
      });
    } finally {
      unsubscribeFromStoreErrors();
      unregisterEventLogger();
    }
  });

  it('reports a Store error once when multiple error boundaries observe it', () => {
    const {registerEventLogger} = require('react-devtools-shared/src/Logger');
    const ErrorBoundary =
      require('react-devtools-shared/src/devtools/views/ErrorBoundary/ErrorBoundary').default;
    const {
      subscribeToStoreErrors,
    } = require('react-devtools-shared/src/devtools/storeErrorLogger');
    const store = global.store;
    const eventLogger = jest.fn();
    const unregisterEventLogger = registerEventLogger(eventLogger);
    const unsubscribeFromStoreErrors = subscribeToStoreErrors(
      store,
      global.bridge,
    );

    act(() => {
      render(
        <>
          <ErrorBoundary store={store}>First boundary</ErrorBoundary>
          <ErrorBoundary store={store}>Second boundary</ErrorBoundary>
          <ErrorBoundary store={store}>Third boundary</ErrorBoundary>
        </>,
      );
    });

    const error = new Error('Store error');
    try {
      act(() => {
        expect(() => store._throwAndEmitError(error)).toThrow(error);
      });

      expect(eventLogger).toHaveBeenCalledTimes(1);
      expect(eventLogger).toHaveBeenCalledWith({
        event_name: 'error',
        error_message: error.message,
        error_stack: error.stack,
        error_component_stack: null,
      });
      expect(
        getContainer().textContent.match(/Uncaught Error: Store error/g),
      ).toHaveLength(3);
    } finally {
      unsubscribeFromStoreErrors();
      unregisterEventLogger();
      act(() => unmount());
    }
  });

  it('registers the event logger once while its iframe is loading', () => {
    const Logger = require('react-devtools-shared/src/Logger');
    const registerEventLogger = jest.spyOn(Logger, 'registerEventLogger');
    const loggingURL = 'https://example.com/react-devtools-logging';
    const previousLoggingURL = process.env.LOGGING_URL;
    process.env.LOGGING_URL = loggingURL;

    try {
      const {
        registerDevToolsEventLogger,
      } = require('react-devtools-shared/src/registerDevToolsEventLogger');

      registerDevToolsEventLogger('test');
      registerDevToolsEventLogger('test');

      expect(registerEventLogger).toHaveBeenCalledTimes(1);
      expect(
        document.querySelectorAll(`iframe[src="${loggingURL}"]`),
      ).toHaveLength(1);
    } finally {
      registerEventLogger.mockRestore();
      if (previousLoggingURL === undefined) {
        delete process.env.LOGGING_URL;
      } else {
        process.env.LOGGING_URL = previousLoggingURL;
      }
      document
        .querySelectorAll(`iframe[src="${loggingURL}"]`)
        .forEach(iframe => iframe.remove());
    }
  });

  it('normalizes values that are not Error objects', () => {
    const {
      logErrorEvent,
      registerEventLogger,
    } = require('react-devtools-shared/src/Logger');
    const eventLogger = jest.fn();
    const unregisterEventLogger = registerEventLogger(eventLogger);

    try {
      logErrorEvent(null, null);
      logErrorEvent({message: 42, stack: {}}, null);

      expect(eventLogger).toHaveBeenNthCalledWith(1, {
        event_name: 'error',
        error_message: null,
        error_stack: null,
        error_component_stack: null,
      });
      expect(eventLogger).toHaveBeenNthCalledWith(2, {
        event_name: 'error',
        error_message: null,
        error_stack: null,
        error_component_stack: null,
      });
    } finally {
      unregisterEventLogger();
    }
  });
});
