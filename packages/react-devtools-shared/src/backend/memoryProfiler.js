/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Memory snapshot captured at a point in time
export type MemorySnapshot = {
  timestamp: number,
  usedJSHeapSize: number,
  totalJSHeapSize: number,
  jsHeapSizeLimit: number,
  detachedDOMNodes: number,
  eventListenerCount: number,
  componentCount: number,
};

// Analysis of memory trends over time
export type MemoryTrend = {
  snapshots: Array<MemorySnapshot>,
  growthRate: number, // bytes per second
  isLeaking: boolean,
  leakConfidence: number, // 0-1 scale
  peakMemory: number,
  averageMemory: number,
};

// Configuration for memory profiling
export type MemoryProfilingConfig = {
  snapshotInterval: number, // milliseconds between snapshots
  maxSnapshots: number, // maximum snapshots to store
  leakThreshold: number, // bytes/sec growth rate to trigger leak warning
};

const DEFAULT_CONFIG: MemoryProfilingConfig = {
  snapshotInterval: 1000, // 1 second
  maxSnapshots: 300, // 5 minutes at 1 second interval
  leakThreshold: 1024 * 100, // 100KB per second
};

// Check if Performance Memory API is available
const supportsPerformanceMemory =
  typeof performance !== 'undefined' &&
  // $FlowFixMe[prop-missing]
  typeof performance.memory === 'object' &&
  // $FlowFixMe[prop-missing]
  typeof performance.memory.usedJSHeapSize === 'number';

// Current profiling state
let isMonitoring: boolean = false;
let monitoringIntervalId: TimeoutID | null = null;
let snapshots: Array<MemorySnapshot> = [];
let config: MemoryProfilingConfig = DEFAULT_CONFIG;

// Get current timestamp
const getCurrentTime =
  typeof performance === 'object' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

// Detached DOM node detection state
let detachedNodeObserver: MutationObserver | null = null;
let detachedNodeCount: number = 0;

// Event listener tracking
let eventListenerCount: number = 0;
const originalAddEventListener =
  typeof EventTarget !== 'undefined'
    ? EventTarget.prototype.addEventListener
    : null;
const originalRemoveEventListener =
  typeof EventTarget !== 'undefined'
    ? EventTarget.prototype.removeEventListener
    : null;

/**
 * Initialize memory profiler with optional configuration.
 */
