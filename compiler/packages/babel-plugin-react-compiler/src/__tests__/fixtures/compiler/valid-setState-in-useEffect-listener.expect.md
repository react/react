
## Input

```javascript
// @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component() {
  const [state, setState] = useState(0);
  useEffect(() => {
    setTimeout(setState, 10);
  });
  return state;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
// @validateNoSetStateInEffects @outputMode:"lint"
import { useEffect, useState } from "react";

function Component() {
  const [state, setState] = useState(0);
  useEffect(() => {
    setTimeout(setState, 10);
  });
  return state;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) 0