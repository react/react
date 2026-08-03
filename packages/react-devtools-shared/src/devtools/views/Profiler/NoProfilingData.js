/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext} from 'react';
import {ProfilerContext} from './ProfilerContext';

import styles from './Profiler.css';

export default function NoProfilingData(): React.Node {
  const {startProfiling} = useContext(ProfilerContext);

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
    </div>
  );
}