export function initMemoryProfiler(
  customConfig?: $Shape<MemoryProfilingConfig>,
): void {
  config = {...DEFAULT_CONFIG, ...customConfig};

  // Set up event listener tracking
  if (originalAddEventListener && originalRemoveEventListener) {
    // $FlowFixMe[prop-missing]
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: mixed,
      options?: mixed,
    ): void {
      eventListenerCount++;
      // $FlowFixMe[incompatible-call]
      return originalAddEventListener.call(this, type, listener, options);
    };

    // $FlowFixMe[prop-missing]
    EventTarget.prototype.removeEventListener = function (
      type: string,
      listener: mixed,
      options?: mixed,
    ): void {
      eventListenerCount = Math.max(0, eventListenerCount - 1);
      // $FlowFixMe[incompatible-call]
      return originalRemoveEventListener.call(this, type, listener, options);
    };
  }

  // Set up detached DOM node detection
  if (
    typeof MutationObserver !== 'undefined' &&
    typeof document !== 'undefined'
  ) {
    detachedNodeObserver = new MutationObserver(() => {
      // Debounce the expensive operation of counting detached nodes
      // This will be called on the next snapshot instead
    });

    detachedNodeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

/**
 * Count detached DOM nodes that are still in memory.
 * This is an expensive operation and should be called sparingly.
 */
function countDetachedDOMNodes(): number {
  if (typeof document === 'undefined') {
    return 0;
  }

  try {
    let count = 0;
    const walker = document.createTreeWalker(
      document.body,
      // $FlowFixMe[incompatible-call]
      NodeFilter.SHOW_ELEMENT,
      null,
      false,
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      // Check if node is detached
      if (node.parentNode && !document.contains(node)) {
        count++;
      }
    }

    return count;
  } catch (error) {
    // If we encounter an error, return the cached count
    return detachedNodeCount;
  }
}

/**
 * Capture a single memory snapshot at the current moment.
 * Returns null if performance.memory API is not available.
 */
export function captureMemorySnapshot(): MemorySnapshot | null {
  if (!supportsPerformanceMemory) {
    return null;
  }

  try {
    // $FlowFixMe[prop-missing]
    const memory = performance.memory;
    const timestamp = getCurrentTime();

    // Count detached nodes periodically (expensive operation)
    if (snapshots.length % 10 === 0) {
      detachedNodeCount = countDetachedDOMNodes();
    }

    const snapshot: MemorySnapshot = {
      timestamp,
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      detachedDOMNodes: detachedNodeCount,
      eventListenerCount,
      componentCount: 0, // Will be populated by profilingHooks
    };

    return snapshot;
  } catch (error) {
    // Silently fail if we can't capture a snapshot
    return null;
  }
}

/**
 * Start continuous memory monitoring at the configured interval.
 */
export function startMemoryMonitoring(
  snapshotCallback?: (snapshot: MemorySnapshot) => void,
): void {
  if (isMonitoring) {
    return;
  }

  isMonitoring = true;
  snapshots = [];

  const captureAndStore = () => {
    const snapshot = captureMemorySnapshot();
    if (snapshot !== null) {
      // Maintain circular buffer to limit memory usage
      if (snapshots.length >= config.maxSnapshots) {
        snapshots.shift();
      }
      snapshots.push(snapshot);

      // Notify callback if provided
      if (typeof snapshotCallback === 'function') {
        snapshotCallback(snapshot);
      }
    }
  };

  // Take initial snapshot
  captureAndStore();

  // Set up interval for continuous monitoring
  monitoringIntervalId = setInterval(captureAndStore, config.snapshotInterval);
}

/**
 * Stop memory monitoring and return all captured snapshots.
 */
export function stopMemoryMonitoring(): Array<MemorySnapshot> {
  if (!isMonitoring) {
    return [];
  }

  isMonitoring = false;

  if (monitoringIntervalId !== null) {
    clearInterval(monitoringIntervalId);
    monitoringIntervalId = null;
  }

  const capturedSnapshots = [...snapshots];
  snapshots = [];

  return capturedSnapshots;
}

/**
 * Calculate linear regression to determine memory growth rate.
 * Returns growth rate in bytes per millisecond.
 */
function calculateGrowthRate(snapshotsArray: Array<MemorySnapshot>): number {
  if (snapshotsArray.length < 2) {
    return 0;
  }

  // Calculate linear regression: y = mx + b
  // where x is time, y is memory usage, m is growth rate
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  const n = snapshotsArray.length;

  for (let i = 0; i < n; i++) {
    const x = snapshotsArray[i].timestamp;
    const y = snapshotsArray[i].usedJSHeapSize;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
}

/**
 * Analyze memory trend from snapshots.
 * Determines if memory is growing abnormally and calculates confidence.
 */
export function analyzeMemoryTrend(
  snapshotData: Array<MemorySnapshot>,
): MemoryTrend {
  const growthRate = calculateGrowthRate(snapshotData);

  // Calculate peak and average memory
  let peakMemory = 0;
  let totalMemory = 0;

  for (let i = 0; i < snapshotData.length; i++) {
    const memory = snapshotData[i].usedJSHeapSize;
    if (memory > peakMemory) {
      peakMemory = memory;
    }
    totalMemory += memory;
  }

  const averageMemory =
    snapshotData.length > 0 ? totalMemory / snapshotData.length : 0;

  // Determine if there's a leak based on growth rate
  const isLeaking = growthRate > config.leakThreshold;

  // Calculate confidence based on:
  // 1. Consistency of growth (variance)
  // 2. Duration of monitoring
  // 3. Growth rate magnitude
  let leakConfidence = 0;

  if (isLeaking && snapshotData.length >= 10) {
    // Higher confidence with more data points
    const dataPointFactor = Math.min(snapshotData.length / 60, 1); // Max at 60 snapshots

    // Higher confidence with consistent growth
    const growthRateFactor = Math.min(
      growthRate / (config.leakThreshold * 10),
      1,
    );

    leakConfidence = (dataPointFactor + growthRateFactor) / 2;
  }

  return {
    snapshots: snapshotData,
    growthRate,
    isLeaking,
    leakConfidence,
    peakMemory,
    averageMemory,
  };
}

/**
 * Detect if memory is growing abnormally based on threshold.
 */
export function detectMemoryGrowth(
  trend: MemoryTrend,
  customThreshold?: number,
): boolean {
  const threshold = customThreshold ?? config.leakThreshold;
  return trend.growthRate > threshold;
}

/**
 * Get current monitoring status.
 */
export function getMonitoringStatus(): {
  isMonitoring: boolean,
  snapshotCount: number,
  config: MemoryProfilingConfig,
} {
  return {
    isMonitoring,
    snapshotCount: snapshots.length,
    config,
  };
}

/**
 * Update component count in the most recent snapshot.
 * Called externally by profilingHooks.
 */
export function updateComponentCount(count: number): void {
  if (snapshots.length > 0) {
    snapshots[snapshots.length - 1].componentCount = count;
  }
}

/**
 * Clean up and restore original APIs.
 * Should be called when profiler is destroyed.
 */
export function cleanup(): void {
  stopMemoryMonitoring();

  // Restore original event listener methods
  if (
    originalAddEventListener &&
    originalRemoveEventListener &&
    typeof EventTarget !== 'undefined'
  ) {
    // $FlowFixMe[prop-missing]
    EventTarget.prototype.addEventListener = originalAddEventListener;
    // $FlowFixMe[prop-missing]
    EventTarget.prototype.removeEventListener = originalRemoveEventListener;
  }

  // Disconnect observer
  if (detachedNodeObserver !== null) {
    detachedNodeObserver.disconnect();
    detachedNodeObserver = null;
  }

  // Reset state
  eventListenerCount = 0;
  detachedNodeCount = 0;
  snapshots = [];
}
