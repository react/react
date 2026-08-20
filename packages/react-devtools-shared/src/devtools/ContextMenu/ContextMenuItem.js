/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

import styles from './ContextMenuItem.css';

type Props = {
  children: React.Node,
  onClick: () => void,
  hide: () => void,
};

export default function ContextMenuItem({
  children,
  onClick,
  hide,
}: Props): React.Node {
  const handleClick = () => {
    onClick();
    hide();
  };

  return (
    <div
      className={styles.ContextMenuItem}
      onClick={handleClick}
      onTouchEnd={handleClick}>
      {children}
    </div>
  );
}
