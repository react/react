
## Input

```javascript
// @outputMode:"ssr"
import {useState} from 'react';

function useDisclosure() {
  // The setter is returned to the caller, so the state is not inlined
  const [open, setOpen] = useState(false);
  return {open, setOpen};
}

function Component() {
  const {open, setOpen} = useDisclosure();
  return (
    <div>
      {String(open)} {typeof setOpen}
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

function useDisclosure() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

function Component() {
  const { open, setOpen } = useDisclosure();
  return (
    <div>
      {String(open)} {typeof setOpen}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>false function</div>