/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useCallback} from 'react';

import styles from './Toggle.css';
import Tooltip from './Components/reach-ui/tooltip';

type Props = {
  children: React$Node,
  className?: string,
  isChecked: boolean,
  isDisabled?: boolean,
  onChange: (isChecked: boolean) => void,
  testName?: ?string,
  title?: string,
  ...
};

export default function Toggle({
  children,
  className = '',
  isDisabled = false,
  isChecked,
  onChange,
  testName,
  title,
}: Props): React.Node {
  let defaultClassName;
  if (isDisabled) {
    defaultClassName = styles.ToggleDisabled;
  } else if (isChecked) {
    defaultClassName = styles.ToggleOn;
  } else {
    defaultClassName = styles.ToggleOff;
  }

  const handleClick = useCallback(
    () => onChange(!isChecked),
    [isChecked, onChange],
  );

  let toggle = (
    <button
      className={`${defaultClassName} ${className}`}
      data-testname={testName}
      disabled={isDisabled}
      onClick={handleClick}>
      <span className={styles.ToggleContent} tabIndex={-1}>
        {children}
      </span>
    </button>
  );

  if (title) {
    toggle = <Tooltip label={title}>{toggle}</Tooltip>;
  }

  return toggle;
}
