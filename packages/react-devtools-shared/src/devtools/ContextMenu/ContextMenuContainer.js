/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useImperativeHandle} from 'react';

import ContextMenu from './ContextMenu';
import useContextMenu from './useContextMenu';

import type {ContextMenuItem, ContextMenuRef} from './types';

type Props = {
  anchorElementRef: {
    current: React.ElementRef<any> | null,
  },
  items: ContextMenuItem[],
  closedMenuStub?: React.Node | null,
  ref?: ContextMenuRef,
};

export default function ContextMenuContainer({
  anchorElementRef,
  items,
  closedMenuStub = null,
  ref,
}: Props): React.Node {
  const {shouldShow, position, hide} = useContextMenu(anchorElementRef);

  useImperativeHandle(
    ref,
    () => ({
      isShown() {
        return shouldShow;
      },
      hide,
    }),
    [shouldShow, hide],
  );

  if (!shouldShow) {
    return closedMenuStub;
  }

  return (
    <ContextMenu
      anchorElementRef={anchorElementRef}
      position={position}
      hide={hide}
      items={items}
    />
  );
}
