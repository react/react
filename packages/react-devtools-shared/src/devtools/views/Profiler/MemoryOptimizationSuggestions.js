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

import styles from './MemoryOptimizationSuggestions.css';

import type {LeakPattern} from 'react-devtools-shared/src/backend/types';

type Suggestion = {
  title: string,
  description: string,
  priority: 'high' | 'medium' | 'low',
  codeExample?: string,
  learnMore?: string,
};

export default function MemoryOptimizationSuggestions(_: {}): React.Node {
  const {profilerStore} = useContext(ProfilerContext);
  const [leaks, setLeaks] = useState<Array<LeakPattern>>([]);

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

  const suggestions = useMemo(() => {
    const suggestionsList: Array<Suggestion> = [];

    // Generate suggestions based on detected leaks
    const leakTypes = new Set(leaks.map(leak => leak.type));

    if (leakTypes.has('detached-dom')) {
      suggestionsList.push({
        title: 'Clean Up DOM References',
        description:
          'Remove references to detached DOM nodes in cleanup functions. Store DOM references in refs and clear them when components unmount.',
        priority: 'high',
        codeExample: `useEffect(() => {
  const element = elementRef.current;
  
  return () => {
    // Clear references
    elementRef.current = null;
  };
}, []);`,
      });
    }

    if (leakTypes.has('event-listeners')) {
      suggestionsList.push({
        title: 'Remove Event Listeners',
        description:
          'Always remove event listeners in cleanup functions. Consider using the cleanup pattern in useEffect.',
        priority: 'high',
        codeExample: `useEffect(() => {
  const handleClick = () => { /* ... */ };
  window.addEventListener('click', handleClick);
  
  return () => {
    window.removeEventListener('click', handleClick);
  };
}, []);`,
      });
    }

    if (leakTypes.has('component-lifecycle')) {
      suggestionsList.push({
        title: 'Fix Component Lifecycle Issues',
        description:
          'Ensure components properly unmount. Check for circular dependencies or parent components that prevent unmounting.',
        priority: 'high',
      });
    }

    if (leakTypes.has('timer')) {
      suggestionsList.push({
        title: 'Clear Timers and Intervals',
        description:
          'Always clear setTimeout and setInterval in cleanup functions to prevent memory leaks.',
        priority: 'medium',
        codeExample: `useEffect(() => {
  const interval = setInterval(() => {
    // Periodic work
  }, 1000);
  
  return () => {
    clearInterval(interval);
  };
}, []);`,
      });
    }

    if (leakTypes.has('growing-memory')) {
      suggestionsList.push({
        title: 'Implement Data Cleanup Strategy',
        description:
          'If your application accumulates data over time, implement a cleanup strategy. Consider using LRU caches or pagination.',
        priority: 'medium',
      });
    }

    // General suggestions
    if (leaks.length > 0) {
      suggestionsList.push({
        title: 'Use React DevTools Profiler',
        description:
          'Use the React Profiler to identify components that re-render frequently, which can contribute to memory issues.',
        priority: 'low',
      });

      suggestionsList.push({
        title: 'Consider useMemo and useCallback',
        description:
          'Use useMemo and useCallback to prevent unnecessary re-creation of objects and functions, which can reduce memory pressure.',
        priority: 'low',
        codeExample: `const memoizedValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);`,
      });
    }

    return suggestionsList;
  }, [leaks]);

  if (suggestions.length === 0) {
    return null;
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  };

  return (
    <div className={styles.Container}>
      <h3 className={styles.Title}>
        Optimization Suggestions
        <span className={styles.Badge}>{suggestions.length}</span>
      </h3>

      <div className={styles.SuggestionsList}>
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`${styles.Suggestion} ${styles[`Priority${suggestion.priority.charAt(0).toUpperCase()}${suggestion.priority.slice(1)}`]}`}>
            <div className={styles.SuggestionHeader}>
              <span className={styles.PriorityIcon}>
                {getPriorityIcon(suggestion.priority)}
              </span>
              <h4 className={styles.SuggestionTitle}>{suggestion.title}</h4>
            </div>

            <p className={styles.SuggestionDescription}>
              {suggestion.description}
            </p>

            {suggestion.codeExample && (
              <div className={styles.CodeExample}>
                <div className={styles.CodeLabel}>Example:</div>
                <pre className={styles.Code}>{suggestion.codeExample}</pre>
              </div>
            )}

            {suggestion.learnMore && (
              <a
                href={suggestion.learnMore}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.LearnMore}>
                Learn more →
              </a>
            )}
          </div>
        ))}
      </div>

      <div className={styles.GeneralTips}>
        <h4 className={styles.TipsTitle}>General Best Practices</h4>
        <ul className={styles.TipsList}>
          <li>
            Always clean up subscriptions and listeners in useEffect cleanup
            functions
          </li>
          <li>Avoid storing large objects in component state unnecessarily</li>
          <li>Use WeakMap/WeakSet for caching when appropriate</li>
          <li>Monitor your app's memory usage regularly during development</li>
          <li>Test long-running sessions to catch slow memory leaks</li>
        </ul>
      </div>
    </div>
  );
}
