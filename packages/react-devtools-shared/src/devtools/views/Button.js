/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

import styles from './Button.css';
import Tooltip from './Components/reach-ui/tooltip';

type Props = {
  children: React$Node,
  className?: string,
  testName?: ?string,
  title: React$Node,
  ...
};

export default function Button({
  children,
  className = '',
  testName,
  title,
  ...rest
}: Props): React.Node {
  let button = (
    // $FlowFixMe[cannot-spread-inexact] unsafe spread
    <button
      className={`${styles.Button} ${className}`}
      data-testname={testName}
      {...rest}>
      <span className={`${styles.ButtonContent} ${className}`} tabIndex={-1}>
        {children}
      </span>
    </button>
  );

  if (title) {
    button = <Tooltip label={title}>{button}</Tooltip>;
  }

  return button;
}
