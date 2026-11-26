
## Input

```javascript
// @outputMode:"ssr"
import {useState} from 'react';

function Dialog({open, onOpenChange}) {
  return (
    <div>
      {String(open)} {typeof onOpenChange}
    </div>
  );
}

function Component() {
  // The setter is passed to a child, so the state is not inlined
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen} />;
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

function Dialog(t0) {
  const { open, onOpenChange } = t0;
  return (
    <div>
      {String(open)} {typeof onOpenChange}
    </div>
  );
}

function Component() {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>false function</div>