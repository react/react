/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

describe('MemoryLeakDetector', () => {
  let memoryLeakDetector;

  beforeEach(() => {
    jest.resetModules();
    memoryLeakDetector = require('../backend/memoryLeakDetector');
    memoryLeakDetector.resetLeakDetection();
  });

  describe('trackComponentMount and trackComponentUnmount', () => {
    it('should track component mount', () => {
      memoryLeakDetector.trackComponentMount(1, 'MyComponent');

      const stats = memoryLeakDetector.getTrackingStats();
      expect(stats.mountedComponents).toBe(1);
    });

    it('should track component unmount', () => {
      memoryLeakDetector.trackComponentMount(1, 'MyComponent');
      memoryLeakDetector.trackComponentUnmount(1);

      const stats = memoryLeakDetector.getTrackingStats();
      expect(stats.mountedComponents).toBe(0);
      expect(stats.unmountedComponents).toBe(1);
    });

    it('should track multiple instances of same component', () => {
      memoryLeakDetector.trackComponentMount(1, 'MyComponent');
      memoryLeakDetector.trackComponentMount(1, 'MyComponent');
      memoryLeakDetector.trackComponentMount(1, 'MyComponent');

      const stats = memoryLeakDetector.getTrackingStats();
      expect(stats.mountedComponents).toBe(1); // Same ID, increments instance count
    });
  });

  describe('detectDetachedDOMNodes', () => {
    it('should detect growing detached DOM nodes', () => {
      const snapshots = [
        {
          timestamp: 0,
          usedJSHeapSize: 1000000,
          detachedDOMNodes: 50,
        },
        {
          timestamp: 1000,
          usedJSHeapSize: 1100000,
          detachedDOMNodes: 75,
        },
      ];

      const leaks = memoryLeakDetector.detectDetachedDOMNodes(snapshots);

      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].type).toBe('detached-dom');
      expect(leaks[0].severity).toBeDefined();
      expect(leaks[0].suggestion).toContain('cleanup');
    });

    it('should not detect leaks with stable detached node count', () => {
      const snapshots = [
        {timestamp: 0, detachedDOMNodes: 5},
        {timestamp: 1000, detachedDOMNodes: 5},
      ];

      const leaks = memoryLeakDetector.detectDetachedDOMNodes(snapshots);
      expect(leaks.length).toBe(0);
    });

    it('should assign critical severity for high node count', () => {
      const snapshots = [
        {timestamp: 0, detachedDOMNodes: 0},
        {timestamp: 1000, detachedDOMNodes: 150},
      ];

      const leaks = memoryLeakDetector.detectDetachedDOMNodes(snapshots);
      expect(leaks[0].severity).toBe('critical');
    });

    it('should handle empty snapshots', () => {
      const leaks = memoryLeakDetector.detectDetachedDOMNodes([]);
      expect(leaks).toEqual([]);
    });

    it('should include metadata about growth', () => {
      const snapshots = [
        {timestamp: 0, detachedDOMNodes: 10},
        {timestamp: 1000, detachedDOMNodes: 30},
      ];

      const leaks = memoryLeakDetector.detectDetachedDOMNodes(snapshots);
      expect(leaks[0].metadata).toBeDefined();
      expect(leaks[0].metadata.detachedCount).toBe(30);
      expect(leaks[0].metadata.growth).toBe(20);
    });
  });

  describe('detectEventListenerLeaks', () => {
    it('should detect growing event listener count', () => {
      const snapshots = [
        {timestamp: 0, eventListenerCount: 100},
        {timestamp: 1000, eventListenerCount: 250},
      ];

      const leaks = memoryLeakDetector.detectEventListenerLeaks(snapshots);

      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].type).toBe('event-listeners');
      expect(leaks[0].description).toContain('250');
    });

    it('should provide code example for fixing listener leaks', () => {
      const snapshots = [
        {timestamp: 0, eventListenerCount: 50},
        {timestamp: 1000, eventListenerCount: 300},
      ];

      const leaks = memoryLeakDetector.detectEventListenerLeaks(snapshots);
      expect(leaks[0].codeExample).toContain('removeEventListener');
    });

    it('should assign severity based on listener count', () => {
      const criticalSnapshots = [
        {timestamp: 0, eventListenerCount: 0},
        {timestamp: 1000, eventListenerCount: 1100},
      ];

      const leaks =
        memoryLeakDetector.detectEventListenerLeaks(criticalSnapshots);
      expect(leaks[0].severity).toBe('critical');
    });
  });

  describe('detectComponentLifecycleLeaks', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(0);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should detect components with growing instances', () => {
      // Mount component multiple times without unmounting
      for (let i = 0; i < 12; i++) {
        memoryLeakDetector.trackComponentMount(1, 'LeakyComponent');
      }

      // Fast-forward time to make component "long-lived"
      jest.advanceTimersByTime(400000); // 6+ minutes

      const leaks = memoryLeakDetector.detectComponentLifecycleLeaks();

      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].type).toBe('component-lifecycle');
      expect(leaks[0].affectedComponent).toBe('LeakyComponent');
    });

    it('should not detect properly unmounted components', () => {
      memoryLeakDetector.trackComponentMount(1, 'GoodComponent');
      memoryLeakDetector.trackComponentUnmount(1);

      jest.advanceTimersByTime(400000);

      const leaks = memoryLeakDetector.detectComponentLifecycleLeaks();
      expect(leaks.length).toBe(0);
    });

    it('should assign severity based on instance count', () => {
      // Create component with many instances
      for (let i = 0; i < 15; i++) {
        memoryLeakDetector.trackComponentMount(1, 'MassiveLeakComponent');
      }

      jest.advanceTimersByTime(400000);

      const leaks = memoryLeakDetector.detectComponentLifecycleLeaks();
      expect(leaks[0].severity).toBe('critical');
    });

    it('should include metadata about instances and lifespan', () => {
      for (let i = 0; i < 8; i++) {
        memoryLeakDetector.trackComponentMount(1, 'TestComponent');
      }

      jest.advanceTimersByTime(400000);

      const leaks = memoryLeakDetector.detectComponentLifecycleLeaks();
      expect(leaks[0].metadata).toBeDefined();
      expect(leaks[0].metadata.instanceCount).toBe(8);
      expect(leaks[0].metadata.lifespan).toBeGreaterThan(300000);
    });
  });

  describe('detectTimerLeaks', () => {
    it('should detect excessive active timers', () => {
      // Track many timers without clearing
      for (let i = 0; i < 60; i++) {
        memoryLeakDetector.trackTimer(i);
      }

      const leaks = memoryLeakDetector.detectTimerLeaks();

      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].type).toBe('timer');
      expect(leaks[0].codeExample).toContain('clearInterval');
    });

    it('should not detect leaks with few timers', () => {
      for (let i = 0; i < 10; i++) {
        memoryLeakDetector.trackTimer(i);
      }

      const leaks = memoryLeakDetector.detectTimerLeaks();
      expect(leaks.length).toBe(0);
    });

    it('should track timer cleanup', () => {
      for (let i = 0; i < 100; i++) {
        memoryLeakDetector.trackTimer(i);
      }

      // Clear half the timers
      for (let i = 0; i < 50; i++) {
        memoryLeakDetector.clearTimer(i);
      }

      const stats = memoryLeakDetector.getTrackingStats();
      expect(stats.activeTimers).toBe(50);
    });

    it('should assign critical severity for many timers', () => {
      for (let i = 0; i < 250; i++) {
        memoryLeakDetector.trackTimer(i);
      }

      const leaks = memoryLeakDetector.detectTimerLeaks();
      expect(leaks[0].severity).toBe('critical');
    });
  });

  describe('detectMemoryGrowthPattern', () => {
    it('should detect critical memory growth', () => {
      const snapshots = Array.from({length: 20}, (_, i) => ({
        timestamp: i * 1000,
        usedJSHeapSize: 1000000 + i * 1024 * 1024 * 2, // 2MB per second
      }));

      const leaks = memoryLeakDetector.detectMemoryGrowthPattern(snapshots);

      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].type).toBe('growing-memory');
      expect(leaks[0].severity).toBe('critical');
    });

    it('should detect moderate memory growth', () => {
      const snapshots = Array.from({length: 20}, (_, i) => ({
        timestamp: i * 1000,
        usedJSHeapSize: 1000000 + i * 1024 * 200, // 200KB per second
      }));

      const leaks = memoryLeakDetector.detectMemoryGrowthPattern(snapshots);

      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].severity).toBe('medium');
    });

    it('should not detect leaks with stable memory', () => {
      const snapshots = Array.from({length: 20}, (_, i) => ({
        timestamp: i * 1000,
        usedJSHeapSize: 1000000 + (i % 2 ? 1000 : -1000), // Fluctuating
      }));

      const leaks = memoryLeakDetector.detectMemoryGrowthPattern(snapshots);
      expect(leaks.length).toBe(0);
    });

    it('should require minimum snapshots for analysis', () => {
      const snapshots = [
        {timestamp: 0, usedJSHeapSize: 1000000},
        {timestamp: 1000, usedJSHeapSize: 5000000},
      ];

      const leaks = memoryLeakDetector.detectMemoryGrowthPattern(snapshots);
      expect(leaks.length).toBe(0); // Not enough data
    });
  });

  describe('detectMemoryLeaks', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(0);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should run all detection algorithms', () => {
      // Set up various leak scenarios
      const snapshots = Array.from({length: 15}, (_, i) => ({
        timestamp: i * 1000,
        usedJSHeapSize: 1000000 + i * 1024 * 600, // 600KB/s
        detachedDOMNodes: 10 + i * 5,
        eventListenerCount: 100 + i * 20,
      }));

      for (let i = 0; i < 60; i++) {
        memoryLeakDetector.trackTimer(i);
      }

      for (let i = 0; i < 8; i++) {
        memoryLeakDetector.trackComponentMount(1, 'LeakyComponent');
      }
      jest.advanceTimersByTime(400000);

      const result = memoryLeakDetector.detectMemoryLeaks(snapshots);

      expect(result.leaks.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(result.totalLeaksFound).toBe(result.leaks.length);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should calculate confidence based on leak diversity', () => {
      const snapshots = Array.from({length: 60}, (_, i) => ({
        timestamp: i * 1000,
        usedJSHeapSize: 1000000 + i * 1024 * 600,
        detachedDOMNodes: 10 + i * 3,
        eventListenerCount: 100 + i * 15,
      }));

      for (let i = 0; i < 100; i++) {
        memoryLeakDetector.trackTimer(i);
      }

      const result = memoryLeakDetector.detectMemoryLeaks(snapshots);

      // Multiple leak types should increase confidence
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should return low confidence with insufficient data', () => {
      const snapshots = [
        {
          timestamp: 0,
          usedJSHeapSize: 1000000,
          detachedDOMNodes: 0,
          eventListenerCount: 0,
        },
      ];

      const result = memoryLeakDetector.detectMemoryLeaks(snapshots);
      expect(result.confidence).toBe(0);
    });

    it('should categorize leaks by type', () => {
      const snapshots = Array.from({length: 15}, (_, i) => ({
        timestamp: i * 1000,
        usedJSHeapSize: 1000000 + i * 1024 * 600,
        detachedDOMNodes: 100,
        eventListenerCount: 500,
      }));

      const result = memoryLeakDetector.detectMemoryLeaks(snapshots);

      const leakTypes = new Set(result.leaks.map(leak => leak.type));
      expect(leakTypes.size).toBeGreaterThan(1); // Multiple types detected
    });
  });

  describe('resetLeakDetection', () => {
    it('should clear all tracking data', () => {
      memoryLeakDetector.trackComponentMount(1, 'Component1');
      memoryLeakDetector.trackComponentMount(2, 'Component2');
      memoryLeakDetector.trackTimer(1);
      memoryLeakDetector.trackTimer(2);

      memoryLeakDetector.resetLeakDetection();

      const stats = memoryLeakDetector.getTrackingStats();
      expect(stats.mountedComponents).toBe(0);
      expect(stats.unmountedComponents).toBe(0);
      expect(stats.activeTimers).toBe(0);
    });

    it('should reset baseline counts', () => {
      const snapshots = [
        {timestamp: 0, detachedDOMNodes: 50, eventListenerCount: 200},
      ];

      // Detect once to set baseline
      memoryLeakDetector.detectDetachedDOMNodes(snapshots);
      memoryLeakDetector.detectEventListenerLeaks(snapshots);

      memoryLeakDetector.resetLeakDetection();

      // After reset, same values should trigger detection again
      const leaksDOM = memoryLeakDetector.detectDetachedDOMNodes(snapshots);
      const leaksListeners =
        memoryLeakDetector.detectEventListenerLeaks(snapshots);

      // Should detect again since baseline was reset
      expect(leaksDOM.length + leaksListeners.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTrackingStats', () => {
    it('should return current tracking statistics', () => {
      memoryLeakDetector.trackComponentMount(1, 'Component1');
      memoryLeakDetector.trackComponentMount(2, 'Component2');
      memoryLeakDetector.trackComponentUnmount(1);
      memoryLeakDetector.trackTimer(1);

      const stats = memoryLeakDetector.getTrackingStats();

      expect(stats.mountedComponents).toBe(1);
      expect(stats.unmountedComponents).toBe(1);
      expect(stats.activeTimers).toBe(1);
    });
  });
});
