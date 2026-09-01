/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

import styles from './Badge.css';

type Props = {
  className?: string,
  children: React$Node,
  ...
};

export default function Badge({
  className = '',
  children,
  ...props
}: Props): React.Node {
  return (
    <div {...props} className={`${styles.Badge} ${className}`}>
      {children}
    </div>
  );
}
