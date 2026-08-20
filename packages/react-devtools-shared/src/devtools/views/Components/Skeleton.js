/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

import styles from './Skeleton.css';

type Props = {
  height: number | string,
  width: number | string,
};

function Skeleton({height, width}: Props): React.Node {
  return <div className={styles.root} style={{height, width}} />;
}

export default Skeleton;
