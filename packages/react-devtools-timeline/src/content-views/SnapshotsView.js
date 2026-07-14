/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Snapshot, TimelineData} from '../types';
import type {
  Interaction,
  Point,
  Rect,
  Size,
  Surface,
  ViewRefs,
} from '../view-base';

import {positioningScaleFactor, timestampToPosition} from './utils/positioning';
import {
  intersectionOfRects,
  rectContainsPoint,
  rectEqualToRect,
  View,
} from '../view-base';
import {BORDER_SIZE, COLORS, SNAPSHOT_SCRUBBER_SIZE} from './constants';

type OnHover = (node: Snapshot | null) => void;

export class SnapshotsView extends View {
  _hoverLocation: Point | null = null;
  _intrinsicSize: Size;
  _profilerData: TimelineData;

  onHover: OnHover | null = null;

  constructor(surface: Surface, frame: Rect, profilerData: TimelineData) {
    super(surface, frame);

    this._intrinsicSize = {
      width: profilerData.duration,
      height: profilerData.snapshotHeight,
    };
    this._profilerData = profilerData;
  }

  desiredSize(): Size {
    return this._intrinsicSize;
  }

  draw(context: CanvasRenderingContext2D) {
    const snapshotHeight = this._profilerData.snapshotHeight;
    const {visibleArea} = this;

    context.fillStyle = COLORS.BACKGROUND;
    context.fillRect(
      visibleArea.origin.x,
      visibleArea.origin.y,
      visibleArea.size.width,
      visibleArea.size.height,
    );

    const y = visibleArea.origin.y;

    let x = visibleArea.origin.x;

    // Rather than drawing each snapshot where it occurred,
    // draw them at fixed intervals and just show the nearest one.
    while (x < visibleArea.origin.x + visibleArea.size.width) {
      const snapshot = this._findClosestSnapshot(x);
      if (snapshot === null) {
        // This shold never happen.
        break;
      }

      const scaledHeight = snapshotHeight;
      const scaledWidth = (snapshot.width * snapshotHeight) / snapshot.height;

      const imageRect: Rect = {
        origin: {
          x,
          y,
        },
        size: {width: scaledWidth, height: scaledHeight},
      };

      // Lazily create and cache Image objects as we render a snapsho for the first time.
      if (snapshot.image === null) {
        const img = (snapshot.image = new Image());
        img.onload = () => {
          this._drawSnapshotImage(context, snapshot, imageRect);
        };
        img.src = snapshot.imageSource;
      } else {
        this._drawSnapshotImage(context, snapshot, imageRect);
      }

      x += scaledWidth + BORDER_SIZE;
    }

    const hoverLocation = this._hoverLocation;
    if (hoverLocation !== null) {
      const scrubberWidth = SNAPSHOT_SCRUBBER_SIZE + BORDER_SIZE * 2;
      const scrubberOffset = scrubberWidth / 2;

      context.fillStyle = COLORS.SCRUBBER_BORDER;
      context.fillRect(
        hoverLocation.x - scrubberOffset,
        visibleArea.origin.y,
        scrubberWidth,
        visibleArea.size.height,
      );

      context.fillStyle = COLORS.SCRUBBER_BACKGROUND;
      context.fillRect(
        hoverLocation.x - scrubberOffset + BORDER_SIZE,
        visibleArea.origin.y,
        SNAPSHOT_SCRUBBER_SIZE,
        visibleArea.size.height,
      );
    }
  }

  handleInteraction(interaction: Interaction, viewRefs: ViewRefs) {
    switch (interaction.type) {
      case 'mousemove':
      case 'wheel-control':
      case 'wheel-meta':
      case 'wheel-plain':
      case 'wheel-shift':
        this._updateHover(interaction.payload.location, viewRefs);
        break;
    }
  }

  _drawSnapshotImage(
    context: CanvasRenderingContext2D,
    snapshot: Snapshot,
    imageRect: Rect,
  ) {
    const visibleArea = this.visibleArea;

    // Prevent snapshot from visibly overflowing its container when clipped.
    // View clips by default, but since this view may draw async (on Image load) we re-clip.
    const shouldClip = !rectEqualToRect(imageRect, visibleArea);
    if (shouldClip) {
      const clippedRect = intersectionOfRects(imageRect, visibleArea);
      context.save();
      context.beginPath();
      context.rect(
        clippedRect.origin.x,
        clippedRect.origin.y,
        clippedRect.size.width,
        clippedRect.size.height,
      );
      context.closePath();
      context.clip();
    }

    context.fillStyle = COLORS.REACT_RESIZE_BAR_BORDER;
    context.fillRect(
      imageRect.origin.x,
      imageRect.origin.y,
      imageRect.size.width,
      imageRect.size.height,
    );

    // $FlowFixMe[incompatible-type] Flow doesn't know about the 9 argument variant of drawImage()
    context.drawImage(
      snapshot.image,

      // Image coordinates
      0,
      0,

      // Native image size
      snapshot.width,
      snapshot.height,

      // Canvas coordinates
      imageRect.origin.x + BORDER_SIZE,
      imageRect.origin.y + BORDER_SIZE,

      // Scaled image size
      imageRect.size.width - BORDER_SIZE * 2,
      imageRect.size.height - BORDER_SIZE * 2,
    );

    if (shouldClip) {
      context.restore();
    }
  }

  _findClosestSnapshot(x: number): Snapshot | null {
    const frame = this.frame;
    const scaleFactor = positioningScaleFactor(
      this._intrinsicSize.width,
      frame,
    );

    const snapshots = this._profilerData.snapshots;

    let startIndex = 0;
    let stopIndex = snapshots.length - 1;
    while (startIndex <= stopIndex) {
      const currentIndex = Math.floor((startIndex + stopIndex) / 2);
      const snapshot = snapshots[currentIndex];
      const {timestamp} = snapshot;

      const snapshotX = Math.floor(
        timestampToPosition(timestamp, scaleFactor, frame),
      );

      if (x < snapshotX) {
        stopIndex = currentIndex - 1;
      } else {
        startIndex = currentIndex + 1;
      }
    }

    return snapshots[stopIndex] || null;
  }

  /**
   * @private
   */
  _updateHover(location: Point, viewRefs: ViewRefs) {
    const {onHover, visibleArea} = this;
    if (!onHover) {
      return;
    }

    if (!rectContainsPoint(location, visibleArea)) {
      if (this._hoverLocation !== null) {
        this._hoverLocation = null;

        this.setNeedsDisplay();
      }

      onHover(null);
      return;
    }

    const snapshot = this._findClosestSnapshot(location.x);
    if (snapshot !== null) {
      this._hoverLocation = location;

      onHover(snapshot);
    } else {
      this._hoverLocation = null;

      onHover(null);
    }

    // Any time the mouse moves within the boundaries of this view, we need to re-render.
    // This is because we draw a scrubbing bar that shows the location corresponding to the current tooltip.
    this.setNeedsDisplay();
  }
}
