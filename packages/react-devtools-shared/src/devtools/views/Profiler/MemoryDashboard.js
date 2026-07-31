/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext, useEffect, useState, useMemo} from 'react';
import {ProfilerContext} from './ProfilerContext';

import styles from './MemoryDashboard.css';

type MemoryStats = {
  currentMemory: number,
  peakMemory: number,
  averageMemory: number,
  totalDelta: number,
  growthRate: number,
  detachedNodes: number,
  eventListeners: number,
  duration: number,
};

export default function MemoryDashboard(_: {}): React.Node {
  const {profilerStore} = useContext(ProfilerContext);
  const [stats, setStats] = useState<MemoryStats | null>(null);

  useEffect(() => {
    const updateStats = () => {
      const cache = profilerStore.memoryProfilingCache;
      const data = profilerStore.memoryProfilingData;
      const latest = profilerStore.latestMemorySnapshot;

      if (data && cache) {
        const trend = cache.getMemoryTrend();
        const delta = cache.getTotalMemoryDelta();
        const duration = cache.getProfilingDuration();
        const growthRate = cache.getMemoryGrowthRate();

        setStats({
          currentMemory: latest?.usedJSHeapSize || 0,
          peakMemory: trend?.peakMemory || 0,
          averageMemory: trend?.averageMemory || 0,
          totalDelta: delta,
          growthRate,
          detachedNodes: latest?.detachedDOMNodes || 0,
          eventListeners: latest?.eventListenerCount || 0,
          duration,
        });
      }
    };

    profilerStore.addListener('memoryProfilingData', updateStats);
    profilerStore.addListener('memorySnapshot', updateStats);

    updateStats();

    return () => {
      profilerStore.removeListener('memoryProfilingData', updateStats);
      profilerStore.removeListener('memorySnapshot', updateStats);
    };
  }, [profilerStore]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const chartData = useMemo(() => {
    if (!profilerStore.memoryProfilingCache) {
      return [];
    }
    return profilerStore.memoryProfilingCache.getMemoryChartData();
  }, [profilerStore, stats]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return <div className={styles.NoChartData}>No data to display</div>;
    }

    // Calculate chart dimensions
    const width = 600;
    const height = 200;
    const padding = {top: 10, right: 10, bottom: 30, left: 60};
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min/max for scaling
    const minMemory = Math.min(...chartData.map(d => d.usedJSHeapSize));
    const maxMemory = Math.max(...chartData.map(d => d.usedJSHeapSize));
    const minTime = chartData[0].timestamp;
    const maxTime = chartData[chartData.length - 1].timestamp;

    const xScale = (timestamp: number) => {
      return ((timestamp - minTime) / (maxTime - minTime)) * chartWidth;
    };

    const yScale = (memory: number) => {
      return (
        chartHeight -
        ((memory - minMemory) / (maxMemory - minMemory)) * chartHeight
      );
    };

    // Generate path for memory usage line
    const pathData = chartData
      .map((point, i) => {
        const x = xScale(point.timestamp);
        const y = yScale(point.usedJSHeapSize);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    // Generate area under the line
    const areaData = `${pathData} L ${xScale(chartData[chartData.length - 1].timestamp)} ${chartHeight} L ${xScale(chartData[0].timestamp)} ${chartHeight} Z`;

    return (
      <svg width={width} height={height} className={styles.Chart}>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartHeight}
            stroke="var(--color-border)"
            strokeWidth={1}
          />

          {/* Area under line */}
          <path
            d={areaData}
            fill="var(--color-record-hover)"
            fillOpacity={0.2}
          />

          {/* Memory usage line */}
          <path
            d={pathData}
            fill="none"
            stroke="var(--color-record)"
            strokeWidth={2}
          />

          {/* Y-axis labels */}
          <text
            x={-5}
            y={0}
            textAnchor="end"
            fill="var(--color-dimmer)"
            fontSize={10}>
            {formatBytes(maxMemory)}
          </text>
          <text
            x={-5}
            y={chartHeight}
            textAnchor="end"
            fill="var(--color-dimmer)"
            fontSize={10}>
            {formatBytes(minMemory)}
          </text>

          {/* X-axis label */}
          <text
            x={chartWidth / 2}
            y={chartHeight + 20}
            textAnchor="middle"
            fill="var(--color-dimmer)"
            fontSize={10}>
            Time
          </text>
        </g>
      </svg>
    );
  };

  if (!stats) {
    return (
      <div className={styles.Dashboard}>
        <div className={styles.Loading}>Loading memory data...</div>
      </div>
    );
  }

  const isLeaking = stats.growthRate > 0.1; // 0.1 MB/s threshold
  const deltaClass = stats.totalDelta > 0 ? styles.Increase : styles.Decrease;

  return (
    <div className={styles.Dashboard}>
      <h3 className={styles.Title}>Memory Usage</h3>

      {/* Stats Grid */}
      <div className={styles.StatsGrid}>
        <div className={styles.Stat}>
          <div className={styles.StatLabel}>Current Memory</div>
          <div className={styles.StatValue}>
            {formatBytes(stats.currentMemory)}
          </div>
        </div>

        <div className={styles.Stat}>
          <div className={styles.StatLabel}>Peak Memory</div>
          <div className={styles.StatValue}>
            {formatBytes(stats.peakMemory)}
          </div>
        </div>

        <div className={styles.Stat}>
          <div className={styles.StatLabel}>Average Memory</div>
          <div className={styles.StatValue}>
            {formatBytes(stats.averageMemory)}
          </div>
        </div>

        <div className={styles.Stat}>
          <div className={styles.StatLabel}>Total Delta</div>
          <div className={`${styles.StatValue} ${deltaClass}`}>
            {stats.totalDelta > 0 ? '+' : ''}
            {formatBytes(Math.abs(stats.totalDelta))}
          </div>
        </div>

        <div className={styles.Stat}>
          <div className={styles.StatLabel}>Growth Rate</div>
          <div
            className={`${styles.StatValue} ${isLeaking ? styles.Warning : ''}`}>
            {stats.growthRate > 0 ? '+' : ''}
            {stats.growthRate.toFixed(3)} MB/s
          </div>
        </div>

        <div className={styles.Stat}>
          <div className={styles.StatLabel}>Duration</div>
          <div className={styles.StatValue}>
            {formatDuration(stats.duration)}
          </div>
        </div>

        <div className={styles.Stat}>
          <div className={styles.StatLabel}>Detached Nodes</div>
          <div
            className={`${styles.StatValue} ${stats.detachedNodes > 50 ? styles.Warning : ''}`}>
            {stats.detachedNodes}
          </div>
        </div>

        <div className={styles.Stat}>
          <div className={styles.StatLabel}>Event Listeners</div>
          <div
            className={`${styles.StatValue} ${stats.eventListeners > 500 ? styles.Warning : ''}`}>
            {stats.eventListeners}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.ChartContainer}>
        <h4 className={styles.ChartTitle}>Memory Over Time</h4>
        {renderChart()}
      </div>
    </div>
  );
}
