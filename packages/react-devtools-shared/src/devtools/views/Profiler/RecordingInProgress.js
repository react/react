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

export default function RecordingInProgress(): React.Node {
  const {stopProfiling} = useContext(ProfilerContext);

  return (
    <div className={styles.Column}>
      <div className={styles.Header}>Profiling is in progress...</div>
      <button
        className={styles.CTAButton}
        onClick={stopProfiling}
        type="button">
        Stop recording
      </button>
    </div>
  );
}
