/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

type RGB = [number, number, number];

const int = Math.floor;

export class Color {
  constructor(
    private r: number,
    private g: number,
    private b: number,
  ) {}

  toAlphaString(a: number) {
    return this.toCssString(a);
  }
  toString() {
    return this.toCssString(1);
  }

  /**
   * Adjust the color by a multiplier to lighten (`> 1.0`) or darken (`< 1.0`) the color. Returns a new
   * instance.
   */
  adjusted(mult: number) {
    const adjusted = Color.redistribute([
      this.r * mult,
      this.g * mult,
      this.b * mult,
    ]);
    return new Color(...adjusted);
  }

  private toCssString(a: number) {
    return `rgba(${this.r},${this.g},${this.b},${a})`;
  }
  /**
   * Redistributes rgb, maintaing hue until its clamped.
   * https://stackoverflow.com/a/141943
   */
  private static redistribute([r, g, b]: RGB): RGB {
    const threshold = 255.999;
    const max = Math.max(r, g, b);
    if (max <= threshold) {
      return [int(r), int(g), int(b)];
    }
    const total = r + g + b;
    if (total >= 3 * threshold) {
      return [int(threshold), int(threshold), int(threshold)];
    }
    const x = (3 * threshold - total) / (3 * max - total);
    const gray = threshold - x * max;
    return [int(gray + x * r), int(gray + x * g), int(gray + x * b)];
  }
}

export const BLACK = new Color(0, 0, 0);
export const WHITE = new Color(255, 255, 255);

const COLOR_POOL = [
  new Color(249, 65, 68),
  new Color(243, 114, 44),
  new Color(248, 150, 30),
  new Color(249, 132, 74),
  new Color(249, 199, 79),
  new Color(144, 190, 109),
  new Color(67, 170, 139),
  new Color(77, 144, 142),
  new Color(87, 117, 144),
  new Color(39, 125, 161),
];

export function getColorFor(index: number): Color {
  return COLOR_POOL[Math.abs(index) % COLOR_POOL.length]!;
}
