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
import ButtonIcon from '../ButtonIcon';

import styles from './MemoryLeakWarnings.css';

import type {LeakPattern} from 'react-devtools-shared/src/backend/types';

export default function MemoryLeakWarnings(_: {}): React.Node {
  const {profilerStore} = useContext(ProfilerContext);
  const [leaks, setLeaks] = useState<Array<LeakPattern>>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');
  const [expandedLeaks, setExpandedLeaks] = useState<Set<number>>(new Set());

  useEffect(() => {
    const updateLeaks = () => {
      const cache = profilerStore.memoryProfilingCache;
      if (cache) {
        const sortedLeaks = cache.getLeaksSortedBySeverity();
        setLeaks(sortedLeaks);
      }
    };

    profilerStore.addListener('memoryProfilingData', updateLeaks);
    profilerStore.addListener('memoryLeakDetected', updateLeaks);

    updateLeaks();

    return () => {
      profilerStore.removeListener('memoryProfilingData', updateLeaks);
      profilerStore.removeListener('memoryLeakDetected', updateLeaks);
    };
  }, [profilerStore]);

  const filteredLeaks = useMemo(() => {
    if (filter === 'all') {
      return leaks;
    }
    return leaks.filter(leak => leak.severity === filter);
  }, [leaks, filter]);

  const stats = useMemo(() => {
    const cache = profilerStore.memoryProfilingCache;
    if (!cache) {
      return null;
    }
    return cache.getLeakStatistics();
  }, [profilerStore, leaks]);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedLeaks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLeaks(newExpanded);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      'detached-dom': 'Detached DOM',
      'event-listeners': 'Event Listeners',
      'component-lifecycle': 'Component Lifecycle',
      timer: 'Timers',
      subscription: 'Subscriptions',
      closure: 'Closures',
      'growing-memory': 'Memory Growth',
    };
    return labels[type] || type;
  };

  if (leaks.length === 0) {
    return (
      <div className={styles.Container}>
        <h3 className={styles.Title}>Memory Leak Warnings</h3>
        <div className={styles.NoLeaks}>
          <div className={styles.NoLeaksIcon}>✓</div>
          <p className={styles.NoLeaksText}>No memory leaks detected</p>
          <p className={styles.NoLeaksSubtext}>
            Your application appears to be managing memory properly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.Container}>
      <div className={styles.Header}>
        <h3 className={styles.Title}>
          Memory Leak Warnings
          <span className={styles.Badge}>{leaks.length}</span>
        </h3>
      </div>

      {stats && (
        <div className={styles.Summary}>
          <div className={styles.SummaryItem}>
            <span className={styles.SummaryIcon}>🔴</span>
            <span className={styles.SummaryCount}>{stats.criticalLeaks}</span>
            <span className={styles.SummaryLabel}>Critical</span>
          </div>
          <div className={styles.SummaryItem}>
            <span className={styles.SummaryIcon}>🟠</span>
            <span className={styles.SummaryCount}>{stats.highLeaks}</span>
            <span className={styles.SummaryLabel}>High</span>
          </div>
          <div className={styles.SummaryItem}>
            <span className={styles.SummaryIcon}>🟡</span>
            <span className={styles.SummaryCount}>{stats.mediumLeaks}</span>
            <span className={styles.SummaryLabel}>Medium</span>
          </div>
          <div className={styles.SummaryItem}>
            <span className={styles.SummaryIcon}>🔵</span>
            <span className={styles.SummaryCount}>{stats.lowLeaks}</span>
            <span className={styles.SummaryLabel}>Low</span>
          </div>
        </div>
      )}

      <div className={styles.Filters}>
        <button
          className={filter === 'all' ? styles.FilterActive : styles.Filter}
          onClick={() => setFilter('all')}>
          All ({leaks.length})
        </button>
        <button
          className={
            filter === 'critical' ? styles.FilterActive : styles.Filter
          }
          onClick={() => setFilter('critical')}>
          Critical ({stats?.criticalLeaks || 0})
        </button>
        <button
          className={filter === 'high' ? styles.FilterActive : styles.Filter}
          onClick={() => setFilter('high')}>
          High ({stats?.highLeaks || 0})
        </button>
      </div>

      <div className={styles.LeaksList}>
        {filteredLeaks.map((leak, index) => {
          const isExpanded = expandedLeaks.has(index);
          return (
            <div
              key={index}
              className={`${styles.LeakItem} ${styles[`Severity${leak.severity.charAt(0).toUpperCase()}${leak.severity.slice(1)}`]}`}>
              <div
                className={styles.LeakHeader}
                onClick={() => toggleExpanded(index)}>
                <span className={styles.SeverityIcon}>
                  {getSeverityIcon(leak.severity)}
                </span>
                <div className={styles.LeakInfo}>
                  <div className={styles.LeakType}>
                    {getTypeLabel(leak.type)}
                  </div>
                  <div className={styles.LeakDescription}>
                    {leak.description}
                  </div>
                  {leak.affectedComponent && (
                    <div className={styles.LeakComponent}>
                      Component: <code>{leak.affectedComponent}</code>
                    </div>
                  )}
                </div>
                <ButtonIcon type={isExpanded ? 'chevron-up' : 'chevron-down'} />
              </div>

              {isExpanded && (
                <div className={styles.LeakDetails}>
                  <div className={styles.Suggestion}>
                    <strong>Suggestion:</strong> {leak.suggestion}
                  </div>
                  {leak.codeExample && (
                    <div className={styles.CodeExample}>
                      <div className={styles.CodeLabel}>Example Fix:</div>
                      <pre className={styles.Code}>{leak.codeExample}</pre>
                    </div>
                  )}
                  {leak.metadata && (
                    <div className={styles.Metadata}>
                      <div className={styles.MetadataLabel}>
                        Additional Info:
                      </div>
                      <pre className={styles.MetadataContent}>
                        {JSON.stringify(leak.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
