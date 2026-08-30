/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Node as ReactNode} from 'react';

export type ContextMenuItem = {
  onClick: () => mixed,
  content: ReactNode,
};

// Relative to [data-react-devtools-portal-root]
export type ContextMenuPosition = {
  x: number,
  y: number,
};

export type ContextMenuHandle = {
  isShown(): boolean,
  hide(): void,
};

export type ContextMenuComponent = component(
  // eslint-disable-next-line no-undef
  ref: React.RefSetter<ContextMenuHandle>,
);
export type ContextMenuRef = {current: ContextMenuHandle | null};
