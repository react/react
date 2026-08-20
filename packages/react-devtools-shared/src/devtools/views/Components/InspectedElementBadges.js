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
import NativeTagBadge from './NativeTagBadge';

import styles from './InspectedElementBadges.css';

type Props = {
  hocDisplayNames: null | Array<string>,
  compiledWithForget: boolean,
  nativeTag: number | null,
};

export default function InspectedElementBadges({
  hocDisplayNames,
  compiledWithForget,
  nativeTag,
}: Props): React.Node {
  if (
    !compiledWithForget &&
    (hocDisplayNames == null || hocDisplayNames.length === 0) &&
    nativeTag === null
  ) {
    return null;
  }

  return (
    <div className={styles.Root}>
      {compiledWithForget && <ForgetBadge indexable={false} />}
      {nativeTag !== null && <NativeTagBadge nativeTag={nativeTag} />}

      {hocDisplayNames !== null &&
        hocDisplayNames.map(hocDisplayName => (
          <Badge key={hocDisplayName}>{hocDisplayName}</Badge>
        ))}
    </div>
  );
}
