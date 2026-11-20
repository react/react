
## Input

```javascript
// @outputMode:"ssr"
import {useState} from 'react';

function useFlag() {
  const [flag, setFlag] = useState(false);
  return [flag, setFlag];
}

function Component() {
  // The setter comes from a custom hook, which could also update its own state
  // during render. Either way the component renders again with its existing
  // state, so `snapshot` keeps its hook.
  const [ready, setReady] = useFlag();
  const [snapshot] = useState({ready});
  if (!ready) {
    setReady(true);
  }
  return <div>{String(snapshot.ready)}</div>;
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

function useFlag() {
  const [flag, setFlag] = useState(false);
  return [flag, setFlag];
}

function Component() {
  const [ready, setReady] = useFlag();
  const [snapshot] = useState({ ready });
  if (!ready) {
    setReady(true);
  }

  return <div>{String(snapshot.ready)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>false</div>