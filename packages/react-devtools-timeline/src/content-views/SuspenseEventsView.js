/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {SuspenseEvent, TimelineData} from '../types';
import type {
  Interaction,
  IntrinsicSize,
  MouseMoveInteraction,
  Rect,
  ViewRefs,
} from '../view-base';

import {
  durationToWidth,
  positioningScaleFactor,
  positionToTimestamp,
  timestampToPosition,
  widthToDuration,
} from './utils/positioning';
import {drawText} from './utils/text';
import {formatDuration} from '../utils/formatting';
import {
  View,
  Surface,
  rectContainsPoint,
  rectIntersectsRect,
  intersectionOfRects,
} from '../view-base';
import {
  BORDER_SIZE,
  COLORS,
  PENDING_SUSPENSE_EVENT_SIZE,
  SUSPENSE_EVENT_HEIGHT,
} from './constants';

const ROW_WITH_BORDER_HEIGHT = SUSPENSE_EVENT_HEIGHT + BORDER_SIZE;
const MAX_ROWS_TO_SHOW_INITIALLY = 3;

export class SuspenseEventsView extends View {
  _depthToSuspenseEvent: Map<number, SuspenseEvent[]>;
  _hoveredEvent: SuspenseEvent | null = null;
  _intrinsicSize: IntrinsicSize;
  _maxDepth: number = 0;
  _profilerData: TimelineData;

  onHover: ((event: SuspenseEvent | null) => void) | null = null;

  constructor(surface: Surface, frame: Rect, profilerData: TimelineData) {
    super(surface, frame);

    this._profilerData = profilerData;

    this._performPreflightComputations();
  }

  _performPreflightComputations() {
    this._depthToSuspenseEvent = new Map();

    const {duration, suspenseEvents} = this._profilerData;

    suspenseEvents.forEach(event => {
      const depth = event.depth;

      this._maxDepth = Math.max(this._maxDepth, depth);

      if (!this._depthToSuspenseEvent.has(depth)) {
        this._depthToSuspenseEvent.set(depth, [event]);
      } else {
        // $FlowFixMe[incompatible-use] This is unnecessary.
        this._depthToSuspenseEvent.get(depth).push(event);
      }
    });

    this._intrinsicSize = {
      width: duration,
      height: (this._maxDepth + 1) * ROW_WITH_BORDER_HEIGHT,
      hideScrollBarIfLessThanHeight: ROW_WITH_BORDER_HEIGHT,
      maxInitialHeight: ROW_WITH_BORDER_HEIGHT * MAX_ROWS_TO_SHOW_INITIALLY,
    };
  }

  desiredSize(): IntrinsicSize {
    return this._intrinsicSize;
  }

  setHoveredEvent(hoveredEvent: SuspenseEvent | null) {
    if (this._hoveredEvent === hoveredEvent) {
      return;
    }
    this._hoveredEvent = hoveredEvent;
    this.setNeedsDisplay();
  }

  /**
   * Draw a single `SuspenseEvent` as a box/span with text inside of it.
   */
  _drawSingleSuspenseEvent(
    context: CanvasRenderingContext2D,
    rect: Rect,
    event: SuspenseEvent,
    baseY: number,
    scaleFactor: number,
    showHoverHighlight: boolean,
  ) {
    const {frame} = this;
    const {
      componentName,
      depth,
      duration,
      phase,
      promiseName,
      resolution,
      timestamp,
      warning,
    } = event;

    baseY += depth * ROW_WITH_BORDER_HEIGHT;

    let fillStyle = null as any as string;
    if (warning !== null) {
      fillStyle = showHoverHighlight
        ? COLORS.WARNING_BACKGROUND_HOVER
        : COLORS.WARNING_BACKGROUND;
    } else {
      switch (resolution) {
        case 'rejected':
          fillStyle = showHoverHighlight
            ? COLORS.REACT_SUSPENSE_REJECTED_EVENT_HOVER
            : COLORS.REACT_SUSPENSE_REJECTED_EVENT;
          break;
        case 'resolved':
          fillStyle = showHoverHighlight
            ? COLORS.REACT_SUSPENSE_RESOLVED_EVENT_HOVER
            : COLORS.REACT_SUSPENSE_RESOLVED_EVENT;
          break;
        case 'unresolved':
          fillStyle = showHoverHighlight
            ? COLORS.REACT_SUSPENSE_UNRESOLVED_EVENT_HOVER
            : COLORS.REACT_SUSPENSE_UNRESOLVED_EVENT;
          break;
      }
    }

    const xStart = timestampToPosition(timestamp, scaleFactor, frame);

    // Pending suspense events (ones that never resolved) won't have durations.
    // So instead we draw them as diamonds.
    if (duration === null) {
      const size = PENDING_SUSPENSE_EVENT_SIZE;
      const halfSize = size / 2;

      baseY += (SUSPENSE_EVENT_HEIGHT - PENDING_SUSPENSE_EVENT_SIZE) / 2;

      const y = baseY + halfSize;

      const suspenseRect: Rect = {
        origin: {
          x: xStart - halfSize,
          y: baseY,
        },
        size: {width: size, height: size},
      };
      if (!rectIntersectsRect(suspenseRect, rect)) {
        return; // Not in view
      }

      context.beginPath();
      context.fillStyle = fillStyle;
      context.moveTo(xStart, y - halfSize);
      context.lineTo(xStart + halfSize, y);
      context.lineTo(xStart, y + halfSize);
      context.lineTo(xStart - halfSize, y);
      context.fill();
    } else {
      const xStop = timestampToPosition(
        timestamp + duration,
        scaleFactor,
        frame,
      );
      const eventRect: Rect = {
        origin: {
          x: xStart,
          y: baseY,
        },
        size: {width: xStop - xStart, height: SUSPENSE_EVENT_HEIGHT},
      };
      if (!rectIntersectsRect(eventRect, rect)) {
        return; // Not in view
      }

      const width = durationToWidth(duration, scaleFactor);
      if (width < 1) {
        return; // Too small to render at this zoom level
      }

      const drawableRect = intersectionOfRects(eventRect, rect);
      context.beginPath();
      context.fillStyle = fillStyle;
      context.fillRect(
        drawableRect.origin.x,
        drawableRect.origin.y,
        drawableRect.size.width,
        drawableRect.size.height,
      );

      let label = 'suspended';
      if (promiseName != null) {
        label = promiseName;
      } else if (componentName != null) {
        label = `${componentName} ${label}`;
      }
      if (phase !== null) {
        label += ` during ${phase}`;
      }
      if (resolution !== 'unresolved') {
        label += ` - ${formatDuration(duration)}`;
      }

      drawText(label, context, eventRect, drawableRect);
    }
  }

