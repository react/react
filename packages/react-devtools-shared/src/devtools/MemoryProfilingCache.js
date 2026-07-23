/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type ProfilerStore from './ProfilerStore';
import type {
  MemorySnapshot,
  MemoryTrend,
  LeakPattern,
} from 'react-devtools-shared/src/backend/types';

// Chart data point for memory visualization
export type MemoryChartDataPoint = {
  timestamp: number,
  usedJSHeapSize: number,
  totalJSHeapSize: number,
  detachedDOMNodes: number,
  eventListenerCount: number,
  componentCount: number,
};

// Aggregated leak statistics
export type LeakStatistics = {
  totalLeaks: number,
  criticalLeaks: number,
  highLeaks: number,
  mediumLeaks: number,
  lowLeaks: number,
  leaksByType: Map<string, number>,
};

export default class MemoryProfilingCache {
  _profilerStore: ProfilerStore;

  // Cached data
  _memoryChartData: Array<MemoryChartDataPoint> | null = null;
  _memoryTrend: MemoryTrend | null = null;
  _leakStatistics: LeakStatistics | null = null;
  _sortedLeaksByTimestamp: Array<LeakPattern> | null = null;
  _sortedLeaksBySeverity: Array<LeakPattern> | null = null;

  constructor(profilerStore: ProfilerStore) {
    this._profilerStore = profilerStore;
  }

