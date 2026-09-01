/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext} from 'react';
import {createPortal} from 'react-dom';
import ErrorBoundary from './ErrorBoundary';
import {StoreContext} from './context';
import ThemeProvider from './ThemeProvider';

export type Props = {portalContainer?: Element, ...};

export default function portaledContent(
  Component: component(...props: any),
): component(...props: any) {
  return function PortaledContent({portalContainer, ...rest}: Props) {
    const store = useContext(StoreContext);

    let children = (
      <ErrorBoundary store={store}>
        <Component {...rest} />
      </ErrorBoundary>
    );

    if (portalContainer != null) {
      // The ThemeProvider works by writing DOM style variables to an HTMLDivElement.
      // Because Portals render in a different DOM subtree, these variables don't propagate.
      // So in this case, we need to re-wrap portaled content in a second ThemeProvider.
      children = (
        <ThemeProvider>
          <div
            data-react-devtools-portal-root={true}
            style={{
              width: '100vw',
              height: '100vh',
              containerName: 'devtools',
              containerType: 'inline-size',
            }}>
            {children}
          </div>
        </ThemeProvider>
      );
    }

    return portalContainer != null
      ? createPortal(children, portalContainer)
      : children;
  };
}
