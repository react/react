/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const intersectionObserverMock = {callback: null, observedTargets: []};

/**
 * This is a broken polyfill.
 * It is only intended to provide bare minimum test coverage.
 * More meaningful tests will require the use of fixtures.
 */
export function mockIntersectionObserver() {
  intersectionObserverMock.callback = null;
  intersectionObserverMock.observedTargets = [];

  class IntersectionObserver {
    constructor() {
      intersectionObserverMock.callback = arguments[0];
    }

    disconnect() {
      intersectionObserverMock.callback = null;
      intersectionObserverMock.observedTargets.splice(0);
    }

    observe(target) {
      intersectionObserverMock.observedTargets.push(target);
    }

    unobserve(target) {
      const index = intersectionObserverMock.observedTargets.indexOf(target);
      if (index >= 0) {
        intersectionObserverMock.observedTargets.splice(index, 1);
      }
    }
  }

  window.IntersectionObserver = IntersectionObserver;

  return intersectionObserverMock;
}

export function simulateIntersection(...entries) {
  intersectionObserverMock.callback(
    entries.map(([target, rect, ratio]) => ({
      boundingClientRect: {
        top: rect.y,
        left: rect.x,
        width: rect.width,
        height: rect.height,
      },
      intersectionRatio: ratio,
      target,
    })),
  );
}

/**
 * Stub out getBoundingClientRect for the specified target.
 * This API is required by the test selectors but it isn't implemented by jsdom.
 */
export function setBoundingClientRect(target, {x, y, width, height}) {
  target.getBoundingClientRect = function () {
    return {
      width,
      height,
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
    };
  };
}

/**
 * Stub out getClientRects for the specified target.
 */
export function setClientRects(target, rects) {
  target.getClientRects = function () {
    return rects.map(({x, y, width, height}) => ({
      width,
      height,
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
      x,
      y,
    }));
  };
}

/**
 * Mock Range.prototype.getClientRects and getBoundingClientRect since jsdom doesn't implement them.
 * Call this in beforeEach to set up the mock.
 */
export function mockRangeClientRects(
  rects = [{x: 0, y: 0, width: 100, height: 20}],
) {
  const originalCreateRange = document.createRange;
  document.createRange = function () {
    const range = originalCreateRange.call(document);
    range.getClientRects = function () {
      return rects.map(({x, y, width, height}) => ({
        width,
        height,
        left: x,
        right: x + width,
        top: y,
        bottom: y + height,
        x,
        y,
      }));
    };
    range.getBoundingClientRect = function () {
      // Return the bounding rect that encompasses all rects
      if (rects.length === 0) {
        return {
          width: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          x: 0,
          y: 0,
        };
      }
      const first = rects[0];
      return {
        width: first.width,
        height: first.height,
        left: first.x,
        right: first.x + first.width,
        top: first.y,
        bottom: first.y + first.height,
        x: first.x,
        y: first.y,
      };
    };
    return range;
  };
  return function restore() {
    document.createRange = originalCreateRange;
  };
}
