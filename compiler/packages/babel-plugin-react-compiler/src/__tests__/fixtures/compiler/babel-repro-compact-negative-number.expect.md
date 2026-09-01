
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Repro(props) {
  const MY_CONST = -2;
  return <Stringify>{props.arg - MY_CONST}</Stringify>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Repro,
  params: [
    {
      arg: 3,
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Repro(props) {
  const $ = _c(2);

  const t0 = props.arg - -2;
  let t1;
  if ($[0] !== t0) {
    t1 = <Stringify>{t0}</Stringify>;
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Repro,
  params: [
    {
      arg: 3,
    },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"children":5}</div>