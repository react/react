
## Input

```javascript
// @validateNoSetStateInEffects @enableVerboseNoSetStateInEffect
import {useState, useEffect} from 'react';

function Child({firstName, lastName}) {
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    setFullName(firstName + ' ' + lastName);
  }, [firstName, lastName]);
  return <div>{fullName}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Child,
  params: [{firstName: 'John', lastName: 'Doe'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoSetStateInEffects @enableVerboseNoSetStateInEffect
import { useState, useEffect } from "react";

function Child(t0) {
  const $ = _c(6);
  const { firstName, lastName } = t0;
  const [fullName, setFullName] = useState("");
  let t1;
  let t2;
  if ($[0] !== firstName || $[1] !== lastName) {
    t1 = () => {
      setFullName(firstName + " " + lastName);
    };
    t2 = [firstName, lastName];
    $[0] = firstName;
    $[1] = lastName;
    $[2] = t1;
    $[3] = t2;
  } else {
    t1 = $[2];
    t2 = $[3];
  }
  useEffect(t1, t2);
  let t3;
  if ($[4] !== fullName) {
    t3 = <div>{fullName}</div>;
    $[4] = fullName;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Child,
  params: [{ firstName: "John", lastName: "Doe" }],
};

```
      
### Eval output
(kind: ok) <div>John Doe</div>