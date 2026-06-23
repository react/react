/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getElementDimensions, getNestedBoundingClientRect} from '../utils';

import type {Rect} from '../utils';
import type Agent from 'react-devtools-shared/src/backend/agent';

type Box = {top: number, left: number, width: number, height: number};

const assign = Object.assign;

// Note that the Overlay components are not affected by the active Theme,
// because they highlight elements in the main Chrome window (outside of devtools).
// The colors below were chosen to roughly match those used by Chrome devtools.

class OverlayRect {
  node: HTMLElement;
  border: HTMLElement;
  padding: HTMLElement;
  content: HTMLElement;

  constructor(doc: Document, container: HTMLElement) {
    this.node = doc.createElement('div');
    this.border = doc.createElement('div');
    this.padding = doc.createElement('div');
    this.content = doc.createElement('div');

    this.border.style.borderColor = overlayStyles.border;
    this.padding.style.borderColor = overlayStyles.padding;
    this.content.style.backgroundColor = overlayStyles.background;

    assign(this.node.style, {
      borderColor: overlayStyles.margin,
      pointerEvents: 'none',
      position: 'fixed',
    });

    this.node.style.zIndex = '10000000';

    this.node.appendChild(this.border);
    this.border.appendChild(this.padding);
    this.padding.appendChild(this.content);
    container.appendChild(this.node);
  }

  remove() {
    if (this.node.parentNode) {
      this.node.parentNode.removeChild(this.node);
    }
  }

  update(box: Rect, dims: any) {
    boxWrap(dims, 'margin', this.node);
    boxWrap(dims, 'border', this.border);
    boxWrap(dims, 'padding', this.padding);

    assign(this.content.style, {
      height:
        box.height -
        dims.borderTop -
        dims.borderBottom -
        dims.paddingTop -
        dims.paddingBottom +
        'px',
      width:
        box.width -
        dims.borderLeft -
        dims.borderRight -
        dims.paddingLeft -
        dims.paddingRight +
        'px',
    });

    assign(this.node.style, {
      top: box.top - dims.marginTop + 'px',
      left: box.left - dims.marginLeft + 'px',
    });
  }
}

class OverlayTip {
  tip: HTMLElement;
  nameSpan: HTMLElement;
  dimSpan: HTMLElement;

  constructor(doc: Document, container: HTMLElement) {
    this.tip = doc.createElement('div');
    assign(this.tip.style, {
      display: 'flex',
      flexFlow: 'row nowrap',
      backgroundColor: '#333740',
      borderRadius: '2px',
      fontFamily:
        '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
      fontWeight: 'bold',
      padding: '3px 5px',
      pointerEvents: 'none',
      position: 'fixed',
      fontSize: '12px',
      whiteSpace: 'nowrap',
    });

    this.nameSpan = doc.createElement('span');
    this.tip.appendChild(this.nameSpan);
    assign(this.nameSpan.style, {
      color: '#ee78e6',
      borderRight: '1px solid #aaaaaa',
      paddingRight: '0.5rem',
      marginRight: '0.5rem',
    });
    this.dimSpan = doc.createElement('span');
    this.tip.appendChild(this.dimSpan);
    assign(this.dimSpan.style, {
      color: '#d7d7d7',
    });

    this.tip.style.zIndex = '10000000';
    container.appendChild(this.tip);
  }

  remove() {
    if (this.tip.parentNode) {
      this.tip.parentNode.removeChild(this.tip);
    }
  }

  updateText(name: string, width: number, height: number) {
    this.nameSpan.textContent = name;
    this.dimSpan.textContent =
      Math.round(width) + 'px × ' + Math.round(height) + 'px';
  }

  updatePosition(dims: Box, bounds: Box) {
    const tipRect = this.tip.getBoundingClientRect();
    const tipPos = findTipPos(dims, bounds, {
      width: tipRect.width,
      height: tipRect.height,
    });
    assign(this.tip.style, tipPos.style);
  }
}

export default class Overlay {
  window: any;
  tipBoundsWindow: any;
  container: HTMLElement;
  tip: OverlayTip;
  rects: Array<OverlayRect>;
  agent: Agent;

  constructor(agent: Agent) {
    // Find the root window, because overlays are positioned relative to it.
    const currentWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
    this.window = currentWindow;

    // When opened in shells/dev, the tooltip should be bound by the app iframe, not by the topmost window.
    const tipBoundsWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
    this.tipBoundsWindow = tipBoundsWindow;

    const doc = currentWindow.document;
    this.container = doc.createElement('div');
    this.container.style.zIndex = '10000000';

    this.tip = new OverlayTip(doc, this.container);
    this.rects = [];

    this.agent = agent;

    doc.body.appendChild(this.container);
  }

