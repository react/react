/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type Store from 'react-devtools-shared/src/devtools/store';

import {getVersionedRenderImplementation} from './utils';

describe('Store forcing errors', () => {
  let React;
  let agent;
  let store: Store;
  let utils;
  let actAsync;

  beforeEach(() => {
    agent = global.agent;
    store = global.store;
    store.collapseNodesByDefault = false;
    store.componentFilters = [];
    store.recordChangeDescriptions = true;

    React = require('react');
    utils = require('./utils');

    actAsync = utils.actAsync;
  });

  const {render} = getVersionedRenderImplementation();

  // @reactVersion >= 18.0
  it('resets forced error and fallback states when filters are changed', async () => {
    class AnyClassComponent extends React.Component {
      render() {
        return this.props.children;
      }
    }

    class ErrorBoundary extends React.Component {
      state = {hasError: false};

      static getDerivedStateFromError() {
        return {hasError: true};
      }

      render() {
        if (this.state.hasError) {
          return (
            <AnyClassComponent key="fallback">
              <div key="did-error" />
            </AnyClassComponent>
          );
        }
        return this.props.children;
      }
    }

    function App() {
      return (
        <ErrorBoundary key="content">
          <div key="error-content" />
        </ErrorBoundary>
      );
    }

    await actAsync(async () => {
      render(<App />);
    });
    const rendererID = utils.getRendererID();
    await actAsync(() => {
      agent.overrideError({
        id: store.getElementIDAtIndex(2),
        rendererID,
        forceError: true,
      });
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ErrorBoundary key="content">
            ▾ <AnyClassComponent key="fallback">
                <div key="did-error">
    `);

    await actAsync(() => {
      agent.overrideError({
        id: store.getElementIDAtIndex(2),
        rendererID,
        forceError: false,
      });
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ErrorBoundary key="content">
              <div key="error-content">
    `);
  });
});
