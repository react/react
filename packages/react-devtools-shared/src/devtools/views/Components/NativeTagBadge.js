/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

import Badge from './Badge';
import Tooltip from './reach-ui/tooltip';

import styles from './NativeTagBadge.css';

type Props = {
  nativeTag: number,
};

const title =
  'Unique identifier for the corresponding native component. React Native only.';

export default function NativeTagBadge({nativeTag}: Props): React.Node {
  return (
    <Tooltip label={title}>
      <Badge className={styles.Badge}>Tag {nativeTag}</Badge>
    </Tooltip>
  );
}
