/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Html from './Html';
import BigComponent from './BigComponent';
import React, {
  Fragment,
  Suspense,
  unstable_SuspenseList as SuspenseList,
} from 'react';

function Use({usable}) {
  usable && React.use(usable);
  return null;
}

export default function App({assets, title, delay}) {
  const components = [];

  for (let i = 0; i <= 250; i++) {
    components.push(
      // Replace Suspense with Fragment to push rel=expect to bottom and degrade FCP
      <Fragment key={i}>
        <BigComponent />
        <Use usable={delay} />
      </Fragment>
    );
  }

  return (
    <Html assets={assets} title={title}>
      <h1>{title}</h1>
      {components}
      <h1>all done</h1>
    </Html>
  );
}
