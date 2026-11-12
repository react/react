/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext, useSyncExternalStore} from 'react';
import {ProfilerContext} from './ProfilerContext';
import {StoreContext} from '../context';

import styles from './Profiler.css';

export default function NoProfilingData(): React.Node {
  const {startProfiling} = useContext(ProfilerContext);
  const store = useContext(StoreContext);

  // React only started emitting Performance tracks in 19.2.
  const supportsPerformanceTracks = useSyncExternalStore<boolean>(
    function subscribe(callback) {
      store.addListener('rootSupportsPerformanceTracks', callback);
      return function unsubscribe() {
        store.removeListener('rootSupportsPerformanceTracks', callback);
      };
    },
    function getState() {
      return store.rootSupportsPerformanceTracks;
    },
  );

  const performanceTracksLink = (
    <a
      className={styles.DescriptionLink}
      href="https://react.dev/reference/dev-tools/react-performance-tracks"
      rel="noopener noreferrer"
      target="_blank">
      Performance tracks
    </a>
  );

  return (
    <div className={styles.Column}>
      <div className={styles.Header}>No profiling data has been recorded</div>
      <div className={styles.Description}>
        Record a session to see which components rendered, how long they took,
        and why.{' '}
        <a
          className={styles.DescriptionLink}
          href="https://legacy.reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html"
          rel="noopener noreferrer"
          target="_blank">
          Learn more
        </a>
      </div>
      <button
        className={styles.CTAButton}
        onClick={startProfiling}
        type="button">
        Start recording
      </button>
      <div className={styles.PerformanceTracksCard}>
        To profile scheduling and rendering on a timeline,{' '}
        {supportsPerformanceTracks ? (
          <>
            record a profile in the Performance panel — React adds its own{' '}
            {performanceTracksLink} there.
          </>
        ) : (
          <>
            upgrade to React 19.2 or newer, which adds {performanceTracksLink}{' '}
            to the Performance panel.
          </>
        )}
      </div>
    </div>
  );
}
