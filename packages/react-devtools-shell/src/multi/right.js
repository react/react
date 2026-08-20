/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as React from 'react';
import {useLayoutEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';

function createContainer() {
  const container = document.createElement('div');

  ((document.body: any): HTMLBodyElement).appendChild(container);

  return container;
}

function EffectWithState() {
  const [didMount, setDidMount] = useState(0);

  const renderCountRef = useRef(0);
  renderCountRef.current++;

  useLayoutEffect(() => {
    if (!didMount) {
      setDidMount(true);
    }
  }, [didMount]);

  return (
    <ul>
      <li>Rendered {renderCountRef.current} times</li>
      {didMount && <li>Mounted!</li>}
    </ul>
  );
}

createRoot(createContainer()).render(<EffectWithState />);
