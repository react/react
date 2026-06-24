/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export interface Rect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

// Get the window object for the document that a node belongs to,
// or return null if it cannot be found (node not attached to DOM,
// etc).
export function getOwnerWindow(node: HTMLElement): typeof window | null {
  if (!node.ownerDocument) {
    return null;
  }
  return node.ownerDocument.defaultView;
}

// Get the iframe containing a node, or return null if it cannot
// be found (node not within iframe, etc).
export function getOwnerIframe(node: HTMLElement): HTMLElement | null {
  const nodeWindow = getOwnerWindow(node);
  if (nodeWindow) {
    return nodeWindow.frameElement;
  }
  return null;
}

// Get a bounding client rect for a node, with an
// offset added to compensate for its border.
export function getBoundingClientRectWithBorderOffset(node: HTMLElement): Rect {
  const dimensions = getElementDimensions(node);
  // $FlowFixMe[incompatible-variance]
  return mergeRectOffsets([
    node.getBoundingClientRect(),
    {
      top: dimensions.borderTop,
      left: dimensions.borderLeft,
      bottom: dimensions.borderBottom,
      right: dimensions.borderRight,
      // This width and height won't get used by mergeRectOffsets (since this
      // is not the first rect in the array), but we set them so that this
      // object type checks as a ClientRect.
      width: 0,
      height: 0,
    },
  ]);
}

// Add together the top, left, bottom, and right properties of
// each ClientRect, but keep the width and height of the first one.
export function mergeRectOffsets(rects: Array<Rect>): Rect {
  return rects.reduce((previousRect, rect) => {
    if (previousRect == null) {
      return rect;
    }

    return {
      top: previousRect.top + rect.top,
      left: previousRect.left + rect.left,
      width: previousRect.width,
      height: previousRect.height,
      bottom: previousRect.bottom + rect.bottom,
      right: previousRect.right + rect.right,
    };
  });
}

// Calculate a boundingClientRect for a node relative to boundaryWindow,
// taking into account any offsets caused by intermediate iframes.
export function getNestedBoundingClientRect(
  node: HTMLElement,
  boundaryWindow: typeof window,
): Rect {
  const ownerIframe = getOwnerIframe(node);
  if (ownerIframe && ownerIframe !== boundaryWindow) {
    const rects: Array<Rect | ClientRect> = [node.getBoundingClientRect()];
    let currentIframe: null | HTMLElement = ownerIframe;
    let onlyOneMore = false;
    while (currentIframe) {
      const rect = getBoundingClientRectWithBorderOffset(currentIframe);
      rects.push(rect);
      currentIframe = getOwnerIframe(currentIframe);

      if (onlyOneMore) {
        break;
      }
      // We don't want to calculate iframe offsets upwards beyond
      // the iframe containing the boundaryWindow, but we
      // need to calculate the offset relative to the boundaryWindow.
      if (currentIframe && getOwnerWindow(currentIframe) === boundaryWindow) {
        onlyOneMore = true;
      }
    }

    // $FlowFixMe[incompatible-variance]
    // $FlowFixMe[incompatible-type]
    return mergeRectOffsets(rects);
  } else {
    // $FlowFixMe[incompatible-variance]
    return node.getBoundingClientRect();
  }
}

export function getElementDimensions(domElement: HTMLElement): {
  borderBottom: number,
  borderLeft: number,
  borderRight: number,
  borderTop: number,
  marginBottom: number,
  marginLeft: number,
  marginRight: number,
  marginTop: number,
  paddingBottom: number,
  paddingLeft: number,
  paddingRight: number,
  paddingTop: number,
} {
  const calculatedStyle = window.getComputedStyle(domElement);
  return {
    borderLeft: parseInt(calculatedStyle.borderLeftWidth, 10),
    borderRight: parseInt(calculatedStyle.borderRightWidth, 10),
    borderTop: parseInt(calculatedStyle.borderTopWidth, 10),
    borderBottom: parseInt(calculatedStyle.borderBottomWidth, 10),
    marginLeft: parseInt(calculatedStyle.marginLeft, 10),
    marginRight: parseInt(calculatedStyle.marginRight, 10),
    marginTop: parseInt(calculatedStyle.marginTop, 10),
    marginBottom: parseInt(calculatedStyle.marginBottom, 10),
    paddingLeft: parseInt(calculatedStyle.paddingLeft, 10),
    paddingRight: parseInt(calculatedStyle.paddingRight, 10),
    paddingTop: parseInt(calculatedStyle.paddingTop, 10),
    paddingBottom: parseInt(calculatedStyle.paddingBottom, 10),
  };
}

export function extractHOCNames(displayName: string): {
  baseComponentName: string,
  hocNames: string[],
} {
  if (!displayName) return {baseComponentName: '', hocNames: []};

  const hocRegex = /([A-Z][a-zA-Z0-9]*?)\((.*)\)/g;
  const hocNames: string[] = [];
  let baseComponentName = displayName;
  let match;

  while ((match = hocRegex.exec(baseComponentName)) != null) {
    if (Array.isArray(match)) {
      const [, hocName, inner] = match;
      hocNames.push(hocName);
      baseComponentName = inner;
    }
  }

  return {
    baseComponentName,
    hocNames,
  };
}
