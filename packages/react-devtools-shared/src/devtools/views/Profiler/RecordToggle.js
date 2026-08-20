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
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {ProfilerContext} from './ProfilerContext';

import styles from './RecordToggle.css';

export type Props = {
  disabled?: boolean,
};

export default function RecordToggle({disabled}: Props): React.Node {
  const {isProfiling, startProfiling, stopProfiling} =
    useContext(ProfilerContext);

  let className = styles.InactiveRecordToggle;
  if (disabled) {
    className = styles.DisabledRecordToggle;
  } else if (isProfiling) {
    className = styles.ActiveRecordToggle;
  }

  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcut = isMac ? '⌘E' : 'Ctrl+E';
  const title = `${isProfiling ? 'Stop' : 'Start'} profiling - ${shortcut}`;

  return (
    <Button
      className={className}
      disabled={disabled}
      onClick={isProfiling ? stopProfiling : startProfiling}
      testName="ProfilerToggleButton"
      title={title}>
      <ButtonIcon type="record" />
    </Button>
  );
}
