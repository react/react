/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {UserTimingMark} from '../types';
import type {
  Interaction,
  MouseMoveInteraction,
  Rect,
  Size,
  ViewRefs,
} from '../view-base';

import {
  positioningScaleFactor,
  timestampToPosition,
  positionToTimestamp,
  widthToDuration,
} from './utils/positioning';
import {
  View,
  Surface,
  rectContainsPoint,
  rectIntersectsRect,
  intersectionOfRects,
} from '../view-base';
import {
  COLORS,
  TOP_ROW_PADDING,
  USER_TIMING_MARK_SIZE,
  BORDER_SIZE,
} from './constants';

const ROW_HEIGHT_FIXED =
  TOP_ROW_PADDING + USER_TIMING_MARK_SIZE + TOP_ROW_PADDING;

export class UserTimingMarksView extends View {
  _marks: UserTimingMark[];
  _intrinsicSize: Size;

  _hoveredMark: UserTimingMark | null = null;
  onHover: ((mark: UserTimingMark | null) => void) | null = null;

  constructor(
    surface: Surface,
    frame: Rect,
    marks: UserTimingMark[],
    duration: number,
  ) {
    super(surface, frame);
    this._marks = marks;

    this._intrinsicSize = {
      width: duration,
      height: ROW_HEIGHT_FIXED,
    };
  }

  desiredSize(): Size {
    return this._intrinsicSize;
  }

  setHoveredMark(hoveredMark: UserTimingMark | null) {
    if (this._hoveredMark === hoveredMark) {
      return;
    }
    this._hoveredMark = hoveredMark;
    this.setNeedsDisplay();
  }

  /**
   * Draw a single `UserTimingMark` as a circle in the canvas.
   */
  _drawSingleMark(
    context: CanvasRenderingContext2D,
    rect: Rect,
    mark: UserTimingMark,
    baseY: number,
    scaleFactor: number,
    showHoverHighlight: boolean,
  ) {
    const {frame} = this;
    const {timestamp} = mark;

    const x = timestampToPosition(timestamp, scaleFactor, frame);
    const size = USER_TIMING_MARK_SIZE;
    const halfSize = size / 2;

    const markRect: Rect = {
      origin: {
        x: x - halfSize,
        y: baseY,
      },
      size: {width: size, height: size},
    };
    if (!rectIntersectsRect(markRect, rect)) {
      return; // Not in view
    }

    const fillStyle = showHoverHighlight
      ? COLORS.USER_TIMING_HOVER
      : COLORS.USER_TIMING;

    // $FlowFixMe[invalid-compare]
    if (fillStyle !== null) {
      const y = baseY + halfSize;

      context.beginPath();
      context.fillStyle = fillStyle;
      context.moveTo(x, y - halfSize);
      context.lineTo(x + halfSize, y);
      context.lineTo(x, y + halfSize);
      context.lineTo(x - halfSize, y);
      context.fill();
    }
  }

  draw(context: CanvasRenderingContext2D) {
    const {frame, _marks, _hoveredMark, visibleArea} = this;

    context.fillStyle = COLORS.BACKGROUND;
    context.fillRect(
      visibleArea.origin.x,
      visibleArea.origin.y,
      visibleArea.size.width,
      visibleArea.size.height,
    );

    // Draw marks
    const baseY = frame.origin.y + TOP_ROW_PADDING;
    const scaleFactor = positioningScaleFactor(
      this._intrinsicSize.width,
      frame,
    );

    _marks.forEach(mark => {
      if (mark === _hoveredMark) {
        return;
      }
      this._drawSingleMark(
        context,
        visibleArea,
        mark,
        baseY,
        scaleFactor,
        false,
      );
    });

    // Draw the hovered and/or selected items on top so they stand out.
    // This is helpful if there are multiple (overlapping) items close to each other.
    if (_hoveredMark !== null) {
      this._drawSingleMark(
        context,
        visibleArea,
        _hoveredMark,
        baseY,
        scaleFactor,
        true,
      );
    }

    // Render bottom border.
    // Propose border rect, check if intersects with `rect`, draw intersection.
    const borderFrame: Rect = {
      origin: {
        x: frame.origin.x,
        y: frame.origin.y + ROW_HEIGHT_FIXED - BORDER_SIZE,
      },
      size: {
        width: frame.size.width,
        height: BORDER_SIZE,
      },
    };
    if (rectIntersectsRect(borderFrame, visibleArea)) {
      const borderDrawableRect = intersectionOfRects(borderFrame, visibleArea);
      context.fillStyle = COLORS.PRIORITY_BORDER;
      context.fillRect(
        borderDrawableRect.origin.x,
        borderDrawableRect.origin.y,
        borderDrawableRect.size.width,
        borderDrawableRect.size.height,
      );
    }
  }

  /**
   * @private
   */
  _handleMouseMove(interaction: MouseMoveInteraction, viewRefs: ViewRefs) {
    const {frame, onHover, visibleArea} = this;
    if (!onHover) {
      return;
    }

    const {location} = interaction.payload;
    if (!rectContainsPoint(location, visibleArea)) {
      onHover(null);
      return;
    }

    const {_marks} = this;
    const scaleFactor = positioningScaleFactor(
      this._intrinsicSize.width,
      frame,
    );
    const hoverTimestamp = positionToTimestamp(location.x, scaleFactor, frame);
    const timestampAllowance = widthToDuration(
      USER_TIMING_MARK_SIZE / 2,
      scaleFactor,
    );

    // Because data ranges may overlap, we want to find the last intersecting item.
    // This will always be the one on "top" (the one the user is hovering over).
    for (let index = _marks.length - 1; index >= 0; index--) {
      const mark = _marks[index];
      const {timestamp} = mark;

      if (
        timestamp - timestampAllowance <= hoverTimestamp &&
        hoverTimestamp <= timestamp + timestampAllowance
      ) {
        viewRefs.hoveredView = this;
        onHover(mark);
        return;
      }
    }

    onHover(null);
  }

  handleInteraction(interaction: Interaction, viewRefs: ViewRefs) {
    switch (interaction.type) {
      case 'mousemove':
        this._handleMouseMove(interaction, viewRefs);
        break;
    }
  }
}
