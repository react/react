/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

import styles from './ButtonLabel.css';

type Props = {
  children: React$Node,
};

export default function ButtonLabel({children}: Props): React.Node {
  return <span className={styles.ButtonLabel}>{children}</span>;
}
