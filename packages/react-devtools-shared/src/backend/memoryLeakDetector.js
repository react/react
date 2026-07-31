/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {MemorySnapshot} from './memoryProfiler';

// Types of memory leaks that can be detected
export type LeakType =
  | 'detached-dom'
  | 'event-listeners'
  | 'component-lifecycle'
  | 'timer'
  | 'subscription'
  | 'closure'
  | 'growing-memory';

export type LeakSeverity = 'low' | 'medium' | 'high' | 'critical';

// Pattern describing a detected memory leak
export type LeakPattern = {
  type: LeakType,
  severity: LeakSeverity,
  description: string,
  affectedComponent: string | null,
  suggestion: string,
  codeExample?: string,
  metadata?: {[key: string]: mixed},
};

// Result of running leak detection
export type LeakDetectionResult = {
  leaks: Array<LeakPattern>,
  confidence: number, // 0-1 scale
  timestamp: number,
  totalLeaksFound: number,
};

// Component tracking for lifecycle leak detection
type ComponentInfo = {
  id: number,
  name: string,
  mountTime: number,
  unmountTime: number | null,
  instanceCount: number,
};

// Tracking state
const mountedComponents: Map<number, ComponentInfo> = new Map();
const unmountedComponents: Map<number, ComponentInfo> = new Map();
const timerRegistry: Set<TimeoutID | IntervalID> = new Set();
let lastEventListenerCount: number = 0;
let lastDetachedNodeCount: number = 0;

/**
 * Track component mount for lifecycle leak detection.
 */
export function trackComponentMount(id: number, name: string): void {
  const now =
    typeof performance === 'object' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  const existing = mountedComponents.get(id);
  if (existing) {
    // Component re-mounted, increment instance count
    existing.instanceCount++;
    existing.mountTime = now;
  } else {
    mountedComponents.set(id, {
      id,
      name,
      mountTime: now,
      unmountTime: null,
      instanceCount: 1,
    });
  }
}

/**
 * Track component unmount for lifecycle leak detection.
 */
export function trackComponentUnmount(id: number): void {
  const component = mountedComponents.get(id);
  if (component) {
    const now =
      typeof performance === 'object' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    component.unmountTime = now;
    unmountedComponents.set(id, component);
    mountedComponents.delete(id);
  }
}

/**
 * Track timer creation for leak detection.
 */
export function trackTimer(id: TimeoutID | IntervalID): void {
  timerRegistry.add(id);
}

/**
 * Track timer cleanup.
 */
export function clearTimer(id: TimeoutID | IntervalID): void {
  timerRegistry.delete(id);
}

/**
 * Detect detached DOM nodes that are consuming memory.
 */
export function detectDetachedDOMNodes(
  snapshots: Array<MemorySnapshot>,
): Array<LeakPattern> {
  const leaks: Array<LeakPattern> = [];

  if (snapshots.length === 0) {
    return leaks;
  }

  const latestSnapshot = snapshots[snapshots.length - 1];
  const detachedCount = latestSnapshot.detachedDOMNodes;

  // Check if detached node count is growing
  if (detachedCount > lastDetachedNodeCount && detachedCount > 10) {
    const growth = detachedCount - lastDetachedNodeCount;
    let severity: LeakSeverity = 'low';

    if (detachedCount > 100) {
      severity = 'critical';
    } else if (detachedCount > 50) {
      severity = 'high';
    } else if (detachedCount > 25) {
      severity = 'medium';
    }

    leaks.push({
      type: 'detached-dom',
      severity,
      description: `${detachedCount} detached DOM nodes detected in memory (${growth} new since last check)`,
      affectedComponent: null,
      suggestion:
        'Ensure components properly clean up DOM references in useEffect cleanup functions or componentWillUnmount',
      codeExample: `useEffect(() => {
  const element = document.getElementById('myElement');
  // Use element...
  
  return () => {
    // Clean up: remove event listeners, clear references
    element = null;
  };
}, []);`,
      metadata: {
        detachedCount,
        growth,
      },
    });
  }

  lastDetachedNodeCount = detachedCount;
  return leaks;
}

