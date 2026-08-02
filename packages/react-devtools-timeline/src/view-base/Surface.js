/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Interaction} from './useCanvasInteraction';
import type {Size} from './geometry';

import memoize from 'memoize-one';

import {View} from './View';
import {zeroPoint} from './geometry';
import {DPR} from '../content-views/constants';

export type ViewRefs = {
  activeView: View | null,
  hoveredView: View | null,
};

// hidpi canvas: https://web.dev/articles/canvas-hidipi
function configureRetinaCanvas(
  canvas: HTMLCanvasElement,
  height: number,
  width: number,
) {
  canvas.width = width * DPR;
  canvas.height = height * DPR;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

const getCanvasContext = memoize(
  (
    canvas: HTMLCanvasElement,
    height: number,
    width: number,
    scaleCanvas: boolean = true,
  ): CanvasRenderingContext2D => {
    const context = canvas.getContext('2d', {alpha: false});
    if (scaleCanvas) {
      configureRetinaCanvas(canvas, height, width);

      // Scale all drawing operations by the dpr, so you don't have to worry about the difference.
      context.scale(DPR, DPR);
    }
    return context;
  },
);

type ResetHoveredEventFn = () => void;

/**
 * Represents the canvas surface and a view hierarchy. A surface is also the
 * place where all interactions enter the view hierarchy.
 */
export class Surface {
  rootView: ?View;

  _context: ?CanvasRenderingContext2D;
  _canvasSize: ?Size;

  _resetHoveredEvent: ResetHoveredEventFn;

  _viewRefs: ViewRefs = {
    activeView: null,
    hoveredView: null,
  };

  constructor(resetHoveredEvent: ResetHoveredEventFn) {
    this._resetHoveredEvent = resetHoveredEvent;
  }

  hasActiveView(): boolean {
    return this._viewRefs.activeView !== null;
  }

  setCanvas(canvas: HTMLCanvasElement, canvasSize: Size) {
    this._context = getCanvasContext(
      canvas,
      canvasSize.height,
      canvasSize.width,
    );
    this._canvasSize = canvasSize;

    if (this.rootView) {
      this.rootView.setNeedsDisplay();
    }
  }

  displayIfNeeded() {
    const {rootView, _canvasSize, _context} = this;
    if (!rootView || !_context || !_canvasSize) {
      return;
    }
    rootView.setFrame({
      origin: zeroPoint,
      size: _canvasSize,
    });
    rootView.setVisibleArea({
      origin: zeroPoint,
      size: _canvasSize,
    });
    rootView.displayIfNeeded(_context, this._viewRefs);
  }

  getCurrentCursor(): string | null {
    const {activeView, hoveredView} = this._viewRefs;
    if (activeView !== null) {
      return activeView.currentCursor;
    } else if (hoveredView !== null) {
      return hoveredView.currentCursor;
    } else {
      return null;
    }
  }

  handleInteraction(interaction: Interaction) {
    const rootView = this.rootView;
    if (rootView != null) {
      const viewRefs = this._viewRefs;
      switch (interaction.type) {
        case 'mousemove':
        case 'wheel-control':
        case 'wheel-meta':
        case 'wheel-plain':
        case 'wheel-shift':
          // Clean out the hovered view before processing this type of interaction.
          const hoveredView = viewRefs.hoveredView;
          viewRefs.hoveredView = null;

          rootView.handleInteractionAndPropagateToSubviews(
            interaction,
            viewRefs,
          );

          // If a previously hovered view is no longer hovered, update the outer state.
          if (hoveredView !== null && viewRefs.hoveredView === null) {
            this._resetHoveredEvent();
          }
          break;
        default:
          rootView.handleInteractionAndPropagateToSubviews(
            interaction,
            viewRefs,
          );
          break;
      }
    }
  }
}
