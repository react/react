/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';

import {createContext} from 'react';

import type {
  CanViewElementSource,
  ViewElementSource,
} from 'react-devtools-shared/src/devtools/views/DevTools';

export type Context = {
  canViewElementSourceFunction: CanViewElementSource | null,
  viewElementSourceFunction: ViewElementSource | null,
};

const ViewElementSourceContext: ReactContext<Context> = createContext<Context>(
  null as any as Context,
);
ViewElementSourceContext.displayName = 'ViewElementSourceContext';

export default ViewElementSourceContext;
