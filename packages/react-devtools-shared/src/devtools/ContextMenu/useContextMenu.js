/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useState, useEffect, useCallback} from 'react';

import type {ContextMenuPosition} from './types';

type Payload = {
  shouldShow: boolean,
  position: ContextMenuPosition | null,
  hide: () => void,
};

export default function useContextMenu(anchorElementRef: {
  current: React.ElementRef<any> | null,
}): Payload {
  const [shouldShow, setShouldShow] = useState(false);
  const [position, setPosition] = React.useState<ContextMenuPosition | null>(
    null,
  );

  const hide = useCallback(() => {
    setShouldShow(false);
    setPosition(null);
  }, []);

  useEffect(() => {
    const anchor = anchorElementRef.current;
    if (anchor == null) return;

    function handleAnchorContextMenu(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();

      const {pageX, pageY} = e;

      const ownerDocument = anchor?.ownerDocument;
      const portalContainer = ownerDocument?.querySelector(
        '[data-react-devtools-portal-root]',
      );

      if (portalContainer == null) {
        throw new Error(
          "DevTools tooltip root node not found: can't display the context menu",
        );
      }

      // `x` and `y` should be relative to the container, to which these context menus will be portaled
      // we can't use just `pageX` or `pageY` for Fusebox integration, because RDT frontend is inlined with the whole document
      // meaning that `pageY` will have an offset of 27, which is the tab bar height
      // for the browser extension, these will equal to 0
      const {top: containerTop, left: containerLeft} =
        portalContainer.getBoundingClientRect();

      setShouldShow(true);
      setPosition({x: pageX - containerLeft, y: pageY - containerTop});
    }

    anchor.addEventListener('contextmenu', handleAnchorContextMenu);
    return () => {
      anchor.removeEventListener('contextmenu', handleAnchorContextMenu);
    };
  }, [anchorElementRef]);

  return {shouldShow, position, hide};
}