/**
 * Detect growing event listener count that may indicate a leak.
 */
export function detectEventListenerLeaks(
  snapshots: Array<MemorySnapshot>,
): Array<LeakPattern> {
  const leaks: Array<LeakPattern> = [];

  if (snapshots.length === 0) {
    return leaks;
  }

  const latestSnapshot = snapshots[snapshots.length - 1];
  const listenerCount = latestSnapshot.eventListenerCount;

  // Check if listener count is growing abnormally
  if (listenerCount > lastEventListenerCount && listenerCount > 100) {
    const growth = listenerCount - lastEventListenerCount;
    let severity: LeakSeverity = 'low';

    if (listenerCount > 1000) {
      severity = 'critical';
    } else if (listenerCount > 500) {
      severity = 'high';
    } else if (listenerCount > 250) {
      severity = 'medium';
    }

    leaks.push({
      type: 'event-listeners',
      severity,
      description: `${listenerCount} event listeners registered (${growth} new since last check)`,
      affectedComponent: null,
      suggestion:
        'Remove event listeners in cleanup functions. Consider using useEvent or similar patterns for stable callbacks',
      codeExample: `useEffect(() => {
  const handleClick = () => { /* ... */ };
  window.addEventListener('click', handleClick);
  
  return () => {
    window.removeEventListener('click', handleClick);
  };
}, []);`,
      metadata: {
        listenerCount,
        growth,
      },
    });
  }

  lastEventListenerCount = listenerCount;
  return leaks;
}

/**
 * Detect component lifecycle issues that may cause memory leaks.
 */
export function detectComponentLifecycleLeaks(): Array<LeakPattern> {
  const leaks: Array<LeakPattern> = [];

  // Check for components that mounted but never unmounted
  const longLivedComponents: Array<ComponentInfo> = [];
  const now =
    typeof performance === 'object' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  mountedComponents.forEach(component => {
    const lifespan = now - component.mountTime;
    // If component has been mounted for >5 minutes with growing instances
    if (lifespan > 300000 && component.instanceCount > 1) {
      longLivedComponents.push(component);
    }
  });

  if (longLivedComponents.length > 0) {
    for (let i = 0; i < longLivedComponents.length; i++) {
      const component = longLivedComponents[i];
      let severity: LeakSeverity = 'medium';
      if (component.instanceCount > 10) {
        severity = 'critical';
      } else if (component.instanceCount > 5) {
        severity = 'high';
      }

      leaks.push({
        type: 'component-lifecycle',
        severity,
        description: `Component "${component.name}" has ${component.instanceCount} instances that never unmounted`,
        affectedComponent: component.name,
        suggestion:
          'This component may be accumulating instances. Check if parent components are properly unmounting children',
        metadata: {
          componentId: component.id,
          instanceCount: component.instanceCount,
          lifespan: now - component.mountTime,
        },
      });
    }
  }

  return leaks;
}

/**
 * Detect timer leaks (setInterval/setTimeout not cleared).
 */
export function detectTimerLeaks(): Array<LeakPattern> {
  const leaks: Array<LeakPattern> = [];
  const timerCount = timerRegistry.size;

  if (timerCount > 50) {
    let severity: LeakSeverity = 'low';

    if (timerCount > 200) {
      severity = 'critical';
    } else if (timerCount > 100) {
      severity = 'high';
    } else if (timerCount > 75) {
      severity = 'medium';
    }

    leaks.push({
      type: 'timer',
      severity,
      description: `${timerCount} active timers detected that may not be cleaned up`,
      affectedComponent: null,
      suggestion:
        'Clear all timers in cleanup functions. Use clearTimeout/clearInterval',
      codeExample: `useEffect(() => {
  const intervalId = setInterval(() => {
    // Do something periodically
  }, 1000);
  
  return () => {
    clearInterval(intervalId);
  };
}, []);`,
      metadata: {
        timerCount,
      },
    });
  }

  return leaks;
}

/**
 * Analyze memory growth patterns from snapshots.
 */
