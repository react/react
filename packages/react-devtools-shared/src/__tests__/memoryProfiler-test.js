/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

describe('MemoryProfiler', () => {
  let memoryProfiler;
  let mockPerformance;

  beforeEach(() => {
    // Mock performance.memory API
    mockPerformance = {
      memory: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 2000000000,
      },
      now: jest.fn(() => Date.now()),
    };

    // Mock global performance object
    global.performance = mockPerformance;

    // Mock EventTarget for event listener tracking
    global.EventTarget = class MockEventTarget {
      addEventListener() {}
      removeEventListener() {}
    };

    // Reset module
    jest.resetModules();
    memoryProfiler = require('../backend/memoryProfiler');
  });

  afterEach(() => {
    memoryProfiler.cleanup();
    jest.clearAllTimers();
  });

  describe('initMemoryProfiler', () => {
    it('should initialize with default config', () => {
      memoryProfiler.initMemoryProfiler();
      const status = memoryProfiler.getMonitoringStatus();
      expect(status.config.snapshotInterval).toBe(1000);
      expect(status.config.maxSnapshots).toBe(300);
    });

    it('should initialize with custom config', () => {
      memoryProfiler.initMemoryProfiler({
        snapshotInterval: 500,
        maxSnapshots: 100,
      });
      const status = memoryProfiler.getMonitoringStatus();
      expect(status.config.snapshotInterval).toBe(500);
      expect(status.config.maxSnapshots).toBe(100);
    });
  });

  describe('captureMemorySnapshot', () => {
    it('should capture a memory snapshot', () => {
      memoryProfiler.initMemoryProfiler();
      const snapshot = memoryProfiler.captureMemorySnapshot();

      expect(snapshot).not.toBeNull();
      expect(snapshot).toMatchObject({
        timestamp: expect.any(Number),
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 2000000000,
        detachedDOMNodes: expect.any(Number),
        eventListenerCount: expect.any(Number),
        componentCount: expect.any(Number),
      });
    });

    it('should return null when performance.memory is unavailable', () => {
      delete global.performance.memory;
      jest.resetModules();
      memoryProfiler = require('../backend/memoryProfiler');

      const snapshot = memoryProfiler.captureMemorySnapshot();
      expect(snapshot).toBeNull();
    });

    it('should handle errors gracefully', () => {
      global.performance.memory = {
        get usedJSHeapSize() {
          throw new Error('Access denied');
        },
      };

      const snapshot = memoryProfiler.captureMemorySnapshot();
      expect(snapshot).toBeNull();
    });
  });

  describe('startMemoryMonitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start monitoring and capture snapshots', () => {
      memoryProfiler.initMemoryProfiler({snapshotInterval: 1000});

      const snapshots = [];
      memoryProfiler.startMemoryMonitoring(snapshot => {
        snapshots.push(snapshot);
      });

      const status = memoryProfiler.getMonitoringStatus();
      expect(status.isMonitoring).toBe(true);
      expect(snapshots.length).toBe(1); // Initial snapshot

      // Advance time to trigger more snapshots
      jest.advanceTimersByTime(1000);
      expect(snapshots.length).toBe(2);

      jest.advanceTimersByTime(2000);
      expect(snapshots.length).toBe(4);
    });

    it('should not start if already monitoring', () => {
      memoryProfiler.initMemoryProfiler();
      memoryProfiler.startMemoryMonitoring();

      const status1 = memoryProfiler.getMonitoringStatus();
      memoryProfiler.startMemoryMonitoring(); // Try to start again
      const status2 = memoryProfiler.getMonitoringStatus();

      expect(status1.isMonitoring).toBe(status2.isMonitoring);
    });

    it('should maintain circular buffer for max snapshots', () => {
      memoryProfiler.initMemoryProfiler({
        snapshotInterval: 100,
        maxSnapshots: 5,
      });

      memoryProfiler.startMemoryMonitoring();

      // Capture more than maxSnapshots
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(100);
      }

      const snapshots = memoryProfiler.stopMemoryMonitoring();
      expect(snapshots.length).toBeLessThanOrEqual(5);
    });
  });

  describe('stopMemoryMonitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should stop monitoring and return snapshots', () => {
      memoryProfiler.initMemoryProfiler();
      memoryProfiler.startMemoryMonitoring();

      jest.advanceTimersByTime(3000);

      const snapshots = memoryProfiler.stopMemoryMonitoring();
      const status = memoryProfiler.getMonitoringStatus();

      expect(status.isMonitoring).toBe(false);
      expect(snapshots.length).toBeGreaterThan(0);
    });

    it('should return empty array if not monitoring', () => {
      const snapshots = memoryProfiler.stopMemoryMonitoring();
      expect(snapshots).toEqual([]);
    });

    it('should clear interval on stop', () => {
      memoryProfiler.initMemoryProfiler();
      memoryProfiler.startMemoryMonitoring();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      memoryProfiler.stopMemoryMonitoring();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('analyzeMemoryTrend', () => {
    it('should detect memory growth', () => {
      const snapshots = [
        {timestamp: 0, usedJSHeapSize: 1000000},
        {timestamp: 1000, usedJSHeapSize: 2000000},
        {timestamp: 2000, usedJSHeapSize: 3000000},
        {timestamp: 3000, usedJSHeapSize: 4000000},
      ];

      const trend = memoryProfiler.analyzeMemoryTrend(snapshots);

      expect(trend.growthRate).toBeGreaterThan(0);
      expect(trend.isLeaking).toBe(true);
      expect(trend.peakMemory).toBe(4000000);
      expect(trend.averageMemory).toBeCloseTo(2500000);
    });

    it('should detect stable memory', () => {
      const snapshots = [
        {timestamp: 0, usedJSHeapSize: 1000000},
        {timestamp: 1000, usedJSHeapSize: 1000100},
        {timestamp: 2000, usedJSHeapSize: 999900},
        {timestamp: 3000, usedJSHeapSize: 1000000},
      ];

      const trend = memoryProfiler.analyzeMemoryTrend(snapshots);

      expect(trend.growthRate).toBeCloseTo(0, -2);
      expect(trend.isLeaking).toBe(false);
    });

    it('should calculate confidence based on data points', () => {
      const fewSnapshots = [
        {timestamp: 0, usedJSHeapSize: 1000000},
        {timestamp: 1000, usedJSHeapSize: 2000000},
      ];

      const manySnapshots = Array.from({length: 60}, (_, i) => ({
        timestamp: i * 1000,
        usedJSHeapSize: 1000000 + i * 100000,
      }));

      const trendFew = memoryProfiler.analyzeMemoryTrend(fewSnapshots);
      const trendMany = memoryProfiler.analyzeMemoryTrend(manySnapshots);

      expect(trendMany.leakConfidence).toBeGreaterThan(trendFew.leakConfidence);
    });

    it('should handle empty snapshots', () => {
      const trend = memoryProfiler.analyzeMemoryTrend([]);

      expect(trend.growthRate).toBe(0);
      expect(trend.isLeaking).toBe(false);
      expect(trend.peakMemory).toBe(0);
      expect(trend.averageMemory).toBe(0);
    });
  });

  describe('detectMemoryGrowth', () => {
    it('should detect growth above threshold', () => {
      const trend = {
        growthRate: 200000, // 200KB/ms
        isLeaking: true,
      };

      const isGrowing = memoryProfiler.detectMemoryGrowth(trend, 100000);
      expect(isGrowing).toBe(true);
    });

    it('should not detect growth below threshold', () => {
      const trend = {
        growthRate: 50000,
        isLeaking: false,
      };

      const isGrowing = memoryProfiler.detectMemoryGrowth(trend, 100000);
      expect(isGrowing).toBe(false);
    });

    it('should use default threshold if not provided', () => {
      memoryProfiler.initMemoryProfiler({
        leakThreshold: 100000,
      });

      const trend = {
        growthRate: 150000,
        isLeaking: true,
      };

      const isGrowing = memoryProfiler.detectMemoryGrowth(trend);
      expect(isGrowing).toBe(true);
    });
  });

  describe('updateComponentCount', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should update component count in latest snapshot', () => {
      memoryProfiler.initMemoryProfiler();
      memoryProfiler.startMemoryMonitoring();

      jest.advanceTimersByTime(1000);

      memoryProfiler.updateComponentCount(42);

      const snapshots = memoryProfiler.stopMemoryMonitoring();
      const latestSnapshot = snapshots[snapshots.length - 1];

      expect(latestSnapshot.componentCount).toBe(42);
    });

    it('should not error if no snapshots exist', () => {
      expect(() => {
        memoryProfiler.updateComponentCount(10);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should stop monitoring on cleanup', () => {
      memoryProfiler.initMemoryProfiler();
      memoryProfiler.startMemoryMonitoring();

      memoryProfiler.cleanup();

      const status = memoryProfiler.getMonitoringStatus();
      expect(status.isMonitoring).toBe(false);
    });

    it('should restore original EventTarget methods', () => {
      const original = global.EventTarget.prototype.addEventListener;

      memoryProfiler.initMemoryProfiler();
      expect(global.EventTarget.prototype.addEventListener).not.toBe(original);

      memoryProfiler.cleanup();
      expect(global.EventTarget.prototype.addEventListener).toBe(original);
    });

    it('should reset all state', () => {
      memoryProfiler.initMemoryProfiler();
      memoryProfiler.startMemoryMonitoring();
      jest.advanceTimersByTime(3000);

      memoryProfiler.cleanup();

      const status = memoryProfiler.getMonitoringStatus();
      expect(status.snapshotCount).toBe(0);
      expect(status.isMonitoring).toBe(false);
    });
  });
});