  /**
   * Get chart data for memory visualization.
   * Converts snapshots to chart-friendly format.
   */
  getMemoryChartData(): Array<MemoryChartDataPoint> {
    if (this._memoryChartData !== null) {
      return this._memoryChartData;
    }

    const data = this._profilerStore.memoryProfilingData;
    if (data === null || data.snapshots.length === 0) {
      return [];
    }

    this._memoryChartData = data.snapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      usedJSHeapSize: snapshot.usedJSHeapSize,
      totalJSHeapSize: snapshot.totalJSHeapSize,
      detachedDOMNodes: snapshot.detachedDOMNodes,
      eventListenerCount: snapshot.eventListenerCount,
      componentCount: snapshot.componentCount,
    }));

    return this._memoryChartData;
  }

  /**
   * Get memory trend analysis.
   */
  getMemoryTrend(): MemoryTrend | null {
    if (this._memoryTrend !== null) {
      return this._memoryTrend;
    }

    const data = this._profilerStore.memoryProfilingData;
    if (data === null) {
      return null;
    }

    this._memoryTrend = data.trend;
    return this._memoryTrend;
  }

  /**
   * Get aggregated leak statistics.
   */
  getLeakStatistics(): LeakStatistics {
    if (this._leakStatistics !== null) {
      return this._leakStatistics;
    }

    const allLeaks = this._getAllLeaks();

    const stats: LeakStatistics = {
      totalLeaks: allLeaks.length,
      criticalLeaks: 0,
      highLeaks: 0,
      mediumLeaks: 0,
      lowLeaks: 0,
      leaksByType: new Map(),
    };

    allLeaks.forEach(leak => {
      // Count by severity
      switch (leak.severity) {
        case 'critical':
          stats.criticalLeaks++;
          break;
        case 'high':
          stats.highLeaks++;
          break;
        case 'medium':
          stats.mediumLeaks++;
          break;
        case 'low':
          stats.lowLeaks++;
          break;
      }

      // Count by type
      const typeCount = stats.leaksByType.get(leak.type) || 0;
      stats.leaksByType.set(leak.type, typeCount + 1);
    });

    this._leakStatistics = stats;
    return stats;
  }

  /**
   * Get all leaks sorted by timestamp (most recent first).
   */
  getLeaksSortedByTimestamp(): Array<LeakPattern> {
    if (this._sortedLeaksByTimestamp !== null) {
      return this._sortedLeaksByTimestamp;
    }

    const allLeaks = this._getAllLeaks();

    // Sort by severity first, then by type
    this._sortedLeaksByTimestamp = [...allLeaks].sort((a, b) => {
      // Most recent detection first
      const warnings = this._profilerStore.memoryLeakWarnings;
      const indexA = this._findLeakIndex(a, warnings);
      const indexB = this._findLeakIndex(b, warnings);
      return indexB - indexA;
    });

    return this._sortedLeaksByTimestamp;
  }

  /**
   * Get all leaks sorted by severity (critical first).
   */
  getLeaksSortedBySeverity(): Array<LeakPattern> {
    if (this._sortedLeaksBySeverity !== null) {
      return this._sortedLeaksBySeverity;
    }

    const allLeaks = this._getAllLeaks();
    const severityOrder = {critical: 0, high: 1, medium: 2, low: 3};

    this._sortedLeaksBySeverity = [...allLeaks].sort((a, b) => {
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      // Secondary sort by type for consistency
      return a.type.localeCompare(b.type);
    });

    return this._sortedLeaksBySeverity;
  }

  /**
   * Get leaks filtered by type.
   */
  getLeaksByType(
    type:
      | 'detached-dom'
      | 'event-listeners'
      | 'component-lifecycle'
      | 'timer'
      | 'subscription'
      | 'closure'
      | 'growing-memory',
  ): Array<LeakPattern> {
    const allLeaks = this._getAllLeaks();
    return allLeaks.filter(leak => leak.type === type);
  }

  /**
   * Get leaks filtered by severity.
   */
  getLeaksBySeverity(
    severity: 'low' | 'medium' | 'high' | 'critical',
  ): Array<LeakPattern> {
    const allLeaks = this._getAllLeaks();
    return allLeaks.filter(leak => leak.severity === severity);
  }

  /**
   * Get memory usage at specific timestamp index.
   */
  getMemoryAtIndex(index: number): MemorySnapshot | null {
    const data = this._profilerStore.memoryProfilingData;
    if (data === null || index < 0 || index >= data.snapshots.length) {
      return null;
    }
    return data.snapshots[index];
  }

  /**
   * Get memory growth rate in MB/second.
   */
  getMemoryGrowthRate(): number {
    const trend = this.getMemoryTrend();
    if (trend === null) {
      return 0;
    }
    // Convert from bytes/ms to MB/s
    return (trend.growthRate / 1024 / 1024) * 1000;
  }

  /**
   * Check if there are any critical leaks.
   */
  hasCriticalLeaks(): boolean {
    const stats = this.getLeakStatistics();
    return stats.criticalLeaks > 0;
  }

  /**
   * Get total memory delta (growth) in bytes.
   */
  getTotalMemoryDelta(): number {
    const data = this._profilerStore.memoryProfilingData;
    if (data === null || data.snapshots.length < 2) {
      return 0;
    }

    const first = data.snapshots[0];
    const last = data.snapshots[data.snapshots.length - 1];
    return last.usedJSHeapSize - first.usedJSHeapSize;
  }

  /**
   * Get profiling session duration in seconds.
   */
  getProfilingDuration(): number {
    const data = this._profilerStore.memoryProfilingData;
    if (data === null || data.snapshots.length < 2) {
      return 0;
    }

    const first = data.snapshots[0];
    const last = data.snapshots[data.snapshots.length - 1];
    return (last.timestamp - first.timestamp) / 1000; // Convert to seconds
  }

  /**
   * Invalidate all cached data.
   */
  invalidate(): void {
    this._memoryChartData = null;
    this._memoryTrend = null;
    this._leakStatistics = null;
    this._sortedLeaksByTimestamp = null;
    this._sortedLeaksBySeverity = null;
  }

  /**
   * Get all leaks from all warnings (private helper).
   */
  _getAllLeaks(): Array<LeakPattern> {
    const warnings = this._profilerStore.memoryLeakWarnings;
    const allLeaks: Array<LeakPattern> = [];

    warnings.forEach(warning => {
      allLeaks.push(...warning.leaks);
    });

    // Also include leaks from memory profiling data if available
    const data = this._profilerStore.memoryProfilingData;
    if (data !== null && data.leaks) {
      allLeaks.push(...data.leaks.leaks);
    }

    return allLeaks;
  }

  /**
   * Find the index of a leak in the warnings array (private helper).
   */
  _findLeakIndex(
    leak: LeakPattern,
    warnings: Array<{leaks: Array<LeakPattern>}>,
  ): number {
    for (let i = 0; i < warnings.length; i++) {
      const index = warnings[i].leaks.indexOf(leak);
      if (index !== -1) {
        return i;
      }
    }
    return -1;
  }
}
