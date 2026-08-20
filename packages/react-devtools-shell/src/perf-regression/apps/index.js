/**
 * Copyright (c) Meta Platforms, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import LargeSubtree from './LargeSubtree';

export default function Home(): React.Node {
  return (
    <div>
      <LargeSubtree />
    </div>
  );
}
