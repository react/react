
## Input

```javascript
import fbt from 'fbt';
import {identity} from 'shared-runtime';

function Component(props) {
  const text = fbt(
    `Hello, ${fbt.param('(key) name', identity(props.name))}!`,
    '(description) Greeting'
  );
  return <div>{text}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Sathya'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";
import { identity } from "shared-runtime";

function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.name) {
    t0 = fbt._(
      "Hello, {(key) name}!",
      [fbt._param("(key) name", identity(props.name))],
      { hk: "2sOsn5" },
    );
    $[0] = props.name;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const text = t0;
  let t1;
  if ($[2] !== text) {
    t1 = <div>{text}</div>;
    $[2] = text;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Sathya" }],
};

```
      
### Eval output
(kind: ok) <div>Hello, Sathya!</div>