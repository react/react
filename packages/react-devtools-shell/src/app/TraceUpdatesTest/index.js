/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useRef, useState} from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h3>Count: {count}</h3>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
};

function DialogComponent() {
  const dialogRef = useRef(null);

  const openDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  };

  const closeDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  };

  return (
    <div style={{margin: '10px 0'}}>
      <button onClick={openDialog}>Open Dialog</button>
      <dialog ref={dialogRef} style={{padding: '20px'}}>
        <h3>Dialog Content</h3>
        <Counter />
        <button onClick={closeDialog}>Close</button>
      </dialog>
    </div>
  );
}

function RegularComponent() {
  return (
    <div style={{margin: '10px 0'}}>
      <h3>Regular Component</h3>
      <Counter />
    </div>
  );
}

export default function TraceUpdatesTest(): React.Node {
  return (
    <div>
      <h2>TraceUpdates Test</h2>

      <div style={{marginBottom: '20px'}}>
        <h3>Standard Component</h3>
        <RegularComponent />
      </div>

      <div style={{marginBottom: '20px'}}>
        <h3>Dialog Component (top-layer element)</h3>
        <DialogComponent />
      </div>

      <div
        style={{marginTop: '20px', padding: '10px', border: '1px solid #ddd'}}>
        <h3>How to Test:</h3>
        <ol>
          <li>Open DevTools Components panel</li>
          <li>Enable "Highlight updates when components render" in settings</li>
          <li>Click increment buttons and observe highlights</li>
          <li>Open the dialog and test increments there as well</li>
        </ol>
      </div>
    </div>
  );
}
