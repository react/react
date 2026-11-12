
## Input

```javascript
import * as React from 'react';
import {useState} from 'react';
import {Stringify} from 'shared-runtime';

function Component() {
  const [namespaceValue] = React!.useState(1);
  const [namedValue] = useState!(2);
  return <Stringify namespaceValue={namespaceValue} namedValue={namedValue} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import * as React from "react";
import { useState } from "react";
import { Stringify } from "shared-runtime";

function Component() {
  const $ = _c(3);
  const [namespaceValue] = React!.useState(1);
  const [namedValue] = useState!(2);
  let t0;
  if ($[0] !== namedValue || $[1] !== namespaceValue) {
    t0 = <Stringify namespaceValue={namespaceValue} namedValue={namedValue} />;
    $[0] = namedValue;
    $[1] = namespaceValue;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>{"namespaceValue":1,"namedValue":2}</div>