export function detectMemoryGrowthPattern(
  snapshots: Array<MemorySnapshot>,
): Array<LeakPattern> {
  const leaks: Array<LeakPattern> = [];

  if (snapshots.length < 10) {
    // Need at least 10 snapshots for meaningful analysis
    return leaks;
  }

  // Calculate memory growth over time
  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];
  const timeDelta = lastSnapshot.timestamp - firstSnapshot.timestamp;
  const memoryDelta =
    lastSnapshot.usedJSHeapSize - firstSnapshot.usedJSHeapSize;

  // Growth rate in bytes per second
  const growthRate = (memoryDelta / timeDelta) * 1000;

  // Different thresholds for different severity levels
  if (growthRate > 1024 * 1024) {
    // >1MB per second
    leaks.push({
      type: 'growing-memory',
      severity: 'critical',
      description: `Memory growing at ${(growthRate / 1024 / 1024).toFixed(2)} MB/s`,
      affectedComponent: null,
      suggestion:
        'Application has severe memory leak. Check for circular references, uncleaned subscriptions, or accumulating data structures',
    });
  } else if (growthRate > 1024 * 512) {
    // >512KB per second
    leaks.push({
      type: 'growing-memory',
      severity: 'high',
      description: `Memory growing at ${(growthRate / 1024).toFixed(2)} KB/s`,
      affectedComponent: null,
      suggestion:
        'Significant memory growth detected. Review data caching, event listeners, and component cleanup',
    });
  } else if (growthRate > 1024 * 100) {
    // >100KB per second
    leaks.push({
      type: 'growing-memory',
      severity: 'medium',
      description: `Memory growing at ${(growthRate / 1024).toFixed(2)} KB/s`,
      affectedComponent: null,
      suggestion:
        'Moderate memory growth detected. Consider reviewing component lifecycle and data management',
    });
  }

  return leaks;
}

/**
 * Run all leak detection algorithms and return comprehensive results.
 */
export function detectMemoryLeaks(
  snapshots: Array<MemorySnapshot>,
): LeakDetectionResult {
  const allLeaks: Array<LeakPattern> = [];

  // Run all detection algorithms
  allLeaks.push(...detectDetachedDOMNodes(snapshots));
  allLeaks.push(...detectEventListenerLeaks(snapshots));
  allLeaks.push(...detectComponentLifecycleLeaks());
  allLeaks.push(...detectTimerLeaks());
  allLeaks.push(...detectMemoryGrowthPattern(snapshots));

  // Calculate overall confidence based on:
  // 1. Number of different leak types detected
  // 2. Severity of leaks
  // 3. Amount of data available
  let confidence = 0;

  if (snapshots.length >= 10) {
    const leakTypes = new Set(allLeaks.map(leak => leak.type));
    const criticalLeaks = allLeaks.filter(
      leak => leak.severity === 'critical',
    ).length;
    const highLeaks = allLeaks.filter(leak => leak.severity === 'high').length;

    // Base confidence on data availability
    const dataFactor = Math.min(snapshots.length / 60, 1);

    // Increase confidence based on leak diversity and severity
    const leakFactor = Math.min(
      (leakTypes.size * 0.2 + criticalLeaks * 0.3 + highLeaks * 0.2) /
        allLeaks.length,
      1,
    );

    confidence = Math.min((dataFactor + leakFactor) / 2, 1);
  }

  const now =
    typeof performance === 'object' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  return {
    leaks: allLeaks,
    confidence,
    timestamp: now,
    totalLeaksFound: allLeaks.length,
  };
}

/**
 * Reset all tracking state.
 * Should be called when profiling starts fresh.
 */
export function resetLeakDetection(): void {
  mountedComponents.clear();
  unmountedComponents.clear();
  timerRegistry.clear();
  lastEventListenerCount = 0;
  lastDetachedNodeCount = 0;
}

/**
 * Get current tracking statistics for debugging.
 */
export function getTrackingStats(): {
  mountedComponents: number,
  unmountedComponents: number,
  activeTimers: number,
} {
  return {
    mountedComponents: mountedComponents.size,
    unmountedComponents: unmountedComponents.size,
    activeTimers: timerRegistry.size,
  };
}
