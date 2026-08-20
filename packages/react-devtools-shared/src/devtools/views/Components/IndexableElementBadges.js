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
import ForgetBadge from './ForgetBadge';
import IndexableDisplayName from './IndexableDisplayName';

import styles from './IndexableElementBadges.css';

type Props = {
  hocDisplayNames: Array<string> | null,
  compiledWithForget: boolean,
  elementID: number,
  className?: string,
};

export default function IndexableElementBadges({
  compiledWithForget,
  hocDisplayNames,
  elementID,
  className = '',
}: Props): React.Node {
  if (
    !compiledWithForget &&
    (hocDisplayNames == null || hocDisplayNames.length === 0)
  ) {
    return null;
  }

  return (
    <div className={`${styles.Root} ${className}`}>
      {compiledWithForget && (
        <ForgetBadge indexable={true} elementID={elementID} />
      )}

      {hocDisplayNames != null && hocDisplayNames.length > 0 && (
        <Badge>
          <IndexableDisplayName
            displayName={hocDisplayNames[0]}
            id={elementID}
          />
        </Badge>
      )}

      {hocDisplayNames != null && hocDisplayNames.length > 1 && (
        <div className={styles.ExtraLabel}>+{hocDisplayNames.length - 1}</div>
      )}
    </div>
  );
}