  remove() {
    this.tip.remove();
    this.rects.forEach(rect => {
      rect.remove();
    });
    this.rects.length = 0;
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  inspect(nodes: $ReadOnlyArray<HTMLElement | Text>, name?: ?string) {
    // We can't get the size of text nodes or comment nodes. React as of v15
    // heavily uses comment nodes to delimit text.
    // TODO: We actually can measure text nodes. We should.
    const elements: $ReadOnlyArray<HTMLElement> = nodes.filter(
      node => node.nodeType === Node.ELEMENT_NODE,
    ) as any;

    while (this.rects.length > elements.length) {
      const rect = this.rects.pop();
      // $FlowFixMe[incompatible-use]
      rect.remove();
    }
    if (elements.length === 0) {
      return;
    }

    while (this.rects.length < elements.length) {
      this.rects.push(new OverlayRect(this.window.document, this.container));
    }

    const outerBox = {
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
      left: Number.POSITIVE_INFINITY,
    };
    elements.forEach((element, index) => {
      const box = getNestedBoundingClientRect(element, this.window);
      const dims = getElementDimensions(element);

      outerBox.top = Math.min(outerBox.top, box.top - dims.marginTop);
      outerBox.right = Math.max(
        outerBox.right,
        box.left + box.width + dims.marginRight,
      );
      outerBox.bottom = Math.max(
        outerBox.bottom,
        box.top + box.height + dims.marginBottom,
      );
      outerBox.left = Math.min(outerBox.left, box.left - dims.marginLeft);

      const rect = this.rects[index];
      rect.update(box, dims);
    });

    if (!name) {
      name = elements[0].nodeName.toLowerCase();

      const node = elements[0];
      const ownerName = this.agent.getComponentNameForHostInstance(node);
      if (ownerName) {
        name += ' (in ' + ownerName + ')';
      }
    }

    this.tip.updateText(
      name,
      outerBox.right - outerBox.left,
      outerBox.bottom - outerBox.top,
    );
    const tipBounds = getNestedBoundingClientRect(
      this.tipBoundsWindow.document.documentElement,
      this.window,
    );

    this.tip.updatePosition(
      {
        top: outerBox.top,
        left: outerBox.left,
        height: outerBox.bottom - outerBox.top,
        width: outerBox.right - outerBox.left,
      },
      {
        top: tipBounds.top + this.tipBoundsWindow.scrollY,
        left: tipBounds.left + this.tipBoundsWindow.scrollX,
        height: this.tipBoundsWindow.innerHeight,
        width: this.tipBoundsWindow.innerWidth,
      },
    );
  }
}

function findTipPos(
  dims: Box,
  bounds: Box,
  tipSize: {height: number, width: number},
) {
  const tipHeight = Math.max(tipSize.height, 20);
  const tipWidth = Math.max(tipSize.width, 60);
  const margin = 5;

  let top: number | string;
  if (dims.top + dims.height + tipHeight <= bounds.top + bounds.height) {
    if (dims.top + dims.height < bounds.top + 0) {
      top = bounds.top + margin;
    } else {
      top = dims.top + dims.height + margin;
    }
  } else if (dims.top - tipHeight <= bounds.top + bounds.height) {
    if (dims.top - tipHeight - margin < bounds.top + margin) {
      top = bounds.top + margin;
    } else {
      top = dims.top - tipHeight - margin;
    }
  } else {
    top = bounds.top + bounds.height - tipHeight - margin;
  }

  let left: number | string = dims.left + margin;
  if (dims.left < bounds.left) {
    left = bounds.left + margin;
  }
  if (dims.left + tipWidth > bounds.left + bounds.width) {
    left = bounds.left + bounds.width - tipWidth - margin;
  }

  top += 'px';
  left += 'px';
  return {
    style: {top, left},
  };
}

function boxWrap(dims: any, what: string, node: HTMLElement) {
  assign(node.style, {
    borderTopWidth: dims[what + 'Top'] + 'px',
    borderLeftWidth: dims[what + 'Left'] + 'px',
    borderRightWidth: dims[what + 'Right'] + 'px',
    borderBottomWidth: dims[what + 'Bottom'] + 'px',
    borderStyle: 'solid',
  });
}

const overlayStyles = {
  background: 'rgba(120, 170, 210, 0.7)',
  padding: 'rgba(77, 200, 0, 0.3)',
  margin: 'rgba(255, 155, 0, 0.3)',
  border: 'rgba(255, 200, 50, 0.3)',
};
