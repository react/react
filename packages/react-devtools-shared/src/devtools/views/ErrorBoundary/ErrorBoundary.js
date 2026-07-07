/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Component, Suspense} from 'react';
import Store from 'react-devtools-shared/src/devtools/store';
import UnsupportedBridgeOperationView from './UnsupportedBridgeOperationView';
import ErrorView from './ErrorView';
import SearchingGitHubIssues from './SearchingGitHubIssues';
import SuspendingErrorView from './SuspendingErrorView';
import TimeoutView from './TimeoutView';
import CaughtErrorView from './CaughtErrorView';
import UnsupportedBridgeOperationError from 'react-devtools-shared/src/UnsupportedBridgeOperationError';
import TimeoutError from 'react-devtools-shared/src/errors/TimeoutError';
import UserError from 'react-devtools-shared/src/errors/UserError';
import UnknownHookError from 'react-devtools-shared/src/errors/UnknownHookError';
import {logEvent} from 'react-devtools-shared/src/Logger';

type Props = {
  children: React$Node,
  canDismiss?: boolean,
  onBeforeDismissCallback?: () => void,
  store?: Store,
};

type State = {
  callStack: string | null,
  canDismiss: boolean,
  componentStack: string | null,
  errorMessage: string | null,
  hasError: boolean,
  isUnsupportedBridgeOperationError: boolean,
  isTimeout: boolean,
  isUserError: boolean,
  isUnknownHookError: boolean,
};

const InitialState: State = {
  callStack: null,
  canDismiss: false,
  componentStack: null,
  errorMessage: null,
  hasError: false,
  isUnsupportedBridgeOperationError: false,
  isTimeout: false,
  isUserError: false,
  isUnknownHookError: false,
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = InitialState;

  static getDerivedStateFromError(error: any): {
    callStack: string | null,
    errorMessage: string | null,
    hasError: boolean,
    isTimeout: boolean,
    isUnknownHookError: boolean,
    isUnsupportedBridgeOperationError: boolean,
    isUserError: boolean,
  } {
    const errorMessage =
      typeof error === 'object' &&
      error !== null &&
      typeof error.message === 'string'
        ? error.message
        : null;

    const isTimeout = error instanceof TimeoutError;
    const isUserError = error instanceof UserError;
    const isUnknownHookError = error instanceof UnknownHookError;
    const isUnsupportedBridgeOperationError =
      error instanceof UnsupportedBridgeOperationError;

    const callStack =
      typeof error === 'object' &&
      error !== null &&
      typeof error.stack === 'string'
        ? error.stack.split('\n').slice(1).join('\n')
        : null;

    return {
      callStack,
      errorMessage,
      hasError: true,
      isUnsupportedBridgeOperationError,
      isUnknownHookError,
      isTimeout,
      isUserError,
    };
  }

  componentDidCatch(error: any, {componentStack}: any) {
    this._logError(error, componentStack);
    this.setState({
      componentStack,
    });
  }

  componentDidMount() {
    const {store} = this.props;
    if (store != null) {
      store.addListener('error', this._onStoreError);
    }
  }

  componentWillUnmount() {
    const {store} = this.props;
    if (store != null) {
      store.removeListener('error', this._onStoreError);
    }
  }

  render(): React.Node {
    const {canDismiss: canDismissProp, children} = this.props;
    const {
      callStack,
      canDismiss: canDismissState,
      componentStack,
      errorMessage,
      hasError,
      isUnsupportedBridgeOperationError,
      isTimeout,
      isUserError,
      isUnknownHookError,
    } = this.state;

    if (hasError) {
      if (isTimeout) {
        return (
          <TimeoutView
            callStack={callStack}
            componentStack={componentStack}
            dismissError={
              canDismissProp || canDismissState ? this._dismissError : null
            }
            errorMessage={errorMessage}
          />
        );
      } else if (isUnsupportedBridgeOperationError) {
        return (
          <UnsupportedBridgeOperationView
            callStack={callStack}
            componentStack={componentStack}
            errorMessage={errorMessage}
          />
        );
      } else if (isUserError) {
        return (
          <CaughtErrorView
            callStack={callStack}
            componentStack={componentStack}
            errorMessage={errorMessage || 'Error occurred in inspected element'}
            info={
              <>
                React DevTools encountered an error while trying to inspect the
                hooks. This is most likely caused by a developer error in the
                currently inspected element. Please see your console for logged
                error.
              </>
            }
          />
        );
      } else if (isUnknownHookError) {
        return (
          <CaughtErrorView
            callStack={callStack}
            componentStack={componentStack}
            errorMessage={errorMessage || 'Encountered an unknown hook'}
            info={
              <>
                React DevTools encountered an unknown hook. This is probably
                because the react-debug-tools package is out of date. To fix,
                upgrade the React DevTools to the most recent version.
              </>
            }
          />
        );
      } else {
        return (
          <ErrorView
            callStack={callStack}
            componentStack={componentStack}
            dismissError={
              canDismissProp || canDismissState ? this._dismissError : null
            }
            errorMessage={errorMessage}>
            <Suspense fallback={<SearchingGitHubIssues />}>
              <SuspendingErrorView
                callStack={callStack}
                componentStack={componentStack}
                errorMessage={errorMessage}
              />
            </Suspense>
          </ErrorView>
        );
      }
    }

    return children;
  }

  _logError: (error: any, componentStack: string | null) => void = (
    error,
    componentStack,
  ) => {
    logEvent({
      event_name: 'error',
      error_message: error.message ?? null,
      error_stack: error.stack ?? null,
      error_component_stack: componentStack ?? null,
    });
  };

  _dismissError: () => void = () => {
    const onBeforeDismissCallback = this.props.onBeforeDismissCallback;
    if (typeof onBeforeDismissCallback === 'function') {
      onBeforeDismissCallback();
    }

    this.setState(InitialState);
  };

  _onStoreError: (error: Error) => void = error => {
    if (!this.state.hasError) {
      this._logError(error, null);
      this.setState({
        ...ErrorBoundary.getDerivedStateFromError(error),
        canDismiss: true,
      });
    }
  };
}
