
## Input

```javascript
// @outputMode:"ssr"
import {useState} from 'react';

function Component() {
  // `label` starts at a constant and its setter is never read, so it has the
  // same value in every render pass and is still inlined
  const [ready, setReady] = useState(false);
  const [label] = useState('ready');
  if (!ready) {
    setReady(true);
  }
  return (
    <div>
      {label}: {String(ready)}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
// @outputMode:"ssr"
import { useState } from "react";

function Component() {
  const [ready, setReady] = useState(false);
  const label = "ready";
  if (!ready) {
    setReady(true);
  }

  return (
    <div>
      {label}: {String(ready)}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>ready: true</div>