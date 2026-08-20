/**
 * Copyright (c) Meta Platforms, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

function generateArray(size: number) {
  return Array.from({length: size}, () => Math.floor(Math.random() * size));
}

const arr = generateArray(50000);

export default function LargeSubtree(): React.Node {
  const [showList, setShowList] = React.useState(false);
  const toggleList = () => {
    const startTime = performance.now();
    setShowList(!showList);
    // requestAnimationFrame should happen after render+commit is done
    window.requestAnimationFrame(() => {
      const afterRenderTime = performance.now();
      console.log(
        `Time spent on ${showList ? 'unmounting' : 'mounting'} the subtree: ${
          afterRenderTime - startTime
        }ms`,
      );
    });
  };
  return (
    <div>
      <h2>Mount/Unmount a large subtree</h2>
      <p>Click the button to toggle the state. Open console for results.</p>
      <button onClick={toggleList}>toggle</button>
      <ul>
        <li key="dummy">dummy item</li>
        {showList && arr.map((num, idx) => <li key={idx}>{num}</li>)}
      </ul>
    </div>
  );
}
