/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import type {
  RootType,
  CreateRootOptions,
  HydrateRootOptions,
} from './ReactDOMRoot';

import type {
  Container,
  PublicInstance,
} from 'react-dom-bindings/src/client/ReactFiberConfigDOM';

import {
  createRoot as createRootImpl,
  hydrateRoot as hydrateRootImpl,
} from './ReactDOMRoot';

import {ELEMENT_NODE} from 'react-dom-bindings/src/client/HTMLNodeType';

import {
  batchedUpdates,
  findHostInstance,
  findHostInstanceWithWarning,
  defaultOnUncaughtError,
  defaultOnCaughtError,
} from 'react-reconciler/src/ReactFiberReconciler';
import getComponentNameFromType from 'shared/getComponentNameFromType';

import {
  current as currentOwner,
  isRendering,
} from 'react-reconciler/src/ReactCurrentFiber';

import assign from 'shared/assign';

import noop from 'shared/noop';

// Provided by www
const ReactFiberErrorDialogWWW = require('ReactFiberErrorDialog');

if (typeof ReactFiberErrorDialogWWW.showErrorDialog !== 'function') {
  throw new Error(
    'Expected ReactFiberErrorDialog.showErrorDialog to be a function.',
  );
}

function wwwOnUncaughtError(
  error: mixed,
  errorInfo: {+componentStack?: ?string},
): void {
  const componentStack =
    errorInfo.componentStack != null ? errorInfo.componentStack : '';
  const logError = ReactFiberErrorDialogWWW.showErrorDialog({
    errorBoundary: null,
    error,
    componentStack,
  });

  // Allow injected showErrorDialog() to prevent default console.error logging.
  // This enables renderers like ReactNative to better manage redbox behavior.
  if (logError === false) {
    return;
  }

  defaultOnUncaughtError(error, errorInfo);
}

function wwwOnCaughtError(
  error: mixed,
  errorInfo: {
    +componentStack?: ?string,
    +errorBoundary?: ?component(),
  },
): void {
  const errorBoundary = errorInfo.errorBoundary;
  const componentStack =
    errorInfo.componentStack != null ? errorInfo.componentStack : '';
  const logError = ReactFiberErrorDialogWWW.showErrorDialog({
    errorBoundary,
    error,
    componentStack,
  });

  // Allow injected showErrorDialog() to prevent default console.error logging.
  // This enables renderers like ReactNative to better manage redbox behavior.
  if (logError === false) {
    return;
  }

  defaultOnCaughtError(error, errorInfo);
}
const noopOnDefaultTransitionIndicator = noop;

export function createRoot(
  container: Element | Document | DocumentFragment,
  options?: CreateRootOptions,
): RootType {
  return createRootImpl(
    container,
    assign(
      {
        onUncaughtError: wwwOnUncaughtError,
        onCaughtError: wwwOnCaughtError,
        onDefaultTransitionIndicator: noopOnDefaultTransitionIndicator,
      } as any,
      options,
    ),
  );
}

export function hydrateRoot(
  container: Document | Element,
  initialChildren: ReactNodeList,
  options?: HydrateRootOptions,
): RootType {
  return hydrateRootImpl(
    container,
    initialChildren,
    assign(
      {
        onUncaughtError: wwwOnUncaughtError,
        onCaughtError: wwwOnCaughtError,
        onDefaultTransitionIndicator: noopOnDefaultTransitionIndicator,
      } as any,
      options,
    ),
  );
}

export function findDOMNode(
  componentOrElement: Element | ?component(...props: any),
): null | Element | Text {
  if (__DEV__) {
    const owner = currentOwner;
    if (owner !== null && isRendering && owner.stateNode !== null) {
      const warnedAboutRefsInRender = owner.stateNode._warnedAboutRefsInRender;
      if (!warnedAboutRefsInRender) {
        console.error(
          '%s is accessing findDOMNode inside its render(). ' +
            'render() should be a pure function of props and state. It should ' +
            'never access something that requires stale data from the previous ' +
            'render, such as refs. Move this logic to componentDidMount and ' +
            'componentDidUpdate instead.',
          getComponentNameFromType(owner.type) || 'A component',
        );
      }
      owner.stateNode._warnedAboutRefsInRender = true;
    }
  }
  if (componentOrElement == null) {
    return null;
  }
  if ((componentOrElement as any).nodeType === ELEMENT_NODE) {
    return componentOrElement as any;
  }
  if (__DEV__) {
    return findHostInstanceWithWarning(componentOrElement, 'findDOMNode');
  }
  return findHostInstance(componentOrElement);
}

export function render(
  element: React$Element<any>,
  container: Container,
  callback: ?Function,
): component(...props: any) | PublicInstance | null {
  if (__DEV__) {
    console.error(
      'ReactDOM.render was removed in React 19. Use createRoot instead.',
    );
  }
  throw new Error('ReactDOM: Unsupported Legacy Mode API.');
}

export function unmountComponentAtNode(container: Container): boolean {
  if (__DEV__) {
    console.error(
      'unmountComponentAtNode was removed in React 19. Use root.unmount() instead.',
    );
  }
  throw new Error('ReactDOM: Unsupported Legacy Mode API.');
}

export {batchedUpdates as unstable_batchedUpdates};
