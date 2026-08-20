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

import styles from './ElementBadges.css';

type Props = {
  hocDisplayNames: Array<string> | null,
  environmentName: string | null,
  compiledWithForget: boolean,
  className?: string,
};

export default function ElementBadges({
  compiledWithForget,
  environmentName,
  hocDisplayNames,
  className = '',
}: Props): React.Node {
  if (
    !compiledWithForget &&
    (hocDisplayNames == null || hocDisplayNames.length === 0) &&
    environmentName == null
  ) {
    return null;
  }

  return (
    <div className={`${styles.Root} ${className}`}>
      {compiledWithForget && <ForgetBadge indexable={false} />}

      {environmentName != null ? <Badge>{environmentName}</Badge> : null}

      {hocDisplayNames != null && hocDisplayNames.length > 0 && (
        <Badge>{hocDisplayNames[0]}</Badge>
      )}

      {hocDisplayNames != null && hocDisplayNames.length > 1 && (
        <div className={styles.ExtraLabel}>+{hocDisplayNames.length - 1}</div>
      )}
    </div>
  );
}
