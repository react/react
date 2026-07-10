/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Rect} from '../../view-base';

import {rectEqualToRect} from '../../view-base';
import {COLORS, FONT_SIZE, TEXT_PADDING} from '../constants';

const cachedTextWidths = new Map<string, number>();

export function getTextWidth(
  context: CanvasRenderingContext2D,
  text: string,
): number {
  let measuredWidth = cachedTextWidths.get(text);
  if (measuredWidth == null) {
    measuredWidth = context.measureText(text).width;
    cachedTextWidths.set(text, measuredWidth);
  }

  return measuredWidth as any as number;
}

export function trimText(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
): string | null {
  const maxIndex = text.length - 1;

  let startIndex = 0;
  let stopIndex = maxIndex;

  let longestValidIndex = 0;
  let longestValidText = null;

  // Trimming long text could be really slow if we decrease only 1 character at a time.
  // Trimming with more of a binary search approach is faster in the worst cases.
  while (startIndex <= stopIndex) {
    const currentIndex = Math.floor((startIndex + stopIndex) / 2);
    const trimmedText =
      currentIndex === maxIndex ? text : text.slice(0, currentIndex) + '…';

    if (getTextWidth(context, trimmedText) <= width) {
      if (longestValidIndex < currentIndex) {
        longestValidIndex = currentIndex;
        longestValidText = trimmedText;
      }

      startIndex = currentIndex + 1;
    } else {
      stopIndex = currentIndex - 1;
    }
  }

  return longestValidText;
}

type TextConfig = {
  fillStyle?: string,
  fontSize?: number,
  textAlign?: 'left' | 'center',
};

export function drawText(
  text: string,
  context: CanvasRenderingContext2D,
  fullRect: Rect,
  drawableRect: Rect,
  config?: TextConfig,
): void {
  const {
    fillStyle = COLORS.TEXT_COLOR,
    fontSize = FONT_SIZE,
    textAlign = 'left',
  } = config || {};

  if (fullRect.size.width > TEXT_PADDING * 2) {
    context.textAlign = textAlign;
    context.textBaseline = 'middle';
    context.font = `${fontSize}px sans-serif`;

    const {x, y} = fullRect.origin;

    const trimmedName = trimText(
      context,
      text,
      fullRect.size.width - TEXT_PADDING * 2 + (x < 0 ? x : 0),
    );

    if (trimmedName !== null) {
      context.fillStyle = fillStyle;

      // Prevent text from visibly overflowing its container when clipped.
      const textOverflowsViewableArea = !rectEqualToRect(
        drawableRect,
        fullRect,
      );
      if (textOverflowsViewableArea) {
        context.save();
        context.beginPath();
        context.rect(
          drawableRect.origin.x,
          drawableRect.origin.y,
          drawableRect.size.width,
          drawableRect.size.height,
        );
        context.closePath();
        context.clip();
      }

      let textX;
      if (textAlign === 'center') {
        textX = x + fullRect.size.width / 2 + TEXT_PADDING - (x < 0 ? x : 0);
      } else {
        textX = x + TEXT_PADDING - (x < 0 ? x : 0);
      }

      const textY = y + fullRect.size.height / 2;

      context.fillText(trimmedName, textX, textY);

      if (textOverflowsViewableArea) {
        context.restore();
      }
    }
  }
}
