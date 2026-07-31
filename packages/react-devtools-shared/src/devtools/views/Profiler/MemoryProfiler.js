/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext, useEffect, useState, useCallback} from 'react';
import {ProfilerContext} from './ProfilerContext';
import MemoryDashboard from './MemoryDashboard';
import MemoryLeakWarnings from './MemoryLeakWarnings';
import MemoryOptimizationSuggestions from './MemoryOptimizationSuggestions';
import RecordToggle from './RecordToggle';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';

import styles from './MemoryProfiler.css';

export default function MemoryProfiler(_: {}): React.Node {
  const {profilerStore} = useContext(ProfilerContext);
  const [isRecording, setIsRecording] = useState(false);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const handleMemoryProfilingStatus = () => {
      setIsRecording(profilerStore.isMemoryProfiling);
    };

    const handleMemoryProfilingData = () => {
      setHasData(profilerStore.memoryProfilingData !== null);
    };

    profilerStore.addListener('isMemoryProfiling', handleMemoryProfilingStatus);
    profilerStore.addListener('memoryProfilingData', handleMemoryProfilingData);

    // Initialize state
    setIsRecording(profilerStore.isMemoryProfiling);
    setHasData(profilerStore.memoryProfilingData !== null);

    return () => {
      profilerStore.removeListener(
        'isMemoryProfiling',
        handleMemoryProfilingStatus,
      );
      profilerStore.removeListener(
        'memoryProfilingData',
        handleMemoryProfilingData,
      );
    };
  }, [profilerStore]);

  const startProfiling = useCallback(() => {
    profilerStore.startMemoryProfiling({
      snapshotInterval: 1000, // 1 second
      leakThreshold: 1024 * 100, // 100KB/s
    });
  }, [profilerStore]);

  const stopProfiling = useCallback(() => {
    profilerStore.stopMemoryProfiling();
  }, [profilerStore]);

  const clearData = useCallback(() => {
    profilerStore.clearMemoryLeakWarnings();
    setHasData(false);
  }, [profilerStore]);

  if (!hasData && !isRecording) {
    return (
      <div className={styles.NoData}>
        <div className={styles.NoDataContent}>
          <h3 className={styles.NoDataTitle}>Memory Profiler</h3>
          <p className={styles.NoDataDescription}>
            Click the record button to start profiling memory usage and
            detecting leaks.
          </p>
          <div className={styles.NoDataActions}>
            <RecordToggle isRecording={false} onClick={startProfiling} />
          </div>
          <div className={styles.NoDataInfo}>
            <h4>What does this do?</h4>
            <ul>
              <li>Tracks heap memory usage over time</li>
              <li>Detects detached DOM nodes</li>
              <li>Monitors event listener growth</li>
              <li>Identifies component lifecycle leaks</li>
              <li>Provides optimization suggestions</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className={styles.Recording}>
        <div className={styles.RecordingContent}>
          <div className={styles.RecordingIndicator}>
            <span className={styles.RecordingDot} />
            <span>Recording memory data...</span>
          </div>
          <p className={styles.RecordingDescription}>
            Interact with your app to capture memory patterns. Click stop when
            ready.
          </p>
          <RecordToggle isRecording={true} onClick={stopProfiling} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.MemoryProfiler}>
      <div className={styles.Toolbar}>
        <RecordToggle
          isRecording={isRecording}
          onClick={isRecording ? stopProfiling : startProfiling}
        />
        <Button onClick={clearData} title="Clear memory profiling data">
          <ButtonIcon type="clear" />
          Clear
        </Button>
      </div>

      <div className={styles.Content}>
        <div className={styles.MainColumn}>
          <MemoryDashboard />
          <MemoryOptimizationSuggestions />
        </div>
        <div className={styles.SideColumn}>
          <MemoryLeakWarnings />
        </div>
      </div>
    </div>
  );
}