  draw(context: CanvasRenderingContext2D) {
    const {
      frame,
      _profilerData: {suspenseEvents},
      _hoveredEvent,
      visibleArea,
    } = this;

    context.fillStyle = COLORS.PRIORITY_BACKGROUND;
    context.fillRect(
      visibleArea.origin.x,
      visibleArea.origin.y,
      visibleArea.size.width,
      visibleArea.size.height,
    );

    // Draw events
    const scaleFactor = positioningScaleFactor(
      this._intrinsicSize.width,
      frame,
    );

    suspenseEvents.forEach(event => {
      this._drawSingleSuspenseEvent(
        context,
        visibleArea,
        event,
        frame.origin.y,
        scaleFactor,
        event === _hoveredEvent,
      );
    });

    // Render bottom borders.
    for (let i = 0; i <= this._maxDepth; i++) {
      const borderFrame: Rect = {
        origin: {
          x: frame.origin.x,
          y: frame.origin.y + (i + 1) * ROW_WITH_BORDER_HEIGHT - BORDER_SIZE,
        },
        size: {
          width: frame.size.width,
          height: BORDER_SIZE,
        },
      };
      if (rectIntersectsRect(borderFrame, visibleArea)) {
        const borderDrawableRect = intersectionOfRects(
          borderFrame,
          visibleArea,
        );
        context.fillStyle = COLORS.REACT_WORK_BORDER;
        context.fillRect(
          borderDrawableRect.origin.x,
          borderDrawableRect.origin.y,
          borderDrawableRect.size.width,
          borderDrawableRect.size.height,
        );
      }
    }
  }

  /**
   * @private
   */
  _handleMouseMove(interaction: MouseMoveInteraction, viewRefs: ViewRefs) {
    const {frame, _intrinsicSize, onHover, visibleArea} = this;
    if (!onHover) {
      return;
    }

    const {location} = interaction.payload;
    if (!rectContainsPoint(location, visibleArea)) {
      onHover(null);
      return;
    }

    const scaleFactor = positioningScaleFactor(_intrinsicSize.width, frame);
    const hoverTimestamp = positionToTimestamp(location.x, scaleFactor, frame);

    const adjustedCanvasMouseY = location.y - frame.origin.y;
    const depth = Math.floor(adjustedCanvasMouseY / ROW_WITH_BORDER_HEIGHT);
    const suspenseEventsAtDepth = this._depthToSuspenseEvent.get(depth);

    if (suspenseEventsAtDepth) {
      // Find the event being hovered over.
      for (let index = suspenseEventsAtDepth.length - 1; index >= 0; index--) {
        const suspenseEvent = suspenseEventsAtDepth[index];
        const {duration, timestamp} = suspenseEvent;

        if (duration === null) {
          const timestampAllowance = widthToDuration(
            PENDING_SUSPENSE_EVENT_SIZE / 2,
            scaleFactor,
          );

          if (
            timestamp - timestampAllowance <= hoverTimestamp &&
            hoverTimestamp <= timestamp + timestampAllowance
          ) {
            this.currentCursor = 'context-menu';

            viewRefs.hoveredView = this;

            onHover(suspenseEvent);
            return;
          }
        } else if (
          hoverTimestamp >= timestamp &&
          hoverTimestamp <= timestamp + duration
        ) {
          this.currentCursor = 'context-menu';

          viewRefs.hoveredView = this;

          onHover(suspenseEvent);
          return;
        }
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
