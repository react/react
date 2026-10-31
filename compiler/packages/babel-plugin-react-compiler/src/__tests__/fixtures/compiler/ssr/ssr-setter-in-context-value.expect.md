
## Input

```javascript
// @outputMode:"ssr"
import {createContext, useContext, useState} from 'react';

const DisclosureContext = createContext(null);

function Toggle() {
  const {open, setOpen} = useContext(DisclosureContext);
  return (
    <div>
      {String(open)} {typeof setOpen}
    </div>
  );
}

function Component() {
  // The setter is provided through context, so the state is not inlined
  const [open, setOpen] = useState(false);
  return (
    <DisclosureContext.Provider value={{open, setOpen}}>
      <Toggle />
    </DisclosureContext.Provider>
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
import { createContext, useContext, useState } from "react";

const DisclosureContext = createContext(null);

function Toggle() {
  const { open, setOpen } = useContext(DisclosureContext);
  return (
    <div>
      {String(open)} {typeof setOpen}
    </div>
  );
}

function Component() {
  const [open, setOpen] = useState(false);
  return (
    <DisclosureContext.Provider value={{ open, setOpen }}>
      <Toggle />
    </DisclosureContext.Provider>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>false function</div>