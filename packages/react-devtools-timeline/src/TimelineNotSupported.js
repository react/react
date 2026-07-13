/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {isInternalFacebookBuild} from 'react-devtools-feature-flags';

import styles from './TimelineNotSupported.css';

type Props = {
  isPerformanceTracksSupported: boolean,
};

function PerformanceTracksSupported() {
  return (
    <>
      <p className={styles.Paragraph}>
        <span>
          Please use{' '}
          <a
            className={styles.Link}
            href="https://react.dev/reference/dev-tools/react-performance-tracks"
            rel="noopener noreferrer"
            target="_blank">
            React Performance tracks
          </a>{' '}
          instead of the Timeline profiler.
        </span>
      </p>
    </>
  );
}

function UnknownUnsupportedReason() {
  return (
    <>
      <p className={styles.Paragraph}>
        Timeline profiler requires a development or profiling build of{' '}
        <code className={styles.Code}>react-dom@{'>='}18</code>.
      </p>
      <p className={styles.Paragraph}>
        In React 19.2 and above{' '}
        <a
          className={styles.Link}
          href="https://react.dev/reference/dev-tools/react-performance-tracks"
          rel="noopener noreferrer"
          target="_blank">
          React Performance tracks
        </a>{' '}
        can be used instead.
      </p>
      <div className={styles.LearnMoreRow}>
        Click{' '}
        <a
          className={styles.Link}
          href="https://fb.me/react-devtools-profiling"
          rel="noopener noreferrer"
          target="_blank">
          here
        </a>{' '}
        to learn more about profiling.
      </div>
    </>
  );
}

export default function TimelineNotSupported({
  isPerformanceTracksSupported,
}: Props): React.Node {
  return (
    <div className={styles.Column}>
      <div className={styles.Header}>Timeline profiling not supported.</div>

      {isPerformanceTracksSupported ? (
        <PerformanceTracksSupported />
      ) : (
        <UnknownUnsupportedReason />
      )}

      {isInternalFacebookBuild && (
        <div className={styles.MetaGKRow}>
          <strong>Meta only</strong>: Enable the{' '}
          <a
            className={styles.Link}
            href="https://fburl.com/react-devtools-scheduling-profiler-gk"
            rel="noopener noreferrer"
            target="_blank">
            react_enable_scheduling_profiler GK
          </a>
          .
        </div>
      )}
    </div>
  );
}
