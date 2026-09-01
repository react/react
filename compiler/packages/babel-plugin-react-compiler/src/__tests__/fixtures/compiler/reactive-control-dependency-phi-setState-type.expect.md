
## Input

```javascript
import invariant from 'invariant';
import {useState} from 'react';

function Component(props) {
  const [x, setX] = useState(false);
  const [y, setY] = useState(false);
  let setState;
  if (props.cond) {
    setState = setX;
  } else {
    setState = setY;
  }
  const setState2 = setState;
  const stateObject = {setState: setState2};
  return (
    <Foo
      cond={props.cond}
      setX={setX}
      setY={setY}
      setState={stateObject.setState}
    />
  );
}

function Foo({cond, setX, setY, setState}) {
  if (cond) {
    invariant(setState === setX, 'Expected the correct setState function');
  } else {
    invariant(setState === setY, 'Expected the correct setState function');
  }
  return 'ok';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {cond: true},
    {cond: true},
    {cond: false},
    {cond: false},
    {cond: true},
    {cond: false},
    {cond: true},
    {cond: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import invariant from "invariant";
import { useState } from "react";

function Component(props) {
  const $ = _c(5);
  const [, setX] = useState(false);
  const [, setY] = useState(false);
  let setState;
  if (props.cond) {
    setState = setX;
  } else {
    setState = setY;
  }

  const setState2 = setState;
  let t0;
  if ($[0] !== setState2) {
    t0 = { setState: setState2 };
    $[0] = setState2;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const stateObject = t0;
  let t1;
  if ($[2] !== props.cond || $[3] !== stateObject.setState) {
    t1 = (
      <Foo
        cond={props.cond}
        setX={setX}
        setY={setY}
        setState={stateObject.setState}
      />
    );
    $[2] = props.cond;
    $[3] = stateObject.setState;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}

function Foo(t0) {
  const { cond, setX, setY, setState } = t0;
  if (cond) {
    invariant(setState === setX, "Expected the correct setState function");
  } else {
    invariant(setState === setY, "Expected the correct setState function");
  }

  return "ok";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    { cond: true },
    { cond: true },
    { cond: false },
    { cond: false },
    { cond: true },
    { cond: false },
    { cond: true },
    { cond: false },
  ],
};

```
      
### Eval output
(kind: ok) ok
ok
ok
ok
ok
ok
ok
ok