/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from './ReactTypes';

import {createElement} from 'react';
import {REACT_SUSPENSE_TYPE} from './ReactSymbols';
import {enableServerErrorBoundary} from './ReactFeatureFlags';

type Props = {
  children?: ReactNodeList,
  fallback?: ReactNodeList,
};

type State = {didError: boolean};

type Instance = {
  props: Props,
  state: State,
};

// Both renderers use the same component tree so that the internal Suspense
// boundary can hydrate the boundary markers emitted by Fizz.
const ServerErrorBoundary: any = function ServerErrorBoundary(
  this: Instance,
  props: Props,
) {
  this.props = props;
  this.state = {didError: false};
};

if (enableServerErrorBoundary) {
  // This component never schedules its own updates. The renderer supplies the
  // class instance fields, including its updater, without importing Component
  // from React (which is unavailable in the react-server condition).
  ServerErrorBoundary.prototype.isReactComponent = {};

  ServerErrorBoundary.getDerivedStateFromError = function (): State {
    return {didError: true};
  };

  ServerErrorBoundary.prototype.render = function (
    this: Instance,
  ): ReactNodeList {
    if (this.state.didError) {
      return this.props.fallback;
    }
    return createElement(
      REACT_SUSPENSE_TYPE,
      {
        fallback: this.props.fallback,
        unstable_errorBoundary: true,
      },
      this.props.children,
    );
  };
}

export default ServerErrorBoundary;
